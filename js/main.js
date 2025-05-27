// js/main.js
// アプリケーションのエントリーポイント。各モジュールをインポートし、初期化処理を行います。

import { getState, updateState, addStateChangeListener } from './stateManager.js'; // CHANGED: Import from stateManager
// import { uiElements, initializeUIFromState, setupEventListeners } from './uiController.js';
// import { calculateLayout } from './layoutEngine.js'; // This will be replaced later
import { uiElements, initializeUIFromState, setupEventListeners } from './uiController.js'; // CHANGED: Import from layoutCalculator.js
import { calculateLayout } from './layoutCalculator.js'; // This will be replaced later
import { drawPreview } from './canvasRenderer.js'; // This will be refactored later
import { processImageFile, handleDownload } from './fileManager.js';
import { displayExifInfo } from './exifHandler.js'; // ADDED: Import for Exif display
import { initializeTabs } from './tabManager.js';

/**
 * プレビューの再描画を要求します。
 * editStateが更新された後や、UIの変更がプレビューに影響する場合に呼び出されます。
 */
export function requestRedraw() {
    const currentState = getState(); // Get state once at the beginning

    if (!currentState.image) {
        // 画像がない場合、プレビューをクリアする
        if (uiElements.previewCtx && uiElements.previewCanvas) {
            uiElements.previewCtx.clearRect(0, 0, uiElements.previewCanvas.width, uiElements.previewCanvas.height);

        }
        return;
    }
    const layoutInfo = calculateLayout(currentState); // Use captured currentState

    // 計算結果をeditStateに保存

    updateState({
        photoDrawConfig: layoutInfo.photoDrawConfig,
        outputCanvasConfig: layoutInfo.outputCanvasConfig
    });
    // updateStateがリスナーを呼び出すので、もしrequestRedrawがリスナー登録されていれば
    // ここで再度requestRedrawが呼ばれることになる。
    // drawPreview needs the state *after* the above updateState if it relies on photoDrawConfig/outputCanvasConfig being in the global state.
    // However, drawPreview receives `currentState` which is from *before* this specific updateState.
    // For consistency, let's pass the state that was used for layout calculation,
    // assuming drawPreview primarily uses photoDrawConfig and outputCanvasConfig from the state,
    // and these are now also in layoutInfo.
    // A cleaner way would be for drawPreview to accept layoutInfo directly if possible.
    // For now, to reflect the updateState call, it might be better to get the LATEST state for drawing.
    // Let's reconsider: the updateState above *mutates* the internal editState.
    // The `currentState` variable here holds a *copy* from the beginning of the function.
    // So, to draw with the updated config, we should use getState() again, OR pass layoutInfo to drawPreview.
    // Given our goal is to reduce getState calls, passing layoutInfo might be better long-term.
    // But for minimal change right now, let's ensure drawPreview gets up-to-date configs.
    // The most straightforward way with current drawPreview signature, after updateState, is to get fresh state.
    // This re-introduces a getState(), but only one extra, and ensures correctness.
    const freshStateForDraw = getState();

    // プレビューを描画
    if (uiElements.previewCanvas && uiElements.previewCtx) {
        drawPreview(freshStateForDraw, uiElements.previewCanvas, uiElements.previewCtx);

    } else {
        console.error("[Main] Preview canvas or context not available for redraw.");
    }

    // Display Exif Info
    if (uiElements.exifDataContainer && freshStateForDraw.exifData) {
        // currentState.exifData comes from stateManager
        // displayExifInfo is from exifHandler
        displayExifInfo(freshStateForDraw.exifData, uiElements.exifDataContainer);
    }
}

// DOMContentLoadedイベントでアプリケーションを初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Main] DOMContentLoaded: Initializing application with new StateManager...");

    if (uiElements.previewCanvas) {
        uiElements.previewCtx = uiElements.previewCanvas.getContext('2d');
    } else {
        console.error("[Main] Preview canvas element not found! Aborting initialization.");
        return;
    }

    // initializeUIFromState は uiController 内で getState() を使うように修正済み
    initializeUIFromState();
    // setupEventListeners は uiController 内で updateState() を使うように修正済み
    // requestRedraw をコールバックとして渡す
    setupEventListeners(requestRedraw);
    initializeTabs();           // タブ機能を初期化

    // (オプション) stateManagerのリスナーとしてrequestRedrawを登録する場合
    // addStateChangeListener(requestRedraw);
    // この場合、uiController内の各イベントリスナーはredrawCallbackを呼ばずにupdateStateのみ行う

    // ファイルローダーのイベントリスナー
    if (uiElements.imageLoader) {
        uiElements.imageLoader.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                console.log("[Main] Image selected via input:", file.name);
                // processImageFile は fileManager 内で stateManager の setImage を使うように修正済み
                processImageFile(file, requestRedraw);
            }
        });
    }

    // ダウンロードボタンのイベントリスナー
    if (uiElements.downloadButton) {
        // handleDownload は fileManager 内で getState を使うように修正済み
        uiElements.downloadButton.addEventListener('click', handleDownload);
    }

    // ドラッグ＆ドロップのイベントリスナー
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
                console.log("[Main] Image dropped:", files[0].name);
                processImageFile(files[0], requestRedraw);
            }
        });
    }
    console.log("[Main] Kakomi App Initialized (hopefully with new StateManager working).");

    // 初期描画（画像がもしあれば。通常はファイル選択後に描画される）
    // requestRedraw(); // 必要に応じて最初の描画をトリガー
});