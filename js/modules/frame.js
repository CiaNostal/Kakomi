/**
 * frame.js
 * フレーム加工処理を担当するモジュール
 */

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
    
    // 影を適用（ボーダーと角丸の前に描画するために一時的なパスを作成）
    if (frameSettings.shadow.enabled) {
        applyShadow(ctx, frameSettings.shadow, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
    }
    
    // クリッピングパスを設定（角丸のため）
    if (frameSettings.cornerRadius > 0) {
        const radius = (frameSettings.cornerRadius / 100) * photoShortSidePx;
        roundedRect(ctx, photoX, photoY, photoWidth, photoHeight, radius);
        ctx.clip();
    }
    
    // ボーダーを適用
    if (frameSettings.border.enabled && frameSettings.border.width > 0) {
        applyBorder(ctx, frameSettings.border, photoX, photoY, photoWidth, photoHeight, photoShortSidePx);
    }
}

/**
 * 写真に影を適用する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} shadowSettings - 影の設定
 * @param {number} x - 写真の左上X座標
 * @param {number} y - 写真の左上Y座標
 * @param {number} width - 写真の幅
 * @param {number} height - 写真の高さ
 * @param {number} shortSide - 写真の短辺
 */
function applyShadow(ctx, shadowSettings, x, y, width, height, shortSide) {
    // 影のパラメータを計算
    const offsetX = (shadowSettings.offsetX / 100) * shortSide;
    const offsetY = (shadowSettings.offsetY / 100) * shortSide;
    const blurRadius = (shadowSettings.blur / 100) * shortSide;
    const spreadRadius = (shadowSettings.spread / 100) * shortSide;
    
    ctx.save();
    
    // 影の設定
    ctx.shadowColor = shadowSettings.color;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;
    ctx.shadowBlur = blurRadius;
    
    // スプレッド半径を適用するための調整された矩形を描画
    const adjustedX = x - spreadRadius;
    const adjustedY = y - spreadRadius;
    const adjustedWidth = width + 2 * spreadRadius;
    const adjustedHeight = height + 2 * spreadRadius;
    
    // 影だけを描画するためのトリック
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    
    // 角丸があれば適用
    if (currentState.frameSettings.cornerRadius > 0) {
        const radius = (currentState.frameSettings.cornerRadius / 100) * shortSide;
        roundedRect(ctx, adjustedX, adjustedY, adjustedWidth, adjustedHeight, radius);
    } else {
        ctx.rect(adjustedX, adjustedY, adjustedWidth, adjustedHeight);
    }
    
    ctx.fill();
    ctx.restore();
}

/**
 * 写真にボーダーを適用する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} borderSettings - ボーダーの設定
 * @param {number} x - 写真の左上X座標
 * @param {number} y - 写真の左上Y座標
 * @param {number} width - 写真の幅
 * @param {number} height - 写真の高さ
 * @param {number} shortSide - 写真の短辺
 */
function applyBorder(ctx, borderSettings, x, y, width, height, shortSide) {
    const borderWidth = (borderSettings.width / 100) * shortSide;
    
    ctx.save();
    ctx.strokeStyle = borderSettings.color;
    ctx.lineWidth = borderWidth;
    
    // 破線の場合は設定
    if (borderSettings.style === 'dashed') {
        ctx.setLineDash([borderWidth * 2, borderWidth]);
    }
    
    // 線を内側に描画するための調整
    const adjustedX = x + borderWidth / 2;
    const adjustedY = y + borderWidth / 2;
    const adjustedWidth = width - borderWidth;
    const adjustedHeight = height - borderWidth;
    
    // 角丸がある場合は適用
    if (currentState.frameSettings.cornerRadius > 0) {
        const radius = (currentState.frameSettings.cornerRadius / 100) * shortSide;
        roundedRect(ctx, adjustedX, adjustedY, adjustedWidth, adjustedHeight, radius);
    } else {
        ctx.rect(adjustedX, adjustedY, adjustedWidth, adjustedHeight);
    }
    
    ctx.stroke();
    ctx.restore();
}

/**
 * 角丸の矩形パスを作成する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {number} x - 左上X座標
 * @param {number} y - 左上Y座標
 * @param {number} width - 幅
 * @param {number} height - 高さ
 * @param {number} radius - 角の半径
 */
function roundedRect(ctx, x, y, width, height, radius) {
    // 角の半径が短辺の半分を超えないように調整
    const r = Math.min(radius, Math.min(width, height) / 2);
    
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

// モジュールとしてエクスポート
export { applyFrameEffects }; 