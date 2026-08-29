/**
 * layout.js
 * レイアウト計算を担当するモジュール
 */
import { resolveCropRect } from './utils/cropRect.js';

/**
 * アスペクト比文字列から後方互換用の "custom:" プレフィックスを取り除く
 * @param {string} aspectRatioStr - アスペクト比の文字列（例: '16:9' または 'custom:16:9'）
 * @returns {string} プレフィックスを除去した文字列
 */
function stripCustomPrefix(aspectRatioStr) {
    return aspectRatioStr && aspectRatioStr.startsWith('custom:')
        ? aspectRatioStr.substring(7)
        : aspectRatioStr;
}

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
    // A-4: クロップ後の写真をキャンバス内で回す角度（度）。
    const photoRotationDeg = currentState.photoViewParams.rotation || 0;

    // 1. 構図調整設定に基づいて、元画像から切り出す領域を決定する。
    // cropSettings.rect は「元画像に対する割合」 { x, y, w, h }（0–1）で切り出し矩形を表す。
    // 旧形式（zoom / offsetX / offsetY）の状態が渡された場合も resolveCropRect が矩形へ変換する。
    // 切り出した領域は元画像の解像度をそのまま維持して描画される（destWidth === sourceWidth）。
    const cropRect = resolveCropRect(currentState.cropSettings, originalImgWidth, originalImgHeight);
    const sourceX = cropRect.x * originalImgWidth;
    const sourceY = cropRect.y * originalImgHeight;
    const sourceWidth = cropRect.w * originalImgWidth;
    const sourceHeight = cropRect.h * originalImgHeight;

    // 描画サイズ = 切り出したサイズ（元の解像度を維持）
    const photoDrawWidthPx = sourceWidth;
    const photoDrawHeightPx = sourceHeight;

    // A-4: 写真を回すと、キャンバスに収めるべきは「回転後の外接矩形」。
    // 実際に drawImage するサイズ（photoDrawWidth/HeightPx）は回転前のまま＝レンダラが
    // 写真中心まわりに ctx.rotate してから等倍で描く。ここでは外接矩形の寸法だけ別に持つ。
    const rotRad = photoRotationDeg * Math.PI / 180;
    const absCos = Math.abs(Math.cos(rotRad));
    const absSin = Math.abs(Math.sin(rotRad));
    const bboxWidthPx = photoDrawWidthPx * absCos + photoDrawHeightPx * absSin;
    const bboxHeightPx = photoDrawWidthPx * absSin + photoDrawHeightPx * absCos;

    // 出力アスペクト比 'original_photo' 用は「見た目の footprint」＝外接矩形の比率で合わせる。
    const currentPhotoAspectRatio = (bboxHeightPx === 0) ? 1 : bboxWidthPx / bboxHeightPx;

    // 2. 基準値の計算。余白・テキストの基準となる「写真短辺」は回転前の値で固定する
    //    （回すたびに余白やテキストサイズの基準が変わらないように）。
    const photoShortSidePx = Math.min(photoDrawWidthPx, photoDrawHeightPx);

    // 3. 最小余白の計算
    const minMarginPx = Math.round(photoShortSidePx * (currentState.baseMarginPercent / 100));

    // 4. 出力Canvasの寸法決定（外接矩形＋余白を基準にする）
    const tempWidthWithMinMargin = bboxWidthPx + 2 * minMarginPx;
    const tempHeightWithMinMargin = bboxHeightPx + 2 * minMarginPx;
    const tempAspectRatio = (tempHeightWithMinMargin === 0) ? 1 : tempWidthWithMinMargin / tempHeightWithMinMargin;

    let outputTargetAspectRatioValue;
    if (currentState.outputTargetAspectRatioString === 'original_photo') {
        outputTargetAspectRatioValue = currentPhotoAspectRatio;
    } else {
        // width:height形式の解析
        const aspectRatioStr = currentState.outputTargetAspectRatioString;
        const cleanAspectRatioStr = stripCustomPrefix(aspectRatioStr);

        const parts = cleanAspectRatioStr.split(':');
        if (parts.length === 2) {
            const width = parseFloat(parts[0]);
            const height = parseFloat(parts[1]);
            if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                outputTargetAspectRatioValue = width / height;
            } else {
                outputTargetAspectRatioValue = 1;
            }
        } else {
            outputTargetAspectRatioValue = 1;
        }
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
    outputCanvasWidthPx = Math.max(outputCanvasWidthPx, Math.round(bboxWidthPx));
    outputCanvasHeightPx = Math.max(outputCanvasHeightPx, Math.round(bboxHeightPx));
    if (outputCanvasWidthPx <= 0) outputCanvasWidthPx = 1;
    if (outputCanvasHeightPx <= 0) outputCanvasHeightPx = 1;

    // 5. 写真の描画位置決定 (出力枠内でのスライド)。
    // offsetX/Y は「回転後の外接矩形」を可動範囲内で動かす割合。写真本体はその外接矩形の
    // 中心に置き、レンダラが中心まわりに回す。回転 0 のときは bbox = 写真なので従来と一致する。
    const movableWidth = outputCanvasWidthPx - bboxWidthPx;
    const movableHeight = outputCanvasHeightPx - bboxHeightPx;

    const bboxXonCanvasPx = movableWidth * offsetX;
    const bboxYonCanvasPx = movableHeight * offsetY;
    const photoXonCanvasPx = bboxXonCanvasPx + (bboxWidthPx - photoDrawWidthPx) / 2;
    const photoYonCanvasPx = bboxYonCanvasPx + (bboxHeightPx - photoDrawHeightPx) / 2;

    // 各辺の余白の実際の値を計算（デバッグ用。外接矩形基準）
    const actualMargins = {
        left: bboxXonCanvasPx,
        right: outputCanvasWidthPx - (bboxXonCanvasPx + bboxWidthPx),
        top: bboxYonCanvasPx,
        bottom: outputCanvasHeightPx - (bboxYonCanvasPx + bboxHeightPx)
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
            destYonOutputCanvas: Math.round(photoYonCanvasPx),
            // A-4: 写真中心まわりの回転角（度）。レンダラが drawImage 前に ctx.rotate する。
            rotation: photoRotationDeg
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
    
    const cleanAspectRatioStr = stripCustomPrefix(aspectRatioStr);

    // width:height形式の解析
    const parts = cleanAspectRatioStr.split(':');
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
export { calculateLayout, getAspectRatioValue, stripCustomPrefix };