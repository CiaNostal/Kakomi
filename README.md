# Kakomi

写真にフレーム加工とテキストオーバーレイを追加する、ブラウザ完結型の画像編集Webアプリです。ビルドツール不要、Vanilla JavaScript（ES6 Modules）と Canvas API のみで動作します。

元写真の解像度は一切変更せず、指定した構図でクリアに表示したまま、その周囲に余白・背景・フレーム・テキストなどの装飾を加えて高解像度JPEGとして書き出すことをコンセプトにしています。

## 主な機能

- 写真の読み込み（ファイル選択 / ドラッグ&ドロップ）
- レイアウト設定（出力アスペクト比、余白、写真位置調整）
  - プリセット比率に加え、幅/高さを自由入力するカスタム比率にも対応
- 背景編集（単色背景、拡大ぼかし背景）
- フレーム加工（角丸、超楕円、ドロップ/インナーシャドウ、縁取り）
- テキストオーバーレイ（撮影日、Exif情報、自由テキスト×2）
  - 多数のGoogle Fonts（欧文・和文）から選択可能
- Exif情報の抽出・画面表示・出力画像への再埋め込み
- 高解像度JPEG出力（元画像の解像度を維持したまま書き出し）

## 使い方

このアプリは `index.html` から ES Modules（`type="module"`）でスクリプトを読み込むため、`file://` で直接開くとブラウザのCORS制限により正しく動作しません。ローカルにHTTPサーバーを立てて開いてください。

```bash
# リポジトリのルートで、お好みの方法でローカルサーバーを起動
python3 -m http.server 8000
# または
npx serve .
```

起動後、ブラウザで `http://localhost:8000` にアクセスし、写真を読み込んで編集してください。

## 技術スタック

- **HTML5 Canvas API**: 画像描画・加工処理
- **Vanilla JavaScript (ES6 Modules)**: ビルド不要のモジュール構成
- **CSS3**: スタイリング
- **[piexif.js](https://github.com/hMatoba/piexifjs)**（CDN経由）: Exif情報の読み取り・書き込み
- **Google Fonts**: テキスト描画用Webフォント

対応ブラウザは Chrome / Edge / Firefox / Safari の最新版を想定しています（ES6 Modules、Canvas API、FileReader API が必要）。

## プロジェクト構成

```
Kakomi/
├── index.html              # メインHTML（UI構造）
├── style.css                # スタイルシート
└── js/
    ├── main.js              # エントリーポイント
    ├── stateManager.js      # 状態管理
    ├── uiController.js      # UI制御・イベントハンドリング
    ├── uiDefinitions.js     # UI設定値・フォント定義
    ├── tabManager.js        # タブ切り替え
    ├── layoutCalculator.js  # レイアウト計算
    ├── canvasRenderer.js    # 描画統合（プレビュー／最終出力）
    ├── backgroundRenderer.js # 背景描画
    ├── frameRenderer.js     # フレーム加工（角丸・超楕円・影・縁取り）
    ├── textRenderer.js      # テキスト描画
    ├── fileManager.js       # ファイル読み込み・ダウンロード
    ├── exifHandler.js       # Exif情報の抽出・埋め込み
    └── utils/
        └── canvasUtils.js   # Canvas操作ユーティリティ
```

## ドキュメント

各モジュールの詳細な仕様、状態オブジェクトの構造、レイアウト計算アルゴリズム、数値精度に関するポリシーなどは [`spec.md`](./spec.md) を参照してください。

なお [`Kakomi_refactoring.md`](./Kakomi_refactoring.md) は Fabric.js を用いた ver 2.0 への全面リライト計画書であり、現時点では未実装です。現在動作しているアプリの仕様とは別物である点にご注意ください。
