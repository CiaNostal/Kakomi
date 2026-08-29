// js/interaction/photoEditModeStore.js
/**
 * photoEditModeStore.js
 * 写真が選択されているときの「編集サブモード」を保持する一時 UI 状態。
 * selectionStore.js / photoCropStore.js と同じ「描画側・操作側が共有する一時状態」パターン。
 *
 * - 'select': 通常。四隅は ■ ハンドル（ドラッグ＝余白 baseMarginPercent の増減）。
 *             写真本体ドラッグ＝出力枠内での写真位置（photoViewParams）。
 * - 'crop':   トリミング編集中。四隅は L 字ハンドル（ドラッグ＝クロップ矩形の変更）。
 *             写真本体ドラッグ＝クロップ矩形に対する写真のパン（cropSettings.rect.x/y）。
 *             クロップ枠内だけ明るく、外は暗い周辺減光オーバーレイを表示する。
 *
 * モードの切り替えはプレビュー上での「ドラッグを伴わないクリック」で行う
 * （canvasInteraction.js）。写真の選択が外れたら select に戻す（main.js で配線）。
 *
 * frozenFrame: crop モードに入った瞬間のプレビュー座標のスナップショット。
 *   Kakomi は「出力枠＝写真＋余白、余白は写真短辺に対する％」というモデルのため、
 *   クロップ矩形を小さくしても画面上の写真ボックスの大きさはほぼ変わらない（余白が比例して
 *   縮むだけ）。そのままライブに再レイアウトすると「内側へドラッグしているのに枠が縮まない」
 *   という体験になる。これを避けるため、crop モード中の描画・当たり判定は frozenFrame を
 *   基準に固定し、モード終了時に一度だけ通常レイアウトへ戻す（PowerPoint の「確定」に相当）。
 *   形: { scale:number, photoBox0:{x,y,width,height}, rect0:{x,y,w,h} }
 *   （photoBox0 はプレビュー px、rect0 は crop モード開始時の cropSettings 由来の矩形）
 */

let mode = 'select';
let frozenFrame = null;
const listeners = [];

function notify() {
    for (const fn of listeners) fn(mode);
}

/** @returns {'select'|'crop'} */
export function getMode() {
    return mode;
}

export function isCropMode() {
    return mode === 'crop';
}

/** crop モードに入る。frozenFrame は canvasRenderer が組み立てたスナップショット。 */
export function enterCrop(snapshot) {
    frozenFrame = snapshot || null;
    if (mode !== 'crop') {
        mode = 'crop';
        notify();
    }
}

/** crop モードを抜けて select に戻す。 */
export function exitCrop() {
    frozenFrame = null;
    if (mode !== 'select') {
        mode = 'select';
        notify();
    }
}

/** 写真の選択が外れたときなどに、モードを初期状態へ戻す。 */
export function reset() {
    exitCrop();
}

export function getFrozenFrame() {
    return frozenFrame;
}

/**
 * frozenFrame を更新する。crop モード継続中に、プレビューがリサイズされて
 * スケールが変わった場合などに描画側から呼び直す用途。
 */
export function setFrozenFrame(snapshot) {
    frozenFrame = snapshot || null;
}

export function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
}
