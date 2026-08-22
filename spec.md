# Kakomi 技術仕様書

## 1. プロジェクト概要

Kakomiは、写真にフレーム加工とテキストオーバーレイを追加するWebアプリケーションです。ブラウザ上で動作し、ビルドツール不要のシンプルな構成となっています。

### アプリの目的
高解像度の写真に対して、構図調整・最終出力アスペクト比指定・背景処理・Exif情報や日付・テキスト追加・装飾処理を施し、視覚的に整ったJPEG画像を出力するための視覚重視の画像編集Webアプリケーション。

**重要な設計原則:**
- 元写真の解像度は一切変更せず、写真は指定された構図でクリアに表示される
- その周囲に装飾や情報が配置される
- プレビューは軽量に、出力は高解像度で、両者の一貫性を保つ

**本ドキュメントについて:**
本ファイルは、現在リポジトリに存在する実装（Vanilla JS + Canvas API版）のコードを実際に読んで検証・記述した技術仕様書です。リポジトリには `Kakomi_refactoring.md` という別ファイルも存在しますが、これは Fabric.js を用いた ver 2.0 への全面リライト計画書であり、現時点では実装されていません。本ドキュメントが記述する内容とは別物である点に注意してください。

### 主な機能
- 写真の読み込み（ファイル選択またはドラッグ&ドロップ）
- 構図調整（アスペクト比、拡大率、位置調整）
- レイアウト設定（出力アスペクト比、余白、写真位置調整）
- 背景編集（単色背景、拡大ぼかし背景）
- フレーム加工（角丸、超楕円、影、縁取り）
- テキストオーバーレイ（撮影日、Exif情報、自由テキスト）
- Exif情報の表示と保持
- 高解像度JPEG出力（元画像解像度維持）

## 2. 技術スタック

### コア技術
- **HTML5 Canvas API**: 画像描画と加工処理
- **Vanilla JavaScript (ES6 Modules)**: モジュール化されたJavaScript実装
- **CSS3**: スタイリング（Facebook風のデザイン）

### 外部ライブラリ
- **piexif.js** (CDN): Exif情報の読み取りと書き込み
  - URL: `https://unpkg.com/piexifjs`
  - 用途: JPEG画像のExifメタデータ操作

### フォント
- **Google Fonts**: テキスト描画用のWebフォント
  - 英語フォント: Roboto, Lato, Montserrat, Raleway, Josefin Slab, Oswald, Orbitron, Cormorant Garamond, Julius Sans One, Italianno, Moon Dance, Caveat, Cookie, Shadows Into Light, Indie Flower, Gloria Hallelujah, Handlee, Nothing You Could Do, Oooh Baby, Over the Rainbow, Grape Nuts, Annie Use Your Telescope
  - 日本語フォント: 解星デコール, 解星オプティ, デラゴシックワン, モッチーポップ, あおぼし, ZEN紅道, クレーOne, Yomogi, 油性マジック

## 3. アーキテクチャ

### 設計パターン
- **モジュール化アーキテクチャ**: 機能ごとに独立したモジュールに分割
- **状態管理**: 中央集約型の状態管理（stateManager.js）
- **描画パイプライン**: プレビュー描画と最終出力描画の分離

### データフロー
```
ユーザー操作
  ↓
UIイベント (uiController.js)
  ↓
状態更新 (stateManager.js)
  ↓
レイアウト計算 (layoutCalculator.js)
  ↓
描画処理 (canvasRenderer.js)
  ├─ 背景描画 (backgroundRenderer.js)
  ├─ フレーム加工 (frameRenderer.js)
  └─ テキスト描画 (textRenderer.js)
  ↓
プレビュー更新 / 最終出力
```

## 4. ファイル構造

```
Kakomi/
├── index.html              # メインHTMLファイル
├── style.css               # スタイルシート
├── spec.md                  # 技術仕様書（本ファイル）
├── Kakomi_refactoring.md   # リファクタリング仕様書
└── js/
    ├── main.js             # エントリーポイント
    ├── stateManager.js     # 状態管理
    ├── uiController.js     # UI制御とイベントハンドリング
    ├── uiDefinitions.js    # UI設定値とフォント定義
    ├── tabManager.js       # タブ切り替え機能
    ├── layoutCalculator.js # レイアウト計算
    ├── canvasRenderer.js   # キャンバス描画の統合
    ├── backgroundRenderer.js # 背景描画
    ├── frameRenderer.js    # フレーム加工（角丸、超楕円、影、縁取り）
    ├── textRenderer.js     # テキスト描画
    ├── fileManager.js      # ファイル読み込みとダウンロード処理
    ├── exifHandler.js      # Exif情報の抽出と埋め込み
    └── utils/
        └── canvasUtils.js  # Canvas操作ユーティリティ
```

## 5. 主要モジュールの説明

### 5.1 main.js
アプリケーションのエントリーポイント。各モジュールを初期化し、イベントリスナーを設定します。

**主要関数:**
- `requestRedraw()`: プレビューの再描画を要求

**初期化処理:**
- Canvasコンテキストの取得
- UIの初期化
- イベントリスナーの設定
- ドラッグ&ドロップ対応

### 5.2 stateManager.js
アプリケーション全体の状態を管理するモジュール。

**状態構造 (`editState`):**
```javascript
{
  image: HTMLImageElement,           // 読み込まれた画像
  originalWidth: number,             // 元画像の幅
  originalHeight: number,             // 元画像の高さ
  originalFileName: string,           // 元のファイル名
  photoViewParams: {                 // 写真位置調整
    offsetX: number,                  // 0-1の範囲
    offsetY: number                   // 0-1の範囲
  },
  outputTargetAspectRatioString: string, // 出力アスペクト比
  baseMarginPercent: number,         // 余白（%）
  backgroundColor: string,            // 背景色（HEX）
  backgroundType: 'color' | 'imageBlur', // 背景タイプ
  imageBlurBackgroundParams: {        // ぼかし背景パラメータ
    scale: number,                    // 拡大倍率
    blurAmountPercent: number,        // ぼかし強度（%）
    brightness: number,                // 明るさ（%）
    saturation: number,                // 彩度（%）
    offsetXPercent: number,            // Xオフセット（%）
    offsetYPercent: number             // Yオフセット（%）
  },
  photoDrawConfig: {                  // 写真描画設定（計算結果）
    sourceX, sourceY, sourceWidth, sourceHeight,
    destWidth, destHeight,
    destXonOutputCanvas, destYonOutputCanvas
  },
  outputCanvasConfig: {               // 出力Canvas設定（計算結果）
    width: number,
    height: number
  },
  frameSettings: {                    // フレーム加工設定
    cornerStyle: 'none' | 'rounded' | 'superellipse',
    cornerRadiusPercent: number,
    superellipseN: number,
    shadowEnabled: boolean,
    shadowType: 'drop' | 'inner',
    shadowParams: {
      offsetX, offsetY, blur, effectRangePercent,
      color, opacity
    },
    border: {
      enabled: boolean,
      width: number,
      color: string,
      style: 'solid' | 'dashed'
    }
  },
  textSettings: {                     // テキスト設定
    date: { enabled, format, font, size, color, opacity, position, offsetX, offsetY },
    exif: { enabled, items, customText, textAlign, font, size, color, opacity, position, offsetX, offsetY },
    freeText: { enabled, text, textAlign, font, size, color, opacity, position, offsetX, offsetY },
    freeText2: { enabled, text, textAlign, font, size, color, opacity, position, offsetX, offsetY }
  },
  outputSettings: {                    // 出力設定
    quality: number,                  // JPEG品質（1-100）
    preserveExif: boolean
  },
  cropSettings: {                     // 構図調整設定（内部実装、UI未公開）
    aspectRatio: string,              // 'original' または '1:1', '4:3' など
    zoom: number,                     // 1.0以上（中心から拡大）
    offsetX: number,                  // 0.0-1.0（切り出し領域のX位置）
    offsetY: number                   // 0.0-1.0（切り出し領域のY位置）
  },
  exifData: Object                    // Exifデータ（piexif.js形式）
}
```

**主要関数:**
- `getState()`: 現在の状態のディープコピーを取得
- `updateState(updates)`: 状態を更新（ディープマージ）
- `setImage(img, exifData, fileName)`: 新しい画像を設定
- `resetState()`: 状態を初期値にリセット
- `addStateChangeListener(listener)`: 状態変更リスナーを登録

**現状のコードに関する補足（未使用・不整合箇所）:**
- `resetState()` と `addStateChangeListener()` / `removeStateChangeListener()` はエクスポートされているが、現在のUIには「リセット」ボタンが存在せず、`main.js` 内の `addStateChangeListener(requestRedraw)` の呼び出しもコメントアウトされたままになっている。そのため、これらは実行時には呼び出されない未使用コードとなっている。
- `resetState()` が再構築する初期値は、モジュール先頭の `editState` 初期値と一部食い違っている（例: `frameSettings.cornerRadiusPercent` が `10` ではなく `0`、`superellipseN` が `10` ではなく `4` にリセットされる。また `textSettings` に `freeText` / `freeText2` が含まれず、`date`/`exif` の初期値も微妙に異なる）。呼び出し自体が行われないため実害はないが、将来リセット機能を有効化する際は要修正。

### 5.3 uiController.js
UI要素の制御とイベントハンドリングを担当します。

**主要機能:**
- UI要素の参照管理（`uiElements`オブジェクト）
- 状態からUIへの同期（`initializeUIFromState()`）
- UI変更から状態への同期（`setupEventListeners()`）
- フォント選択リストの生成
- Exifカスタムテキストの更新

**イベント処理:**
- レイアウト設定（アスペクト比、余白、写真位置）
- 背景設定（タイプ、色、ぼかしパラメータ）
- フレーム設定（角スタイル、影、縁取り）
- テキスト設定（各テキスト要素の設定）
- 出力設定（JPEG品質）

### 5.4 layoutCalculator.js
レイアウト計算を担当します。写真の切り出し領域、出力Canvasサイズ、写真の配置位置を計算します。

**主要関数:**
- `calculateLayout(currentState)`: レイアウト情報を計算
  - 返り値: `{ photoDrawConfig, outputCanvasConfig, actualMargins }`
- `getAspectRatioValue(aspectRatioStr)`: アスペクト比文字列を数値に変換

**計算ロジック:**
1. 構図調整設定に基づいて元画像から切り出す領域を決定
   - 切り出しアスペクト比の解析
   - 元画像のアスペクト比と比較して、幅または高さに合わせて切り出し領域を決定
   - ズーム適用（中心から拡大）
   - 位置調整（offsetX/Y）を適用
2. 基準値の計算（写真の短辺を計算）
3. 最小余白を計算（基準余白%からピクセル値に変換）
4. 出力Canvasの寸法を決定（アスペクト比を考慮）
   - 写真サイズ + 最小余白の仮サイズを計算
   - 目標アスペクト比と比較して、幅または高さを拡張
5. 写真の描画位置を決定（photoViewParams.offsetX/Yに基づく）
   - 可動範囲内で写真の左上座標を計算

### 5.5 canvasRenderer.js
キャンバス描画の統合処理を担当します。

**主要関数:**
- `drawPreview(currentState, previewCanvas, previewCtx)`: プレビュー描画
- `renderFinal(currentState)`: 最終出力用の高解像度Canvasを生成

**描画順序:**
1. 背景描画
2. ドロップシャドウ（有効な場合）
3. クリッピングパス設定（角丸/超楕円）
4. 写真本体描画
5. インナーシャドウ（有効な場合）
6. 縁取り（有効な場合）
7. テキスト描画

### 5.6 backgroundRenderer.js
背景描画を担当します。

**主要関数:**
- `drawBackground(ctx, canvasWidth, canvasHeight, currentState, basePhotoShortSideForBlurPxIfPreview)`: 背景を描画
- `drawColorBackground(ctx, canvasWidth, canvasHeight, color)`: 単色背景を描画
- `drawBlurredImageBackground(ctx, canvasWidth, canvasHeight, img, blurParams, basePhotoShortSideForBlurPx)`: 拡大ぼかし背景を描画

**ぼかし背景の処理:**
- Canvas全体を覆うように画像を拡大
- ユーザー指定の拡大倍率を適用
- ぼかし、明るさ、彩度のフィルターを適用
- オフセット調整を適用

### 5.7 frameRenderer.js
フレーム加工（角丸、超楕円、影、縁取り）を担当します。

**主要関数:**
- `createAndApplyClippingPath(ctx, frameSettings, photoX, photoY, photoWidth, photoHeight)`: クリッピングパスを設定
- `createSuperellipsePath(ctx, x, y, width, height, nParam)`: 超楕円パスを生成
- `roundedRect(ctx, x, y, width, height, radius)`: 角丸矩形パスを生成
- `applyShadow(ctx, shadowSettings, frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx)`: 影を適用
- `applyBorder(ctx, borderSettings, frameSettings, photoX, photoY, photoWidth, photoHeight, photoShortSidePx)`: 縁取りを適用

**超楕円の実装:**
- 媒介変数表示を使用: `x(t) = a * sgn(cos(t)) * |cos(t)|^(2/n)`
- 第一象限を計算し、対称性を利用して全象限を描画
- 次数nにより形状を制御（n=2で楕円、nが大きいと四角に近づく）

**影の実装:**
- **ドロップシャドウ**: オフスクリーンCanvasを使用して影を生成し、ぼかしを適用
- **インナーシャドウ**: destination-out合成モードでくり抜き、ぼかしを適用

### 5.8 textRenderer.js
テキスト描画を担当します。

**主要関数:**
- `drawText(ctx, currentState, canvasWidth, canvasHeight, basePhotoShortSideForTextPx)`: テキストを描画
- `loadSingleGoogleFont(fontApiName)`: Google Fontを読み込む
- `drawSingleText(ctx, settings, textToDraw, fontObject, basePhotoShortSidePx, canvasWidth, canvasHeight)`: 単一テキストブロックを描画
- `calculateTextPosition(...)`: テキスト位置を計算
- `getFormattedDate(exifDateTimeString, displayFormat)`: Exif日時をフォーマット

**フォント読み込み:**
- Google Fonts APIから動的にCSSを読み込み
- フォント読み込み状態を管理（`fontLoadStates` Map）
- 重複読み込みを防止

**テキスト位置計算:**
- 位置指定（top-left, top-center, top-right, bottom-left, bottom-center, bottom-right）
- オフセット（写真短辺基準の%）
- テキスト整列（left, center, right）

### 5.9 fileManager.js
ファイル読み込みとダウンロード処理を担当します。

**主要関数:**
- `processImageFile(file, redrawCallback)`: 画像ファイルを処理
  - FileReaderでファイルを読み込み
  - Exif情報を抽出
  - 画像を状態に設定
  - UIを更新
- `handleDownload()`: 最終画像をダウンロード
  - 高解像度Canvasを生成
  - JPEG Blobに変換
  - Exif情報を埋め込み（オプション）
  - ダウンロードを実行

### 5.10 exifHandler.js
Exif情報の抽出と埋め込みを担当します。

**主要関数:**
- `extractExifFromFile(file)`: 画像ファイルからExif情報を抽出
- `formatExifForDisplay(exifData)`: Exif情報を表示用にフォーマット
- `embedExifToJpeg(jpegDataUrl, exifDataFromState)`: Exif情報をJPEGに埋め込み
- `displayExifInfo(exifData, container)`: Exif情報を画面に表示

**対応Exifタグ:**
- Make（メーカー名）
- Model（機種名）
- DateTime（撮影日時）
- FNumber（F値）
- ExposureTime（シャッタースピード）
- ISOSpeedRatings（ISO感度）
- FocalLength（焦点距離）
- LensModel（レンズ情報）

### 5.11 utils/canvasUtils.js
Canvas操作のユーティリティ関数を提供します。

**主要関数:**
- `drawImageWithPrecision(ctx, img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)`: 高品質な画像描画（整数座標）
- `canvasToJpegBlob(canvas, quality)`: CanvasをJPEG Blobに変換
- `blobToDataURL(blob)`: BlobをDataURLに変換
- `dataURLToBlob(dataURL)`: DataURLをBlobに変換
- `fitCanvasToContainer(canvas, targetAspectRatio)`: Canvasサイズをコンテナに合わせる

## 6. データフロー

### 6.1 画像読み込みフロー
```
ユーザーがファイルを選択/ドロップ
  ↓
fileManager.processImageFile()
  ↓
FileReaderでファイル読み込み
  ↓
exifHandler.extractExifFromFile() でExif抽出
  ↓
stateManager.setImage() で状態更新
  ↓
uiController.initializeUIFromState() でUI更新
  ↓
main.requestRedraw() でプレビュー描画
```

### 6.2 設定変更フロー
```
ユーザーがUI要素を変更
  ↓
uiController のイベントハンドラー
  ↓
stateManager.updateState() で状態更新
  ↓
main.requestRedraw() が呼ばれる
  ↓
layoutCalculator.calculateLayout() でレイアウト計算
  ↓
canvasRenderer.drawPreview() で描画
  ├─ backgroundRenderer.drawBackground()
  ├─ frameRenderer の各種関数
  └─ textRenderer.drawText()
```

### 6.3 ダウンロードフロー
```
ユーザーがダウンロードボタンをクリック
  ↓
fileManager.handleDownload()
  ↓
canvasRenderer.renderFinal() で高解像度Canvas生成
  ↓
canvasUtils.canvasToJpegBlob() でJPEG Blob生成
  ↓
exifHandler.embedExifToJpeg() でExif埋め込み（オプション）
  ↓
Blobをダウンロード
```

## 7. 機能仕様

### 7.0 単位系の定義

**基準値:**
- 全ての%指定の基準値は「構図調整後の写真の短辺の長さ（ピクセル）」とする
- 短辺 = `Math.min(構図調整後の写真の幅, 構図調整後の写真の高さ)`

**適用範囲:**
- 基準余白の指定
- フレーム加工（角丸半径、影のオフセット/ぼかし/広がり、縁取りの太さ）
- 文字サイズ
- 背景のぼかし強度
- 背景のX/Yオフセット

この単位系により、写真のサイズに関わらず一貫した視覚的な比率で装飾を適用できる。

### 7.1 構図調整（内部実装）

**注意:** 現在のUIには構図調整の直接的なコントロールは表示されていないが、内部では`cropSettings`として実装されている。

**設定項目:**
- **アスペクト比**: 元画像から切り出す部分のアスペクト比
  - `'original'`: 元画像の比率を使用
  - `'1:1'`, `'4:3'`, `'16:9'`など: 指定された比率で切り出し
- **拡大率（ズーム）**: 元画像の解像度を維持する範囲でのトリミング領域の調整
  - 範囲: 1.0以上（1.0で拡大なし）
  - 中心から拡大する方式
- **位置調整（offsetX/Y）**: 切り出し領域の位置を調整
  - 範囲: 0.0-1.0（0.5が中央）
  - X方向: 横方向の位置
  - Y方向: 縦方向の位置

**実装詳細:**
- `layoutCalculator.js`の`calculateLayout()`関数で処理
- 元画像から切り出す領域（sourceX, sourceY, sourceWidth, sourceHeight）を計算
- 切り出した領域は元画像の解像度を完全に維持して描画される

### 7.2 レイアウト設定
- **出力アスペクト比**: 最終的な出力画像の縦横比を指定
  - プリセット選択肢（`<select id="outputAspectRatio">`）: 1:1（正方形）、4:5（Instagram縦）、1.91:1（Instagram横）、16:9（ワイド）、3:4、89:127（L判縦）、カスタム
  - **カスタム比率の自由入力（実装済み）**: 「カスタム」を選択、または幅/高さの数値入力欄を直接編集すると、任意の `幅:高さ` 比率を指定できる。⇄ボタンで幅と高さを入れ替え可能。入力値は `outputTargetAspectRatioString`（例: `"3:2"`）として状態に保存される。
    - 内部的には `outputTargetAspectRatioString` に `"custom:"` プレフィックスを付けた古い形式の後方互換処理（プレフィックス除去）が残っているが、現在のUIはプレフィックスなしの `"幅:高さ"` 形式で保存する。
  - `layoutCalculator.js` は特別な値 `"original_photo"`（入力写真の比率をそのまま使う）にも対応しているが、現在のプリセット選択肢にはこの項目がなく、UIから選択する手段はない。
  - これが最終的なJPEGのアスペクト比となる
- **基準余白**: 構図調整後の写真の短辺に対する%で指定（0-100%）
  - この値は「最小限の余白量」の目安
  - 実際の余白は、出力画像の目標アスペクト比を維持するために、この基準値よりも一部が自動的に広がる場合がある
- **写真位置調整**: 出力画像のフレーム内で、写真をどこに配置するか
  - X方向: 0.0-1.0の範囲で調整（0.0=左端、0.5=中央、1.0=右端）
  - Y方向: 0.0-1.0の範囲で調整（0.0=上端、0.5=中央、1.0=下端）
  - **注意:** 仕様書v1では「9点から選択」とあるが、現在の実装では連続的な位置調整となっている

### 7.3 背景編集
- **背景タイプ**: 「単色」または「写真の拡大ぼかし画像」から選択

**単色背景:**
- カラーピッカーで色を選択

**拡大ぼかし背景:**
- **拡大倍率**: 1.0-8.0倍（デフォルト2.0倍）
  - **注意:** 仕様書v1では1x-4xとあるが、現在の実装では1-8倍となっている
- **ぼかし強度**: 0-50%（写真短辺基準、デフォルト3%）
  - **注意:** 仕様書v1では0-15%とあるが、現在の実装では0-50%となっている
- **明るさ**: 0-150%（デフォルト100%、変化なし）
- **彩度**: 0-150%（デフォルト100%、変化なし）
- **X方向オフセット**: -500%〜500%（写真短辺基準、デフォルト0%）
  - 背景として使用する元画像の表示位置を左右に調整
  - **注意:** 仕様書v1では-50%～50%とあるが、現在の実装では-500%～500%となっている
- **Y方向オフセット**: -500%〜500%（写真短辺基準、デフォルト0%）
  - 背景として使用する元画像の表示位置を上下に調整
  - **注意:** 仕様書v1では-50%～50%とあるが、現在の実装では-500%～500%となっている

**実装詳細:**
- Canvas全体を覆うように画像を拡大（cover方式）
- 基本スケールにユーザー指定の拡大率を適用
- ぼかし、明るさ、彩度のフィルターを適用
- オフセット調整を適用

### 7.4 フレーム加工
- **角のスタイル**:
  - なし: 通常の矩形
  - 角丸: 半径を%で指定（0-50%）
  - 超楕円: 次数nを指定（3-40）
- **影**:
  - タイプ: 外側（ドロップ）または内側（インナー）
  - オフセットX/Y: -25%〜25%（写真短辺基準）
  - ぼかし: 0-10%（写真短辺基準）
  - 効果の範囲: 0-10%（写真短辺基準）
  - 色: HEXカラーコード
  - 不透明度: 0-1
- **縁取り**:
  - 線の太さ: 0-3%（写真短辺基準）
  - 色: HEXカラーコード
  - スタイル: 実線 / 破線
    - **実装状況の補足**: `frameRenderer.js` の `applyBorder()` は `border.style === 'dashed'` の場合に `ctx.setLineDash()` で破線描画をサポートしており、`uiController.js` にも `frameBorderStyleSelect` 用のイベントリスナーが用意されている。しかし `index.html` 内の実際の `<select id="frameBorderStyle">` はHTMLコメントとして無効化されており、現在のUI画面上からは破線を選択する手段がない（`border.style` は常に初期値の `'solid'` のまま）。つまり、描画ロジックとイベント配線は実装済みだが、UIコントロール自体が非表示のため、実質的に破線は使用できない状態にある。

### 7.5 テキストオーバーレイ
各テキスト要素（撮影日、Exif情報、自由テキスト×2）に対して以下を設定可能:

- **有効/無効**: チェックボックスで切り替え
- **フォント**: Google Fontsから選択
- **サイズ**: 写真短辺に対する%（0.1-10%または0.1-50%）
- **色**: HEXカラーコード
- **不透明度**: 0-1
- **位置**: 左上、中央上、右上、左下、中央下、右下から選択
- **オフセットX/Y**: %で指定（-50%〜50%または-100%〜100%）
- **水平方向の配置（textAlign）**: 左寄せ、中央、右寄せ
  - Exif情報、自由テキスト、自由テキスト2にはこの配置ラジオボタンが存在する。
  - **撮影日表示にはこの配置コントロールが存在しない**（`textDateAlign〜`に相当するUI要素はなく、`textRenderer.js`側でも撮影日設定オブジェクトに`textAlign`が定義されていないため、位置指定文字列から自動的に左/中央/右寄せが決まる）。

**撮影日表示**:
- ExifのDateTimeタグから取得
- フォーマット: YYYY.MM.DD、YYYY/MM/DD、YY/MM/DD、YY.MM.DD、YYYY年MM月DD日

**Exif情報表示**:
- 表示項目をチェックボックスで選択（Make、Model、LensModel、FNumber、ExposureTime、ISOSpeedRatings、FocalLength）
- カスタムテキストエリアで編集可能
- 自動生成されたテキストを編集可能

**自由テキスト**:
- 2つの独立したテキスト要素
- 改行対応（\nで区切る）

### 7.6 出力設定
- **JPEG品質**: 1-100（スライダー、`jpgQuality`）
- **Exif保持**: `outputSettings.preserveExif` は状態として存在し（初期値 `true`）、`fileManager.js`の`handleDownload()`がこの値を見てExif埋め込みの要否を判定する。ただし、この設定値を切り替えるUIチェックボックス自体が存在せず、常に「保持する」設定のままダウンロードが行われる。

### 7.7 Exif情報表示
右側のExifセクションに以下の情報を表示:
- カメラ情報（メーカー名、機種名）
- 撮影設定（F値、シャッタースピード、ISO感度、焦点距離）
- レンズ情報
- 日時情報（撮影日時）

## 8. 技術的な詳細

### 8.1 プレビューと出力の解像度

**プレビュー:**
- 画面表示用の低解像度（コンテナサイズに合わせて動的調整）
- 表示領域は親コンテナのサイズと出力アスペクト比に応じて動的に決定
- 描画は軽量化を優先

**出力:**
- オフスクリーンCanvasを使用
- 構図調整後の写真部分は、元画像の解像度を完全に維持して描画される
- 最終的な出力画像の寸法は、ユーザーが指定する「出力画像の目標アスペクト比」と「基準余白」、および「構図調整後の写真」のサイズに基づいて動的に決定される

### 8.2 レイアウト計算の詳細

`layoutCalculator.js`の`calculateLayout()`関数による処理フロー:

1. **使用する写真領域の決定**
   - 元画像に対する構図調整パラメータ（切り出しアスペクト比、拡大率、位置）を適用
   - 「使用する写真」の寸法（`trimmedPhotoWidthPx`, `trimmedPhotoHeightPx`）とそのアスペクト比を決定
   - この写真は元画像のピクセル情報を維持する

2. **基準値の計算**
   - 「使用する写真」の短辺（`photoShortSidePx = Math.min(trimmedPhotoWidthPx, trimmedPhotoHeightPx)`）を計算
   - これが基準余白%や各種装飾要素の%指定の計算ベースとなる

3. **最小余白の計算**
   - 指定された「基準余白%」から、最小余白のピクセル値（`minMarginPx = photoShortSidePx * (baseMarginPercent / 100)`）を計算

4. **出力Canvasの寸法決定**
   - 「使用する写真」の寸法に、上下左右の`minMarginPx`を加えた仮の全体サイズを想定
   - この仮の全体サイズのアスペクト比と、ユーザー指定の「出力画像の目標アスペクト比」を比較
   - 「出力画像の目標アスペクト比」を厳密に維持するように、仮の全体サイズの幅または高さを拡張し、最終的な出力Canvasの寸法（`outputCanvasWidthPx`, `outputCanvasHeightPx`）を決定
   - この際、写真自体の描画サイズは変更しない

5. **写真の描画位置決定**
   - 決定された`outputCanvasWidthPx`, `outputCanvasHeightPx`の内側で、「使用する写真」をどこに配置するかを計算
   - `photoViewParams.offsetX/Y`（0-1の範囲）を使用して、可動範囲内で写真の左上座標（`photoXonCanvasPx`, `photoYonCanvasPx`）を決定

### 8.3 数値精度と丸め処理に関するポリシー

本アプリケーションでは、長さ指定に由来する計算結果が小数となる場合があります。意図しない描画結果（特に写真の解像度変化や微細なレイアウトずれ）を防ぎ、出力品質を担保するために、以下の数値精度と丸め処理に関するポリシーを定めています。

**写真描画の厳格な整数化:**
- **対象**: `renderFinal`関数において、元写真を出力用Canvasに`drawImage()`で描画する際の描画先矩形の座標（`dx`, `dy`）および寸法（`dWidth`, `dHeight`）。また、ソース矩形の座標（`sx`, `sy`）および寸法（`sWidth`, `sHeight`）。
- **処理**: これらの値は、`drawImage()`メソッドに渡される直前に、`Math.round()`を用いて最も近い整数値に丸める。
- **実装**: `utils/canvasUtils.js`の`drawImageWithPrecision()`関数で実装
- **目的**: 元画像のピクセルと出力Canvasのピクセルとの厳密な対応を可能な限り実現し、意図しない補間処理による解像度の変化やボケ、モアレの発生リスクを最大限に抑制。「元写真の解像度は一切変更しない」という最重要仕様を技術的に保証するための措置。

**装飾要素（枠、背景、文字、図形等）の扱い:**
- **基本方針**: これらの要素の座標、寸法、線の太さ、半径などの値は、計算結果が小数であっても、原則としてそのままCanvas APIに渡す。
- **目的**: Canvas APIのサブピクセルレンダリングやアンチエイリアス効果を活用し、滑らかで高品質な視覚表現を目指す。
- **例外**: 要素同士の精密なアライメントが求められ、1ピクセル未満のズレが視覚的に問題となる場合には、関連する要素群に対して一貫した丸め処理を適用することを検討。

**基準値および中間計算値の扱い:**
- 全ての%指定の計算基準となる値や、その他の計算過程で生じる中間的なピクセル値は、最終的な描画パラメータとして適用されるまでは、JavaScriptの数値型が持つ精度でそのまま保持する。
- 丸め処理は、原則として上記のルールに基づき、最終的な描画API呼び出しの直前に行う。

**プレビュー描画時の扱い:**
- `drawPreview`関数におけるプレビューCanvasへの描画時は、出力時と同様の丸め処理を適用することを基本とする。
- ただし、プレビューの主目的は迅速なレイアウト確認であるため、パフォーマンスへの影響を考慮し、出力時ほど厳密な整数化を行わない、あるいは一部処理を簡略化することも許容される。
- ただし、プレビューと最終出力との間で大きな視覚的乖離が生じないよう最大限留意する。

### 8.4 描画の最適化
- コンテナサイズをキャッシュしてレイアウト再計算の影響を防止
- オフスクリーンCanvasを使用した影の生成
- 整数座標を使用した高品質な画像描画

### 8.5 フォント読み込み
- Google Fontsを動的に読み込み
- フォント読み込み状態を管理して重複読み込みを防止
- フォント読み込み完了を待ってから描画（非同期処理）
- JavaScriptの非同期処理で読み込みを待つため、読み込みが遅い場合でも適切に処理される

### 8.6 Exif処理
- piexif.jsを使用してExif情報を操作
- JPEG形式のみ対応
- Exif情報の抽出、表示、埋め込みに対応
- 出力時に元のExif情報を再埋め込み可能（`preserveExif`設定）

### 8.7 エラーハンドリング
- 画像読み込みエラー時のアラート表示
- Exif抽出エラー時の警告ログ
- Canvas生成エラー時のフォールバック処理

### 8.8 ファイル名の命名規則
- 出力ファイル名: `(読み込んだ元写真のファイル名から拡張子を除いたもの)_kakomi_framed.jpg`
- 例: `IMG_1234.jpg` → `IMG_1234_kakomi_framed.jpg`

## 9. ブラウザ対応

### 対応ブラウザ
- Chrome/Edge（最新版）
- Firefox（最新版）
- Safari（最新版）

### 必要な機能
- ES6 Modules
- Canvas API
- FileReader API
- OffscreenCanvas（オプション、フォールバックあり）
- structuredClone（オプション、フォールバックあり）

## 10. パフォーマンス考慮事項

- 大きな画像ファイルの処理時のメモリ使用量
- プレビュー描画の頻度制御（デバウンス検討）
- フォント読み込みの非同期処理
- オフスクリーンCanvasの適切な使用

## 12. 仕様書v1との対応状況

### 12.1 実装済みの仕様

以下の仕様は仕様書v1の要求通りに実装されています：

- ✅ 単位系の定義（写真短辺基準の%指定）
- ✅ 構図調整機能（内部実装、`cropSettings`として実装）
- ✅ 出力フォーマット設定（目標アスペクト比、基準余白）
- ✅ 背景編集（単色、拡大ぼかし）
- ✅ フレーム加工（角丸、超楕円、影、縁取り）
- ✅ テキストオーバーレイ（撮影日、Exif情報、自由テキスト）
- ✅ Exif情報の表示と再埋め込み
- ✅ 数値精度と丸め処理のポリシー（写真描画の厳格な整数化）
- ✅ レイアウト計算の詳細フロー
- ✅ ファイル名の命名規則（`_kakomi_framed.jpg`）
- ✅ アスペクト比のカスタム指定（出力目標アスペクト比の自由入力、幅/高さ数値入力＋⇄反転ボタン）

### 12.2 実装が異なる仕様

以下の仕様は仕様書v1の要求と異なる実装となっています：

**背景編集のパラメータ範囲:**
- **拡大倍率**: 仕様書v1では1x-4x、実装では1.0-8.0倍
- **ぼかし強度**: 仕様書v1では0-15%、実装では0-50%
- **背景X/Yオフセット**: 仕様書v1では-50%～50%、実装では-500%～500%

**写真の配置方法:**
- **仕様書v1の要求**: 9点から選択（中央、上、下、左、右、左上、右上、左下、右下）
- **現在の実装**: 連続的な位置調整（X/Y方向それぞれ0.0-1.0の範囲でスライダー調整）

### 12.3 未実装の仕様

以下の仕様は仕様書v1に記載されているが、現在のUIには実装されていません：

**構図調整のUI:**
- 仕様書v1では「レイアウト設定タブ」に構図調整のコントロールが含まれる想定
- 現在の実装では、構図調整機能は内部（`cropSettings`）として実装されているが、UIから直接操作できない
- 構図調整のパラメータ（アスペクト比、拡大率、位置）はデフォルト値で動作

**その他の未実装機能（v2以降の拡張案として記載）:**
- カラーパレットで選んだ色の履歴機能
- 編集設定のテンプレートプリセット保存／呼び出し機能
- 編集履歴（Undo/Redo）機能

（`resetState()`によるリセット機能や、状態変更リスナーの仕組み自体はコードとして存在するが、UI・呼び出し元とも配線されておらず、実質的に未使用である点は5.2節を参照。）

## 11. 今後の拡張可能性

### 11.1 仕様書v1で提案されている機能
- 構図調整のUI実装（アスペクト比、拡大率、位置調整のコントロール）
- 写真の配置を9点から選択する機能
- カラーパレットで選んだ色の履歴を残して次回素早く呼び出せる機能
- 編集設定のテンプレートプリセット保存／呼び出し機能
- 編集履歴（Undo/Redo）機能
- 出力前確認画面の強化（ズームなど）
- モバイル操作最適化（フリック・タップ操作）

### 11.2 その他の拡張案
- 複数画像のバッチ処理
- より高度な画像フィルター
- レイヤー管理機能
- アニメーションGIF出力
- より多くのExifタグの対応
