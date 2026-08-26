// js/uiController.js
import { getState, updateState, addCustomTextLayer, removeCustomTextLayer, updateCustomTextLayer } from './stateManager.js';
import { controlsConfig, googleFonts } from './uiDefinitions.js';
import { loadGoogleFonts } from './textRenderer.js';
import { stripCustomPrefix } from './layoutCalculator.js';
import * as selectionStore from './interaction/selectionStore.js';
import { enhanceAsScrubInput } from './ui/scrubInput.js';

export const uiElements = {
    imageLoader: document.getElementById('imageLoader'),
    previewCanvas: document.getElementById('previewCanvas'),
    previewCtx: null,
    downloadButton: document.getElementById('downloadButton'),
    canvasContainer: document.querySelector('.canvas-container'),
    undoButton: document.getElementById('undoButton'),
    redoButton: document.getElementById('redoButton'),

    // レイアウト設定タブ
    outputAspectRatioSelect: document.getElementById('outputAspectRatio'),
    customAspectRatioContainer: document.getElementById('customAspectRatioContainer'),
    customAspectRatioWidthInput: document.getElementById('customAspectRatioWidth'),
    customAspectRatioHeightInput: document.getElementById('customAspectRatioHeight'),
    swapAspectRatioButton: document.getElementById('swapAspectRatio'),
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

    // 自由テキスト（可変長レイヤー）
    customTextsListContainer: document.getElementById('customTextsList'),
    addCustomTextButton: document.getElementById('addCustomTextButton'),
    customTextSettingsPanel: document.getElementById('customTextSettingsPanel'),
};

let redrawDebounced = null; // ★追加: デバウンスされた再描画関数を保持する変数

function populateFontSelect(selectElement, selectedFontDisplayName) {
    if (!selectElement) return;
    selectElement.innerHTML = ''; // Clear existing options

    googleFonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font.displayName; // stateにはdisplayNameを保存
        option.textContent = font.displayName;
        // フォント名をそのフォントで表示
        option.style.fontFamily = `"${font.fontFamilyForCanvas}", sans-serif`;
        option.style.fontWeight = font.fontWeightForCanvas;
        selectElement.appendChild(option);
    });
    selectElement.value = selectedFontDisplayName;
}


export function initializeUIFromState() {
    const state = getState();

    // フォント選択を最初に設定
    populateFontSelect(uiElements.textDateFontSelect, state.textSettings.date.font);
    populateFontSelect(uiElements.textExifFontSelect, state.textSettings.exif.font);
    // 自由テキストレイヤーのフォントセレクトは、レイヤーごとにrenderCustomTextSettingsPanel()内で生成する


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
    if (uiElements.outputAspectRatioSelect) {
        const aspectRatioValue = state.outputTargetAspectRatioString;
        const cleanAspectRatio = stripCustomPrefix(aspectRatioValue);

        // アスペクト比を解析して入力フィールドに設定
        if (cleanAspectRatio && cleanAspectRatio !== 'original_photo') {
            const parts = cleanAspectRatio.split(':');
            if (parts.length === 2) {
                const width = parseFloat(parts[0]);
                const height = parseFloat(parts[1]);
                if (!isNaN(width) && width > 0 && uiElements.customAspectRatioWidthInput) {
                    uiElements.customAspectRatioWidthInput.value = String(width);
                }
                if (!isNaN(height) && height > 0 && uiElements.customAspectRatioHeightInput) {
                    uiElements.customAspectRatioHeightInput.value = String(height);
                }
            }
        }
        
        // セレクトボックスの値を設定（マッチする選択肢があれば選択、なければ未選択）
        if (cleanAspectRatio && cleanAspectRatio !== 'original_photo') {
            // セレクトボックスに該当する選択肢があるか確認
            const optionExists = Array.from(uiElements.outputAspectRatioSelect.options).some(
                opt => opt.value === cleanAspectRatio
            );
            if (optionExists) {
                uiElements.outputAspectRatioSelect.value = cleanAspectRatio;
            } else {
                // 該当する選択肢がない場合は「カスタム」を選択
                uiElements.outputAspectRatioSelect.value = 'custom';
            }
        } else {
            uiElements.outputAspectRatioSelect.selectedIndex = -1;
        }
    }
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

    // 自由テキストレイヤー（可変長）
    renderCustomTextsList();
    renderCustomTextSettingsPanel();

    toggleBackgroundSettingsVisibility();
    updateFrameSettingsVisibility();
    updateTextDateSettingsVisibility();
    updateTextExifSettingsVisibility();
    updateSliderValueDisplays();
}


export function updateSliderValueDisplays() {
    const state = getState();
    if (uiElements.photoPosXValueSpan && uiElements.photoPosXSlider) {
        const val = parseFloat(state.photoViewParams.offsetX);
        const displayVal = Math.round((val - 0.5) * 2 * 100);
        uiElements.photoPosXValueSpan.textContent = displayVal === 0 ? '中央' : `${displayVal}%`;
        // Canvas上のドラッグ操作でも変化しうる値なので、つまみの位置もあわせて同期する
        // （フォーカス中でも range input は矢印キー入力以外で編集中になることはないため、無条件で同期して問題ない）
        if (document.activeElement !== uiElements.photoPosXSlider) {
            uiElements.photoPosXSlider.value = val;
        }
    }
    if (uiElements.photoPosYValueSpan && uiElements.photoPosYSlider) {
        const val = parseFloat(state.photoViewParams.offsetY);
        const displayVal = Math.round((val - 0.5) * 2 * 100);
        uiElements.photoPosYValueSpan.textContent = displayVal === 0 ? '中央' : `${displayVal}%`;
        if (document.activeElement !== uiElements.photoPosYSlider) {
            uiElements.photoPosYSlider.value = val;
        }
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
        if (document.activeElement !== uiElements.bgOffsetXSlider) {
            uiElements.bgOffsetXSlider.value = state.imageBlurBackgroundParams.offsetXPercent;
        }
    }
    if (uiElements.bgOffsetYValueSpan && uiElements.bgOffsetYSlider) {
        uiElements.bgOffsetYValueSpan.textContent = `${state.imageBlurBackgroundParams.offsetYPercent}%`;
        if (document.activeElement !== uiElements.bgOffsetYSlider) {
            uiElements.bgOffsetYSlider.value = state.imageBlurBackgroundParams.offsetYPercent;
        }
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

// --- 自由テキストレイヤー（可変長）のUI ---

/** レイヤー一覧（チップ）を再描画する。テキスト内容の変更・追加・削除・選択変更時に呼ぶ。 */
function renderCustomTextsList() {
    const container = uiElements.customTextsListContainer;
    if (!container) return;
    const state = getState();
    const selectedId = selectionStore.getSelectedId();
    container.innerHTML = '';

    state.textSettings.customTexts.forEach((layer, index) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'custom-text-chip' + (layer.id === selectedId ? ' selected' : '');
        if (!layer.enabled) chip.classList.add('disabled');

        const label = document.createElement('span');
        const preview = (layer.text || '').trim();
        label.textContent = preview ? preview.slice(0, 8) : `テキスト${index + 1}`;
        chip.appendChild(label);

        const del = document.createElement('span');
        del.className = 'custom-text-chip-delete';
        del.textContent = '×';
        del.title = '削除';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            selectionStore.clearSelectionIfMatches(layer.id);
            removeCustomTextLayer(layer.id);
            renderCustomTextsList();
            renderCustomTextSettingsPanel();
        });
        chip.appendChild(del);

        chip.addEventListener('click', () => selectionStore.setSelectedId(layer.id));
        container.appendChild(chip);
    });
}

/** 選択中レイヤーの設定パネルを丸ごと再構築する。選択変更・追加・削除時に呼ぶ（毎ドラッグでは呼ばない）。 */
function renderCustomTextSettingsPanel() {
    const panel = uiElements.customTextSettingsPanel;
    if (!panel) return;
    const state = getState();
    const layer = state.textSettings.customTexts.find(t => t.id === selectionStore.getSelectedId());

    if (!layer) {
        panel.innerHTML = '<p class="custom-text-empty-hint">上のリストからテキストを選択、または「+ テキストを追加」で新規作成してください。</p>';
        return;
    }

    panel.innerHTML = `
        <div class="form-row-simple">
            <label for="customTextEnabled">表示する:</label>
            <input type="checkbox" id="customTextEnabled">
        </div>
        <div class="form-row-simple">
            <textarea id="customTextArea" rows="3"
                style="width: 100%; font-family: monospace; padding: 0.3rem; border-radius: 4px; border: 1px solid #ccd0d5;"></textarea>
        </div>
        <div class="form-row-simple" style="justify-content: space-around;">
            <div class="radio-group"><input type="radio" id="customTextAlignLeft" name="customTextAlign" value="left"><label for="customTextAlignLeft">左寄せ</label></div>
            <div class="radio-group"><input type="radio" id="customTextAlignCenter" name="customTextAlign" value="center"><label for="customTextAlignCenter">中央</label></div>
            <div class="radio-group"><input type="radio" id="customTextAlignRight" name="customTextAlign" value="right"><label for="customTextAlignRight">右寄せ</label></div>
        </div>
        <div class="form-row-simple">
            <label for="customTextFont">フォント:</label>
            <select id="customTextFont"></select>
        </div>
        <div class="form-row-slider">
            <label for="customTextSize">サイズ (%):</label>
            <input type="range" id="customTextSize">
            <span id="customTextSizeValue"></span>
        </div>
        <div class="form-row-simple">
            <label for="customTextColor">文字色:</label>
            <input type="color" id="customTextColor">
        </div>
        <div class="form-row-slider">
            <label for="customTextOpacity">透過度:</label>
            <input type="range" id="customTextOpacity">
            <span id="customTextOpacityValue"></span>
        </div>
        <div class="form-row-simple">
            <label for="customTextOffsetX">横位置 (%):</label>
            <input type="number" id="customTextOffsetX" step="0.5">
        </div>
        <div class="form-row-simple">
            <label for="customTextOffsetY">縦位置 (%):</label>
            <input type="number" id="customTextOffsetY" step="0.5">
        </div>
        <p class="custom-text-drag-hint">プレビュー上でドラッグして位置を調整できます（横位置/縦位置欄はドラッグでもスクラブ操作できます。矢印キーでも微調整可）。</p>
    `;

    const id = layer.id;
    const el = (elId) => document.getElementById(elId);

    populateFontSelect(el('customTextFont'), layer.font);
    el('customTextEnabled').checked = layer.enabled;
    el('customTextArea').value = layer.text;
    el(`customTextAlign${layer.textAlign.charAt(0).toUpperCase()}${layer.textAlign.slice(1)}`).checked = true;

    const sizeConfig = controlsConfig.textFreeSize;
    const sizeSlider = el('customTextSize');
    sizeSlider.min = sizeConfig.min; sizeSlider.max = sizeConfig.max; sizeSlider.step = sizeConfig.step;
    sizeSlider.value = layer.size;
    el('customTextSizeValue').textContent = `${layer.size}%`;

    el('customTextColor').value = layer.color;

    const opacitySlider = el('customTextOpacity');
    opacitySlider.min = 0; opacitySlider.max = 1; opacitySlider.step = 0.01;
    opacitySlider.value = layer.opacity;
    el('customTextOpacityValue').textContent = layer.opacity.toFixed(2);

    el('customTextOffsetX').value = layer.offsetX;
    el('customTextOffsetY').value = layer.offsetY;

    // --- イベント配線 ---
    el('customTextEnabled').addEventListener('change', (e) => {
        updateCustomTextLayer(id, { enabled: e.target.checked });
        renderCustomTextsList();
    });
    el('customTextArea').addEventListener('input', debounce((e) => {
        updateCustomTextLayer(id, { text: e.target.value });
        renderCustomTextsList();
    }, 300));
    ['Left', 'Center', 'Right'].forEach(dir => {
        el(`customTextAlign${dir}`).addEventListener('change', (e) => {
            if (e.target.checked) updateCustomTextLayer(id, { textAlign: dir.toLowerCase() });
        });
    });
    el('customTextFont').addEventListener('change', async (e) => {
        const selectedFontObject = googleFonts.find(f => f.displayName === e.target.value);
        if (selectedFontObject) {
            try {
                e.target.disabled = true;
                await loadGoogleFonts(selectedFontObject.apiName);
            } catch (error) {
                alert(`フォントの読み込みに失敗しました: ${selectedFontObject.displayName}`);
            } finally {
                e.target.disabled = false;
            }
        }
        updateCustomTextLayer(id, { font: e.target.value });
    });
    el('customTextSize').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        el('customTextSizeValue').textContent = `${value}%`;
        updateCustomTextLayer(id, { size: value });
    });
    el('customTextColor').addEventListener('input', (e) => {
        updateCustomTextLayer(id, { color: e.target.value });
    });
    el('customTextOpacity').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        el('customTextOpacityValue').textContent = value.toFixed(2);
        updateCustomTextLayer(id, { opacity: value });
    });
    enhanceAsScrubInput(el('customTextOffsetX'), { sensitivity: 0.2, onChange: (v) => updateCustomTextLayer(id, { offsetX: v }) });
    enhanceAsScrubInput(el('customTextOffsetY'), { sensitivity: 0.2, onChange: (v) => updateCustomTextLayer(id, { offsetY: v }) });
}

/**
 * ドラッグ等でcustomTextsのオフセットが変化した際、開いている設定パネルの数値欄だけを軽量に同期する。
 * パネル全体を再構築しないので、入力中のフォーカスを奪わない。
 * フォーカス中の欄は上書きしない（タイプ入力を妨げないため）。
 */
function syncCustomTextOffsetInputs(state) {
    const selectedId = selectionStore.getSelectedId();
    if (!selectedId) return;
    const layer = state.textSettings.customTexts.find(t => t.id === selectedId);
    if (!layer) return;

    const xInput = document.getElementById('customTextOffsetX');
    const yInput = document.getElementById('customTextOffsetY');
    if (xInput && document.activeElement !== xInput) {
        xInput.value = Math.round(layer.offsetX * 10) / 10;
    }
    if (yInput && document.activeElement !== yInput) {
        yInput.value = Math.round(layer.offsetY * 10) / 10;
    }
}

/**
 * 状態変更リスナーとして登録される、UI側の同期処理。
 * どの入力源（スライダー/スクラブ入力/Canvasドラッグ/矢印キー）からの変更でも、
 * ここを通じて他の全ビューが追従する。
 */
export function syncUIFromState(state) {
    updateSliderValueDisplays();
    syncCustomTextOffsetInputs(state);
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
            if ((element.id === 'textDateFontSelect' || element.id === 'textExifFontSelect') && valueToSet) {
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
    // アスペクト比セレクトのイベントリスナー
    if (uiElements.outputAspectRatioSelect) {
        uiElements.outputAspectRatioSelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            if (selectedValue) {
                if (selectedValue === 'custom') {
                    // カスタムが選択された場合は、現在の入力値をそのまま使用
                    updateAspectRatioFromInputs();
                } else {
                    // セレクトボックスから選択した値を解析して入力フィールドに設定
                    const parts = selectedValue.split(':');
                    if (parts.length === 2) {
                        const width = parseFloat(parts[0]);
                        const height = parseFloat(parts[1]);
                        if (!isNaN(width) && width > 0 && uiElements.customAspectRatioWidthInput) {
                            uiElements.customAspectRatioWidthInput.value = String(width);
                        }
                        if (!isNaN(height) && height > 0 && uiElements.customAspectRatioHeightInput) {
                            uiElements.customAspectRatioHeightInput.value = String(height);
                        }
                        // 状態を更新
                        updateState({ outputTargetAspectRatioString: selectedValue });
                        redrawCallback();
                    }
                }
            }
        });
    }

    // アスペクト比入力フィールドのイベントリスナー
    const updateAspectRatioFromInputs = () => {
        if (!uiElements.customAspectRatioWidthInput || !uiElements.customAspectRatioHeightInput) return;
        const width = parseFloat(uiElements.customAspectRatioWidthInput.value);
        const height = parseFloat(uiElements.customAspectRatioHeightInput.value);
        if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
            const aspectRatioString = `${width}:${height}`;
            updateState({ outputTargetAspectRatioString: aspectRatioString });
            // セレクトボックスの選択状態を更新（マッチする選択肢があれば選択、なければカスタムを選択）
            if (uiElements.outputAspectRatioSelect) {
                const optionExists = Array.from(uiElements.outputAspectRatioSelect.options).some(
                    opt => opt.value === aspectRatioString
                );
                if (optionExists) {
                    uiElements.outputAspectRatioSelect.value = aspectRatioString;
                } else {
                    // マッチしない場合は「カスタム」を選択
                    uiElements.outputAspectRatioSelect.value = 'custom';
                }
            }
            redrawCallback();
        }
    };

    if (uiElements.customAspectRatioWidthInput) {
        uiElements.customAspectRatioWidthInput.addEventListener('input', updateAspectRatioFromInputs);
    }
    if (uiElements.customAspectRatioHeightInput) {
        uiElements.customAspectRatioHeightInput.addEventListener('input', updateAspectRatioFromInputs);
    }

    // 反転ボタンのイベントリスナー
    if (uiElements.swapAspectRatioButton) {
        uiElements.swapAspectRatioButton.addEventListener('click', () => {
            if (!uiElements.customAspectRatioWidthInput || !uiElements.customAspectRatioHeightInput) return;
            const width = parseFloat(uiElements.customAspectRatioWidthInput.value);
            const height = parseFloat(uiElements.customAspectRatioHeightInput.value);
            if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                // 幅と高さを入れ替え
                uiElements.customAspectRatioWidthInput.value = String(height);
                uiElements.customAspectRatioHeightInput.value = String(width);
                // 状態を更新
                updateAspectRatioFromInputs();
            }
        });
    }

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


    // --- 文字入力タブ - 自由テキスト（可変長レイヤー） ---
    // レイヤー個別の設定UIはrenderCustomTextSettingsPanel()内でレイヤーごとに配線されるため、
    // ここでは「追加ボタン」と「選択変更に応じたUI再描画」のみを配線する。
    if (uiElements.addCustomTextButton) {
        uiElements.addCustomTextButton.addEventListener('click', () => {
            const id = addCustomTextLayer();
            selectionStore.setSelectedId(id);
            renderCustomTextsList();
            renderCustomTextSettingsPanel();
        });
    }
    selectionStore.onSelectionChange(() => {
        renderCustomTextsList();
        renderCustomTextSettingsPanel();
    });

}