// js/interaction/snapEngine.js
/**
 * snapEngine.js
 * ドラッグ中のオブジェクトを、キャンバス中央線・キャンバス端・他オブジェクトの端/中央に
 * 吸着させるためのロジック。canvasInteraction.jsのpointermoveから、
 * 「ピクセル単位の移動量を確定する直前」に呼び出される想定。
 *
 * 対象の種類（テキスト/写真/背景）を問わず、バウンディングボックス同士の位置関係だけで
 * 判定するため、将来オブジェクトの種類が増えても変更不要。
 */

const SNAP_THRESHOLD_PX = 6;

/**
 * @param {{x:number, y:number, width:number, height:number}} candidateBox - スナップ適用前の候補位置
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {Array<{x:number, y:number, width:number, height:number}>} otherBoxes - 吸着先候補（自分自身は除く）
 * @returns {{dx: number, dy: number, guideLines: Array<{axis:'x'|'y', value:number}>}}
 */
export function computeSnapCorrection(candidateBox, canvasWidth, canvasHeight, otherBoxes) {
    const xEdges = [candidateBox.x, candidateBox.x + candidateBox.width / 2, candidateBox.x + candidateBox.width];
    const yEdges = [candidateBox.y, candidateBox.y + candidateBox.height / 2, candidateBox.y + candidateBox.height];

    const xTargets = [0, canvasWidth / 2, canvasWidth];
    const yTargets = [0, canvasHeight / 2, canvasHeight];
    for (const b of otherBoxes) {
        xTargets.push(b.x, b.x + b.width / 2, b.x + b.width);
        yTargets.push(b.y, b.y + b.height / 2, b.y + b.height);
    }

    let bestDx = 0, bestDxDist = SNAP_THRESHOLD_PX, snappedXValue = null;
    for (const edge of xEdges) {
        for (const target of xTargets) {
            const dist = Math.abs(edge - target);
            if (dist < bestDxDist) {
                bestDxDist = dist;
                bestDx = target - edge;
                snappedXValue = target;
            }
        }
    }

    let bestDy = 0, bestDyDist = SNAP_THRESHOLD_PX, snappedYValue = null;
    for (const edge of yEdges) {
        for (const target of yTargets) {
            const dist = Math.abs(edge - target);
            if (dist < bestDyDist) {
                bestDyDist = dist;
                bestDy = target - edge;
                snappedYValue = target;
            }
        }
    }

    const guideLines = [];
    if (snappedXValue !== null) guideLines.push({ axis: 'x', value: snappedXValue });
    if (snappedYValue !== null) guideLines.push({ axis: 'y', value: snappedYValue });

    return { dx: bestDx, dy: bestDy, guideLines };
}
