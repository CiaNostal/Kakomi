// js/uiController.js
import { editState, updateEditState } from './state.js';
import { controlsConfig } from './config.js';
// requestRedraw は main.js からコールバックとして渡される

export const uiElements = {
    imageLoader: document.getElementById('imageLoader'),
    previewCanvas: document.getElementById('previewCanvas'),
    previewCtx: null,
    downloadButton: document.getElementById('downloadButton'),
    canvasContainer: document.querySelector('.canvas-container'),
    outputAspectRatioSelect: document.getElementById('outputAspectRatio'),
    baseMarginPercentInput: document.getElementById('baseMarginPercent'),
    photoPosXSlider: document.getElementById('photoPosX'),
    photoPosYSlider: document.getElementById('photoPosY'),
    photoPosXValueSpan: document.getElementById('photoPosXValue'),
    photoPosYValueSpan: document.getElementById('photoPosYValue'),
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
    jpgQualitySlider: document.getElementById('jpgQuality'),
    jpgQualityValueSpan: document.getElementById('jpgQualityValue'),
};

export function initializeUIFromState() {
    const state = editState;

    // --- スライダーと数値入力の属性設定と値設定 ---
    const setupInput = (element, configKey, stateValue) => {
        if (element && controlsConfig[configKey]) {
            const config = controlsConfig[configKey];
            if (element.type === 'range' || element.type === 'number') {
                if (config.min !== undefined) element.min = config.min;
                if (config.max !== undefined) element.max = config.max;
                if (config.step !== undefined) element.step = config.step;
            }
            element.value = stateValue;
        }
    };

    setupInput(uiElements.baseMarginPercentInput, 'baseMarginPercent', state.baseMarginPercent);
    setupInput(uiElements.photoPosXSlider, 'photoPosX', state.photoViewParams.offsetX);
    setupInput(uiElements.photoPosYSlider, 'photoPosY', state.photoViewParams.offsetY);
    setupInput(uiElements.bgScaleSlider, 'bgScale', state.imageBlurBackgroundParams.scale);
    setupInput(uiElements.bgBlurSlider, 'bgBlur', state.imageBlurBackgroundParams.blurAmountPercent);
    setupInput(uiElements.bgBrightnessSlider, 'bgBrightness', state.imageBlurBackgroundParams.brightness);
    setupInput(uiElements.bgSaturationSlider, 'bgSaturation', state.imageBlurBackgroundParams.saturation);
    setupInput(uiElements.jpgQualitySlider, 'jpgQuality', Math.round(state.outputJpgQuality * 100));

    // --- その他のUI要素の値設定 ---
    if (uiElements.outputAspectRatioSelect) uiElements.outputAspectRatioSelect.value = state.outputTargetAspectRatioString;
    if (uiElements.backgroundColorInput) uiElements.backgroundColorInput.value = state.backgroundColor;
    if (uiElements.bgTypeColorRadio) uiElements.bgTypeColorRadio.checked = (state.backgroundType === 'color');
    if (uiElements.bgTypeImageBlurRadio) uiElements.bgTypeImageBlurRadio.checked = (state.backgroundType === 'imageBlur');

    toggleBackgroundSettingsVisibility();
    updateSliderValueDisplays();
}

export function updateSliderValueDisplays() {
    const state = editState;
    if (uiElements.photoPosXValueSpan && uiElements.photoPosXSlider) {
        const val = parseFloat(uiElements.photoPosXSlider.value); // スライダーの現在の値から表示を生成
        const displayVal = Math.round((val - 0.5) * 2 * 100);
        uiElements.photoPosXValueSpan.textContent = displayVal === 0 ? '中央' : `${displayVal}%`;
    }
    if (uiElements.photoPosYValueSpan && uiElements.photoPosYSlider) {
        const val = parseFloat(uiElements.photoPosYSlider.value);
        const displayVal = Math.round((val - 0.5) * 2 * 100);
        uiElements.photoPosYValueSpan.textContent = displayVal === 0 ? '中央' : `${displayVal}%`;
    }
    if (uiElements.bgScaleValueSpan && uiElements.bgScaleSlider) {
        uiElements.bgScaleValueSpan.textContent = `${parseFloat(uiElements.bgScaleSlider.value).toFixed(1)}x`;
    }
    if (uiElements.bgBlurValueSpan && uiElements.bgBlurSlider) {
        uiElements.bgBlurValueSpan.textContent = `${parseFloat(uiElements.bgBlurSlider.value).toFixed(1)}%`;
    }
    if (uiElements.bgBrightnessValueSpan && uiElements.bgBrightnessSlider) {
        uiElements.bgBrightnessValueSpan.textContent = `${uiElements.bgBrightnessSlider.value}%`;
    }
    if (uiElements.bgSaturationValueSpan && uiElements.bgSaturationSlider) {
        uiElements.bgSaturationValueSpan.textContent = `${uiElements.bgSaturationSlider.value}%`;
    }
    if (uiElements.jpgQualityValueSpan && uiElements.jpgQualitySlider) {
        uiElements.jpgQualityValueSpan.textContent = `${uiElements.jpgQualitySlider.value}`;
    }
}

export function toggleBackgroundSettingsVisibility() {
    if (!uiElements.bgColorSettingsContainer || !uiElements.imageBlurSettingsContainer) return;
    if (editState.backgroundType === 'color') {
        uiElements.bgColorSettingsContainer.classList.remove('hidden');
        uiElements.imageBlurSettingsContainer.classList.add('hidden');
    } else if (editState.backgroundType === 'imageBlur') {
        uiElements.bgColorSettingsContainer.classList.add('hidden');
        uiElements.imageBlurSettingsContainer.classList.remove('hidden');
    }
}

export function setupEventListeners(redrawCallback) {
    const addInputListener = (element, configKey, stateKey, isNested = false, nestedKey = '') => {
        if (element) {
            element.addEventListener('input', (e) => {
                let value = (element.type === 'range' || element.type === 'number') ? parseFloat(e.target.value) : e.target.value;
                const config = controlsConfig[configKey];

                if (config && (element.type === 'range' || element.type === 'number')) {
                    if (isNaN(value)) value = config.defaultValue;
                    value = Math.max(config.min, Math.min(config.max, value));
                    e.target.value = value; // バリデーション後の値をUIに反映
                }

                if (isNested && nestedKey) {
                    updateEditState({ [stateKey]: { ...editState[stateKey], [nestedKey]: value } });
                } else {
                    updateEditState({ [stateKey]: value });
                }
                updateSliderValueDisplays();
                redrawCallback();
            });
        }
    };

    const addChangeListener = (element, stateKey, isRadio = false, radioValue = '', needsRedraw = true) => {
        if (element) {
            element.addEventListener('change', (e) => {
                if (isRadio) {
                    if (e.target.checked) {
                        updateEditState({ [stateKey]: radioValue });
                        if (stateKey === 'backgroundType') toggleBackgroundSettingsVisibility();
                    }
                } else {
                    updateEditState({ [stateKey]: e.target.value });
                }
                if (needsRedraw) redrawCallback();
            });
        }
    };

    // レイアウト設定
    addChangeListener(uiElements.outputAspectRatioSelect, 'outputTargetAspectRatioString');
    addInputListener(uiElements.baseMarginPercentInput, 'baseMarginPercent', 'baseMarginPercent');
    addInputListener(uiElements.photoPosXSlider, 'photoPosX', 'photoViewParams', true, 'offsetX');
    addInputListener(uiElements.photoPosYSlider, 'photoPosY', 'photoViewParams', true, 'offsetY');

    // 背景設定
    addChangeListener(uiElements.bgTypeColorRadio, 'backgroundType', true, 'color');
    addChangeListener(uiElements.bgTypeImageBlurRadio, 'backgroundType', true, 'imageBlur');
    if (uiElements.backgroundColorInput) { // inputイベントの方がリアルタイム性が高い
        uiElements.backgroundColorInput.addEventListener('input', (e) => {
            updateEditState({ backgroundColor: e.target.value });
            if (editState.backgroundType === 'color') redrawCallback();
        });
    }
    addInputListener(uiElements.bgScaleSlider, 'bgScale', 'imageBlurBackgroundParams', true, 'scale');
    addInputListener(uiElements.bgBlurSlider, 'bgBlur', 'imageBlurBackgroundParams', true, 'blurAmountPercent');
    addInputListener(uiElements.bgBrightnessSlider, 'bgBrightness', 'imageBlurBackgroundParams', true, 'brightness');
    addInputListener(uiElements.bgSaturationSlider, 'bgSaturation', 'imageBlurBackgroundParams', true, 'saturation');

    // 出力設定
    if (uiElements.jpgQualitySlider) {
        uiElements.jpgQualitySlider.addEventListener('input', (e) => {
            const qualityValueUI = parseInt(e.target.value, 10);
            updateEditState({ outputJpgQuality: qualityValueUI / 100 });
            updateSliderValueDisplays(); // span表示も更新 (redrawCallback は不要)
        });
    }
}