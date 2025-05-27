// js/canvasRenderer.js
// drawPreview, renderFinal, drawOrRenderBackground 関数をここに配置します。
import { drawBackground } from './backgroundRenderer.js'; // ADDED: backgroundRenderer.jsからdrawBackgroundをインポート


// REMOVED: drawOrRenderBackground 関数は backgroundRenderer.js に移管されました。

export function drawPreview(currentState, previewCanvas, previewCtx) {
    // 前回のscript.jsからdrawPreview関数の内容をここにコピー
    // 引数 currentState は editState、previewCanvas と previewCtx を受け取る
    if (!currentState.image) {
        if (previewCtx && previewCanvas) previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        return;
    }
    if (!currentState.outputCanvasConfig || currentState.outputCanvasConfig.width === 0) {
        if (previewCtx && previewCanvas) previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        return;
    }

    const img = currentState.image;
    const { sourceX, sourceY, sourceWidth, sourceHeight,
        destXonOutputCanvas, destYonOutputCanvas,
        destWidth, destHeight } = currentState.photoDrawConfig;
    const outputTotalWidth = currentState.outputCanvasConfig.width;
    const outputTotalHeight = currentState.outputCanvasConfig.height;
    const outputAspectRatio = (outputTotalHeight === 0 || outputTotalWidth === 0) ? 1 : outputTotalWidth / outputTotalHeight;

    const container = previewCanvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    let canvasRenderWidth, canvasRenderHeight;
    if (containerWidth <= 0 || containerHeight <= 0) { canvasRenderWidth = 300; canvasRenderHeight = 200; }
    else if (containerWidth / containerHeight > outputAspectRatio) { canvasRenderHeight = containerHeight; canvasRenderWidth = containerHeight * outputAspectRatio; }
    else { canvasRenderWidth = containerWidth; canvasRenderHeight = containerWidth / outputAspectRatio; }

    previewCanvas.width = Math.max(1, Math.floor(canvasRenderWidth));
    previewCanvas.height = Math.max(1, Math.floor(canvasRenderHeight));

    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // CHANGED: インポートした drawBackground 関数を使用
    drawBackground(previewCtx, previewCanvas.width, previewCanvas.height, currentState);
    if (img) {
        const scale = (outputTotalWidth === 0) ? 0 : previewCanvas.width / outputTotalWidth;
        const previewPhotoX = destXonOutputCanvas * scale;
        const previewPhotoY = destYonOutputCanvas * scale;
        const previewPhotoWidth = destWidth * scale;
        const previewPhotoHeight = destHeight * scale;
        if (sourceWidth > 0 && sourceHeight > 0 && destWidth > 0 && destHeight > 0 && previewPhotoWidth > 0 && previewPhotoHeight > 0) {
            previewCtx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, previewPhotoX, previewPhotoY, previewPhotoWidth, previewPhotoHeight);
        }
    }
}

export function renderFinal(currentState) {
    // 前回のscript.jsからrenderFinal関数の内容をここにコピー
    // 引数 currentState は editState オブジェクトを想定
    if (!currentState.image || !currentState.outputCanvasConfig || currentState.outputCanvasConfig.width <= 0 || currentState.outputCanvasConfig.height <= 0) {
        console.error("Render Final: Invalid state or image not loaded."); return null;
    }
    const img = currentState.image;
    const { sourceX, sourceY, sourceWidth, sourceHeight, destXonOutputCanvas, destYonOutputCanvas, destWidth, destHeight } = currentState.photoDrawConfig;
    const outputWidth = currentState.outputCanvasConfig.width;
    const outputHeight = currentState.outputCanvasConfig.height;

    if (outputWidth <= 0 || outputHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) {
        console.error("Render Final: Invalid photo draw dimensions.", currentState.photoDrawConfig); return null;
    }

    // OffscreenCanvasが使えるかチェック (ブラウザ互換性のため)
    const useOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
    const finalCanvas = useOffscreenCanvas ? new OffscreenCanvas(outputWidth, outputHeight) : document.createElement('canvas');
    if (!useOffscreenCanvas) {
        finalCanvas.width = outputWidth;
        finalCanvas.height = outputHeight;
    }
    const ctx = finalCanvas.getContext('2d');

    // CHANGED: インポートした drawBackground 関数を使用
    drawBackground(ctx, outputWidth, outputHeight, currentState); (ctx, outputWidth, outputHeight, currentState);
    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, destXonOutputCanvas, destYonOutputCanvas, destWidth, destHeight);
    return finalCanvas;
}