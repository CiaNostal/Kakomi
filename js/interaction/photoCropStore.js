// js/interaction/photoCropStore.js
/**
 * photoCropStore.js
 * 写真選択中に表示する「オンキャンバス直接トリミング」オーバーレイの、
 * クロップ矩形の四隅ハンドル座標（previewCanvasのpx空間）を一時的に保持する。
 * canvasRenderer.jsのdrawPreviewが描画のたびに書き込み、
 * canvasInteraction.jsのpointerdownがハンドルへの当たり判定に読み取る。
 *
 * textHandleStore.jsと同じ「描画側が書き、操作側が読む」の一時状態パターン。
 * 写真のクロップ矩形は回転しないため、textHandleStoreと異なり回転ハンドルは持たない。
 */
let cropHandles = null; // { corners: { tl, tr, bl, br }, center: {x,y} } | null

/** @param {{corners: {tl:{x,y},tr:{x,y},bl:{x,y},br:{x,y}}, center:{x:number,y:number}}|null} h */
export function setCropHandles(h) {
    cropHandles = h || null;
}

export function getCropHandles() {
    return cropHandles;
}

export function clearCropHandles() {
    cropHandles = null;
}
