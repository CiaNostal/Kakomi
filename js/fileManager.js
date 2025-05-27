// js/fileManager.js
import { getState, setImage } from './stateManager.js';
import { initializeUIFromState, uiElements } from './uiController.js';
import { renderFinal } from './canvasRenderer.js';
// redrawCallback は main.js から渡される

export function processImageFile(file, redrawCallback) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                setImage(img, null); 

                initializeUIFromState();

                redrawCallback();

                if (uiElements.downloadButton) uiElements.downloadButton.disabled = false;
                if (uiElements.imageLoader) uiElements.imageLoader.value = '';
            };
            img.onerror = () => { alert('画像の読み込みに失敗しました。'); if (uiElements.imageLoader) uiElements.imageLoader.value = ''; };
            img.src = e.target.result;
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