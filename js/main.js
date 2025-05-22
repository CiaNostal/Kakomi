// js/main.js
// アプリケーションのエントリーポイント。各モジュールをインポートし、初期化処理を行います。

import { editState, updateEditState, resetEditStateToDefault } from './state.js';
import { uiElements, initializeUIFromState, setupEventListeners } from './uiController.js';
import { calculateLayout } from './layoutEngine.js';
import { drawPreview } from './canvasRenderer.js';
import { processImageFile, handleDownload } from './fileManager.js';
import { initializeTabs } from './tabManager.js';

export function requestRedraw() {
    if (!editState.image) {
        // 画像がない場合、プレビューをクリアするなどの処理も検討
        if (uiElements.previewCtx && uiElements.previewCanvas) {
            uiElements.previewCtx.clearRect(0, 0, uiElements.previewCanvas.width, uiElements.previewCanvas.height);
        }
        return;
    }
    const layoutInfo = calculateLayout(editState);
    updateEditState({
        photoDrawConfig: layoutInfo.photoDrawConfig,
        outputCanvasConfig: layoutInfo.outputCanvasConfig
    });
    if (uiElements.previewCanvas && uiElements.previewCtx) {
        drawPreview(editState, uiElements.previewCanvas, uiElements.previewCtx);
    } else {
        console.error("Preview canvas or context not available for redraw.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (uiElements.previewCanvas) {
        uiElements.previewCtx = uiElements.previewCanvas.getContext('2d');
    } else {
        console.error("Preview canvas element not found!");
        return;
    }

    initializeUIFromState(); // editStateの初期値に基づいてUIの属性と値を設定
    setupEventListeners(requestRedraw); // UI要素にイベントリスナーを設定し、redrawCallbackを渡す
    initializeTabs();        // タブ機能を初期化

    if (uiElements.imageLoader) {
        uiElements.imageLoader.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) processImageFile(file, requestRedraw); // redrawCallbackを渡す
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
            if (files.length > 0) processImageFile(files[0], requestRedraw); // redrawCallbackを渡す
        });
    }
    console.log("Kakomi App Initialized and Refactored");
});