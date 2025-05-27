// js/canvasRenderer.js
import { drawBackground } from './backgroundRenderer.js'; // ADDED: backgroundRenderer.jsからdrawBackgroundをインポート
import { createAndApplyClippingPath, applyShadow, applyBorder } from './frameRenderer.js'; // CHANGED
import { drawText } from './textRenderer.js';
import { drawImageWithPrecision } from './utils/canvasUtils.js'; // utilsからインポート

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

    // 写真の描画座標と寸法 (スケーリングされたプレビュー用)
    const scale = (outputTotalWidth === 0) ? 0 : previewCanvas.width / outputTotalWidth;
    const previewPhotoX = destXonOutputCanvas * scale;
    const previewPhotoY = destYonOutputCanvas * scale;
    const previewPhotoWidth = destWidth * scale;
    const previewPhotoHeight = destHeight * scale;
    const previewPhotoShortSidePx = Math.min(previewPhotoWidth, previewPhotoHeight);

    if (img && sourceWidth > 0 && sourceHeight > 0 && previewPhotoWidth > 0 && previewPhotoHeight > 0) {
        previewCtx.save(); // クリップや影などの効果は写真のみに適用するため

        // 1. 影の描画 (写真本体より先)
        if (currentState.frameSettings.shadowEnabled) {
            applyShadow(previewCtx, currentState.frameSettings.shadow, currentState.frameSettings, previewPhotoX, previewPhotoY, previewPhotoWidth, previewPhotoHeight, previewPhotoShortSidePx);
        }

        // 2. 写真のクリッピングパス設定と適用
        createAndApplyClippingPath(previewCtx, currentState.frameSettings, previewPhotoX, previewPhotoY, previewPhotoWidth, previewPhotoHeight);

        // 3. 写真本体の描画 (クリッピングパスの内側に描画される)
        drawImageWithPrecision(previewCtx, img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            previewPhotoX, previewPhotoY, previewPhotoWidth, previewPhotoHeight
        );

        // 4. 縁取りの描画 (クリッピングパスに沿って)
        if (currentState.frameSettings.border.enabled) {
            applyBorder(previewCtx, currentState.frameSettings.border, currentState.frameSettings, previewPhotoX, previewPhotoY, previewPhotoWidth, previewPhotoHeight, previewPhotoShortSidePx);
        }

        previewCtx.restore(); // クリップなどを解除
    }

    // テキストを描画 (フレームの後)
    if (currentState.textSettings.date.enabled || currentState.textSettings.exif.enabled) {
        drawText(previewCtx, currentState, previewCanvas.width, previewCanvas.height);
    }
}

export function renderFinal(currentState) {
    // ... (初期チェックは同様) ...

    // 写真本体の描画 (現在のdrawImage呼び出し)
    //     if (img) {
    //         const scale = (outputTotalWidth === 0) ? 0 : previewCanvas.width / outputTotalWidth;
    //         const previewPhotoX = destXonOutputCanvas * scale;
    //         const previewPhotoY = destYonOutputCanvas * scale;
    //         const previewPhotoWidth = destWidth * scale;
    //         const previewPhotoHeight = destHeight * scale;
    //         if (sourceWidth > 0 && sourceHeight > 0 && destWidth > 0 && destHeight > 0 && previewPhotoWidth > 0 && previewPhotoHeight > 0) {
    //             previewCtx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, previewPhotoX, previewPhotoY, previewPhotoWidth, previewPhotoHeight);

    //             // 写真描画後にフレーム効果を適用 (プレビュー用なので、座標と寸法はスケーリングされたもの)
    //             // 注意: applyFrameEffectsの内部実装（特に影の扱い）によっては、
    //             // この呼び出し順序では期待通りにならない可能性がある (影が写真の上になるなど)。
    //             // また、photoX, photoY, photoWidth, photoHeight は Canvas全体に対する写真の描画位置・サイズ。
    //             // スケーリングされた値を渡す必要がある。
    //             applyFrameEffects(previewCtx, currentState, previewPhotoX, previewPhotoY, previewPhotoWidth, previewPhotoHeight);
    //         }
    //     }

    //     // テキストを描画 (フレームの後)
    //     // drawText はCanvas全体の幅と高さを期待する
    //     // Google Fonts のロードは別途考慮 (drawTextをasyncにするか、事前にロード完了を待つ)
    //     if (currentState.textSettings.date.enabled || currentState.textSettings.exif.enabled) {
    //         drawText(previewCtx, currentState, previewCanvas.width, previewCanvas.height);
    //     }
    // }

    // export function renderFinal(currentState) {
    //     // 前回のscript.jsからrenderFinal関数の内容をここにコピー
    //     // 引数 currentState は editState オブジェクトを想定
    if (!currentState.image || !currentState.outputCanvasConfig || currentState.outputCanvasConfig.width <= 0 || currentState.outputCanvasConfig.height <= 0) {
        console.error("Render Final: Invalid state or image not loaded."); return null;
    }
    const img = currentState.image;
    const { sourceX, sourceY, sourceWidth, sourceHeight, destXonOutputCanvas, destYonOutputCanvas, destWidth, destHeight } = currentState.photoDrawConfig;
    const outputWidth = currentState.outputCanvasConfig.width;
    const outputHeight = currentState.outputCanvasConfig.height;
    const photoShortSidePx = Math.min(destWidth, destHeight); // 出力時の写真の短辺

    // 変数名を photoX, photoY などに統一
    const photoX = destXonOutputCanvas;
    const photoY = destYonOutputCanvas;
    const photoWidth = destWidth;
    const photoHeight = destHeight;

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

    // --- 写真とその装飾のための描画コンテキスト保存 ---
    ctx.save();

    // 1. 影の描画 (写真本体より先)
    if (currentState.frameSettings.shadowEnabled) {
        applyShadow(ctx, currentState.frameSettings.shadow, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
    }

    // 2. 写真のクリッピングパス設定と適用
    createAndApplyClippingPath(ctx, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight);

    // 3. 写真本体の描画 (クリッピングパスの内側に描画される)
    if (img && sourceWidth > 0 && sourceHeight > 0) {
        drawImageWithPrecision(ctx, img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            photoX, photoY, photoWidth, photoHeight
        );
    }

    // 4. 縁取りの描画 (クリッピングパスに沿って)
    if (currentState.frameSettings.border.enabled) {
        applyBorder(ctx, currentState.frameSettings.border, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
    }

    ctx.restore(); // クリップなどを解除

    // テキストを描画 (フレームの後)
    if (currentState.textSettings.date.enabled || currentState.textSettings.exif.enabled) {
        drawText(ctx, currentState, outputWidth, outputHeight);
    }


    return finalCanvas;
}