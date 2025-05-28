// js/frameRenderer.js


/**
 * 超楕円のパスを生成する (第一象限を計算し、対称性を利用)
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {number} x - 矩形の左上X座標 (写真の描画位置X)
 * @param {number} y - 矩形の左上Y座標 (写真の描画位置Y)
 * @param {number} width - 矩形の幅 (写真の幅)
 * @param {number} height - 矩形の高さ (写真の高さ)
 * @param {number} n - 超楕円の次数 (3-20の整数を想定)
 */
function createSuperellipsePath(ctx, x, y, width, height, n) {
    const a = width / 2;  // 水平方向の半径
    const b = height / 2; // 垂直方向の半径
    const centerX = x + a;
    const centerY = y + b;

    // n の値を安全な範囲に丸める・制限する (整数化もここで)
    const N = Math.max(2, Math.min(40, Math.round(n))); // 2から20の整数に (n=2は楕円)

    const points = [];
    const steps = 90; // 90ステップで第一象限 (1度ごと)。滑らかさが足りなければ増やす (例: 180で0.5度ごと)
    const deltaTheta = Math.PI / 2 / steps;

    for (let i = 0; i <= steps; i++) {
        const theta = i * deltaTheta;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        // 媒介変数表示: x = a * sgn(cos) * |cos|^(2/N), y = b * sgn(sin) * |sin|^(2/N)
        // 第一象限なので cosTheta と sinTheta は非負
        const termX = (cosTheta === 0 && 2 / N < 1) ? 0 : Math.pow(cosTheta, 2 / N); // 0のべき乗エラーを避ける
        const termY = (sinTheta === 0 && 2 / N < 1) ? 0 : Math.pow(sinTheta, 2 / N); // 同上

        points.push({
            x: centerX + a * termX,
            y: centerY - b * termY  // CanvasのY軸は下向きなのでマイナス
        });
    }

    ctx.beginPath();
    if (points.length === 0) return; // 点がなければ何もしない

    ctx.moveTo(points[0].x, points[0].y);

    // 第一象限
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    // 第二象限 (Y軸対称)
    for (let i = points.length - 2; i >= 0; i--) { // 重複点を避けるため points.length - 2 から
        ctx.lineTo(centerX - (points[i].x - centerX), points[i].y);
    }
    // 第三象限 (原点対称)
    for (let i = 1; i < points.length; i++) { // 開始点を重複させないため i = 1 から
        ctx.lineTo(centerX - (points[i].x - centerX), centerY + (centerY - points[i].y));
    }
    // 第四象限 (X軸対称)
    for (let i = points.length - 2; i >= 0; i--) { // points.length - 2 から
        ctx.lineTo(points[i].x, centerY + (centerY - points[i].y));
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

    if (frameSettings.cornerStyle === 'superellipse') {
        createSuperellipsePath(ctx, photoX, photoY, photoWidth, photoHeight, frameSettings.superellipseN);
        ctx.clip();
    } else if (frameSettings.cornerStyle === 'rounded' && frameSettings.cornerRadiusPercent > 0) {
        const photoShortSidePx = Math.min(photoWidth, photoHeight);
        const radius = (frameSettings.cornerRadiusPercent / 100) * photoShortSidePx;
        roundedRect(ctx, photoX, photoY, photoWidth, photoHeight, radius);
        ctx.clip();
    }
    // 'none' の場合はクリッピングパスを適用しない (つまり矩形のまま)
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
