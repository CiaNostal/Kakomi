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
    frameShadowSettingsContainer: document.getElementById('frameShadowSettingsContainer'), // 影タイプ選択を含むコンテナ
    frameShadowTypeDropRadio: document.getElementById('frameShadowTypeDrop'),
    frameShadowTypeInnerRadio: document.getElementById('frameShadowTypeInner'),
    frameDropShadowSettingsContainer: document.getElementById('frameDropShadowSettingsContainer'), // 外側の影設定コンテナ
    frameDropShadowOffsetXSlider: document.getElementById('frameDropShadowOffsetX'),
    frameDropShadowOffsetXValueSpan: document.getElementById('frameDropShadowOffsetXValue'),
    frameDropShadowOffsetYSlider: document.getElementById('frameDropShadowOffsetY'),
    frameDropShadowOffsetYValueSpan: document.getElementById('frameDropShadowOffsetYValue'),
    frameDropShadowBlurSlider: document.getElementById('frameDropShadowBlur'),
    frameDropShadowBlurValueSpan: document.getElementById('frameDropShadowBlurValue'),
    frameDropShadowSpreadSlider: document.getElementById('frameDropShadowSpread'),
    frameDropShadowSpreadValueSpan: document.getElementById('frameDropShadowSpreadValue'),
    frameDropShadowColorInput: document.getElementById('frameDropShadowColor'),
    frameInnerShadowSettingsContainer: document.getElementById('frameInnerShadowSettingsContainer'), // 内側の影設定コンテナ (UIは後で詳細実装)
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
    // フレーム設定のUI表示/非表示を初期状態で更新
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
        // CORRECTED: state.outputSettings.quality is already 1-100
        uiElements.jpgQualityValueSpan.textContent = `${state.outputSettings.quality}`;
    }
    // フレーム加工スライダーの値表示
    if (uiElements.frameCornerRadiusPercentValueSpan && uiElements.frameCornerRadiusPercentSlider) {
        uiElements.frameCornerRadiusPercentValueSpan.textContent = `${state.frameSettings.cornerRadiusPercent}%`;
    }
    if (uiElements.frameSuperellipseNValueSpan && uiElements.frameSuperellipseNSlider) {
        uiElements.frameSuperellipseNValueSpan.textContent = state.frameSettings.superellipseN;
    }
    if (uiElements.frameDropShadowOffsetXValueSpan) uiElements.frameDropShadowOffsetXValueSpan.textContent = `${state.frameSettings.dropShadow.offsetX}%`;
    if (uiElements.frameDropShadowOffsetYValueSpan) uiElements.frameDropShadowOffsetYValueSpan.textContent = `${state.frameSettings.dropShadow.offsetY}%`;
    if (uiElements.frameDropShadowBlurValueSpan) uiElements.frameDropShadowBlurValueSpan.textContent = `${state.frameSettings.dropShadow.blur}%`;
    if (uiElements.frameDropShadowSpreadValueSpan) uiElements.frameDropShadowSpreadValueSpan.textContent = `${state.frameSettings.dropShadow.spread}%`;
    if (uiElements.frameInnerShadowBlurValueSpan) uiElements.frameInnerShadowBlurValueSpan.textContent = `${state.frameSettings.innerShadow.blur}%`;
    if (uiElements.frameInnerShadowSpreadValueSpan) uiElements.frameInnerShadowSpreadValueSpan.textContent = `${state.frameSettings.innerShadow.spread}%`;
    if (uiElements.frameBorderWidthValueSpan && uiElements.frameBorderWidthSlider) {
        uiElements.frameBorderWidthValueSpan.textContent = `${state.frameSettings.border.width}%`;
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
/*
 * フレーム設定タブ内の各設定コンテナの表示/非表示を状態に応じて更新します。
 */
function updateFrameSettingsVisibility() {
    const frameState = getState().frameSettings;

    // 角のスタイルに応じた表示制御
    if (uiElements.frameCornerRoundedSettingsContainer) {
        uiElements.frameCornerRoundedSettingsContainer.style.display = frameState.cornerStyle === 'rounded' ? '' : 'none';
    }
    if (uiElements.frameCornerSuperellipseSettingsContainer) {
        uiElements.frameCornerSuperellipseSettingsContainer.style.display = frameState.cornerStyle === 'superellipse' ? '' : 'none';
    }

    // 影の有効/無効に応じた表示制御
    if (uiElements.frameShadowSettingsContainer) {
        uiElements.frameShadowSettingsContainer.style.display = frameState.shadowEnabled ? '' : 'none';
    }
    if (frameState.shadowEnabled) { // 影が有効な場合のみ、影タイプごとの設定コンテナを制御
        if (uiElements.frameDropShadowSettingsContainer) {
            uiElements.frameDropShadowSettingsContainer.style.display = frameState.shadowType === 'drop' ? '' : 'none';
        }
        if (uiElements.frameInnerShadowSettingsContainer) {
            uiElements.frameInnerShadowSettingsContainer.style.display = frameState.shadowType === 'inner' ? '' : 'none';
        }
    }

    // 縁取りの有効/無効に応じた表示制御
    if (uiElements.frameBorderDetailSettingsContainer) {
        uiElements.frameBorderDetailSettingsContainer.style.display = frameState.border.enabled ? '' : 'none';
    }
}

/**
  * 各UI要素にイベントリスナーを設定します。
  * @param {function} redrawCallback プレビュー再描画を要求するコールバック関数。
  */
export function setupEventListeners(redrawCallback) {
    const addNumericInputListener = (element, configKey, stateKey, isNested = false, nestedKey = '', subNestedKey = '') => {
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
                    if (subNestedKey) { // 例: frameSettings.dropShadow.offsetX
                        updateState({ [stateKey]: { [nestedKey]: { [subNestedKey]: value } } });
                    } else { // 例: frameSettings.cornerRadiusPercent (isNested=falseだが、実際はframeSettingsの下)
                        // または photoViewParams.offsetX
                        updateState({ [stateKey]: { [nestedKey]: value } });
                    }
                } else {
                    // isNested=false は stateKey がトップレベルのキーであることを想定
                    // 例: baseMarginPercent -> updateState({ baseMarginPercent: value })
                    // frameSettings.cornerRadiusPercent のようなものは isNested=true, nestedKey='cornerRadiusPercent' とすべき
                    updateState({ [stateKey]: value });
                }
                updateSliderValueDisplays();
                redrawCallback();
            });
        }
    };

    const addOptionChangeListener = (element, stateKey, isRadio = false, radioValue = '', nestedKey = '', needsRedraw = true) => {
        if (element) {
            element.addEventListener('change', (e) => {
                let updatePayload;
                if (isRadio) {
                    if (e.target.checked) {
                        updatePayload = nestedKey ? { [stateKey]: { [nestedKey]: radioValue } } : { [stateKey]: radioValue };
                        updateState(updatePayload);
                        // UI表示切替が必要なケースのハンドリング
                        if (stateKey === 'backgroundType') {
                            toggleBackgroundSettingsVisibility();
                        } else if (stateKey === 'frameSettings' && (nestedKey === 'cornerStyle' || nestedKey === 'shadowEnabled' || nestedKey === 'shadowType' || nestedKey === 'borderEnabled')) {
                            updateFrameSettingsVisibility();
                        }
                    } else {
                        return;
                    }
                } else {
                    updateState({ [stateKey]: e.target.value });
                }
                // updateState が呼ばれたので、redrawCallback は常に呼ぶ（stateManagerが差分なければ通知しないことを期待）
                redrawCallback();
            });
        }
    };

    addOptionChangeListener(uiElements.outputAspectRatioSelect, 'outputTargetAspectRatioString');
    addNumericInputListener(uiElements.baseMarginPercentInput, 'baseMarginPercent', 'baseMarginPercent');
    addNumericInputListener(uiElements.photoPosXSlider, 'photoPosX', 'photoViewParams', true, 'offsetX');
    addNumericInputListener(uiElements.photoPosYSlider, 'photoPosY', 'photoViewParams', true, 'offsetY');

    addOptionChangeListener(uiElements.bgTypeColorRadio, 'backgroundType', true, 'color', '', true);
    addOptionChangeListener(uiElements.bgTypeImageBlurRadio, 'backgroundType', true, 'imageBlur', '', true);

    if (uiElements.backgroundColorInput) { // カラーピッカーはinputイベントでリアルタイムに
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
            updateState({ outputSettings: { quality: validatedQualityUI } });
            updateSliderValueDisplays();
        });
    }

    // --- フレーム加工タブのイベントリスナー ---
    // 角のスタイル
    addOptionChangeListener(uiElements.frameCornerStyleNoneRadio, 'frameSettings', true, 'none', 'cornerStyle');
    addOptionChangeListener(uiElements.frameCornerStyleRoundedRadio, 'frameSettings', true, 'rounded', 'cornerStyle');
    addOptionChangeListener(uiElements.frameCornerStyleSuperellipseRadio, 'frameSettings', true, 'superellipse', 'cornerStyle');
    // 角丸設定
    addNumericInputListener(uiElements.frameCornerRadiusPercentSlider, 'frameCornerRadiusPercent', 'frameSettings', true, 'cornerRadiusPercent');
    // 超楕円設定
    addNumericInputListener(uiElements.frameSuperellipseNSlider, 'frameSuperellipseN', 'frameSettings', true, 'superellipseN');

    // 影
    addOptionChangeListener(uiElements.frameShadowEnabledCheckbox, 'frameSettings', false, '', 'shadowEnabled'); // チェックボックスなので isRadio=false
    // frameShadowEnabledCheckbox の 'change' イベントで updateFrameSettingsVisibility を呼ぶ必要があるが、
    // addOptionChangeListener が redrawCallback を呼ぶので、その中で state が更新され、再度 initializeUI or updateFrameSettingsVisibility が適切に呼ばれることを期待。
    // もし表示切替がうまくいかない場合は、専用のリスナーを追加する。
    // addOptionChangeListener は updateState の後に redrawCallback を呼ぶ。
    // redrawCallback (requestRedraw) は initializeUIFromState を呼ばないので、
    // updateFrameSettingsVisibility を明示的に呼ぶ必要がある。
    // → addOptionChangeListener のコールバック内で updateFrameSettingsVisibility を呼ぶように変更した。

    addOptionChangeListener(uiElements.frameShadowTypeDropRadio, 'frameSettings', true, 'drop', 'shadowType');
    addOptionChangeListener(uiElements.frameShadowTypeInnerRadio, 'frameSettings', true, 'inner', 'shadowType');
    addNumericInputListener(uiElements.frameDropShadowOffsetXSlider, 'frameDropShadowOffsetX', 'frameSettings', true, 'dropShadow', 'offsetX');
    addNumericInputListener(uiElements.frameDropShadowOffsetYSlider, 'frameDropShadowOffsetY', 'frameSettings', true, 'dropShadow', 'offsetY');
    addNumericInputListener(uiElements.frameDropShadowBlurSlider, 'frameDropShadowBlur', 'frameSettings', true, 'dropShadow', 'blur');
    addNumericInputListener(uiElements.frameDropShadowSpreadSlider, 'frameDropShadowSpread', 'frameSettings', true, 'dropShadow', 'spread');
    if (uiElements.frameDropShadowColorInput) uiElements.frameDropShadowColorInput.addEventListener('input', (e) => { updateState({ frameSettings: { dropShadow: { color: e.target.value } } }); redrawCallback(); });
    // (インナーシャドウのリスナーも同様に追加)

    // 縁取り
    addOptionChangeListener(uiElements.frameBorderEnabledCheckbox, 'frameSettings', false, '', 'borderEnabled');
    addNumericInputListener(uiElements.frameBorderWidthSlider, 'frameBorderWidth', 'frameSettings', true, 'border', 'width');
    if (uiElements.frameBorderColorInput) uiElements.frameBorderColorInput.addEventListener('input', (e) => { updateState({ frameSettings: { border: { color: e.target.value } } }); redrawCallback(); });
    addOptionChangeListener(uiElements.frameBorderStyleSelect, 'frameSettings', false, '', 'border', 'style');
}