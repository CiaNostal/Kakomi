# 開発セッションログ: 既知の不具合 G-1 の根本対処（実日付 2026-08-27）

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

## 5. 現状のステータス

- **G-1 は解消**。`style.css` の `#previewCanvas` 枠線を `outline` 化しただけの最小変更。`main.js` はコメントのみ。
  `spec.md`（3.1 節・5.5 節・11.6 節）、`docs/roadmap.md`（「完了済み」表に G-1 を追加、本文の G-1 節を「解消」に）、
  `CLAUDE.md` を更新済み。
- **ユーザーのブラウザ目視は次回**（特に: 縦長比率で実写真を入れて拡大しないこと、枠線の見た目、`@media` 幅での崩れ）。
- コミット／プッシュはユーザーの指示待ち。
- **次はフェーズ5＝E-3（情報タブ）**。`docs/roadmap.md` フェーズ5 / E-3 節、`kakomi-devtools/shell-mockup.html` を参照。
