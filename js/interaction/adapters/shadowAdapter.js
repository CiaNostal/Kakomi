// js/interaction/adapters/shadowAdapter.js
/**
 * shadowAdapter.js
 * 「フレーム」タブを開いているとき、プレビュー上の写真本体ドラッグで
 * 影のオフセット（frameSettings.shadowParams.offsetX / offsetY）を動かすためのアダプタ。
 *
 * offsetX / offsetY は写真短辺基準の %（-25〜25。frameRenderer.js／spec.md 7.4 節参照）で、
 * 単位系・変換ロジックは backgroundAdapter・textAdapter と同じ。影が無効（shadowEnabled === false）
 * のときはそもそも canvasInteraction.js 側でこのアダプタへ振らない。
 */
import { getState, updateState } from '../../stateManager.js';
import { controlsConfig } from '../../uiDefinitions.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const shadowAdapter = {
    type: 'shadow',

    getValue() {
        const p = getState().frameSettings.shadowParams;
        return { offsetX: p.offsetX, offsetY: p.offsetY };
    },

    computeChanges(startValue, dxPx, dyPx, ctx) {
        if (!ctx || !ctx.photoShortSidePx) return startValue;
        const { min, max } = controlsConfig.frameShadowOffsetX;
        const dxPercent = (dxPx / ctx.photoShortSidePx) * 100;
        const dyPercent = (dyPx / ctx.photoShortSidePx) * 100;
        // 0.1%単位に丸める（backgroundAdapter.computeChanges と同じ理由。割り算由来の
        // 循環小数をそのまま状態に持たせると、表示欄が桁あふれを起こすため）。
        return {
            offsetX: clamp(Math.round((startValue.offsetX + dxPercent) * 10) / 10, min, max),
            offsetY: clamp(Math.round((startValue.offsetY + dyPercent) * 10) / 10, min, max)
        };
    },

    /**
     * 各軸の影オフセットを中立(0)へ戻すために必要なドラッグ量(px)を返す。
     * canvasInteraction.js の原点スナップ（影ドラッグ時に 0 で赤い中央ガイドを出す）が使う。
     */
    originSnapPx(startValue, ctx) {
        const p = ctx && ctx.photoShortSidePx ? ctx.photoShortSidePx : 1;
        return {
            xPx: -(startValue.offsetX / 100) * p,
            yPx: -(startValue.offsetY / 100) * p
        };
    },

    commit(id, changes) {
        updateState({ frameSettings: { shadowParams: changes } });
    }
};

export default shadowAdapter;
