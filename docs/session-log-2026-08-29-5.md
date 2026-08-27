# 開発セッションログ: フェーズ6 の計画（追加の小〜中改修）（実日付 2026-08-27 その2）

`docs/session-log-2026-08-29-4.md`（G-1 根本対処 ＋ フェーズ5 = E-3 情報タブ。ユーザー目視確認済み）の続き。
ユーザーから **フェーズ6（旧「編集機能の拡張」）の前に片付けたい追加改修 6 件** のフィードバックが出たので、
コードを読んで各項目を評価し、方向性を相談して確定した。**このログは計画のみ。実装は次から。**

> ファイル名の日付は連番の一貫性を優先して `-2026-08-29-5.md` としているが、**実際の作業日は 2026-08-27**
> （`docs/session-log-2026-08-29-4.md` 冒頭の注記と同じ事情。git のコミット日時が正）。

## 1. フィードバック 6 件と確定した方針

新旧の関係: 従来の「フェーズ6 ＝ 編集機能の拡張」は **フェーズ7** に繰り下げ。今回の 6 件が新しい **フェーズ6**。
ID は既存の A〜G 体系に連番で追加した。

### E-6. Favicon（小）

- **要望:** 現在の左上アイコンと同じ意匠の favicon。
- **現状:** favicon 未設定。左上アイコンは画像ではなく `.app-brand .brand-mark`（`style.css:76-93`）の CSS 図形
  ＝ `2px` ボーダーの角丸四角＋`::after` の内側の小四角。
- **方針:** 同じ形の SVG を `favicon.svg` として作り、`<link rel="icon" type="image/svg+xml" href="favicon.svg">`
  を `<head>` に追加。単色でライト/ダーク両方で視認できるように（中間色 or SVG 内 `prefers-color-scheme` 分岐）。

### B-5. 背景タイプをアイコンセグメントに（小）

- **要望:** 背景タブの「単色／拡大ぼかし」ラジオを、フレームタブのようにアイコン選択に。
- **現状:** `#tab-background` 先頭の `.radio-group` ×2（`#bgTypeColor` / `#bgTypeImageBlur`、`name="backgroundType"`）。
  フレームタブ「角のスタイル」は `.corner-segmented` ＋ `.segment` ＋ `.segment-icon`（`style.css:1124-`）で再利用可能。
- **方針:** 2 ラジオを `.corner-segmented` 構造へ。`id` / `name` / `value` 据え置きで `uiController.js` の
  `addOptionChangeListener(bgTypeColorRadio, 'backgroundType', 'color')` 等・`toggleBackgroundSettingsVisibility()`
  は無変更。スプライトにアイコン 2 つ追加（塗り＝単色、ぼかし＝拡大ぼかし）。長いラベルはセグメント下で短縮。

### D-5. 文字タブで Delete キー削除（小）

- **要望:** 文字タブがアクティブなとき Delete で選択中テキストを消せるように。
- **現状:** キーボード処理は `canvasInteraction.js` の `keydown`（矢印 nudge と Esc のみ）。自由テキスト削除は
  `removeCustomTextLayer(id)`（`stateManager.js`）＋ `selectionStore.clearSelectionIfMatches` ＋ 再描画。
  選択 id は自由テキスト＝`layer.id`、固定＝`text-date` / `text-exif`。
- **方針:** `keydown` に「`getActiveTab() === 'tab-text'` かつ選択中が `text-date` / `text-exif` 以外
  （＝自由テキスト）かつ `Delete` / `Backspace`」で削除。入力欄フォーカス中（`isEditableElement`）は無視。
  固定レイヤー選択中の Delete は何もしない（削除不可のため）。

### G-2. 別画像ロード時のトリミング崩れ（中・不具合）

- **症状:** 編集中に別写真を読むとパラメータを引き継ぐが、**アスペクト比が異なる画像だとトリミングがずれる**
  （1:1 で切ったのに別比率の画像で 1:1 でなくなる等）。体感値と内部値のズレ。
- **原因:** `cropSettings.rect` は元画像に対する正規化 `{x,y,w,h}`。別画像で同じ `rect` が違う形の領域になる。
  `setImage`（`stateManager.js:287`）は `rect` が「全体」のときだけ比率制約へ再フィットするので部分クロップは生残り。
- **確定方針（選択肢 A ＝ トリミングだけ初期化）:** `setImage` で **すでに画像がある状態での差し替え時**
  （`editState.image` truthy）だけ、`cropSettings.rect` → `FULL_RECT`、`photoViewParams` → `{0.5, 0.5}` にリセット。
  `cropSettings.aspectRatio`（比率制約）は維持 ⇒ 既存の「全体 rect ＋ 比率制約 → `fitRectToAspect`」経路で
  新画像のアスペクトに合わせて作り直される。背景・フレーム・出力比率・余白・テキストは引き継ぐ。初回ロードは何もしない。
- 却下した案: 全パラメータ初期化（B。連続加工で毎回やり直しになる）／トリミングも引き継ぎつつ作り直す（C）。

### E-7. 画像ドロップ領域をキャンバス中央に統合（中）

- **要望:** 「画像ファイル…を選択」の小枠と D&D 受付を一体化。最初はキャンバス中央に D&D ダイアログ、
  画像を読んだら消えて出力フォーマットのキャンバスが出る、という挙動。
- **現状:** 小枠 `.image-loader-container` は `.canvas-container` の上に常時表示。D&D は既に `.canvas-container`
  （`main.js:195-` の `dragover`/`dragleave`/`drop`）。
- **確定方針:**
  - `.image-loader-container` を `.canvas-area` 中央のダイアログとして配置。`state.image` があれば `hidden`、
    無ければ `.canvas-container`（枠・枠線）側を隠す。
  - D&D 受付を `.canvas-area` 全体へ広げる（未読込でキャンバス枠が無くてもドロップ可）。
  - **読み込み後の差し替え手段（選択肢 A）:** 上部バー `.header-actions` に小さな「画像を開く」ボタンを追加し、
    画面外に隠した `#imageLoader`（`type=file`）を click。D&D も引き続き有効。
- 却下した案: D&D のみ（トラックパッド等で不便）／キャンバスクリックでダイアログ（既存の crop 確定＝枠外クリックと干渉）。

### F-2. プリセット保存時に項目を選択（中〜大）

- **要望:** プリセットが何を保存するのか分かりにくい。保存時にチェックボックスで選べるように。
- **現状:** `presetStore.savePreset(name)` が `EDITABLE_SETTINGS_KEYS` を全部保存。`applyPreset` は
  `updateState(settings)` の deep-merge ＝ 保存を部分集合にすれば適用も自然に部分適用になる。
- **確定方針（粒度＝タブ単位の5チェック／適用＝含まれる項目だけ上書き）:**
  - チェックボックス 5 つ: 出力フォーマット（`outputTargetAspectRatioString` ＋ `baseMarginPercent`）／
    トリミング（`cropSettings` ＋ `photoViewParams`）／背景（`backgroundColor` ＋ `backgroundType` ＋
    `imageBlurBackgroundParams`）／フレーム（`frameSettings`）／テキスト（`textSettings`）。既定は全チェック。
    `outputSettings`（JPEG 品質等）を出力フォーマットに含めるかは実装時に確定。
  - `savePreset(name, sections)` が「セクション → キー群」マッピングでサブセットだけ保存。プリセットに含む
    セクション一覧も記録（一覧表示に使える）。
  - `applyPreset` は含まれるキーだけ `updateState`（含まれない項目は今の値のまま。deep-merge の既存挙動で成立）。
  - 旧プリセットは全キー入り＝全セクション扱いで従来どおり（移行不要）。
- 却下した案: もっと細かい粒度（UI が重い・内部キー分割が要る）／2 段階（大分類＋展開）／適用時にも選択（フロー増）。

## 2. 実装順（安いものから）

E-6 → B-5 → D-5 → G-2 → E-7 → F-2。E-6〜D-5 は独立して小さい。G-2 は `setImage` の局所変更＋
Playwright で「別アスペクト比の画像を続けて読んでも 1:1 が保たれる」検証。E-7 は `.canvas-area` の CSS ＋
状態クラス。F-2 は新 UI ＋ `presetStore` の API 変更で一番大きい。

各実装後に `spec.md` と `docs/session-log-*.md` を更新し、完了 ID を `docs/roadmap.md` の「完了済み」表へ移す。

## 3. 現状のステータス

- **フェーズ6 は計画のみ確定。実装は未着手。** `docs/roadmap.md` にフェーズ6 節・各 ID（E-6 / B-5 / D-5 / E-7 /
  F-2 / G-2）の詳細ブロックを追加し、旧フェーズ6 を フェーズ7 に繰り下げ済み。`CLAUDE.md` も更新。
- 次セッション: E-6 から実装に入る。
