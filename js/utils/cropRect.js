// js/utils/cropRect.js
/**
 * cropRect.js
 * クロップ矩形まわりの純粋な幾何ヘルパー。
 *
 * クロップ矩形は「元画像に対する割合」 { x, y, w, h }（いずれも 0–1、x/y は左上、
 * w/h はサイズ）で表す。これが cropSettings.rect の唯一の表現であり、
 * layoutCalculator が sourceX/Y/Width/Height を求める際の入力になる。
 *
 * 2026-08-28 のトリミング再設計より前は cropSettings が { aspectRatio, zoom, offsetX, offsetY }
 * だった。resolveCropRect / migrateCropSettings はこの旧形式からの後方互換・移行を担う。
 */

export const FULL_RECT = { x: 0, y: 0, w: 1, h: 1 };

function clamp01(v) {
    return Math.min(1, Math.max(0, v));
}

/**
 * アスペクト比文字列を数値（幅/高さ）に変換する。
 * 'free' / 'original' / 空 / 不正な文字列は null（＝比率の制約なし）を返す。
 * 'custom:' プレフィックスは後方互換のため取り除く。
 * @param {string} str
 * @returns {number|null}
 */
export function parseAspectRatio(str) {
    if (!str || str === 'free' || str === 'original') return null;
    const clean = str.startsWith('custom:') ? str.slice(7) : str;
    const parts = clean.split(':');
    if (parts.length !== 2) return null;
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return null;
    return w / h;
}

/**
 * 値が有効なクロップ矩形（0–1 の割合、正のサイズ、[0,1] にほぼ収まっている）かどうか。
 * @param {*} r
 * @returns {boolean}
 */
export function isValidRect(r) {
    if (!r || typeof r !== 'object') return false;
    const { x, y, w, h } = r;
    if (![x, y, w, h].every(v => typeof v === 'number' && isFinite(v))) return false;
    const eps = 1e-6;
    return w > 0 && h > 0 && x >= -eps && y >= -eps && x + w <= 1 + eps && y + h <= 1 + eps;
}

/**
 * 矩形を [0,1] の正方領域に収める。まずサイズを [ごく小さい値, 1] に丸め、
 * 次に位置をずらして収める（サイズ優先）。
 * @param {{x:number,y:number,w:number,h:number}} r
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function clampRect(r) {
    const w = Math.min(1, Math.max(1e-4, r.w));
    const h = Math.min(1, Math.max(1e-4, r.h));
    const x = Math.min(1 - w, Math.max(0, r.x));
    const y = Math.min(1 - h, Math.max(0, r.y));
    return { x, y, w, h };
}

/**
 * 矩形の中心を保ったまま、指定した「画像ピクセル基準の」アスペクト比に一致する
 * 最大の矩形を [0,1] 内で返す。現在の矩形に内接させる方向で合わせるため、
 * 比率を選ぶとクロップ範囲は狭まる（広がらない）。
 * @param {{x:number,y:number,w:number,h:number}} r - 現在の矩形（割合）
 * @param {number|null} aspectValue - 望むクロップ比率（幅/高さ、元画像ピクセル基準）。null ならクランプのみ
 * @param {number} imgAspectValue - 元画像の 幅/高さ（ピクセル基準）
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function fitRectToAspect(r, aspectValue, imgAspectValue) {
    if (aspectValue == null || !isFinite(imgAspectValue) || imgAspectValue <= 0) {
        return clampRect(r);
    }
    // 割合空間での w/h 比 = ピクセル比 / 画像ピクセル比
    const R = aspectValue / imgAspectValue;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;

    let w, h;
    if (r.w / r.h > R) { h = r.h; w = h * R; }
    else { w = r.w; h = w / R; }

    // [0,1] を超える場合は比率を保ったまま縮小
    if (w > 1) { w = 1; h = w / R; }
    if (h > 1) { h = 1; w = h * R; }
    w = Math.min(w, 1);
    h = Math.min(h, 1);

    const x = Math.min(1 - w, Math.max(0, cx - w / 2));
    const y = Math.min(1 - h, Math.max(0, cy - h / 2));
    return { x, y, w, h };
}

/**
 * 旧 cropSettings（{ aspectRatio, zoom, offsetX, offsetY }）を、割合クロップ矩形に変換する。
 *
 * 旧実装（layoutCalculator の基準窓計算）の再現:
 *   - aspectRatio が 'original' なら基準窓は元画像そのもの → w_frac = h_frac = 1
 *   - 固定比率なら、その比率で元画像に内接する最大窓（imgAspectValue が必要）
 *   - zoom で均等縮小、offsetX/Y（0–1）で可動範囲内に配置
 *
 * imgAspectValue が不明（画像未ロード）で aspectRatio が固定比率の場合は、
 * 'original' と同じ扱い（w=h=1/zoom）でベストエフォート変換する。
 * @param {{aspectRatio?:string, zoom?:number, offsetX?:number, offsetY?:number}} legacy
 * @param {number} imgAspectValue - 元画像の 幅/高さ（不明なら NaN）
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function legacyCropToRect(legacy, imgAspectValue) {
    const zoom = Math.max(1, Number(legacy.zoom) || 1);
    const offX = clamp01(Number(legacy.offsetX != null ? legacy.offsetX : 0.5));
    const offY = clamp01(Number(legacy.offsetY != null ? legacy.offsetY : 0.5));

    let wBaseFrac = 1;
    let hBaseFrac = 1;
    const cropAspect = parseAspectRatio(legacy.aspectRatio);
    if (cropAspect != null && isFinite(imgAspectValue) && imgAspectValue > 0) {
        if (imgAspectValue > cropAspect) {
            hBaseFrac = 1;
            wBaseFrac = cropAspect / imgAspectValue;
        } else {
            wBaseFrac = 1;
            hBaseFrac = imgAspectValue / cropAspect;
        }
    }

    const w = wBaseFrac / zoom;
    const h = hBaseFrac / zoom;
    const x = (1 - w) * offX;
    const y = (1 - h) * offY;
    return clampRect({ x, y, w, h });
}

/**
 * cropSettings から実際に使うクロップ矩形（割合）を求める。
 *   1. cropSettings.rect が有効ならそれを使う（現行の形式）
 *   2. 旧 zoom/offset 形式なら legacyCropToRect で変換（未移行の状態でも描画が壊れないように）
 *   3. どちらでもなければ全体（FULL_RECT）
 * @param {Object} cropSettings
 * @param {number} originalW - 元画像の幅（px）
 * @param {number} originalH - 元画像の高さ（px）
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function resolveCropRect(cropSettings, originalW, originalH) {
    if (!cropSettings) return { ...FULL_RECT };
    if (isValidRect(cropSettings.rect)) return { ...cropSettings.rect };
    if (cropSettings.zoom != null || cropSettings.offsetX != null || cropSettings.offsetY != null) {
        const imgAspect = (originalW > 0 && originalH > 0) ? originalW / originalH : NaN;
        return legacyCropToRect(cropSettings, imgAspect);
    }
    return { ...FULL_RECT };
}

/**
 * crop モードで四隅ハンドルをドラッグしたときの、新しいクロップ矩形を求める。
 * 掴んだ隅だけを動かし、対角の隅は固定する。aspectValue が指定されていれば、
 * 幅を主として高さを比率から導き、対角の隅を基準に配置し直す。
 * @param {{x,y,w,h}} startRect - ドラッグ開始時の矩形（割合）
 * @param {'tl'|'tr'|'bl'|'br'} corner - 掴んだ隅
 * @param {number} fdx - 割合空間での X 方向ドラッグ量（画面 px を whole 幅で割った値）
 * @param {number} fdy - 割合空間での Y 方向ドラッグ量
 * @param {number|null} aspectValue - 望むクロップ比率（幅/高さ、元画像ピクセル基準）。null なら自由
 * @param {number} imgAspectValue - 元画像の 幅/高さ（ピクセル基準）
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function resizeCropRect(startRect, corner, fdx, fdy, aspectValue, imgAspectValue) {
    const MIN = 0.05;
    const movingLeft = corner === 'tl' || corner === 'bl';
    const movingTop = corner === 'tl' || corner === 'tr';

    let x1 = startRect.x;
    let y1 = startRect.y;
    let x2 = startRect.x + startRect.w;
    let y2 = startRect.y + startRect.h;

    if (movingLeft) x1 = Math.min(x2 - MIN, x1 + fdx);
    else x2 = Math.max(x1 + MIN, x2 + fdx);
    if (movingTop) y1 = Math.min(y2 - MIN, y1 + fdy);
    else y2 = Math.max(y1 + MIN, y2 + fdy);

    let rect = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };

    if (aspectValue != null && isFinite(imgAspectValue) && imgAspectValue > 0) {
        const R = aspectValue / imgAspectValue; // 割合空間での w/h
        const anchorX = movingLeft ? x2 : x1;
        const anchorY = movingTop ? y2 : y1;
        const w = rect.w;
        const h = w / R;
        rect = {
            x: movingLeft ? anchorX - w : anchorX,
            y: movingTop ? anchorY - h : anchorY,
            w,
            h
        };
    }
    return clampRect(rect);
}

/**
 * 任意の（旧・新混在の）cropSettings を、新形式 { aspectRatio, rect } に正規化する。
 * プリセット適用時など、外部由来のデータを取り込む経路で使う。
 * 旧 'original'（＝全体と等価な既定）は 'free' に寄せる。固定比率は維持する
 * （画像未ロードで矩形が比率と食い違う場合は、stateManager.setImage 側で再フィットされる）。
 * @param {Object} cropSettings
 * @param {number} [originalW]
 * @param {number} [originalH]
 * @returns {{aspectRatio:string, rect:{x:number,y:number,w:number,h:number}}}
 */
export function migrateCropSettings(cropSettings, originalW, originalH) {
    if (!cropSettings || typeof cropSettings !== 'object') {
        return { aspectRatio: 'free', rect: { ...FULL_RECT } };
    }
    if (isValidRect(cropSettings.rect)) {
        return {
            aspectRatio: cropSettings.aspectRatio || 'free',
            rect: { ...cropSettings.rect }
        };
    }
    const rect = resolveCropRect(cropSettings, originalW, originalH);
    let aspectRatio = cropSettings.aspectRatio;
    if (!aspectRatio || aspectRatio === 'original') aspectRatio = 'free';
    return { aspectRatio, rect };
}
