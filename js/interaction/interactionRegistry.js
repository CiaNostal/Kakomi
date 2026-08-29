// js/interaction/interactionRegistry.js
/**
 * interactionRegistry.js
 * 直近の描画（drawPreview）で描かれたインタラクティブなオブジェクトの
 * バウンディングボックスを記録する帳簿。ヒットテスト（クリック/ドラッグ開始判定）に使う。
 *
 * immediate-mode描画（毎回全部描き直す）方式を変えずに当たり判定を持たせるため、
 * 「描画するたびにこの帳簿を作り直す」という運用にしている。
 */

import { rotatePoint } from '../utils/geometry.js';

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
 * 指定座標にヒットする最前面のオブジェクトを返す。
 * エントリが`rotation`（度）を持つ場合、クリック座標をボックス中心を軸に逆回転させてから
 * 判定する（=ボックス自体は常に「回転前のローカル座標系」でx/y/width/heightを保持する）。
 * @param {number} px
 * @param {number} py
 * @returns {{id: string, type: string, x: number, y: number, width: number, height: number, rotation?: number}|null}
 */
export function hitTest(px, py) {
    for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        let testX = px, testY = py;
        if (b.rotation) {
            const cx = b.x + b.width / 2;
            const cy = b.y + b.height / 2;
            const local = rotatePoint(px, py, cx, cy, -b.rotation);
            testX = local.x;
            testY = local.y;
        }
        if (testX >= b.x && testX <= b.x + b.width && testY >= b.y && testY <= b.y + b.height) {
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
