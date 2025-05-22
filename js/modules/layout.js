/**
 * layout.js
 * レイアウト計算を担当するモジュール
 */

/**
 * 編集状態からレイアウト情報を計算する
 * @param {Object} currentState - 現在の編集状態
 * @returns {Object} レイアウト情報を含むオブジェクト
 */
function calculateLayout(currentState) {
    if (!currentState.image) {
        return {
            photoDrawConfig: {
                sourceX: 0, sourceY: 0, sourceWidth: 0, sourceHeight: 0,
                destWidth: 0, destHeight: 0,
                destXonOutputCanvas: 0, destYonOutputCanvas: 0
            },
            outputCanvasConfig: {
                width: 0, height: 0
            }
        };
    }

    const originalImgWidth = currentState.originalWidth;
    const originalImgHeight = currentState.originalHeight;
    const { offsetX, offsetY } = currentState.photoViewParams;

    // 1. 構図調整設定に基づいて、元画像から切り出す領域を決定
    const cropSettings = currentState.cropSettings;
    let sourceX, sourceY, sourceWidth, sourceHeight;

    // アスペクト比を解析
    let cropAspectRatio;
    if (cropSettings.aspectRatio === 'original') {
        cropAspectRatio = originalImgWidth / originalImgHeight;
    } else {
        const parts = cropSettings.aspectRatio.split(':');
        cropAspectRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
    }

    // 切り出し領域のサイズと位置を計算
    if (originalImgWidth / originalImgHeight > cropAspectRatio) {
        // 元画像が切り出し比率より横長の場合、高さに合わせる
        sourceHeight = originalImgHeight;
        sourceWidth = sourceHeight * cropAspectRatio;
        sourceY = 0;
        sourceX = (originalImgWidth - sourceWidth) * cropSettings.offsetX;
    } else {
        // 元画像が切り出し比率より縦長の場合、幅に合わせる
        sourceWidth = originalImgWidth;
        sourceHeight = sourceWidth / cropAspectRatio;
        sourceX = 0;
        sourceY = (originalImgHeight - sourceHeight) * cropSettings.offsetY;
    }

    // ズーム適用（中心から拡大）
    if (cropSettings.zoom > 1.0) {
        const centerX = sourceX + sourceWidth / 2;
        const centerY = sourceY + sourceHeight / 2;
        sourceWidth /= cropSettings.zoom;
        sourceHeight /= cropSettings.zoom;
        sourceX = centerX - sourceWidth / 2;
        sourceY = centerY - sourceHeight / 2;
    }

    // 描画サイズ = 切り出したサイズ（元の解像度を維持）
    const photoDrawWidthPx = sourceWidth;
    const photoDrawHeightPx = sourceHeight;
    const currentPhotoAspectRatio = (photoDrawHeightPx === 0) ? 1 : photoDrawWidthPx / photoDrawHeightPx;

    // 2. 基準値の計算
    const photoShortSidePx = Math.min(photoDrawWidthPx, photoDrawHeightPx);

    // 3. 最小余白の計算
    const minMarginPx = Math.round(photoShortSidePx * (currentState.baseMarginPercent / 100));

    // 4. 出力Canvasの寸法決定
    const tempWidthWithMinMargin = photoDrawWidthPx + 2 * minMarginPx;
    const tempHeightWithMinMargin = photoDrawHeightPx + 2 * minMarginPx;
    const tempAspectRatio = (tempHeightWithMinMargin === 0) ? 1 : tempWidthWithMinMargin / tempHeightWithMinMargin;

    let outputTargetAspectRatioValue;
    if (currentState.outputTargetAspectRatioString === 'original_photo') {
        outputTargetAspectRatioValue = currentPhotoAspectRatio;
    } else {
        const parts = currentState.outputTargetAspectRatioString.split(':');
        outputTargetAspectRatioValue = parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    if (isNaN(outputTargetAspectRatioValue) || outputTargetAspectRatioValue <= 0) outputTargetAspectRatioValue = 1;

    let outputCanvasWidthPx, outputCanvasHeightPx;
    if (tempHeightWithMinMargin <= 0 || outputTargetAspectRatioValue <= 0 || tempWidthWithMinMargin <= 0) {
        outputCanvasWidthPx = Math.max(1, tempWidthWithMinMargin);
        outputCanvasHeightPx = Math.max(1, tempHeightWithMinMargin > 0 ? tempHeightWithMinMargin : outputCanvasWidthPx / outputTargetAspectRatioValue);
        if (outputCanvasHeightPx <= 0) outputCanvasHeightPx = outputCanvasWidthPx;
    } else if (tempAspectRatio > outputTargetAspectRatioValue) {
        outputCanvasWidthPx = tempWidthWithMinMargin;
        outputCanvasHeightPx = Math.round(tempWidthWithMinMargin / outputTargetAspectRatioValue);
    } else {
        outputCanvasHeightPx = tempHeightWithMinMargin;
        outputCanvasWidthPx = Math.round(tempHeightWithMinMargin * outputTargetAspectRatioValue);
    }
    outputCanvasWidthPx = Math.max(outputCanvasWidthPx, Math.round(photoDrawWidthPx));
    outputCanvasHeightPx = Math.max(outputCanvasHeightPx, Math.round(photoDrawHeightPx));
    if (outputCanvasWidthPx <= 0) outputCanvasWidthPx = 1;
    if (outputCanvasHeightPx <= 0) outputCanvasHeightPx = 1;

    // 5. 写真の描画位置決定 (出力枠内でのスライド)
    const movableWidth = outputCanvasWidthPx - photoDrawWidthPx;
    const movableHeight = outputCanvasHeightPx - photoDrawHeightPx;

    // offsetX, offsetY (0-1) を使って、可動範囲内で写真の左上座標を決定
    const photoXonCanvasPx = movableWidth * offsetX;
    const photoYonCanvasPx = movableHeight * offsetY;

    // 各辺の余白の実際の値を計算（デバッグ用）
    const actualMargins = {
        left: photoXonCanvasPx,
        right: outputCanvasWidthPx - (photoXonCanvasPx + photoDrawWidthPx),
        top: photoYonCanvasPx,
        bottom: outputCanvasHeightPx - (photoYonCanvasPx + photoDrawHeightPx)
    };

    return {
        photoDrawConfig: {
            sourceX: Math.round(sourceX),
            sourceY: Math.round(sourceY),
            sourceWidth: Math.round(sourceWidth),
            sourceHeight: Math.round(sourceHeight),
            destWidth: Math.round(photoDrawWidthPx),
            destHeight: Math.round(photoDrawHeightPx),
            destXonOutputCanvas: Math.round(photoXonCanvasPx),
            destYonOutputCanvas: Math.round(photoYonCanvasPx)
        },
        outputCanvasConfig: {
            width: Math.round(outputCanvasWidthPx),
            height: Math.round(outputCanvasHeightPx),
        },
        actualMargins: actualMargins
    };
}

/**
 * 出力アスペクト比の文字列から数値を取得する
 * @param {string} aspectRatioStr - アスペクト比の文字列（例: '16:9'）
 * @returns {number} アスペクト比の数値
 */
function getAspectRatioValue(aspectRatioStr) {
    if (aspectRatioStr === 'original_photo' || !aspectRatioStr) {
        return null; // 特殊ケース: 元画像の比率を使用
    }
    
    const parts = aspectRatioStr.split(':');
    if (parts.length !== 2) {
        return 1; // デフォルト値
    }
    
    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);
    
    if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
        return 1; // 不正な値の場合はデフォルト
    }
    
    return numerator / denominator;
}

// モジュールとしてエクスポート
export { calculateLayout, getAspectRatioValue }; 