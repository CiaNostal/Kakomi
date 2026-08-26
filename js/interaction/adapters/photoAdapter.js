// js/interaction/adapters/photoAdapter.js
/**
 * photoAdapter.js
 * 写真本体（枠内でのスライド位置）をドラッグ/nudgeで動かせるようにするアダプタ。
 *
 * photoViewParams.offsetX/offsetYは「可動範囲(movable width/height)に対する0.0〜1.0の割合」
 * という単位系（layoutCalculator.jsのcalculateLayoutを参照）。これはtextAdapterの
 * 「写真短辺基準の%」とは異なる単位系のため、ここではoutputCanvasConfigとphotoDrawConfigから
 * 可動範囲を求め、プレビューpxの移動量をこの割合に変換している。
 */
import { getState, updateState } from '../../stateManager.js';

function clamp01(v) {
    return Math.min(1, Math.max(0, v));
}

const photoAdapter = {
    type: 'photo',

    getValue() {
        const { offsetX, offsetY } = getState().photoViewParams;
        return { offsetX, offsetY };
    },

    computeChanges(startValue, dxPx, dyPx, ctx) {
        const state = getState();
        const { destWidth, destHeight } = state.photoDrawConfig;
        const outputWidth = state.outputCanvasConfig.width;
        const outputHeight = state.outputCanvasConfig.height;
        const scale = (ctx && ctx.scale) || 1;

        // 可動範囲（出力解像度基準）をプレビューpx空間に変換
        const movableWidthPreview = (outputWidth - destWidth) * scale;
        const movableHeightPreview = (outputHeight - destHeight) * scale;

        let offsetX = startValue.offsetX;
        let offsetY = startValue.offsetY;
        if (movableWidthPreview > 0) {
            offsetX = clamp01(startValue.offsetX + dxPx / movableWidthPreview);
        }
        if (movableHeightPreview > 0) {
            offsetY = clamp01(startValue.offsetY + dyPx / movableHeightPreview);
        }
        return { offsetX, offsetY };
    },

    commit(id, changes) {
        updateState({ photoViewParams: { offsetX: changes.offsetX, offsetY: changes.offsetY } });
    }
};

export default photoAdapter;
