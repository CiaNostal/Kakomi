// js/fileManager.js
import { getState, setImage } from './stateManager.js';
import { initializeUIFromState, uiElements } from './uiController.js';
import { renderFinal } from './canvasRenderer.js';
import { extractExifFromFile } from './exifHandler.js'; // ADDED: Import for Exif extraction
// redrawCallback は main.js から渡される

export async function processImageFile(file, redrawCallback) { // CHANGED: Made async

    if (file && file.type.startsWith('image/')) {
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
                // Set image and Exif data (or null if extraction failed) in state
                setImage(img, exifData);

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

export function handleDownload() {
    const currentState = getState();

    if (!currentState.image) {
        alert('画像が選択されていません。');
        return;
    }

    const finalCanvas = renderFinal(currentState);

    if (finalCanvas) {
        const uiQualityValue = currentState.outputSettings.quality; // これは1～100の値
        // CORRECTED: Convert 1-100 range to 0.0-1.0 range for blob generation
        const blobQuality = Math.max(0.01, Math.min(1.0, uiQualityValue / 100));

        const blobPromise = finalCanvas instanceof OffscreenCanvas ?
            finalCanvas.convertToBlob({ type: 'image/jpeg', quality: blobQuality }) :
            new Promise(resolve => finalCanvas.toBlob(resolve, 'image/jpeg', blobQuality));

        blobPromise.then(blob => {
            if (!blob) throw new Error('Blob generation failed');
            const url = URL.createObjectURL(blob);
            let baseName = 'image';
            if (uiElements.imageLoader && uiElements.imageLoader.files && uiElements.imageLoader.files[0] && uiElements.imageLoader.files[0].name) {
                baseName = uiElements.imageLoader.files[0].name.substring(0, uiElements.imageLoader.files[0].name.lastIndexOf('.')) || 'image';
            } else if (currentState.image && currentState.image.name) {
                baseName = currentState.image.name.substring(0, currentState.image.name.lastIndexOf('.')) || 'image';
            }
            const fileName = `${baseName}_kakomi_framed.jpg`; // 仕様書では「_framed.jpg」
            const a = document.createElement('a');
            a.href = url; a.download = fileName;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
        })
            .catch(err => {
                console.error('画像のダウンロードに失敗しました:', err);
                alert('画像のダウンロードに失敗しました。コンソールを確認してください。');
            });
    } else {
        alert('出力用Canvasの生成に失敗しました。');
    }
}