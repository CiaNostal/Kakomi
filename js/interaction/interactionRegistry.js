// js/interaction/interactionRegistry.js
/**
 * interactionRegistry.js
 * 直近の描画（drawPreview）で描かれたインタラクティブなオブジェクトの
 * バウンディングボックスを記録する帳簿。ヒットテスト（クリック/ドラッグ開始判定）に使う。
 *
 * immediate-mode描画（毎回全部描き直す）方式を変えずに当たり判定を持たせるため、
 * 「描画するたびにこの帳簿を作り直す」という運用にしている。
 */

let boxes = [];

/** 帳簿を空にする（drawPreviewの冒頭で呼ぶ） */
export function clear() {
    boxes = [];
}

/**
 * オブジェクトの矩形を登録する（描画順=z順に積むこと）
 * @param {{id: string, type: string, x: number, y: number, width: number, height: number}} entry
 */
export function register(entry) {
    boxes.push(entry);
}

/**
 * 指定座標にヒットする最前面のオブジェクトを返す
 * @param {number} px
 * @param {number} py
 * @returns {{id: string, type: string, x: number, y: number, width: number, height: number}|null}
 */
export function hitTest(px, py) {
    for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        if (px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height) {
            return b;
        }
    }
    return null;
}

/** idからバウンディングボックスを取得する */
export function getById(id) {
    return boxes.find(b => b.id === id) || null;
}

/** 登録済みの全オブジェクトを返す（スナップ機能などで将来使用） */
export function getAll() {
    return boxes;
}
