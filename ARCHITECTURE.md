# Kakomi アーキテクチャ・機能ガイド

> リファクタリングおよび機能追加のための開発者向けリファレンス

## 1. アプリケーション概要

**Kakomi** は、写真にフレーム（余白）・背景・テキスト・装飾を追加して JPEG 画像として出力するブラウザベースの画像編集 Web アプリケーションです。

- ビルドツール不要（Vanilla JS + ES6 Modules）
- 外部依存は `piexif.js`（CDN）と Google Fonts のみ
- HTML5 Canvas API でプレビュー描画と高解像度出力を実現
- 元写真の解像度を一切変更しない設計

---

## 2. ファイル構成と役割

```
/
├── index.html                  # 単一のHTMLファイル（全UI構造を含む）
├── style.css                   # Facebook風デザインのスタイルシート
├── spec.md                     # 詳細な技術仕様書
├── Kakomi_refactoring.md       # v2.0 (Fabric.js) リファクタリング計画
│
└── js/
    ├── main.js                 # エントリーポイント・初期化・再描画制御
    ├── stateManager.js         # 中央集約型の状態管理
    ├── uiDefinitions.js        # UIコントロールの設定値・Google Fontsリスト
    ├── uiController.js         # UI要素の参照・イベントリスナー・状態同期
    ├── tabManager.js           # タブ切り替えロジック
    ├── layoutCalculator.js     # レイアウト計算（出力サイズ・写真配置位置）
    ├── canvasRenderer.js       # 描画パイプライン統合（プレビュー＆最終出力）
    ├── backgroundRenderer.js   # 背景描画（単色・拡大ぼかし）
    ├── frameRenderer.js        # フレーム加工（角丸・超楕円・影・縁取り）
    ├── textRenderer.js         # テキスト描画・Google Fontsロード
    ├── fileManager.js          # ファイル読み込み・JPEG ダウンロード
    ├── exifHandler.js          # Exif 情報の抽出・表示・埋め込み
    └── utils/
        └── canvasUtils.js      # Canvas ユーティリティ（Blob変換等）
```

---

## 3. データフロー

アプリケーション全体は以下の一方向データフローで動作します。

```
ユーザー操作（UI）
    │
    ▼
uiController.js ─── イベントハンドラ ───▶ stateManager.updateState()
                                              │
                                              ▼
                                    main.js: requestRedraw()
                                              │
                                              ▼
                                    layoutCalculator.calculateLayout()
                                              │
                                              ▼
                                    canvasRenderer.drawPreview()
                                     ├── backgroundRenderer.drawBackground()
                                     ├── frameRenderer (影・クリップ・縁取り)
                                     ├── 写真本体の描画
                                     └── textRenderer.drawText()
```

**要点:**
- 状態変更は常に `stateManager.updateState()` を経由
- 描画は `main.js` の `requestRedraw()` がトリガー
- `uiController` 内のイベントリスナーがコールバックとして `requestRedraw` を受け取り、状態更新後に呼び出す方式

---

## 4. モジュール詳細

### 4.1 main.js — エントリーポイント

**責務:** アプリケーションの初期化、再描画の統括

| 関数 | 説明 |
|---|---|
| `requestRedraw()` | 状態取得 → レイアウト計算 → 描画 → Exif表示 の一連の処理を実行 |

**初期化処理（DOMContentLoaded）:**
1. Canvas コンテキスト取得
2. `initializeUIFromState()` で UI を状態に同期
3. `setupEventListeners(requestRedraw)` でイベント登録
4. `initializeTabs()` でタブ機能初期化
5. ファイル選択・ドラッグ&ドロップのイベント登録

### 4.2 stateManager.js — 状態管理

**責務:** アプリケーション全体の状態を一元管理

**状態構造 (`editState`) の主要カテゴリ:**

| カテゴリ | キー | 説明 |
|---|---|---|
| 画像情報 | `image`, `originalWidth`, `originalHeight`, `originalFileName` | 読み込んだ画像とメタ情報 |
| レイアウト | `outputTargetAspectRatioString`, `baseMarginPercent`, `photoViewParams` | 出力アスペクト比・余白・写真位置 |
| 背景 | `backgroundType`, `backgroundColor`, `imageBlurBackgroundParams` | 背景の種類と設定 |
| フレーム | `frameSettings` | 角丸/超楕円・影・縁取りの設定 |
| テキスト | `textSettings.date`, `.exif`, `.freeText`, `.freeText2` | 4種のテキストオーバーレイ設定 |
| 出力 | `outputSettings` | JPEG画質・Exif保持フラグ |
| 構図 | `cropSettings` | 内部的な構図調整（UI未公開） |
| 計算結果 | `photoDrawConfig`, `outputCanvasConfig` | レイアウト計算の結果 |
| Exif | `exifData` | piexif.js形式の生Exifデータ |

**主要API:**

| 関数 | 説明 |
|---|---|
| `getState()` | 状態のディープコピーを返す（`image` はコピーせず参照を共有） |
| `updateState(updates)` | ディープマージで状態を更新し、リスナーに通知 |
| `setImage(img, exifData, fileName)` | 新しい画像をセット |
| `addStateChangeListener(listener)` | 状態変更リスナーを登録（現在は未使用） |

**注意点:**
- `getState()` は `structuredClone` を使用（非対応環境は `JSON.parse/stringify` にフォールバック）
- `image`（HTMLImageElement）はコピー不可のため、参照を直接共有

### 4.3 uiDefinitions.js — UI設定定義

**責務:** UIコントロールの設定値とフォント定義を一元管理

**主要エクスポート:**

| 名前 | 説明 |
|---|---|
| `googleFonts` | Google Fontsのリスト（約60フォント）。各エントリに `displayName`, `apiName`, `fontFamilyForCanvas`, `fontWeightForCanvas` |
| `controlsConfig` | スライダー等の `min`, `max`, `step`, `defaultValue` を定義するオブジェクト |

### 4.4 uiController.js — UI制御

**責務:** DOM要素の参照管理、UIイベント処理、状態⇔UI同期

**主要エクスポート:**

| 名前 | 説明 |
|---|---|
| `uiElements` | 全UI要素への参照を保持するオブジェクト |
| `initializeUIFromState()` | `getState()` の値を各UI要素に反映 |
| `setupEventListeners(redrawCallback)` | 全UIイベントリスナーを登録 |
| `updateExifCustomText(redrawCallback)` | Exif項目チェックボックスの変更時にテキストを再生成 |

**内部のイベントリスナー登録パターン:**

```
addNumericInputListener(element, configKey, stateKey, nestedKey, subNestedKey)
  → スライダー/数値入力用。ダブルクリック/ダブルタップでデフォルト値にリセット

addOptionChangeListener(element, stateKey, p1, p2, p3)
  → セレクト/ラジオ/チェックボックス用。フォント選択時は非同期でフォントをロード

addColorInputListener(element, stateKey, nestedKey, subNestedKey)
  → カラーピッカー用
```

**注意点:**
- テキストエリア入力は 300ms のデバウンスを適用
- アスペクト比は `セレクトボックス` と `数値入力フィールド` の双方向同期を実装

### 4.5 layoutCalculator.js — レイアウト計算

**責務:** 状態から出力Canvas寸法と写真の配置座標を計算

**計算フロー:**
1. `cropSettings` に基づいて元画像からの切り出し領域を決定
2. 写真の短辺 (`photoShortSidePx`) を算出（全%指定の基準値）
3. `baseMarginPercent` から最小余白ピクセル値を計算
4. 目標アスペクト比を満たすよう出力Canvas寸法を決定
5. `photoViewParams.offsetX/Y` で可動範囲内の写真配置位置を決定

**返り値:**
```javascript
{
  photoDrawConfig: { sourceX, sourceY, sourceWidth, sourceHeight,
                     destWidth, destHeight, destXonOutputCanvas, destYonOutputCanvas },
  outputCanvasConfig: { width, height },
  actualMargins: { left, right, top, bottom }
}
```

### 4.6 canvasRenderer.js — 描画パイプライン

**責務:** プレビューと最終出力の描画を統括

| 関数 | 説明 |
|---|---|
| `drawPreview()` | プレビュー用（コンテナにフィットするスケーリング付き） |
| `renderFinal()` | 最終出力用（元解像度、OffscreenCanvas使用） |

**描画順序（7レイヤー）:**
1. 背景描画 (`backgroundRenderer`)
2. ドロップシャドウ（有効時のみ）
3. クリッピングパス設定（角丸/超楕円）
4. 写真本体描画
5. インナーシャドウ（有効時のみ）
6. 縁取り
7. テキスト描画

**プレビュー時の特殊処理:**
- コンテナサイズをキャッシュし、canvas リサイズによるレイアウト再計算ループを防止
- 出力解像度からプレビュー解像度へのスケール係数を計算して適用

### 4.7 backgroundRenderer.js — 背景描画

**2つのモード:**
- **単色背景**: `ctx.fillRect()` で塗りつぶし
- **拡大ぼかし背景**: 元画像をCanvas全体をカバーするよう拡大し、CSS filter（`blur`, `brightness`, `saturate`）を適用

### 4.8 frameRenderer.js — フレーム加工

**角の加工:**
- **角丸** (`roundedRect`): `arcTo` で角丸矩形パスを生成
- **超楕円** (`createSuperellipsePath`): 媒介変数表示 `|x/a|^n + |y/b|^n = 1` で第一象限を計算し、対称性で全体を描画

**影:**
- **ドロップシャドウ**: オフスクリーンCanvas に形状を描画 → blur filter → メインCanvasに合成
- **インナーシャドウ**: 全面を影色で塗りつぶし → `destination-out` で写真形状をくり抜き → blur → メインCanvasに合成

**縁取り:** クリッピングパスに沿って `stroke()` を適用

### 4.9 textRenderer.js — テキスト描画

**4種のテキスト要素を描画:**
1. **撮影日** — ExifのDateTimeから日付をフォーマット
2. **Exif情報** — チェックされた項目をテキスト化（ユーザー編集可能）
3. **自由テキスト** — 任意のテキスト（改行対応）
4. **自由テキスト2** — 同上

**Google Fonts ロード:**
- `fontLoadStates` Map でフォントごとの読み込み状態を管理
- CSS `<link>` タグを動的に追加 + `document.fonts.load()` で確実にロード
- 重複読み込み防止済み

**テキスト位置計算:**
- 6ポジション（top-left, top-center, top-right, bottom-left, bottom-center, bottom-right）
- 各ポジションに対して `textAlign` (left/center/right) と `textBaseline` を適切に設定
- X/Y オフセットは写真短辺基準の%で指定

### 4.10 fileManager.js — ファイル管理

| 関数 | 説明 |
|---|---|
| `processImageFile()` | ファイル読み込み → Exif抽出 → 状態セット → UI更新 → 再描画 |
| `handleDownload()` | 最終Canvas生成 → JPEG Blob変換 → Exif埋め込み → ダウンロード |

**出力ファイル名:** `{元ファイル名(拡張子除く)}_kakomi_framed.jpg`

### 4.11 exifHandler.js — Exif処理

- `piexif.js` をグローバル（CDN）で読み込み前提
- JPEG のみ対応
- 対応タグ: Make, Model, DateTime, FNumber, ExposureTime, ISOSpeedRatings, FocalLength, LensModel
- 出力時に元Exifを再埋め込み可能

### 4.12 utils/canvasUtils.js — ユーティリティ

| 関数 | 説明 |
|---|---|
| `drawImageWithPrecision()` | 全座標を `Math.round()` で整数化して描画（モアレ・ボケ防止） |
| `canvasToJpegBlob()` | Canvas/OffscreenCanvas → JPEG Blob |
| `blobToDataURL()` | Blob → DataURL |
| `dataURLToBlob()` | DataURL → Blob |
| `fitCanvasToContainer()` | Canvasをコンテナにフィット |

---

## 5. 主要機能一覧

### 5.1 レイアウト設定タブ

| 機能 | 設定項目 | 値の範囲 |
|---|---|---|
| 出力アスペクト比 | プリセット選択 + カスタム入力 | 1:1, 4:5, 1.91:1, 16:9, 3:4, 89:127(L判), カスタム |
| アスペクト比反転 | ⇄ボタン | 幅と高さを入れ替え |
| 余白 | 写真短辺に対する% | 0–100% (step 0.5) |
| 写真位置 X/Y | スライダー | 0.0–1.0 (step 0.01) |

### 5.2 背景編集タブ

| 機能 | 設定項目 | 値の範囲 |
|---|---|---|
| 背景タイプ | ラジオボタン | 単色 / 拡大ぼかし |
| 単色背景 | 色 | カラーピッカー |
| 拡大ぼかし | 拡大倍率 | 1.0–8.0x |
| | ぼかし強度 | 0–50% |
| | 明るさ | 0–150% |
| | 彩度 | 0–150% |
| | X/Yオフセット | -500–500% |

### 5.3 フレーム加工タブ

| 機能 | 設定項目 | 値の範囲 |
|---|---|---|
| 角スタイル | ラジオボタン | なし / 角丸 / 超楕円 |
| 角丸 | 半径% | 0–50% |
| 超楕円 | 次数 n | 3–40 |
| 影 | 有効/無効 + タイプ | 外側(drop) / 内側(inner) |
| | オフセットX/Y | -25–25% |
| | ぼかし | 0–10% |
| | 効果の範囲 | 0–10% |
| | 色 + 不透明度 | HEX + 0.0–1.0 |
| 縁取り | 有効/無効 | |
| | 線の太さ | 0–3% |
| | 色 | カラーピッカー |

### 5.4 文字入力タブ

4種のテキスト要素（撮影日, Exif情報, 自由テキスト, 自由テキスト2）があり、それぞれ以下を設定可能:

| 設定項目 | 説明 |
|---|---|
| 有効/無効 | 表示のON/OFF |
| フォント | Google Fontsから選択（約60種） |
| サイズ | 写真短辺基準の% |
| 色 | カラーピッカー |
| 透過度 | 0.0–1.0 |
| 位置 | 6箇所（左上/中央上/右上/左下/中央下/右下） |
| オフセットX/Y | %指定 |
| 水平配置 | 左寄せ/中央/右寄せ（Exif, 自由テキストのみ） |

**撮影日固有:** 日付フォーマット選択（YYYY.MM.DD等5種）
**Exif情報固有:** 表示項目のチェックボックス選択、カスタムテキストエリアでの編集

### 5.5 出力タブ

| 機能 | 説明 |
|---|---|
| JPEG画質 | 1–100 |
| ダウンロード | JPEG形式で保存（Exif再埋め込み付き） |

---

## 6. 単位系

全ての%指定は **「構図調整後の写真の短辺のピクセル長」** を基準とします。

```
基準値 = Math.min(写真の描画幅, 写真の描画高さ)
```

これにより、写真のサイズや出力解像度に関わらず、視覚的に一貫した比率で装飾が適用されます。

---

## 7. プレビューと出力の二重描画方式

| | プレビュー | 最終出力 |
|---|---|---|
| Canvas | 画面上の `<canvas>` | OffscreenCanvas（または非表示canvas） |
| 解像度 | コンテナにフィットするサイズ | 元画像の解像度を維持 |
| 呼び出し | `drawPreview()` | `renderFinal()` |
| スケーリング | `scale = previewCanvas.width / outputTotalWidth` | 1:1（スケーリングなし） |

`drawPreview` と `renderFinal` は同じ描画順序・ロジックを共有しますが、座標系のスケーリングのみ異なります。

---

## 8. 技術的な特徴と設計判断

### 8.1 状態管理方式
- **コールバック方式**を採用（`requestRedraw` を各リスナーに渡す）
- `stateManager` にはリスナー機構があるが、無限ループ防止の観点から現在は未使用
- 状態更新 → 即座に `redrawCallback()` を呼ぶシンプルなフロー

### 8.2 描画精度ポリシー
- **写真本体**: `Math.round()` で全座標を整数化（解像度維持が最優先）
- **装飾要素（枠・背景・テキスト）**: 小数値のまま渡し、サブピクセルレンダリングを活用

### 8.3 フォントロード戦略
- 選択時に Google Fonts CSS を動的に `<link>` 追加
- `document.fonts.load()` で描画前にフォントの読み込み完了を保証
- `fontLoadStates` Map で状態管理し、重複リクエストを防止

### 8.4 影の描画技法
- Canvas API にはネイティブの内側シャドウがないため、オフスクリーンCanvas + `destination-out` 合成で実現
- ドロップシャドウも `ctx.shadowXxx` プロパティではなく、オフスクリーンCanvas + blur filter で実装（形状対応のため）

---

## 9. コードの改善ポイント（リファクタリング候補）

コードを通読して把握した、現時点での主な改善ポイントです。

### 9.1 重複コード
- `hexToRgba()` が `frameRenderer.js` と `textRenderer.js` の両方に同じ実装で存在
- `textFree` と `textFree2` のUI登録パターンが完全に重複（自由テキストをN個対応する汎用化の余地）
- `uiController.js` のイベントリスナー登録が非常に長い（約940行）

### 9.2 状態管理
- `resetState()` 内の初期値と `editState` の初期値が別々に定義されており、乖離するリスクがある
- `requestRedraw()` 内で `updateState()` を呼んでいるため、リスナー方式に切り替えると循環呼び出しのリスク

### 9.3 UI定義
- スライダーの `min`, `max`, `step` が HTML には書かれず、JS側 (`uiDefinitions.js`) で設定 → HTMLの可読性が低い
- `uiElements` オブジェクトが巨大（約160行）で、要素の追加が煩雑

### 9.4 描画ロジック
- `drawPreview` と `renderFinal` のロジックがほぼ同一で、スケーリングのみ異なる → 共通化の余地
- コンテナサイズのキャッシュがグローバル変数（`cachedContainerSize`）で管理されている

### 9.5 テスト
- テストコードが存在しない
- `layoutCalculator.js` は純粋関数のため、ユニットテスト導入しやすい

---

## 10. v2.0 リファクタリング計画（参考）

`Kakomi_refactoring.md` に記載されている v2.0 の方向性:

- **Fabric.js** への全面移行（オブジェクト指向のインタラクティブ編集）
- **Tailwind CSS** によるモダンUI
- テキストのドラッグ移動・リサイズ・回転
- プロパティ・インスペクタ（コンテキスト依存のサイドパネル）
- 左サイドバー（ツール）＋ 中央（Canvas）＋ 右サイドバー（プロパティ）のレイアウト

---

## 11. 依存関係マップ

```
main.js
  ├── stateManager.js
  │     └── uiDefinitions.js (googleFonts)
  ├── uiController.js
  │     ├── stateManager.js
  │     ├── uiDefinitions.js (controlsConfig, googleFonts)
  │     └── textRenderer.js (loadGoogleFonts)
  ├── layoutCalculator.js (純粋関数、依存なし)
  ├── canvasRenderer.js
  │     ├── backgroundRenderer.js
  │     ├── frameRenderer.js
  │     ├── textRenderer.js
  │     │     └── uiDefinitions.js (googleFonts)
  │     └── utils/canvasUtils.js
  ├── fileManager.js
  │     ├── stateManager.js
  │     ├── uiController.js
  │     ├── canvasRenderer.js (renderFinal)
  │     ├── exifHandler.js
  │     └── utils/canvasUtils.js
  ├── exifHandler.js (piexif.js をグローバルから参照)
  └── tabManager.js (DOM操作のみ、他モジュール依存なし)
```

---

## 12. 開発時のクイックリファレンス

### 状態を更新してプレビューに反映する

```javascript
import { updateState } from './stateManager.js';
updateState({ baseMarginPercent: 10 });
redrawCallback(); // main.js の requestRedraw
```

### ネストした状態を更新する

```javascript
updateState({ frameSettings: { cornerStyle: 'rounded' } });
updateState({ textSettings: { date: { enabled: true, size: 3 } } });
```

### 新しいUIコントロールを追加する手順

1. `index.html` に HTML 要素を追加
2. `uiDefinitions.js` の `controlsConfig` に設定値を追加
3. `stateManager.js` の `editState` に対応するプロパティを追加
4. `uiController.js` の `uiElements` に要素参照を追加
5. `uiController.js` の `initializeUIFromState()` で初期値同期を追加
6. `uiController.js` の `setupEventListeners()` でイベントリスナーを登録
7. 描画ロジック（該当するレンダラーモジュール）を更新
