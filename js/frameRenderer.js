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
 * 写真に対してフレーム加工を適用する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} currentState - 現在の編集状態
 * @param {number} photoX - 写真の左上X座標
 * @param {number} photoY - 写真の左上Y座標
 * @param {number} photoWidth - 写真の幅
 * @param {number} photoHeight - 写真の高さ
 */
function applyFrameEffects(ctx, currentState, photoX, photoY, photoWidth, photoHeight) {
    const frameSettings = currentState.frameSettings;
    const photoShortSidePx = Math.min(photoWidth, photoHeight);

    if (frameSettings.shadow.enabled) {
        // CHANGED: frameSettings を applyShadow に渡す
        applyShadow(ctx, frameSettings.shadow, frameSettings.cornerRadius, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
    }

    if (frameSettings.cornerRadius > 0) {
        const radius = (frameSettings.cornerRadius / 100) * photoShortSidePx;
        roundedRect(ctx, photoX, photoY, photoWidth, photoHeight, radius);
        ctx.clip(); // 写真本体の描画のためにクリッピングパスを設定
    }

    if (frameSettings.border.enabled && frameSettings.border.width > 0) {
        // CHANGED: frameSettings を applyBorder に渡す
        applyBorder(ctx, frameSettings.border, frameSettings.cornerRadius, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
    }
}

// applyShadow と applyBorder の仮実装（後で詳細化）
function applyShadow(ctx, shadowSettings, frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx) {
    // 呼び出し元(canvasRenderer.js)で frameSettings.shadowEnabled をチェックしているので、
    // ここでは shadowSettings (dropShadow または innerShadow オブジェクト) が渡された時点で描画すると判断。
    // shadowSettings オブジェクト自体に enabled プロパティはない。
    console.log("applyShadow called with settings:", shadowSettings); // ログの位置をガード節の前に変更、またはガード節を削除
    // ここに影描画ロジック（frameSettings.cornerStyleに応じてパスを生成し影付け）
    // 既存のロジックをベースに、パス生成部分を createSuperellipsePath/roundedRect に置き換える
    const offsetX = (shadowSettings.offsetX / 100) * photoShortSidePx;
    const offsetY = (shadowSettings.offsetY / 100) * photoShortSidePx;
    const blurRadius = (shadowSettings.blur / 100) * photoShortSidePx;
    const spreadRadius = (shadowSettings.spread / 100) * photoShortSidePx;

    ctx.save();
    ctx.shadowColor = shadowSettings.color;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;
    ctx.shadowBlur = blurRadius;

    const shadowX = photoX - spreadRadius;
    const shadowY = photoY - spreadRadius;
    const shadowWidth = photoWidth + 2 * spreadRadius;
    const shadowHeight = photoHeight + 2 * spreadRadius;
    ctx.fillStyle = shadowSettings.color;

    if (frameSettings.cornerStyle === 'superellipse') {
        createSuperellipsePath(ctx, shadowX, shadowY, shadowWidth, shadowHeight, frameSettings.superellipseN);
    } else if (frameSettings.cornerStyle === 'rounded' && frameSettings.cornerRadiusPercent > 0) {
        const radius = (frameSettings.cornerRadiusPercent / 100) * Math.min(shadowWidth, shadowHeight);
        roundedRect(ctx, shadowX, shadowY, shadowWidth, shadowHeight, radius);
    } else {
        ctx.beginPath();
        ctx.rect(shadowX, shadowY, shadowWidth, shadowHeight);
    }
    ctx.fill();
    ctx.restore();
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

// export { applyFrameEffects };
export { createAndApplyClippingPath, createSuperellipsePath, roundedRect, applyShadow, applyBorder }; // applyShadow, applyBorderもエクスポート対象に
