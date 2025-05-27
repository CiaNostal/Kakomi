// js/fileManager.js
import { getState, setImage } from './stateManager.js';
import { initializeUIFromState, uiElements } from './uiController.js';
import { renderFinal } from './canvasRenderer.js';
import { extractExifFromFile, embedExifToJpeg } from './exifHandler.js'; // ADDED: Import for Exif extraction
import { canvasToJpegBlob, blobToDataURL, dataURLToBlob } from './utils/canvasUtils.js'; // canvasToJpegBlobと新しいヘルパーをインポート
// redrawCallback は main.js から渡される

export async function processImageFile(file, redrawCallback) { // CHANGED: Made async

    if (file && file.type.startsWith('image/')) {
        const originalFileName = file.name; // Get filename from the File object
        const reader = new FileReader();
        reader.onload = async (e) => { // CHANGED: Made async
            const img = new Image();
            img.onload = async () => { // CHANGED: Made async
                let exifData = null;
                try {
                    // Attempt to extract Exif data
                    exifData = await extractExifFromFile(file);
                } catch (exifError) { // extractExifFromFileがnullを返すので、ここではcatchされない想定
                    console.warn("Exifデータの抽出に失敗しました:", exifError);
                }
                // Set image, Exif data, and original filename in state
                setImage(img, exifData, originalFileName);

                initializeUIFromState();

                redrawCallback();

                if (uiElements.downloadButton) uiElements.downloadButton.disabled = false;
                if (uiElements.imageLoader) uiElements.imageLoader.value = '';
            };
            img.onerror = () => { alert('画像の読み込みに失敗しました。'); if (uiElements.imageLoader) uiElements.imageLoader.value = ''; };
            if (e.target && typeof e.target.result === 'string') {
                img.src = e.target.result;
            } else {
                alert('ファイルの読み込み結果が不正です。');
            }
        };
        reader.onerror = () => { alert('ファイルの読み込みに失敗しました。'); if (uiElements.imageLoader) uiElements.imageLoader.value = ''; };
        reader.readAsDataURL(file);
    } else {
        alert('画像ファイルを選択またはドラッグ＆ドロップしてください。');
        if (uiElements.imageLoader) uiElements.imageLoader.value = '';
    }
}

export async function handleDownload() { // async に変更
    const currentState = getState();

    if (!currentState.image) {
        alert('画像が選択されていません。');
        return;
    }

    const finalCanvas = renderFinal(currentState);

    if (finalCanvas) {
        const uiQualityValue = currentState.outputSettings.quality;
        const blobQuality = Math.max(0.01, Math.min(1.0, uiQualityValue / 100));

        try {
            let finalBlob = await canvasToJpegBlob(finalCanvas, blobQuality); // canvasUtilsから取得
            if (!finalBlob) throw new Error('初期Blobの生成に失敗しました。');

            // Exifを埋め込むかどうかの設定とExifデータの存在を確認
            if (currentState.outputSettings.preserveExif && currentState.exifData) {
                console.log("Exifの埋め込みを試みます...");
                const jpegDataUrl = await blobToDataURL(finalBlob);
                if (jpegDataUrl) {
                    const newJpegDataUrlWithExif = embedExifToJpeg(jpegDataUrl, currentState.exifData);
                    if (newJpegDataUrlWithExif && newJpegDataUrlWithExif !== jpegDataUrl) {
                        const newBlobWithExif = dataURLToBlob(newJpegDataUrlWithExif);
                        if (newBlobWithExif) {
                            finalBlob = newBlobWithExif;
                            console.log("Exifの埋め込みに成功しました。");
                        } else {
                            console.warn("Exif埋め込み後のBlob変換に失敗しました。元の画像を使用します。");
                        }
                    } else if (newJpegDataUrlWithExif === jpegDataUrl) {
                        console.log("Exifデータが存在しないか、埋め込みが不要と判断されました。元の画像を使用します。");
                    } else {
                        console.warn("Exif埋め込み処理でエラーが発生しました。元の画像を使用します。");
                    }
                } else {
                    console.warn("BlobからDataURLへの変換に失敗しました。Exifは埋め込まれません。");
                }
            } else {
                console.log("Exifを保持する設定でないか、Exifデータが存在しないため、埋め込みは行いません。");
            }

            const url = URL.createObjectURL(finalBlob);
            let baseName = 'image';
            // Use stored originalFileName from state
            if (currentState.originalFileName) {
                baseName = currentState.originalFileName.substring(0, currentState.originalFileName.lastIndexOf('.')) || 'image';
            }
            const fileName = `${baseName}_kakomi_framed.jpg`; // 仕様書では「(読み込んだ元写真のファイル名)_framed.jpg」となっています
            const a = document.createElement('a');
            a.href = url; a.download = fileName;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);

        } catch (err) {
            console.error('画像のダウンロード処理中にエラーが発生しました:', err);
            alert('画像のダウンロード処理中にエラーが発生しました。コンソールを確認してください。');
        }
    } else {
        alert('出力用Canvasの生成に失敗しました。');
    }
}