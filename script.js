document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const imageLoader = document.getElementById('imageLoader');
    const previewCanvas = document.getElementById('previewCanvas');
    const previewCtx = previewCanvas.getContext('2d');
    const downloadButton = document.getElementById('downloadButton');
    const canvasContainer = document.querySelector('.canvas-container');

    // レイアウト設定タブのUI要素
    const outputAspectRatioSelect = document.getElementById('outputAspectRatio');
    const baseMarginPercentInput = document.getElementById('baseMarginPercent');
    // const photoZoomSlider = document.getElementById('photoZoom'); // 削除
    const photoPosXSlider = document.getElementById('photoPosX');
    const photoPosYSlider = document.getElementById('photoPosY');
    // const photoZoomValueSpan = document.getElementById('photoZoomValue'); // 削除
    const photoPosXValueSpan = document.getElementById('photoPosXValue');
    const photoPosYValueSpan = document.getElementById('photoPosYValue');

    const backgroundColorInput = document.getElementById('backgroundColor');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    let editState = {
        image: null,
        originalWidth: 0,
        originalHeight: 0,
        photoViewParams: { // 「出力枠内」での写真の位置調整パラメータ
            // zoom: 1, // 常に100%なので不要
            offsetX: 0.5, // 0 (左端) to 1 (右端), 0.5 = 中央
            offsetY: 0.5  // 0 (上端) to 1 (下端), 0.5 = 中央
        },
        outputTargetAspectRatioString: '1:1',
        baseMarginPercent: 5,
        backgroundColor: '#ffffff',
        photoDrawConfig: {
            sourceX: 0, sourceY: 0, sourceWidth: 0, sourceHeight: 0,
            destWidth: 0, destHeight: 0,
            destXonOutputCanvas: 0, destYonOutputCanvas: 0
        },
        outputCanvasConfig: { width: 0, height: 0 },
    };

    function initializeUIFromState() {
        if (outputAspectRatioSelect) outputAspectRatioSelect.value = editState.outputTargetAspectRatioString;
        if (baseMarginPercentInput) baseMarginPercentInput.value = editState.baseMarginPercent;
        // if (photoZoomSlider) photoZoomSlider.value = 1; // Zoomは常に1
        if (photoPosXSlider) photoPosXSlider.value = editState.photoViewParams.offsetX;
        if (photoPosYSlider) photoPosYSlider.value = editState.photoViewParams.offsetY;
        if (backgroundColorInput) backgroundColorInput.value = editState.backgroundColor;
        updateSliderValueDisplays();
    }

    function updateSliderValueDisplays() {
        // if (photoZoomValueSpan) photoZoomValueSpan.textContent = `1.00x`; // Zoomは常に1
        if (photoPosXValueSpan) {
            const posXDisplay = Math.round((parseFloat(editState.photoViewParams.offsetX) - 0.5) * 2 * 100);
            photoPosXValueSpan.textContent = posXDisplay === 0 ? '中央' : `${posXDisplay}%`;
        }
        if (photoPosYValueSpan) {
            const posYDisplay = Math.round((parseFloat(editState.photoViewParams.offsetY) - 0.5) * 2 * 100);
            photoPosYValueSpan.textContent = posYDisplay === 0 ? '中央' : `${posYDisplay}%`;
        }
    }

    if (imageLoader) imageLoader.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) processImageFile(file);
    });
    if (downloadButton) downloadButton.addEventListener('click', handleDownload);

    if (canvasContainer) {
        canvasContainer.addEventListener('dragover', (event) => {
            event.stopPropagation(); event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            canvasContainer.classList.add('dragover');
        });
        canvasContainer.addEventListener('dragleave', (event) => {
            event.stopPropagation(); event.preventDefault();
            canvasContainer.classList.remove('dragover');
        });
        canvasContainer.addEventListener('drop', (event) => {
            event.stopPropagation(); event.preventDefault();
            canvasContainer.classList.remove('dragover');
            const files = event.dataTransfer.files;
            if (files.length > 0) processImageFile(files[0]);
        });
    }

    if (outputAspectRatioSelect) outputAspectRatioSelect.addEventListener('change', (e) => {
        editState.outputTargetAspectRatioString = e.target.value;
        requestRedraw();
    });
    if (baseMarginPercentInput) baseMarginPercentInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 100) val = 100;
        e.target.value = val;
        editState.baseMarginPercent = val;
        requestRedraw();
    });
    // photoZoomSlider のリスナーは削除
    if (photoPosXSlider) photoPosXSlider.addEventListener('input', (e) => {
        editState.photoViewParams.offsetX = parseFloat(e.target.value);
        updateSliderValueDisplays();
        requestRedraw();
    });
    if (photoPosYSlider) photoPosYSlider.addEventListener('input', (e) => {
        editState.photoViewParams.offsetY = parseFloat(e.target.value);
        updateSliderValueDisplays();
        requestRedraw();
    });

    if (backgroundColorInput) backgroundColorInput.addEventListener('input', (e) => {
        editState.backgroundColor = e.target.value;
        requestRedraw();
    });

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            button.classList.add('active');
            const targetTabId = button.getAttribute('data-tab');
            const targetPane = document.getElementById(targetTabId);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    function processImageFile(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    editState.image = img;
                    editState.originalWidth = img.width;
                    editState.originalHeight = img.height;

                    editState.photoViewParams = { offsetX: 0.5, offsetY: 0.5 }; // 位置調整は中央にリセット
                    initializeUIFromState();

                    requestRedraw();
                    if (downloadButton) downloadButton.disabled = false;
                    if (imageLoader) imageLoader.value = '';
                };
                img.onerror = () => { alert('画像の読み込みに失敗しました。'); if (imageLoader) imageLoader.value = ''; };
                img.src = e.target.result;
            };
            reader.onerror = () => { alert('ファイルの読み込みに失敗しました。'); if (imageLoader) imageLoader.value = ''; };
            reader.readAsDataURL(file);
        } else {
            alert('画像ファイルを選択またはドラッグ＆ドロップしてください。');
            if (imageLoader) imageLoader.value = '';
        }
    }

    function requestRedraw() {
        if (!editState.image) return;
        const layoutInfo = calculateLayout(editState);
        editState.photoDrawConfig = layoutInfo.photoDrawConfig;
        editState.outputCanvasConfig = layoutInfo.outputCanvasConfig;
        drawPreview(editState);
    }

    function calculateLayout(currentState) {
        if (!currentState.image) {
            return { /* ... (変更なし) ... */ };
        }

        const originalImgWidth = currentState.originalWidth;
        const originalImgHeight = currentState.originalHeight;
        const { offsetX, offsetY } = currentState.photoViewParams; // zoomは使わない

        // 1. 使用する写真領域の決定 (常に元画像全体、拡大率100%)
        const sourceX = 0;
        const sourceY = 0;
        const sourceWidth = originalImgWidth;
        const sourceHeight = originalImgHeight;

        const photoDrawWidthPx = originalImgWidth; // 写真の描画サイズ = 元画像サイズ
        const photoDrawHeightPx = originalImgHeight;
        const currentPhotoAspectRatio = (photoDrawHeightPx === 0) ? 1 : photoDrawWidthPx / photoDrawHeightPx;

        // 2. 基準値の計算
        const photoShortSidePx = Math.min(photoDrawWidthPx, photoDrawHeightPx);

        // 3. 最小余白の計算
        const minMarginPx = Math.round(photoShortSidePx * (currentState.baseMarginPercent / 100));

        // 4. 出力Canvasの寸法決定 (ロジックは前回と同様)
        const tempWidthWithMinMargin = photoDrawWidthPx + 2 * minMarginPx;
        const tempHeightWithMinMargin = photoDrawHeightPx + 2 * minMarginPx;
        const tempAspectRatio = (tempHeightWithMinMargin === 0) ? 1 : tempWidthWithMinMargin / tempHeightWithMinMargin;

        let outputTargetAspectRatioValue;
        if (currentState.outputTargetAspectRatioString === 'original_photo') {
            outputTargetAspectRatioValue = currentPhotoAspectRatio;
        } else {
            const parts = currentState.outputTargetAspectRatioString.split(':');
            outputTargetAspectRatioValue = parseFloat(parts[0]) / parseFloat(parts[1]);
        }
        if (isNaN(outputTargetAspectRatioValue) || outputTargetAspectRatioValue <= 0) outputTargetAspectRatioValue = 1;

        let outputCanvasWidthPx, outputCanvasHeightPx;
        if (tempHeightWithMinMargin <= 0 || outputTargetAspectRatioValue <= 0 || tempWidthWithMinMargin <= 0) {
            outputCanvasWidthPx = Math.max(1, tempWidthWithMinMargin);
            outputCanvasHeightPx = Math.max(1, tempHeightWithMinMargin > 0 ? tempHeightWithMinMargin : outputCanvasWidthPx / outputTargetAspectRatioValue );
            if (outputCanvasHeightPx <= 0) outputCanvasHeightPx = outputCanvasWidthPx;
        } else if (tempAspectRatio > outputTargetAspectRatioValue) {
            outputCanvasWidthPx = tempWidthWithMinMargin;
            outputCanvasHeightPx = Math.round(tempWidthWithMinMargin / outputTargetAspectRatioValue);
        } else {
            outputCanvasHeightPx = tempHeightWithMinMargin;
            outputCanvasWidthPx = Math.round(tempHeightWithMinMargin * outputTargetAspectRatioValue);
        }
        outputCanvasWidthPx = Math.max(outputCanvasWidthPx, Math.round(photoDrawWidthPx));
        outputCanvasHeightPx = Math.max(outputCanvasHeightPx, Math.round(photoDrawHeightPx));
        if (outputCanvasWidthPx <=0) outputCanvasWidthPx = 1;
        if (outputCanvasHeightPx <=0) outputCanvasHeightPx = 1;

        // 5. 写真の描画位置決定 (出力枠内でのスライド)
        const movableWidth = outputCanvasWidthPx - photoDrawWidthPx;
        const movableHeight = outputCanvasHeightPx - photoDrawHeightPx;

        // offsetX, offsetY (0-1) を使って、可動範囲内で写真の左上座標を決定
        // movableWidth/Heightが負の場合、写真は枠より大きいので、オフセットははみ出し量を意味する
        const photoXonCanvasPx = movableWidth * offsetX;
        const photoYonCanvasPx = movableHeight * offsetY;
        
        return {
            photoDrawConfig: {
                sourceX: Math.round(sourceX),
                sourceY: Math.round(sourceY),
                sourceWidth: Math.round(sourceWidth),
                sourceHeight: Math.round(sourceHeight),
                destWidth: Math.round(photoDrawWidthPx),
                destHeight: Math.round(photoDrawHeightPx),
                destXonOutputCanvas: Math.round(photoXonCanvasPx),
                destYonOutputCanvas: Math.round(photoYonCanvasPx)
            },
            outputCanvasConfig: {
                width: Math.round(outputCanvasWidthPx),
                height: Math.round(outputCanvasHeightPx),
            }
        };
    }

    // drawPreview, renderFinal, handleDownload 関数は前回提示したものから大きなロジック変更なし
    // (calculateLayoutの戻り値の構造が変わらなければ、そのまま動作するはず)
    function drawPreview(currentState) {
        if (!currentState.image) { /* ... (変更なし) ... */ return; }
        const img = currentState.image;
        const { sourceX, sourceY, sourceWidth, sourceHeight,
                destXonOutputCanvas, destYonOutputCanvas,
                destWidth, destHeight } = currentState.photoDrawConfig;
        const outputTotalWidth = currentState.outputCanvasConfig.width;
        const outputTotalHeight = currentState.outputCanvasConfig.height;
        const outputAspectRatio = (outputTotalHeight === 0 || outputTotalWidth === 0) ? 1 : outputTotalWidth / outputTotalHeight;
        const container = previewCanvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        let canvasRenderWidth, canvasRenderHeight;
        if (containerWidth <=0 || containerHeight <=0 ) { canvasRenderWidth = 300; canvasRenderHeight = 200; }
        else if (containerWidth / containerHeight > outputAspectRatio) { canvasRenderHeight = containerHeight; canvasRenderWidth = containerHeight * outputAspectRatio; }
        else { canvasRenderWidth = containerWidth; canvasRenderHeight = containerWidth / outputAspectRatio; }
        previewCanvas.width = Math.max(1, Math.floor(canvasRenderWidth));
        previewCanvas.height = Math.max(1, Math.floor(canvasRenderHeight));
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        const scale = (outputTotalWidth === 0) ? 0 : previewCanvas.width / outputTotalWidth;
        previewCtx.fillStyle = currentState.backgroundColor;
        previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        const previewPhotoX = destXonOutputCanvas * scale;
        const previewPhotoY = destYonOutputCanvas * scale;
        const previewPhotoWidth = destWidth * scale;
        const previewPhotoHeight = destHeight * scale;
        if (sourceWidth > 0 && sourceHeight > 0 && destWidth > 0 && destHeight > 0 && previewPhotoWidth > 0 && previewPhotoHeight > 0) {
            previewCtx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, previewPhotoX, previewPhotoY, previewPhotoWidth, previewPhotoHeight);
        }
    }

    function renderFinal(currentState) { /* ... (前回から変更なし) ... */
        if (!currentState.image) return null;
        const img = currentState.image;
        const { sourceX, sourceY, sourceWidth, sourceHeight, destXonOutputCanvas, destYonOutputCanvas, destWidth, destHeight } = currentState.photoDrawConfig;
        const outputWidth = currentState.outputCanvasConfig.width;
        const outputHeight = currentState.outputCanvasConfig.height;
        if (outputWidth <= 0 || outputHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) {
            console.error("Render Final: Invalid dimensions", currentState.outputCanvasConfig, currentState.photoDrawConfig); return null;
        }
        const offscreenCanvas = new OffscreenCanvas(outputWidth, outputHeight);
        const ctx = offscreenCanvas.getContext('2d');
        ctx.fillStyle = currentState.backgroundColor;
        ctx.fillRect(0, 0, outputWidth, outputHeight);
        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, destXonOutputCanvas, destYonOutputCanvas, destWidth, destHeight);
        return offscreenCanvas;
    }

    function handleDownload() { /* ... (前回から変更なし) ... */
        if (!editState.image) { alert('画像が選択されていません。'); return; }
        const finalCanvas = renderFinal(editState);
        if (finalCanvas) {
            finalCanvas.convertToBlob({ type: 'image/jpeg', quality: 1.0 })
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    let baseName = 'image';
                    if (imageLoader.files[0] && imageLoader.files[0].name) {
                         baseName = imageLoader.files[0].name.substring(0, imageLoader.files[0].name.lastIndexOf('.')) || 'image';
                    }
                    const fileName = `${baseName}_kakomi_framed.jpg`;
                    const a = document.createElement('a');
                    a.href = url; a.download = fileName;
                    document.body.appendChild(a); a.click();
                    document.body.removeChild(a); URL.revokeObjectURL(url);
                })
                .catch(err => { console.error('ダウンロード失敗:', err); alert('ダウンロード失敗。'); });
        } else { alert('Canvas生成失敗。'); }
    }

    initializeUIFromState();
    if (tabButtons.length > 0) tabButtons[0].click();
});