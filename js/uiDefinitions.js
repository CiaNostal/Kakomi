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

    // フレーム加工タブ
    frameCornerStyle: { defaultValue: 'none' }, // ラジオボタンまたはselect用
    frameCornerRadiusPercent: { defaultValue: 0, min: 0, max: 50, step: 1 }, // %
    frameSuperellipseN: { defaultValue: 4, min: 3, max: 20, step: 1 },    // 整数

    frameShadowEnabled: { defaultValue: false }, // チェックボックス
    frameShadowType: { defaultValue: 'drop' },   // ラジオボタンまたはselect用 ('none', 'drop', 'inner')

    // ドロップシャドウ用
    frameDropShadowOffsetX: { defaultValue: 2, min: -25, max: 25, step: 1 },  // %
    frameDropShadowOffsetY: { defaultValue: 2, min: -25, max: 25, step: 1 },  // %
    frameDropShadowBlur: { defaultValue: 5, min: 0, max: 30, step: 1 },     // %
    frameDropShadowSpread: { defaultValue: 0, min: -20, max: 20, step: 1 }, // %
    frameDropShadowColor: { defaultValue: 'rgba(0,0,0,0.5)' },

    // インナーシャドウ用 (UIは後で実装するとしても、定義だけは先行可能)
    frameInnerShadowBlur: { defaultValue: 5, min: 0, max: 30, step: 1 },     // %
    frameInnerShadowSpread: { defaultValue: 3, min: 0, max: 20, step: 1 }, // % (太さ)
    frameInnerShadowColor: { defaultValue: 'rgba(0,0,0,0.75)' },

    // 縁取り用
    frameBorderEnabled: { defaultValue: false }, // チェックボックス
    frameBorderWidth: { defaultValue: 1, min: 0, max: 10, step: 0.1 },   // %
    frameBorderColor: { defaultValue: '#000000' },
    frameBorderStyle: { defaultValue: 'solid' }, // select用
};