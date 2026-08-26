// js/canvasRenderer.js
import { drawBackground } from './backgroundRenderer.js';
import { createAndApplyClippingPath, applyShadow, applyBorder } from './frameRenderer.js'; // createSuperellipsePath, roundedRect はframeRenderer内部で使用
import { drawText } from './textRenderer.js'; // テキスト描画もインポートしておく
import { drawImageWithPrecision } from './utils/canvasUtils.js';
import { calculateLayout } from './layoutCalculator.js';
import * as interactionRegistry from './interaction/interactionRegistry.js';
import { getSelectedId } from './interaction/selectionStore.js';
import { getActiveGuides } from './interaction/guideStore.js';
import { setTextHandles, clearTextHandles } from './interaction/textHandleStore.js';
import { setCropHandles, clearCropHandles } from './interaction/photoCropStore.js';
import { rotatePoint } from './utils/geometry.js';

const HANDLE_SIZE = 8; // 拡大ハンドル（四角）の一辺の長さ(px)
const ROTATE_HANDLE_RADIUS = 4; // 回転ハンドル（丸）の半径(px)
const ROTATE_HANDLE_OFFSET = 22; // 回転ハンドルをボックス上端からどれだけ離すか(px)
const CROP_HANDLE_SIZE = 10; // クロップ矩形の四隅ハンドル（四角）の一辺の長さ(px)

// コンテナサイズをキャッシュして、canvasサイズ変更によるレイアウト再計算の影響を防ぐ
let cachedContainerSize = null;

// ウィンドウリサイズ時にキャッシュをクリア
window.addEventListener('resize', () => {
    cachedContainerSize = null;
});

// 直近のdrawPreview呼び出し時点でのプレビュー⇔出力解像度の変換情報。
// canvasInteraction.jsがドラッグ量(プレビューpx)を出力解像度の単位系に変換するために参照する。
let lastPreviewContext = { scale: 1, photoShortSidePx: 0 };
export function getLastPreviewContext() {
    return lastPreviewContext;
}

function drawSelectionOutline(ctx, box) {
    const rotation = box.rotation || 0;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    ctx.save();
    if (rotation) {
        ctx.translate(cx, cy);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.translate(-cx, -cy);
    }
    ctx.strokeStyle = '#1877f2';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(box.x + 0.5, box.y + 0.5, Math.max(0, box.width - 1), Math.max(0, box.height - 1));
    ctx.restore();
}

/**
 * 選択中の自由テキストレイヤーに「拡大ハンドル」（右下角、四角）と
 * 「回転ハンドル」（上端中央から少し離れた丸）を描画し、その画面上の座標
 * （回転適用後）をtextHandleStoreに記録する（canvasInteraction.jsが当たり判定に使う）。
 */
function drawTextHandles(ctx, box) {
    const rotation = box.rotation || 0;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    const resizeLocal = { x: box.x + box.width, y: box.y + box.height };
    const rotateLocal = { x: cx, y: box.y - ROTATE_HANDLE_OFFSET };

    setTextHandles({
        id: box.id,
        center: { x: cx, y: cy },
        resize: rotatePoint(resizeLocal.x, resizeLocal.y, cx, cy, rotation),
        rotate: rotatePoint(rotateLocal.x, rotateLocal.y, cx, cy, rotation)
    });

    ctx.save();
    if (rotation) {
        ctx.translate(cx, cy);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.translate(-cx, -cy);
    }

    // 回転ハンドルへの接続線
    ctx.strokeStyle = '#1877f2';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx, box.y);
    ctx.lineTo(rotateLocal.x, rotateLocal.y);
    ctx.stroke();

    // 拡大ハンドル（四角）
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1877f2';
    ctx.lineWidth = 1.5;
    ctx.fillRect(resizeLocal.x - HANDLE_SIZE / 2, resizeLocal.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(resizeLocal.x - HANDLE_SIZE / 2, resizeLocal.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);

    // 回転ハンドル（丸）
    ctx.beginPath();
    ctx.arc(rotateLocal.x, rotateLocal.y, ROTATE_HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

/**
 * 写真選択中に表示する「オンキャンバス直接トリミング」オーバーレイ（Lightroom風）。
 * ズーム1.0時点で見えるはずの範囲（box全体）を元画像で埋め、実際に使われている範囲
 * （クロップ矩形、box内でzoom/offsetX/Yに応じた位置・サイズの矩形）だけ通常表示、
 * それ以外の周辺部分は暗くマスクする。
 *
 * box（写真のバウンディングボックス）のscreen上のサイズ・位置は、baseMarginPercentが
 * 写真短辺に対する比率で定義されているため、cropSettings.zoomの値によらず常に一定になる
 * （zoomは「元画像のどれだけを使うか」だけを変え、写真とその余白の比率自体は変えないため）。
 * そのため、box自体を「ズーム1.0相当の基準枠」としてそのまま使い、内側にzoomに応じた
 * 縮小率のクロップ矩形を描けば、追加のスケール計算なしで一致する。
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img - 元画像
 * @param {Object} currentState
 * @param {{x:number,y:number,width:number,height:number}} box - 写真のバウンディングボックス（プレビューpx）
 */
function drawCropOverlay(ctx, img, currentState, box) {
    const { zoom, offsetX: panX, offsetY: panY } = currentState.cropSettings;
    const invZoom = 1 / Math.max(1, zoom);

    const innerWidth = box.width * invZoom;
    const innerHeight = box.height * invZoom;
    const innerX = box.x + (box.width - innerWidth) * panX;
    const innerY = box.y + (box.height - innerHeight) * panY;

    // box全体を埋める「ズーム1.0相当」の元画像領域（sourceX/Y/Width/Height）を、
    // 既存のlayoutCalculatorのロジックをそのまま再利用して求める（計算式の重複を避けるため）。
    const refLayout = calculateLayout({ ...currentState, cropSettings: { ...currentState.cropSettings, zoom: 1.0 } });
    const { sourceX: refSrcX, sourceY: refSrcY, sourceWidth: refSrcW, sourceHeight: refSrcH } = refLayout.photoDrawConfig;
    if (refSrcW <= 0 || refSrcH <= 0) return;

    ctx.save();

    // box全体に「ズーム1.0相当」の元画像を敷く
    drawImageWithPrecision(ctx, img, refSrcX, refSrcY, refSrcW, refSrcH, box.x, box.y, box.width, box.height);

    // 周辺部分（クロップ矩形の外）を暗くマスク
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(box.x, box.y, box.width, box.height);

    // クロップ矩形の内側だけ、マスクなしで再描画
    ctx.beginPath();
    ctx.rect(innerX, innerY, innerWidth, innerHeight);
    ctx.clip();
    drawImageWithPrecision(ctx, img, refSrcX, refSrcY, refSrcW, refSrcH, box.x, box.y, box.width, box.height);
    ctx.restore();

    // クロップ矩形の枠と四隅ハンドル
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(innerX + 0.5, innerY + 0.5, Math.max(0, innerWidth - 1), Math.max(0, innerHeight - 1));

    const corners = {
        tl: { x: innerX, y: innerY },
        tr: { x: innerX + innerWidth, y: innerY },
        bl: { x: innerX, y: innerY + innerHeight },
        br: { x: innerX + innerWidth, y: innerY + innerHeight }
    };
    setCropHandles({ corners, center: { x: innerX + innerWidth / 2, y: innerY + innerHeight / 2 } });

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1877f2';
    for (const corner of Object.values(corners)) {
        ctx.fillRect(corner.x - CROP_HANDLE_SIZE / 2, corner.y - CROP_HANDLE_SIZE / 2, CROP_HANDLE_SIZE, CROP_HANDLE_SIZE);
        ctx.strokeRect(corner.x - CROP_HANDLE_SIZE / 2, corner.y - CROP_HANDLE_SIZE / 2, CROP_HANDLE_SIZE, CROP_HANDLE_SIZE);
    }
    ctx.restore();
}

export async function drawPreview(currentState, previewCanvas, previewCtx) { // async追加
    interactionRegistry.clear();
    clearTextHandles();
    clearCropHandles();

    if (!currentState.image) {
        if (previewCtx && previewCanvas) previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        return;
    }
    if (!currentState.outputCanvasConfig || currentState.outputCanvasConfig.width === 0) {
        if (previewCtx && previewCanvas) previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        return;
    }

    const img = currentState.image;
    const { sourceX, sourceY, sourceWidth, sourceHeight,
        destXonOutputCanvas, destYonOutputCanvas,
        destWidth, destHeight } = currentState.photoDrawConfig;
    const outputTotalWidth = currentState.outputCanvasConfig.width;
    const outputTotalHeight = currentState.outputCanvasConfig.height;
    const outputAspectRatio = (outputTotalHeight === 0 || outputTotalWidth === 0) ? 1 : outputTotalWidth / outputTotalHeight;

    const container = previewCanvas.parentElement;
    // コンテナサイズをキャッシュから取得、または初回のみ取得してキャッシュに保存
    // canvasサイズ変更によるレイアウト再計算の影響を防ぐため、キャッシュされたサイズを使用
    if (!cachedContainerSize || cachedContainerSize.container !== container) {
        cachedContainerSize = {
            container: container,
            width: container.clientWidth,
            height: container.clientHeight
        };
    }
    const containerWidth = cachedContainerSize.width;
    const containerHeight = cachedContainerSize.height;

    let canvasRenderWidth, canvasRenderHeight;
    if (containerWidth <= 0 || containerHeight <= 0) { canvasRenderWidth = 300; canvasRenderHeight = 200; }
    else if (containerWidth / containerHeight > outputAspectRatio) { canvasRenderHeight = containerHeight; canvasRenderWidth = containerHeight * outputAspectRatio; }
    else { canvasRenderWidth = containerWidth; canvasRenderHeight = containerWidth / outputAspectRatio; }

    previewCanvas.width = Math.max(1, Math.floor(canvasRenderWidth));
    previewCanvas.height = Math.max(1, Math.floor(canvasRenderHeight));
    const ctx = previewCtx; // 可読性のためエイリアス

    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // 0. プレビュー用のスケーリング計算
    const scale = (outputTotalWidth === 0) ? 0 : previewCanvas.width / outputTotalWidth;
    const photoX = destXonOutputCanvas * scale;
    const photoY = destYonOutputCanvas * scale;
    const photoWidth = destWidth * scale;
    const photoHeight = destHeight * scale;
    const photoShortSidePx = Math.min(photoWidth, photoHeight);
    lastPreviewContext = { scale, photoShortSidePx };

    // 1. 背景描画
    // プレビュー表示における写真の実際の短辺 photoShortSidePx を渡す
    drawBackground(ctx, previewCanvas.width, previewCanvas.height, currentState, photoShortSidePx);
    // 拡大ぼかし背景のみドラッグで位置調整できるようにする（単色背景には位置の概念がないため対象外）。
    // 写真より先に登録することで、写真と重なる領域は写真側が優先してヒットするようにする。
    if (currentState.backgroundType === 'imageBlur') {
        interactionRegistry.register({ id: 'background', type: 'background', x: 0, y: 0, width: previewCanvas.width, height: previewCanvas.height });
    }

    if (img && sourceWidth > 0 && sourceHeight > 0 && photoWidth > 0 && photoHeight > 0) {
        interactionRegistry.register({ id: 'photo', type: 'photo', x: photoX, y: photoY, width: photoWidth, height: photoHeight });

        // 写真選択中は、オンキャンバス直接トリミング用のLightroom風オーバーレイ
        // （クロップ範囲外を暗くマスク＋四隅ハンドル）に切り替える。フレーム装飾
        // （角丸・影・縁取り）はクロップ編集中は表示しない（選択解除で通常表示に戻る）。
        if (getSelectedId() === 'photo') {
            drawCropOverlay(ctx, img, currentState, { x: photoX, y: photoY, width: photoWidth, height: photoHeight });
        } else {
            ctx.save(); // 写真とその装飾のためのコンテキスト保存

            // 2. ドロップシャドウ描画 (写真本体より先)
            if (currentState.frameSettings.shadowEnabled && currentState.frameSettings.shadowType === 'drop') {
                applyShadow(ctx, currentState.frameSettings.shadowParams, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
            }

            // 3. 写真のクリッピングパス設定と適用 (角丸・超楕円)
            createAndApplyClippingPath(ctx, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight);

            // 4. 写真本体の描画 (クリッピングパスの内側に描画される)
            drawImageWithPrecision(ctx, img,
                sourceX, sourceY, sourceWidth, sourceHeight,
                photoX, photoY, photoWidth, photoHeight
            );

            // 5. インナーシャドウ描画 (クリッピングされた写真の上に合成)
            if (currentState.frameSettings.shadowEnabled && currentState.frameSettings.shadowType === 'inner') {
                applyShadow(ctx, currentState.frameSettings.shadowParams, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
            }

            // 6. 縁取りの描画 (クリッピングパスに沿って)
            if (currentState.frameSettings.border.enabled) {
                applyBorder(ctx, currentState.frameSettings.border, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
            }

            ctx.restore(); // 写真と装飾のためのコンテキスト復元 (クリッピング解除)
        }
    }

    // 7. テキスト描画
    const hasAnyText = currentState.textSettings.date.enabled || currentState.textSettings.exif.enabled ||
        (currentState.textSettings.customTexts || []).some(t => t.enabled);
    if (hasAnyText) {
        // Google Fonts のロードは別途考慮
        // プレビュー表示における写真の実際の短辺を渡し、フォント読み込みと描画を待つ
        const registrations = await drawText(ctx, currentState, previewCanvas.width, previewCanvas.height, photoShortSidePx); // await追加
        for (const reg of registrations || []) {
            interactionRegistry.register(reg);
        }
    }

    // 8. 選択中オブジェクトのハイライト枠（プレビューのみ。出力画像には含めない）
    // テキスト系オブジェクト（自由テキスト・撮影日・Exif）はすべて拡大・回転ハンドルも合わせて描画する。
    const selectedId = getSelectedId();
    if (selectedId) {
        const box = interactionRegistry.getById(selectedId);
        if (box) {
            drawSelectionOutline(ctx, box);
            if (box.type === 'text') drawTextHandles(ctx, box);
        }
    }

    // 9. ドラッグ中のスナップガイド線（プレビューのみ。出力画像には含めない）
    drawActiveGuides(ctx, previewCanvas.width, previewCanvas.height);
}

function drawActiveGuides(ctx, canvasWidth, canvasHeight) {
    const guides = getActiveGuides();
    if (!guides || guides.length === 0) return;
    ctx.save();
    ctx.strokeStyle = '#ff4d67';
    ctx.lineWidth = 1;
    for (const guide of guides) {
        ctx.beginPath();
        if (guide.axis === 'x') {
            ctx.moveTo(guide.value + 0.5, 0);
            ctx.lineTo(guide.value + 0.5, canvasHeight);
        } else {
            ctx.moveTo(0, guide.value + 0.5);
            ctx.lineTo(canvasWidth, guide.value + 0.5);
        }
        ctx.stroke();
    }
    ctx.restore();
}

export async function renderFinal(currentState) { // async追加
    if (!currentState.image || !currentState.outputCanvasConfig || currentState.outputCanvasConfig.width <= 0 || currentState.outputCanvasConfig.height <= 0) {
        console.error("Render Final: Invalid state or image not loaded."); return null;
    }
    const img = currentState.image;
    const { sourceX, sourceY, sourceWidth, sourceHeight, destXonOutputCanvas, destYonOutputCanvas, destWidth, destHeight } = currentState.photoDrawConfig;
    const outputWidth = currentState.outputCanvasConfig.width;
    const outputHeight = currentState.outputCanvasConfig.height;

    const photoX = destXonOutputCanvas;
    const photoY = destYonOutputCanvas;
    const photoWidth = destWidth;
    const photoHeight = destHeight;
    const photoShortSidePx = Math.min(photoWidth, photoHeight); // 出力時の写真の短辺

    if (outputWidth <= 0 || outputHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0 || photoWidth <= 0 || photoHeight <= 0) {
        console.error("Render Final: Invalid photo draw dimensions.", currentState.photoDrawConfig); return null;
    }

    const useOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
    const finalCanvas = useOffscreenCanvas ? new OffscreenCanvas(outputWidth, outputHeight) : document.createElement('canvas');
    if (!useOffscreenCanvas) {
        finalCanvas.width = outputWidth;
        finalCanvas.height = outputHeight;
    }
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) {
        console.error("Render Final: Could not get canvas context."); return null;
    }

    // 1. 背景描画
    // renderFinal時は、backgroundRenderer側でphotoDrawConfigから計算するため、第5引数は不要（またはoutput時のphotoShortSidePxを渡しても良い）
    drawBackground(ctx, outputWidth, outputHeight, currentState, photoShortSidePx);

    if (img && sourceWidth > 0 && sourceHeight > 0) {
        ctx.save(); // 写真とその装飾のためのコンテキスト保存

        // 2. ドロップシャドウ描画
        if (currentState.frameSettings.shadowEnabled && currentState.frameSettings.shadowType === 'drop') {
            // applyShadow(ctx, currentState.frameSettings.dropShadow, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
            applyShadow(ctx, currentState.frameSettings.shadowParams, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
        }

        // 3. 写真のクリッピングパス設定と適用
        createAndApplyClippingPath(ctx, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight);

        // 4. 写真本体の描画
        drawImageWithPrecision(ctx, img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            photoX, photoY, photoWidth, photoHeight
        );

        // 5. インナーシャドウ描画
        if (currentState.frameSettings.shadowEnabled && currentState.frameSettings.shadowType === 'inner') {
            applyShadow(ctx, currentState.frameSettings.shadowParams, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
        }

        // 6. 縁取りの描画
        if (currentState.frameSettings.border.enabled) {
            applyBorder(ctx, currentState.frameSettings.border, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
        }

        ctx.restore(); // クリップなどを解除
    }

    // 7. テキスト描画
    console.log("[CanvasRenderer] Attempting to draw text. date.enabled:", currentState.textSettings.date.enabled, "exif.enabled:", currentState.textSettings.exif.enabled, "basePhotoShortSideForTextPx:", photoShortSidePx);
    const hasAnyTextFinal = currentState.textSettings.date.enabled || currentState.textSettings.exif.enabled ||
        (currentState.textSettings.customTexts || []).some(t => t.enabled);
    if (hasAnyTextFinal) {
        // Google Fonts のロードは別途考慮
        // 出力解像度における写真の実際の短辺を渡す（renderFinalでは当たり判定は不要なので戻り値は使わない）
        await drawText(ctx, currentState, outputWidth, outputHeight, photoShortSidePx); // await追加
    }

    return finalCanvas;
}