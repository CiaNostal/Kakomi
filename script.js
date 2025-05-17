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
    const photoZoomSlider = document.getElementById('photoZoom');
    const photoPosXSlider = document.getElementById('photoPosX');
    const photoPosYSlider = document.getElementById('photoPosY');
    const photoZoomValueSpan = document.getElementById('photoZoomValue');
    const photoPosXValueSpan = document.getElementById('photoPosXValue');
    const photoPosYValueSpan = document.getElementById('photoPosYValue');

    // 背景編集タブのUI要素 (例)
    const backgroundColorInput = document.getElementById('backgroundColor');

    // タブ関連のDOM要素
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // 編集状態を一元管理するオブジェクト
    let editState = {
        image: null,
        originalWidth: 0,
        originalHeight: 0,
        photoViewParams: { // 元画像の表示調整パラメータ
            zoom: 1,
            posX: 0.5, // 0 (左/上端) to 1 (右/下端), 0.5 = 中央
            posY: 0.5
        },
        outputTargetAspectRatioString: '1:1',
        baseMarginPercent: 5,
        backgroundColor: '#ffffff',
        // 以下はcalculateLayoutで設定される
        photoDrawConfig: {
            sourceX: 0, sourceY: 0, sourceWidth: 0, sourceHeight: 0,
            destWidth: 0, destHeight: 0,
            destXonOutputCanvas: 0, destYonOutputCanvas: 0
        },
        outputCanvasConfig: { width: 0, height: 0 },
    };

    // --- 初期UI設定 ---
    function initializeUIFromState() {
        if (outputAspectRatioSelect) outputAspectRatioSelect.value = editState.outputTargetAspectRatioString;
        if (baseMarginPercentInput) baseMarginPercentInput.value = editState.baseMarginPercent;
        if (photoZoomSlider) photoZoomSlider.value = editState.photoViewParams.zoom;
        if (photoPosXSlider) photoPosXSlider.value = editState.photoViewParams.posX;
        if (photoPosYSlider) photoPosYSlider.value = editState.photoViewParams.posY;
        if (backgroundColorInput) backgroundColorInput.value = editState.backgroundColor;
        updateSliderValueDisplays();
    }

    function updateSliderValueDisplays() {
        if (photoZoomValueSpan) photoZoomValueSpan.textContent = `${parseFloat(editState.photoViewParams.zoom).toFixed(2)}x`;
        if (photoPosXValueSpan) {
            const posXDisplay = Math.round((parseFloat(editState.photoViewParams.posX) - 0.5) * 2 * 100); // -100% to 100%
             photoPosXValueSpan.textContent = posXDisplay === 0 ? '中央' : `${posXDisplay}%`;
        }
        if (photoPosYValueSpan) {
            const posYDisplay = Math.round((parseFloat(editState.photoViewParams.posY) - 0.5) * 2 * 100); // -100% to 100%
            photoPosYValueSpan.textContent = posYDisplay === 0 ? '中央' : `${posYDisplay}%`;
        }
    }


    // --- イベントリスナー ---
    if (imageLoader) imageLoader.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) processImageFile(file);
    });
    if (downloadButton) downloadButton.addEventListener('click', handleDownload);

    // ドラッグ＆ドロップ
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

    // レイアウト設定タブのUIイベント
    if (outputAspectRatioSelect) outputAspectRatioSelect.addEventListener('change', (e) => {
        editState.outputTargetAspectRatioString = e.target.value;
        requestRedraw();
    });
    if (baseMarginPercentInput) baseMarginPercentInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 100) val = 100;
        e.target.value = val; // UIに反映
        editState.baseMarginPercent = val;
        requestRedraw();
    });
    if (photoZoomSlider) photoZoomSlider.addEventListener('input', (e) => {
        editState.photoViewParams.zoom = parseFloat(e.target.value);
        updateSliderValueDisplays();
        requestRedraw();
    });
    if (photoPosXSlider) photoPosXSlider.addEventListener('input', (e) => {
        editState.photoViewParams.posX = parseFloat(e.target.value);
        updateSliderValueDisplays();
        requestRedraw();
    });
    if (photoPosYSlider) photoPosYSlider.addEventListener('input', (e) => {
        editState.photoViewParams.posY = parseFloat(e.target.value);
        updateSliderValueDisplays();
        requestRedraw();
    });

    // 背景色 (tab-background内)
    if (backgroundColorInput) backgroundColorInput.addEventListener('input', (e) => {
        editState.backgroundColor = e.target.value;
        requestRedraw();
    });


    // タブ切り替え
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

    // --- 関数 ---
    function processImageFile(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    editState.image = img;
                    editState.originalWidth = img.width;
                    editState.originalHeight = img.height;

                    // 新しい画像が読み込まれたら、表示調整パラメータをデフォルトにリセット
                    editState.photoViewParams = { zoom: 1, posX: 0.5, posY: 0.5 };
                    // editState.outputTargetAspectRatioString = '1:1'; // または現在のUIの値
                    // editState.baseMarginPercent = 5;              // または現在のUIの値
                    initializeUIFromState(); // UIもリセット後の値に更新

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
        // layoutInfoをeditStateにも保存（必要なら）
        editState.photoDrawConfig = layoutInfo.photoDrawConfig;
        editState.outputCanvasConfig = layoutInfo.outputCanvasConfig;
        drawPreview(editState /*, layoutInfoを渡す代わりにeditStateから直接参照しても良い*/ );
    }

    function calculateLayout(currentState) {
        if (!currentState.image) {
            return {
                photoDrawConfig: { sourceX: 0, sourceY: 0, sourceWidth: 0, sourceHeight: 0, destWidth: 0, destHeight: 0, destXonOutputCanvas: 0, destYonOutputCanvas: 0 },
                outputCanvasConfig: { width: 300, height: 200 }
            };
        }

        const originalImgWidth = currentState.originalWidth;
        const originalImgHeight = currentState.originalHeight;
        const { zoom, posX, posY } = currentState.photoViewParams;

        // 1. 使用する写真領域の決定 (ズームとパンを適用)
        const displaySourceWidth = originalImgWidth / zoom;
        const displaySourceHeight = originalImgHeight / zoom;
        const sourceX = (originalImgWidth - displaySourceWidth) * posX;
        const sourceY = (originalImgHeight - displaySourceHeight) * posY;

        const trimmedPhotoWidthPx = displaySourceWidth;
        const trimmedPhotoHeightPx = displaySourceHeight;
        const currentPhotoAspectRatio = (trimmedPhotoHeightPx === 0) ? 1 : trimmedPhotoWidthPx / trimmedPhotoHeightPx;

        // 2. 基準値の計算
        const photoShortSidePx = Math.min(trimmedPhotoWidthPx, trimmedPhotoHeightPx);

        // 3. 最小余白の計算
        const minMarginPx = Math.round(photoShortSidePx * (currentState.baseMarginPercent / 100));

        // 4. 出力Canvasの寸法決定
        const photoDrawWidthPx = trimmedPhotoWidthPx;
        const photoDrawHeightPx = trimmedPhotoHeightPx;

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

        let outputCanvasWidthPx;
        let outputCanvasHeightPx;

        if (tempHeightWithMinMargin <= 0 || outputTargetAspectRatioValue <= 0 || tempWidthWithMinMargin <= 0) {
            outputCanvasWidthPx = Math.max(1, tempWidthWithMinMargin);
            outputCanvasHeightPx = Math.max(1, tempHeightWithMinMargin > 0 ? tempHeightWithMinMargin : outputCanvasWidthPx / outputTargetAspectRatioValue );
             if (outputCanvasHeightPx <= 0) outputCanvasHeightPx = outputCanvasWidthPx; // さらにフォールバック
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


        // 5. 写真の描画位置決定 (常に中央揃え)
        const photoXonCanvasPx = (outputCanvasWidthPx - photoDrawWidthPx) / 2;
        const photoYonCanvasPx = (outputCanvasHeightPx - photoDrawHeightPx) / 2;
        
        return {
            photoDrawConfig: {
                sourceX: Math.round(sourceX),
                sourceY: Math.round(sourceY),
                sourceWidth: Math.round(trimmedPhotoWidthPx),
                sourceHeight: Math.round(trimmedPhotoHeightPx),
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

    function drawPreview(currentState /*, layoutInfo を使わずcurrentStateから取得 */) {
        if (!currentState.image) {
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            return;
        }

        const img = currentState.image;
        // editStateに保存された最新のレイアウト情報を使用
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
        if (containerWidth <=0 || containerHeight <=0 ) { // コンテナサイズが取れない場合
            canvasRenderWidth = 300; canvasRenderHeight = 200; // 適当なデフォルト
        } else if (containerWidth / containerHeight > outputAspectRatio) {
            canvasRenderHeight = containerHeight;
            canvasRenderWidth = containerHeight * outputAspectRatio;
        } else {
            canvasRenderWidth = containerWidth;
            canvasRenderHeight = containerWidth / outputAspectRatio;
        }
        
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
            previewCtx.drawImage(
                img,
                sourceX, sourceY, sourceWidth, sourceHeight,
                previewPhotoX, previewPhotoY, previewPhotoWidth, previewPhotoHeight
            );
        }
    }

    function renderFinal(currentState) {
        if (!currentState.image) return null;

        const img = currentState.image;
        const { sourceX, sourceY, sourceWidth, sourceHeight,
                destXonOutputCanvas, destYonOutputCanvas,
                destWidth, destHeight } = currentState.photoDrawConfig;
        
        const outputWidth = currentState.outputCanvasConfig.width;
        const outputHeight = currentState.outputCanvasConfig.height;

        if (outputWidth <= 0 || outputHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) {
            console.error("Render Final: Invalid dimensions for canvas or image.", currentState.outputCanvasConfig, currentState.photoDrawConfig);
            return null;
        }

        const offscreenCanvas = new OffscreenCanvas(outputWidth, outputHeight);
        const ctx = offscreenCanvas.getContext('2d');

        ctx.fillStyle = currentState.backgroundColor;
        ctx.fillRect(0, 0, outputWidth, outputHeight);

        // destX/Y/Width/Height は既に整数化されている想定 (calculateLayoutの戻り値)
        ctx.drawImage(
            img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            destXonOutputCanvas, destYonOutputCanvas, destWidth, destHeight
        );
        return offscreenCanvas;
    }

    function handleDownload() {
        if (!editState.image) {
            alert('画像が選択されていません。');
            return;
        }
        // calculateLayoutを再度呼び出すか、editStateに保存された最新のconfigを使う
        // requestRedrawでeditStateが更新されているので、それを使う
        const finalCanvas = renderFinal(editState);

        if (finalCanvas) {
            finalCanvas.convertToBlob({ type: 'image/jpeg', quality: 1.0 })
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    let baseName = 'image';
                    if (imageLoader.files[0] && imageLoader.files[0].name) {
                         baseName = imageLoader.files[0].name.substring(0, imageLoader.files[0].name.lastIndexOf('.')) || 'image';
                    }
                    const fileName = `${baseName}_kakomi_framed.jpg`; // 少しファイル名変更

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

    // 初期化
    initializeUIFromState();
    if (tabButtons.length > 0) {
        tabButtons[0].click(); // 最初のタブをアクティブに
    }
});