// js/uiController.js
// DOM要素の取得、UI表示の更新、UIイベントリスナーの設定などを行います。
import { editState, updateEditState, resetEditStateToDefault } from './state.js';
import { requestRedraw } from './main.js'; // main.jsからrequestRedrawをインポート (循環参照に注意、後述)

// DOM要素の参照 (一元管理)
export const uiElements = {
    imageLoader: document.getElementById('imageLoader'),
    previewCanvas: document.getElementById('previewCanvas'),
    previewCtx: null, // main.jsで初期化
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
    jpgQualitySlider: document.getElementById('jpgQuality'), // 出力タブ
    jpgQualityValueSpan: document.getElementById('jpgQualityValue'), // 出力タブ
};

// UI初期化関数
export function initializeUIFromState() {
    const state = editState; // 直接参照 (getEditState()でも良い)
    if (uiElements.outputAspectRatioSelect) uiElements.outputAspectRatioSelect.value = state.outputTargetAspectRatioString;
    if (uiElements.baseMarginPercentInput) uiElements.baseMarginPercentInput.value = state.baseMarginPercent;
    if (uiElements.photoPosXSlider) uiElements.photoPosXSlider.value = state.photoViewParams.offsetX;
    if (uiElements.photoPosYSlider) uiElements.photoPosYSlider.value = state.photoViewParams.offsetY;
    if (uiElements.backgroundColorInput) uiElements.backgroundColorInput.value = state.backgroundColor;
    if (uiElements.bgTypeColorRadio) uiElements.bgTypeColorRadio.checked = (state.backgroundType === 'color');
    if (uiElements.bgTypeImageBlurRadio) uiElements.bgTypeImageBlurRadio.checked = (state.backgroundType === 'imageBlur');
    if (uiElements.bgScaleSlider) uiElements.bgScaleSlider.value = state.imageBlurBackgroundParams.scale;
    if (uiElements.bgBlurSlider) uiElements.bgBlurSlider.value = state.imageBlurBackgroundParams.blurAmountPercent;
    if (uiElements.bgBrightnessSlider) uiElements.bgBrightnessSlider.value = state.imageBlurBackgroundParams.brightness;
    if (uiElements.bgSaturationSlider) uiElements.bgSaturationSlider.value = state.imageBlurBackgroundParams.saturation;
    if (uiElements.jpgQualitySlider) uiElements.jpgQualitySlider.value = Math.round(state.outputJpgQuality * 100);

    toggleBackgroundSettingsVisibility();
    updateSliderValueDisplays();
}

// スライダーの値表示更新関数
export function updateSliderValueDisplays() {
    const state = editState;
    if (uiElements.photoPosXValueSpan) {
        const posXDisplay = Math.round((parseFloat(state.photoViewParams.offsetX) - 0.5) * 2 * 100);
        uiElements.photoPosXValueSpan.textContent = posXDisplay === 0 ? '中央' : `${posXDisplay}%`;
    }
    if (uiElements.photoPosYValueSpan) {
        const posYDisplay = Math.round((parseFloat(state.photoViewParams.offsetY) - 0.5) * 2 * 100);
        uiElements.photoPosYValueSpan.textContent = posYDisplay === 0 ? '中央' : `${posYDisplay}%`;
    }
    if (uiElements.bgScaleValueSpan) uiElements.bgScaleValueSpan.textContent = `${parseFloat(state.imageBlurBackgroundParams.scale).toFixed(1)}x`;
    if (uiElements.bgBlurValueSpan) uiElements.bgBlurValueSpan.textContent = `${parseFloat(state.imageBlurBackgroundParams.blurAmountPercent).toFixed(1)}%`;
    if (uiElements.bgBrightnessValueSpan) uiElements.bgBrightnessValueSpan.textContent = `${state.imageBlurBackgroundParams.brightness}%`;
    if (uiElements.bgSaturationValueSpan) uiElements.bgSaturationValueSpan.textContent = `${state.imageBlurBackgroundParams.saturation}%`;
    if (uiElements.jpgQualityValueSpan && uiElements.jpgQualitySlider) {
        uiElements.jpgQualityValueSpan.textContent = `${Math.round(state.outputJpgQuality * 100)}`;
    }
}

// 背景設定の表示/非表示を切り替える関数
export function toggleBackgroundSettingsVisibility() {
    if (editState.backgroundType === 'color') {
        if (uiElements.bgColorSettingsContainer) uiElements.bgColorSettingsContainer.classList.remove('hidden');
        if (uiElements.imageBlurSettingsContainer) uiElements.imageBlurSettingsContainer.classList.add('hidden');
    } else if (editState.backgroundType === 'imageBlur') {
        if (uiElements.bgColorSettingsContainer) uiElements.bgColorSettingsContainer.classList.add('hidden');
        if (uiElements.imageBlurSettingsContainer) uiElements.imageBlurSettingsContainer.classList.remove('hidden');
    }
}

// UIイベントリスナーの設定
export function setupEventListeners() {
    // レイアウト設定タブ
    if (uiElements.outputAspectRatioSelect) uiElements.outputAspectRatioSelect.addEventListener('change', (e) => {
        updateEditState({ outputTargetAspectRatioString: e.target.value });
        requestRedraw();
    });
    if (uiElements.baseMarginPercentInput) uiElements.baseMarginPercentInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 0) val = 0; if (val > 100) val = 100;
        e.target.value = val; // UIに反映
        updateEditState({ baseMarginPercent: val });
        requestRedraw();
    });
    if (uiElements.photoPosXSlider) uiElements.photoPosXSlider.addEventListener('input', (e) => {
        const newOffsetX = parseFloat(e.target.value);
        updateEditState({ photoViewParams: { ...editState.photoViewParams, offsetX: newOffsetX } });
        updateSliderValueDisplays();
        requestRedraw();
    });
    if (uiElements.photoPosYSlider) uiElements.photoPosYSlider.addEventListener('input', (e) => {
        const newOffsetY = parseFloat(e.target.value);
        updateEditState({ photoViewParams: { ...editState.photoViewParams, offsetY: newOffsetY } });
        updateSliderValueDisplays();
        requestRedraw();
    });

    // 背景編集タブ
    if (uiElements.bgTypeColorRadio) uiElements.bgTypeColorRadio.addEventListener('change', () => {
        if (uiElements.bgTypeColorRadio.checked) {
            updateEditState({ backgroundType: 'color' });
            toggleBackgroundSettingsVisibility();
            requestRedraw();
        }
    });
    if (uiElements.bgTypeImageBlurRadio) uiElements.bgTypeImageBlurRadio.addEventListener('change', () => {
        if (uiElements.bgTypeImageBlurRadio.checked) {
            updateEditState({ backgroundType: 'imageBlur' });
            toggleBackgroundSettingsVisibility();
            requestRedraw();
        }
    });
    if (uiElements.backgroundColorInput) uiElements.backgroundColorInput.addEventListener('input', (e) => {
        updateEditState({ backgroundColor: e.target.value });
        if (editState.backgroundType === 'color') requestRedraw();
    });
    if (uiElements.bgScaleSlider) uiElements.bgScaleSlider.addEventListener('input', (e) => {
        const newScale = parseFloat(e.target.value);
        updateEditState({ imageBlurBackgroundParams: { ...editState.imageBlurBackgroundParams, scale: newScale } });
        updateSliderValueDisplays();
        if (editState.backgroundType === 'imageBlur') requestRedraw();
    });
    // bgBlur, bgBrightness, bgSaturation も同様にリスナーを設定...
    if (uiElements.bgBlurSlider) uiElements.bgBlurSlider.addEventListener('input', (e) => {
        const newBlur = parseFloat(e.target.value);
        updateEditState({ imageBlurBackgroundParams: { ...editState.imageBlurBackgroundParams, blurAmountPercent: newBlur } });
        updateSliderValueDisplays();
        if (editState.backgroundType === 'imageBlur') requestRedraw();
    });
    if (uiElements.bgBrightnessSlider) uiElements.bgBrightnessSlider.addEventListener('input', (e) => {
        const newBrightness = parseInt(e.target.value, 10);
        updateEditState({ imageBlurBackgroundParams: { ...editState.imageBlurBackgroundParams, brightness: newBrightness } });
        updateSliderValueDisplays();
        if (editState.backgroundType === 'imageBlur') requestRedraw();
    });
    if (uiElements.bgSaturationSlider) uiElements.bgSaturationSlider.addEventListener('input', (e) => {
        const newSaturation = parseInt(e.target.value, 10);
        updateEditState({ imageBlurBackgroundParams: { ...editState.imageBlurBackgroundParams, saturation: newSaturation } });
        updateSliderValueDisplays();
        if (editState.backgroundType === 'imageBlur') requestRedraw();
    });

    // 出力タブ
    if (uiElements.jpgQualitySlider) {
        uiElements.jpgQualitySlider.addEventListener('input', (e) => {
            const qualityValueUI = parseInt(e.target.value, 10);
            updateEditState({ outputJpgQuality: qualityValueUI / 100 });
            updateSliderValueDisplays(); // span表示も更新
        });
    }
}