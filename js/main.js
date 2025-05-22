// js/main.js
// アプリケーションのエントリーポイント。各モジュールをインポートし、初期化処理を行います。

import { editState, updateEditState, resetEditStateToDefault } from './state.js';
import { uiElements, initializeUIFromState, setupEventListeners } from './uiController.js';
import { calculateLayout } from './layoutEngine.js';
import { drawPreview } from './canvasRenderer.js';
import { processImageFile, handleDownload } from './fileManager.js';
import { initializeTabs } from './tabManager.js';

/**
 * プレビューの再描画を要求します。
 * editStateが更新された後や、UIの変更がプレビューに影響する場合に呼び出されます。
 */
export function requestRedraw() {
    if (!editState.image) {
        // 画像がない場合、プレビューをクリアする
        if (uiElements.previewCtx && uiElements.previewCanvas) {
            uiElements.previewCtx.clearRect(0, 0, uiElements.previewCanvas.width, uiElements.previewCanvas.height);
            // 必要であれば、プレビューCanvasのサイズもデフォルトに戻す
            // uiElements.previewCanvas.width = 300; // 例
            // uiElements.previewCanvas.height = 200; // 例
        }
        return;
    }
    const layoutInfo = calculateLayout(editState); // 現在の状態でレイアウトを計算

    // 計算結果をeditStateに保存
    updateEditState({
        photoDrawConfig: layoutInfo.photoDrawConfig,
        outputCanvasConfig: layoutInfo.outputCanvasConfig
    });

    // プレビューを描画
    if (uiElements.previewCanvas && uiElements.previewCtx) {
        drawPreview(editState, uiElements.previewCanvas, uiElements.previewCtx);
    } else {
        console.error("[Main] Preview canvas or context not available for redraw.");
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

    initializeUIFromState();    // editStateの初期値に基づいてUIの属性と値を設定
    setupEventListeners(requestRedraw); // UI要素にイベントリスナーを設定し、redrawCallbackを渡す
    initializeTabs();           // タブ機能を初期化

    // ファイルローダーのイベントリスナー
    if (uiElements.imageLoader) {
        uiElements.imageLoader.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                console.log("[Main] Image selected via input:", file.name);
                processImageFile(file, requestRedraw); // redrawCallbackを渡す
            }
        });
    }

    // ダウンロードボタンのイベントリスナー
    if (uiElements.downloadButton) {
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
                processImageFile(files[0], requestRedraw); // redrawCallbackを渡す
            }
        });
    }
    console.log("[Main] Kakomi App Initialized and Refactored.");
});