// js/interaction/adapters/textAdapter.js
/**
 * textAdapter.js
 * 自由テキストレイヤー（customTexts）を、ドラッグ/キーボードnudgeの
 * 共通コントローラ（canvasInteraction.js）から一様に扱えるようにする変換層。
 *
 * テキストのoffsetX/offsetYは「写真短辺基準の%」という単位系（textRenderer.jsの
 * calculateTextPositionと同じ）で保持されているため、プレビューpx単位のドラッグ量を
 * ここで変換してから状態に書き戻す。
 */
import { getState, updateCustomTextLayer } from '../../stateManager.js';

const textAdapter = {
    type: 'text',

    /** 現在のオフセット値を取得する */
    getValue(id) {
        const layer = getState().textSettings.customTexts.find(t => t.id === id);
        if (!layer) return null;
        return { offsetX: layer.offsetX, offsetY: layer.offsetY };
    },

    /**
     * ドラッグ/nudgeの移動量から新しいオフセット値を計算する。
     *
     * dxPx/dyPxとctx.photoShortSidePxは、どちらも「プレビューcanvasのpx空間」で
     * 揃っている前提（getLastPreviewContext()のphotoShortSidePxは、写真の実解像度ではなく
     * プレビュー描画時に縮小された後の短辺pxを返す）。そのため、ここでscaleによる
     * 再変換は不要で、単純な比率計算だけで「プレビュー上でドラッグした分だけ画面上で動く」
     * 一致した挙動になる。
     * @param {{offsetX:number, offsetY:number}} startValue - ドラッグ開始時点の値
     * @param {number} dxPx - X方向の移動量（プレビューcanvasのpx）
     * @param {number} dyPx - Y方向の移動量（同上）
     * @param {{photoShortSidePx:number}} ctx - getLastPreviewContext()の戻り値
     */
    computeChanges(startValue, dxPx, dyPx, ctx) {
        if (!ctx || !ctx.photoShortSidePx) return startValue;
        const dxPercent = (dxPx / ctx.photoShortSidePx) * 100;
        const dyPercent = (dyPx / ctx.photoShortSidePx) * 100;
        return {
            offsetX: startValue.offsetX + dxPercent,
            offsetY: startValue.offsetY + dyPercent
        };
    },

    /** 変更を実際の状態に書き戻す */
    commit(id, changes) {
        updateCustomTextLayer(id, changes);
    }
};

export default textAdapter;
