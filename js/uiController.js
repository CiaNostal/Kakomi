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
    exifDataContainer: document.getElementById('exifDataContainer'), // ADDED

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
    // CORRECTED: state.outputSettings.quality is already 1-100
    setupInputAttributesAndValue(uiElements.jpgQualitySlider, 'jpgQuality', state.outputSettings.quality);


    toggleBackgroundSettingsVisibility();
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
        // CORRECTED: state.outputSettings.quality is already 1-100
        uiElements.jpgQualityValueSpan.textContent = `${state.outputSettings.quality}`;
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

export function setupEventListeners(redrawCallback) {
    const addNumericInputListener = (element, configKey, stateKey, isNested = false, nestedKey = '') => {
        if (element) {
            element.addEventListener('input', (e) => {
                let value = parseFloat(e.target.value);
                const config = controlsConfig[configKey];

                if (config) {
                    if (isNaN(value)) {
                        value = config.defaultValue;
                    }
                    if (config.min !== undefined) value = Math.max(config.min, value);
                    if (config.max !== undefined) value = Math.min(config.max, value);
                }
                e.target.value = String(value);

                if (isNested && nestedKey) {
                    // → deepMergeを信頼し、ペイロードを簡略化
                    // updateState({ [stateKey]: { ...getState()[stateKey], [nestedKey]: value } }); // 旧
                    updateState({ [stateKey]: { [nestedKey]: value } }); // NEW: Relies on deepMerge in stateManager
                } else {
                    updateState({ [stateKey]: value });
                }
                updateSliderValueDisplays();
                redrawCallback();
            });
        }
    };

    const addOptionChangeListener = (element, stateKey, isRadio = false, radioValue = '', needsRedraw = true) => {
        if (element) {
            element.addEventListener('change', (e) => {
                if (isRadio) {
                    if (e.target.checked) {
                        updateState({ [stateKey]: radioValue });
                        if (stateKey === 'backgroundType') {
                            toggleBackgroundSettingsVisibility();
                        }
                    } else {
                        return;
                    }
                } else {
                    updateState({ [stateKey]: e.target.value });
                }
                if (needsRedraw) redrawCallback();
            });
        }
    };

    addOptionChangeListener(uiElements.outputAspectRatioSelect, 'outputTargetAspectRatioString');
    addNumericInputListener(uiElements.baseMarginPercentInput, 'baseMarginPercent', 'baseMarginPercent');
    addNumericInputListener(uiElements.photoPosXSlider, 'photoPosX', 'photoViewParams', true, 'offsetX');
    addNumericInputListener(uiElements.photoPosYSlider, 'photoPosY', 'photoViewParams', true, 'offsetY');

    addOptionChangeListener(uiElements.bgTypeColorRadio, 'backgroundType', true, 'color');
    addOptionChangeListener(uiElements.bgTypeImageBlurRadio, 'backgroundType', true, 'imageBlur');
    if (uiElements.backgroundColorInput) {
        uiElements.backgroundColorInput.addEventListener('input', (e) => {
            updateState({ backgroundColor: e.target.value });
            if (getState().backgroundType === 'color') {
                redrawCallback();
            }
        });
    }
    addNumericInputListener(uiElements.bgScaleSlider, 'bgScale', 'imageBlurBackgroundParams', true, 'scale');
    addNumericInputListener(uiElements.bgBlurSlider, 'bgBlur', 'imageBlurBackgroundParams', true, 'blurAmountPercent');
    addNumericInputListener(uiElements.bgBrightnessSlider, 'bgBrightness', 'imageBlurBackgroundParams', true, 'brightness');
    addNumericInputListener(uiElements.bgSaturationSlider, 'bgSaturation', 'imageBlurBackgroundParams', true, 'saturation');

    if (uiElements.jpgQualitySlider) {
        uiElements.jpgQualitySlider.addEventListener('input', (e) => {
            const qualityValueUI = parseInt(e.target.value, 10);
            const config = controlsConfig.jpgQuality;
            let validatedQualityUI = qualityValueUI;
            if (config) { // Ensure config exists before accessing its properties
                if (isNaN(validatedQualityUI)) validatedQualityUI = config.defaultValue;
                validatedQualityUI = Math.max(config.min, Math.min(config.max, validatedQualityUI));
            } else { // Fallback if config is somehow missing, though it shouldn't be
                validatedQualityUI = Math.max(1, Math.min(100, validatedQualityUI));
                if (isNaN(validatedQualityUI)) validatedQualityUI = 100;
            }
            e.target.value = String(validatedQualityUI);

            // CORRECTED: state.outputSettings.quality is 1-100
            // NEW: Relies on deepMerge in stateManager for nested update
            updateState({ outputSettings: { quality: validatedQualityUI } });
            updateSliderValueDisplays();
        });
    }
}