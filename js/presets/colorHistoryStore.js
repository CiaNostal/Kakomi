// js/presets/colorHistoryStore.js
/**
 * colorHistoryStore.js
 * カラーピッカーで選んだ色の履歴（MRU順、最大MAX_HISTORY件）をlocalStorageに保持する。
 * アプリ内のどのカラーピッカー（背景色、影、縁取り、テキスト各種）から選んでも同じ
 * 履歴を共有するため、一箇所で選んだ色を他のピッカーでもすぐに再利用できる。
 */

const STORAGE_KEY = 'kakomi_colorHistory';
const MAX_HISTORY = 12;

function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(c => typeof c === 'string') : [];
    } catch (e) {
        console.warn('[ColorHistoryStore] Failed to load color history from localStorage.', e);
        return [];
    }
}

function persistHistory(history) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.warn('[ColorHistoryStore] Failed to save color history to localStorage.', e);
    }
}

/**
 * 履歴（MRU順、先頭が最新）を取得する。
 * @returns {string[]}
 */
export function getColorHistory() {
    return loadHistory();
}

/**
 * 色を履歴の先頭に記録する。既に履歴にある同じ色は先頭に移動する（重複させない）。
 * @param {string} hex 例: "#1a2b3c"
 */
export function recordColor(hex) {
    if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    const normalized = hex.toLowerCase();
    let history = loadHistory().filter(c => c !== normalized);
    history.unshift(normalized);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    persistHistory(history);
}
