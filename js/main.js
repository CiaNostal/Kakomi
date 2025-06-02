// js/main.js
// アプリケーションのエントリーポイント。各モジュールをインポートし、初期化処理を行います。

import { getState, updateState, addStateChangeListener } from './stateManager.js';
import { uiElements, initializeUIFromState, setupEventListeners } from './uiController.js'; // updateFrameSettingsVisibility を追加
import { calculateLayout } from './layoutCalculator.js'; // 正しいレイアウト計算モジュール
import { drawPreview } from './canvasRenderer.js';     // 現在の描画モジュール
import { processImageFile, handleDownload } from './fileManager.js';
import { displayExifInfo } from './exifHandler.js';   // Exif表示用
import { initializeTabs } from './tabManager.js';

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

    updateState({
        photoDrawConfig: layoutInfo.photoDrawConfig,
        outputCanvasConfig: layoutInfo.outputCanvasConfig
    });

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
    setupEventListeners(requestRedraw); // requestRedrawをコールバックとして渡す
    initializeTabs();

    // (オプション) stateManagerのリスナーとしてrequestRedrawを登録する場合の検討:
    // addStateChangeListener(requestRedraw);
    // この場合、uiController内の各イベントリスナーはredrawCallbackを呼ばず、updateStateのみを行う形になる。
    // これにより、状態変更が一元的にrequestRedrawをトリガーするようになるが、
    // updateStateがrequestRedraw内で呼ばれる場合（現状photoDrawConfigなどの保存で発生）の
    // 無限ループや不要な再描画を防ぐ工夫が必要になる場合がある。現状はコールバック方式を維持。

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