// js/stateManager.js
import { googleFonts } from './uiDefinitions.js'; // Google Fontsリストをインポート

/**
 * stateManager.js
 * アプリケーションの状態管理を担当するモジュール
 */

// アプリケーションの状態を保持するオブジェクト
let editState = {
    image: null,
    originalWidth: 0,
    originalHeight: 0,
    originalFileName: null,
    photoViewParams: {
        offsetX: 0.5,
        offsetY: 0.5
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
        cornerStyle: 'none',
        cornerRadiusPercent: 10,
        superellipseN: 10,
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
    // 文字表示関連の設定を追加
    textSettings: {
        date: {
            enabled: false,
            format: 'YYYY.MM.DD',
            font: googleFonts[0].displayName, // ★初期値をGoogle Fontsリストの最初のフォントに
            size: 2,
            color: '#000000', // 仕様書では白背景が多いので、日付は濃い色が良いかもしれないが、現状維持
            opacity: 1, 
            position: 'bottom-left',
            offsetX: 0,
            offsetY: 0
        },
        exif: {
            enabled: false,
            items: ['Make', 'Model', 'FNumber', 'ExposureTime', 'ISOSpeedRatings', 'FocalLength', 'LensModel'],
            customText: '', // ユーザーが編集するテキストエリアの内容
            textAlign: 'left', // 水平方向の配置 'left', 'center', 'right'
            font: googleFonts[0].displayName, // 初期値をGoogle Fontsリストの最初のフォントに
            size: 2,
            color: '#000000',
            opacity: 1, 
            position: 'bottom-right',
            offsetX: 0,
            offsetY: 0
        },
        // 自由テキストは可変長のレイヤー配列として保持する（1個目もaddCustomTextLayer()で追加される）
        customTexts: []
    },
    // 出力関連の設定を追加
    outputSettings: {
        quality: 100,
        preserveExif: true
    },
    // 元画像から切り出すための構図調整設定を追加
    cropSettings: {
        aspectRatio: 'original',
        zoom: 1.0,
        offsetX: 0.5,
        offsetY: 0.5
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

/**
 * 自由テキストレイヤーを1つ追加する
 * @returns {string} 追加されたレイヤーのid
 */
function addCustomTextLayer() {
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `text-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    editState.textSettings.customTexts.push({
        id,
        enabled: true,
        text: 'テキスト',
        textAlign: 'center',
        font: googleFonts[0].displayName,
        size: 5,
        color: '#333333',
        opacity: 1,
        position: 'middle-center',
        offsetX: 0,
        offsetY: 0
    });
    notifyStateChange();
    return id;
}

/**
 * 自由テキストレイヤーを削除する
 * @param {string} id
 */
function removeCustomTextLayer(id) {
    editState.textSettings.customTexts = editState.textSettings.customTexts.filter(t => t.id !== id);
    notifyStateChange();
}

/**
 * 自由テキストレイヤーのプロパティを部分更新する
 * （customTextsは配列なので、updateState()の汎用deepMergeでは配列全体が置き換わってしまうため専用関数を用意している）
 * @param {string} id
 * @param {Object} changes
 */
function updateCustomTextLayer(id, changes) {
    const layer = editState.textSettings.customTexts.find(t => t.id === id);
    if (!layer) return;
    Object.assign(layer, changes);
    notifyStateChange();
}

/**
 * 現在の編集状態のコピーを取得する
 * @returns {Object} 現在の編集状態のディープコピー
 */
function getState() {
    const originalImage = editState.image;
    let stateCopy;
    if (typeof structuredClone === 'function') {
        editState.image = null;
        try {
            stateCopy = structuredClone(editState);
        } catch (e) {
            console.warn("[StateManager] structuredClone failed, falling back to JSON.parse/stringify for non-image properties.", e);
            stateCopy = JSON.parse(JSON.stringify(editState));
        }
        editState.image = originalImage;
        stateCopy.image = originalImage;
    } else {
        console.warn("[StateManager] structuredClone is not available. Using JSON.parse/stringify with manual image handling.");
        stateCopy = JSON.parse(JSON.stringify(editState));
        stateCopy.image = originalImage;
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
    // 基本的な画像情報を更新
    editState.image = img;
    editState.originalWidth = img.width;
    editState.originalHeight = img.height;
    editState.exifData = exifData;
    editState.originalFileName = typeof fileName === 'string' ? fileName : 'image';

    // Reset relevant parts of the state for the new image
    // editState.photoViewParams = { offsetX: 0.5, offsetY: 0.5 };
    // editState.backgroundType = 'color'; // Reset to default or keep current? For now, keep.
    // editState.cropSettings = { aspectRatio: 'original', zoom: 1.0, offsetX: 0.5, offsetY: 0.5 };
    // Consider if text settings font should reset or persist. For now, persist.
    notifyStateChange();
}

export {
    getState, updateState, addStateChangeListener, removeStateChangeListener, setImage,
    addCustomTextLayer, removeCustomTextLayer, updateCustomTextLayer
};