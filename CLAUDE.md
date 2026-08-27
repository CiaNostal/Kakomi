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
- **ブラウザでの動作確認手段はセッションの実行環境によって変わる。** `chromium-cli`・Linux版Playwrightが使えないセッションでは、構文チェックやDOM id突合などの静的検証のみで実装し、実際の目視確認はユーザーに都度依頼する運用にする。ただし、Windows側の`node.exe`（`/mnt/c/Program Files/nodejs/node.exe`等）がWSL2から見える環境なら、`session-log-2026-08-26-2.md`・`session-log-2026-08-27.md`と同じ方法（`cmd.exe /c "cd /d <Windowsパス> && node ...\.js"`で実行。Windows側から`localhost`のPythonサーバーへはlocalhostフォワードで到達できる）でPlaywright検証が可能なので、まずこれが使えないか試すこと。**新しいセッションを始めたら、まずブラウザ操作ツールの有無を確認すること。**
- **Playwright + Chromiumの常設運用（2026-08-27にユーザーと合意）**: 従来はセッションごとにWindows側の一時フォルダへインストールし、検証後に`node_modules`・`AppData\Local\ms-playwright`を毎回削除していたが、この方式はやめた。現在は `C:\Users\yello\kakomi-devtools\`（一時フォルダではなく固定フォルダ）に**一度だけ**インストールし、セッションをまたいで残す。テストスクリプトもこのフォルダに置き、`cmd.exe /c "cd /d C:\Users\yello\kakomi-devtools && node <script>.js"` で実行する。**クリーンアップはKakomiの開発が全て完了した時点で1回だけ**行い、そのとき `C:\Users\yello\kakomi-devtools\` と `%LOCALAPPDATA%\ms-playwright` を削除する。WSL側のUbuntu環境は汚さない（この用途でapt・Nodeを入れない）方針。Docker Desktopは併用しているがUbuntu-24.04へのWSLインテグレーションが未有効のため、WSL内から`docker`は現状使えない。
- 変更後は必ず `spec.md` と該当する `docs/session-log-*.md`（新規セッションなら新しいログファイルを追加）を更新し、実装との整合を保つこと。
