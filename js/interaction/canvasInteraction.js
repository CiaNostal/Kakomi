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
import { getTextHandles } from './textHandleStore.js';
import { getCropHandles } from './photoCropStore.js';
import textAdapter from './adapters/textAdapter.js';
import photoAdapter from './adapters/photoAdapter.js';
import backgroundAdapter from './adapters/backgroundAdapter.js';

// ホイール1刻みあたりのbaseMarginPercentの増減量(%)。写真上でのホイール操作用。
const MARGIN_WHEEL_STEP = 1;

const adaptersByType = {
    text: textAdapter,
    photo: photoAdapter,
    background: backgroundAdapter
};

// 拡大・回転ハンドルは小さいため、実際の描画サイズより広めの当たり判定半径を設ける（px）
const HANDLE_HIT_RADIUS = 10;

let dragState = null;

function toCanvasCoords(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
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

        // 選択中テキストの拡大・回転ハンドルへの当たり判定を、通常のオブジェクト選択より先に行う。
        // （ハンドルはそのオブジェクトが選択されている間だけ表示・有効なため）
        const handles = getTextHandles();
        if (handles) {
            if (distance(x, y, handles.resize.x, handles.resize.y) <= HANDLE_HIT_RADIUS) {
                const startValue = textAdapter.getTransform(handles.id);
                if (startValue) {
                    dragState = {
                        mode: 'resize', id: handles.id, center: handles.center,
                        startDist: distance(x, y, handles.center.x, handles.center.y),
                        startSize: startValue.size
                    };
                    canvas.setPointerCapture(e.pointerId);
                    canvas.classList.add('dragging-object');
                    return;
                }
            }
            if (distance(x, y, handles.rotate.x, handles.rotate.y) <= HANDLE_HIT_RADIUS) {
                const startValue = textAdapter.getTransform(handles.id);
                if (startValue) {
                    dragState = {
                        mode: 'rotate', id: handles.id, center: handles.center,
                        startAngle: Math.atan2(y - handles.center.y, x - handles.center.x),
                        startRotation: startValue.rotation
                    };
                    canvas.setPointerCapture(e.pointerId);
                    canvas.classList.add('dragging-object');
                    return;
                }
            }
        }

        // 選択中の写真のクロップハンドル（四隅、オンキャンバス直接トリミング）への当たり判定も、
        // テキストのハンドルと同様に通常のオブジェクト選択より先に行う。
        const cropHandles = getCropHandles();
        if (cropHandles) {
            for (const corner of Object.values(cropHandles.corners)) {
                if (distance(x, y, corner.x, corner.y) <= HANDLE_HIT_RADIUS) {
                    const startZoom = photoAdapter.getCropTransform().zoom;
                    dragState = {
                        mode: 'cropResize',
                        center: cropHandles.center,
                        startDist: distance(x, y, cropHandles.center.x, cropHandles.center.y),
                        startZoom
                    };
                    canvas.setPointerCapture(e.pointerId);
                    canvas.classList.add('dragging-object');
                    return;
                }
            }
        }

        const hit = interactionRegistry.hitTest(x, y);
        selectionStore.setSelectedId(hit ? hit.id : null);
        if (!hit) return;

        const adapter = adaptersByType[hit.type];
        if (!adapter) return;
        const startValue = adapter.getValue(hit.id);
        if (!startValue) return;

        dragState = { mode: 'move', id: hit.id, adapter, startClientX: e.clientX, startClientY: e.clientY, startValue, startBox: hit };
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add('dragging-object');
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!dragState) return;

        if (dragState.mode === 'resize') {
            const { x, y } = toCanvasCoords(canvas, e.clientX, e.clientY);
            const currentDist = distance(x, y, dragState.center.x, dragState.center.y);
            const scaleFactor = dragState.startDist > 0 ? currentDist / dragState.startDist : 1;
            textAdapter.commitResize(dragState.id, dragState.startSize, scaleFactor);
            return;
        }
        if (dragState.mode === 'cropResize') {
            const { x, y } = toCanvasCoords(canvas, e.clientX, e.clientY);
            const currentDist = distance(x, y, dragState.center.x, dragState.center.y);
            const scaleFactor = dragState.startDist > 0 ? currentDist / dragState.startDist : 1;
            photoAdapter.commitCropZoom(dragState.startZoom, scaleFactor);
            return;
        }
        if (dragState.mode === 'rotate') {
            const { x, y } = toCanvasCoords(canvas, e.clientX, e.clientY);
            const currentAngle = Math.atan2(y - dragState.center.y, x - dragState.center.x);
            let deltaDeg = (currentAngle - dragState.startAngle) * 180 / Math.PI;
            let newRotation = dragState.startRotation + deltaDeg;
            if (e.shiftKey) newRotation = Math.round(newRotation / 15) * 15; // Shiftで15度刻みにスナップ
            textAdapter.commitRotate(dragState.id, newRotation);
            return;
        }

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

    // 写真上でのホイール操作でbaseMarginPercent（余白）を調整する。
    // 写真以外の上ではpreventDefaultしないため、ページの通常スクロールは妨げない。
    canvas.addEventListener('wheel', (e) => {
        if (dragState) return;
        const { x, y } = toCanvasCoords(canvas, e.clientX, e.clientY);
        const hit = interactionRegistry.hitTest(x, y);
        if (!hit || hit.type !== 'photo') return;

        e.preventDefault();
        // 上スクロール(deltaY < 0)で写真を大きく＝余白を減らす、下スクロールで余白を増やす
        const delta = e.deltaY < 0 ? -MARGIN_WHEEL_STEP : MARGIN_WHEEL_STEP;
        photoAdapter.commitMarginDelta(delta);
    }, { passive: false });

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
