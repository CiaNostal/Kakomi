// js/uiDefinitions.js
// アプリケーションのUIコントロール設定値を定義します。

/**
 * 使用するGoogle Fontsのリスト
 * displayName: UI表示用の名前
 * apiName: Google Fonts APIに渡す名前 (ウェイト指定含む)
 * fontFamilyForCanvas: ctx.font で使用するフォントファミリー名
 * fontWeightForCanvas: ctx.font で使用するウェイト
 */
export const googleFonts = [
    { displayName: "Roboto Thin", apiName: "Roboto:wght@100", fontFamilyForCanvas: "Roboto", fontWeightForCanvas: "100" },
    { displayName: "Roboto Light", apiName: "Roboto:wght@300", fontFamilyForCanvas: "Roboto", fontWeightForCanvas: "300" },
    { displayName: "Roboto Medium", apiName: "Roboto:wght@500", fontFamilyForCanvas: "Roboto", fontWeightForCanvas: "500" },
    { displayName: "Roboto Bold", apiName: "Roboto:wght@700", fontFamilyForCanvas: "Roboto", fontWeightForCanvas: "700" },
    { displayName: "Roboto Black", apiName: "Roboto:wght@900", fontFamilyForCanvas: "Roboto", fontWeightForCanvas: "900" },
    { displayName: "Lato Thin", apiName: "Lato:wght@100", fontFamilyForCanvas: "Lato", fontWeightForCanvas: "100" },
    { displayName: "Lato Light", apiName: "Lato:wght@300", fontFamilyForCanvas: "Lato", fontWeightForCanvas: "300" },
    { displayName: "Lato Regular", apiName: "Lato:wght@400", fontFamilyForCanvas: "Lato", fontWeightForCanvas: "400" },
    { displayName: "Lato Bold", apiName: "Lato:wght@700", fontFamilyForCanvas: "Lato", fontWeightForCanvas: "700" },
    { displayName: "Lato Black", apiName: "Lato:wght@900", fontFamilyForCanvas: "Lato", fontWeightForCanvas: "900" },
    { displayName: "Montserrat Thin", apiName: "Montserrat:wght@100", fontFamilyForCanvas: "Montserrat", fontWeightForCanvas: "100" },
    { displayName: "Montserrat Light", apiName: "Montserrat:wght@300", fontFamilyForCanvas: "Montserrat", fontWeightForCanvas: "300" },
    { displayName: "Montserrat Medium", apiName: "Montserrat:wght@500", fontFamilyForCanvas: "Montserrat", fontWeightForCanvas: "500" },
    { displayName: "Montserrat Bold", apiName: "Montserrat:wght@700", fontFamilyForCanvas: "Montserrat", fontWeightForCanvas: "700" },
    { displayName: "Montserrat Black", apiName: "Montserrat:wght@900", fontFamilyForCanvas: "Montserrat", fontWeightForCanvas: "900" },
    { displayName: "Raleway Thin", apiName: "Raleway:wght@100", fontFamilyForCanvas: "Raleway", fontWeightForCanvas: "100" },
    { displayName: "Raleway Light", apiName: "Raleway:wght@300", fontFamilyForCanvas: "Raleway", fontWeightForCanvas: "300" },
    { displayName: "Raleway Medium", apiName: "Raleway:wght@500", fontFamilyForCanvas: "Raleway", fontWeightForCanvas: "500" },
    { displayName: "Raleway Bold", apiName: "Raleway:wght@700", fontFamilyForCanvas: "Raleway", fontWeightForCanvas: "700" },
    { displayName: "Raleway Black", apiName: "Raleway:wght@900", fontFamilyForCanvas: "Raleway", fontWeightForCanvas: "900" },
    { displayName: "Josefin Slab Thin", apiName: "Josefin Slab:wght@100", fontFamilyForCanvas: "Josefin Slab", fontWeightForCanvas: "100" },
    { displayName: "Josefin Slab Light", apiName: "Josefin Slab:wght@300", fontFamilyForCanvas: "Josefin Slab", fontWeightForCanvas: "300" },
    { displayName: "Josefin Slab Medium", apiName: "Josefin Slab:wght@500", fontFamilyForCanvas: "Josefin Slab", fontWeightForCanvas: "500" },
    { displayName: "Josefin Slab Bold", apiName: "Josefin Slab:wght@700", fontFamilyForCanvas: "Josefin Slab", fontWeightForCanvas: "700" },
    { displayName: "Oswald ExtraLight", apiName: "Oswald:wght@200", fontFamilyForCanvas: "Oswald", fontWeightForCanvas: "200" },
    { displayName: "Oswald Regular", apiName: "Oswald:wght@400", fontFamilyForCanvas: "Oswald", fontWeightForCanvas: "400" },
    { displayName: "Oswald Bold", apiName: "Oswald:wght@700", fontFamilyForCanvas: "Oswald", fontWeightForCanvas: "700" },
    { displayName: "Orbitron Regular", apiName: "Orbitron:wght@400", fontFamilyForCanvas: "Orbitron", fontWeightForCanvas: "400" },
    { displayName: "Orbitron Bold", apiName: "Orbitron:wght@700", fontFamilyForCanvas: "Orbitron", fontWeightForCanvas: "700" },
    { displayName: "Orbitron Black", apiName: "Orbitron:wght@900", fontFamilyForCanvas: "Orbitron", fontWeightForCanvas: "900" },
    { displayName: "Cormorant Garamond Light", apiName: "Cormorant Garamond:wght@300", fontFamilyForCanvas: "Cormorant Garamond", fontWeightForCanvas: "300" },
    { displayName: "Cormorant Garamond Medium", apiName: "Cormorant Garamond:wght@500", fontFamilyForCanvas: "Cormorant Garamond", fontWeightForCanvas: "500" },
    { displayName: "Cormorant Garamond Bold", apiName: "Cormorant Garamond:wght@700", fontFamilyForCanvas: "Cormorant Garamond", fontWeightForCanvas: "700" },
    // { displayName: "Open Sans Light", apiName: "Open Sans:wght@300", fontFamilyForCanvas: "Open Sans", fontWeightForCanvas: "300" },
    { displayName: "Julius Sans One Regular", apiName: "Julius Sans One:wght@400", fontFamilyForCanvas: "Julius Sans One", fontWeightForCanvas: "400" },
    { displayName: "Caveat Regular", apiName: "Caveat:wght@400", fontFamilyForCanvas: "Caveat", fontWeightForCanvas: "400" },
    { displayName: "Caveat Bold", apiName: "Caveat:wght@700", fontFamilyForCanvas: "Caveat", fontWeightForCanvas: "700" },
    { displayName: "Cookie Regular", apiName: "Cookie:wght@400", fontFamilyForCanvas: "Cookie", fontWeightForCanvas: "400" },
    { displayName: "Shadows Into Light", apiName: "Shadows Into Light:wght@400", fontFamilyForCanvas: "Shadows Into Light", fontWeightForCanvas: "400" }
];

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
    bgScale: { defaultValue: 2.0, min: 1, max: 8, step: 0.1 }, // range input
    bgBlur: { defaultValue: 3, min: 0, max: 50, step: 0.5 },  // range input
    bgBrightness: { defaultValue: 100, min: 0, max: 150, step: 1 }, // range input
    bgSaturation: { defaultValue: 100, min: 0, max: 150, step: 1 }, // range input
    bgOffsetX: { defaultValue: 0, min: -500, max: 500, step: 2 }, // 背景Xオフセット%
    bgOffsetY: { defaultValue: 0, min: -500, max: 500, step: 2 }, // 背景Yオフセット%

    // 出力タブ
    jpgQuality: { defaultValue: 100, min: 1, max: 100, step: 1 }, // range input (UI表示用1-100)

    // 文字入力タブ - 撮影日表示
    textDateEnabled: { defaultValue: false }, // チェックボックス
    textDateFormat: { defaultValue: 'YYYY/MM/DD' }, // select要素用
    textDateFont: { defaultValue: googleFonts[0].displayName }, // ★Google Fontsリストの最初のフォントをデフォルトに
    textDateSize: { defaultValue: 2, min: 0.1, max: 10, step: 0.1 }, // % (写真短辺比)
    textDateColor: { defaultValue: '#FFFFFF' }, // カラーピッカー
    textDatePosition: { defaultValue: 'bottom-right' }, // select要素用 (9箇所)
    textDateOffsetX: { defaultValue: 2, min: -50, max: 50, step: 0.5 }, // %
    textDateOffsetY: { defaultValue: 2, min: -50, max: 50, step: 0.5 }, // %

    // 文字入力タブ - Exif情報表示
    textExifEnabled: { defaultValue: false }, // チェックボックス
    textExifFont: { defaultValue: googleFonts[0].displayName }, // ★Google Fontsリストの最初のフォントをデフォルトに
    textExifSize: { defaultValue: 2, min: 0.1, max: 10, step: 0.1 }, // % (写真短辺比)
    textExifColor: { defaultValue: '#000000' }, // カラーピッカー
    textExifPosition: { defaultValue: 'bottom-left' }, // select要素用 (9箇所)
    textExifOffsetX: { defaultValue: 2, min: -50, max: 50, step: 0.5 }, // %
    textExifOffsetY: { defaultValue: 2, min: -50, max: 50, step: 0.5 }, // %

    // フレーム加工タブ
    frameCornerStyle: { defaultValue: 'none' }, // ラジオボタンまたはselect用
    frameCornerRadiusPercent: { defaultValue: 0, min: 0, max: 50, step: 1 }, // %
    frameSuperellipseN: { defaultValue: 4, min: 3, max: 40, step: 1 },    // 整数

    frameShadowEnabled: { defaultValue: false }, // チェックボックス
    frameShadowType: { defaultValue: 'drop' },   // ラジオボタンまたはselect用 ('none', 'drop', 'inner')

    // 共通の影パラメータ用UI定義
    frameShadowOffsetX: { defaultValue: 0, min: -25, max: 25, step: 0.2 },
    frameShadowOffsetY: { defaultValue: 0, min: -25, max: 25, step: 0.2 },
    frameShadowBlur: { defaultValue: 5, min: 0, max: 10, step: 0.1 },
    frameShadowEffectRange: { defaultValue: 0, min: 0, max: 10, step: 0.1 },
    frameShadowColor: { defaultValue: '#000000' }, // カラーピッカー用 (RGB HEX)
    frameShadowOpacity: { defaultValue: 0.5, min: 0, max: 1, step: 0.01 }, // ★追加: 影の不透明度スライダー

    // 縁取り用
    frameBorderEnabled: { defaultValue: false }, // チェックボックス
    frameBorderWidth: { defaultValue: 1, min: 0, max: 3, step: 0.05 },
    frameBorderColor: { defaultValue: '#000000' },
    frameBorderStyle: { defaultValue: 'solid' },
};