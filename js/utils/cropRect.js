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

// ---- A-3: 切り抜き時の元画像回転（水平出し） -------------------------------
// cropSettings.rotation（度、-45〜45）は「クロップ窓は出力フレーム内で軸平行のまま、
// 元画像がその下で傾く」を表す。crop の矩形 rect は "straightened space"（＝クロップ窓が
// 直立している座標系）での軸平行矩形で、回転 0 のとき image space と一致する。
// straightened space ⇔ image space は、画像中心を軸に ±rotation の剛体回転で写る。

/** 点(px, py) を中心(cx, cy) 周りに angleDeg 度回した座標（Canvas 座標系＝時計回り）。 */
function rot(px, py, cx, cy, angleDeg) {
    if (!angleDeg) return { x: px, y: py };
    const r = angleDeg * Math.PI / 180;
    const c = Math.cos(r), s = Math.sin(r);
    const dx = px - cx, dy = py - cy;
    return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
}

/**
 * straightened space の割合矩形 rect（{x,y,w,h}、x/w は幅基準・y/h は高さ基準の割合）が、
 * rotation 度だけ傾いた元画像（imgW×imgH px、画像中心が回転軸）の内側に完全に収まるか。
 * rect の 4 隅を straightened px → image space（画像中心周りに −rotation）へ写し、
 * [0,imgW]×[0,imgH] に入っているかで判定する。
 */
export function windowFitsInRotatedImage(rect, rotationDeg, imgW, imgH) {
    // straightened space の [0,1] 内であることは常に要求する（cropSettings.rect を
    // isValidRect が通る形＝[0,1] に保つため。回転で理論上もう少し大きく取れる余地は捨てる）。
    const e01 = 1e-6;
    if (rect.x < -e01 || rect.y < -e01 || rect.x + rect.w > 1 + e01 || rect.y + rect.h > 1 + e01) {
        return false;
    }
    if (!rotationDeg) return true;
    const cx = imgW / 2, cy = imgH / 2;
    const eps = 1e-3;
    const px = [rect.x, rect.x + rect.w];
    const py = [rect.y, rect.y + rect.h];
    for (const fx of px) {
        for (const fy of py) {
            const p = rot(fx * imgW, fy * imgH, cx, cy, -rotationDeg);
            if (p.x < -eps || p.x > imgW + eps || p.y < -eps || p.y > imgH + eps) return false;
        }
    }
    return true;
}

/** rect を点(px, py) 固定で s 倍した割合矩形（s=1 で不変、s→0 でその点へ潰れる）。 */
function scaleRectAboutPoint(rect, s, px, py) {
    return {
        x: px + (rect.x - px) * s,
        y: py + (rect.y - py) * s,
        w: rect.w * s,
        h: rect.h * s
    };
}

/** rect を中心固定で s 倍（0<s≤1）に縮めた割合矩形。 */
function scaleRectAboutCenter(rect, s) {
    return scaleRectAboutPoint(rect, s, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/**
 * A-3 仕様(a): クロップ窓（rect）が傾いた元画像からはみ出していたら、**中心を固定したまま
 * 比率を保って**、画像内に収まる最大サイズへ縮める（二分探索）。既に収まっていれば
 * rect をそのまま返す。rotation 0 のときは従来の clampRect と同じ（[0,1] へ寄せる）。
 * @param {{x,y,w,h}} rect - straightened space の割合矩形
 * @param {number} rotationDeg - -45〜45
 * @param {number} imgW - 元画像の幅(px)
 * @param {number} imgH - 元画像の高さ(px)
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function clampRectToRotatedImage(rect, rotationDeg, imgW, imgH) {
    if (!rotationDeg || !(imgW > 0) || !(imgH > 0)) return clampRect(rect);
    if (windowFitsInRotatedImage(rect, rotationDeg, imgW, imgH)) return { ...rect };
    let lo = 1e-3, hi = 1;
    for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (windowFitsInRotatedImage(scaleRectAboutCenter(rect, mid), rotationDeg, imgW, imgH)) lo = mid;
        else hi = mid;
    }
    return scaleRectAboutCenter(rect, lo);
}

/**
 * A-3 バグ修正: L 字ハンドルのリサイズを傾いた元画像に収める。
 * **掴んだ隅の対角（アンカー）を固定したまま**、収まる最大サイズへ縮める（比率も保たれる）。
 * `clampRectToRotatedImage`（中心固定）と違い、アンカー側の辺は動かないので
 * 「片側をドラッグしたら反対側が近づいてくる」不具合が起きない。
 * @param {{x,y,w,h}} rect - resizeCropRect が返した straightened space の割合矩形
 * @param {'tl'|'tr'|'bl'|'br'} corner - 掴んだ隅
 * @param {number} rotationDeg
 * @param {number} imgW @param {number} imgH
 */
export function clampCropResizeToRotatedImage(rect, corner, rotationDeg, imgW, imgH) {
    if (!rotationDeg || !(imgW > 0) || !(imgH > 0)) return rect;
    if (windowFitsInRotatedImage(rect, rotationDeg, imgW, imgH)) return { ...rect };
    // アンカー（掴んだ隅の対角）の座標
    const ax = (corner === 'tl' || corner === 'bl') ? rect.x + rect.w : rect.x;
    const ay = (corner === 'tl' || corner === 'tr') ? rect.y + rect.h : rect.y;
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (windowFitsInRotatedImage(scaleRectAboutPoint(rect, mid, ax, ay), rotationDeg, imgW, imgH)) lo = mid;
        else hi = mid;
    }
    return scaleRectAboutPoint(rect, lo, ax, ay);
}

/**
 * A-3 バグ修正: クロップ窓のパン（平行移動）を傾いた元画像に収める。
 * 開始矩形（画像内に収まっている）から目標へ向けて、収まる範囲までで平行移動を頭打ちにする。
 * @param {{x,y,w,h}} startRect - パン開始時の（収まっている）矩形
 * @param {number} fdx @param {number} fdy - 割合空間での平行移動量
 * @param {number} rotationDeg
 * @param {number} imgW @param {number} imgH
 */
export function clampCropPanToRotatedImage(startRect, fdx, fdy, rotationDeg, imgW, imgH) {
    const desired = { x: startRect.x + fdx, y: startRect.y + fdy, w: startRect.w, h: startRect.h };
    if (!rotationDeg || !(imgW > 0) || !(imgH > 0)) return clampRect(desired);
    if (windowFitsInRotatedImage(desired, rotationDeg, imgW, imgH)) return desired;
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const r = { x: startRect.x + fdx * mid, y: startRect.y + fdy * mid, w: startRect.w, h: startRect.h };
        if (windowFitsInRotatedImage(r, rotationDeg, imgW, imgH)) lo = mid;
        else hi = mid;
    }
    return { x: startRect.x + fdx * lo, y: startRect.y + fdy * lo, w: startRect.w, h: startRect.h };
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
 * cropSettings.aspectRatio を数値比（幅/高さ、元画像ピクセル基準）に解決する。
 * `'original'` は「元画像のアスペクト比で固定」を意味し、`imgW/imgH` を返す（Lightroom の
 * クロップ「オリジナル」と同義。`docs/roadmap.md` A-11）。`'free'` / 空 / 不正・画像未ロードは
 * null（制約なし）。それ以外は `parseAspectRatio` に委譲する。
 * @param {string} aspectRatio
 * @param {number} imgW
 * @param {number} imgH
 * @returns {number|null}
 */
export function resolveCropAspectValue(aspectRatio, imgW, imgH) {
    if (aspectRatio === 'original') {
        return (imgW > 0 && imgH > 0) ? imgW / imgH : null;
    }
    return parseAspectRatio(aspectRatio);
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
 * 矩形の中心を保ったまま、指定した比率に一致する矩形へ「外接方向」で合わせる。
 * `fitRectToAspect` が現在の矩形に内接（比率を選ぶたびに縮む）なのに対し、こちらは
 * **現在の矩形を含む最小の比率一致矩形**を作り、[0,1] を超える場合だけ比率を保って縮小する。
 *
 * これを比率タイル選択（`uiController.applyCropAspect`）に使うことで:
 *  - 同じ比率を連打しても矩形が変わらない（真に冪等）。
 *  - 別々の比率を交互に選んでも、画像サイズで頭打ちになり 1px へ収束しない（G-6 の続報対策）。
 * @param {{x:number,y:number,w:number,h:number}} r
 * @param {number|null} aspectValue - 望むクロップ比率（幅/高さ、元画像ピクセル基準）。null ならクランプのみ
 * @param {number} imgAspectValue - 元画像の 幅/高さ（ピクセル基準）
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function growRectToAspect(r, aspectValue, imgAspectValue) {
    if (aspectValue == null || !isFinite(imgAspectValue) || imgAspectValue <= 0) {
        return clampRect(r);
    }
    const R = aspectValue / imgAspectValue; // 割合空間での w/h
    // すでにその比率（誤差込み）なら何もしない＝完全な冪等。
    if (r.w > 0 && r.h > 0 && Math.abs((r.w / r.h) - R) < 1e-4) {
        return clampRect(r);
    }
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;

    let w, h;
    if (r.w / r.h > R) { w = r.w; h = w / R; } // 横に広い → 高さを伸ばして含む
    else { h = r.h; w = h * R; }               // 縦に長い → 幅を伸ばして含む

    // [0,1] を超えたら比率を保ったまま縮小（＝画像で頭打ち）。
    if (w > 1) { h = h / w; w = 1; }
    if (h > 1) { w = w / h; h = 1; }

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

    // 掴んだ辺だけを動かし、対角の辺（アンカー）は固定。
    // バグ修正: 動かす辺を [0,1] で頭打ちにする。以前は下限を掛けておらず、辺を画像の外へ
    // ドラッグすると末尾の clampRect が w と x を独立に丸めてアンカー側の辺まで動いていた。
    if (movingLeft) x1 = Math.max(0, Math.min(x2 - MIN, x1 + fdx));
    else x2 = Math.min(1, Math.max(x1 + MIN, x2 + fdx));
    if (movingTop) y1 = Math.max(0, Math.min(y2 - MIN, y1 + fdy));
    else y2 = Math.min(1, Math.max(y1 + MIN, y2 + fdy));

    let rect = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };

    if (aspectValue != null && isFinite(imgAspectValue) && imgAspectValue > 0) {
        const R = aspectValue / imgAspectValue; // 割合空間での w/h
        const anchorX = movingLeft ? x2 : x1;
        const anchorY = movingTop ? y2 : y1;

        // 幅を主として高さを比率から導く。
        // G-5: アンカー（掴んだ隅の対角）を固定したまま矩形が [0,1] に収まる最大の w で頭打ちにする。
        // これを超えて広げようとしても隅が写真の端で止まり、比率固定は崩れない。
        // （従来は clampRect が w と h を独立に丸めるため、端に当たると比率が壊れて画面枠まで伸びていた。）
        const maxWByX = movingLeft ? anchorX : (1 - anchorX);
        const maxWByY = (movingTop ? anchorY : (1 - anchorY)) * R;
        const minW = Math.max(MIN, MIN * R);
        const w = Math.max(minW, Math.min(rect.w, maxWByX, maxWByY));
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
    const rotation = Number.isFinite(cropSettings.rotation) ? cropSettings.rotation : 0;
    if (isValidRect(cropSettings.rect)) {
        return {
            aspectRatio: cropSettings.aspectRatio || 'free',
            rect: { ...cropSettings.rect },
            rotation
        };
    }
    const rect = resolveCropRect(cropSettings, originalW, originalH);
    let aspectRatio = cropSettings.aspectRatio;
    if (!aspectRatio || aspectRatio === 'original') aspectRatio = 'free';
    return { aspectRatio, rect, rotation };
}
