// js/interaction/textHandleStore.js
/**
 * textHandleStore.js
 * 選択中の自由テキストレイヤーに表示する「拡大ハンドル」「回転ハンドル」の
 * 画面上の座標（回転適用後、previewCanvasのpx空間）を一時的に保持する。
 * canvasRenderer.jsのdrawPreviewが描画のたびに書き込み、
 * canvasInteraction.jsのpointerdownがハンドルへの当たり判定に読み取る。
 *
 * guideStore.jsと同じ「描画側が書き、操作側が読む」の一時状態パターン。
 */
let handles = null; // { id, center: {x,y}, resize: {x,y}, rotate: {x,y} } | null

/** @param {{id: string, center: {x:number,y:number}, resize: {x:number,y:number}, rotate: {x:number,y:number}}|null} h */
export function setTextHandles(h) {
    handles = h || null;
}

export function getTextHandles() {
    return handles;
}

export function clearTextHandles() {
    handles = null;
}
