// js/interaction/guideStore.js
/**
 * guideStore.js
 * ドラッグ中に表示するスナップガイド線の情報を一時的に保持する。
 * canvasInteraction.jsが書き込み、canvasRenderer.jsのdrawPreviewが読み取って描画する。
 */
let activeGuides = [];

/** @param {Array<{axis: 'x'|'y', value: number}>} lines */
export function setActiveGuides(lines) {
    activeGuides = lines || [];
}

export function getActiveGuides() {
    return activeGuides;
}

export function clearActiveGuides() {
    activeGuides = [];
}
