import { editState, updateEditState, resetEditStateToDefault } from './state.js';
import { uiElements, initializeUIFromState, setupEventListeners, displayExifDataInHtml } from './uiController.js'; // displayExifDataInHtml をインポート
import { calculateLayout } from './layoutEngine.js';
import { drawPreview } from './canvasRenderer.js';
import { processImageFile, handleDownload } from './fileManager.js';
import { initializeTabs } from './tabManager.js';

export function requestRedraw() {
    if (!editState.image) {
        if (uiElements.previewCtx && uiElements.previewCanvas) {
            uiElements.previewCtx.clearRect(0, 0, uiElements.previewCanvas.width, uiElements.previewCanvas.height);
        }
        // 画像がない場合、Exif表示もクリアする
        if (uiElements.exifDataContainer) {
            displayExifDataInHtml({}); // 空のデータを渡して初期メッセージ表示
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
        console.error("[Main] Preview canvas or context not available for redraw.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Main] DOMContentLoaded: Initializing application...");

    if (uiElements.previewCanvas) {
        uiElements.previewCtx = uiElements.previewCanvas.getContext('2d');
    } else {
        console.error("[Main] Preview canvas element not found! Aborting initialization.");
        return;
    }

    initializeUIFromState();
    setupEventListeners(requestRedraw);
    initializeTabs();

    if (uiElements.imageLoader) {
        uiElements.imageLoader.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                console.log("[Main] Image selected via input:", file.name);
                processImageFile(file, requestRedraw);
            }
        });
    }

    if (uiElements.downloadButton) {
        uiElements.downloadButton.addEventListener('click', handleDownload);
    }

    const dragDropTarget = document.querySelector('.preview-section.drag-drop-target');
    if (dragDropTarget) {
        dragDropTarget.addEventListener('dragover', (event) => {
            event.stopPropagation(); event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            // dragDropTarget のスタイルを変更してフィードバックを与える (例: .dragover クラスを追加)
            dragDropTarget.classList.add('dragover-active'); // CSSで .dragover-active スタイルを定義
        });
        dragDropTarget.addEventListener('dragleave', (event) => {
            event.stopPropagation(); event.preventDefault();
            dragDropTarget.classList.remove('dragover-active');
        });
        dragDropTarget.addEventListener('drop', (event) => {
            event.stopPropagation(); event.preventDefault();
            dragDropTarget.classList.remove('dragover-active');
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                console.log("[Main] Image dropped:", files[0].name);
                processImageFile(files[0], requestRedraw);
            }
        });
    } else {
        console.warn("Drag and drop target element (.preview-section.drag-drop-target) not found.");
    }
    // 初期状態では画像がないので、Exif表示エリアを初期メッセージにする
    displayExifDataInHtml({});
    console.log("[Main] Kakomi App Initialized with Exif functionality base.");
});