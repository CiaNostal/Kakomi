// js/utils/domUtils.js
/**
 * domUtils.js
 * 複数モジュールから参照される、小さなDOM関連ユーティリティ。
 */

/**
 * 指定要素が「文字入力中とみなすべき」要素かどうかを判定する。
 * キーボードショートカット（Undo/Redo、矢印キーnudgeなど）を、
 * テキスト入力欄でのブラウザ標準の編集操作と衝突させないために使う。
 * @param {Element|null} el
 * @returns {boolean}
 */
export function isEditableElement(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
