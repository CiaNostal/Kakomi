/**
 * background.js
 * 背景描画を担当するモジュール
 */

/**
 * 背景を描画する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {number} canvasWidth - キャンバスの幅
 * @param {number} canvasHeight - キャンバスの高さ
 * @param {Object} currentState - 現在の編集状態
 */
function drawBackground(ctx, canvasWidth, canvasHeight, currentState, basePhotoShortSideForBlurPxIfPreview) {
    if (currentState.backgroundType === 'color' || !currentState.image) {
        drawColorBackground(ctx, canvasWidth, canvasHeight, currentState.backgroundColor);
    } else if (currentState.backgroundType === 'bgImage') {
        // B-6: 背景タイプ「別画像」。editState.bgImage をクロップせず全体を使い、
        // ぼかし背景と同じ cover スケール／フィルタ／位置ロジックで敷く
        // （パラメータは imageBlurBackgroundParams を共有）。画像未選択なら単色にフォールバック。
        const bg = currentState.bgImage;
        if (!bg || !bg.width || !bg.height) {
            drawColorBackground(ctx, canvasWidth, canvasHeight, currentState.backgroundColor);
        } else {
            const baseLength = basePhotoShortSideForBlurPxIfPreview !== undefined
                ? basePhotoShortSideForBlurPxIfPreview
                : Math.min(currentState.photoDrawConfig.destWidth, currentState.photoDrawConfig.destHeight);
            drawBlurredImageBackground(
                ctx, canvasWidth, canvasHeight, bg, currentState.imageBlurBackgroundParams, baseLength,
                { x: 0, y: 0, w: bg.width, h: bg.height }
            );
        }
    } else if (currentState.backgroundType === 'imageBlur') {
        // プレビュー時はプレビュー上の写真短辺、出力時は出力上の写真短辺を渡す
        const baseLength = basePhotoShortSideForBlurPxIfPreview !== undefined
            ? basePhotoShortSideForBlurPxIfPreview
            : Math.min(currentState.photoDrawConfig.destWidth, currentState.photoDrawConfig.destHeight);
        // ぼかし背景は「クロップ後の写真」を元にする。photoDrawConfig.source* が
        // クロップ矩形の元画像ピクセル座標（layoutCalculator が算出）。未算出時は画像全体にフォールバック。
        const pdc = currentState.photoDrawConfig;
        const sourceRect = (pdc && pdc.sourceWidth > 0 && pdc.sourceHeight > 0)
            ? { x: pdc.sourceX, y: pdc.sourceY, w: pdc.sourceWidth, h: pdc.sourceHeight }
            : { x: 0, y: 0, w: currentState.image.width, h: currentState.image.height };
        drawBlurredImageBackground(ctx, canvasWidth, canvasHeight, currentState.image, currentState.imageBlurBackgroundParams, baseLength, sourceRect);

    }
}

/**
 * 単色背景を描画する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {number} canvasWidth - キャンバスの幅
 * @param {number} canvasHeight - キャンバスの高さ
 * @param {string} color - 背景色（CSS色形式）
 */
function drawColorBackground(ctx, canvasWidth, canvasHeight, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

/**
 * 拡大ぼかし背景を描画する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {number} canvasWidth - キャンバスの幅
 * @param {number} canvasHeight - キャンバスの高さ
 * @param {Object} img - 背景に使用するImageオブジェクト (currentState.image)
 * @param {Object} blurParams - ぼかしパラメータ (currentState.imageBlurBackgroundParams)
 * @param {number} basePhotoShortSideForBlurPx - ぼかし強度計算の基準となる写真の短辺の実際のピクセル長
 * @param {{x:number,y:number,w:number,h:number}} [sourceRect] - 背景に使う元画像の範囲（クロップ後）。省略時は画像全体
 */
function drawBlurredImageBackground(ctx, canvasWidth, canvasHeight, img, blurParams, basePhotoShortSideForBlurPx, sourceRect) {
    if (!img || !blurParams || basePhotoShortSideForBlurPx <= 0) return;

    // 背景に使う元画像の範囲（クロップ後の写真）。不正なら画像全体にフォールバック。
    const src = (sourceRect && sourceRect.w > 0 && sourceRect.h > 0)
        ? sourceRect
        : { x: 0, y: 0, w: img.width, h: img.height };

    const blurPx = basePhotoShortSideForBlurPx * (blurParams.blurAmountPercent / 100);

    ctx.save(); // フィルター適用前に状態を保存

    // フィルター文字列を生成
    let filterString = '';
    if (blurPx > 0) filterString += `blur(${blurPx}px) `;
    if (blurParams.brightness !== 100) filterString += `brightness(${blurParams.brightness}%) `;
    if (blurParams.saturation !== 100) filterString += `saturate(${blurParams.saturation}%)`;
    if (filterString.trim() !== '') {
        ctx.filter = filterString.trim();
    }

    // クロップ後の写真のアスペクト比を保ちつつ、Canvas全体を覆うように拡大描画
    const imgAspectRatio = src.w / src.h;
    // const canvasAspectRatio = canvasWidth / canvasHeight;
    let sx = src.x, sy = src.y, sWidth = src.w, sHeight = src.h; // ★ クロップ後の範囲を使用
    let dx, dy, finalDrawWidth, finalDrawHeight;

    // 1. クロップ後の写真がCanvasを「カバー」するように基本スケールを計算
    let coverScale;
    if (canvasWidth / canvasHeight > imgAspectRatio) {
        // Canvasが写真より横長の場合、写真の幅をCanvasの幅に合わせるスケール
        coverScale = canvasWidth / src.w;
    } else {
        // Canvasが写真より縦長（または同じ比率）の場合、写真の高さをCanvasの高さに合わせるスケール
        coverScale = canvasHeight / src.h;
    }

    // 2. 基本スケールにユーザー指定の拡大率を適用
    const totalScale = coverScale * blurParams.scale;
    finalDrawWidth = src.w * totalScale;
    finalDrawHeight = src.h * totalScale;

    // 中心からのオフセットを計算 (dx, dy は描画開始位置)
    // まず中央に配置
    dx = (canvasWidth - finalDrawWidth) / 2;
    dy = (canvasHeight - finalDrawHeight) / 2;

    // ユーザー指定のオフセットを適用 (仕様書に基づき、写真短辺基準の%をピクセルに変換して適用)
    // basePhotoShortSideForBlurPx は、プレビュー/出力時の実際の写真短辺の長さ(px)
    const pixelOffsetX = (blurParams.offsetXPercent / 100) * basePhotoShortSideForBlurPx;
    const pixelOffsetY = (blurParams.offsetYPercent / 100) * basePhotoShortSideForBlurPx;
    dx += pixelOffsetX;
    dy += pixelOffsetY;

    // クロップ後の範囲 (sx, sy, sWidth, sHeight) を、計算された finalDrawWidth, finalDrawHeight で
    // dx, dy の位置に描画する
    ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, finalDrawWidth, finalDrawHeight);
    ctx.restore(); // フィルターをリセット
}

// モジュールとしてエクスポート
export { drawBackground }; 