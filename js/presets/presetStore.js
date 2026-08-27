// js/presets/presetStore.js
/**
 * presetStore.js
 * 編集設定（stateManager.jsのEDITABLE_SETTINGS_KEYSで定義される範囲）を
 * 名前付きプリセットとしてlocalStorageに保存・一覧取得・削除・適用する。
 *
 * 読み込んだ画像そのものやレイアウト計算の派生データは対象外（historyManager.jsの
 * Undo/Redoと同じ考え方）。customTexts配列を含むtextSettingsもそのまま保存するため、
 * 自由テキストの内容・個数もプリセットの一部として保存・復元される。
 */
import { getState, updateState, EDITABLE_SETTINGS_KEYS } from '../stateManager.js';
import { migrateCropSettings } from '../utils/cropRect.js';

const STORAGE_KEY = 'kakomi_presets';

/**
 * F-2: プリセットの「保存する項目」をタブ単位の5セクションに分ける。
 * 各セクションは EDITABLE_SETTINGS_KEYS のサブセットに対応する。
 * （合計で EDITABLE_SETTINGS_KEYS を過不足なくカバーしている。）
 */
export const PRESET_SECTIONS = {
    output: { label: '出力フォーマット', keys: ['outputTargetAspectRatioString', 'baseMarginPercent', 'outputSettings'] },
    crop: { label: 'トリミング', keys: ['cropSettings', 'photoViewParams'] },
    background: { label: '背景', keys: ['backgroundColor', 'backgroundType', 'imageBlurBackgroundParams'] },
    frame: { label: 'フレーム', keys: ['frameSettings'] },
    text: { label: 'テキスト', keys: ['textSettings'] },
};

// 開発時のドリフト検知: PRESET_SECTIONS が EDITABLE_SETTINGS_KEYS を過不足なくカバーしているか。
{
    const covered = new Set(Object.values(PRESET_SECTIONS).flatMap(s => s.keys));
    const missing = EDITABLE_SETTINGS_KEYS.filter(k => !covered.has(k));
    const extra = [...covered].filter(k => !EDITABLE_SETTINGS_KEYS.includes(k));
    if (missing.length || extra.length) {
        console.warn('[PresetStore] PRESET_SECTIONS と EDITABLE_SETTINGS_KEYS が不一致:', { missing, extra });
    }
}

/** セクション key の配列を、対応する設定 key の配列へ展開する。 */
function sectionsToKeys(sections) {
    const valid = (Array.isArray(sections) && sections.length)
        ? sections.filter(s => PRESET_SECTIONS[s])
        : Object.keys(PRESET_SECTIONS);
    const keys = [];
    for (const s of valid) {
        for (const k of PRESET_SECTIONS[s].keys) keys.push(k);
    }
    return { sections: valid, keys };
}

function loadPresets() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('[PresetStore] Failed to load presets from localStorage.', e);
        return [];
    }
}

function persistPresets(presets) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
        return true;
    } catch (e) {
        console.warn('[PresetStore] Failed to save presets to localStorage.', e);
        return false;
    }
}

function generateId() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `preset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * 保存済みプリセットの一覧を取得する（保存順、古い順）。
 * @returns {Array<{id: string, name: string, createdAt: number, settings: Object}>}
 */
export function getPresets() {
    return loadPresets();
}

/**
 * 現在の編集設定を新しいプリセットとして保存する。
 * @param {string} name プリセット名（空の場合は「無題のプリセット」）
 * @param {string[]} [sections] 保存するセクション（PRESET_SECTIONS のキー）。
 *   省略・空配列なら全セクション（旧挙動）。
 * @returns {Object|null} 保存されたプリセット。localStorageへの保存に失敗した場合はnull
 */
export function savePreset(name, sections) {
    const state = getState();
    const { sections: usedSections, keys } = sectionsToKeys(sections);
    const settings = {};
    for (const key of keys) {
        settings[key] = state[key];
    }
    const preset = {
        id: generateId(),
        name: (typeof name === 'string' && name.trim()) ? name.trim() : '無題のプリセット',
        createdAt: Date.now(),
        sections: usedSections,
        settings
    };
    const presets = loadPresets();
    presets.push(preset);
    return persistPresets(presets) ? preset : null;
}

/**
 * プリセットが含むセクション（PRESET_SECTIONS のキー）を返す。
 * 旧形式（sections フィールドなし）は「全セクション」として扱う。
 * @param {Object} preset
 * @returns {string[]}
 */
export function getPresetSections(preset) {
    if (preset && Array.isArray(preset.sections) && preset.sections.length) {
        return preset.sections.filter(s => PRESET_SECTIONS[s]);
    }
    return Object.keys(PRESET_SECTIONS);
}

/**
 * 指定idのプリセットを削除する。
 * @param {string} id
 */
export function deletePreset(id) {
    const presets = loadPresets().filter(p => p.id !== id);
    return persistPresets(presets);
}

/**
 * 指定idのプリセットを現在の編集状態に適用する。
 * @param {string} id
 * @returns {boolean} 適用できた場合true
 */
export function applyPreset(id) {
    const preset = loadPresets().find(p => p.id === id);
    if (!preset) return false;

    // 旧形式（{ aspectRatio, zoom, offsetX, offsetY }）で保存されたプリセットを、
    // 現行の矩形ベース（{ aspectRatio, rect }）へ移行してから適用する。
    // updateState は deepMerge のため、事前に cropSettings オブジェクトごと差し替えて
    // 旧キー（zoom 等）が状態に残らないようにする。
    const settings = { ...preset.settings };
    if (settings.cropSettings) {
        const state = getState();
        settings.cropSettings = migrateCropSettings(
            settings.cropSettings, state.originalWidth, state.originalHeight
        );
    }
    updateState(settings);
    return true;
}
