# Kakomi — セッション引き継ぎメモ

Kakomiは、写真にフレーム加工とテキストオーバーレイを追加する、ビルドツール不要のブラウザ完結型画像編集アプリ（Vanilla JS + Canvas API）。元写真の解像度は一切変更せず、周囲に余白・背景・フレーム・テキストを加えて高解像度JPEGを書き出すのがコンセプト。

## まず読むもの

1. **`spec.md`** — 現在の実装仕様。コードを実際に読んで検証しながら書かれており、常に実装と同期させる運用（新しいセッションで仕様を確認したいときはまずここ）。
2. **`docs/session-log-*.md`** — 開発セッションごとの経緯・検討過程・設計判断の記録（`spec.md`が「今どうなっているか」なら、こちらは「なぜそうなったか」）。ファイル名の日付順が古い→新しい。**直近の状況を素早く把握したいときは、日付が最新のログの末尾（「現状のステータス」「未着手の項目」節）を読むのが一番早い。** 新規ログのファイル名は **git のコミット日時基準の実日付**で付ける（`Today's date` を信頼。前のログのファイル名から日付を推測して足さない。同日2本目以降は `-2` `-3` サフィックス）。過去に日付が 1〜2 日先行してしまい、2026-08-28 に全ログを実日付へリネームした経緯あり（`docs/session-log-2026-08-28.md` §6）。
3. **`docs/roadmap.md`** — 次にやりたい機能・UI改善の一覧（レイアウト/背景/フレーム/文字/出力/プリセットの各タブ）。**新セッションの出発点はここ**。各項目はまず方向性の相談・モックアップから。

## 現在のブランチとステータス（2026-08-28時点）

- 作業ブランチ: `feature/interactive-editing`（開発版の最新はここ。`main`ではない）。
- **直近の状態**: `docs/roadmap.md` のフェーズ0（小改修: E / A-2 / A-6 / D-2）・フェーズ1（タブ別ドラッグの共通基盤 `tabManager.getActiveTab()`＋`onTabChange`、C-2 等。`docs/session-log-2026-08-27-3.md`）に続き、**フェーズ2** ＝ A-1（出力アスペクト比・切り抜き比率を比率タイルピッカー `js/ui/ratioPicker.js` に、切り抜き位置／枠内位置スライダー計4本を撤去し「配置をリセット」ボタンのみに）＋ B-1（軽微版: 背景の明るさ・彩度を折りたたみへ、X/Yオフセットスライダーを撤去し「位置をリセット」ボタンに）まで実装・Playwright スモーク検証済み。ユーザーのブラウザ目視確認は次回。詳細は `docs/session-log-2026-08-27-4.md`。
- **2026-08-27 その3セッションで実装計画を練り直し、フェーズ3＋フェーズ4 を実装した**（`docs/session-log-2026-08-27-5.md`、`docs/roadmap.md`「実装計画（その3 練り直し版）」）。追加フィードバックで新規項目 A-7 / A-8 / B-3 / B-4 / D-4 / E-1〜E-5 を追加。
- **フェーズ3 完了・Playwright スモーク 13/13**（ユーザーのブラウザ目視は次回）: **B-3** ぼかし背景をクロップ後の写真から生成（`backgroundRenderer.js`、バグ修正）／**D-4** テキストの不透明度ラベルを「透過度」→「不透明度」（バグ修正）／**A-7** 比率ピッカーの選択肢順を `ratioPicker.js` の `RATIO_FAMILIES` に一本化＋カスタム欄を1行に／**B-4** 背景の明るさ・彩度を常時表示に戻し「見え方／色調／位置」の区切り線付き小見出しで分離（B-1 のアコーディオン撤回）。
- **フェーズ4＝Lightroom Web 風のシェル刷新も実装済み・Playwright スモーク phase4 20/20 ＋ 回帰 OK**（`docs/session-log-2026-08-27-5.md` §11）: E-1 タブ再クリックでパネルを畳む（`.app-shell.panel-collapsed`、初期＝レイアウト開、`ResizeObserver` でキャンバス再フィット）／E-2 `fieldset`・`.frame-card` を枠なし＋見出し＋上罫線の線ベースに（レールの色は現状のまま）／E-4 説明文をアイコン＋数語に削減／E-5 「出力」タブ廃止・DLボタンを上部バー右＋画質ポップオーバー（`#downloadPopover`）／A-8 レイアウトを ①出力アスペクト比→②トリミング→③余白と配置 に並べ替え・余白を①から③へ分離／F プリセットはレール下部の一項目のまま。`editState`・各レンダラ・`presetStore` は無変更。
- **【既知の不具合 G-1】✅ 解消（`docs/session-log-2026-08-27-6.md`）**: 出力比率が縦長／正方形（4:5・L判・1:1 等）のときプレビューキャンバスがじわじわ拡大し続けた正のフィードバック。**根本原因＝`#previewCanvas` の `border: 1px` が要素のレイアウトボックスに乗り、高さ基準で決まるキャンバスがコンテナ高さを 2px 押し上げて `ResizeObserver` と共振していたこと**。§13.5 の候補のうち「border をレイアウトボックスから外す（最小）」を採用し、枠線を `outline`（`outline-offset: -1px`）へ置換（`style.css` のみ）。`.app-container` の高さや `.canvas-container` のサイズには手を付けず、`@media` 1024 / 768 の縦積みを目視確認済み。フェーズ4 の「幅のみ反応 `ResizeObserver`」（`js/main.js`）は多重防御として維持。検証は `kakomi-devtools/g1-test.js`（13/13）＋ `creep-repro.js` 安定。
- **フェーズ5＝E-3（情報タブ）✅ 完了（`docs/session-log-2026-08-27-6.md`、Playwright スモーク phase5 25/25 ＋ 回帰）**: 「情報」を他タブと並列のタブ（`data-tab="tab-info"` ＋ `#tab-info` ペイン、レール下部＝プリセットの隣）に。同じフライアウトパネル枠で切り替わり、再クリックで収納（E-1 が自動で効く）。`#exifToggleButton` / `#exifFloatCard` / `.exif-float-card` は廃止。`displayExifInfo()`（`exifHandler.js`）を作り替え、カメラ／レンズ名を小さく上部に＋撮影設定はアイコン＋値だけの `.exif-dl`（項目名は `<dt>` の title＝ホバーでツールチップ）。スプライトに `#i-aperture` `#i-shutter` `#i-iso` `#i-focal` `#i-cal` を追加。撮影日時の整形バグ（時刻のコロンも `/` になる）も修正。**ユーザーのブラウザ目視確認済み（G-1・E-3 とも問題なし）**。
- **フェーズ6＝追加の小〜中改修 ✅ 完了（`docs/session-log-2026-08-27-7.md`、Playwright スモーク phase6 33/33 ＋ 回帰）**: **E-6** Favicon（`.brand-mark` と同意匠の `favicon.svg`＋`<link rel="icon">`）／**B-5** 背景タイプを `.corner-segmented` アイコンセグメント（`#i-fill` / `#i-blur`。id/name/value 据え置きで JS 無変更）に／**D-5** 文字タブがアクティブで自由テキスト選択中に Delete/Backspace で削除（`canvasInteraction.js` keydown。固定レイヤーは対象外）／**G-2** 別画像への差し替え時は `cropSettings.rect`→全体・`photoViewParams`→中央（比率制約は維持して再フィット。他は引き継ぐ。初回ロードは対象外）／**E-7** ファイル選択の小枠を廃し `.canvas-area` 全体をドロップ受付に。未読込時は中央にドロップダイアログ（`#imageDropDialog`）、読み込み後はキャンバス（`updateImagePresenceUI()` が `.has-image`/`.no-image` を切替）。上部バーに「画像を開く」ボタン（`#openImageButton`）。`main.js` 先頭に `?debug` 限定のテスト用フック `window.__kakomiGetState`／**F-2** プリセット保存時にタブ単位5セクション（`presetStore.js` の `PRESET_SECTIONS`）のチェックで保存項目を選択。`savePreset(name, sections)` がサブセット保存、`applyPreset` は `updateState` の deep-merge で含まれるキーだけ上書き。**ユーザーのブラウザ目視は次回**。
- **【既知の不具合 G-3】✅ 解消（`docs/session-log-2026-08-28.md`、ユーザー承認済み・目視は次回）**: レイアウトタブを閉じて開くと、展開トランジション中に一瞬 画面全体（キャンバス含む）が下にガクッとずれて戻る。原因＝パネル（`.tab-content-area`）を width:0→360 でトランジションする途中、極小幅で中身が縦 ~1800px にレイアウトされ、`.app-container { min-height:100vh }`（＝下に伸びられる）なので一時的にページ全体が膨張する（G-1 と同じ素地）。修正＝`@media (min-width: 1025px) { .app-container { height:100dvh; min-height:0; overflow:hidden } }`（デスクトップ3カラム時だけシェルをビューポート高に固定してクリップ。内側の各領域は元々 overflow を持つ。1024px 以下の縦積みには適用しない＝過去の「CSS 高さ固定でレイアウト崩れ」を回避）。G-1 の残り 2px も解消。`js` 無変更。検証 `kakomi-devtools/panel-jump-repro.js`＋`@media` 各幅＋回帰全通し。
- **フェーズ7 は改訂版で進行中（`docs/session-log-2026-08-28-2.md`／`-2026-08-28-3.md`）**: 追加フィードバック11件＋αをバケット分け。**バケット1＝G-4（カスタム比率でフォーカスが飛ぶ不具合）/ G-5（比率固定トリミング枠が写真の端を越えて拡大できる不具合）/ A-10（「余白」→「大きさ」表記＋スライダー反転。内部 `baseMarginPercent` 不変。目視確認で初期値 90% / 下限 15% / 上限 100% に微調整、`marginToSize` の分母を 45 に）/ A-11（トリミング「オリジナル」＝元画像のアスペクト比で固定。Lightroom と同義）/ A-13（「トリミング」パネルのクリックで crop モードへ、Enter でも crop を抜ける）／G-6（A-13 由来: crop モード中のパネル再クリックで画像が無限拡大／比率タイル連打でクロップ枠が 1px へ収束。`requestEnterCropMode` を crop 中 no-op、`applyCropAspect` を内接 → 外接 `growRectToAspect` に）まで実装・Playwright 検証済み（phase7b1 61/61、周辺回帰 16/16）＋ ユーザーのブラウザ目視も確認済み（A-10 は「大きさ」スライダーの dblclick でつまみ位置が戻らない不具合も修正）。** **バケット2＝E-8（用語統一: `文字`→`テキスト`、`出力アスペクト比`／`出力フォーマット`→`キャンバス`、`トリミング`→`写真のトリミング`。レール・レイアウトタブ `<legend>`・プリセット保存フォーム・`presetStore.PRESET_SECTIONS.label` を横断で。内部 id / `data-section` / 状態キーは不変）＋ A-12（レイアウトタブは1タブのまま、3セクションの `<legend>` を「二重四角アイコン＋対象名だけ」に。番号・サブ文なし。③＝「大きさと配置」。新スプライト `#i-canvas` / `#i-photo-crop` / `#i-size-place`、`fieldset legend` を flex＋`.legend-icon` 17px）も実装・Playwright 検証済み（phase7b2 27/27）。バケット3＝F-3（プリセット保存フォームを `renderPresetSectionChecks()` の縦ツリーに）＋ F-4（空名＝「プリセット N」＝空き番号の最小、明示名の衝突は連番、上書きなし。`resolvePresetName`）＋ F-5（`PRESET_SECTIONS` にドット付きパスの `groups`。背景＝タイプ／色／ぼかし・フレーム＝角丸／線／影・テキスト＝撮影日／Exif／自由テキスト。親チェック3状態。`savePreset(name, sections, groups)` が部分オブジェクトを組み立て、`applyPreset` は deep-merge のまま。旧プリセット移行不要）も実装・検証済み（phase7b3 24/24）。バケット3.5＝A-14（比率タイルピッカーを Lightroom Web 風に＝向き中立の `RATIO_FAMILIES`・`×` 表記・数字が小さい順・見出し右端の 90°回転ボタン `#outputRotateButton`/`#cropRotateButton`＝momentary・点灯なし・全タイル反転＋選択比率を `H:W`↔`W:H`・`1.91:1` 削除／`16:10`・`3:2` 追加・カスタムの ⇄ 廃止。`editState`/`layoutCalculator` 無変更）＋ E-9（比率タイルのサブラベル全廃）＋ A-15（「配置をリセット」→「大きさと配置をリセット」に改名＋大きさ `baseMarginPercent`→5 もリセット）＋ A-16（「大きさと配置」の説明文削除）も実装・検証済み（phase7b35 26/26、phase7b1 64/64・phase7b1-regress 18/18・phase7b2 27/27・phase7b3 24/24）。バケット3.5 実装後に「比率タイルのクリックで crop モードに入らなくなった」A-13 回帰を修正（`#cropSection` の click ガードを `button` 全部 → `.ratio-rotate-btn` だけに絞る。`cca029b`）。** **バケット1〜3.5 は実装・Playwright 検証・ユーザーのブラウザ目視まで全て完了し、`origin/feature/interactive-editing` に push 済み（HEAD `70d9a3d`。バケット別コミット: `3db3ab9`/`be7ecb2`/`937fdab`/`93e34b5`/`cca029b` ＋ ドキュメント `70d9a3d`）。2026-08-28 セッションはここでクローズ。** 残り＝**バケット4（D-1・D-3 テキスト追加ワークフロー再設計。独立フェーズ・スコープB＝データモデルを単一 `textLayers[]`＋`kind` に統合・要モックアップ・localStorage プリセット移行関数が要る）** → バケット5（B-6 背景に別画像、登録のみ）→ 積み残し（A-5 / A-4 / A-3 / C-1）。詳細は `docs/roadmap.md`「フェーズ7 — 改訂版」＋ `docs/session-log-2026-08-28-3.md` §9。
- **Playwright 環境注意**: この端末の `kakomi-devtools/` にはフェーズ2〜6 のスモークスクリプトが無い（別端末で作成・push されたローカル専用ファイルのため）。フルスモークが要るときは各セッションログの記述から作り直す。
- **履歴**: `docs/session-log-*.md` を日付順に。トリミング再設計＝`-2026-08-27-2.md`（残タスクは 8 節）、UI 大幅刷新＝`-2026-08-26-3.md`、UI 刷新の積み残し＝`spec.md` 11.5 節。2026-08-28 に全セッションログを実日付へリネーム（`-2026-08-28.md` §6）。

## 開発環境について

- ビルド不要。`index.html`をES Modulesとして読み込むため`file://`では動かない。ローカルHTTPサーバー（例: `python3 -m http.server 8420`）を立てて開く。
- ブラウザでの動作確認は Playwright + Chromium で行う。この実行環境は **リポジトリには含めない（GitHub で共有しない）ローカル専用ツール**で、ディストロ／OS を汚さない形で作る。**新しいセッションを始めたら、まずこの環境の有無を確認すること**（下記「この端末の構成」のパスを `/mnt/c` 経由で確認する。WSL 側のホームだけ見て「無い」と判断しない）。

### この端末の構成（確認済み）

- **常設フォルダ**: `C:\Users\yello\kakomi-devtools\`（WSL からは `/mnt/c/Users/yello/kakomi-devtools/`）。`node_modules/`（`playwright` 1.62.x）、テストスクリプト（`phase2-test.js` ほか。各セッションでその回の変更を叩くスモークを足していく運用）、スクリーンショットが入っている。セッションをまたいで残す（毎回インストール・削除はしない）。**端末が変わって無ければ「他の端末で作業する場合」の手順で同じパスに作り直す**（2026-08-27 その2 セッションで実際に作り直した実績あり）。
- **Node**: Windows システムインストール（`C:\Program Files\nodejs\node.exe`）。
- **ブラウザキャッシュ**: `C:\Users\yello\AppData\Local\ms-playwright\`（`playwright` の版に対応した Chromium ビルド）。
- **実行方法**: WSL から `cmd.exe /c "cd /d C:\Users\yello\kakomi-devtools && node <script>.js"`。ローカルサーバーは `python3 -m http.server 8420` をリポジトリルートで起動し、Windows 側からは `http://localhost:8420/`（localhost フォワード）で到達する。
- **Docker**: Docker Desktop はインストール済みだが、この WSL ディストロへの WSL インテグレーションが無効なため `docker` は使えない。したがって上記の常設フォルダ方式がこの端末で唯一動く経路。

### 他の端末で作業する場合

- 同じ方針（リポジトリ外・自己完結・ディストロを汚さない）で作り直す。作業ツリー外の専用フォルダに `npm i playwright` ＋ `npx playwright install chromium` を**一度だけ**入れて常設する（セッションごとのインストール・削除はしない）。
- Docker が使えるなら公式イメージ `mcr.microsoft.com/playwright:<version>`（Node ＋ 全ブラウザ ＋ 依存ライブラリ同梱）でリポジトリを bind mount して回す手もある。イメージの版は `playwright` の版に合わせる。
- どちらの場合も、この用途で `apt install`（ブラウザ用システムライブラリ・Node 等）をディストロに対して行わない。
- Linux 版 Chromium／Playwright がそのまま使えるセッションならそれを使ってよい。いずれも無く構築もできない場合のみ、静的検証（構文チェック・DOM id 突合など）だけで実装し、目視確認はユーザーに依頼する。

### クリーンアップ

Kakomi の開発が全て完了した時点で 1 回だけ行う。常設フォルダ方式なら **そのフォルダ**と **`%LOCALAPPDATA%\ms-playwright`** を削除する。Docker 方式なら `docker rmi <image>`。

- 変更後は必ず `spec.md` と該当する `docs/session-log-*.md`（新規セッションなら新しいログファイルを追加）を更新し、実装との整合を保つこと。
