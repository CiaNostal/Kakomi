// js/config.js
// UIコントロールの設定値と、editStateのデフォルト値を定義します。

export const controlsConfig = {
    outputAspectRatio: { defaultValue: '1:1' },
    baseMarginPercent: { defaultValue: 5, min: 0, max: 100, step: 1 },
    photoPosX: { defaultValue: 0.5, min: 0, max: 1, step: 0.01 },
    photoPosY: { defaultValue: 0.5, min: 0, max: 1, step: 0.01 },
    backgroundType: { defaultValue: 'color' },
    backgroundColor: { defaultValue: '#ffffff' },
    bgScale: { defaultValue: 2.0, min: 1, max: 5, step: 0.1 },
    bgBlur: { defaultValue: 3, min: 0, max: 20, step: 0.5 },
    bgBrightness: { defaultValue: 100, min: 0, max: 300, step: 1 },
    bgSaturation: { defaultValue: 100, min: 0, max: 300, step: 1 },
    jpgQuality: { defaultValue: 100, min: 1, max: 100, step: 1 },
};

export const defaultEditState = {
    image: null,
    originalWidth: 0,
    originalHeight: 0,
    photoViewParams: {
        offsetX: controlsConfig.photoPosX.defaultValue,
        offsetY: controlsConfig.photoPosY.defaultValue,
    },
    outputTargetAspectRatioString: controlsConfig.outputAspectRatio.defaultValue,
    baseMarginPercent: controlsConfig.baseMarginPercent.defaultValue,
    backgroundColor: controlsConfig.backgroundColor.defaultValue,
    backgroundType: controlsConfig.backgroundType.defaultValue,
    imageBlurBackgroundParams: {
        scale: controlsConfig.bgScale.defaultValue,
        blurAmountPercent: controlsConfig.bgBlur.defaultValue,
        brightness: controlsConfig.bgBrightness.defaultValue,
        saturation: controlsConfig.bgSaturation.defaultValue,
    },
    outputJpgQuality: controlsConfig.jpgQuality.defaultValue / 100,
    photoDrawConfig: {
        sourceX: 0, sourceY: 0, sourceWidth: 0, sourceHeight: 0,
        destWidth: 0, destHeight: 0,
        destXonOutputCanvas: 0, destYonOutputCanvas: 0
    },
    outputCanvasConfig: { width: 300, height: 200 },
};