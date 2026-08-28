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
import { controlsConfig } from '../../uiDefinitions.js';
import { resolveCropRect, resolveCropAspectValue } from '../../utils/cropRect.js';

// select モードの四隅 ■ ハンドルのドラッグ感度。
// 掴んだ隅を「中心→隅の方向」へ写真短辺ぶん動かすと、baseMarginPercent が
// 100% * この係数 だけ減る（外へ引く＝余白減＝写真が大きく）。手触りに応じて調整してよい。
const MARGIN_RESIZE_FACTOR = 1.0;

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
    },

    /**
     * 現在のクロップ矩形（元画像に対する割合 { x, y, w, h }）を取得する。
     * crop モードのハンドルドラッグ／パンの開始値として使う。
     */
    getCropRect() {
        const state = getState();
        return resolveCropRect(state.cropSettings, state.originalWidth, state.originalHeight);
    },

    /**
     * crop モードのハンドルドラッグに課す比率制約を取得する。
     * @returns {{aspectValue: number|null, imgAspectValue: number}}
     *   aspectValue: 望むクロップ比率（幅/高さ、元画像ピクセル基準）。'free' なら null。
     *   imgAspectValue: 元画像の 幅/高さ。
     */
    getCropConstraint() {
        const state = getState();
        const imgAspectValue = (state.originalWidth > 0 && state.originalHeight > 0)
            ? state.originalWidth / state.originalHeight : 1;
        return {
            aspectValue: resolveCropAspectValue(state.cropSettings.aspectRatio, state.originalWidth, state.originalHeight),
            imgAspectValue
        };
    },

    /** select モードの四隅 ■ ハンドルのドラッグ開始時点の baseMarginPercent。 */
    getMarginPercent() {
        return getState().baseMarginPercent;
    },

    /**
     * select モードの四隅 ■ ハンドルのドラッグによる「写真の拡大縮小」を baseMarginPercent の
     * 増減として反映する。中心→掴んだ隅の方向への符号付き移動量 projPx（プレビュー px）を使う。
     * projPx > 0（外へ引く）で余白減、< 0（内へ押す）で余白増。
     *
     * 旧実装は「中心からの距離比」を使っていたため、(a) マウス移動量と拡大縮小量が対応せず、
     * (b) 中心を通り越すと距離が再び増えて余白が逆に減る、という問題があった。符号付き投影量に
     * 変えることで単調（通り越しても反転しない）かつ移動量に比例した挙動になる。
     * @param {number} startMargin - ドラッグ開始時点の baseMarginPercent
     * @param {number} projPx - 中心→隅方向への符号付き移動量（プレビュー px、ドラッグ開始点からの差分）
     * @param {number} startShortSidePx - ドラッグ開始時点のプレビュー上の写真短辺（px）
     */
    commitMarginResizeByDrag(startMargin, projPx, startShortSidePx) {
        const { min, max } = controlsConfig.baseMarginPercent;
        const deltaPct = projPx * (100 / Math.max(1, startShortSidePx)) * MARGIN_RESIZE_FACTOR;
        const raw = startMargin - deltaPct;
        const newMargin = Math.round(Math.min(max, Math.max(min, raw)) * 10) / 10;
        updateState({ baseMarginPercent: newMargin });
    },

    /**
     * crop モードで算出した新しいクロップ矩形を反映する。
     * 比率制約のクランプ・[0,1] へのクランプは呼び出し側（canvasInteraction.js）が済ませた前提。
     * @param {{x:number,y:number,w:number,h:number}} rect
     */
    commitCropRect(rect) {
        updateState({ cropSettings: { rect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h } } });
    }
};

export default photoAdapter;
