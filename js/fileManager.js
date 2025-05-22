// js/fileManager.js
import { editState, updateEditState, resetEditStateToDefault } from './state.js';
import { initializeUIFromState, uiElements, displayExifDataInHtml } from './uiController.js';
import { renderFinal } from './canvasRenderer.js';
// redrawCallback は main.js から渡される

export function processImageFile(file, redrawCallback) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            let parsedExifData = {}; // reader.onload スコープで宣言

            try {
                // piexif.js はグローバルスコープに piexif オブジェクトを公開する
                if (typeof piexif !== 'undefined' && imageDataUrl.startsWith('data:image/jpeg')) {
                    const exifObj = piexif.load(imageDataUrl);
                    if (exifObj["0th"]) {
                        if (exifObj["0th"][piexif.TAGS.Image.Make]) parsedExifData.Make = exifObj["0th"][piexif.TAGS.Image.Make];
                        if (exifObj["0th"][piexif.TAGS.Image.Model]) parsedExifData.Model = exifObj["0th"][piexif.TAGS.Image.Model];
                    }
                    if (exifObj["Exif"]) {
                        if (exifObj["Exif"][piexif.TAGS.Exif.DateTimeOriginal]) parsedExifData.DateTimeOriginal = exifObj["Exif"][piexif.TAGS.Exif.DateTimeOriginal];
                        if (exifObj["Exif"][piexif.TAGS.Exif.FNumber]) parsedExifData.FNumber = exifObj["Exif"][piexif.TAGS.Exif.FNumber];
                        if (exifObj["Exif"][piexif.TAGS.Exif.ExposureTime]) parsedExifData.ExposureTime = exifObj["Exif"][piexif.TAGS.Exif.ExposureTime];
                        if (exifObj["Exif"][piexif.TAGS.Exif.ISOSpeedRatings]) parsedExifData.ISOSpeedRatings = exifObj["Exif"][piexif.TAGS.Exif.ISOSpeedRatings];
                        if (exifObj["Exif"][piexif.TAGS.Exif.FocalLength]) parsedExifData.FocalLength = exifObj["Exif"][piexif.TAGS.Exif.FocalLength];
                    }
                    console.log('[FileMan] EXIF data loaded:', parsedExifData);
                } else {
                    console.log('[FileMan] piexif.js not loaded or image is not JPEG, skipping EXIF extraction.');
                }
            } catch (error) {
                console.warn("[FileMan] Error loading EXIF data:", error);
                parsedExifData = {}; // エラー時は空にする
            }

            const img = new Image();
            img.onload = () => {
                resetEditStateToDefault(true); // 画像情報を保持しつつ、他の設定はデフォルトに戻す

                updateEditState({ // 新しい画像情報とExifデータを設定
                    image: img,
                    originalWidth: img.width,
                    originalHeight: img.height,
                    exifData: parsedExifData // img.onload のスコープで parsedExifData を使用
                });

                initializeUIFromState(); // UIをリセットされたeditStateに基づいて完全に更新
                // displayExifDataInHtml は initializeUIFromState の中で呼ばれる

                redrawCallback(); // 再描画を要求

                if (uiElements.downloadButton) uiElements.downloadButton.disabled = false;
                if (uiElements.imageLoader) uiElements.imageLoader.value = '';
            };
            img.onerror = () => {
                alert('画像の読み込みに失敗しました。ファイルが破損しているか、サポートされていない形式の可能性があります。');
                if (uiElements.imageLoader) uiElements.imageLoader.value = '';
                // エラー時にもExif表示をクリアするなど
                updateEditState({ image: null, originalWidth: 0, originalHeight: 0, exifData: {} });
                displayExifDataInHtml({});
                redrawCallback(); // プレビューをクリア
            };
            img.src = imageDataUrl; // Exif読み取り後に画像ソースを設定
        };
        reader.onerror = () => {
            alert('ファイルの読み込みに失敗しました。');
            if (uiElements.imageLoader) uiElements.imageLoader.value = '';
        };
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