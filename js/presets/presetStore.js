// js/presets/presetStore.js
/**
 * presetStore.js
 * 編集設定（stateManager.jsのEDITABLE_SETTINGS_KEYSで定義される範囲）を
 * 名前付きプリセットとしてlocalStorageに保存・一覧取得・削除・適用する。
 *
 * 読み込んだ画像そのものやレイアウト計算の派生データは対象外（historyManager.jsの
 * Undo/Redoと同じ考え方）。textSettings.layers[] もそのまま保存するため、テキストの
 * 内容・個数・並び順もプリセットの一部として保存・復元される。旧形式（date / exif /
 * customTexts）のプリセットは applyPreset で migrateTextSettings() が layers[] へ変換する。
 */
import { getState, updateState, EDITABLE_SETTINGS_KEYS, migrateTextSettings } from '../stateManager.js';
import { migrateCropSettings } from '../utils/cropRect.js';

const STORAGE_KEY = 'kakomi_presets';

/**
 * F-2 / F-5: プリセットの「保存する項目」をタブ単位の5セクションに分ける。
 * さらに背景・フレーム・テキストは「効く所だけ」の子グループ（`groups`）を持つ（F-5）。
 * 子を持たないセクション（キャンバス・写真のトリミング）は `keys` を直接持つ葉。
 *
 * `keys` の要素はドット無しの状態キー（例 `backgroundColor`）か、ドット付きパス（例
 * `frameSettings.border`）。ドット付きは savePreset が部分オブジェクトを組み立て、applyPreset
 * 側の updateState deep-merge で既存値の上にマージされる（移行関数不要）。
 * label は「保存済み」一覧のセクション表示に出る（uiController.js）。E-8 でレール／レイアウトタブと用語統一。
 */
export const PRESET_SECTIONS = {
    output: { label: 'キャンバス', keys: ['outputTargetAspectRatioString', 'baseMarginPercent', 'outputSettings'] },
    crop: { label: '写真のトリミング', keys: ['cropSettings', 'photoViewParams'] },
    background: {
        label: '背景',
        groups: {
            type: { label: 'タイプ（単色／ぼかし）', keys: ['backgroundType'] },
            color: { label: '色', keys: ['backgroundColor'] },
            blur: { label: 'ぼかしの見え方・色調・位置', keys: ['imageBlurBackgroundParams'] },
        },
    },
    frame: {
        label: 'フレーム',
        groups: {
            corner: { label: '角丸（角のスタイル）', keys: ['frameSettings.cornerStyle', 'frameSettings.cornerRadiusPercent', 'frameSettings.superellipseN'] },
            border: { label: '線（縁取り）', keys: ['frameSettings.border'] },
            shadow: { label: '影', keys: ['frameSettings.shadowEnabled', 'frameSettings.shadowType', 'frameSettings.shadowParams'] },
        },
    },
    // バケット4: 撮影日 / Exif / 自由テキストは1本の textSettings.layers[] に統合されたため、
    // 「テキスト」は子グループを持たない葉。textSettings 丸ごとで保存・復元する。
    text: { label: 'テキスト', keys: ['textSettings'] },
};

/** セクション定義の葉キー（ドット付き含む）を全部集める。 */
function allKeysOfSection(secDef) {
    if (secDef.keys) return secDef.keys.slice();
    return Object.values(secDef.groups).flatMap(g => g.keys);
}

/** 保存キー（ドット付き含む）をトップレベルの状態キーへ丸める（`frameSettings.border` → `frameSettings`）。 */
function topLevelKey(keyPath) {
    const dot = keyPath.indexOf('.');
    return dot === -1 ? keyPath : keyPath.slice(0, dot);
}

// 開発時のドリフト検知: PRESET_SECTIONS の葉キー（トップレベルに丸めたもの）が
// EDITABLE_SETTINGS_KEYS を過不足なくカバーしているか。
{
    const covered = new Set(
        Object.values(PRESET_SECTIONS).flatMap(allKeysOfSection).map(topLevelKey)
    );
    const missing = EDITABLE_SETTINGS_KEYS.filter(k => !covered.has(k));
    const extra = [...covered].filter(k => !EDITABLE_SETTINGS_KEYS.includes(k));
    if (missing.length || extra.length) {
        console.warn('[PresetStore] PRESET_SECTIONS と EDITABLE_SETTINGS_KEYS が不一致:', { missing, extra });
    }
}

/**
 * セクション key の配列（＋任意の子グループ選択）を、保存キー（ドット付き含む）の配列へ展開する。
 * @param {string[]} sections 保存するセクション key。省略・空なら全セクション。
 * @param {Object<string,string[]>} [groups] セクション key → 選んだ子グループ id の配列。
 *   グループを持つセクションで `groups[sec]` が無ければ、そのセクションは全グループ扱い。
 */
function sectionsToKeys(sections, groups) {
    const valid = (Array.isArray(sections) && sections.length)
        ? sections.filter(s => PRESET_SECTIONS[s])
        : Object.keys(PRESET_SECTIONS);
    const g = (groups && typeof groups === 'object') ? groups : {};
    const keys = [];
    const usedGroups = {};
    for (const s of valid) {
        const def = PRESET_SECTIONS[s];
        if (!def.groups) {
            keys.push(...def.keys);
            continue;
        }
        const chosen = Array.isArray(g[s]) && g[s].length
            ? g[s].filter(id => def.groups[id])
            : Object.keys(def.groups);
        for (const id of chosen) keys.push(...def.groups[id].keys);
        // 一部だけ選んだセクションだけ groups に記録する（全部なら省略＝旧形式互換）。
        if (chosen.length && chosen.length < Object.keys(def.groups).length) {
            usedGroups[s] = chosen;
        }
    }
    return { sections: valid, groups: usedGroups, keys };
}

/** 状態オブジェクトからドット付きパスの値を取り出す（浅いコピー）。 */
function getByPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** target にドット付きパスで値を書き込む（途中のオブジェクトは作る）。 */
function setByPath(target, path, value) {
    const parts = path.split('.');
    let o = target;
    for (let i = 0; i < parts.length - 1; i++) {
        if (o[parts[i]] == null || typeof o[parts[i]] !== 'object') o[parts[i]] = {};
        o = o[parts[i]];
    }
    o[parts[parts.length - 1]] = value;
}

/**
 * 未入力なら「プリセット N」（N＝空き番号の最小、1 始まり。F-4）、
 * 明示名なら既存と衝突する間 ` 2` ` 3` … を足した名前を返す。**上書きはしない。**
 * @param {string} rawName
 * @param {string[]} [existingNames] 省略時は現在保存済みの名前一覧
 */
export function resolvePresetName(rawName, existingNames) {
    const taken = new Set(
        Array.isArray(existingNames) ? existingNames : loadPresets().map(p => p.name)
    );
    const trimmed = (typeof rawName === 'string') ? rawName.trim() : '';
    if (!trimmed) {
        let n = 1;
        while (taken.has(`プリセット ${n}`)) n++;
        return `プリセット ${n}`;
    }
    if (!taken.has(trimmed)) return trimmed;
    let n = 2;
    while (taken.has(`${trimmed} ${n}`)) n++;
    return `${trimmed} ${n}`;
}

/** 次に自動で振られるプリセット名（フォームの placeholder 用）。 */
export function getNextAutoPresetName() {
    return resolvePresetName('');
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
 * @param {string} name プリセット名。空なら「プリセット N」を自動採番（F-4）。既存と衝突する
 *   明示名には ` 2` ` 3` … を付ける。**上書きはしない。**
 * @param {string[]} [sections] 保存するセクション（PRESET_SECTIONS のキー）。省略・空配列なら全セクション。
 * @param {Object<string,string[]>} [groups] セクション key → 選んだ子グループ id（F-5）。一部だけ選んだ
 *   セクションのみ渡せばよい（全部選んだセクションは省略で「全グループ」扱い）。
 * @returns {Object|null} 保存されたプリセット。localStorageへの保存に失敗した場合はnull
 */
export function savePreset(name, sections, groups) {
    const state = getState();
    const { sections: usedSections, groups: usedGroups, keys } = sectionsToKeys(sections, groups);
    const settings = {};
    for (const keyPath of keys) {
        setByPath(settings, keyPath, getByPath(state, keyPath));
    }
    const presets = loadPresets();
    const preset = {
        id: generateId(),
        name: resolvePresetName(name, presets.map(p => p.name)),
        createdAt: Date.now(),
        sections: usedSections,
        settings
    };
    if (Object.keys(usedGroups).length) preset.groups = usedGroups;
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
 * プリセットが「一部の子グループだけ」保存しているセクションの一覧を返す
 * （`{ background: ['type','blur'] }` の形。全グループ保存 or 葉セクションは含まれない）。
 * 「保存済み」一覧のメタ表示で「背景（色以外）」のように出すために使う。
 */
export function getPresetGroups(preset) {
    const g = (preset && preset.groups && typeof preset.groups === 'object') ? preset.groups : {};
    const out = {};
    for (const [sec, ids] of Object.entries(g)) {
        const def = PRESET_SECTIONS[sec];
        if (def && def.groups && Array.isArray(ids)) {
            out[sec] = ids.filter(id => def.groups[id]);
        }
    }
    return out;
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
    // 旧形式（{ date, exif, customTexts }）で保存されたテキスト設定を、現行の layers[] へ移行する。
    // updateState は deepMerge のため、事前に textSettings オブジェクトごと差し替えて
    // 旧キー（date 等）が状態に残らないようにする（cropSettings と同じ考え方）。
    if (settings.textSettings) {
        settings.textSettings = migrateTextSettings(settings.textSettings);
    }
    updateState(settings);
    return true;
}
