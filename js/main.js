// js/main.js
// アプリケーションのエントリーポイント。各モジュールをインポートし、初期化処理を行います。

import { getState, updateState, addStateChangeListener } from './stateManager.js';
import { uiElements, initializeUIFromState, setupEventListeners, syncUIFromState } from './uiController.js'; // updateFrameSettingsVisibility を追加
import { calculateLayout } from './layoutCalculator.js'; // 正しいレイアウト計算モジュール
import { drawPreview, clearContainerSizeCache } from './canvasRenderer.js';     // 現在の描画モジュール
import { processImageFile, handleDownload } from './fileManager.js';
import { displayExifInfo } from './exifHandler.js';   // Exif表示用
import { initializeTabs, onTabChange } from './tabManager.js';
import { initCanvasInteraction } from './interaction/canvasInteraction.js';
import * as selectionStore from './interaction/selectionStore.js';
import * as photoEditModeStore from './interaction/photoEditModeStore.js';
import { initHistory, recordStateChange, undo, redo, onHistoryChange, onSnapshotApplied } from './history/historyManager.js';

/**
 * プレビューの再描画を要求します。
 * editStateが更新された後や、UIの変更がプレビューに影響する場合に呼び出されます。
 */
/**
 * E-7: 画像の有無で、キャンバスエリアに `.has-image` / `.no-image` を付け替える。
 * CSS 側でキャンバスとドロップダイアログを出し分ける。
 */
export function updateImagePresenceUI() {
    const area = uiElements.canvasArea;
    if (!area) return;
    const hasImage = !!getState().image;
    area.classList.toggle('has-image', hasImage);
    area.classList.toggle('no-image', !hasImage);
}

export async function requestRedraw() {
    const currentState = getState(); // 状態を一度だけ取得
    updateImagePresenceUI();

    if (!currentState.image) {
        if (uiElements.previewCtx && uiElements.previewCanvas) {
            uiElements.previewCtx.clearRect(0, 0, uiElements.previewCanvas.width, uiElements.previewCanvas.height);
        }
        // Exif表示もクリア（または「画像がありません」等の表示）
        if (uiElements.exifDataContainer) {
            displayExifInfo(null, uiElements.exifDataContainer);
        }
        return;
    }

    const layoutInfo = calculateLayout(currentState);

    // 派生データ（レイアウト計算結果）の書き戻しなのでsilent指定。
    // これをsilentにしないと、requestRedraw自身がstateChangeListenerとして登録された際に
    // updateState → 通知 → requestRedraw → updateState … の無限ループになる。
    updateState({
        photoDrawConfig: layoutInfo.photoDrawConfig,
        outputCanvasConfig: layoutInfo.outputCanvasConfig
    }, { silent: true });

    // updateStateにより内部のeditStateは更新された。
    // 描画やExif表示には、この最新の状態（特にphotoDrawConfigとoutputCanvasConfigが反映されたもの）を使いたい。
    // getState()はコピーを返すため、再度呼び出すことで最新のコピーを取得する。
    const freshStateForDraw = getState();

    if (uiElements.previewCanvas && uiElements.previewCtx) {
        await drawPreview(freshStateForDraw, uiElements.previewCanvas, uiElements.previewCtx); // await追加
    } else {
        console.error("[Main] Preview canvas or context not available for redraw.");
    }

    if (uiElements.exifDataContainer) {
        displayExifInfo(freshStateForDraw.exifData, uiElements.exifDataContainer);
    }
}

// テスト用フック: `?debug` 付きで開いたときだけ、現在の editState を読めるようにする。
// 本番の挙動には一切影響しない（Playwright スモークが cropSettings 等を検査するのに使う）。
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug')) {
    window.__kakomiGetState = getState;
}

// DOMContentLoadedイベントでアプリケーションを初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Main] DOMContentLoaded: Initializing application...");

    if (uiElements.previewCanvas) {
        uiElements.previewCtx = uiElements.previewCanvas.getContext('2d');
    } else {
        console.error("[Main] Preview canvas element not found! Aborting initialization.");
        return;
    }

    initializeUIFromState();
    setupEventListeners(requestRedraw); // requestRedrawをコールバックとして渡す（既存のスライダー等はこの直接呼び出しのまま）
    initializeTabs();

    // 状態変更リスナーを実戦投入する。
    // Canvasドラッグ・矢印キーnudge・スクラブ数値入力など、新しく追加した入力経路は
    // redrawCallbackを直接呼ばず、updateState()を呼ぶだけでここを通じて反映される。
    // （既存のスライダー等はredrawCallbackの直接呼び出しも残っているため二重に走るが、
    //   requestRedrawは冪等なので実害はない。）
    addStateChangeListener(requestRedraw);
    addStateChangeListener(syncUIFromState);
    addStateChangeListener(recordStateChange);

    // 選択状態（selectionStore）はeditStateとは別管理のため、通常のstateChangeListenerでは
    // 再描画がトリガーされない。ドラッグを伴わない純粋なクリック選択（当たり判定の結果、
    // 移動量ゼロでpointermoveが一度も発火しないケース）でも選択ハイライト・ハンドルが
    // 即座に表示されるよう、選択変更でも明示的に再描画する。
    selectionStore.onSelectionChange((id) => {
        // 写真以外（またはnull）が選択されたら、写真のトリミング編集モードは解除する
        if (id !== 'photo') photoEditModeStore.reset();
        requestRedraw();
    });

    // select↔crop のモード切り替えは editState の変更を伴わないため、
    // 明示的に再描画をトリガーする（selectionStore と同じ考え方）。
    photoEditModeStore.onChange(() => {
        requestRedraw();
    });

    // 「背景」「フレーム」タブでは写真本体ドラッグの意味が変わり、写真の選択・トリミングができない。
    // レイアウトタブで選択したまま移ると四隅マーカーが出たまま操作不能に見えるため、
    // これらのタブへ移ったら写真の選択を解除する（onSelectionChange 経由で crop モード解除・再描画も走る）。
    onTabChange((tab) => {
        if ((tab === 'tab-background' || tab === 'tab-frame' || tab === 'tab-info') && selectionStore.getSelectedId() === 'photo') {
            selectionStore.setSelectedId(null);
        }
    });

    if (uiElements.previewCanvas) {
        initCanvasInteraction(uiElements.previewCanvas);
    }

    initHistory();
    onHistoryChange(({ canUndo, canRedo }) => {
        if (uiElements.undoButton) uiElements.undoButton.disabled = !canUndo;
        if (uiElements.redoButton) uiElements.redoButton.disabled = !canRedo;
    });
    // undo/redoはcustomTexts配列の個数など非連続な変化を伴いうるため、
    // 通常のドラッグ用の軽量同期ではなくUI全体を再構築する
    onSnapshotApplied(() => {
        initializeUIFromState();
    });
    if (uiElements.undoButton) uiElements.undoButton.addEventListener('click', undo);
    if (uiElements.redoButton) uiElements.redoButton.addEventListener('click', redo);

    // E-3(フェーズ5): 「情報」は他タブと並列の .tab-button + .tab-pane（#tab-info）になった。
    // タブ切り替え・再クリック収納は tabManager.js が扱うため、ここでの個別配線は不要。
    // Exif の中身は requestRedraw() → displayExifInfo(state.exifData, exifDataContainer) が更新する。

    if (uiElements.imageLoader) {
        uiElements.imageLoader.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                // processImageFile自体は非同期だが、requestRedrawがasyncになったことによる直接的な影響は少ない
                // processImageFile内でrequestRedrawを呼び出すため、その完了をここで待つ必要は通常ない
                // ただし、もしprocessImageFileの完了後に何か処理が必要なら、ここもasync/awaitする
                processImageFile(file, requestRedraw);
            }
        });
    }

    // E-7: 上部バーの「画像を開く」ボタン ／ ドロップダイアログの「クリックして選択」ラベルから
    // 隠しファイル入力を開く（ラベルの for="imageLoader" でも開くが、ボタンは明示的に click する）。
    if (uiElements.openImageButton && uiElements.imageLoader) {
        uiElements.openImageButton.addEventListener('click', () => uiElements.imageLoader.click());
    }

    // フェーズ4(E-5): ダウンロードは上部バー右。押すと画質ポップオーバーを開き、「書き出す」で実行。
    if (uiElements.downloadButton && uiElements.downloadPopover) {
        uiElements.downloadButton.addEventListener('click', (e) => {
            e.stopPropagation();
            uiElements.downloadPopover.classList.toggle('hidden');
        });
        if (uiElements.downloadConfirmButton) {
            uiElements.downloadConfirmButton.addEventListener('click', () => {
                uiElements.downloadPopover.classList.add('hidden');
                handleDownload();
            });
        }
        document.addEventListener('click', (e) => {
            if (!uiElements.downloadPopover.classList.contains('hidden')
                && !e.target.closest('.dl-group')) {
                uiElements.downloadPopover.classList.add('hidden');
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') uiElements.downloadPopover.classList.add('hidden');
        });
    } else if (uiElements.downloadButton) {
        uiElements.downloadButton.addEventListener('click', handleDownload);
    }

    // フェーズ4(E-1): 設定パネルの開閉でキャンバス「幅」が変わったときだけ、
    // コンテナ寸法キャッシュを破棄して再描画する。
    //
    // 【既知の不具合 G-1 対策・多重防御】高さ変化には反応しない。縦長/正方形の出力比率のとき
    // プレビューキャンバスは「高さ基準」で決まり、その要素がコンテナ高さをわずかに押し上げる →
    // ResizeObserver が発火 → キャッシュ破棄 → 再描画で更に高くなる … という正のフィードバックで
    // キャンバスがじわじわ拡大し続けた（`docs/session-log-2026-08-29-3.md` §13）。
    // 根本原因の 1px border は `docs/session-log-2026-08-29-4.md` で `#previewCanvas` の
    // outline 化（レイアウトボックスに乗せない）により解消済みだが、別経路で同種のループが
    // 再発しないよう「幅の変化にだけ反応する」ガードはそのまま残す。閾値 1px 未満は無視。
    if (typeof ResizeObserver !== 'undefined' && uiElements.canvasContainer) {
        let roTimer = null;
        let lastWidth = uiElements.canvasContainer.clientWidth;
        const ro = new ResizeObserver(() => {
            const w = uiElements.canvasContainer.clientWidth;
            if (Math.abs(w - lastWidth) < 1) return;
            lastWidth = w;
            clearTimeout(roTimer);
            roTimer = setTimeout(() => {
                clearContainerSizeCache();
                requestRedraw();
                lastWidth = uiElements.canvasContainer.clientWidth;
            }, 180);
        });
        ro.observe(uiElements.canvasContainer);
    }

    // E-7: ドロップ受付はキャンバスエリア全体（未読込でキャンバス枠が dashed のときも、
    // 読み込み後に余白へドロップしたときも拾えるように）。`.dragover` の見た目は枠へ付ける。
    const dropZone = uiElements.canvasArea || uiElements.canvasContainer;
    if (dropZone) {
        dropZone.addEventListener('dragover', (event) => {
            event.stopPropagation(); event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', (event) => {
            event.stopPropagation(); event.preventDefault();
            if (event.target === dropZone) dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (event) => {
            event.stopPropagation(); event.preventDefault();
            dropZone.classList.remove('dragover');
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                processImageFile(files[0], requestRedraw);
            }
        });
    }

    updateImagePresenceUI(); // 初期表示（画像なし → ドロップダイアログ）
    console.log("[Main] Kakomi App Initialized.");
});