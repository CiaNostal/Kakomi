// js/config.js
// アプリケーションのデフォルト状態や設定値を定義します。

export const defaultEditState = {
    image: null,
    originalWidth: 0,
    originalHeight: 0,
    photoViewParams: {
        offsetX: 0.5,
        offsetY: 0.5
    },
    outputTargetAspectRatioString: '1:1',
    baseMarginPercent: 5,
    backgroundColor: '#ffffff',
    backgroundType: 'color',
    imageBlurBackgroundParams: {
        scale: 2.0,
        blurAmountPercent: 3,
        brightness: 100,
        saturation: 100
    },
    outputJpgQuality: 1.0, // JPG画質設定のデフォルト値を追加
    // photoDrawConfig と outputCanvasConfig は calculateLayout で動的に設定されるため、
    // ここでは初期値として空オブジェクトまたはnullを設定しても良い
    photoDrawConfig: {
        sourceX: 0, sourceY: 0, sourceWidth: 0, sourceHeight: 0,
        destWidth: 0, destHeight: 0,
        destXonOutputCanvas: 0, destYonOutputCanvas: 0
    },
    outputCanvasConfig: { width: 300, height: 200 }, // 画像未選択時のプレビューCanvasの仮サイズなど
};