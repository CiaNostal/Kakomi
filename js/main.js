// js/main.js
// アプリケーションのエントリーポイント。各モジュールをインポートし、初期化処理を行います。

import { getState, updateState, addStateChangeListener } from './stateManager.js';
import { uiElements, initializeUIFromState, setupEventListeners, syncUIFromState } from './uiController.js'; // updateFrameSettingsVisibility を追加
import { calculateLayout } from './layoutCalculator.js'; // 正しいレイアウト計算モジュール
import { drawPreview } from './canvasRenderer.js';     // 現在の描画モジュール
import { processImageFile, handleDownload } from './fileManager.js';
import { displayExifInfo } from './exifHandler.js';   // Exif表示用
import { initializeTabs } from './tabManager.js';
import { initCanvasInteraction } from './interaction/canvasInteraction.js';
import * as selectionStore from './interaction/selectionStore.js';
import { initHistory, recordStateChange, undo, redo, onHistoryChange, onSnapshotApplied } from './history/historyManager.js';

/**
 * プレビューの再描画を要求します。
 * editStateが更新された後や、UIの変更がプレビューに影響する場合に呼び出されます。
 */
export async function requestRedraw() {
    const currentState = getState(); // 状態を一度だけ取得

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
    selectionStore.onSelectionChange(() => {
        requestRedraw();
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

    // 「情報」ボタン: Exif情報のフローティングカードの開閉。
    // タブ切り替え（tabManager.js）とは独立した仕組みのため、ここで個別に配線する。
    if (uiElements.exifToggleButton && uiElements.exifFloatCard) {
        uiElements.exifToggleButton.addEventListener('click', () => {
            uiElements.exifToggleButton.classList.toggle('active');
            uiElements.exifFloatCard.classList.toggle('open');
        });
    }

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

    if (uiElements.downloadButton) {
        uiElements.downloadButton.addEventListener('click', handleDownload);
    }

    if (uiElements.canvasContainer) {
        uiElements.canvasContainer.addEventListener('dragover', (event) => {
            event.stopPropagation(); event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            uiElements.canvasContainer.classList.add('dragover');
        });
        uiElements.canvasContainer.addEventListener('dragleave', (event) => {
            event.stopPropagation(); event.preventDefault();
            uiElements.canvasContainer.classList.remove('dragover');
        });
        uiElements.canvasContainer.addEventListener('drop', (event) => {
            event.stopPropagation(); event.preventDefault();
            uiElements.canvasContainer.classList.remove('dragover');
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                // 同上
                processImageFile(files[0], requestRedraw);
            }
        });
    }
    console.log("[Main] Kakomi App Initialized.");
});