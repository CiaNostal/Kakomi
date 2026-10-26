# セッションログ 2026-10-26

## 1. 発端: スマホ（iOS Safari）で書き出しエラー

本番 `cianostal.github.io/Kakomi/` をスマホで使い、横長写真＋キャンバス 3×4 で「書き出す」を押したところ
「画像のダウンロード処理中にエラーが発生しました。コンソールを確認してください。」の `alert`。

## 2. 調査

### 2.1 エラーが出るタイミング（編集中に出ることはあるか）

ユーザー要望:「操作中（比率を変えた瞬間など）にエラーを吐くのは避けたい。書き出し時に巨大でエラーなら `alert` だけでよい」。

- 編集中の描画はプレビュー `#previewCanvas`（表示領域サイズ。`canvasRenderer.js` の `drawPreview`）だけ。比率変更で増えるのは `outputCanvasConfig` の数値のみ。`frameRenderer` の影用一時キャンバスもプレビュー時はプレビュー縮尺、`backgroundRenderer` はキャンバスを作らない。
- 出力解像度のキャンバスを作るのは `renderFinal()`（書き出し時）だけ。
- 実測（`kakomi-devtools/canvas-size-probe.js`、390px 幅、6000×4000 写真で全比率タイルを順にクリック）: 2MP 超のキャンバス確保は 読み込み 0 / 編集 0 / 書き出し 1（6400×8533＝54.6MP、iOS 上限 16,777,216px の約3.3倍）。
- **結論: 既に「エラーは書き出し時のみ」になっている**。今回も書き出し時（スクショでダウンロードのポップオーバーが開いている）。

### 2.2 このアラートに到達する経路（キャンバスサイズ以外の可能性）

`handleDownload()` の `try` 内で例外になりうるもの:

| 経路 | 原因 |
|---|---|
| `canvasToJpegBlob`（`convertToBlob` reject／`toBlob` が null →「初期Blobの生成に失敗」） | キャンバス面積・メモリ上限。tainted canvas は画像を data URL で読むため起きない |
| `blobToDataURL` の reject（Exif 保持＝既定 true のとき） | 巨大 JPEG を base64 化する際のメモリ不足 |
| `embedExifToJpeg` / `dataURLToBlob` | 内部で catch 済み → 元画像にフォールバックするので到達しない |
| `URL.createObjectURL` / `a.click()` | 実質例外を投げない |

`try` の外: `getContext` が null（iOS で上限超過時にありうる）→ 旧「出力用Canvasの生成に失敗しました。」。
`renderFinal()` 自体の例外は `try` の外＝未処理の Promise rejection になり何も表示されない（今回の経路ではない。既知の小さな穴として記録）。

→ 到達経路はすべて「出力画像が大きすぎる（面積・メモリ）」系。

## 3. 対応（`fix/export-error-message`）

- `fileManager.js` に `exportTooLargeMessage(currentState)` を追加し、上記2つの `alert`（try 内の catch と getContext 失敗）を共通文言に:
  「画像を書き出せませんでした。出力サイズ（W×H px、約◯万画素）が大きすぎて、この端末では処理できない可能性があります。キャンバスの比率や写真の大きさを見直すか、パソコンなど別の端末でお試しください。」
- `console.error` は維持。事前のサイズチェックや自動縮小はしない（元解像度維持のコンセプト、ユーザー判断で文言変更のみ）。
- 検証: `kakomi-devtools/export-error-msg-test.js` 5/5（`convertToBlob` reject・`getContext` null を擬似発生させ新文言＋サイズ表示、正常系はダウンロード発生・アラートなし）。
- `spec.md` 5.9節・6.4節を更新。

## 4. 現状のステータス / 未着手

- iOS 実機で上限超過が原因かは未確定（デスクトップ Chromium では再現しない）。実機で同条件を再度試し、新文言が出れば確定。
- 未着手候補: `renderFinal()` の例外も catch して通知する／書き出し前の面積見積もりでの事前警告。
