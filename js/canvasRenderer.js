// js/canvasRenderer.js
import { drawBackground } from './backgroundRenderer.js';
import { createAndApplyClippingPath, applyShadow, applyBorder } from './frameRenderer.js'; // createSuperellipsePath, roundedRect はframeRenderer内部で使用
import { drawText } from './textRenderer.js'; // テキスト描画もインポートしておく
import { drawImageWithPrecision } from './utils/canvasUtils.js';


export async function drawPreview(currentState, previewCanvas, previewCtx) { // async追加
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
    const ctx = previewCtx; // 可読性のためエイリアス

    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // 0. プレビュー用のスケーリング計算
    const scale = (outputTotalWidth === 0) ? 0 : previewCanvas.width / outputTotalWidth;
    const photoX = destXonOutputCanvas * scale;
    const photoY = destYonOutputCanvas * scale;
    const photoWidth = destWidth * scale;
    const photoHeight = destHeight * scale;
    const photoShortSidePx = Math.min(photoWidth, photoHeight);

    // 1. 背景描画
    // プレビュー表示における写真の実際の短辺 photoShortSidePx を渡す
    drawBackground(ctx, previewCanvas.width, previewCanvas.height, currentState, photoShortSidePx);

    if (img && sourceWidth > 0 && sourceHeight > 0 && photoWidth > 0 && photoHeight > 0) {
        ctx.save(); // 写真とその装飾のためのコンテキスト保存

        // 2. ドロップシャドウ描画 (写真本体より先)
        if (currentState.frameSettings.shadowEnabled && currentState.frameSettings.shadowType === 'drop') {
            // applyShadow(ctx, currentState.frameSettings.dropShadow, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
            applyShadow(ctx, currentState.frameSettings.shadowParams, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
        }

        // 3. 写真のクリッピングパス設定と適用 (角丸・超楕円)
        createAndApplyClippingPath(ctx, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight);

        // 4. 写真本体の描画 (クリッピングパスの内側に描画される)
        drawImageWithPrecision(ctx, img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            photoX, photoY, photoWidth, photoHeight
        );

        // 5. インナーシャドウ描画 (クリッピングされた写真の上に合成)
        if (currentState.frameSettings.shadowEnabled && currentState.frameSettings.shadowType === 'inner') {
            // applyShadow(ctx, currentState.frameSettings.innerShadow, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
            applyShadow(ctx, currentState.frameSettings.shadowParams, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
        }

        // 6. 縁取りの描画 (クリッピングパスに沿って)
        if (currentState.frameSettings.border.enabled) {
            applyBorder(ctx, currentState.frameSettings.border, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
        }

        ctx.restore(); // 写真と装飾のためのコンテキスト復元 (クリッピング解除)
    }

    // 7. テキスト描画
    if (currentState.textSettings.date.enabled || currentState.textSettings.exif.enabled) {
        // Google Fonts のロードは別途考慮
        // プレビュー表示における写真の実際の短辺を渡し、フォント読み込みと描画を待つ
        await drawText(ctx, currentState, previewCanvas.width, previewCanvas.height, photoShortSidePx); // await追加
    }
}

export async function renderFinal(currentState) { // async追加
    if (!currentState.image || !currentState.outputCanvasConfig || currentState.outputCanvasConfig.width <= 0 || currentState.outputCanvasConfig.height <= 0) {
        console.error("Render Final: Invalid state or image not loaded."); return null;
    }
    const img = currentState.image;
    const { sourceX, sourceY, sourceWidth, sourceHeight, destXonOutputCanvas, destYonOutputCanvas, destWidth, destHeight } = currentState.photoDrawConfig;
    const outputWidth = currentState.outputCanvasConfig.width;
    const outputHeight = currentState.outputCanvasConfig.height;

    const photoX = destXonOutputCanvas;
    const photoY = destYonOutputCanvas;
    const photoWidth = destWidth;
    const photoHeight = destHeight;
    const photoShortSidePx = Math.min(photoWidth, photoHeight); // 出力時の写真の短辺

    if (outputWidth <= 0 || outputHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0 || photoWidth <= 0 || photoHeight <= 0) {
        console.error("Render Final: Invalid photo draw dimensions.", currentState.photoDrawConfig); return null;
    }

    const useOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
    const finalCanvas = useOffscreenCanvas ? new OffscreenCanvas(outputWidth, outputHeight) : document.createElement('canvas');
    if (!useOffscreenCanvas) {
        finalCanvas.width = outputWidth;
        finalCanvas.height = outputHeight;
    }
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) {
        console.error("Render Final: Could not get canvas context."); return null;
    }

    // 1. 背景描画
    // renderFinal時は、backgroundRenderer側でphotoDrawConfigから計算するため、第5引数は不要（またはoutput時のphotoShortSidePxを渡しても良い）
    drawBackground(ctx, outputWidth, outputHeight, currentState, photoShortSidePx);

    if (img && sourceWidth > 0 && sourceHeight > 0) {
        ctx.save(); // 写真とその装飾のためのコンテキスト保存

        // 2. ドロップシャドウ描画
        if (currentState.frameSettings.shadowEnabled && currentState.frameSettings.shadowType === 'drop') {
            // applyShadow(ctx, currentState.frameSettings.dropShadow, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
            applyShadow(ctx, currentState.frameSettings.shadowParams, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
        }

        // 3. 写真のクリッピングパス設定と適用
        createAndApplyClippingPath(ctx, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight);

        // 4. 写真本体の描画
        drawImageWithPrecision(ctx, img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            photoX, photoY, photoWidth, photoHeight
        );

        // 5. インナーシャドウ描画
        if (currentState.frameSettings.shadowEnabled && currentState.frameSettings.shadowType === 'inner') {
            applyShadow(ctx, currentState.frameSettings.shadowParams, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
        }

        // 6. 縁取りの描画
        if (currentState.frameSettings.border.enabled) {
            applyBorder(ctx, currentState.frameSettings.border, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
        }

        ctx.restore(); // クリップなどを解除
    }

    // 7. テキスト描画
    console.log("[CanvasRenderer] Attempting to draw text. date.enabled:", currentState.textSettings.date.enabled, "exif.enabled:", currentState.textSettings.exif.enabled, "basePhotoShortSideForTextPx:", photoShortSidePx);
    if (currentState.textSettings.date.enabled || currentState.textSettings.exif.enabled) {
        // Google Fonts のロードは別途考慮
        // 出力解像度における写真の実際の短辺を渡す
        await drawText(ctx, currentState, outputWidth, outputHeight, photoShortSidePx); // await追加
    }

    return finalCanvas;
}