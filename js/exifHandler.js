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
 * piexif.jsが返すASCII型Exif文字列（Make/Model/LensModel等）の文字化け対策。
 *
 * 対策は2段階:
 * 1. NULパディングの除去 —— Exif規格上、ASCII型フィールドは固定バイト長で、実際の
 *    文字列の後にNUL終端＋NULパディングが続く（例: "CampSnap"を32バイト枠に入れる場合、
 *    "CampSnap" + \x00 が22回続く）。piexif.jsはこの固定長バイト列をそのまま
 *    JS文字列化して返すため、末尾のNUL文字群を含んだまま描画・表示すると、
 *    エディタやフォントによっては制御文字が可視化されて「特殊文字が混ざったような
 *    文字化け」に見える。最初のNUL文字（コードポイント U+0000）以降を切り捨てて対処する。
 * 2. UTF-8をLatin-1として誤読した文字化けの復元 —— 上記のフィールドは規格上ASCIIの
 *    はずだが、実際には日本語などの非ASCII文字をUTF-8でエンコードして書き込む
 *    カメラ・レンズ・編集ソフトも存在する。piexif.jsはバイト列を1バイトずつそのまま
 *    JS文字コードにマッピングするだけで、マルチバイトのUTF-8シーケンスを再デコード
 *    しないため、そのようなデータをそのまま表示すると文字化けする。escape()で
 *    「1バイト=1文字」の文字列に戻してからdecodeURIComponent()でUTF-8として
 *    再解釈することで復元する（純粋なASCII文字列に対しては実質的に何もしない
 *    安全な変換）。
 * @param {*} value - piexif.jsから取得した値（文字列以外はそのまま返す）
 * @returns {*}
 */
function decodeExifString(value) {
    if (typeof value !== 'string') return value;
    const nulIndex = value.indexOf('\u0000');
    const trimmed = nulIndex !== -1 ? value.slice(0, nulIndex) : value;
    try {
        return decodeURIComponent(escape(trimmed));
    } catch (e) {
        // UTF-8として解釈できないバイト列（Shift-JIS等）の場合はNUL除去のみ済ませて返す
        return trimmed;
    }
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
        if (make) formatted.make = decodeExifString(make);

        const model = getTagValue(zerothIFD, ImageIFD_CONSTANTS.Model);
        if (model) formatted.model = decodeExifString(model);

        const dateTime = getTagValue(zerothIFD, ImageIFD_CONSTANTS.DateTime);
        if (dateTime) {
            // Exif の DateTime は "YYYY:MM:DD HH:MM:SS"。日付は "." 区切り、時刻は "HH:MM" までに整形する。
            const m = String(dateTime).match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})/);
            formatted.dateTime = m ? `${m[1]}.${m[2]}.${m[3]} ${m[4]}:${m[5]}` : String(dateTime);
        }
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
        if (lensModelVal) formatted.lens = decodeExifString(lensModelVal);
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

// Exif の撮影設定行。key は formatExifForDisplay() の返すキー、icon は index.html の
// スプライト <symbol id="i-*">、label は <dt> の title（ホバーでツールチップ表示）。
const EXIF_ROW_DEFS = [
    { key: 'fNumber', icon: 'i-aperture', label: '絞り' },
    { key: 'exposureTime', icon: 'i-shutter', label: 'シャッタースピード' },
    { key: 'iso', icon: 'i-iso', label: 'ISO感度' },
    { key: 'focalLength', icon: 'i-focal', label: '焦点距離' },
    { key: 'dateTime', icon: 'i-cal', label: '撮影日時' },
];

function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
}

/**
 * Exif情報を「情報」タブ（`#exifDataContainer`）に描画する（E-3 / フェーズ5）。
 * Lightroom Web 風に、カメラ／レンズ名だけを小さく上に置き、撮影設定は
 * 「アイコン＋値」だけの定義リストにする。項目名（絞り・SS 等）のテキストは出さず、
 * `<dt>` の title 属性に入れてホバーでツールチップ表示させる。
 * @param {Object|null} exifData - piexif.js 形式のExifデータ。null なら未読込メッセージ。
 * @param {HTMLElement} container - `#exifDataContainer`
 */
function displayExifInfo(exifData, container) {
    if (!container) return;

    const formatted = exifData ? formatExifForDisplay(exifData) : {};
    const rows = EXIF_ROW_DEFS.filter((def) => formatted[def.key]);

    // カメラ名: Make と Model の両方があり Model が Make で始まらなければ連結、そうでなければ Model 優先。
    let cameraName = '';
    if (formatted.make && formatted.model) {
        const makeHead = formatted.make.toLowerCase().split(/\s+/)[0];
        cameraName = formatted.model.toLowerCase().startsWith(makeHead)
            ? formatted.model
            : `${formatted.make} ${formatted.model}`;
    } else {
        cameraName = formatted.model || formatted.make || '';
    }
    const camLine = [cameraName, formatted.lens].filter(Boolean).join(' · ');

    if (rows.length === 0 && !camLine) {
        container.innerHTML = exifData
            ? '<p class="exif-empty">この写真に撮影情報は含まれていません。</p>'
            : '<p class="exif-empty">写真を読み込むと撮影情報が表示されます。</p>';
        return;
    }

    let html = '';
    if (camLine) html += `<p class="exif-cam">${escapeHtml(camLine)}</p>`;
    if (rows.length) {
        html += '<dl class="exif-dl">';
        for (const def of rows) {
            html += `<dt title="${def.label}" aria-label="${def.label}">`
                + `<svg aria-hidden="true"><use href="#${def.icon}"></use></svg></dt>`;
            html += `<dd>${escapeHtml(formatted[def.key])}</dd>`;
        }
        html += '</dl>';
    }
    container.innerHTML = html;
}

export { extractExifFromFile, formatExifForDisplay, embedExifToJpeg, displayExifInfo, decodeExifString };