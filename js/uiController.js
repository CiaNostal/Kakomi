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
    frameInnerShadowOffsetXSlider: document.getElementById('frameInnerShadowOffsetX'), // 新規追加
    frameInnerShadowOffsetXValueSpan: document.getElementById('frameInnerShadowOffsetXValue'), // 新規追加
    frameInnerShadowOffsetYSlider: document.getElementById('frameInnerShadowOffsetY'), // 新規追加
    frameInnerShadowOffsetYValueSpan: document.getElementById('frameInnerShadowOffsetYValue'), // 新規追加

    frameInnerShadowBlurSlider: document.getElementById('frameInnerShadowBlur'),
    frameInnerShadowBlurValueSpan: document.getElementById('frameInnerShadowBlurValue'),
    // frameInnerShadowSpreadSlider: document.getElementById('frameInnerShadowSpread'), // コメントアウトまたは削除
    // frameInnerShadowSpreadValueSpan: document.getElementById('frameInnerShadowSpreadValue'), // コメントアウトまたは削除
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
            // チェックボックスとラジオボタンのcheckedプロパティも設定
            if (element.type === 'checkbox') {
                element.checked = Boolean(stateValue);
            } else if (element.type === 'radio' && config && config.defaultValue !== undefined) {
                // ラジオボタンの初期選択はname属性でグループ化されたうちの一つがtrueになる
                // ここではvalueがstateValueと一致するかで判定 (nameとvalueがHTMLに正しく設定されている前提)
                // initializeUIFromStateでラジオボタンのcheckedを設定するのは煩雑なので、
                // 実際には state.frameSettings.cornerStyle === 'rounded' のような形で個別に設定する方が確実
            }
        } else if (element) {
            element.value = String(stateValue);
            if (element.type === 'checkbox') {
                element.checked = Boolean(stateValue);
            }
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

    setupInputAttributesAndValue(uiElements.frameInnerShadowOffsetXSlider, 'frameInnerShadowOffsetX', fs.innerShadow.offsetX); // 新規追加
    setupInputAttributesAndValue(uiElements.frameInnerShadowOffsetYSlider, 'frameInnerShadowOffsetY', fs.innerShadow.offsetY); // 新規追加
    setupInputAttributesAndValue(uiElements.frameInnerShadowBlurSlider, 'frameInnerShadowBlur', fs.innerShadow.blur);
    // setupInputAttributesAndValue(uiElements.frameInnerShadowSpreadSlider, 'frameInnerShadowSpread', fs.innerShadow.spread); // コメントアウトまたは削除
    if (uiElements.frameInnerShadowColorInput) uiElements.frameInnerShadowColorInput.value = fs.innerShadow.color;

    if (uiElements.frameBorderEnabledCheckbox) uiElements.frameBorderEnabledCheckbox.checked = fs.border.enabled;
    setupInputAttributesAndValue(uiElements.frameBorderWidthSlider, 'frameBorderWidth', fs.border.width);
    if (uiElements.frameBorderColorInput) uiElements.frameBorderColorInput.value = fs.border.color;
    if (uiElements.frameBorderStyleSelect) uiElements.frameBorderStyleSelect.value = fs.border.style;

    toggleBackgroundSettingsVisibility();
    updateFrameSettingsVisibility(); // 初期表示のために呼び出し
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
    if (uiElements.frameInnerShadowOffsetXValueSpan) uiElements.frameInnerShadowOffsetXValueSpan.textContent = `${fs.innerShadow.offsetX}%`; // 新規追加
    if (uiElements.frameInnerShadowOffsetYValueSpan) uiElements.frameInnerShadowOffsetYValueSpan.textContent = `${fs.innerShadow.offsetY}%`; // 新規追加
    if (uiElements.frameInnerShadowBlurValueSpan) uiElements.frameInnerShadowBlurValueSpan.textContent = `${fs.innerShadow.blur}%`;
    // if (uiElements.frameInnerShadowSpreadValueSpan) uiElements.frameInnerShadowSpreadValueSpan.textContent = `${fs.innerShadow.spread}%`; // コメントアウトまたは削除
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

// この関数は uiController.js 内部でのみ使用するため、export しない
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
    // 引数: element, stateKey, (isRadio ? radioValue : nestedKey), (isRadio ? nestedKey : subNestedKey), (isRadio ? subNestedKey : undefined)
    const addOptionChangeListener = (element, stateKey, p1, p2 = '', p3 = '') => {
        if (!element) return;
        const eventType = (element.type === 'checkbox' || element.type === 'radio') ? 'change' : 'change';

        element.addEventListener(eventType, (e) => {
            let valueToSet;
            let updatePayload;

            let actualNestedKey = '';
            let actualSubNestedKey = '';

            if (element.type === 'checkbox') {
                valueToSet = e.target.checked;
                actualNestedKey = p1;    // p1 is nestedKey e.g. 'shadowEnabled', 'borderEnabled'
                actualSubNestedKey = p2; // p2 is subNestedKey e.g. 'enabled' for 'border'
                // If p2 is not empty, it means we target state.stateKey.p1.p2
                // If p2 is empty, we target state.stateKey.p1
                if (actualSubNestedKey) { //  e.g. frameSettings.border.enabled
                    updatePayload = { [stateKey]: { [actualNestedKey]: { [actualSubNestedKey]: valueToSet } } };
                } else { // e.g. frameSettings.shadowEnabled
                    updatePayload = { [stateKey]: { [actualNestedKey]: valueToSet } };
                }

            } else if (element.type === 'radio') {
                if (!e.target.checked) return;
                valueToSet = p1;      // p1 is radioValue e.g. 'rounded', 'drop'
                actualNestedKey = p2; // p2 is nestedKey e.g. 'cornerStyle', 'shadowType'
                actualSubNestedKey = p3; // p3 is subNestedKey (if any, typically for radio this is empty)

                if (actualSubNestedKey && actualNestedKey) {
                    updatePayload = { [stateKey]: { [actualNestedKey]: { [actualSubNestedKey]: valueToSet } } };
                } else if (actualNestedKey) {
                    updatePayload = { [stateKey]: { [actualNestedKey]: valueToSet } };
                } else {
                    updatePayload = { [stateKey]: valueToSet }; // Should not happen for radio tied to nested state
                }

            } else { // select
                valueToSet = e.target.value;
                actualNestedKey = p1;      // p1 is nestedKey e.g. 'border'
                actualSubNestedKey = p2;   // p2 is subNestedKey e.g. 'style'

                if (actualSubNestedKey && actualNestedKey) {
                    updatePayload = { [stateKey]: { [actualNestedKey]: { [actualSubNestedKey]: valueToSet } } };
                } else if (actualNestedKey) {
                    updatePayload = { [stateKey]: { [actualNestedKey]: valueToSet } };
                } else {
                    // This case for select is unlikely if it's for nested state, but included for completeness
                    updatePayload = { [stateKey]: valueToSet };
                }
            }

            updateState(updatePayload);

            // UI表示切替判定 - actualNestedKey を使用
            if (stateKey === 'backgroundType') { // This uses top-level stateKey directly
                toggleBackgroundSettingsVisibility();
            } else if (stateKey === 'frameSettings' &&
                (actualNestedKey === 'cornerStyle' || actualNestedKey === 'shadowEnabled' ||
                    actualNestedKey === 'shadowType' || actualNestedKey === 'borderEnabled' ||
                    (actualNestedKey === 'border' && actualSubNestedKey === 'enabled') // Explicitly for border.enabled
                )) {
                updateFrameSettingsVisibility();
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
    addOptionChangeListener(uiElements.outputAspectRatioSelect, 'outputTargetAspectRatioString'); // select (value is top-level state)
    addNumericInputListener(uiElements.baseMarginPercentInput, 'baseMarginPercent', 'baseMarginPercent');
    addNumericInputListener(uiElements.photoPosXSlider, 'photoPosX', 'photoViewParams', 'offsetX');
    addNumericInputListener(uiElements.photoPosYSlider, 'photoPosY', 'photoViewParams', 'offsetY');

    // --- 背景編集タブ ---
    addOptionChangeListener(uiElements.bgTypeColorRadio, 'backgroundType', 'color'); // radio, value for top-level state
    addOptionChangeListener(uiElements.bgTypeImageBlurRadio, 'backgroundType', 'imageBlur'); // radio, value for top-level state
    addColorInputListener(uiElements.backgroundColorInput, 'backgroundColor');
    addNumericInputListener(uiElements.bgScaleSlider, 'bgScale', 'imageBlurBackgroundParams', 'scale');
    addNumericInputListener(uiElements.bgBlurSlider, 'bgBlur', 'imageBlurBackgroundParams', 'blurAmountPercent');
    addNumericInputListener(uiElements.bgBrightnessSlider, 'bgBrightness', 'imageBlurBackgroundParams', 'brightness');
    addNumericInputListener(uiElements.bgSaturationSlider, 'bgSaturation', 'imageBlurBackgroundParams', 'saturation');

    // --- 出力タブ ---
    addNumericInputListener(uiElements.jpgQualitySlider, 'jpgQuality', 'outputSettings', 'quality');

    // --- フレーム加工タブ ---
    // 角のスタイル (ラジオボタン)
    addOptionChangeListener(uiElements.frameCornerStyleNoneRadio, 'frameSettings', 'none', 'cornerStyle'); // radio, val1=radioValue, val2=nestedKey
    addOptionChangeListener(uiElements.frameCornerStyleRoundedRadio, 'frameSettings', 'rounded', 'cornerStyle');
    addOptionChangeListener(uiElements.frameCornerStyleSuperellipseRadio, 'frameSettings', 'superellipse', 'cornerStyle');
    // 角丸設定 (スライダー)
    addNumericInputListener(uiElements.frameCornerRadiusPercentSlider, 'frameCornerRadiusPercent', 'frameSettings', 'cornerRadiusPercent');
    // 超楕円設定 (スライダー)
    addNumericInputListener(uiElements.frameSuperellipseNSlider, 'frameSuperellipseN', 'frameSettings', 'superellipseN');

    // 影
    addOptionChangeListener(uiElements.frameShadowEnabledCheckbox, 'frameSettings', 'shadowEnabled'); // checkbox, val1=nestedKey
    addOptionChangeListener(uiElements.frameShadowTypeDropRadio, 'frameSettings', 'drop', 'shadowType'); // radio, val1=radioValue, val2=nestedKey
    addOptionChangeListener(uiElements.frameShadowTypeInnerRadio, 'frameSettings', 'inner', 'shadowType'); // radio, val1=radioValue, val2=nestedKey
    // ドロップシャドウ詳細設定
    addNumericInputListener(uiElements.frameDropShadowOffsetXSlider, 'frameDropShadowOffsetX', 'frameSettings', 'dropShadow', 'offsetX');
    addNumericInputListener(uiElements.frameDropShadowOffsetYSlider, 'frameDropShadowOffsetY', 'frameSettings', 'dropShadow', 'offsetY');
    addNumericInputListener(uiElements.frameDropShadowBlurSlider, 'frameDropShadowBlur', 'frameSettings', 'dropShadow', 'blur');
    addNumericInputListener(uiElements.frameDropShadowSpreadSlider, 'frameDropShadowSpread', 'frameSettings', 'dropShadow', 'spread');
    addColorInputListener(uiElements.frameDropShadowColorInput, 'frameSettings', 'dropShadow', 'color');
    // インナーシャドウ詳細設定
    addNumericInputListener(uiElements.frameInnerShadowOffsetXSlider, 'frameInnerShadowOffsetX', 'frameSettings', 'innerShadow', 'offsetX'); // 新規追加
    addNumericInputListener(uiElements.frameInnerShadowOffsetYSlider, 'frameInnerShadowOffsetY', 'frameSettings', 'innerShadow', 'offsetY'); // 新規追加
    addNumericInputListener(uiElements.frameInnerShadowBlurSlider, 'frameInnerShadowBlur', 'frameSettings', 'innerShadow', 'blur');
    // addNumericInputListener(uiElements.frameInnerShadowSpreadSlider, 'frameInnerShadowSpread', 'frameSettings', 'innerShadow', 'spread'); // コメントアウトまたは削除
    addColorInputListener(uiElements.frameInnerShadowColorInput, 'frameSettings', 'innerShadow', 'color');

    // 縁取り
    // For checkbox 'frameBorderEnabledCheckbox' to update frameSettings.border.enabled:
    // stateKey='frameSettings', val1 (becomes pNestedKey)='border', val2 (becomes pSubNestedKey)='enabled'
    addOptionChangeListener(uiElements.frameBorderEnabledCheckbox, 'frameSettings', 'border', 'enabled');
    addNumericInputListener(uiElements.frameBorderWidthSlider, 'frameBorderWidth', 'frameSettings', 'border', 'width');
    addColorInputListener(uiElements.frameBorderColorInput, 'frameSettings', 'border', 'color');
    // For select 'frameBorderStyleSelect' to update frameSettings.border.style:
    // stateKey='frameSettings', val1 (becomes pNestedKey)='border', val2 (becomes pSubNestedKey)='style'
    addOptionChangeListener(uiElements.frameBorderStyleSelect, 'frameSettings', 'border', 'style');
}