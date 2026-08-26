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
     * 写真の四隅ハンドルのドラッグ開始時点のクロップズーム値を取得する
     * （オンキャンバス直接トリミング用。5.12節以降のインタラクション基盤におけるgetTransform相当）。
     */
    getCropTransform() {
        return { zoom: getState().cropSettings.zoom };
    },

    /**
     * 写真の四隅ハンドルのドラッグによるクロップズーム変更を反映する。
     * ハンドルを中心から遠ざける=ズームアウト（元画像をより広く使う）、
     * 近づける=ズームイン（寄る）という直感的な操作にするため、
     * scaleFactor（ドラッグ開始時距離に対する現在距離の比）の逆数をズームに掛ける。
     * これはtextAdapter.commitResize()とは逆方向の関係になる点に注意
     * （テキストはハンドルを遠ざけるほど直接サイズが大きくなるが、
     * 写真のクロップズームは「見た目のボックスサイズ」ではなく「元画像からの切り出し倍率」を
     * 表すため、ボックスを大きく見せたい＝ズーム値を下げる、という逆相関になる）。
     * @param {number} startZoom - ドラッグ開始時点のcropSettings.zoom
     * @param {number} scaleFactor - 開始時距離に対する現在距離の比
     */
    commitCropZoom(startZoom, scaleFactor) {
        const { min, max } = controlsConfig.cropZoom;
        const factor = scaleFactor > 0 ? scaleFactor : 1;
        const newZoom = Math.round(Math.min(max, Math.max(min, startZoom / factor)) * 100) / 100;
        updateState({ cropSettings: { zoom: newZoom } });
    },

    /**
     * 写真上でのホイール操作によるbaseMarginPercent（余白）の調整。
     * クロップズームと異なり、余白は写真の見た目のボックスサイズに直接効くため
     * （5.4節参照）、「写真の大きさを変える」という操作感にはこちらが対応する。
     * @param {number} deltaPercent - 1ホイール刻みあたりの増減量（%）
     */
    commitMarginDelta(deltaPercent) {
        const { min, max } = controlsConfig.baseMarginPercent;
        const current = getState().baseMarginPercent;
        const newMargin = Math.round(Math.min(max, Math.max(min, current + deltaPercent)) * 10) / 10;
        updateState({ baseMarginPercent: newMargin });
    }
};

export default photoAdapter;
