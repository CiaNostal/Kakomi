// js/utils/textContent.js
/**
 * textContent.js
 * テキストレイヤーの `content`（＝文字列と動的トークンの並び）を扱う純粋関数群。
 *
 * content の要素は次のいずれか:
 *   - 文字列                     … そのまま出力するリテラル（改行を含みうる）
 *   - { field: 'date', format }  … 撮影日（Exif の DateTime を format で整形）
 *   - { field: 'exif', items }   … Exif の各項目（items の並び順）を区切り文字で連結
 *
 * 「生きたトークン」方式（Q-A）: 別画像へ差し替えると date / exif の値も追従して変わる。
 * ここでは Exif データの解決だけを行い、描画・当たり判定は従来どおり drawSingleText に任せる。
 */
import { getExifValue } from '../exifHandler.js';

export const DATE_FORMAT_PRESETS = [
    'YYYY.MM.DD',
    'YY.MM.DD',
    'YYYY/MM/DD',
    'YYYY年MM月DD日',
    'YYYY-MM-DD',
    'MM/DD/YYYY',
];
export const DEFAULT_DATE_FORMAT = 'YYYY.MM.DD';
export const DEFAULT_EXIF_ITEMS = ['FNumber', 'ExposureTime', 'ISOSpeedRatings', 'FocalLength'];
export const EXIF_ITEM_SEPARATOR = '  ';

/** Exif の DateTime 文字列（"YYYY:MM:DD HH:MM:SS"）を表示書式へ整形する。日付部分だけを使う。 */
export function getFormattedDate(exifDateTimeString, displayFormat = DEFAULT_DATE_FORMAT) {
    if (!exifDateTimeString || typeof exifDateTimeString !== 'string') return '';
    if (!displayFormat || typeof displayFormat !== 'string') return '';
    const dateParts = (exifDateTimeString.split(' ')[0] || '').split(':');
    if (dateParts.length !== 3) return '';
    const [year, month, day] = dateParts;
    return displayFormat
        .replace('YYYY', year)
        .replace('YY', year.slice(-2))
        .replace('MM', month)
        .replace('DD', day);
}

/** items（Exif キーの配列）を解決し、区切り文字で連結した文字列にする。 */
export function formatExifItems(exifData, items) {
    if (!exifData || !Array.isArray(items)) return '';
    const values = [];
    for (const key of items) {
        let value = getExifValue(exifData, key);
        if (!value) continue;
        if (key === 'ISOSpeedRatings' && !String(value).toUpperCase().startsWith('ISO')) {
            value = `ISO ${value}`;
        }
        values.push(value);
    }
    return values.join(EXIF_ITEM_SEPARATOR);
}

/**
 * content 配列を、Exif を解決した1本の文字列にする（描画・出力用）。
 * @param {Array|string} content
 * @param {Object|null} exifData - editState.exifData（piexif.js 形式）
 */
export function resolveContentText(content, exifData) {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    let out = '';
    for (const seg of content) {
        if (typeof seg === 'string') { out += seg; continue; }
        if (!seg || typeof seg !== 'object') continue;
        if (seg.field === 'date') {
            const dt = (exifData && exifData['0th'] && typeof piexif !== 'undefined')
                ? exifData['0th'][piexif.ImageIFD.DateTime]
                : null;
            out += dt ? getFormattedDate(dt, seg.format || DEFAULT_DATE_FORMAT) : '';
        } else if (seg.field === 'exif') {
            out += formatExifItems(exifData, seg.items || []);
        }
    }
    return out;
}

/** リスト行のプレビュー用に、トークンを短いラベルへ置き換えた文字列。 */
export function contentPreviewLabel(content) {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content
        .map(seg => {
            if (typeof seg === 'string') return seg;
            if (seg && seg.field === 'date') return '〔撮影日〕';
            if (seg && seg.field === 'exif') return '〔Exif〕';
            return '';
        })
        .join('');
}

export function contentHasExif(content) {
    return Array.isArray(content) && content.some(s => s && s.field === 'exif');
}

export function contentHasDate(content) {
    return Array.isArray(content) && content.some(s => s && s.field === 'date');
}

/** content が実質空（トークンも非空文字も無い）かどうか。 */
export function contentIsEmpty(content) {
    if (typeof content === 'string') return content.trim() === '';
    if (!Array.isArray(content)) return true;
    return !content.some(s => (typeof s === 'string' ? s.trim() !== '' : !!s));
}
