# 開発セッションログ: バケット1 目視確認＋A-10 微調整、バケット2（E-8/A-12）・3（F-3/F-4/F-5）・3.5（A-14/E-9/A-15/A-16）実装（2026-08-28）

`docs/session-log-2026-08-28-2.md`（フェーズ7 改訂＋バケット1 実装）の続き。
- §2〜4: バケット1（A-10 / A-11 / A-13 / G-4 / G-5 / G-6）のユーザー目視確認。A-10「大きさ」スライダーの
  数値の切り／下限が 13% で頭打ち／ダブルクリックでつまみが戻らない、の3点を修正。
- §5: バケット2 ＝ E-8（用語統一）＋ A-12（レイアウトタブ3セクションのアイコン付き見出し）。モックアップ合意 → 実装。
- §6: バケット3 ＝ F-3（保存フォームの縦ツリー化）＋ F-4（プリセット名の連番）＋ F-5（保存項目の2階層チェック）。
  モックアップ合意 → 実装。
- §7: バケット3.5 ＝ A-14（比率タイルピッカーを Lightroom Web 風に）＋ E-9（サブラベル全廃）＋ A-15（「大きさと
  配置をリセット」に改名＋大きさも戻す）＋ A-16（説明文削除）。モックアップ4版 → 実装。
- コミット: バケット1 = `3db3ab9`、バケット2 = `be7ecb2`、バケット3 = `937fdab`（push 済み）。バケット3.5 は未コミット。

## 1. セッション開始時の同期

- `feature/interactive-editing` はローカル・origin とも `445fbb3`「Phase 7 bucket 1: size slider, Original
  crop, crop-panel UX + fixes」で一致。作業ツリーもクリーン。fast-forward 不要。
- Playwright 環境 `/mnt/c/Users/yello/kakomi-devtools/` は健在（playwright 1.62.1、`phase7b1-test.js` /
  `phase7b1-regress.js` / `phase7b1-shot.js` / `a13-creep-repro.js` / `a13-ratio-spiral-repro.js` /
  `phase0〜1b-test.js`）。フェーズ2〜6 のスモークはこの端末には無い（既知）。

## 2. バケット1 の目視・操作感（ユーザー確認結果）

- **A-10 大きさスライダー** — 向き（右＝大きい）は問題なし。ただし **初期値 90.9%（表示 91%）の切りが悪い**。
  → 初期値ちょうど **90%**、スライダー下限 **10%**、上限 **100%** にしてほしい。
  → （さらに追加）下限 10% だとスライダーが 13% で頭打ちになって見える。内部ロジックの改訂は重いので、
    軽い実装で済むなら **スライダー下限を 15%** にしてほしい（不感帯が出ない値）。
- **A-11「オリジナル」タイル** — 問題なし。
- **A-13 トリミングパネルのクリック → crop モード／Enter で抜ける** — 問題なし。
- **G-4 カスタム比率（フォーカスが飛ばない・⇄ 連打）** — 問題なし。
- **G-5 比率固定トリミングの端で止まる** — 問題なし。
- **G-6 比率タイル連打で枠が縮まない・画像が無限拡大しない** — 問題なし。

「この修正が軽微であれば、修正後確認せずバケット2に進みたい」との指示。A-10 の修正は定数1つ＋
range 属性2つの差し替えなので、Playwright スモークの通過をもって完了扱いにした。

## 3. A-10 の微調整（初期値 90% / 下限 10% / 上限 100%）

見かけ値の変換式を、既定余白 `baseMarginPercent = 5` が**ちょうど 90%** に写るように調整した。
内部 `baseMarginPercent`（0〜300、保存キー）とレイアウト計算（`layoutCalculator`）は無変更。

- **`js/uiController.js`** `marginToSize` / `sizeToMargin`:
  - 旧: `size = 100 / (1 + 2*m/100)` （m=5 → 90.909…、表示 91%）。
  - 新: `size = 100 / (1 + m/45)`、逆変換 `sizeToMargin(s) = 45*(100 - s)/s`。
  - 分母 45 の根拠: `100/(1 + 5/45) = 100/(10/9) = 90` ちょうど。m=0 → 100%、m=300 → 約13.0%。
  - `sizeToMargin` の末尾クランプ（`Math.min(300, …)`、下限 s は `Math.max(1, …)`）は backstop として据え置き。
- **`js/uiDefinitions.js`** `controlsConfig.photoSize`:
  - `{ defaultValue: 90.9090909, min: 14, max: 100, step: 0.5 }` → `{ defaultValue: 90, min: 15, max: 100, step: 0.5 }`。
  - `defaultValue` は `input` が NaN のときのフォールバックにしか使われない（初期表示は
    `marginToSize(state.baseMarginPercent)` 経由）。
- **`index.html`** `#baseMarginPercentValue` の初期テキスト `91%` → `90%`。

### スライダー下限を 10% → 15% に再調整（不感帯の解消。内部ロジックは無変更）

最初 `min: 10` にしたところ、`marginToSize(300) ≈ 13.0%` なのでスライダーを 13%〜10% の帯へ動かしても
内部 `baseMarginPercent` は 300 に頭打ちで張り付く（`sizeToMargin(10) = 405` → クランプ 300）不感帯ができた。
ユーザーから「内部ロジックの改訂は重いので、軽い実装でスライダー下限を 15% に」との指示。

- `photoSize.min` を `10` → **`15`**（range 属性だけ）。`sizeToMargin(15) = 45·85/15 = 255`（≤ 300）なので、
  下限 15% でもスライダー全域が実 `baseMarginPercent`（0〜255）に 1:1 対応し不感帯が消える。
- `marginToSize` / `sizeToMargin` の式・クランプ、レイアウト計算はいずれも無変更。

### 追加バグ修正: 「大きさ」スライダーのダブルクリックでつまみ位置が戻らない

**症状（ユーザー報告）:** 「大きさ」スライダーをダブルクリックすると、値（`baseMarginPercent`）・値表示・
キャンバス内の写真サイズは既定へ戻るのに、スライダーのつまみだけ元の位置に残る。

**原因:** `updateSliderValueDisplays()` は「スライダーに `document.activeElement` フォーカスがあるあいだは
`.value` を書き換えない」ガードを持つ（ドラッグ中に外部からの状態更新でつまみが飛ぶのを防ぐため）。
ダブルクリックは range input にフォーカスを乗せるので、リセットハンドラ `resetPhotoSize` が
`updateSliderValueDisplays()` を呼んでも `.value` が同期されず、span テキスト（ガード外）だけ更新される。

**対処:** `resetPhotoSize` で `updateState` の直後に
`uiElements.baseMarginPercentInput.value = String(marginToSize(marginDefault))` を明示代入（＝ size 90）。
`input` ハンドラが `e.target.value = String(size)` を自分で書くのと同じ扱い。`js/uiController.js` 局所修正のみ。

**検証:** `phase7b1-test.js` に「スライダーを `focus()` した状態で dblclick → `.value` が 90 に戻る」
「リセット後に span が `90%`」の2チェックを追加（**61/61 パス**）。

## 4. 検証（Playwright + Chromium 1.62.1、`python3 -m http.server 8420`）

`kakomi-devtools/phase7b1-test.js` の A-10 アサーションを新仕様へ更新（このスクリプトはリポジトリ非管理の
ローカル専用）:

- `slider range … min 14 / max 100` → `min 15 / max 100`。
- `initial slider value ≈ 90.9` → `= 90`（許容差 0.05）。
- `slider=50 → baseMarginPercent = 50` → `= 45`（`sizeToMargin(50) = 45*50/50 = 45`）。
- dblclick テストを「`focus()` してから dblclick」に変え、`.value` が 90 へ戻る／span が `90%` の2チェックを追加。

結果:

- **`phase7b1-test.js` = 61/61 パス**（A-10 更新＋ダブルクリック2チェック追加。A-11 / A-13 / G-4 / G-5 /
  G-6 / G-6b は無変更で通過。コンソールエラー無し）。
- **`phase7b1-regress.js` = 16/16 パス**（周辺回帰。「大きさ」スライダーの追従は方向判定のみで
  ハードコード無し。margin 20 → slider 69、margin 40 → slider 53 と単調・可逆を確認）。

## 5. バケット2 ＝ E-8（用語統一）＋ A-12（レイアウトタブ3セクションのアイコン付き見出し）

`artifact-design` で実装前モックアップを作成（`kakomi-devtools` ではなく Claude Artifact として公開）。
初版 → ユーザーレビュー → rev.2 で以下を確定してから実装した。

### モックアップレビューで確定したこと

| 論点 | 決定 |
|---|---|
| 節見出しの語 | 「キャンバス」単体（（出力）などの補足なし） |
| 見出しの番号 ①②③ | **付けない** |
| 一言サブ文 | **付けない**（節名とほぼ重複するため） |
| 点線の見え方 | 丸ドット（`stroke-linecap:round` ＋ `stroke-dasharray:0.1 3`） |
| ③ の名前 | **「大きさと配置」**（「配置」単体だと「大きさ」スライダーが名前から漏れる。「余白」の語は A-10 の方針で使わない） |
| アイコンの持ち方 | `index.html` の SVG スプライトに `#i-canvas` / `#i-photo-crop` / `#i-size-place` を追加し `<use>` 参照 |
| タブ分割 | しない（「大きさと配置」が両方にまたがるため。既定方針どおり） |

### E-8 用語統一（表示ラベルのみ。内部 id / `data-section` / 状態キーは不変）

| 場所 | 旧 → 新 |
|---|---|
| レール（`button[data-tab="tab-text"]`） | 文字 → **テキスト** |
| レイアウトタブ `<legend>` 1つ目 | 出力アスペクト比 → **キャンバス** |
| レイアウトタブ `<legend>` 2つ目（`#cropSection`） | トリミング → **写真のトリミング** |
| レイアウトタブ `<legend>` 3つ目 | 余白と配置 → **大きさと配置** |
| プリセット保存フォームのチェック（`#presetSectionChecks`） | 出力フォーマット → **キャンバス**／トリミング → **写真のトリミング**（`data-section` は据え置き） |
| `js/presets/presetStore.js` `PRESET_SECTIONS.label` | `output`: 出力フォーマット → **キャンバス**／`crop`: トリミング → **写真のトリミング**（「保存済み」一覧のメタ表示 `uiController.js:881` に出る） |

- プリセットフォームのチェック行への二重四角アイコン付与は、フォーム全体を縦リスト化する **F-3（バケット3）**
  でまとめて行う（今は語だけ合わせた）。`index.html` にその旨コメントを残した。
- `#cropSection` 内のヒント文も A-13 の実挙動に合わせて「パネルをクリック → プレビューで枠をドラッグ。
  Enter か外側クリックで確定。」に更新（旧: 「…外側クリックか Esc で確定。」）。

### A-12 二重四角アイコン付き見出し

- `index.html` の SVG スプライト（`</defs>` 直前）に3シンボルを追加。線幅は既存スプライト規約に寄せて 1.6〜1.7:
  - `#i-canvas` — 外 rect 実線（1.7）＋内 rect 丸ドット点線（1.6 / `stroke-dasharray="0.1 3"`）。＝キャンバス自体を操作。
  - `#i-photo-crop` — 外 rect 丸ドット点線＋内 rect 実線。＝内側の写真範囲を操作。
  - `#i-size-place` — 外 rect 実線＋やや小さい内 rect を左上へオフセット（実線）。＝両者の関係。
- レイアウトタブの3 `<legend>` を `<legend><svg class="legend-icon" aria-hidden="true"><use href="#i-…"></use></svg>対象名</legend>` に。
- `style.css`: `fieldset legend` を `display:block` → `display:flex; align-items:center; gap:0.4rem`（全 legend 共通。
  単一テキスト子なら見た目は不変）。`fieldset legend .legend-icon { display:block; width:17px; height:17px;
  color:var(--ink-dim) }`（見出し文字と同色・同行）。
- 親＝Kakomi ブランドマーク（`.brand-mark` の二重四角）。同じアイコン2種をプリセットでも使う（F-3 で）。

`editState`・各レンダラ・`layoutCalculator`・`presetStore` のキー構成・`tabManager` は無変更。

### 検証（Playwright + Chromium 1.62.1）

- **新規 `kakomi-devtools/phase7b2-test.js` = 27/27 パス**: レールが「テキスト」／レイアウトタブが厳密に3節で
  見出し＝キャンバス／写真のトリミング／大きさと配置・アイコンが `#i-canvas` / `#i-photo-crop` / `#i-size-place`・
  17px 前後で描画・番号やサブ文が無い・レイアウトタブ全体から「余白」の語が消えた／`#cropSection` id 据え置き＋
  legend 更新／スプライトに3シンボル在／プリセットのチェックラベルが キャンバス・写真のトリミング・テキスト・
  `data-section` キー据え置き／`PRESET_SECTIONS.label` が更新／プリセット保存 → 「保存済み」メタが新ラベル・
  「出力フォーマット」が出ない／リネーム後のレールボタンから `tab-text` ペインが開く／比率ピッカーが populate
  される／「大きさ」スライダー（label 大きさ:、min 15、≈90）健在／コンソールエラー無し。
- **`phase7b2-shot.js`**: `phase7b2-layout.png`（3見出し＋アイコン）／`phase7b2-preset.png`（リネーム済みチェック）。
- **回帰**: `phase7b1-test.js` 61/61・`phase7b1-regress.js` 16/16 変わらず通過。

## 6. バケット3 ＝ F-3 / F-4 / F-5（プリセット保存フォームの作り直し）

`artifact-design` でモックアップを1版公開（Claude Artifact）。確認 Q1〜Q4 をユーザーが**すべて推奨どおり**で
確定 → 実装。バケット1・2 はコミット済み（`3db3ab9` / `be7ecb2`。push 済み）。

### モックアップレビューで確定したこと

| Q | 決定 |
|---|---|
| Q1 フレームの子 | **角丸／線／影 の3つ**（当初の「線・影」に角丸を追加。`cornerStyle` 等の居場所） |
| Q2 テキストの子 | **撮影日／Exif／自由テキスト（すべて）の3固定**。レイヤー単位はバケット4（`textLayers[]` 統合後） |
| Q3「プリセット N」の N | **空き番号の最小**（削除で空いた番号を再利用） |
| Q4 子項目の初期表示 | **全部畳む** |

### F-5: `PRESET_SECTIONS` を木に（`js/presets/presetStore.js`）

- 葉セクション（`output`＝キャンバス／`crop`＝写真のトリミング）は従来どおり `keys` を直接持つ。
- 子を持つ3セクションは `groups`:
  - `background`: `type`(`backgroundType`) / `color`(`backgroundColor`) / `blur`(`imageBlurBackgroundParams`)
  - `frame`: `corner`(`frameSettings.cornerStyle` ほか) / `border`(`frameSettings.border`) / `shadow`(`frameSettings.{shadowEnabled,shadowType,shadowParams}`)
  - `text`: `date`(`textSettings.date`) / `exif`(`textSettings.exif`) / `custom`(`textSettings.customTexts`)
- `keys` の要素は**ドット無しの状態キー**か**ドット付きパス**。`getByPath` / `setByPath` で部分オブジェクトを
  出し入れする。
- `sectionsToKeys(sections, groups)` を木対応に。`groups[sec]` が無い（全グループ選択）セクションは
  `groups` に記録しない＝旧形式互換。一部だけのセクションのみ `usedGroups[sec] = [...]`。
- ドリフト検知ガードは葉キーを `topLevelKey()` でトップレベルに丸めてから `EDITABLE_SETTINGS_KEYS` と突き合わせ。

### F-4: 名前の衝突回避（`resolvePresetName` / `getNextAutoPresetName`）

- 空名 → `プリセット N`（N＝`プリセット 1` から埋まっていない最小）。
- 明示名が既存と衝突 → `${name} 2` `${name} 3` …（空いている最小）。**上書きしない**。
- `savePreset` は `resolvePresetName(name, presets.map(p=>p.name))` を使うよう変更。既定名 `'無題のプリセット'` は廃止。

### F-3: フォームを縦ツリーに（`js/uiController.js` `renderPresetSectionChecks()`）

- `#presetSectionChecks`（`index.html` では空の `<div class="preset-tree">` に。静的 `<label>` 5連を撤去）を
  JS が `PRESET_SECTIONS` から組み立てる。
- 葉行 ＝ `<label class="preset-node-row">`（チェック＋`<svg><use href="#i-canvas | #i-photo-crop">`＋名前）。
- 親行 ＝ `<div class="preset-node-row parent">`（`data-parent` チェック＋アイコン `#i-bg`/`#i-frame`/`#i-text`＋
  名前＋`.preset-node-toggle` シェブロン）、子は `.preset-node-children`（`hidden` 既定）に `data-group` 付き `<label>`。
- **親チェック3状態**: 子change → `syncParent()`（`n>0` で checked、`0<n<total` で indeterminate）。
  親 **click**（既定トグルの後に発火）→ `childCbs.some(c=>!c.checked)` なら全 ON、そうでなければ全 OFF。
- シェブロン click ／ 親行のラベル部分 click（`input` と toggle は除外）で開閉。`aria-expanded` を CSS で
  `rotate(90deg)`（`prefers-reduced-motion` で transition 無効）。
- 保存 ＝ `collectPresetSelection()` が `{ sections, groups }` を集約 → `savePreset(name, sections, groups)`。
  0個なら `alert`。保存後は**名前欄だけクリア＋placeholder 更新、チェック状態は維持**（再 render しない）。
- 削除後は `updatePresetNamePlaceholder()`。プリセット適用・Undo は `initializeUIFromState()` 全再構築で
  ツリーも作り直す（＝チェックは全 ON に戻る）。
- `renderPresetsList()` のメタ表示: 一部グループだけのセクションは「背景（一部）」、`title` に子ラベルの内訳。
  全セクション＋部分グループ無しのときだけ「すべて」。
- `style.css`: `.preset-tree` / `.preset-node-row` / `.preset-node-icon`(16px) / `.preset-node-toggle` /
  `.preset-chevron`(rotate) / `.preset-node-children`(左罫線＋インデント) / `.preset-node-label { text-align:left }`
  （**`fieldset div span { text-align:right }` を打ち消す必要があった**）。旧 `.preset-section-checks` 系は撤去。

### 検証（Playwright + Chromium 1.62.1）

- **新規 `kakomi-devtools/phase7b3-test.js` = 24/24 パス**: 5セクションの並び／output・crop が葉／背景・
  フレーム・テキストが子持ち／葉アイコンが `#i-canvas`・`#i-photo-crop`／子グループ id（type,color,blur ／
  corner,border,shadow ／ date,exif,custom）／子は初期 hidden／トグルで展開／子を外すと親 indeterminate／
  親クリックで全子 ON／placeholder が「プリセット 1」→ 無名2回保存で「プリセット 1」「プリセット 2」→
  placeholder「プリセット 3」／明示名衝突で「作例」「作例 2」（上書きなし）／「プリセット 1」削除で
  placeholder が「プリセット 1」に戻る／背景の子から `color` を外して保存 → `preset.groups.background=['blur','type']`・
  `settings` に `backgroundColor` を含まない／適用すると `backgroundType` は復元・`backgroundColor` は現状維持／
  メタ「背景（一部）」＋ tooltip に内訳／全チェック保存はメタ「すべて」／コンソールエラー無し。
- **回帰**: `phase7b2-test.js` は保存フォームの DOM 変更に合わせてセレクタを更新（`#presetSectionChecks label`
  → `#presetSectionChecks > .preset-node > .preset-node-row`）して 27/27。`phase7b1-test.js` 61/61・
  `phase7b1-regress.js` 16/16 変わらず。
- **`phase7b3-shot.js`**: `phase7b3-collapsed.png`（親5行）／`phase7b3-expanded.png`（全展開＋背景「色」OFF で親 −）。

## 7. バケット3.5 ＝ A-14（比率ピッカー刷新）＋ E-9（サブラベル全廃）＋ A-15 / A-16

バケット3 の後、ユーザーから「レイアウトタブのアスペクト比の箇所が選びにくい（縦横混在）。Lightroom Web の
クロップ UI に寄せたい」という追加フィードバック。モックアップを4版まで回して確定（Lightroom の縦横比リスト
画像の添付を受けて rev.2、サブラベル全廃＋16:10 追加で rev.3、回転ボタンを momentary＋アイコン修正で rev.4）。

### A-14: `js/ui/ratioPicker.js` を「向きを畳んだ比率ファミリー」方式に作り替え

- `RATIO_FAMILIES` を `{ id, p, q, pickers, square?/named?/original?/free?/custom? }` の配列に（`p ≤ q` の縦向き正準。
  配列の並び＝表示順＝Lightroom と同じ「数字が小さい順」。`L判` は数字を持たないので配列内の固定位置＝`4:5` と
  `9:16` の間）。
  - キャンバス: `1:1` `2:3` `3:4` `4:5` `lban`(89:127) `9:16` `10:16` `custom`
  - トリミング: `original` `free` `1:1` `2:3` `3:4` `9:16` `10:16` `custom`
  - 旧 `1.91:1` 削除、`16:10`（`id:'10:16'`）・`3:2`（`id:'2:3'`）追加。
- `createRatioPicker(container, { families, orientation='portrait', onSelect })` に。ピッカーは `orientation` を
  内部 UI 状態で持ち、`labelFor(family, orientation)`（`4×5` の `×` 表記。縦=`p×q`／横=`q×p`。`square`→`1×1`、
  `named`/特殊→`label`）と `shapeFor`（46px 内接、向きに応じ w/h 入替）でタイルを描く。`data-value` は
  ファミリー `id`（向き非依存）。
- 公開ヘルパー: `orientedValueOf(family, orientation)`（→ 保存文字列）、`familyFromValue(value, families)`
  （保存文字列 → `{ family, orientation }`。比率は縦向き正準 `min/max` で 1e-3 許容の数値マッチ）、
  `isOrientableFamily(family)`（1×1・特殊は false）。
- `setValue(value, {keepCustom})`: `familyFromValue` で導出した向きが現在と違えば `renderTileContents()` で
  描き直してから押下反映（G-4 の `keepCustom` は従来どおり）。`toggleOrientation()`: 向き反転＋全タイル描き直し。
- サブラベル（`sub`）は全廃（E-9）。`.ratio-tile-sub` は生成しない。

### uiController / index.html / style.css

- `index.html`: 「キャンバス」「写真のトリミング」の `<legend>` を `<svg.legend-icon>` ＋ `<span.legend-text>` ＋
  回転ボタン `<button id="outputRotateButton" class="ratio-rotate-btn">` / `#cropRotateButton`（`<use href="#i-rotate">`）
  の3要素に。カスタム欄の ⇄ ボタン（`#swapAspectRatio` / `#cropSwapAspectRatio`）を削除。
- スプライトに `#i-rotate`（四角形の右上に回転矢印。Lightroom のクロップ縦横比スワップに寄せる。従来案の
  「四角の上に90°の弧」はゴミ箱ボタンに見えるとの指摘で不採用）。
- `js/uiController.js`:
  - `ensureRatioPickers` の `options:` → `families:`。
  - `rotateRatioPicker(kind)`（モジュール関数）: `picker.toggleOrientation()` → crop は `syncOriginalTileShape` を
    貼り直し → 選択中が普通の比率ファミリーなら `orientedValueOf` で反転文字列を作り `updateState` /
    `applyCropAspect` ＋ カスタム欄の値も更新／カスタム選択中なら幅高さ入力を入替 →
    `updateAspectRatioFromInputs` / `updateCropAspectRatioFromInputs`／`1×1`・フリー・オリジナルは向きだけ反転。
  - `#outputRotateButton` / `#cropRotateButton` の click に配線。旧 ⇄ ボタンのハンドラ（`swapAspectRatioButton` /
    `cropSwapAspectRatioButton`）と `uiElements` エントリを削除。
  - `#cropSection` の click 除外を `INPUT`/`TEXTAREA` → `e.target.closest('input, textarea, .ratio-rotate-btn')` に。
    ※ 最初 `... , button)` にしたら比率タイル（`<button class="ratio-tile">`）まで除外され、A-13 の「トリミングパネル
    （タイル含む）クリックで crop モードへ」が壊れた（ユーザー報告）。回転ボタンだけをクラスで除外する形に修正。
  - `syncCropAspectUI`: `setValue` が向き変更で再描画しうるので `syncOriginalTileShape(state)` を setValue の**後**へ移動。
- `style.css`: `.legend-text { flex:1 }` ＋ `.ratio-rotate-btn`（26px・`:hover` でアクセント・押下状態なし）。
- 向きは常に保存文字列から導出し永続化しない。`editState` のキー・`layoutCalculator`・各レンダラは無変更。

### A-15 / A-16

- **A-15**: `index.html` のボタン文字「配置をリセット」→「大きさと配置をリセット」。`uiController` の
  `#resetPhotoPlacement` ハンドラに `baseMarginPercent: controlsConfig.baseMarginPercent.defaultValue`（5）を追加、
  末尾で `updateSliderValueDisplays()`（スライダーも 90% に同期。ボタンクリックはスライダーにフォーカスしないので
  A-10 の activeElement ガードには当たらない）。
- **A-16**: 「大きさと配置」`<fieldset>` の `<p class="custom-text-drag-hint">写真をドラッグで配置。四隅の■で…</p>` を削除。

### 検証（Playwright + Chromium 1.62.1）

- **新規 `kakomi-devtools/phase7b35-test.js` = 26/26 パス**: 選択肢の並び・`data-value`（キャンバス
  `1:1,2:3,3:4,4:5,lban,9:16,10:16,custom`／トリミング `original,free,1:1,2:3,3:4,9:16,10:16,custom`）／
  ラベルが `×` 表記＆縦向きデフォルト（`1×1,2×3,…,10×16,カスタム`）／`1.91:1` 削除・`10:16` 追加／サブラベル 0 個／
  回転ボタン在・旧 ⇄ ボタン無し／`3×4` クリック→state `3:4`→回転→`4:3`＋タイルが横長（`2×3`→`3×2`）＋ファミリー
  押下維持→回転で戻る／`1×1` 選択中の回転は state 不変／state `16:9` → `9:16` ファミリー押下＋ラベル `16×9`
  （横長導出）／crop も同様／オリジナル選択中の回転は `original` のまま＋ミニ長方形が画像比を保つ／カスタム
  `7:3`→回転で `3:7`＋入力欄も入替／リセットボタン改名／説明文 `<p>` 無し／リセットで `baseMarginPercent`→5・
  `photoViewParams`→中央・スライダー→90／コンソールエラー無し。
- **回帰**: `phase7b1-test.js` の G-4 ⇄ 連打テストを回転ボタン（`#outputRotateButton`）に置換、A-13 に
  「比率タイルのクリックで crop モードへ入る／回転ボタンのクリックでは入らない」の3チェックを追加して 64/64。
  `phase7b1-regress.js` は「16:9 タイル」を「縦長 `9:16` タイル → 回転で `16:9`」に書き換えて 18/18（+2）。
  `phase7b2-test.js` 27/27・`phase7b3-test.js` 24/24 変わらず。
- **`phase7b35-shot.js`**: `phase7b35-portrait.png`（縦向き一覧）／`phase7b35-landscape.png`（両ピッカー回転後）。

## 8. 現状のステータス

- **バケット1（A-10 / A-11 / A-13 / G-4 / G-5 / G-6）完了。ユーザーのブラウザ目視も確認済み**。
- **バケット2（E-8 / A-12）＋ バケット3（F-3 / F-4 / F-5）＋ バケット3.5（A-14 / E-9 / A-15 / A-16）実装・
  Playwright 検証済み**（phase7b1 64/64・phase7b1-regress 18/18・phase7b2 27/27・phase7b3 24/24・phase7b35 26/26）。
  **ユーザーのブラウザ目視は次回**（レイアウトタブの3見出し・用語・プリセットツリー・比率ピッカーの向き
  切り替えと回転ボタンの手触り・「大きさと配置をリセット」）。
- `spec.md`（3.1／5.3 比率タイルピッカーを A-14 対応に全面改稿／7.2／5.19／実装済み一覧）と `docs/roadmap.md`
  （E-8 / A-12 / F-3 / F-4 / F-5 / A-14 / E-9 / A-15 / A-16 を「完了済み」表へ、詳細を（完了）スタブに、
  フェーズ7 バケット2・3・3.5 を完了に、次はバケット4）を更新済み。
- コミット状況: バケット1 = `3db3ab9`、バケット2 = `be7ecb2`、バケット3 = `937fdab`（いずれも push 済み）。
  **バケット3.5 分は未コミット**。
- **次はバケット4 = D-1・D-3（テキスト追加ワークフロー再設計。独立フェーズ・スコープB＝データモデルを
  単一 `textLayers[]`＋`kind` に統合。要モックアップ。既存 localStorage プリセットの移行関数が要る）**。
- その後: バケット5（B-6 登録のみ）→ 積み残し（A-5 / A-4 / A-3 / C-1）。
