# 開発セッションログ: 実装計画の練り直し＋フェーズ3実装＋フェーズ4モックアップ（2026-08-29 その3）

`docs/session-log-2026-08-29-2.md`（フェーズ2 = A-1 / B-1）の続き。ユーザーがローカルホストで実装を確認し、
**実装箇所（比率タイルピッカー、位置スライダー撤去、背景の整理）は特に問題なし**との評価。
そのうえで「アプリ全体の UI を変えるアイデア」を含め足りない箇所を一通り挙げてもらい、**積み残しも含めた全体の実装計画を
練り直し**（§1–6）、続けて**フェーズ3（小改修・バグ）を実装**（§7–8）、さらに**フェーズ4 シェル刷新のモックアップを作って
方向性を合意**（§9–10）した、長めのセッション。

## 1. ユーザーからのフィードバック（原文の要約）

### A. レイアウトタブ
1. **比率ピッカーの並び順**: 出力フォーマットと写真の配置で、比率タイルの並び順が揃っていない
   （同じ「3:4」が上は5番目・下は4番目）。共通化したい。
2. **文章量とデザイン**: 説明文が多すぎて洗練されていない印象。
3. **カスタム設定の UI**: 「カスタム」を押すと出る幅／高さのテキストボックスが改行されていて野暮ったい。
   コンパクトに、スタイリッシュに。
4. **決定順序**: 決める順番が不自然。自然な流れは ① 出力フォーマット → ② トリミング（どの部分を使うか先に）
   → ③ 余白と配置。いまは「余白」が「出力フォーマット」の中にあって違和感。**意見がほしいとのこと。**

### B. 背景タブ
- 明るさ・彩度を出すのにワンアクション（アコーディオン）要るのが煩わしい。**常時表示でよい**。
  ただし拡大倍率・ぼかし強度とは別セクションだと分かるよう**区切り線**を入れてほしい。
- **バグの疑い**: 写真をクロップで小さくしても、背景のぼかし画像は元の（クロップ前の）写真から作られているように見える。
  ぼかし背景はクロップ後の写真を元にすべき。

### C. テキストタブ
- 「透過度／透明度」パラメーターは実際には**不透明度**（1.00 でくっきり、0 で透明）。ラベルが逆。

### D. 出力タブ
- ダウンロードボタンは「囲み」の一番右上（上部バー右）に置くのがよい。以前「出力タブに戻した」が、やはり上に戻したい。
- **「出力」タブは実質廃止**し、ダウンロード押下時に JPEG 画質（1–100）をその場で選べるようにすればタブごと消せる。

### E. 全体
- 全体をもっとスタイリッシュに。参考は **Adobe Lightroom の Web 版**（前回の「Canva 的に」から変更）。
  - 上部にフルバー。サイドの編集タブは1回押すとパネルが開き、もう1回で閉じる（「出て引っ込む」挙動）。
  - 各項目の区切りを**枠囲みではなく線ベース**に。
  - Exif 情報: いまはキャンバス下に出てスクロールが要る。**左からせり出すペイン**にし、もう1回で引っ込める
    （レイアウト／プリセットと同じ扱い）。そのため**情報タブをもう1つ別で作る**。位置はアイコンレールの一番下。
    Exif 表示は Lightroom 風に**アイコン主体・項目名テキストなし**（絞りマーク等）でミニマルに。
  - 全体に文字が多い。アイコンで直感的に。

## 2. コード調査でわかったこと（計画の裏取り）

- **B のぼかしバグは本物**。`js/backgroundRenderer.js` の `drawBlurredImageBackground()` が
  `sx=0, sy=0, sWidth=img.width, sHeight=img.height` と元画像全体を使い、`imgAspectRatio` も元画像比率。
  `drawBackground()` には `currentState` が渡り、`photoDrawConfig.sourceX/Y/Width/Height`（クロップ矩形の元画像px座標、
  `layoutCalculator` 算出）がすでにある。プレビュー（`canvasRenderer.js:343`）も出力（`:479` `renderFinal`）も同じ関数。
  → `sx/sy/sWidth/sHeight` を `photoDrawConfig.sourceX/Y/Width/Height` に、`imgAspectRatio` を `sourceWidth/sourceHeight` に
  差し替えるだけ。ぼかし強度の基準（`basePhotoShortSideForBlurPx`）はすでにクロップ後の写真短辺なので変更不要。
- **C のラベルは本物**。`js/uiController.js` の `renderTextLayerSettingsPanel()` に `<label for="textLayerOpacity">透過度:</label>`。
  値は `opacity`（`textRenderer.js` の `hexToRgba(color, opacity)`）。影は `index.html` で正しく「不透明度」。
  → ラベル文字列の変更のみ（`js/uiController.js` 1箇所、`js/uiDefinitions.js:148` のコメントも）。
- **E-1 の下地**: `js/tabManager.js` は現状クリックで**ペイン切り替えのみ**（同じタブ再クリックで閉じない。常に1枚開いている）。
  「再クリックで閉じる（アクティブなし）」を足す必要がある。`getActiveTab()` は既に「どれもアクティブでなければ null」を返せる。
- **E-5 の現状**: `#tab-output` = 「JPG画質設定」fieldset（`#jpgQuality`）＋ `#downloadButton`。`outputSettings.quality` は state 保持、
  `fileManager.handleDownload()` が参照。ダウンロードボタンの id・配線（`main.js`）は不変のまま移設・ポップオーバー化できる。
- **E-3 の現状**: `#exifToggleButton`（レール下部、`.tab-button` なし）＋ `#exifFloatCard`（`.canvas-area` 内フローティング）。
  開閉は `main.js` が個別配線。

## 3. 決定順序（A-8）についての私の意見

ユーザーの直感どおり **① アスペクト比 → ② トリミング → ③ 余白・配置** が自然だと考える。理由:

- 「余白」は**出力キャンバスの形の決定ではなく、構図の決定**。写真をどれだけ余白で囲むかは「どう見せるか」であって
  「何 px の枠か」ではない。だから「出力フォーマット」から出して ③ に置くのが筋が通る。
- ② トリミングを ③ の前に置くのは、トリミングで写真の実効的な短辺（＝余白 % の基準）が変わるため。
  先に「使う範囲」を確定してから余白量を決める方が、値がぶれない。
- ① を先頭にするのは、切り抜き比率で「フリー」にするか「出力と同じ比率」にするかの判断が、出力比率を見てから
  の方がしやすいから（多くの人は「出力と同じ比率で切りたい」になりがち。将来 ② に「出力比率に合わせる」ショートカットを
  足す余地もある）。

具体化案（E-2 の線区切りと同時に）:
1. **アスペクト比** — 比率タイルのみ。
2. **トリミング** — 切り抜き比率タイル ＋「プレビューで写真をクリック → トリミング」の一言。
3. **余白と配置** — 余白スライダー ＋「配置をリセット」＋「写真をドラッグで移動」の一言。

## 4. 練り直した実装計画（詳細は `docs/roadmap.md`）

- **フェーズ3（小改修・バグ。設計判断ほぼ不要、シェル刷新の前に）**: B-3（ぼかしをクロップ後から）/ D-4（不透明度ラベル）/
  A-7（比率ピッカーの並び順共通化＋カスタム欄コンパクト化）/ B-4（明るさ・彩度を常時表示に戻し区切り線で分離）。
- **フェーズ4（シェル刷新。`artifact-design` でモックアップ → 合意 → 実装）**: E-1（タブ再クリックでパネル出入り）/
  E-2（枠囲み→線区切り）/ E-5（出力タブ廃止＋ダウンロードを上部バー右＋画質ポップオーバー）/
  A-8（レイアウトを ①→②→③ に並べ替え、余白を分離）/ E-4（説明文削減・アイコン化）/ F（プリセットの置き場所を決める）。
- **フェーズ5（情報ペイン）**: E-3（Exif を独立タブ＋左スライドアウトペイン、表示はアイコン主体）。
- **フェーズ6（編集機能の拡張＝積み残し）**: C-1（超楕円の体感等間隔）/ A-5（クロップ確定クリックをキャンバス外へ）/
  D-1・D-3（テキスト追加ワークフロー再設計。スコープ決めから）/ A-4（枠内で写真回転）/ A-3（crop 元画像の回転。最大規模）。

B-1 で入れた背景の「色調」アコーディオンは B-4 で差し戻す（常時表示＋区切り線）。方針転換なので履歴として明記しておく。

## 5. 相談の回答（このセッションで確認済み）

- **次の着手はフェーズ3から**（小改修・バグ）。シェル刷新のモックアップより先に片付ける。
- **A-8 の順序**（① アスペクト比 → ② トリミング → ③ 余白・配置、余白を「出力フォーマット」から分離）は、私の意見に
  ユーザーから反対なし。フェーズ4 で実装する際に最終確認する。
- **E-5**: ダウンロード時の画質選択は「ダウンロードボタン脇のポップオーバー（画質スライダー＋書き出す）」。
  アイコンレールの「出力」項目も一緒に削除する。
- **E-1**: パネルを閉じた（どのタブも非アクティブの）状態でのプレビュー上のドラッグ既定は「写真＝枠内配置」。

## 6. 練り直し版ロードマップの反映

`docs/roadmap.md` を「実装計画（2026-08-29 その3 練り直し版）」の節付きで書き直し、新規項目
（A-7 / A-8 / B-3 / B-4 / D-4 / E-1〜E-5）を追加。旧 A〜F の ID は維持。

## 7. フェーズ3 の実装（同セッションで実施）

### 7.1 B-3 — 拡大ぼかし背景をクロップ後の写真から生成

- `js/backgroundRenderer.js`:
  - `drawBackground()` が `currentState.photoDrawConfig.sourceX/Y/Width/Height`（有効なら）から
    `sourceRect = {x,y,w,h}` を作り、`drawBlurredImageBackground()` に第7引数として渡す。未算出時は画像全体にフォールバック。
  - `drawBlurredImageBackground(..., sourceRect)`: `sx/sy/sWidth/sHeight` を `sourceRect` の値に、
    `imgAspectRatio` と cover スケール計算を `src.w / src.h` 基準に置き換え。`drawImage` のソース矩形がクロップ範囲になる。
  - ぼかし強度の基準（`basePhotoShortSideForBlurPx`）と X/Y オフセットの %基準は元からクロップ後の写真短辺なので変更不要。
  - プレビュー（`canvasRenderer.js:343`）・出力（`:479` `renderFinal`）の両経路が同じ関数を通るので一箇所の修正で両方直る。

### 7.2 D-4 — 不透明度ラベル

- `js/uiController.js` の `renderTextLayerSettingsPanel()`: `<label for="textLayerOpacity">透過度:</label>` →「不透明度:」。
- `js/uiDefinitions.js`: `textOpacity` のコメントを「不透明度設定（1=くっきり／0=透明）」に。
- データ・ロジック変更なし。

### 7.3 A-7 — 比率タイルの並び順共通化＋カスタム欄コンパクト化

- `js/ui/ratioPicker.js`: `RATIO_FAMILIES`（比率の正準順序。各エントリに `pickers: ['output'|'crop']`）と
  `ratioOptionsFor(pickerName)` をエクスポート。正準順序は
  フリー → 1:1 → 4:5 → 3:4 → 4:3 → 16:9 → 9:16 → 1.91:1 → L判 → カスタム。
- `js/uiController.js`: 別々に持っていた `OUTPUT_RATIO_OPTIONS` / `CROP_RATIO_OPTIONS` を削除し、
  `ratioOptionsFor('output')` / `ratioOptionsFor('crop')` に。結果、出力＝1:1／4:5／3:4／16:9／1.91:1／L判／カスタム、
  切り抜き＝フリー／1:1／3:4／4:3／16:9／9:16／カスタム。「3:4」は両ピッカーとも index 2 で一致（Playwright で確認）。
  ※ 切り抜きの 1:1／16:9 タイルにも `RATIO_FAMILIES` のサブラベル（正方形／ワイド）が付くようになった（許容範囲・むしろ統一感）。
- `index.html` / `style.css`: カスタム幅高さ欄の class を `.form-row-simple` →新設 `.ratio-custom-row`
  （`display:flex; white-space:nowrap;` の1行固定。number 入力は 3.4rem 固定幅、⇄ は控えめなアウトラインボタン）。
  旧 `#customAspectRatioContainer` / `#swapAspectRatio` 系の ID セレクタ CSS は削除。

### 7.4 B-4 — 色調アコーディオンを撤回、区切り線で分離

- `index.html`: `<details id="bgToneAccordion">` を撤去。「拡大ぼかし背景設定」を
  `<p class="subsection-heading">見え方</p>`（拡大倍率・ぼかし強度）／`<p class="subsection-heading with-rule">色調</p>`
  （明るさ・彩度）／`<p class="subsection-heading with-rule">位置</p>`（ヒント＋「位置をリセット」）の3グループに。
- `style.css`: `#bgToneAccordion` の CSS ブロックを削除。`.subsection-heading.with-rule`（上に `border-top` の区切り線
  ＋padding）を新設。
- JS 変更なし（DOM ラッパーが変わるだけ。`bgBrightness` / `bgSaturation` の同期・リスナーはそのまま）。

### 7.5 検証

`kakomi-devtools/phase3-test.js` を新規作成（`phase2-test.js` の背景アサーションも新構造に合わせて更新）。
`python3 -m http.server 8420` をリポジトリルートで起動し、`cmd.exe /c "cd /d C:\Users\yello\kakomi-devtools && node phase3-test.js"`。
**phase3 = 13/13 パス、phase2 = 19/19 パス。**

- A-7: 出力タイル並び = `1:1,4:5,3:4,16:9,1.91:1,L判,カスタム`／切り抜き = `フリー,1:1,3:4,4:3,16:9,9:16,カスタム`／
  「3:4」が両方 index 2／カスタム欄の高さ 30px・子要素が同一行。
- B-4: `#bgToneAccordion` 不在／明るさ・彩度が可視／区切り線付き小見出しに「色調」。
- B-3: 画像ロード＋imageBlur 背景でキャンバス中央画素 `157,46,129`（ぼかしたシームの紫）→ 切り抜きを 9:16 に変えると
  `32,64,255`（青）に**変化**＝クロップ後の写真からぼかしを生成できている（バグ時は不変のはず）。エラーなし。
  スクリーンショット `phase3-b3-full.png` / `phase3-b3-cropped.png`。
- D-4: `#textLayerSettingsPanel label[for="textLayerOpacity"]` のテキストが「不透明度:」。
- 一連の操作でコンソールエラーゼロ。

## 8. フェーズ3 時点のステータス

- **フェーズ3（B-3 / D-4 / A-7 / B-4）を実装・Playwright スモーク検証済み**。ユーザーのブラウザ目視・操作感確認は次回
  （特に: 実写真でクロップ→ぼかし背景がその範囲の色になるか、比率タイルの並び、カスタム欄の見た目、背景の区切り線）。

## 9. フェーズ4 シェル刷新のモックアップと方向性合意（同セッション）

`artifact-design` で Lightroom Web 風のシェル刷新モックアップ（操作できる HTML アーティファクト）を作成。
上部フルバー／アイコンレール／タブ再クリックでパネル出入り／線ベースのセクション区切り／説明文をアイコン＋数語に圧縮／
「出力」タブ廃止＋ダウンロードを上部バー右＋画質ポップオーバー／レイアウトタブを ①出力アスペクト比 → ②トリミング → ③余白と配置 に並べ替え、を1枚に。

**A-8（決める順番）についての私の意見**（モック内にも記載）: ① アスペクト比 → ② トリミング → ③ 余白・配置 が自然。
理由＝余白は「出力キャンバスの形」ではなく「構図」の決定なので「出力フォーマット」から出して③へ／トリミングで写真の
実効短辺（＝余白%の基準）が変わるので使う範囲を先に確定する方が値がぶれない／切り抜き比率を「自由 or 出力と同じ」に
するかは出力比率を見てから決められる。

**ユーザーのレビュー結果:**
- 方向性（パネル出入り＋線区切り＋説明文最小化＋A-8 並べ替え）は **OK。ただし E-3 を見直し**。
- **E-3 の修正**: モック初版は「情報」を他パネルの上に重ねる独立オーバーレイ（左からスライド）にしていたが、
  **これは違う**。「情報」は**レールの一項目で、他のタブと完全に並列**。押すと他のタブと**同じパネル枠に切り替わって**
  Exif が出る（レイアウトが開いていたら情報に入れ替わる）。もう一度押すとタブごと収納。
  → モックを修正（`.kk-exif` の absolute オーバーレイを削除し、`data-pane="info"` の普通のペインに。JS の特別分岐も削除）。
  `docs/roadmap.md` の E-3 記述も修正。
- **アイコンレールの色**: 現状の明るいまま（配色そのものは今回変えない）。
- **初期表示**: レイアウトのパネルが開いた状態。
- **E-5 画質**: ダウンロードボタン脇のポップオーバー（画質スライダー＋「書き出す」）。アイコンレールの「出力」項目も削除。
- **F プリセット**: レール下部の一項目のまま（「情報」の隣）。レイアウトの中に畳み込むのは見送り。
- **E-1 閉状態のドラッグ既定**: 写真＝枠内配置（フェーズ3で確認済み）。

これらは `docs/roadmap.md` の「実装計画」フェーズ4・フェーズ5、および E 節に反映済み。

## 10. フェーズ4 実装前のステータス

- フェーズ3 完了・検証済み（§7・§8）。フェーズ4 はモックアップで方向性合意済み（§9）。

## 11. フェーズ4 シェル刷新の実装（同セッション）

### 11.1 変更ファイルと要点

- **`js/tabManager.js`（E-1）**: `initializeTabs()` の click ハンドラに「アクティブなタブをもう一度クリック →
  `.app-shell` に `.panel-collapsed` を付けて畳む」を追加。別タブを押すと `.panel-collapsed` を外す。
  畳むとき `onTabChange` コールバックは `null` 引数で呼ぶ。初期化時は HTML の `.active` を一度クリアしてから
  `tabButtons[0].click()`（クリア無しだとトグルで畳まれてしまうため）。`getShell()` ヘルパー追加。
- **`js/canvasRenderer.js`**: `clearContainerSizeCache()` をエクスポート（`cachedContainerSize = null`）。
- **`js/main.js`**:
  - ダウンロードポップオーバー配線（E-5）: `#downloadButton` クリックで `#downloadPopover` の `.hidden` をトグル、
    `#downloadConfirmButton` で `handleDownload()`＋閉じる、外側クリック／Esc で閉じる。
  - `#downloadButton` が無い旧経路（`addEventListener('click', handleDownload)`）は `else` に残す（防御的）。
  - `.canvas-container` に `ResizeObserver`（デバウンス 180ms）→ `clearContainerSizeCache()`＋`requestRedraw()`。
    パネル畳み／展開でキャンバス幅が変わるが window resize は出ないため。
- **`js/uiController.js`**: `uiElements` に `downloadPopover` / `downloadConfirmButton` を追加。それ以外は不変
  （`#jpgQuality` / `#jpgQualityValue` / `#downloadButton` は id 据え置きでポップオーバーへ移設しただけ）。
- **`index.html`**:
  - 上部バー `.header-actions` に `.dl-group`（`#downloadButton` ＝アイコン＋ラベル、`#downloadPopover` ＝
    `#jpgQuality` スライダー＋注記＋`#downloadConfirmButton`「書き出す」）を追加。
  - レール: `data-tab="tab-output"` のボタンを削除。
  - `#tab-output` ペインを削除（中身は上部バーへ移設済み）。
  - レイアウトタブ（A-8）: 「出力フォーマット」「写真の配置」の2 fieldset を **「出力アスペクト比」「トリミング」
    「余白と配置」の3 fieldset** に。余白スライダー（`#baseMarginPercent`）を①から③へ移動。長いヒント段落を
    各1行に圧縮（E-4）。
  - 背景「位置」ヒント、文字タブのヒント、プリセットの legend／ヒントも短縮（E-4）。
- **`style.css`（E-2 ほか）**:
  - `#downloadButton` を上部バー用（`display:inline-flex` の小さめボタン）に。`.dl-group` / `.dl-popover` を新設。
  - `.tab-content-area` に `transition`（width / padding / border）＋`overflow: hidden auto`。
    `.app-shell.panel-collapsed .tab-content-area { width:0; padding:0 …; border-right-color:transparent }`。
  - `fieldset`: `border:none; padding:0`。`fieldset+fieldset`（等）に `border-top`＋`padding-top`。
    `legend`: 小さめの大文字見出し（`display:block; width:100%`）。
  - `.frame-card`: 枠・背景を外し、`.frame-card+.frame-card` に上罫線。`.frame-card-head` / `.corner-segmented` /
    `.accordion-body` の左右パディングを 0 に。
  - `.custom-text-drag-hint`: 文字色を `--ink-faint`、フォント 0.78rem に（E-4）。
  - `@media(max-width:768px)` の `fieldset { padding }` / `legend { font-size }` は不要になったので削除。

`editState`・各レンダラ・`presetStore` は無変更。「情報」ボタン（`#exifToggleButton` / `#exifFloatCard`）は
そのまま（E-3＝フェーズ5）。

### 11.2 検証

`kakomi-devtools/phase4-test.js` を新規作成。`python3 -m http.server 8420` を起動して
`cmd.exe /c "cd /d C:\Users\yello\kakomi-devtools && node phase4-test.js"`。**phase4 = 20/20 パス**。
回帰: **phase2 = 19/19、phase3 = 13/13**（phase3 のカスタム欄 offsetTop はパネル位置が変わったため値が変化したが判定は同一行で PASS）。

- E-5: `tab-output` のレール項目・ペインが無い／`#downloadButton` が `.app-header` 内／`#jpgQuality` が `#downloadPopover` 内。
- A-8: `#tab-layout fieldset > legend` が `出力アスペクト比 / トリミング / 余白と配置` の順。
- E-2: 先頭 fieldset の `border-top` が `none`/`0px`。
- E-1: 初期はパネル開＋レイアウトがアクティブ／レイアウト再クリックで `.panel-collapsed` 付与＋パネル幅 360→1／
  アクティブタブ無し／背景タブクリックで開き直し（幅 360 復帰）。
- E-5 ポップオーバー: 初期 disabled → 画像ロードで有効化 → クリックで開く →「書き出す」ボタン有り → 外側クリックで閉じる。
- 一連の操作でコンソールエラーゼロ。

スクリーンショット `phase4-layout.png` / `phase4-frame.png` / `phase4-collapsed.png` で、
3セクションの線区切り・フレームタブの枠なし化・パネル収納でキャンバスが全幅に広がる挙動を確認。

## 12. 現状のステータス

- **フェーズ2 → フェーズ4 まで実装・Playwright スモーク検証済み**。ユーザーのブラウザ目視・操作感確認は次回
  （特に: パネル出入りの手触り、線区切りの各パネルの見た目、ダウンロードのポップオーバー、レイアウトの ①②③、
  パネル収納時にキャンバスがちゃんと再フィットするか）。
- **次はフェーズ5（E-3）**: 「情報」を他タブと並列のタブに（`#exifFloatCard` 廃止 → `.tab-button`＋`.tab-pane`、レール最下部）。
  Exif 表示を SVG アイコン＋値だけのミニマルなレイアウトに（`displayExifInfo` の作り替え）。その後 フェーズ6（C-1 / A-5 / D-1・D-3 / A-4 / A-3）。
- 実装ツール: `C:\Users\yello\kakomi-devtools\`（`phase2/3/4-test.js`、`shell-mockup.html`、`shot-mockup.js`、スクリーンショット）。

## 13. 【既知の不具合】縦長／正方形の出力比率でプレビューキャンバスがじわじわ拡大し続ける

### 13.1 症状

出力アスペクト比で**縦長（4:5・89:127=L判 など）や正方形（1:1）**を選ぶと、プレビューキャンバスの描画領域が
1フレームごとに約1pxずつ拡大し続け、`.canvas-container` の端に当たるまで止まらない。横長（16:9 など）は安定。
**ユーザーによると、この「囲み」（3カラムのシェル）を以前作ったときにも同じ現象が出ており、原因未特定のまま
「CSS で値を固定する」対処を試したがレイアウトが崩れて解決できなかった**、とのこと。

### 13.2 再現

`kakomi-devtools/creep-repro.js`（画像をロード → 各比率を選んで `previewCanvas.width/height` と
`.canvas-container` の `clientWidth/Height` を時間差でサンプル）。フェーズ4 実装直後の状態で:

```
16:9    t0=786x441 (cont 786x642)  t3=786x441  stable
4:5     t0=514x644 (cont 786x646)  t3=540x676  <<< CREEPING （キャンバス・コンテナとも高さが増え続ける）
1:1     t0=678x678 (cont 786x680)  t3=710x710  <<< CREEPING
89:127  t0=498x712 (cont 786x714)  t3=521x744  <<< CREEPING
```

### 13.3 原因（作業仮説）

正のフィードバックループ:

1. `canvasRenderer.drawPreview` は `.canvas-container` の `clientWidth/clientHeight`（`cachedContainerSize` にキャッシュ）
   から、出力比率に収まる `previewCanvas.width/height` を決めて代入する。
2. **縦長／正方形のときはキャンバスが「高さ基準」で決まる**（`containerWidth/containerHeight > outputAspectRatio` の枝で
   `canvasRenderHeight = containerHeight`）。横長は「幅基準」でキャンバス高さがコンテナより低いので、この問題は起きない。
3. `#previewCanvas` には `border: 1px solid var(--ink)` があり、`box-sizing: border-box` ／ `object-fit: contain` ／
   flex のサブピクセル丸めなどの相互作用で、**描画された要素がキャッシュした測定値より 1〜2px 大きく**なる。
4. `.app-container` が `min-height: 100vh`（`height` ではない）なので、レイアウトは下へ伸びられる。`.canvas-area` /
   `.canvas-container` は `overflow: hidden` だが、要素自身が測定値より大きいぶんコンテナ高さが押し上がる。
5. **フェーズ4 で追加した `.canvas-container` の `ResizeObserver`** がこの高さ変化を検知 → `clearContainerSizeCache()`
   → `requestRedraw()` → 1. に戻り、今度は少し大きい測定値でキャンバスを作る → 4. で更に押し上がる → …

フェーズ4 より前は「キャッシュを破棄するのは `window` の `resize` だけ」だったため、`drawPreview` は最初の（安定した）
測定値を使い続け、このループは回らなかった。`cachedContainerSize` は元々この種のループへの防御。

### 13.4 このセッションでの対処（暫定・回帰の封じ込め）

`js/main.js` の `ResizeObserver` を**「幅」の変化（≥1px）にだけ反応する**ように変更した。
パネルの畳み／展開で変わるのは幅なので、その用途（キャンバス再フィット）は保ったまま、
高さのフィードバックループを断てる。

検証: `creep-repro.js` で 4:5 / 1:1 / 89:127 とも `stable` に戻った。`phase4-test.js` 20/20（パネル開閉の再フィットも
引き続き PASS）。`phase2` 19/19・`phase3` 13/13 回帰 OK。

### 13.5 根本原因は未解決（次以降で腰を据えて）

これは「ループが回らないようにした」だけで、**レイアウトが伸びられる素地は残っている**（別の経路でキャッシュが
破棄されれば再発しうる。フェーズ5 で `#exifFloatCard` を触る・情報タブを増やす等で誘発の可能性）。腰を据えて直すなら:

- `#previewCanvas` の `border` を要素のレイアウトボックスに乗せない（`.canvas-container` 側の内側 `box-shadow` /
  `outline` にする、あるいはボーダーぶんを差し引いて `drawPreview` に渡す）。
- `.app-container { min-height: 100vh }` → `height: 100dvh; overflow: hidden`（下方向に伸びられなくする）。
  ただしレスポンシブ（`@media max-width:1024px` の縦積み）で崩れないか要確認——ユーザーが過去に「CSS 固定で崩れた」
  と言っているのはおそらくこの辺。
- `.canvas-container` を明示ピクセルサイズの箱にして `drawPreview` は一度だけ測る（`ResizeObserver` は
  レイアウト由来の変化のみ拾う）。
- いずれも、`creep-repro.js`（安定判定）＋各ブレークポイントでのレイアウト目視 をセットで確認する。

## 14. 現状のステータス（セッションクローズ）

- **フェーズ2 → フェーズ4 まで実装・Playwright スモーク検証済み**（phase2 19/19・phase3 13/13・phase4 20/20）。
  §13 の「じわじわ拡大」は**幅のみに反応する ResizeObserver で回帰を封じ込め済み**（`creep-repro.js` 安定）。根本原因は §13.5 として残す。
- **次セッション**: まず §13.5 の根本原因（レイアウトが下へ伸びられる素地）を潰すか判断 → そのうえで **フェーズ5（E-3: 情報タブ）**。
- コミット／プッシュはこのセッションのクローズ時に実施予定。次セッション用の引き継ぎプロンプトを別途用意する。
- 実装ツール: `C:\Users\yello\kakomi-devtools\`（`phase2/3/4-test.js`、`creep-repro.js`、`shell-mockup.html`、`shot-mockup.js`）。
