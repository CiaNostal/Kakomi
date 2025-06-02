// js/exifHandler.js
// piexif.js がグローバルに読み込まれていることを前提とします (window.piexif)

/**
 * 画像ファイルからExif情報を抽出する
 * @param {File} file - 画像ファイル
 * @returns {Promise<Object|null>} Exifデータオブジェクト(piexif.js形式)、またはエラー時やExifがない場合はnull
 */
function extractExifFromFile(file) {
    return new Promise((resolve) => {
        if (!file || !file.type.startsWith('image/jpeg')) {
            // piexif.jsは主にJPEGを対象とするため、JPEG以外はExifなしとして扱うか、
            // 他のライブラリでの対応を検討する。ここではJPEGのみを対象とする。
            console.warn("Exif extraction is currently supported for JPEG images only.");
            resolve(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                if (e.target && typeof e.target.result === 'string') {
                    const exifData = piexif.load(e.target.result);
                    // サムネイルは非常に大きくなる可能性があるので、ここでは除外するか、
                    // 必要なら別途処理を検討。今回は主要なIFDのみを返す。
                    // delete exifData.thumbnail; // 必要ならコメント解除
                    resolve(exifData);
                } else {
                    resolve(null);
                }
            } catch (error) {
                console.error("Exifデータの解析に失敗しました:", error);
                resolve(null); // エラー時もnullを返す
            }
        };
        reader.onerror = function () {
            console.error('ファイルの読み込みに失敗しました (Exif抽出時)。');
            resolve(null);
        };
        // piexif.load はデータURLを期待するため、readAsDataURLで読み込む
        reader.readAsDataURL(file);
    });
}

/**
 * piexif.jsのタグ定数を使って安全に値を取得するヘルパー
 * @param {Object} ifd - 0th または Exif IFD オブジェクト
 * @param {number} tag - piexif.TAGS.ImageIFD.xxx または piexif.TAGS.ExifIFD.xxx
 * @returns {*} タグの値、存在しない場合はundefined
 */
function getTagValue(ifd, tag) {
    return ifd && ifd[tag] !== undefined ? ifd[tag] : undefined;
}

/**
 * Exif情報をフォーマットして表示用の文字列に変換する
 * @param {Object} exifData - piexif.js形式のExifデータオブジェクト
 * @returns {Object} 表示用にフォーマットされたExif情報
 */
/**
 * Exif情報をフォーマットして表示用の文字列に変換する
 * @param {Object} exifData - piexif.js形式のExifデータオブジェクト
 * @returns {Object} 表示用にフォーマットされたExif情報
 */
function formatExifForDisplay(exifData) {
    if (!exifData || typeof piexif === 'undefined') {
        console.warn("[formatExifForDisplay] exifData is null or undefined, or piexif library is not loaded.");
        return {};
    }

    const formatted = {};

    // piexif.jsのバージョンに関わらず比較的安定している直接的なIFD定数オブジェクトを参照する
    const ImageIFD_CONSTANTS = piexif.ImageIFD;
    const ExifIFD_CONSTANTS = piexif.ExifIFD;
    // const GPSIFD_CONSTANTS = piexif.GPSIFD; // 必要なら

    if (!ImageIFD_CONSTANTS || !ExifIFD_CONSTANTS) {
        console.error("[formatExifForDisplay] piexif.ImageIFD or piexif.ExifIFD constants object is missing. piexif.js might be incomplete.");
        return {};
    }

    // 0th IFD (ImageIFD)
    const zerothIFD = exifData["0th"];
    if (zerothIFD) {
        const make = getTagValue(zerothIFD, ImageIFD_CONSTANTS.Make);
        if (make) formatted.make = make;

        const model = getTagValue(zerothIFD, ImageIFD_CONSTANTS.Model);
        if (model) formatted.model = model;

        const dateTime = getTagValue(zerothIFD, ImageIFD_CONSTANTS.DateTime);
        if (dateTime) formatted.dateTime = String(dateTime).replace(/:/g, '/').replace(' ', ' ');
    }

    // Exif IFD
    const exifIFD = exifData["Exif"];
    if (exifIFD) {
        const fNumberVal = getTagValue(exifIFD, ExifIFD_CONSTANTS.FNumber);
        if (fNumberVal && Array.isArray(fNumberVal) && fNumberVal.length === 2 && fNumberVal[1] !== 0) {
            formatted.fNumber = `f/${(fNumberVal[0] / fNumberVal[1]).toFixed(1)}`;
        }

        const exposureTimeVal = getTagValue(exifIFD, ExifIFD_CONSTANTS.ExposureTime);
        if (exposureTimeVal && Array.isArray(exposureTimeVal) && exposureTimeVal.length === 2 && exposureTimeVal[1] !== 0) {
            const et = exposureTimeVal[0] / exposureTimeVal[1];
            if (et < 1) {
                formatted.exposureTime = `1/${Math.round(1 / et)}s`;
            } else {
                formatted.exposureTime = `${et.toFixed(2)}s`;
            }
        }

        const isoVal = getTagValue(exifIFD, ExifIFD_CONSTANTS.ISOSpeedRatings);
        if (isoVal) formatted.iso = `ISO ${Array.isArray(isoVal) ? isoVal[0] : isoVal}`;

        const focalLengthVal = getTagValue(exifIFD, ExifIFD_CONSTANTS.FocalLength);
        if (focalLengthVal && Array.isArray(focalLengthVal) && focalLengthVal.length === 2 && focalLengthVal[1] !== 0) {
            formatted.focalLength = `${Math.round(focalLengthVal[0] / focalLengthVal[1])}mm`;
        }

        const lensModelVal = getTagValue(exifIFD, ExifIFD_CONSTANTS.LensModel);
        if (lensModelVal) formatted.lens = lensModelVal;
    }

    return formatted;
}


/**
 * 元のExifデータを新しいJPEG画像に埋め込む (piexif.jsを使用)
 * @param {string} jpegDataUrl - Exifを埋め込む対象のJPEGデータURL (base64)
 * @param {Object} exifDataFromState - 埋め込むExifデータ (piexif.jsのloadで取得した形式)
 * @returns {string|null} Exifが埋め込まれた新しいJPEGデータURL、またはエラー時や必須情報がない場合はnull
 */
function embedExifToJpeg(jpegDataUrl, exifDataFromState) {
    if (!jpegDataUrl || !jpegDataUrl.startsWith('data:image/jpeg')) {
        console.error("embedExifToJpeg: 無効なJPEGデータURLです。");
        return null;
    }
    if (!exifDataFromState || typeof piexif === 'undefined') {
        console.warn("embedExifToJpeg: Exifデータがないか、piexif.jsがロードされていません。Exifは埋め込まれません。");
        return jpegDataUrl; // 元のデータURLをそのまま返す
    }

    try {
        // piexif.dump はGPS情報なども含めて全てのIFDをダンプする
        const exifBytes = piexif.dump(exifDataFromState);
        const newJpegDataUrl = piexif.insert(exifBytes, jpegDataUrl);
        return newJpegDataUrl;
    } catch (error) {
        console.error("Exifデータの埋め込みに失敗しました:", error);
        // エラーが発生した場合は、元のExifなしのデータURLを返すか、nullを返すか選択
        // ここでは元のデータURLを返すことで、少なくとも画像はダウンロードできるようにする
        return jpegDataUrl;
    }
}

/**
 * Exif情報を画面に表示する (変更なし、formatExifForDisplayの結果を使用)
 * @param {Object} exifData - Exifデータ (piexif.js形式)
 * @param {HTMLElement} container - 表示するコンテナ要素
 */
function displayExifInfo(exifData, container) {
    if (!container) return;
    if (!exifData) { // Exifデータがない場合はコンテナをクリア
        container.innerHTML = '<p>Exif情報はありません。</p>';
        return;
    }

    const formatted = formatExifForDisplay(exifData);

    if (Object.keys(formatted).length === 0) {
        container.innerHTML = '<p>主要なExif情報は見つかりませんでした。</p>';
        return;
    }

    let html = '<table class="exif-table">';

    if (formatted.make || formatted.model) {
        html += '<tr><th colspan="2">カメラ情報</th></tr>';
        if (formatted.make) html += `<tr><td>メーカー名</td><td>${formatted.make}</td></tr>`;
        if (formatted.model) html += `<tr><td>機種名</td><td>${formatted.model}</td></tr>`;
    }

    const shootingInfoKeys = ['fNumber', 'exposureTime', 'iso', 'focalLength'];
    if (shootingInfoKeys.some(key => formatted[key])) {
        html += '<tr><th colspan="2">撮影設定</th></tr>';
        if (formatted.fNumber) html += `<tr><td>F値</td><td>${formatted.fNumber}</td></tr>`;
        if (formatted.exposureTime) html += `<tr><td>シャッタースピード</td><td>${formatted.exposureTime}</td></tr>`;
        if (formatted.iso) html += `<tr><td>ISO感度</td><td>${formatted.iso}</td></tr>`;
        if (formatted.focalLength) html += `<tr><td>焦点距離</td><td>${formatted.focalLength}</td></tr>`;
    }

    if (formatted.lens) {
        html += '<tr><th colspan="2">レンズ情報</th></tr>';
        html += `<tr><td>レンズ</td><td>${formatted.lens}</td></tr>`;
    }

    if (formatted.dateTime) {
        html += '<tr><th colspan="2">日時情報</th></tr>';
        html += `<tr><td>撮影日時</td><td>${formatted.dateTime}</td></tr>`;
    }

    html += '</table>';
    container.innerHTML = html;
}

export { extractExifFromFile, formatExifForDisplay, embedExifToJpeg, displayExifInfo };