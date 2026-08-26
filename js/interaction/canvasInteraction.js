// js/interaction/canvasInteraction.js
/**
 * canvasInteraction.js
 * previewCanvas上でのクリック選択・ドラッグ移動・矢印キーnudgeを扱う共通コントローラ。
 *
 * 対象がテキストであろうと（将来的に）写真や背景であろうと同じロジックで処理できるよう、
 * 実際の値の読み書きは type ごとのアダプタ（./adapters/*.js）に委譲している。
 * ここでの責務は「座標変換」「当たり判定」「ドラッグ状態の管理」「キー入力」のみ。
 */
import * as interactionRegistry from './interactionRegistry.js';
import * as selectionStore from './selectionStore.js';
import { setActiveGuides, clearActiveGuides } from './guideStore.js';
import { computeSnapCorrection } from './snapEngine.js';
import { getLastPreviewContext } from '../canvasRenderer.js';
import { isEditableElement } from '../utils/domUtils.js';
import textAdapter from './adapters/textAdapter.js';
import photoAdapter from './adapters/photoAdapter.js';
import backgroundAdapter from './adapters/backgroundAdapter.js';

const adaptersByType = {
    text: textAdapter,
    photo: photoAdapter,
    background: backgroundAdapter
};

let dragState = null;

function toCanvasCoords(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

/**
 * previewCanvasにポインタ操作（クリック選択・ドラッグ）とキーボードnudgeを配線する。
 * main.js からアプリ初期化時に一度だけ呼び出す。
 * @param {HTMLCanvasElement} canvas
 */
export function initCanvasInteraction(canvas) {
    if (!canvas) return;

    canvas.addEventListener('pointerdown', (e) => {
        const { x, y } = toCanvasCoords(canvas, e.clientX, e.clientY);
        const hit = interactionRegistry.hitTest(x, y);
        selectionStore.setSelectedId(hit ? hit.id : null);
        if (!hit) return;

        const adapter = adaptersByType[hit.type];
        if (!adapter) return;
        const startValue = adapter.getValue(hit.id);
        if (!startValue) return;

        dragState = { id: hit.id, adapter, startClientX: e.clientX, startClientY: e.clientY, startValue, startBox: hit };
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add('dragging-object');
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!dragState) return;
        let dxPx = e.clientX - dragState.startClientX;
        let dyPx = e.clientY - dragState.startClientY;

        // Altキーを押しながらドラッグすると、細かい位置調整のためスナップを一時的に無効化できる
        if (!e.altKey) {
            const candidateBox = {
                x: dragState.startBox.x + dxPx,
                y: dragState.startBox.y + dyPx,
                width: dragState.startBox.width,
                height: dragState.startBox.height
            };
            const otherBoxes = interactionRegistry.getAll().filter(b => b.id !== dragState.id);
            const snap = computeSnapCorrection(candidateBox, canvas.width, canvas.height, otherBoxes);
            dxPx += snap.dx;
            dyPx += snap.dy;
            setActiveGuides(snap.guideLines);
        } else {
            clearActiveGuides();
        }

        const ctx = getLastPreviewContext();
        const changes = dragState.adapter.computeChanges(dragState.startValue, dxPx, dyPx, ctx);
        dragState.adapter.commit(dragState.id, changes);
    });

    const endDrag = () => {
        dragState = null;
        canvas.classList.remove('dragging-object');
        clearActiveGuides();
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    // 矢印キーによる微調整（Shiftで10px相当、通常は1px相当。ドラッグと同じ「プレビュー上のpx」単位で扱う）
    document.addEventListener('keydown', (e) => {
        if (isEditableElement(document.activeElement)) return; // 入力欄編集中はナッジしない

        const selectedId = selectionStore.getSelectedId();
        if (!selectedId) return;

        let dxPx = 0, dyPx = 0;
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft') dxPx = -step;
        else if (e.key === 'ArrowRight') dxPx = step;
        else if (e.key === 'ArrowUp') dyPx = -step;
        else if (e.key === 'ArrowDown') dyPx = step;
        else return;

        const box = interactionRegistry.getById(selectedId);
        if (!box) return;
        const adapter = adaptersByType[box.type];
        if (!adapter) return;

        e.preventDefault();
        const startValue = adapter.getValue(selectedId);
        if (!startValue) return;
        const changes = adapter.computeChanges(startValue, dxPx, dyPx, getLastPreviewContext());
        adapter.commit(selectedId, changes);
    });
}
