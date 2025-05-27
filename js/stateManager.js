/**
 * stateManager.js
 * アプリケーションの状態管理を担当するモジュール
 */

// アプリケーションの状態を保持するオブジェクト
let editState = {
    image: null,
    originalWidth: 0,
    originalHeight: 0,
    originalFileName: null, // ADDED: 元のファイル名を保持するプロパティ
    photoViewParams: {
        offsetX: 0.5, // 0 (左端) to 1 (右端), 0.5 = 中央
        offsetY: 0.5  // 0 (上端) to 1 (下端), 0.5 = 中央
    },
    outputTargetAspectRatioString: '1:1',
    baseMarginPercent: 5,
    backgroundColor: '#ffffff', // 単色背景用
    backgroundType: 'color', // 'color' または 'imageBlur'
    imageBlurBackgroundParams: {
        scale: 2.0,
        blurAmountPercent: 3, // 写真短辺に対する%
        brightness: 100,    // %
        saturation: 100     // %
    },
    photoDrawConfig: {
        sourceX: 0,
        sourceY: 0,
        sourceWidth: 0,
        sourceHeight: 0,
        destWidth: 0,
        destHeight: 0,
        destXonOutputCanvas: 0,
        destYonOutputCanvas: 0
    },
    outputCanvasConfig: {
        width: 0,
        height: 0
    },
    // フレーム加工関連の設定を追加
    frameSettings: {
        cornerRadius: 0,     // 角丸の半径 (%)
        shadow: {
            enabled: false,
            offsetX: 0,      // 影のオフセットX (%)
            offsetY: 0,      // 影のオフセットY (%)
            blur: 0,         // ぼかし半径 (%)
            spread: 0,       // 広がり (%)
            color: 'rgba(0,0,0,0.5)' // 影の色
        },
        border: {
            enabled: false,
            width: 0,        // 線の太さ (%)
            color: '#000000', // 線の色
            style: 'solid'   // 線のスタイル ('solid', 'dashed')
        }
    },
    // 文字表示関連の設定を追加
    textSettings: {
        date: {
            enabled: false,
            format: 'YYYY/MM/DD', // 日付表示形式
            font: 'Arial',
            size: 3,          // サイズ (%)
            color: '#000000',
            position: 'bottom-right', // 表示位置
            offsetX: 0,       // X方向オフセット (%)
            offsetY: 0        // Y方向オフセット (%)
        },
        exif: {
            enabled: false,
            items: ['make', 'model', 'fNumber', 'exposureTime', 'iso', 'focalLength'],
            font: 'Arial',
            size: 2,          // サイズ (%)
            color: '#000000',
            position: 'bottom-left', // 表示位置
            offsetX: 0,       // X方向オフセット (%)
            offsetY: 0        // Y方向オフセット (%)
        }
    },
    // 出力関連の設定を追加
    outputSettings: {
        quality: 100,        // JPEG品質 (1-100)
        preserveExif: true   // Exif情報を保持するか
    },
    // 元画像から切り出すための構図調整設定を追加
    cropSettings: {
        aspectRatio: 'original', // 'original', '1:1', '4:3', '16:9' など
        zoom: 1.0,            // ズーム率 (1.0 = 元のサイズ)
        offsetX: 0.5,         // 横方向オフセット (0-1)
        offsetY: 0.5          // 縦方向オフセット (0-1)
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

/**
 * 全ての状態変更リスナーを呼び出す
 */
function notifyStateChange() {
    for (const listener of stateChangeListeners) {
        listener(editState);
    }
}

/**
 * 編集状態を更新する
 * @param {Object} updates - 更新するプロパティと値を含むオブジェクト
 */
function updateState(updates) {
    // プロパティのディープマージを行う関数
    function deepMerge(target, source) {
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] instanceof Object && key in target) {
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

    // 変更を通知
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
        // HTMLImageElement は structuredClone で問題が発生したため、一時的に除外
        editState.image = null;
        try {
            stateCopy = structuredClone(editState);
        } catch (e) {
            // structuredClone が他の理由で失敗した場合のフォールバック
            console.warn("[StateManager] structuredClone failed, falling back to JSON.parse/stringify for non-image properties.", e);
            stateCopy = JSON.parse(JSON.stringify(editState));
        }
        editState.image = originalImage; // 元の editState の image を復元
        stateCopy.image = originalImage; // コピーにも image の参照をセット
    } else {
        // structuredClone が利用できない場合のフォールバック
        console.warn("[StateManager] structuredClone is not available. Using JSON.parse/stringify with manual image handling.");
        // image を除外する必要はない（JSON.stringifyが適切に処理しないため、後で上書きする）
        stateCopy = JSON.parse(JSON.stringify(editState));
        stateCopy.image = originalImage; // image の参照をコピー
    }

    return stateCopy;
}


/**
 * 初期状態にリセットする
 */
function resetState() {
    // 画像関連を除く状態をリセット
    const imageBackup = editState.image;
    const originalWidthBackup = editState.originalWidth;
    const originalHeightBackup = editState.originalHeight;
    const exifDataBackup = editState.exifData;

    editState = {
        image: imageBackup,
        originalWidth: originalWidthBackup,
        originalHeight: originalHeightBackup,
        photoViewParams: { offsetX: 0.5, offsetY: 0.5 },
        outputTargetAspectRatioString: '1:1',
        baseMarginPercent: 5,
        backgroundColor: '#ffffff',
        backgroundType: 'color',
        imageBlurBackgroundParams: {
            scale: 2.0,
            blurAmountPercent: 3,
            brightness: 100,
            saturation: 100
        },
        photoDrawConfig: {
            sourceX: 0, sourceY: 0, sourceWidth: 0, sourceHeight: 0,
            destWidth: 0, destHeight: 0,
            destXonOutputCanvas: 0, destYonOutputCanvas: 0
        },
        outputCanvasConfig: { width: 0, height: 0 },
        frameSettings: {
            cornerRadius: 0,
            shadow: {
                enabled: false,
                offsetX: 0,
                offsetY: 0,
                blur: 0,
                spread: 0,
                color: 'rgba(0,0,0,0.5)'
            },
            border: {
                enabled: false,
                width: 0,
                color: '#000000',
                style: 'solid'
            }
        },
        textSettings: {
            date: {
                enabled: false,
                format: 'YYYY/MM/DD',
                font: 'Arial',
                size: 3,
                color: '#000000',
                position: 'bottom-right',
                offsetX: 0,
                offsetY: 0
            },
            exif: {
                enabled: false,
                items: ['make', 'model', 'fNumber', 'exposureTime', 'iso', 'focalLength'],
                font: 'Arial',
                size: 2,
                color: '#000000',
                position: 'bottom-left',
                offsetX: 0,
                offsetY: 0
            }
        },
        outputSettings: {
            quality: 100,
            preserveExif: true
        },
        cropSettings: {
            aspectRatio: 'original',
            zoom: 1.0,
            offsetX: 0.5,
            offsetY: 0.5
        },
        exifData: exifDataBackup
    };

    notifyStateChange();
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
    editState.originalFileName = typeof fileName === 'string' ? fileName : 'image'; // ADDED: ファイル名を保存

    // 画像関連の設定をリセット
    editState.photoViewParams = { offsetX: 0.5, offsetY: 0.5 };
    editState.backgroundType = 'color'; // 新規画像読み込み時は単色背景をデフォルトに
    editState.imageBlurBackgroundParams = {
        scale: 2.0,
        blurAmountPercent: 3,
        brightness: 100,
        saturation: 100
    };
    editState.cropSettings = {
        aspectRatio: 'original',
        zoom: 1.0,
        offsetX: 0.5,
        offsetY: 0.5
    };

    notifyStateChange();
}

// モジュールとしてエクスポート
export {
    getState,
    updateState,
    addStateChangeListener,
    removeStateChangeListener,
    resetState,
    setImage
}; 