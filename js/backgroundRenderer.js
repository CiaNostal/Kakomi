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
function drawBackground(ctx, canvasWidth, canvasHeight, currentState) {
    if (currentState.backgroundType === 'color' || !currentState.image) {
        drawColorBackground(ctx, canvasWidth, canvasHeight, currentState.backgroundColor);
    } else if (currentState.backgroundType === 'imageBlur') {
        drawBlurredImageBackground(ctx, canvasWidth, canvasHeight, currentState);
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
 * @param {Object} currentState - 現在の編集状態
 */
function drawBlurredImageBackground(ctx, canvasWidth, canvasHeight, currentState) {
    const img = currentState.image;
    const params = currentState.imageBlurBackgroundParams;

    // 写真の短辺の長さを取得
    const photoDrawWidth = currentState.photoDrawConfig.destWidth;
    const photoDrawHeight = currentState.photoDrawConfig.destHeight;
    const photoShortSidePx = (photoDrawWidth > 0 && photoDrawHeight > 0) 
        ? Math.min(photoDrawWidth, photoDrawHeight) 
        : 100; // フォールバック

    const blurPx = photoShortSidePx * (params.blurAmountPercent / 100);

    ctx.save(); // フィルター適用前に状態を保存

    // フィルター文字列を生成
    let filterString = '';
    if (blurPx > 0) filterString += `blur(${blurPx}px) `;
    if (params.brightness !== 100) filterString += `brightness(${params.brightness}%) `;
    if (params.saturation !== 100) filterString += `saturate(${params.saturation}%)`;
    if (filterString.trim() !== '') {
        ctx.filter = filterString.trim();
    }

    // 元画像のアスペクト比を保ちつつ、Canvas全体を覆うように拡大描画
    const imgAspectRatio = img.width / img.height;
    const canvasAspectRatio = canvasWidth / canvasHeight;
    let sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight;

    dWidth = canvasWidth * params.scale;
    dHeight = canvasHeight * params.scale;
    dx = (canvasWidth - dWidth) / 2; // 中央に配置
    dy = (canvasHeight - dHeight) / 2;

    // 元画像から切り出す領域を決定（アスペクト比を維持しつつ中央から）
    if (imgAspectRatio > (dWidth / dHeight)) { // 元画像が描画領域より横長
        sHeight = img.height;
        sWidth = sHeight * (dWidth / dHeight);
        sx = (img.width - sWidth) / 2;
        sy = 0;
    } else { // 元画像が描画領域より縦長または同じアスペクト比
        sWidth = img.width;
        sHeight = sWidth / (dWidth / dHeight);
        sx = 0;
        sy = (img.height - sHeight) / 2;
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    ctx.restore(); // フィルターをリセット
}

// モジュールとしてエクスポート
export { drawBackground }; 