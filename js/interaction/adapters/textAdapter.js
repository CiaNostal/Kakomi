// js/interaction/adapters/textAdapter.js
/**
 * textAdapter.js
 * テキストレイヤー（textSettings.layers[]）を、ドラッグ/キーボードnudgeの
 * 共通コントローラ（canvasInteraction.js）から一様に扱えるようにする変換層。
 *
 * テキストのoffsetX/offsetYは「写真短辺基準の%」という単位系（textRenderer.jsの
 * calculateTextPositionと同じ）で保持されているため、プレビューpx単位のドラッグ量を
 * ここで変換してから状態に書き戻す。
 */
import { getState, updateTextLayer } from '../../stateManager.js';
import { controlsConfig } from '../../uiDefinitions.js';

// バケット4: 撮影日・Exif・自由テキストは1本の textSettings.layers[] に統合されたため、
// id（レイヤーの uuid）で引くだけでよい。

/** idから位置(offsetX/offsetY)を持つレイヤーを取得する（read-only参照） */
function resolveLayer(id) {
    return getState().textSettings.layers.find(l => l.id === id) || null;
}

/** 変更をレイヤーへ書き戻す */
function applyChanges(id, changes) {
    updateTextLayer(id, changes);
}

const textAdapter = {
    type: 'text',

    /** 現在のオフセット値を取得する */
    getValue(id) {
        const layer = resolveLayer(id);
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
        // 0.1%単位に丸める。丸めないとpx/photoShortSidePxの割り算由来の循環小数がそのまま
        // 状態に蓄積し、表示欄が有効数字ギリギリまで表示されて桁あふれを起こすため
        // （ドラッグだけでなく矢印キーnudgeもこのcomputeChangesを通るので、両方に効く）。
        return {
            offsetX: Math.round((startValue.offsetX + dxPercent) * 10) / 10,
            offsetY: Math.round((startValue.offsetY + dyPercent) * 10) / 10
        };
    },

    /** 変更を実際の状態に書き戻す */
    commit(id, changes) {
        applyChanges(id, changes);
    },

    /**
     * 拡大・回転ハンドルのドラッグ開始時点の値（サイズ・回転角）を取得する。
     * canvasInteraction.jsがドラッグ開始時の基準値として保持する。
     */
    getTransform(id) {
        const layer = resolveLayer(id);
        if (!layer) return null;
        return { size: layer.size, rotation: layer.rotation || 0 };
    },

    /**
     * 拡大ハンドルのドラッグによるサイズ変更を反映する。
     * 中心からハンドルまでの距離の比（scaleFactor）を開始時点のサイズに掛けることで、
     * 回転角に関わらず「ハンドルを中心から遠ざける/近づける」という直感的な拡大縮小になる。
     * クランプ範囲は対象（自由テキスト/撮影日/Exif）ごとに異なるスライダー範囲に合わせる。
     * @param {string} id
     * @param {number} startSize - ドラッグ開始時点のsize（%）
     * @param {number} scaleFactor - 開始時距離に対する現在距離の比
     */
    commitResize(id, startSize, scaleFactor) {
        const { min, max } = controlsConfig.textLayerSize;
        const newSize = Math.round(Math.min(max, Math.max(min, startSize * scaleFactor)) * 100) / 100;
        applyChanges(id, { size: newSize });
    },

    /**
     * 回転ハンドルのドラッグによる回転角の変更を反映する。
     * @param {string} id
     * @param {number} newRotationDeg
     */
    commitRotate(id, newRotationDeg) {
        applyChanges(id, { rotation: Math.round(newRotationDeg * 10) / 10 });
    }
};

export default textAdapter;
