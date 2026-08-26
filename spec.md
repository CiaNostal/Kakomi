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
本ファイルは、現在リポジトリに存在する実装（Vanilla JS + Canvas API版）のコードを実際に読んで検証・記述した技術仕様書です。

なお、以前は Fabric.js を用いた全面リライト計画書（`Kakomi_refactoring.md`）が別途存在していましたが、その計画が目指していた「インタラクティブなオブジェクト操作（ドラッグ移動）」「選択中オブジェクトに応じて内容が変わる設定パネル」は、Fabric.js等の外部ライブラリを導入せずVanilla JSのまま実現したため（5.12節以降を参照）、計画書自体は削除しました。

**UI刷新について（2026年8月）:**
初期実装は「Facebook風」の配色・レイアウト（青系アクセント、上部に太いヘッダー＋その下に6タブ横並び＋固定幅サイドバー）でしたが、視認性とモダンさの改善要望を受けて以下の刷新を行いました。詳細は3.1節・5.3節・7.2節・7.5節を参照。
- 配色をスレートブルー系アクセントに変更し、UI用フォントをIBM Plex Sans/Sans Condensed/Monoに統一（2.のフォント節参照）
- 上部ヘッダーを、白→アクセントの淡いグラデーションの薄いバーに変更し、Undo/Redo・ダウンロードボタンをここに集約
- 左サイドバーを「タブ横並び＋コンテンツ」から、Canvaを参考にした「細いアイコンレール＋選択時に開くフライアウトパネル＋広いキャンバスエリア」の3カラム構成に変更（3.1節）
- フレーム加工パネルを、素のラジオボタン/チェックボックスによる即時表示切り替えから、セグメントコントロール＋トグルスイッチ＋CSSアニメーションによる滑らかなアコーディオン開閉に変更
- 撮影日・Exif情報・自由テキストの3つに分かれていた文字入力UIを、1つのチップリスト＋1つの設定パネルに統合（5.3節「文字レイヤーの統一UI」参照。データモデル自体は変更していない）
- Exif情報表示を、常設の別パネルから、アイコンレール下部の独立した「情報」トグルボタンで開閉するフローティングカードに変更（3.1節）

### 主な機能
- 写真の読み込み（ファイル選択またはドラッグ&ドロップ）
- 構図調整（アスペクト比、拡大率、位置調整）
- レイアウト設定（出力アスペクト比、余白、写真位置調整）
- 背景編集（単色背景、拡大ぼかし背景）
- フレーム加工（角丸、超楕円、影、縁取り）
- テキストオーバーレイ（撮影日、Exif情報、自由テキスト。自由テキストは個数無制限で追加可能）
- プレビュー上でのインタラクティブなドラッグ操作（写真配置・背景位置・自由テキスト。スナップ/ガイド、矢印キーでの微調整に対応）
- Exif情報の表示と保持
- 高解像度JPEG出力（元画像解像度維持）

## 2. 技術スタック

### コア技術
- **HTML5 Canvas API**: 画像描画と加工処理
- **Vanilla JavaScript (ES6 Modules)**: モジュール化されたJavaScript実装
- **CSS3**: スタイリング（CSS Custom Propertiesによるデザイントークン管理。配色はスレートブルー系アクセント、詳細は上記「UI刷新について」参照）

### 外部ライブラリ
- **piexif.js** (CDN): Exif情報の読み取りと書き込み
  - URL: `https://unpkg.com/piexifjs`
  - 用途: JPEG画像のExifメタデータ操作

### フォント
UI表示用とテキストオーバーレイ描画用は別系統のフォントで、混同しないよう分けて管理している。

- **UI表示用フォント**（Google Fonts経由、`index.html`の`<head>`で読み込み）: IBM Plex Sans（本文・コントロールラベル）/ IBM Plex Sans Condensed（タブ・見出し・カード見出し。CJK文字列の折り返し崩れ対策も兼ねる）/ IBM Plex Mono（スライダー等の数値表示）。`style.css`の`--font-ui`/`--font-cond`/`--font-mono`トークンとして参照する
- **テキストオーバーレイ描画用フォント**（`uiDefinitions.js`の`googleFonts`配列。Canvas描画対象、文字レイヤーの設定パネルで選択）:
  - 英語フォント: Roboto, Lato, Montserrat, Raleway, Josefin Slab, Oswald, Orbitron, Cormorant Garamond, Julius Sans One, Italianno, Moon Dance, Caveat, Cookie, Shadows Into Light, Indie Flower, Gloria Hallelujah, Handlee, Nothing You Could Do, Oooh Baby, Over the Rainbow, Grape Nuts, Annie Use Your Telescope
  - 日本語フォント: 解星デコール, 解星オプティ, デラゴシックワン, モッチーポップ, あおぼし, ZEN紅道, クレーOne, Yomogi, 油性マジック

## 3. アーキテクチャ

### 設計パターン
- **モジュール化アーキテクチャ**: 機能ごとに独立したモジュールに分割
- **状態管理**: 中央集約型の状態管理（stateManager.js）。単一の`editState`をあらゆる入力経路（UIコントロール、Canvasドラッグ、矢印キー、スクラブ入力）が共通の`updateState()`経由で更新し、状態変更リスナー（`requestRedraw`, `syncUIFromState`）が全ビューを追従させる
- **描画パイプライン**: プレビュー描画と最終出力描画の分離（immediate-mode。状態が変わるたびCanvasを毎回描き直す）
- **インタラクション層**: Canvas上のクリック選択・ドラッグ・スナップは、immediate-mode描画方式を変えずに「描画と同時に当たり判定用バウンディングボックスを記録する」という設計で実現している（詳細は5.12節以降）

### データフロー
```
ユーザー操作（UI操作 / Canvasドラッグ / 矢印キー / スクラブ入力）
  ↓
状態更新 (stateManager.js: updateState() / updateCustomTextLayer())
  ↓
状態変更リスナーへ通知（同一Tick内はqueueMicrotaskでまとめて1回）
  ├─ レイアウト計算 (layoutCalculator.js) → 描画処理 (canvasRenderer.js)
  │     ├─ 背景描画 (backgroundRenderer.js)
  │     ├─ フレーム加工 (frameRenderer.js)
  │     ├─ テキスト描画 (textRenderer.js)
  │     └─ 当たり判定の登録・選択枠/スナップガイドの描画 (interaction/interactionRegistry.js, guideStore.js)
  └─ UIの数値欄・スライダーの同期 (uiController.js: syncUIFromState())
  ↓
プレビュー更新 / 最終出力
```

### 3.1 UIシェル構成（アイコンレール + フライアウトパネル + キャンバスエリア）

Canvaのエディタ画面を参考に、`index.html`の全体レイアウトを次の3カラム構成にしている（`.app-shell`、`style.css`）。データフロー・状態管理には影響しない、純粋なUI/DOM構成の話である。

```
.app-header（薄いグラデーションの上部バー。ブランド表示・Undo/Redo・ダウンロードボタン）
.app-shell（残り高さいっぱいに広がる横並び3カラム）
  ├─ .tab-navigation（左の細いアイコンレール、幅84px。6カテゴリ + 下部に「情報」ボタン）
  ├─ .tab-content-area（レール項目に対応するフライアウトパネル、幅360px。中身は7.節の各fieldset）
  └─ .canvas-area（残り全幅。画像読み込みUI・プレビューCanvas・Exifフローティングカード）
```

- **タブ切り替えの仕組みは変更していない**: `tabManager.js`は従来通り`.tab-button`（`data-tab`属性を持つ）のクリックで`.tab-pane`の`active`クラスを付け替えるだけで、6カテゴリのレール項目には引き続き`.tab-button`クラスと`data-tab`属性が付いている。見た目（縦長のアイコン+ラベルのレール）はCSSのみで実現している。
- **`.rail-item`と`.tab-button`の使い分け（重要）**: レール上のボタンの「見た目」用CSSクラスは`.rail-item`である。6カテゴリのボタンには視覚用の`.rail-item`と動作用の`.tab-button`の両方を付与するが、アイコンレール最下部の「情報」ボタン（`#exifToggleButton`）には**`.tab-button`を意図的に付与しない**。`tabManager.js`は`.tab-button`を全件取得して「クリックされたもの以外は非アクティブ化」する実装のため、もし「情報」ボタンに`.tab-button`を付けてしまうと、クリック時に他の6カテゴリのアクティブ状態・表示中パネルまで巻き込みで消えてしまう（実際に発生した設計上の注意点）。
- **Exif情報表示の位置づけ**: Exif情報は「編集する設定」ではなく「参照するだけの読み取り専用情報」であるため、他の6カテゴリと同列のフライアウトパネルにはせず、独立したフローティングカード（`#exifFloatCard`、`.exif-float-card`）としている。開閉は`#exifToggleButton`のクリックで`.open`クラスをトグルするだけの単純な仕組みで、`main.js`内で`tabManager.js`とは完全に独立して配線している（`selectionStore`やeditStateの状態変更とは無関係）。中身（`#exifDataContainer`）への実際の描画は従来通り`exifHandler.js`の`displayExifInfo()`が担う。
- **ダウンロードボタンの移設**: 以前は「出力」タブ内にあった`#downloadButton`を上部バーへ移設した（Canvaの「共有/ダウンロード」ボタンのように、書き出しをタブに埋もれさせず常時アクセス可能にする意図）。id・イベント配線（`main.js`の`uiElements.downloadButton.addEventListener('click', handleDownload)`）は変更していないため、`fileManager.js`側の実装への影響はない。

## 4. ファイル構造

```
Kakomi/
├── index.html              # メインHTMLファイル
├── style.css               # スタイルシート
├── spec.md                  # 技術仕様書（本ファイル）
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
    ├── interaction/        # Canvas上のドラッグ操作・選択状態・スナップを扱う
    │   ├── interactionRegistry.js  # 描画済みオブジェクトの当たり判定用バウンディングボックス帳簿（回転対応）
    │   ├── selectionStore.js       # 選択中オブジェクトID（editStateとは別管理の一時的UI状態）
    │   ├── guideStore.js           # ドラッグ中に表示するスナップガイド線の一時状態
    │   ├── textHandleStore.js      # 選択中テキストの拡大・回転ハンドルの画面上座標の一時状態
    │   ├── snapEngine.js           # スナップ（吸着）位置の計算
    │   ├── canvasInteraction.js    # pointerイベント処理・ドラッグ状態機械・矢印キーnudge・拡大回転ハンドル操作・写真クロップハンドル操作・ホイール操作
    │   ├── photoCropStore.js       # 選択中の写真のクロップ矩形の四隅ハンドル座標（一時的なUI状態）
    │   └── adapters/
    │       ├── textAdapter.js        # 自由テキストレイヤーの値変換（位置・サイズ・回転）
    │       ├── photoAdapter.js       # 写真の枠内配置の値変換
    │       └── backgroundAdapter.js  # 拡大ぼかし背景の位置の値変換
    ├── ui/
    │   ├── scrubInput.js   # ドラッグでスクラブ／クリックでタイプ入力できる数値入力コンポーネント
    │   └── colorSwatches.js # カラーピッカーの直下にカラー履歴スウォッチ行を追加する機能拡張
    ├── presets/
    │   ├── presetStore.js       # 編集設定のプリセット保存・一覧・削除・適用（localStorage）
    │   └── colorHistoryStore.js # カラーピッカーで選んだ色の履歴（localStorage、全ピッカー共通）
    └── utils/
        ├── canvasUtils.js  # Canvas操作ユーティリティ
        └── geometry.js     # 回転を伴う当たり判定・ハンドル配置用の幾何ヘルパー（rotatePoint）
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
    customTexts: [                    // 自由テキストレイヤー（可変長の配列。個数の制限なし）
      { id, enabled, text, textAlign, font, size, color, opacity, position, offsetX, offsetY, rotation }
      // ...ユーザーが「+ テキストを追加」で追加した分だけ要素が増える
      // rotation: 度数。拡大・回転ハンドル（7.5節）またはパネルの数値入力で操作する
    ]
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
- `updateState(updates, options)`: 状態を更新（ディープマージ）。`options.silent`が`true`の場合はリスナーへの通知を行わない（後述）
- `setImage(img, exifData, fileName)`: 新しい画像を設定
- `addStateChangeListener(listener)` / `removeStateChangeListener(listener)`: 状態変更リスナーの登録／解除
- `addCustomTextLayer()`: 自由テキストレイヤーを1つ追加し、そのidを返す
- `removeCustomTextLayer(id)`: 指定idの自由テキストレイヤーを削除
- `updateCustomTextLayer(id, changes)`: 指定idの自由テキストレイヤーのプロパティを部分更新

**`EDITABLE_SETTINGS_KEYS`（エクスポートされる定数配列）:**
`editState`のうち「ユーザーが調整する編集設定」に該当するキーの一覧（`photoViewParams`, `outputTargetAspectRatioString`, `baseMarginPercent`, `backgroundColor`, `backgroundType`, `imageBlurBackgroundParams`, `frameSettings`, `textSettings`, `outputSettings`, `cropSettings`）。画像そのもの（`image`, `exifData`, `originalFileName`）やレイアウト計算の派生データ（`photoDrawConfig`, `outputCanvasConfig`）は含まない。`history/historyManager.js`のUndo/Redo対象範囲と`presets/presetStore.js`のプリセット保存範囲が、この一つの定義を共有している。

**状態変更通知のバッチ化と`silent`オプション（設計上の注記）:**
- `notifyStateChange()`は同期即時実行ではなく、`queueMicrotask()`で同一Tick内の複数回呼び出しを1回にまとめてから発火する。これにより、Canvasドラッグ中に高頻度で発生する`updateState`呼び出しでも、実際の再描画・UI同期はTickごとに1回に自然に間引かれる。
- `main.js`の`requestRedraw()`は、レイアウト計算結果（`photoDrawConfig`/`outputCanvasConfig`）を`updateState(..., { silent: true })`で書き戻している。これは「派生データの書き戻し」であり、もし通常の（silentでない）`updateState`として呼び出しリスナーに`requestRedraw`自体が登録されていると、`updateState → 通知 → requestRedraw → updateState → …`という無限ループになるため。
- `customTexts`は配列のため、`updateState()`の汎用ディープマージ（配列は丸ごと置換される仕様）では個々のレイヤーだけを安全に部分更新できない。そのため`updateCustomTextLayer(id, changes)`という専用関数を別途用意している。

### 5.3 uiController.js
UI要素の制御とイベントハンドリングを担当します。

**主要機能:**
- UI要素の参照管理（`uiElements`オブジェクト）
- 状態からUIへの同期（`initializeUIFromState()`）
- UI変更から状態への同期（`setupEventListeners()`）
- フォント選択リストの生成
- Exifカスタムテキストの更新
- 文字レイヤー（撮影日・Exif情報・自由テキスト）のチップ一覧・設定パネルの動的生成（`renderTextLayersList()`, `renderTextLayerSettingsPanel()`。詳細は下記）
- 状態変更リスナーとしての同期処理（`syncUIFromState(state)`をエクスポートし、`main.js`から`addStateChangeListener`で登録している）

**イベント処理:**
- レイアウト設定（アスペクト比、余白、写真位置）
- 背景設定（タイプ、色、ぼかしパラメータ）
- フレーム設定（角スタイル、影、縁取り。値の読み書きロジックは変更していないが、開閉表現は下記の通りCSSアニメーションに変更）
- テキスト設定（撮影日・Exif情報・自由テキストレイヤーの追加/削除/個別設定。下記「文字レイヤーの統一UI」参照）
- 出力設定（JPEG品質）

**文字レイヤーの統一UI（撮影日・Exif情報・自由テキスト）:**
以前は撮影日／Exif情報／自由テキストがそれぞれ独立した`<fieldset>`と専用のUI・イベント配線を持っていたが、これを1つのチップリスト＋1つの設定パネルに統合した。**データモデル（`stateManager.js`の`textSettings.date`/`.exif`/`.customTexts[]`という構造）自体は変更していない**。もともと`textRenderer.js`の描画（`drawSingleText()`）と`textAdapter.js`のドラッグ処理は3種類を共通の仕組みで扱っていたため、今回はUI層だけをそれに合わせて統合した形になる。

- `FIXED_TEXT_LAYERS`（`uiController.js`内の定数）が撮影日(`'text-date'`)・Exif情報(`'text-exif'`)の固定チップを定義し、`resolveTextLayer(state, id)`がid（固定id、または`customTexts[]`内のuuid）から`{ settings, kind }`（`kind`は`'date'|'exif'|'custom'`）を解決する。値の書き戻しは`applyTextLayerChanges(id, kind, changes)`が`kind`に応じて`updateState()`（撮影日・Exif）または`updateCustomTextLayer()`（自由テキスト）に振り分ける（`textAdapter.js`の`resolveLayer()`/`applyChanges()`と同じ設計）
- レイヤー一覧はチップ表示（`#textLayersList`）。先頭に撮影日・Exif情報の固定チップ（削除不可、有効/無効はチップの薄さで表現）、続けて自由テキストの動的チップ（クリックで選択、×ボタンで削除）が並ぶ。「+ テキストを追加」ボタン（`#addCustomTextButton`）は末尾
- 選択中レイヤーの設定パネル（`#textLayerSettingsPanel`）は`renderTextLayerSettingsPanel()`が選択変更のたびにHTML文字列で丸ごと再構築する。共通フィールド（表示する/フォント/サイズ/文字色/透過度/表示位置アンカー＋オフセットX・Y/回転）は3種類共通で常に表示し、種類固有の部分だけを切り替える（撮影日=書式プリセット＋自由入力、Exif=表示項目の選択・並び替えUI、自由テキスト=テキストエリア）。撮影日には水平配置（textAlign）の概念がないため、その行は表示しない（7.5節参照）
- **表示位置アンカーの拡張**: 統合前は撮影日・Exifが上下×左右の6点、自由テキストには表示位置アンカーのUI自体が存在しなかった（オフセットのみで擬似的に表現）。統合にあたり3種類とも中央行を含む9点（`top/middle/bottom` × `left/center/right`）から選べるように揃えた。`textRenderer.js`の`calculateTextPosition()`はもともと9点すべてに対応済みだったため、レンダラー側の変更は不要だった
- Canvasドラッグ中の座標欄（横位置/縦位置）・拡大ハンドル/回転ハンドル操作中のサイズ・回転角の値だけは、`syncTextLayerLiveInputs(state)`が軽量に`.value`のみ更新し、パネル全体は再構築しない（入力中のフォーカスを奪わないため。`main.js`の状態変更リスナー経由で`syncUIFromState()`→`syncTextLayerLiveInputs()`と呼ばれる）
- 横位置/縦位置/回転の数値欄は`js/ui/scrubInput.js`の`enhanceAsScrubInput()`で拡張されており、ドラッグでスクラブ、クリックでタイプ入力ができる
- Exif表示項目の「利用可能な項目」「使用する項目」リスト（`renderExifItemsUI()`）は、選択中レイヤーがExifのときだけ`renderTextLayerSettingsPanel()`が生成するコンテナ（`#textLayerExifAvailableList`/`#textLayerExifUsedList`/`#textLayerExifPreview`）に対して動的に`document.getElementById()`で対象を取得する（`uiElements`オブジェクトには含めない。パネルごと再構築されるため、モジュール読み込み時に一度だけ取得する`uiElements`の設計とは相容れないため）

**フレーム加工パネルの開閉表現:**
角丸/超楕円のパラメータ行・影/縁取りの詳細設定は、以前は`style.display = 'none'/''`による即時の表示切り替えだったが、CSSの`grid-template-rows`トランジション（`.accordion`/`.accordion.open`、`style.css`）による滑らかな開閉に変更した。`updateFrameSettingsVisibility()`はこれに合わせて対象要素への`classList.toggle('open', ...)`に変更しているが、値の読み書きロジック自体（`addOptionChangeListener`等）は変更していない。

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
- `getLastPreviewContext()`: 直近の`drawPreview`呼び出し時点でのプレビュー⇔出力解像度の変換情報（`{ scale, photoShortSidePx }`）を返す。`canvasInteraction.js`がドラッグ量の単位変換に使用する

**描画順序（`drawPreview`。`renderFinal`は8・9を除く1〜7のみ）:**
1. 背景描画（拡大ぼかし背景の場合、当たり判定用に背景の矩形を`interactionRegistry`へ登録）
2. ドロップシャドウ（有効な場合）
3. 写真の当たり判定用矩形を`interactionRegistry`へ登録
4. クリッピングパス設定（角丸/超楕円）
5. 写真本体描画
6. インナーシャドウ（有効な場合）
7. 縁取り（有効な場合）
8. テキスト描画（`customTexts`の各レイヤーは、描画と同時に当たり判定用の矩形を`interactionRegistry`へ登録）
9. **プレビューのみ**: 選択中オブジェクトのハイライト枠（回転している場合はボックス中心を軸に回転させて描画）、選択中がテキストレイヤーの場合は拡大・回転ハンドル、ドラッグ中のスナップガイド線を描画（出力画像には含まれない）

`interactionRegistry`は`drawPreview`が呼ばれるたびに`clear()`されてから再構築される。immediate-mode描画（毎回全部描き直す）方式を変えずに当たり判定を持たせるための設計。詳細は5.12節以降を参照。

**拡大・回転ハンドルの描画（`drawTextHandles`）:** 選択中オブジェクトが`type === 'text'`の場合のみ、ボックス右下角に拡大ハンドル（四角）、ボックス上端中央から少し離れた位置に回転ハンドル（丸、接続線付き）を描画する。回転時はハンドルもボックスと一緒に回転させて描く。同時に、その画面上の座標（回転適用後）を`interaction/textHandleStore.js`に記録し、`canvasInteraction.js`がポインタ操作時の当たり判定に使う。詳細は5.22節参照。

**写真選択中のクロップオーバーレイ描画（`drawCropOverlay`。5.24節参照）:** 選択中オブジェクトが写真（`getSelectedId() === 'photo'`）の場合、通常のフレーム装飾（角丸・影・縁取り）の代わりにこちらを描画する。Lightroom風に、クロップ範囲外（ズーム1.0相当で見えるはずの周辺部分）を暗くマスクしつつ、実際のクロップ矩形は通常表示＋四隅ハンドル付きで描く。

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
- `drawText(ctx, currentState, canvasWidth, canvasHeight, basePhotoShortSideForTextPx)`: テキストを描画。`date`/`exif`/`customTexts[]`の各レイヤーをループして描画し、`customTexts`のうち実際に描画したレイヤーについては`{ id, type: 'text', x, y, width, height, rotation }`という当たり判定用バウンディングボックスの配列を返す（`canvasRenderer.js`がこれを`interactionRegistry`へ登録する）
- `loadSingleGoogleFont(fontApiName)`: Google Fontを読み込む
- `drawSingleText(ctx, settings, textToDraw, fontObject, basePhotoShortSidePx, canvasWidth, canvasHeight)`: 単一テキストブロックを描画し、描画した矩形（左上原点の`{x, y, width, height, rotation}`）を返す
- `calculateTextPosition(...)`: テキスト位置を計算
- `getFormattedDate(exifDateTimeString, displayFormat)`: Exif日時をフォーマット

**回転（`customTexts[]`の`rotation`、度数）:** `settings.rotation`が非0の場合、描画前に（バウンディングボックスの中心を軸に）`ctx.translate`＋`ctx.rotate`＋`ctx.translate`で座標系を回転させてから`fillText`する。バウンディングボックス自体は「回転前のローカル座標」のまま返す（`x, y, width, height`は無回転の値）。回転適用の有無や当たり判定・ハンドル描画への影響は5.12節・5.22節を参照。`date`/`exif`には`rotation`の概念はなく、`customTexts[]`のみ対応する。

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
- `decodeExifString(value)`: Make/Model/LensModelなどASCII型Exif文字列の文字化け対策ヘルパー。2段階の処理を行う。
  1. **NULパディングの除去**（実際に確認された原因）: Exif規格上、ASCII型フィールドは固定バイト長で、実際の文字列の後にNUL終端＋NULパディングが続く（例: カメラによっては`"CampSnap"`を32バイト枠に格納する際、後ろに`\x00`が22個続く）。piexif.jsはこの固定長バイト列をそのままJS文字列化して返すため、末尾のNUL文字群を含んだまま表示すると制御文字が可視化され、「メーカー名の後に特殊文字が混ざったような文字化け」に見える。最初のNUL文字（コードポイント U+0000）以降を切り捨てて対処する
  2. **UTF-8をLatin-1として誤読した文字化けの復元**（保険的な対策）: 上記のフィールドは規格上ASCIIのはずだが、非ASCII文字（日本語のメーカー名・レンズ名など）をUTF-8で書き込むカメラ・ソフトウェアも存在しうる。piexif.jsはバイト列を1バイトずつそのままJS文字コードにマッピングするだけで、マルチバイトのUTF-8シーケンスを再デコードしないため、そのようなデータでは文字化けする。`escape()`で「1バイト=1文字」の文字列に戻してから`decodeURIComponent()`でUTF-8として再解釈することで復元する（純粋なASCII文字列には実質的に影響しない安全な変換で、UTF-8として解釈できない場合はNUL除去のみ済ませた文字列を返す）

  `formatExifForDisplay()`（Exif情報パネル）と`uiController.js`の`getExifValue()`（テキストオーバーレイのExif表示、7.5節参照）の両方でMake/Model/LensModelに適用している

**対応Exifタグ:**
- Make（メーカー名）
- Model（機種名）
- DateTime（撮影日時）
- FNumber（F値）
- ExposureTime（シャッタースピード）
- ISOSpeedRatings（ISO感度）
- FocalLength（焦点距離）
- LensModel（レンズ情報）
- ExposureBiasValue（露出補正。テキストオーバーレイのExif表示、7.5節参照）

### 5.11 utils/canvasUtils.js
Canvas操作のユーティリティ関数を提供します。

**主要関数:**
- `drawImageWithPrecision(ctx, img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)`: 高品質な画像描画（整数座標）
- `canvasToJpegBlob(canvas, quality)`: CanvasをJPEG Blobに変換
- `blobToDataURL(blob)`: BlobをDataURLに変換
- `dataURLToBlob(dataURL)`: DataURLをBlobに変換
- `fitCanvasToContainer(canvas, targetAspectRatio)`: Canvasサイズをコンテナに合わせる

### 5.12 interaction/interactionRegistry.js
直近の`drawPreview`呼び出しで描画されたインタラクティブなオブジェクト（写真・拡大ぼかし背景・自由テキストレイヤー）のバウンディングボックスを記録する帳簿。

**主要関数:**
- `clear()`: 帳簿を空にする（`drawPreview`の冒頭で呼ばれる）
- `register(entry)`: `{ id, type, x, y, width, height, rotation? }`形式の矩形を1件登録する（描画順=z順に積むこと）。`rotation`（度）は自由テキストレイヤーのみ持ちうる（写真・背景は常に無回転）
- `hitTest(px, py)`: 指定座標にヒットする最前面のオブジェクトを返す（登録順の後ろから走査するため、後から描画＝上に重なっているものが優先される）。`entry.rotation`が非0の場合、クリック座標をボックス中心を軸に`-rotation`だけ逆回転させてから通常のAABB判定を行う（`utils/geometry.js`の`rotatePoint()`を使用）。これにより、ボックス自体は常に「回転前のローカル座標」を保持したまま、見た目上回転した矩形への当たり判定が成立する
- `getById(id)`: idからバウンディングボックスを取得
- `getAll()`: 登録済みの全オブジェクトを返す（スナップ判定に使用）

immediate-mode描画（毎回全部描き直す）という既存の設計を変えずに当たり判定を持たせるため、「描画するたびに帳簿を作り直す」という運用にしている。

### 5.13 interaction/selectionStore.js
「今どのオブジェクトを選択しているか」という一時的なUI状態を保持する、`editState`とは意図的に分離された小さなストア。選択状態は書き出しファイルの内容にもプリセット保存にもUndo/Redoの対象にも含めるべきではないため。

**主要関数:**
- `setSelectedId(id)` / `getSelectedId()`: 選択中オブジェクトIDの設定・取得
- `onSelectionChange(fn)`: 選択変更時に呼ばれるリスナーを登録（`uiController.js`がこれを購読し、選択中レイヤーの設定パネルを再描画する）
- `clearSelectionIfMatches(id)`: 指定idが選択中であれば選択解除する（レイヤー削除時に使用）

### 5.14 interaction/guideStore.js
ドラッグ中に表示するスナップガイド線の情報（`{ axis: 'x'|'y', value: number }`の配列）を一時的に保持する。`canvasInteraction.js`が書き込み、`canvasRenderer.js`の`drawPreview`が読み取ってプレビューにのみ描画する。

### 5.15 interaction/snapEngine.js
ドラッグ中のオブジェクトを、キャンバス中央線・キャンバス端・他オブジェクトの端/中央に吸着させるロジック。

**主要関数:**
- `computeSnapCorrection(candidateBox, canvasWidth, canvasHeight, otherBoxes)`: スナップ適用前の候補位置と、他の登録済みオブジェクトの矩形を受け取り、`{ dx, dy, guideLines }`（吸着のための補正量とガイド線情報）を返す

吸着の判定は、対象の左端/中央/右端（X軸）・上端/中央/下端（Y軸）それぞれについて、候補となるターゲット線（キャンバス端/中央、他オブジェクトの端/中央）との距離が閾値（6px）以内かどうかで行う。対象の種類（テキスト/写真/背景）を問わずバウンディングボックス同士の位置関係だけで判定するため、将来オブジェクトの種類が増えても変更不要。

### 5.16 interaction/canvasInteraction.js
`previewCanvas`上でのクリック選択・ドラッグ移動・矢印キーnudgeを扱う共通コントローラ。対象がテキストであろうと写真・背景であろうと同じロジックで処理できるよう、実際の値の読み書きは種類ごとのアダプタ（5.17節）に委譲している。

**主要関数:**
- `initCanvasInteraction(canvas)`: `previewCanvas`にpointerイベントとキーボードイベントを配線する。`main.js`からアプリ初期化時に一度だけ呼び出される

**操作仕様:**
- ドラッグ移動: `pointerdown`で`interactionRegistry.hitTest()`により対象を特定し選択、`pointermove`で移動量を計算して対応するアダプタの`commit()`を呼ぶ
- スナップ: ドラッグ中は既定でスナップが有効。**Altキーを押しながらドラッグするとスナップを一時的に無効化**できる
- 矢印キーnudge: 何かが選択されている状態で矢印キーを押すと1px相当、Shift+矢印キーで10px相当（いずれもプレビューcanvas上のpx単位）移動する。フォーカスが入力欄（input/textarea/select）にある間は無効化される
- **拡大・回転ハンドル（テキスト系オブジェクトのみ。自由テキスト・撮影日・Exifブロックいずれも対応）**: `pointerdown`時、通常のオブジェクト当たり判定（`interactionRegistry.hitTest()`）より先に`textHandleStore.getTextHandles()`のハンドル座標との距離判定を行う（当たり判定半径`HANDLE_HIT_RADIUS = 10px`）。ヒットした場合は`dragState.mode`を`'resize'`または`'rotate'`にしてドラッグを開始し、通常の移動ドラッグ（`mode: 'move'`）とは別処理で`textAdapter.commitResize()`/`commitRotate()`を直接呼ぶ（アダプタの`getValue`/`computeChanges`/`commit`という汎用インターフェースではなく、テキスト専用の`getTransform`/`commitResize`/`commitRotate`を使う。写真・背景にはこの概念がないため）
- **写真のクロップハンドル（四隅、オンキャンバス直接トリミング。5.24節参照）**: テキストの拡大ハンドルと同じパターンで、`pointerdown`時に`photoCropStore.getCropHandles()`の四隅座標との距離判定を通常のオブジェクト当たり判定より先に行う。ヒットした場合は`dragState.mode = 'cropResize'`にしてドラッグを開始し、`pointermove`で中心からの距離比（`scaleFactor`）を`photoAdapter.commitCropZoom()`に渡して`cropSettings.zoom`を更新する。写真本体（ハンドル以外の領域）のドラッグは、選択中かどうかに関わらず従来通り`photoAdapter`の`move`処理（`photoViewParams`更新）のまま変更していない
- **写真上でのホイール操作（余白調整）**: `previewCanvas`に`wheel`イベントリスナーを追加。`interactionRegistry.hitTest()`で写真上かどうかを判定し、写真上でなければ`preventDefault()`せずページの通常スクロールに委ねる。写真上であれば`preventDefault()`した上で`photoAdapter.commitMarginDelta()`を呼び、`baseMarginPercent`を1刻み（`MARGIN_WHEEL_STEP`）で増減する（上スクロールで写真を大きく＝余白を減らす、下スクロールで余白を増やす）
- **選択変更と再描画（設計上の注記）:** `selectionStore`の選択状態変更（`setSelectedId()`）自体は`editState`の変更ではないため、`stateManager.js`の通常の状態変更リスナー（`requestRedraw`等）を経由しない。ドラッグを伴わない純粋なクリック選択（`pointerdown`直後に一度も`pointermove`が発火しないケース）でも選択ハイライトやハンドルが即座に表示されるよう、`main.js`が`selectionStore.onSelectionChange(() => requestRedraw())`を明示的に登録している。
  - 拡大: ボックス中心からハンドルまでの距離の比（現在距離÷ドラッグ開始時距離）をドラッグ開始時点の`size`に掛ける。回転角に関わらず「ハンドルを中心から遠ざける/近づける」動作になる
  - 回転: ボックス中心から見たポインタの角度（`Math.atan2`）の変化量をドラッグ開始時点の`rotation`に加算する。**Shiftキーを押しながらドラッグすると15度刻みにスナップ**する

### 5.17 interaction/adapters/*.js
「ドラッグ量（プレビューpx）」と「各対象が実際に状態として持っている値の単位系」との変換を吸収する層。`canvasInteraction.js`は対象の種類を意識せず、共通インターフェース（`getValue`, `computeChanges`, `commit`）越しに扱う。

| アダプタ | 対象 | 値の単位系 | 備考 |
|---|---|---|---|
| `textAdapter.js` | `customTexts[]`の各レイヤー、および撮影日・Exifブロック（固定id `'text-date'`/`'text-exif'`） | 写真短辺基準の% | `customTexts[]`は`updateCustomTextLayer()`、撮影日・Exifは`updateState({ textSettings: { date/exif: changes } })`と、idに応じて内部で経路を振り分ける（`resolveLayer()`ヘルパー） |
| `photoAdapter.js` | 写真の枠内配置（`photoViewParams`） | 可動範囲(movable width/height)に対する0.0〜1.0の割合 | `layoutCalculator.js`の可動範囲計算と対応させる必要があり、`getLastPreviewContext().scale`を使った変換が必要。加えて、オンキャンバス直接トリミング用に`getCropTransform()`/`commitCropZoom()`（四隅ハンドル用、`cropSettings.zoom`を操作）と`commitMarginDelta()`（写真上でのホイール用、`baseMarginPercent`を操作）を持つ（5.16節参照。通常の`getValue`/`computeChanges`/`commit`とは別の、`textAdapter`の`getTransform`/`commitResize`/`commitRotate`と同種の拡張） |
| `backgroundAdapter.js` | 拡大ぼかし背景の位置（`imageBlurBackgroundParams`） | 写真短辺基準の%（textAdapterと同じ単位系） | 単色背景（`backgroundType === 'color'`）の場合はそもそも`interactionRegistry`に登録されないため、ドラッグ対象にならない |

**単位変換上の注意（重要）:** `getLastPreviewContext()`が返す`photoShortSidePx`は、写真の実解像度ではなく**プレビュー描画時に縮小された後の短辺px**を指す。ドラッグのポインタ移動量（`dxPx`/`dyPx`）も同じプレビューcanvasのpx空間の値であるため、`textAdapter`や`backgroundAdapter`ではscaleによる再変換は不要で、単純な比率計算（`dxPx / photoShortSidePx * 100`）だけで正しく変換できる。過去にここへ誤って`/ scale`を追加してしまい、プレビューの縮小率次第でドラッグ量が数倍に増幅される不具合が発生したことがあるため、新しいアダプタを追加する際は注意すること。

**桁あふれ対策の丸め処理（重要）:** `textAdapter.js`・`backgroundAdapter.js`の`computeChanges()`は、割り算由来の循環小数（例: `-11.640211640211641`）をそのまま状態に書き戻さないよう、結果を必ず0.1%単位に丸める（`Math.round(value * 10) / 10`）。ドラッグ中継続的に加算されていく値のため丸めを怠ると、UIの数値表示欄が有効数字ギリギリまで表示されて桁あふれを起こす（実際に発生した不具合）。この`computeChanges()`はドラッグだけでなく矢印キーnudgeからも呼ばれるため、丸めは両方の経路に効く。`uiController.js`側の対応する表示スパン（`bgOffsetX/YValueSpan`、`textDateOffsetX/YValueSpan`、`textExifOffsetX/YValueSpan`）も`.toFixed(1)`で表示桁を明示的に制限し、二重に防御している。

**`textAdapter.js`の拡張（拡大・回転ハンドル用）:** 通常の`getValue`/`computeChanges`/`commit`（位置移動用）に加えて、以下を持つ。
- `getTransform(id)`: ドラッグ開始時点の`{ size, rotation }`を取得（`resolveLayer()`経由で撮影日・Exifにも対応）
- `commitResize(id, startSize, scaleFactor)`: `startSize * scaleFactor`をクランプして`size`に反映。クランプ範囲は対象によって異なるスライダー範囲に合わせる（`getSizeConfigKey(id)`が`'text-date'`→`textDateSize`、`'text-exif'`→`textExifSize`、それ以外（自由テキスト）→`textFreeSize`という`controlsConfig`のキーを選択する）
- `commitRotate(id, newRotationDeg)`: `rotation`に反映（0.1度単位に丸め）
- 上記2つの書き戻しは、`commit()`と同様に`applyChanges(id, changes)`ヘルパーが`FIXED_TEXT_IDS`を見て`updateState()`（撮影日・Exif）と`updateCustomTextLayer()`（自由テキスト）に振り分ける

### 5.18 ui/scrubInput.js
`<input type="number">`を「ドラッグしてスクラブ」「クリックしてタイプ入力」の両方に対応させる軽量な機能拡張。Figma/After Effects等にある数値入力の挙動を、素のPointer Eventsだけで再現している（外部ライブラリ不要）。

**主要関数:**
- `enhanceAsScrubInput(inputEl, { sensitivity, precision, onChange })`: 指定した数値入力要素を拡張する
  - フォーカスされていない状態で押してドラッグ → 値が連続的に変化（スクラブ）
  - 押してすぐ離す（ドラッグしなかった）→ 通常のテキスト入力にフォーカスして選択状態にする
  - フォーカス中の直接クリックはスクラブを起動しない（タイプ入力を優先）

### 5.19 presets/presetStore.js
編集設定（`stateManager.js`の`EDITABLE_SETTINGS_KEYS`で定義される範囲）を、名前付きプリセットとして`localStorage`（キー: `kakomi_presets`）に保存・一覧取得・削除・適用するモジュール。読み込んだ画像そのものは対象外。`textSettings`（`customTexts`配列を含む）もそのまま保存するため、自由テキストの内容・個数もプリセットの一部として保存・復元される。

**主要関数:**
- `getPresets()`: 保存済みプリセットの一覧を取得（`{ id, name, createdAt, settings }`の配列）
- `savePreset(name)`: 現在の編集設定を新しいプリセットとして保存し、保存されたプリセットを返す（`localStorage`書き込み失敗時は`null`）
- `deletePreset(id)`: 指定idのプリセットを削除
- `applyPreset(id)`: 指定idのプリセットを`updateState()`経由で現在の編集状態に適用する

**UI連携（`uiController.js`）:** 「プリセット」タブに保存フォームと一覧を表示する。プリセット適用後は、`customTexts`配列の個数など非連続な変化が起こりうるため、Undo/Redoのスナップショット適用時と同様に`initializeUIFromState()`でUI全体を再構築する。

### 5.20 presets/colorHistoryStore.js
カラーピッカーで選んだ色の履歴（MRU順、最大12件）を`localStorage`（キー: `kakomi_colorHistory`）に保持するモジュール。背景色・影・縁取り・撮影日/Exif/自由テキストの文字色など、アプリ内の全カラーピッカーが共通の履歴を共有する。

**主要関数:**
- `getColorHistory()`: 履歴（先頭が最新）を取得
- `recordColor(hex)`: 色を履歴の先頭に記録する（既存の同じ色があれば先頭に移動し、重複させない）

### 5.21 ui/colorSwatches.js
`<input type="color">`の直後にカラー履歴のスウォッチ行を追加する機能拡張。スウォッチをクリックするとその色がピッカーに設定され、`input`/`change`イベントが発火するため、既存のイベントリスナー（状態更新・プレビュー再描画）がそのまま動作する。

**主要関数:**
- `attachColorHistory(inputEl)`: 指定した色入力要素にスウォッチ行を追加する。`.form-row-simple`（flexコンテナ）の直下ではなく、その行コンテナ自体の直後に独立した行として挿入する（`inputEl.closest('.form-row-simple')`で行コンテナを特定）
  - `change`イベントで確定した色を`colorHistoryStore.recordColor()`に記録し、画面上の全スウォッチ行（`textLayerSettingsPanel`のように毎回作り直されるものも含む）を再描画する
  - 再描画対象はモジュール内の`registry`で管理し、パネル再構築等でDOMから外れた行は次回更新時に自動的に間引かれる

### 5.22 interaction/textHandleStore.js
選択中の自由テキストレイヤーに表示する「拡大ハンドル」「回転ハンドル」の画面上の座標（回転適用後、previewCanvasのpx空間）を一時的に保持する、`guideStore.js`と同じ「描画側が書き、操作側が読む」パターンの小さなストア。`canvasRenderer.js`の`drawTextHandles()`が`drawPreview`のたびに書き込み、`canvasInteraction.js`の`pointerdown`がハンドルへの当たり判定に読み取る。

**主要関数:**
- `setTextHandles(h)`: `{ id, center: {x,y}, resize: {x,y}, rotate: {x,y} }`を設定する
- `getTextHandles()`: 現在の値を取得する（未選択またはテキスト以外を選択中は`null`）
- `clearTextHandles()`: 値をクリアする（`drawPreview`の冒頭で`interactionRegistry.clear()`と合わせて呼ばれる）

### 5.23 utils/geometry.js
回転を伴う当たり判定・ハンドル配置で共通して使う、小さな幾何ヘルパー。

**主要関数:**
- `rotatePoint(x, y, cx, cy, angleDeg)`: 点`(x, y)`を中心`(cx, cy)`を軸に`angleDeg`度（時計回り、Canvas座標系）回転させた座標を返す。逆回転させたい場合は`-angleDeg`を渡す（`interactionRegistry.hitTest()`がクリック座標をローカル座標に戻す用途で使用）。`canvasRenderer.js`の`drawTextHandles()`はハンドルの画面上座標（回転適用後）を求めるのに使用する

### 5.24 interaction/photoCropStore.js
選択中の写真に表示する「オンキャンバス直接トリミング」オーバーレイ（Lightroom風。5.5節`drawCropOverlay`参照）の、クロップ矩形の四隅ハンドルの画面上の座標（previewCanvasのpx空間）を一時的に保持する。`textHandleStore.js`（5.22節）と同じ「描画側が書き、操作側が読む」パターンだが、写真のクロップ矩形は回転しないため回転ハンドルは持たない。

**主要関数:**
- `setCropHandles(h)`: `{ corners: { tl, tr, bl, br }, center: {x,y} }`を設定する（`canvasRenderer.js`の`drawCropOverlay()`が`drawPreview`のたびに書き込む）
- `getCropHandles()`: 現在の値を取得する（未選択または写真以外を選択中は`null`。`canvasInteraction.js`の`pointerdown`がハンドルへの当たり判定に読み取る）
- `clearCropHandles()`: 値をクリアする（`drawPreview`の冒頭で`interactionRegistry.clear()`等と合わせて呼ばれる）

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

### 6.3 インタラクティブ操作フロー（Canvasドラッグ／矢印キーnudge／数値スクラブ入力）
```
Canvasドラッグ / 矢印キーnudge / スクラブ入力によるタイプ入力
  ↓
interaction/adapters/*.js の computeChanges() で値を計算
  ↓
adapter.commit() → stateManager.updateState() または updateCustomTextLayer()
  ↓
notifyStateChange()（同一Tick内はqueueMicrotaskで1回にまとめられる）
  ↓
登録済みリスナーが呼ばれる
  ├─ main.requestRedraw()（Canvas再描画。photoDrawConfig等の書き戻しはsilent指定で再度の通知を起こさない）
  └─ uiController.syncUIFromState()（スライダー・数値欄の値を同期。フォーカス中の欄は上書きしない）
```
どの入力経路（スライダー・Canvasドラッグ・矢印キー・数値欄への直接入力）から状態が変更されても、`updateState`という単一の入口を通る限り、上記のリスナーを通じて他の全ビューが自動的に追従する。

### 6.4 ダウンロードフロー
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

### 7.1 構図調整（トリミング）

`cropSettings`として実装されており、「レイアウト設定」タブの「構図調整（トリミング）」フィールドセットからスライダー・数値入力で操作できる（出力アスペクト比と同じ、プリセットselect＋幅/高さ自由入力＋⇄反転ボタンのパターン）。

**設定項目:**
- **アスペクト比**: 元画像から切り出す部分のアスペクト比
  - `'original'`: 元画像の比率を使用（UI上は「元画像のまま」）
  - `'1:1'`, `'4:3'`, `'16:9'`など: 指定された比率で切り出し。プリセット（1:1, 4:3, 3:4, 16:9, 9:16）に加え、「カスタム」選択時は幅/高さの自由入力＋⇄反転ボタンで任意の比率を指定できる
- **拡大率（ズーム）**: 元画像の解像度を維持する範囲でのトリミング領域の調整
  - 範囲: 1.0〜5.0（1.0で拡大なし、UIスライダーの上限。内部計算上は1.0以上であれば動作する）
  - 基準サイズ（ズーム1.0時点でアスペクト比に収まる最大の切り出し窓）を、指定したズーム倍率で均等に縮小する方式
- **位置調整（パン、offsetX/Y）**: ズームによって生まれた可動範囲内で、切り出し窓の位置を調整
  - 範囲: 0.0-1.0（0.5が中央）
  - X方向: 横方向の位置、Y方向: 縦方向の位置
  - **重要な設計上の注記**: 可動範囲は`元画像のサイズ - ズーム後の切り出し窓のサイズ`で決まるため、ズームするほどパンできる範囲が広がる。ズーム1.0かつアスペクト比が`'original'`（元画像と同じ比率）の場合は可動範囲が0になり、パンしても見た目は変化しない（切り出し窓がすでに原画像いっぱいのため）
  - 以前の実装では、パン位置を「ズーム前の基準窓内での位置」として決定してからズームで中心を縮小する方式だったため、`'original'`のようにズーム前の可動範囲が0のケースではズームインしてもパンが一切効かないという制約があった。現在の実装（`layoutCalculator.js`）はズーム後の可動範囲を基準にパン位置を計算するため、常に「ズームした分だけパンできる」という直感的な挙動になっている

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
  - スライダーでの調整に加え、**プレビュー上で写真を直接ドラッグしても位置を調整できる**（`interaction/adapters/photoAdapter.js`）。ドラッグ中はキャンバス中央線・端・他オブジェクトへのスナップも働く
  - **注意:** 仕様書v1では「9点から選択」とあるが、現在の実装では連続的な位置調整（スライダー・ドラッグの両方）となっている

**UI上のグルーピング（2026年8月のUI刷新で変更）:** 「出力フォーマット」（アスペクト比＋余白）を「レイアウト」フライアウトパネルの先頭に配置し、その下に「写真の配置」fieldsetとして「元画像から使う範囲」（7.1節の構図調整＝切り出し比率・ズーム・パン）と「枠内での配置」（本節の写真位置調整）をサブセクション見出し付きでまとめている。これは「まず出力の枠を決め、その中で写真を配置する」という操作順序をUI上でも表すためのグルーピング変更であり、`cropSettings`と`photoViewParams`という2つの状態・計算ロジック自体は従来のまま独立している（統合していない）。

**オンキャンバス直接トリミング（2026年8月27日実装）:** 写真本体ドラッグ（枠内配置）・写真の四隅ドラッグ（クロップズーム）・写真上でのホイール（余白調整）という3種類のジェスチャーで操作対象を切り分けることで、別モード/別ビューへの切り替えなしに実現している。詳細は5.16〜5.17節、11.1節参照。

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
- 拡大ぼかし背景が有効な場合、スライダーでの調整に加え、**プレビュー上で写真の外側（余白部分）を直接ドラッグしても位置を調整できる**（`interaction/adapters/backgroundAdapter.js`）。単色背景の場合は位置の概念がないためドラッグ対象にならない

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
撮影日、Exif情報、自由テキスト（`customTexts[]`）の各テキスト要素に対して以下を設定可能:

**UI構成（2026年8月のUI刷新で変更）:** 以前は撮影日・Exif情報・自由テキストがそれぞれ独立した`<fieldset>`を持っていたが、現在は1つのチップリスト（`#textLayersList`。先頭に撮影日・Exif情報の固定チップ、続けて自由テキストの動的チップ）＋1つの設定パネル（`#textLayerSettingsPanel`）に統合されている。設定できる項目自体（下記）はほぼ変わらないが、UI上は種類を問わず同じ場所・同じ並びで編集する。詳細は5.3節「文字レイヤーの統一UI」参照。

- **有効/無効**: チェックボックスで切り替え（統合後は「表示するかどうか」と「選択して中身を編集すること」が分離され、無効化されていても中身の編集は可能）
- **フォント**: Google Fontsから選択
- **サイズ**: 写真短辺に対する%（0.1-10%または0.1-50%）
- **色**: HEXカラーコード
- **不透明度**: 0-1
- **位置**: 上/中央/下 × 左/中央/右の9点から選択（アンカー）＋オフセットX/Y（%指定、アンカーからのさらなる微調整）
  - **注意（2026年8月のUI刷新で変更）:** 統合前は撮影日・Exifが6点（中央行なし）、自由テキストにはアンカー選択UI自体が存在しなかった（`position`の初期値`'middle-center'`をオフセットのみで擬似的にずらす形）。UI統合にあたり3種類とも9点から選べるよう揃えた。`textRenderer.js`の位置計算ロジックはもともと9点全てに対応済みだったため、レンダラー側の変更は不要だった。
- **水平方向の配置（textAlign）**: 左寄せ、中央、右寄せ
  - Exif情報、自由テキストにはこの配置ラジオボタンが存在する。
  - **撮影日表示にはこの配置コントロールが存在しない**（`textRenderer.js`側でも撮影日設定オブジェクトに`textAlign`が定義されていないため、位置指定文字列から自動的に左/中央/右寄せが決まる）。
- **プレビュー上でのドラッグ移動、拡大・回転**: 撮影日・Exif情報も自由テキストと全く同様に、プレビュー上で直接ドラッグして位置（オフセットX/Y）を移動でき、選択中は拡大ハンドル・回転ハンドルも表示される。`textRenderer.js`の`drawText()`が固定id（`'text-date'`, `'text-exif'`）を振って`interactionRegistry`に登録し、`textAdapter.js`がcustomTexts[]と同じ移動・拡大・回転ロジックで扱う（5.16・5.17節参照）。`rotation`フィールドを持ち、サイズの拡大範囲は自由テキスト（`textFreeSize`、最大50%）とは異なりそれぞれの表示位置設定と同じ範囲（`textDateSize`/`textExifSize`、最大10%）にクランプされる。オフセットX/Y・サイズのスライダー、回転の数値入力欄はいずれもドラッグ操作にも追従する（`document.activeElement`が別要素のときのみ値を上書き）

**撮影日表示**:
- ExifのDateTimeタグから取得
- **フォーマット**: `format`は自由な文字列で、`YYYY`/`YY`/`MM`/`DD`のトークンを組み合わせて指定する（`getFormattedDate()`が文字列置換で処理）。UIには8種類のプリセット（YYYY.MM.DD、YYYY/MM/DD、YY/MM/DD、YY.MM.DD、YYYY年MM月DD日、MM/DD/YYYY、DD/MM/YYYY、YYYY-MM-DD）を選ぶselectと、任意の書式を直接打てる自由入力欄が両方あり、常に同じ`format`値を指しているため相互に同期する（select選択→自由入力欄にも反映、自由入力→マッチするプリセットがあればselectもそれを指す、なければ「プリセットから選択...」に戻る）。出力アスペクト比（7.2節）と同じ「プリセット+自由入力」のUIパターン

**Exif情報表示**:
- **対応タグ**: Make（メーカー名）、Model（機種名）、LensModel（レンズ情報）、FNumber（F値）、ExposureTime（シャッタースピード）、ISOSpeedRatings（ISO感度）、FocalLength（焦点距離）、ExposureBiasValue（露出補正、例: `+0.3EV`）。定義は`uiDefinitions.js`の`exifTagDefinitions`配列（`{ key, label }`の並び）
- **表示項目の選択と並び替え**: `textSettings.exif.items`は「選んだタグのkeyを表示順に並べた配列」であり、この配列の並び順がそのまま出力テキストの並び順になる（以前は表示順が`uiController.js`内に別途ハードコードされた固定配列で決まっており、`items`の並びは無視されていた。これを修正し、`items`自体の並びを唯一の情報源にした）
  - UIは「利用可能な項目」（`exifTagDefinitions`のうちまだ`items`に含まれていないタグをチップ表示、クリックで`items`の末尾に追加）と「使用する項目」（現在の`items`を上から順に表示するリスト、各行に`⠿`のドラッグハンドルと`×`の削除ボタン）の2つの領域で構成される
  - 並び替えは`uiController.js`の`attachExifDragHandle()`が素のPointer Eventsで実装している。ドラッグ中はDOM上の行要素を直接並べ替えるだけで状態（`textSettings.exif.items`）へは書き込まず、`pointerup`時に最終的な並び順をまとめて一度だけ`updateState()`でコミットする。これは、ドラッグ中に`updateState()`のたびにリストを再構築すると、ドラッグ中の行のDOM要素自体が作り直されてポインタ操作が中断してしまうため（`interaction/canvasInteraction.js`の拡大・回転ハンドルとは異なる構成だが、「状態を書き換えるとDOMが壊れてドラッグが継続できなくなる」という同種の問題への対処という点で共通する設計判断）
  - 生成された表示テキストは読み取り専用のプレビュー欄（`#textLayerExifPreview`。選択中レイヤーがExifのときだけ動的に生成される。5.3節参照）に表示される。**以前あった「生成されたテキストを手動編集できるテキストエリア」は廃止した**（チェックボックスの状態を変えるたびに手動編集内容が丸ごと上書きされてしまう壊れた導線だったため、上記の並び替えUIに置き換えた）

**自由テキスト（`customTexts[]`）**:
- 個数の制限なく追加・削除できる（「文字」レール項目内の「+ テキストを追加」ボタン）
- 各レイヤーは独立した`id`を持ち、テキスト内容・フォント・サイズ・色・不透明度・位置を個別に設定できる
- 改行対応（\nで区切る）
- 新規追加時は初期文言「テキスト」でCanvas中央（`position: 'middle-center'`）に配置される
- **プレビュー上で直接ドラッグして位置を移動できる**（当たり判定・ドラッグ処理は5.12〜5.17節のインタラクション基盤による）。ドラッグ中はキャンバス中央線・端・写真・他のテキストレイヤーへのスナップが働き、Altキー押下でスナップを無効化できる
- 選択中は矢印キーで1px相当（Shift+矢印で10px相当）の微調整ができる
- 横位置/縦位置/回転の数値欄はドラッグでスクラブ、クリックでタイプ入力の両方に対応（`ui/scrubInput.js`）
- レイヤー一覧はチップ表示で、クリックで選択（プレビュー上での選択とも連動する）、×ボタンで削除できる
- **拡大・回転（`rotation`、度数）**: 選択中はプレビュー上に拡大ハンドル（右下角の四角）と回転ハンドル（上端中央から少し離れた丸）が表示され、ドラッグで直接操作できる（5.16・5.22節参照）。回転ハンドルはShiftキー併用で15度刻みにスナップする。設定パネルには数値入力欄もあり、ハンドルドラッグ中はこの数値欄・サイズスライダーもリアルタイムに追従する

### 7.6 出力設定
- **JPEG品質**: 1-100（スライダー、`jpgQuality`。「出力」フライアウトパネル内）
- **ダウンロードボタン**（`#downloadButton`）: **2026年8月のUI刷新で上部バーへ移設**。以前は「出力」タブ内にあったが、常時アクセスできるよう上部バーの右端（Undo/Redoの隣）に配置している（3.1節参照）。id・イベント配線は変更していない。
- **Exif保持**: `outputSettings.preserveExif` は状態として存在し（初期値 `true`）、`fileManager.js`の`handleDownload()`がこの値を見てExif埋め込みの要否を判定する。ただし、この設定値を切り替えるUIチェックボックス自体が存在せず、常に「保持する」設定のままダウンロードが行われる。

### 7.7 Exif情報表示
**2026年8月のUI刷新で変更:** 以前は右側に常設の「Exifセクション」があったが、現在はアイコンレール下部の「情報」ボタン（`#exifToggleButton`）をクリックしたときだけキャンバスエリア内に表示されるフローティングカード（`#exifFloatCard`）に変更されている（3.1節参照）。表示内容自体は変更していない:
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
- Pointer Events API（Canvas上のドラッグ操作・スクラブ数値入力に使用。マウス/タッチ/ペンを統一的に扱う）
- OffscreenCanvas（オプション、フォールバックあり）
- structuredClone（オプション、フォールバックあり）
- crypto.randomUUID（自由テキストレイヤーのid生成に使用。非対応環境向けのフォールバックあり）

## 10. パフォーマンス考慮事項

- 大きな画像ファイルの処理時のメモリ使用量
- プレビュー描画の頻度制御（デバウンス検討）
- フォント読み込みの非同期処理
- オフスクリーンCanvasの適切な使用

## 11. 今後の拡張可能性

### 11.1 インタラクション基盤の続き
- ✅ 構図調整（クロップのズーム・パン）の数値UI化（7.1節参照）
- ✅ テキストの拡大・回転ハンドル（5.22節参照。自由テキスト・撮影日・Exifブロックいずれも対応。photo/backgroundは対象外）
- ✅ **オンキャンバス直接トリミング（2026年8月27日実装、7.2節・5.16〜5.17節参照）**: 「写真の枠内配置ドラッグ」（既存、本体ドラッグ）と「クロップズーム」（新規、四隅ハンドルドラッグ）は、モード切り替えではなくジェスチャーの種類（本体/四隅ハンドル/ホイール）で操作対象を切り分けることで共存させている。写真上でのホイール操作による余白（`baseMarginPercent`）調整も同時に追加した。クロップ矩形自体のパン（`cropSettings.offsetX/Y`）は引き続き既存スライダーのみで操作する（on-canvasパンは未対応、11.5節参照）
- 自由テキストレイヤーの並び替え・複製
- 複数選択・一括移動
- タッチデバイスでの実機確認（Pointer Events自体は実装済みだが未検証）

### 11.2 編集効率まわり
- ✅ 編集履歴（Undo/Redo）機能（`history/historyManager.js`）
- ✅ 編集設定のテンプレートプリセット保存／呼び出し機能（`presets/presetStore.js`、`localStorage`）
- ✅ カラーパレットで選んだ色の履歴を残して次回素早く呼び出せる機能（`presets/colorHistoryStore.js`、`localStorage`）

### 11.3 出力・確認体験
- 出力前確認画面の強化（等倍/ズームでの確認）
- 出力フォーマットの選択肢追加（PNG等、透過が必要な用途向け）

### 11.4 スケール系（優先度低）
- 複数画像のバッチ処理
- より高度な画像フィルター
- レイヤーのグループ化・整列/分布ツール
- アニメーションGIF出力
- より多くのExifタグの対応（露出補正は対応済み。7.5節参照。GPS位置情報等は未対応）
- モバイル操作最適化（フリック・タップ操作、レスポンシブレイアウトの改善）

### 11.5 UI刷新の残タスク（2026年8月）
今回のUI刷新（3.1節・5.3節参照）で見送った・保留した項目:
- **文字レイヤーのデータモデル統合（見送り）**: 撮影日・Exif情報を自由テキストと同じ配列（`kind`フィールド付き）に統合しきる案も検討したが、既存ユーザーのlocalStorageプリセットの移行処理が必要になり範囲が広がるため、今回はUI層の統合（5.3節）に留めた。将来的にやる場合は`stateManager.js`・`textRenderer.js`・`textAdapter.js`・`presets/presetStore.js`への影響を要確認。
- **Exif情報フローティングカードの配置見直し**: 現状はアイコンレール下部の独立トグルボタンでの開閉（7.7節）。使用頻度が高いようであれば、キャンバス下部への常設化などへの格上げを検討の余地あり。
- **`frameBorderStyle`（破線）の扱い**: 7.4節で述べた通り、UIコントロール自体が無効化されたまま。今回のフレーム加工パネル刷新のタイミングで復活させるか完全に削除するかは未決定。
- **レスポンシブ（`@media max-width:1024px`以下）の実機確認未実施**: アイコンレールを横並びに戻すフォールバックは実装したが、タッチデバイス・狭幅ブラウザでの実機検証はまだ行っていない。

## 12. 仕様書v1との対応状況

### 12.1 実装済みの仕様

以下の仕様は仕様書v1の要求通りに実装されています：

- ✅ 単位系の定義（写真短辺基準の%指定）
- ✅ 構図調整機能（`cropSettings`として実装。「レイアウト設定」タブからUIで操作可能）
- ✅ 出力フォーマット設定（目標アスペクト比、基準余白）
- ✅ 背景編集（単色、拡大ぼかし。拡大ぼかしはドラッグでの位置調整にも対応）
- ✅ フレーム加工（角丸、超楕円、影、縁取り）
- ✅ テキストオーバーレイ（撮影日、Exif情報、自由テキスト。いずれもドラッグ移動に対応。自由テキストは複数レイヤー・拡大・回転にも対応）
- ✅ Exif情報の表示と再埋め込み
- ✅ 数値精度と丸め処理のポリシー（写真描画の厳格な整数化）
- ✅ レイアウト計算の詳細フロー
- ✅ ファイル名の命名規則（`_kakomi_framed.jpg`）
- ✅ アスペクト比のカスタム指定（出力目標アスペクト比の自由入力、幅/高さ数値入力＋⇄反転ボタン）
- ✅ 編集履歴（Undo/Redo）機能
- ✅ 編集設定のテンプレートプリセット保存／呼び出し機能
- ✅ カラーパレットで選んだ色の履歴機能
- ✅ テキストの拡大・回転ハンドル

### 12.2 実装が異なる仕様

以下の仕様は仕様書v1の要求と異なる実装となっています：

**背景編集のパラメータ範囲:**
- **拡大倍率**: 仕様書v1では1x-4x、実装では1.0-8.0倍
- **ぼかし強度**: 仕様書v1では0-15%、実装では0-50%
- **背景X/Yオフセット**: 仕様書v1では-50%～50%、実装では-500%～500%

**写真の配置方法:**
- **仕様書v1の要求**: 9点から選択（中央、上、下、左、右、左上、右上、左下、右下）
- **現在の実装**: 連続的な位置調整（スライダー、およびプレビュー上でのドラッグ。スナップにより中央や端への位置決めも可能）

**自由テキストの個数:**
- **仕様書v1の要求**: 自由テキスト2つ（固定枠）
- **現在の実装**: `customTexts[]`による可変長レイヤー（個数制限なし、追加/削除可能）

### 12.3 未実装の仕様

**未実装機能（11章の拡張案を参照）:**
- 自由テキストレイヤーの並び替え・複製、複数選択・一括移動（11.1節参照）
- タッチデバイスでの実機確認（11.1節参照）
