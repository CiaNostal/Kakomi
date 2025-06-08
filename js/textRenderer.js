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
googleFonts.forEach(font => { // This assumes googleFonts is populated when this module is initialized.
    if (!fontLoadStates.has(font.apiName)) {
        fontLoadStates.set(font.apiName, { promise: null, status: 'idle' });
    }
});

/**
 * 指定されたGoogle Font (apiName) を読み込む。
 * 既に読み込み試行中または完了済みの場合はそのPromiseを返す。
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
            console.log(`[TextRenderer] CSS for font ${fontApiName} loaded (link.onload). Now checking document.fonts.`);
            // CSSの font-style-weight-stretch-size family の形式で指定。サイズは必須。ウェイトも指定。
            const fontCheckString = `${fontObject.fontWeightForCanvas} 1em "${fontObject.fontFamilyForCanvas}"`;

            document.fonts.load(fontCheckString)
                .then((loadedFontFaces) => {
                    if (loadedFontFaces.length > 0) {
                        fontLoadStates.set(fontApiName, { status: 'loaded', promise: loadPromise }); // Update state
                        console.log(`[TextRenderer] Font ${fontApiName} (${fontCheckString}) is ready for use (document.fonts.load resolved).`);
                        resolve();
                    } else {
                        console.error(`[TextRenderer] document.fonts.load reported no fonts loaded for: ${fontCheckString} despite link.onload.`);
                        fontLoadStates.set(fontApiName, { status: 'error', promise: loadPromise }); // Update state
                        reject(new Error(`Font not made available by browser after download: ${fontApiName}`));
                    }
                })
                .catch(err => {
                    console.error(`[TextRenderer] document.fonts.load() rejected for ${fontApiName} (${fontCheckString}):`, err);
                    fontLoadStates.set(fontApiName, { status: 'error', promise: loadPromise }); // Update state
                    reject(new Error(`document.fonts.load() failed for ${fontApiName}.`));
                });
        };
        link.onerror = (err) => {
            console.error(`[TextRenderer] Failed to load CSS for font ${fontApiName} (link.onerror):`, err);
            fontLoadStates.set(fontApiName, { status: 'error', promise: loadPromise }); // Update state
            reject(new Error(`Failed to load CSS for font ${fontApiName}.`));
        };
    });

    fontLoadStates.set(fontApiName, { status: 'loading', promise: loadPromise }); // Set initial loading state
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
    // ★変更: exifSettings.customText を直接使用するように変更
    const exifString = exifSettings.customText || '';
    if (exifString.trim() === '') return;

    const fontSizePx = (exifSettings.size / 100) * basePhotoShortSidePx;
    if (fontSizePx <= 0) return;

    ctx.save();
    ctx.font = `${fontObject.fontWeightForCanvas} ${fontSizePx}px "${fontObject.fontFamilyForCanvas}"`;
    ctx.fillStyle = exifSettings.color;

    // ★変更: positionに応じてtextBaselineを動的に設定
    const textAlign = exifSettings.textAlign || 'left';
    let textBaseline = 'top'; // デフォルト
    if (exifSettings.position.startsWith('bottom-')) textBaseline = 'bottom';
    else if (exifSettings.position.startsWith('middle-')) textBaseline = 'middle';

    // ★変更: ユーザー指定のtextAlignを最終的に適用
    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;

    const lines = exifString.split('\n');
    const lineHeight = fontSizePx * 1.1; // 行の高さをフォントサイズの1.1倍に（調整可能）
    // const textBlockHeight = lines.length * lineHeight;

    let maxWidth = 0;
    if (lines.length > 0) {
        const textMetrics = lines.map(line => ctx.measureText(line).width);
        maxWidth = Math.max(...textMetrics);
    }
    const textBlockHeight = (lines.length - 1) * lineHeight + fontSizePx;

    const { x, y } = calculateTextPosition(
        exifSettings.position,
        exifSettings.offsetX,
        exifSettings.offsetY,
        maxWidth, // ★変更: 計算したテキストブロックの最大幅を渡す
        textBlockHeight, // ブロック全体の高さを渡す
        basePhotoShortSidePx,
        canvasWidth,
        canvasHeight,
        textAlign,
        textBaseline
    );

    // ★変更: textBaselineに応じて描画ループを分岐
    if (textBaseline === 'bottom') {
        const reversedLines = [...lines].reverse(); // 描画順を逆にする
        reversedLines.forEach((line, index) => {
            const lineY = y - (index * lineHeight); // 下から上へ描画
            ctx.fillText(line, x, lineY);
        });
    } else { // top or middle
        lines.forEach((line, index) => {
            const lineY = y + (index * lineHeight); // 上から下へ描画
            ctx.fillText(line, x, lineY);
        });
    }
    ctx.restore();
}

// calculateTextPosition (変更なし)
function calculateTextPosition(position, offsetXPercent, offsetYPercent, textWidth, textHeight, photoShortSidePx, canvasWidth, canvasHeight, textAlign = 'left', textBaseline = 'top') {
    const margin = 0;
    const offsetXPx = (offsetXPercent / 100) * photoShortSidePx;
    const offsetYPx = (offsetYPercent / 100) * photoShortSidePx;
    let baseX, baseY;

    // ★変更: X座標の計算ロジックを全面的に修正
    if (position.endsWith('-left')) { // ブロック全体を左寄せ
        if (textAlign === 'left') baseX = margin;
        else if (textAlign === 'center') baseX = margin + textWidth / 2;
        else baseX = margin + textWidth;
    } else if (position.endsWith('-right')) { // ブロック全体を右寄せ
        if (textAlign === 'left') baseX = canvasWidth - margin - textWidth;
        else if (textAlign === 'center') baseX = canvasWidth - margin - textWidth / 2;
        else baseX = canvasWidth - margin;
    } else { // ブロック全体を中央寄せ (position.endsWith('-center'))
        if (textAlign === 'left') baseX = canvasWidth / 2 - textWidth / 2;
        else if (textAlign === 'center') baseX = canvasWidth / 2;
        else baseX = canvasWidth / 2 + textWidth / 2;
    }

    // ★変更: Y座標の計算をtextBaselineに合わせて単純化
    if (textBaseline === 'top') { baseY = margin; }
    else if (textBaseline === 'middle') { baseY = canvasHeight / 2 - textHeight / 2; }
    else { baseY = canvasHeight - margin; } // bottomの場合

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

// The original full code for textRenderer.js had `export { drawText, loadGoogleFonts };`
// Now, drawText is async. loadGoogleFonts was already an alias for loadSingleGoogleFont.
export { loadSingleGoogleFont as loadGoogleFonts };