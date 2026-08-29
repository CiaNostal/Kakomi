// js/canvasRenderer.js
import { drawBackground } from './backgroundRenderer.js';
import { createAndApplyClippingPath, applyShadow, applyBorder } from './frameRenderer.js'; // createSuperellipsePath, roundedRect はframeRenderer内部で使用
import { drawText } from './textRenderer.js'; // テキスト描画もインポートしておく
import { drawImageWithPrecision } from './utils/canvasUtils.js';
import * as interactionRegistry from './interaction/interactionRegistry.js';
import { getSelectedId } from './interaction/selectionStore.js';
import { getActiveGuides } from './interaction/guideStore.js';
import { setTextHandles, clearTextHandles } from './interaction/textHandleStore.js';
import { setCropHandles, clearCropHandles } from './interaction/photoCropStore.js';
import * as photoEditModeStore from './interaction/photoEditModeStore.js';
import { resolveCropRect, clampRectToRotatedImage } from './utils/cropRect.js';
import { rotatePoint } from './utils/geometry.js';

/**
 * A-3: 実際に切り出す（画面に見える）クロップ矩形。cropSettings.rect は水平出しで縮小しない
 * “望むサイズ”を保持するので、rotation が付いていたら傾いた元画像に収まるよう中心固定縮小する。
 * layoutCalculator の cropRect 決定と同じロジック。
 */
function effectiveCropRect(currentState) {
    const raw = resolveCropRect(currentState.cropSettings, currentState.originalWidth, currentState.originalHeight);
    const rot = (currentState.cropSettings && currentState.cropSettings.rotation) || 0;
    return rot
        ? clampRectToRotatedImage(raw, rot, currentState.originalWidth, currentState.originalHeight)
        : raw;
}

/**
 * A-3: クロップ窓（photoX/Y/W/H）の中に元画像を描く。
 * cropRotationDeg が 0 なら従来どおり drawImageWithPrecision（source 矩形 → dest 矩形）。
 * 非0なら「窓にクリップ → 窓中心座標系へ → 画像中心まわりに cropRotation 回転 → 元画像全体を配置」で塗る。
 * 空いた角が出ないことは clampRectToRotatedImage（rect が画像内に収まる保証）が担保する。
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {{sourceX,sourceY,sourceWidth,sourceHeight}} src - 回転0時に使う source 矩形（px）
 * @param {number} photoX @param {number} photoY @param {number} photoW @param {number} photoH - クロップ窓（canvas px）
 * @param {number} cropRotationDeg
 * @param {{x,y,w,h}} rect - straightened space の割合クロップ矩形
 * @param {number} imgW @param {number} imgH - 元画像の実寸(px)
 */
function drawCroppedPhoto(ctx, img, src, photoX, photoY, photoW, photoH, cropRotationDeg, rect, imgW, imgH) {
    if (!cropRotationDeg || !(imgW > 0) || !(imgH > 0)) {
        drawImageWithPrecision(ctx, img,
            src.sourceX, src.sourceY, src.sourceWidth, src.sourceHeight,
            photoX, photoY, photoW, photoH);
        return;
    }
    const winPxW = rect.w * imgW;
    const winPxH = rect.h * imgH;
    if (winPxW <= 0 || winPxH <= 0) return;
    const sx = photoW / winPxW;
    const sy = photoH / winPxH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(photoX, photoY, photoW, photoH);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.translate(photoX, photoY);
    ctx.scale(sx, sy);
    ctx.translate(-rect.x * imgW, -rect.y * imgH);
    ctx.translate(imgW / 2, imgH / 2);
    ctx.rotate(cropRotationDeg * Math.PI / 180);
    ctx.translate(-imgW / 2, -imgH / 2);
    ctx.drawImage(img, 0, 0, imgW, imgH);
    ctx.restore();
}

const HANDLE_SIZE = 8; // 拡大ハンドル（四角）の一辺の長さ(px)
const ROTATE_HANDLE_RADIUS = 4; // 回転ハンドル（丸）の半径(px)
const ROTATE_HANDLE_OFFSET = 22; // 回転ハンドルをボックス上端からどれだけ離すか(px)
const CROP_HANDLE_SIZE = 10; // select モードの写真四隅 ■ ハンドルの一辺の長さ(px)
const CROP_L_HANDLE_LEN = 18; // crop モードの L 字ハンドルの腕の長さ(px)
const CROP_L_HANDLE_THICK = 3; // crop モードの L 字ハンドルの線の太さ(px)

// コンテナサイズをキャッシュして、canvasサイズ変更によるレイアウト再計算の影響を防ぐ
let cachedContainerSize = null;

// ウィンドウリサイズ時にキャッシュをクリア
window.addEventListener('resize', () => {
    cachedContainerSize = null;
});

/**
 * プレビューコンテナサイズのキャッシュを破棄する。
 * ウィンドウリサイズ以外の理由でキャンバス領域の寸法が変わったとき（フェーズ4: 設定パネルの
 * 開閉でキャンバスが伸縮する）に、main.js から呼んで次の drawPreview で寸法を取り直させる。
 */
export function clearContainerSizeCache() {
    cachedContainerSize = null;
}

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
 * frozenFrame（crop モード開始時のスナップショット）から、
 * 「元画像全体」と「現在のクロップ矩形」のプレビュー px 上の矩形を求める。
 *
 * Kakomi では出力枠＝写真＋余白、余白は写真短辺に対する％のため、クロップ矩形を変えても
 * 画面上の写真ボックスの大きさはほぼ変わらない（photoEditModeStore の説明参照）。そこで
 * crop モード中は通常のレイアウト結果を使わず、開始時に固定した photoBox0 / rect0 を基準に、
 * 「rect0 が photoBox0 に載る」よう元画像全体の矩形 whole を逆算する。現在のクロップ矩形は
 * whole 上の割合として配置するので、ドラッグに応じて画面上でも素直に伸縮・移動する。
 *
 * @param {{photoBox0:{x,y,width,height}, rect0:{x,y,w,h}}} frozenFrame
 * @param {{x:number,y:number,w:number,h:number}} liveRect - 現在の cropSettings.rect
 * @returns {{whole:{x,y,width,height}, cropScreen:{x,y,width,height}}}
 */
function cropModeGeometry(frozenFrame, liveRect) {
    const { photoBox0, rect0 } = frozenFrame;
    const wholeWidth = photoBox0.width / Math.max(1e-4, rect0.w);
    const wholeHeight = photoBox0.height / Math.max(1e-4, rect0.h);
    const whole = {
        x: photoBox0.x - rect0.x * wholeWidth,
        y: photoBox0.y - rect0.y * wholeHeight,
        width: wholeWidth,
        height: wholeHeight
    };
    const cropScreen = {
        x: whole.x + liveRect.x * wholeWidth,
        y: whole.y + liveRect.y * wholeHeight,
        width: liveRect.w * wholeWidth,
        height: liveRect.h * wholeHeight
    };
    return { whole, cropScreen };
}

/**
 * crop モードのオーバーレイ（PowerPoint 風トリミング）。
 * 元画像全体を whole の位置・サイズで敷き、全面を暗くマスクした上で、
 * 現在のクロップ矩形 cropScreen の内側だけを明るく再描画する。四隅には L 字ハンドルを描き、
 * その座標を photoCropStore に記録する（canvasInteraction.js が当たり判定に読む）。
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img - 元画像
 * @param {Object} currentState
 * @param {{scale:number, photoBox0:{x,y,width,height}, rect0:{x,y,w,h}}} frozenFrame
 */
function drawCropModeOverlay(ctx, img, currentState, frozenFrame) {
    // A-3: 見えている（傾いた画像に収まる）矩形。回転を戻せば元サイズに復帰する。
    const liveRect = effectiveCropRect(currentState);
    const { whole, cropScreen } = cropModeGeometry(frozenFrame, liveRect);
    if (whole.width <= 0 || whole.height <= 0) return;

    const imgW = currentState.originalWidth;
    const imgH = currentState.originalHeight;
    // A-3: 水平出し角度。whole は「straightened space の画像矩形を画面へ写したもの」なので、
    // 実際の画像はその中心まわりに cropRotation だけ傾いて見える。
    const cropRot = currentState.cropSettings.rotation || 0;
    const wcx = whole.x + whole.width / 2;
    const wcy = whole.y + whole.height / 2;
    const drawWholeImage = () => {
        if (cropRot) {
            ctx.save();
            ctx.translate(wcx, wcy);
            ctx.rotate(cropRot * Math.PI / 180);
            ctx.translate(-wcx, -wcy);
            ctx.drawImage(img, 0, 0, imgW, imgH, whole.x, whole.y, whole.width, whole.height);
            ctx.restore();
        } else {
            drawImageWithPrecision(ctx, img, 0, 0, imgW, imgH, whole.x, whole.y, whole.width, whole.height);
        }
    };

    ctx.save();

    // 1. 元画像全体を whole に敷く（傾けて）
    drawWholeImage();

    // 2. 全面を暗くマスク（回転で whole の外へはみ出す分も覆えるようキャンバス全面）
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 3. クロップ矩形の内側だけ、マスクなしで再描画
    ctx.beginPath();
    ctx.rect(cropScreen.x, cropScreen.y, cropScreen.width, cropScreen.height);
    ctx.clip();
    drawWholeImage();
    ctx.restore();

    // 3.5 三分割グリッド（rule of thirds）。クロップ窓の内側だけに構図補助線を引く。
    //     枠線と同じく黒→白の順で重ね、明暗どちらの写真の上でも見えるようにする。
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropScreen.x, cropScreen.y, cropScreen.width, cropScreen.height);
    ctx.clip();
    ctx.setLineDash([]);
    const thirdsPath = () => {
        ctx.beginPath();
        for (let i = 1; i <= 2; i++) {
            const gx = cropScreen.x + (cropScreen.width * i) / 3;
            const gy = cropScreen.y + (cropScreen.height * i) / 3;
            ctx.moveTo(gx, cropScreen.y);
            ctx.lineTo(gx, cropScreen.y + cropScreen.height);
            ctx.moveTo(cropScreen.x, gy);
            ctx.lineTo(cropScreen.x + cropScreen.width, gy);
        }
    };
    ctx.strokeStyle = 'rgba(0,0,0,0.30)';
    ctx.lineWidth = 2;
    thirdsPath();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1;
    thirdsPath();
    ctx.stroke();
    ctx.restore();

    // 4. クロップ矩形の枠（黒フチの上に白。明暗どちらの背景でも見えるように）
    ctx.save();
    ctx.setLineDash([]);
    ctx.lineJoin = 'miter';
    const rx = cropScreen.x + 0.5, ry = cropScreen.y + 0.5;
    const rw = Math.max(0, cropScreen.width - 1), rh = Math.max(0, cropScreen.height - 1);
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.25;
    ctx.strokeRect(rx, ry, rw, rh);

    // 5. 四隅の L 字ハンドル（内向き）。座標は photoCropStore に記録する。
    const corners = {
        tl: { x: cropScreen.x, y: cropScreen.y },
        tr: { x: cropScreen.x + cropScreen.width, y: cropScreen.y },
        bl: { x: cropScreen.x, y: cropScreen.y + cropScreen.height },
        br: { x: cropScreen.x + cropScreen.width, y: cropScreen.y + cropScreen.height }
    };
    setCropHandles({
        corners,
        center: { x: cropScreen.x + cropScreen.width / 2, y: cropScreen.y + cropScreen.height / 2 },
        cropScreen,
        whole
    });

    // 黒の太線を敷いてから白の細線を重ねることで「白塗り・黒フチ」相当の高コントラストにする
    const L = CROP_L_HANDLE_LEN;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'transparent';
    const drawLPath = (cx, cy, sx, sy) => {
        ctx.beginPath();
        ctx.moveTo(cx + sx * L, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * L);
    };
    const drawLPair = (cx, cy, sx, sy) => {
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineWidth = CROP_L_HANDLE_THICK + 3;
        drawLPath(cx, cy, sx, sy); ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = CROP_L_HANDLE_THICK;
        drawLPath(cx, cy, sx, sy); ctx.stroke();
    };
    drawLPair(corners.tl.x, corners.tl.y, 1, 1);
    drawLPair(corners.tr.x, corners.tr.y, -1, 1);
    drawLPair(corners.bl.x, corners.bl.y, 1, -1);
    drawLPair(corners.br.x, corners.br.y, -1, -1);
    ctx.restore();
}

/**
 * select モードで、選択中の写真の四隅に ■ リサイズハンドル、上端中央に回転ハンドル（丸）を描く。
 * ■ のドラッグは baseMarginPercent（余白＝枠に対する写真の見かけの大きさ）、
 * 丸のドラッグは photoViewParams.rotation（A-4）に対応する。
 * 座標（回転適用後の画面 px）は photoCropStore に記録し、canvasInteraction.js が当たり判定に読む。
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number,width:number,height:number}} box - 写真のバウンディングボックス（回転前、プレビューpx）
 * @param {number} [rotationDeg=0] - 写真の回転角（度）。■・丸・接続線ともこの角度で回して描く
 */
function drawPhotoResizeHandles(ctx, box, rotationDeg = 0) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const cornersLocal = {
        tl: { x: box.x, y: box.y },
        tr: { x: box.x + box.width, y: box.y },
        bl: { x: box.x, y: box.y + box.height },
        br: { x: box.x + box.width, y: box.y + box.height }
    };
    const rotateLocal = { x: cx, y: box.y - ROTATE_HANDLE_OFFSET };
    // 当たり判定用は回転適用後の画面座標で記録する。
    const corners = {};
    for (const k of ['tl', 'tr', 'bl', 'br']) {
        corners[k] = rotatePoint(cornersLocal[k].x, cornersLocal[k].y, cx, cy, rotationDeg);
    }
    const rotateScreen = rotatePoint(rotateLocal.x, rotateLocal.y, cx, cy, rotationDeg);
    setCropHandles({ corners, center: { x: cx, y: cy }, rotate: rotateScreen });

    ctx.save();
    if (rotationDeg) {
        ctx.translate(cx, cy);
        ctx.rotate(rotationDeg * Math.PI / 180);
        ctx.translate(-cx, -cy);
    }
    ctx.setLineDash([]);

    // 回転ハンドルへの接続線
    ctx.strokeStyle = '#1877f2';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, box.y);
    ctx.lineTo(rotateLocal.x, rotateLocal.y);
    ctx.stroke();

    // 四隅の ■（白塗り・黒フチ。明暗どちらの背景でも見えるように）
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 2;
    for (const c of Object.values(cornersLocal)) {
        const hx = c.x - CROP_HANDLE_SIZE / 2, hy = c.y - CROP_HANDLE_SIZE / 2;
        ctx.fillRect(hx, hy, CROP_HANDLE_SIZE, CROP_HANDLE_SIZE);
        ctx.strokeRect(hx, hy, CROP_HANDLE_SIZE, CROP_HANDLE_SIZE);
    }

    // 回転ハンドル（丸）
    ctx.strokeStyle = '#1877f2';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rotateLocal.x, rotateLocal.y, ROTATE_HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

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
    // B-6: 「別画像」背景も、画像が選択されていればドラッグで位置調整できる（backgroundAdapter を共有）。
    const bgIsDraggable = currentState.backgroundType === 'imageBlur'
        || (currentState.backgroundType === 'bgImage' && !!currentState.bgImage);
    if (bgIsDraggable) {
        interactionRegistry.register({ id: 'background', type: 'background', x: 0, y: 0, width: previewCanvas.width, height: previewCanvas.height });
    }

    // A-4: 写真中心まわりの回転角（度）。crop モード中は回転を一時的に無視する
    // （クロップ編集は回転前の素の写真で行う）。
    const photoRotationDeg = photoEditModeStore.isCropMode() ? 0 : (currentState.photoViewParams.rotation || 0);

    if (img && sourceWidth > 0 && sourceHeight > 0 && photoWidth > 0 && photoHeight > 0) {
        interactionRegistry.register({ id: 'photo', type: 'photo', x: photoX, y: photoY, width: photoWidth, height: photoHeight, rotation: photoRotationDeg });

        // 写真を選択中かつ crop モードのときだけ、PowerPoint 風トリミングのオーバーレイ
        // （元画像全体を暗く敷き、クロップ矩形の内側だけ明るく＋L字ハンドル）に切り替える。
        // フレーム装飾（角丸・影・縁取り）はトリミング編集中は表示しない。
        // select モード（通常）では従来どおり装飾込みで写真を描き、選択中なら四隅に ■ ハンドルを重ねる。
        const photoSelected = getSelectedId() === 'photo';
        const frozenFrame = photoEditModeStore.getFrozenFrame();
        if (photoSelected && photoEditModeStore.isCropMode() && frozenFrame) {
            drawCropModeOverlay(ctx, img, currentState, frozenFrame);
        } else {
            ctx.save(); // 写真とその装飾のためのコンテキスト保存

            // A-4: 写真中心まわりに回転（装飾＝角丸・影・縁取りも一緒に回る）。
            if (photoRotationDeg) {
                const pcx = photoX + photoWidth / 2;
                const pcy = photoY + photoHeight / 2;
                ctx.translate(pcx, pcy);
                ctx.rotate(photoRotationDeg * Math.PI / 180);
                ctx.translate(-pcx, -pcy);
            }

            // 2. ドロップシャドウ描画 (写真本体より先)
            if (currentState.frameSettings.shadowEnabled && currentState.frameSettings.shadowType === 'drop') {
                applyShadow(ctx, currentState.frameSettings.shadowParams, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
            }

            // 3. 写真のクリッピングパス設定と適用 (角丸・超楕円)
            createAndApplyClippingPath(ctx, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight);

            // 4. 写真本体の描画 (クリッピングパスの内側に描画される)。
            //    A-3: cropRotation が非0なら「窓の中で元画像を回して塗る」経路（drawCroppedPhoto）。
            drawCroppedPhoto(ctx, img,
                { sourceX, sourceY, sourceWidth, sourceHeight },
                photoX, photoY, photoWidth, photoHeight,
                currentState.photoDrawConfig.cropRotation || 0,
                effectiveCropRect(currentState),
                currentState.originalWidth, currentState.originalHeight
            );

            // 5. インナーシャドウ描画 (クリッピングされた写真の上に合成)
            if (currentState.frameSettings.shadowEnabled && currentState.frameSettings.shadowType === 'inner') {
                applyShadow(ctx, currentState.frameSettings.shadowParams, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
            }

            // 6. 縁取りの描画 (クリッピングパスに沿って)
            if (currentState.frameSettings.border.enabled) {
                applyBorder(ctx, currentState.frameSettings.border, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
            }

            ctx.restore(); // 写真と装飾のためのコンテキスト復元 (クリッピング・回転の解除)

            // select モードで写真選択中: 四隅に ■ リサイズハンドル＋上に回転ハンドルを重ねる
            if (photoSelected) {
                drawPhotoResizeHandles(ctx, { x: photoX, y: photoY, width: photoWidth, height: photoHeight }, photoRotationDeg);
            }
        }
    }

    // 7. テキスト描画
    const hasAnyText = (currentState.textSettings.layers || []).some(l => l.enabled);
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
        // crop モード中の写真は drawCropModeOverlay が独自の枠・ハンドルを描くため、
        // 通常の点線ハイライト（ライブの写真ボックス基準）は描かない。
        const skipOutline = selectedId === 'photo' && photoEditModeStore.isCropMode();
        if (box && !skipOutline) {
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

        // A-4: 写真中心まわりに回転（装飾も一緒に回る）。layoutCalculator が
        // photoDrawConfig.rotation に角度を入れ、外接矩形＋余白で出力キャンバスを取り直している。
        const finalRotationDeg = currentState.photoDrawConfig.rotation || 0;
        if (finalRotationDeg) {
            const pcx = photoX + photoWidth / 2;
            const pcy = photoY + photoHeight / 2;
            ctx.translate(pcx, pcy);
            ctx.rotate(finalRotationDeg * Math.PI / 180);
            ctx.translate(-pcx, -pcy);
        }

        // 2. ドロップシャドウ描画
        if (currentState.frameSettings.shadowEnabled && currentState.frameSettings.shadowType === 'drop') {
            // applyShadow(ctx, currentState.frameSettings.dropShadow, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
            applyShadow(ctx, currentState.frameSettings.shadowParams, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
        }

        // 3. 写真のクリッピングパス設定と適用
        createAndApplyClippingPath(ctx, currentState.frameSettings, photoX, photoY, photoWidth, photoHeight);

        // 4. 写真本体の描画（A-3: cropRotation 非0なら窓の中で元画像を回して塗る）
        drawCroppedPhoto(ctx, img,
            { sourceX, sourceY, sourceWidth, sourceHeight },
            photoX, photoY, photoWidth, photoHeight,
            currentState.photoDrawConfig.cropRotation || 0,
            effectiveCropRect(currentState),
            currentState.originalWidth, currentState.originalHeight
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
    const enabledTextLayerCount = (currentState.textSettings.layers || []).filter(l => l.enabled).length;
    console.log("[CanvasRenderer] Attempting to draw text. enabled layers:", enabledTextLayerCount, "basePhotoShortSideForTextPx:", photoShortSidePx);
    const hasAnyTextFinal = enabledTextLayerCount > 0;
    if (hasAnyTextFinal) {
        // Google Fonts のロードは別途考慮
        // 出力解像度における写真の実際の短辺を渡す（renderFinalでは当たり判定は不要なので戻り値は使わない）
        await drawText(ctx, currentState, outputWidth, outputHeight, photoShortSidePx); // await追加
    }

    return finalCanvas;
}