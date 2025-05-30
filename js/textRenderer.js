/**
 * text.js
 * テキスト表示処理を担当するモジュール
 */

/**
 * テキスト要素を描画する (メインの呼び出し関数)
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} currentState - 現在の編集状態
 * @param {number} canvasWidth - キャンバスの幅
 * @param {number} canvasHeight - キャンバスの高さ
 * @param {number} basePhotoShortSideForTextPx - テキストサイズ計算の基準となる写真の短辺の実際のピクセル長
 */
function drawText(ctx, currentState, canvasWidth, canvasHeight, basePhotoShortSideForTextPx) {
    console.log("[TextRenderer] drawText called. basePhotoShortSideForTextPx:", basePhotoShortSideForTextPx, "date.enabled:", currentState.textSettings.date.enabled);

    if (basePhotoShortSideForTextPx <= 0) {
        console.log("[TextRenderer] basePhotoShortSideForTextPx is <= 0, skipping text draw.");
        return; // 基準長が0以下なら描画しない
    }

    // 撮影日の表示
    if (currentState.textSettings.date.enabled) {
        // currentState.exifData が null でも getFormattedDate は空文字列を返すので、
        // exifData.DateTime がある場合のみ描画される。
        // exifData 自体がない場合は、getFormattedDateが早期リターンする。
        const exifDateTime = currentState.exifData ? currentState.exifData["0th"]?.[piexif.ImageIFD.DateTime] : null;
        console.log("[TextRenderer] For date text: exifDateTime =", exifDateTime);
        if (exifDateTime) { // DateTimeが存在する場合のみ描画を試みる
            console.log(`drawText: Calling drawDateText with basePhotoShortSideForTextPx: ${basePhotoShortSideForTextPx}`);
            drawDateText(
                ctx,
                currentState.textSettings.date,
                exifDateTime, // ★修正: exifDataオブジェクトではなく、DateTime文字列を渡す
                basePhotoShortSideForTextPx, // ★修正: 呼び出し元から渡された基準長を使用
                canvasWidth,
                canvasHeight
            );
        } else {
            console.log("[TextRenderer] No exifDateTime found for date display.");
        }
    }

    // Exif情報の表示
    if (currentState.textSettings.exif.enabled && currentState.exifData) {
        console.log(`drawText: Calling drawExifInfo with basePhotoShortSideForTextPx: ${basePhotoShortSideForTextPx}`);
        drawExifInfo(
            ctx,
            currentState.textSettings.exif,
            currentState.exifData,
            basePhotoShortSideForTextPx,
            canvasWidth,
            canvasHeight
        );
    }
}

/**
 * 撮影日テキストを描画する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} dateSettings - 日付表示の設定 (currentState.textSettings.date)
 * @param {string} exifDateTimeString - Exifから取得したDateTime文字列 (currentState.exifData.DateTime)
 * @param {number} basePhotoShortSidePx - 基準となる写真の短辺の長さ (px) (プレビュー用または出力用)
 * @param {number} canvasWidth - キャンバスの幅 (px)
 * @param {number} canvasHeight - キャンバスの高さ (px)
 */
function drawDateText(ctx, dateSettings, exifDateTimeString, basePhotoShortSidePx, canvasWidth, canvasHeight) {
    const dateString = getFormattedDate(exifDateTimeString, dateSettings.format);
    console.log("[TextRenderer] drawDateText called. exifDateTimeString:", exifDateTimeString, "Formatted dateString:", dateString, "Font size setting:", dateSettings.size, "Base short side:", basePhotoShortSidePx);
    if (!dateString) {
        console.log("[TextRenderer] dateString is empty, skipping date draw.");
        return;
    }
    const fontSizePx = (dateSettings.size / 100) * basePhotoShortSidePx; // 渡された基準長で計算
    if (fontSizePx <= 0) return; // フォントサイズが0以下なら描画しない

    ctx.save();
    ctx.font = `${fontSizePx}px "${dateSettings.font}"`; // フォントファミリーは文字列として渡す
    ctx.fillStyle = dateSettings.color;

    // テキストの描画基準点を決定 (textAlign と textBaseline)
    // position の例: 'bottom-right' -> textAlign='right', textBaseline='bottom' (または'alphabetic')
    // ここでは、calculateTextPosition が返す座標がテキストブロックの左上隅を指すように、
    // textBaseline='top', textAlign='left' を基準として計算し、描画時に調整する。
    // もしくは、calculateTextPosition側でtextAlign, textBaselineを考慮させる。
    // 今回は calculateTextPosition で調整するよう変更。

    // ctx.textAlign と ctx.textBaseline を position 文字列から推測するか、固定値にするか。
    // 仕様書では「表示位置（左下、右下、中央下など9箇所から選択）」とあるので、
    // その9箇所に合わせてtextAlignとtextBaselineをdrawDateText内で設定し、calculateTextPositionはそれを基に座標を返す。
    let textAlign = 'left';
    let textBaseline = 'alphabetic'; // alphabetic or bottom が一般的

    if (dateSettings.position.endsWith('-center')) textAlign = 'center';
    else if (dateSettings.position.endsWith('-right')) textAlign = 'right';

    if (dateSettings.position.startsWith('top-')) textBaseline = 'top';
    else if (dateSettings.position.startsWith('middle-')) textBaseline = 'middle';
    // 'bottom-' の場合は 'alphabetic' or 'bottom' で良い

    // (注意: textBaseline='bottom' は実際のフォントの下端、'alphabetic'はベースライン。見た目が微妙に異なる)
    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;

    const textMetrics = ctx.measureText(dateString);
    const textWidth = textMetrics.width;
    // おおよその高さをフォントサイズとする (より正確には textMetrics.actualBoundingBoxAscent + descent)
    const textHeight = fontSizePx;

    const { x, y } = calculateTextPosition(
        dateSettings.position,
        dateSettings.offsetX, // パーセント値
        dateSettings.offsetY, // パーセント値
        textWidth,
        textHeight,
        basePhotoShortSidePx, // 渡された基準長で計算
        canvasWidth,
        canvasHeight,
        textAlign,      // calculateTextPosition に渡して調整させる
        textBaseline    // calculateTextPosition に渡して調整させる
    );

    console.log(`Drawing date: "${dateString}" at (${x}, ${y}) with font: ${ctx.font} color: ${ctx.fillStyle}`);
    ctx.fillText(dateString, x, y);
    ctx.restore();
}

/**
 * Exif情報を1行のテキストとして描画する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} exifSettings - Exif表示の設定 (currentState.textSettings.exif)
 * @param {Object} exifDataFromState - Exifデータ (piexif.js形式)
 * @param {number} basePhotoShortSidePx - 基準となる写真の短辺の長さ (px)
 * @param {number} canvasWidth - キャンバスの幅 (px)
 * @param {number} canvasHeight - キャンバスの高さ (px)
 */
function drawExifInfo(ctx, exifSettings, exifDataFromState, basePhotoShortSidePx, canvasWidth, canvasHeight) {
    if (!exifDataFromState || !exifSettings.items || exifSettings.items.length === 0) {
        return;
    }

    const displayedExifValues = [];
    // textSettings.exif.items 配列に定義された順序で値を取得・連結
    // 表示順序を固定したい場合は、ここでitemsの順序をソートするか、固定の順序リストで処理する
    const displayOrder = ['Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISOSpeedRatings', 'FocalLength']; // 表示したい順序の例

    for (const itemKey of displayOrder) {
        if (exifSettings.items.includes(itemKey)) { // チェックボックスで選択されている項目のみ
            const value = getExifValue(exifDataFromState, itemKey);
            if (value) { // 値がある項目のみ
                // 必要に応じてここで各項目の接頭辞・接尾辞を調整
                // 例: FNumberなら 'F' を付ける、ISOSpeedRatingsなら 'ISO ' を付けるなど
                // getExifValueが既に "F2.8" や "ISO100" のように整形済みの文字列を返すと仮定
                let displayValue = value;
                if (itemKey === 'ISOSpeedRatings' && !String(value).toUpperCase().startsWith('ISO')) {
                    displayValue = `ISO ${value}`;
                }
                // 他の項目も必要に応じて整形
                displayedExifValues.push(displayValue);
            }
        }
    }

    if (displayedExifValues.length === 0) return;

    const exifString = `${displayedExifValues.join(' ')}`; // スペース区切りで連結

    const fontSizePx = (exifSettings.size / 100) * basePhotoShortSidePx;
    if (fontSizePx <= 0) return;

    ctx.save();
    ctx.font = `${fontSizePx}px "${exifSettings.font}"`;
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

/**
 * テキスト描画位置を計算する
 * @param {string} position - 位置指定（'top-left', 'bottom-right'など9箇所）
 * @param {number} offsetXPercent - X方向オフセット（% photoShortSidePx基準）
 * @param {number} offsetYPercent - Y方向オフセット（% photoShortSidePx基準）
 * @param {number} textWidth - 描画するテキストの幅 (px)
 * @param {number} textHeight - 描画するテキストの高さ (px、フォントサイズや行数に基づく)
 * @param {number} photoShortSidePx - 写真の短辺の長さ (px)
 * @param {number} canvasWidth - キャンバスの幅 (px)
 * @param {number} canvasHeight - キャンバスの高さ (px)
 * @param {string} textAlign - ctx.textAlign の値 ('left', 'center', 'right')
 * @param {string} textBaseline - ctx.textBaseline の値 ('top', 'middle', 'bottom')
 * @returns {Object} X座標とY座標 { x, y }
 */
function calculateTextPosition(position, offsetXPercent, offsetYPercent, textWidth, textHeight, photoShortSidePx, canvasWidth, canvasHeight, textAlign = 'left', textBaseline = 'top') {
    const margin = 0;
    // const margin = (1.5 / 100) * Math.min(canvasWidth, canvasHeight); // Canvasの短辺の1.5%をマージンとする (調整可能)
    const offsetXPx = (offsetXPercent / 100) * photoShortSidePx;
    const offsetYPx = (offsetYPercent / 100) * photoShortSidePx;

    let baseX, baseY; // テキストのアンカーポイントの基準位置

    // Y座標の基準位置 (ctx.textBaseline の設定を考慮してfillTextが描画するアンカーのY座標を計算)
    // top-left, top-center, top-right
    if (position.startsWith('top-')) {
        baseY = margin;
        if (textBaseline === 'middle') baseY += textHeight / 2;
        else if (textBaseline === 'alphabetic' || textBaseline === 'bottom') baseY += textHeight; // 'top'ならそのまま
    }
    // middle-left, middle-center, middle-right
    else if (position.startsWith('middle-')) {
        baseY = canvasHeight / 2;
        if (textBaseline === 'top') baseY -= textHeight / 2;
        else if (textBaseline === 'alphabetic' || textBaseline === 'bottom') baseY += textHeight / 2;
        // 'middle' はそのまま
    }
    // bottom-left, bottom-center, bottom-right
    else if (position.startsWith('bottom-')) {
        baseY = canvasHeight - margin; // 'alphabetic' または 'bottom' の場合、これがテキストの下端の目安
        if (textBaseline === 'top') baseY -= textHeight;
        else if (textBaseline === 'middle') baseY -= textHeight / 2;
    }

    // X座標の基準位置 (ctx.textAlign の設定を考慮してfillTextが描画するアンカーのX座標を計算)


    if (position.endsWith('-left')) {
        baseX = margin; // textAlign='left' (デフォルト) の場合、これがテキストの左端
    } else if (position.endsWith('-center')) {
        baseX = canvasWidth / 2; // textAlign='center' の場合、これがテキストの中央
    } else if (position.endsWith('-right')) {
        baseX = canvasWidth - margin; // textAlign='right' の場合、これがテキストの右端
    }

    if (baseX === undefined || baseY === undefined) { // フォールバック
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

/**
 * Exifデータから日付を取得してフォーマットする
 * @param {Object} exifDateTime - Exifデータ内のDateTime文字列 (例: "2023:05:18 10:30:45")
 * @param {string} format - 日付表示形式 (例: 'YYYY/MM/DD')
 * @returns {string} フォーマットされた日付文字列
 */
function getFormattedDate(exifDateTimeString, displayFormat = 'YYYY/MM/DD') {
    console.log(`[getFormattedDate] Called with exifDateTimeString: "${exifDateTimeString}", displayFormat: "${displayFormat}"`);
    if (!exifDateTimeString || typeof exifDateTimeString !== 'string') {
        console.log("[getFormattedDate] exifDateTimeString is invalid. Returning empty string.");
        return '';
    }
    if (!displayFormat || typeof displayFormat !== 'string') {
        console.log("[getFormattedDate] displayFormat is invalid. Returning empty string.");
        return '';
    }

    const parts = exifDateTimeString.split(' ');
    if (parts.length === 0) {
        console.log("[getFormattedDate] Could not split exifDateTimeString by space. Returning empty string.");
        return '';
    }

    const dateParts = parts[0].split(':');
    if (dateParts.length !== 3) {
        console.log("[getFormattedDate] Date part does not have 3 components after splitting by colon. dateParts:", dateParts);
        return '';
    }

    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];
    console.log(`[getFormattedDate] Parsed year: ${year}, month: ${month}, day: ${day}`);

    let result = displayFormat;
    console.log(`[getFormattedDate] Initial result (from displayFormat): "${result}"`);
    result = result.replace('YYYY', year);
    console.log(`[getFormattedDate] After replacing YYYY: "${result}"`);
    result = result.replace('YY', year.slice(-2));
    console.log(`[getFormattedDate] After replacing YY: "${result}"`);
    result = result.replace('MM', month);
    console.log(`[getFormattedDate] After replacing MM: "${result}"`);
    result = result.replace('DD', day);
    console.log(`[getFormattedDate] Final result after replacing DD: "${result}"`);

    return result;
}

/**
 * Exif項目のキーに対応する表示用ラベルを取得する
 * @param {string} itemKey - Exif項目のキー (stateManager.jsのitems配列で使われるキー)
 * @returns {string} 表示用ラベル
 */
function getExifLabel(itemKey) {
    const labels = {
        'Make': 'メーカー',
        'Model': '機種名',
        'FNumber': 'F値',
        'ExposureTime': 'シャッタースピード',
        'ISOSpeedRatings': 'ISO感度',
        'FocalLength': '焦点距離',
        'LensModel': 'レンズ情報', // 前回追加したキー
        // 必要に応じて他のキーとラベルを追加
    };
    return labels[itemKey] || itemKey; // マッチしない場合はキー名をそのまま表示
}

/**
 * Exifデータ(piexif.js形式)から指定された項目の値を取得し、フォーマットする
 * @param {Object} exifDataFromState - stateManagerから取得したExifデータ (piexif.jsのload()の戻り値)
 * @param {string} itemKey - 取得する項目のキー (stateManager.jsのitems配列で使われるキー)
 * @returns {string} フォーマットされた値の文字列、または空文字列
 */
function getExifValue(exifDataFromState, itemKey) {
    if (!exifDataFromState || typeof piexif === 'undefined') return '';

    const zerothIFD = exifDataFromState["0th"];
    const exifIFD = exifDataFromState["Exif"];
    // const gpsIFD = exifDataFromState["GPS"]; // 必要なら

    const ImageIFD_CONSTANTS = piexif.ImageIFD;
    const ExifIFD_CONSTANTS = piexif.ExifIFD;
    // const GPSIFD_CONSTANTS = piexif.GPSIFD; // 必要なら

    if (!zerothIFD && !exifIFD) return ''; // 主要なIFDがない場合は空

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
                    if (et >= 1) return `${et.toFixed(1)}秒`; // 1秒以上は小数点1桁まで
                    if (et >= 0.1) return `${et.toFixed(2)}秒`; // 0.1秒以上
                    return `1/${Math.round(1 / et)}秒`; // それ未満は分数
                }
            }
            return '';
        case 'ISOSpeedRatings':
            if (exifIFD && ExifIFD_CONSTANTS && ExifIFD_CONSTANTS.ISOSpeedRatings !== undefined) {
                const iso = exifIFD[ExifIFD_CONSTANTS.ISOSpeedRatings];
                return iso ? `${Array.isArray(iso) ? iso[0] : iso}` : ''; // ISO 文字列は付けない
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
        // 必要に応じて他のExif項目のcaseを追加
        default:
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