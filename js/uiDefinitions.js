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
    baseMarginPercent: { defaultValue: 5, min: 0, max: 100, step: 0.5 }, // number input
    photoPosX: { defaultValue: 0.5, min: 0, max: 1, step: 0.01 }, // range input
    photoPosY: { defaultValue: 0.5, min: 0, max: 1, step: 0.01 }, // range input
    // 背景編集タブ
    backgroundType: { defaultValue: 'color' }, // radio button のデフォルト選択値
    backgroundColor: { defaultValue: '#ffffff' }, // color input
    bgScale: { defaultValue: 2.0, min: 1, max: 5, step: 0.1 }, // range input
    bgBlur: { defaultValue: 3, min: 0, max: 40, step: 0.5 },  // range input
    bgBrightness: { defaultValue: 100, min: 0, max: 150, step: 1 }, // range input
    bgSaturation: { defaultValue: 100, min: 0, max: 150, step: 1 }, // range input
    // 出力タブ
    jpgQuality: { defaultValue: 100, min: 1, max: 100, step: 1 }, // range input (UI表示用1-100)

    // 文字入力タブ - 撮影日表示
    textDateEnabled: { defaultValue: false }, // チェックボックス
    textDateFormat: { defaultValue: 'YYYY/MM/DD' }, // select要素用
    textDateFont: { defaultValue: 'Arial' }, // select要素用 (将来的にはGoogle Fontsと連携)
    textDateSize: { defaultValue: 2, min: 0.1, max: 10, step: 0.1 }, // % (写真短辺比)
    textDateColor: { defaultValue: '#FFFFFF' }, // カラーピッカー
    textDatePosition: { defaultValue: 'bottom-right' }, // select要素用 (9箇所)
    textDateOffsetX: { defaultValue: 2, min: -50, max: 50, step: 0.5 }, // %
    textDateOffsetY: { defaultValue: 2, min: -50, max: 50, step: 0.5 }, // %

    // 文字入力タブ - Exif情報表示 
    textExifEnabled: { defaultValue: false }, // チェックボックス
    // textExifItems: // 表示項目選択は複数のチェックボックスになるため、個別にIDで管理 (controlsConfigには不要かも)
    textExifFont: { defaultValue: 'Arial' }, // select要素用
    textExifSize: { defaultValue: 2, min: 0.1, max: 10, step: 0.1 }, // % (写真短辺比)
    textExifColor: { defaultValue: '#000000' }, // カラーピッカー
    textExifPosition: { defaultValue: 'bottom-left' }, // select要素用 (9箇所)
    textExifOffsetX: { defaultValue: 2, min: -50, max: 50, step: 0.5 }, // %
    textExifOffsetY: { defaultValue: 2, min: -50, max: 50, step: 0.5 }, // %

    // Exif表示項目選択用チェックボックスのデフォルト値 (uiControllerで直接参照する想定)
    // textExifItemMake: { defaultValue: true }, // 例
    // textExifItemModel: { defaultValue: true }, // 例

    // フレーム加工タブ
    frameCornerStyle: { defaultValue: 'none' }, // ラジオボタンまたはselect用
    frameCornerRadiusPercent: { defaultValue: 0, min: 0, max: 50, step: 1 }, // %
    frameSuperellipseN: { defaultValue: 4, min: 3, max: 40, step: 1 },    // 整数

    frameShadowEnabled: { defaultValue: false }, // チェックボックス
    frameShadowType: { defaultValue: 'drop' },   // ラジオボタンまたはselect用 ('none', 'drop', 'inner')

    // 共通の影パラメータ用UI定義
    frameShadowOffsetX: { defaultValue: 0, min: -25, max: 25, step: 0.2 },  // % (共通化後のオフセットXのデフォルトを0に)
    frameShadowOffsetY: { defaultValue: 0, min: -25, max: 25, step: 0.2 },  // % (共通化後のオフセットYのデフォルトを0に)
    frameShadowBlur: { defaultValue: 5, min: 0, max: 10, step: 0.1 },     // %
    frameShadowEffectRange: { defaultValue: 0, min: 0, max: 10, step: 0.1 }, // % (新しい「効果の範囲」、正の値のみ)
    frameShadowColor: { defaultValue: 'rgba(0,0,0,0.5)' }, // カラーピッカー用 (共通の初期色)

    // 縁取り用
    frameBorderEnabled: { defaultValue: false }, // チェックボックス
    frameBorderWidth: { defaultValue: 1, min: 0, max: 3, step: 0.05 },   // %
    frameBorderColor: { defaultValue: '#000000' },
    frameBorderStyle: { defaultValue: 'solid' }, // select用
};