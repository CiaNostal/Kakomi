// js/uiController.js
import { getState, updateState } from './stateManager.js';
import { controlsConfig, googleFonts } from './uiDefinitions.js';
import { loadGoogleFonts } from './textRenderer.js';

export const uiElements = {
    imageLoader: document.getElementById('imageLoader'),
    previewCanvas: document.getElementById('previewCanvas'),
    previewCtx: null,
    downloadButton: document.getElementById('downloadButton'),
    canvasContainer: document.querySelector('.canvas-container'),

    // レイアウト設定タブ
    outputAspectRatioSelect: document.getElementById('outputAspectRatio'),
    baseMarginPercentInput: document.getElementById('baseMarginPercent'),
    baseMarginPercentValueSpan: document.getElementById('baseMarginPercentValue'),
    photoPosXSlider: document.getElementById('photoPosX'),
    photoPosYSlider: document.getElementById('photoPosY'),
    photoPosXValueSpan: document.getElementById('photoPosXValue'),
    photoPosYValueSpan: document.getElementById('photoPosYValue'),

    // 背景編集タブ
    bgTypeColorRadio: document.getElementById('bgTypeColor'),
    bgTypeImageBlurRadio: document.getElementById('bgTypeImageBlur'),
    bgColorSettingsContainer: document.getElementById('bgColorSettingsContainer'),
    imageBlurSettingsContainer: document.getElementById('imageBlurSettingsContainer'),
    backgroundColorInput: document.getElementById('backgroundColor'),
    bgScaleSlider: document.getElementById('bgScale'),
    bgBlurSlider: document.getElementById('bgBlur'),
    bgBrightnessSlider: document.getElementById('bgBrightness'),
    bgSaturationSlider: document.getElementById('bgSaturation'),
    bgScaleValueSpan: document.getElementById('bgScaleValue'),
    bgBlurValueSpan: document.getElementById('bgBlurValue'),
    bgBrightnessValueSpan: document.getElementById('bgBrightnessValue'),
    bgSaturationValueSpan: document.getElementById('bgSaturationValue'),
    bgOffsetXSlider: document.getElementById('bgOffsetX'),
    bgOffsetXValueSpan: document.getElementById('bgOffsetXValue'),
    bgOffsetYSlider: document.getElementById('bgOffsetY'),
    bgOffsetYValueSpan: document.getElementById('bgOffsetYValue'),

    // 出力タブ
    jpgQualitySlider: document.getElementById('jpgQuality'),
    jpgQualityValueSpan: document.getElementById('jpgQualityValue'),

    // フレーム加工タブ
    frameCornerStyleNoneRadio: document.getElementById('frameCornerStyleNone'),
    frameCornerStyleRoundedRadio: document.getElementById('frameCornerStyleRounded'),
    frameCornerStyleSuperellipseRadio: document.getElementById('frameCornerStyleSuperellipse'),
    frameCornerRoundedSettingsContainer: document.getElementById('frameCornerRoundedSettingsContainer'),
    frameCornerRadiusPercentSlider: document.getElementById('frameCornerRadiusPercent'),
    frameCornerRadiusPercentValueSpan: document.getElementById('frameCornerRadiusPercentValue'),
    frameCornerSuperellipseSettingsContainer: document.getElementById('frameCornerSuperellipseSettingsContainer'),
    frameSuperellipseNSlider: document.getElementById('frameSuperellipseN'),
    frameSuperellipseNValueSpan: document.getElementById('frameSuperellipseNValue'),
    frameShadowEnabledCheckbox: document.getElementById('frameShadowEnabled'),
    frameShadowSettingsContainer: document.getElementById('frameShadowSettingsContainer'),
    frameShadowTypeDropRadio: document.getElementById('frameShadowTypeDrop'),
    frameShadowTypeInnerRadio: document.getElementById('frameShadowTypeInner'),
    commonShadowParamsContainer: document.getElementById('commonShadowParamsContainer'),
    frameShadowOffsetXSlider: document.getElementById('frameShadowOffsetX'),
    frameShadowOffsetXValueSpan: document.getElementById('frameShadowOffsetXValue'),
    frameShadowOffsetYSlider: document.getElementById('frameShadowOffsetY'),
    frameShadowOffsetYValueSpan: document.getElementById('frameShadowOffsetYValue'),
    frameShadowBlurSlider: document.getElementById('frameShadowBlur'),
    frameShadowBlurValueSpan: document.getElementById('frameShadowBlurValue'),
    frameShadowEffectRangeSlider: document.getElementById('frameShadowEffectRange'),
    frameShadowEffectRangeValueSpan: document.getElementById('frameShadowEffectRangeValue'),
    frameShadowColorInput: document.getElementById('frameShadowColor'),
    frameShadowOpacitySlider: document.getElementById('frameShadowOpacity'),
    frameShadowOpacityValueSpan: document.getElementById('frameShadowOpacityValue'),
    frameBorderEnabledCheckbox: document.getElementById('frameBorderEnabled'),
    frameBorderDetailSettingsContainer: document.getElementById('frameBorderDetailSettingsContainer'),
    frameBorderWidthSlider: document.getElementById('frameBorderWidth'),
    frameBorderWidthValueSpan: document.getElementById('frameBorderWidthValue'),
    frameBorderColorInput: document.getElementById('frameBorderColor'),
    frameBorderStyleSelect: document.getElementById('frameBorderStyle'),

    exifDataContainer: document.getElementById('exifDataContainer'),

    // 文字入力タブ - 撮影日表示
    textDateEnabledCheckbox: document.getElementById('textDateEnabled'),
    textDateSettingsContainer: document.getElementById('textDateSettingsContainer'),
    textDateFormatSelect: document.getElementById('textDateFormat'),
    textDateFontSelect: document.getElementById('textDateFont'),
    textDateSizeSlider: document.getElementById('textDateSize'),
    textDateSizeValueSpan: document.getElementById('textDateSizeValue'),
    textDateColorInput: document.getElementById('textDateColor'),
    textDatePositionSelect: document.getElementById('textDatePosition'),
    textDateOffsetXSlider: document.getElementById('textDateOffsetX'),
    textDateOffsetXValueSpan: document.getElementById('textDateOffsetXValue'),
    textDateOffsetYSlider: document.getElementById('textDateOffsetY'),
    textDateOffsetYValueSpan: document.getElementById('textDateOffsetYValue'),
    textDateOpacitySlider: document.getElementById('textDateOpacity'),
    textDateOpacityValueSpan: document.getElementById('textDateOpacityValue'),

    // 文字入力タブ - Exif表示
    textExifEnabledCheckbox: document.getElementById('textExifEnabled'),
    textExifSettingsContainer: document.getElementById('textExifSettingsContainer'),
    textExifItemMakeCheckbox: document.getElementById('textExifItemMake'),
    textExifItemModelCheckbox: document.getElementById('textExifItemModel'),
    textExifItemLensModelCheckbox: document.getElementById('textExifItemLensModel'),
    textExifItemFNumberCheckbox: document.getElementById('textExifItemFNumber'),
    textExifItemExposureTimeCheckbox: document.getElementById('textExifItemExposureTime'),
    textExifItemISOSpeedRatingsCheckbox: document.getElementById('textExifItemISOSpeedRatings'),
    textExifItemFocalLengthCheckbox: document.getElementById('textExifItemFocalLength'),
    textExifCustomTextArea: document.getElementById('textExifCustomTextArea'),
    textExifAlignLeftRadio: document.getElementById('textExifAlignLeft'),
    textExifAlignCenterRadio: document.getElementById('textExifAlignCenter'),
    textExifAlignRightRadio: document.getElementById('textExifAlignRight'),
    textExifFontSelect: document.getElementById('textExifFont'),
    textExifSizeSlider: document.getElementById('textExifSize'),
    textExifSizeValueSpan: document.getElementById('textExifSizeValue'),
    textExifColorInput: document.getElementById('textExifColor'),
    textExifPositionSelect: document.getElementById('textExifPosition'),
    textExifOffsetXSlider: document.getElementById('textExifOffsetX'),
    textExifOffsetXValueSpan: document.getElementById('textExifOffsetXValue'),
    textExifOffsetYSlider: document.getElementById('textExifOffsetY'),
    textExifOffsetYValueSpan: document.getElementById('textExifOffsetYValue'),
    textExifOpacitySlider: document.getElementById('textExifOpacity'),
    textExifOpacityValueSpan: document.getElementById('textExifOpacityValue'),

    // 自由入力テキスト
    textFreeEnabledCheckbox: document.getElementById('textFreeEnabled'),
    textFreeSettingsContainer: document.getElementById('textFreeSettingsContainer'),
    textFreeCustomTextArea: document.getElementById('textFreeCustomTextArea'),
    textFreeAlignLeftRadio: document.getElementById('textFreeAlignLeft'),
    textFreeAlignCenterRadio: document.getElementById('textFreeAlignCenter'),
    textFreeAlignRightRadio: document.getElementById('textFreeAlignRight'),
    textFreeFontSelect: document.getElementById('textFreeFont'),
    textFreeSizeSlider: document.getElementById('textFreeSize'),
    textFreeSizeValueSpan: document.getElementById('textFreeSizeValue'),
    textFreeColorInput: document.getElementById('textFreeColor'),
    textFreePositionSelect: document.getElementById('textFreePosition'),
    textFreeOffsetXSlider: document.getElementById('textFreeOffsetX'),
    textFreeOffsetXValueSpan: document.getElementById('textFreeOffsetXValue'),
    textFreeOffsetYSlider: document.getElementById('textFreeOffsetY'),
    textFreeOffsetYValueSpan: document.getElementById('textFreeOffsetYValue'),
    textFreeOpacitySlider: document.getElementById('textFreeOpacity'),
    textFreeOpacityValueSpan: document.getElementById('textFreeOpacityValue'),

    // 自由入力テキスト2
    textFree2EnabledCheckbox: document.getElementById('textFree2Enabled'),
    textFree2SettingsContainer: document.getElementById('textFree2SettingsContainer'),
    textFree2CustomTextArea: document.getElementById('textFree2CustomTextArea'),
    textFree2AlignLeftRadio: document.getElementById('textFree2AlignLeft'),
    textFree2AlignCenterRadio: document.getElementById('textFree2AlignCenter'),
    textFree2AlignRightRadio: document.getElementById('textFree2AlignRight'),
    textFree2FontSelect: document.getElementById('textFree2Font'),
    textFree2SizeSlider: document.getElementById('textFree2Size'),
    textFree2SizeValueSpan: document.getElementById('textFree2SizeValue'),
    textFree2ColorInput: document.getElementById('textFree2Color'),
    textFree2PositionSelect: document.getElementById('textFree2Position'),
    textFree2OffsetXSlider: document.getElementById('textFree2OffsetX'),
    textFree2OffsetXValueSpan: document.getElementById('textFree2OffsetXValue'),
    textFree2OffsetYSlider: document.getElementById('textFree2OffsetY'),
    textFree2OffsetYValueSpan: document.getElementById('textFree2OffsetYValue'),
    textFree2OpacitySlider: document.getElementById('textFree2Opacity'),
    textFree2OpacityValueSpan: document.getElementById('textFree2OpacityValue'),
};

let redrawDebounced = null; // ★追加: デバウンスされた再描画関数を保持する変数

function populateFontSelect(selectElement, selectedFontDisplayName) {
    if (!selectElement) return;
    selectElement.innerHTML = ''; // Clear existing options

    googleFonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font.displayName; // stateにはdisplayNameを保存
        option.textContent = font.displayName;
        selectElement.appendChild(option);
    });
    selectElement.value = selectedFontDisplayName;
}


export function initializeUIFromState() {
    const state = getState();

    // フォント選択を最初に設定
    populateFontSelect(uiElements.textDateFontSelect, state.textSettings.date.font);
    populateFontSelect(uiElements.textExifFontSelect, state.textSettings.exif.font);
    // ★追加
    populateFontSelect(uiElements.textFreeFontSelect, state.textSettings.freeText.font);
    populateFontSelect(uiElements.textFree2FontSelect, state.textSettings.freeText2.font);


    const setupInputAttributesAndValue = (element, configKey, stateValue) => {
        if (!element) return;
        if (controlsConfig[configKey]) {
            const config = controlsConfig[configKey];
            if (element.type === 'range' || element.type === 'number') {
                if (config.min !== undefined) element.min = config.min;
                if (config.max !== undefined) element.max = config.max;
                if (config.step !== undefined) element.step = config.step;
            }
        }
        // For select, value is set by populateFontSelect or direct assignment later
        if (element.type !== 'select-one') { // Avoid re-setting select value here if already populated
            element.value = String(stateValue);
        }

        if (element.type === 'checkbox') {
            element.checked = Boolean(stateValue);
        } else if (element.type === 'radio' && element.value === String(stateValue)) {
            element.checked = true;
        }
    };

    // レイアウト設定
    if (uiElements.outputAspectRatioSelect) uiElements.outputAspectRatioSelect.value = state.outputTargetAspectRatioString;
    setupInputAttributesAndValue(uiElements.baseMarginPercentInput, 'baseMarginPercent', state.baseMarginPercent);
    setupInputAttributesAndValue(uiElements.photoPosXSlider, 'photoPosX', state.photoViewParams.offsetX);
    setupInputAttributesAndValue(uiElements.photoPosYSlider, 'photoPosY', state.photoViewParams.offsetY);

    // 背景設定
    if (uiElements.bgTypeColorRadio) uiElements.bgTypeColorRadio.checked = (state.backgroundType === 'color');
    if (uiElements.bgTypeImageBlurRadio) uiElements.bgTypeImageBlurRadio.checked = (state.backgroundType === 'imageBlur');
    if (uiElements.backgroundColorInput) uiElements.backgroundColorInput.value = state.backgroundColor;
    setupInputAttributesAndValue(uiElements.bgScaleSlider, 'bgScale', state.imageBlurBackgroundParams.scale);
    setupInputAttributesAndValue(uiElements.bgBlurSlider, 'bgBlur', state.imageBlurBackgroundParams.blurAmountPercent);
    setupInputAttributesAndValue(uiElements.bgBrightnessSlider, 'bgBrightness', state.imageBlurBackgroundParams.brightness);
    setupInputAttributesAndValue(uiElements.bgSaturationSlider, 'bgSaturation', state.imageBlurBackgroundParams.saturation);
    setupInputAttributesAndValue(uiElements.bgOffsetXSlider, 'bgOffsetX', state.imageBlurBackgroundParams.offsetXPercent);
    setupInputAttributesAndValue(uiElements.bgOffsetYSlider, 'bgOffsetY', state.imageBlurBackgroundParams.offsetYPercent);


    // 出力設定
    setupInputAttributesAndValue(uiElements.jpgQualitySlider, 'jpgQuality', state.outputSettings.quality);

    // フレーム加工設定
    const fs = state.frameSettings;
    if (uiElements.frameCornerStyleNoneRadio) uiElements.frameCornerStyleNoneRadio.checked = (fs.cornerStyle === 'none');
    if (uiElements.frameCornerStyleRoundedRadio) uiElements.frameCornerStyleRoundedRadio.checked = (fs.cornerStyle === 'rounded');
    if (uiElements.frameCornerStyleSuperellipseRadio) uiElements.frameCornerStyleSuperellipseRadio.checked = (fs.cornerStyle === 'superellipse');
    setupInputAttributesAndValue(uiElements.frameCornerRadiusPercentSlider, 'frameCornerRadiusPercent', fs.cornerRadiusPercent);
    setupInputAttributesAndValue(uiElements.frameSuperellipseNSlider, 'frameSuperellipseN', fs.superellipseN);

    if (uiElements.frameShadowEnabledCheckbox) uiElements.frameShadowEnabledCheckbox.checked = fs.shadowEnabled;
    if (uiElements.frameShadowTypeDropRadio) uiElements.frameShadowTypeDropRadio.checked = (fs.shadowType === 'drop');
    if (uiElements.frameShadowTypeInnerRadio) uiElements.frameShadowTypeInnerRadio.checked = (fs.shadowType === 'inner');

    setupInputAttributesAndValue(uiElements.frameShadowOffsetXSlider, 'frameShadowOffsetX', fs.shadowParams.offsetX);
    setupInputAttributesAndValue(uiElements.frameShadowOffsetYSlider, 'frameShadowOffsetY', fs.shadowParams.offsetY);
    setupInputAttributesAndValue(uiElements.frameShadowBlurSlider, 'frameShadowBlur', fs.shadowParams.blur);
    setupInputAttributesAndValue(uiElements.frameShadowEffectRangeSlider, 'frameShadowEffectRange', fs.shadowParams.effectRangePercent);
    if (uiElements.frameShadowColorInput) uiElements.frameShadowColorInput.value = fs.shadowParams.color;
    setupInputAttributesAndValue(uiElements.frameShadowOpacitySlider, 'frameShadowOpacity', fs.shadowParams.opacity);

    if (uiElements.frameBorderEnabledCheckbox) uiElements.frameBorderEnabledCheckbox.checked = fs.border.enabled;
    setupInputAttributesAndValue(uiElements.frameBorderWidthSlider, 'frameBorderWidth', fs.border.width);
    if (uiElements.frameBorderColorInput) uiElements.frameBorderColorInput.value = fs.border.color;
    if (uiElements.frameBorderStyleSelect) uiElements.frameBorderStyleSelect.value = fs.border.style;

    // 文字入力 - 撮影日設定
    const tds = state.textSettings.date;
    if (uiElements.textDateEnabledCheckbox) uiElements.textDateEnabledCheckbox.checked = tds.enabled;
    if (uiElements.textDateFormatSelect) uiElements.textDateFormatSelect.value = tds.format;
    if (uiElements.textDateFontSelect) uiElements.textDateFontSelect.value = tds.font;
    setupInputAttributesAndValue(uiElements.textDateSizeSlider, 'textDateSize', tds.size);
    if (uiElements.textDateColorInput) uiElements.textDateColorInput.value = tds.color;
    if (uiElements.textDatePositionSelect) uiElements.textDatePositionSelect.value = tds.position;
    setupInputAttributesAndValue(uiElements.textDateOffsetXSlider, 'textDateOffsetX', tds.offsetX);
    setupInputAttributesAndValue(uiElements.textDateOffsetYSlider, 'textDateOffsetY', tds.offsetY);
    setupInputAttributesAndValue(uiElements.textDateOpacitySlider, 'textOpacity', tds.opacity);

    // 文字入力 - Exif設定
    const tes = state.textSettings.exif;
    if (uiElements.textExifEnabledCheckbox) uiElements.textExifEnabledCheckbox.checked = tes.enabled;
    const exifItemCheckboxes = [
        { el: uiElements.textExifItemMakeCheckbox, key: 'Make' }, { el: uiElements.textExifItemModelCheckbox, key: 'Model' },
        { el: uiElements.textExifItemLensModelCheckbox, key: 'LensModel' }, { el: uiElements.textExifItemFNumberCheckbox, key: 'FNumber' },
        { el: uiElements.textExifItemExposureTimeCheckbox, key: 'ExposureTime' }, { el: uiElements.textExifItemISOSpeedRatingsCheckbox, key: 'ISOSpeedRatings' },
        { el: uiElements.textExifItemFocalLengthCheckbox, key: 'FocalLength' },
    ];
    exifItemCheckboxes.forEach(item => {
        if (item.el) item.el.checked = tes.items.includes(item.key);
    });
    // ★追加: テキストエリアと配置ラジオボタンの初期化
    if (uiElements.textExifCustomTextArea) uiElements.textExifCustomTextArea.value = tes.customText;
    if (uiElements.textExifAlignLeftRadio) uiElements.textExifAlignLeftRadio.checked = (tes.textAlign === 'left');
    if (uiElements.textExifAlignCenterRadio) uiElements.textExifAlignCenterRadio.checked = (tes.textAlign === 'center');
    if (uiElements.textExifAlignRightRadio) uiElements.textExifAlignRightRadio.checked = (tes.textAlign === 'right');
    if (uiElements.textExifFontSelect) uiElements.textExifFontSelect.value = tes.font;
    setupInputAttributesAndValue(uiElements.textExifSizeSlider, 'textExifSize', tes.size);
    if (uiElements.textExifColorInput) uiElements.textExifColorInput.value = tes.color;
    if (uiElements.textExifPositionSelect) uiElements.textExifPositionSelect.value = tes.position;
    setupInputAttributesAndValue(uiElements.textExifOffsetXSlider, 'textExifOffsetX', tes.offsetX);
    setupInputAttributesAndValue(uiElements.textExifOffsetYSlider, 'textExifOffsetY', tes.offsetY);
    setupInputAttributesAndValue(uiElements.textExifOpacitySlider, 'textOpacity', tes.opacity);

    // ★追加: 文字入力 - 自由テキスト設定
    const tfs = state.textSettings.freeText;
    if (uiElements.textFreeEnabledCheckbox) uiElements.textFreeEnabledCheckbox.checked = tfs.enabled;
    if (uiElements.textFreeCustomTextArea) uiElements.textFreeCustomTextArea.value = tfs.text;
    if (uiElements.textFreeAlignLeftRadio) uiElements.textFreeAlignLeftRadio.checked = (tfs.textAlign === 'left');
    if (uiElements.textFreeAlignCenterRadio) uiElements.textFreeAlignCenterRadio.checked = (tfs.textAlign === 'center');
    if (uiElements.textFreeAlignRightRadio) uiElements.textFreeAlignRightRadio.checked = (tfs.textAlign === 'right');
    if (uiElements.textFreeFontSelect) uiElements.textFreeFontSelect.value = tfs.font;
    setupInputAttributesAndValue(uiElements.textFreeSizeSlider, 'textFreeSize', tfs.size);
    if (uiElements.textFreeColorInput) uiElements.textFreeColorInput.value = tfs.color;
    if (uiElements.textFreePositionSelect) uiElements.textFreePositionSelect.value = tfs.position;
    setupInputAttributesAndValue(uiElements.textFreeOffsetXSlider, 'textFreeOffsetX', tfs.offsetX);
    setupInputAttributesAndValue(uiElements.textFreeOffsetYSlider, 'textFreeOffsetY', tfs.offsetY);
    setupInputAttributesAndValue(uiElements.textFreeOpacitySlider, 'textOpacity', tfs.opacity);

    const tfs2 = state.textSettings.freeText2;
    if (uiElements.textFree2EnabledCheckbox) uiElements.textFree2EnabledCheckbox.checked = tfs2.enabled;
    if (uiElements.textFree2CustomTextArea) uiElements.textFree2CustomTextArea.value = tfs2.text;
    if (uiElements.textFree2AlignLeftRadio) uiElements.textFree2AlignLeftRadio.checked = (tfs2.textAlign === 'left');
    if (uiElements.textFree2AlignCenterRadio) uiElements.textFree2AlignCenterRadio.checked = (tfs2.textAlign === 'center');
    if (uiElements.textFree2AlignRightRadio) uiElements.textFree2AlignRightRadio.checked = (tfs2.textAlign === 'right');
    if (uiElements.textFree2FontSelect) uiElements.textFree2FontSelect.value = tfs2.font;
    setupInputAttributesAndValue(uiElements.textFree2SizeSlider, 'textFreeSize', tfs2.size); // configはfreeTextと共通
    if (uiElements.textFree2ColorInput) uiElements.textFree2ColorInput.value = tfs2.color;
    if (uiElements.textFree2PositionSelect) uiElements.textFree2PositionSelect.value = tfs2.position;
    setupInputAttributesAndValue(uiElements.textFree2OffsetXSlider, 'textFreeOffsetX', tfs2.offsetX); // configは共通
    setupInputAttributesAndValue(uiElements.textFree2OffsetYSlider, 'textFreeOffsetY', tfs2.offsetY); // configは共通
    setupInputAttributesAndValue(uiElements.textFree2OpacitySlider, 'textOpacity', tfs2.opacity); // configは共通


    toggleBackgroundSettingsVisibility();
    updateFrameSettingsVisibility();
    updateTextDateSettingsVisibility();
    updateTextExifSettingsVisibility();
    updateTextFreeSettingsVisibility();
    updateTextFree2SettingsVisibility();
    updateSliderValueDisplays();
}


export function updateSliderValueDisplays() {
    const state = getState();
    if (uiElements.photoPosXValueSpan && uiElements.photoPosXSlider) {
        const val = parseFloat(state.photoViewParams.offsetX);
        const displayVal = Math.round((val - 0.5) * 2 * 100);
        uiElements.photoPosXValueSpan.textContent = displayVal === 0 ? '中央' : `${displayVal}%`;
    }
    if (uiElements.photoPosYValueSpan && uiElements.photoPosYSlider) {
        const val = parseFloat(state.photoViewParams.offsetY);
        const displayVal = Math.round((val - 0.5) * 2 * 100);
        uiElements.photoPosYValueSpan.textContent = displayVal === 0 ? '中央' : `${displayVal}%`;
    }
    if (uiElements.baseMarginPercentValueSpan && uiElements.baseMarginPercentInput) {
        uiElements.baseMarginPercentValueSpan.textContent = `${state.baseMarginPercent}%`;
    }
    if (uiElements.bgScaleValueSpan && uiElements.bgScaleSlider) {
        uiElements.bgScaleValueSpan.textContent = `${parseFloat(state.imageBlurBackgroundParams.scale).toFixed(1)}x`;
    }
    if (uiElements.bgBlurValueSpan && uiElements.bgBlurSlider) {
        uiElements.bgBlurValueSpan.textContent = `${parseFloat(state.imageBlurBackgroundParams.blurAmountPercent).toFixed(1)}%`;
    }
    if (uiElements.bgBrightnessValueSpan && uiElements.bgBrightnessSlider) {
        uiElements.bgBrightnessValueSpan.textContent = `${state.imageBlurBackgroundParams.brightness}%`;
    }
    if (uiElements.bgSaturationValueSpan && uiElements.bgSaturationSlider) {
        uiElements.bgSaturationValueSpan.textContent = `${state.imageBlurBackgroundParams.saturation}%`;
    }
    if (uiElements.bgOffsetXValueSpan && uiElements.bgOffsetXSlider) {
        uiElements.bgOffsetXValueSpan.textContent = `${state.imageBlurBackgroundParams.offsetXPercent}%`;
    }
    if (uiElements.bgOffsetYValueSpan && uiElements.bgOffsetYSlider) {
        uiElements.bgOffsetYValueSpan.textContent = `${state.imageBlurBackgroundParams.offsetYPercent}%`;
    }
    if (uiElements.jpgQualityValueSpan && uiElements.jpgQualitySlider) {
        uiElements.jpgQualityValueSpan.textContent = `${state.outputSettings.quality}`;
    }
    const fs = state.frameSettings;
    if (uiElements.frameCornerRadiusPercentValueSpan && uiElements.frameCornerRadiusPercentSlider) {
        uiElements.frameCornerRadiusPercentValueSpan.textContent = `${fs.cornerRadiusPercent}%`;
    }
    if (uiElements.frameSuperellipseNValueSpan && uiElements.frameSuperellipseNSlider) {
        uiElements.frameSuperellipseNValueSpan.textContent = fs.superellipseN;
    }
    if (uiElements.frameShadowOffsetXValueSpan) uiElements.frameShadowOffsetXValueSpan.textContent = `${fs.shadowParams.offsetX}%`;
    if (uiElements.frameShadowOffsetYValueSpan) uiElements.frameShadowOffsetYValueSpan.textContent = `${fs.shadowParams.offsetY}%`;
    if (uiElements.frameShadowBlurValueSpan) uiElements.frameShadowBlurValueSpan.textContent = `${fs.shadowParams.blur}%`;
    if (uiElements.frameShadowEffectRangeValueSpan) {
        uiElements.frameShadowEffectRangeValueSpan.textContent = `${fs.shadowParams.effectRangePercent}%`;
    }
    if (uiElements.frameShadowOpacityValueSpan && uiElements.frameShadowOpacitySlider) {
        uiElements.frameShadowOpacityValueSpan.textContent = parseFloat(fs.shadowParams.opacity).toFixed(2);
    }
    if (uiElements.frameBorderWidthValueSpan && uiElements.frameBorderWidthSlider) {
        uiElements.frameBorderWidthValueSpan.textContent = `${fs.border.width}%`;
    }
    const tds = state.textSettings.date;
    if (uiElements.textDateSizeValueSpan && uiElements.textDateSizeSlider) {
        uiElements.textDateSizeValueSpan.textContent = `${tds.size}%`;
    }
    if (uiElements.textDateOffsetXValueSpan && uiElements.textDateOffsetXSlider) {
        uiElements.textDateOffsetXValueSpan.textContent = `${tds.offsetX}%`;
    }
    if (uiElements.textDateOffsetYValueSpan && uiElements.textDateOffsetYSlider) {
        uiElements.textDateOffsetYValueSpan.textContent = `${tds.offsetY}%`;
    }
    if (uiElements.textDateOpacityValueSpan && uiElements.textDateOpacitySlider) {
        uiElements.textDateOpacityValueSpan.textContent = tds.opacity.toFixed(2);
    }
    const tes = state.textSettings.exif;
    if (uiElements.textExifSizeValueSpan && uiElements.textExifSizeSlider) {
        uiElements.textExifSizeValueSpan.textContent = `${tes.size}%`;
    }
    if (uiElements.textExifOffsetXValueSpan && uiElements.textExifOffsetXSlider) {
        uiElements.textExifOffsetXValueSpan.textContent = `${tes.offsetX}%`;
    }
    if (uiElements.textExifOffsetYValueSpan && uiElements.textExifOffsetYSlider) {
        uiElements.textExifOffsetYValueSpan.textContent = `${tes.offsetY}%`;
    }
    if (uiElements.textExifOpacityValueSpan && uiElements.textExifOpacitySlider) {
        uiElements.textExifOpacityValueSpan.textContent = tes.opacity.toFixed(2);
    }
    const tfs = state.textSettings.freeText;
    if (uiElements.textFreeSizeValueSpan && uiElements.textFreeSizeSlider) {
        uiElements.textFreeSizeValueSpan.textContent = `${tfs.size}%`;
    }
    if (uiElements.textFreeOffsetXValueSpan && uiElements.textFreeOffsetXSlider) {
        uiElements.textFreeOffsetXValueSpan.textContent = `${tfs.offsetX}%`;
    }
    if (uiElements.textFreeOffsetYValueSpan && uiElements.textFreeOffsetYSlider) {
        uiElements.textFreeOffsetYValueSpan.textContent = `${tfs.offsetY}%`;
    }
    if (uiElements.textFreeOpacityValueSpan && uiElements.textFreeOpacitySlider) {
        uiElements.textFreeOpacityValueSpan.textContent = tfs.opacity.toFixed(2);
    }
    const tfs2 = state.textSettings.freeText2;
    if (uiElements.textFree2SizeValueSpan && uiElements.textFree2SizeSlider) {
        uiElements.textFree2SizeValueSpan.textContent = `${tfs2.size}%`;
    }
    if (uiElements.textFree2OffsetXValueSpan && uiElements.textFree2OffsetXSlider) {
        uiElements.textFree2OffsetXValueSpan.textContent = `${tfs2.offsetX}%`;
    }
    if (uiElements.textFree2OffsetYValueSpan && uiElements.textFree2OffsetYSlider) {
        uiElements.textFree2OffsetYValueSpan.textContent = `${tfs2.offsetY}%`;
    }
    if (uiElements.textFree2OpacityValueSpan && uiElements.textFree2OpacitySlider) {
        uiElements.textFree2OpacityValueSpan.textContent = tfs2.opacity.toFixed(2);
    }
}

export function toggleBackgroundSettingsVisibility() {
    if (!uiElements.bgColorSettingsContainer || !uiElements.imageBlurSettingsContainer) return;
    const currentBackgroundType = getState().backgroundType;
    uiElements.bgColorSettingsContainer.classList.toggle('hidden', currentBackgroundType !== 'color');
    uiElements.imageBlurSettingsContainer.classList.toggle('hidden', currentBackgroundType !== 'imageBlur');
}

function updateFrameSettingsVisibility() {
    const frameState = getState().frameSettings;
    if (uiElements.frameCornerRoundedSettingsContainer) {
        uiElements.frameCornerRoundedSettingsContainer.style.display = frameState.cornerStyle === 'rounded' ? '' : 'none';
    }
    if (uiElements.frameCornerSuperellipseSettingsContainer) {
        uiElements.frameCornerSuperellipseSettingsContainer.style.display = frameState.cornerStyle === 'superellipse' ? '' : 'none';
    }
    if (uiElements.frameShadowSettingsContainer) {
        uiElements.frameShadowSettingsContainer.style.display = frameState.shadowEnabled ? '' : 'none';
    }
    if (uiElements.commonShadowParamsContainer) {
        uiElements.commonShadowParamsContainer.style.display = frameState.shadowEnabled ? '' : 'none';
    }
    if (uiElements.frameBorderDetailSettingsContainer) {
        uiElements.frameBorderDetailSettingsContainer.style.display = frameState.border.enabled ? '' : 'none';
    }
}

function updateTextDateSettingsVisibility() {
    const dateSettingsEnabled = getState().textSettings.date.enabled;
    if (uiElements.textDateSettingsContainer) {
        uiElements.textDateSettingsContainer.style.display = dateSettingsEnabled ? '' : 'none';
    }
}

function updateTextExifSettingsVisibility() {
    const exifSettingsEnabled = getState().textSettings.exif.enabled;
    if (uiElements.textExifSettingsContainer) {
        uiElements.textExifSettingsContainer.style.display = exifSettingsEnabled ? '' : 'none';
    }
}

function updateTextFreeSettingsVisibility() {
    const freeTextSettingsEnabled = getState().textSettings.freeText.enabled;
    if (uiElements.textFreeSettingsContainer) {
        uiElements.textFreeSettingsContainer.style.display = freeTextSettingsEnabled ? '' : 'none';
    }
}

function updateTextFree2SettingsVisibility() {
    const freeText2SettingsEnabled = getState().textSettings.freeText2.enabled;
    if (uiElements.textFree2SettingsContainer) {
        uiElements.textFree2SettingsContainer.style.display = freeText2SettingsEnabled ? '' : 'none';
    }
}

export function updateExifCustomText(redrawCallback) {
    const currentState = getState();
    const { exifData, textSettings } = currentState;
    const itemsToDisplay = textSettings.exif.items || [];

    const displayOrder = ['Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISOSpeedRatings', 'FocalLength'];
    const displayedExifValues = [];

    if (exifData) {
        for (const itemKey of displayOrder) {
            if (itemsToDisplay.includes(itemKey)) {
                const value = getExifValue(exifData, itemKey);
                if (value) {
                    let displayValue = value;
                    if (itemKey === 'ISOSpeedRatings' && !String(value).toUpperCase().startsWith('ISO')) {
                        displayValue = `ISO ${value}`;
                    }
                    displayedExifValues.push(displayValue);
                }
            }
        }
    }
    const newCustomText = displayedExifValues.join('  ');

    // StateとUIの両方を更新
    updateState({ textSettings: { exif: { customText: newCustomText } } });
    if (uiElements.textExifCustomTextArea) {
        uiElements.textExifCustomTextArea.value = newCustomText;
    }
    if (redrawCallback) redrawCallback();
}

// ★追加: textRendererからgetExifValueヘルパー関数をこちらに移動（UIの責務のため）
function getExifValue(exifDataFromState, itemKey) {
    if (!exifDataFromState || typeof piexif === 'undefined') return '';
    const zerothIFD = exifDataFromState["0th"]; const exifIFD = exifDataFromState["Exif"];
    const ImageIFD_CONSTANTS = piexif.ImageIFD; const ExifIFD_CONSTANTS = piexif.ExifIFD;
    if (!zerothIFD && !exifIFD) return '';
    switch (itemKey) {
        case 'Make': return (zerothIFD && ImageIFD_CONSTANTS && ImageIFD_CONSTANTS.Make !== undefined) ? zerothIFD[ImageIFD_CONSTANTS.Make] : '';
        case 'Model': return (zerothIFD && ImageIFD_CONSTANTS && ImageIFD_CONSTANTS.Model !== undefined) ? zerothIFD[ImageIFD_CONSTANTS.Model] : '';
        case 'LensModel': return (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.LensModel !== undefined) ? exifIFD[ExifIFD_CONSTANTS.LensModel] : '';
        case 'FNumber': if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.FNumber !== undefined) { const fVal = exifIFD[ExifIFD_CONSTANTS.FNumber]; if (fVal && Array.isArray(fVal) && fVal.length === 2 && fVal[1] !== 0) { return `f/${(fVal[0] / fVal[1]).toFixed(1)}`; } } return '';
        case 'ExposureTime': if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.ExposureTime !== undefined) { const etVal = exifIFD[ExifIFD_CONSTANTS.ExposureTime]; if (etVal && Array.isArray(etVal) && etVal.length === 2 && etVal[1] !== 0) { const et = etVal[0] / etVal[1]; if (et >= 1) return `${et.toFixed(1)}s`; if (et >= 0.1) return `${et.toFixed(2)}s`; return `1/${Math.round(1 / et)}s`; } } return '';
        case 'ISOSpeedRatings': if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.ISOSpeedRatings !== undefined) { const iso = exifIFD[ExifIFD_CONSTANTS.ISOSpeedRatings]; return iso ? `${Array.isArray(iso) ? iso[0] : iso}` : ''; } return '';
        case 'FocalLength': if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.FocalLength !== undefined) { const flVal = exifIFD[ExifIFD_CONSTANTS.FocalLength]; if (flVal && Array.isArray(flVal) && flVal.length === 2 && flVal[1] !== 0) { return `${Math.round(flVal[0] / flVal[1])}mm`; } } return '';
        default: return '';
    }
}

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
};

export function setupEventListeners(redrawCallback) {
    // ★デバウンス関数はここで一度だけ生成する
    const redrawDebounced = debounce((e) => {
        // テキストエリアの入力イベントの場合は、e (イベントオブジェクト) を受け取る
        if (e && e.target && e.target.id === 'textExifCustomTextArea') {
            updateState({ textSettings: { exif: { customText: e.target.value } } });
        }
        redrawCallback();
    }, 300); // 300msの遅延

    const addNumericInputListener = (element, configKey, stateKey, nestedKey = '', subNestedKey = '') => {
        if (!element) return;
        element.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);
            const config = controlsConfig[configKey];
            if (config) {
                if (isNaN(value)) value = parseFloat(config.defaultValue) || 0;
                if (config.min !== undefined) value = Math.max(config.min, value);
                if (config.max !== undefined) value = Math.min(config.max, value);
            }
            e.target.value = String(value);
            let updatePayload;
            if (subNestedKey && nestedKey) updatePayload = { [stateKey]: { [nestedKey]: { [subNestedKey]: value } } };
            else if (nestedKey) updatePayload = { [stateKey]: { [nestedKey]: value } };
            else updatePayload = { [stateKey]: value };
            updateState(updatePayload);
            updateSliderValueDisplays();
            redrawCallback(); // スライダー等は即時反映
        });
        // ★ここから変更: ダブルクリック/ダブルタップの処理をリファクタリング
        const resetToDefault = () => {
            const config = controlsConfig[configKey];
            if (config && config.defaultValue !== undefined) {
                const defaultValue = config.defaultValue;

                // 1. スライダーの見た目を初期値に戻す
                element.value = String(defaultValue);

                // 2. アプリケーションの状態(state)を更新
                let resetPayload;
                if (subNestedKey && nestedKey) resetPayload = { [stateKey]: { [nestedKey]: { [subNestedKey]: defaultValue } } };
                else if (nestedKey) resetPayload = { [stateKey]: { [nestedKey]: defaultValue } };
                else resetPayload = { [stateKey]: defaultValue };
                updateState(resetPayload);

                // 3. 値のテキスト表示とプレビューを更新
                updateSliderValueDisplays();
                redrawCallback();
            }
        };
        // PC用のダブルクリックイベント
        element.addEventListener('dblclick', resetToDefault);

        // スマートフォン用のダブルタップイベントを手動で実装
        let lastTap = 0;
        element.addEventListener('touchstart', (event) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) { // 300ミリ秒以内ならダブルタップと判定
                event.preventDefault(); // ダブルタップによるズームなどのデフォルト動作をキャンセル
                resetToDefault();
            }
            lastTap = currentTime;
        });
    };

    const addOptionChangeListener = (element, stateKey, p1, p2 = '', p3 = '') => {
        // (この関数の中身は変更なし)
        if (!element) return;
        const eventType = (element.type === 'checkbox' || element.type === 'radio') ? 'change' : 'change';
        element.addEventListener(eventType, async (e) => {
            let valueToSet; let updatePayload; let actualNestedKey = ''; let actualSubNestedKey = '';
            if (element.type === 'checkbox') { valueToSet = e.target.checked; actualNestedKey = p1; actualSubNestedKey = p2; }
            else if (element.type === 'radio') { if (!e.target.checked) return; valueToSet = p1; actualNestedKey = p2; actualSubNestedKey = p3; }
            else { valueToSet = e.target.value; actualNestedKey = p1; actualSubNestedKey = p2; }
            if ((element.id === 'textDateFontSelect' || element.id === 'textExifFontSelect' || element.id === 'textFreeFontSelect' || element.id === 'textFree2FontSelect') && valueToSet) {
                const selectedFontObject = googleFonts.find(f => f.displayName === valueToSet);
                if (selectedFontObject) {
                    try {
                        element.disabled = true;
                        await loadGoogleFonts(selectedFontObject.apiName);
                    } catch (error) {
                        alert(`フォントの読み込みに失敗しました: ${selectedFontObject.displayName}`);
                        element.disabled = false; return;
                    } finally { element.disabled = false; }
                }
            }
            if (actualSubNestedKey && actualNestedKey) updatePayload = { [stateKey]: { [actualNestedKey]: { [actualSubNestedKey]: valueToSet } } };
            else if (actualNestedKey) updatePayload = { [stateKey]: { [actualNestedKey]: valueToSet } };
            else updatePayload = { [stateKey]: valueToSet };
            updateState(updatePayload);
            if (stateKey === 'backgroundType') toggleBackgroundSettingsVisibility();
            else if (stateKey === 'frameSettings') {
                if (actualNestedKey === 'cornerStyle' || actualNestedKey === 'shadowEnabled' || actualNestedKey === 'shadowType' || (actualNestedKey === 'border' && actualSubNestedKey === 'enabled')) updateFrameSettingsVisibility();
            } else if (stateKey === 'textSettings') {
                if (actualNestedKey === 'date' && actualSubNestedKey === 'enabled') updateTextDateSettingsVisibility();
                else if (actualNestedKey === 'exif' && actualSubNestedKey === 'enabled') updateTextExifSettingsVisibility();
                else if (actualNestedKey === 'freeText' && actualSubNestedKey === 'enabled') updateTextFreeSettingsVisibility();
                else if (actualNestedKey === 'freeText2' && actualSubNestedKey === 'enabled') updateTextFree2SettingsVisibility(); // ★追加
            }
            updateSliderValueDisplays();
            redrawCallback();
        });
    };

    const addColorInputListener = (element, stateKey, nestedKey = '', subNestedKey = '') => {
        if (!element) return;
        element.addEventListener('input', (e) => {
            const colorValue = e.target.value;
            let updatePayload;
            if (subNestedKey && nestedKey) updatePayload = { [stateKey]: { [nestedKey]: { [subNestedKey]: colorValue } } };
            else if (nestedKey) updatePayload = { [stateKey]: { [nestedKey]: colorValue } };
            else updatePayload = { [stateKey]: colorValue };
            updateState(updatePayload);
            redrawCallback();
        });
    };

    // --- 各種イベントリスナーの設定 (大部分は変更なし) ---
    addOptionChangeListener(uiElements.outputAspectRatioSelect, 'outputTargetAspectRatioString');
    addNumericInputListener(uiElements.baseMarginPercentInput, 'baseMarginPercent', 'baseMarginPercent');
    // ... (その他すべての addNumericInputListener と addColorInputListener の呼び出し) ...
    addNumericInputListener(uiElements.photoPosXSlider, 'photoPosX', 'photoViewParams', 'offsetX');
    addNumericInputListener(uiElements.photoPosYSlider, 'photoPosY', 'photoViewParams', 'offsetY');
    addOptionChangeListener(uiElements.bgTypeColorRadio, 'backgroundType', 'color');
    addOptionChangeListener(uiElements.bgTypeImageBlurRadio, 'backgroundType', 'imageBlur');
    addColorInputListener(uiElements.backgroundColorInput, 'backgroundColor');
    addNumericInputListener(uiElements.bgScaleSlider, 'bgScale', 'imageBlurBackgroundParams', 'scale');
    addNumericInputListener(uiElements.bgBlurSlider, 'bgBlur', 'imageBlurBackgroundParams', 'blurAmountPercent');
    addNumericInputListener(uiElements.bgBrightnessSlider, 'bgBrightness', 'imageBlurBackgroundParams', 'brightness');
    addNumericInputListener(uiElements.bgSaturationSlider, 'bgSaturation', 'imageBlurBackgroundParams', 'saturation');
    addNumericInputListener(uiElements.bgOffsetXSlider, 'bgOffsetX', 'imageBlurBackgroundParams', 'offsetXPercent');
    addNumericInputListener(uiElements.bgOffsetYSlider, 'bgOffsetY', 'imageBlurBackgroundParams', 'offsetYPercent');
    addNumericInputListener(uiElements.jpgQualitySlider, 'jpgQuality', 'outputSettings', 'quality');
    addOptionChangeListener(uiElements.frameCornerStyleNoneRadio, 'frameSettings', 'none', 'cornerStyle');
    addOptionChangeListener(uiElements.frameCornerStyleRoundedRadio, 'frameSettings', 'rounded', 'cornerStyle');
    addOptionChangeListener(uiElements.frameCornerStyleSuperellipseRadio, 'frameSettings', 'superellipse', 'cornerStyle');
    addNumericInputListener(uiElements.frameCornerRadiusPercentSlider, 'frameCornerRadiusPercent', 'frameSettings', 'cornerRadiusPercent');
    addNumericInputListener(uiElements.frameSuperellipseNSlider, 'frameSuperellipseN', 'frameSettings', 'superellipseN');
    addOptionChangeListener(uiElements.frameShadowEnabledCheckbox, 'frameSettings', 'shadowEnabled');
    addOptionChangeListener(uiElements.frameShadowTypeDropRadio, 'frameSettings', 'drop', 'shadowType');
    addOptionChangeListener(uiElements.frameShadowTypeInnerRadio, 'frameSettings', 'inner', 'shadowType');
    addNumericInputListener(uiElements.frameShadowOffsetXSlider, 'frameShadowOffsetX', 'frameSettings', 'shadowParams', 'offsetX');
    addNumericInputListener(uiElements.frameShadowOffsetYSlider, 'frameShadowOffsetY', 'frameSettings', 'shadowParams', 'offsetY');
    addNumericInputListener(uiElements.frameShadowBlurSlider, 'frameShadowBlur', 'frameSettings', 'shadowParams', 'blur');
    addNumericInputListener(uiElements.frameShadowEffectRangeSlider, 'frameShadowEffectRange', 'frameSettings', 'shadowParams', 'effectRangePercent');
    addColorInputListener(uiElements.frameShadowColorInput, 'frameSettings', 'shadowParams', 'color');
    addNumericInputListener(uiElements.frameShadowOpacitySlider, 'frameShadowOpacity', 'frameSettings', 'shadowParams', 'opacity');
    addOptionChangeListener(uiElements.frameBorderEnabledCheckbox, 'frameSettings', 'border', 'enabled');
    addNumericInputListener(uiElements.frameBorderWidthSlider, 'frameBorderWidth', 'frameSettings', 'border', 'width');
    addColorInputListener(uiElements.frameBorderColorInput, 'frameSettings', 'border', 'color');
    addOptionChangeListener(uiElements.frameBorderStyleSelect, 'frameSettings', 'border', 'style');
    addOptionChangeListener(uiElements.textDateEnabledCheckbox, 'textSettings', 'date', 'enabled');
    addOptionChangeListener(uiElements.textDateFormatSelect, 'textSettings', 'date', 'format');
    addOptionChangeListener(uiElements.textDateFontSelect, 'textSettings', 'date', 'font');
    addNumericInputListener(uiElements.textDateSizeSlider, 'textDateSize', 'textSettings', 'date', 'size');
    addColorInputListener(uiElements.textDateColorInput, 'textSettings', 'date', 'color');
    addOptionChangeListener(uiElements.textDatePositionSelect, 'textSettings', 'date', 'position');
    addNumericInputListener(uiElements.textDateOffsetXSlider, 'textDateOffsetX', 'textSettings', 'date', 'offsetX');
    addNumericInputListener(uiElements.textDateOffsetYSlider, 'textDateOffsetY', 'textSettings', 'date', 'offsetY');
    addNumericInputListener(uiElements.textDateOpacitySlider, 'textOpacity', 'textSettings', 'date', 'opacity');


    // --- 文字入力タブ - Exif情報 ---
    // ★【重要】Exif関連のリスナーをここに再構成します
    addOptionChangeListener(uiElements.textExifEnabledCheckbox, 'textSettings', 'exif', 'enabled');
    uiElements.textExifEnabledCheckbox.addEventListener('change', e => {
        if (e.target.checked) {
            updateExifCustomText(redrawCallback);
        }
    });

    const exifItemCheckboxes = [
        uiElements.textExifItemMakeCheckbox, uiElements.textExifItemModelCheckbox, uiElements.textExifItemLensModelCheckbox,
        uiElements.textExifItemFNumberCheckbox, uiElements.textExifItemExposureTimeCheckbox,
        uiElements.textExifItemISOSpeedRatingsCheckbox, uiElements.textExifItemFocalLengthCheckbox,
    ];
    exifItemCheckboxes.forEach(checkbox => {
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                const currentItems = getState().textSettings.exif.items || [];
                const itemName = checkbox.value;
                const newItems = checkbox.checked
                    ? [...new Set([...currentItems, itemName])]
                    : currentItems.filter(item => item !== itemName);
                updateState({ textSettings: { exif: { items: newItems } } });
                updateExifCustomText(redrawCallback);
            });
        }
    });

    // ★【重要】テキストエリアの入力イベントリスナー
    if (uiElements.textExifCustomTextArea) {
        uiElements.textExifCustomTextArea.addEventListener('input', (e) => {
            // デバウンスされたコールバックを呼び出す
            redrawDebounced(e);
        });
    }

    [uiElements.textExifAlignLeftRadio, uiElements.textExifAlignCenterRadio, uiElements.textExifAlignRightRadio].forEach(radio => {
        if (radio) {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    updateState({ textSettings: { exif: { textAlign: e.target.value } } });
                    redrawCallback();
                }
            });
        }
    });

    addOptionChangeListener(uiElements.textExifFontSelect, 'textSettings', 'exif', 'font');
    addNumericInputListener(uiElements.textExifSizeSlider, 'textExifSize', 'textSettings', 'exif', 'size');
    addColorInputListener(uiElements.textExifColorInput, 'textSettings', 'exif', 'color');
    addOptionChangeListener(uiElements.textExifPositionSelect, 'textSettings', 'exif', 'position');
    addNumericInputListener(uiElements.textExifOffsetXSlider, 'textExifOffsetX', 'textSettings', 'exif', 'offsetX');
    addNumericInputListener(uiElements.textExifOffsetYSlider, 'textExifOffsetY', 'textSettings', 'exif', 'offsetY');
    addNumericInputListener(uiElements.textExifOpacitySlider, 'textOpacity', 'textSettings', 'exif', 'opacity');


    // --- 文字入力タブ - 自由テキスト ---
    addOptionChangeListener(uiElements.textFreeEnabledCheckbox, 'textSettings', 'freeText', 'enabled');

    if (uiElements.textFreeCustomTextArea) {
        uiElements.textFreeCustomTextArea.addEventListener('input', debounce((e) => {
            updateState({ textSettings: { freeText: { text: e.target.value } } });
            redrawCallback();
        }, 300));
    }

    [uiElements.textFreeAlignLeftRadio, uiElements.textFreeAlignCenterRadio, uiElements.textFreeAlignRightRadio].forEach(radio => {
        addOptionChangeListener(radio, 'textSettings', radio.value, 'freeText', 'textAlign');
    });

    addOptionChangeListener(uiElements.textFreeFontSelect, 'textSettings', 'freeText', 'font');
    addNumericInputListener(uiElements.textFreeSizeSlider, 'textFreeSize', 'textSettings', 'freeText', 'size');
    addColorInputListener(uiElements.textFreeColorInput, 'textSettings', 'freeText', 'color');
    addOptionChangeListener(uiElements.textFreePositionSelect, 'textSettings', 'freeText', 'position');
    addNumericInputListener(uiElements.textFreeOffsetXSlider, 'textFreeOffsetX', 'textSettings', 'freeText', 'offsetX'); // ★キーを修正
    addNumericInputListener(uiElements.textFreeOffsetYSlider, 'textFreeOffsetY', 'textSettings', 'freeText', 'offsetY'); // ★キーを修正
    addNumericInputListener(uiElements.textFreeOpacitySlider, 'textOpacity', 'textSettings', 'freeText', 'opacity');

    // --- 文字入力タブ - 自由テキスト2 ---
    addOptionChangeListener(uiElements.textFree2EnabledCheckbox, 'textSettings', 'freeText2', 'enabled');

    if (uiElements.textFree2CustomTextArea) {
        uiElements.textFree2CustomTextArea.addEventListener('input', debounce((e) => {
            updateState({ textSettings: { freeText2: { text: e.target.value } } });
            redrawCallback();
        }, 300));
    }

    [uiElements.textFree2AlignLeftRadio, uiElements.textFree2AlignCenterRadio, uiElements.textFree2AlignRightRadio].forEach(radio => {
        addOptionChangeListener(radio, 'textSettings', radio.value, 'freeText2', 'textAlign');
    });

    addOptionChangeListener(uiElements.textFree2FontSelect, 'textSettings', 'freeText2', 'font');
    addNumericInputListener(uiElements.textFree2SizeSlider, 'textFreeSize', 'textSettings', 'freeText2', 'size');
    addColorInputListener(uiElements.textFree2ColorInput, 'textSettings', 'freeText2', 'color');
    addOptionChangeListener(uiElements.textFree2PositionSelect, 'textSettings', 'freeText2', 'position');
    addNumericInputListener(uiElements.textFree2OffsetXSlider, 'textFreeOffsetX', 'textSettings', 'freeText2', 'offsetX');
    addNumericInputListener(uiElements.textFree2OffsetYSlider, 'textFreeOffsetY', 'textSettings', 'freeText2', 'offsetY');
    addNumericInputListener(uiElements.textFree2OpacitySlider, 'textOpacity', 'textSettings', 'freeText2', 'opacity');

}