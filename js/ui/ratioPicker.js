// js/ui/ratioPicker.js
// 比率を「その比率のミニ長方形」の形で見せて選ぶタイル型ピッカー。
// 出力アスペクト比（レイアウトタブ「キャンバス」）と切り抜き比率（同「写真のトリミング」）で共用する。
//
// A-14（2026-08-28、Lightroom Web のクロップ UI 参照）:
// - 一覧は一度に「片方の向き」だけ表示する（初期は縦長）。各エントリは向きを畳んだ「比率ファミリー」で、
//   タイルのラベルとミニ長方形は現在の向きで描く。表記は `4×5` のように掛け算記号を使う。
// - 見出し右の回転ボタン（uiController 側）で `orientation` を反転し、選択中ファミリーの保存文字列
//   （`outputTargetAspectRatioString` / `cropSettings.aspectRatio`）を `W:H` ↔ `H:W` に入れ替える。
// - サブラベルは廃止（「インスタ」等は正方形/4:5/ストーリーズ/リールで違い一概に言えないため）。
// - `editState` のキー・`layoutCalculator` は無変更。向きは常に保存文字列から導出する（永続化しない）。
//
// - `createRatioPicker(container, { families, orientation, onSelect })` でタイル群を生成する。
// - 返り値: `setValue(v, {keepCustom})` / `getValue()` / `getSelectedId()` / `getOrientation()` /
//   `toggleOrientation()` / `element`。
// - `onSelect(value)` の value は向きを反映した比率文字列（`'4:5'` / `'5:4'` など）、または
//   `'free'` / `'original'` / `'custom'`。

// 比率ファミリー（縦向き正準。p ≤ q）。配列の並びがそのまま表示順（Lightroom と同じ「数字が小さい順」。
// `L判` は数字を持たないので `4:5` と `9:16` の間に固定）。`pickers` に含まれるピッカーだけがそのタイルを出す。
export const RATIO_FAMILIES = [
    { id: 'original', label: 'オリジナル', original: true, pickers: ['crop'] },
    { id: 'free', label: 'フリー', free: true, pickers: ['crop'] },
    { id: '1:1', p: 1, q: 1, square: true, pickers: ['output', 'crop'] },
    { id: '2:3', p: 2, q: 3, pickers: ['output', 'crop'] },
    { id: '3:4', p: 3, q: 4, pickers: ['output', 'crop'] },
    { id: '4:5', p: 4, q: 5, pickers: ['output'] },
    { id: 'lban', p: 89, q: 127, label: 'L判', named: true, pickers: ['output'] },
    { id: '9:16', p: 9, q: 16, pickers: ['output', 'crop'] },
    { id: '10:16', p: 10, q: 16, pickers: ['output', 'crop'] },
    { id: 'custom', label: 'カスタム', custom: true, pickers: ['output', 'crop'] },
];

/** 指定ピッカー（'output' / 'crop'）が出すファミリーを表示順で返す。 */
export function ratioOptionsFor(pickerName) {
    return RATIO_FAMILIES.filter(f => f.pickers.includes(pickerName));
}

/** ファミリーが「回転で向きが変わる普通の比率タイル」か（1×1・オリジナル・フリー・カスタムは対象外）。 */
export function isOrientableFamily(family) {
    return !!(family && family.p && family.q && !family.square
        && !family.original && !family.free && !family.custom);
}

/** ファミリー＋向き → 保存する比率文字列。 */
export function orientedValueOf(family, orientation) {
    if (!family) return null;
    if (family.original || family.free || family.custom) return family.id;
    if (family.square) return '1:1';
    return orientation === 'landscape' ? `${family.q}:${family.p}` : `${family.p}:${family.q}`;
}

/** 縦向き正準の比率（p/q ≤ 1）。 */
function portraitRatio(family) {
    return family.p / family.q;
}

/**
 * 保存文字列（`'W:H'` / `'free'` / `'original'` / `'custom'`）→ { family, orientation }。
 * 一致するファミリーが無ければ family: null。orientation は W>H で 'landscape'、W<H で 'portrait'、
 * 正方形・特殊値では null（＝現在の向きを維持する合図）。
 */
export function familyFromValue(value, families) {
    if (value === 'free' || value === 'original' || value === 'custom') {
        return { family: families.find(f => f.id === value) || null, orientation: null };
    }
    const parts = String(value == null ? '' : value).split(':');
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (parts.length !== 2 || !(w > 0) || !(h > 0)) return { family: null, orientation: null };
    const orientation = w > h ? 'landscape' : (w < h ? 'portrait' : null);
    const target = Math.min(w, h) / Math.max(w, h); // 縦向き正準の比率
    const family = families.find(f => (f.p && f.q)
        && !f.original && !f.free && !f.custom
        && Math.abs(portraitRatio(f) - target) < 1e-3) || null;
    return { family, orientation };
}

const SHAPE_BOX = 46; // タイル内シェイプの最大辺(px)

// 幅・高さの実数比から、SHAPE_BOX に内接するシェイプの寸法(px)を求める。
function inscribe(w, h) {
    if (!(w > 0) || !(h > 0)) return { w: 40, h: 40 };
    const ratio = w / h;
    const sw = ratio >= 1 ? SHAPE_BOX : SHAPE_BOX * ratio;
    const sh = ratio >= 1 ? SHAPE_BOX / ratio : SHAPE_BOX;
    return {
        w: Math.max(8, Math.round(sw * 10) / 10),
        h: Math.max(8, Math.round(sh * 10) / 10),
    };
}

// ファミリー＋向き → タイルに出すラベル文字列。
function labelFor(family, orientation) {
    if (family.named || family.original || family.free || family.custom) return family.label;
    if (family.square) return '1×1';
    return orientation === 'landscape' ? `${family.q}×${family.p}` : `${family.p}×${family.q}`;
}

// ファミリー＋向き → ミニ長方形の寸法(px)。特殊タイル（オリジナル/フリー/カスタム）は正方形プレースホルダ。
function shapeFor(family, orientation) {
    if (family.original || family.free || family.custom) return { w: 40, h: 40 };
    if (family.square) return inscribe(1, 1);
    const [w, h] = orientation === 'landscape' ? [family.q, family.p] : [family.p, family.q];
    return inscribe(w, h);
}

/**
 * @param {HTMLElement} container タイルを入れる要素（中身はクリアされる）
 * @param {{ families: Array, orientation?: ('portrait'|'landscape'), onSelect: (value:string)=>void }} opts
 * @returns {{ setValue, getValue, getSelectedId, getOrientation, toggleOrientation, element }}
 */
export function createRatioPicker(container, { families, orientation = 'portrait', onSelect }) {
    container.innerHTML = '';
    container.classList.add('ratio-picker');

    const hasCustom = families.some(f => f.custom);
    let state = {
        orientation,
        selectedId: null, // ファミリー id、または 'custom'（フォールバック時）、または null
    };
    const tiles = new Map(); // family id -> <button>

    function buildTiles() {
        container.innerHTML = '';
        tiles.clear();
        families.forEach(family => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ratio-tile';
            if (family.free) btn.classList.add('is-free');
            if (family.custom) btn.classList.add('is-custom');
            if (family.original) btn.classList.add('is-original');
            btn.dataset.value = family.id;
            btn.setAttribute('aria-pressed', 'false');

            const shape = document.createElement('span');
            shape.className = 'ratio-tile-shape';
            const bar = document.createElement('i');
            shape.appendChild(bar);
            btn.appendChild(shape);

            const label = document.createElement('span');
            label.className = 'ratio-tile-label';
            btn.appendChild(label);

            btn.addEventListener('click', () => {
                if (family.custom) {
                    state.selectedId = 'custom';
                    reflectPressed();
                    onSelect('custom');
                    return;
                }
                state.selectedId = family.id;
                reflectPressed();
                onSelect(orientedValueOf(family, state.orientation));
            });

            tiles.set(family.id, btn);
            container.appendChild(btn);
        });
        renderTileContents();
    }

    // ラベル・シェイプを現在の向きで描き直す（DOM は作り直さない）。
    function renderTileContents() {
        families.forEach(family => {
            const btn = tiles.get(family.id);
            if (!btn) return;
            btn.setAttribute('aria-label', labelFor(family, state.orientation));
            btn.querySelector('.ratio-tile-label').textContent = labelFor(family, state.orientation);
            const dims = shapeFor(family, state.orientation);
            const bar = btn.querySelector('.ratio-tile-shape i');
            bar.style.width = `${dims.w}px`;
            bar.style.height = `${dims.h}px`;
        });
    }

    function reflectPressed() {
        tiles.forEach((btn, id) => {
            btn.setAttribute('aria-pressed', String(id === state.selectedId));
        });
    }

    // keepCustom: true のとき、value がファミリーに一致しても「カスタム」タイルを押下状態のままにする
    // （G-4: カスタム幅高さ編集中に既存比率へ一致してもカスタム欄を閉じない）。
    function setValue(value, { keepCustom = false } = {}) {
        if (keepCustom && hasCustom) {
            state.selectedId = 'custom';
            reflectPressed();
            return;
        }
        const { family, orientation: derived } = familyFromValue(value, families);
        if (family) {
            if (derived && derived !== state.orientation) {
                state.orientation = derived;
                renderTileContents();
            }
            state.selectedId = family.id;
        } else {
            state.selectedId = hasCustom ? 'custom' : null;
        }
        reflectPressed();
    }

    function getValue() {
        if (state.selectedId === 'custom' || state.selectedId == null) return state.selectedId;
        const family = families.find(f => f.id === state.selectedId);
        return orientedValueOf(family, state.orientation);
    }

    // 向きを反転し、タイルを描き直す。押下状態は維持。呼び出し側（uiController）が
    // 「選択中ファミリーを新しい向きで state に反映」する。
    function toggleOrientation() {
        state.orientation = state.orientation === 'landscape' ? 'portrait' : 'landscape';
        renderTileContents();
        reflectPressed();
        return state.orientation;
    }

    buildTiles();

    return {
        element: container,
        setValue,
        getValue,
        getSelectedId: () => state.selectedId,
        getOrientation: () => state.orientation,
        toggleOrientation,
    };
}
