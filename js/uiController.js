// js/uiController.js
import { getState, updateState, addTextLayer, removeTextLayer, updateTextLayer, reorderTextLayers } from './stateManager.js';
import { controlsConfig, googleFonts, exifTagDefinitions } from './uiDefinitions.js';
import { loadGoogleFonts } from './textRenderer.js';
import {
    DATE_FORMAT_PRESETS, DEFAULT_DATE_FORMAT, DEFAULT_EXIF_ITEMS,
    contentHasExif, contentHasDate, contentPreviewLabel, contentIsEmpty, resolveContentText
} from './utils/textContent.js';
import { stripCustomPrefix } from './layoutCalculator.js';
import { growRectToAspect, resolveCropRect, resolveCropAspectValue } from './utils/cropRect.js';
import * as selectionStore from './interaction/selectionStore.js';
import { requestEnterCropMode } from './interaction/canvasInteraction.js';
import { enhanceAsScrubInput } from './ui/scrubInput.js';
import { attachColorHistory } from './ui/colorSwatches.js';
import { createRatioPicker, ratioOptionsFor, RATIO_FAMILIES, orientedValueOf, isOrientableFamily } from './ui/ratioPicker.js';
import { getPresets, savePreset, deletePreset, applyPreset, PRESET_SECTIONS, getPresetSections, getPresetGroups, getNextAutoPresetName } from './presets/presetStore.js';

export const uiElements = {
    imageLoader: document.getElementById('imageLoader'),
    openImageButton: document.getElementById('openImageButton'),
    previewCanvas: document.getElementById('previewCanvas'),
    previewCtx: null,
    downloadButton: document.getElementById('downloadButton'),
    downloadPopover: document.getElementById('downloadPopover'),
    downloadConfirmButton: document.getElementById('downloadConfirmButton'),
    canvasArea: document.querySelector('.canvas-area'),
    canvasContainer: document.querySelector('.canvas-container'),
    undoButton: document.getElementById('undoButton'),
    redoButton: document.getElementById('redoButton'),

    // レイアウト設定タブ - 構図調整（クロップ）
    // 切り抜き比率はタイル型ピッカー（js/ui/ratioPicker.js）。以前は <select id="cropAspectRatio">。
    cropAspectRatioPicker: document.getElementById('cropAspectRatioPicker'),
    cropRotateButton: document.getElementById('cropRotateButton'),
    cropCustomAspectRatioContainer: document.getElementById('cropCustomAspectRatioContainer'),
    cropCustomAspectRatioWidthInput: document.getElementById('cropCustomAspectRatioWidth'),
    cropCustomAspectRatioHeightInput: document.getElementById('cropCustomAspectRatioHeight'),
    // 「切り抜き位置」「枠内位置」のスライダーは撤去（docs/roadmap.md A-1）。
    // cropSettings.rect のパンと photoViewParams はデータとして保持し、プレビュー操作からのみ動かす。
    resetPhotoPlacementButton: document.getElementById('resetPhotoPlacement'),

    // レイアウト設定タブ
    // 出力アスペクト比もタイル型ピッカー。以前は <select id="outputAspectRatio">。
    outputAspectRatioPicker: document.getElementById('outputAspectRatioPicker'),
    outputRotateButton: document.getElementById('outputRotateButton'),
    customAspectRatioContainer: document.getElementById('customAspectRatioContainer'),
    customAspectRatioWidthInput: document.getElementById('customAspectRatioWidth'),
    customAspectRatioHeightInput: document.getElementById('customAspectRatioHeight'),
    baseMarginPercentInput: document.getElementById('baseMarginPercent'),
    baseMarginPercentValueSpan: document.getElementById('baseMarginPercentValue'),

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
    // 背景 X/Y オフセットのスライダーは撤去（docs/roadmap.md B-1）。
    // 「背景」タブでのプレビュードラッグ（backgroundAdapter）とこのリセットボタンで操作する。
    resetBgOffsetButton: document.getElementById('resetBgOffset'),

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

    // E-3(フェーズ5): Exif は「情報」タブ（#tab-info）内の #exifDataContainer に表示。
    // 以前の独立トグル #exifToggleButton / フローティングカード #exifFloatCard は廃止。
    exifDataContainer: document.getElementById('exifDataContainer'),

    // テキストレイヤー（撮影日・Exif・自由テキストを1本の layers[] で扱う。バケット4 / D-1・D-3）
    textLayersListContainer: document.getElementById('textLayersList'),
    addTextLayerButton: document.getElementById('addTextLayerButton'),
    textLayerSettingsPanel: document.getElementById('textLayerSettingsPanel'),

    // プリセットタブ
    presetNameInput: document.getElementById('presetNameInput'),
    presetSectionChecks: document.getElementById('presetSectionChecks'),
    savePresetButton: document.getElementById('savePresetButton'),
    presetsListContainer: document.getElementById('presetsList'),
};

let redrawDebounced = null; // ★追加: デバウンスされた再描画関数を保持する変数

// 比率タイルピッカー（js/ui/ratioPicker.js）のインスタンス。
// initializeUIFromState は setupEventListeners より先に走るため、両方から呼べる
// ensureRatioPickers() で一度だけ生成する。onSelect から使う再描画関数は
// setupEventListeners が受け取った redrawCallback を moduleRedraw に控えておく。
let outputRatioPicker = null;
let cropRatioPicker = null;
let moduleRedraw = null;

// 出力／切り抜きの比率タイルの選択肢は js/ui/ratioPicker.js の RATIO_FAMILIES（正準順序）を
// フィルタして得る。両ピッカーで同じ比率が同じ相対順序に並ぶ（docs/roadmap.md A-7）。

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

// クロップ矩形のパンを「元画像割合矩形」に反映する。rect.x の可動範囲は [0, 1-rect.w]、
// panX=0.5 が中央。「配置をリセット」ボタンから中央（0.5, 0.5）へ戻すのに使う。
function cropRectWithPan(rect, panX, panY) {
    return { x: (1 - rect.w) * panX, y: (1 - rect.h) * panY, w: rect.w, h: rect.h };
}

// A-10:「大きさ」スライダーの見かけ値（写真短辺がキャンバス短辺に占める割合%）と、
// 内部の baseMarginPercent（写真短辺に対する余白%）の相互変換。表示・入力の反転だけで、
// レイアウト計算（layoutCalculator）には一切手を入れていない。
// size = 100 / (1 + margin/45)。margin=0 → 100%、margin=5（既定）→ ちょうど 90%、margin=300 → 約13%。
// スライダーの下限は 15%（marginToSize(300)≈13% より上なので、全域が実 margin に 1:1 対応する）。
function marginToSize(marginPercent) {
    return 100 / (1 + (Math.max(0, Number(marginPercent) || 0) / 45));
}
function sizeToMargin(sizePercent) {
    const s = Math.min(100, Math.max(1, Number(sizePercent) || 100));
    return Math.min(300, Math.max(0, 45 * (100 - s) / s));
}

// G-4: カスタム幅高さ欄を「明示的にカスタムモードに入っているあいだ」表示し続けるための粘着フラグ。
// カスタムタイル押下／カスタム欄編集で true、別タイル押下で false。入力中に既存比率へ一致しても
// 欄が閉じてフォーカスが飛ばないようにする。
let outputCustomMode = false;
let cropCustomMode = false;

// アスペクト比の選択を cropSettings に反映する。現在のクロップ矩形の中心を保ったまま、
// その比率へ「外接方向」で合わせる（`growRectToAspect`）。同じ比率の連打で冪等、別々の比率を
// 交互に選んでも画像サイズで頭打ちになり 1px へ収束しない（G-6 の続報対策）。'free' は矩形そのまま。
// 'original' は元画像のアスペクト比で固定する（`resolveCropAspectValue`。A-11）。
function applyCropAspect(aspectRatioString) {
    const state = getState();
    const rect = resolveCropRect(state.cropSettings, state.originalWidth, state.originalHeight);
    const aspectValue = resolveCropAspectValue(aspectRatioString, state.originalWidth, state.originalHeight);
    const imgAspect = (state.originalWidth > 0 && state.originalHeight > 0)
        ? state.originalWidth / state.originalHeight : 1;
    const newRect = aspectValue == null ? rect : growRectToAspect(rect, aspectValue, imgAspect);
    updateState({ cropSettings: { aspectRatio: aspectRatioString, rect: newRect } });
}

// 比率タイルピッカーを一度だけ生成する。initializeUIFromState / setupEventListeners の
// どちらから呼ばれても安全（生成済みなら何もしない）。
function ensureRatioPickers() {
    if (!outputRatioPicker && uiElements.outputAspectRatioPicker) {
        outputRatioPicker = createRatioPicker(uiElements.outputAspectRatioPicker, {
            families: ratioOptionsFor('output'),
            onSelect: (value) => {
                if (value === 'custom') {
                    // 「カスタム」タイルは幅高さ入力欄を出すだけ（この時点では state を変えない）。
                    // 実際の反映は入力欄の編集時に updateAspectRatioFromInputs が行う。
                    outputCustomMode = true;
                    updateOutputCustomVisibility();
                    return;
                }
                outputCustomMode = false; // G-4: プリセットタイルを選んだらカスタムモードを抜ける
                const parts = value.split(':');
                if (parts.length === 2 && uiElements.customAspectRatioWidthInput
                    && uiElements.customAspectRatioHeightInput) {
                    uiElements.customAspectRatioWidthInput.value = parts[0];
                    uiElements.customAspectRatioHeightInput.value = parts[1];
                }
                updateState({ outputTargetAspectRatioString: value });
                updateOutputCustomVisibility();
                if (moduleRedraw) moduleRedraw();
            }
        });
    }
    if (!cropRatioPicker && uiElements.cropAspectRatioPicker) {
        cropRatioPicker = createRatioPicker(uiElements.cropAspectRatioPicker, {
            families: ratioOptionsFor('crop'),
            onSelect: (value) => {
                if (value === 'custom') {
                    // 「カスタム」タイルは幅高さ入力欄を出すだけ。反映は入力欄の編集時。
                    cropCustomMode = true;
                    updateCropCustomVisibility();
                    return;
                }
                cropCustomMode = false; // G-4: プリセットタイルを選んだらカスタムモードを抜ける
                // A-11:「オリジナル」＝元画像のアスペクト比で固定（Lightroom と同義）。
                // 他のプリセット比率と同じ経路で、比率だけ画像から導く（applyCropAspect が処理）。
                if (value !== 'free' && value !== 'original') {
                    const parts = value.split(':');
                    if (parts.length === 2 && uiElements.cropCustomAspectRatioWidthInput
                        && uiElements.cropCustomAspectRatioHeightInput) {
                        uiElements.cropCustomAspectRatioWidthInput.value = parts[0];
                        uiElements.cropCustomAspectRatioHeightInput.value = parts[1];
                    }
                }
                applyCropAspect(value);
                updateCropCustomVisibility();
                if (moduleRedraw) moduleRedraw();
            }
        });
    }
}

// A-14: 見出しの回転ボタン。押すたびにピッカーの向き（縦長／横長）を反転する momentary ボタン
// （トグルの ON/OFF 状態は持たない）。選択中が普通の比率ファミリーなら保存文字列を W:H ↔ H:W に、
// カスタム選択中なら幅高さ入力欄を入れ替える。1×1・フリー・オリジナルは向きだけ反転して値は据え置き。
function rotateRatioPicker(kind) {
    const picker = kind === 'output' ? outputRatioPicker : cropRatioPicker;
    if (!picker) return;
    picker.toggleOrientation();
    // toggleOrientation は全タイルを描き直すので、「オリジナル」タイルの形（画像アスペクト）を貼り直す。
    if (kind === 'crop') syncOriginalTileShape(getState());
    const id = picker.getSelectedId();
    const customMode = kind === 'output' ? outputCustomMode : cropCustomMode;
    const wInput = kind === 'output'
        ? uiElements.customAspectRatioWidthInput : uiElements.cropCustomAspectRatioWidthInput;
    const hInput = kind === 'output'
        ? uiElements.customAspectRatioHeightInput : uiElements.cropCustomAspectRatioHeightInput;

    if (id === 'custom' || customMode) {
        if (wInput && hInput) {
            const tmp = wInput.value;
            wInput.value = hInput.value;
            hInput.value = tmp;
            if (kind === 'output') updateAspectRatioFromInputs();
            else updateCropAspectRatioFromInputs();
        }
        return;
    }
    const family = RATIO_FAMILIES.find(f => f.id === id);
    if (family && isOrientableFamily(family)) {
        const value = orientedValueOf(family, picker.getOrientation());
        const parts = value.split(':');
        if (wInput) wInput.value = parts[0];
        if (hInput) hInput.value = parts[1];
        if (kind === 'output') {
            updateState({ outputTargetAspectRatioString: value });
        } else {
            applyCropAspect(value);
            syncOriginalTileShape(getState());
        }
        if (moduleRedraw) moduleRedraw();
    }
    // 1×1・フリー・オリジナル・未選択: 向きだけ反転済み。次に選ぶタイルが新しい向きで出る。
}

// カスタム幅高さ入力欄は「カスタムモード中」または「カスタムタイルが実効的に押されている」あいだ表示する。
// G-4: 前者（粘着フラグ）があるので、入力値がたまたま既存比率に一致しても欄は閉じない＝フォーカスが飛ばない。
function updateOutputCustomVisibility() {
    if (!uiElements.customAspectRatioContainer) return;
    const show = outputCustomMode || (outputRatioPicker && outputRatioPicker.getValue() === 'custom');
    uiElements.customAspectRatioContainer.classList.toggle('hidden', !show);
}

function updateCropCustomVisibility() {
    if (!uiElements.cropCustomAspectRatioContainer) return;
    const show = cropCustomMode || (cropRatioPicker && cropRatioPicker.getValue() === 'custom');
    uiElements.cropCustomAspectRatioContainer.classList.toggle('hidden', !show);
}

// カスタム幅高さ入力欄 → 出力アスペクト比 state（＋タイルの押下状態）を更新する。
// 「カスタム」タイルの onSelect からも、幅高さ入力欄の input からも呼ばれる。
function updateAspectRatioFromInputs() {
    if (!uiElements.customAspectRatioWidthInput || !uiElements.customAspectRatioHeightInput) return;
    const width = parseFloat(uiElements.customAspectRatioWidthInput.value);
    const height = parseFloat(uiElements.customAspectRatioHeightInput.value);
    if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        const aspectRatioString = `${width}:${height}`;
        outputCustomMode = true; // 入力欄を編集した＝カスタムモード
        updateState({ outputTargetAspectRatioString: aspectRatioString });
        // G-4: keepCustom で、既存比率に一致しても「カスタム」タイルの押下状態を維持する。
        if (outputRatioPicker) outputRatioPicker.setValue(aspectRatioString, { keepCustom: true });
        updateOutputCustomVisibility();
        if (moduleRedraw) moduleRedraw();
    }
}

// カスタム幅高さ入力欄 → 切り抜き比率（applyCropAspect が中心維持で rect を再フィット）を更新する。
function updateCropAspectRatioFromInputs() {
    if (!uiElements.cropCustomAspectRatioWidthInput || !uiElements.cropCustomAspectRatioHeightInput) return;
    const width = parseFloat(uiElements.cropCustomAspectRatioWidthInput.value);
    const height = parseFloat(uiElements.cropCustomAspectRatioHeightInput.value);
    if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        const aspectRatioString = `${width}:${height}`;
        cropCustomMode = true; // 入力欄を編集した＝カスタムモード
        applyCropAspect(aspectRatioString);
        // G-4: keepCustom で、既存比率に一致しても「カスタム」タイルの押下状態を維持する。
        if (cropRatioPicker) cropRatioPicker.setValue(aspectRatioString, { keepCustom: true });
        updateCropCustomVisibility();
        if (moduleRedraw) moduleRedraw();
    }
}

// 出力アスペクト比タイル ＋ カスタム幅高さ入力欄を state に同期する（initializeUIFromState から使用）。
function syncOutputAspectUI(state) {
    ensureRatioPickers();
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
        if (outputRatioPicker) outputRatioPicker.setValue(cleanAspectRatio, { keepCustom: outputCustomMode });
    } else if (outputRatioPicker) {
        outputRatioPicker.setValue(null);
    }
    updateOutputCustomVisibility();
}

// 切り抜き比率タイル ＋ カスタム幅高さ入力欄を state に同期する（initializeUIFromState から使用）。
function syncCropAspectUI(state) {
    ensureRatioPickers();
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
        if (cropRatioPicker) cropRatioPicker.setValue(cropAspect, { keepCustom: cropCustomMode });
    } else if (cropRatioPicker) {
        // 'original'（元画像比で固定）と 'free'（制約なし）はそれぞれのタイルを押下表示にする（A-11）。
        cropRatioPicker.setValue(cropAspect === 'original' ? 'original' : 'free');
    }
    // 「オリジナル」タイルのミニ長方形を現在の画像アスペクトに合わせる。setValue で向きが変わると
    // タイルが描き直され汎用プレースホルダに戻るため、setValue の後に実行する（A-14）。
    syncOriginalTileShape(state);
    updateCropCustomVisibility();
}

// 「オリジナル」タイルのミニ長方形を、読み込み中の画像のアスペクト比に合わせて描く（A-11）。
// 比率タイルは ensureRatioPickers で一度だけ生成されるため、画像ロード／差し替えのたびにここで更新する。
function syncOriginalTileShape(state) {
    if (!uiElements.cropAspectRatioPicker) return;
    const i = uiElements.cropAspectRatioPicker.querySelector('.ratio-tile[data-value="original"] .ratio-tile-shape i');
    if (!i) return;
    const w = state.originalWidth;
    const h = state.originalHeight;
    if (!(w > 0) || !(h > 0)) { i.style.width = '40px'; i.style.height = '40px'; return; }
    const BOX = 46;
    const ratio = w / h;
    const sw = ratio >= 1 ? BOX : BOX * ratio;
    const sh = ratio >= 1 ? BOX / ratio : BOX;
    i.style.width = `${Math.max(8, Math.round(sw * 10) / 10)}px`;
    i.style.height = `${Math.max(8, Math.round(sh * 10) / 10)}px`;
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

    // 構図調整（クロップ）設定: 切り抜き比率タイル ＋ カスタム幅高さ入力欄を同期
    syncCropAspectUI(state);

    // レイアウト設定
    syncOutputAspectUI(state);
    // A-10: スライダーは「大きさ」（photoSize の min/max/step）で見せ、値は margin→size 変換して入れる。
    setupInputAttributesAndValue(uiElements.baseMarginPercentInput, 'photoSize', marginToSize(state.baseMarginPercent));

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

    // プリセット（保存フォームの項目チェック ＋ 保存済み一覧）
    renderPresetSectionChecks();
    renderPresetsList();

    toggleBackgroundSettingsVisibility();
    updateFrameSettingsVisibility();
    updateSliderValueDisplays();
}


export function updateSliderValueDisplays() {
    const state = getState();
    // 「切り抜き位置」「枠内位置」のスライダーは撤去済み（docs/roadmap.md A-1）。
    // cropSettings.rect のパンと photoViewParams はプレビュー操作からのみ動かし、
    // 数値表示は持たない。
    if (uiElements.baseMarginPercentValueSpan && uiElements.baseMarginPercentInput) {
        // A-10: 表示は「大きさ」%（＝写真短辺がキャンバス短辺に占める割合）。内部 baseMarginPercent から変換。
        const sizePercent = marginToSize(state.baseMarginPercent);
        uiElements.baseMarginPercentValueSpan.textContent = `${Math.round(sizePercent)}%`;
        // select モードの四隅■ハンドルのドラッグでもこの値は変わりうるため、入力欄の値もあわせて同期する。
        if (document.activeElement !== uiElements.baseMarginPercentInput) {
            uiElements.baseMarginPercentInput.value = String(sizePercent);
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
    // 背景 X/Y オフセットのスライダーは撤去済み（docs/roadmap.md B-1）。
    // 「背景」タブでのプレビュードラッグと「位置をリセット」ボタンで操作する。
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

// --- テキストレイヤー（撮影日・Exif・自由テキストを1本の layers[] で扱う。バケット4 / D-1・D-3） ---
// 各レイヤーの content は「文字列と動的トークン（{ field:'date'|'exif' }）の並び」。種類(kind)フィールドは
// 持たず、リスト行のバッジ等は content から導出する（utils/textContent.js）。追加の導線は
// 「＋ テキストを追加」→ 作成フォーム（未確定の下書き textDraft）→「追加」で確定、の順。

// 未確定の下書きレイヤー。null なら作成フォームは閉じている。
let textDraft = null;

/** 新規テキストレイヤーの下書き（stateManager の TEXT_LAYER_DEFAULTS と揃える）。 */
function makeTextDraft() {
    return {
        content: [''],
        textAlign: 'center',
        font: googleFonts[0].displayName,
        size: controlsConfig.textLayerSize.defaultValue,
        color: '#333333',
        opacity: 1,
        position: 'middle-center',
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
    };
}

/** 「＋ テキストを追加」: 作成フォームを開く。 */
function enterTextCreateMode() {
    textDraft = makeTextDraft();
    if (selectionStore.getSelectedId() !== null) selectionStore.setSelectedId(null);
    renderTextLayersList();
    renderTextLayerSettingsPanel();
}

/** 作成フォームの「キャンセル」: 下書きを捨てて閉じる。 */
function cancelTextCreateMode() {
    textDraft = null;
    renderTextLayersList();
    renderTextLayerSettingsPanel();
}

/** 作成フォームの「追加」: 下書きを確定してレイヤー化し、そのレイヤーを選択する。 */
function commitTextDraft() {
    if (!textDraft) return;
    if (contentIsEmpty(textDraft.content)) {
        alert('テキストの内容を入力するか、「撮影日」「Exif」を差し込んでください。');
        return;
    }
    const { content, ...style } = textDraft;
    const id = addTextLayer({ content, ...style });
    textDraft = null;
    selectionStore.setSelectedId(id); // onSelectionChange がリスト・設定パネルを再描画
}

/** ハンドルを掴んでリスト行を縦にドラッグ並べ替えできるようにする汎用ヘルパー（Exif 項目リストでも使う）。 */
function attachListDragHandle(handle, row, container, rowSelector, onCommit) {
    handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        row.classList.add('dragging');
        const onMove = (moveEvent) => {
            const rows = Array.from(container.querySelectorAll(rowSelector)).filter(r => r !== row);
            const afterRow = rows.find(r => {
                const rect = r.getBoundingClientRect();
                return moveEvent.clientY < rect.top + rect.height / 2;
            });
            if (afterRow) container.insertBefore(row, afterRow);
            else container.appendChild(row);
        };
        const onUp = () => {
            row.classList.remove('dragging');
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            onCommit();
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });
}

/** レイヤー一覧を再描画する。行 = 掴み手／種類バッジ／内容プレビュー／表示トグル／削除。 */
function renderTextLayersList() {
    const container = uiElements.textLayersListContainer;
    if (!container) return;
    const state = getState();
    const selectedId = selectionStore.getSelectedId();
    const layers = state.textSettings.layers || [];
    container.innerHTML = '';

    if (layers.length === 0) {
        const hint = document.createElement('p');
        hint.className = 'custom-text-empty-hint';
        hint.textContent = 'まだテキストがありません。「＋ テキストを追加」で作成します。';
        container.appendChild(hint);
        return;
    }

    layers.forEach((layer) => {
        const row = document.createElement('div');
        row.className = 'text-layer-row'
            + (layer.id === selectedId && !textDraft ? ' selected' : '')
            + (layer.enabled ? '' : ' disabled');
        row.dataset.layerId = layer.id;

        const grip = document.createElement('span');
        grip.className = 'text-layer-grip';
        grip.textContent = '⠿';
        grip.title = 'ドラッグで並べ替え（＝重なり順）';
        row.appendChild(grip);

        const hasExif = contentHasExif(layer.content);
        const badge = document.createElement('span');
        badge.className = 'text-layer-badge' + (hasExif ? ' exif' : '');
        badge.textContent = hasExif ? 'Exif' : 'T';
        row.appendChild(badge);

        const preview = document.createElement('span');
        preview.className = 'text-layer-preview';
        const label = contentPreviewLabel(layer.content).replace(/\s+/g, ' ').trim();
        preview.textContent = label || '(空のテキスト)';
        row.appendChild(preview);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'text-layer-toggle';
        toggle.textContent = layer.enabled ? '●' : '○';
        toggle.title = layer.enabled ? '表示中（クリックで隠す）' : '非表示（クリックで表示）';
        toggle.setAttribute('aria-pressed', String(layer.enabled));
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            updateTextLayer(layer.id, { enabled: !layer.enabled });
            renderTextLayersList();
        });
        row.appendChild(toggle);

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'text-layer-delete';
        del.textContent = '×';
        del.title = '削除';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            selectionStore.clearSelectionIfMatches(layer.id);
            removeTextLayer(layer.id);
            renderTextLayersList();
            renderTextLayerSettingsPanel();
        });
        row.appendChild(del);

        row.addEventListener('click', () => {
            if (textDraft) textDraft = null;
            selectionStore.setSelectedId(layer.id);
        });

        attachListDragHandle(grip, row, container, '.text-layer-row', () => {
            const order = Array.from(container.querySelectorAll('.text-layer-row')).map(r => r.dataset.layerId);
            reorderTextLayers(order);
        });

        container.appendChild(row);
    });
}

/**
 * 設定パネルを丸ごと再構築する。作成モード（下書き）／編集モード（選択中レイヤー）／未選択で切り替える。
 * 選択変更・追加・削除・作成フォーム開閉時に呼ぶ（毎ドラッグでは呼ばない）。
 */
function renderTextLayerSettingsPanel() {
    const panel = uiElements.textLayerSettingsPanel;
    if (!panel) return;

    if (textDraft) {
        buildTextEditor(panel, 'create', null);
        return;
    }
    const selectedId = selectionStore.getSelectedId();
    const layer = selectedId
        ? (getState().textSettings.layers || []).find(l => l.id === selectedId)
        : null;
    if (!layer) {
        panel.innerHTML = '<p class="custom-text-empty-hint">リストからテキストを選ぶと、ここで編集できます。</p>';
        return;
    }
    buildTextEditor(panel, 'edit', layer.id);
}

/**
 * テキスト編集フォームを組み立てる。mode='create' は下書き textDraft を編集（「追加」まで state に触れない）、
 * mode='edit' は選択中レイヤーをライブ編集する。フィールド構成は両モード共通（D-3: 全共通の1セット）。
 */
function buildTextEditor(panel, mode, layerId) {
    const isCreate = mode === 'create';
    const model = isCreate
        ? textDraft
        : (getState().textSettings.layers || []).find(l => l.id === layerId);
    if (!model) { panel.innerHTML = ''; return; }

    // create は下書きを直接いじる（再描画・state 更新なし）。edit は updateTextLayer 経由でライブ反映。
    const apply = (changes) => {
        if (isCreate) Object.assign(textDraft, changes);
        else updateTextLayer(layerId, changes);
    };
    const applyContent = (content) => {
        apply({ content });
        if (!isCreate) renderTextLayersList(); // 行のプレビュー文言を追従（パネルは作り直さない）
    };

    const align = (model.textAlign || 'center');
    panel.innerHTML = `
        ${isCreate ? '<p class="text-editor-title">新しいテキスト</p>' : ''}
        <div class="text-content-editor"></div>
        <div class="form-row-simple" style="justify-content: space-around;">
            <div class="radio-group"><input type="radio" name="textLayerAlign" id="textLayerAlignLeft" value="left"><label for="textLayerAlignLeft">左</label></div>
            <div class="radio-group"><input type="radio" name="textLayerAlign" id="textLayerAlignCenter" value="center"><label for="textLayerAlignCenter">中</label></div>
            <div class="radio-group"><input type="radio" name="textLayerAlign" id="textLayerAlignRight" value="right"><label for="textLayerAlignRight">右</label></div>
        </div>
        <div class="form-row-simple">
            <label for="textLayerFont">フォント:</label>
            <select id="textLayerFont"></select>
        </div>
        <div class="form-row-slider">
            <label for="textLayerSize">大きさ (%):</label>
            <input type="range" id="textLayerSize">
            <span id="textLayerSizeValue"></span>
        </div>
        <div class="form-row-simple">
            <label for="textLayerColor">文字色:</label>
            <input type="color" id="textLayerColor">
        </div>
        <div class="form-row-slider">
            <label for="textLayerOpacity">不透明度:</label>
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
        ${isCreate
            ? `<div class="text-editor-actions">
                   <button type="button" id="textDraftCommit" class="text-draft-commit">追加</button>
                   <button type="button" id="textDraftCancel" class="text-draft-cancel">キャンセル</button>
               </div>`
            : `<p class="custom-text-drag-hint">プレビュー上でドラッグして位置を調整。四隅の■で拡大縮小、上の丸ハンドルで回転（Shift で15°刻み）。Delete で削除。</p>`}
    `;

    const el = (elId) => document.getElementById(elId);

    // 内容エディタ（文字列＋トークン）
    mountContentEditor(panel.querySelector('.text-content-editor'), () => model.content, applyContent);

    // 揃え
    const alignInput = el(`textLayerAlign${align.charAt(0).toUpperCase()}${align.slice(1)}`);
    if (alignInput) alignInput.checked = true;
    ['Left', 'Center', 'Right'].forEach(dir => {
        el(`textLayerAlign${dir}`).addEventListener('change', (e) => {
            if (e.target.checked) apply({ textAlign: dir.toLowerCase() });
        });
    });

    // フォント
    populateFontSelect(el('textLayerFont'), model.font);
    el('textLayerFont').addEventListener('change', async (e) => {
        const fontObj = googleFonts.find(f => f.displayName === e.target.value);
        if (fontObj) {
            try {
                e.target.disabled = true;
                await loadGoogleFonts(fontObj.apiName);
            } catch (error) {
                alert(`フォントの読み込みに失敗しました: ${fontObj.displayName}`);
            } finally {
                e.target.disabled = false;
            }
        }
        apply({ font: e.target.value });
    });

    // 大きさ
    const sizeCfg = controlsConfig.textLayerSize;
    const sizeSlider = el('textLayerSize');
    sizeSlider.min = sizeCfg.min; sizeSlider.max = sizeCfg.max; sizeSlider.step = sizeCfg.step;
    sizeSlider.value = model.size;
    el('textLayerSizeValue').textContent = `${model.size}%`;
    sizeSlider.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        el('textLayerSizeValue').textContent = `${v}%`;
        apply({ size: v });
    });

    // 文字色
    el('textLayerColor').value = model.color;
    attachColorHistory(el('textLayerColor'));
    el('textLayerColor').addEventListener('input', (e) => apply({ color: e.target.value }));

    // 不透明度
    const opacitySlider = el('textLayerOpacity');
    const opaCfg = controlsConfig.textOpacity;
    opacitySlider.min = opaCfg.min; opacitySlider.max = opaCfg.max; opacitySlider.step = opaCfg.step;
    opacitySlider.value = model.opacity;
    el('textLayerOpacityValue').textContent = Number(model.opacity).toFixed(2);
    opacitySlider.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        el('textLayerOpacityValue').textContent = v.toFixed(2);
        apply({ opacity: v });
    });

    // オフセット・回転
    el('textLayerOffsetX').value = model.offsetX;
    el('textLayerOffsetY').value = model.offsetY;
    el('textLayerRotation').value = model.rotation || 0;
    enhanceAsScrubInput(el('textLayerOffsetX'), { sensitivity: 0.2, onChange: (v) => apply({ offsetX: v }) });
    enhanceAsScrubInput(el('textLayerOffsetY'), { sensitivity: 0.2, onChange: (v) => apply({ offsetY: v }) });
    enhanceAsScrubInput(el('textLayerRotation'), { sensitivity: 0.5, onChange: (v) => apply({ rotation: v }) });

    if (isCreate) {
        el('textDraftCommit').addEventListener('click', commitTextDraft);
        el('textDraftCancel').addEventListener('click', cancelTextCreateMode);
    }
}

/**
 * 内容エディタ（contenteditable な1つの入力欄＋トークン差し込みボタン＋インライン書式/項目ピッカー）。
 * getContent()/setContent(arr) で content 配列を出し入れする。トークンは contenteditable=false の
 * インライン span（Backspace で1単位として消える）。
 */
function mountContentEditor(host, getContent, setContent) {
    if (!host) return;
    host.innerHTML =
        '<div class="text-token-bar">'
        + '<button type="button" class="text-token-add" data-field="date">＋ 撮影日</button>'
        + '<button type="button" class="text-token-add" data-field="exif">＋ Exif</button>'
        + '</div>'
        + '<div class="text-content-field" contenteditable="true" role="textbox" aria-multiline="true" aria-label="テキストの内容"></div>'
        + '<div class="text-content-preview" aria-live="polite"><span class="text-content-preview-label">表示</span><span class="text-content-preview-body"></span></div>'
        + '<p class="text-content-preview-note custom-text-drag-hint" hidden>※ 撮影日・Exif は写真の Exif から表示されます（未読込のあいだは空欄）</p>'
        + '<div class="text-token-picker" hidden></div>';

    const field = host.querySelector('.text-content-field');
    const previewBody = host.querySelector('.text-content-preview-body');
    const previewNote = host.querySelector('.text-content-preview-note');
    const picker = host.querySelector('.text-token-picker');
    let pickerFor = null;

    // 実際に描画される文字列（Exif 解決後）をライブ表示する。トークンで組み立てた結果が
    // どう見えるか確認できるように（ユーザー要望）。
    function updatePreview() {
        const arr = serialize();
        const exifData = getState().exifData;
        const text = resolveContentText(arr, exifData);
        previewBody.textContent = text.trim() !== '' ? text : '（表示するテキストがありません）';
        previewBody.classList.toggle('is-empty', text.trim() === '');
        previewNote.hidden = !(!exifData && (contentHasDate(arr) || contentHasExif(arr)));
    }

    function makeTokenEl(seg) {
        const span = document.createElement('span');
        span.className = 'text-token';
        span.setAttribute('contenteditable', 'false');
        span.dataset.field = seg.field;
        if (seg.field === 'date') {
            const fmt = seg.format || DEFAULT_DATE_FORMAT;
            span.dataset.format = fmt;
            span.textContent = `撮影日 ${fmt}`;
        } else {
            const items = Array.isArray(seg.items) ? seg.items : [];
            span.dataset.items = JSON.stringify(items);
            span.textContent = items.length ? `Exif（${items.length}項目）` : 'Exif（未選択）';
        }
        span.title = 'クリックで書式・項目を編集';
        return span;
    }

    function paint() {
        const content = getContent();
        field.innerHTML = '';
        const arr = (Array.isArray(content) && content.length) ? content : [''];
        arr.forEach(seg => {
            if (typeof seg === 'string') field.appendChild(document.createTextNode(seg));
            else if (seg && seg.field) field.appendChild(makeTokenEl(seg));
        });
        // 末尾がトークンだとその後ろにキャレットを置けないので、ゼロ幅スペースを1つ足す（serialize で除去）。
        if (field.lastChild && field.lastChild.nodeType === Node.ELEMENT_NODE) {
            field.appendChild(document.createTextNode('​'));
        }
    }

    function serialize() {
        const out = [];
        // contenteditable は Enter で <div>／<br> を差し込むことがあるので、直下だけでなく再帰で辿る。
        const walk = (parent) => {
            parent.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const t = node.textContent.replace(/​/g, '');
                    if (t) out.push(t);
                    return;
                }
                if (node.nodeType !== Node.ELEMENT_NODE) return;
                if (node.classList.contains('text-token')) {
                    if (node.dataset.field === 'date') {
                        out.push({ field: 'date', format: node.dataset.format || DEFAULT_DATE_FORMAT });
                    } else {
                        let items = [];
                        try { items = JSON.parse(node.dataset.items || '[]'); } catch (e) { items = []; }
                        out.push({ field: 'exif', items });
                    }
                    return;
                }
                if (node.tagName === 'BR') { out.push('\n'); return; }
                if (node.tagName === 'DIV' && out.length) out.push('\n'); // ブロック区切り
                walk(node);
            });
        };
        walk(field);
        const merged = [];
        for (const s of out) {
            if (typeof s === 'string' && typeof merged[merged.length - 1] === 'string') merged[merged.length - 1] += s;
            else merged.push(s);
        }
        return merged.length ? merged : [''];
    }

    const commit = () => { setContent(serialize()); updatePreview(); };

    function closePicker() {
        picker.hidden = true;
        picker.innerHTML = '';
        pickerFor = null;
    }

    function openPickerFor(tokenEl) {
        pickerFor = tokenEl;
        picker.hidden = false;
        picker.innerHTML = '';
        if (tokenEl.dataset.field === 'date') {
            buildDateFormatPicker(picker, tokenEl.dataset.format || DEFAULT_DATE_FORMAT, (fmt) => {
                tokenEl.dataset.format = fmt;
                tokenEl.textContent = `撮影日 ${fmt}`;
                commit();
            });
        } else {
            buildExifItemPicker(
                picker,
                () => { try { return JSON.parse(tokenEl.dataset.items || '[]'); } catch (e) { return []; } },
                (arr) => {
                    tokenEl.dataset.items = JSON.stringify(arr);
                    tokenEl.textContent = arr.length ? `Exif（${arr.length}項目）` : 'Exif（未選択）';
                    commit();
                }
            );
        }
    }

    function insertToken(fieldName) {
        const seg = fieldName === 'date'
            ? { field: 'date', format: DEFAULT_DATE_FORMAT }
            : { field: 'exif', items: DEFAULT_EXIF_ITEMS.slice() };
        const tokenEl = makeTokenEl(seg);
        field.focus();
        const sel = window.getSelection();
        let range;
        if (sel && sel.rangeCount && field.contains(sel.anchorNode)) {
            range = sel.getRangeAt(0);
            range.deleteContents();
        } else {
            range = document.createRange();
            range.selectNodeContents(field);
            range.collapse(false);
        }
        range.insertNode(tokenEl);
        const spacer = document.createTextNode('​');
        tokenEl.after(spacer);
        range.setStartAfter(spacer);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        commit();
        openPickerFor(tokenEl);
    }

    host.querySelectorAll('.text-token-add').forEach(btn => {
        btn.addEventListener('click', () => insertToken(btn.dataset.field));
    });
    field.addEventListener('input', () => {
        if (pickerFor && !field.contains(pickerFor)) closePicker();
        commit();
    });
    field.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.execCommand('insertText', false, '\n');
        }
    });
    field.addEventListener('paste', (e) => {
        e.preventDefault();
        const t = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, t);
    });
    field.addEventListener('click', (e) => {
        const tok = e.target.closest('.text-token');
        if (tok) openPickerFor(tok);
        else if (pickerFor) closePicker();
    });

    paint();
    updatePreview();
}

/** 撮影日トークンの書式ピッカー（プリセットボタン＋自由入力）。 */
function buildDateFormatPicker(container, current, onPick) {
    container.innerHTML = '<p class="text-token-picker-title">撮影日の書式</p>';
    const row = document.createElement('div');
    row.className = 'form-row-simple';
    row.innerHTML = '<label for="dateFormatFree">自由入力:</label><input type="text" id="dateFormatFree" placeholder="例: YYYY.MM.DD">';
    const free = row.querySelector('#dateFormatFree');
    free.value = current;

    const opts = document.createElement('div');
    opts.className = 'date-format-opts';
    DATE_FORMAT_PRESETS.forEach(fmt => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'date-format-opt' + (fmt === current ? ' on' : '');
        b.textContent = fmt;
        b.addEventListener('click', () => {
            opts.querySelectorAll('.date-format-opt').forEach(x => x.classList.toggle('on', x === b));
            free.value = fmt;
            onPick(fmt);
        });
        opts.appendChild(b);
    });
    free.addEventListener('input', () => {
        const v = free.value;
        opts.querySelectorAll('.date-format-opt').forEach(x => x.classList.toggle('on', x.textContent === v));
        onPick(v);
    });

    container.appendChild(opts);
    container.appendChild(row);
    container.insertAdjacentHTML('beforeend',
        '<p class="custom-text-drag-hint">YYYY・YY・MM・DD を組み合わせて指定できます。</p>');
}

/** Exif トークンの項目ピッカー（クリックで追加、×で削除、ドラッグで並べ替え）。 */
function buildExifItemPicker(container, getItems, setItems) {
    container.innerHTML =
        '<p class="text-token-picker-title">Exif の表示項目</p>'
        + '<p class="custom-text-drag-hint">クリックで追加。追加後はドラッグで並べ替え、×で削除。</p>'
        + '<div class="exif-available-list"></div>'
        + '<div class="exif-used-list"></div>';
    const availEl = container.querySelector('.exif-available-list');
    const usedEl = container.querySelector('.exif-used-list');

    function render() {
        const items = getItems();
        availEl.innerHTML = '';
        exifTagDefinitions.filter(t => !items.includes(t.key)).forEach(tag => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'exif-available-chip';
            chip.textContent = `＋ ${tag.label}`;
            chip.addEventListener('click', () => { setItems([...getItems(), tag.key]); render(); });
            availEl.appendChild(chip);
        });

        usedEl.innerHTML = '';
        if (items.length === 0) {
            usedEl.innerHTML = '<p class="custom-text-empty-hint">上の一覧から項目を選んでください。</p>';
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

            const rm = document.createElement('button');
            rm.type = 'button';
            rm.className = 'exif-used-remove';
            rm.textContent = '×';
            rm.title = '削除';
            rm.addEventListener('click', () => { setItems(getItems().filter(k => k !== key)); render(); });
            row.appendChild(rm);

            attachListDragHandle(handle, row, usedEl, '.exif-used-row', () => {
                setItems(Array.from(usedEl.querySelectorAll('.exif-used-row')).map(r => r.dataset.tagKey));
            });
            usedEl.appendChild(row);
        });
    }
    render();
}

/**
 * ドラッグ・拡大回転ハンドル操作等で選択中レイヤーのオフセット・サイズ・回転が変化した際、
 * 開いている設定パネルの数値欄だけを軽量に同期する。パネル全体は再構築しないので、
 * 入力中のフォーカスを奪わない。フォーカス中の欄は上書きしない（タイプ入力を妨げないため）。
 */
function syncTextLayerLiveInputs(state) {
    if (textDraft) return; // 作成フォーム編集中はライブ同期しない（state と無関係の下書き）
    const selectedId = selectionStore.getSelectedId();
    if (!selectedId) return;
    const settings = (state.textSettings.layers || []).find(l => l.id === selectedId);
    if (!settings) return;

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

// F-3 / F-5: 「プリセットを保存」の項目チェックを、PRESET_SECTIONS から縦リストで組み立てる。
// 親＝5セクション（3状態チェック）、子＝背景／フレーム／テキストの「効く所だけ」。
// キャンバス・写真のトリミングは葉。子は既定で畳んでおく（F-5 の確認 Q4）。
const PRESET_SECTION_ICONS = {
    output: '#i-canvas',
    crop: '#i-photo-crop',
    background: '#i-bg',
    frame: '#i-frame',
    text: '#i-text',
};
const CHEVRON_SVG =
    '<svg class="preset-chevron" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M8 5l8 7-8 7" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

function renderPresetSectionChecks() {
    const root = uiElements.presetSectionChecks;
    if (!root) return;
    root.innerHTML = '';

    for (const [secKey, def] of Object.entries(PRESET_SECTIONS)) {
        const node = document.createElement('div');
        node.className = 'preset-node';
        const iconRef = PRESET_SECTION_ICONS[secKey] || '#i-preset';

        if (!def.groups) {
            // 葉セクション: ラベル全体がチェックボックスのトグル。
            const label = document.createElement('label');
            label.className = 'preset-node-row';
            label.innerHTML =
                `<input type="checkbox" data-section="${secKey}" checked>` +
                `<svg class="preset-node-icon" aria-hidden="true"><use href="${iconRef}"></use></svg>` +
                `<span class="preset-node-label">${def.label}</span>`;
            node.appendChild(label);
            root.appendChild(node);
            continue;
        }

        node.classList.add('has-children');
        const groupIds = Object.keys(def.groups);
        const row = document.createElement('div');
        row.className = 'preset-node-row parent';
        row.innerHTML =
            `<input type="checkbox" data-section="${secKey}" data-parent checked>` +
            `<svg class="preset-node-icon" aria-hidden="true"><use href="${iconRef}"></use></svg>` +
            `<span class="preset-node-label">${def.label}</span>` +
            `<button type="button" class="preset-node-toggle" aria-expanded="false" ` +
            `aria-label="${def.label} の内訳">${CHEVRON_SVG}</button>`;
        node.appendChild(row);

        const kids = document.createElement('div');
        kids.className = 'preset-node-children';
        kids.hidden = true;
        for (const gid of groupIds) {
            const gl = document.createElement('label');
            gl.className = 'preset-node-row child';
            gl.innerHTML =
                `<input type="checkbox" data-section="${secKey}" data-group="${gid}" checked>` +
                `<span class="preset-node-label">${def.groups[gid].label}</span>`;
            kids.appendChild(gl);
        }
        node.appendChild(kids);
        root.appendChild(node);

        const parentCb = row.querySelector('input[data-parent]');
        const childCbs = Array.from(kids.querySelectorAll('input[data-group]'));
        const syncParent = () => {
            const n = childCbs.filter(c => c.checked).length;
            parentCb.checked = n > 0;
            parentCb.indeterminate = n > 0 && n < childCbs.length;
        };
        // 親クリック: 「まだ全部ONではない」→ 全ON、「全部ON」→ 全OFF（indeterminate からも常に全ONへ）。
        // click は既定トグルの後に発火するので、childCbs の状態でどちらへ倒すか決める。
        parentCb.addEventListener('click', () => {
            const target = childCbs.some(c => !c.checked);
            childCbs.forEach(c => { c.checked = target; });
            parentCb.checked = target;
            parentCb.indeterminate = false;
        });
        childCbs.forEach(c => c.addEventListener('change', syncParent));

        const toggleBtn = row.querySelector('.preset-node-toggle');
        const setOpen = (open) => {
            kids.hidden = !open;
            toggleBtn.setAttribute('aria-expanded', String(open));
        };
        toggleBtn.addEventListener('click', () => setOpen(kids.hidden));
        // ラベル文字クリックでも開閉（チェックボックス・アイコンは除く）。
        row.addEventListener('click', (e) => {
            if (e.target.closest('input, .preset-node-toggle')) return;
            setOpen(kids.hidden);
        });
    }

    updatePresetNamePlaceholder();
}

/** F-4: 名前欄の placeholder を「次に自動で振られる名前」にする。 */
function updatePresetNamePlaceholder() {
    if (uiElements.presetNameInput) {
        uiElements.presetNameInput.placeholder = getNextAutoPresetName();
    }
}

/** 保存フォームのチェック状態を { sections, groups } に集約する（savePreset へ渡す形）。 */
function collectPresetSelection() {
    const root = uiElements.presetSectionChecks;
    const sections = [];
    const groups = {};
    if (!root) return { sections: Object.keys(PRESET_SECTIONS), groups };
    for (const [secKey, def] of Object.entries(PRESET_SECTIONS)) {
        if (!def.groups) {
            const cb = root.querySelector(`input[data-section="${secKey}"]:not([data-group]):not([data-parent])`);
            if (cb && cb.checked) sections.push(secKey);
        } else {
            const childCbs = Array.from(root.querySelectorAll(`input[data-section="${secKey}"][data-group]`));
            const chosen = childCbs.filter(c => c.checked).map(c => c.dataset.group);
            if (chosen.length > 0) {
                sections.push(secKey);
                if (chosen.length < childCbs.length) groups[secKey] = chosen;
            }
        }
    }
    return { sections, groups };
}

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

        const nameWrap = document.createElement('span');
        nameWrap.className = 'preset-row-name';

        const label = document.createElement('span');
        label.className = 'preset-row-title';
        label.textContent = preset.name;
        nameWrap.appendChild(label);

        // F-2 / F-5: このプリセットが含むセクションを小さく表示する。
        // 子グループを一部だけ保存したセクションは「背景（一部）」＋ ツールチップに内訳。
        const secKeys = getPresetSections(preset);
        const partialGroups = getPresetGroups(preset);
        const shortParts = secKeys.map(s => {
            const base = PRESET_SECTIONS[s].label;
            return partialGroups[s] ? `${base}（一部）` : base;
        });
        const fullParts = secKeys.map(s => {
            const base = PRESET_SECTIONS[s].label;
            if (!partialGroups[s]) return base;
            const gl = partialGroups[s].map(id => PRESET_SECTIONS[s].groups[id].label).join('・');
            return `${base}（${gl}）`;
        });
        const meta = document.createElement('span');
        meta.className = 'preset-row-meta';
        meta.textContent = (secKeys.length === Object.keys(PRESET_SECTIONS).length
            && Object.keys(partialGroups).length === 0)
            ? 'すべて'
            : shortParts.join('・');
        meta.title = fullParts.join('・');
        nameWrap.appendChild(meta);

        row.appendChild(nameWrap);

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
                updatePresetNamePlaceholder();
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

// バケット4: 撮影日 / Exif / 自由テキストの統合に伴い、updateExifCustomText()（Exif 表示テキストの
// 事前組み立て）・getExifValue()・renderExifItemsUI()・attachExifDragHandle() は廃止した。
// Exif 値の整形は exifHandler.getExifValue()、content → 文字列の解決は utils/textContent.js が担い、
// Exif 項目ピッカーとリストのドラッグ並べ替えは mountContentEditor / buildExifItemPicker /
// attachListDragHandle（上記）が引き継いでいる。

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
};

export function setupEventListeners(redrawCallback) {
    // 比率タイルピッカーの onSelect などから使う再描画関数を控えておく（モジュールスコープ）。
    moduleRedraw = redrawCallback;
    ensureRatioPickers();

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
    // 切り抜き比率はタイルピッカー（ensureRatioPickers 内で onSelect を配線済み）。
    // ここではカスタム幅高さ入力欄と回転ボタンを配線する（A-14: 旧 ⇄ ボタンは回転ボタンに一本化）。
    if (uiElements.cropCustomAspectRatioWidthInput) {
        uiElements.cropCustomAspectRatioWidthInput.addEventListener('input', updateCropAspectRatioFromInputs);
    }
    if (uiElements.cropCustomAspectRatioHeightInput) {
        uiElements.cropCustomAspectRatioHeightInput.addEventListener('input', updateCropAspectRatioFromInputs);
    }
    if (uiElements.cropRotateButton) {
        uiElements.cropRotateButton.addEventListener('click', () => rotateRatioPicker('crop'));
    }

    // 「写真のトリミング」セクション内をクリックしたら、写真を選択して crop モードへ自動で入る（A-13。
    // プレビュー上で選択済み写真を再タップするのと同じ。frozenFrame スナップショットは requestEnterCropMode
    // が作る）。**比率タイル（`<button class="ratio-tile">`）のクリックも crop モードへ入る**——A-13 の
    // 当初仕様。除外するのは数値入力欄（カスタム幅高さ）と回転ボタン（`.ratio-rotate-btn`。向きの切り替えは
    // メタ操作なので crop モードには入らない）だけ。Esc / Enter で select に戻る。
    const cropSection = document.getElementById('cropSection');
    if (cropSection) {
        cropSection.addEventListener('click', (e) => {
            if (e.target.closest('input, textarea, .ratio-rotate-btn')) return;
            requestEnterCropMode();
        });
    }

    // --- 出力アスペクト比（タイルピッカー） ---
    // タイルの onSelect は ensureRatioPickers で配線済み。カスタム幅高さ入力欄と回転ボタンを配線する。
    if (uiElements.customAspectRatioWidthInput) {
        uiElements.customAspectRatioWidthInput.addEventListener('input', updateAspectRatioFromInputs);
    }
    if (uiElements.customAspectRatioHeightInput) {
        uiElements.customAspectRatioHeightInput.addEventListener('input', updateAspectRatioFromInputs);
    }
    if (uiElements.outputRotateButton) {
        uiElements.outputRotateButton.addEventListener('click', () => rotateRatioPicker('output'));
    }

    // A-10:「大きさ」スライダー専用の配線。見かけ値（size%）→ 内部 baseMarginPercent へ変換して保存する。
    // 汎用 addNumericInputListener は使わない（configKey が実キーと 1:1 でないため）。
    if (uiElements.baseMarginPercentInput) {
        const sizeConfig = controlsConfig.photoSize;
        const marginDefault = controlsConfig.baseMarginPercent.defaultValue;
        uiElements.baseMarginPercentInput.addEventListener('input', (e) => {
            let size = parseFloat(e.target.value);
            if (isNaN(size)) size = sizeConfig ? sizeConfig.defaultValue : marginToSize(marginDefault);
            if (sizeConfig) {
                if (sizeConfig.min !== undefined) size = Math.max(sizeConfig.min, size);
                if (sizeConfig.max !== undefined) size = Math.min(sizeConfig.max, size);
            }
            e.target.value = String(size);
            const marginPercent = Math.round(sizeToMargin(size) * 100) / 100;
            updateState({ baseMarginPercent: marginPercent });
            updateSliderValueDisplays();
            redrawCallback();
        });
        const resetPhotoSize = () => {
            updateState({ baseMarginPercent: marginDefault });
            // dblclick／ダブルタップはスライダーにフォーカスが乗るので、updateSliderValueDisplays の
            // activeElement ガード（ドラッグ中に .value を上書きしないための分岐）に阻まれて
            // つまみ位置が戻らない。ここで明示的に size 値へ同期する（値・表示・描画は既に直っている）。
            uiElements.baseMarginPercentInput.value = String(marginToSize(marginDefault));
            updateSliderValueDisplays();
            redrawCallback();
        };
        uiElements.baseMarginPercentInput.addEventListener('dblclick', resetPhotoSize);
        let lastSizeTap = 0;
        uiElements.baseMarginPercentInput.addEventListener('touchstart', (event) => {
            const now = Date.now();
            if (now - lastSizeTap < 300 && now - lastSizeTap > 0) {
                event.preventDefault();
                resetPhotoSize();
            }
            lastSizeTap = now;
        });
    }
    // ... (その他すべての addNumericInputListener と addColorInputListener の呼び出し) ...
    // 「配置をリセット」: 枠内位置（photoViewParams）を中央へ、かつクロップ矩形のパンを中央へ戻す。
    // 切り抜き範囲のサイズ・比率は変えない（docs/roadmap.md A-1）。
    // 「大きさと配置をリセット」（A-15）: 枠内位置とクロップ矩形のパンを中央へ戻すのに加えて、
    // 大きさ（baseMarginPercent）も既定（5 ＝ 表示 90%）へ戻す。セクション名が「大きさと配置」なので
    // 両方戻るのが直感的、というユーザー判断。切り抜き範囲のサイズ・比率は変えない。
    if (uiElements.resetPhotoPlacementButton) {
        uiElements.resetPhotoPlacementButton.addEventListener('click', () => {
            const state = getState();
            const rect = resolveCropRect(state.cropSettings, state.originalWidth, state.originalHeight);
            updateState({
                photoViewParams: { offsetX: 0.5, offsetY: 0.5 },
                cropSettings: { rect: cropRectWithPan(rect, 0.5, 0.5) },
                baseMarginPercent: controlsConfig.baseMarginPercent.defaultValue
            });
            updateSliderValueDisplays();
            redrawCallback();
        });
    }
    addOptionChangeListener(uiElements.bgTypeColorRadio, 'backgroundType', 'color');
    addOptionChangeListener(uiElements.bgTypeImageBlurRadio, 'backgroundType', 'imageBlur');
    addColorInputListener(uiElements.backgroundColorInput, 'backgroundColor');
    addNumericInputListener(uiElements.bgScaleSlider, 'bgScale', 'imageBlurBackgroundParams', 'scale');
    addNumericInputListener(uiElements.bgBlurSlider, 'bgBlur', 'imageBlurBackgroundParams', 'blurAmountPercent');
    addNumericInputListener(uiElements.bgBrightnessSlider, 'bgBrightness', 'imageBlurBackgroundParams', 'brightness');
    addNumericInputListener(uiElements.bgSaturationSlider, 'bgSaturation', 'imageBlurBackgroundParams', 'saturation');
    // 「位置をリセット」: 拡大ぼかし背景の X/Y オフセットを 0 へ戻す（docs/roadmap.md B-1）。
    if (uiElements.resetBgOffsetButton) {
        uiElements.resetBgOffsetButton.addEventListener('click', () => {
            updateState({ imageBlurBackgroundParams: { offsetXPercent: 0, offsetYPercent: 0 } });
            redrawCallback();
        });
    }
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

    // --- テキストタブ（バケット4 / D-1・D-3） ---
    // レイヤー個別の設定UIは buildTextEditor() 内で配線されるため、ここでは「＋ テキストを追加」
    // （作成フォームを開く）と「選択変更に応じたUI再描画」のみを配線する。
    if (uiElements.addTextLayerButton) {
        uiElements.addTextLayerButton.addEventListener('click', enterTextCreateMode);
    }
    selectionStore.onSelectionChange(() => {
        renderTextLayersList();
        renderTextLayerSettingsPanel();
    });

    // --- プリセットタブ ---
    if (uiElements.savePresetButton) {
        uiElements.savePresetButton.addEventListener('click', () => {
            const name = uiElements.presetNameInput ? uiElements.presetNameInput.value : '';
            // F-2 / F-5: チェックされたセクション＋子グループだけ保存する。
            const { sections, groups } = collectPresetSelection();
            if (sections.length === 0) {
                alert('保存する項目を1つ以上選択してください。');
                return;
            }
            const preset = savePreset(name, sections, groups);
            if (preset) {
                // 名前欄はクリアするが、項目チェックはユーザーが残した状態のまま維持する。
                if (uiElements.presetNameInput) uiElements.presetNameInput.value = '';
                updatePresetNamePlaceholder();
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