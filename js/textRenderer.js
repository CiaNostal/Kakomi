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
 */
function drawText(ctx, currentState, canvasWidth, canvasHeight) {
    if (!currentState.photoDrawConfig || currentState.photoDrawConfig.destWidth === 0 || currentState.photoDrawConfig.destHeight === 0) {
        // 写真の描画サイズが0の場合は基準となる短辺も0になるため、描画をスキップ
        return;
    }
    const photoShortSidePx = Math.min(
        currentState.photoDrawConfig.destWidth,
        currentState.photoDrawConfig.destHeight
    );
    if (photoShortSidePx <= 0) return; // 短辺が0以下の場合もスキップ

    // 撮影日の表示
    if (currentState.textSettings.date.enabled) {
        // currentState.exifData が null でも getFormattedDate は空文字列を返すので、
        // exifData.DateTime がある場合のみ描画される。
        // exifData 自体がない場合は、getFormattedDateが早期リターンする。
        const exifDateTime = currentState.exifData ? currentState.exifData["0th"]?.[piexif.ImageIFD.DateTime] : null;
        if (exifDateTime) { // DateTimeが存在する場合のみ描画を試みる
            drawDateText(
                ctx,
                currentState.textSettings.date,
                exifDateTime, // ★修正: exifDataオブジェクトではなく、DateTime文字列を渡す
                photoShortSidePx,
                canvasWidth,
                canvasHeight
            );
        } else {
            console.log("Date display enabled, but no Exif DateTime found.");
        }
    }

    // Exif情報の表示 (次のステップで実装)
    // if (currentState.textSettings.exif.enabled && currentState.exifData) {
    //     drawExifInfo( /* ... */ );
    // }
}

/**
 * 撮影日テキストを描画する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} dateSettings - 日付表示の設定 (currentState.textSettings.date)
 * @param {string} exifDateTimeString - Exifから取得したDateTime文字列 (currentState.exifData.DateTime)
 * @param {number} photoShortSidePx - 写真の短辺の長さ (px)
 * @param {number} canvasWidth - キャンバスの幅 (px)
 * @param {number} canvasHeight - キャンバスの高さ (px)
 */
function drawDateText(ctx, dateSettings, exifDateTimeString, photoShortSidePx, canvasWidth, canvasHeight) {
    const dateString = getFormattedDate(exifDateTimeString, dateSettings.format);
    if (!dateString) return;

    const fontSizePx = (dateSettings.size / 100) * photoShortSidePx;
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
        photoShortSidePx,
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
    const margin = 10; // Canvasの縁からの基本的なマージン (px)
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
function getFormattedDate(exifDateTime, format = 'YYYY/MM/DD') {
    if (!exifDateTime || typeof exifDateTime !== 'string') {
        return ''; // exifData.DateTime がないか、文字列でない場合は空
    }

    const parts = exifDateTime.split(' '); // "YYYY:MM:DD HH:MM:SS"
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