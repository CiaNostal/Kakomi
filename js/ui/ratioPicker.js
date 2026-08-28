// js/ui/ratioPicker.js
// 比率を「その比率のミニ長方形」の形で見せて選ぶタイル型ピッカー。
// 出力アスペクト比（レイアウトタブ）と切り抜き比率（同・写真の配置）で共用する。
// 以前はどちらも <select> だったが、形が想像しづらいという要望（docs/roadmap.md A-1）で置き換えた。
//
// - `createRatioPicker(container, { options, onSelect })` でタイル群を生成する。
// - `options` の各要素: `{ value, label, sub?, custom?, free? }`
//     - `value`: `'1:1'` などの比率文字列、または `'free'` / `'custom'`
//     - `custom: true` のタイルは、`value` に一致するタイルが無いときの受け皿（幅高さ入力欄と併用）
//     - `free: true` のタイルは破線シェイプで「自由比率」を表す
// - 返り値の `setValue(v)` は、一致するタイルを押下状態にする。一致が無ければ custom タイル
//   （あれば）を押下する。`getValue()` は現在押下中のタイルの value（custom フォールバック時は `'custom'`）。
// - クリック時は内部で押下状態を更新してから `onSelect(value)` を呼ぶ。

// 比率の「正準順序」。出力アスペクト比・切り抜き比率の両ピッカーがこの1つの並びを共有し、
// 各エントリの `pickers` に含まれるピッカーだけがそのタイルを出す（同じ比率が同じ相対順序で並ぶ）。
// 選択肢を足す／どちらのピッカーに出すかを変えるのはこの配列だけを触ればよい。
export const RATIO_FAMILIES = [
    { value: 'original', label: 'オリジナル', sub: '元の比率', original: true, pickers: ['crop'] },
    { value: 'free', label: 'フリー', sub: '自由', free: true, pickers: ['crop'] },
    { value: '1:1', label: '1:1', sub: '正方形', pickers: ['output', 'crop'] },
    { value: '4:5', label: '4:5', sub: 'IG縦', pickers: ['output'] },
    { value: '3:4', label: '3:4', pickers: ['output', 'crop'] },
    { value: '4:3', label: '4:3', pickers: ['crop'] },
    { value: '16:9', label: '16:9', sub: 'ワイド', pickers: ['output', 'crop'] },
    { value: '9:16', label: '9:16', pickers: ['crop'] },
    { value: '1.91:1', label: '1.91:1', sub: 'IG横', pickers: ['output'] },
    { value: '89:127', label: 'L判', sub: '89:127', pickers: ['output'] },
    { value: 'custom', label: 'カスタム', custom: true, pickers: ['output', 'crop'] }
];

/** 指定ピッカー（'output' / 'crop'）が出す選択肢を正準順序で返す。 */
export function ratioOptionsFor(pickerName) {
    return RATIO_FAMILIES.filter(f => f.pickers.includes(pickerName));
}

const SHAPE_BOX = 46; // タイル内シェイプの最大辺(px)

// 比率文字列 'W:H' から、SHAPE_BOX に内接するシェイプの幅・高さ(px)を求める。
function shapeDims(value) {
    const parts = String(value).split(':');
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (parts.length !== 2 || !(w > 0) || !(h > 0)) {
        return { w: 40, h: 40 };
    }
    const ratio = w / h;
    let sw;
    let sh;
    if (ratio >= 1) {
        sw = SHAPE_BOX;
        sh = SHAPE_BOX / ratio;
    } else {
        sh = SHAPE_BOX;
        sw = SHAPE_BOX * ratio;
    }
    return {
        w: Math.max(8, Math.round(sw * 10) / 10),
        h: Math.max(8, Math.round(sh * 10) / 10)
    };
}

/**
 * @param {HTMLElement} container タイルを入れる要素（中身はクリアされる）
 * @param {{ options: Array<{value:string,label:string,sub?:string,custom?:boolean,free?:boolean,original?:boolean}>,
 *           onSelect: (value:string)=>void }} opts
 * @returns {{ setValue:(v:string)=>void, getValue:()=>(string|null), element:HTMLElement }}
 */
export function createRatioPicker(container, { options, onSelect }) {
    container.innerHTML = '';
    container.classList.add('ratio-picker');

    const tiles = new Map(); // value -> <button>
    const hasCustom = options.some(opt => opt.custom);
    let current = null;

    // keepCustom: true のとき、value がプリセットタイルと一致しても「カスタム」タイルを
    // 押下状態のままにする（G-4: カスタム幅高さ編集中に既存比率へ一致してもカスタム欄を閉じない）。
    function select(value, { keepCustom = false } = {}) {
        let target = value;
        if (keepCustom && hasCustom) {
            target = 'custom';
        } else if (!tiles.has(target)) {
            target = hasCustom ? 'custom' : null;
        }
        current = target;
        tiles.forEach((btn, val) => {
            btn.setAttribute('aria-pressed', String(val === target));
        });
    }

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ratio-tile';
        if (opt.free) btn.classList.add('is-free');
        if (opt.custom) btn.classList.add('is-custom');
        if (opt.original) btn.classList.add('is-original');
        btn.dataset.value = opt.value;
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', opt.sub ? `${opt.label}（${opt.sub}）` : opt.label);

        const shape = document.createElement('span');
        shape.className = 'ratio-tile-shape';
        const bar = document.createElement('i');
        const dims = (opt.free || opt.custom || opt.original) ? { w: 40, h: 40 } : shapeDims(opt.value);
        bar.style.width = `${dims.w}px`;
        bar.style.height = `${dims.h}px`;
        shape.appendChild(bar);
        btn.appendChild(shape);

        const label = document.createElement('span');
        label.className = 'ratio-tile-label';
        label.textContent = opt.label;
        btn.appendChild(label);

        if (opt.sub) {
            const sub = document.createElement('span');
            sub.className = 'ratio-tile-sub';
            sub.textContent = opt.sub;
            btn.appendChild(sub);
        }

        btn.addEventListener('click', () => {
            select(opt.value);
            onSelect(opt.value);
        });

        tiles.set(opt.value, btn);
        container.appendChild(btn);
    });

    return {
        element: container,
        setValue: select,
        getValue: () => current
    };
}
