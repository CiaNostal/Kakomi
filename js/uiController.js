// js/uiController.js
import { getState, updateState } from './stateManager.js';
import { controlsConfig } from './uiDefinitions.js';
// requestRedraw は main.js からコールバックとして渡される

export const uiElements = {
    imageLoader: document.getElementById('imageLoader'),
    previewCanvas: document.getElementById('previewCanvas'),
    previewCtx: null, // main.jsで初期化
    downloadButton: document.getElementById('downloadButton'),
    canvasContainer: document.querySelector('.canvas-container'),

    // レイアウト設定タブ
    outputAspectRatioSelect: document.getElementById('outputAspectRatio'),
    baseMarginPercentInput: document.getElementById('baseMarginPercent'),
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

    // 出力タブ
    jpgQualitySlider: document.getElementById('jpgQuality'),
    jpgQualityValueSpan: document.getElementById('jpgQualityValue'),

    // フレーム加工タブ UI要素
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
    frameDropShadowSettingsContainer: document.getElementById('frameDropShadowSettingsContainer'),
    frameDropShadowOffsetXSlider: document.getElementById('frameDropShadowOffsetX'),
    frameDropShadowOffsetXValueSpan: document.getElementById('frameDropShadowOffsetXValue'),
    frameDropShadowOffsetYSlider: document.getElementById('frameDropShadowOffsetY'),
    frameDropShadowOffsetYValueSpan: document.getElementById('frameDropShadowOffsetYValue'),
    frameDropShadowBlurSlider: document.getElementById('frameDropShadowBlur'),
    frameDropShadowBlurValueSpan: document.getElementById('frameDropShadowBlurValue'),
    frameDropShadowSpreadSlider: document.getElementById('frameDropShadowSpread'),
    frameDropShadowSpreadValueSpan: document.getElementById('frameDropShadowSpreadValue'),
    frameDropShadowColorInput: document.getElementById('frameDropShadowColor'),
    frameInnerShadowSettingsContainer: document.getElementById('frameInnerShadowSettingsContainer'),
    frameInnerShadowOffsetXSlider: document.getElementById('frameInnerShadowOffsetX'),
    frameInnerShadowOffsetXValueSpan: document.getElementById('frameInnerShadowOffsetXValue'),
    frameInnerShadowOffsetYSlider: document.getElementById('frameInnerShadowOffsetY'),
    frameInnerShadowOffsetYValueSpan: document.getElementById('frameInnerShadowOffsetYValue'),
    frameInnerShadowBlurSlider: document.getElementById('frameInnerShadowBlur'),
    frameInnerShadowBlurValueSpan: document.getElementById('frameInnerShadowBlurValue'),
    frameInnerShadowSpreadPercentSlider: document.getElementById('frameInnerShadowSpreadPercent'),
    frameInnerShadowSpreadPercentValueSpan: document.getElementById('frameInnerShadowSpreadPercentValue'),
    frameInnerShadowColorInput: document.getElementById('frameInnerShadowColor'),

    frameBorderEnabledCheckbox: document.getElementById('frameBorderEnabled'),
    frameBorderDetailSettingsContainer: document.getElementById('frameBorderDetailSettingsContainer'),
    frameBorderWidthSlider: document.getElementById('frameBorderWidth'),
    frameBorderWidthValueSpan: document.getElementById('frameBorderWidthValue'),
    frameBorderColorInput: document.getElementById('frameBorderColor'),
    frameBorderStyleSelect: document.getElementById('frameBorderStyle'),

    exifDataContainer: document.getElementById('exifDataContainer'),

    // 文字入力タブ - 撮影日表示 UI要素
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

    // 文字入力タブ - Exif表示 UI要素
    textExifEnabledCheckbox: document.getElementById('textExifEnabled'),
    textExifSettingsContainer: document.getElementById('textExifSettingsContainer'),
    textExifItemMakeCheckbox: document.getElementById('textExifItemMake'),
    textExifItemModelCheckbox: document.getElementById('textExifItemModel'),
    textExifItemFNumberCheckbox: document.getElementById('textExifItemFNumber'),
    textExifItemExposureTimeCheckbox: document.getElementById('textExifItemExposureTime'),
    textExifItemISOSpeedRatingsCheckbox: document.getElementById('textExifItemISOSpeedRatings'),
    textExifItemFocalLengthCheckbox: document.getElementById('textExifItemFocalLength'),
    textExifItemLensModelCheckbox: document.getElementById('textExifItemLensModel'),
    textExifFontSelect: document.getElementById('textExifFont'),
    textExifSizeSlider: document.getElementById('textExifSize'),
    textExifSizeValueSpan: document.getElementById('textExifSizeValue'),
    textExifColorInput: document.getElementById('textExifColor'),
    textExifPositionSelect: document.getElementById('textExifPosition'),
    textExifOffsetXSlider: document.getElementById('textExifOffsetX'),
    textExifOffsetXValueSpan: document.getElementById('textExifOffsetXValue'),
    textExifOffsetYSlider: document.getElementById('textExifOffsetY'),
    textExifOffsetYValueSpan: document.getElementById('textExifOffsetYValue'),
};

export function initializeUIFromState() {
    const state = getState();

    const setupInputAttributesAndValue = (element, configKey, stateValue) => {
        if (!element) return; // 要素が存在しない場合は何もしない
        if (controlsConfig[configKey]) {
            const config = controlsConfig[configKey];
            if (element.type === 'range' || element.type === 'number') {
                if (config.min !== undefined) element.min = config.min;
                if (config.max !== undefined) element.max = config.max;
                if (config.step !== undefined) element.step = config.step;
            }
            element.value = String(stateValue);
        } else { // controlsConfigに定義がない場合でも、stateValueで初期化を試みる
            element.value = String(stateValue);
        }
        // チェックボックスとラジオボタンのcheckedプロパティも設定
        if (element.type === 'checkbox') {
            element.checked = Boolean(stateValue);
        } else if (element.type === 'radio' && element.value === String(stateValue)) {
            // name属性でグループ化されたラジオボタン群の中で、
            // stateValueと一致するvalueを持つものをチェックする
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

    setupInputAttributesAndValue(uiElements.frameDropShadowOffsetXSlider, 'frameDropShadowOffsetX', fs.dropShadow.offsetX);
    setupInputAttributesAndValue(uiElements.frameDropShadowOffsetYSlider, 'frameDropShadowOffsetY', fs.dropShadow.offsetY);
    setupInputAttributesAndValue(uiElements.frameDropShadowBlurSlider, 'frameDropShadowBlur', fs.dropShadow.blur);
    setupInputAttributesAndValue(uiElements.frameDropShadowSpreadSlider, 'frameDropShadowSpread', fs.dropShadow.spread);
    if (uiElements.frameDropShadowColorInput) uiElements.frameDropShadowColorInput.value = fs.dropShadow.color;

    setupInputAttributesAndValue(uiElements.frameInnerShadowOffsetXSlider, 'frameInnerShadowOffsetX', fs.innerShadow.offsetX);
    setupInputAttributesAndValue(uiElements.frameInnerShadowOffsetYSlider, 'frameInnerShadowOffsetY', fs.innerShadow.offsetY);
    setupInputAttributesAndValue(uiElements.frameInnerShadowBlurSlider, 'frameInnerShadowBlur', fs.innerShadow.blur);
    setupInputAttributesAndValue(uiElements.frameInnerShadowSpreadPercentSlider, 'frameInnerShadowSpreadPercent', fs.innerShadow.spreadPercent);
    if (uiElements.frameInnerShadowColorInput) uiElements.frameInnerShadowColorInput.value = fs.innerShadow.color;

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

    // 文字入力 - Exif設定
    const tes = state.textSettings.exif;
    if (uiElements.textExifEnabledCheckbox) uiElements.textExifEnabledCheckbox.checked = tes.enabled;
    // 表示項目チェックボックスの初期化
    const exifItemCheckboxes = [
        { el: uiElements.textExifItemMakeCheckbox, key: 'Make' },
        { el: uiElements.textExifItemModelCheckbox, key: 'Model' },
        { el: uiElements.textExifItemFNumberCheckbox, key: 'FNumber' },
        { el: uiElements.textExifItemExposureTimeCheckbox, key: 'ExposureTime' },
        { el: uiElements.textExifItemISOSpeedRatingsCheckbox, key: 'ISOSpeedRatings' },
        { el: uiElements.textExifItemFocalLengthCheckbox, key: 'FocalLength' },
        { el: uiElements.textExifItemLensModelCheckbox, key: 'LensModel' },
    ];
    exifItemCheckboxes.forEach(item => {
        if (item.el) item.el.checked = tes.items.includes(item.key);
    });
    if (uiElements.textExifFontSelect) uiElements.textExifFontSelect.value = tes.font;
    setupInputAttributesAndValue(uiElements.textExifSizeSlider, 'textExifSize', tes.size);
    if (uiElements.textExifColorInput) uiElements.textExifColorInput.value = tes.color;
    if (uiElements.textExifPositionSelect) uiElements.textExifPositionSelect.value = tes.position;
    setupInputAttributesAndValue(uiElements.textExifOffsetXSlider, 'textExifOffsetX', tes.offsetX);
    setupInputAttributesAndValue(uiElements.textExifOffsetYSlider, 'textExifOffsetY', tes.offsetY);

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
    }
    if (uiElements.photoPosYValueSpan && uiElements.photoPosYSlider) {
        const val = parseFloat(state.photoViewParams.offsetY);
        const displayVal = Math.round((val - 0.5) * 2 * 100);
        uiElements.photoPosYValueSpan.textContent = displayVal === 0 ? '中央' : `${displayVal}%`;
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
    if (uiElements.jpgQualityValueSpan && uiElements.jpgQualitySlider) {
        uiElements.jpgQualityValueSpan.textContent = `${state.outputSettings.quality}`;
    }
    // フレーム加工スライダーの値表示
    const fs = state.frameSettings;
    if (uiElements.frameCornerRadiusPercentValueSpan && uiElements.frameCornerRadiusPercentSlider) {
        uiElements.frameCornerRadiusPercentValueSpan.textContent = `${fs.cornerRadiusPercent}%`;
    }
    if (uiElements.frameSuperellipseNValueSpan && uiElements.frameSuperellipseNSlider) {
        uiElements.frameSuperellipseNValueSpan.textContent = fs.superellipseN;
    }
    if (uiElements.frameDropShadowOffsetXValueSpan) uiElements.frameDropShadowOffsetXValueSpan.textContent = `${fs.dropShadow.offsetX}%`;
    if (uiElements.frameDropShadowOffsetYValueSpan) uiElements.frameDropShadowOffsetYValueSpan.textContent = `${fs.dropShadow.offsetY}%`;
    if (uiElements.frameDropShadowBlurValueSpan) uiElements.frameDropShadowBlurValueSpan.textContent = `${fs.dropShadow.blur}%`;
    if (uiElements.frameDropShadowSpreadValueSpan) uiElements.frameDropShadowSpreadValueSpan.textContent = `${fs.dropShadow.spread}%`;
    if (uiElements.frameInnerShadowOffsetXValueSpan) uiElements.frameInnerShadowOffsetXValueSpan.textContent = `${fs.innerShadow.offsetX}%`;
    if (uiElements.frameInnerShadowOffsetYValueSpan) uiElements.frameInnerShadowOffsetYValueSpan.textContent = `${fs.innerShadow.offsetY}%`;
    if (uiElements.frameInnerShadowBlurValueSpan) uiElements.frameInnerShadowBlurValueSpan.textContent = `${fs.innerShadow.blur}%`;
    if (uiElements.frameInnerShadowSpreadPercentValueSpan) {
        uiElements.frameInnerShadowSpreadPercentValueSpan.textContent = `${fs.innerShadow.spreadPercent}%`;
    }
    if (uiElements.frameBorderWidthValueSpan && uiElements.frameBorderWidthSlider) {
        uiElements.frameBorderWidthValueSpan.textContent = `${fs.border.width}%`;
    }

    // 文字入力 - 撮影日スライダーの値表示
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

    // 文字入力 - Exifスライダーの値表示
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
}

export function toggleBackgroundSettingsVisibility() {
    if (!uiElements.bgColorSettingsContainer || !uiElements.imageBlurSettingsContainer) return;
    const currentBackgroundType = getState().backgroundType;
    if (currentBackgroundType === 'color') {
        uiElements.bgColorSettingsContainer.classList.remove('hidden');
        uiElements.imageBlurSettingsContainer.classList.add('hidden');
    } else if (currentBackgroundType === 'imageBlur') {
        uiElements.bgColorSettingsContainer.classList.add('hidden');
        uiElements.imageBlurSettingsContainer.classList.remove('hidden');
    }
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

    if (frameState.shadowEnabled) {
        if (uiElements.frameDropShadowSettingsContainer) {
            uiElements.frameDropShadowSettingsContainer.style.display = frameState.shadowType === 'drop' ? '' : 'none';
        }
        if (uiElements.frameInnerShadowSettingsContainer) {
            uiElements.frameInnerShadowSettingsContainer.style.display = frameState.shadowType === 'inner' ? '' : 'none';
        }
    } else {
        if (uiElements.frameDropShadowSettingsContainer) uiElements.frameDropShadowSettingsContainer.style.display = 'none';
        if (uiElements.frameInnerShadowSettingsContainer) uiElements.frameInnerShadowSettingsContainer.style.display = 'none';
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
    // ★デバッグログ追加
    console.log('[updateTextExifSettingsVisibility] Called. Current textSettings.exif.enabled:', exifSettingsEnabled);
    if (uiElements.textExifSettingsContainer) {
        const newDisplayValue = exifSettingsEnabled ? '' : 'none';
        // ★デバッグログ追加
        console.log(`[updateTextExifSettingsVisibility] textExifSettingsContainer: setting display to '${newDisplayValue}'`);
        uiElements.textExifSettingsContainer.style.display = exifSettingsEnabled ? '' : 'none';
    }
}

export function setupEventListeners(redrawCallback) {
    // 汎用数値入力リスナー (スライダー、数値入力)
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
            if (subNestedKey && nestedKey) {
                updatePayload = { [stateKey]: { [nestedKey]: { [subNestedKey]: value } } };
            } else if (nestedKey) {
                updatePayload = { [stateKey]: { [nestedKey]: value } };
            } else {
                updatePayload = { [stateKey]: value };
            }
            updateState(updatePayload);
            updateSliderValueDisplays();
            redrawCallback();
        });
    };

    // 汎用選択肢変更リスナー (ラジオボタン、セレクトボックス、チェックボックス)
    // 引数: element, stateKey, p1, p2, p3
    // p1: radioValue (radio) | nestedKey (checkbox/select)
    // p2: nestedKey (radio)  | subNestedKey (checkbox/select)
    // p3: subNestedKey (radio)| (not used for checkbox/select)
    const addOptionChangeListener = (element, stateKey, p1, p2 = '', p3 = '') => {
        if (!element) return;
        const eventType = (element.type === 'checkbox' || element.type === 'radio') ? 'change' : 'change';

        element.addEventListener(eventType, (e) => {
            let valueToSet;
            let updatePayload;

            let actualNestedKey = '';
            let actualSubNestedKey = '';

            // ★特定の要素のデバッグログ (textExifEnabledCheckbox にも適用)
            if (element.id === 'textExifEnabledCheckbox' || element.id === 'frameBorderEnabledCheckbox' || element.id === 'frameShadowEnabledCheckbox' || element.id === 'textDateEnabledCheckbox') {
                console.log(`[UIController] Event on: ${element.id}, type: ${eventType}, checked: ${e.target.checked}`);
                console.log(`[UIController] addOptionChangeListener params for ${element.id}: stateKey=${stateKey}, p1=${p1}, p2=${p2}, p3=${p3}`);
            }

            if (element.type === 'checkbox') {
                valueToSet = e.target.checked;
                actualNestedKey = p1;
                actualSubNestedKey = p2;
            } else if (element.type === 'radio') {
                if (!e.target.checked) return;
                valueToSet = p1;
                actualNestedKey = p2;
                actualSubNestedKey = p3;
            } else { // select
                valueToSet = e.target.value;
                actualNestedKey = p1;
                actualSubNestedKey = p2;
            }

            if (actualSubNestedKey && actualNestedKey) {
                updatePayload = { [stateKey]: { [actualNestedKey]: { [actualSubNestedKey]: valueToSet } } };
            } else if (actualNestedKey) {
                updatePayload = { [stateKey]: { [actualNestedKey]: valueToSet } };
            } else {
                updatePayload = { [stateKey]: valueToSet };
            }

            if (element.id === 'textExifEnabledCheckbox' || element.id === 'frameBorderEnabledCheckbox') { // ★デバッグログ追加
                console.log(`[UIController] ${element.id} - updatePayload:`, JSON.stringify(updatePayload));
            }
            updateState(updatePayload);

            // UI表示切替判定 - actualNestedKey と actualSubNestedKey を使用
            let visibilityFunctionCalled = false;
            if (stateKey === 'backgroundType') {
                toggleBackgroundSettingsVisibility();
                visibilityFunctionCalled = true;
            } else if (stateKey === 'frameSettings') {
                if (actualNestedKey === 'cornerStyle' || actualNestedKey === 'shadowEnabled' || actualNestedKey === 'shadowType' || (actualNestedKey === 'border' && actualSubNestedKey === 'enabled')) {
                    console.log(`[UIController] Calling updateFrameSettingsVisibility. Triggered by: ${actualNestedKey}.${actualSubNestedKey || ''}`);
                    updateFrameSettingsVisibility();
                    visibilityFunctionCalled = true;
                }
            } else if (stateKey === 'textSettings') {
                if (actualNestedKey === 'date' && actualSubNestedKey === 'enabled') {
                    updateTextDateSettingsVisibility();
                    visibilityFunctionCalled = true;
                } else if (actualNestedKey === 'exif' && actualSubNestedKey === 'enabled') { // ★この条件で呼び出し
                    console.log(`[UIController] Calling updateTextExifSettingsVisibility for ${element.id}`);
                    updateTextExifSettingsVisibility();
                    visibilityFunctionCalled = true;
                }
            }

            if ((element.id === 'textExifEnabledCheckbox' || element.id === 'frameBorderEnabledCheckbox') && !visibilityFunctionCalled) {
                console.warn(`[UIController] ${element.id} changed, but no specific visibility function was called. actualNestedKey: ${actualNestedKey}, actualSubNestedKey: ${actualSubNestedKey}`);
            }

            updateSliderValueDisplays();
            redrawCallback();
        });
    };

    // カラーピッカー専用リスナー
    const addColorInputListener = (element, stateKey, nestedKey = '', subNestedKey = '') => {
        if (!element) return;
        element.addEventListener('input', (e) => {
            const colorValue = e.target.value;
            let updatePayload;
            if (subNestedKey && nestedKey) {
                updatePayload = { [stateKey]: { [nestedKey]: { [subNestedKey]: colorValue } } };
            } else if (nestedKey) {
                updatePayload = { [stateKey]: { [nestedKey]: colorValue } };
            } else {
                updatePayload = { [stateKey]: colorValue };
            }
            updateState(updatePayload);
            redrawCallback();
        });
    };

    // --- レイアウト設定タブ ---
    addOptionChangeListener(uiElements.outputAspectRatioSelect, 'outputTargetAspectRatioString');
    addNumericInputListener(uiElements.baseMarginPercentInput, 'baseMarginPercent', 'baseMarginPercent');
    addNumericInputListener(uiElements.photoPosXSlider, 'photoPosX', 'photoViewParams', 'offsetX');
    addNumericInputListener(uiElements.photoPosYSlider, 'photoPosY', 'photoViewParams', 'offsetY');

    // --- 背景編集タブ ---
    addOptionChangeListener(uiElements.bgTypeColorRadio, 'backgroundType', 'color');
    addOptionChangeListener(uiElements.bgTypeImageBlurRadio, 'backgroundType', 'imageBlur');
    addColorInputListener(uiElements.backgroundColorInput, 'backgroundColor');
    addNumericInputListener(uiElements.bgScaleSlider, 'bgScale', 'imageBlurBackgroundParams', 'scale');
    addNumericInputListener(uiElements.bgBlurSlider, 'bgBlur', 'imageBlurBackgroundParams', 'blurAmountPercent');
    addNumericInputListener(uiElements.bgBrightnessSlider, 'bgBrightness', 'imageBlurBackgroundParams', 'brightness');
    addNumericInputListener(uiElements.bgSaturationSlider, 'bgSaturation', 'imageBlurBackgroundParams', 'saturation');

    // --- 出力タブ ---
    addNumericInputListener(uiElements.jpgQualitySlider, 'jpgQuality', 'outputSettings', 'quality');

    // --- フレーム加工タブ ---
    addOptionChangeListener(uiElements.frameCornerStyleNoneRadio, 'frameSettings', 'none', 'cornerStyle');
    addOptionChangeListener(uiElements.frameCornerStyleRoundedRadio, 'frameSettings', 'rounded', 'cornerStyle');
    addOptionChangeListener(uiElements.frameCornerStyleSuperellipseRadio, 'frameSettings', 'superellipse', 'cornerStyle');
    addNumericInputListener(uiElements.frameCornerRadiusPercentSlider, 'frameCornerRadiusPercent', 'frameSettings', 'cornerRadiusPercent');
    addNumericInputListener(uiElements.frameSuperellipseNSlider, 'frameSuperellipseN', 'frameSettings', 'superellipseN');

    addOptionChangeListener(uiElements.frameShadowEnabledCheckbox, 'frameSettings', 'shadowEnabled');
    addOptionChangeListener(uiElements.frameShadowTypeDropRadio, 'frameSettings', 'drop', 'shadowType');
    addOptionChangeListener(uiElements.frameShadowTypeInnerRadio, 'frameSettings', 'inner', 'shadowType');
    addNumericInputListener(uiElements.frameDropShadowOffsetXSlider, 'frameDropShadowOffsetX', 'frameSettings', 'dropShadow', 'offsetX');
    addNumericInputListener(uiElements.frameDropShadowOffsetYSlider, 'frameDropShadowOffsetY', 'frameSettings', 'dropShadow', 'offsetY');
    addNumericInputListener(uiElements.frameDropShadowBlurSlider, 'frameDropShadowBlur', 'frameSettings', 'dropShadow', 'blur');
    addNumericInputListener(uiElements.frameDropShadowSpreadSlider, 'frameDropShadowSpread', 'frameSettings', 'dropShadow', 'spread');
    addColorInputListener(uiElements.frameDropShadowColorInput, 'frameSettings', 'dropShadow', 'color');
    addNumericInputListener(uiElements.frameInnerShadowOffsetXSlider, 'frameInnerShadowOffsetX', 'frameSettings', 'innerShadow', 'offsetX');
    addNumericInputListener(uiElements.frameInnerShadowOffsetYSlider, 'frameInnerShadowOffsetY', 'frameSettings', 'innerShadow', 'offsetY');
    addNumericInputListener(uiElements.frameInnerShadowBlurSlider, 'frameInnerShadowBlur', 'frameSettings', 'innerShadow', 'blur');
    addNumericInputListener(uiElements.frameInnerShadowSpreadPercentSlider, 'frameInnerShadowSpreadPercent', 'frameSettings', 'innerShadow', 'spreadPercent');
    addColorInputListener(uiElements.frameInnerShadowColorInput, 'frameSettings', 'innerShadow', 'color');

    addOptionChangeListener(uiElements.frameBorderEnabledCheckbox, 'frameSettings', 'border', 'enabled');
    addNumericInputListener(uiElements.frameBorderWidthSlider, 'frameBorderWidth', 'frameSettings', 'border', 'width');
    addColorInputListener(uiElements.frameBorderColorInput, 'frameSettings', 'border', 'color');
    addOptionChangeListener(uiElements.frameBorderStyleSelect, 'frameSettings', 'border', 'style');

    // --- 文字入力タブ - 撮影日 ---
    addOptionChangeListener(uiElements.textDateEnabledCheckbox, 'textSettings', 'date', 'enabled');
    addOptionChangeListener(uiElements.textDateFormatSelect, 'textSettings', 'date', 'format');
    addOptionChangeListener(uiElements.textDateFontSelect, 'textSettings', 'date', 'font');
    addNumericInputListener(uiElements.textDateSizeSlider, 'textDateSize', 'textSettings', 'date', 'size');
    addColorInputListener(uiElements.textDateColorInput, 'textSettings', 'date', 'color');
    addOptionChangeListener(uiElements.textDatePositionSelect, 'textSettings', 'date', 'position');
    addNumericInputListener(uiElements.textDateOffsetXSlider, 'textDateOffsetX', 'textSettings', 'date', 'offsetX');
    addNumericInputListener(uiElements.textDateOffsetYSlider, 'textDateOffsetY', 'textSettings', 'date', 'offsetY');

    // --- 文字入力タブ - Exif情報 ---
    addOptionChangeListener(uiElements.textExifEnabledCheckbox, 'textSettings', 'exif', 'enabled'); // ★呼び出し方を確認


    const exifItemCheckboxes = [
        uiElements.textExifItemMakeCheckbox,
        uiElements.textExifItemModelCheckbox,
        uiElements.textExifItemFNumberCheckbox,
        uiElements.textExifItemExposureTimeCheckbox,
        uiElements.textExifItemISOSpeedRatingsCheckbox,
        uiElements.textExifItemFocalLengthCheckbox,
        uiElements.textExifItemLensModelCheckbox,
    ];
    exifItemCheckboxes.forEach(checkbox => {
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                const currentItems = getState().textSettings.exif.items || [];
                const itemName = checkbox.value; // HTMLのvalue属性に 'Make', 'Model' などを設定
                let newItems;
                if (checkbox.checked) {
                    if (!currentItems.includes(itemName)) {
                        newItems = [...currentItems, itemName];
                    } else {
                        newItems = [...currentItems];
                    }
                } else {
                    newItems = currentItems.filter(item => item !== itemName);
                }
                updateState({ textSettings: { exif: { items: newItems } } });
                redrawCallback();
            });
        }
    });
    addOptionChangeListener(uiElements.textExifFontSelect, 'textSettings', 'exif', 'font');
    addNumericInputListener(uiElements.textExifSizeSlider, 'textExifSize', 'textSettings', 'exif', 'size');
    addColorInputListener(uiElements.textExifColorInput, 'textSettings', 'exif', 'color');
    addOptionChangeListener(uiElements.textExifPositionSelect, 'textSettings', 'exif', 'position');
    addNumericInputListener(uiElements.textExifOffsetXSlider, 'textExifOffsetX', 'textSettings', 'exif', 'offsetX');
    addNumericInputListener(uiElements.textExifOffsetYSlider, 'textExifOffsetY', 'textSettings', 'exif', 'offsetY');
}