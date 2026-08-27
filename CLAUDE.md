# Kakomi — セッション引き継ぎメモ

Kakomiは、写真にフレーム加工とテキストオーバーレイを追加する、ビルドツール不要のブラウザ完結型画像編集アプリ（Vanilla JS + Canvas API）。元写真の解像度は一切変更せず、周囲に余白・背景・フレーム・テキストを加えて高解像度JPEGを書き出すのがコンセプト。

## まず読むもの

1. **`spec.md`** — 現在の実装仕様。コードを実際に読んで検証しながら書かれており、常に実装と同期させる運用（新しいセッションで仕様を確認したいときはまずここ）。
2. **`docs/session-log-*.md`** — 開発セッションごとの経緯・検討過程・設計判断の記録（`spec.md`が「今どうなっているか」なら、こちらは「なぜそうなったか」）。ファイル名の日付順が古い→新しい。**直近の状況を素早く把握したいときは、日付が最新のログの末尾（「現状のステータス」「未着手の項目」節）を読むのが一番早い。**
3. **`docs/roadmap.md`** — 次にやりたい機能・UI改善の一覧（レイアウト/背景/フレーム/文字/出力/プリセットの各タブ）。**新セッションの出発点はここ**。各項目はまず方向性の相談・モックアップから。

## 現在のブランチとステータス（2026-08-28時点）

- 作業ブランチ: `feature/interactive-editing`（開発版の最新はここ。`main`ではない）
- **オンキャンバス・トリミングの再設計（PowerPoint型）が完了・ユーザー確認済み**。写真選択中は `photoEditModeStore` が select / crop モードを持ち、プレビュー上のクリックで切り替える。select＝四隅■ハンドルで余白（符号付き投影方式、上限300%）・本体ドラッグで枠内配置、crop＝四隅L字ハンドル（黒フチ＋白）で切り抜き矩形・本体ドラッグでパン、周辺減光オーバーレイ、Esc／枠外クリックで確定（**出力枠は変えず中の写真だけクロップ**）。`cropSettings` を割合矩形 `{ aspectRatio, rect }` モデルへ移行（旧プリセットは `utils/cropRect.js` の `migrateCropSettings` で移行）。crop モード中は Kakomi のスケール不変性対策として「フリーズフレーム描画」を使う。経緯・設計判断は `docs/session-log-2026-08-28.md`。
- さらに前のセッション（UIの大幅刷新: 文字入力UI統合、タブ→アイコンレール化、配色をスレートブルー系に、等）については `docs/session-log-2026-08-26-3.md` を参照。
- **次セッションは `docs/roadmap.md` の各項目の検討から始める。** トリミングというテーマ内の残タスクは `docs/session-log-2026-08-28.md` 8節、UI刷新の積み残しは `spec.md` 11.5節参照。

## 開発環境について

- ビルド不要。`index.html`をES Modulesとして読み込むため`file://`では動かない。ローカルHTTPサーバー（例: `python3 -m http.server 8420`）を立てて開く。
- **ブラウザでの動作確認手段はセッションの実行環境によって変わる。** 具体的な構築方針は下の「Playwright 検証環境の方針」を参照。過去セッション（`session-log-2026-08-26-2.md`・`-27.md`・`-28.md`）では、Windows側の`node.exe`をWSL2から`cmd.exe /c "cd /d <Windowsパス> && node ...\.js"`で呼び、Windows側から`localhost`のPythonサーバーへはlocalhostフォワードで到達する方法でPlaywright検証を行った。

### Playwright 検証環境の方針（重要・端末非依存）

Playwright + Chromium の実行環境は **このリポジトリには含めない（GitHub で共有されない）ローカル専用ツール**。
他の端末で作業するときも、毎回この方針で「その端末のローカルに、環境を汚さない形で」構築し直すこと。
想定する作業環境は「**WSL 上に Claude と Docker が入っている**」状況（今の端末と同じ）。

**この検証環境は Node.js ベース**である。Playwright の JS API は Node 上でしか動かず、`playwright install` も
Node 自体は持ってきてくれない（ブラウザバイナリだけをダウンロードする）。したがって「Node が入っているか」で
方法が分かれる。

- **原則**: 検証環境はリポジトリ作業ツリーの外に、自己完結した形で作る。WSL の Ubuntu 環境そのものを汚さない
  （この用途で `apt install` でブラウザ用システムライブラリや Node を入れない）。
- **推奨: Docker を使う（ホストに Node が不要）**。公式イメージ `mcr.microsoft.com/playwright:<version>` に
  **Node + 全ブラウザ + 依存ライブラリが同梱**されている。ホストに必要なのは Docker だけ。リポジトリを bind mount し、
  コンテナ内でテスト（必要なら `python3 -m http.server` もコンテナ内で起動）を回す。イメージは Docker のストレージに
  載るだけで WSL/OS のファイルツリーは汚れない。開発完了時に `docker rmi <image>` するだけ。イメージのバージョンは
  `npm install` した `playwright` の版に合わせる。Docker Desktop 併用の場合、対象ディストロ（例 `Ubuntu-24.04`）への
  **WSL インテグレーションを有効化**しておく必要がある。
  ```bash
  # サーバーもテストもコンテナ内で完結させる例
  docker run --rm -v <repoパス>:/work -w /work mcr.microsoft.com/playwright:<version> \
    bash -c "python3 -m http.server 8420 & sleep 1 && node <script>.js"
  ```
- **代替: リポジトリ外の固定フォルダに常設（この端末で採用中）**。Docker が使えないときは、作業ツリー外の専用フォルダ
  （この端末では `C:\Users\yello\kakomi-devtools\`）に `npm i playwright` ＋ `npx playwright install chromium` を
  **一度だけ**入れてセッションをまたいで残す。テストスクリプトもそこに置き、
  `cmd.exe /c "cd /d <そのフォルダ> && node <script>.js"` 等で実行する（WSL からは `localhost` フォワード／
  `host.docker.internal` 等でローカルサーバーへ到達）。従来やっていた「セッションごとにインストール→毎回削除」は行わない。
  - **その端末に Node が無い場合**: システムインストール（`apt install nodejs` 等）はしない。WSL/Linux なら `nvm`
    （`~/.nvm` 配下、削除が容易）か Node 公式 tarball をフォルダ配下に展開してそのシェルだけ PATH を通す。Windows なら
    Node の **zip 版**（MSI ではなく）を同フォルダに解凍し `node.exe` をフルパスで呼ぶ。いずれもフォルダごと消せば残らない。
    ※ この手間を避けたいなら素直に Docker（上記推奨）にする。
- **クリーンアップは Kakomi の開発が全て完了した時点で 1 回だけ**。Docker ならイメージ（`docker rmi`）、常設フォルダ方式なら
  そのフォルダと `~/.cache/ms-playwright`（Windows なら `%LOCALAPPDATA%\ms-playwright`）を削除する。Node を `nvm`
  や tarball で別途入れた場合はそれ（`~/.nvm` 等）も削除する。
- Linux 版 Chromium／Playwright がそのまま使えるセッションならそれを使ってよい。いずれも無く Docker も使えない場合のみ、
  静的検証（構文チェック・DOM id 突合など）だけで実装し、目視確認はユーザーに依頼する。
- **新しいセッションを始めたら、まずこの環境の有無を確認すること。**

- 変更後は必ず `spec.md` と該当する `docs/session-log-*.md`（新規セッションなら新しいログファイルを追加）を更新し、実装との整合を保つこと。
