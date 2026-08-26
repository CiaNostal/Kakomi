// js/ui/scrubInput.js
/**
 * scrubInput.js
 * <input type="number"> を「ドラッグしてスクラブ」「クリックしてタイプ入力」の
 * 両方に対応させる軽量な機能拡張。Figma/After Effects等にある数値入力の挙動を
 * 素のPointer Eventsだけで再現している（外部ライブラリ不要）。
 *
 * - フォーカスされていない状態で押してドラッグ → 値が連続的に変化（スクラブ）
 * - 押してすぐ離す（ドラッグしなかった）→ 通常のテキスト入力にフォーカスして選択状態にする
 * - フォーカス中の直接クリックはスクラブを起動しない（タイプ入力を優先）
 */

const DRAG_THRESHOLD_PX = 3;

/**
 * @param {HTMLInputElement} inputEl
 * @param {Object} options
 * @param {number} [options.sensitivity=1] - マウス1pxあたりの値の変化量
 * @param {number} [options.precision=1] - 表示・通知する値の小数点以下桁数
 * @param {(value: number) => void} options.onChange - 値が変化した際に呼ばれる
 */
export function enhanceAsScrubInput(inputEl, { sensitivity = 1, precision = 1, onChange } = {}) {
    if (!inputEl) return;

    let dragging = false;
    let moved = false;
    let startClientX = 0;
    let startValue = 0;
    const roundFactor = Math.pow(10, precision);

    inputEl.addEventListener('pointerdown', (e) => {
        if (document.activeElement === inputEl) return; // 既にフォーカス中なら通常の編集操作に任せる
        dragging = true;
        moved = false;
        startClientX = e.clientX;
        startValue = parseFloat(inputEl.value) || 0;
        inputEl.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    inputEl.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startClientX;
        if (Math.abs(dx) > DRAG_THRESHOLD_PX) moved = true;
        if (!moved) return;
        const newValue = Math.round((startValue + dx * sensitivity) * roundFactor) / roundFactor;
        inputEl.value = String(newValue);
        if (onChange) onChange(newValue);
    });

    const stopDrag = () => {
        if (!dragging) return;
        dragging = false;
        if (!moved) {
            // ドラッグせずに離した = クリックとみなし、タイプ入力できるようにする
            inputEl.focus();
            inputEl.select();
        }
    };
    inputEl.addEventListener('pointerup', stopDrag);
    inputEl.addEventListener('pointercancel', stopDrag);

    // キーボードでの直接入力（タイプしてEnter/フォーカスアウト）
    inputEl.addEventListener('change', (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && onChange) onChange(v);
    });
}
