// js/config.js
// アプリケーションのUIコントロール設定と、editStateのデフォルト値を定義します。

/**
 * 各UIコントロールの設定値 (min, max, step, defaultValue)
 * これにより、HTMLからこれらの値を分離し、JavaScriptで一元管理します。
 */
export const controlsConfig = {
    // レイアウト設定タブ
    outputAspectRatio: { defaultValue: '1:1' }, // select要素のデフォルト選択値
    baseMarginPercent: { defaultValue: 5, min: 0, max: 100, step: 1 }, // number input
    photoPosX: { defaultValue: 0.5, min: 0, max: 1, step: 0.01, displayFormat: (val) => (Math.round((val - 0.5) * 2 * 100) === 0 ? '中央' : `${Math.round((val - 0.5) * 2 * 100)}%`) }, // range input
    photoPosY: { defaultValue: 0.5, min: 0, max: 1, step: 0.01, displayFormat: (val) => (Math.round((val - 0.5) * 2 * 100) === 0 ? '中央' : `${Math.round((val - 0.5) * 2 * 100)}%`) }, // range input

    // 背景編集タブ
    backgroundType: { defaultValue: 'color' }, // radio button のデフォルト選択値
    backgroundColor: { defaultValue: '#ffffff' }, // color input
    bgScale: { defaultValue: 2.0, min: 1, max: 5, step: 0.1, displayFormat: (val) => `${parseFloat(val).toFixed(1)}x` }, // range input
    bgBlur: { defaultValue: 3, min: 0, max: 20, step: 0.5, displayFormat: (val) => `${parseFloat(val).toFixed(1)}%` },  // range input
    bgBrightness: { defaultValue: 100, min: 0, max: 150, step: 1, displayFormat: (val) => `${val}%` }, // range input
    bgSaturation: { defaultValue: 100, min: 0, max: 150, step: 1, displayFormat: (val) => `${val}%` }, // range input

    // 出力タブ
    jpgQuality: { defaultValue: 100, min: 1, max: 100, step: 1, displayFormat: (val) => `${val}` }, // range input (UI表示用1-100)
};

/**
 * アプリケーションの編集状態のデフォルト値。
 * controlsConfigのdefaultValueを参照して生成します。
 */
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
    exifData: {}, 
    photoDrawConfig: {
        sourceX: 0, sourceY: 0, sourceWidth: 0, sourceHeight: 0,
        destWidth: 0, destHeight: 0,
        destXonOutputCanvas: 0, destYonOutputCanvas: 0
    },
    outputCanvasConfig: { width: 300, height: 200 },
};