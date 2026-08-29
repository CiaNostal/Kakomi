// js/ui/colorSwatches.js
/**
 * colorSwatches.js
 * <input type="color">の直後にカラー履歴のスウォッチ行を挿入する軽量な機能拡張。
 * スウォッチをクリックするとその色がピッカーに設定され、input/changeイベントが
 * 発火するので既存のイベントリスナー（状態更新・プレビュー再描画）がそのまま動く。
 *
 * 履歴はcolorHistoryStore.js経由でlocalStorageに保存され、全ピッカー共通。
 * そのため、どこかのピッカーで新しい色を選ぶと、画面上の他の全スウォッチ行も
 * 自動的に更新される（registryで管理し、DOMから外れた行は次回更新時に自動的に間引く）。
 */
import { getColorHistory, recordColor } from '../presets/colorHistoryStore.js';

// { row: HTMLElement, render: Function } の配列。
// customTextSettingsPanel等、毎回作り直されるパネル内のスウォッチ行が積み重ならないよう、
// refreshAll()の呼び出し時にDOMから外れた行を間引く。
const registry = [];

function refreshAll() {
    for (let i = registry.length - 1; i >= 0; i--) {
        const { row, render } = registry[i];
        if (!row.isConnected) {
            registry.splice(i, 1);
            continue;
        }
        render();
    }
}

/**
 * 指定した<input type="color">要素の直後にカラー履歴のスウォッチ行を追加する。
 * @param {HTMLInputElement} inputEl
 */
export function attachColorHistory(inputEl) {
    if (!inputEl) return;

    const row = document.createElement('div');
    row.className = 'color-history-swatches';
    // .form-row-simple はflexコンテナのため、その中に直接挿入すると同じ行に並んでしまう。
    // 行コンテナ自体の直後（兄弟要素）に挿入することで、スウォッチ行を独立した行として表示する。
    const insertAfterTarget = inputEl.closest('.form-row-simple') || inputEl.parentElement;
    insertAfterTarget.insertAdjacentElement('afterend', row);

    const render = () => {
        row.innerHTML = '';
        getColorHistory().forEach(hex => {
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = 'color-history-swatch';
            swatch.style.backgroundColor = hex;
            swatch.title = hex;
            swatch.addEventListener('click', () => {
                inputEl.value = hex;
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            });
            row.appendChild(swatch);
        });
    };
    render();
    registry.push({ row, render });

    inputEl.addEventListener('change', () => {
        recordColor(inputEl.value);
        refreshAll();
    });
}
