// js/stateManager.js
import { googleFonts } from './uiDefinitions.js'; // Google Fontsリストをインポート
import { fitRectToAspect, isValidRect, FULL_RECT, resolveCropAspectValue } from './utils/cropRect.js';

/**
 * stateManager.js
 * アプリケーションの状態管理を担当するモジュール
 */

// ユーザーが調整する「編集設定」のキー一覧。
// 画像そのもの（image, exifData, originalFileName等）やレイアウト計算の派生データ
// （photoDrawConfig, outputCanvasConfig）は含めない。Undo/Redo（historyManager.js）と
// プリセット保存（presets/presetStore.js）の両方が、保存・復元の対象範囲としてこれを共有する。
const EDITABLE_SETTINGS_KEYS = [
    'photoViewParams',
    'outputTargetAspectRatioString',
    'baseMarginPercent',
    'backgroundColor',
    'backgroundType',
    'imageBlurBackgroundParams',
    'frameSettings',
    'textSettings',
    'outputSettings',
    'cropSettings'
];

// アプリケーションの状態を保持するオブジェクト
let editState = {
    image: null,
    // B-6: 背景タイプ「別画像」で使う2枚目の画像。editState.image と同じく
    // EDITABLE_SETTINGS_KEYS には含めない ＝ Undo にもプリセットにも乗らない
    // （プリセット適用で backgroundType==='bgImage' でも画像が無ければ
    //  backgroundRenderer が単色にフォールバックする）。
    bgImage: null,
    originalWidth: 0,
    originalHeight: 0,
    originalFileName: null,
    photoViewParams: {
        offsetX: 0.5,
        offsetY: 0.5,
        // A-4: クロップ確定後の写真をキャンバス内で回す角度（度、-180〜180）。
        // 回転すると layoutCalculator が「回転後の外接矩形＋余白」で出力キャンバスを取り直す。
        rotation: 0
    },
    outputTargetAspectRatioString: '1:1',
    baseMarginPercent: 5,
    backgroundColor: '#ffffff',
    backgroundType: 'color',
    imageBlurBackgroundParams: {
        scale: 2.0,
        blurAmountPercent: 3,
        brightness: 100,
        saturation: 100,
        offsetXPercent: 0, // 追加 (背景Xオフセット%)
        offsetYPercent: 0  // 追加 (背景Yオフセット%)
    },
    photoDrawConfig: {
        sourceX: 0, sourceY: 0, sourceWidth: 0, sourceHeight: 0,
        destWidth: 0, destHeight: 0,
        destXonOutputCanvas: 0, destYonOutputCanvas: 0
    },
    outputCanvasConfig: {
        width: 0, height: 0
    },
    // フレーム加工関連の設定を追加
    frameSettings: {
        // 角のスタイル関連
        // C-1: 角のスタイルは「角丸 / 超楕円」の2択（「なし」は廃止＝丸み0 が実質「なし」）。
        // 既定は 角丸 / 丸み0（cornerRadiusPercent 0）＝見た目は旧「なし」と同一。
        // superellipseN の既定 40 は超楕円モードの丸み0（ほぼ矩形）に対応する。
        cornerStyle: 'rounded',
        cornerRadiusPercent: 0,
        superellipseN: 40,
        // 影関連
        shadowEnabled: false,
        shadowType: 'drop',
        // 共通の影パラメータ
        shadowParams: {
            offsetX: 0,
            offsetY: 0,
            blur: 2,
            effectRangePercent: 2,
            color: '#000000', // RGBカラー (例: HEX)
            opacity: 0.5      // 不透明度 (0.0 - 1.0)
        },
        // 縁取り／線関連
        border: {
            enabled: false,
            width: 1,
            color: '#000000',
            style: 'solid'
        }
    },
    // 文字表示関連の設定（バケット4 / D-1・D-3）。
    // 撮影日・Exif・自由テキストを1本の layers[] に統合した。各レイヤーは content（文字列と
    // 動的トークンの並び）＋見た目の設定を持ち、種類（kind）フィールドは持たない
    // ——「Exif を含むか」等は content から導出する（utils/textContent.js）。
    // 旧形式（date / exif / customTexts）のプリセットは applyPreset で migrateTextSettings() が変換する。
    textSettings: {
        layers: []
    },
    // 出力関連の設定を追加
    outputSettings: {
        quality: 100,
        preserveExif: true
    },
    // 元画像から切り出すための構図調整設定。
    // rect は「元画像に対する割合」 { x, y, w, h }（0–1）で切り出し矩形を表す。
    // aspectRatio はクロップ矩形に課す比率制約（'free' なら自由、'1:1' 等なら固定）。
    // 旧形式（zoom / offsetX / offsetY）はプリセット読込時に utils/cropRect.js で矩形へ移行する。
    cropSettings: {
        aspectRatio: 'free',
        rect: { x: 0, y: 0, w: 1, h: 1 },
        // A-3: 水平出し用の元画像回転（度、-45〜45）。クロップ窓は軸平行のまま、
        // 元画像がその下で傾く。rect は「窓が直立した座標系」での軸平行矩形。
        rotation: 0
    },
    // Exif情報
    exifData: null
};

// 状態変更後のコールバック関数を登録する配列
const stateChangeListeners = [];

/**
 * 状態変更リスナーを登録する
 * @param {Function} listener - 状態変更時に呼び出されるコールバック関数
 */
function addStateChangeListener(listener) {
    if (typeof listener === 'function' && !stateChangeListeners.includes(listener)) {
        stateChangeListeners.push(listener);
    }
}

/**
 * 登録済みの状態変更リスナーを削除する
 * @param {Function} listener - 削除するリスナー関数
 */
function removeStateChangeListener(listener) {
    const index = stateChangeListeners.indexOf(listener);
    if (index !== -1) {
        stateChangeListeners.splice(index, 1);
    }
}

// 同一Tick内で複数回発生した通知を1回にまとめるためのフラグ。
// これにより、リスナー内でのupdateState呼び出し（例: レイアウト計算結果の書き戻し）が
// 無限に再入するのを防ぎつつ、複数の変更を1回の再描画・UI同期にまとめられる。
let notifyScheduled = false;

/**
 * 全ての状態変更リスナーを呼び出す（マイクロタスクでまとめて実行）
 */
function notifyStateChange() {
    if (notifyScheduled) return;
    notifyScheduled = true;
    queueMicrotask(() => {
        notifyScheduled = false;
        for (const listener of stateChangeListeners) {
            listener(editState); // getState()ではなく、現在のeditStateを渡すことで、リスナー側で最新の状態を参照できるようにする
        }
    });
}

/**
 * 編集状態を更新する
 * @param {Object} updates - 更新するプロパティと値を含むオブジェクト
 * @param {Object} [options] - { silent: true }を指定すると、状態は更新するがリスナーへの通知は行わない。
 *   layoutCalculatorの計算結果（photoDrawConfig等）のような「派生データの書き戻し」に使う。
 *   これをリスナー経由の再描画から呼ぶと無限ループになるため。
 */
function updateState(updates, options = {}) {
    function deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (Array.isArray(source[key])) {
                    target[key] = [...source[key]];
                } else if (source[key] instanceof Object && key in target && target[key] instanceof Object && !Array.isArray(target[key])) {
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }
    // 状態を更新
    deepMerge(editState, updates);

    // 変更を通知（silent指定時はスキップ）
    if (!options.silent) {
        notifyStateChange();
    }
}

function generateTextLayerId() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `text-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// 新規テキストレイヤーの既定値。D-3: 撮影日 / Exif / 自由テキストで別だった範囲・初期値を1本化。
const TEXT_LAYER_DEFAULTS = {
    enabled: true,
    content: [''],
    textAlign: 'center',
    font: googleFonts[0].displayName,
    size: 5,
    color: '#333333',
    opacity: 1,
    position: 'middle-center',
    offsetX: 0,
    offsetY: 0,
    rotation: 0
};

/**
 * テキストレイヤーを1つ追加する（D-1: 作成フォームの「追加」で確定した内容が渡ってくる）。
 * @param {Object} [partial] content や見た目の初期値。既定値へ上書きマージする。
 * @returns {string} 追加されたレイヤーのid
 */
function addTextLayer(partial = {}) {
    const id = generateTextLayerId();
    const layer = { id, ...TEXT_LAYER_DEFAULTS, ...partial };
    layer.content = (Array.isArray(layer.content) && layer.content.length) ? layer.content : [''];
    editState.textSettings.layers.push(layer);
    notifyStateChange();
    return id;
}

/**
 * テキストレイヤーを削除する（撮影日・Exif も含め、すべてのレイヤーが対象）。
 * @param {string} id
 */
function removeTextLayer(id) {
    editState.textSettings.layers = editState.textSettings.layers.filter(l => l.id !== id);
    notifyStateChange();
}

/**
 * テキストレイヤーのプロパティを部分更新する。
 * （layers は配列なので、updateState() の汎用 deepMerge では配列全体が置き換わってしまうため専用関数を用意している）
 * @param {string} id
 * @param {Object} changes
 */
function updateTextLayer(id, changes) {
    const layer = editState.textSettings.layers.find(l => l.id === id);
    if (!layer) return;
    Object.assign(layer, changes);
    notifyStateChange();
}

/**
 * テキストレイヤーの並び順（＝重なり順）を、指定された id の並びへ差し替える。
 * リストのドラッグ並べ替えから使う。未知の id は無視し、指定に無い既存レイヤーは末尾へ温存する。
 * @param {string[]} orderedIds
 */
function reorderTextLayers(orderedIds) {
    const byId = new Map(editState.textSettings.layers.map(l => [l.id, l]));
    const next = [];
    for (const id of orderedIds) {
        const layer = byId.get(id);
        if (layer && !next.includes(layer)) next.push(layer);
    }
    for (const layer of editState.textSettings.layers) {
        if (!next.includes(layer)) next.push(layer);
    }
    editState.textSettings.layers = next;
    notifyStateChange();
}

/**
 * 旧形式の textSettings（{ date, exif, customTexts }）を新形式（{ layers: [] }）へ変換する。
 * localStorage に保存済みの旧プリセットを applyPreset で読んだときにだけ通る（editState 自体は保存されず、
 * Undo 履歴はメモリ上で常に現行形式なので、変換はプリセット適用の入口1か所で足りる）。
 * 撮影日・Exif は「有効だったものだけ」レイヤー化する（未使用の既定ブロックが空レイヤーとして
 * 復活しないように）。自由テキストは全部レイヤー化する。
 * @param {Object} ts
 * @returns {{ layers: Array }}
 */
function migrateTextSettings(ts) {
    if (!ts || typeof ts !== 'object') return { layers: [] };
    if (Array.isArray(ts.layers)) return ts; // すでに新形式
    const base = (src) => ({
        id: generateTextLayerId(),
        enabled: !!src.enabled,
        textAlign: src.textAlign || 'center',
        font: src.font || googleFonts[0].displayName,
        size: typeof src.size === 'number' ? src.size : 5,
        color: src.color || '#333333',
        opacity: typeof src.opacity === 'number' ? src.opacity : 1,
        position: src.position || 'middle-center',
        offsetX: src.offsetX || 0,
        offsetY: src.offsetY || 0,
        rotation: src.rotation || 0
    });
    const layers = [];
    if (ts.date && ts.date.enabled) {
        layers.push({
            ...base(ts.date),
            textAlign: ts.date.textAlign || 'left',
            content: [{ field: 'date', format: ts.date.format || 'YYYY.MM.DD' }]
        });
    }
    if (ts.exif && ts.exif.enabled) {
        layers.push({
            ...base(ts.exif),
            content: [{ field: 'exif', items: Array.isArray(ts.exif.items) ? ts.exif.items.slice() : [] }]
        });
    }
    for (const c of Array.isArray(ts.customTexts) ? ts.customTexts : []) {
        layers.push({ ...base(c), content: [typeof c.text === 'string' ? c.text : ''] });
    }
    return { layers };
}

/**
 * 現在の編集状態のコピーを取得する
 * @returns {Object} 現在の編集状態のディープコピー
 */
function getState() {
    const originalImage = editState.image;
    const originalBgImage = editState.bgImage; // B-6: これも HTMLImageElement なので clone 対象から外す
    let stateCopy;
    if (typeof structuredClone === 'function') {
        editState.image = null;
        editState.bgImage = null;
        try {
            stateCopy = structuredClone(editState);
        } catch (e) {
            console.warn("[StateManager] structuredClone failed, falling back to JSON.parse/stringify for non-image properties.", e);
            stateCopy = JSON.parse(JSON.stringify(editState));
        }
        editState.image = originalImage;
        editState.bgImage = originalBgImage;
        stateCopy.image = originalImage;
        stateCopy.bgImage = originalBgImage;
    } else {
        console.warn("[StateManager] structuredClone is not available. Using JSON.parse/stringify with manual image handling.");
        stateCopy = JSON.parse(JSON.stringify(editState));
        stateCopy.image = originalImage;
        stateCopy.bgImage = originalBgImage;
    }
    return stateCopy;
}


/**
 * 新しい画像がロードされたときの処理
 * @param {HTMLImageElement} img - ロードされた画像要素
 * @param {Object} exifData - 画像から抽出されたExifデータ (オプション)
 * @param {string | null} fileName - 元のファイル名 (オプション)
 */
function setImage(img, exifData = null, fileName = null) { // ADDED: fileName パラメータ
    // G-2: すでに画像がある状態で「別の画像に差し替える」ケースを、初回ロードと区別する。
    // 差し替え時はトリミングだけ初期化する（下記）。他のパラメータ（背景・フレーム・出力比率・
    // 余白・テキスト）は引き継ぐ。
    const isReplacingImage = !!editState.image;

    // 基本的な画像情報を更新
    editState.image = img;
    editState.originalWidth = img.width;
    editState.originalHeight = img.height;
    editState.exifData = exifData;
    editState.originalFileName = typeof fileName === 'string' ? fileName : 'image';

    // クロップ矩形の後追い整形。
    // ・rect が壊れている場合は全体に戻す。
    // ・G-2: 別画像への差し替え時は rect を全体へ、枠内位置を中央へリセットする。
    //   cropSettings.rect は「元画像に対する正規化座標」なので、アスペクト比の違う画像に
    //   同じ rect をそのまま引き継ぐと切り抜き形状が崩れる（1:1 で切ったのに 1:1 でなくなる等）。
    //   aspectRatio（比率制約）は維持し、下の「固定比率 ＋ 全体 rect → 再フィット」で
    //   新しい画像のアスペクトに合った最大内接矩形へ作り直させる。
    // ・aspectRatio が固定比率なのに rect が既定の全体のまま（画像ロード前にプリセットを
    //   適用したケースなど、比率に合った矩形をまだ計算できていない状態）の場合も同じ再フィット。
    const crop = editState.cropSettings;
    if (typeof crop.rotation !== 'number' || !Number.isFinite(crop.rotation)) crop.rotation = 0;
    if (isReplacingImage) {
        crop.rect = { ...FULL_RECT };
        crop.rotation = 0; // A-3: 差し替え時は水平出しもリセット
        editState.photoViewParams = { offsetX: 0.5, offsetY: 0.5, rotation: 0 };
    }
    if (!isValidRect(crop.rect)) {
        crop.rect = { ...FULL_RECT };
    }
    // A-11: aspectRatio が 'original' なら新しい画像のアスペクト比で解決する（差し替え時も追従）。
    const aspectValue = resolveCropAspectValue(crop.aspectRatio, img.width, img.height);
    const rectIsFull = crop.rect.x === 0 && crop.rect.y === 0 && crop.rect.w === 1 && crop.rect.h === 1;
    if (aspectValue != null && rectIsFull && img.width > 0 && img.height > 0) {
        crop.rect = fitRectToAspect(crop.rect, aspectValue, img.width / img.height);
    }
    // A-3（Model B）: rect は水平出しで縮小しない“望むサイズ”を保持する。描画・当たり判定の
    // 入口（layoutCalculator / canvasRenderer / photoAdapter.getCropRect）で
    // clampRectToRotatedImage を通すので、ここで rect をいじる必要はない。

    // Reset relevant parts of the state for the new image
    // editState.photoViewParams = { offsetX: 0.5, offsetY: 0.5 };
    // editState.backgroundType = 'color'; // Reset to default or keep current? For now, keep.
    // editState.cropSettings = { aspectRatio: 'original', zoom: 1.0, offsetX: 0.5, offsetY: 0.5 };
    // Consider if text settings font should reset or persist. For now, persist.
    notifyStateChange();
}

/**
 * B-6: 背景タイプ「別画像」で使う背景画像を設定する。
 * editState.image（前景写真）とは独立で、Undo・プリセットの対象外。
 * @param {HTMLImageElement | null} img - 背景に使う画像。null でクリア。
 */
function setBackgroundImage(img) {
    editState.bgImage = img || null;
    notifyStateChange();
}

export {
    getState, updateState, addStateChangeListener, removeStateChangeListener, setImage,
    setBackgroundImage,
    addTextLayer, removeTextLayer, updateTextLayer, reorderTextLayers, migrateTextSettings,
    EDITABLE_SETTINGS_KEYS
};