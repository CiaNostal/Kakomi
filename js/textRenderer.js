// js/textRenderer.js
import { googleFonts } from './uiDefinitions.js'; // Google Fontsリストをインポート

/**
 * text.js
 * テキスト表示処理を担当するモジュール
 */

// Google Fontsの読み込み状態を管理するMap
// key: apiName (e.g., "Roboto:wght@400")
// value: { promise: Promise, status: 'idle' | 'loading' | 'loaded' | 'error' }
const fontLoadStates = new Map();

googleFonts.forEach(font => {
    fontLoadStates.set(font.apiName, { promise: null, status: 'idle' });
});

/**
 * 指定されたGoogle Font (apiName) を読み込む。
 * 既に読み込み試行中または完了済みの場合はそのPromiseを返す。
 * @param {string} fontApiName - 読み込むフォントのAPI名 (e.g., "Roboto:wght@400")
 * @returns {Promise} フォント読み込み完了を示すPromise
 */
function loadSingleGoogleFont(fontApiName) {
    const existingState = fontLoadStates.get(fontApiName);

    if (!existingState) {
        console.warn(`[TextRenderer] Font ${fontApiName} not found in definition.`);
        return Promise.reject(new Error(`Font ${fontApiName} not defined.`));
    }

    if (existingState.status === 'loaded') {
        return Promise.resolve();
    }

    if (existingState.status === 'loading' && existingState.promise) {
        return existingState.promise;
    }

    const fontQuery = fontApiName.replace(/ /g, '+');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontQuery}&display=swap`;

    const loadPromise = new Promise((resolve, reject) => {
        link.onload = () => {
            fontLoadStates.set(fontApiName, { ...existingState, status: 'loaded', promise: loadPromise });
            console.log(`[TextRenderer] Font ${fontApiName} loaded.`);
            resolve();
        };
        link.onerror = (err) => {
            fontLoadStates.set(fontApiName, { ...existingState, status: 'error', promise: loadPromise });
            console.error(`[TextRenderer] Failed to load font ${fontApiName}:`, err);
            reject(new Error(`Failed to load font ${fontApiName}.`));
        };
    });

    fontLoadStates.set(fontApiName, { status: 'loading', promise: loadPromise });
    document.head.appendChild(link);
    return loadPromise;
}


/**
 * テキスト要素を描画する (メインの呼び出し関数)
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} currentState - 現在の編集状態
 * @param {number} canvasWidth - キャンバスの幅
 * @param {number} canvasHeight - キャンバスの高さ
 * @param {number} basePhotoShortSideForTextPx - テキストサイズ計算の基準となる写真の短辺の実際のピクセル長
 */
export async function drawText(ctx, currentState, canvasWidth, canvasHeight, basePhotoShortSideForTextPx) {
    console.log("[TextRenderer] drawText called. basePhotoShortSideForTextPx:", basePhotoShortSideForTextPx);

    if (basePhotoShortSideForTextPx <= 0) {
        console.log("[TextRenderer] basePhotoShortSideForTextPx is <= 0, skipping text draw.");
        return;
    }

    const textDrawPromises = [];

    // 撮影日の表示
    if (currentState.textSettings.date.enabled) {
        const exifDateTime = currentState.exifData ? currentState.exifData["0th"]?.[piexif.ImageIFD.DateTime] : null;
        if (exifDateTime) {
            const selectedDateFont = googleFonts.find(f => f.displayName === currentState.textSettings.date.font);
            if (selectedDateFont) { // フォントが見つかれば描画
                const dateFontPromise = loadSingleGoogleFont(selectedDateFont.apiName)
                    .then(() => {
                        drawDateText(
                            ctx,
                            currentState.textSettings.date,
                            selectedDateFont, // フォントオブジェクトを渡す
                            exifDateTime,
                            basePhotoShortSideForTextPx,
                            canvasWidth,
                            canvasHeight
                        );
                    })
                    .catch(error => {
                        console.error(`[TextRenderer] Date font ${selectedDateFont.apiName} could not be loaded for drawing:`, error);
                        // エラーを投げずに解決することで Promise.all が中断しないようにする
                        // あるいは、ここでエラーを再throwして呼び出し元でキャッチする
                    });
                textDrawPromises.push(dateFontPromise);
            } else {
                console.warn(`[TextRenderer] Date font definition not found for: ${currentState.textSettings.date.font}`);
            }
        } else {
            console.log("[TextRenderer] No exifDateTime found for date display.");
        }
    }

    // Exif情報の表示
    if (currentState.textSettings.exif.enabled && currentState.exifData) {
        const selectedExifFont = googleFonts.find(f => f.displayName === currentState.textSettings.exif.font);
        if (selectedExifFont) { // フォントが見つかれば描画
            const exifFontPromise = loadSingleGoogleFont(selectedExifFont.apiName)
                .then(() => {
                    drawExifInfo(
                        ctx,
                        currentState.textSettings.exif,
                        selectedExifFont, // フォントオブジェクトを渡す
                        currentState.exifData,
                        basePhotoShortSideForTextPx,
                        canvasWidth,
                        canvasHeight
                    );
                })
                .catch(error => {
                    console.error(`[TextRenderer] Exif font ${selectedExifFont.apiName} could not be loaded for drawing:`, error);
                });
            textDrawPromises.push(exifFontPromise);
        } else {
            console.warn(`[TextRenderer] Exif font definition not found for: ${currentState.textSettings.exif.font}`);
        }
    }
    try {
        await Promise.all(textDrawPromises); // すべてのフォント読み込みと関連する描画試行を待つ
    } catch (error) {
        // textDrawPromises内の個々のcatchで処理されていれば、ここは呼ばれない可能性がある
        console.error("[TextRenderer] Error during Promise.all in drawText:", error);
    }
}

/**
 * 撮影日テキストを描画する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} dateSettings - 日付表示の設定 (currentState.textSettings.date)
 * @param {Object} fontObject - 選択されたフォントオブジェクト (from googleFonts list)
 * @param {string} exifDateTimeString - Exifから取得したDateTime文字列
 * @param {number} basePhotoShortSidePx - 基準となる写真の短辺の長さ (px)
 * @param {number} canvasWidth - キャンバスの幅 (px)
 * @param {number} canvasHeight - キャンバスの高さ (px)
 */
function drawDateText(ctx, dateSettings, fontObject, exifDateTimeString, basePhotoShortSidePx, canvasWidth, canvasHeight) {
    const dateString = getFormattedDate(exifDateTimeString, dateSettings.format);
    if (!dateString) return;

    const fontSizePx = (dateSettings.size / 100) * basePhotoShortSidePx;
    if (fontSizePx <= 0) return;

    ctx.save();
    // フォントオブジェクトからフォントファミリーとウェイトを取得して設定
    ctx.font = `${fontObject.fontWeightForCanvas} ${fontSizePx}px "${fontObject.fontFamilyForCanvas}"`;
    ctx.fillStyle = dateSettings.color;

    let textAlign = 'left';
    let textBaseline = 'alphabetic';
    if (dateSettings.position.endsWith('-center')) textAlign = 'center';
    else if (dateSettings.position.endsWith('-right')) textAlign = 'right';
    if (dateSettings.position.startsWith('top-')) textBaseline = 'top';
    else if (dateSettings.position.startsWith('middle-')) textBaseline = 'middle';

    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;

    const textMetrics = ctx.measureText(dateString);
    const textWidth = textMetrics.width;
    const textHeight = fontSizePx;

    const { x, y } = calculateTextPosition(
        dateSettings.position,
        dateSettings.offsetX,
        dateSettings.offsetY,
        textWidth,
        textHeight,
        basePhotoShortSidePx,
        canvasWidth,
        canvasHeight,
        textAlign,
        textBaseline
    );

    console.log(`Drawing date: "${dateString}" at (${x}, ${y}) with font: ${ctx.font} color: ${ctx.fillStyle}`);
    ctx.fillText(dateString, x, y);
    ctx.restore();
}

/**
 * Exif情報を1行のテキストとして描画する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} exifSettings - Exif表示の設定 (currentState.textSettings.exif)
 * @param {Object} fontObject - 選択されたフォントオブジェクト (from googleFonts list)
 * @param {Object} exifDataFromState - Exifデータ (piexif.js形式)
 * @param {number} basePhotoShortSidePx - 基準となる写真の短辺の長さ (px)
 * @param {number} canvasWidth - キャンバスの幅 (px)
 * @param {number} canvasHeight - キャンバスの高さ (px)
 */
function drawExifInfo(ctx, exifSettings, fontObject, exifDataFromState, basePhotoShortSidePx, canvasWidth, canvasHeight) {
    if (!exifDataFromState || !exifSettings.items || exifSettings.items.length === 0) return;

    const displayedExifValues = [];
    const displayOrder = ['Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISOSpeedRatings', 'FocalLength'];

    for (const itemKey of displayOrder) {
        if (exifSettings.items.includes(itemKey)) {
            const value = getExifValue(exifDataFromState, itemKey);
            if (value) {
                let displayValue = value;
                if (itemKey === 'ISOSpeedRatings' && !String(value).toUpperCase().startsWith('ISO')) {
                    displayValue = `ISO ${value}`;
                }
                displayedExifValues.push(displayValue);
            }
        }
    }

    if (displayedExifValues.length === 0) return;
    const exifString = displayedExifValues.join('  '); // 区切り文字をスペース2つに

    const fontSizePx = (exifSettings.size / 100) * basePhotoShortSidePx;
    if (fontSizePx <= 0) return;

    ctx.save();
    ctx.font = `${fontObject.fontWeightForCanvas} ${fontSizePx}px "${fontObject.fontFamilyForCanvas}"`;
    ctx.fillStyle = exifSettings.color;

    let textAlign = 'left';
    let textBaseline = 'alphabetic';
    if (exifSettings.position.endsWith('-center')) textAlign = 'center';
    else if (exifSettings.position.endsWith('-right')) textAlign = 'right';
    if (exifSettings.position.startsWith('top-')) textBaseline = 'top';
    else if (exifSettings.position.startsWith('middle-')) textBaseline = 'middle';

    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;

    const textMetrics = ctx.measureText(exifString);
    const textWidth = textMetrics.width;
    const textHeight = fontSizePx;

    const { x, y } = calculateTextPosition(
        exifSettings.position,
        exifSettings.offsetX,
        exifSettings.offsetY,
        textWidth,
        textHeight,
        basePhotoShortSidePx,
        canvasWidth,
        canvasHeight,
        textAlign,
        textBaseline
    );

    console.log(`Drawing Exif string: "${exifString}" at (${x}, ${y}) with font: ${ctx.font} color: ${ctx.fillStyle}`);
    ctx.fillText(exifString, x, y);
    ctx.restore();
}


// calculateTextPosition, getFormattedDate, getExifLabel, getExifValue は変更なしのため省略
// ... (これらの関数の既存のコードをここに含める)
// calculateTextPosition (変更なし)
function calculateTextPosition(position, offsetXPercent, offsetYPercent, textWidth, textHeight, photoShortSidePx, canvasWidth, canvasHeight, textAlign = 'left', textBaseline = 'top') {
    const margin = 0;
    const offsetXPx = (offsetXPercent / 100) * photoShortSidePx;
    const offsetYPx = (offsetYPercent / 100) * photoShortSidePx;
    let baseX, baseY;
    if (position.startsWith('top-')) {
        baseY = margin;
        if (textBaseline === 'middle') baseY += textHeight / 2;
        else if (textBaseline === 'alphabetic' || textBaseline === 'bottom') baseY += textHeight;
    }
    else if (position.startsWith('middle-')) {
        baseY = canvasHeight / 2;
        if (textBaseline === 'top') baseY -= textHeight / 2;
        else if (textBaseline === 'alphabetic' || textBaseline === 'bottom') baseY += textHeight / 2;
    }
    else if (position.startsWith('bottom-')) {
        baseY = canvasHeight - margin;
        if (textBaseline === 'top') baseY -= textHeight;
        else if (textBaseline === 'middle') baseY -= textHeight / 2;
    }
    if (position.endsWith('-left')) {
        baseX = margin;
    } else if (position.endsWith('-center')) {
        baseX = canvasWidth / 2;
    } else if (position.endsWith('-right')) {
        baseX = canvasWidth - margin;
    }
    if (baseX === undefined || baseY === undefined) {
        baseX = margin;
        baseY = canvasHeight - margin;
        if (textBaseline === 'top') baseY -= textHeight;
        else if (textBaseline === 'middle') baseY -= textHeight / 2;
        console.warn("Text position calculation fallback used for:", position);
    }
    return {
        x: baseX + offsetXPx,
        y: baseY + offsetYPx
    };
}

// getFormattedDate (変更なし)
function getFormattedDate(exifDateTimeString, displayFormat = 'YYYY/MM/DD') {
    if (!exifDateTimeString || typeof exifDateTimeString !== 'string') return '';
    if (!displayFormat || typeof displayFormat !== 'string') return '';
    const parts = exifDateTimeString.split(' ');
    if (parts.length === 0) return '';
    const dateParts = parts[0].split(':');
    if (dateParts.length !== 3) return '';
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];
    let result = displayFormat;
    result = result.replace('YYYY', year);
    result = result.replace('YY', year.slice(-2));
    result = result.replace('MM', month);
    result = result.replace('DD', day);
    return result;
}

// getExifLabel (変更なし)
function getExifLabel(itemKey) {
    const labels = {
        'Make': 'メーカー',
        'Model': '機種名',
        'FNumber': 'F値',
        'ExposureTime': 'シャッタースピード',
        'ISOSpeedRatings': 'ISO感度',
        'FocalLength': '焦点距離',
        'LensModel': 'レンズ情報',
    };
    return labels[itemKey] || itemKey;
}

// getExifValue (変更なし)
function getExifValue(exifDataFromState, itemKey) {
    if (!exifDataFromState || typeof piexif === 'undefined') return '';
    const zerothIFD = exifDataFromState["0th"];
    const exifIFD = exifDataFromState["Exif"];
    const ImageIFD_CONSTANTS = piexif.ImageIFD;
    const ExifIFD_CONSTANTS = piexif.ExifIFD;
    if (!zerothIFD && !exifIFD) return '';

    switch (itemKey) {
        case 'Make':
            return (zerothIFD && ImageIFD_CONSTANTS && ImageIFD_CONSTANTS.Make !== undefined) ? zerothIFD[ImageIFD_CONSTANTS.Make] : '';
        case 'Model':
            return (zerothIFD && ImageIFD_CONSTANTS && ImageIFD_CONSTANTS.Model !== undefined) ? zerothIFD[ImageIFD_CONSTANTS.Model] : '';
        case 'FNumber':
            if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.FNumber !== undefined) {
                const fVal = exifIFD[ExifIFD_CONSTANTS.FNumber];
                if (fVal && Array.isArray(fVal) && fVal.length === 2 && fVal[1] !== 0) {
                    return `F${(fVal[0] / fVal[1]).toFixed(1)}`;
                }
            }
            return '';
        case 'ExposureTime':
            if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.ExposureTime !== undefined) {
                const etVal = exifIFD[ExifIFD_CONSTANTS.ExposureTime];
                if (etVal && Array.isArray(etVal) && etVal.length === 2 && etVal[1] !== 0) {
                    const et = etVal[0] / etVal[1];
                    if (et >= 1) return `${et.toFixed(1)}秒`;
                    if (et >= 0.1) return `${et.toFixed(2)}秒`;
                    return `1/${Math.round(1 / et)}秒`;
                }
            }
            return '';
        case 'ISOSpeedRatings':
            if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.ISOSpeedRatings !== undefined) {
                const iso = exifIFD[ExifIFD_CONSTANTS.ISOSpeedRatings];
                return iso ? `${Array.isArray(iso) ? iso[0] : iso}` : '';
            }
            return '';
        case 'FocalLength':
            if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.FocalLength !== undefined) {
                const flVal = exifIFD[ExifIFD_CONSTANTS.FocalLength];
                if (flVal && Array.isArray(flVal) && flVal.length === 2 && flVal[1] !== 0) {
                    return `${Math.round(flVal[0] / flVal[1])}mm`;
                }
            }
            return '';
        case 'LensModel':
            return (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.LensModel !== undefined) ? exifIFD[ExifIFD_CONSTANTS.LensModel] : '';
        default:
            return '';
    }
}

// The original full code for textRenderer.js had `export { drawText, loadGoogleFonts };`
// Now, drawText is async. loadGoogleFonts was already an alias for loadSingleGoogleFont.
export { loadSingleGoogleFont as loadGoogleFonts };