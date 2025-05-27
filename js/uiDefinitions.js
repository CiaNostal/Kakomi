// js/uiDefinitions.js
// アプリケーションのUIコントロール設定値を定義します。

/**
 * 各UIコントロールの設定値 (min, max, step, defaultValue)
 * これにより、HTMLからこれらの値を分離し、JavaScriptで一元管理します。
 * defaultValue は主にUI要素の初期表示に使われ、
 * stateManager.js の初期状態は別途 stateManager.js 内で定義されます。
 */
export const controlsConfig = {
    // レイアウト設定タブ
    outputAspectRatio: { defaultValue: '1:1' }, // select要素のデフォルト選択値
    baseMarginPercent: { defaultValue: 5, min: 0, max: 100, step: 1 }, // number input
    photoPosX: { defaultValue: 0.5, min: 0, max: 1, step: 0.01 }, // range input
    photoPosY: { defaultValue: 0.5, min: 0, max: 1, step: 0.01 }, // range input
    // 背景編集タブ
    backgroundType: { defaultValue: 'color' }, // radio button のデフォルト選択値
    backgroundColor: { defaultValue: '#ffffff' }, // color input
    bgScale: { defaultValue: 2.0, min: 1, max: 5, step: 0.1 }, // range input
    bgBlur: { defaultValue: 3, min: 0, max: 20, step: 0.5 },  // range input
    bgBrightness: { defaultValue: 100, min: 0, max: 150, step: 1 }, // range input
    bgSaturation: { defaultValue: 100, min: 0, max: 150, step: 1 }, // range input
    // 出力タブ
    jpgQuality: { defaultValue: 100, min: 1, max: 100, step: 1 }, // range input (UI表示用1-100)
};