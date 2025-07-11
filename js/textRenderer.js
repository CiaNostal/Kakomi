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
    if (!fontLoadStates.has(font.apiName)) {
        fontLoadStates.set(font.apiName, { promise: null, status: 'idle' });
    }
});

// HEXカラーとアルファ値からRGBA文字列を生成するヘルパー関数
function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`; // フォールバック
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) { // #RGB
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) { // #RRGGBB
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * 指定されたGoogle Font (apiName) を読み込む。
 * @param {string} fontApiName - 読み込むフォントのAPI名 (e.g., "Roboto:wght@400")
 * @returns {Promise} フォント読み込み完了を示すPromise
 */
async function loadSingleGoogleFont(fontApiName) {
    const fontObject = googleFonts.find(f => f.apiName === fontApiName);
    if (!fontObject) {
        console.warn(`[TextRenderer] Font object for ${fontApiName} not found in definition.`);
        return Promise.reject(new Error(`Font object for ${fontApiName} not defined.`));
    }
    const existingState = fontLoadStates.get(fontApiName);

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
            console.log(`[TextRenderer] CSS for font ${fontApiName} loaded (link.onload).`);
            fontLoadStates.set(fontApiName, { status: 'loaded', promise: loadPromise });
            resolve();
        };
        link.onerror = (err) => {
            console.error(`[TextRenderer] Failed to load CSS for font ${fontApiName} (link.onerror):`, err);
            fontLoadStates.set(fontApiName, { status: 'error', promise: loadPromise });
            reject(new Error(`Failed to load CSS for font ${fontApiName}.`));
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
    if (basePhotoShortSideForTextPx <= 0) {
        return;
    }

    const textTasks = [];

    // 撮影日の表示タスク準備
    if (currentState.textSettings.date.enabled) {
        const exifDateTime = currentState.exifData ? currentState.exifData["0th"]?.[piexif.ImageIFD.DateTime] : null;
        if (exifDateTime) {
            const settings = currentState.textSettings.date;
            const text = getFormattedDate(exifDateTime, settings.format);
            if (text) textTasks.push({ settings, text });
        }
    }

    // Exif情報の表示タスク準備
    if (currentState.textSettings.exif.enabled && currentState.exifData) {
        const settings = currentState.textSettings.exif;
        const text = settings.customText || '';
        if (text.trim() !== '') textTasks.push({ settings, text });
    }

    // 自由テキストの表示タスク準備
    if (currentState.textSettings.freeText.enabled) {
        const settings = currentState.textSettings.freeText;
        const text = settings.text || '';
        if (text.trim() !== '') textTasks.push({ settings, text });
    }

    // すべてのテキスト描画タスクを実行
    for (const task of textTasks) {
        const { settings, text } = task;
        const fontObject = googleFonts.find(f => f.displayName === settings.font);

        if (!fontObject) {
            console.warn(`[TextRenderer] Font definition not found for: ${settings.font}`);
            continue;
        }

        try {
            await loadSingleGoogleFont(fontObject.apiName);
            const fontCheckString = `${fontObject.fontWeightForCanvas} 1em "${fontObject.fontFamilyForCanvas}"`;
            await document.fonts.load(fontCheckString, text);
            drawSingleText(ctx, settings, text, fontObject, basePhotoShortSideForTextPx, canvasWidth, canvasHeight);
        } catch (error) {
            console.error(`[TextRenderer] Failed to load or draw with font ${fontObject.apiName}:`, error);
        }
    }
}

/**
 * 単一のテキストブロックを描画する共通関数
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} settings - textSettings.date, .exif, .freeText のいずれか
 * @param {string} textToDraw - 描画する実際の文字列
 * @param {Object} fontObject
 * @param {number} basePhotoShortSidePx
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
function drawSingleText(ctx, settings, textToDraw, fontObject, basePhotoShortSidePx, canvasWidth, canvasHeight) {
    const fontSizePx = (settings.size / 100) * basePhotoShortSidePx;
    if (fontSizePx <= 0) return;

    ctx.save();
    ctx.font = `${fontObject.fontWeightForCanvas} ${fontSizePx}px "${fontObject.fontFamilyForCanvas}"`;
    ctx.fillStyle = hexToRgba(settings.color, settings.opacity);

    let textAlign = 'left';
    let textBaseline = 'top';

    if (settings.textAlign) {
        textAlign = settings.textAlign;
    } else {
        if (settings.position.endsWith('-center')) textAlign = 'center';
        else if (settings.position.endsWith('-right')) textAlign = 'right';
    }
    if (settings.position.startsWith('bottom-')) textBaseline = 'bottom';
    else if (settings.position.startsWith('middle-')) textBaseline = 'middle';

    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;

    const lines = textToDraw.split('\n');
    const lineHeight = fontSizePx * 1.3;
    let maxWidth = 0;
    if (lines.length > 0) {
        maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    }
    const textBlockHeight = (lines.length - 1) * lineHeight + fontSizePx;

    let { x, y } = calculateTextPosition(
        settings.position,
        settings.offsetX,
        settings.offsetY,
        maxWidth,
        textBlockHeight,
        basePhotoShortSidePx,
        canvasWidth,
        canvasHeight,
        textAlign,
        textBaseline
    );

    if (textBaseline === 'bottom') {
        const visualCorrection = (lineHeight - fontSizePx) / 2;
        y += visualCorrection;
    }

    if (textBaseline === 'bottom') {
        const reversedLines = [...lines].reverse();
        reversedLines.forEach((line, index) => {
            const lineY = y - (index * lineHeight);
            ctx.fillText(line, x, lineY);
        });
    } else {
        lines.forEach((line, index) => {
            const lineY = y + (index * lineHeight);
            ctx.fillText(line, x, lineY);
        });
    }
    ctx.restore();
}

function calculateTextPosition(position, offsetXPercent, offsetYPercent, textWidth, textHeight, photoShortSidePx, canvasWidth, canvasHeight, textAlign = 'left', textBaseline = 'top') {
    const margin = 0;
    const offsetXPx = (offsetXPercent / 100) * photoShortSidePx;
    const offsetYPx = (offsetYPercent / 100) * photoShortSidePx;
    let baseX, baseY;

    if (position.endsWith('-left')) {
        if (textAlign === 'left') baseX = margin;
        else if (textAlign === 'center') baseX = margin + textWidth / 2;
        else baseX = margin + textWidth;
    } else if (position.endsWith('-right')) {
        if (textAlign === 'left') baseX = canvasWidth - margin - textWidth;
        else if (textAlign === 'center') baseX = canvasWidth - margin - textWidth / 2;
        else baseX = canvasWidth - margin;
    } else {
        if (textAlign === 'left') baseX = canvasWidth / 2 - textWidth / 2;
        else if (textAlign === 'center') baseX = canvasWidth / 2;
        else baseX = canvasWidth / 2 + textWidth / 2;
    }

    if (textBaseline === 'top') {
        baseY = margin;
    } else if (textBaseline === 'middle') {
        baseY = canvasHeight / 2 - textHeight / 2;
    } else { // bottom
        baseY = canvasHeight - margin;
    }

    // Y座標の垂直位置の基準点を決定
    if (position.startsWith('top-')) {
        baseY = margin;
    } else if (position.startsWith('middle-')) {
        // 'middle' の場合、textBaseline に応じて基準点を調整
        if (textBaseline === 'top') {
            baseY = canvasHeight / 2 - textHeight / 2;
        } else if (textBaseline === 'bottom') {
            baseY = canvasHeight / 2 + textHeight / 2;
        } else { // 'middle'
            baseY = canvasHeight / 2;
        }
    } else if (position.startsWith('bottom-')) {
        baseY = canvasHeight - margin;
    }

    return {
        x: baseX + offsetXPx,
        y: baseY + offsetYPx
    };
}

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

export { loadSingleGoogleFont as loadGoogleFonts };