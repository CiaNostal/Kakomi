/**
 * canvas-utils.js
 * Canvas操作に関するユーティリティ関数
 */

/**
 * Canvas要素のサイズを親コンテナに合わせて設定する
 * @param {HTMLCanvasElement} canvas - サイズを設定するCanvas要素
 * @param {number} targetAspectRatio - 維持したいアスペクト比
 * @returns {Object} 設定されたwidthとheightを含むオブジェクト
 */
function fitCanvasToContainer(canvas, targetAspectRatio) {
    if (!canvas) return { width: 0, height: 0 };
    
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    let canvasWidth, canvasHeight;
    
    if (containerWidth <= 0 || containerHeight <= 0) {
        // コンテナのサイズが取得できない場合はデフォルト値を使用
        canvasWidth = 300;
        canvasHeight = canvasWidth / targetAspectRatio;
    } else if (containerWidth / containerHeight > targetAspectRatio) {
        // コンテナが目標アスペクト比より横長の場合、高さに合わせる
        canvasHeight = containerHeight;
        canvasWidth = containerHeight * targetAspectRatio;
    } else {
        // コンテナが目標アスペクト比より縦長の場合、幅に合わせる
        canvasWidth = containerWidth;
        canvasHeight = containerWidth / targetAspectRatio;
    }
    
    // 小数点以下を切り捨て、最小値を1pxとする
    canvas.width = Math.max(1, Math.floor(canvasWidth));
    canvas.height = Math.max(1, Math.floor(canvasHeight));
    
    return { width: canvas.width, height: canvas.height };
}

/**
 * 画像をCanvasに描画する際に、解像度を維持するための計算を行う
 * @param {number} sourceX - 元画像上の切り出し開始X座標
 * @param {number} sourceY - 元画像上の切り出し開始Y座標
 * @param {number} sourceWidth - 元画像上の切り出し幅
 * @param {number} sourceHeight - 元画像上の切り出し高さ
 * @param {number} destX - 描画先Canvas上のX座標
 * @param {number} destY - 描画先Canvas上のY座標
 * @param {number} destWidth - 描画先Canvas上の幅
 * @param {number} destHeight - 描画先Canvas上の高さ
 * @returns {Object} 整数化されたパラメータを含むオブジェクト
 */
function calculateDrawImageParams(sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight) {
    return {
        sourceX: Math.round(sourceX),
        sourceY: Math.round(sourceY),
        sourceWidth: Math.round(sourceWidth),
        sourceHeight: Math.round(sourceHeight),
        destX: Math.round(destX),
        destY: Math.round(destY),
        destWidth: Math.round(destWidth),
        destHeight: Math.round(destHeight)
    };
}

/**
 * キャンバスの内容をJPEG形式のBlobに変換する
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas - 変換するキャンバス
 * @param {number} quality - JPEG品質（0-1）
 * @returns {Promise<Blob>} JPEG形式のBlobを含むPromise
 */
function canvasToJpegBlob(canvas, quality = 0.95) {
    if (canvas instanceof OffscreenCanvas) {
        return canvas.convertToBlob({ type: 'image/jpeg', quality });
    } else if (canvas instanceof HTMLCanvasElement) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', quality);
        });
    }
    
    return Promise.reject(new Error('有効なキャンバスが指定されていません。'));
}

/**
 * 指定されたCanvasと同じサイズのOffscreenCanvasを作成する
 * @param {HTMLCanvasElement} sourceCanvas - 元となるCanvas
 * @returns {OffscreenCanvas} 作成されたOffscreenCanvas
 */
function createOffscreenCanvasFromCanvas(sourceCanvas) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const offscreenCanvas = new OffscreenCanvas(width, height);
    
    const ctx = offscreenCanvas.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
    
    return offscreenCanvas;
}

/**
 * Canvas上に高品質な画像を描画する（整数座標を使用して解像度を維持）
 * @param {CanvasRenderingContext2D} ctx - 描画先のキャンバスコンテキスト
 * @param {HTMLImageElement} img - 描画する画像
 * @param {number} sx - 元画像上の切り出し開始X座標
 * @param {number} sy - 元画像上の切り出し開始Y座標
 * @param {number} sWidth - 元画像上の切り出し幅
 * @param {number} sHeight - 元画像上の切り出し高さ
 * @param {number} dx - 描画先のX座標
 * @param {number} dy - 描画先のY座標
 * @param {number} dWidth - 描画先の幅
 * @param {number} dHeight - 描画先の高さ
 */
function drawImageWithPrecision(ctx, img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
    const params = calculateDrawImageParams(sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    
    ctx.drawImage(
        img,
        params.sourceX,
        params.sourceY,
        params.sourceWidth,
        params.sourceHeight,
        params.destX,
        params.destY,
        params.destWidth,
        params.destHeight
    );
}

// モジュールとしてエクスポート
export {
    fitCanvasToContainer,
    calculateDrawImageParams,
    canvasToJpegBlob,
    createOffscreenCanvasFromCanvas,
    drawImageWithPrecision
}; 