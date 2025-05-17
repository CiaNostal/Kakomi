document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const imageLoader = document.getElementById('imageLoader');
    const previewCanvas = document.getElementById('previewCanvas');
    const previewCtx = previewCanvas.getContext('2d');
    const downloadButton = document.getElementById('downloadButton');

    // 余白と背景色UIの取得
    const marginTopInput = document.getElementById('marginTop');
    const marginRightInput = document.getElementById('marginRight');
    const marginBottomInput = document.getElementById('marginBottom');
    const marginLeftInput = document.getElementById('marginLeft');
    const backgroundColorInput = document.getElementById('backgroundColor');

    const PREVIEW_WIDTH = 900;

    // 編集状態を一元管理するオブジェクト
    let editState = {
        image: null,
        originalWidth: 0,
        originalHeight: 0,
        photoDrawConfig: { // 元画像からどの部分を、どのサイズで描画するか
            sourceX: 0,
            sourceY: 0,
            sourceWidth: 0,
            sourceHeight: 0,
            // destXonPhotoCanvas, destYonPhotoCanvas は calculateLayout で決定 (余白を考慮)
            destWidth: 0,
            destHeight: 0
        },
        outputCanvasConfig: { // 最終出力Canvas全体に関する情報
            width: 0,
            height: 0,
        },
        // 余白と背景色の情報を追加
        marginsPercent: {
            top: parseFloat(marginTopInput.value) || 0,
            right: parseFloat(marginRightInput.value) || 0,
            bottom: parseFloat(marginBottomInput.value) || 0,
            left: parseFloat(marginLeftInput.value) || 0,
        },
        backgroundColor: backgroundColorInput.value || '#ffffff',
    };

    // イベントリスナー
    imageLoader.addEventListener('change', handleImageUpload);
    downloadButton.addEventListener('click', handleDownload);

    // 余白と背景色UIの変更イベント
    [marginTopInput, marginRightInput, marginBottomInput, marginLeftInput].forEach(input => {
        input.addEventListener('change', (e) => {
            const marginValue = parseFloat(e.target.value);
            if (!isNaN(marginValue) && marginValue >= 0) {
                editState.marginsPercent[e.target.id.replace('margin', '').toLowerCase()] = marginValue;
            } else { // 無効な値なら0にフォールバック
                editState.marginsPercent[e.target.id.replace('margin', '').toLowerCase()] = 0;
                e.target.value = 0; // UIも更新
            }
            requestRedraw();
        });
    });
    backgroundColorInput.addEventListener('input', (e) => { // 'change'より'input'の方がリアルタイム
        editState.backgroundColor = e.target.value;
        requestRedraw();
    });


    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    editState.image = img;
                    editState.originalWidth = img.width;
                    editState.originalHeight = img.height;

                    // 初期状態では元画像全体を使用 (構図調整なし)
                    editState.photoDrawConfig = {
                        sourceX: 0,
                        sourceY: 0,
                        sourceWidth: img.width,
                        sourceHeight: img.height,
                        destWidth: img.width,   // 写真自体の描画サイズは元解像度維持
                        destHeight: img.height,
                    };

                    // 初期UI値をeditStateに反映 (ページ読み込み時)
                    editState.marginsPercent = {
                        top: parseFloat(marginTopInput.value) || 0,
                        right: parseFloat(marginRightInput.value) || 0,
                        bottom: parseFloat(marginBottomInput.value) || 0,
                        left: parseFloat(marginLeftInput.value) || 0,
                    };
                    editState.backgroundColor = backgroundColorInput.value || '#ffffff';

                    requestRedraw();
                    downloadButton.disabled = false;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            alert('画像ファイルを選択してください。');
            downloadButton.disabled = true;
            editState.image = null;
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        }
    }

    // 再描画要求関数 (UI変更時に呼び出す)
    function requestRedraw() {
        if (!editState.image) return;
        const layoutInfo = calculateLayout(editState);
        drawPreview(editState, layoutInfo);
    }

    // レイアウト計算 (仕様書v1.4準拠)
    function calculateLayout(currentState) {
        const { photoDrawConfig, marginsPercent } = currentState;
        const photoWidthPx = photoDrawConfig.destWidth;   // 写真自体の描画幅
        const photoHeightPx = photoDrawConfig.destHeight; // 写真自体の描画高さ

        // 「構図調整後の写真の短辺の長さ」が基準
        const baseLengthForPercentPx = Math.min(photoWidthPx, photoHeightPx);

        // %指定の余白をピクセル値に変換
        const marginPxTop = Math.round(baseLengthForPercentPx * (marginsPercent.top / 100));
        const marginPxRight = Math.round(baseLengthForPercentPx * (marginsPercent.right / 100));
        const marginPxBottom = Math.round(baseLengthForPercentPx * (marginsPercent.bottom / 100));
        const marginPxLeft = Math.round(baseLengthForPercentPx * (marginsPercent.left / 100));

        // 出力用Canvasの全体寸法を計算
        const outputCanvasWidthPx = photoWidthPx + marginPxLeft + marginPxRight;
        const outputCanvasHeightPx = photoHeightPx + marginPxTop + marginPxBottom;

        // 写真の出力用Canvas上の描画開始位置
        const photoXonCanvasPx = marginPxLeft;
        const photoYonCanvasPx = marginPxTop;

        return {
            photoDrawConfig: { // 元のphotoDrawConfigに描画位置情報を追加
                ...photoDrawConfig,
                destXonOutputCanvas: photoXonCanvasPx, // 出力Canvas上のX
                destYonOutputCanvas: photoYonCanvasPx  // 出力Canvas上のY
            },
            outputCanvasConfig: {
                width: outputCanvasWidthPx,
                height: outputCanvasHeightPx,
            },
            marginsPx: { // デバッグや他の描画で使う可能性があるので保持
                top: marginPxTop,
                right: marginPxRight,
                bottom: marginPxBottom,
                left: marginPxLeft,
            },
            baseLengthForPercentPx: baseLengthForPercentPx
        };
    }

    // プレビュー描画 (仕様書v1.4準拠)
    // プレビュー描画 (仕様書v1.4準拠)
    function drawPreview(currentState, layoutInfo) {
        if (!currentState.image) return;

        const img = currentState.image;
        const { sourceX, sourceY, sourceWidth, sourceHeight,
            destXonOutputCanvas, destYonOutputCanvas,
            destWidth, destHeight } = layoutInfo.photoDrawConfig; // 正しいプロパティ名にアクセス

        const outputTotalWidth = layoutInfo.outputCanvasConfig.width;
        const outputTotalHeight = layoutInfo.outputCanvasConfig.height;

        // ゼロ除算を避けるため、outputTotalHeightが0の場合はアスペクト比を1とするなど適切に処理
        const outputAspectRatio = (outputTotalHeight === 0) ? 1 : outputTotalWidth / outputTotalHeight;

        // ★★★ 修正箇所 スタート ★★★
        // 1. プレビューCanvasの現在の実際の表示幅を取得する
        //    previewCanvas.clientWidth は、CSSによってレンダリングされた実際の幅をピクセル単位で返す
        let currentPreviewRenderWidth = previewCanvas.clientWidth;

        // 2. Canvasの描画バッファサイズを、実際の表示幅に合わせる
        previewCanvas.width = currentPreviewRenderWidth; // これで描画バッファの幅も更新
        if (outputTotalHeight === 0 || outputTotalWidth === 0) { // アスペクト比が不定の場合
            previewCanvas.height = currentPreviewRenderWidth; // 例として正方形にするか、適切なデフォルト値を設定
        } else {
            previewCanvas.height = currentPreviewRenderWidth / outputAspectRatio;
        }
        // ★★★ 修正箇所 エンド ★★★

        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

        // プレビューCanvasに対するスケーリングファクター (新しいpreviewCanvas.width基準)
        // outputTotalWidthが0の場合のゼロ除算を避ける
        const scale = (outputTotalWidth === 0) ? 0 : previewCanvas.width / outputTotalWidth;


        // 1. 背景色を描画 (プレビューCanvas全体に)
        previewCtx.fillStyle = currentState.backgroundColor;
        previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

        // 2. 写真を描画 (スケール適用)
        const previewPhotoX = destXonOutputCanvas * scale;
        const previewPhotoY = destYonOutputCanvas * scale;
        const previewPhotoWidth = destWidth * scale;
        const previewPhotoHeight = destHeight * scale;

        previewCtx.drawImage(
            img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            previewPhotoX, previewPhotoY, previewPhotoWidth, previewPhotoHeight
        );
    }

    // 最終レンダリング (仕様書v1.4準拠)
    function renderFinal(currentState, layoutInfo) {
        if (!currentState.image) return null;

        const img = currentState.image;
        const { sourceX, sourceY, sourceWidth, sourceHeight,
            destXonOutputCanvas, destYonOutputCanvas, // これが出力Canvas上の写真の左上座標
            destWidth, destHeight } = layoutInfo.photoDrawConfig;

        const outputWidth = layoutInfo.outputCanvasConfig.width;
        const outputHeight = layoutInfo.outputCanvasConfig.height;

        const offscreenCanvas = new OffscreenCanvas(outputWidth, outputHeight);
        const ctx = offscreenCanvas.getContext('2d');

        // 1. 背景色を描画 (出力Canvas全体に)
        ctx.fillStyle = currentState.backgroundColor;
        ctx.fillRect(0, 0, outputWidth, outputHeight);

        // 2. 写真描画: 「数値精度と丸め処理に関するポリシー」に従い、整数化
        const finalDestX = Math.round(destXonOutputCanvas);
        const finalDestY = Math.round(destYonOutputCanvas);
        const finalDestWidth = Math.round(destWidth); // 写真自体のサイズは元解像度なので既に整数のはず
        const finalDestHeight = Math.round(destHeight);

        const finalSourceX = Math.round(sourceX);
        const finalSourceY = Math.round(sourceY);
        const finalSourceWidth = Math.round(sourceWidth);
        const finalSourceHeight = Math.round(sourceHeight);

        ctx.drawImage(
            img,
            finalSourceX, finalSourceY, finalSourceWidth, finalSourceHeight,
            finalDestX, finalDestY, finalDestWidth, finalDestHeight
        );

        return offscreenCanvas;
    }

    function handleDownload() {
        if (!editState.image) {
            alert('画像が選択されていません。');
            return;
        }
        const layoutInfo = calculateLayout(editState); // 最新のレイアウト情報を取得
        const finalCanvas = renderFinal(editState, layoutInfo);

        if (finalCanvas) {
            finalCanvas.convertToBlob({ type: 'image/jpeg', quality: 1.0 })
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    let baseName = 'image';
                    if (imageLoader.files[0] && imageLoader.files[0].name) {
                        baseName = imageLoader.files[0].name.substring(0, imageLoader.files[0].name.lastIndexOf('.')) || 'image';
                    }
                    const fileName = `${baseName}_framed.jpg`;

                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                })
                .catch(err => console.error('画像のダウンロードに失敗しました:', err));
        }
    }
});