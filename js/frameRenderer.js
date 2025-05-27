// js/frameRenderer.js

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

/**
 * 写真に影を適用する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} shadowSettings - 影の設定
 * @param {number} cornerRadiusSetting - 角丸の設定値 (%)
 * @param {number} x - 写真の左上X座標
 * @param {number} y - 写真の左上Y座標
 * @param {number} width - 写真の幅
 * @param {number} height - 写真の高さ
 * @param {number} shortSide - 写真の短辺
 */
// CHANGED: cornerRadiusSetting を引数に追加
function applyShadow(ctx, shadowSettings, cornerRadiusSetting, x, y, width, height, shortSide) {
    const offsetX = (shadowSettings.offsetX / 100) * shortSide;
    const offsetY = (shadowSettings.offsetY / 100) * shortSide;
    const blurRadius = (shadowSettings.blur / 100) * shortSide;
    const spreadRadius = (shadowSettings.spread / 100) * shortSide; // スプレッドはCanvas標準のshadowBlurとは別に描画で工夫が必要
    
    ctx.save();
    
    ctx.shadowColor = shadowSettings.color;
    ctx.shadowOffsetX = offsetX;
    ctx.shadowOffsetY = offsetY;
    ctx.shadowBlur = blurRadius;
    
    const adjustedX = x - spreadRadius;
    const adjustedY = y - spreadRadius;
    const adjustedWidth = width + 2 * spreadRadius;
    const adjustedHeight = height + 2 * spreadRadius;
    
    ctx.globalCompositeOperation = 'source-over'; // 影の描画のため
    // 影の色は shadowColor で設定されるので、fillStyle は透明に近いものでも良いが、
    // 確実に描画されるようにするため、shadowColorのアルファを反映した色か、
    // もしくは一時的に不透明な色で描画し、後で写真で上書きする。
    // ここでは影の色を尊重し、shadowColorで設定された色をそのまま使う（ただし globalAlpha なども考慮が必要な場合がある）
    // 多くのブラウザでは、影が設定されている場合、fillStyleに関わらず影が描画される。
    // 念のため、影が適用される「形状」を描画するためにfillStyleを設定する。
    ctx.fillStyle = shadowSettings.color; // または 'rgba(0,0,0,1)' などで形状を確保し影を描画

    // 角丸があれば影の形状も角丸に
    if (cornerRadiusSetting > 0) { // CHANGED: 引数の cornerRadiusSetting を使用
        const radius = (cornerRadiusSetting / 100) * shortSide;
        // スプレッドを考慮した矩形に対して角丸を適用
        roundedRect(ctx, adjustedX, adjustedY, adjustedWidth, adjustedHeight, radius);
    } else {
        ctx.rect(adjustedX, adjustedY, adjustedWidth, adjustedHeight);
    }
    
    ctx.fill(); // これで影が描画される
    ctx.restore();
}

/**
 * 写真にボーダーを適用する
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {Object} borderSettings - ボーダーの設定
 * @param {number} cornerRadiusSetting - 角丸の設定値 (%)
 * @param {number} x - 写真の左上X座標
 * @param {number} y - 写真の左上Y座標
 * @param {number} width - 写真の幅
 * @param {number} height - 写真の高さ
 * @param {number} shortSide - 写真の短辺
 */
// CHANGED: cornerRadiusSetting を引数に追加
function applyBorder(ctx, borderSettings, cornerRadiusSetting, x, y, width, height, shortSide) {
    const borderWidth = (borderSettings.width / 100) * shortSide;
    if (borderWidth <= 0) return;

    ctx.save();
    ctx.strokeStyle = borderSettings.color;
    ctx.lineWidth = borderWidth;
    
    if (borderSettings.style === 'dashed') {
        ctx.setLineDash([borderWidth * 2, borderWidth]); // 例: 破線のパターン
    }
    
    // 線の中心がパス上に来るため、ボーダーを内側に描画する場合は、
    // 描画する矩形を線の太さの半分だけ内側にオフセットし、サイズも縮小する。
    const adj = borderWidth / 2;
    const adjustedX = x + adj;
    const adjustedY = y + adj;
    const adjustedWidth = width - borderWidth;
    const adjustedHeight = height - borderWidth;

    // 角丸がある場合は適用（半径もボーダー幅を考慮して調整が必要な場合があるが、ここでは単純化）
    if (cornerRadiusSetting > 0) { // CHANGED: 引数の cornerRadiusSetting を使用
        let radius = (cornerRadiusSetting / 100) * shortSide;
        // ボーダーが内側なので、角丸半径もそれに合わせて調整する (外側の半径 - ボーダー幅の半分)
        // ただし、半径が負にならないように注意
        radius = Math.max(0, radius - adj); 
        roundedRect(ctx, adjustedX, adjustedY, adjustedWidth, adjustedHeight, radius);
    } else {
        ctx.beginPath(); // rectの前にbeginPathがないと、以前のパスに影響する可能性
        ctx.rect(adjustedX, adjustedY, adjustedWidth, adjustedHeight);
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

export { applyFrameEffects };