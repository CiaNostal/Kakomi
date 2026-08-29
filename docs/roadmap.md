# Kakomi ロードマップ（次にやりたいこと）

**このドキュメントは「これから着手する項目」だけを載せる前向きな一覧。** 完了項目は下の「完了済み」に
1 行で残し（ID は据え置き＝`spec.md`／セッションログの相互参照が切れないように）、詳細は各セッションログに置く。

- 起点は 2026-08-27 のユーザー要望（複数セッションに分かれる）: 初回の一覧（旧 A〜F）／フェーズ3・4 の追加分
  （比率ピッカーの並び／文章量／カスタム欄／決定順序／背景の区切りとぼかしバグ／不透明度ラベル／
  出力タブ廃止／Lightroom Web 風のシェル刷新）／フェーズ6 の追加分（Favicon／背景タイプのアイコン化／
  文字の Delete 削除／ドロップ領域の統合／プリセット保存項目の選択／別画像ロード時のトリミング崩れ）。
  新規項目は既存の A〜G に連番で足す。
- 各項目はまず方向性の相談・必要ならモックアップを経てから実装する。優先順位はユーザーと相談して決める。
- 現時点の実装詳細は `spec.md`、経緯は `docs/session-log-*.md`。

## 完了済み

| 項目 | 内容 | ログ |
|---|---|---|
| E（旧） | ダウンロードボタンを上部バー →「出力」タブ内へ戻した（※ その3セッションで再度「上部バーへ」に方針転換。E-5 参照） | `session-log-2026-08-27-3.md` §4.1 |
| A-2 | crop モードのオーバーレイに三分割グリッド（rule of thirds） | 同 §4.2 |
| A-6 | select モードのホイールによる余白変更を削除（`wheel` リスナーごと撤去） | 同 §4.4 |
| D-2 | テキストの固定表示位置アンカー選択（`#textLayerPosition`）を UI から撤去（`position` データモデルは維持） | 同 §4.3 |
| — | **フェーズ1 共通基盤**: `tabManager.getActiveTab()` ＋ `canvasInteraction.js` の pointerdown で「開いているタブ」により本体ドラッグの振り先を分岐 | 同 §7 |
| C-2 | 「フレーム」タブ表示中かつ影が有効なとき、写真本体ドラッグ →影オフセット（新 `shadowAdapter.js`） | 同 §7.2 |
| — | 「背景」タブ表示中はキャンバス全面のドラッグ →背景の位置。反面、それ以外のタブでは余白ドラッグで背景を動かさない（不具合修正） | 同 §7.2・§9.2 |
| B-2 | ❌ **不採用**（背景タブでホイール→背景拡大）。誤操作の元になるとしてユーザー判断で見送り | 同 §7.1 |
| — | **フェーズ1追補**: Shift ドラッグで軸ロック／背景・影のドラッグで 0 付近スナップ＋赤い中央ガイド／モード切替を短いタップ限定に | 同 §9.2 |
| — | 「背景」「フレーム」タブへ移ったら写真の選択を解除／同タブで矢印キーを背景・影のオフセット微調整に | 同 §9.5 |
| A-1 | 出力アスペクト比・切り抜き比率を比率タイルピッカー（`js/ui/ratioPicker.js`）に。切り抜き位置／枠内位置のスライダー計4本を撤去し「配置をリセット」ボタンのみに（データは保持） | `session-log-2026-08-27-4.md` |
| B-1 | 拡大ぼかし背景の明るさ・彩度を閉じたアコーディオンへ、X/Yオフセットのスライダーを撤去し「位置をリセット」ボタンに（軽微版。※色調アコーディオンは B-4 で撤回） | 同 |
| B-3 | 拡大ぼかし背景を「クロップ後の写真」から生成（`backgroundRenderer.js` が `photoDrawConfig.source*` を使う）。バグ修正 | `session-log-2026-08-27-5.md` |
| D-4 | テキストの不透明度スライダーのラベルを「透過度」→「不透明度」に（意味が逆だった）。バグ修正 | 同 |
| A-7 | 出力／切り抜きの比率タイルの選択肢順を共通化（`ratioPicker.js` の `RATIO_FAMILIES`）。カスタム幅高さ欄を折り返さない1行に | 同 |
| B-4 | 背景の明るさ・彩度をアコーディオンから常時表示に戻し、「見え方／色調／位置」の区切り線付き小見出しで分離 | 同 |
| E-1 | `tabManager.js` にアクティブタブ再クリックでパネルを畳む処理（`.app-shell.panel-collapsed`）。初期＝レイアウト開。開閉で `ResizeObserver` がキャンバス再フィット | `session-log-2026-08-27-5.md` §11 |
| E-2 | `fieldset` / `.frame-card` を枠なし＋見出し＋上罫線の線ベースに | 同 |
| E-4 | 説明文（`.custom-text-drag-hint`）の長文をアイコン＋数語に削減 | 同 |
| E-5 | 「出力」タブとレール項目を廃止。ダウンロードを上部バー右＋画質ポップオーバー（`#downloadPopover`）に | 同 |
| A-8 | レイアウトタブを ① 出力アスペクト比 → ② トリミング → ③ 余白と配置 の順に。余白を①から③へ分離 | 同 |
| F | プリセットはレール下部の一項目のまま（「情報」の隣）。レイアウトの中に畳み込むのは見送り | 同 |
| G-1 | 縦長／正方形の出力比率でプレビューキャンバスがじわじわ拡大し続ける不具合。根本原因＝`#previewCanvas` の `border: 1px` が要素のレイアウトボックスに乗っていたこと。枠線を `outline`（`outline-offset: -1px`）へ置換して解消。フェーズ4 の「幅のみ反応 `ResizeObserver`」は多重防御として維持 | `session-log-2026-08-27-6.md` |
| E-3 | 「情報」を他タブと並列のタブ（`data-tab="tab-info"` ＋ `#tab-info` ペイン、レール下部）に。同じフライアウトパネル枠で切り替わり、再クリックで収納。`#exifToggleButton` / `#exifFloatCard` 廃止。`displayExifInfo()` を作り替えてアイコン＋値だけの `.exif-dl` 表示に（項目名は `<dt>` の title）。撮影日時整形バグも修正 | `session-log-2026-08-27-6.md` |
| E-6 | Favicon。`.brand-mark` と同意匠の `favicon.svg`（`prefers-color-scheme` 対応）＋ `<link rel="icon" type="image/svg+xml">` | `session-log-2026-08-27-7.md` |
| B-5 | 背景タイプ（単色／ぼかし）をラジオからアイコンセグメント（`.corner-segmented`、`#i-fill` / `#i-blur`）に。id/name/value 据え置きで JS 配線は無変更 | 同 |
| D-5 | 「文字」タブがアクティブで自由テキスト選択中、Delete/Backspace で削除（`canvasInteraction.js` keydown）。固定レイヤーは対象外 | 同 |
| G-2 | 別画像への差し替え時は `cropSettings.rect`→全体・`photoViewParams`→中央にリセット（比率制約は維持して再フィット）。他パラメータは引き継ぐ。初回ロードでは初期化しない（`setImage`） | 同 |
| E-7 | ファイル選択の小枠を廃し `.canvas-area` 全体をドロップ受付に。未読込時は中央にドロップダイアログ、読み込み後はキャンバス。上部バーに「画像を開く」ボタン（`#openImageButton`） | 同 |
| F-2 | プリセット保存時にタブ単位5セクション（`PRESET_SECTIONS`）のチェックで保存項目を選択。`savePreset(name, sections)` がサブセット保存、`applyPreset` は含まれるキーだけ上書き | 同 |
| G-3 | レイアウトタブ開閉のトランジション中に画面全体が一瞬下にずれて戻る不具合。原因＝極小幅のパネル内容が縦に伸び `.app-container`（`min-height:100vh`）が膨張。対処＝`@media (min-width:1025px)` で `.app-container { height:100dvh; overflow:hidden }`（縦積みの1024px以下には適用しない）。G-1 の残り2pxも解消 | `session-log-2026-08-28.md` |
| A-10 | 「余白」→「大きさ」ラベル＋右＝大きい向きに反転。内部 `baseMarginPercent` 不変。UI の range だけ `marginToSize(m)=100/(1+m/45)`（余白5〈既定〉→ちょうど90%）で見せる。スライダー min15 / max100（下限15%は `marginToSize(300)≈13%` より上なので不感帯なし。内部ロジック不変） | `session-log-2026-08-28-2.md`／微調整 `-2026-08-28-3.md` |
| A-11 | トリミング比率タイルに「オリジナル」＝元画像のアスペクト比で固定（Lightroom と同義）。`ratioPicker` に `original` タイル、`cropRect.resolveCropAspectValue()` を3経路で使用。切り抜きまるごとリセットではない | `session-log-2026-08-28-2.md` |
| A-13 | レイアウトタブ「トリミング」`<fieldset id="cropSection">` のクリック（数値入力欄以外）で crop モードへ自動遷移（`requestEnterCropMode()`）。crop 離脱を Esc に加え Enter でも | `session-log-2026-08-28-2.md` |
| G-4 | カスタム比率が既存タイルと一致するとカスタム欄が閉じフォーカスが飛ぶ不具合。「カスタムモード」を明示フラグ（`outputCustomMode`／`cropCustomMode`）で粘着、`ratioPicker.setValue(v,{keepCustom})`。`.focus()` は呼ばない | `session-log-2026-08-28-2.md` |
| G-5 | 比率固定のトリミング枠が写真の端を越えて拡大できる不具合。`resizeCropRect` の比率ロック分岐で、掴んだ隅の対角を固定したまま [0,1] に収まる最大幅で頭打ち（末尾 `clampRect` は backstop） | `session-log-2026-08-28-2.md` |
| G-6 | （A-13 由来）crop モード中の「トリミング」セクション再クリックで画像が無限拡大／比率タイル連打でクロップ枠が 1px に収束する不具合。対処＝`requestEnterCropMode()` を crop 中 no-op ＋ `applyCropAspect` を内接 `fitRectToAspect` → 外接 `growRectToAspect` に | `session-log-2026-08-28-2.md` |
| E-8 | 用語統一: `文字`→`テキスト`、`出力アスペクト比`／`出力フォーマット`→`キャンバス`、`トリミング`→`写真のトリミング`。レール・レイアウトタブ `<legend>`・プリセット保存フォーム・`presetStore.PRESET_SECTIONS.label` を横断でそろえた。内部 id / `data-section` / 状態キーは不変 | `session-log-2026-08-28-3.md` |
| A-12 | レイアウトタブは1タブのまま、3セクションの `<legend>` を「二重四角アイコン＋対象名だけ」（番号・サブ文なし。③＝「大きさと配置」）に。新スプライト `#i-canvas`（外実線・内点線）／`#i-photo-crop`（内実線・外点線）／`#i-size-place`（大枠＋小枠オフセット）。`fieldset legend` を `display:flex`＋`.legend-icon` 17px。親はブランドマーク（二重四角） | `session-log-2026-08-28-3.md` |
| F-3 | プリセット保存フォームを `renderPresetSectionChecks()` の縦ツリーに（親5行＝チェック＋アイコン＋対象名、背景・フレーム・テキストは子グループを畳んで持つ。シェブロンで開閉） | `session-log-2026-08-28-3.md` |
| F-4 | プリセット名の衝突回避。空名は「プリセット N」（N＝空き番号の最小、1始まり）、明示名の衝突は末尾に ` 2` ` 3`…。上書きしない（`resolvePresetName`）。フォームの placeholder は次の自動名を表示 | `session-log-2026-08-28-3.md` |
| F-5 | 保存項目を2階層チェックに。`PRESET_SECTIONS` にドット付きパスの `groups`（背景＝タイプ／色／ぼかし・フレーム＝角丸／線／影・テキスト＝撮影日／Exif／自由テキスト）。親チェックは3状態、`savePreset(name, sections, groups)` が部分オブジェクトを組み立て、`applyPreset` は deep-merge のまま。旧プリセット移行不要 | `session-log-2026-08-28-3.md` |
| A-14 | 比率タイルピッカーを Lightroom Web 風に。`RATIO_FAMILIES` を向き中立のファミリー配列（縦向き正準・`×` 表記・数字が小さい順）に。ピッカーごとに `orientation` を UI 状態で持ち、見出し右端の回転ボタン（momentary、点灯状態なし）で全タイルを縦横反転＋選択中の比率を `H:W`↔`W:H`。`1.91:1` 削除・`16:10`（`10:16`）追加・`3:2`（`2:3`）追加。カスタムの ⇄ ボタン廃止（回転ボタンに一本化）。`editState`・`layoutCalculator` 無変更 | `session-log-2026-08-28-3.md` |
| E-9 | 比率タイルのサブラベルを全廃（`IG縦`/`IG横`/`ワイド`/`正方形`/`元の比率`/`自由`/`89:127`）。「インスタ」は正方形/4:5/ストーリーズ/リールで違い一概に言えないため。`RATIO_FAMILIES` から `sub` を除去 | `session-log-2026-08-28-3.md` |
| A-15 | 「配置をリセット」→「大きさと配置をリセット」に改名。位置・クロップ矩形パンの中央戻しに加えて `baseMarginPercent` も既定 5（表示 90%）へ | `session-log-2026-08-28-3.md` |
| A-16 | 「大きさと配置」セクションの説明文「写真をドラッグで配置。四隅の■で大きさを調整。」を削除 | `session-log-2026-08-28-3.md` |
| D-1 | テキスト追加ワークフローを「＋ テキストを追加 → 作成フォームで内容を組み立て → 追加でキャンバスに出る」の順に再設計（スコープB。撮影日・Exif も「テキスト」の1種＝内容欄に差し込む動的トークンとして作る） | `session-log-2026-08-28-4.md` |
| D-3 | 撮影日・Exif・自由テキストを1本の `textSettings.layers[]` に統合。`kind` フィールドは持たず「Exif を含むか」等は `content` から導出。フォント・大きさ・不透明度・位置・回転など見た目の設定は種類を問わず共通の1セット。旧形式プリセットは `migrateTextSettings()` が `applyPreset` の入口で変換 | `session-log-2026-08-28-4.md` |
| C-1 | 角丸「半径」と超楕円「次数n」を1つの「丸み」スライダー（`#frameRoundness`、0-100、右ほど丸い）に統合。角のスタイルは2択（角丸/超楕円、「なし」廃止＝丸み0 が実質「なし」）。角丸は `半径% = 丸み/2`、超楕円は角の詰まり `F=2^(-1/n)` を等間隔に刻む非線形マッピング（丸み0→n40、丸み100→n3。逆関数でプリセット位置復元）。モード切替は丸み位置を保持。`createSuperellipsePath` は `Math.round` を撤去し clamp のみ（非整数 n 可）。`layoutCalculator`・データモデル・Undo・`presetStore` は無変更 | `session-log-2026-08-28-5.md` |
| A-5 | crop モード中は「キャンバスの外側」（`.canvas-area` のパディング／出力比率が縦長・横長のときのレターボックス）をクリックしてもクロップを確定できる。`initCanvasInteraction()` が `previewCanvas.closest('.canvas-area')` に `pointerdown`/`pointerup` を張り、`e.target !== previewCanvas` かつ crop モードのときだけ canvas 本体と同じ「短いタップ」判定で `exitCrop()`。select モードは無反応（キャンバス外クリックでの選択解除は対象外）。`?debug` 用に `window.__kakomiGetPhotoEditMode` を追加 | `session-log-2026-08-29.md` |
| B-6 | 背景タイプに「別画像」を追加（単色／ぼかしに続く3つ目 `#bgTypeImage` = `backgroundType:'bgImage'`）。`editState.bgImage`（`EDITABLE_SETTINGS_KEYS` 外＝Undo・プリセット非対象。`getState()` のクローン時は `image` と同様に除外）に別途読み込む（`stateManager.setBackgroundImage` / `fileManager.processBackgroundImageFile`）。スライダー（拡大率・ぼかし・明るさ・彩度・位置）は `imageBlurBackgroundParams` を「ぼかし」と共有＝`drawBlurredImageBackground()` に別画像を全体で渡すだけ。別画像へ切替時、ぼかし既定 3 のままなら 0 へ寄せる。プレビュードラッグ位置調整も共有。プリセットに `bgImage` 型が入っていて画像未ロードなら単色にフォールバック | `session-log-2026-08-29-2.md` |
| A-4 | クロップ確定後の写真を出力キャンバス内で回転（`photoViewParams.rotation`、度、-180〜180。`EDITABLE_SETTINGS_KEYS` の `photoViewParams` に含まれるので Undo・プリセットに自動追随）。操作は「大きさと配置」の「角度」スライダー（`#photoRotation`）＋ select モードの上端回転ハンドル（`photoCropStore` に `rotate` 座標追加、Shift で15°刻み、ダブルクリックで 0°）。`layoutCalculator` が**回転後の外接矩形＋余白**で出力キャンバスを取り直す＝写真は切れない〈仕様(a)〉。`destWidth/Height` は回転前のまま＝`canvasRenderer` が `drawPreview`／`renderFinal` で写真中心の `ctx.rotate` で包んで描く（装飾も一緒に回る）。余白・テキストの基準「写真短辺」は回転前で固定。crop モード中は回転を無視して素の写真でトリミング。`cropRect.js` は無変更 | `session-log-2026-08-29-3.md` |

ダブルクリックでオフセットをリセットする案は「他の操作が暴発しそう」としてユーザー判断で見送り。

---

## 実装計画（2026-08-27 その3 練り直し版）

大枠は「**先に小改修とバグを片付け、次に Lightroom Web 風のシェル刷新をモックアップ合意のうえで一気にやり、
そのうえで編集機能の拡張（積み残し）に入る**」。シェル刷新の中でパネルの見せ方が変わるため、
各パネルの細かい文章削減・区切り線化・アイコン化はシェル刷新とまとめてやるのが手戻りが少ない。

### フェーズ3 — 小改修・バグ修正 ✅ 完了（`docs/session-log-2026-08-27-5.md` §7、Playwright スモーク 13/13）

1. ✅ **B-3** 拡大ぼかし背景を**クロップ後の写真**から生成。
2. ✅ **D-4** テキストの「透過度」ラベルを「不透明度」に。
3. ✅ **A-7** 比率ピッカーの選択肢順を共通化（`RATIO_FAMILIES`）＋カスタム欄を1行に。
4. ✅ **B-4** 背景の明るさ・彩度を常時表示に戻し、「見え方／色調／位置」の区切り線付き小見出しで分離。

### フェーズ4 — シェル刷新 ✅ 完了（`docs/session-log-2026-08-27-5.md` §9–11、Playwright スモーク phase4 20/20 ＋ phase2/3 回帰）

5. ✅ **E-1** タブ再クリックでパネルが畳まれる（`.app-shell.panel-collapsed`）。初期＝レイアウト開。開閉で `ResizeObserver` がキャンバス再フィット。
6. ✅ **E-2** `fieldset` / `.frame-card` を枠なし＋見出し＋上罫線の線ベースに。レールの色は現状のまま。
7. ✅ **E-5** 「出力」タブとレール項目を廃止。ダウンロードを上部バー右＋画質ポップオーバーに。
8. ✅ **A-8** レイアウトを ① 出力アスペクト比 → ② トリミング → ③ 余白と配置 に。余白を①から③へ分離。
9. ✅ **E-4** 説明文をアイコン＋数語に削減。
10. ✅ **F** プリセットはレール下部の一項目のまま。

### 既知の不具合（G-1）— ✅ 解消（`docs/session-log-2026-08-27-6.md`）

縦長／正方形の出力比率でプレビューキャンバスがじわじわ拡大し続ける不具合。**根本原因は `#previewCanvas` の
`border: 1px solid var(--ink)` が要素のレイアウトボックスに乗っていたこと**——高さ基準で決まるキャンバスが
コンテナ高さを 2px 押し上げ、`ResizeObserver` との正のフィードバックになっていた。§13.5 の対処候補のうち
**「border をレイアウトボックスから外す（最小）」**を採用し、枠線を `outline`（`outline-offset: -1px`）へ置換。
`.app-container` の高さや `.canvas-container` のサイズ指定には手を付けていない（レスポンシブへの影響なし。
`@media` 1024 / 768 の縦積みを目視確認済み）。高さ反応の `ResizeObserver` を実験的に戻しても拡大しないことを
`creep-repro.js` で確認。フェーズ4 の「幅のみ反応 `ResizeObserver`」は多重防御として残す。

### フェーズ5 — 情報（Exif）タブ ✅ 完了（`docs/session-log-2026-08-27-6.md`、Playwright スモーク phase5 25/25 ＋ 回帰）

11. ✅ **E-3** 「情報」を他タブと並列のタブ（`data-tab="tab-info"` ＋ `#tab-info` ペイン、レール下部＝プリセットの隣）に。
    同じフライアウトパネル枠で切り替わり、再クリックで収納（E-1 が自動で効く）。`#exifToggleButton` / `#exifFloatCard` 廃止。
    `displayExifInfo()` を作り替え、カメラ／レンズ名を小さく上に＋撮影設定はアイコン＋値だけの `.exif-dl`（項目名は `<dt>` の title）。

### フェーズ6 — 追加の小〜中改修 ✅ 完了（`docs/session-log-2026-08-27-7.md`、Playwright スモーク phase6 33/33 ＋ 回帰）

2026-08-27 その2セッションのフィードバック。方向性を相談で確定し、安い順に実装した: E-6 → B-5 → D-5 → G-2 → E-7 → F-2。

12. ✅ **E-6** Favicon。`.brand-mark` と同意匠の `favicon.svg`（`prefers-color-scheme` 対応）＋ `<link rel="icon" type="image/svg+xml">`。
13. ✅ **B-5** 背景タイプ（単色／ぼかし）を `.corner-segmented` のアイコンセグメントに（`#i-fill` / `#i-blur`）。id/name/value 据え置きで JS 配線は無変更。
14. ✅ **D-5** 文字タブがアクティブで自由テキスト選択中、Delete/Backspace で削除（`canvasInteraction.js` keydown）。固定レイヤーは対象外。
15. ✅ **G-2** 別画像への差し替え時は `cropSettings.rect`→全体・`photoViewParams`→中央（比率制約は維持して再フィット）。他パラメータは引き継ぐ。初回ロードでは初期化しない（`setImage`）。
16. ✅ **E-7** ファイル選択の小枠を廃し `.canvas-area` 全体をドロップ受付に。未読込時は中央にドロップダイアログ、読み込み後はキャンバス。上部バーに「画像を開く」ボタン（`#openImageButton`）。
17. ✅ **F-2** プリセット保存時にタブ単位5セクション（`PRESET_SECTIONS`）のチェックで保存項目を選択。`savePreset(name, sections)` がサブセット保存、`applyPreset` は含まれるキーだけ上書き。

### フェーズ7 — 改訂版（2026-08-28 ユーザーフィードバック反映）

フェーズ6・G-3 の目視確認後、追加フィードバック 11 件。バケットに分けて順に進める。
方向性はユーザーと合意済み（`docs/session-log-2026-08-28-2.md`）。

**バケット1 — 小改修・バグ（モックアップ不要）: ✅ 完了。ユーザーのブラウザ目視も確認済み**
（`docs/session-log-2026-08-28-2.md` 実装／`-2026-08-28-3.md` 目視確認＋A-10 微調整・dblclick 修正。phase7b1 61/61・回帰 16/16）。
各項目は上の「完了済み」表と A-10 / A-11 / A-13 / G-4 / G-5 / G-6 の（完了）スタブへ。

18. ✅ **G-4** カスタム比率がプリセットタイルと一致するとカスタム欄が隠れフォーカスが飛ぶ不具合。
19. ✅ **G-5** 比率固定のトリミング枠が写真の端を越えて拡大できる不具合。
20. ✅ **A-10** 「余白」→「大きさ」表記＋スライダー反転。目視確認で初期値 90% / 下限 15% / 上限 100% に微調整。
21. ✅ **A-11** トリミング比率タイルに「オリジナル」＝元画像のアスペクト比で固定。
22. ✅ **A-13** 「トリミング」セクションのクリックで crop モードへ／Enter でも抜ける。
23. ✅ **G-6** （A-13 由来）crop モード中の再クリックで画像が無限拡大／比率タイル連打で枠が 1px に収束する不具合。

**バケット2 — 用語・アイコン・レイアウトタブの構造: ✅ 完了。ユーザーのブラウザ目視も確認済み**
（`docs/session-log-2026-08-28-3.md`。モックアップ合意 → 実装。phase7b2 27/27・phase7b1 61/61・回帰 16/16）。
上の「完了済み」表と E-8 / A-12 の（完了）スタブへ。

24. ✅ **E-8** 用語統一（`文字`→`テキスト`、`出力アスペクト比`／`出力フォーマット`→`キャンバス`、`トリミング`→`写真のトリミング`）。
25. ✅ **A-12** レイアウトタブは1タブのまま、3セクションの `<legend>` を「二重四角アイコン＋対象名だけ」に。
    ③ の名前は「余白」を使わず **「大きさと配置」**。番号・サブ文は付けない（モックアップレビューで確定）。

**バケット3 — プリセット: ✅ 完了。ユーザーのブラウザ目視も確認済み**
（`docs/session-log-2026-08-28-3.md`。モックアップ rev.1 で全 Q を推奨どおり確定 → 実装。phase7b3 24/24、
phase7b1/b2 回帰 OK）。上の「完了済み」表と F-3 / F-4 / F-5 の（完了）スタブへ。

26. ✅ **F-3** 保存フォームを縦ツリーに（`renderPresetSectionChecks()`）。
27. ✅ **F-4** プリセット名の衝突回避（空名＝「プリセット N」＝空き番号の最小、明示名の衝突は連番。上書きなし）。
28. ✅ **F-5** 保存項目を2階層チェック（親5＋背景・フレーム・テキストの子。3状態の親。ドット付きパスで部分保存）。

**バケット3.5 — レイアウトタブのアスペクト比まわり: ✅ 完了。ユーザーのブラウザ目視も確認済み**
（`docs/session-log-2026-08-28-3.md` §7–8。モックアップ rev.4 で確定 → 実装。phase7b35 26/26、phase7b1 64/64・
phase7b1-regress 18/18・phase7b2 27/27・phase7b3 24/24。実装後に A-13「比率タイルのクリックで crop モードへ」が
壊れていたのを修正済み＝`cca029b`、これも目視確認済み）。上の「完了済み」表と A-14 / E-9 / A-15 / A-16 の（完了）スタブへ。

29. ✅ **A-14** 比率タイルピッカーを Lightroom Web 風に（片向き一覧・`×` 表記・数字が小さい順・90°回転ボタン・
    `1.91:1` 削除／`16:10`・`3:2` 追加・カスタムの ⇄ 廃止）。
30. ✅ **E-9** 比率タイルのサブラベルを全廃。
31. ✅ **A-15** 「大きさと配置をリセット」に改名＋大きさ（`baseMarginPercent` → 5）もリセット。
32. ✅ **A-16** 「大きさと配置」の説明文を削除。

**バケット4 — テキスト追加ワークフロー（独立フェーズ。スコープB）: ✅ 完了。ユーザーのブラウザ目視も確認済み・push 済み**
（`docs/session-log-2026-08-28-4.md`。モックアップ4点＋Q-A〜Q-F 合意 → 実装。目視フィードバックで内容エディタに
「表示」プレビュー欄を追加。phase7b4 41/41・phase7b4-regress 16/16、phase5 回帰 25/25、コンソールエラー無し）。
上の「完了済み」表と D-1 / D-3 の（完了）スタブへ。

33. ✅ **D-1 / D-3** 「＋ テキストを追加 → 作成フォームで内容（動的トークン含む）を組み立て → 追加でキャンバスに出る」の順に再設計。
    データモデルを単一 `textSettings.layers[]` に統合（`kind` は持たず `content` から導出）、撮影日／Exif も複数レイヤー化・
    コントロールは共通の1セット。旧 localStorage プリセットは `migrateTextSettings()` で変換。

**バケット5 — 背景に別画像: ✅ 完了。ユーザーのブラウザ目視も確認済み・push 済み**
（`docs/session-log-2026-08-29-2.md`。方向性を AskUserQuestion で全推奨案に確定 → 実装。b6-test 25/25 ＋
a5 / g1 / c1 / phase5 / phase7b4 / phase7b4-regress 回帰全通し）。上の「完了済み」表と B-6 の（完了）スタブへ。

34. ✅ **B-6** 背景タイプに「別画像」を追加。`editState.bgImage`（Undo・プリセット非対象）に別途読み込み、
    見え方・色調・位置のスライダーは「ぼかし」と共有。当初「大規模」と見積もっていたが、ぼかしレンダラが
    既に `img` / `sourceRect` でパラメータ化されていたため中規模で収まった。

**バケット後の積み残し:** ~~C-1（超楕円スライダーの体感等間隔マッピング）~~ ✅ 完了（`docs/session-log-2026-08-28-5.md`）／
~~A-5（クロップ確定をキャンバス外クリックでも）~~ ✅ 完了（`docs/session-log-2026-08-29.md`）／
~~A-4（クロップ後の写真を回転）~~ ✅ 完了（`docs/session-log-2026-08-29-3.md`）／
A-3（クロップ時に切り出し前の元画像を回転。最大規模。仕様(a)＝クロップ窓を画像内に収まるよう自動で縮める）＋「切り抜きをまるごとリセット」操作。

---

## A. レイアウトタブ

### A-1.（完了）

比率タイルピッカー（`js/ui/ratioPicker.js`）へ置き換え、切り抜き位置／枠内位置のスライダーは撤去。
詳細は「完了済み」表と `docs/session-log-2026-08-27-4.md`。

### A-7.（完了）

比率タイルの選択肢順を `js/ui/ratioPicker.js` の `RATIO_FAMILIES`（正準順序＋`pickers`フラグ）に一本化。
カスタム幅高さ欄を折り返さない1行（`.ratio-custom-row`）に。詳細は「完了済み」表と `docs/session-log-2026-08-27-5.md`。

### A-8.（完了）

レイアウトタブを ① 出力アスペクト比 → ② トリミング → ③ 余白と配置 の3セクション（線区切り）に。
余白（`baseMarginPercent`）を①から③へ分離。詳細は「完了済み」表と `docs/session-log-2026-08-27-5.md` §11。

### A-3. クロップ時に「外側の写真」を回転できる機構（次の着手候補）

**要望:** crop モード中に、切り抜き前の元画像（枠の外も含む）を回転させたい（水平出し等）。

**方針（2026-08-29 合意）:** 傾いた画像が軸平行クロップ窓を覆いきれなくなったら、**(a) クロップ窓を画像内に
収まるよう自動で縮める**（Lightroom 既定）。空き角を塗る (b) 案は不採用。`cropSettings` に回転角を持たせ、
`layoutCalculator` で「回転した元画像から矩形を切り出す」計算（`drawImage` の source 4 数値では表せないので
クリップ＋回転の別経路に）にする。`drawCropModeOverlay` の `whole` 描画にも回転を反映（画像が傾く／クロップ窓は
軸平行のまま＋角度グリッド）。`cropRect.js` の resize/grow/clamp を回転空間で作り直し。**A-4 で用意した回転
レンダラ・回転ハンドル操作・回転矩形の当たり判定・外接矩形サイズの `layoutCalculator` を土台に拡張する。**
「切り抜きをまるごとリセット」操作もここで用意。最大規模。

### A-4.（完了）

クロップ確定後の写真を出力キャンバス内で回転（`photoViewParams.rotation`）。「大きさと配置」の「角度」
スライダー（`#photoRotation`、-180〜180、Shift ドラッグで 15° 刻み）＋ select モードで写真選択中に上端の
回転ハンドル（`photoCropStore` に `rotate` 座標追加。テキストの回転ハンドル機構を流用）。`layoutCalculator` が
回転後の外接矩形＋余白で出力キャンバスを取り直すので写真は切れない（仕様(a)）。`destWidth/Height` は回転前の
ままで、`canvasRenderer` が `drawPreview`／`renderFinal` の写真描画ブロックを写真中心の `ctx.rotate` で包む
（角丸・影・縁取りも一緒に回る）。余白・テキストの基準「写真短辺」は回転前で固定。crop モード中は回転を無視。
`photoViewParams` は `EDITABLE_SETTINGS_KEYS` にあるので Undo・プリセットに自動追随。「大きさと配置をリセット」で
`rotation` も 0 へ。`cropRect.js`・データモデルの他部分・`historyManager`・`presetStore` は無変更。
詳細は「完了済み」表と `docs/session-log-2026-08-29-3.md`。

### A-5.（完了）

crop モード中は `.canvas-area` の余白（パディング／レターボックス）クリックでもクロップを確定できる。
`initCanvasInteraction()` が `previewCanvas.closest('.canvas-area')` に `pointerdown`/`pointerup` を張り、
crop モード中かつ `e.target !== previewCanvas` のとき、canvas 本体と同じ「短いタップ」判定
（`CLICK_MOVE_THRESHOLD` / `CLICK_TAP_MS`）を満たせば `photoEditModeStore.exitCrop()`。select モードでは
何もしない（キャンバス外クリックでの選択解除は別機能なので対象外）。リスナーは `.canvas-area` に限定するので
設定パネル・上部バー・比率タイルのクリックは従来どおり crop を抜けさせない。`?debug` スモーク用に
`window.__kakomiGetPhotoEditMode` を追加。詳細は「完了済み」表と `docs/session-log-2026-08-29.md`。

### A-9. → G-2 へ集約

「別画像を読み込むとトリミングが崩れる（1:1 で切ったのに別アスペクト比の画像でずれる）」は不具合として **G-2** に記載。

### A-10.「余白」→「大きさ」に表記変更＋スライダー反転（完了）

「大きさ」ラベル＋右＝大きい向きに反転。内部 `baseMarginPercent`（写真短辺に対する%、0〜300）は保存キーとして不変。
UI の range だけ「大きさ」= `marginToSize(m) = 100/(1+m/45)`（余白0→100%、余白5〈既定〉→ちょうど90%、余白300→約13%）で
見せ、`input` で `sizeToMargin` 逆変換して保存。分母 45 は既定余白5がちょうど 90% になるよう選定。スライダー範囲は
min 15 / max 100（下限 15% は `marginToSize(300)≈13%` より上なので不感帯なし。内部ロジックは無変更）。
詳細は「完了済み」表と `docs/session-log-2026-08-28-3.md`。

### A-11.（完了）

トリミング比率タイルに「オリジナル」＝元画像のアスペクト比で固定（Lightroom のクロップ「オリジナル」と同義。
切り抜きまるごとリセットではない＝それは回転 A-4 実装後）。`ratioPicker` に `original` タイル、`cropRect.js` の
`resolveCropAspectValue(aspectRatio, imgW, imgH)` を `getCropConstraint` / `setImage` 再フィット / `applyCropAspect`
の3経路で使用。ミニ長方形は `syncOriginalTileShape()` が読み込み中の画像比で描く。
詳細は「完了済み」表と `docs/session-log-2026-08-28-2.md`。

### A-12.（完了）

タブ分割はせず「レイアウト」1タブのまま、3セクションの `<legend>` を「二重四角アイコン＋対象名だけ」に。
番号・サブ文は付けない（サブは節名とほぼ重複するためモックアップレビューで削除）。見出し＝**キャンバス／
写真のトリミング／大きさと配置**（③ は「余白」を使わない。「配置」単体だと大きさスライダーが名前から漏れるため
「大きさと配置」）。アイコン＝新スプライト `#i-canvas`（外実線・内は丸ドット点線）／`#i-photo-crop`（内実線・
外点線）／`#i-size-place`（大枠＋小枠オフセット）。`fieldset legend` を `display:flex`＋`.legend-icon`（17px、
`--ink-dim`）。親は Kakomi ブランドマーク（二重四角）。同じ用語・アイコンはプリセット保存フォームでも使う。
詳細は「完了済み」表と `docs/session-log-2026-08-28-3.md`。

### A-13.（完了）

レイアウトタブ「トリミング」`<fieldset id="cropSection">` のクリック（数値入力欄以外）で crop モードへ自動遷移。
`canvasInteraction.js` に `requestEnterCropMode()` をモジュール関数として切り出し、`uiController` が `#cropSection`
の `click` から呼ぶ（写真未選択なら先に選択）。keydown の crop 離脱条件を `Escape` → `Escape || Enter` に。
詳細は「完了済み」表と `docs/session-log-2026-08-28-2.md`。

### A-14.（完了）

比率タイルピッカーを Lightroom Web 風に。`js/ui/ratioPicker.js` の `RATIO_FAMILIES` を「向きを畳んだ比率
ファミリー」（縦向き正準 `p ≤ q`。配列の並び＝表示順＝数字が小さい順）に作り替え。ピッカーは `orientation`
（`portrait` / `landscape`）を UI 状態で持ち、タイルのラベル（`4×5` の `×` 表記）とミニ長方形はこの向きで描く。
選択肢: キャンバス `1×1 · 2×3 · 3×4 · 4×5 · L判 · 9×16 · 10×16 · カスタム`／トリミング `オリジナル · フリー ·
1×1 · 2×3 · 3×4 · 9×16 · 10×16 · カスタム`（`1.91:1` 削除、`16:10`＝`10:16`・`3:2`＝`2:3` 追加、`L判` は
キャンバスのみ・数字を持たないので固定位置）。見出し右端の回転ボタン（`#outputRotateButton` / `#cropRotateButton`。
アイコン `#i-rotate`＝四角の右上に回転矢印。momentary で点灯状態なし）が `picker.toggleOrientation()` で全タイル
反転＋選択中ファミリーの保存文字列を `H:W`↔`W:H` に。`1×1`・フリー・オリジナルは向きだけ反転して値据え置き。
カスタムの ⇄ ボタン（`#swapAspectRatio` / `#cropSwapAspectRatio`）は廃止し回転ボタンに一本化。向きは常に
保存文字列から導出し永続化しない。`editState` のキー・`layoutCalculator` は無変更。
詳細は「完了済み」表と `docs/session-log-2026-08-28-3.md`。

### A-15.（完了）

`#resetPhotoPlacement` を「大きさと配置をリセット」に改名。ハンドラに `baseMarginPercent →
controlsConfig.baseMarginPercent.defaultValue`（5＝表示 90%）を追加し、位置・クロップ矩形パンの中央戻しに加えて
大きさも既定へ。`updateSliderValueDisplays()` でスライダーも同期。
詳細は「完了済み」表と `docs/session-log-2026-08-28-3.md`。

### A-16.（完了）

`index.html` の「大きさと配置」`<fieldset>` から `<p class="custom-text-drag-hint">写真をドラッグで配置。
四隅の■で大きさを調整。</p>` を削除。
詳細は「完了済み」表と `docs/session-log-2026-08-28-3.md`。

---

## B. 背景タブ

### B-1.（完了・軽微版）

明るさ・彩度を閉じたアコーディオンへ、X/Y オフセットのスライダーを撤去し「位置をリセット」ボタンに。
詳細は「完了済み」表と `docs/session-log-2026-08-27-4.md`。

### B-3.（完了）

`backgroundRenderer.js` の `drawBlurredImageBackground()` が `photoDrawConfig.source*`（クロップ矩形の
元画像ピクセル座標）を `sourceRect` として受け取り、その範囲だけをぼかし背景の元に使う。バグ修正。
詳細は「完了済み」表と `docs/session-log-2026-08-27-5.md`。

### B-4.（完了）

`<details id="bgToneAccordion">` を撤去し、明るさ・彩度を常時表示に。「見え方／色調／位置」の
区切り線付き小見出し（`.subsection-heading.with-rule`）で分離。B-1 のアコーディオンを撤回。
詳細は「完了済み」表と `docs/session-log-2026-08-27-5.md`。

### B-5.（完了）

背景タイプ（単色／ぼかし）を `.corner-segmented` のアイコンセグメント（`#i-fill` / `#i-blur`）に。ラジオの
`id` / `name` / `value` は据え置きで `uiController.js` の配線は無変更。詳細は「完了済み」表と
`docs/session-log-2026-08-27-7.md`。

### B-6.（完了）

背景タイプに「別画像」（`#bgTypeImage` = `backgroundType:'bgImage'`）を追加。2 枚目の画像は
`editState.bgImage` に持ち、`EDITABLE_SETTINGS_KEYS` 外＝Undo・プリセット非対象（`getState()` の
`structuredClone` からは `image` と同様に除外して復元）。読み込みは `stateManager.setBackgroundImage()`
＋ `fileManager.processBackgroundImageFile()`（Exif 抽出・トリミング初期化・UI 全再構築なし）。見え方・
色調・位置のスライダーと位置リセット・プレビュードラッグは `imageBlurBackgroundParams` を「ぼかし」と
共有し、`drawBlurredImageBackground()` に別画像を全体（クロップなし）で渡すだけ。別画像へ切り替えた瞬間、
ぼかし強度が既定 3 のまま未調整なら 0 へ寄せる。プリセットに `bgImage` 型が保存されていて画像未ロードなら
`backgroundRenderer` が単色にフォールバック。当初「大規模」見積もりだったが、ぼかしレンダラが既に
`img` / `sourceRect` でパラメータ化されていたため中規模で収まった。
詳細は「完了済み」表と `docs/session-log-2026-08-29-2.md`。

---

## C. フレームタブ

### C-1.（完了）

角丸「半径」と超楕円「次数n」を1つの「丸み」スライダー（`#frameRoundness`、0-100、右ほど丸い）に統合。
角のスタイルは2択（角丸 / 超楕円。「なし」廃止＝丸み0 が実質「なし」。既定＝角丸・丸み0）。角丸は
`cornerRadiusPercent = 丸み/2`（線形）、超楕円は角の詰まり `F(n) = 2^(-1/n)` を等間隔に刻む非線形マッピング
（`F(丸み) = F(40) + (丸み/100)·(F(3)−F(40))`、`n = −1/log₂F`。丸み0→n40、丸み100→n3。逆関数
`nToRoundness` でプリセット／Undo からスライダー位置を復元）。モード切替は丸み位置を保持して丸め関数を切替。
`uiController.js` に `roundnessToN` / `nToRoundness` / `roundnessToRadius` / `radiusToRoundness` /
`currentRoundness` と `#frameRoundness` 専用リスナー（A-10「大きさ」と同じ「UI 値 ≠ 保存値」方式）。
`createSuperellipsePath` は `Math.round(nParam)` を撤去し clamp `[2,40]` のみ（非整数 n 可）。
`layoutCalculator`・データモデル・Undo・`presetStore` は無変更。
詳細は「完了済み」表と `docs/session-log-2026-08-28-5.md`。

---

## D. 文字タブ

### D-4.（完了）

`renderTextLayerSettingsPanel()` のラベルを「透過度」→「不透明度」に。値は `opacity`（1=くっきり／0=透明）。
バグ修正。詳細は「完了済み」表と `docs/session-log-2026-08-27-5.md`。

### D-1.（完了）

「＋ テキストを追加 → 作成フォーム（未確定の下書き `textDraft`）で内容を組み立て → 追加でキャンバスに出る」の順に再設計。
撮影日 / Exif も「テキスト」の1種＝内容欄に差し込む**動的トークン**（`{ field:'date'|'exif' }`。生きたトークン）として作る。
差し込むとトークン直下にその場で書式／項目ピッカーが開く。詳細は「完了済み」表と `docs/session-log-2026-08-28-4.md`。

### D-3.（完了）

撮影日・Exif・自由テキストを1本の `textSettings.layers[]` に統合。`kind` フィールドは持たず、「Exif を含むか」等は
`content`（リテラル文字列＋動的トークンの並び）から導出（`utils/textContent.js`）。フォント・大きさ・不透明度・
位置・回転・揃えは種類を問わず共通の1セット（`buildTextEditor` の create/edit 共通部品）。サイズ範囲も
`controlsConfig.textLayerSize`（0.1〜50%）に一本化。旧形式（`{ date, exif, customTexts }`）プリセットは
`stateManager.migrateTextSettings()` が `applyPreset` の入口で `{ layers: [] }` へ変換（撮影日・Exif は有効だったものだけ、
自由テキストは全部）。詳細は「完了済み」表と `docs/session-log-2026-08-28-4.md`。

### D-5.（完了）

「文字」タブがアクティブで自由テキスト選択中、`Delete` / `Backspace` で削除（`canvasInteraction.js` の keydown）。
固定レイヤー（撮影日・Exif）は対象外。詳細は「完了済み」表と `docs/session-log-2026-08-27-7.md`。

---

## E. シェル全体（Lightroom Web 参照）

**総論（その3）:** 全体をもっとスタイリッシュにしたい。参考は **Adobe Lightroom の Web 版**。
基本構造は今の Kakomi と近い（上部に横断バー、サイドに編集タブ、キャンバス中央）。違いにしたいのは以下。

**フェーズ4 モックアップ（`artifact-design`）のレビュー結果:** 方向性は OK。決まったこと＝
初期表示はレイアウトパネルが開いた状態／レールの色は現状の明るいまま（配色変更なし）／
画質はダウンロードボタン脇のポップオーバー／プリセットはレール下部の一項目のまま／
「情報」は他タブと並列（同じ枠で切り替わる。オーバーレイにしない＝E-3 の記述を修正済み）。

### E-1.（完了）

`tabManager.js` にアクティブタブ再クリックでパネルを畳む処理（`.app-shell.panel-collapsed`）。初期＝レイアウト開。
パネル開閉で `main.js` の `ResizeObserver` が `canvasRenderer.clearContainerSizeCache()`＋再描画。
詳細は「完了済み」表と `docs/session-log-2026-08-27-5.md` §11、`spec.md` 3.1 節。

### E-2.（完了）

`fieldset` / `legend` / `.frame-card` を枠なし＋見出し＋（2つ目以降は）上罫線の線ベースに（`style.css`）。
詳細は「完了済み」表と `docs/session-log-2026-08-27-5.md` §11。

### E-3.（完了）

「情報」をレール下部の `.tab-button`（`data-tab="tab-info"`）＋ `#tab-info` ペインにし、他タブと同じフライアウトパネル枠で
切り替わるようにした（`tabManager.js` が自動で扱い、E-1 の再クリック収納も効く）。`#exifToggleButton` / `#exifFloatCard` /
`.exif-float-card` は廃止。`displayExifInfo()`（`exifHandler.js`）を作り替え、カメラ／レンズ名を小さく上部に1行（`.exif-cam`）、
撮影設定（絞り・SS・ISO・焦点距離・撮影日時）はアイコン＋値だけの `.exif-dl`（項目名は `<dt>` の `title` 属性）。
アイコンは `index.html` スプライトに `#i-aperture` / `#i-shutter` / `#i-iso` / `#i-focal` / `#i-cal` を追加。
撮影日時の整形バグ（`formatExifForDisplay` が時刻のコロンも `/` に置換していた）も修正。
詳細は「完了済み」表と `docs/session-log-2026-08-27-6.md`。

### E-4.（完了）

`.custom-text-drag-hint` の長文をアイコン＋数語に削減。詳細は `docs/session-log-2026-08-27-5.md` §11。

### E-5.（完了）

「出力」タブ（`#tab-output`）とレール項目を廃止。ダウンロードを上部バー右＋画質ポップオーバー（`#downloadPopover`。
`#jpgQuality`＋「書き出す」）に。`outputSettings` データ・`fileManager.js` は不変。
詳細は「完了済み」表と `docs/session-log-2026-08-27-5.md` §11、`spec.md` 7.6 節・3.1 節。

### E-6.（完了）

`.brand-mark` と同意匠の `favicon.svg`（`prefers-color-scheme` 対応）＋ `<link rel="icon" type="image/svg+xml">`。
詳細は「完了済み」表と `docs/session-log-2026-08-27-7.md`。

### E-7.（完了）

ファイル選択の小枠を廃し、`.canvas-area` 全体をドロップ受付に。未読込時は `.canvas-area.no-image` で中央に
ドロップダイアログ（`#imageDropDialog`）、読み込み後は `.has-image` でキャンバス（切り替えは `updateImagePresenceUI()`）。
`#imageLoader` は視覚的に隠し、上部バーの「画像を開く」ボタン（`#openImageButton`）とダイアログのラベルから開く。
詳細は「完了済み」表と `docs/session-log-2026-08-27-7.md`。

### E-8.（完了）

レール／レイアウトタブ／プリセット保存フォームの用語を横断でそろえた:
- `文字` → **`テキスト`**（レールのボタン文字）
- `出力アスペクト比` / `出力フォーマット` → **`キャンバス`**（レイアウトタブの `<legend>`＋プリセットのチェック＋
  `presetStore.PRESET_SECTIONS.output.label`。「アスペクト比」は名詞なので節名にしない）
- `トリミング` → **`写真のトリミング`**（同上。`crop` セクションの `label` も）
- `余白と配置` → **`大きさと配置`**（A-12 で「余白」を使わない方針に。ロードマップ上は「維持」だったのを変更）

内部の tab id / `data-section` / `editState` キー・各レンダラは無変更。詳細は「完了済み」表と
`docs/session-log-2026-08-28-3.md`。

### E-9.（完了）

比率タイルのサブラベルを全廃。`ratioPicker.js` の `RATIO_FAMILIES` から `sub`（`IG縦`/`IG横`/`ワイド`/`正方形`/
`元の比率`/`自由`/`89:127`）を除去。理由: 「インスタ」は正方形/4:5/ストーリーズ/リールで比率が違い一概に言えず
誤解を招く。タイルは「ラベル＋ミニ長方形」だけ。A-14 と同じ実装で対応。
詳細は「完了済み」表と `docs/session-log-2026-08-28-3.md`。

---

## F. プリセットタブ

### F-1.（完了）

プリセットはアイコンレール下部の一項目のまま（「情報」の隣）。パネルが「出入りするタブ」になったので、
プリセットも他タブと同じ扱いで足りる。レイアウトの中に畳み込むのは見送り。
詳細は `docs/session-log-2026-08-27-5.md` §9・§11。

### F-2.（完了）

プリセット保存フォームにタブ単位5セクション（`presetStore.js` の `PRESET_SECTIONS`＝出力フォーマット／
トリミング／背景／フレーム／テキスト。`outputSettings` は出力フォーマットに含めた）のチェックボックス
（`#presetSectionChecks`、既定は全チェック）。`savePreset(name, sections)` が選択セクションのキーだけ保存し
`sections` も記録。`applyPreset` は `updateState` の deep-merge で含まれるキーだけ上書き。旧プリセットは移行不要。
詳細は「完了済み」表と `docs/session-log-2026-08-27-7.md`。

### F-3.（完了）

プリセット保存フォームを `uiController.renderPresetSectionChecks()` の**縦ツリー**（`#presetSectionChecks` =
`.preset-tree`）に。親5行＝チェック＋アイコン（`#i-canvas` / `#i-photo-crop` / `#i-bg` / `#i-frame` / `#i-text`）
＋対象名。背景・フレーム・テキストは子グループを畳んで持ち、シェブロンで開閉（既定は畳む）。
詳細は「完了済み」表と `docs/session-log-2026-08-28-3.md`。

### F-4.（完了）

`presetStore.resolvePresetName()`: 空名は「プリセット N」（N＝空き番号の最小、1始まり）、明示名が既存と
衝突する間は末尾に ` 2` ` 3` …。**上書きしない**。フォームの `placeholder` は `getNextAutoPresetName()`
（次の自動名）を表示し、保存・削除のたびに更新。
詳細は「完了済み」表と `docs/session-log-2026-08-28-3.md`。

### F-5.（完了）

`PRESET_SECTIONS` に**ドット付きパスの `groups`**（背景＝タイプ／色／ぼかし・フレーム＝角丸／線／影・
テキスト＝撮影日／Exif／自由テキスト。キャンバス・写真のトリミングは葉）。親チェックは3状態（全 ✓／無 空／
一部 −）、親クリックは「全 ON でなければ全 ON、全 ON なら全 OFF」。`savePreset(name, sections, groups)` が
パスを辿って部分オブジェクトを組み立て、一部だけ選んだセクションは `preset.groups` にも記録（全部なら省略＝
旧形式互換）。`applyPreset` は `updateState` の deep-merge のまま無変更。ドリフト検知ガードは葉キーを
トップレベルに丸めて突き合わせる。「保存済み」一覧のメタは一部グループのセクションを「◯◯（一部）」＋`title` に内訳。
※フレームの子は「角丸／線／影」の3つ（ロードマップ当初の「線・影」に角丸を追加＝`cornerStyle` の居場所）。
テキストの子は「撮影日／Exif／自由テキスト（すべて）」の3固定（レイヤー単位の粒度はバケット4 の `textLayers[]`
統合後）。詳細は「完了済み」表と `docs/session-log-2026-08-28-3.md`。

---

## G. 既知の不具合

### G-1.（解消）

縦長／正方形の出力比率でプレビューキャンバスがじわじわ拡大し続ける不具合。`#previewCanvas` の枠線を
`border` → `outline` にして解消。詳細は上の「既知の不具合（G-1）」節と `docs/session-log-2026-08-27-6.md`。

### G-2.（解消）

「別画像を読み込むとトリミングが崩れる（1:1 で切ったのに別アスペクト比の画像でずれる）」不具合。原因は
`cropSettings.rect` が元画像に対する正規化座標で、アスペクト比の違う画像へ同じ rect を引き継ぐと形状が変わること。
対処: `setImage` で **すでに画像がある状態での差し替え時**（`editState.image` が truthy）だけ `cropSettings.rect`
→ 全体、`photoViewParams` → 中央にリセット。比率制約（`aspectRatio`）は維持し、既存の再フィット経路で新画像の
アスペクトに合わせて作り直す。他パラメータは引き継ぐ。初回ロードでは初期化しない。詳細は「完了済み」表と
`docs/session-log-2026-08-27-7.md`。

### G-3.（解消）

レイアウトタブを閉じて開くと、展開トランジション中に一瞬 画面全体（キャンバス含む）が下にガクッとずれて戻る。
原因＝パネル（`.tab-content-area`）を `width: 0 → 360px` でトランジションする途中、極小幅で中身が縦 ~1800px に
レイアウトされ、`.app-container { min-height: 100vh }`（＝下に伸びられる）なので一時的にページ全体が膨張する
（G-1 と同じ「レイアウトが下に伸びられる素地」）。対処: `@media (min-width: 1025px) { .app-container { height: 100dvh;
min-height: 0; overflow: hidden } }` でデスクトップ3カラム時だけシェルをビューポート高に固定してクリップ（内側の
レール／パネル／キャンバスは元々各自 overflow を持つ）。1024px 以下の縦積みには適用しない（過去の「CSS で高さ固定
→ 縦積みが崩れる」を回避）。G-1 の残り 2px も解消。詳細は「完了済み」表と `docs/session-log-2026-08-28.md`。

### G-4.（解消）

カスタム比率が既存タイルと一致するとカスタム欄が閉じフォーカスが飛ぶ不具合。「カスタムモード」を明示フラグ
（`uiController` の `outputCustomMode`／`cropCustomMode`）で粘着させ、カスタム欄の表示を `getValue()==='custom'`
依存から外した。`ratioPicker.setValue(v, { keepCustom })` を追加。`.focus()` は一切呼ばない。
詳細は「完了済み」表と `docs/session-log-2026-08-28-2.md`。

### G-5.（解消）

比率固定のトリミング枠が写真の端を越えて画面枠いっぱいまで拡大できてしまう不具合。`js/utils/cropRect.js`
`resizeCropRect` の比率ロック分岐で、掴んだ隅の対角（アンカー）を固定したまま矩形が [0,1] に収まる最大の
`w`（従って `h=w/R`）を計算して頭打ちにした。末尾の `clampRect` は backstop として残す。
詳細は「完了済み」表と `docs/session-log-2026-08-28-2.md`。

### G-6.（解消）

A-13 由来。crop モード中に「トリミング」セクションを再クリックすると frozenFrame を取り直して画像が一段ずつ
拡大／比率タイル連打でクロップ枠が 1px へ収束する不具合。対処＝`requestEnterCropMode()` を crop モード中は
no-op に、`uiController.applyCropAspect` を内接 `fitRectToAspect` → 外接 `growRectToAspect`（現在の矩形を含む
最小の比率一致矩形。[0,1] 超は比率保持で頭打ち、同一比率は完全 no-op）に切り替え。
詳細は「完了済み」表と `docs/session-log-2026-08-28-2.md`。

---

## 進め方のメモ

- **フェーズ3・フェーズ4 は完了**（`docs/session-log-2026-08-27-5.md` §7–11、Playwright スモーク phase3 13/13・phase4 20/20・phase2 回帰 19/19）。ユーザーのブラウザ目視・操作感確認は次回。
- **セッションクローズ（2026-08-27 その3）**: フェーズ4 で「縦長比率でキャンバスがじわじわ拡大し続ける」不具合が判明（§13）。
  幅のみに反応する `ResizeObserver` で回帰は封じ込めたが根本原因は残る（G-1）。ここでコミット／プッシュし、次セッションへ引き継ぐ。
- **G-1・フェーズ5（E-3）は解消／完了済み**（`docs/session-log-2026-08-27-6.md`。Playwright スモーク g1 13/13・phase5 25/25、phase2/3/4 回帰 OK、**ユーザーのブラウザ目視も確認済み**）。
- **フェーズ6・G-3 も完了／解消**（`docs/session-log-2026-08-27-7.md` / `-2026-08-28.md`。phase6 33/33・panel-jump-repro＋`@media` 各幅＋回帰全通し。G-3 はユーザー承認済み、ブラウザ目視は次回）。
- **セッションログを実日付へ一括リネーム済み**（2026-08-28。`-2026-08-28.md` §6。以後は git コミット日時基準の実日付で命名する）。
- **フェーズ6（E-6 / B-5 / D-5 / G-2 / E-7 / F-2）は完了済み**（`docs/session-log-2026-08-27-7.md`。Playwright スモーク phase6 33/33、phase2/3/4/5・g1 回帰 OK）。ユーザーのブラウザ目視は次回。
- **フェーズ7 は改訂版（2026-08-28）** で進行中（上の「フェーズ7 — 改訂版」参照）。**バケット1〜3.5（G-4 / G-5 /
  A-10 / A-11 / A-13 / G-6 ／ E-8 / A-12 ／ F-3 / F-4 / F-5 ／ A-14 / E-9 / A-15 / A-16）は実装・Playwright 検証済み・
  ユーザーのブラウザ目視も確認済み・すべて push 済み**（`docs/session-log-2026-08-28-2.md`／`-2026-08-28-3.md`。
  HEAD `70d9a3d`。phase7b1 64/64・phase7b1-regress 18/18・phase7b2 27/27・phase7b3 24/24・phase7b35 26/26。
  ここでいったんクローズ）。**バケット4（D-1・D-3 テキストレイヤーのデータモデル統合＝単一
  `textSettings.layers[]`、追加ワークフロー再設計）も実装・Playwright 検証済み・ユーザーのブラウザ目視も確認済み・
  push 済み**（`docs/session-log-2026-08-28-4.md`。phase7b4 41/41・phase7b4-regress 16/16・phase5 回帰 25/25。
  `kind` は持たず `content` から導出。目視フィードバックで内容エディタに「表示」プレビュー欄を追加）。
  **次はバケット5（B-6 背景に別画像、登録のみ）** → 積み残し（A-5 / A-4 / A-3）。
- **C-1 完了**（`docs/session-log-2026-08-28-5.md`。角丸／超楕円を「丸み」スライダー1本に統合、超楕円は
  角の詰まり `F=2^(-1/n)` 等間隔マッピング。c1-test 37/37 ＋ phase7b4 / phase7b4-regress / phase5 / g1 回帰全通し。
  ユーザーのブラウザ目視は次回）。
- **A-5 完了**（`docs/session-log-2026-08-29.md`。crop モード中は `.canvas-area` の余白クリックでもクロップ確定。
  `initCanvasInteraction()` が `.canvas-area` に薄い pointerdown/up リスナーを追加、`?debug` に
  `window.__kakomiGetPhotoEditMode` を追加。a5-test 14/14 ＋ g1 13/13・phase5 25/25・c1 37/37・phase7b4 41/41・
  phase7b4-regress 16/16 回帰全通し。ユーザーのブラウザ目視も確認済み・push 済み）。
- **B-6 完了**（`docs/session-log-2026-08-29-2.md`。バケット5。背景タイプ「別画像」＝ `editState.bgImage`
  （Undo・プリセット非対象）に別読み込み、見え方・色調・位置は `imageBlurBackgroundParams` を「ぼかし」と共有、
  レンダラは `drawBlurredImageBackground()` に別画像を全体で渡すだけ。ぼかしレンダラが既にパラメータ化されて
  いたため中規模で収まった。b6-test 25/25 ＋ a5/g1/c1/phase5/phase7b4/phase7b4-regress 回帰全通し。
  ユーザーのブラウザ目視も確認済み・push 済み）。
- **A-4 完了**（`docs/session-log-2026-08-29-3.md`。クロップ後の写真を出力キャンバス内で回転
  ＝`photoViewParams.rotation`。「角度」スライダー＋ select モードの上端回転ハンドル（Shift で15°刻み）。
  `layoutCalculator` が回転後の外接矩形＋余白でキャンバスを取り直す＝写真は切れない〈仕様(a)〉。装飾も一緒に
  回る。`photoViewParams` は追跡キーなので Undo・プリセットに自動追随。`cropRect.js` 無変更。a4-test 19/19 ＋
  b6/a5/c1/g1/phase5/phase7b4/phase7b4-regress 回帰全通し。ユーザーのブラウザ目視も確認済み・push 済み）。
  **次は A-3（crop モードで切り出し前の元画像を回転・最大規模。仕様(a)＝クロップ窓を自動で
  縮める）＋「切り抜きをまるごとリセット」操作。** A-4 の回転レンダラ・回転ハンドル・外接矩形サイズを土台に
  「拡張」として進める。
- 比率タイルピッカー（`js/ui/ratioPicker.js`）は「形で見せて選ぶ」の再利用ネタ（C-1 で採った「感覚に合わせて曲げる」も同系）。
- 「タブでプレビュー操作の意味を変える」系は、`tabManager.getActiveTab()` ＋ `canvasInteraction.js` の分岐に足していける。
  フェーズ4 で「パネルを畳んだ（`getActiveTab()`＝`null`）」状態が加わった＝写真ドラッグは枠内配置にフォールバックする。
- D はデータモデル統合まで踏み込むかで規模が大きく変わる。スコープを最初に握る。
- 各実装後は `spec.md` と新しい `docs/session-log-YYYY-MM-DD.md` を更新し、完了項目はこのファイルの「完了済み」表へ 1 行で移す
  （本文の詳細ブロックは残さない。ID は消さない）。
