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
    frameInnerShadowBlurSlider: document.getElementById('frameInnerShadowBlur'),
    frameInnerShadowBlurValueSpan: document.getElementById('frameInnerShadowBlurValue'),
    frameInnerShadowSpreadSlider: document.getElementById('frameInnerShadowSpread'),
    frameInnerShadowSpreadValueSpan: document.getElementById('frameInnerShadowSpreadValue'),
    frameInnerShadowColorInput: document.getElementById('frameInnerShadowColor'),

    frameBorderEnabledCheckbox: document.getElementById('frameBorderEnabled'),
    frameBorderDetailSettingsContainer: document.getElementById('frameBorderDetailSettingsContainer'),
    frameBorderWidthSlider: document.getElementById('frameBorderWidth'),
    frameBorderWidthValueSpan: document.getElementById('frameBorderWidthValue'),
    frameBorderColorInput: document.getElementById('frameBorderColor'),
    frameBorderStyleSelect: document.getElementById('frameBorderStyle'),

    exifDataContainer: document.getElementById('exifDataContainer'),
};

export function initializeUIFromState() {
    const state = getState();

    const setupInputAttributesAndValue = (element, configKey, stateValue) => {
        if (element && controlsConfig[configKey]) {
            const config = controlsConfig[configKey];
            if (element.type === 'range' || element.type === 'number') {
                if (config.min !== undefined) element.min = config.min;
                if (config.max !== undefined) element.max = config.max;
                if (config.step !== undefined) element.step = config.step;
            }
            element.value = String(stateValue);
        } else if (element) {
            element.value = String(stateValue);
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

    setupInputAttributesAndValue(uiElements.frameInnerShadowBlurSlider, 'frameInnerShadowBlur', fs.innerShadow.blur);
    setupInputAttributesAndValue(uiElements.frameInnerShadowSpreadSlider, 'frameInnerShadowSpread', fs.innerShadow.spread);
    if (uiElements.frameInnerShadowColorInput) uiElements.frameInnerShadowColorInput.value = fs.innerShadow.color;

    if (uiElements.frameBorderEnabledCheckbox) uiElements.frameBorderEnabledCheckbox.checked = fs.border.enabled;
    setupInputAttributesAndValue(uiElements.frameBorderWidthSlider, 'frameBorderWidth', fs.border.width);
    if (uiElements.frameBorderColorInput) uiElements.frameBorderColorInput.value = fs.border.color;
    if (uiElements.frameBorderStyleSelect) uiElements.frameBorderStyleSelect.value = fs.border.style;

    toggleBackgroundSettingsVisibility();
    updateFrameSettingsVisibility();
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
    if (uiElements.frameInnerShadowBlurValueSpan) uiElements.frameInnerShadowBlurValueSpan.textContent = `${fs.innerShadow.blur}%`;
    if (uiElements.frameInnerShadowSpreadValueSpan) uiElements.frameInnerShadowSpreadValueSpan.textContent = `${fs.innerShadow.spread}%`;
    if (uiElements.frameBorderWidthValueSpan && uiElements.frameBorderWidthSlider) {
        uiElements.frameBorderWidthValueSpan.textContent = `${fs.border.width}%`;
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
    } else { // 影が無効なら、ドロップシャドウとインナーシャドウの設定も隠す
        if (uiElements.frameDropShadowSettingsContainer) uiElements.frameDropShadowSettingsContainer.style.display = 'none';
        if (uiElements.frameInnerShadowSettingsContainer) uiElements.frameInnerShadowSettingsContainer.style.display = 'none';
    }

    if (uiElements.frameBorderDetailSettingsContainer) {
        uiElements.frameBorderDetailSettingsContainer.style.display = frameState.border.enabled ? '' : 'none';
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
            e.target.value = String(value); // バリデーション後の値をUIに反映

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
    const addOptionChangeListener = (element, stateKey, radioValueOrNestedKey = '', nestedKeyOrSubNestedKey = '', subNestedKeyIfRadio = '') => {
        if (!element) return;
        const eventType = (element.type === 'checkbox' || element.type === 'radio') ? 'change' : 'change'; // 'input' for select if live update needed

        element.addEventListener(eventType, (e) => {
            let valueToSet;
            let updatePayload;
            let actualNestedKey = radioValueOrNestedKey;
            let actualSubNestedKey = nestedKeyOrSubNestedKey;

            if (element.type === 'checkbox') {
                valueToSet = e.target.checked;
                // stateKey, nestedKey, subNestedKey for checkbox are determined by parameters
                // Example: addOptionChangeListener(el, 'frameSettings', 'shadowEnabled') -> stateKey='frameSettings', actualNestedKey='shadowEnabled'
            } else if (element.type === 'radio') {
                if (!e.target.checked) return;
                valueToSet = radioValueOrNestedKey; // radioValue is passed as the 2nd param for radio
                actualNestedKey = nestedKeyOrSubNestedKey; // nestedKey for radio is passed as 3rd param
                actualSubNestedKey = subNestedKeyIfRadio;   // subNestedKey for radio is passed as 4th param
            } else { // select
                valueToSet = e.target.value;
                // actualNestedKey and actualSubNestedKey are already set from parameters
            }

            if (actualSubNestedKey && actualNestedKey) {
                updatePayload = { [stateKey]: { [actualNestedKey]: { [actualSubNestedKey]: valueToSet } } };
            } else if (actualNestedKey) {
                updatePayload = { [stateKey]: { [actualNestedKey]: valueToSet } };
            } else {
                updatePayload = { [stateKey]: valueToSet };
            }
            updateState(updatePayload);

            // UI表示切替判定
            if (stateKey === 'backgroundType') {
                toggleBackgroundSettingsVisibility();
            } else if (stateKey === 'frameSettings' &&
                (actualNestedKey === 'cornerStyle' || actualNestedKey === 'shadowEnabled' ||
                    actualNestedKey === 'shadowType' || actualNestedKey === 'borderEnabled')) {
                updateFrameSettingsVisibility();
            }
            updateSliderValueDisplays(); // ラジオボタン等でも値表示スパンを更新する場合があるため
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
            // カラーピッカーの値変更は通常即時再描画
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
    if (uiElements.jpgQualitySlider) { // This is a numeric input, handled by addNumericInputListener
        addNumericInputListener(uiElements.jpgQualitySlider, 'jpgQuality', 'outputSettings', 'quality');
    }

    // --- フレーム加工タブ ---
    // 角のスタイル (ラジオボタン)
    addOptionChangeListener(uiElements.frameCornerStyleNoneRadio, 'frameSettings', 'none', 'cornerStyle');
    addOptionChangeListener(uiElements.frameCornerStyleRoundedRadio, 'frameSettings', 'rounded', 'cornerStyle');
    addOptionChangeListener(uiElements.frameCornerStyleSuperellipseRadio, 'frameSettings', 'superellipse', 'cornerStyle');
    // 角丸設定 (スライダー)
    addNumericInputListener(uiElements.frameCornerRadiusPercentSlider, 'frameCornerRadiusPercent', 'frameSettings', 'cornerRadiusPercent');
    // 超楕円設定 (スライダー)
    addNumericInputListener(uiElements.frameSuperellipseNSlider, 'frameSuperellipseN', 'frameSettings', 'superellipseN');

    // 影
    addOptionChangeListener(uiElements.frameShadowEnabledCheckbox, 'frameSettings', 'shadowEnabled'); // チェックボックス
    addOptionChangeListener(uiElements.frameShadowTypeDropRadio, 'frameSettings', 'drop', 'shadowType'); // ラジオ
    addOptionChangeListener(uiElements.frameShadowTypeInnerRadio, 'frameSettings', 'inner', 'shadowType'); // ラジオ
    // ドロップシャドウ詳細設定
    addNumericInputListener(uiElements.frameDropShadowOffsetXSlider, 'frameDropShadowOffsetX', 'frameSettings', 'dropShadow', 'offsetX');
    addNumericInputListener(uiElements.frameDropShadowOffsetYSlider, 'frameDropShadowOffsetY', 'frameSettings', 'dropShadow', 'offsetY');
    addNumericInputListener(uiElements.frameDropShadowBlurSlider, 'frameDropShadowBlur', 'frameSettings', 'dropShadow', 'blur');
    addNumericInputListener(uiElements.frameDropShadowSpreadSlider, 'frameDropShadowSpread', 'frameSettings', 'dropShadow', 'spread');
    addColorInputListener(uiElements.frameDropShadowColorInput, 'frameSettings', 'dropShadow', 'color');
    // インナーシャドウ詳細設定
    addNumericInputListener(uiElements.frameInnerShadowBlurSlider, 'frameInnerShadowBlur', 'frameSettings', 'innerShadow', 'blur');
    addNumericInputListener(uiElements.frameInnerShadowSpreadSlider, 'frameInnerShadowSpread', 'frameSettings', 'innerShadow', 'spread');
    addColorInputListener(uiElements.frameInnerShadowColorInput, 'frameSettings', 'innerShadow', 'color');

    // 縁取り
    addOptionChangeListener(uiElements.frameBorderEnabledCheckbox, 'frameSettings', 'borderEnabled'); // チェックボックス
    addNumericInputListener(uiElements.frameBorderWidthSlider, 'frameBorderWidth', 'frameSettings', 'border', 'width');
    addColorInputListener(uiElements.frameBorderColorInput, 'frameSettings', 'border', 'color');
    addOptionChangeListener(uiElements.frameBorderStyleSelect, 'frameSettings', 'border', 'style'); // セレクトボックス
}