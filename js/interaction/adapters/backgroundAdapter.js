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
        // 0.1%単位に丸める（textAdapter.jsのcomputeChangesと同じ理由。割り算由来の
        // 循環小数をそのまま状態に持たせると、表示欄が桁あふれを起こすため）。
        return {
            offsetXPercent: Math.round((startValue.offsetXPercent + dxPercent) * 10) / 10,
            offsetYPercent: Math.round((startValue.offsetYPercent + dyPercent) * 10) / 10
        };
    },

    /**
     * 各軸のオフセットを中立(0)へ戻すために必要なドラッグ量(px)を返す。
     * canvasInteraction.js の原点スナップ（背景ドラッグ時に 0 で赤い中央ガイドを出す）が使う。
     */
    originSnapPx(startValue, ctx) {
        const p = ctx && ctx.photoShortSidePx ? ctx.photoShortSidePx : 1;
        return {
            xPx: -(startValue.offsetXPercent / 100) * p,
            yPx: -(startValue.offsetYPercent / 100) * p
        };
    },

    commit(id, changes) {
        updateState({ imageBlurBackgroundParams: changes });
    }
};

export default backgroundAdapter;
