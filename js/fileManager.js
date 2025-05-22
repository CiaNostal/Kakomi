// js/fileManager.js
import { editState, updateEditState, resetEditStateToDefault } from './state.js';
import { initializeUIFromState, uiElements } from './uiController.js';
import { renderFinal } from './canvasRenderer.js';
// redrawCallback は main.js から渡される

export function processImageFile(file, redrawCallback) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 画像情報を保持しつつ、他の設定はデフォルトに戻す
                resetEditStateToDefault(true);

                // 新しい画像情報をeditStateに設定
                updateEditState({
                    image: img,
                    originalWidth: img.width,
                    originalHeight: img.height,
                    // 他のプロパティ(photoViewParams, outputTargetAspectRatioStringなど)は
                    // resetEditStateToDefaultによってdefaultEditStateの値にリセットされている。
                });

                // UIをリセットされたeditStateに基づいて完全に更新
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

// handleDownload は変更なし
export function handleDownload() {
    if (!editState.image) { alert('画像が選択されていません。'); return; }
    const finalCanvas = renderFinal(editState); // editState を渡す
    if (finalCanvas) {
        const blobPromise = finalCanvas instanceof OffscreenCanvas ?
            finalCanvas.convertToBlob({ type: 'image/jpeg', quality: editState.outputJpgQuality }) :
            new Promise(resolve => finalCanvas.toBlob(resolve, 'image/jpeg', editState.outputJpgQuality));

        blobPromise.then(blob => {
            if (!blob) throw new Error('Blob generation failed');
            const url = URL.createObjectURL(blob);
            let baseName = 'image';
            if (uiElements.imageLoader.files && uiElements.imageLoader.files[0] && uiElements.imageLoader.files[0].name) {
                baseName = uiElements.imageLoader.files[0].name.substring(0, uiElements.imageLoader.files[0].name.lastIndexOf('.')) || 'image';
            }
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