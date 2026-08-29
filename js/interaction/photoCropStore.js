// js/interaction/photoCropStore.js
/**
 * photoCropStore.js
 * 写真選択中に表示する四隅ハンドルの座標（previewCanvas の px 空間）を一時的に保持する。
 * canvasRenderer.js の drawPreview が描画のたびに書き込み、
 * canvasInteraction.js の pointerdown がハンドルへの当たり判定に読み取る。
 *
 * select モードでは ■ リサイズハンドル（ドラッグ＝余白）、crop モードでは L 字ハンドル
 * （ドラッグ＝クロップ矩形の変更）と、モードによって見た目と挙動は変わるが、四隅の座標を
 * 共有ストアに置いて同じ当たり判定経路で拾う点は共通。
 *
 * crop モードのときは追加で cropScreen（現在のクロップ矩形の画面矩形）と
 * whole（元画像全体の画面矩形）も入る。canvasInteraction.js が本体パン・ハンドルドラッグの
 * 座標変換に使う。
 *
 * textHandleStore.js と同じ「描画側が書き、操作側が読む」の一時状態パターン。
 * A-4 で、select モードの写真には回転ハンドル（rotate）も持たせるようになった。四隅の座標も
 * 回転適用後の画面 px で記録する（crop モードの L 字ハンドルは従来どおり回転なし）。
 */
let cropHandles = null;
// { corners: { tl, tr, bl, br }, center: {x,y}, rotate?: {x,y},
//   cropScreen?: {x,y,width,height}, whole?: {x,y,width,height} } | null

/**
 * @param {{corners: {tl:{x,y},tr:{x,y},bl:{x,y},br:{x,y}}, center:{x:number,y:number},
 *   rotate?:{x:number,y:number},
 *   cropScreen?:{x:number,y:number,width:number,height:number},
 *   whole?:{x:number,y:number,width:number,height:number}}|null} h
 */
export function setCropHandles(h) {
    cropHandles = h || null;
}

export function getCropHandles() {
    return cropHandles;
}

export function clearCropHandles() {
    cropHandles = null;
}
