// js/utils/geometry.js
/**
 * geometry.js
 * 回転を伴う当たり判定・ハンドル配置で共通して使う、小さな幾何ヘルパー。
 */

/**
 * 点(x, y)を、中心(cx, cy)を軸にangleDeg度（時計回り、Canvas座標系）回転させた座標を返す。
 * 逆回転させたい場合は-angleDegを渡す（例: 回転済みオブジェクトへの当たり判定で、
 * クリック座標を「回転前のローカル座標」に戻す用途）。
 * @param {number} x
 * @param {number} y
 * @param {number} cx - 回転の中心X
 * @param {number} cy - 回転の中心Y
 * @param {number} angleDeg - 回転角（度）
 * @returns {{x: number, y: number}}
 */
export function rotatePoint(x, y, cx, cy, angleDeg) {
    if (!angleDeg) return { x, y };
    const rad = angleDeg * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = x - cx;
    const dy = y - cy;
    return {
        x: cx + dx * cos - dy * sin,
        y: cy + dx * sin + dy * cos
    };
}
