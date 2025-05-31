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

// REMOVED: applyFrameEffects 関数は canvasRenderer.js 側の描画順序制御に役割を移譲

function applyShadow(ctx, shadowSettings, frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx) {
    // frameSettings.shadowEnabled のチェックは呼び出し元(canvasRenderer.js)で行われている
    if (!shadowSettings) {
        console.warn("applyShadow: shadowSettings is undefined or null.");
        return;
    }

    if (frameSettings.shadowType === 'drop') {
        // console.log("Applying Drop Shadow (Offscreen method) with settings:", shadowSettings);
        console.log("--- applyShadow (drop) ---"); // ★ログ追加
        console.log("shadowSettings:", JSON.parse(JSON.stringify(shadowSettings))); // ★ログ追加 (内容はディープコピーして表示)
        console.log("frameSettings (for corner):", JSON.parse(JSON.stringify(frameSettings))); // ★ログ追加
        console.log(`photoX: ${photoX}, photoY: ${photoY}, photoWidth: ${photoWidth}, photoHeight: ${photoHeight}, photoShortSidePx: ${photoShortSidePx}`); // ★ログ追加

        const offsetX = (shadowSettings.offsetX / 100) * photoShortSidePx;
        const offsetY = (shadowSettings.offsetY / 100) * photoShortSidePx;
        const blurRadius = Math.max(0, (shadowSettings.blur / 100) * photoShortSidePx); // ぼかしは0以上
        const spreadRadius = (shadowSettings.spread !== undefined ? (shadowSettings.spread / 100) * photoShortSidePx : 0);
        const shadowColor = shadowSettings.color;

        console.log(`Calculated - offsetXpx: ${offsetX}, offsetYpx: ${offsetY}, blurRadius: ${blurRadius}, spreadRadius: ${spreadRadius}`); // ★ログ追加


        // 影の描画範囲を考慮してオフスクリーンCanvasのサイズと描画オフセットを決定
        // スプレッドとぼかしで最大どれくらい広がるかを見積もる
        const marginForShadow = Math.abs(offsetX) + Math.abs(offsetY) + blurRadius + Math.abs(spreadRadius) + 5; // 若干の余裕
        const offscreenWidth = photoWidth + marginForShadow * 2;
        const offscreenHeight = photoHeight + marginForShadow * 2;

        // 写真形状をオフスクリーンCanvasの中央に描くためのオフセット
        const shapeOffsetXonOffscreen = marginForShadow;
        const shapeOffsetYonOffscreen = marginForShadow;

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = offscreenWidth;
        offscreenCanvas.height = offscreenHeight;
        const offCtx = offscreenCanvas.getContext('2d');
        if (!offCtx) { console.error("Failed to get offscreen context for drop shadow"); return; } // ★エラーなら早期リターン

        console.log(`Offscreen canvas created: ${offscreenWidth}x${offscreenHeight}`); // ★ログ追加

        // 1. オフスクリーンに、スプレッドを考慮した「影を落とす物体」の形状を描画
        //    この物体の色は、最終的な影の色とは無関係（影の形状を作るためだけ）
        //    ただし、Canvasの影機能が参照するので、ある程度不透明である必要がある。
        offCtx.beginPath();
        const objectX = shapeOffsetXonOffscreen + (spreadRadius < 0 ? -spreadRadius : 0); // スプレッドが負なら描画位置を調整
        const objectY = shapeOffsetYonOffscreen + (spreadRadius < 0 ? -spreadRadius : 0);
        const objectWidth = photoWidth + Math.max(0, spreadRadius * 2);
        const objectHeight = photoHeight + Math.max(0, spreadRadius * 2);

        if (frameSettings.cornerStyle === 'superellipse') {
            createSuperellipsePath(offCtx, objectX, objectY, objectWidth, objectHeight, frameSettings.superellipseN);
        } else if (frameSettings.cornerStyle === 'rounded' && frameSettings.cornerRadiusPercent > 0) {
            let radius = (frameSettings.cornerRadiusPercent / 100) * photoShortSidePx;
            radius = Math.max(0, radius + spreadRadius); // スプレッドに応じて半径も調整
            roundedRect(offCtx, objectX, objectY, objectWidth, objectHeight, radius);
        } else {
            offCtx.rect(objectX, objectY, objectWidth, objectHeight);
        }
        offCtx.fillStyle = 'black'; // 影を生成するためのダミーの塗りつぶし（不透明）
        offCtx.fill();

        // ★デバッグ用: オフスクリーンCanvasの内容を一時的にメインCanvasに描画して確認
        // このdrawImageはデバッグ後に削除またはコメントアウトしてください。
        ctx.save();
        ctx.globalAlpha = 0.5; // 半透明にして写真と重なっても見えるように
        ctx.drawImage(offscreenCanvas, photoX - shapeOffsetXonOffscreen, photoY - shapeOffsetYonOffscreen);
        ctx.restore();
        console.log("Debug: Drew offscreen 'object' to main canvas temporarily."); // ★ログ追加

        // 2. オフスクリーンCanvasに影を設定し、影だけを描画する
        //    現在のオフスクリーンCanvasの内容（黒い物体）をソースとして、
        //    ぼかしとオフセットのついた影を別の場所に描画するようなイメージだが、
        //    ここでは、メインのctxに影付きで物体を描画し、物体自体は透明にするという
        //    トリックの代わりに、影自体をオフスクリーンに描くことを目指す。

        //    手法A：一度影付きで物体を描き、物体を消す
        //    オフスクリーンB (temp) を用意
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = offscreenWidth;
        tempCanvas.height = offscreenHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // tempCanvas に、影設定を有効にしてオフスクリーンAの「物体」を描画する -> これで物体と影ができる
        tempCtx.shadowColor = shadowColor;
        tempCtx.shadowOffsetX = offsetX;
        tempCtx.shadowOffsetY = offsetY;
        tempCtx.shadowBlur = blurRadius;
        tempCtx.drawImage(offscreenCanvas, 0, 0); // offscreenCanvasの物体がtempCanvasに影付きで描かれる

        // 次に、tempCanvas上で「物体」の部分だけを透明にする
        tempCtx.globalCompositeOperation = 'destination-in'; // 物体の形状の内側だけを残す
        // destination-out だと物体の形状でくり抜く
        // shadowOffsetX/Y が0の場合、物体と影は重なる。そうでない場合はずれる。
        // destination-in だと、元の物体の形状(alphaあり)と、影付きで描画された物体(alphaあり)の積になる。
        // これは期待通りではない。

        // 手法B：影の色でオフセット・ぼかし描画し、後で形状でマスクする
        // (これはインナーシャドウに近いので、ドロップシャドウでは別の方法が良い)

        // 手法C：物体を透明にして影だけ描画 (再挑戦)
        // メインのctxに直接描画するのではなく、このoffCtxに影だけを生成する
        offCtx.clearRect(0, 0, offscreenWidth, offscreenHeight); // 一旦クリア
        offCtx.save();
        offCtx.shadowColor = shadowColor;
        offCtx.shadowOffsetX = offsetX;
        offCtx.shadowOffsetY = offsetY;
        offCtx.shadowBlur = blurRadius;

        // 影を落とす形状を再度パスとして定義 (これはfillやstrokeをしない)
        // このパスは、spreadを適用した後の写真の輪郭
        const pathX = shapeOffsetXonOffscreen + (spreadRadius < 0 ? -spreadRadius : 0);
        const pathY = shapeOffsetYonOffscreen + (spreadRadius < 0 ? -spreadRadius : 0);
        const pathWidth = photoWidth + Math.max(0, spreadRadius * 2);
        const pathHeight = photoHeight + Math.max(0, spreadRadius * 2);

        if (frameSettings.cornerStyle === 'superellipse') {
            createSuperellipsePath(offCtx, pathX, pathY, pathWidth, pathHeight, frameSettings.superellipseN);
        } else if (frameSettings.cornerStyle === 'rounded' && frameSettings.cornerRadiusPercent > 0) {
            let radius = (frameSettings.cornerRadiusPercent / 100) * photoShortSidePx;
            radius = Math.max(0, radius + spreadRadius);
            roundedRect(offCtx, pathX, pathY, pathWidth, pathHeight, radius);
        } else {
            offCtx.beginPath(); // rectの前にbeginPath
            offCtx.rect(pathX, pathY, pathWidth, pathHeight);
        }
        // fillStyleを完全に透明に設定し、fill()を呼び出すことで、影だけが描画されることを期待
        // ただし、一部ブラウザでは影が出ない可能性がある
        offCtx.fillStyle = 'rgba(0,0,0,0)';
        offCtx.fill(); // これで offscreenCanvas に影だけが描画される (期待)
        offCtx.restore();


        // 3. メインCanvasにオフスクリーンCanvasの内容（影のみのはず）を描画
        //    描画位置は、写真本体の位置からオフスクリーンCanvasのマージン分を引いた位置
        ctx.drawImage(offscreenCanvas, photoX - shapeOffsetXonOffscreen, photoY - shapeOffsetYonOffscreen);

    } else if (frameSettings.shadowType === 'inner') {
        console.log("Applying Inner Shadow (revised logic) with settings:", shadowSettings);

        const blurAmountPx = (shadowSettings.blur / 100) * photoShortSidePx;
        const offsetXpx = (shadowSettings.offsetX / 100) * photoShortSidePx;
        const offsetYpx = (shadowSettings.offsetY / 100) * photoShortSidePx;
        // spreadPercent をピクセル値に変換
        const spreadPx = (shadowSettings.spreadPercent / 100) * photoShortSidePx;

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
        offCtx.fillStyle = shadowSettings.color;
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