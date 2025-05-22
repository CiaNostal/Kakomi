/**
 * main.js
 * Kakomiアプリケーションのメインエントリーポイント
 */

// モジュールのインポート
import * as stateManager from './modules/stateManager.js';
import { calculateLayout } from './modules/layout.js';
import { drawBackground } from './modules/background.js';
import { applyFrameEffects } from './modules/frame.js';
import { drawText, loadGoogleFonts } from './modules/text.js';
import { extractExifFromFile, displayExifInfo, embedExifToJpeg } from './modules/exif.js';
import { 
    fitCanvasToContainer, 
    drawImageWithPrecision,
    canvasToJpegBlob 
} from './utils/canvas-utils.js';

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', initializeApp);

// DOMエレメントへの参照を保持するオブジェクト
const elements = {};

/**
 * アプリケーションを初期化する
 */
function initializeApp() {
    // UI要素への参照を取得
    initializeElements();
    
    // イベントリスナーを設定
    setupEventListeners();
    
    // タブシステムを初期化
    initializeTabs();
    
    // 初期UI状態を設定
    updateUIFromState(stateManager.getState());
    
    // ステート変更リスナーを登録
    stateManager.addStateChangeListener(handleStateChange);
    
    console.log('Kakomiアプリケーションが初期化されました。');
}

/**
 * アプリケーションで使用するDOM要素への参照を初期化
 */
function initializeElements() {
    // キャンバス関連
    elements.previewCanvas = document.getElementById('previewCanvas');
    elements.canvasContainer = document.querySelector('.canvas-container');
    
    // 画像読み込み関連
    elements.imageLoader = document.getElementById('imageLoader');
    
    // タブナビゲーション
    elements.tabButtons = Array.from(document.querySelectorAll('.tab-button'));
    elements.tabPanes = Array.from(document.querySelectorAll('.tab-pane'));
    
    // レイアウト設定タブ
    elements.outputAspectRatioSelect = document.getElementById('outputAspectRatio');
    elements.baseMarginPercentInput = document.getElementById('baseMarginPercent');
    elements.photoPosXSlider = document.getElementById('photoPosX');
    elements.photoPosYSlider = document.getElementById('photoPosY');
    elements.photoPosXValueSpan = document.getElementById('photoPosXValue');
    elements.photoPosYValueSpan = document.getElementById('photoPosYValue');
    
    // 背景設定タブ
    elements.bgTypeColorRadio = document.getElementById('bgTypeColor');
    elements.bgTypeImageBlurRadio = document.getElementById('bgTypeImageBlur');
    elements.bgColorSettingsContainer = document.getElementById('bgColorSettingsContainer');
    elements.imageBlurSettingsContainer = document.getElementById('imageBlurSettingsContainer');
    elements.backgroundColorInput = document.getElementById('backgroundColor');
    elements.bgScaleSlider = document.getElementById('bgScale');
    elements.bgBlurSlider = document.getElementById('bgBlur');
    elements.bgBrightnessSlider = document.getElementById('bgBrightness');
    elements.bgSaturationSlider = document.getElementById('bgSaturation');
    elements.bgScaleValueSpan = document.getElementById('bgScaleValue');
    elements.bgBlurValueSpan = document.getElementById('bgBlurValue');
    elements.bgBrightnessValueSpan = document.getElementById('bgBrightnessValue');
    elements.bgSaturationValueSpan = document.getElementById('bgSaturationValue');
    
    // フレーム加工タブ (まだ実装されていない)
    // elements.cornerRadiusSlider = document.getElementById('cornerRadius');
    
    // 文字入力タブ (まだ実装されていない)
    // elements.dateFormatSelect = document.getElementById('dateFormat');
    
    // 出力タブ
    elements.downloadButton = document.getElementById('downloadButton');
    
    // Exif情報表示
    elements.exifDataContainer = document.getElementById('exifDataContainer');
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
    // 画像読み込み関連
    if (elements.imageLoader) {
        elements.imageLoader.addEventListener('change', handleImageLoad);
    }
    
    if (elements.canvasContainer) {
        elements.canvasContainer.addEventListener('dragover', (event) => {
            event.stopPropagation(); 
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            elements.canvasContainer.classList.add('dragover');
        });
        
        elements.canvasContainer.addEventListener('dragleave', (event) => {
            event.stopPropagation(); 
            event.preventDefault();
            elements.canvasContainer.classList.remove('dragover');
        });
        
        elements.canvasContainer.addEventListener('drop', (event) => {
            event.stopPropagation(); 
            event.preventDefault();
            elements.canvasContainer.classList.remove('dragover');
            const files = event.dataTransfer.files;
            if (files.length > 0) handleImageFile(files[0]);
        });
    }
    
    // レイアウト設定タブ
    if (elements.outputAspectRatioSelect) {
        elements.outputAspectRatioSelect.addEventListener('change', (e) => {
            stateManager.updateState({ outputTargetAspectRatioString: e.target.value });
        });
    }
    
    if (elements.baseMarginPercentInput) {
        elements.baseMarginPercentInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 0) val = 0;
            if (val > 100) val = 100;
            e.target.value = val;
            stateManager.updateState({ baseMarginPercent: val });
        });
    }
    
    if (elements.photoPosXSlider) {
        elements.photoPosXSlider.addEventListener('input', (e) => {
            stateManager.updateState({ 
                photoViewParams: { 
                    offsetX: parseFloat(e.target.value),
                    offsetY: stateManager.getState().photoViewParams.offsetY
                }
            });
        });
    }
    
    if (elements.photoPosYSlider) {
        elements.photoPosYSlider.addEventListener('input', (e) => {
            stateManager.updateState({ 
                photoViewParams: { 
                    offsetX: stateManager.getState().photoViewParams.offsetX,
                    offsetY: parseFloat(e.target.value)
                }
            });
        });
    }
    
    // 背景設定タブ
    if (elements.bgTypeColorRadio) {
        elements.bgTypeColorRadio.addEventListener('change', () => {
            if (elements.bgTypeColorRadio.checked) {
                stateManager.updateState({ backgroundType: 'color' });
            }
        });
    }
    
    if (elements.bgTypeImageBlurRadio) {
        elements.bgTypeImageBlurRadio.addEventListener('change', () => {
            if (elements.bgTypeImageBlurRadio.checked) {
                stateManager.updateState({ backgroundType: 'imageBlur' });
            }
        });
    }
    
    if (elements.backgroundColorInput) {
        elements.backgroundColorInput.addEventListener('input', (e) => {
            stateManager.updateState({ backgroundColor: e.target.value });
        });
    }
    
    if (elements.bgScaleSlider) {
        elements.bgScaleSlider.addEventListener('input', (e) => {
            stateManager.updateState({ 
                imageBlurBackgroundParams: { 
                    ...stateManager.getState().imageBlurBackgroundParams,
                    scale: parseFloat(e.target.value)
                }
            });
        });
    }
    
    if (elements.bgBlurSlider) {
        elements.bgBlurSlider.addEventListener('input', (e) => {
            stateManager.updateState({ 
                imageBlurBackgroundParams: { 
                    ...stateManager.getState().imageBlurBackgroundParams,
                    blurAmountPercent: parseFloat(e.target.value)
                }
            });
        });
    }
    
    if (elements.bgBrightnessSlider) {
        elements.bgBrightnessSlider.addEventListener('input', (e) => {
            stateManager.updateState({ 
                imageBlurBackgroundParams: { 
                    ...stateManager.getState().imageBlurBackgroundParams,
                    brightness: parseInt(e.target.value, 10)
                }
            });
        });
    }
    
    if (elements.bgSaturationSlider) {
        elements.bgSaturationSlider.addEventListener('input', (e) => {
            stateManager.updateState({ 
                imageBlurBackgroundParams: { 
                    ...stateManager.getState().imageBlurBackgroundParams,
                    saturation: parseInt(e.target.value, 10)
                }
            });
        });
    }
    
    // 出力タブ
    if (elements.downloadButton) {
        elements.downloadButton.addEventListener('click', handleDownload);
    }
}

/**
 * タブシステムを初期化
 */
function initializeTabs() {
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // すべてのタブからアクティブクラスを削除
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            elements.tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // クリックされたタブとそれに対応するペインをアクティブにする
            button.classList.add('active');
            const targetTabId = button.getAttribute('data-tab');
            const targetPane = document.getElementById(targetTabId);
            if (targetPane) targetPane.classList.add('active');
        });
    });
    
    // 最初のタブをアクティブにする
    if (elements.tabButtons.length > 0) {
        elements.tabButtons[0].click();
    }
}

/**
 * 状態変更ハンドラ
 * @param {Object} newState - 更新された状態
 */
function handleStateChange(newState) {
    // レイアウトを計算
    const layoutInfo = calculateLayout(newState);
    
    // 計算されたレイアウト情報を状態に保存
    stateManager.updateState({
        photoDrawConfig: layoutInfo.photoDrawConfig,
        outputCanvasConfig: layoutInfo.outputCanvasConfig
    });
    
    // UIを更新
    updateUIFromState(newState);
    
    // プレビューを描画
    drawPreview(newState);
}

/**
 * UIの状態を更新する
 * @param {Object} currentState - 現在の状態
 */
function updateUIFromState(currentState) {
    // レイアウト設定タブのUI更新
    if (elements.outputAspectRatioSelect) {
        elements.outputAspectRatioSelect.value = currentState.outputTargetAspectRatioString;
    }
    
    if (elements.baseMarginPercentInput) {
        elements.baseMarginPercentInput.value = currentState.baseMarginPercent;
    }
    
    if (elements.photoPosXSlider) {
        elements.photoPosXSlider.value = currentState.photoViewParams.offsetX;
    }
    
    if (elements.photoPosYSlider) {
        elements.photoPosYSlider.value = currentState.photoViewParams.offsetY;
    }
    
    // 背景設定タブのUI更新
    if (elements.bgTypeColorRadio && elements.bgTypeImageBlurRadio) {
        elements.bgTypeColorRadio.checked = (currentState.backgroundType === 'color');
        elements.bgTypeImageBlurRadio.checked = (currentState.backgroundType === 'imageBlur');
    }
    
    // 背景設定の表示/非表示
    if (elements.bgColorSettingsContainer && elements.imageBlurSettingsContainer) {
        if (currentState.backgroundType === 'color') {
            elements.bgColorSettingsContainer.classList.remove('hidden');
            elements.imageBlurSettingsContainer.classList.add('hidden');
        } else if (currentState.backgroundType === 'imageBlur') {
            elements.bgColorSettingsContainer.classList.add('hidden');
            elements.imageBlurSettingsContainer.classList.remove('hidden');
        }
    }
    
    if (elements.backgroundColorInput) {
        elements.backgroundColorInput.value = currentState.backgroundColor;
    }
    
    if (elements.bgScaleSlider) {
        elements.bgScaleSlider.value = currentState.imageBlurBackgroundParams.scale;
    }
    
    if (elements.bgBlurSlider) {
        elements.bgBlurSlider.value = currentState.imageBlurBackgroundParams.blurAmountPercent;
    }
    
    if (elements.bgBrightnessSlider) {
        elements.bgBrightnessSlider.value = currentState.imageBlurBackgroundParams.brightness;
    }
    
    if (elements.bgSaturationSlider) {
        elements.bgSaturationSlider.value = currentState.imageBlurBackgroundParams.saturation;
    }
    
    // スライダー値の表示更新
    updateSliderValueDisplays(currentState);
    
    // ダウンロードボタンの有効/無効
    if (elements.downloadButton) {
        elements.downloadButton.disabled = !currentState.image;
    }
}

/**
 * スライダー値の表示を更新
 * @param {Object} currentState - 現在の状態
 */
function updateSliderValueDisplays(currentState) {
    if (elements.photoPosXValueSpan) {
        const posXDisplay = Math.round((parseFloat(currentState.photoViewParams.offsetX) - 0.5) * 2 * 100);
        elements.photoPosXValueSpan.textContent = posXDisplay === 0 ? '中央' : `${posXDisplay}%`;
    }
    
    if (elements.photoPosYValueSpan) {
        const posYDisplay = Math.round((parseFloat(currentState.photoViewParams.offsetY) - 0.5) * 2 * 100);
        elements.photoPosYValueSpan.textContent = posYDisplay === 0 ? '中央' : `${posYDisplay}%`;
    }
    
    if (elements.bgScaleValueSpan) {
        elements.bgScaleValueSpan.textContent = `${parseFloat(currentState.imageBlurBackgroundParams.scale).toFixed(1)}x`;
    }
    
    if (elements.bgBlurValueSpan) {
        elements.bgBlurValueSpan.textContent = `${parseFloat(currentState.imageBlurBackgroundParams.blurAmountPercent).toFixed(1)}%`;
    }
    
    if (elements.bgBrightnessValueSpan) {
        elements.bgBrightnessValueSpan.textContent = `${currentState.imageBlurBackgroundParams.brightness}%`;
    }
    
    if (elements.bgSaturationValueSpan) {
        elements.bgSaturationValueSpan.textContent = `${currentState.imageBlurBackgroundParams.saturation}%`;
    }
}

/**
 * 画像が読み込まれたときのハンドラ
 * @param {Event} event - イベントオブジェクト
 */
function handleImageLoad(event) {
    const file = event.target.files[0];
    if (file) handleImageFile(file);
}

/**
 * 画像ファイルを処理
 * @param {File} file - 画像ファイル
 */
function handleImageFile(file) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Exif情報を抽出（可能であれば）
                extractExifFromFile(file)
                    .then(exifData => {
                        // 画像とExifデータを状態に設定
                        stateManager.setImage(img, exifData);
                        
                        // Exif情報を表示
                        if (elements.exifDataContainer) {
                            displayExifInfo(exifData, elements.exifDataContainer);
                        }
                    })
                    .catch(error => {
                        console.error('Exif情報の抽出に失敗:', error);
                        // Exifなしで画像を設定
                        stateManager.setImage(img);
                    });
            };
            
            img.onerror = () => { 
                alert('画像の読み込みに失敗しました。'); 
                if (elements.imageLoader) elements.imageLoader.value = ''; 
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => { 
            alert('ファイルの読み込みに失敗しました。'); 
            if (elements.imageLoader) elements.imageLoader.value = ''; 
        };
        
        reader.readAsDataURL(file);
    } else {
        alert('画像ファイルを選択またはドラッグ＆ドロップしてください。');
        if (elements.imageLoader) elements.imageLoader.value = '';
    }
}

/**
 * プレビューを描画
 * @param {Object} currentState - 現在の状態
 */
function drawPreview(currentState) {
    if (!elements.previewCanvas || !currentState.image) return;
    
    const previewCtx = elements.previewCanvas.getContext('2d');
    
    // レイアウト情報がない場合は描画しない
    if (!currentState.outputCanvasConfig || currentState.outputCanvasConfig.width === 0) {
        previewCtx.clearRect(0, 0, elements.previewCanvas.width, elements.previewCanvas.height);
        return;
    }
    
    const { sourceX, sourceY, sourceWidth, sourceHeight,
            destXonOutputCanvas, destYonOutputCanvas,
            destWidth, destHeight } = currentState.photoDrawConfig;
    
    const outputTotalWidth = currentState.outputCanvasConfig.width;
    const outputTotalHeight = currentState.outputCanvasConfig.height;
    const outputAspectRatio = (outputTotalHeight === 0 || outputTotalWidth === 0) ? 1 : outputTotalWidth / outputTotalHeight;
    
    // Canvasのサイズを設定
    fitCanvasToContainer(elements.previewCanvas, outputAspectRatio);
    
    // Canvasをクリア
    previewCtx.clearRect(0, 0, elements.previewCanvas.width, elements.previewCanvas.height);
    
    // スケーリング係数を計算
    const scale = elements.previewCanvas.width / outputTotalWidth;
    
    // 背景を描画
    drawBackground(previewCtx, elements.previewCanvas.width, elements.previewCanvas.height, currentState);
    
    // 前景写真を描画
    if (currentState.image) {
        const previewPhotoX = destXonOutputCanvas * scale;
        const previewPhotoY = destYonOutputCanvas * scale;
        const previewPhotoWidth = destWidth * scale;
        const previewPhotoHeight = destHeight * scale;
        
        // 元画像から選択した部分を、プレビューキャンバスにスケーリングして描画
        if (sourceWidth > 0 && sourceHeight > 0 && destWidth > 0 && destHeight > 0 && previewPhotoWidth > 0 && previewPhotoHeight > 0) {
            drawImageWithPrecision(
                previewCtx,
                currentState.image,
                sourceX, sourceY, sourceWidth, sourceHeight,
                previewPhotoX, previewPhotoY, previewPhotoWidth, previewPhotoHeight
            );
            
            // フレーム効果を適用
            applyFrameEffects(
                previewCtx,
                currentState,
                previewPhotoX,
                previewPhotoY,
                previewPhotoWidth,
                previewPhotoHeight
            );
            
            // テキストを描画
            drawText(
                previewCtx,
                currentState,
                elements.previewCanvas.width,
                elements.previewCanvas.height
            );
        }
    }
}

/**
 * 画像ダウンロード処理
 */
function handleDownload() {
    const currentState = stateManager.getState();
    
    if (!currentState.image) {
        alert('画像が選択されていません。');
        return;
    }
    
    // 出力用のキャンバスを作成
    const finalCanvas = renderFinal(currentState);
    
    if (finalCanvas) {
        // JPEG品質を設定 (0-1)
        const quality = currentState.outputSettings.quality / 100;
        
        // キャンバスをBlobに変換
        canvasToJpegBlob(finalCanvas, quality)
            .then(blob => {
                // Exif情報の再埋め込み（有効な場合）
                if (currentState.outputSettings.preserveExif && currentState.exifData) {
                    return embedExifToJpeg(blob, currentState.exifData);
                }
                return blob;
            })
            .then(finalBlob => {
                // ダウンロードリンクを作成
                const url = URL.createObjectURL(finalBlob);
                let baseName = 'image';
                
                // 元のファイル名がある場合は使用
                if (elements.imageLoader && elements.imageLoader.files[0] && elements.imageLoader.files[0].name) {
                    baseName = elements.imageLoader.files[0].name.substring(0, elements.imageLoader.files[0].name.lastIndexOf('.')) || 'image';
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
                console.error('ダウンロード失敗:', err);
                alert('ダウンロードに失敗しました。');
            });
    } else {
        alert('Canvas生成に失敗しました。');
    }
}

/**
 * 最終出力用のキャンバスをレンダリング
 * @param {Object} currentState - 現在の状態
 * @returns {OffscreenCanvas} レンダリングされたキャンバス
 */
function renderFinal(currentState) {
    if (!currentState.image || !currentState.outputCanvasConfig || 
        currentState.outputCanvasConfig.width <= 0 || currentState.outputCanvasConfig.height <= 0) {
        console.error("レンダリング失敗: 無効な状態または画像が読み込まれていません。");
        return null;
    }
    
    const { sourceX, sourceY, sourceWidth, sourceHeight, 
            destXonOutputCanvas, destYonOutputCanvas, 
            destWidth, destHeight } = currentState.photoDrawConfig;
    
    const outputWidth = currentState.outputCanvasConfig.width;
    const outputHeight = currentState.outputCanvasConfig.height;
    
    if (outputWidth <= 0 || outputHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0 || 
        destWidth <= 0 || destHeight <= 0) {
        console.error("レンダリング失敗: 無効なサイズパラメータ", 
                    currentState.outputCanvasConfig, currentState.photoDrawConfig);
        return null;
    }
    
    // 出力用のオフスクリーンキャンバスを作成
    const offscreenCanvas = new OffscreenCanvas(outputWidth, outputHeight);
    const ctx = offscreenCanvas.getContext('2d');
    
    // 背景を描画
    drawBackground(ctx, outputWidth, outputHeight, currentState);
    
    // 前景写真を描画
    drawImageWithPrecision(
        ctx,
        currentState.image,
        sourceX, sourceY, sourceWidth, sourceHeight,
        destXonOutputCanvas, destYonOutputCanvas, destWidth, destHeight
    );
    
    // フレーム効果を適用
    applyFrameEffects(
        ctx,
        currentState,
        destXonOutputCanvas,
        destYonOutputCanvas,
        destWidth,
        destHeight
    );
    
    // テキストを描画
    drawText(
        ctx,
        currentState,
        outputWidth,
        outputHeight
    );
    
    return offscreenCanvas;
} 