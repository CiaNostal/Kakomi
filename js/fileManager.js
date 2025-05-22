// js/fileManager.js
// 画像読み込み(processImageFile)、ダウンロード(handleDownload)関数をここに配置します。
import { editState, updateEditState, resetEditStateToDefault } from './state.js';
import { initializeUIFromState, uiElements } from './uiController.js';
import { requestRedraw } from './main.js'; // main.jsからrequestRedrawをインポート
import { renderFinal } from './canvasRenderer.js';


export function processImageFile(file) {
    // 前回のscript.jsからprocessImageFile関数の内容をここにコピー
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // editStateをリセット (画像情報は保持)
                resetEditStateToDefault(true); // trueで画像情報を保持するオプション

                updateEditState({ // 新しい画像情報を設定
                    image: img,
                    originalWidth: img.width,
                    originalHeight: img.height,
                    // photoViewParamsはdefaultEditStateの値が使われる
                });

                initializeUIFromState(); // UIを新しい状態に更新

                requestRedraw();
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
    // 前回のscript.jsからhandleDownload関数の内容をここにコピー
    if (!editState.image) { alert('画像が選択されていません。'); return; }
    const finalCanvas = renderFinal(editState); // editStateを渡す
    if (finalCanvas) {
        // OffscreenCanvasの場合はconvertToBlob, 通常Canvasの場合はtoBlob
        const blobPromise = finalCanvas instanceof OffscreenCanvas ?
            finalCanvas.convertToBlob({ type: 'image/jpeg', quality: editState.outputJpgQuality }) :
            new Promise(resolve => finalCanvas.toBlob(resolve, 'image/jpeg', editState.outputJpgQuality));

        blobPromise.then(blob => {
            if (!blob) {
                throw new Error('Blob generation failed');
            }
            const url = URL.createObjectURL(blob);
            let baseName = 'image';
            // imageLoaderからファイル名を取得するのは、input type=fileの場合のみ
            if (uiElements.imageLoader.files && uiElements.imageLoader.files[0] && uiElements.imageLoader.files[0].name) {
                baseName = uiElements.imageLoader.files[0].name.substring(0, uiElements.imageLoader.files[0].name.lastIndexOf('.')) || 'image';
            } else if (editState.image && editState.image.name) { // ドラッグ＆ドロップされたファイル名 (ただし通常は取れない)
                baseName = editState.image.name.substring(0, editState.image.name.lastIndexOf('.')) || 'image';
            }
            const fileName = `${baseName}_kakomi_framed.jpg`;

            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
            .catch(err => {
                console.error('画像のダウンロードに失敗しました:', err);
                alert('画像のダウンロードに失敗しました。コンソールを確認してください。');
            });
    } else {
        alert('出力用Canvasの生成に失敗しました。');
    }
}