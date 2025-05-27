// js/fileManager.js
import { getState, setImage } from './stateManager.js'; // CHANGED: Import from stateManager
import { initializeUIFromState, uiElements } from './uiController.js';
import { renderFinal } from './canvasRenderer.js'; // Will be reviewed later
// redrawCallback は main.js から渡される

export function processImageFile(file, redrawCallback) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // CHANGED: Use setImage from stateManager.js
                // Exif extraction is not yet integrated here, so pass null for exifData.
                setImage(img, null); 

                // UIをリセットされたeditStateに基づいて完全に更新
                // initializeUIFromStateはuiController内でgetState()を使うように修正済み
                initializeUIFromState();

                // 再描画を要求
                redrawCallback();

                if (uiElements.downloadButton) uiElements.downloadButton.disabled = false;
                if (uiElements.imageLoader) uiElements.imageLoader.value = ''; // 同じファイルを選択できるように値をクリア
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
    const currentState = getState(); // CHANGED: Use getState()

    if (!currentState.image) { // CHANGED: Use currentState
        alert('画像が選択されていません。'); 
        return; 
    }
    
    // renderFinalに渡すのはcurrentState全体。renderFinal内で必要な部分を参照する。
    const finalCanvas = renderFinal(currentState); 

    if (finalCanvas) {
        // CHANGED: Get quality from currentState.outputSettings.quality
        const quality = currentState.outputSettings.quality; 

        const blobPromise = finalCanvas instanceof OffscreenCanvas ?
            finalCanvas.convertToBlob({ type: 'image/jpeg', quality: quality }) :
            new Promise(resolve => finalCanvas.toBlob(resolve, 'image/jpeg', quality));

        blobPromise.then(blob => {
            if (!blob) throw new Error('Blob generation failed');
            const url = URL.createObjectURL(blob);
            let baseName = 'image';
            // uiElements.imageLoader.files can be null if image was dropped
            if (uiElements.imageLoader && uiElements.imageLoader.files && uiElements.imageLoader.files[0] && uiElements.imageLoader.files[0].name) {
                baseName = uiElements.imageLoader.files[0].name.substring(0, uiElements.imageLoader.files[0].name.lastIndexOf('.')) || 'image';
            } else if (currentState.image && currentState.image.name) { // Fallback if available in state (e.g. if original file name was stored)
                 baseName = currentState.image.name.substring(0, currentState.image.name.lastIndexOf('.')) || 'image';
            }
            // 仕様書では「(読み込んだ元写真のファイル名)_framed.jpg」
            // 現在の実装に近い形: (baseName)_kakomi_framed.jpg
            const fileName = `${baseName}_kakomi_framed.jpg`;
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