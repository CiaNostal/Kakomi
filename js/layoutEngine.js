// js/layoutEngine.js
// calculateLayout関数をここに配置します。
// この関数は現在のeditStateを引数に取り、計算結果のlayoutInfoを返します。
// import { editState } from './state.js'; // 直接stateを参照するか、引数で受け取る

export function calculateLayout(currentState) {
    // 前回のscript.jsからcalculateLayout関数の内容をそのままここにコピー
    // 引数 currentState は editState オブジェクトを想定
    if (!currentState.image) {
        return {
            photoDrawConfig: { sourceX: 0, sourceY: 0, sourceWidth: 0, sourceHeight: 0, destWidth: 0, destHeight: 0, destXonOutputCanvas: 0, destYonOutputCanvas: 0 },
            outputCanvasConfig: { width: 300, height: 200 } // Default placeholder size
        };
    }

    const originalImgWidth = currentState.originalWidth;
    const originalImgHeight = currentState.originalHeight;
    const { offsetX, offsetY } = currentState.photoViewParams;

    const sourceX = 0;
    const sourceY = 0;
    const sourceWidth = originalImgWidth;
    const sourceHeight = originalImgHeight;

    const photoDrawWidthPx = originalImgWidth;
    const photoDrawHeightPx = originalImgHeight;
    const currentPhotoAspectRatio = (photoDrawHeightPx === 0) ? 1 : photoDrawWidthPx / photoDrawHeightPx;

    const photoShortSidePx = Math.min(photoDrawWidthPx, photoDrawHeightPx);
    const minMarginPx = Math.round(photoShortSidePx * (currentState.baseMarginPercent / 100));

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

    const movableWidth = outputCanvasWidthPx - photoDrawWidthPx;
    const movableHeight = outputCanvasHeightPx - photoDrawHeightPx;
    const photoXonCanvasPx = movableWidth * offsetX;
    const photoYonCanvasPx = movableHeight * offsetY;

    // console.log('--- calculateLayout ---'); // デバッグログはmain.jsや必要箇所で
    // ...

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
        }
    };
}