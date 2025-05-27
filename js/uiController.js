// js/uiController.js
import { getState, updateState } from './stateManager.js'; // CHANGED: Import from stateManager
import { controlsConfig } from './uiDefinitions.js'; // CHANGED: Import from uiDefinitions
// requestRedraw は main.js からコールバックとして渡される

/**
 * UI要素への参照をまとめて保持するオブジェクト。
 * main.jsのDOMContentLoaded内でpreviewCtxが設定されます。
 */
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
};

/**
 * editStateの現在の値に基づいて、HTMLのUI要素の属性（min, max, step, value, checkedなど）を初期化・設定します。
 */
export function initializeUIFromState() {
    const state = getState(); // CHANGED: Use getState()

    /**
     * input要素（range, number）の属性と値を設定するヘルパー関数。
     * @param {HTMLElement} element 対象のHTML要素。
     * @param {string} configKey controlsConfig内のキー名。
     * @param {*} stateValue editStateから取得した現在の値。
     */
    const setupInputAttributesAndValue = (element, configKey, stateValue) => {
        if (element && controlsConfig[configKey]) {
            const config = controlsConfig[configKey];
            if (element.type === 'range' || element.type === 'number') {
                if (config.min !== undefined) element.min = config.min;
                if (config.max !== undefined) element.max = config.max;
                if (config.step !== undefined) element.step = config.step;
            }
            // valueの設定は、型を合わせる必要がある場合がある（特にrangeは文字列として扱う）
            element.value = String(stateValue);
        } else if (element) {
            // configがない場合でも、stateValueで初期化は試みる
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
    // stateManager.js の editState 構造に合わせて outputSettings.quality を参照
    setupInputAttributesAndValue(uiElements.jpgQualitySlider, 'jpgQuality', Math.round(state.outputSettings.quality * 100));


    toggleBackgroundSettingsVisibility(); // ラジオボタンの状態に基づいて表示切替
    updateSliderValueDisplays(); // 全てのスライダーの隣のテキスト表示を更新
}

/**
 * 各スライダーの現在の値を隣の<span>要素に表示します。
 */
export function updateSliderValueDisplays() {
    const state = getState(); // CHANGED: Use getState()

    // 各span要素が存在するか確認してからtextContentを設定
    if (uiElements.photoPosXValueSpan && uiElements.photoPosXSlider) {
        const val = parseFloat(state.photoViewParams.offsetX); // editStateから値を取得
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
        // stateManager.js の editState 構造に合わせて outputSettings.quality を参照
        uiElements.jpgQualityValueSpan.textContent = `${Math.round(state.outputSettings.quality * 100)}`;
    }
}

/**
 * 背景タイプに応じて、関連する設定UIの表示/非表示を切り替えます。
 */
export function toggleBackgroundSettingsVisibility() {
    if (!uiElements.bgColorSettingsContainer || !uiElements.imageBlurSettingsContainer) return;
    const currentBackgroundType = getState().backgroundType; // CHANGED: Use getState()
    if (currentBackgroundType === 'color') {
        uiElements.bgColorSettingsContainer.classList.remove('hidden');
        uiElements.imageBlurSettingsContainer.classList.add('hidden');
    } else if (currentBackgroundType === 'imageBlur') {
        uiElements.bgColorSettingsContainer.classList.add('hidden');
        uiElements.imageBlurSettingsContainer.classList.remove('hidden');
    }
}

/**
 * 各UI要素にイベントリスナーを設定します。
 * @param {function} redrawCallback プレビュー再描画を要求するコールバック関数。
 */
export function setupEventListeners(redrawCallback) {
    /**
     * input[type="range"] または input[type="number"] 用の汎用イベントリスナーファクトリ。
     * @param {HTMLElement} element 対象のHTML要素。
     * @param {string} configKey controlsConfig内のキー名。
     * @param {string} stateKey editStateのトップレベルのキー名。
     * @param {boolean} isNested stateKeyがネストしたオブジェクトのキーであるか。
     * @param {string} nestedKey isNestedがtrueの場合の、ネストしたオブジェクト内のキー名。
     */
    const addNumericInputListener = (element, configKey, stateKey, isNested = false, nestedKey = '') => {
        if (element) {
            element.addEventListener('input', (e) => {
                let value = parseFloat(e.target.value); // スライダーや数値入力は数値として扱う
                const config = controlsConfig[configKey];

                // バリデーション: configで定義されたmin/max/stepに従う
                if (config) {
                    if (isNaN(value)) { // 不正な入力ならデフォルト値に戻す
                        value = config.defaultValue;
                    }
                    if (config.min !== undefined) value = Math.max(config.min, value);
                    if (config.max !== undefined) value = Math.min(config.max, value);
                    // stepの考慮は、HTMLのstep属性に任せるか、JSでも丸めるか選択
                }
                e.target.value = String(value); // UIにもバリデーション後の値を反映

                if (isNested && nestedKey) {
                    // stateManager.js の updateState はディープマージを行う
                    // ネストしたオブジェクトの特定プロパティを更新する場合、
                    // 現在のそのブランチの状態を取得し、更新したいキーの値を変更してオブジェクトごと渡す
                    const currentStateBranch = getState()[stateKey] || {};
                    updateState({ [stateKey]: { ...currentStateBranch, [nestedKey]: value } });
                } else {
                    updateState({ [stateKey]: value });
                }
                updateSliderValueDisplays(); // スライダー横のテキスト表示を更新
                redrawCallback(); // プレビュー再描画
            });
        }
    };

    /**
     * select要素やradioボタン用の汎用イベントリスナーファクトリ。
     * @param {HTMLElement} element 対象のHTML要素。
     * @param {string} stateKey editStateのトップレベルのキー名。
     * @param {boolean} isRadio ラジオボタンかどうか。
     * @param {string} radioValue isRadioがtrueの場合の、このラジオボタンが示す値。
     * @param {boolean} needsRedraw この変更がプレビューの再描画を必要とするか。
     */
    const addOptionChangeListener = (element, stateKey, isRadio = false, radioValue = '', needsRedraw = true) => {
        if (element) {
            element.addEventListener('change', (e) => {
                if (isRadio) {
                    if (e.target.checked) {
                        updateState({ [stateKey]: radioValue });
                        if (stateKey === 'backgroundType') { // 背景タイプ変更時のみ特別なUI更新
                            toggleBackgroundSettingsVisibility();
                        }
                    } else {
                        return; // チェックが外れたラジオボタンのイベントは無視
                    }
                } else { // select要素など
                    updateState({ [stateKey]: e.target.value });
                }
                if (needsRedraw) redrawCallback();
            });
        }
    };

    // --- 各UI要素へのイベントリスナー設定 ---

    // レイアウト設定タブ
    addOptionChangeListener(uiElements.outputAspectRatioSelect, 'outputTargetAspectRatioString');
    addNumericInputListener(uiElements.baseMarginPercentInput, 'baseMarginPercent', 'baseMarginPercent');
    addNumericInputListener(uiElements.photoPosXSlider, 'photoPosX', 'photoViewParams', true, 'offsetX');
    addNumericInputListener(uiElements.photoPosYSlider, 'photoPosY', 'photoViewParams', true, 'offsetY');

    // 背景編集タブ
    addOptionChangeListener(uiElements.bgTypeColorRadio, 'backgroundType', true, 'color');
    addOptionChangeListener(uiElements.bgTypeImageBlurRadio, 'backgroundType', true, 'imageBlur');
    if (uiElements.backgroundColorInput) { // カラーピッカーはinputイベントでリアルタイムに
        uiElements.backgroundColorInput.addEventListener('input', (e) => {
            updateState({ backgroundColor: e.target.value });
            if (getState().backgroundType === 'color') { // 単色背景選択中のみ即時再描画
                redrawCallback();
            }
        });
    }
    addNumericInputListener(uiElements.bgScaleSlider, 'bgScale', 'imageBlurBackgroundParams', true, 'scale');
    addNumericInputListener(uiElements.bgBlurSlider, 'bgBlur', 'imageBlurBackgroundParams', true, 'blurAmountPercent');
    addNumericInputListener(uiElements.bgBrightnessSlider, 'bgBrightness', 'imageBlurBackgroundParams', true, 'brightness');
    addNumericInputListener(uiElements.bgSaturationSlider, 'bgSaturation', 'imageBlurBackgroundParams', true, 'saturation');

    // 出力タブ
    if (uiElements.jpgQualitySlider) {
        uiElements.jpgQualitySlider.addEventListener('input', (e) => {
            const qualityValueUI = parseInt(e.target.value, 10);
            // controlsConfigからmin/maxを取得してバリデーション
            const config = controlsConfig.jpgQuality;
            let validatedQualityUI = qualityValueUI;
            if (isNaN(validatedQualityUI)) validatedQualityUI = config.defaultValue;
            validatedQualityUI = Math.max(config.min, Math.min(config.max, validatedQualityUI));
            e.target.value = String(validatedQualityUI); // UIに反映

            // stateManager.js の editState 構造に合わせて outputSettings.quality を更新
            updateState({ 
                outputSettings: { ...getState().outputSettings, quality: validatedQualityUI / 100 } 
            });
            updateSliderValueDisplays(); // スライダー横のテキスト表示を更新 (再描画は不要)
        });
    }
}