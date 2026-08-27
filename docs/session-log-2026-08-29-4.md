# 開発セッションログ: 既知の不具合 G-1 の根本対処 ＋ フェーズ5（E-3 情報タブ）（実日付 2026-08-27）

`docs/session-log-2026-08-29-3.md`（フェーズ3＋フェーズ4＋G-1 の暫定封じ込め）の続き。
このセッションのテーマは 2 つ（G-1 の根本対処 → フェーズ5＝E-3 情報タブ）で、**ユーザーと相談して
「G-1 を先に、最小アプローチで」**と決めてから着手した。本ログは G-1 の根本対処までを記録する。

> **ファイル名の日付について**: git のコミット日時を見ると `session-log-2026-08-28.md` 以降のログは
> すべて実日付 2026-08-26〜27 に作られており、ファイル名の日付が 1〜2 日先行している（08-28・08-29 は
> git 履歴のどこにも無く、ファイル名と本文中の記述だけに存在する）。原因は、あるセッションが日付を
> またいで作業し、以後の各セッションが「前のログのファイル名 ＋1 日」で命名し続け、`CLAUDE.md` の
> 「（2026-08-29時点）」がそれを補強したこと。このログは連番の一貫性（`CLAUDE.md`・`spec.md`・
> 他ログからの相互参照）を優先して `-2026-08-29-4.md` としたが、**実際の作業日は 2026-08-27**。

## 1. 方針の確認（着手前の相談）

- **順番**: G-1（縦長／正方形比率でプレビューキャンバスがじわじわ拡大）の根本対処を、フェーズ5 より先にやる。
  理由＝`docs/session-log-2026-08-29-3.md` §13.5 が「フェーズ5 で `#exifFloatCard` を触る・タブを増やすと
  別経路で再発しうる」と警告しているため、素地を潰してから E-3 に入るほうが手戻りが少ない。
- **アプローチ**: §13.5 の 3 候補のうち **「`#previewCanvas` の border を要素のレイアウトボックスから外す（最小）」** を採用。
  `.app-container { min-height:100vh }` → `height:100dvh; overflow:hidden` や `.canvas-container` の明示サイズ化は、
  ユーザーが過去に「CSS で値を固定 → レイアウト崩れ」を経験しているため今回は見送り。

## 2. 原因の再確認（コードで裏取り）

正のフィードバックループ（`docs/session-log-2026-08-29-3.md` §13.3 の要約）:

1. `js/canvasRenderer.js:320-336` が `.canvas-container` の `clientWidth/clientHeight`（`cachedContainerSize` にキャッシュ）
   から `previewCanvas.width/height` を決める。
2. **縦長／正方形では「高さ基準」の枝**（`canvasRenderer.js:332`、`containerWidth / containerHeight > outputAspectRatio`）で
   `canvasRenderHeight = containerHeight`。横長は「幅基準」でキャンバス高さがコンテナより低いのでこの問題は出ない。
3. `#previewCanvas` に `border: 1px solid var(--ink)`（`style.css`）があり、この 2px（左右／上下 1px ずつ）が
   **要素のボーダーボックスに乗る**。キャンバス高さ属性＝コンテナ高さにしても、要素のボーダーボックスは +2px。
4. `.app-container { min-height: 100vh }` なのでレイアウトは下へ伸びられ、`.canvas-area` / `.canvas-container` が
   `overflow: hidden` でも要素自身が測定値より大きいぶんコンテナ高さが押し上がる。
5. フェーズ4 で足した `.canvas-container` の `ResizeObserver` がこの高さ変化を検知 → `clearContainerSizeCache()`
   → `requestRedraw()` → 1. に戻り、今度は少し大きい測定値でキャンバスを作る → 4. で更に押し上がる → …

フェーズ4 の暫定対処＝この `ResizeObserver` を**「幅の変化にだけ反応」**に限定して 5. のトリガを断ち、回帰を封じ込めた。
ただし 3.（border がボーダーボックスに乗る）と 4.（下へ伸びられる素地）は残っていた。

`toCanvasCoords()`（`js/interaction/canvasInteraction.js:56-61`）は `getBoundingClientRect()` の実測幅と
`canvas.width` の比でスケールを出しているため、border を外すと `rect.width === canvas.width` となり
**座標マッピングはむしろ厳密になる**（従来は border 2px ぶん微妙にズレていた）。回帰の心配はない。

## 3. 変更

### `style.css` — `#previewCanvas` の枠線を `border` から `outline` へ

```css
#previewCanvas {
    display: block;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    /* 枠線は outline で描く（要素のレイアウトボックスに乗せない）。border にすると
       縦長／正方形の出力比率で 1px ぶん要素がコンテナ高さを押し上げ、ResizeObserver との
       正のフィードバックでプレビューがじわじわ拡大し続ける（G-1）。
       outline はレイアウトに影響せず、outline-offset: -1px でキャンバス内側に寄せて
       コンテナの overflow:hidden で切られないようにする。 */
    outline: 1px solid var(--ink);
    outline-offset: -1px;
    box-shadow: var(--shadow-sm);
    cursor: default;
    touch-action: none;
}
```

- `border: 1px solid var(--ink)` を削除し、`outline: 1px solid var(--ink); outline-offset: -1px;` を追加。
- `outline` はレイアウトボックスに影響しない。`outline-offset: -1px` でキャンバスの内側 1px に描くため、
  `.canvas-container { overflow: hidden }` でクリップされず、見た目は従来の 1px 枠とほぼ同じ。
- inset `box-shadow` 案は不採用: canvas は置換要素で、描画ビットマップが要素ボックス全面を覆うため
  inset シャドウがビットマップの下に隠れて見えなくなる。`outline` は最前面に描かれるので確実。
- `.app-container` の高さ指定・`.canvas-container` のサイズ指定・`@media` ブロックは**一切変更なし**。

### `js/main.js` — `ResizeObserver` のコメントを更新（挙動は変更なし）

「幅のみに反応」ガードのコメントを、根本原因が `outline` 化で解消済みであること・このガードは
多重防御として残すこと、を明記する内容に差し替え。ロジックは据え置き。

## 4. 検証

ローカルサーバ `python3 -m http.server 8420`、`cmd.exe /c "cd /d C:\Users\yello\kakomi-devtools && node <script>.js"`。

### 4.1 `creep-repro.js`（拡大の有無）

| 状態 | 4:5 | 1:1 | 89:127 | コンテナ高さ |
|---|---|---|---|---|
| 変更前（フェーズ4 の暫定対処のみ） | stable | stable | stable | 644 |
| **outline 化後** | stable | stable | stable | **642** |

コンテナ高さが 644 → 642 に下がった＝border 2px ぶんの押し上げが消えたことの直接の証拠。

### 4.2 「素地が消えたこと」の決定的テスト

`js/main.js` の `ResizeObserver` を**一時的に「あらゆるサイズ変化（高さ含む）に反応」へ戻して** `creep-repro.js` を実行。
`docs/session-log-2026-08-29-3.md` §13.2 では、この状態（フェーズ4 直後）が 4:5 / 1:1 / 89:127 すべて `CREEPING` だった。

→ **outline 化した状態では、高さ反応の `ResizeObserver` に戻しても 4:5 / 1:1 / 89:127 すべて `stable`。**
これで「root cause は border がレイアウトボックスに乗っていたこと」が確定。実験後 `js/main.js` は元に戻した。

### 4.3 新規スモーク `kakomi-devtools/g1-test.js`（13/13 PASS）

- `#previewCanvas` の `border-top-width` が `0px`／`outline` が `1px solid`／`outline-offset` が `-1px`。
- ビューポート幅 **1280 / 1024 / 768** それぞれで、`4:5` / `1:1` / `L判` を選び 1.6 秒後にキャンバスサイズが不変。
- コンソール／ページエラーなし。
- スクリーンショット `g1-w1280.png` / `g1-w1024.png` / `g1-w768.png` を保存。1024・768 は `@media` の縦積み
  （タブレール横並び＋パネルが上、キャンバスが下）だが、レイアウト破綻なし・枠線も従来どおり表示。

### 4.4 回帰

- `phase2-test.js` 19/19
- `phase3-test.js` 13/13
- `phase4-test.js` 20/20（パネル開閉のキャンバス再フィットも引き続き PASS）

## 5. G-1 のステータス

- **G-1 は解消**。`style.css` の `#previewCanvas` 枠線を `outline` 化しただけの最小変更。`main.js` はコメントのみ。
  `spec.md`（3.1 節・5.5 節・11.6 節）、`docs/roadmap.md`（「完了済み」表に G-1 を追加、本文の G-1 節を「解消」に）、
  `CLAUDE.md` を更新済み。
- **ユーザーのブラウザ目視は次回**（特に: 縦長比率で実写真を入れて拡大しないこと、枠線の見た目、`@media` 幅での崩れ）。
- G-1 のコミット `674ce41` を `feature/interactive-editing` にプッシュ済み。

---

## 6. フェーズ5 = E-3（情報タブ）の実装

G-1 をコミット／プッシュしたあと、同じセッションで E-3 に着手した。フェーズ4 のモックアップ
（`kakomi-devtools/shell-mockup.html` の「情報」タブ・E-3 セクション）で方向性は合意済みだったため、そのまま実装した。

### 6.1 方針（モックアップ準拠）

- 「情報」を**レール下部の `.tab-button`（`data-tab="tab-info"`）＋ `#tab-info` ペイン**にし、他タブと完全に並列にする。
  `tabManager.js` が `.tab-button` を一括で扱うので、タブ切り替えも E-1 の再クリック収納も**追加配線なしで**効く。
- レール順は モックに合わせ、`rail-spacer` の下に **プリセット → 情報** の並び（従来はプリセットが spacer の上）。
- Exif 表示は Lightroom Web 風に、**カメラ／レンズ名だけ小さく上部に1行**、撮影設定は**アイコン＋値だけ**。
  項目名テキスト（「F値」等）は出さず `<dt>` の `title` 属性（ホバーでツールチップ）に入れる。

### 6.2 変更ファイル

- **`index.html`**:
  - スプライトに `#i-aperture` / `#i-shutter` / `#i-iso` / `#i-focal` / `#i-cal` を追加（モックの同名シンボルを移植）。
  - レール: `#exifToggleButton`（`type="button"`・`.tab-button` なしの独立トグル）を
    `<button class="tab-button rail-item" data-tab="tab-info">` に置換。プリセットボタンを `rail-spacer` の下へ移動。
  - `.tab-content-area` に `<div id="tab-info" class="tab-pane">`（`<fieldset><legend>情報</legend>` ＋ `#exifDataContainer`）を追加。
  - `.canvas-area` から `#exifFloatCard`（`<h2>Exif情報</h2>` ＋ `#exifDataContainer`）を削除。`#exifDataContainer` は `#tab-info` 内へ移設（id 据え置き）。
- **`js/exifHandler.js`**: `displayExifInfo()` を作り替え。
  - `EXIF_ROW_DEFS`（key / icon / label）に基づき、存在する項目だけ `<dt title="項目名"><svg><use href="#i-*"/></svg></dt><dd>値</dd>` を並べる。
  - カメラ行は `<p class="exif-cam">`。Make と Model 両方あり Model が Make で始まらなければ連結、そうでなければ Model 優先。レンズ名があれば ` · ` で連結。
  - Exif なし／未読込は `.exif-empty` の1行（メッセージを出し分け）。`escapeHtml()` ヘルパーを追加。
  - `formatExifForDisplay()` の撮影日時整形バグを修正: 従来 `String(dateTime).replace(/:/g, '/')` で
    時刻のコロンまで `/` になり `2026/08/14 16/32/10` と表示されていた。`"YYYY:MM:DD HH:MM:SS"` を
    正規表現で分解し `"YYYY.MM.DD HH:MM"` に整形する。
- **`js/main.js`**: `#exifToggleButton` / `#exifFloatCard` の個別クリック配線（`classList.toggle('open')`）を削除。
  `onTabChange` の「写真の選択を解除するタブ」に `'tab-info'` を追加（背景・フレームと同じ扱い）。
  `requestRedraw()` の `displayExifInfo(state.exifData, uiElements.exifDataContainer)` 呼び出しはそのまま。
- **`js/uiController.js`**: `uiElements` から `exifToggleButton` / `exifFloatCard` を削除。`exifDataContainer` は維持。
- **`style.css`**: `.exif-float-card` 関連ブロックと `#exifDataContainer p` を削除し、`.exif-cam` / `.exif-dl`
  （`dt` / `dt svg` / `dd`）/ `.exif-empty` を追加（モックの `.kk-exif-*` を Kakomi のトークン `--ink` / `--ink-dim` /
  `--ink-faint` / `--border` に置換）。`.rail-item` のコメントも「6ボタンすべてが対等なタブ」に更新。
- **`js/tabManager.js`**: 変更なし（新しい `.tab-button` + `.tab-pane` を自動で拾う）。

### 6.3 検証

`kakomi-devtools/phase5-test.js` を新規作成（`window.piexif` でその場で Exif 付き JPEG を組み、`#imageLoader` に流し込む）。
`python3 -m http.server 8420` を起動して `cmd.exe /c "cd /d C:\Users\yello\kakomi-devtools && node phase5-test.js"`。

- **phase5 = 25/25 パス**。旧 `#exifToggleButton` / `#exifFloatCard` が無い／「情報」が `.tab-button[data-tab="tab-info"]`／
  レール順が `... , SPACER, tab-preset, tab-info`／情報クリックで `#tab-info` がアクティブ・他ペイン非アクティブ／
  再クリックで `.panel-collapsed`＋アクティブタブなし／Exif JPEG 読み込み後にカメラ行（`SONY ILCE-7M4 · FE 35mm F1.8`）と
  `.exif-dl dd` が5行（`f/1.8` / `1/250s` / `ISO 400` / `35mm` / `2026.08.14 16:32`）／`<dt>` の `title` が
  `絞り,シャッタースピード,ISO感度,焦点距離,撮影日時`／本文に項目名テキストが出ない／`svg` アイコン5個／コンソールエラーなし。
- 回帰: **phase2 19/19、phase3 13/13、phase4 20/20、g1 13/13**。
- スクリーンショット `phase5-info.png`: レール下部でプリセットの下に「情報」、パネルに legend「情報」＋カメラ行＋区切り線＋
  アイコン／値の行が並ぶ。モックの意図どおり。

## 7. 現状のステータス（セッションクローズ）

- **G-1（`674ce41` プッシュ済み）＋ フェーズ5 = E-3 まで実装・Playwright スモーク検証済み**
  （phase5 25/25、g1 13/13、phase2/3/4 回帰 19/19・13/13・20/20）。
- **ユーザーのブラウザ目視・操作感確認は次回**（G-1: 縦長比率で実写真／枠線の見た目／`@media` 崩れ。
  E-3: 情報タブの切り替わりの手触り、Exif のアイコン意匠、実写真での各値の見え方、ツールチップ）。
- E-3 のコミット／プッシュはユーザーの指示待ち。
- **次はフェーズ6**（積み残し）: C-1 / A-5 / D-1・D-3 / A-4 / A-3。各項目はまず方向性の相談から。
- 実装ツール: `C:\Users\yello\kakomi-devtools\`（`phase2/3/4/5-test.js`、`g1-test.js`、`creep-repro.js`、`shell-mockup.html`）。
