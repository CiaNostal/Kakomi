// js/interaction/adapters/backgroundAdapter.js
/**
 * backgroundAdapter.js
 * 拡大ぼかし背景の表示位置をドラッグ/nudgeで動かせるようにするアダプタ。
 *
 * imageBlurBackgroundParams.offsetXPercent/offsetYPercentは、textAdapterと同じ
 * 「写真短辺基準の%」の単位系（backgroundRenderer.jsのdrawBlurredImageBackgroundを参照）
 * なので、変換ロジックはtextAdapterと同一。
 */
import { getState, updateState } from '../../stateManager.js';

const backgroundAdapter = {
    type: 'background',

    getValue() {
        const p = getState().imageBlurBackgroundParams;
        return { offsetXPercent: p.offsetXPercent, offsetYPercent: p.offsetYPercent };
    },

    computeChanges(startValue, dxPx, dyPx, ctx) {
        if (!ctx || !ctx.photoShortSidePx) return startValue;
        const dxPercent = (dxPx / ctx.photoShortSidePx) * 100;
        const dyPercent = (dyPx / ctx.photoShortSidePx) * 100;
        return {
            offsetXPercent: startValue.offsetXPercent + dxPercent,
            offsetYPercent: startValue.offsetYPercent + dyPercent
        };
    },

    commit(id, changes) {
        updateState({ imageBlurBackgroundParams: changes });
    }
};

export default backgroundAdapter;
