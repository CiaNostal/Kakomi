/**
 * text.js
 * テキスト表示処理を担当するモジュール
 */

/**
 * テキスト要素を描画する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} currentState - 現在の編集状態
 * @param {number} canvasWidth - キャンバスの幅
 * @param {number} canvasHeight - キャンバスの高さ
 */
function drawText(ctx, currentState, canvasWidth, canvasHeight) {
    console.log("drawText called", currentState.textSettings);
    const photoShortSide = Math.min(
        currentState.photoDrawConfig.destWidth,
        currentState.photoDrawConfig.destHeight
    );

    // 撮影日の表示
    if (currentState.textSettings.date.enabled && currentState.exifData) {
        drawDateText(
            ctx,
            currentState.textSettings.date,
            getFormattedDate(currentState.exifData),
            photoShortSide,
            canvasWidth,
            canvasHeight
        );
    }

    // Exif情報の表示
    if (currentState.textSettings.exif.enabled && currentState.exifData) {
        drawExifInfo(
            ctx,
            currentState.textSettings.exif,
            currentState.exifData,
            photoShortSide,
            canvasWidth,
            canvasHeight
        );
    }
}

/**
 * 撮影日テキストを描画する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} dateSettings - 日付表示の設定
 * @param {string} dateString - フォーマットされた日付文字列
 * @param {number} photoShortSide - 写真の短辺の長さ
 * @param {number} canvasWidth - キャンバスの幅
 * @param {number} canvasHeight - キャンバスの高さ
 */
function drawDateText(ctx, dateSettings, dateString, photoShortSide, canvasWidth, canvasHeight) {
    if (!dateString) return;

    // フォントサイズを計算
    const fontSize = (dateSettings.size / 100) * photoShortSide;

    ctx.save();
    ctx.font = `${fontSize}px "${dateSettings.font}"`;
    ctx.fillStyle = dateSettings.color;
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText(dateString).width;

    // 位置を計算
    const { x, y } = calculateTextPosition(
        dateSettings.position,
        dateSettings.offsetX,
        dateSettings.offsetY,
        textWidth,
        fontSize,
        photoShortSide,
        canvasWidth,
        canvasHeight
    );

    ctx.fillText(dateString, x, y);
    ctx.restore();
}

/**
 * Exif情報を描画する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} exifSettings - Exif表示の設定
 * @param {Object} exifData - Exifデータ
 * @param {number} photoShortSide - 写真の短辺の長さ
 * @param {number} canvasWidth - キャンバスの幅
 * @param {number} canvasHeight - キャンバスの高さ
 */
function drawExifInfo(ctx, exifSettings, exifData, photoShortSide, canvasWidth, canvasHeight) {
    // 表示するExif情報を収集
    const exifLines = [];

    for (const item of exifSettings.items) {
        const value = getExifValue(exifData, item);
        if (value) {
            exifLines.push(`${getExifLabel(item)}: ${value}`);
        }
    }

    if (exifLines.length === 0) return;

    // フォントサイズを計算
    const fontSize = (exifSettings.size / 100) * photoShortSide;
    const lineHeight = fontSize * 1.2;

    ctx.save();
    ctx.font = `${fontSize}px "${exifSettings.font}"`;
    ctx.fillStyle = exifSettings.color;
    ctx.textBaseline = 'top';

    // 最も長い行の幅を測定
    let maxWidth = 0;
    for (const line of exifLines) {
        const width = ctx.measureText(line).width;
        if (width > maxWidth) maxWidth = width;
    }

    // 位置を計算
    const { x, y } = calculateTextPosition(
        exifSettings.position,
        exifSettings.offsetX,
        exifSettings.offsetY,
        maxWidth,
        lineHeight * exifLines.length,
        photoShortSide,
        canvasWidth,
        canvasHeight
    );

    // 各行を描画
    for (let i = 0; i < exifLines.length; i++) {
        ctx.fillText(exifLines[i], x, y + i * lineHeight);
    }

    ctx.restore();
}

/**
 * テキスト描画位置を計算する
 * @param {string} position - 位置指定（'top-left', 'bottom-right'など）
 * @param {number} offsetX - X方向オフセット（%）
 * @param {number} offsetY - Y方向オフセット（%）
 * @param {number} textWidth - テキストの幅
 * @param {number} textHeight - テキストの高さ
 * @param {number} photoShortSide - 写真の短辺の長さ
 * @param {number} canvasWidth - キャンバスの幅
 * @param {number} canvasHeight - キャンバスの高さ
 * @returns {Object} X座標とY座標
 */
function calculateTextPosition(position, offsetX, offsetY, textWidth, textHeight, photoShortSide, canvasWidth, canvasHeight) {
    // オフセットをピクセルに変換
    const offsetXPx = (offsetX / 100) * photoShortSide;
    const offsetYPx = (offsetY / 100) * photoShortSide;

    // 基本位置を計算
    let x, y;

    switch (position) {
        case 'top-left':
            x = 10;
            y = 10;
            break;
        case 'top-center':
            x = (canvasWidth - textWidth) / 2;
            y = 10;
            break;
        case 'top-right':
            x = canvasWidth - textWidth - 10;
            y = 10;
            break;
        case 'middle-left':
            x = 10;
            y = (canvasHeight - textHeight) / 2;
            break;
        case 'middle-center':
            x = (canvasWidth - textWidth) / 2;
            y = (canvasHeight - textHeight) / 2;
            break;
        case 'middle-right':
            x = canvasWidth - textWidth - 10;
            y = (canvasHeight - textHeight) / 2;
            break;
        case 'bottom-left':
            x = 10;
            y = canvasHeight - textHeight - 10;
            break;
        case 'bottom-center':
            x = (canvasWidth - textWidth) / 2;
            y = canvasHeight - textHeight - 10;
            break;
        case 'bottom-right':
        default:
            x = canvasWidth - textWidth - 10;
            y = canvasHeight - textHeight - 10;
            break;
    }

    // オフセットを適用
    return {
        x: x + offsetXPx,
        y: y + offsetYPx
    };
}

/**
 * Exifデータから日付を取得してフォーマットする
 * @param {Object} exifData - Exifデータ
 * @param {string} format - 日付フォーマット
 * @returns {string} フォーマットされた日付
 */
// getFormattedDate も同様に piexif.js の構造を意識して修正
function getFormattedDate(exifData, format = 'YYYY/MM/DD') {
    if (!exifData || typeof piexif === 'undefined' || !piexif.ImageIFD) return '';

    const zerothIFD = exifData["0th"];
    const dateTimeTag = piexif.ImageIFD.DateTime; // piexif.ImageIFD が存在することを前提

    if (zerothIFD && dateTimeTag !== undefined) {
        const dateStr = zerothIFD[dateTimeTag];
        if (!dateStr || typeof dateStr !== 'string') return '';

        const parts = dateStr.split(' '); // "YYYY:MM:DD HH:MM:SS"
        if (parts.length === 0) return '';

        const dateParts = parts[0].split(':');
        if (dateParts.length !== 3) return '';

        const year = dateParts[0];
        const month = dateParts[1];
        const day = dateParts[2];

        let result = format;
        result = result.replace('YYYY', year).replace('YY', year.slice(-2))
            .replace('MM', month).replace('DD', day);
        return result;
    }
    return '';
}

/**
 * Exif項目のラベルを取得する
 * @param {string} item - Exif項目キー
 * @returns {string} 表示用ラベル
 */
function getExifLabel(item) {
    const labels = {
        'make': 'メーカー',
        'model': '機種名',
        'fNumber': 'F値',
        'exposureTime': 'シャッタースピード',
        'iso': 'ISO感度',
        'focalLength': '焦点距離',
        'lens': 'レンズ',
        'software': 'ソフトウェア'
    };

    return labels[item] || item;
}

/**
 * Exifデータから指定された項目の値を取得する
 * @param {Object} exifData - Exifデータ
 * @param {string} item - 取得する項目
 * @returns {string} 項目の値
 */
// js/textRenderer.js の getExifValue 関数を piexif.js のデータ構造に合わせて修正
function getExifValue(exifData, itemKey) { // itemKey は 'make', 'model' など
    if (!exifData || typeof piexif === 'undefined' || !piexif.ImageIFD || !piexif.ExifIFD) return '';

    const ImageIFD_CONSTANTS = piexif.ImageIFD;
    const ExifIFD_CONSTANTS = piexif.ExifIFD;

    const zerothIFD = exifData["0th"];
    const exifIFD = exifData["Exif"];

    // getTagValue は exifHandler.js にある想定だが、もし textRenderer.js 内で使うなら別途定義かインポートが必要
    // ここでは exifHandler.js の getTagValue を使ったと仮定する (実際には直接アクセス)
    // または、textRenderer.js 用に簡易的な値取得ロジックをここに書く

    switch (itemKey) {
        case 'make':
            return zerothIFD && ImageIFD_CONSTANTS.Make !== undefined ? zerothIFD[ImageIFD_CONSTANTS.Make] : '';
        case 'model':
            return zerothIFD && ImageIFD_CONSTANTS.Model !== undefined ? zerothIFD[ImageIFD_CONSTANTS.Model] : '';
        case 'fNumber':
            if (exifIFD && ExifIFD_CONSTANTS.FNumber !== undefined) {
                const fVal = exifIFD[ExifIFD_CONSTANTS.FNumber];
                if (fVal && Array.isArray(fVal) && fVal.length === 2 && fVal[1] !== 0) {
                    return `F${(fVal[0] / fVal[1]).toFixed(1)}`;
                }
            }
            return '';
        // ... 他の項目も同様に piexif.js の構造に合わせて修正 ...
        case 'exposureTime':
            if (exifIFD && ExifIFD_CONSTANTS.ExposureTime !== undefined) {
                const etVal = exifIFD[ExifIFD_CONSTANTS.ExposureTime];
                if (etVal && Array.isArray(etVal) && etVal.length === 2 && etVal[1] !== 0) {
                    const et = etVal[0] / etVal[1];
                    if (et < 1) return `1/${Math.round(1 / et)}秒`;
                    return `${et.toFixed(2)}秒`;
                }
            }
            return '';
        case 'iso':
            if (exifIFD && ExifIFD_CONSTANTS.ISOSpeedRatings !== undefined) {
                const iso = exifIFD[ExifIFD_CONSTANTS.ISOSpeedRatings];
                return iso ? `ISO ${Array.isArray(iso) ? iso[0] : iso}` : '';
            }
            return '';
        case 'focalLength':
            if (exifIFD && ExifIFD_CONSTANTS.FocalLength !== undefined) {
                const flVal = exifIFD[ExifIFD_CONSTANTS.FocalLength];
                if (flVal && Array.isArray(flVal) && flVal.length === 2 && flVal[1] !== 0) {
                    return `${Math.round(flVal[0] / flVal[1])}mm`;
                }
            }
            return '';
        // ... (LensModel, Software なども同様に)
        default:
            // 直接アクセスできる他の一般的なタグも考慮するなら、ここで処理
            // ただし、textSettings.exif.items にリストされているものに限定するのが良い
            return '';
    }
}

// Google Fontsの読み込み状態を管理
const loadedFonts = new Set();
let fontsLoadPromise = null;

/**
 * Google Fontsを読み込む
 * @param {Array} fontFamilies - 読み込むフォントファミリーの配列
 * @returns {Promise} フォント読み込み完了を示すPromise
 */
function loadGoogleFonts(fontFamilies) {
    // 既に読み込み済みのフォントをフィルタリング
    const fontsToLoad = fontFamilies.filter(font => !loadedFonts.has(font));

    if (fontsToLoad.length === 0) {
        return Promise.resolve();
    }

    // 既に読み込み中のPromiseがあればそれを返す
    if (fontsLoadPromise) {
        return fontsLoadPromise;
    }

    // Google Fonts APIのURLを構築
    const fontQuery = fontsToLoad.map(font => {
        // スペースを+に置き換え
        return font.replace(/ /g, '+');
    }).join('|');

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontQuery}&display=swap`;

    // フォント読み込みを待つPromiseを作成
    fontsLoadPromise = new Promise((resolve, reject) => {
        link.onload = () => {
            // 読み込んだフォントを記録
            fontsToLoad.forEach(font => loadedFonts.add(font));
            fontsLoadPromise = null;
            resolve();
        };
        link.onerror = () => {
            fontsLoadPromise = null;
            reject(new Error('Googleフォントの読み込みに失敗しました。'));
        };
    });

    document.head.appendChild(link);
    return fontsLoadPromise;
}

// モジュールとしてエクスポート
export { drawText, loadGoogleFonts }; 