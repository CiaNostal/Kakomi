# Kakomi — セッション引き継ぎメモ

Kakomiは、写真にフレーム加工とテキストオーバーレイを追加する、ビルドツール不要のブラウザ完結型画像編集アプリ（Vanilla JS + Canvas API）。元写真の解像度は一切変更せず、周囲に余白・背景・フレーム・テキストを加えて高解像度JPEGを書き出すのがコンセプト。

## まず読むもの

1. **`spec.md`** — 現在の実装仕様。コードを実際に読んで検証しながら書かれており、常に実装と同期させる運用（新しいセッションで仕様を確認したいときはまずここ）。
2. **`docs/session-log-*.md`** — 開発セッションごとの経緯・検討過程・設計判断の記録（`spec.md`が「今どうなっているか」なら、こちらは「なぜそうなったか」）。ファイル名の日付順が古い→新しい。**直近の状況を素早く把握したいときは、日付が最新のログの末尾（「現状のステータス」「未着手の項目」節）を読むのが一番早い。**
3. **`docs/roadmap.md`** — 次にやりたい機能・UI改善の一覧（レイアウト/背景/フレーム/文字/出力/プリセットの各タブ）。**新セッションの出発点はここ**。各項目はまず方向性の相談・モックアップから。

## 現在のブランチとステータス（2026-08-29時点）

- 作業ブランチ: `feature/interactive-editing`（開発版の最新はここ。`main`ではない）。
- **直近の状態**: `docs/roadmap.md` のフェーズ0（小改修: E / A-2 / A-6 / D-2）と、フェーズ1（「開いているタブでプレビュー上のドラッグ／矢印キーの意味を切り替える」共通基盤 `tabManager.getActiveTab()`＋`onTabChange`。C-2＝フレームタブで影オフセットのドラッグ、背景タブでキャンバス全面が背景パン面、軸ロック／原点スナップ／タップ判定の厳格化 等）まで完了・ユーザー確認済み。全部 `docs/session-log-2026-08-29.md`。
- **次セッションはフェーズ2から**: A-1（出力フォーマット UI のグラフィカル化＋位置スライダー撤去）＋ B-1（背景タブのスライダー整理）を `artifact-design` でモックアップ → 実装。F（プリセットの置き場所）も同じ流れ。詳細と残りの項目は `docs/roadmap.md`。
- **履歴**: `docs/session-log-*.md` を日付順に。トリミング再設計＝`-2026-08-28.md`（残タスクは 8 節）、UI 大幅刷新＝`-2026-08-26-3.md`、UI 刷新の積み残し＝`spec.md` 11.5 節。

## 開発環境について

- ビルド不要。`index.html`をES Modulesとして読み込むため`file://`では動かない。ローカルHTTPサーバー（例: `python3 -m http.server 8420`）を立てて開く。
- ブラウザでの動作確認は Playwright + Chromium で行う。この実行環境は **リポジトリには含めない（GitHub で共有しない）ローカル専用ツール**で、ディストロ／OS を汚さない形で作る。**新しいセッションを始めたら、まずこの環境の有無を確認すること**（下記「この端末の構成」のパスを `/mnt/c` 経由で確認する。WSL 側のホームだけ見て「無い」と判断しない）。

### この端末の構成（確認済み）

- **常設フォルダ**: `C:\Users\yello\kakomi-devtools\`（WSL からは `/mnt/c/Users/yello/kakomi-devtools/`）。`node_modules/`（`playwright` 1.62.x）、テストスクリプト（`crop-test.js` / `smoke.js` / `crop-shots.js`）、スクリーンショットが入っている。セッションをまたいで残す（毎回インストール・削除はしない）。
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
