// js/uiController.js
import { getState, updateState, addCustomTextLayer, removeCustomTextLayer, updateCustomTextLayer } from './stateManager.js';
import { controlsConfig, googleFonts, exifTagDefinitions } from './uiDefinitions.js';
import { loadGoogleFonts } from './textRenderer.js';
import { stripCustomPrefix } from './layoutCalculator.js';
import { parseAspectRatio, fitRectToAspect, resolveCropRect } from './utils/cropRect.js';
import * as selectionStore from './interaction/selectionStore.js';
import { enhanceAsScrubInput } from './ui/scrubInput.js';
import { attachColorHistory } from './ui/colorSwatches.js';
import { getPresets, savePreset, deletePreset, applyPreset } from './presets/presetStore.js';
import { decodeExifString } from './exifHandler.js';

export const uiElements = {
    imageLoader: document.getElementById('imageLoader'),
    previewCanvas: document.getElementById('previewCanvas'),
    previewCtx: null,
    downloadButton: document.getElementById('downloadButton'),
    canvasContainer: document.querySelector('.canvas-container'),
    undoButton: document.getElementById('undoButton'),
    redoButton: document.getElementById('redoButton'),

    // レイアウト設定タブ - 構図調整（クロップ）
    cropAspectRatioSelect: document.getElementById('cropAspectRatio'),
    cropCustomAspectRatioContainer: document.getElementById('cropCustomAspectRatioContainer'),
    cropCustomAspectRatioWidthInput: document.getElementById('cropCustomAspectRatioWidth'),
    cropCustomAspectRatioHeightInput: document.getElementById('cropCustomAspectRatioHeight'),
    cropSwapAspectRatioButton: document.getElementById('cropSwapAspectRatio'),
    cropOffsetXSlider: document.getElementById('cropOffsetX'),
    cropOffsetXValueSpan: document.getElementById('cropOffsetXValue'),
    cropOffsetYSlider: document.getElementById('cropOffsetY'),
    cropOffsetYValueSpan: document.getElementById('cropOffsetYValue'),

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
    exifToggleButton: document.getElementById('exifToggleButton'),
    exifFloatCard: document.getElementById('exifFloatCard'),

    // 文字レイヤー（撮影日・Exif情報・自由テキストを統一UIで扱う。5.x節「テキストUI統合」参照）
    textLayersListContainer: document.getElementById('textLayersList'),
    addCustomTextButton: document.getElementById('addCustomTextButton'),
    textLayerSettingsPanel: document.getElementById('textLayerSettingsPanel'),

    // プリセットタブ
    presetNameInput: document.getElementById('presetNameInput'),
    savePresetButton: document.getElementById('savePresetButton'),
    presetsListContainer: document.getElementById('presetsList'),
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

// --- クロップ設定（cropSettings.rect / aspectRatio）まわりの UI ヘルパー ---

// クロップ位置スライダー（0–1, 0.5=中央）↔ cropSettings.rect の相互変換。
// rect.x が取りうる範囲は [0, 1-rect.w] のため、pan=0.5 を「中央」として写像する。
function cropPanFromRect(rect) {
    return {
        x: rect.w < 1 ? rect.x / (1 - rect.w) : 0.5,
        y: rect.h < 1 ? rect.y / (1 - rect.h) : 0.5
    };
}

function cropRectWithPan(rect, panX, panY) {
    return { x: (1 - rect.w) * panX, y: (1 - rect.h) * panY, w: rect.w, h: rect.h };
}

// アスペクト比の選択を cropSettings に反映する。現在のクロップ矩形の中心を保ったまま、
// その比率に一致する最大の矩形へ再フィットする（'free' なら矩形はそのまま）。
function applyCropAspect(aspectRatioString) {
    const state = getState();
    const rect = resolveCropRect(state.cropSettings, state.originalWidth, state.originalHeight);
    const aspectValue = parseAspectRatio(aspectRatioString);
    const imgAspect = (state.originalWidth > 0 && state.originalHeight > 0)
        ? state.originalWidth / state.originalHeight : 1;
    const newRect = aspectValue == null ? rect : fitRectToAspect(rect, aspectValue, imgAspect);
    updateState({ cropSettings: { aspectRatio: aspectRatioString, rect: newRect } });
}

// パン用スライダーから cropSettings.rect を更新する。
function commitCropPan(panX, panY) {
    const state = getState();
    const rect = resolveCropRect(state.cropSettings, state.originalWidth, state.originalHeight);
    updateState({ cropSettings: { rect: cropRectWithPan(rect, panX, panY) } });
}

// 出力アスペクト比 select ＋ カスタム幅高さ入力欄を state に同期する（initializeUIFromState から使用）。
function syncOutputAspectUI(state) {
    if (!uiElements.outputAspectRatioSelect) return;
    const cleanAspectRatio = stripCustomPrefix(state.outputTargetAspectRatioString);
    if (cleanAspectRatio && cleanAspectRatio !== 'original_photo') {
        const parts = cleanAspectRatio.split(':');
        if (parts.length === 2) {
            const width = parseFloat(parts[0]);
            const height = parseFloat(parts[1]);
            if (!isNaN(width) && width > 0 && uiElements.customAspectRatioWidthInput
                && document.activeElement !== uiElements.customAspectRatioWidthInput) {
                uiElements.customAspectRatioWidthInput.value = String(width);
            }
            if (!isNaN(height) && height > 0 && uiElements.customAspectRatioHeightInput
                && document.activeElement !== uiElements.customAspectRatioHeightInput) {
                uiElements.customAspectRatioHeightInput.value = String(height);
            }
        }
        const optionExists = Array.from(uiElements.outputAspectRatioSelect.options).some(
            opt => opt.value === cleanAspectRatio
        );
        if (document.activeElement !== uiElements.outputAspectRatioSelect) {
            uiElements.outputAspectRatioSelect.value = optionExists ? cleanAspectRatio : 'custom';
        }
    } else if (document.activeElement !== uiElements.outputAspectRatioSelect) {
        uiElements.outputAspectRatioSelect.selectedIndex = -1;
    }
}


export function initializeUIFromState() {
    const state = getState();

    // 文字レイヤー（撮影日・Exif情報・自由テキスト）のフォント選択は、
    // 選択中レイヤーごとにrenderTextLayerSettingsPanel()内で生成する

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

    // 構図調整（クロップ）設定
    if (uiElements.cropAspectRatioSelect) {
        const cropAspect = state.cropSettings.aspectRatio;
        if (cropAspect && cropAspect !== 'free' && cropAspect !== 'original') {
            const parts = cropAspect.split(':');
            if (parts.length === 2) {
                const width = parseFloat(parts[0]);
                const height = parseFloat(parts[1]);
                if (!isNaN(width) && width > 0 && uiElements.cropCustomAspectRatioWidthInput) {
                    uiElements.cropCustomAspectRatioWidthInput.value = String(width);
                }
                if (!isNaN(height) && height > 0 && uiElements.cropCustomAspectRatioHeightInput) {
                    uiElements.cropCustomAspectRatioHeightInput.value = String(height);
                }
            }
            const optionExists = Array.from(uiElements.cropAspectRatioSelect.options).some(opt => opt.value === cropAspect);
            uiElements.cropAspectRatioSelect.value = optionExists ? cropAspect : 'custom';
        } else {
            uiElements.cropAspectRatioSelect.value = 'free';
        }
    }
    // クロップ位置スライダー: cropSettings.rect からパン値（0–1, 0.5=中央）を逆算して表示
    const initCropRect = resolveCropRect(state.cropSettings, state.originalWidth, state.originalHeight);
    const initPan = cropPanFromRect(initCropRect);
    setupInputAttributesAndValue(uiElements.cropOffsetXSlider, 'cropOffsetX', initPan.x);
    setupInputAttributesAndValue(uiElements.cropOffsetYSlider, 'cropOffsetY', initPan.y);

    // レイアウト設定
    syncOutputAspectUI(state);
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

    // 文字レイヤー（撮影日・Exif情報・自由テキストを統一UIで扱う）
    renderTextLayersList();
    renderTextLayerSettingsPanel();

    // プリセット一覧
    renderPresetsList();

    toggleBackgroundSettingsVisibility();
    updateFrameSettingsVisibility();
    updateSliderValueDisplays();
}


export function updateSliderValueDisplays() {
    const state = getState();
    // クロップ位置スライダー: cropSettings.rect からパン値（0–1, 0.5=中央）を逆算。
    // キャンバス上のクロップ操作でも rect は変わるため、つまみ位置もあわせて同期する
    // （photoPosX/Y スライダーと同じ理由）。
    const cropRect = resolveCropRect(state.cropSettings, state.originalWidth, state.originalHeight);
    const pan = cropPanFromRect(cropRect);
    if (uiElements.cropOffsetXValueSpan && uiElements.cropOffsetXSlider) {
        const displayVal = Math.round((pan.x - 0.5) * 2 * 100);
        uiElements.cropOffsetXValueSpan.textContent = displayVal === 0 ? '中央' : `${displayVal}%`;
        if (document.activeElement !== uiElements.cropOffsetXSlider) {
            uiElements.cropOffsetXSlider.value = pan.x;
        }
    }
    if (uiElements.cropOffsetYValueSpan && uiElements.cropOffsetYSlider) {
        const displayVal = Math.round((pan.y - 0.5) * 2 * 100);
        uiElements.cropOffsetYValueSpan.textContent = displayVal === 0 ? '中央' : `${displayVal}%`;
        if (document.activeElement !== uiElements.cropOffsetYSlider) {
            uiElements.cropOffsetYSlider.value = pan.y;
        }
    }
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
        // 写真上でのホイール操作でもこの値は変わりうるため、入力欄の値もあわせて同期する
        // （photoPosX/Yスライダーと同じ理由）。
        if (document.activeElement !== uiElements.baseMarginPercentInput) {
            uiElements.baseMarginPercentInput.value = state.baseMarginPercent;
        }
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
        uiElements.bgOffsetXValueSpan.textContent = `${parseFloat(state.imageBlurBackgroundParams.offsetXPercent).toFixed(1)}%`;
        if (document.activeElement !== uiElements.bgOffsetXSlider) {
            uiElements.bgOffsetXSlider.value = state.imageBlurBackgroundParams.offsetXPercent;
        }
    }
    if (uiElements.bgOffsetYValueSpan && uiElements.bgOffsetYSlider) {
        uiElements.bgOffsetYValueSpan.textContent = `${parseFloat(state.imageBlurBackgroundParams.offsetYPercent).toFixed(1)}%`;
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
    // 撮影日・Exif情報・自由テキストの値表示同期は syncTextLayerLiveInputs() が担う
    // （選択中レイヤーだけを対象にすればよく、かつ id が動的に生成されるDOMのため）
}

export function toggleBackgroundSettingsVisibility() {
    if (!uiElements.bgColorSettingsContainer || !uiElements.imageBlurSettingsContainer) return;
    const currentBackgroundType = getState().backgroundType;
    uiElements.bgColorSettingsContainer.classList.toggle('hidden', currentBackgroundType !== 'color');
    uiElements.imageBlurSettingsContainer.classList.toggle('hidden', currentBackgroundType !== 'imageBlur');
}

/**
 * フレーム加工パネルの開閉状態を更新する。
 * display:none の即時切り替えではなく、CSSのgrid-template-rowsトランジション
 * （.accordion / .accordion.open、style.css参照）でスムーズに開閉させるため、
 * ここでは対象要素に 'open' クラスを付け外しするだけでよい。
 */
function updateFrameSettingsVisibility() {
    const frameState = getState().frameSettings;
    if (uiElements.frameCornerRoundedSettingsContainer) {
        uiElements.frameCornerRoundedSettingsContainer.classList.toggle('open', frameState.cornerStyle === 'rounded');
    }
    if (uiElements.frameCornerSuperellipseSettingsContainer) {
        uiElements.frameCornerSuperellipseSettingsContainer.classList.toggle('open', frameState.cornerStyle === 'superellipse');
    }
    if (uiElements.frameShadowSettingsContainer) {
        uiElements.frameShadowSettingsContainer.classList.toggle('open', frameState.shadowEnabled);
    }
    if (uiElements.frameBorderDetailSettingsContainer) {
        uiElements.frameBorderDetailSettingsContainer.classList.toggle('open', frameState.border.enabled);
    }
}

// --- 文字レイヤー（撮影日・Exif情報・自由テキスト）の統一UI ---
// textRenderer.js/textAdapter.jsでは既にこの3種類は同じ仕組み（固定id 'text-date'/'text-exif'、
// またはcustomTexts[]の各id）で統一的に扱われている。UI側もこれに合わせ、1つのチップリストと
// 1つの設定パネルで、種類ごとに異なる部分（書式/Exif項目/自由記述）だけを切り替える構成にする。

const FIXED_TEXT_LAYERS = [
    { id: 'text-date', kind: 'date', label: '撮影日' },
    { id: 'text-exif', kind: 'exif', label: 'Exif情報' }
];

/** idから設定オブジェクトと種類(kind)を取得する（textAdapter.jsのresolveLayer()と同じ考え方） */
function resolveTextLayer(state, id) {
    const fixed = FIXED_TEXT_LAYERS.find(f => f.id === id);
    if (fixed) return { settings: state.textSettings[fixed.kind], kind: fixed.kind };
    const layer = state.textSettings.customTexts.find(t => t.id === id);
    return layer ? { settings: layer, kind: 'custom' } : null;
}

/** 変更を種類に応じた書き戻し先へ振り分ける（textAdapter.jsのapplyChanges()と同じパターン） */
function applyTextLayerChanges(id, kind, changes) {
    if (kind === 'date') updateState({ textSettings: { date: changes } });
    else if (kind === 'exif') updateState({ textSettings: { exif: changes } });
    else updateCustomTextLayer(id, changes);
}

/** サイズのクランプ範囲は種類ごとに異なる（textAdapter.jsのgetSizeConfigKey()と同じ対応） */
function sizeConfigKeyForKind(kind) {
    if (kind === 'date') return 'textDateSize';
    if (kind === 'exif') return 'textExifSize';
    return 'textFreeSize';
}

/** レイヤー一覧（チップ）を再描画する。撮影日・Exifは常設チップとして先頭に表示する。 */
function renderTextLayersList() {
    const container = uiElements.textLayersListContainer;
    if (!container) return;
    const state = getState();
    const selectedId = selectionStore.getSelectedId();
    container.innerHTML = '';

    FIXED_TEXT_LAYERS.forEach(fixed => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'custom-text-chip' + (fixed.id === selectedId ? ' selected' : '');
        if (!state.textSettings[fixed.kind].enabled) chip.classList.add('disabled');

        const label = document.createElement('span');
        label.textContent = fixed.label;
        chip.appendChild(label);

        chip.addEventListener('click', () => selectionStore.setSelectedId(fixed.id));
        container.appendChild(chip);
    });

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
            renderTextLayersList();
            renderTextLayerSettingsPanel();
        });
        chip.appendChild(del);

        chip.addEventListener('click', () => selectionStore.setSelectedId(layer.id));
        container.appendChild(chip);
    });
}

/** 選択中レイヤーの設定パネルを丸ごと再構築する。選択変更・追加・削除時に呼ぶ（毎ドラッグでは呼ばない）。 */
function renderTextLayerSettingsPanel() {
    const panel = uiElements.textLayerSettingsPanel;
    if (!panel) return;
    const state = getState();
    const selectedId = selectionStore.getSelectedId();
    const resolved = selectedId ? resolveTextLayer(state, selectedId) : null;

    if (!resolved) {
        panel.innerHTML = '<p class="custom-text-empty-hint">上のリストからテキストを選択、または「+ テキストを追加」で新規作成してください。</p>';
        return;
    }
    const { settings, kind } = resolved;
    const id = selectedId;

    const alignRadiosHtml = `
        <div class="form-row-simple" style="justify-content: space-around;">
            <div class="radio-group"><input type="radio" id="textLayerAlignLeft" name="textLayerAlign" value="left"><label for="textLayerAlignLeft">左寄せ</label></div>
            <div class="radio-group"><input type="radio" id="textLayerAlignCenter" name="textLayerAlign" value="center"><label for="textLayerAlignCenter">中央</label></div>
            <div class="radio-group"><input type="radio" id="textLayerAlignRight" name="textLayerAlign" value="right"><label for="textLayerAlignRight">右寄せ</label></div>
        </div>`;

    let kindSpecificHtml;
    if (kind === 'date') {
        // 撮影日はExifから自動生成される表示のため、水平配置ラジオは持たない（7.5節参照）
        kindSpecificHtml = `
        <div class="form-row-simple">
            <label for="textLayerDateFormat">書式:</label>
            <select id="textLayerDateFormat">
                <option value="">プリセットから選択...</option>
                <option value="YYYY.MM.DD">YYYY.MM.DD</option>
                <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                <option value="YY/MM/DD">YY/MM/DD</option>
                <option value="YY.MM.DD">YY.MM.DD</option>
                <option value="YYYY年MM月DD日">YYYY年MM月DD日</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
        </div>
        <div class="form-row-simple">
            <label for="textLayerDateFormatCustom">自由入力:</label>
            <input type="text" id="textLayerDateFormatCustom" placeholder="例: YYYY.MM.DD">
        </div>
        <p class="custom-text-drag-hint">YYYY・YY・MM・DDを組み合わせて自由に書式を指定できます（プリセットを選ぶと自由入力欄にも反映されます）。</p>`;
    } else if (kind === 'exif') {
        kindSpecificHtml = `
        <fieldset>
            <legend>表示項目</legend>
            <p class="custom-text-drag-hint">クリックで項目を追加し、追加した項目はドラッグで並び順を変更できます。</p>
            <div class="exif-available-list" id="textLayerExifAvailableList"></div>
            <div class="exif-used-list" id="textLayerExifUsedList"></div>
            <div class="form-row-simple"><label>プレビュー:</label></div>
            <textarea id="textLayerExifPreview" rows="2" class="exif-preview-textarea" readonly></textarea>
        </fieldset>
        ${alignRadiosHtml}`;
    } else {
        kindSpecificHtml = `
        <div class="form-row-simple">
            <textarea id="textLayerCustomArea" rows="3"
                style="width: 100%; font-family: var(--font-mono); padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border);"></textarea>
        </div>
        ${alignRadiosHtml}`;
    }

    panel.innerHTML = `
        <div class="form-row-simple">
            <label for="textLayerEnabled">表示する:</label>
            <input type="checkbox" id="textLayerEnabled">
        </div>
        ${kindSpecificHtml}
        <div class="form-row-simple">
            <label for="textLayerFont">フォント:</label>
            <select id="textLayerFont"></select>
        </div>
        <div class="form-row-slider">
            <label for="textLayerSize">サイズ (%):</label>
            <input type="range" id="textLayerSize">
            <span id="textLayerSizeValue"></span>
        </div>
        <div class="form-row-simple">
            <label for="textLayerColor">文字色:</label>
            <input type="color" id="textLayerColor">
        </div>
        <div class="form-row-slider">
            <label for="textLayerOpacity">透過度:</label>
            <input type="range" id="textLayerOpacity">
            <span id="textLayerOpacityValue"></span>
        </div>
        <div class="form-row-simple">
            <label for="textLayerOffsetX">横位置 (%):</label>
            <input type="number" id="textLayerOffsetX" step="0.5">
        </div>
        <div class="form-row-simple">
            <label for="textLayerOffsetY">縦位置 (%):</label>
            <input type="number" id="textLayerOffsetY" step="0.5">
        </div>
        <div class="form-row-simple">
            <label for="textLayerRotation">回転 (°):</label>
            <input type="number" id="textLayerRotation" step="1">
        </div>
        <p class="custom-text-drag-hint">プレビュー上でドラッグして位置を調整できます（横位置/縦位置欄はドラッグでもスクラブ操作できます。矢印キーでも微調整可）。選択中はプレビュー上に表示される角の四角ハンドルで拡大縮小、上の丸ハンドルで回転できます（回転は Shift 押しながらで15°刻み）。</p>
    `;

    const el = (elId) => document.getElementById(elId);

    // --- 共通フィールドの初期値設定 ---
    el('textLayerEnabled').checked = settings.enabled;
    populateFontSelect(el('textLayerFont'), settings.font);

    const sizeConfig = controlsConfig[sizeConfigKeyForKind(kind)];
    const sizeSlider = el('textLayerSize');
    sizeSlider.min = sizeConfig.min; sizeSlider.max = sizeConfig.max; sizeSlider.step = sizeConfig.step;
    sizeSlider.value = settings.size;
    el('textLayerSizeValue').textContent = `${settings.size}%`;

    el('textLayerColor').value = settings.color;
    attachColorHistory(el('textLayerColor'));

    const opacitySlider = el('textLayerOpacity');
    opacitySlider.min = 0; opacitySlider.max = 1; opacitySlider.step = 0.01;
    opacitySlider.value = settings.opacity;
    el('textLayerOpacityValue').textContent = settings.opacity.toFixed(2);

    el('textLayerOffsetX').value = settings.offsetX;
    el('textLayerOffsetY').value = settings.offsetY;
    el('textLayerRotation').value = settings.rotation || 0;

    // --- 共通フィールドのイベント配線 ---
    el('textLayerEnabled').addEventListener('change', (e) => {
        applyTextLayerChanges(id, kind, { enabled: e.target.checked });
        renderTextLayersList();
        if (kind === 'exif' && e.target.checked) updateExifCustomText();
    });
    el('textLayerFont').addEventListener('change', async (e) => {
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
        applyTextLayerChanges(id, kind, { font: e.target.value });
    });
    el('textLayerSize').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        el('textLayerSizeValue').textContent = `${value}%`;
        applyTextLayerChanges(id, kind, { size: value });
    });
    el('textLayerColor').addEventListener('input', (e) => {
        applyTextLayerChanges(id, kind, { color: e.target.value });
    });
    el('textLayerOpacity').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        el('textLayerOpacityValue').textContent = value.toFixed(2);
        applyTextLayerChanges(id, kind, { opacity: value });
    });
    enhanceAsScrubInput(el('textLayerOffsetX'), { sensitivity: 0.2, onChange: (v) => applyTextLayerChanges(id, kind, { offsetX: v }) });
    enhanceAsScrubInput(el('textLayerOffsetY'), { sensitivity: 0.2, onChange: (v) => applyTextLayerChanges(id, kind, { offsetY: v }) });
    enhanceAsScrubInput(el('textLayerRotation'), { sensitivity: 0.5, onChange: (v) => applyTextLayerChanges(id, kind, { rotation: v }) });

    // --- 種類固有フィールドの初期値・イベント配線 ---
    if (kind === 'date') {
        const formatOptionExists = Array.from(el('textLayerDateFormat').options).some(o => o.value === settings.format);
        el('textLayerDateFormat').value = formatOptionExists ? settings.format : '';
        el('textLayerDateFormatCustom').value = settings.format;

        el('textLayerDateFormat').addEventListener('change', (e) => {
            const value = e.target.value;
            if (!value) return; // 「プリセットから選択...」を選んだ場合は何もしない
            applyTextLayerChanges(id, kind, { format: value });
            el('textLayerDateFormatCustom').value = value;
        });
        el('textLayerDateFormatCustom').addEventListener('input', (e) => {
            const value = e.target.value;
            applyTextLayerChanges(id, kind, { format: value });
            const optionExists = Array.from(el('textLayerDateFormat').options).some(o => o.value === value);
            el('textLayerDateFormat').value = optionExists ? value : '';
        });
    } else if (kind === 'exif') {
        el(`textLayerAlign${settings.textAlign.charAt(0).toUpperCase()}${settings.textAlign.slice(1)}`).checked = true;
        ['Left', 'Center', 'Right'].forEach(dir => {
            el(`textLayerAlign${dir}`).addEventListener('change', (e) => {
                if (e.target.checked) applyTextLayerChanges(id, kind, { textAlign: dir.toLowerCase() });
            });
        });
        el('textLayerExifPreview').value = settings.customText;
        // 「利用可能な項目」「使用する項目」リストの生成・配線はrenderExifItemsUI()に委譲
        renderExifItemsUI();
    } else {
        el('textLayerCustomArea').value = settings.text;
        el(`textLayerAlign${settings.textAlign.charAt(0).toUpperCase()}${settings.textAlign.slice(1)}`).checked = true;
        el('textLayerCustomArea').addEventListener('input', debounce((e) => {
            applyTextLayerChanges(id, kind, { text: e.target.value });
            renderTextLayersList();
        }, 300));
        ['Left', 'Center', 'Right'].forEach(dir => {
            el(`textLayerAlign${dir}`).addEventListener('change', (e) => {
                if (e.target.checked) applyTextLayerChanges(id, kind, { textAlign: dir.toLowerCase() });
            });
        });
    }
}

/**
 * ドラッグ・拡大回転ハンドル操作等で選択中レイヤーのオフセット・サイズ・回転が変化した際、
 * 開いている設定パネルの数値欄だけを軽量に同期する。パネル全体は再構築しないので、
 * 入力中のフォーカスを奪わない。フォーカス中の欄は上書きしない（タイプ入力を妨げないため）。
 */
function syncTextLayerLiveInputs(state) {
    const selectedId = selectionStore.getSelectedId();
    if (!selectedId) return;
    const resolved = resolveTextLayer(state, selectedId);
    if (!resolved) return;
    const { settings } = resolved;

    const xInput = document.getElementById('textLayerOffsetX');
    const yInput = document.getElementById('textLayerOffsetY');
    const rotationInput = document.getElementById('textLayerRotation');
    const sizeSlider = document.getElementById('textLayerSize');
    const sizeValueSpan = document.getElementById('textLayerSizeValue');

    if (xInput && document.activeElement !== xInput) {
        xInput.value = Math.round(settings.offsetX * 10) / 10;
    }
    if (yInput && document.activeElement !== yInput) {
        yInput.value = Math.round(settings.offsetY * 10) / 10;
    }
    if (rotationInput && document.activeElement !== rotationInput) {
        rotationInput.value = Math.round((settings.rotation || 0) * 10) / 10;
    }
    if (sizeSlider && document.activeElement !== sizeSlider) {
        sizeSlider.value = settings.size;
        if (sizeValueSpan) sizeValueSpan.textContent = `${settings.size}%`;
    }
}

// --- プリセット（編集設定のテンプレート保存）のUI ---

/** 保存済みプリセットの一覧を再描画する。保存・削除・（Undo/Redoなどによる）UI全体再構築時に呼ぶ。 */
function renderPresetsList() {
    const container = uiElements.presetsListContainer;
    if (!container) return;
    const presets = getPresets();
    container.innerHTML = '';

    if (presets.length === 0) {
        container.innerHTML = '<p class="custom-text-empty-hint">保存されたプリセットはまだありません。</p>';
        return;
    }

    // 新しく保存したものを上に表示する
    presets.slice().reverse().forEach(preset => {
        const row = document.createElement('div');
        row.className = 'preset-row';

        const label = document.createElement('span');
        label.className = 'preset-row-name';
        label.textContent = preset.name;
        row.appendChild(label);

        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.className = 'preset-row-apply';
        applyBtn.textContent = '適用';
        applyBtn.addEventListener('click', () => {
            applyPreset(preset.id);
            // customTexts配列の個数など非連続な変化を伴いうるため、UI全体を再構築する
            // （historyManagerのonSnapshotAppliedと同じ理由）
            initializeUIFromState();
        });
        row.appendChild(applyBtn);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'preset-row-delete';
        delBtn.textContent = '×';
        delBtn.title = '削除';
        delBtn.addEventListener('click', () => {
            if (confirm(`プリセット「${preset.name}」を削除しますか?`)) {
                deletePreset(preset.id);
                renderPresetsList();
            }
        });
        row.appendChild(delBtn);

        container.appendChild(row);
    });
}

/**
 * 状態変更リスナーとして登録される、UI側の同期処理。
 * どの入力源（スライダー/スクラブ入力/Canvasドラッグ/矢印キー）からの変更でも、
 * ここを通じて他の全ビューが追従する。
 */
export function syncUIFromState(state) {
    updateSliderValueDisplays();
    syncTextLayerLiveInputs(state);
}

/**
 * textSettings.exif.items（ユーザーが選んだ項目とその並び順）から、
 * 実際にプレビュー・出力に描画されるcustomTextを組み立てて状態とプレビュー欄に反映する。
 * 並び順は固定のdisplayOrderではなく、items配列そのものの順序（=「使用する項目」リストの表示順）を使う。
 */
export function updateExifCustomText(redrawCallback) {
    const currentState = getState();
    const { exifData, textSettings } = currentState;
    const itemsToDisplay = textSettings.exif.items || [];

    const displayedExifValues = [];

    if (exifData) {
        for (const itemKey of itemsToDisplay) {
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
    const newCustomText = displayedExifValues.join('  ');

    // StateとUIの両方を更新
    updateState({ textSettings: { exif: { customText: newCustomText } } });
    const previewTextarea = document.getElementById('textLayerExifPreview');
    if (previewTextarea) {
        previewTextarea.value = newCustomText;
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
        case 'Make': return (zerothIFD && ImageIFD_CONSTANTS && ImageIFD_CONSTANTS.Make !== undefined) ? decodeExifString(zerothIFD[ImageIFD_CONSTANTS.Make]) : '';
        case 'Model': return (zerothIFD && ImageIFD_CONSTANTS && ImageIFD_CONSTANTS.Model !== undefined) ? decodeExifString(zerothIFD[ImageIFD_CONSTANTS.Model]) : '';
        case 'LensModel': return (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.LensModel !== undefined) ? decodeExifString(exifIFD[ExifIFD_CONSTANTS.LensModel]) : '';
        case 'FNumber': if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.FNumber !== undefined) { const fVal = exifIFD[ExifIFD_CONSTANTS.FNumber]; if (fVal && Array.isArray(fVal) && fVal.length === 2 && fVal[1] !== 0) { return `f/${(fVal[0] / fVal[1]).toFixed(1)}`; } } return '';
        case 'ExposureTime': if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.ExposureTime !== undefined) { const etVal = exifIFD[ExifIFD_CONSTANTS.ExposureTime]; if (etVal && Array.isArray(etVal) && etVal.length === 2 && etVal[1] !== 0) { const et = etVal[0] / etVal[1]; if (et >= 1) return `${et.toFixed(1)}s`; if (et >= 0.1) return `${et.toFixed(2)}s`; return `1/${Math.round(1 / et)}s`; } } return '';
        case 'ISOSpeedRatings': if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.ISOSpeedRatings !== undefined) { const iso = exifIFD[ExifIFD_CONSTANTS.ISOSpeedRatings]; return iso ? `${Array.isArray(iso) ? iso[0] : iso}` : ''; } return '';
        case 'FocalLength': if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.FocalLength !== undefined) { const flVal = exifIFD[ExifIFD_CONSTANTS.FocalLength]; if (flVal && Array.isArray(flVal) && flVal.length === 2 && flVal[1] !== 0) { return `${Math.round(flVal[0] / flVal[1])}mm`; } } return '';
        case 'ExposureBiasValue': if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.ExposureBiasValue !== undefined) { const evVal = exifIFD[ExifIFD_CONSTANTS.ExposureBiasValue]; if (evVal && Array.isArray(evVal) && evVal.length === 2 && evVal[1] !== 0) { const ev = evVal[0] / evVal[1]; if (ev === 0) return '0EV'; return `${ev > 0 ? '+' : ''}${ev.toFixed(1)}EV`; } } return '';
        default: return '';
    }
}

/**
 * 「利用可能な項目」チップ一覧と「使用する項目」並び替えリストを再構築する。
 * 項目の追加・削除・並び替えのたびに呼ばれる。
 */
function renderExifItemsUI() {
    // 撮影日/自由テキスト選択中はExif専用の入れ物自体がDOMに存在しないため、その都度動的に取得する
    // （renderTextLayerSettingsPanel()内でExif選択時にのみ生成される。5.x節「テキストUI統合」参照）
    const availableContainer = document.getElementById('textLayerExifAvailableList');
    const usedContainer = document.getElementById('textLayerExifUsedList');
    if (!availableContainer || !usedContainer) return;

    const items = getState().textSettings.exif.items || [];

    // 利用可能な項目（クリックで「使用する項目」の末尾に追加）
    availableContainer.innerHTML = '';
    exifTagDefinitions
        .filter(tag => !items.includes(tag.key))
        .forEach(tag => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'exif-available-chip';
            chip.textContent = `+ ${tag.label}`;
            chip.addEventListener('click', () => {
                const newItems = [...(getState().textSettings.exif.items || []), tag.key];
                updateState({ textSettings: { exif: { items: newItems } } });
                updateExifCustomText();
                renderExifItemsUI();
            });
            availableContainer.appendChild(chip);
        });

    // 使用する項目（ドラッグで並び替え、×で削除）
    usedContainer.innerHTML = '';
    if (items.length === 0) {
        usedContainer.innerHTML = '<p class="custom-text-empty-hint">上の一覧から項目をクリックして追加してください。</p>';
        return;
    }
    items.forEach(key => {
        const tag = exifTagDefinitions.find(t => t.key === key);
        const row = document.createElement('div');
        row.className = 'exif-used-row';
        row.dataset.tagKey = key;

        const handle = document.createElement('span');
        handle.className = 'exif-drag-handle';
        handle.textContent = '⠿';
        row.appendChild(handle);

        const label = document.createElement('span');
        label.className = 'exif-used-label';
        label.textContent = tag ? tag.label : key;
        row.appendChild(label);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'exif-used-remove';
        removeBtn.textContent = '×';
        removeBtn.title = '削除';
        removeBtn.addEventListener('click', () => {
            const newItems = (getState().textSettings.exif.items || []).filter(k => k !== key);
            updateState({ textSettings: { exif: { items: newItems } } });
            updateExifCustomText();
            renderExifItemsUI();
        });
        row.appendChild(removeBtn);

        attachExifDragHandle(handle, row, usedContainer);

        usedContainer.appendChild(row);
    });
}

/**
 * 「使用する項目」リストの1行をドラッグで並び替えられるようにする。
 * ドラッグ中はDOM上のみで行を移動し（stateへの書き込みはしない）、pointerup時に
 * 最終的な並び順をまとめてstateへコミットする。
 * ドラッグ中に毎回state経由で再描画してしまうと、ドラッグ中の行のDOM要素自体が
 * 作り直されてポインタ操作が中断されてしまうため、この2段階方式にしている
 * （interaction/canvasInteraction.jsの拡大・回転ハンドルと同じ設計思想）。
 */
function attachExifDragHandle(handle, row, container) {
    handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        row.classList.add('dragging');

        const onMove = (moveEvent) => {
            const rows = Array.from(container.querySelectorAll('.exif-used-row')).filter(r => r !== row);
            const afterRow = rows.find(r => {
                const rect = r.getBoundingClientRect();
                return moveEvent.clientY < rect.top + rect.height / 2;
            });
            if (afterRow) {
                container.insertBefore(row, afterRow);
            } else {
                container.appendChild(row);
            }
        };

        const onUp = () => {
            row.classList.remove('dragging');
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);

            const newOrder = Array.from(container.querySelectorAll('.exif-used-row')).map(r => r.dataset.tagKey);
            updateState({ textSettings: { exif: { items: newOrder } } });
            updateExifCustomText();
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });
}

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
};

export function setupEventListeners(redrawCallback) {
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
            // 文字レイヤー（撮影日・Exif・自由テキスト）のフォント選択は、renderTextLayerSettingsPanel()内の
            // 専用リスナーがフォント読み込みを扱うため、この汎用ヘルパーでは対象外。
            if (actualSubNestedKey && actualNestedKey) updatePayload = { [stateKey]: { [actualNestedKey]: { [actualSubNestedKey]: valueToSet } } };
            else if (actualNestedKey) updatePayload = { [stateKey]: { [actualNestedKey]: valueToSet } };
            else updatePayload = { [stateKey]: valueToSet };
            updateState(updatePayload);
            if (stateKey === 'backgroundType') toggleBackgroundSettingsVisibility();
            else if (stateKey === 'frameSettings') {
                if (actualNestedKey === 'cornerStyle' || actualNestedKey === 'shadowEnabled' || actualNestedKey === 'shadowType' || (actualNestedKey === 'border' && actualSubNestedKey === 'enabled')) updateFrameSettingsVisibility();
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

    // --- 構図調整（クロップ）タブ ---
    // クロップのアスペクト比入力フィールドのイベントリスナー（出力アスペクト比と同じパターン）。
    // 比率を変えると applyCropAspect が cropSettings.rect を中心維持でその比率へ再フィットする。
    const updateCropAspectRatioFromInputs = () => {
        if (!uiElements.cropCustomAspectRatioWidthInput || !uiElements.cropCustomAspectRatioHeightInput) return;
        const width = parseFloat(uiElements.cropCustomAspectRatioWidthInput.value);
        const height = parseFloat(uiElements.cropCustomAspectRatioHeightInput.value);
        if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
            const aspectRatioString = `${width}:${height}`;
            applyCropAspect(aspectRatioString);
            if (uiElements.cropAspectRatioSelect) {
                const optionExists = Array.from(uiElements.cropAspectRatioSelect.options).some(
                    opt => opt.value === aspectRatioString
                );
                uiElements.cropAspectRatioSelect.value = optionExists ? aspectRatioString : 'custom';
            }
            redrawCallback();
        }
    };

    if (uiElements.cropAspectRatioSelect) {
        uiElements.cropAspectRatioSelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            if (!selectedValue) return;
            if (selectedValue === 'custom') {
                updateCropAspectRatioFromInputs();
            } else if (selectedValue === 'free') {
                applyCropAspect('free');
                redrawCallback();
            } else {
                const parts = selectedValue.split(':');
                if (parts.length === 2) {
                    const width = parseFloat(parts[0]);
                    const height = parseFloat(parts[1]);
                    if (!isNaN(width) && width > 0 && uiElements.cropCustomAspectRatioWidthInput) {
                        uiElements.cropCustomAspectRatioWidthInput.value = String(width);
                    }
                    if (!isNaN(height) && height > 0 && uiElements.cropCustomAspectRatioHeightInput) {
                        uiElements.cropCustomAspectRatioHeightInput.value = String(height);
                    }
                    applyCropAspect(selectedValue);
                    redrawCallback();
                }
            }
        });
    }
    if (uiElements.cropCustomAspectRatioWidthInput) {
        uiElements.cropCustomAspectRatioWidthInput.addEventListener('input', updateCropAspectRatioFromInputs);
    }
    if (uiElements.cropCustomAspectRatioHeightInput) {
        uiElements.cropCustomAspectRatioHeightInput.addEventListener('input', updateCropAspectRatioFromInputs);
    }
    if (uiElements.cropSwapAspectRatioButton) {
        uiElements.cropSwapAspectRatioButton.addEventListener('click', () => {
            if (!uiElements.cropCustomAspectRatioWidthInput || !uiElements.cropCustomAspectRatioHeightInput) return;
            const width = parseFloat(uiElements.cropCustomAspectRatioWidthInput.value);
            const height = parseFloat(uiElements.cropCustomAspectRatioHeightInput.value);
            if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                uiElements.cropCustomAspectRatioWidthInput.value = String(height);
                uiElements.cropCustomAspectRatioHeightInput.value = String(width);
                updateCropAspectRatioFromInputs();
            }
        });
    }
    // クロップ位置スライダー（0–1, 0.5=中央）→ cropSettings.rect のパン。
    const onCropPanInput = () => {
        const px = parseFloat(uiElements.cropOffsetXSlider ? uiElements.cropOffsetXSlider.value : '0.5');
        const py = parseFloat(uiElements.cropOffsetYSlider ? uiElements.cropOffsetYSlider.value : '0.5');
        commitCropPan(isNaN(px) ? 0.5 : px, isNaN(py) ? 0.5 : py);
        redrawCallback();
    };
    if (uiElements.cropOffsetXSlider) uiElements.cropOffsetXSlider.addEventListener('input', onCropPanInput);
    if (uiElements.cropOffsetYSlider) uiElements.cropOffsetYSlider.addEventListener('input', onCropPanInput);

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

    // --- 文字入力タブ（撮影日・Exif情報・自由テキストの統一UI） ---
    // レイヤー個別の設定UIはrenderTextLayerSettingsPanel()内で選択中レイヤーごとに配線されるため、
    // ここでは「追加ボタン」と「選択変更に応じたUI再描画」のみを配線する。
    if (uiElements.addCustomTextButton) {
        uiElements.addCustomTextButton.addEventListener('click', () => {
            const id = addCustomTextLayer();
            selectionStore.setSelectedId(id);
            renderTextLayersList();
            renderTextLayerSettingsPanel();
        });
    }
    selectionStore.onSelectionChange(() => {
        renderTextLayersList();
        renderTextLayerSettingsPanel();
    });

    // --- プリセットタブ ---
    if (uiElements.savePresetButton) {
        uiElements.savePresetButton.addEventListener('click', () => {
            const name = uiElements.presetNameInput ? uiElements.presetNameInput.value : '';
            const preset = savePreset(name);
            if (preset) {
                if (uiElements.presetNameInput) uiElements.presetNameInput.value = '';
                renderPresetsList();
            } else {
                alert('プリセットの保存に失敗しました。ブラウザのストレージ容量を確認してください。');
            }
        });
    }

    // --- カラー履歴（全カラーピッカー共通） ---
    // 文字レイヤーの文字色（#textLayerColor）はrenderTextLayerSettingsPanel()内で
    // 選択変更のたびに再生成されるため、そちらで都度attachColorHistory()している。
    [
        uiElements.backgroundColorInput,
        uiElements.frameShadowColorInput,
        uiElements.frameBorderColorInput
    ].forEach(attachColorHistory);
}