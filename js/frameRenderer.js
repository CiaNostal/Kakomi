// js/frameRenderer.js


/**
 * 超楕円のパスを生成する (第一象限を計算し、対称性を利用)
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {number} x - 矩形の左上X座標 (写真の描画位置X)
 * @param {number} y - 矩形の左上Y座標 (写真の描画位置Y)
 * @param {number} width - 矩形の幅 (写真の幅)
 * @param {number} height - 矩形の高さ (写真の高さ)
 * @param {number} nParam - 超楕円の次数 (UIから渡される値、3-20の整数を想定)
 */
function createSuperellipsePath(ctx, x, y, width, height, nParam) {
    const a = width / 2;  // 水平方向の半径
    const b = height / 2; // 垂直方向の半径
    if (a <= 0 || b <= 0) return; // 幅または高さが0以下の場合は描画しない

    const centerX = x + a;
    const centerY = y + b;

    // n の値を安全な範囲に丸める・制限する (整数化も)
    // UI側で3-20に制限されている想定だが、念のためここでも。
    // n=2で楕円、nが1に近いと星形に、大きいと四角に近づく。
    // 仕様書ではn=3から20の整数。
    const n = Math.max(2, Math.min(40, Math.round(nParam))); // n=2も許容して楕円も描けるようにし、上限を少し余裕を持たせる(UI側で3-20を制御)

    const points = [];
    // 媒介変数表示: x(t) = a * sgn(cos(t)) * |cos(t)|^(2/n), y(t) = b * sgn(sin(t)) * |sin(t)|^(2/n)
    // 0からPI/2 (第一象限) の点を計算し、対称性を利用する。
    // 点の数が多いほど滑らかになる。90は1度刻み。
    const numPointsPerQuadrant = 90; // この値を調整して滑らかさを変更可能

    for (let i = 0; i <= numPointsPerQuadrant; i++) {
        const t = (Math.PI / 2) * (i / numPointsPerQuadrant);
        const cos_t = Math.cos(t);
        const sin_t = Math.sin(t);

        // (cos_t)^(2/n) の計算。cos_tが0の場合、2/n < 1 だと Infinity になるのを避ける。
        // n >= 2 のため 2/n <= 1。
        let termX, termY;

        if (cos_t === 0) {
            termX = 0;
        } else {
            termX = Math.sign(cos_t) * Math.pow(Math.abs(cos_t), 2 / n);
        }

        if (sin_t === 0) {
            termY = 0;
        } else {
            termY = Math.sign(sin_t) * Math.pow(Math.abs(sin_t), 2 / n);
        }

        points.push({
            px: centerX + a * termX,
            py: centerY - b * termY  // CanvasのY軸は下向きなので、中心からマイナス方向にプロット
        });
    }

    ctx.beginPath();

    // 第一象限 (0度 -> 90度)
    ctx.moveTo(points[0].px, points[0].py);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].px, points[i].py);
    }

    // 第二象限 (90度 -> 180度) - Y軸対称
    for (let i = points.length - 1; i >= 0; i--) {
        ctx.lineTo(centerX - (points[i].px - centerX), points[i].py);
    }

    // 第三象限 (180度 -> 270度) - 原点対称
    // (第二象限の終点から連続して描画)
    for (let i = 1; i < points.length; i++) { // points[0]はX軸上なので重複を避ける
        ctx.lineTo(centerX - (points[i].px - centerX), centerY + (centerY - points[i].py));
    }

    // 第四象限 (270度 -> 360度) - X軸対称
    // (第三象限の終点から連続して描画)
    for (let i = points.length - 1; i >= 0; i--) {
        ctx.lineTo(points[i].px, centerY + (centerY - points[i].py));
    }

    ctx.closePath();
}

/**
 * 写真に対してフレーム加工の主要なパス設定とクリッピングを行う
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} frameSettings - フレーム設定 (currentState.frameSettings)
 * @param {number} photoX - 写真の左上X座標
 * @param {number} photoY - 写真の左上Y座標
 * @param {number} photoWidth - 写真の幅
 * @param {number} photoHeight - 写真の高さ
 */
function createAndApplyClippingPath(ctx, frameSettings, photoX, photoY, photoWidth, photoHeight) {
    if (photoWidth <= 0 || photoHeight <= 0) return; // 幅や高さが0以下の場合は何もしない

    ctx.beginPath(); // パスを開始 (重要：毎回新しいパスにする)
    if (frameSettings.cornerStyle === 'superellipse') {
        createSuperellipsePath(ctx, photoX, photoY, photoWidth, photoHeight, frameSettings.superellipseN);
        ctx.clip();
    } else if (frameSettings.cornerStyle === 'rounded' && frameSettings.cornerRadiusPercent > 0) {
        const photoShortSidePx = Math.min(photoWidth, photoHeight);
        const radius = (frameSettings.cornerRadiusPercent / 100) * photoShortSidePx;
        roundedRect(ctx, photoX, photoY, photoWidth, photoHeight, radius);
    }
    else {
        // 'none' の場合はクリッピングしないので、単純な矩形パスにするか、何もしない
        // 何もしなければ、Canvas全体がクリッピング領域のまま（または直前のクリップが影響）
        // 明示的に矩形パスでリセットするか、canvasRenderer側でクリップしない分岐を設ける
        // ここではクリップしない場合はパスを作らないでおく
        return; // パスを作らず、クリップもしない
    }
    ctx.clip();
}

/**
 * HEXカラーコードとアルファ値からRGBAカラー文字列を生成する
 * @param {string} hex - HEXカラーコード (例: #RRGGBB)
 * @param {number} alpha - アルファ値 (0.0 - 1.0)
 * @returns {string} RGBAカラー文字列 (例: rgba(r,g,b,a))
 */
function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`; // フォールバック
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) { // #RGB
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) { // #RRGGBB
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${alpha})`;
}


function applyShadow(ctx, shadowSettings, frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx) {
    // shadowEnabled のチェックは呼び出し元(canvasRenderer.js)で行われている。
    // shadowSettings は共通化された frameSettings.shadowParams が渡ってくる。
    if (!shadowSettings || typeof shadowSettings.offsetX !== 'number') {
        console.warn("applyShadow: Invalid or missing shadowParams.", shadowSettings);
        return;
    }

    if (frameSettings.shadowType === 'drop') {
        console.log("Applying Drop Shadow (Common Params) with settings:", shadowSettings);
        const userShadowOffsetX = (shadowSettings.offsetX / 100) * photoShortSidePx; // 共通パラメータから取得
        const userShadowOffsetY = (shadowSettings.offsetY / 100) * photoShortSidePx; // 共通パラメータから取得
        const blurRadius = Math.max(0, (shadowSettings.blur / 100) * photoShortSidePx);
        const spreadRadius = (shadowSettings.effectRangePercent / 100) * photoShortSidePx; // ★共通の effectRangePercent を使用
        const baseShadowColor = shadowSettings.color; // HEX形式を想定
        const shadowOpacity = shadowSettings.opacity;
        const finalShadowColor = hexToRgba(baseShadowColor, shadowOpacity);

        if (photoWidth <= 0 || photoHeight <= 0) return;

        const blurSafetyMargin = blurRadius * 2;
        const offscreenMargin = Math.max(0, Math.abs(userShadowOffsetX)) +
            Math.max(0, Math.abs(userShadowOffsetY)) +
            blurSafetyMargin +
            Math.max(0, spreadRadius) + // spreadRadiusは常に正なのでMath.abs不要
            10;

        const offscreenWidth = Math.round(photoWidth + offscreenMargin * 2);
        const offscreenHeight = Math.round(photoHeight + offscreenMargin * 2);

        // オフスクリーンCanvas上で写真形状を描画する際の中心オフセット
        const shapeDrawXonOffscreen = offscreenMargin;
        const shapeDrawYonOffscreen = offscreenMargin;

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = offscreenWidth;
        offscreenCanvas.height = offscreenHeight;
        const offCtx = offscreenCanvas.getContext('2d');
        if (!offCtx) {
            console.error("Failed to get offscreen context for drop shadow");
            return;
        }

        // 1. オフスクリーンに「スプレッドを適用した写真の形状」を、最終的な影の色で不透明に描画する
        //    これが影のベース形状となる。
        offCtx.beginPath();
        const spreadPhotoWidth = photoWidth + spreadRadius * 2;
        const spreadPhotoHeight = photoHeight + spreadRadius * 2;
        // スプレッド適用後の形状をオフスクリーンCanvasの中央に配置するための開始座標
        const spreadPhotoXonOffscreen = shapeDrawXonOffscreen - spreadRadius;
        const spreadPhotoYonOffscreen = shapeDrawYonOffscreen - spreadRadius;

        if (spreadPhotoWidth > 0 && spreadPhotoHeight > 0) {
            if (frameSettings.cornerStyle === 'superellipse') {
                createSuperellipsePath(offCtx, spreadPhotoXonOffscreen, spreadPhotoYonOffscreen, spreadPhotoWidth, spreadPhotoHeight, frameSettings.superellipseN);
            } else if (frameSettings.cornerStyle === 'rounded' && frameSettings.cornerRadiusPercent > 0) {
                let radius = (frameSettings.cornerRadiusPercent / 100) * photoShortSidePx;
                radius = Math.max(0, radius + spreadRadius); // スプレッドに応じて半径も調整
                roundedRect(offCtx, spreadPhotoXonOffscreen, spreadPhotoYonOffscreen, spreadPhotoWidth, spreadPhotoHeight, radius);
            } else {
                offCtx.rect(spreadPhotoXonOffscreen, spreadPhotoYonOffscreen, spreadPhotoWidth, spreadPhotoHeight);
            }
            offCtx.fillStyle = finalShadowColor; // ★RGBAカラーで塗りつぶす
            offCtx.fill();
        }

        // 2. オフスクリーンCanvasにぼかしを適用する
        //    一時Canvasを使って、ぼかし後の結果を元のオフスクリーンCanvasに戻す
        if (blurRadius > 0.1) {
            const tempBlurCanvas = document.createElement('canvas');
            tempBlurCanvas.width = offscreenWidth;
            tempBlurCanvas.height = offscreenHeight;
            const tempBlurCtx = tempBlurCanvas.getContext('2d');
            if (tempBlurCtx) {
                tempBlurCtx.drawImage(offscreenCanvas, 0, 0); // 現在の影の形状をコピー
                offCtx.clearRect(0, 0, offscreenWidth, offscreenHeight); // 元をクリア
                offCtx.filter = `blur(${blurRadius}px)`;
                offCtx.drawImage(tempBlurCanvas, 0, 0); // ぼかして描き戻し
                offCtx.filter = 'none';
            }
        }

        // 3. ぼかされた影を、メインCanvasの正しい位置にユーザー指定のオフセットを加えて描画
        //    メインCanvasの写真の左上座標 (photoX, photoY) を基準とし、
        //    オフスクリーンCanvas上での形状の描画開始位置 (shapeDrawXonOffscreen) と
        //    ユーザー指定の影のオフセット (userShadowOffsetX, userShadowOffsetY) を考慮
        const finalDrawX = photoX - shapeDrawXonOffscreen + userShadowOffsetX;
        const finalDrawY = photoY - shapeDrawYonOffscreen + userShadowOffsetY;

        ctx.drawImage(offscreenCanvas, finalDrawX, finalDrawY);

    } else if (frameSettings.shadowType === 'inner') {
        // console.log("Applying Inner Shadow (Common Params) with settings:", shadowSettings);
        // 共通パラメータ shadowParams を使用
        const blurAmountPx = (shadowSettings.blur / 100) * photoShortSidePx;
        const offsetXpx = (shadowSettings.offsetX / 100) * photoShortSidePx;
        const offsetYpx = (shadowSettings.offsetY / 100) * photoShortSidePx;
        const spreadPx = (shadowSettings.effectRangePercent / 100) * photoShortSidePx; // ★共通の effectRangePercent を使用
        const baseShadowColor = shadowSettings.color; // HEX形式を想定
        const shadowOpacity = shadowSettings.opacity;
        const finalShadowColor = hexToRgba(baseShadowColor, shadowOpacity);

        if (photoWidth <= 0 || photoHeight <= 0) return;

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = photoWidth;
        offscreenCanvas.height = photoHeight;
        const offCtx = offscreenCanvas.getContext('2d');
        if (!offCtx) {
            console.error("Failed to get offscreen canvas context for inner shadow.");
            return;
        }

        // ステップ2a: オフスクリーン全体を影の色で塗りつぶす
        offCtx.fillStyle = finalShadowColor; // ★RGBAカラーで塗りつぶす
        offCtx.fillRect(0, 0, photoWidth, photoHeight);

        // ステップ2b: オフセットした写真の形状でくり抜く (destination-out)
        offCtx.globalCompositeOperation = 'destination-out';
        offCtx.beginPath();
        // spreadPx が正なら形状を小さく（影が太くなる）、負なら大きく（影が細くなる）してくり抜くイメージ
        // なので、くり抜く形状の寸法は photoWidth - 2 * spreadPx などになる。
        // X, Yの開始位置も spreadPx だけずらす。
        const cutoutX = offsetXpx + spreadPx;
        const cutoutY = offsetYpx + spreadPx;
        const cutoutWidth = photoWidth - 2 * spreadPx;
        const cutoutHeight = photoHeight - 2 * spreadPx;

        if (cutoutWidth > 0 && cutoutHeight > 0) { // サイズが正の場合のみ描画
            if (frameSettings.cornerStyle === 'superellipse') {
                createSuperellipsePath(offCtx, cutoutX, cutoutY, cutoutWidth, cutoutHeight, frameSettings.superellipseN);
            } else if (frameSettings.cornerStyle === 'rounded' && frameSettings.cornerRadiusPercent > 0) {
                // 角丸半径もスプレッドに応じて調整するか、元の写真の角丸を基準にするか検討
                // ここでは、くり抜く形状の短辺に対する角丸とする
                const cutoutShortSide = Math.min(cutoutWidth, cutoutHeight);
                const radius = (frameSettings.cornerRadiusPercent / 100) * cutoutShortSide;
                // ただし、元の写真の見た目の角丸半径は photoShortSidePx を基準にしているので、
                // スプレッドによって形状が小さくなった分、半径も相対的に小さく見えるようにする必要があるかもしれない。
                // 一旦、くり抜く形状の短辺基準で半径を再計算する。
                roundedRect(offCtx, cutoutX, cutoutY, cutoutWidth, cutoutHeight, radius);
            } else {
                offCtx.rect(cutoutX, cutoutY, cutoutWidth, cutoutHeight);
            }
        }
        offCtx.fillStyle = 'black';
        offCtx.fill();

        offCtx.globalCompositeOperation = 'source-over';

        // ステップ2c: ぼかしの適用 (テンポラリCanvasを使用)
        if (blurAmountPx > 0) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = photoWidth;
            tempCanvas.height = photoHeight;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                // 現在のオフスクリーンCanvasの内容(くり抜かれた影の型)をテンポラリにコピー
                tempCtx.drawImage(offscreenCanvas, 0, 0);

                // オフスクリーンCanvasをクリアし、ぼかしフィルタを設定して描き戻す
                offCtx.clearRect(0, 0, photoWidth, photoHeight);
                offCtx.filter = `blur(${blurAmountPx}px)`;
                offCtx.drawImage(tempCanvas, 0, 0);
                offCtx.filter = 'none'; // フィルタをリセット
            } else {
                console.warn("Failed to create temp canvas context for blurring inner shadow.");
            }
        }

        // 合成モードを通常に戻す (メインCanvasへの描画のため)
        // offCtx.globalCompositeOperation = 'source-over'; // オフスクリーンCanvasはこれで完成

        // メインCanvas (ctx) に、生成したインナーシャドウ (offscreenCanvas) を描画
        // この描画は、canvasRenderer.js 側で写真本体が描画された後、
        // かつ写真のクリッピングパスが適用された状態で行われる。
        ctx.drawImage(offscreenCanvas, photoX, photoY);
    }
}

function applyBorder(ctx, borderSettings, frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx) {
    if (!borderSettings.enabled || borderSettings.width <= 0) return;
    console.log("applyBorder called (implementation pending full review for superellipse)", borderSettings);
    // ここに縁取り描画ロジック（frameSettings.cornerStyleに応じてパスを生成しstroke）
    // 既存のロジックをベースに、パス生成部分を createSuperellipsePath/roundedRect に置き換える
    const borderWidth = (borderSettings.width / 100) * photoShortSidePx;
    if (borderWidth <= 0) return;

    ctx.save();
    ctx.strokeStyle = borderSettings.color;
    ctx.lineWidth = borderWidth;

    if (borderSettings.style === 'dashed') {
        ctx.setLineDash([borderWidth * 2, borderWidth]);
    }

    // パスに沿って線を描画 (中心揃え)
    if (frameSettings.cornerStyle === 'superellipse') {
        createSuperellipsePath(ctx, photoX, photoY, photoWidth, photoHeight, frameSettings.superellipseN);
    } else if (frameSettings.cornerStyle === 'rounded' && frameSettings.cornerRadiusPercent > 0) {
        const radius = (frameSettings.cornerRadiusPercent / 100) * photoShortSidePx;
        roundedRect(ctx, photoX, photoY, photoWidth, photoHeight, radius);
    } else {
        ctx.beginPath();
        ctx.rect(photoX, photoY, photoWidth, photoHeight);
    }
    ctx.stroke();
    ctx.restore();
}

// roundedRect 関数は変更なし
function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, Math.min(width, height) / 2);
    if (r < 0) { // 半径が負の場合は通常の矩形として扱う（またはエラー）
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

export { createAndApplyClippingPath, applyShadow, applyBorder, createSuperellipsePath, roundedRect };
// createSuperellipsePath と roundedRect は createAndApplyClippingPath や applyShadow/Border から内部的に使われるが、
// canvasRenderer から直接パス操作をする可能性も考慮してエクスポートしても良いし、しなくても良い。
// ここでは、主要なエフェクト関数のみをエクスポート対象とし、パス生成は内部利用とするなら、それらを外しても良い。
// 今回はcanvasRenderer.js側のインポートに合わせておく。