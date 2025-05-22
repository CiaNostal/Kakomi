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
    photoPosX: { defaultValue: 0.5, min: 0, max: 1, step: 0.01 }, // range input
    photoPosY: { defaultValue: 0.5, min: 0, max: 1, step: 0.01 }, // range input

    // 背景編集タブ
    backgroundType: { defaultValue: 'color' }, // radio button のデフォルト選択値
    backgroundColor: { defaultValue: '#ffffff' }, // color input
    bgScale: { defaultValue: 2.0, min: 1, max: 5, step: 0.1 }, // range input
    bgBlur: { defaultValue: 3, min: 0, max: 20, step: 0.5 },  // range input
    bgBrightness: { defaultValue: 100, min: 0, max: 300, step: 1 }, // range input
    bgSaturation: { defaultValue: 100, min: 0, max: 300, step: 1 }, // range input

    // 出力タブ
    jpgQuality: { defaultValue: 100, min: 1, max: 100, step: 1 }, // range input (UI表示用1-100)
};

/**
 * アプリケーションの編集状態のデフォルト値。
 * controlsConfigのdefaultValueを参照して生成します。
 */
export const defaultEditState = {
    image: null,            // アップロードされたImageオブジェクト
    originalWidth: 0,       // 元画像の幅
    originalHeight: 0,      // 元画像の高さ

    // レイアウト設定
    photoViewParams: {      // 出力枠内での写真の表示パラメータ
        offsetX: controlsConfig.photoPosX.defaultValue, // 0 (左端) to 1 (右端), 0.5 = 中央
        offsetY: controlsConfig.photoPosY.defaultValue, // 0 (上端) to 1 (下端), 0.5 = 中央
    },
    outputTargetAspectRatioString: controlsConfig.outputAspectRatio.defaultValue, // 出力画像の目標アスペクト比 (文字列 '1:1'など)
    baseMarginPercent: controlsConfig.baseMarginPercent.defaultValue,       // 基準余白 (%)

    // 背景設定
    backgroundColor: controlsConfig.backgroundColor.defaultValue,       // 単色背景の色
    backgroundType: controlsConfig.backgroundType.defaultValue,         // 'color' または 'imageBlur'
    imageBlurBackgroundParams: { // 拡大ぼかし背景のパラメータ
        scale: controlsConfig.bgScale.defaultValue,
        blurAmountPercent: controlsConfig.bgBlur.defaultValue,      // 写真短辺に対するぼかし強度の%
        brightness: controlsConfig.bgBrightness.defaultValue,   // 明るさ %
        saturation: controlsConfig.bgSaturation.defaultValue,   // 彩度 %
    },

    // 出力設定
    outputJpgQuality: controlsConfig.jpgQuality.defaultValue / 100, // JPG出力品質 (0.01 - 1.0で保持)

    // 以下は calculateLayout 関数によって動的に設定される
    photoDrawConfig: {      // Canvasに描画する際の写真の描画情報
        sourceX: 0, sourceY: 0, sourceWidth: 0, sourceHeight: 0, // 元画像からの切り出し元
        destWidth: 0, destHeight: 0,                             // Canvas上の描画サイズ
        destXonOutputCanvas: 0, destYonOutputCanvas: 0           // Canvas上の描画開始位置
    },
    outputCanvasConfig: {   // 最終的な出力Canvas全体の寸法
        width: 300,         // 画像未選択時のプレビューCanvasの仮サイズなど
        height: 200
    },
};