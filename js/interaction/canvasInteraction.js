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
import * as photoEditModeStore from './photoEditModeStore.js';
import { setActiveGuides, clearActiveGuides } from './guideStore.js';
import { computeSnapCorrection } from './snapEngine.js';
import { getLastPreviewContext } from '../canvasRenderer.js';
import { isEditableElement } from '../utils/domUtils.js';
import { getTextHandles } from './textHandleStore.js';
import { getCropHandles } from './photoCropStore.js';
import { clampRect, resizeCropRect } from '../utils/cropRect.js';
import textAdapter from './adapters/textAdapter.js';
import photoAdapter from './adapters/photoAdapter.js';
import backgroundAdapter from './adapters/backgroundAdapter.js';

// ホイール1刻みあたりのbaseMarginPercentの増減量(%)。写真上でのホイール操作用。
const MARGIN_WHEEL_STEP = 1;

// pointerdown→pointerup の移動量がこの px 未満なら「ドラッグではなくクリック」とみなす。
// 選択モード↔クロップモードの切り替えはこのクリック判定で行う。
const CLICK_MOVE_THRESHOLD = 4;

function pointInRect(px, py, r) {
    return r && px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
}

const adaptersByType = {
    text: textAdapter,
    photo: photoAdapter,
    background: backgroundAdapter
};

// 拡大・回転ハンドルは小さいため、実際の描画サイズより広めの当たり判定半径を設ける（px）
const HANDLE_HIT_RADIUS = 10;

let dragState = null;
// pointerdown 時点の情報。pointerup でドラッグ量がわずかなら「クリック」とみなし、
// 選択モード↔クロップモードの切り替えに使う。
let pointerDownCtx = null;

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

        // 写真が選択されているときの、四隅ハンドル／クロップ操作の当たり判定。
        // photoEditModeStore のモード（select / crop）で挙動を切り替える。
        const editMode = photoEditModeStore.getMode();
        const photoSelected = selectionStore.getSelectedId() === 'photo';
        const cropHandles = getCropHandles();

        pointerDownCtx = {
            clientX: e.clientX, clientY: e.clientY,
            modeAtDown: editMode,
            photoWasSelected: photoSelected,
            onPhotoBody: false,
            cropExitCandidate: false
        };

        // --- crop モード: L 字ハンドルでクロップ矩形をリサイズ / クロップ窓内で写真をパン ---
        if (editMode === 'crop' && photoSelected && cropHandles && cropHandles.whole) {
            let grabbedCorner = null;
            for (const key of ['tl', 'tr', 'bl', 'br']) {
                const c = cropHandles.corners[key];
                if (c && distance(x, y, c.x, c.y) <= HANDLE_HIT_RADIUS) { grabbedCorner = key; break; }
            }
            if (grabbedCorner) {
                const { aspectValue, imgAspectValue } = photoAdapter.getCropConstraint();
                dragState = {
                    mode: 'cropRectResize',
                    corner: grabbedCorner,
                    startRect: photoAdapter.getCropRect(),
                    whole: cropHandles.whole,
                    aspectValue, imgAspectValue,
                    startX: x, startY: y
                };
                canvas.setPointerCapture(e.pointerId);
                canvas.classList.add('dragging-object');
                return;
            }
            if (pointInRect(x, y, cropHandles.cropScreen)) {
                dragState = {
                    mode: 'cropPan',
                    startRect: photoAdapter.getCropRect(),
                    whole: cropHandles.whole,
                    startX: x, startY: y
                };
                canvas.setPointerCapture(e.pointerId);
                canvas.classList.add('dragging-object');
                return;
            }
            // ハンドルでもクロップ窓内でもない = 枠の外。ドラッグは開始せず、
            // pointerup でクリックとみなされたら crop モードを確定して抜ける。
            pointerDownCtx.cropExitCandidate = true;
            return;
        }

        // --- select モード: 四隅 ■ ハンドルのドラッグ = 余白（baseMarginPercent）の増減 ---
        if (editMode === 'select' && photoSelected && cropHandles) {
            for (const corner of Object.values(cropHandles.corners)) {
                if (distance(x, y, corner.x, corner.y) <= HANDLE_HIT_RADIUS) {
                    // 「中心 → 掴んだ隅」方向の単位ベクトル。以降このベクトルへの符号付き投影量で
                    // 余白を動かす（中心を通り越しても反転しない・移動量に比例する）。
                    const cx = cropHandles.center.x, cy = cropHandles.center.y;
                    const len = Math.hypot(corner.x - cx, corner.y - cy) || 1;
                    dragState = {
                        mode: 'photoResize',
                        startPointer: { x, y },
                        u: { x: (corner.x - cx) / len, y: (corner.y - cy) / len },
                        startMargin: photoAdapter.getMarginPercent(),
                        startShortSide: getLastPreviewContext().photoShortSidePx || 1
                    };
                    canvas.setPointerCapture(e.pointerId);
                    canvas.classList.add('dragging-object');
                    return;
                }
            }
        }

        // --- 通常のオブジェクト選択・移動 ---
        const hit = interactionRegistry.hitTest(x, y);
        selectionStore.setSelectedId(hit ? hit.id : null);
        if (!hit) return;
        if (hit.id === 'photo') pointerDownCtx.onPhotoBody = true;

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
        if (dragState.mode === 'photoResize') {
            const { x, y } = toCanvasCoords(canvas, e.clientX, e.clientY);
            // ドラッグ開始点からの移動量を「中心→隅」方向へ符号付き投影する
            const proj = (x - dragState.startPointer.x) * dragState.u.x
                + (y - dragState.startPointer.y) * dragState.u.y;
            photoAdapter.commitMarginResizeByDrag(dragState.startMargin, proj, dragState.startShortSide);
            return;
        }
        if (dragState.mode === 'cropRectResize') {
            const { x, y } = toCanvasCoords(canvas, e.clientX, e.clientY);
            const w = dragState.whole;
            const fdx = w.width > 0 ? (x - dragState.startX) / w.width : 0;
            const fdy = w.height > 0 ? (y - dragState.startY) / w.height : 0;
            const rect = resizeCropRect(
                dragState.startRect, dragState.corner, fdx, fdy,
                dragState.aspectValue, dragState.imgAspectValue
            );
            photoAdapter.commitCropRect(rect);
            return;
        }
        if (dragState.mode === 'cropPan') {
            const { x, y } = toCanvasCoords(canvas, e.clientX, e.clientY);
            const w = dragState.whole;
            const fdx = w.width > 0 ? (x - dragState.startX) / w.width : 0;
            const fdy = w.height > 0 ? (y - dragState.startY) / w.height : 0;
            const s = dragState.startRect;
            // ドラッグ方向にクロップ窓が動く（右へドラッグ＝クロップ窓が右へ）。
            const rect = clampRect({ x: s.x + fdx, y: s.y + fdy, w: s.w, h: s.h });
            photoAdapter.commitCropRect(rect);
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

    // crop モードに入る。現在のプレビュー座標（写真ボックス・スケール・クロップ矩形）を
    // frozenFrame としてスナップショットし、以降 crop モード中の描画・当たり判定の基準にする。
    function enterCropMode() {
        const photoBox = interactionRegistry.getById('photo');
        if (!photoBox) return;
        const { scale } = getLastPreviewContext();
        photoEditModeStore.enterCrop({
            scale: scale || 1,
            photoBox0: { x: photoBox.x, y: photoBox.y, width: photoBox.width, height: photoBox.height },
            rect0: photoAdapter.getCropRect()
        });
    }

    canvas.addEventListener('pointerup', (e) => {
        const pd = pointerDownCtx;
        pointerDownCtx = null;
        endDrag();
        if (!pd) return;

        // ドラッグ量がわずかなときだけ「クリック」とみなしてモードを切り替える
        const moved = Math.hypot(e.clientX - pd.clientX, e.clientY - pd.clientY);
        if (moved > CLICK_MOVE_THRESHOLD) return;

        if (pd.modeAtDown === 'select' && pd.photoWasSelected && pd.onPhotoBody) {
            // 選択済みの写真をもう一度クリック → クロップモードへ
            enterCropMode();
        } else if (pd.modeAtDown === 'crop' && pd.cropExitCandidate) {
            // クロップ窓の外をクリック → クロップ確定（select モードへ戻る）。
            // 出力枠のアスペクト比は変えない（枠は固定、中の写真だけがクロップされる）。
            photoEditModeStore.exitCrop();
        }
    });
    canvas.addEventListener('pointercancel', () => { pointerDownCtx = null; endDrag(); });

    // 写真上でのホイール操作でbaseMarginPercent（余白）を調整する。
    // 写真以外の上ではpreventDefaultしないため、ページの通常スクロールは妨げない。
    canvas.addEventListener('wheel', (e) => {
        if (dragState) return;
        if (photoEditModeStore.isCropMode()) return; // crop モード中はホイールで余白を動かさない
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

        // Esc: crop モードを抜けて select モードへ戻す（出力枠は変えない）
        if (e.key === 'Escape' && photoEditModeStore.isCropMode()) {
            e.preventDefault();
            photoEditModeStore.exitCrop();
            return;
        }

        const selectedId = selectionStore.getSelectedId();
        if (!selectedId) return;

        let dxPx = 0, dyPx = 0;
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft') dxPx = -step;
        else if (e.key === 'ArrowRight') dxPx = step;
        else if (e.key === 'ArrowUp') dyPx = -step;
        else if (e.key === 'ArrowDown') dyPx = step;
        else return;

        // crop モードで写真を選択中: 矢印はクロップ矩形のパン（本体ドラッグと同じ向き）
        if (photoEditModeStore.isCropMode() && selectedId === 'photo') {
            const hh = getCropHandles();
            if (!hh || !hh.whole) return;
            e.preventDefault();
            const s = photoAdapter.getCropRect();
            const rect = clampRect({
                x: s.x + dxPx / hh.whole.width,
                y: s.y + dyPx / hh.whole.height,
                w: s.w, h: s.h
            });
            photoAdapter.commitCropRect(rect);
            return;
        }

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
