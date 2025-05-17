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
    const photoPosXSlider = document.getElementById('photoPosX');
    const photoPosYSlider = document.getElementById('photoPosY');
    const photoPosXValueSpan = document.getElementById('photoPosXValue');
    const photoPosYValueSpan = document.getElementById('photoPosYValue');
    // 背景設定タブのUI要素
    const bgTypeColorRadio = document.getElementById('bgTypeColor');
    const bgTypeImageBlurRadio = document.getElementById('bgTypeImageBlur');
    const bgColorSettingsContainer = document.getElementById('bgColorSettingsContainer');
    const imageBlurSettingsContainer = document.getElementById('imageBlurSettingsContainer');
    const backgroundColorInput = document.getElementById('backgroundColor'); // これは元々あったもの
    const bgScaleSlider = document.getElementById('bgScale');
    const bgBlurSlider = document.getElementById('bgBlur');
    const bgBrightnessSlider = document.getElementById('bgBrightness');
    const bgSaturationSlider = document.getElementById('bgSaturation');
    const bgScaleValueSpan = document.getElementById('bgScaleValue');
    const bgBlurValueSpan = document.getElementById('bgBlurValue');
    const bgBrightnessValueSpan = document.getElementById('bgBrightnessValue');
    const bgSaturationValueSpan = document.getElementById('bgSaturationValue');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    let editState = {
        image: null,
        originalWidth: 0,
        originalHeight: 0,
        photoViewParams: { // 「出力枠内」での写真の位置調整パラメータ
            offsetX: 0.5, // 0 (左端) to 1 (右端), 0.5 = 中央
            offsetY: 0.5  // 0 (上端) to 1 (下端), 0.5 = 中央
        },
        outputTargetAspectRatioString: '1:1',
        baseMarginPercent: 5,
        backgroundColor: '#ffffff', // 単色背景用
        backgroundType: 'color', // 'color' または 'imageBlur'
        imageBlurBackgroundParams: {
            scale: 2.0,
            blurAmountPercent: 3, // 写真短辺に対する%
            brightness: 100,    // %
            saturation: 100     // %
        },
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
        if (photoPosXSlider) photoPosXSlider.value = editState.photoViewParams.offsetX;
        if (photoPosYSlider) photoPosYSlider.value = editState.photoViewParams.offsetY;
        if (backgroundColorInput) backgroundColorInput.value = editState.backgroundColor;
        if (bgTypeColorRadio) bgTypeColorRadio.checked = (editState.backgroundType === 'color');
        if (bgTypeImageBlurRadio) bgTypeImageBlurRadio.checked = (editState.backgroundType === 'imageBlur');

        if (bgScaleSlider) bgScaleSlider.value = editState.imageBlurBackgroundParams.scale;
        if (bgBlurSlider) bgBlurSlider.value = editState.imageBlurBackgroundParams.blurAmountPercent;
        if (bgBrightnessSlider) bgBrightnessSlider.value = editState.imageBlurBackgroundParams.brightness;
        if (bgSaturationSlider) bgSaturationSlider.value = editState.imageBlurBackgroundParams.saturation;

        toggleBackgroundSettingsVisibility();
        updateSliderValueDisplays();
    }

    function updateSliderValueDisplays() {
        if (photoPosXValueSpan) {
            const posXDisplay = Math.round((parseFloat(editState.photoViewParams.offsetX) - 0.5) * 2 * 100);
            photoPosXValueSpan.textContent = posXDisplay === 0 ? '中央' : `${posXDisplay}%`;
        }
        if (photoPosYValueSpan) {
            const posYDisplay = Math.round((parseFloat(editState.photoViewParams.offsetY) - 0.5) * 2 * 100);
            photoPosYValueSpan.textContent = posYDisplay === 0 ? '中央' : `${posYDisplay}%`;
        }

        if (bgScaleValueSpan) bgScaleValueSpan.textContent = `${parseFloat(editState.imageBlurBackgroundParams.scale).toFixed(1)}x`;
        if (bgBlurValueSpan) bgBlurValueSpan.textContent = `${parseFloat(editState.imageBlurBackgroundParams.blurAmountPercent).toFixed(1)}%`;
        if (bgBrightnessValueSpan) bgBrightnessValueSpan.textContent = `${editState.imageBlurBackgroundParams.brightness}%`;
        if (bgSaturationValueSpan) bgSaturationValueSpan.textContent = `${editState.imageBlurBackgroundParams.saturation}%`;

    }

    // 背景設定の表示/非表示を切り替える関数
    function toggleBackgroundSettingsVisibility() {
        if (editState.backgroundType === 'color') {
            if (bgColorSettingsContainer) bgColorSettingsContainer.classList.remove('hidden');
            if (imageBlurSettingsContainer) imageBlurSettingsContainer.classList.add('hidden');
        } else if (editState.backgroundType === 'imageBlur') {
            if (bgColorSettingsContainer) bgColorSettingsContainer.classList.add('hidden');
            if (imageBlurSettingsContainer) imageBlurSettingsContainer.classList.remove('hidden');
        }
    }

    // イベントリスナー
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

    // 背景タイプ選択ラジオボタンのイベントリスナー
    if (bgTypeColorRadio) bgTypeColorRadio.addEventListener('change', () => {
        if (bgTypeColorRadio.checked) {
            editState.backgroundType = 'color';
            toggleBackgroundSettingsVisibility();
            requestRedraw();
        }
    });
    if (bgTypeImageBlurRadio) bgTypeImageBlurRadio.addEventListener('change', () => {
        if (bgTypeImageBlurRadio.checked) {
            editState.backgroundType = 'imageBlur';
            toggleBackgroundSettingsVisibility();
            requestRedraw();
        }
    });

    // 単色背景のカラーピッカー (既存)
    if (backgroundColorInput) backgroundColorInput.addEventListener('input', (e) => {
        editState.backgroundColor = e.target.value;
        if (editState.backgroundType === 'color') { // 単色背景選択中のみ再描画
            requestRedraw();
        }
    });

    //  拡大ぼかし背景スライダーのイベントリスナー 
    if (bgScaleSlider) bgScaleSlider.addEventListener('input', (e) => {
        editState.imageBlurBackgroundParams.scale = parseFloat(e.target.value);
        updateSliderValueDisplays();
        if (editState.backgroundType === 'imageBlur') requestRedraw();
    });
    if (bgBlurSlider) bgBlurSlider.addEventListener('input', (e) => {
        editState.imageBlurBackgroundParams.blurAmountPercent = parseFloat(e.target.value);
        updateSliderValueDisplays();
        if (editState.backgroundType === 'imageBlur') requestRedraw();
    });
    if (bgBrightnessSlider) bgBrightnessSlider.addEventListener('input', (e) => {
        editState.imageBlurBackgroundParams.brightness = parseInt(e.target.value, 10);
        updateSliderValueDisplays();
        if (editState.backgroundType === 'imageBlur') requestRedraw();
    });
    if (bgSaturationSlider) bgSaturationSlider.addEventListener('input', (e) => {
        editState.imageBlurBackgroundParams.saturation = parseInt(e.target.value, 10);
        updateSliderValueDisplays();
        if (editState.backgroundType === 'imageBlur') requestRedraw();
    });

    // タブ切り替えリスナー
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
                    editState.backgroundType = 'color'; // 新規画像読み込み時は単色背景をデフォルトに
                    editState.imageBlurBackgroundParams = { scale: 2.0, blurAmountPercent: 3, brightness: 100, saturation: 100 }; // デフォルト値に戻す
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
            outputCanvasHeightPx = Math.max(1, tempHeightWithMinMargin > 0 ? tempHeightWithMinMargin : outputCanvasWidthPx / outputTargetAspectRatioValue);
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
        if (outputCanvasWidthPx <= 0) outputCanvasWidthPx = 1;
        if (outputCanvasHeightPx <= 0) outputCanvasHeightPx = 1;

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

    function drawOrRenderBackground(ctx, canvasWidth, canvasHeight, currentState) {
        if (currentState.backgroundType === 'color' || !currentState.image) {
            ctx.fillStyle = currentState.backgroundColor;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        } else if (currentState.backgroundType === 'imageBlur') {
            const img = currentState.image;
            const params = currentState.imageBlurBackgroundParams;

            // 写真の短辺の長さを取得 (calculateLayoutの結果から)
            // photoDrawConfig.destWidth/Height はズーム適用「後」の描画サイズだが、
            // 基準余白の%計算はズーム適用「後」の短辺を基準にしている。
            // ぼかし強度の%も、この「表示される写真の短辺」を基準にするのが自然か。
            const photoDrawWidth = currentState.photoDrawConfig.destWidth;
            const photoDrawHeight = currentState.photoDrawConfig.destHeight;
            const photoShortSidePx = (photoDrawWidth > 0 && photoDrawHeight > 0) ? Math.min(photoDrawWidth, photoDrawHeight) : 100; // フォールバック

            const blurPx = photoShortSidePx * (params.blurAmountPercent / 100);

            ctx.save(); // フィルター適用前に状態を保存

            // フィルター文字列を生成
            let filterString = '';
            if (blurPx > 0) filterString += `blur(${blurPx}px) `;
            if (params.brightness !== 100) filterString += `brightness(${params.brightness}%) `;
            if (params.saturation !== 100) filterString += `saturate(${params.saturation}%)`;
            if (filterString.trim() !== '') {
                ctx.filter = filterString.trim();
            }

            // 元画像のアスペクト比を保ちつつ、Canvas全体を覆うように拡大描画
            const imgAspectRatio = img.width / img.height;
            const canvasAspectRatio = canvasWidth / canvasHeight;
            let sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight;

            dWidth = canvasWidth * params.scale;
            dHeight = canvasHeight * params.scale;
            dx = (canvasWidth - dWidth) / 2; // 中央に配置
            dy = (canvasHeight - dHeight) / 2;

            // 元画像から切り出す領域を決定（アスペクト比を維持しつつ中央から）
            if (imgAspectRatio > (dWidth / dHeight)) { // 元画像が描画領域より横長
                sHeight = img.height;
                sWidth = sHeight * (dWidth / dHeight);
                sx = (img.width - sWidth) / 2;
                sy = 0;
            } else { // 元画像が描画領域より縦長または同じアスペクト比
                sWidth = img.width;
                sHeight = sWidth / (dWidth / dHeight);
                sx = 0;
                sy = (img.height - sHeight) / 2;
            }

            ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
            ctx.restore(); // フィルターをリセット
        }
    }

    // drawPreview, renderFinal, handleDownload 関数は前回提示したものから大きなロジック変更なし
    // (calculateLayoutの戻り値の構造が変わらなければ、そのまま動作するはず)
    function drawPreview(currentState) {
        if (!currentState.outputCanvasConfig || currentState.outputCanvasConfig.width === 0) { // レイアウト未計算
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            return;
        } const img = currentState.image;
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
        if (containerWidth <= 0 || containerHeight <= 0) { canvasRenderWidth = 300; canvasRenderHeight = 200; }
        else if (containerWidth / containerHeight > outputAspectRatio) { canvasRenderHeight = containerHeight; canvasRenderWidth = containerHeight * outputAspectRatio; }
        else { canvasRenderWidth = containerWidth; canvasRenderHeight = containerWidth / outputAspectRatio; }
        previewCanvas.width = Math.max(1, Math.floor(canvasRenderWidth));
        previewCanvas.height = Math.max(1, Math.floor(canvasRenderHeight));
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        const scale = (outputTotalWidth === 0) ? 0 : previewCanvas.width / outputTotalWidth;
        previewCtx.fillStyle = currentState.backgroundColor;
        previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

        // 背景描画呼び出し
        drawOrRenderBackground(previewCtx, previewCanvas.width, previewCanvas.height, currentState);

        if (img) { // 画像が読み込まれている場合のみ前景写真を描画
            const scale = (outputTotalWidth === 0) ? 0 : previewCanvas.width / outputTotalWidth;
            const previewPhotoX = destXonOutputCanvas * scale;
            const previewPhotoY = destYonOutputCanvas * scale;
            const previewPhotoWidth = destWidth * scale;
            const previewPhotoHeight = destHeight * scale;
            if (sourceWidth > 0 && sourceHeight > 0 && destWidth > 0 && destHeight > 0 && previewPhotoWidth > 0 && previewPhotoHeight > 0) {
                previewCtx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, previewPhotoX, previewPhotoY, previewPhotoWidth, previewPhotoHeight);
            }
        }
    }

    function renderFinal(currentState) { /* ... (前回から変更なし) ... */
        if (!currentState.image || !currentState.outputCanvasConfig || currentState.outputCanvasConfig.width <= 0 || currentState.outputCanvasConfig.height <= 0) {
            console.error("Render Final: Invalid state or image not loaded."); return null;
        }
        const img = currentState.image;
        const { sourceX, sourceY, sourceWidth, sourceHeight, destXonOutputCanvas, destYonOutputCanvas, destWidth, destHeight } = currentState.photoDrawConfig;
        const outputWidth = currentState.outputCanvasConfig.width;
        const outputHeight = currentState.outputCanvasConfig.height;
        if (outputWidth <= 0 || outputHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) {
            console.error("Render Final: Invalid dimensions", currentState.outputCanvasConfig, currentState.photoDrawConfig); return null;
        }
        const offscreenCanvas = new OffscreenCanvas(outputWidth, outputHeight);
        const ctx = offscreenCanvas.getContext('2d');
        // 背景描画呼び出し
        drawOrRenderBackground(ctx, outputWidth, outputHeight, currentState);

        // 前景写真描画 (前回と同様)
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