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

const STORAGE_KEY = 'kakomi_presets';

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
 * @returns {Object|null} 保存されたプリセット。localStorageへの保存に失敗した場合はnull
 */
export function savePreset(name) {
    const state = getState();
    const settings = {};
    for (const key of EDITABLE_SETTINGS_KEYS) {
        settings[key] = state[key];
    }
    const preset = {
        id: generateId(),
        name: (typeof name === 'string' && name.trim()) ? name.trim() : '無題のプリセット',
        createdAt: Date.now(),
        settings
    };
    const presets = loadPresets();
    presets.push(preset);
    return persistPresets(presets) ? preset : null;
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
    updateState(preset.settings);
    return true;
}
