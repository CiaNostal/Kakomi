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
- 上部ヘッダーを、白→アクセントの淡いグラデーションの薄いバーに変更し、Undo/Redoボタンを配置（ダウンロードボタンは当初ここへ集約したが、後に「出力」タブ内へ戻した。7.6節・`docs/roadmap.md` E）
- 左サイドバーを「タブ横並び＋コンテンツ」から、Canvaを参考にした「細いアイコンレール＋選択時に開くフライアウトパネル＋広いキャンバスエリア」の3カラム構成に変更（3.1節）
- フレーム加工パネルを、素のラジオボタン/チェックボックスによる即時表示切り替えから、セグメントコントロール＋トグルスイッチ＋CSSアニメーションによる滑らかなアコーディオン開閉に変更
- 撮影日・Exif・自由テキストを1本の `textSettings.layers[]` に統合し、「＋ テキストを追加 → 内容（動的トークン含む）を組み立て → 追加」の順で作るワークフローに再設計（バケット4 / D-1・D-3。5.3節参照）
- Exif情報表示を、常設の別パネルから、アイコンレール下部の独立した「情報」トグルボタンで開閉するフローティングカードに変更（3.1節）。**さらに E-3（フェーズ5）で、他タブと並列の「情報」タブ（`#tab-info`）＋アイコン主体のミニマル表示に作り替えた**（3.1節・7.7節）

### 主な機能
- 写真の読み込み（ファイル選択またはドラッグ&ドロップ）
- 構図調整（アスペクト比、拡大率、位置調整）
- レイアウト設定（出力アスペクト比、余白、写真位置調整）
- 背景編集（単色背景、拡大ぼかし背景、別画像背景）
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

### アクセス解析（Cloudflare Web Analytics）
- `index.html` の `<head>`（piexif.js の直後）に Cloudflare Web Analytics のビーコンを埋め込んでいる。
  - `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "…"}'>`
  - 目的: GitHub Pages で公開したページの「いつ・どれくらいアクセスがあったか」の把握のみ。
  - Cookie・localStorage・フィンガープリントを使わず、個人を追跡する ID も持たない（同意バナー不要）。
    Google Analytics を避けたのは「重い・個人情報寄り・オーバースペック」という判断（`docs/session-log-2026-08-29-8.md`）。
  - 計測は JS ビーコン方式のため、広告／トラッカーブロッカーや JS 無効の環境では計上されず、実数より少なめに出る。
  - ビーコンは設定ホスト名（`cianostal.github.io`）からの POST のみ受け付ける。ローカル開発（`localhost:8420`）では
    `https://cloudflareinsights.com/cdn-cgi/rum` への POST が CORS で弾かれ、コンソールに CORS エラーが 2 行出るが、
    これは本番ドメインでは発生しない既知の想定内挙動。アプリ本体の動作には影響しない。

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

`index.html`の全体レイアウトは次の3カラム構成（`.app-shell`、`style.css`）。**2026年8月のフェーズ4で Adobe Lightroom Web を参照したシェル刷新を行った**（`docs/roadmap.md` E-1〜E-5・A-8、`docs/session-log-2026-08-27-5.md`）。データフロー・状態管理には影響しない、純粋なUI/DOM構成の話である。

```
.app-header（上部バー。ブランド表示・「画像を開く」ボタン・Undo/Redo・右端に「ダウンロード」ボタン＋画質ポップオーバー）
.app-shell（残り高さいっぱいに広がる横並び3カラム。パネルを畳むと .panel-collapsed が付く）
  ├─ .tab-navigation（左の細いアイコンレール、幅84px。上部にレイアウト／背景／フレーム／テキスト、
  │                    rail-spacer をはさんで下部にプリセット／情報。全6ボタンが対等なタブ）
  ├─ .tab-content-area（レール項目に対応するフライアウトパネル、幅360px ⇔ 0。中身は7.節の各fieldset）
  └─ .canvas-area（残り全幅。プレビューCanvas ＋ 未読込時のドロップダイアログ。ドロップ受付はこの領域全体）
```

- **タブ再クリックでパネルが出入りする（フェーズ4 E-1）**: `tabManager.js`は`.tab-button`（`data-tab`属性）のクリックで`.tab-pane`の`active`クラスを付け替える。加えて、**アクティブなタブをもう一度クリックすると`.app-shell`に`.panel-collapsed`を付けてパネル幅を 0 に畳む**（CSS トランジション。キャンバスが広がる）。別のタブを押すと`.panel-collapsed`を外して開き直す。畳まれている間は`.tab-button.active`が無いので`getActiveTab()`は`null`を返す（タブ別ドラッグは「開いているタブ」なしとして扱う＝写真ドラッグ＝枠内配置）。`onTabChange`コールバックは、畳むときは引数`null`で呼ばれる。初期表示はレイアウトのパネルが開いた状態。
- **アプリシェルの高さ固定（G-3 対策。デスクトップのみ）**: `@media (min-width: 1025px)`で`.app-container { height: 100dvh; min-height: 0; overflow: hidden }`。内側の`.tab-navigation`（`overflow-y:auto`）・`.tab-content-area`（`overflow:hidden auto`）・`.canvas-area`（`overflow:hidden`）が各自スクロールする。これがないと、パネル（`.tab-content-area`）を`width:0→360px`で展開するトランジションの途中、極小幅で中身（比率タイル群等）がいったん縦 ~1800px にレイアウトされ、`.app-container`が`min-height:100vh`で下方向に伸びられるため、キャンバスを含む画面全体が一瞬ガクッと下がって戻る（`docs/session-log-2026-08-28.md`）。G-1 の残っていた 2px オーバーフローもこれで消える。**幅 1024px 以下では`.app-shell`が縦積みになり全体スクロールが要るため、この固定はかけない**（`min-width:1025px`にスコープ）。
- **パネル開閉時のキャンバス再フィット**: パネルの畳み／展開でキャンバス領域の幅が変わるが window resize は発生しないため、`main.js`が`.canvas-container`に`ResizeObserver`を張り、**「幅」の変化（≥1px）を検知したときだけ**`canvasRenderer.clearContainerSizeCache()`＋`requestRedraw()`する（デバウンス 180ms）。キャンバス要素自体は`max-width:100%`でトランジション中も CSS スケールで追従する。**「幅のみ」に限定しているのは既知の不具合 G-1 への多重防御**: 縦長／正方形の出力比率ではプレビューキャンバスが「高さ基準」で決まり、その要素がコンテナ高さを数px押し上げ → `ResizeObserver`発火 → 再描画で更に高く …という正のフィードバックでキャンバスがじわじわ拡大し続けた（`docs/session-log-2026-08-27-5.md` §13）。**根本原因＝`#previewCanvas`の`border: 1px`が要素のレイアウトボックスに乗っていたこと**は、`docs/session-log-2026-08-27-6.md`で枠線を`outline`（`outline-offset: -1px`。レイアウトに影響しない）へ置き換えて解消済み。高さ反応の`ResizeObserver`を実験的に戻しても縦長比率で拡大しないことを確認した。ガード（「幅のみに反応」）は別経路での再発防止として残す。
- **枠囲みをやめ線ベースに（フェーズ4 E-2）**: 各パネルの`fieldset`は枠なし＋見出し＋（2つ目以降は）上罫線（`border-top`）だけで区切る。`legend`は小さめの大文字見出し。フレームタブの`.frame-card`も同様に枠を外して線区切りに寄せた。
- **説明文の整理（E-10 / E-11。`docs/roadmap.md` E-10・E-11）**: パネル内の文章による操作説明（旧 `.custom-text-drag-hint` の静的インスタンス）は廃止。UI 自体が十分に自明なため。**発見しにくいプレビュー操作（crop モード中の余白ドラッグ＝水平出し、背景タブで開いている間のキャンバスドラッグ＝背景移動など）だけ**、「操作」開閉（`<details class="op-hint">`）として残す。E-11 で最小化: `<summary>` は **`? アイコンだけ**（`--ink-faint`）で、セクション見出しの**文字のすぐ右**（`fieldset legend` の `.legend-text` の直後／背景「位置」は `<p>` を `<div class="op-head subsection-heading with-rule">` へ変えた flex 行）に置く。開くと見出しのすぐ下に**ポップオーバー**（`.op-hint > ul` = `position:absolute` の flex カード。**位置基準は幅 20px の `? ボタン`ではなく見出し行**〈`legend` / `.op-head` を `position:relative`〉＝小さい包含ブロックだと絶対配置の子が右へあふれてクリップされるため。各 `<li>` は `white-space:nowrap` の2列〈`<b>` 操作＋`<span>` 結果〉、`left:0/right:0` で見出し幅、`z-index:40`＋影）。**外側クリック / Esc で閉じる**（`<details>` は本来クリックで閉じないため、`uiController.setupEventListeners` が `document` に薄い `pointerdown`/`keydown` リスナーを張り `details.op-hint[open]` を閉じる）。修飾キー（Shift）の説明はこの箇条書き内に `（Shift: 1°）` の形で吸収。概念説明（「撮影日・Exif も1つのテキスト」「チェックした項目だけ保存」）は削除、後者は `#savePresetButton` の `title` 属性へ。`.op-hint` があるのはレイアウトタブの「写真のトリミング」「大きさと配置」・背景タブの「位置」の3か所。エディタ内など動的に出る短いヒント（`uiController` が組む `.custom-text-drag-hint`）はそのまま。
- **リセットボタンのアイコン化＋見出し行そろえ（E-11）**: 各セクションの「◯◯をリセット」ボタン（`#resetCrop` / `#resetPhotoPlacement` / `#resetBgOffset`）は**文字なしのアイコンボタン**（`.reset-btn`。26px 角・枠付き、`.ratio-rotate-btn` と同系）。アイコンは新スプライト `#i-reset`（ほぼ一周する反時計回りの矢印。上部バーの Undo〈`↶`＝浅い弧〉とは弧の長さで差をつける）。意味は `title` / `aria-label`（「切り抜きをリセット」等）に。**id・ハンドラ・挙動は不変**。レイアウトタブでは見出し右端のセクション操作ボタン（縦横入れ替え／リセット）を `<span class="legend-tools">`（`margin-left:auto` ＋ CSS Grid の固定スロット `grid-template-columns: 26px 26px`。`grid-column` で 1＝`.ratio-rotate-btn` / 2＝`.reset-btn`）でまとめる。片方だけの段（キャンバス＝縦横入れ替えのみ／大きさと配置＝リセットのみ）でも空スロットが 26px を確保するので、**縦横入れ替え・リセットが全段で縦位置がそろう**。背景「位置」は縦横入れ替えが無いので `.op-head .legend-tools { grid-template-columns: 26px }`（1スロット）。`flex` ＋ `margin-left:auto` だけだと段ごとに要素数が違うとずれるため、固定スロットにする。
- **`.rail-item`と`.tab-button`（E-3 / フェーズ5で整理）**: レール上のボタンの見た目用クラスは`.rail-item`。**レイアウト／背景／フレーム／テキスト（旧「文字」。`docs/roadmap.md` E-8）／プリセット／情報の6ボタンすべてに`.rail-item`と`.tab-button`の両方を付与**し、`tabManager.js`が一律に`.tab-pane`と対応づけて切り替える。以前は「情報」だけ独立トグル（`#exifToggleButton`、`.tab-button`なし）だったが、E-3 で他タブと同じ`data-tab="tab-info"`＋`#tab-info`ペインにした（`docs/roadmap.md` E-3、`docs/session-log-2026-08-27-6.md`）。
- **Exif情報表示（E-3 / フェーズ5）**: Exif は「情報」タブ（`#tab-info`）の中の`#exifDataContainer`に表示する。他タブと同じフライアウトパネル枠で、押すと切り替わり、もう一度押すと E-1 の再クリックで畳まれる（独立オーバーレイではない）。描画は`exifHandler.js`の`displayExifInfo()`で、Lightroom Web 風にカメラ／レンズ名だけを小さく上に置き、撮影設定（絞り・シャッタースピード・ISO感度・焦点距離・撮影日時）は**アイコン＋値だけの定義リスト（`.exif-dl`）**にする。項目名テキストは出さず`<dt>`の`title`属性（ホバーでツールチップ）に入れる。アイコンは`index.html`のスプライト`#i-aperture` / `#i-shutter` / `#i-iso` / `#i-focal` / `#i-cal`。以前の`#exifFloatCard` / `#exifToggleButton` / `.exif-float-card` は廃止。
- **ダウンロードボタンの位置（フェーズ4 E-5）**: `#downloadButton`は**上部バー右端**（`.app-header .header-actions` 内の`.dl-group`）。押すと画質ポップオーバー（`#downloadPopover`。`#jpgQuality`スライダー＋「書き出す」＝`#downloadConfirmButton`）を開き、「書き出す」で`handleDownload()`を実行する。「出力」タブ（`#tab-output`）とそのレール項目は廃止した。`outputSettings.quality`のデータ・`fileManager.js`側は不変。以前は「出力タブに戻す」方針だったが、ユーザー判断で再度「上部バーへ」に転換（`docs/roadmap.md` E-5）。
- **画像ドロップ領域（E-7 / フェーズ6）**: ファイル選択用の小枠を廃し、`.canvas-area`（キャンバス領域）全体をドラッグ&ドロップの受付にした。**画像未読込時**は`.canvas-area`に`.no-image`が付き、キャンバス枠内に中央寄せのドロップダイアログ（`#imageDropDialog` = `.image-loader-container`。アイコン＋「画像をドラッグ＆ドロップ」＋`for="imageLoader"`の「またはクリックして選択」ラベル）を出し、`#previewCanvas`は隠す。**読み込み後**は`.has-image`が付き、ダイアログを隠してキャンバスを出す。切り替えは`main.js`の`updateImagePresenceUI()`（`requestRedraw()`冒頭と初期化時に呼ぶ）。`<input type="file" id="imageLoader">`は視覚的に隠し、ダイアログのラベルと**上部バーの「画像を開く」ボタン（`#openImageButton`）**から開く。ドロップの`dragover`/`drop`は`main.js`が`.canvas-area`（無ければ`.canvas-container`）に配線。
- **Favicon（E-6 / フェーズ6）**: `favicon.svg`（`.app-brand .brand-mark` と同意匠＝角丸四角の線＋内側の小さな角丸四角の線。`prefers-color-scheme`で色を切り替え）を`<head>`に`<link rel="icon" type="image/svg+xml">`で読み込む。

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
    ├── tabManager.js       # タブ切り替え＋アクティブタブ再クリックでパネルを畳む（.panel-collapsed）＋getActiveTab／onTabChange
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
    │   ├── canvasInteraction.js    # pointerイベント処理・ドラッグ状態機械・矢印キーnudge・拡大回転ハンドル操作・写真の選択/トリミングモード操作・タブ別ドラッグの振り分け
    │   ├── photoCropStore.js       # 選択中の写真の四隅ハンドル座標（select=■/crop=L字）と、cropモード時のクロップ窓・元画像全体の画面矩形（一時的なUI状態）
    │   ├── photoEditModeStore.js   # 写真選択中の編集サブモード（select / crop）と、cropモード開始時の座標スナップショット（frozenFrame）
    │   └── adapters/
    │       ├── textAdapter.js        # 自由テキストレイヤーの値変換（位置・サイズ・回転）
    │       ├── photoAdapter.js       # 写真の枠内配置・クロップ矩形・余白リサイズの値変換
    │       ├── backgroundAdapter.js  # 拡大ぼかし背景の位置の値変換
    │       └── shadowAdapter.js      # フレームの影オフセットの値変換（「フレーム」タブ表示中の本体ドラッグ用）
    ├── ui/
    │   ├── scrubInput.js   # ドラッグでスクラブ／クリックでタイプ入力できる数値入力コンポーネント
    │   ├── colorSwatches.js # カラーピッカーの直下にカラー履歴スウォッチ行を追加する機能拡張
    │   └── ratioPicker.js  # 比率を「その比率のミニ長方形」の形で見せて選ぶタイル型ピッカー（出力アスペクト比・切り抜き比率で共用）
    ├── presets/
    │   ├── presetStore.js       # 編集設定のプリセット保存・一覧・削除・適用（localStorage）
    │   └── colorHistoryStore.js # カラーピッカーで選んだ色の履歴（localStorage、全ピッカー共通）
    └── utils/
        ├── canvasUtils.js  # Canvas操作ユーティリティ
        ├── geometry.js     # 回転を伴う当たり判定・ハンドル配置用の幾何ヘルパー（rotatePoint）
        └── cropRect.js     # クロップ矩形（元画像に対する割合 {x,y,w,h}）の幾何ヘルパーと旧cropSettingsからの移行
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
    offsetX: number,                  // 0-1の範囲（回転後の外接矩形を可動範囲内で動かす割合）
    offsetY: number,                  // 0-1の範囲
    rotation: number                  // A-4: キャンバス内での写真の回転角（度、-180〜180）
  },
  outputTargetAspectRatioString: string, // 出力アスペクト比
  baseMarginPercent: number,         // 余白（写真短辺に対する%、0-300）。UIスライダーは「大きさ」表記でこの逆数的な見かけ値を扱う（A-10）
  backgroundColor: string,            // 背景色（HEX）
  backgroundType: 'color' | 'imageBlur' | 'bgImage', // 背景タイプ（bgImage＝B-6「別画像」）
  imageBlurBackgroundParams: {        // 画像背景パラメータ。「ぼかし」と「別画像」で共有（B-6）
    scale: number,                    // 拡大倍率
    blurAmountPercent: number,        // ぼかし強度（%）。「別画像」へ切り替えた瞬間、既定3のままなら0へ寄せる（B-6）
    brightness: number,                // 明るさ（%）
    saturation: number,                // 彩度（%）
    offsetXPercent: number,            // Xオフセット（%）
    offsetYPercent: number             // Yオフセット（%）
  },
  // bgImage: HTMLImageElement | null   // B-6「別画像」背景で使う2枚目の画像。image と同じく
  //   EDITABLE_SETTINGS_KEYS 外＝Undo・プリセット非対象。getState() のクローンでは除外する。
  photoDrawConfig: {                  // 写真描画設定（計算結果）
    sourceX, sourceY, sourceWidth, sourceHeight,
    destWidth, destHeight,             // 実際に drawImage するサイズ（回転前・等倍）
    destXonOutputCanvas, destYonOutputCanvas,
    rotation,                          // A-4: 写真中心まわりの回転角（度）。レンダラが drawImage 前に ctx.rotate
    cropRotation                       // A-3: クロップ窓の中で元画像を回す角度（度）。窓にクリップして塗る
  },
  outputCanvasConfig: {               // 出力Canvas設定（計算結果）
    width: number,
    height: number
  },
  frameSettings: {                    // フレーム加工設定
    cornerStyle: 'rounded' | 'superellipse',  // C-1: 「なし」は廃止（丸み0 が実質「なし」）。'none' は旧プリセット互換で描画側のみ残す
    cornerRadiusPercent: number,       // 角丸の半径%（0-50）。UI「丸み」スライダー(0-100)の 1/2
    superellipseN: number,             // 超楕円の次数（連続値、2-40）。UI「丸み」スライダーからは非線形マッピングで算出（C-1、7.4節）
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
  textSettings: {                     // テキスト設定（バケット4 / D-1・D-3。旧 date / exif / customTexts を統合）
    layers: [                         // 撮影日・Exif・自由テキストを1本化した可変長配列。種類(kind)フィールドは持たない
      {
        id, enabled,
        content: [ /* 文字列 | { field:'date', format } | { field:'exif', items:[…] } の並び */ ],
        textAlign, font, size, color, opacity, position, offsetX, offsetY, rotation
        // content は「リテラル文字列」と「動的トークン」の並び。トークンは Exif を解決して描画される
        // （生きたトークン。別画像に差し替えると日付・Exif 値も追従する）。
        // position は UI から撤去済み（D-2）だがデータには残す。rotation は度数。
      }
      // ...ユーザーが「＋ テキストを追加」→ 作成フォーム →「追加」で確定した分だけ要素が増える
    ]
  },
  outputSettings: {                    // 出力設定
    quality: number,                  // JPEG品質（1-100）
    preserveExif: boolean
  },
  cropSettings: {                     // 構図調整（トリミング）設定
    aspectRatio: string,              // 'free' / 'original' / '1:1' / '幅:高さ'（クロップ矩形に課す比率制約）
    rect: { x, y, w, h },             // 切り出し矩形。0–1 の割合（x/w は幅基準・y/h は高さ基準）。
                                      //   A-3: rotation≠0 のときは「クロップ窓が直立した座標系」での軸平行矩形。
    rotation: number                  // A-3: 水平出し角度（度、-45〜45）。窓は軸平行のまま元画像がその下で傾く。
    // ※旧形式 { aspectRatio, zoom, offsetX, offsetY } はプリセット読込時に utils/cropRect.js が rect へ移行する
  },
  exifData: Object                    // Exifデータ（piexif.js形式）
}
```

**主要関数:**
- `getState()`: 現在の状態のディープコピーを取得
- `updateState(updates, options)`: 状態を更新（ディープマージ）。`options.silent`が`true`の場合はリスナーへの通知を行わない（後述）
- `setImage(img, exifData, fileName)`: 新しい画像を設定。**G-2: すでに画像がある状態での差し替え時（`editState.image` が真）は、トリミングだけ初期化する**——`cropSettings.rect` を全体（`FULL_RECT`）へ、`photoViewParams` を中央（`{ offsetX: 0.5, offsetY: 0.5, rotation: 0 }`）へ戻す。`cropSettings.aspectRatio`（比率制約）は維持し、直後の「固定比率 ＋ 全体 rect → `fitRectToAspect`」で新しい画像のアスペクトに合う最大内接矩形へ作り直す。`cropSettings.rect` は元画像に対する正規化座標なので、アスペクト比の違う画像へ同じ rect を引き継ぐと切り抜き形状が崩れる（1:1 で切ったのに 1:1 でなくなる）ため。背景・フレーム・出力比率・余白・テキストは引き継ぐ。初回ロードでは初期化しない（`docs/roadmap.md` G-2、`docs/session-log-2026-08-27-7.md`）
- `setBackgroundImage(img)`: **B-6**。背景タイプ「別画像」で使う `editState.bgImage` を設定（`null` でクリア）し、`notifyStateChange()`。前景写真の `setImage` と違い Exif 抽出・トリミング初期化・UI 全体の再初期化はしない。`bgImage` は `EDITABLE_SETTINGS_KEYS` 外＝Undo・プリセット非対象で、`getState()` のクローン時は `image` と同様に一時的に外して復元する
- `addStateChangeListener(listener)` / `removeStateChangeListener(listener)`: 状態変更リスナーの登録／解除
- `addTextLayer(partial)`: テキストレイヤーを1つ追加し、そのidを返す（`partial` に content・見た目の初期値。既定値へマージ）
- `removeTextLayer(id)`: 指定idのテキストレイヤーを削除（撮影日・Exif も含めすべて対象）
- `updateTextLayer(id, changes)`: 指定idのテキストレイヤーのプロパティを部分更新
- `reorderTextLayers(orderedIds)`: テキストレイヤーの並び順（＝重なり順）を差し替える（リストのドラッグ並べ替え用）
- `migrateTextSettings(textSettings)`: 旧形式（`{ date, exif, customTexts }`）を新形式（`{ layers: [] }`）へ変換する。`applyPreset` の入口で旧プリセットにだけ通す（撮影日・Exif は有効だったものだけレイヤー化、自由テキストは全部）

**`EDITABLE_SETTINGS_KEYS`（エクスポートされる定数配列）:**
`editState`のうち「ユーザーが調整する編集設定」に該当するキーの一覧（`photoViewParams`, `outputTargetAspectRatioString`, `baseMarginPercent`, `backgroundColor`, `backgroundType`, `imageBlurBackgroundParams`, `frameSettings`, `textSettings`, `outputSettings`, `cropSettings`）。画像そのもの（`image`, `exifData`, `originalFileName`）やレイアウト計算の派生データ（`photoDrawConfig`, `outputCanvasConfig`）は含まない。`history/historyManager.js`のUndo/Redo対象範囲と`presets/presetStore.js`のプリセット保存範囲が、この一つの定義を共有している。

**状態変更通知のバッチ化と`silent`オプション（設計上の注記）:**
- `notifyStateChange()`は同期即時実行ではなく、`queueMicrotask()`で同一Tick内の複数回呼び出しを1回にまとめてから発火する。これにより、Canvasドラッグ中に高頻度で発生する`updateState`呼び出しでも、実際の再描画・UI同期はTickごとに1回に自然に間引かれる。
- `main.js`の`requestRedraw()`は、レイアウト計算結果（`photoDrawConfig`/`outputCanvasConfig`）を`updateState(..., { silent: true })`で書き戻している。これは「派生データの書き戻し」であり、もし通常の（silentでない）`updateState`として呼び出しリスナーに`requestRedraw`自体が登録されていると、`updateState → 通知 → requestRedraw → updateState → …`という無限ループになるため。
- `textSettings.layers`は配列のため、`updateState()`の汎用ディープマージ（配列は丸ごと置換される仕様）では個々のレイヤーだけを安全に部分更新できない。そのため`updateTextLayer(id, changes)` / `reorderTextLayers(ids)`という専用関数を別途用意している。

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
- レイアウト設定（出力アスペクト比＝比率タイルピッカー、余白。写真位置・切り抜き位置のスライダーは撤去。下記「比率タイルピッカー」参照）
- 背景設定（タイプ、色、ぼかしパラメータ。明るさ・彩度は折りたたみ、X/Yオフセットのスライダーは撤去。下記「背景タブの整理」参照）
- フレーム設定（角スタイル、影、縁取り。値の読み書きロジックは変更していないが、開閉表現は下記の通りCSSアニメーションに変更）
- テキスト設定（撮影日・Exif情報・自由テキストレイヤーの追加/削除/個別設定。下記「文字レイヤーの統一UI」参照）
- 出力設定（JPEG品質）

**比率タイルピッカー（出力アスペクト比＝「キャンバス」・切り抜き比率＝「写真のトリミング」。`docs/roadmap.md` A-1 / A-14）:**
以前はどちらも`<select>`だったが、比率の形が想像しづらいという要望で、比率そのものの形をミニ長方形で描いて選ぶタイル型 UI（`js/ui/ratioPicker.js`の`createRatioPicker()`）に置き換えた。**A-14（2026-08-28、Lightroom Web のクロップ UI 参照）で「向きを畳んだ比率ファミリー」方式に作り替えた。**
- **`RATIO_FAMILIES`（`js/ui/ratioPicker.js`）が唯一の情報源。**各エントリは向き中立の「比率ファミリー」で、`{ id, p, q, pickers, square?/named?/original?/free?/custom? }`（`p ≤ q` の縦向き正準比率）。配列の並び＝表示順（Lightroom と同じ「ラベルの数字が小さい順」。`L判` は数字を持たないので配列内の固定位置）。`ratioOptionsFor('output')` / `ratioOptionsFor('crop')` でそのピッカー用の配列を得る。
  - キャンバス: `1×1` · `2×3` · `3×4` · `4×5` · `L判`(89:127) · `9×16` · `10×16` · カスタム
  - 写真のトリミング: **オリジナル** · フリー · `1×1` · `2×3` · `3×4` · `9×16` · `10×16` · カスタム
  - 旧「1.91:1」は削除、`16:10`（`id:'10:16'`）・`3:2`（`id:'2:3'`）を追加。
- **向き（`orientation`: `'portrait'` / `'landscape'`）はピッカーの UI 状態**。タイルのラベル（`4×5` の `×` 表記）とミニ長方形（`<i>` の幅・高さを 46px 内接で比率どおりに）はこの向きで描く。初期の向きは現在の保存文字列（`outputTargetAspectRatioString` / `cropSettings.aspectRatio`）の W:H から導出（W>H で landscape、W<H で portrait、正方形は現状維持）。**永続化しない。**
- **回転ボタン**（見出し `<legend>` 右端。`#outputRotateButton` / `#cropRotateButton`。スプライト `#i-rotate`＝四角の右上に回転矢印。**押すたびに縦↔横が切り替わる momentary ボタンで、押下（トグル）状態は描画しない**——hover のみ）。`picker.toggleOrientation()` で全タイルを縦横反転し、`uiController.rotateRatioPicker(kind)` が選択中ファミリーの保存文字列を `H:W` ↔ `W:H` に入れ替えて `updateState` / `applyCropAspect` で再適用。`1×1`・「フリー」・「オリジナル」は向きだけ反転して値は据え置き（「オリジナル」は元画像の向き基準）。**カスタム選択中の回転は幅高さの数値入力を入れ替える**（旧 `#swapAspectRatio` / `#cropSwapAspectRatio` の ⇄ ボタンは廃止しこれに一本化）。
- **サブラベルは全廃（`docs/roadmap.md` E-9）**。タイルは「ラベル＋ミニ長方形」だけ。「インスタ」は正方形/4:5/ストーリーズ/リールで比率が違い一概に言えないため。
- 各タイルは`<button class="ratio-tile" data-value aria-pressed>`（`data-value` はファミリー `id`＝向きに依存しない）。「フリー」タイルは破線、「オリジナル」タイルは二重線（`.is-original`）でミニ長方形は`uiController.syncOriginalTileShape()`が読み込み中の画像比で描く（`toggleOrientation`／`setValue` の再描画後に貼り直す）。カスタム幅高さ入力欄は折り返さない1行（`.ratio-custom-row`。⇄ ボタンは撤去）。
- `editState` のキー・`layoutCalculator`・各レンダラは無変更（向きは常に文字列から導出）。
- **「オリジナル」タイル（切り抜きのみ。`docs/roadmap.md` A-11）**: **切り抜き比率を元画像のアスペクト比で固定する**（Lightroom のクロップ「オリジナル」と同義。3:4 の画像なら 3:4 で固定）。選択すると`cropSettings.aspectRatio = 'original'`を保存し、他のプリセット比率と同じ経路（`applyCropAspect`）で中心維持のまま矩形を元画像比へ合わせる。**`rect`の全体リセットや`photoViewParams`の初期化はしない。** `aspectRatio`の数値解決は`utils/cropRect.js`の`resolveCropAspectValue(aspectRatio, imgW, imgH)`（`'original'` → `imgW/imgH`、`'free'`/空/画像未ロード → null、それ以外 → `parseAspectRatio`）が担い、`photoAdapter.getCropConstraint`（crop モードの隅ドラッグ制約）・`stateManager.setImage`（画像ロード／差し替え時の再フィット。`'original'`は新画像の比へ自動追従）・`uiController.applyCropAspect`の3か所で使う。タイルのミニ長方形は`uiController.syncOriginalTileShape()`が読み込み中の画像の縦横比で描く。押下表示は`aspectRatio === 'original'`のときのみ（`aspectRatio === 'free'`なら「フリー」）。<br>※「切り抜きをまるごとリセット」は A-3 で「切り抜きをリセット」ボタン（`#resetCrop`）として実装済み（`cropSettings` を `free` / 全体 / `rotation:0` へ。7.2節）。
- ピッカーは`ensureRatioPickers()`が一度だけ生成する（`initializeUIFromState()`が`setupEventListeners()`より先に走るため、両方から呼べるようにしてある）。`onSelect(value)`で、プリセット比率なら`updateState({ outputTargetAspectRatioString })`／`applyCropAspect(value)`を呼ぶ。**「カスタム」タイルはカスタム幅高さ入力欄（`#customAspectRatioContainer`／`#cropCustomAspectRatioContainer`）を表示するだけで、その時点では state を変えない**（反映は入力欄の編集時に`updateAspectRatioFromInputs()`／`updateCropAspectRatioFromInputs()`が行う）。カスタム欄は**「カスタムモード中」**（`outputCustomMode`／`cropCustomMode`。カスタムタイル押下・カスタム欄編集で`true`、別タイル押下で`false`）または「カスタム」タイルが実効的に押されているあいだ表示する（`updateOutputCustomVisibility()`／`updateCropCustomVisibility()`が`.hidden`をトグル）。
- **G-4（カスタム値が既存比率に一致してもカスタム欄が閉じずフォーカスが飛ばない。`docs/roadmap.md` G-4）**: 以前はカスタム幅高さの値がプリセットタイルと同じ比率（例 4:5）になると`setValue`がそのタイルを押下→`getValue()`が`'custom'`でなくなり→カスタム欄が`display:none`になり、フォーカス中の子要素からフォーカスが外れていた。対処＝粘着フラグ`*CustomMode`と、`picker.setValue(value, { keepCustom: true })`（一致しても「カスタム」タイルの押下を維持）。プログラムからは`.focus()`を一切呼ばない。
- state → UI の同期は`syncOutputAspectUI(state)`／`syncCropAspectUI(state)`が担い、`picker.setValue(value, { keepCustom: *CustomMode })`で該当タイルを押下状態にする（一致するタイルが無ければ「カスタム」タイルにフォールバック）。

**写真の配置スライダーの撤去（`docs/roadmap.md` A-1）:**
「切り抜き位置（横／縦）」（`#cropOffsetX/Y`）・「枠内位置（横位置／縦位置）」（`#photoPosX/Y`）のスライダー計4本を UI から撤去した。`cropSettings.rect`のパンと`photoViewParams`は**データモデルとしては維持**し、プレビュー上のジェスチャー（本体ドラッグ、crop モードの本体ドラッグ、四隅ハンドル）からのみ操作する。パネルには「**大きさと配置をリセット**」ボタン（`#resetPhotoPlacement`。旧「配置をリセット」。`docs/roadmap.md` A-15）だけを置き、押すと`photoViewParams`を中央（0.5, 0.5）へ・クロップ矩形のパンを中央へ・**`baseMarginPercent`を既定 5（表示 90%）へ**戻す（切り抜き範囲のサイズ・比率は変えない）。「大きさと配置」セクションにあった説明文（`写真をドラッグで配置。四隅の■で大きさを調整。`）は A-16 で削除。

**背景タブの整理（`docs/roadmap.md` B-1、軽微版）:**
`<fieldset>`構成は保ったまま、拡大ぼかし背景の「明るさ」「彩度」スライダーを既定で閉じたネイティブ`<details id="bgToneAccordion">`（見出し「色調（明るさ・彩度）」）に入れた。X/Yオフセットのスライダー（`#bgOffsetX/Y`）は撤去し、「位置をリセット」ボタン（`#resetBgOffset`。`imageBlurBackgroundParams.offsetX/YPercent`を0に戻す）に置き換えた。位置調整は「背景」タブでのプレビュードラッグ（`backgroundAdapter`、5.17節）で行う。`imageBlurBackgroundParams`のデータモデルは変更なし。

**テキストレイヤーのUI（バケット4 / D-1・D-3。撮影日・Exif・自由テキストを統合）:**
撮影日／Exif／自由テキストは1本の `textSettings.layers[]`（`utils/textContent.js` で扱う `content` ＝「リテラル文字列」と「動的トークン（`{ field:'date' | 'exif' }`）」の並び）に統合された。種類(kind)フィールドは持たず、リスト行のバッジ等は content から導出する（`contentHasExif()` など）。データモデルの詳細は5.2節、旧形式プリセットの移行（`migrateTextSettings()`）は §12（プリセット）参照。

- **レイヤー一覧（`#textLayersList`、`renderTextLayersList()`）**: 各行 ＝ 掴み手（`⠿`、ドラッグで並べ替え＝重なり順、`reorderTextLayers()`）／種類バッジ（`T` または `Exif`）／内容プレビュー（`contentPreviewLabel()`）／表示トグル（`●`/`○`、`enabled` の切り替え）／削除（`×`）。0枚のときは「まだテキストがありません」のヒントのみ。
- **追加の導線（D-1）**: 「＋ テキストを追加」（`#addTextLayerButton`）で**作成フォーム**（未確定の下書き `textDraft`）が開く。内容を組み立てて「追加」を押すまで `state` には触れない。`addTextLayer()` で確定し、そのレイヤーを選択して編集モードへ。
- **編集フォーム（`#textLayerSettingsPanel`、`buildTextEditor(panel, mode, layerId)`）**: `mode='create'`（下書き）と `mode='edit'`（選択中レイヤーをライブ編集）で同じ部品を使う。フィールドは種類を問わず共通の1セット（D-3）＝内容エディタ／揃え／フォント／大きさ／文字色／不透明度／横位置・縦位置／回転。`create` では末尾に「追加／キャンセル」。
- **内容エディタ（`mountContentEditor()`）**: `contenteditable` な1つの入力欄＋トークン差し込みボタン（`＋ 撮影日` / `＋ Exif`）＋**解決後の文字列のライブプレビュー**（`.text-content-preview`。`resolveContentText(content, exifData)` の結果を都度表示。Exif 未読込でトークンを含む場合は空欄になる旨の注記も出す）＋インラインの書式・項目ピッカー。トークンは `contenteditable="false"` のインライン span（`.text-token`）で、Backspace で1単位として消える。`serialize()` が DOM を辿って `content` 配列へ、`paint()` が逆向き。ゼロ幅スペースでトークン直後のキャレット位置を確保する。
- **トークンのピッカー（Q-C: その場で展開。モーダルにしない）**: 撮影日トークンをクリック → 書式ピッカー（`buildDateFormatPicker()`、プリセットボタン＋自由入力）。Exif トークンをクリック → 項目ピッカー（`buildExifItemPicker()`、`exifTagDefinitions` から「利用可能／使用する」の2リスト、クリックで追加・×で削除・`⠿` ドラッグで並べ替え。`attachListDragHandle()` はレイヤー一覧の並べ替えと共通）。
- **表示位置アンカーはUIから撤去（データモデルは維持）**: 9点（`top/middle/bottom` × `left/center/right`）の固定アンカー選択は出さない（`docs/roadmap.md` D-2）。`layer.position`（既定 `middle-center`）は状態・プリセットに残り、`textRenderer.js` の `calculateTextPosition()` がオフセットの基準アンカーとして引き続き使う。
- Canvasドラッグ中の座標欄（横位置/縦位置）・拡大/回転ハンドル操作中のサイズ・回転角の値だけは、`syncTextLayerLiveInputs(state)` が軽量に `.value` のみ更新し、パネル全体は再構築しない（`create` モード中は下書きが state と無関係のため早期 return）。横位置/縦位置/回転の数値欄は `enhanceAsScrubInput()` でスクラブ／タイプ入力対応。

**フレーム加工パネルの開閉表現:**
影/縁取りの詳細設定は、以前は`style.display = 'none'/''`による即時の表示切り替えだったが、CSSの`grid-template-rows`トランジション（`.accordion`/`.accordion.open`、`style.css`）による滑らかな開閉に変更した。`updateFrameSettingsVisibility()`はこれに合わせて対象要素への`classList.toggle('open', ...)`に変更しているが、値の読み書きロジック自体（`addOptionChangeListener`等）は変更していない。
C-1 で角丸/超楕円のモード別パラメータ行（半径 / 次数n の2アコーディオン）は廃止し、両モード共通の「丸み」スライダー1本を常時表示（静的な `<div class="accordion open">` で既存 CSS を流用）にした。`updateFrameSettingsVisibility()` から角丸/超楕円コンテナのトグルは削除済み。
フレームタブは `<fieldset>` ではなく `<div class="frame-card">` を使うため、`fieldset div.form-row-slider`（3列グリッド）／`fieldset div.form-row-simple`（flex）系のセレクタが効かず `.form-row-slider` が素の block になってスライダーのつまみが行からはみ出していた。`style.css` でこれらのセレクタに `.frame-card div.form-row-slider` / `.frame-card div.form-row-simple` を並記し、レイアウト／背景タブと同じ「ラベル｜スライダー｜値」の3列表示に揃えた（影・縁取りアコーディオン内の行も同様に整う）。

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
1.5. **A-4: 写真の回転（`photoViewParams.rotation`）を考慮**——回転後の外接矩形
   `bboxW = w·|cosθ| + h·|sinθ|`, `bboxH = w·|sinθ| + h·|cosθ|` を計算する。
   実際に描くサイズ（`destWidth/Height`）は回転前のまま＝レンダラが写真中心で `ctx.rotate` する。
2. 基準値の計算（**写真の短辺は回転前の値で固定**＝回すたびに余白・テキストの基準が動かないように）
3. 最小余白を計算（基準余白%からピクセル値に変換）
4. 出力Canvasの寸法を決定（**外接矩形**＋最小余白を基準に、アスペクト比を考慮）
   - 外接矩形サイズ + 最小余白の仮サイズを計算
   - 目標アスペクト比と比較して、幅または高さを拡張
5. 写真の描画位置を決定（`photoViewParams.offsetX/Y` に基づく）
   - 可動範囲内で**外接矩形**の左上座標を計算し、写真本体はその外接矩形の中心に置く
     （`destX/YonOutputCanvas = bbox左上 + (bboxサイズ − 写真サイズ) / 2`）。回転 0 のときは
     `bbox = 写真`なので従来式と一致する

### 5.5 canvasRenderer.js
キャンバス描画の統合処理を担当します。

**主要関数:**
- `drawPreview(currentState, previewCanvas, previewCtx)`: プレビュー描画
- `renderFinal(currentState)`: 最終出力用の高解像度Canvasを生成
- `getLastPreviewContext()`: 直近の`drawPreview`呼び出し時点でのプレビュー⇔出力解像度の変換情報（`{ scale, photoShortSidePx }`）を返す。`canvasInteraction.js`がドラッグ量の単位変換に使用する
- `clearContainerSizeCache()`: プレビューコンテナ寸法のキャッシュ（`cachedContainerSize`。canvasサイズ変更でレイアウトが揺れる＝正のフィードバックを防ぐためのキャッシュ）を破棄する。従来は`window`の`resize`でのみクリアしていたが、フェーズ4で設定パネルの畳み／展開でもキャンバス幅が変わるようになったため、`main.js`が`ResizeObserver`経由でこれを呼んで次の`drawPreview`に寸法を取り直させる。**ただし「幅」の変化に限定**（既知の不具合 G-1 への多重防御。根本原因の`#previewCanvas`ボーダーは`outline`化で解消済み。3.1節・`docs/session-log-2026-08-27-5.md` §13・`docs/session-log-2026-08-27-6.md`）

**描画順序（`drawPreview`。`renderFinal`は8・9を除く1〜7のみ）:**
> **A-4: 写真の回転**——2〜7（影・クリップ・写真本体・内側影・縁取り）は写真中心まわりに
> `ctx.translate → rotate → translate` で包んで描く（装飾も一緒に回る）。回転角は
> `photoDrawConfig.rotation`。crop モード中は回転を一時的に 0 として素の写真で描く。
1. 背景描画（`imageBlur`、または `bgImage` で別画像が選択済みのとき、当たり判定用に背景の矩形を`interactionRegistry`へ登録＝プレビュードラッグで位置調整できる）
2. ドロップシャドウ（有効な場合）
3. 写真の当たり判定用矩形を`interactionRegistry`へ登録
4. クリッピングパス設定（角丸/超楕円）
5. 写真本体描画
6. インナーシャドウ（有効な場合）
7. 縁取り（有効な場合）
8. テキスト描画（`textSettings.layers[]`の各レイヤーは、描画と同時に当たり判定用の矩形を`interactionRegistry`へ登録）
9. **プレビューのみ**: 選択中オブジェクトのハイライト枠（回転している場合はボックス中心を軸に回転させて描画。写真の枠も `photoViewParams.rotation` で回る）、選択中がテキストレイヤーなら拡大・回転ハンドル、select モードで写真選択中なら四隅■＋上端の回転ハンドル（`drawPhotoResizeHandles`。A-4）、ドラッグ中のスナップガイド線を描画（出力画像には含まれない）

`interactionRegistry`は`drawPreview`が呼ばれるたびに`clear()`されてから再構築される。immediate-mode描画（毎回全部描き直す）方式を変えずに当たり判定を持たせるための設計。詳細は5.12節以降を参照。

**拡大・回転ハンドルの描画（`drawTextHandles`）:** 選択中オブジェクトが`type === 'text'`の場合のみ、ボックス右下角に拡大ハンドル（四角）、ボックス上端中央から少し離れた位置に回転ハンドル（丸、接続線付き）を描画する。回転時はハンドルもボックスと一緒に回転させて描く。同時に、その画面上の座標（回転適用後）を`interaction/textHandleStore.js`に記録し、`canvasInteraction.js`がポインタ操作時の当たり判定に使う。詳細は5.22節参照。

**写真の四隅■＋回転ハンドルの描画（`drawPhotoResizeHandles`。A-4）:** select モードで写真選択中のとき、四隅に■リサイズハンドル（ドラッグ＝`baseMarginPercent`）、上端中央から離れた位置に回転ハンドル（丸、接続線付き。ドラッグ＝`photoViewParams.rotation`）を描画する。`photoViewParams.rotation` が非0のときはハンドル・接続線・写真本体を写真中心まわりに同じ角度で回して描く。■・回転ハンドルの画面座標（回転適用後）を `interaction/photoCropStore.js` に記録し、`canvasInteraction.js` が当たり判定に読む（crop モードのL字ハンドルと同じストア・同じ経路）。

**写真本体の塗り（`drawCroppedPhoto`。A-3）:** `photoDrawConfig.cropRotation === 0` なら従来どおり `drawImageWithPrecision(元画像, source矩形 → dest矩形)`。非0なら「クロップ窓（`dest*`）にクリップ → `translate(窓)`＋`scale`＋画像中心まわりに `cropRotation` 回転 → `drawImage(元画像全体)`」で塗る。`rect` は `canvasRenderer.effectiveCropRect()`（＝`clampRectToRotatedImage` を通した“見えているサイズ”）を渡す。`drawPreview` / `renderFinal` の両方が通る。

**写真選択中の四隅ハンドル／トリミングオーバーレイ描画（5.24節・5.25節・7.2節参照）:** 選択中オブジェクトが写真（`getSelectedId() === 'photo'`）の場合、`photoEditModeStore`のモードで分岐する。**crop モード**かつ`frozenFrame`があれば`drawCropModeOverlay()`を呼ぶ（`frozenFrame`から「元画像全体の画面矩形 `whole`」を逆算し、**A-3: `cropSettings.rotation ≠ 0` なら `whole` を中心まわりに傾けて描画**、暗マスク（キャンバス全面）した上で現在のクロップ矩形の内側だけ明るく再描画、クロップ窓の内側に三分割グリッド、四隅にL字ハンドル）。クロップ窓（`cropScreen`）とL字ハンドルは軸平行のまま。**それ以外**は通常のフレーム装飾（角丸・影・縁取り）込みで写真を描き、select モードで選択中なら`drawPhotoResizeHandles()`で四隅に■＋回転ハンドルを重ねる。

### 5.6 backgroundRenderer.js
背景描画を担当します。

**主要関数:**
- `drawBackground(ctx, canvasWidth, canvasHeight, currentState, basePhotoShortSideForBlurPxIfPreview)`: 背景を描画。`backgroundType` で分岐する:
  - `'color'`（または画像未ロード）→ `drawColorBackground`
  - `'imageBlur'` → 前景写真（`currentState.image`）を `currentState.photoDrawConfig.sourceX/Y/Width/Height` から作った「クロップ後の写真範囲」`sourceRect` で `drawBlurredImageBackground`
  - `'bgImage'`（**B-6「別画像」**）→ `currentState.bgImage` を **クロップせず全体**（`sourceRect = {0,0,bgImage.width,bgImage.height}`）で `drawBlurredImageBackground`。パラメータは `imageBlurBackgroundParams` を共有。`bgImage` が未選択なら `drawColorBackground` にフォールバック
- `drawColorBackground(ctx, canvasWidth, canvasHeight, color)`: 単色背景を描画
- `drawBlurredImageBackground(ctx, canvasWidth, canvasHeight, img, blurParams, basePhotoShortSideForBlurPx, sourceRect)`: 拡大ぼかし／別画像背景を描画。`sourceRect`（省略時は画像全体）で指定した範囲だけを `drawImage` のソースに使う。「ぼかし」と「別画像」で共通

**画像背景の処理（`imageBlur` / `bgImage` 共通）:**
- 元にする範囲は `sourceRect`（`imageBlur`＝クロップ後の前景写真、`bgImage`＝別画像の全体。フェーズ3で `imageBlur` のクロップ追従を修正。`docs/roadmap.md` B-3。7.3節参照）
- そのクロップ範囲がCanvas全体を覆うように拡大（cover方式。アスペクト比も範囲基準）
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
- `nParam` は `[2, 40]` にクランプするのみで**整数化しない**（C-1）。UI の「丸み」スライダーが
  非線形マッピングで連続値の n を渡すため。媒介変数計算は非整数 n をそのまま扱える。

**影の実装:**
- **ドロップシャドウ**: オフスクリーンCanvasを使用して影を生成し、ぼかしを適用
- **インナーシャドウ**: destination-out合成モードでくり抜き、ぼかしを適用

### 5.8 textRenderer.js
テキスト描画を担当します。

**主要関数:**
- `drawText(ctx, currentState, canvasWidth, canvasHeight, basePhotoShortSideForTextPx)`: テキストを描画。`textSettings.layers[]`の各レイヤーをループし、`resolveContentText(layer.content, exifData)`（`utils/textContent.js`）で content を1本の文字列に解決してから `drawSingleText()` で描く。実際に描画したレイヤーについては`{ id, type: 'text', x, y, width, height, rotation }`という当たり判定用バウンディングボックスの配列を返す（`canvasRenderer.js`がこれを`interactionRegistry`へ登録する）
- `loadSingleGoogleFont(fontApiName)`: Google Fontを読み込む
- `drawSingleText(ctx, settings, textToDraw, fontObject, basePhotoShortSidePx, canvasWidth, canvasHeight)`: 単一テキストブロックを描画し、描画した矩形（左上原点の`{x, y, width, height, rotation}`）を返す。`settings` はレイヤー1件、`textToDraw` は解決済みの文字列
- `calculateTextPosition(...)`: テキスト位置を計算
- （`getFormattedDate` / Exif 値の整形は `utils/textContent.js` ／ `exifHandler.getExifValue()` に移動した）

**回転（`layer.rotation`、度数）:** `settings.rotation`が非0の場合、描画前に（バウンディングボックスの中心を軸に）`ctx.translate`＋`ctx.rotate`＋`ctx.translate`で座標系を回転させてから`fillText`する。バウンディングボックス自体は「回転前のローカル座標」のまま返す（`x, y, width, height`は無回転の値）。回転適用の有無や当たり判定・ハンドル描画への影響は5.12節・5.22節を参照。統合により、撮影日・Exif を含むレイヤーも自由テキストと同じく `rotation` を持つ。

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
- `processBackgroundImageFile(file, redrawCallback)`（**B-6**）: 背景タイプ「別画像」用の画像を読み込む。`FileReader` → `Image` → `stateManager.setBackgroundImage(img)` → `redrawCallback()`。Exif 抽出・トリミング初期化・`initializeUIFromState()` は行わない
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
- `displayExifInfo(exifData, container)`: Exif情報を「情報」タブ（`#exifDataContainer`）にアイコン＋値だけで描画（7.7節。`exifData` が null／該当項目なしなら `.exif-empty` の1行）
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
- `register(entry)`: `{ id, type, x, y, width, height, rotation? }`形式の矩形を1件登録する（描画順=z順に積むこと）。`rotation`（度）はテキストレイヤーのみ持ちうる（写真・背景は常に無回転）
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
- **軸ロック**: `move` モードのドラッグ中に **Shiftキーを押している間、移動量の大きい方の軸だけに固定**する（縦だけ／横だけの移動。写真・テキスト・背景・影のどのドラッグでも効く）。スナップ計算の前に適用する。回転ハンドルの Shift（15度スナップ）は別ドラッグモード（`mode: 'rotate'`）なので競合しない
- 矢印キーnudge: 何かが選択されている状態で矢印キーを押すと1px相当、Shift+矢印キーで10px相当（いずれもプレビューcanvas上のpx単位）移動する。フォーカスが入力欄（input/textarea/select）にある間は無効化される。**「背景」タブ・「フレーム」タブ（影が有効なとき）では、選択の有無に依らず矢印キーが背景／影のオフセット微調整になる**（本体ドラッグのタブ別振り分けと揃えている。5.16節「タブ別ドラッグ」）
- **Deleteキーでのテキストレイヤー削除（D-5 / バケット4）**: 「テキスト」タブがアクティブ（`getActiveTab() === 'tab-text'`）で、選択中が `textSettings.layers` に存在するidのとき、`Delete` / `Backspace` で `removeTextLayer(id)` ＋ 選択解除（＝リスト行の × ボタンと同じ）。入力欄フォーカス中は無効。統合後は撮影日・Exif を含むレイヤーも削除対象（固定レイヤーの概念は無くなった）
- **拡大・回転ハンドル（テキスト系オブジェクトのみ。自由テキスト・撮影日・Exifブロックいずれも対応）**: `pointerdown`時、通常のオブジェクト当たり判定（`interactionRegistry.hitTest()`）より先に`textHandleStore.getTextHandles()`のハンドル座標との距離判定を行う（当たり判定半径`HANDLE_HIT_RADIUS = 10px`）。ヒットした場合は`dragState.mode`を`'resize'`または`'rotate'`にしてドラッグを開始し、通常の移動ドラッグ（`mode: 'move'`）とは別処理で`textAdapter.commitResize()`/`commitRotate()`を直接呼ぶ（アダプタの`getValue`/`computeChanges`/`commit`という汎用インターフェースではなく、テキスト専用の`getTransform`/`commitResize`/`commitRotate`を使う。写真・背景にはこの概念がないため）
- **写真の四隅ハンドルとトリミングモード（5.24節・5.25節、7.2節「オンキャンバス・トリミング」参照）**: 写真選択中は`photoEditModeStore`のモード（`select`/`crop`）で挙動を切り替える。
  - `pointerdown`で、テキストハンドルと同様に通常のオブジェクト当たり判定より先に`photoCropStore.getCropHandles()`の四隅座標を距離判定する（半径`HANDLE_HIT_RADIUS`）。**select モード**でヒット → `dragState.mode = 'photoResize'`（開始点と「中心→掴んだ隅」方向の単位ベクトルを保持し、`pointermove`で符号付き投影量を`photoAdapter.commitMarginResizeByDrag()`に渡し`baseMarginPercent`を増減。中心からの距離比を使う旧方式は「中心を通り越すと余白が逆に減る」不具合があったため置き換えた）。**crop モード**でヒット → `dragState.mode = 'cropRectResize'`（掴んだ隅と`frozenFrame.whole`のサイズから`rect`の差分を計算し`resizeCropRect()`。**A-3: `cropSettings.rotation` があれば `clampCropResizeToRotatedImage()` で掴んだ隅の対角を固定したまま傾いた画像に収める**→`photoAdapter.commitCropRect()`）。crop モードでクロップ窓の内側なら`dragState.mode = 'cropPan'`（`rect.x/y`をドラッグ方向へ平行移動。**回転時は `clampCropPanToRotatedImage()` で端で止める**）。**crop モードで「暗い余白」（ハンドルでも窓内でもない）をドラッグ → `dragState.mode = 'cropRotate'`（A-3。クロップ窓中心まわりのポインタ角度の変化量を `photoAdapter.commitCropRotation()` へ。Shift で 1° 刻み。`rect` は変えず `rotation` だけ更新＝逆方向へ回すと元サイズへ戻る）**。同じ余白の「短いタップ」は従来どおり crop モードの確定（`cropExitCandidate`）——ドラッグ扱いになれば `pointerup` のタップ判定で弾かれ `exitCrop` は走らない。
  - `pointerup`で、**pointerdown からの移動量が`CLICK_MOVE_THRESHOLD`(4px)未満、かつ押下時間が`CLICK_TAP_MS`(400ms)未満**のときだけ「短いタップ」とみなす: select モードで選択済みの写真本体タップ → `photoEditModeStore.enterCrop()`（現在のプレビュー座標を`frozenFrame`にスナップショット）。crop モードでクロップ窓の外のタップ → `photoEditModeStore.exitCrop()`（出力枠は変えない）。**動かさずに長押ししてから離した場合はモード切替が発動しない**（`pointerDownCtx.downTime` を `performance.now()` で記録して判定。以前は移動量だけを見ていたため、単なる長押しでも切り替わっていた）。`CLICK_TAP_MS` は手触りを見て調整可。
  - `Escape` / `Enter` キーでも crop モードを抜ける（`docs/roadmap.md` A-13）。crop モード中は矢印キーがクロップ矩形のパンになる。`Enter` は入力欄フォーカス中（`isEditableElement`）には効かない（keydown の先頭 return）。
  - **レイアウトタブの「写真のトリミング」セクション（`#cropSection`）内をクリックしても crop モードに入る**（`docs/roadmap.md` A-13）。`uiController` が `#cropSection` の `click` で `canvasInteraction.requestEnterCropMode()` を呼ぶ（プレビュー上で選択済み写真を再タップするのと同じ経路。写真が未選択なら先に選択する）。比率タイル（`<button class="ratio-tile">`）・見出しのクリックはすべて crop モードへ入る。除外するのは数値入力欄・水平出しスライダー（`<input>` / `<textarea>`）と**見出し右端のセクション操作ボタン群（`.legend-tools` ＝ 縦横入れ替え `.ratio-rotate-btn` ／ リセット `.reset-btn`。E-11）**と**「操作」開閉（`.op-hint`。E-10）**だけ（`e.target.closest('input, textarea, .legend-tools, .op-hint')` でガード）。`requestEnterCropMode()` は `enterCrop()` の frozenFrame スナップショット作成を集約したモジュール関数で、プレビュータップ側の `enterCropMode` もこれを使う。**すでに crop モードのときは何もしない**（`isCropMode()` なら即 return。`docs/roadmap.md` G-6）——frozenFrame は select モードのレイアウト基準なので、crop 済み（`rect0` が小さい）状態で取り直すと `cropModeGeometry` の `whole = photoBox0 / rect0` が一段拡大し、繰り返すと元画像が無限に拡大してクロップ枠が消える。
  - **crop モード中は「キャンバスの外側」をクリックしてもクロップを確定できる**（`docs/roadmap.md` A-5）。`initCanvasInteraction()` が `previewCanvas.closest('.canvas-area')` にも `pointerdown`/`pointerup` を張り、**crop モード中かつ `e.target !== previewCanvas`**（`.canvas-area` のパディングや、出力比率が縦長／横長のときにキャンバス周囲へできるレターボックス）で、canvas 本体と同じ「短いタップ」判定（`CLICK_MOVE_THRESHOLD` / `CLICK_TAP_MS`）を満たしたときに `photoEditModeStore.exitCrop()` を呼ぶ。キャンバス本体上のクリックは上の `pointerup`（クロップ窓の外 → `exitCrop`）が扱うため、この余白リスナーは `e.target === previewCanvas` のイベントを無視する。select モードでは何もしない（キャンバス外クリックでの選択解除は A-5 の対象外＝別機能）。リスナーは `.canvas-area` に限定するので、設定パネル・上部バー・比率タイル等のクリックは従来どおり crop モードを抜けさせない。
  - 写真本体（ハンドル以外）の select モードでのドラッグは従来どおり`photoAdapter`の`move`処理（`photoViewParams`更新）。
  - **写真の回転ハンドル（A-4）**: select モードで写真選択中のとき、`pointerdown` で四隅■より先に `photoCropStore.getCropHandles().rotate`（回転適用後の画面座標）との距離判定（半径 `HANDLE_HIT_RADIUS`）を行い、ヒットしたら `dragState.mode = 'photoRotate'`。`pointermove` はテキストの `rotate` と同じ角度計算（ボックス中心から見たポインタ角度の変化量を開始角に加算、**Shift で15°刻みにスナップ**）で `photoAdapter.commitRotate(deg)` を呼ぶ（`(-180, 180]` に正規化、0.1°丸め）。crop モードでは無効。
- **プレビュー上のホイール操作**: 現在は未使用（`previewCanvas`に`wheel`リスナーを付けていない）。以前は select モードで写真上のホイールが`baseMarginPercent`（余白）を増減していたが、四隅■ハンドルのドラッグで余白を直接いじれるようになったため冗長・誤操作の元として削除した（`docs/roadmap.md` A-6。`photoAdapter.commitMarginDelta()`と定数`MARGIN_WHEEL_STEP`も撤去）。「背景タブでホイール→背景拡大倍率」（`docs/roadmap.md` B-2）も検討したが、誤操作の元になるとしてユーザー判断で不採用。本体ドラッグ側だけタブで切り替える（上記「タブ別ドラッグ」）
- **選択変更と再描画（設計上の注記）:** `selectionStore`の選択状態変更（`setSelectedId()`）自体は`editState`の変更ではないため、`stateManager.js`の通常の状態変更リスナー（`requestRedraw`等）を経由しない。ドラッグを伴わない純粋なクリック選択（`pointerdown`直後に一度も`pointermove`が発火しないケース）でも選択ハイライトやハンドルが即座に表示されるよう、`main.js`が`selectionStore.onSelectionChange(() => requestRedraw())`を明示的に登録している。
  - 拡大: ボックス中心からハンドルまでの距離の比（現在距離÷ドラッグ開始時距離）をドラッグ開始時点の`size`に掛ける。回転角に関わらず「ハンドルを中心から遠ざける/近づける」動作になる
  - 回転: ボックス中心から見たポインタの角度（`Math.atan2`）の変化量をドラッグ開始時点の`rotation`に加算する。**Shiftキーを押しながらドラッグすると15度刻みにスナップ**する

### 5.17 interaction/adapters/*.js
「ドラッグ量（プレビューpx）」と「各対象が実際に状態として持っている値の単位系」との変換を吸収する層。`canvasInteraction.js`は対象の種類を意識せず、共通インターフェース（`getValue`, `computeChanges`, `commit`）越しに扱う。

| アダプタ | 対象 | 値の単位系 | 備考 |
|---|---|---|---|
| `textAdapter.js` | `textSettings.layers[]`の各レイヤー（id ＝ レイヤーの uuid） | 写真短辺基準の% | `resolveLayer(id)`（`layers` から検索）＋ `updateTextLayer(id, changes)` で書き戻し。サイズのクランプは `controlsConfig.textLayerSize`（レイヤー共通の1範囲、最大50%） |
| `photoAdapter.js` | 写真の枠内配置（`photoViewParams`） | 可動範囲(movable width/height)に対する0.0〜1.0の割合 | `layoutCalculator.js`の可動範囲計算と対応させる必要があり、`getLastPreviewContext().scale`を使った変換が必要。**A-4: 可動範囲は「回転後の外接矩形」基準で計算する**（`computeChanges` が `photoViewParams.rotation` から bbox を出す）。加えてトリミング用に、`getCropRect()`（A-3: `cropSettings.rotation` があれば `clampRectToRotatedImage` を通した“見えているサイズ”を返す）・`getDesiredCropRect()`（縮小前の `cropSettings.rect`）・`commitCropRect(rect)`（そのまま書くだけ。クランプは呼び出し側）・`getCropConstraint()`・`commitMarginResizeByDrag(...)`、A-4 の回転用に `getRotation()`・`commitRotate(deg)`（`(-180,180]` 正規化＋0.1°丸めで `photoViewParams.rotation`）、A-3 の水平出し用に `getCropRotation()`・`commitCropRotation(deg)`（**±45 クランプするだけ。`rect` は変えない**＝Model B）を持つ（5.16節参照。`textAdapter`の`getTransform`系と同種の拡張） |
| `backgroundAdapter.js` | 画像背景の位置（`imageBlurBackgroundParams`。`imageBlur` と `bgImage` で共有） | 写真短辺基準の%（textAdapterと同じ単位系） | 単色背景（`backgroundType === 'color'`）や、`bgImage` で別画像が未選択の場合はそもそも`interactionRegistry`に登録されないため、ドラッグ対象にならない。**背景のドラッグ位置調整は「背景」タブでのみ有効**で、そのタブでは写真の上を含むキャンバス全面のドラッグを`canvasInteraction.js`がこのアダプタへ振り替える。他タブでの余白ドラッグでは背景は動かない（5.16節「タブ別ドラッグ」参照）。原点スナップ用の`originSnapPx(startValue, ctx)`を持つ |
| `shadowAdapter.js` | フレームの影のオフセット（`frameSettings.shadowParams.offsetX/offsetY`） | 写真短辺基準の%（-25〜25でクランプ。`controlsConfig.frameShadowOffsetX`） | 「フレーム」タブ表示中かつ`shadowEnabled === true`のときだけ、`canvasInteraction.js`が写真本体（テキスト以外）のドラッグをこのアダプタへ振り替える。`backgroundAdapter`と同じ`getValue`/`computeChanges`/`commit`＋`originSnapPx`パターン。0.1%丸めも同様（5.16節「タブ別ドラッグ」参照） |

**単位変換上の注意（重要）:** `getLastPreviewContext()`が返す`photoShortSidePx`は、写真の実解像度ではなく**プレビュー描画時に縮小された後の短辺px**を指す。ドラッグのポインタ移動量（`dxPx`/`dyPx`）も同じプレビューcanvasのpx空間の値であるため、`textAdapter`や`backgroundAdapter`ではscaleによる再変換は不要で、単純な比率計算（`dxPx / photoShortSidePx * 100`）だけで正しく変換できる。過去にここへ誤って`/ scale`を追加してしまい、プレビューの縮小率次第でドラッグ量が数倍に増幅される不具合が発生したことがあるため、新しいアダプタを追加する際は注意すること。

**タブ別ドラッグ（「開いているタブでプレビュー上のドラッグの意味を切り替える」）:** `canvasInteraction.js`の`pointerdown`は、通常のオブジェクト選択・移動に入る前に`tabManager.getActiveTab()`を見て分岐する。

- **「背景」タブ**表示中は、テキスト以外のヒット（写真本体・余白どちらも）を`backgroundAdapter`（id `'background'`）へのドラッグに振り替える（キャンバス全面が背景の位置調整面になる）。ホイールでの拡大倍率変更は検討したが不要と判断し実装しない。
- **「フレーム」タブ**表示中は、`frameSettings.shadowEnabled === true`なら写真本体（テキスト以外）のドラッグを新設の`shadowAdapter`（id `'shadow'`）へ振り替える。影オフなら何も起こさない（写真位置ドラッグへフォールバックしない）。
- **それ以外のタブ（レイアウト／文字／出力／プリセット）で余白（背景ボックス）をクリック／ドラッグしても、背景は動かさない**。単なる選択解除（`setSelectedId(null)`）として扱う。以前は「背景」タブ以外でも余白ドラッグで背景がパンし、キャンバス全体に選択枠が出ていた（不具合として修正）。背景のドラッグ位置調整は「背景」タブ限定になった。

これらのタブ限定ドラッグは**それ自体は選択状態を変えず**、クロップモードへの入口（`onPhotoBody`）にもしない。バウンディングボックスのガイドスナップの代わりに**原点スナップ**を使う（`dragState.originSnap`）: オフセット値が中立(0)に`ORIGIN_SNAP_PX`(6px)以内まで近づくと 0 にスナップし、赤い中央ガイド線（X=0 は縦線、Y=0 は横線）を出す。各アダプタの`originSnapPx(startValue, ctx)`が「各軸を 0 に戻すためのドラッグ量(px)」を返す。モードを示すUI（カーソル変更・ヒント文など）は出さず、「開いているタブ」自体を手がかりとする。テキストレイヤーのドラッグ・選択はどのタブでも従来どおり最優先で効く（`interactionRegistry`の登録順で text が後勝ち）。

**タブ切り替え時の写真選択の解除:** 「背景」「フレーム」タブでは写真の本体ドラッグ・クロップができない。レイアウトタブで写真を選択した（四隅に■マーカーが出ている）まま「背景」「フレーム」タブへ移ると、マーカーが出たまま操作不能に見えて紛らわしい。そのため `tabManager.onTabChange()` を介して、**これらのタブへ移った瞬間に写真の選択（`selectedId === 'photo'`）を解除する**（`main.js` で配線。`selectionStore.onSelectionChange` 経由で crop モード解除・再描画も走る）。「文字」「出力」「プリセット」タブでは写真の本体ドラッグが従来どおり効くため、選択は維持する。テキストの選択はどのタブでも維持する。

**矢印キーによる背景／影の微調整:** 「背景」タブ・「フレーム」タブ（`shadowEnabled === true`）では、`canvasInteraction.js` の keydown ハンドラが（選択の有無・種類より先に）矢印キーを `backgroundAdapter` / `shadowAdapter` のオフセット微調整へ振り替える（Shift 併用で 10px 相当、通常 1px 相当。プレビュー px → 写真短辺基準% に換算）。フレームタブで影が無効なときは振り替えず、通常の選択オブジェクトの nudge にフォールバックする。

**桁あふれ対策の丸め処理（重要）:** `textAdapter.js`・`backgroundAdapter.js`・`shadowAdapter.js`の`computeChanges()`は、割り算由来の循環小数（例: `-11.640211640211641`）をそのまま状態に書き戻さないよう、結果を必ず0.1%単位に丸める（`Math.round(value * 10) / 10`）。ドラッグ中継続的に加算されていく値のため丸めを怠ると、UIの数値表示欄が有効数字ギリギリまで表示されて桁あふれを起こす（実際に発生した不具合）。この`computeChanges()`はドラッグだけでなく矢印キーnudgeからも呼ばれるため、丸めは両方の経路に効く。`uiController.js`側の対応する表示スパン（`bgOffsetX/YValueSpan`、`textDateOffsetX/YValueSpan`、`textExifOffsetX/YValueSpan`）も`.toFixed(1)`で表示桁を明示的に制限し、二重に防御している。

**`textAdapter.js`の拡張（拡大・回転ハンドル用）:** 通常の`getValue`/`computeChanges`/`commit`（位置移動用）に加えて、以下を持つ。
- `getTransform(id)`: ドラッグ開始時点の`{ size, rotation }`を取得（`resolveLayer()`経由で撮影日・Exifにも対応）
- `commitResize(id, startSize, scaleFactor)`: `startSize * scaleFactor`を`controlsConfig.textLayerSize`（レイヤー共通、0.1〜50%）でクランプして`size`に反映
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
編集設定（`stateManager.js`の`EDITABLE_SETTINGS_KEYS`で定義される範囲）を、名前付きプリセットとして`localStorage`（キー: `kakomi_presets`）に保存・一覧取得・削除・適用するモジュール。読み込んだ画像そのものは対象外。`textSettings`（`layers[]` を含む）もそのまま保存するため、テキストの内容・個数・並び順もプリセットの一部として保存・復元される。**旧形式（`{ date, exif, customTexts }`）で保存されたプリセットは `applyPreset` の入口で `migrateTextSettings()`（`stateManager.js`）が `{ layers: [] }` へ変換してから適用する**（`cropSettings` の `migrateCropSettings` と同じ考え方。`updateState` は deep-merge のため、事前に `settings.textSettings` をまるごと差し替えて旧キーが残らないようにする）。

**F-2 / F-5（保存する項目の2階層選択）:** `EDITABLE_SETTINGS_KEYS` を**タブ単位の5セクション**に束ねた `PRESET_SECTIONS` を持つ。**背景・フレーム・テキストの3つは「効く所だけ」の子グループ（`groups`）を持つ**（F-5、`docs/roadmap.md` F-5）:

| セクション | 子グループ | 保存キー（ドット付き含む） |
|---|---|---|
| `output`＝キャンバス | —（葉） | `outputTargetAspectRatioString` / `baseMarginPercent` / `outputSettings` |
| `crop`＝写真のトリミング | —（葉） | `cropSettings` / `photoViewParams` |
| `background`＝背景 | `type` / `color` / `blur` | `backgroundType`（単色／ぼかし／別画像）／ `backgroundColor` ／ `imageBlurBackgroundParams`（画像背景の見え方・色調・位置。B-6 で「ぼかし」「別画像」共有）。※ B-6 の別画像そのもの（`editState.bgImage`）は保存対象外 |
| `frame`＝フレーム | `corner` / `border` / `shadow` | `frameSettings.cornerStyle`ほか ／ `frameSettings.border` ／ `frameSettings.{shadowEnabled,shadowType,shadowParams}` |
| `text`＝テキスト | —（葉。バケット4 で子グループ廃止） | `textSettings` |

`keys` の要素はドット無しの状態キーか**ドット付きパス**（`frameSettings.border` など）。`savePreset` はパスを辿って部分オブジェクトを組み立て、`applyPreset` 側の `updateState` deep-merge で既存値の上にマージされる（旧テキストプリセットのみ `migrateTextSettings()` を通す。上記5.19冒頭）。各セクションの `label` は「保存済み」一覧のメタ表示に出る。ドリフト検知ガードは葉キーをトップレベルへ丸めて `EDITABLE_SETTINGS_KEYS` と突き合わせる。

**主要関数:**
- `getPresets()`: 保存済みプリセットの一覧を取得（`{ id, name, createdAt, sections, groups?, settings }`の配列）
- `savePreset(name, sections, groups)`: 選択セクション＋子グループ（`{ background: ['type','blur'] }` の形。一部だけ選んだセクションのみ）に対応する保存キーだけを組み立てて保存。`sections` 省略・空なら全セクション。**一部グループだけのセクションがあれば `preset.groups` も記録**（全グループなら省略＝旧形式互換）。名前は `resolvePresetName` で解決（F-4）
- `resolvePresetName(name, existingNames?)` / `getNextAutoPresetName()`（**F-4**）: 空名なら「プリセット N」（N＝空き番号の最小、1始まり）、明示名が既存と衝突する間は末尾に ` 2` ` 3` …。**上書きはしない。** フォームの `placeholder` は `getNextAutoPresetName()` を表示
- `getPresetSections(preset)`: 含むセクションのキー配列（`sections` 無しの旧プリセットは「全セクション」）
- `getPresetGroups(preset)`: 「一部の子グループだけ保存した」セクションの `{ sec: [groupId…] }`（全グループ or 葉は含まない）。メタ表示の「（一部）」判定に使う
- `deletePreset(id)` / `applyPreset(id)`: `applyPreset` は `updateState()` の deep-merge なので**含まれるキー（部分オブジェクト含む）だけ上書き**、含まれないものは現状維持。旧プリセット（全キー入り）は従来どおり全適用

**UI連携（`uiController.js` `renderPresetSectionChecks()`）:** 「プリセット」タブの保存フォームは `PRESET_SECTIONS` から**縦ツリー**（`#presetSectionChecks` = `.preset-tree`）で組み立てる（**F-3**）。親5行＝チェック＋アイコン（`#i-canvas` / `#i-photo-crop` / `#i-bg` / `#i-frame` / `#i-text`）＋対象名、背景・フレーム・テキストは子グループを畳んで持つ（シェブロンで開閉。既定は畳む）。**親チェックは3状態**（全 ✓／無 空／一部 −）。親クリックは「全部 ON でなければ全 ON、全 ON なら全 OFF」。子を1つ外すと親は自動で −。保存時 `collectPresetSelection()` が `{ sections, groups }` を集約して `savePreset` へ。0個なら `alert`。保存後は名前欄だけクリア＋`placeholder` 更新、**チェック状態はユーザーが残したまま維持**。一覧の各行メタは含むセクション名（一部グループだけのセクションは「◯◯（一部）」＋`title` に内訳。全部なら「すべて」）。プリセット適用・削除後は `initializeUIFromState()` 全再構築（＝チェックは全 ON に戻る）。

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
選択中の写真に表示するハンドルの画面上の座標（previewCanvasのpx空間）を一時的に保持する。`textHandleStore.js`（5.22節）と同じ「描画側が書き、操作側が読む」パターン。select モードでは四隅■リサイズハンドル＋上端の回転ハンドル（`rotate`。A-4。写真が回っていれば座標も回転適用後で記録）、crop モードではL字ハンドル＋`cropScreen`／`whole`。モードで見た目・挙動は変わるが、共有ストアに置いて同じ当たり判定経路（`canvasInteraction.js` の `pointerdown`）で拾う点は共通。

**主要関数:**
- `setCropHandles(h)`: `{ corners: { tl, tr, bl, br }, center: {x,y}, cropScreen?, whole? }`を設定する（`canvasRenderer.js`の`drawPhotoResizeHandles()`／`drawCropModeOverlay()`が`drawPreview`のたびに書き込む）。`cropScreen`（現在のクロップ矩形の画面矩形）と`whole`（元画像全体の画面矩形）は crop モードのときだけ入り、`canvasInteraction.js`が本体パン・ハンドルドラッグの座標変換に使う
- `getCropHandles()`: 現在の値を取得する（未選択または写真以外を選択中は`null`。`canvasInteraction.js`の`pointerdown`がハンドルへの当たり判定に読み取る）
- `clearCropHandles()`: 値をクリアする（`drawPreview`の冒頭で`interactionRegistry.clear()`等と合わせて呼ばれる）

### 5.25 interaction/photoEditModeStore.js
写真が選択されているときの「編集サブモード」（`'select'` / `'crop'`）を保持する一時UI状態。`selectionStore.js`（5.13節）と同じく`editState`とは分離しており、Undo履歴にも書き出しファイルにも含めない。

- `getMode()` / `isCropMode()`、`enterCrop(frozenFrame)` / `exitCrop()` / `reset()`、`onChange(fn)`。
- `frozenFrame`: crop モードに入った瞬間の `{ scale, photoBox0: {x,y,width,height}, rect0: {x,y,w,h} }`。crop モード中の描画（`drawCropModeOverlay`）と当たり判定はこれを基準に固定する（7.2節「フリーズフレーム」参照）。
- `main.js`が`onChange(() => requestRedraw())`（モード変更＝`editState`変更ではないため明示的に再描画）と、`selectionStore.onSelectionChange`内で「写真以外が選択されたら`reset()`」を配線する。

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
stateManager.setImage() で状態更新（差し替え時は G-2 でトリミングだけ初期化）
  ↓
uiController.initializeUIFromState() でUI更新
  ↓
main.requestRedraw() でプレビュー描画（冒頭で updateImagePresenceUI() が
  .canvas-area の .has-image / .no-image を付け替え、ドロップダイアログ↔キャンバスを切り替える）
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

`cropSettings`として実装される。**2026年8月28日の再設計で、中央固定ズーム＋パン方式（`{ aspectRatio, zoom, offsetX, offsetY }`）から、非対称な切り抜き矩形をそのまま持つ方式（`{ aspectRatio, rect }`）に変更した**。詳細な経緯は `docs/session-log-2026-08-27-2.md` 参照。

**データモデル:**
- **`cropSettings.rect`**: 切り抜き矩形を「元画像に対する割合」 `{ x, y, w, h }`（いずれも 0–1、x/y が左上、w/h がサイズ）で保持する。これが唯一の表現。A-3 の `rotation` が付いているときは「クロップ窓が直立した座標系（straightened space）」での軸平行矩形（回転 0 のとき image space と一致）。**`rect` は水平出しで縮小しない“望むサイズ”を保持する（Model B）**——傾いた元画像からはみ出すぶんは、描画・当たり判定の入口（`layoutCalculator` / `canvasRenderer.effectiveCropRect` / `photoAdapter.getCropRect`）で `clampRectToRotatedImage()` が中心固定縮小して吸収する。そのため**角度を戻すと切り抜きは元のサイズへ戻る**（Lightroom Web の角度補正と同じ）。L字ハンドルで手動リサイズしたときだけ、その“見えているサイズ”が新しい `rect` として確定する。
- **`cropSettings.rotation`（A-3。`docs/roadmap.md` A-3）**: 水平出し（切り抜き時の元画像回転）角度、度、-45〜45（`controlsConfig.cropRotation`）。**クロップ窓は出力フレーム内で軸平行のまま、元画像がその下で傾く**（Lightroom の「角度補正」）。7.2節「切り抜きの水平出し」参照。
- **`cropSettings.aspectRatio`**: 切り抜き矩形に課す比率制約。
  - `'free'`: 制約なし（自由比率、UI上は「フリー（自由比率）」）。既定値。
  - `'1:1'`, `'4:3'`, `'16:9'` など、または `'幅:高さ'` のカスタム: その比率でしか矩形をリサイズできない。比率を選ぶと、そのとき現在の矩形の中心を保ったまま、その比率へ**外接方向**で合わせる（`utils/cropRect.js` の `growRectToAspect`＝現在の矩形を含む最小の比率一致矩形。[0,1] 超は比率保持で頭打ち。既にその比率なら完全 no-op）。以前は `fitRectToAspect`（内接＝比率を選ぶたびに縮む）だったが、A-13 で比率タイルのクリックが crop モード遷移も兼ねるようになり、別々の比率を続けて押すとクロップ枠が 1px へ収束する不具合（`docs/roadmap.md` G-6 続報）が顕在化したため外接方式に変更した。`fitRectToAspect` は `stateManager.setImage` の画像ロード時再フィット（全体矩形から）でのみ使う。

**操作方法:**
- **プレビュー上（オンキャンバス）**: 5.16〜5.17節・7.2節「オンキャンバス・トリミング」参照。写真を選択した状態でもう一度クリック（またはレイアウトタブの「写真のトリミング」セクション内をクリック）すると「トリミングモード」に入り、四隅の L 字ハンドルで切り抜き範囲を指定、写真本体ドラッグで切り抜き範囲を平行移動、写真の外（またはキャンバスの外の余白。A-5）をクリックするか Esc / Enter で確定する。
- **「レイアウト」パネルの UI**: 「写真のトリミング」は比率タイルピッカー（`#cropAspectRatioPicker`。オリジナル / フリー / 各比率ファミリー / カスタム幅高さ ＋ 見出しの回転ボタン。5.3節「比率タイルピッカー」参照）＋ **「水平」スライダー（`#cropRotation`。A-3）＋「切り抜きをリセット」ボタン（`#resetCrop`。A-3）**。**「切り抜き位置（横／縦）」スライダーはフェーズ2で撤去**（`docs/roadmap.md` A-1）。`rect` のパンはプレビュー上のジェスチャー（crop モードの本体ドラッグ・矢印キー）と「大きさと配置をリセット」ボタン（`#resetPhotoPlacement`。`uiController.js` の `cropRectWithPan(rect, 0.5, 0.5)` で中央へ）からのみ動かす。

**実装詳細:**
- `layoutCalculator.js` の `calculateLayout()` が `utils/cropRect.js` の `resolveCropRect(cropSettings, originalW, originalH)` を呼んで矩形を得る。`resolveCropRect` は `cropSettings.rect` が有効ならそれを、旧 `zoom`/`offset` 形式ならその場で矩形へ変換、どちらでもなければ全体（`{0,0,1,1}`）を返すため、未移行の状態でも描画は壊れない。
- `sourceX = rect.x * originalW`、`sourceWidth = rect.w * originalW`（Y も同様）。`destWidth === sourceWidth`（元画像の解像度を一切変えないという中核不変条件は維持）。
- **A-3 の水平出し（`cropSettings.rotation ≠ 0`）**: `layoutCalculator` は角度を `photoDrawConfig.cropRotation` に素通しし、さらに**切り出しに使う矩形を `clampRectToRotatedImage()` で「見えているサイズ」に縮めてから** `source*` / `dest*` を出す（`dest*` は縮んだぶん小さくなる＝水平出しで出力写真は少し小さくなる。出力キャンバス寸法はその `dest*` から。`rect` 自体は state 上では縮めない）。実際の塗りは `canvasRenderer.drawCroppedPhoto()` が「クロップ窓 `dest*` にクリップ → 窓中心座標系へ → 画像中心まわりに `cropRotation` 回転 → 元画像全体を配置して `drawImage`」で行う（`drawImage` の 4 数値 source では回転ソースを表せないため）。**空いた角が出ない**ことは `clampRectToRotatedImage()` が保証する（下記）。A-4 の写真ボックス回転とは入れ子（A-4 が外＝`dest*` 全体、A-3 が内＝`dest*` の塗り）。
- **回転対応クランプ（`utils/cropRect.js`）** ——`windowFitsInRotatedImage(rect, θ, imgW, imgH)`: `rect` が straightened space の `[0,1]` に収まり、かつ 4 隅を image space へ写して（画像中心周りに `−θ`）`[0,imgW]×[0,imgH]` に入っているか。
  - `clampRectToRotatedImage(rect, θ, imgW, imgH)`: はみ出していたら**中心固定・比率保持**で二分探索して収まる最大へ縮める（`θ=0` は従来の `clampRect`）。**描画・当たり判定の入口専用**（`layoutCalculator` / `effectiveCropRect` / `photoAdapter.getCropRect`）＝ state の `rect` は書き換えない。角度を戻せば元へ戻る。
  - `clampCropResizeToRotatedImage(rect, corner, θ, imgW, imgH)`: L字ハンドルのリサイズ用。**掴んだ隅の対角（アンカー）を固定**したまま、そのアンカーを支点に二分探索スケールして収める（中心固定と違い反対側の辺が動かない＝「片側を引いたら反対側が近づく」不具合の修正）。
  - `clampCropPanToRotatedImage(startRect, fdx, fdy, θ, imgW, imgH)`: パン用。開始矩形から目標へ向けて平行移動量を二分探索で頭打ち（端で止まる）。
  - `resizeCropRect` の自由比率分岐は、動かす辺自体も `[0,1]` で頭打ちにする（回転なしでも「外へ引くと `clampRect` が w と x を独立に丸めてアンカー辺まで動く」不具合の修正）。
- **旧形式からの移行**: 保存済みプリセットは `presetStore.js` の `applyPreset()` が `utils/cropRect.js` の `migrateCropSettings()` で `{ aspectRatio, rect }` に正規化してから適用する。旧 `'original'`＋ズーム1＋オフセット0.5 は `rect {0,0,1,1}` に完全一致、旧 `'original'` は `'free'` に寄せる。固定比率＋ズームありは幾何変換でベストエフォート移行し、画像ロード前に適用された場合は `stateManager.js` の `setImage()` が実際の画像比率で `rect` を再フィットする。

### 7.2 レイアウト設定
- **キャンバス（節見出し。旧「出力アスペクト比」。`docs/roadmap.md` E-8）**: 最終的な出力画像の縦横比を指定
  - **比率タイルピッカー（`#outputAspectRatioPicker`。`docs/roadmap.md` A-1 / A-14）**: `1×1` / `2×3` / `3×4` / `4×5` / `L判`(89:127) / `9×16` / `10×16` / カスタム（縦向き表記。回転ボタンで横長へ）。比率の形をミニ長方形で描いたタイルをクリックして選ぶ（`js/ui/ratioPicker.js`。5.3節「比率タイルピッカー」参照）
  - **カスタム比率の自由入力（実装済み）**: 「カスタム」タイルを選ぶと幅/高さの数値入力欄（`#customAspectRatioContainer`）が現れ、任意の `幅:高さ` 比率を指定できる。**幅高さの入れ替えは見出しの回転ボタン**（A-14 で専用 ⇄ ボタンを廃止・一本化）。入力値は `outputTargetAspectRatioString`（例: `"3:2"`）として状態に保存される。カスタムタイルを押した時点では state は変わらず、入力欄を編集した時点で反映される。
    - 内部的には `outputTargetAspectRatioString` に `"custom:"` プレフィックスを付けた古い形式の後方互換処理（プレフィックス除去）が残っているが、現在のUIはプレフィックスなしの `"幅:高さ"` 形式で保存する。
  - `layoutCalculator.js` は特別な値 `"original_photo"`（入力写真の比率をそのまま使う）にも対応しているが、現在のタイルにはこの項目がなく、UIから選択する手段はない。
  - これが最終的なJPEGのアスペクト比となる
- **基準余白 / 「大きさ」スライダー**: 内部値`baseMarginPercent`は構図調整後の写真の短辺に対する%（0-300%）で不変。
  - この値は「最小限の余白量」の目安。実際の余白は、出力画像の目標アスペクト比を維持するために、この基準値よりも一部が自動的に広がる場合がある。
  - **UI 表記は「大きさ」（`docs/roadmap.md` A-10）**: スライダー（`#baseMarginPercent`。`controlsConfig.photoSize` の min15/max100/step0.5 で駆動）は「写真短辺がキャンバス短辺に占める割合%」を見かけ値として扱い、**右に倒すほど写真が大きくなる**（＝余白が減る）。`marginToSize(m) = 100/(1+m/45)`（m=0→100%、m=5→ちょうど90%、m=300→約13%）と逆変換`sizeToMargin(s) = 45(100-s)/s`で`baseMarginPercent`と1対1対応。既定 margin=5 がちょうど 90% になるよう分母を 45 に選んである。スライダー下限 15% は `marginToSize(300)≈13%` より上なので、全域が実 `baseMarginPercent`（0〜255）に 1:1 対応する（不感帯なし。内部ロジックには手を入れず range 属性だけで解決）。`updateSliderValueDisplays()`が表示・入力欄同期を、専用の`input`／`dblclick`（既定 margin 5＝size 90 へ）リスナーが保存を担う（汎用`addNumericInputListener`は使わない）。`updateSliderValueDisplays()`はドラッグ中に値が飛ばないよう「スライダーにフォーカスがあるあいだは`.value`を書き換えない」ガードを持つため、`dblclick`／ダブルタップのリセットハンドラは`updateState`後に`baseMarginPercentInput.value`へ`marginToSize(5)`を明示代入してつまみ位置を戻す。四隅■ハンドルのドラッグ（`commitMarginResizeByDrag`）でも同じ表示に反映される。レイアウト計算（`layoutCalculator`）には一切手を入れていない。
  - **同じ「UI 値 ≠ 保存値」パターンの他の例**: フレームタブの「丸み」スライダー（C-1、7.4節）。0-100 の見かけ値を、角丸モードでは `cornerRadiusPercent`、超楕円モードでは `superellipseN` へ非線形変換して保存する。
- **写真位置調整**: 出力画像のフレーム内で、写真をどこに配置するか（`photoViewParams`、X/Y とも 0.0=端〜0.5=中央〜1.0=端）
  - **数値スライダー（`#photoPosX/Y`）は 2026年8月のフェーズ2で撤去（`docs/roadmap.md` A-1）**。`photoViewParams` はデータとしては維持し、**プレビュー上で写真を直接ドラッグして調整する**（`interaction/adapters/photoAdapter.js`。ドラッグ中はキャンバス中央線・端・他オブジェクトへのスナップも働く）。パネルには「**大きさと配置をリセット**」ボタン（`#resetPhotoPlacement`。旧「配置をリセット」。`docs/roadmap.md` A-15）があり、`photoViewParams` を中央（`offsetX/Y=0.5`, `rotation=0`）へ・クロップ矩形のパンを中央へ・`baseMarginPercent` を既定 5（表示 90%）へ戻す（切り抜き範囲のサイズ・比率は変えない。押下後 `updateSliderValueDisplays()` で「大きさ」「角度」スライダーも同期）。
  - **注意:** 仕様書v1では「9点から選択」とあるが、現在の実装ではプレビュードラッグによる連続的な位置調整となっている
- **写真の回転 / 「角度」スライダー（A-4。`docs/roadmap.md` A-4）**: クロップ確定後の写真を出力キャンバス内で回す（`photoViewParams.rotation`、度、-180〜180）。操作は2経路——(1)「大きさと配置」セクションの「角度」スライダー（`#photoRotation`。`controlsConfig.photoRotation` = min-180/max180/step1。ダブルクリックで 0° へ）、(2) select モードで写真選択中に上端の回転ハンドルをドラッグ（Shift で15°刻み。5.16節）。回転すると装飾（角丸・影・縁取り）も一緒に回り、`layoutCalculator` が**回転後の外接矩形＋余白**で出力キャンバスを取り直すので写真は切れない（余白・テキストサイズの基準となる「写真短辺」は回転前の値で固定）。crop モード中は回転を一時的に無視して素の写真でトリミングする。`baseMarginPercent`／「丸み」と同じく `updateSliderValueDisplays()` が「スライダーにフォーカス中は `.value` を書き換えない」ガードで表示・入力欄を同期する。
- **切り抜きの水平出し / 「水平」スライダー（A-3。`docs/roadmap.md` A-3）**: 切り抜き時に**切り出し前の元画像**を回して水平を出す（`cropSettings.rotation`、度、-45〜45＝Lightroom の角度補正と同じ）。「写真のトリミング」セクションの「水平」スライダー（`#cropRotation`。`controlsConfig.cropRotation` = min-45/max45/step0.1。ダブルクリックで 0° へ）＋ **crop モードのオーバーレイの暗い余白をドラッグ**（クロップ窓中心まわりのポインタ角度の変化量。Shift で 1° 刻み。5.16節）。クロップ窓は軸平行のまま元画像が傾く。**`cropSettings.rect` は縮小しない“望むサイズ”を保持し（Model B）**、傾いた画像からはみ出すぶんは描画・当たり判定の入口で `clampRectToRotatedImage()`（中心固定・比率保持）が吸収する（仕様(a)＝空き角なし。そのぶん出力写真は少し小さくなるが、**角度を戻すと切り抜きは元のサイズへ戻る**）。専用リスナーが `photoAdapter.commitCropRotation()` を呼ぶ（±45 クランプのみ。汎用 `addNumericInputListener` は使わない）。A-4（`photoViewParams.rotation`）とは独立の別値・別コントロールで、レンダラ上は入れ子。
- **「切り抜きをリセット」ボタン（`#resetCrop`。A-3）**: 「写真のトリミング」セクション。`cropSettings` を `{ aspectRatio: 'free', rect: 全体, rotation: 0 }` に戻す（大きさ・配置・出力比率は触らない）。`#cropSection` のクリック→crop モード遷移（A-13）のガードに `#resetCrop` を追加済み。

**UI上のグルーピング（フェーズ4 A-8 で並べ替え、フェーズ7 A-12 で見出しを対象明示に）:** 「レイアウト」パネルを **① キャンバス → ② 写真のトリミング → ③ 大きさと配置** の3セクション（線区切り、`fieldset`＋`legend`）に分ける。ユーザーから見た自然な決定順（枠の形を決める → 元写真のどこを使うか決める → 写真の大きさと位置を決める）に合わせたもの。`baseMarginPercent` の値（旧「余白」。UI 表記は「大きさ」）は「キャンバス」から切り離して ③ に置く——写真の大きさの決定は出力キャンバスの形の決定ではなく構図の決定であり、かつ ② トリミングで写真の実効短辺（＝内部 % の基準）が変わるため、使う範囲を先に確定してから決めるほうが値がぶれない。①②の比率タイル、③の「大きさ」「角度」スライダー・「大きさと配置をリセット」ボタンはそれぞれ独立で、`cropSettings`と`photoViewParams`の状態・計算ロジックは統合していない。切り抜き位置・枠内位置の数値スライダーはフェーズ2で撤去済みで、これらの調整はすべてプレビュー上のジェスチャーに寄せている。

- **A-12 二重四角アイコン（`docs/roadmap.md` A-12）**: 3セクションの `<legend>` は「アイコン＋対象名だけ」（番号・サブ文なし）。アイコンは `index.html` の SVG スプライトの `#i-canvas`（外＝実線・内＝丸ドット点線＝キャンバス自体を操作）／`#i-photo-crop`（内＝実線・外＝点線＝内側の写真範囲を操作）／`#i-size-place`（大枠の中に小枠がオフセット＝両者の関係）。`fieldset legend` を `display:flex` にして `.legend-icon`（17px、`--ink-dim`）を見出し文字の左に置く。親は Kakomi ブランドマーク（二重四角、`.brand-mark`）。同じ用語（キャンバス／写真のトリミング）はプリセット保存フォームでも使う。

**オンキャンバス・トリミング（2026年8月28日に再設計。旧「オンキャンバス直接トリミング」＝中央固定ズーム方式を置き換え）:**

写真が選択されているとき、`photoEditModeStore`（5.25節）が **select モード** と **crop モード** を持ち、**プレビュー上での「ドラッグを伴わないクリック」で切り替える**（専用ボタンは設けない）。写真以外を選択すると select に戻る。

| | select モード（通常） | crop モード（トリミング編集中） |
|---|---|---|
| 四隅ハンドル | ■（白塗り・黒フチ）。ドラッグ＝**余白 `baseMarginPercent` の増減**（外へ引く＝余白減＝写真が枠いっぱいへ。写真のピクセル数・写る範囲は不変）。「中心→掴んだ隅」方向への符号付き移動量で余白を動かす（`photoAdapter.commitMarginResizeByDrag`。中心を通り越しても反転せず、移動量に比例。感度は `MARGIN_RESIZE_FACTOR`） | L 字（白塗り・黒フチ）。ドラッグ＝**クロップ矩形 `cropSettings.rect` の変更**（掴んだ隅だけ動く。比率制約時は連動。`resizeCropRect`→`photoAdapter.commitCropRect`）。**比率固定で拡大していくと写真の端で止まり、比率固定は崩れない（`docs/roadmap.md` G-5）**——`resizeCropRect`が、掴んだ隅の対角を固定したまま矩形が[0,1]に収まる最大の幅（`h=w/R`も含む）で頭打ちにする。以前は末尾の`clampRect`が幅と高さを独立に丸めるため、短辺が端に当たると比率が壊れて画面枠いっぱいまで拡大できていた。 |
| 写真本体ドラッグ | 出力枠内での写真位置（`photoViewParams`）。従来どおり | クロップ矩形の平行移動（`rect.x/y`。ドラッグ方向にクロップ窓が動く） |
| 暗い余白のドラッグ | —（余白は動かない。5.16節） | **水平出し（`cropSettings.rotation`）**（A-3。クロップ窓中心まわりのポインタ角度。Shift で 1° 刻み。短いタップなら crop 確定） |
| 表示 | フレーム装飾（角丸・影・縁取り）込みで写真を描画＋■＋回転ハンドル | クロップ矩形の内側だけ明るく、外側を暗くマスクした周辺減光オーバーレイ＋三分割グリッド＋L字ハンドル。**A-3: 水平出し中は元画像（`whole`）が傾き、クロップ窓は軸平行のまま**。枠線・グリッド・ハンドルは黒フチ＋白で明暗どちらの背景でも視認できる |
| ホイール／矢印キー | ホイールは未使用、矢印＝`photoViewParams` の nudge | ホイール無効、矢印＝クロップ矩形のパン（本体ドラッグと同じ向き） |
| 抜け方 | 選択済みの写真をもう一度クリック／**レイアウトタブの「写真のトリミング」セクション内をクリック**（`#cropSection`。数値入力欄を除く。A-13）→ crop へ | 写真の外をクリック／**キャンバスの外の余白（`.canvas-area`）をクリック**（A-5）／**Esc / Enter**（A-13）→ select へ戻る。**出力枠（`outputTargetAspectRatioString`）は変えない**。枠は固定のまま、切り抜かれた写真がそのクロップ比率の形で枠の中に配置される（横長にクロップすれば写真が横長の帯になり、上下に余白がつく） |

**設計上の要点（フリーズフレーム）:** Kakomi は「出力枠＝写真＋余白、余白は写真短辺に対する％」というモデルのため、クロップ矩形を変えても画面上の写真ボックスの大きさはほぼ変わらない（余白が比例して縮むだけ。`session-log-2026-08-27.md` 2.2節）。このままライブに再レイアウトすると「内側へドラッグしているのに枠が縮まない」体験になる。そこで crop モードに入った瞬間のプレビュースケールと写真ボックス矩形・クロップ矩形を `photoEditModeStore.frozenFrame` にスナップショットし、crop モード中の描画・当たり判定はこれを基準に固定する（`canvasRenderer.js` の `drawCropModeOverlay`）。モード終了時に通常描画へ戻り、`calculateLayout` が最終 `rect` で一度だけリフローして収束する（PowerPoint の「確定」に相当）。

（写真のキャンバス内位置まで crop 枠で決める案はユーザーの意向で一旦後回し。）

### 7.3 背景編集
- **背景タイプ**: 「単色」「ぼかし」（写真の拡大ぼかし画像）「別画像」（**B-6**）から選択。**B-5（フェーズ6）でラジオボタンから、フレームタブ「角のスタイル」と同じアイコンセグメント（`.corner-segmented` ＋ `.segment` ＋ `.segment-icon`）に変更**（`#i-fill`＝単色、`#i-blur`＝ぼかし、`#i-bg-photo`＝別画像）。`<input type="radio">`の`id`（`bgTypeColor` / `bgTypeImageBlur` / `bgTypeImage`）・`name`・`value`（`color` / `imageBlur` / `bgImage`）は据え置きで、単色・ぼかしの配線（`addOptionChangeListener` / `toggleBackgroundSettingsVisibility()`）は無変更。「別画像」の `#bgTypeImage` だけは専用の `change` リスナーで、切り替え時に `blurAmountPercent` が既定 3 のままなら 0 へ寄せる（別画像の初期ぼかしは 0%）。

**単色背景:**
- カラーピッカーで色を選択

**別画像背景（B-6）:**
- **背景タイプ「別画像」を選ぶと、`#imageBlurSettingsContainer`（見え方／色調／位置のスライダー群）を「ぼかし」と共有で表示**し、その先頭に画像ピッカー行 `#bgImagePickerRow`（「背景画像を選択」ボタン `#bgImageSelectButton` ＋ 44px サムネ `#bgImageThumb` ＋ 隠し `<input type="file" id="bgImageLoader">`）が出る。ピッカー行は「別画像」のときだけ表示（`toggleBackgroundSettingsVisibility()`）。
- ボタン／ファイル入力は `main.js` で配線。`fileManager.processBackgroundImageFile(file, redrawCallback)` が `FileReader` → `Image` → `stateManager.setBackgroundImage(img)` → 再描画。前景写真の `processImageFile` と違い Exif 抽出・トリミング初期化・`initializeUIFromState()` は呼ばない。
- `editState.bgImage` は Undo・プリセット非対象（`EDITABLE_SETTINGS_KEYS` 外）。プリセットに `backgroundType:'bgImage'` が保存されていても、適用時に画像が無ければ `backgroundRenderer` が単色へフォールバックする（パネルは「別画像」選択＋空サムネで、ユーザーが画像を選べる状態）。
- スライダー（拡大倍率・ぼかし強度・明るさ・彩度）と「位置をリセット」ボタン、プレビュードラッグでの位置調整はすべて「ぼかし」と同じ（`imageBlurBackgroundParams` を共有）。描画は `drawBlurredImageBackground()` に別画像を全体（クロップなし）で渡すだけ（5.6節）。
- サムネの同期は `uiController.updateBgImageThumb(state)`（`initializeUIFromState` と `main.js` の `requestRedraw` から呼ぶ）。

**拡大ぼかし背景:**
- **拡大倍率**: 1.0-8.0倍（デフォルト2.0倍）
  - **注意:** 仕様書v1では1x-4xとあるが、現在の実装では1-8倍となっている
- **ぼかし強度**: 0-50%（写真短辺基準、デフォルト3%）
  - **注意:** 仕様書v1では0-15%とあるが、現在の実装では0-50%となっている
- **UIのグルーピング（フェーズ3 で整理。`docs/roadmap.md` B-4）**: 拡大ぼかし背景設定を「見え方」（拡大倍率・ぼかし強度）／「色調」（明るさ・彩度）／「位置」の3小見出しに分ける。「色調」「位置」の見出しは上に区切り線を引く（`.subsection-heading.with-rule`）。フェーズ2で「色調」を閉じたアコーディオン（`#bgToneAccordion`）に入れていたが、開くのにワンアクション要るのが煩わしいとのユーザー判断で撤回し、常時表示＋区切り線に戻した。
- **明るさ**: 0-150%（デフォルト100%、変化なし）。「色調」小見出しの下に常時表示
- **彩度**: 0-150%（デフォルト100%、変化なし）。同上
- **X/Y方向オフセット**: `imageBlurBackgroundParams.offsetX/YPercent`（写真短辺基準、デフォルト0%、内部クランプ -500%〜500%）
  - 背景として使用する（クロップ後の）写真の表示位置を上下左右に調整
  - **数値スライダー（`#bgOffsetX/Y`）は 2026年8月のフェーズ2で撤去（`docs/roadmap.md` B-1）**。データモデルは維持し、下記のプレビュードラッグと「位置をリセット」ボタン（`#resetBgOffset`。両オフセットを 0 に戻す）で操作する
- 拡大ぼかし背景が有効な場合、**「背景」タブを開いている間、プレビュー上のドラッグ（写真の上を含むキャンバス全面）で位置を調整できる**（`interaction/adapters/backgroundAdapter.js`、5.16節「タブ別ドラッグ」）。オフセットが 0 に近づくと 0 にスナップし赤い中央ガイドが出る。**「背景」タブ以外では余白をドラッグしても背景は動かない**（以前は他タブでも余白ドラッグで背景がパンしていた。不具合として修正）。単色背景の場合は位置の概念がないためドラッグ対象にならない

**実装詳細:**
- **ぼかしの元は「クロップ後の写真」**（2026年8月のフェーズ3で修正。`docs/roadmap.md` B-3）。`backgroundRenderer.js` の `drawBlurredImageBackground()` は以前 `sx=0, sy=0, sWidth=img.width, sHeight=img.height` と元画像全体を使っていたため、写真をクロップで小さくしてもぼかし背景が変わらなかった。`drawBackground()` が `currentState.photoDrawConfig.sourceX/Y/Width/Height`（＝クロップ矩形の元画像ピクセル座標。前景の写真描画と同じ値）から `sourceRect` を作って渡し、`drawBlurredImageBackground()` はその範囲だけを `drawImage` のソース矩形に使う。アスペクト比・cover スケールもこの範囲基準。プレビュー・出力（`renderFinal`）の両経路が同じ関数を通る。
- クロップ後の写真がCanvas全体を覆うように拡大（cover方式）
- 基本スケールにユーザー指定の拡大率を適用
- ぼかし、明るさ、彩度のフィルターを適用
- オフセット調整を適用

### 7.4 フレーム加工
- **角のスタイル**（C-1 で「角丸 / 超楕円」の2択に。旧「なし」は廃止＝下記「丸み」0 が実質「なし」。
  `<input type="radio" name="frameCornerStyle">` は `frameCornerStyleRounded` / `frameCornerStyleSuperellipse` の2つ）:
  - 角丸: 円弧で角を丸める
  - 超楕円: 連続曲率で角を丸める（`|x/a|ⁿ + |y/a|ⁿ = 1`。n=2 で楕円、大きいほど四角に近づく）
- **丸み**（C-1、両モード共通の1スライダー `#frameRoundness`。ラベル「丸み:」、表示値 `#frameRoundnessValue` は 0-100）:
  - 見かけ値 **0-100、右ほど丸い**（step 1、`controlsConfig.frameRoundness`）。保存キーは選択中モードに応じて
    `frameSettings.cornerRadiusPercent`（角丸）または `frameSettings.superellipseN`（超楕円）。
  - **角丸**: `cornerRadiusPercent = 丸み / 2`（線形。丸み100 → 半径50%）。
  - **超楕円**: 角の詰まり具合 `F(n) = 2^(-1/n)` を等間隔に刻む「体感で等間隔」マッピング。
    `F(丸み) = F(40) + (丸み/100)·(F(3) − F(40))`、`n = −1 / log₂F`。丸み0 → n=40（ほぼ矩形、角が約1.7%だけ出る）、
    丸み100 → n=3（もっとも丸い超楕円）。逆関数 `nToRoundness(n)` でプリセット／Undo からスライダー位置を復元。
  - **モード切替（角丸 ⇄ 超楕円）は「丸み」位置を保ったまま**、新モードの丸め関数へ変換して保存キーへ書き戻す。
  - `uiController.js` の `roundnessToRadius` / `radiusToRoundness` / `roundnessToN` / `nToRoundness` / `currentRoundness`
    が変換を担い、`#frameRoundness` 専用の `input` / `dblclick`（丸み0へ）リスナーが保存を担う（A-10「大きさ」と
    同じ「UI 値 ≠ 保存値」パターン。汎用 `addNumericInputListener` は使わない）。`layoutCalculator` / `frameRenderer`
    には手を入れない。旧プリセットの `cornerStyle: 'none'` は角丸／丸み0 として表示し、スライダー操作で 'rounded' へ昇格する。
- **影**:
  - タイプ: 外側（ドロップ）または内側（インナー）
  - オフセットX/Y: -25%〜25%（写真短辺基準）。スライダーに加え、**「フレーム」タブを開いていて影が有効（`shadowEnabled`）なとき、プレビュー上で写真本体をドラッグして直接動かせる**（`interaction/adapters/shadowAdapter.js`、5.16節「タブ別ドラッグ」）。Shiftドラッグで軸ロック、0 付近で 0 にスナップ＋赤い中央ガイド。影が無効なときはドラッグしても何も起こらない
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
撮影日・Exif・自由テキストは1本の `textSettings.layers[]` に統合されている（バケット4 / D-1・D-3。データモデルは5.2節、UI は5.3節）。1レイヤー ＝ `content`（「リテラル文字列」と「動的トークン」の並び）＋ 見た目の設定1セット。

**作成の流れ（D-1）:** 「テキスト」タブの「＋ テキストを追加」→ 作成フォームで内容を組み立て →「追加」でキャンバスに出る（`position: 'middle-center'`）。撮影日・Exif も「テキスト」の1種として、内容欄に**トークンを差し込む**形で作る。撮影日 / Exif とも何枚でも追加できる。

**レイヤー共通の設定（種類を問わず1セット。D-3）:**
- **表示/非表示**: リスト行の `●`/`○` トグル（`enabled`）。非表示でも編集はできる
- **フォント**: Google Fonts から選択
- **大きさ**: 写真短辺に対する %（`controlsConfig.textLayerSize`、0.1〜50%）
- **文字色**: HEX
- **不透明度**: 0〜1
- **揃え（textAlign）**: 左 / 中 / 右
- **位置**: 基準アンカー `position`（9点。UI からは撤去済み＝D-2、既定 `middle-center`）＋ オフセット X/Y（%）。オフセットはプレビュー上のドラッグ・数値欄・矢印キー（1px／Shift+10px）で動かす
- **回転（`rotation`、度）**: プレビュー上の回転ハンドル（Shift で15°刻み）または数値欄。拡大は右下角のハンドル。ハンドルドラッグ中は数値欄・サイズスライダーも追従（`syncTextLayerLiveInputs`）
- 横位置/縦位置/回転の数値欄はドラッグでスクラブ、クリックでタイプ入力（`ui/scrubInput.js`）
- 改行対応（内容欄で Enter → `\n`）

**動的トークン（`content` 内の `{ field }` 要素。生きたトークン＝別画像に差し替えると値も追従）:**
- **撮影日トークン `{ field: 'date', format }`**: Exif の DateTime から日付を取り、`format` で整形（`utils/textContent.js` の `getFormattedDate()`）。`format` は `YYYY`/`YY`/`MM`/`DD` を組み合わせた自由文字列。トークンをクリックすると**その場で書式ピッカー**（プリセットボタン＋自由入力。`DATE_FORMAT_PRESETS`）が開く。
- **Exif トークン `{ field: 'exif', items }`**: `items`（Exif キーの配列）を並び順どおりに解決し `EXIF_ITEM_SEPARATOR`（スペース2つ）で連結。トークンをクリックすると**その場で項目ピッカー**が開く＝「利用可能な項目」（`exifTagDefinitions` のうち未選択のもの、クリックで末尾に追加）と「使用する項目」（現在の `items`、各行に `⠿` ドラッグハンドルと `×`）。並べ替えは `attachListDragHandle()`（レイヤー一覧の並べ替えと共通。ドラッグ中は DOM だけ動かし `pointerup` で一度コミット）。
- **対応 Exif タグ**: Make（メーカー名）／Model（機種名）／LensModel（レンズ情報）／FNumber（F値）／ExposureTime（シャッタースピード）／ISOSpeedRatings（ISO感度）／FocalLength（焦点距離）／ExposureBiasValue（露出補正、例 `+0.3EV`）。定義は `uiDefinitions.js` の `exifTagDefinitions`。値の整形は `exifHandler.getExifValue()`

**リスト（`#textLayersList`）:** 各行 ＝ 掴み手（`⠿`、ドラッグで重なり順を変更）／種類バッジ（`T` または `Exif`、`content` から導出）／内容プレビュー／表示トグル／`×` 削除。プレビュー上でのドラッグ移動・拡大・回転はどのレイヤーも同じ（`textAdapter.js`、5.16・5.17節）。ドラッグ中はキャンバス中央線・端・写真・他レイヤーへスナップ（Alt で無効化）。「テキスト」タブがアクティブで選択中のとき `Delete`/`Backspace` で削除（D-5）。

### 7.6 出力設定
- **JPEG品質**: 1-100（スライダー、`jpgQuality`）。2026年8月のフェーズ4で「出力」タブを廃止し、**ダウンロードボタンの画質ポップオーバー（`#downloadPopover`）内**に移動した。同期先の id は不変なので `uiController.js` 側の配線（`initializeUIFromState` / `updateSliderValueDisplays` / `addNumericInputListener`）は変えていない。
- **ダウンロードボタン**（`#downloadButton`）: **上部バー右端**（`.app-header .header-actions` の `.dl-group`）。押すと `#downloadPopover`（画質スライダー＋「書き出す」＝`#downloadConfirmButton`）を開き、「書き出す」で `handleDownload()` を実行。外側クリック／Esc で閉じる。画像未ロード時は `disabled`（`fileManager.js` が読み込み時に解除）。「出力」タブ（`#tab-output`）とレール項目は廃止（`docs/roadmap.md` E-5、3.1節参照）。id は不変で `fileManager.js` 側への影響なし。
- **Exif保持**: `outputSettings.preserveExif` は状態として存在し（初期値 `true`）、`fileManager.js`の`handleDownload()`がこの値を見てExif埋め込みの要否を判定する。ただし、この設定値を切り替えるUIチェックボックス自体が存在せず、常に「保持する」設定のままダウンロードが行われる。

### 7.7 Exif情報表示
**E-3（フェーズ5、`docs/session-log-2026-08-27-6.md`）:** 「情報」はアイコンレール下部の**他タブと並列のタブ**（`data-tab="tab-info"` ＋ `#tab-info` ペイン）。押すと他タブと同じフライアウトパネル枠に切り替わって Exif が出る／もう一度押すと E-1 の再クリックでパネルごと畳まれる（独立オーバーレイではない）。以前の独立トグル（`#exifToggleButton`）とフローティングカード（`#exifFloatCard` / `.exif-float-card`）は廃止した。

描画は `exifHandler.js` の `displayExifInfo(exifData, container)`。`main.js` の `requestRedraw()` が毎回 `#exifDataContainer` に対して呼ぶ。Lightroom Web 風のミニマル表示:
- **カメラ／レンズ名**だけを小さく上部に1行（`.exif-cam`。「メーカー 機種名 · レンズ名」。Model が Make で始まる場合は Model のみ）
- **撮影設定は「アイコン＋値」だけ**の定義リスト（`.exif-dl`、2カラムグリッド）。行は存在する項目だけ: 絞り（`f/1.8`）／シャッタースピード（`1/250s`）／ISO感度（`ISO 400`）／焦点距離（`35mm`）／撮影日時（`2026.08.14 16:32`）
- 項目名テキスト（「F値」等）は画面に出さず、`<dt>` の `title` 属性（＝ホバーでツールチップ）に入れる。アイコンは `index.html` のスプライト `#i-aperture` / `#i-shutter` / `#i-iso` / `#i-focal` / `#i-cal`
- Exif が無い／未読込のときは `.exif-empty` のメッセージ1行
- `formatExifForDisplay()` の各値整形はほぼ従来どおり。撮影日時だけ `"YYYY:MM:DD HH:MM:SS"` → `"YYYY.MM.DD HH:MM"` に整形するよう修正した（従来は時刻のコロンも `/` に置換されて `16/32/10` と表示されていた）

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

1.5. **回転後の外接矩形（A-4）**
   - `photoViewParams.rotation`（度）から回転後の外接矩形
     `bboxW = w·|cosθ| + h·|sinθ|`, `bboxH = w·|sinθ| + h·|cosθ|` を計算
   - 以降の「余白＋アスペクト比フィット」「可動範囲」「出力Canvas寸法」はこの**外接矩形**を写真サイズとして使う。
     実際に `drawImage` する `destWidth/Height` は回転前のまま（レンダラが写真中心で `ctx.rotate`）

2. **基準値の計算**
   - 「使用する写真」の短辺（`photoShortSidePx = Math.min(trimmedPhotoWidthPx, trimmedPhotoHeightPx)`。**回転前の値**）を計算
   - これが基準余白%や各種装飾要素の%指定の計算ベースとなる（回すたびに基準が動かないよう回転前で固定）

3. **最小余白の計算**
   - 指定された「基準余白%」から、最小余白のピクセル値（`minMarginPx = photoShortSidePx * (baseMarginPercent / 100)`）を計算

4. **出力Canvasの寸法決定**
   - 「使用する写真」の寸法に、上下左右の`minMarginPx`を加えた仮の全体サイズを想定
   - この仮の全体サイズのアスペクト比と、ユーザー指定の「出力画像の目標アスペクト比」を比較
   - 「出力画像の目標アスペクト比」を厳密に維持するように、仮の全体サイズの幅または高さを拡張し、最終的な出力Canvasの寸法（`outputCanvasWidthPx`, `outputCanvasHeightPx`）を決定
   - この際、写真自体の描画サイズは変更しない

5. **写真の描画位置決定**
   - 決定された`outputCanvasWidthPx`, `outputCanvasHeightPx`の内側で、`photoViewParams.offsetX/Y`（0-1の範囲）を使い、可動範囲内で**回転後の外接矩形**の左上座標を決定
   - 写真本体はその外接矩形の中心に置く（`destX/YonOutputCanvas = bbox左上 + (bboxサイズ − 写真サイズ) / 2`）。回転 0 のときは `bbox = 写真`なので従来と一致
   - `photoDrawConfig.rotation` に回転角（度）を入れて返す（レンダラが `drawImage` 前に写真中心で `ctx.rotate`）

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
- ✅ テキストの拡大・回転ハンドル（5.22節参照。自由テキスト・撮影日・Exifブロックいずれも対応。backgroundは対象外）
- ✅ **写真の回転（A-4。7.2節「写真の回転 / 「角度」スライダー」・5.16節・5.17節参照）**: クロップ確定後の写真を出力キャンバス内で回す（`photoViewParams.rotation`）。「角度」スライダー ＋ select モードの上端回転ハンドル（Shift で15°刻み）。`layoutCalculator` が回転後の外接矩形＋余白でキャンバスを取り直すので写真は切れない（仕様(a)）。装飾も一緒に回る。Undo・プリセット（`photoViewParams`）に自動で乗る
- ✅ **切り抜きの水平出し（A-3。7.1節・7.2節「切り抜きの水平出し」・5.5節・5.16節・5.17節参照）**: 切り抜き時に切り出し前の元画像を回す（`cropSettings.rotation`、±45°）。「水平」スライダー ＋ crop オーバーレイの暗い余白ドラッグ。クロップ窓は軸平行のまま元画像が傾く。**`cropSettings.rect` は縮小せず“望むサイズ”を保持し（Model B）**、はみ出すぶんは入口で `clampRectToRotatedImage`（中心固定）が吸収＝角度を戻すと元サイズへ戻る（仕様(a)＝空き角なし）。塗りは `drawCroppedPhoto`（窓にクリップ＋回転して元画像を配置）。L字ハンドルのリサイズ／パンは回転対応クランプ（`clampCropResizeToRotatedImage` はアンカー固定、`clampCropPanToRotatedImage` は端で止める）。`resizeCropRect` 自由比率の辺クランプ漏れ（回転なしでも反対辺が動く不具合）も修正。「切り抜きをリセット」ボタン（`#resetCrop`）も追加。Undo・プリセット（`cropSettings`）に自動で乗る
- ✅ **オンキャンバス・トリミング（2026年8月27日に中央固定ズーム方式で実装 → 8月28日にPowerPoint型へ再設計、7.2節・5.16〜5.17節・5.25節参照）**: 写真選択中は`photoEditModeStore`が select / crop モードを持ち、プレビュー上のクリックで切り替える。select モードの四隅■ハンドル＝余白（`baseMarginPercent`）、写真本体ドラッグ＝枠内配置（`photoViewParams`）。crop モードの四隅L字ハンドル＝切り抜き矩形（`cropSettings.rect`）、写真本体ドラッグ＝切り抜き位置のパン。`cropSettings`は割合矩形 `{ aspectRatio, rect }` ベース。クロップ矩形のon-canvasパンは crop モードの写真本体ドラッグ／矢印キーで対応済み
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
- **文字レイヤーのデータモデル統合（バケット4 / D-1・D-3 で実施済み）**: 撮影日・Exif・自由テキストを1本の `textSettings.layers[]` に統合した。`kind` フィールドは持たず（「Exif を含むか」等は `content` から導出）、`content` は「リテラル文字列」と「動的トークン」の並び。旧 localStorage プリセットは `migrateTextSettings()` が `applyPreset` の入口で変換する。影響範囲は `stateManager.js`・`textRenderer.js`・`textAdapter.js`・`canvasInteraction.js`・`canvasRenderer.js`・`fileManager.js`・`presets/presetStore.js`・`uiController.js`＋新規 `utils/textContent.js`（`docs/session-log-2026-08-28-4.md`）。
- **Exif情報タブの拡充**: E-3（フェーズ5）で「情報」を他タブと並列のタブ＋アイコン主体表示にした（7.7節）。今後、表示項目の増減（露出補正・GPS 等）や、Exif 値をそのまま文字レイヤーに送る導線などは D-1/D-3 と合わせて検討の余地あり。
- **`frameBorderStyle`（破線）の扱い**: 7.4節で述べた通り、UIコントロール自体が無効化されたまま。今回のフレーム加工パネル刷新のタイミングで復活させるか完全に削除するかは未決定。
- **レスポンシブ（`@media max-width:1024px`以下）の実機確認未実施**: アイコンレールを横並びに戻すフォールバックは実装したが、タッチデバイス・狭幅ブラウザでの実機検証はまだ行っていない。

### 11.6 ロードマップ（`docs/roadmap.md`）対応状況

2026-08-27にユーザーからの要望を`docs/roadmap.md`（A〜Fの各タブ）に整理した。フェーズ0（設計不要の小改修、`docs/session-log-2026-08-27-3.md`）:
- ✅ **E**: ダウンロードボタンを上部バー →「出力」タブ内へ戻した（7.6節）
- ✅ **A-2**: crop モードのオーバーレイに三分割グリッド（rule of thirds）を追加（7.2節、`canvasRenderer.js` `drawCropModeOverlay`）
- ✅ **A-6**: select モードのプレビュー上ホイールによる余白変更を削除（5.16節、`photoAdapter.commitMarginDelta`・`MARGIN_WHEEL_STEP`撤去）
- ✅ **D-2**: テキストの固定表示位置アンカー選択（`#textLayerPosition`）をUIから撤去（`position`データモデルは維持。5.3節・7.5節）

フェーズ1（「開いているタブでプレビュー上のドラッグの意味を切り替える」共通設計、`docs/session-log-2026-08-27-3.md`）:
- ✅ **共通基盤**: `tabManager.getActiveTab()` を追加し、`canvasInteraction.js` の `pointerdown` がアクティブタブで本体ドラッグの振り先を分岐（5.16節「タブ別ドラッグ」）
- ✅ **C-2**: 「フレーム」タブ表示中かつ影が有効なとき、写真本体ドラッグ →影オフセット（新設 `shadowAdapter.js`。7.4節）
- ✅ **背景タブのドラッグ拡張**: 「背景」タブ表示中はキャンバス全面のドラッグ →背景の位置（`backgroundAdapter` 流用。7.3節）。反面、**「背景」タブ以外での余白ドラッグは背景を動かさない**よう修正（従来はどのタブでも余白ドラッグで背景がパンしていた）
- ❌ **B-2**（背景タブでホイール→背景拡大倍率）: 誤操作の元になるとしてユーザー判断で**不採用**。プレビュー上のホイールは引き続き未使用

フェーズ1追補（移動・配置の操作性、`docs/session-log-2026-08-27-3.md`）:
- ✅ **軸ロック**: `move` ドラッグ中に Shift で移動量の大きい軸だけに固定（縦だけ／横だけ。写真・テキスト・背景・影すべて。5.16節）
- ✅ **原点スナップ**: 背景・影のドラッグでオフセットが 0 付近まで戻ると 0 にスナップし赤い中央ガイドを表示（`originSnapPx`。5.16節）
- ✅ **タップ判定の厳格化**: モード切替（select↔crop）を「移動量 < 4px かつ 押下時間 < `CLICK_TAP_MS`(400ms)」の短いタップ限定に。動かさず長押しして離してもモードが切り替わらない（5.16節）
- ✅ **タブ切り替え時の写真選択解除**: 「背景」「フレーム」タブへ移ったら写真の選択（四隅■マーカー）を解除する。マーカーが出たまま操作不能に見える紛らわしさを解消（`tabManager.onTabChange` ＋ `main.js`。5.16節）
- ✅ **矢印キーで背景／影の微調整**: 「背景」タブ・「フレーム」タブ（影が有効）で、矢印キーを背景／影のオフセット nudge に割り当て（5.16節）
- ダブルクリックでオフセットをリセットする案は「他の操作が暴発しそう」としてユーザー判断で見送り

フェーズ2（UI のスライダー羅列・プルダウン整理、`docs/session-log-2026-08-27-4.md`）:
- ✅ **A-1**: 出力アスペクト比・切り抜き比率を比率タイルピッカー（`js/ui/ratioPicker.js`）に置き換え。「切り抜き位置（横／縦）」「枠内位置（横位置／縦位置）」のスライダー計4本を撤去し、`cropSettings.rect` のパンと `photoViewParams` はプレビュー操作＋「配置をリセット」ボタンのみで動かす（5.3節・7.1節・7.2節）
- ✅ **B-1**（軽微版）: 拡大ぼかし背景の「明るさ・彩度」を既定で閉じたアコーディオンに移動、X/Yオフセットのスライダーを撤去し「位置をリセット」ボタンに置き換え（5.3節・7.3節）。背景タイプのセグメント化やカード化は「後で画面レイアウトを一新する」ユーザー方針のため見送り

フェーズ3（小改修・バグ、`docs/session-log-2026-08-27-5.md`）:
- ✅ **B-3**（バグ）: 拡大ぼかし背景を「クロップ後の写真」から生成する（`backgroundRenderer.js`。`photoDrawConfig.source*` を `sourceRect` として使う。5.6節・7.3節）
- ✅ **D-4**（バグ）: テキストの不透明度スライダーのラベルを「透過度」→「不透明度」に（`uiController.js` の `renderTextLayerSettingsPanel()`。5.3節・7.5節）
- ✅ **A-7**: 出力／切り抜きの比率タイルの選択肢順を共通化（`ratioPicker.js` の `RATIO_FAMILIES` が唯一の並び）。カスタム幅高さ入力欄を折り返さない1行（`.ratio-custom-row`）に（5.3節）
- ✅ **B-4**: 背景の「明るさ・彩度」をアコーディオンから常時表示に戻し、「見え方／色調／位置」の区切り線付き小見出しで分離（B-1 のアコーディオンを撤回。5.3節・7.3節）

フェーズ4（Lightroom Web 風のシェル刷新。`artifact-design` モックアップで方向性合意後に実装。`docs/session-log-2026-08-27-5.md` §9–11）:
- ✅ **E-1**: `tabManager.js` にアクティブタブ再クリックでパネルを畳む処理（`.app-shell.panel-collapsed`）。初期表示はレイアウト開。パネル開閉で `main.js` の `ResizeObserver` が `clearContainerSizeCache()`＋再描画（3.1節・5.5節）
- ✅ **E-2**: `fieldset`／`legend`／`.frame-card` を枠なし＋見出し＋上罫線の線ベースに（`style.css`）（3.1節）
- ✅ **E-4**: `.custom-text-drag-hint` の長文をアイコン＋数語に削減
- ✅ **E-5**: 「出力」タブ（`#tab-output`）とレール項目を廃止。ダウンロードを上部バー右＋画質ポップオーバー（`#downloadPopover`）に（3.1節・7.6節）
- ✅ **A-8**: 「レイアウト」パネルを ① 出力アスペクト比 → ② トリミング → ③ 余白と配置 の順に。余白を①から③へ分離（7.2節）
- ✅ **F**: プリセットはレール下部の一項目のまま（「情報」の隣）。レイアウトの中に畳み込むのは見送り

既知の不具合の解消（`docs/session-log-2026-08-27-6.md`）:
- ✅ **G-1**（縦長／正方形の出力比率でプレビューキャンバスがじわじわ拡大し続ける）: 根本原因は`#previewCanvas`の`border: 1px`が要素のレイアウトボックスに乗り、高さ基準で決まるキャンバスがコンテナ高さを押し上げて`ResizeObserver`との正のフィードバックになっていたこと。枠線を`outline`（`outline-offset: -1px`）へ置き換えて解消（`style.css`。3.1節）。フェーズ4 で入れた「幅のみに反応する`ResizeObserver`」は多重防御として維持。

フェーズ5（情報タブ。`docs/session-log-2026-08-27-6.md`）:
- ✅ **E-3**: 「情報」を他タブと並列のタブ（`data-tab="tab-info"` ＋ `#tab-info` ペイン、レール下部）に。押すと同じフライアウトパネル枠で切り替わり、再クリックで畳まれる。独立トグル `#exifToggleButton` とフローティングカード `#exifFloatCard` は廃止。Exif 表示を `displayExifInfo()` の作り替えでアイコン＋値だけのミニマルな `.exif-dl` に（項目名は `<dt>` の `title`）。撮影日時の整形バグ（時刻のコロンも `/` になる）も修正（3.1節・7.7節）

フェーズ6（追加の小〜中改修。`docs/session-log-2026-08-27-7.md`）:
- ✅ **E-6**: `favicon.svg`（`.brand-mark` と同意匠）＋ `<link rel="icon">`（3.1節）
- ✅ **B-5**: 背景タイプをアイコンセグメント（`.corner-segmented`）に。`id`/`name`/`value` 据え置きで JS 配線は無変更（7.3節）
- ✅ **D-5**: 「テキスト」タブがアクティブで自由テキスト選択中、`Delete` / `Backspace` で削除（`canvasInteraction.js` の keydown。5.16節）
- ✅ **E-8 / A-12（フェーズ7 バケット2）**: 用語統一（`文字`→`テキスト`、`出力アスペクト比`／`出力フォーマット`→`キャンバス`、`トリミング`→`写真のトリミング`。レール・レイアウトタブ `<legend>`・プリセット保存フォーム・`PRESET_SECTIONS.label`）＋ レイアウトタブ3セクションの見出しを「二重四角アイコン＋対象名だけ」（番号・サブ文なし。③は「大きさと配置」）に。アイコンは新スプライト `#i-canvas` / `#i-photo-crop` / `#i-size-place`。`editState`・各レンダラ・`data-section` キーは無変更（7.2節・3.1節）
- ✅ **G-2**: 別画像への差し替え時は `cropSettings.rect`→全体・`photoViewParams`→中央にリセット（比率制約は維持して再フィット）。背景・フレーム・出力比率・余白・テキストは引き継ぐ（`setImage`。5.2節）
- ✅ **E-7**: ファイル選択の小枠を廃し、`.canvas-area` 全体をドロップ受付に。未読込時は中央にドロップダイアログ、読み込み後はキャンバス。上部バーに「画像を開く」ボタン（`#openImageButton`）（3.1節・6.1節）
- ✅ **F-2**: プリセット保存時にタブ単位5セクション（`PRESET_SECTIONS`）のチェックで保存項目を選択。適用は含まれるキーだけ上書き（5.19節）
- ✅ **F-3 / F-4 / F-5（フェーズ7 バケット3）**: 保存フォームを `renderPresetSectionChecks()` の縦ツリーに（親5＋背景・フレーム・テキストの子グループ、3状態の親チェック）。名前は空なら「プリセット N」（空き番号の最小）・衝突は連番・上書きなし（`resolvePresetName`）。`PRESET_SECTIONS` にドット付きパスの `groups` を導入し、`savePreset(name, sections, groups)` が部分オブジェクトを組み立て、`applyPreset` は deep-merge のまま。旧プリセット移行不要（5.19節）
- ✅ **A-14 / E-9（フェーズ7 バケット3.5）**: 比率タイルピッカーを Lightroom Web 風に。`RATIO_FAMILIES` を「向きを畳んだ比率ファミリー」（縦向き正準・`×` 表記・数字が小さい順）に。ピッカーごとに `orientation` を UI 状態で持ち、見出し右端の回転ボタン（momentary・点灯なし）で全タイル反転＋選択比率を `H:W`↔`W:H`。`1.91:1` 削除／`16:10`・`3:2` 追加。サブラベル全廃。カスタムの ⇄ ボタン廃止（回転に一本化）。`editState`・`layoutCalculator` 無変更（5.3節・7.2節）
- ✅ **A-15 / A-16（フェーズ7 バケット3.5）**: 「配置をリセット」→「大きさと配置をリセット」に改名＋`baseMarginPercent` も既定へ。「大きさと配置」セクションの説明文を削除（7.2節）
- ✅ **B-6（フェーズ7 バケット5）**: 背景タイプに「別画像」。`editState.bgImage`（Undo・プリセット非対象）に別読み込み、見え方・色調・位置は `imageBlurBackgroundParams` を「ぼかし」と共有（5.6節・7.3節）
- ✅ **A-4（フェーズ7 積み残し）**: クロップ確定後の写真を出力キャンバス内で回転（`photoViewParams.rotation`。「角度」スライダー＋回転ハンドル、Shift で15°刻み）。`layoutCalculator` が回転後の外接矩形＋余白でキャンバスを取り直す＝写真は切れない〈仕様(a)〉。装飾も一緒に回る（7.2節・5.4節・5.16節・5.17節）
- ✅ **A-3（フェーズ7 積み残し）**: 切り抜き時の元画像の水平出し（`cropSettings.rotation`、±45°。「水平」スライダー＋オーバーレイの余白ドラッグ）。**Model B**＝`rect` は縮小せず、入口の `clampRectToRotatedImage`（中心固定）で吸収＝角度を戻すと元サイズへ戻る〈仕様(a)〉。塗りは `drawCroppedPhoto`。L字ハンドル／パンは回転対応クランプ（アンカー固定／端で止める）＋自由比率の辺クランプ漏れ修正。「切り抜きをリセット」（`#resetCrop`）も追加（7.1節・7.2節・5.5節・5.16節・5.17節）

既知の不具合の解消（`docs/session-log-2026-08-28.md`）:
- ✅ **G-3**（レイアウトタブ開閉のトランジション中に画面全体が一瞬下にずれて戻る）: 極小幅のパネル内容が縦に伸び、`.app-container`（`min-height:100vh`）が下方向に膨張していた。`@media (min-width:1025px)` で `.app-container { height:100dvh; min-height:0; overflow:hidden }` にしてデスクトップ3カラム時のシェル高をビューポートに固定（内側は各自スクロール）。1024px 以下の縦積みには適用しない。G-1 の残り 2px も解消（3.1節）

未着手のロードマップ項目: **フェーズ7 の前向きな一覧は消化済み**（残りは方向性未確定の A-3 派生検討や新規要望のみ）。詳細は `docs/roadmap.md`。

## 12. 仕様書v1との対応状況

### 12.1 実装済みの仕様

以下の仕様は仕様書v1の要求通りに実装されています：

- ✅ 単位系の定義（写真短辺基準の%指定）
- ✅ 構図調整機能（`cropSettings`として実装。「レイアウト設定」タブからUIで操作可能）
- ✅ 出力フォーマット設定（目標アスペクト比、基準余白）
- ✅ 背景編集（単色、拡大ぼかし、別画像〈B-6〉。ぼかし・別画像はドラッグでの位置調整にも対応）
- ✅ フレーム加工（角丸、超楕円、影、縁取り）
- ✅ テキストオーバーレイ（撮影日、Exif情報、自由テキスト。いずれもドラッグ移動に対応。自由テキストは複数レイヤー・拡大・回転にも対応）
- ✅ Exif情報の表示と再埋め込み
- ✅ 数値精度と丸め処理のポリシー（写真描画の厳格な整数化）
- ✅ レイアウト計算の詳細フロー
- ✅ ファイル名の命名規則（`_kakomi_framed.jpg`）
- ✅ アスペクト比のカスタム指定（出力目標アスペクト比の自由入力、幅/高さ数値入力。幅高さ入れ替えは見出しの回転ボタン＝A-14）
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

**テキストの個数:**
- **仕様書v1の要求**: 自由テキスト2つ（固定枠）＋ 撮影日・Exif 各1
- **現在の実装**: `textSettings.layers[]`による可変長レイヤー（撮影日・Exif・自由テキストの区別なく個数制限なし。追加/削除/並べ替え可能）

### 12.3 未実装の仕様

**未実装機能（11章の拡張案を参照）:**
- テキストレイヤーの複製、複数選択・一括移動（11.1節参照。並べ替えはバケット4 で実装済み）
- タッチデバイスでの実機確認（11.1節参照）
