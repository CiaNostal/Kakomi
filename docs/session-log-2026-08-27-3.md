# 開発セッションログ: 検証環境メモの整理とロードマップ フェーズ0（2026-08-27）

`spec.md` が「現在のアプリの仕様」を、本ドキュメントが「なぜその設計に至ったか」を記録する。
このセッションは、前セッション（`session-log-2026-08-27-2.md`）でクローズした「オンキャンバス・トリミング再設計」の後、
`docs/roadmap.md` に整理した A〜F の要望のうち、**設計判断を伴わない小改修（フェーズ0）** をまとめて実施した回。
あわせて `CLAUDE.md` の Playwright 検証環境の記述を整理した。

## 1. きっかけ

- ユーザーから「`CLAUDE.md` の検証環境の記述が混乱する流れになっているので一部削除してほしい。あわせてロードマップの
  実装可能性・方向性・順番を再提示してほしい」との依頼。
- また「この端末には `C:\Users\yello\kakomi-devtools\` が既に存在していて、前回そこで Playwright を動かしていたはず」との指摘。
  実際、初回の環境確認で WSL 側のパス（`/home/yello/kakomi-devtools`、`~/.cache/ms-playwright`）しか見ておらず「環境なし」と
  誤報告していた。`/mnt/c/Users/yello/kakomi-devtools/`（`node_modules/playwright` 1.62.x、`crop-test.js` ほか）、
  Windows Node（`C:\Program Files\nodejs\node.exe`）、`C:\Users\yello\AppData\Local\ms-playwright\`（`chromium-1234`）が
  揃っていることを確認。Docker Desktop はあるが対象ディストロへの WSL インテグレーションが無効で `docker` は使えず、
  この端末では **常設フォルダ ＋ Windows Node ＋ `cmd.exe /c` ブリッジ** が唯一動く経路。

## 2. `CLAUDE.md` の検証環境セクション整理

### 何が混乱していたか

- 「想定環境は WSL ＋ Claude ＋ Docker」と書いてあるが、この端末の Docker は動かない。
- 「この検証環境は Node.js ベースである…『Node が入っているか』で方法が分かれる」という抽象的な分岐段落が、
  Node が既に入っているこの端末では空回りしていた。
- 「推奨: Docker」を先頭・コード例つきで大きく扱う構成のため、毎セッション「まず Docker を読む → 使えない →
  本命の常設フォルダ方式に落ちる」という遠回りの読み筋になっていた。
- 「その端末に Node が無い場合」の nvm/tarball/zip 分岐は一度も使っていない仮定の記述。
- クリーンアップ対象に Linux 側の `~/.cache/ms-playwright` が書かれていたが、実キャッシュは Windows の
  `%LOCALAPPDATA%\ms-playwright`。

### どう直したか

「開発環境について」を次の構成に再編し、上記の空回り段落・未使用分岐を削除した。

- 冒頭: 検証ツールは **リポジトリ非同梱・ローカル専用・ディストロを汚さない**、セッション開始時にまず有無を確認
  （`/mnt/c` 経由で。WSL ホームだけ見て「無い」と判断しない）。
- **「この端末の構成（確認済み）」** を新設し主役に: 常設フォルダのパスと中身、Windows Node、ms-playwright キャッシュ、
  `cmd.exe /c "cd /d C:\Users\yello\kakomi-devtools && node <script>.js"` の実行形、`python3 -m http.server 8420` ＋
  localhost フォワード、Docker はこの端末では使えないこと。
- **「他の端末で作業する場合」** を 1 段落に圧縮: リポジトリ外の常設フォルダに一度だけ `npm i playwright` ＋
  `npx playwright install chromium`。Docker が使えるなら公式イメージでも可（推奨の筆頭には置かない）。
  どちらも `apt install` でディストロを汚さない。
- **「クリーンアップ」**: プロジェクト完了時に 1 回。常設フォルダ ＋ `%LOCALAPPDATA%\ms-playwright`、
  または `docker rmi`。

## 3. ロードマップ再評価（実装可能性・方向性・順番）

フェーズ分けの結論（詳細は `docs/roadmap.md`）:

- **フェーズ0（設計不要の小改修）**: E / A-2 / D-2 / A-6 → 本セッションで実施。
- **フェーズ1**: 「プレビュー上のホイール・本体ドラッグの意味を、開いているタブで切り替える」共通ディスパッチ設計を先に決め、
  そのうえで B-2（背景タブでホイール→背景拡大倍率）と C-2（フレームタブで影オフセットのドラッグ）。
- **フェーズ2**: 「スライダー羅列／プルダウンごちゃつき」の UI 方向性を A-1 ＋ B-1 まとめてモックアップ（`artifact-design`）→ 実装。
  F（プリセットの置き場所）も同じ「どの UI をどこに置くか」の会話に乗せる。
- **フェーズ3**: C-1（超楕円スライダーの体感等間隔マッピング。曲線をユーザーと合意してから）、
  A-5（クロップ確定クリックをキャンバス外へ拡張。「難しければ相談」の確認込み）。
- **フェーズ4**: D 再設計（まず「なぜ洗練されていないか」の言語化 → スコープ決定 → D-1 / D-3）、
  A-4（枠内で写真を回転。テキストの回転ハンドル機構を流用）、A-3（crop 元画像の回転。最大規模なので最後）。

## 4. フェーズ0の実装

### 4.1 E — ダウンロードボタンを「出力」タブへ戻す

- `index.html`: `#downloadButton` を `.header-actions` から `#tab-output` の `JPG画質設定` fieldset 直下へ移動。
  旧ヒント文（「ダウンロードボタンは上部バーに常設されています。」）を書き出し内容の説明文に差し替え。
- `style.css`: `#downloadButton` を「タブ内の横幅いっぱいのアクセントボタン」に変更（`display:block; width:100%;`
  `margin-left` 除去、`margin-top` 追加、少し大きめのパディング・フォント）。上部バー用の補足コメントを削除。
- id・イベント配線（`main.js` の `handleDownload`、`fileManager.js` の `disabled` 解除）は不変。
- 2026-08-26-3 のセッションで「出力」タブ内 → 上部バーへ移設した経緯があり、今回はその逆戻し。理由は
  「上部バーに常設するほど頻繁に押すものではなく、『出力』タブの中にあるほうが自然」というユーザー判断。

### 4.2 A-2 — crop モードに三分割グリッド

- `canvasRenderer.js` `drawCropModeOverlay()`: 明るいクロップ窓の再描画（ステップ3）と枠線（ステップ4）の間に
  「ステップ3.5 三分割グリッド」を追加。`cropScreen` でクリップし、縦2本・横2本の等分線を
  黒（`rgba(0,0,0,0.30)` 幅2）→ 白（`rgba(255,255,255,0.65)` 幅1）の順に重ねて描く（枠線・L字ハンドルと同じ
  高コントラスト手法）。状態は持たず、`cropModeGeometry` が返す `cropScreen` から座標を出すだけ。
- 線の濃さは実写での見え方を見て調整する前提（手触りチューニング項目。テスト画像が格子模様のため自動検証では
  グリッドのピクセル判定はせず、crop モードへ入れること＋コンソールエラーなし＋スクリーンショットの目視に留めた）。

### 4.3 D-2 — テキストの固定表示位置アンカー選択を UI から撤去

- `uiController.js` `renderTextLayerSettingsPanel()`: `<select id="textLayerPosition">` の行・`positionOptionsHtml`・
  初期値設定（`el('textLayerPosition').value = settings.position`）・`change` イベント配線を削除。
  定数 `TEXT_POSITION_OPTIONS` も未使用になったため削除。
- `textSettings.*.position` はデータモデル・プリセットにそのまま残す。既定値は撮影日=`bottom-left`／
  Exif=`bottom-right`／自由テキスト=`middle-center`。`textRenderer.js` の `calculateTextPosition()` は
  これをオフセットの基準アンカーとして引き続き使う。位置はプレビュー上のドラッグ／数値欄／矢印キーで動かす。
- UI を消しただけなので localStorage プリセットの移行は不要。将来アンカーを可変に戻したくなればセレクトを復活させればよい。

### 4.4 A-6 — select モードのホイール余白変更を削除

- `canvasInteraction.js`: `previewCanvas` の `wheel` リスナーを丸ごと削除。定数 `MARGIN_WHEEL_STEP` も削除。
- `photoAdapter.js`: `commitMarginDelta()` を削除（`getState` は他メソッドで使うので import は残す）。
- 余白は select モードの四隅■ハンドルのドラッグ（`commitMarginResizeByDrag`）で直接いじれるため、ホイールは冗長で
  誤操作の元だった、というユーザー判断。フェーズ1の B-2（背景タブでホイール→背景拡大）を実装するとき、
  「開いているタブでホイールの用途を切り替える」設計として `wheel` リスナーを復活させる想定。

## 5. 検証

`C:\Users\yello\kakomi-devtools\` の常設 Playwright（1.62.x / chromium-1234）で確認。

- `smoke.js`: タイトル `Kakomi`、`#previewCanvas` 存在、コンソールエラーなし（ツールチェーンの疎通確認）。
- 新規 `phase0-test.js`（10 アサーション、全パス）:
  - **E**: `#downloadButton` が `#tab-output` の子孫であり `.header-actions` の子孫ではない。「出力」タブを開くと可視。
  - **D-2**: 撮影日チップ選択後のパネルに `#textLayerPosition` が 0 個、`#textLayerOffsetX/Y`・`#textLayerRotation` は各 1 個。
    `getState().textSettings.date.position` が文字列（`bottom-left`）として残っている。
  - **A-6**: 写真を select し、写真上でホイール（`-600` を2回）しても `baseMarginPercent` が 5 のまま変化しない。
  - **A-2**: 写真をもう一度クリックして crop モードに入れる（`getMode() === 'crop'`）。スクリーンショット
    `phase0-crop-thirds.png` を取得（オーバーレイ・L字ハンドル・三分割グリッドを目視）。
  - 全操作を通じてコンソールエラーなし。

## 6. ドキュメント更新

- `CLAUDE.md`: 「開発環境について」節を再編（2節）。
- `spec.md`: 3.1節（ヘッダーの説明）、3.1節末尾の「ダウンロードボタンの位置」、5.3節（テキスト設定パネルの共通フィールド／
  表示位置アンカー撤去）、5.16節（プレビュー上のホイール操作＝現在未使用）、5.16節の `photoAdapter` 表、
  4章のファイル構造コメント、7.2節（crop オーバーレイに三分割グリッド）、7.2節の select/crop 対比表、
  7.5節（テキストの位置）、7.6節（ダウンロードボタン）、新規 11.6節（ロードマップ対応状況）。
- `docs/roadmap.md`: 冒頭に「進捗」節、A-2 / A-6 / D-2 / E を ✅ 完了に更新し対応内容を追記。
- 本ログを新規追加。

## 7. フェーズ1: 「開いているタブでプレビュー上のドラッグの意味を切り替える」

フェーズ0のあと、同じセッションで続けて実施。

### 7.1 仕様の相談（AskUserQuestion）と当初案からの変更

当初は「ホイール＝背景拡大倍率（B-2）」＋「本体ドラッグ＝タブ依存（C-2 ほか）」の両方を1つのディスパッチ層に
乗せる案だった。3点確認した結果:

1. **本体ドラッグの切替範囲** → 「背景・フレームだけ上書き」。レイアウト/文字/出力/プリセットは従来どおり
   `photoViewParams`（枠内配置）。要望のある2タブだけ挙動を変える（驚きが少ない）。
2. **背景タブのドラッグ範囲** → 「キャンバス全面で背景を動かす」。写真の上でも余白でも、背景タブにいる間は
   ドラッグ＝背景の位置。従来は余白部分だけだった。
3. **モードの見せ方** → 「特に何も出さない」。カーソル変更もヒント文もなし。開いているタブ自体が手がかり。

さらにユーザーから追加の仕様変更: **ホイールでの背景拡大倍率変更（B-2）は取りやめ、ホイールは引き続き
何もしない**（誤操作の元になるとの判断）。→ `wheel` リスナーの再追加・`backgroundAdapter.commitScaleDelta()`
は実装しないことにした。結果、フェーズ1は「本体ドラッグの振り替え」だけの実装になった。

### 7.2 実装

- **`js/tabManager.js`**: `getActiveTab()` を追加（`.tab-button.active` の `data-tab` を返すだけ。状態は持たず
  DOM を読む）。`canvasInteraction.js` が pointerdown 時に参照する。
- **`js/interaction/adapters/shadowAdapter.js`（新規）**: `type: 'shadow'`。`getValue()` が
  `frameSettings.shadowParams.offsetX/offsetY` を返し、`computeChanges()` が写真短辺基準%へ変換して
  0.1%丸め＋[-25, 25] クランプ（`controlsConfig.frameShadowOffsetX`）、`commit()` が
  `updateState({ frameSettings: { shadowParams: changes } })`。`backgroundAdapter` と同型。
- **`js/interaction/canvasInteraction.js`**:
  - import に `shadowAdapter` / `getActiveTab` / `getState` を追加。
  - pointerdown の「通常のオブジェクト選択・移動」に入る手前で、`hit.type !== 'text'` かつアクティブタブが
    `tab-background` / `tab-frame` のときに分岐:
    - `tab-background` → `dragState` を `backgroundAdapter`（id `'background'`、`startBox` は
      `interactionRegistry.getById('background')`）で組み立て、`skipSnap: true`。
    - `tab-frame` かつ `getState().frameSettings.shadowEnabled` → `shadowAdapter`（id `'shadow'`）で組み立て、
      `skipSnap: true`。影オフなら `dragState` を作らず `return`（無反応）。
    - どちらの分岐でも `selectionStore.setSelectedId()` を呼ばない（選択を変えない）し、`onPhotoBody` も
      立てない（クリックで crop モードに入らない）。
  - pointermove のスナップ補正ブロックのガードを `if (!e.altKey)` → `if (!e.altKey && !dragState.skipSnap)` に。
    タブ限定ドラッグではガイドスナップを行わない（背景・影が写真の端に吸着すると不自然なため）。
- テキストレイヤーのドラッグは `interactionRegistry` の登録順（text が後勝ち）で、どのタブでも従来どおり最優先。
- crop モード中（`editMode === 'crop'`）はその分岐が pointerdown の先頭で `return` するため、タブ分岐より優先される
  （crop 中にタブを触っても crop 操作が生きる。稀なエッジケース、現状はこのままでよい）。

### 7.3 検証

`phase1-test.js` を新規作成（14 アサーション、全パス）:

- **レイアウトタブ**: 写真本体ドラッグで `photoViewParams` が動く（回帰）／背景オフセットは不変。
- **背景タブ**: 写真の上のドラッグで `imageBlurBackgroundParams.offsetX/YPercent` が動く／`photoViewParams` 不変／
  選択（`selectedId`）不変／ホイールを回しても `scale` 不変（B-2 廃止の確認）。
- **フレームタブ（影オフ）**: 本体ドラッグで `shadowParams` 不変・`photoViewParams` 不変（フォールバックしない）。
- **フレームタブ（影オン）**: 本体ドラッグで `shadowParams.offsetX/Y` が動く／右ドラッグで `offsetX` が増える／
  `photoViewParams` 不変／[-25, 25] に収まる。
- 全操作でコンソールエラーなし。

`crop-test.js` 24/24、`phase0-test.js` 10/10 も再実行して回帰なしを確認。

## 8. ドキュメント更新（フェーズ1分）

- `spec.md`: 4章ファイル構造（`shadowAdapter.js` 追加、`tabManager` 注記、`canvasInteraction` 説明）、
  5.16節（「タブ別ドラッグ」節を新設、ホイール未使用の理由に B-2 不採用を追記、桁あふれ丸めに `shadowAdapter` 追記）、
  5.17節アダプタ表（`shadowAdapter` 行追加、`backgroundAdapter` 行にタブ拡張を追記）、7.3節（背景ドラッグのタブ拡張）、
  7.4節（影オフセットのドラッグ）、11.6節（フェーズ1の完了項目と B-2 不採用）。
- `docs/roadmap.md`: 「進捗」節にフェーズ1、B-2 を ❌ 不採用に、C-2 を ✅ 完了に、背景タブのドラッグ拡張を追記、
  「進め方のメモ」の該当行を更新。
- 本ログに 7〜8 節を追記。

## 9. フェーズ1追補: 移動・配置の操作性と、タップ判定・背景ドラッグの修正

フェーズ1をユーザーがブラウザで確認（当初報告された「localhost で画像が読めない」はブラウザキャッシュが原因で、
ハードリロードで解消。コード側の問題ではなかった）。そのうえで3件の要望・不具合が出た。

### 9.1 要望・不具合

1. **移動・配置の操作性**（相談）: オフセット 0 に戻す／片軸だけ動かす、ができず不便。レイアウトタブの中央ガイドは
   良いので、背景・フレームでも赤ガイドを出す・ダブルクリックで戻す等を検討してほしい、と。
   → 相談の結果、**「Shift 軸ロック」＋「背景・影の原点スナップ＋赤ガイド」の2点を採用**。
   **ダブルクリックでのリセットは「他の操作が暴発しそう」としてユーザー判断で見送り**。
2. **モード切替の暴発**（仕様変更）: レイアウトタブの select モードで、動かさずに左クリックを長押しして離しても
   crop モードへ切り替わってしまう。**短いタップのときだけ切り替わる**ようにしたい。
3. **背景ドラッグの不具合**: レイアウトタブで背景（余白）部分をドラッグすると背景が動いてしまう。
   → フェーズ1で「背景」タブのときだけ振り替える実装にしたが、それ以外のタブでは従来の汎用ドラッグ経路が
   生きていて `backgroundAdapter` に到達していた。**「背景」タブ以外では余白ドラッグで背景を動かさない**よう修正。

### 9.2 実装

- **`canvasInteraction.js`**:
  - 定数 `CLICK_TAP_MS = 400`（タップとみなす最大押下時間）と `ORIGIN_SNAP_PX = 6` を追加。
  - `pointerDownCtx` に `downTime: performance.now()` を持たせ、`pointerup` のタップ判定を
    「移動量 < `CLICK_MOVE_THRESHOLD`(4px) **かつ** 押下時間 < `CLICK_TAP_MS`」に変更（select↔crop の両経路）。
  - `pointermove` の `move` モード:
    - Shift 押下中は `|dxPx| >= |dyPx|` で小さい方の軸を 0 に固定（軸ロック）。スナップ計算の前。
    - スナップ分岐を `Alt→スナップ無効` / `originSnap→原点スナップ` / それ以外→従来のボックススナップ、の3分岐に再構成。
      原点スナップは `dragState.adapter.originSnapPx(startValue, ctx)` が返す「各軸を 0 に戻す px 量」に対して
      現在のドラッグ量が `ORIGIN_SNAP_PX` 以内なら、その px 量へ吸着し `{axis, value: canvas中央}` のガイドを出す。
  - タブ分岐（背景／フレーム）の `dragState` フラグを `skipSnap` → `originSnap` に改名。
  - タブ分岐の後、`hit.type === 'background'`（＝背景タブでもフレームタブでもない状態で余白をヒット）なら
    `selectionStore.setSelectedId(null)` して `return`。背景は動かさず、キャンバス全体の選択枠も出なくなる。
- **`backgroundAdapter.js` / `shadowAdapter.js`**: `originSnapPx(startValue, ctx)` を追加
  （`xPx = -(offset% / 100) * photoShortSidePx`、Y も同様）。
- 背景のドラッグ位置調整・矢印キー nudge は事実上「背景」タブ限定になった（他タブでは背景が選択されなくなるため
  nudge 対象にもならない）。ユーザーの意図（背景操作は背景タブで）と一致。

### 9.3 検証

新規 `phase1b-test.js`（10 アサーション、全パス）:

- レイアウトタブで余白ドラッグ → `imageBlurBackgroundParams.offset*` 不変・`selectedId` が `'background'` にならない。
- 長押し（動かさず 550ms）で離す → `mode` が `'select'` のまま（crop に入らない）。
- 短いタップ → `mode` が `'crop'` に切り替わる（従来どおり）。
- レイアウトタブで Shift ドラッグ（横大・縦わずか）→ `photoViewParams.offsetX` だけ動き `offsetY` は不変。
- 背景タブ／フレームタブ（影オン）で、オフセット 3% から 0 の 1px 手前まで戻すドラッグ → オフセットが厳密に 0 に吸着。
- コンソールエラーなし。

`crop-test.js` 24/24・`phase0-test.js` 10/10・`phase1-test.js` 14/14 も再実行して回帰なし。

### 9.4 ドキュメント更新（追補分）

- `spec.md`: 5.16節（軸ロック・タップ判定の厳格化・「タブ別ドラッグ」節に原点スナップと「背景タブ以外は余白ドラッグ無効」を追記）、
  5.17節アダプタ表（`originSnapPx`）、7.3節（背景ドラッグは背景タブ限定・原点スナップ）、7.4節（影ドラッグに軸ロック・原点スナップ）、
  11.6節（フェーズ1追補）。
- `docs/roadmap.md`: 「進捗」節にフェーズ1追補。
- 本ログに 9 節を追記。

### 9.5 追加の2点（写真選択マーカーの残留、矢印キー対応）

フェーズ1追補をユーザーが確認したうえで、さらに2点。

1. **写真の選択マーカーが残って操作不能に見える**: レイアウトタブで写真を選択（四隅に■マーカー）した状態で
   「背景」「フレーム」タブへ移ると、マーカーが出たままなのに写真をクリックしても選択・トリミングできない
   （フェーズ1でこれらのタブでは本体ドラッグが背景／影に振り替わるため）。「選択できそう」に見えて操作不能なのが
   ユーザーフレンドリーでない。
   → **`tabManager` に `onTabChange(callback)` を追加**し、`main.js` で「`tab-background` / `tab-frame` へ移り、かつ
   写真が選択されていたら `selectionStore.setSelectedId(null)`」を配線。`onSelectionChange` 経由で crop モード解除・
   再描画も走り、マーカーが消える。「文字」「出力」「プリセット」タブでは写真の本体ドラッグが従来どおり効くので
   選択は維持。テキストの選択はどのタブでも維持。
2. **背景・フレームで矢印キー微調整に未対応**: レイアウトタブの選択モードでは矢印キーで nudge できるが、
   背景・影ではできない。
   → **`canvasInteraction.js` の keydown ハンドラを再構成**。矢印キーの解釈（step 1px / Shift 10px）を
   `selectedId` チェックより前に出し、`getActiveTab()` が `tab-background`（または `tab-frame` かつ `shadowEnabled`）
   なら `backgroundAdapter` / `shadowAdapter` の `computeChanges`/`commit` を直接呼んで `return`。それ以外は
   従来どおり選択オブジェクトの nudge。フレームタブで影オフのときは振り替えず、選択オブジェクトの nudge にフォールバック。

検証は `phase1b-test.js` を 17 アサーションに拡張（写真選択がタブ移動で解除される／文字タブでは維持される、
背景・フレーム（影オン）で矢印キーがオフセットを動かす、影オフでは動かさない）。`crop-test` 24 / `phase0` 10 /
`phase1` 14 も回帰なし。

`spec.md` は 5.16節（「タブ切り替え時の写真選択の解除」「矢印キーによる背景／影の微調整」の段落追加）・矢印キー nudge の記述・
4章ファイル構造（`onTabChange`）・11.6節を更新。

### 9.6 ドキュメント運用の整理（ユーザー指示）

ユーザーから「`CLAUDE.md` はセッション開始時に必ずコンテキストに載る唯一のドキュメント。`docs/roadmap.md` は
自動ロードではないが『新セッションの出発点』。どちらも**これから着手する項目**を書く場所で、終了した課題の
詳細はセッションログで足りるので残さなくてよい」という運用方針が示された。対応:

- **`docs/roadmap.md`**: 冒頭に「これから着手する項目だけを載せる前向きな一覧」と明記。完了項目の本文詳細ブロック
  （A-2 / A-6 / D-2 / E / B-2 / C-2 / フェーズ1・1追補）を削除し、代わりに **「完了済み」表**（項目 ID・一言・
  参照ログの1行）に集約。**項目 ID（A-1, B-2 …）は残す**（`spec.md`・セッションログの相互参照が切れないため）。
  未着手項目（A-1 / A-3 / A-4 / A-5 / B-1 / C-1 / D-1 / D-3 / F）は本文に残す。旧「進捗」節は「完了済み」表＋
  「次にやる想定の順」に置き換え。「各実装後は完了項目を表へ1行で移す」運用も明記。
- **`CLAUDE.md`**: 「現在のブランチとステータス」節をフェーズ逐次のチェンジログから **4行**（作業ブランチ／直近の状態
  ひとこと／次セッションはフェーズ2／履歴はセッションログ日付順）へ圧縮。詳細は全部セッションログ側。
- セッションログ（本ファイル）は恒久記録なので圧縮しない。

（この §9.6 より前の「`docs/roadmap.md`: 冒頭に『進捗』節…」等の記述は、その時点での作業を記録したもの。
現在の `roadmap.md` に「進捗」節は無く、「完了済み」表に置き換わっている。）

## 10. 現状のステータス

- フェーズ0＋フェーズ1＋フェーズ1追補（軸ロック／原点スナップ＋赤ガイド／タップ判定の厳格化／背景ドラッグをタブ限定化／
  タブ移動で写真選択を解除／背景・影の矢印キー微調整）を実装・Playwright 自動検証済み。ユーザーのブラウザでの目視・操作感確認は次回。
- 手触りチューニング項目: 三分割グリッドの線の濃さ、`CLICK_TAP_MS`（400ms）、`ORIGIN_SNAP_PX`（6px）、背景・影の矢印キー nudge 量（1px≒0.2%）。
- **次はフェーズ2**: A-1（出力フォーマット UI のグラフィカル化・位置スライダー撤去）＋ B-1（背景タブのスライダー整理）を
  `artifact-design` でモックアップしてから実装。F（プリセットの置き場所）も同じ流れに乗せられる。以降 C-1 / A-5、D 再設計、A-4 / A-3。
