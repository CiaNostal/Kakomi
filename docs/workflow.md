# Kakomi 開発・リリース運用

2026-08-30 のリリース **v2.0** 公開を機に定めた、ブランチ運用とリリース手順のまとめ。
「今どうなっているか」は `spec.md`、「なぜそうなったか」は `docs/session-log-*.md`、
「次に何をやるか」は `docs/roadmap.md`。このファイルは**どう進めるか**を扱う。

---

## 1. ブランチ運用

- **`main` が本番。** GitHub Pages のソースが `main` / ルートに設定されており、
  `main` への push で即デプロイされる（`https://cianostal.github.io/Kakomi/`）。
- 作業は毎回 **`main` から短命トピックブランチ**を切る。
  - 命名: `feat/…`（機能追加）/ `fix/…`（バグ修正）/ `chore/…`（雑務）/ `docs/…`（文書）
    ＋短いケバブ。ロードマップ ID を絡めてもよい（`feat/a17-…`, `fix/g7-…`）。
- **PR → squash マージ → ブランチ削除。**

  ```bash
  git checkout main && git pull
  git checkout -b feat/xxx
  # 実装・コミット（spec.md / docs/session-log-*.md / docs/roadmap.md も更新）
  git push -u origin feat/xxx
  gh pr create --base main
  # → Playwright 検証 → 必要なら本番プレビュー（§4）→ ユーザーのブラウザ目視
  gh pr merge <PR番号> --squash --delete-branch
  git checkout main && git pull
  ```

- 1 項目 = `main` 上の 1 コミットになるので、`git revert <そのコミット>` で
  項目単位に戻せる。**大きめのバッチのときだけマージコミット**にする
  （その場合のロールバックは `git revert -m 1 <マージコミット>`）。
- **ごく小さなドキュメントの誤字修正などは `main` へ直接コミットしてよい。**
  PR フローは、実際の機能追加・バグ修正（プレビュー確認やレビューの価値があるもの）のため。
- コミットメッセージ末尾に `Co-Authored-By` / `Claude-Session` トレーラを付ける
  （`main` 直コミットも同様）。

---

## 2. リリース（公開）手順

`main` は push で自動デプロイされるので、**マージ = 公開**。区切りごとに以下を行う。

1. トピックブランチで `index.html` の版マーカー `<!-- vX.Y -->` を上げる
   （マージ後に `main` で上げてもよい）。
2. PR を `main` にマージ（§1）。マージ push で Pages ビルドが自動起動、約1分でデプロイ。
3. マージ後の `main` にタグを打つ:

   ```bash
   git checkout main && git pull
   git tag -a v2.1 -m "リリース v2.1: 〜" && git push origin v2.1
   ```

   必要なら `gh release create v2.1 --generate-notes` でリリースノートも作れる。
4. 本番 `https://cianostal.github.io/Kakomi/` を開いて版マーカー・変更点を目視確認。
   反映は約1分＋HTML キャッシュ（`Cache-Control: max-age=600`）で最大10分。

### 版番号の方針（ゆるく運用）

- **メジャー**（`v3.0`）… 大きな作り替え・非互換な変更。
- **マイナー**（`v2.1`, `v2.2` …）… 機能追加・改善のまとまり。通常のアップデートはこれ。
- **パッチ**（`v2.1.1`）… バグ修正のみのホットフィックス。

---

## 3. ロールバック

`main` は「現在の状態」を配信するだけなので、ロールバック = `main` を戻すこと。

- **squash マージした項目を戻す**: `git revert <そのコミット> && git push origin main`
- **マージコミットのバッチを戻す**: `git revert -m 1 <マージコミット> && git push origin main`
- どちらも打ち消しコミットが増えるだけで履歴は壊れない。push 後 約1分で旧状態が再デプロイ
  （＋HTML キャッシュ最大10分）。
- 復元ポイントとしてリリースタグ（`v2.0` 等）がある。

例（v2.0 のマージ全体を戻す）:

```bash
git revert -m 1 e8e1f6c && git push origin main
```

---

## 4. 公開前の確認

- **通常はローカルで十分。** ビルド不要。`file://` では動かないのでリポジトリルートで
  HTTP サーバーを立てる: `python3 -m http.server 8420` → `http://localhost:8420/`
  （`?debug=1` で `window.__kakomi*` フックが有効）。静的サイトなのでローカル ≒ 本番。
- **Playwright + Chromium** でブラウザ動作確認（`kakomi-devtools/`。リポジトリ外のローカル
  専用ツール。詳細は `CLAUDE.md`）。
- **本番 URL で先行確認したいとき**（環境ごと確認したい・一時的にリンク共有したい）:

  ```bash
  # ソースを一時的にトピックブランチへ
  echo '{"source":{"branch":"feat/xxx","path":"/"}}' | gh api -X PUT repos/CiaNostal/Kakomi/pages --input -
  # ★ API のブランチ切替だけでは再ビルドされない。手動でビルドを要求する:
  gh api -X POST repos/CiaNostal/Kakomi/pages/builds
  # 確認 → main に戻す
  echo '{"source":{"branch":"main","path":"/"}}' | gh api -X PUT repos/CiaNostal/Kakomi/pages --input -
  ```

---

## 5. GitHub Pages の設定とハマりどころ

- **方式**: 「Deploy from a branch」（legacy / `build_type: legacy`）。ソース `main` / ルート。
  独自ドメインなし、HTTPS 強制。URL は `https://cianostal.github.io/Kakomi/`。
- **1 ブランチしか配信できない。** feature と main を同じ URL で同時には出せない（§4 の切替で対応）。
- **API でソースブランチを変えても自動再ビルドされない。** `gh api -X POST .../pages/builds`
  で手動要求が必要。`main` への push は通常どおり自動ビルド。
- HTML の `Cache-Control: max-age=600`。デプロイ後、既存の訪問者には最大10分ほど旧版が残る。

---

## 6. アクセス解析（Cloudflare Web Analytics）

- `index.html` の `<head>` にビーコン（`beacon.min.js` ＋ token）を埋め込み済み。
  Cookie・localStorage・フィンガープリントなし、個人を追跡する ID なし → 同意バナー不要。
- ダッシュボード: Cloudflare の Web Analytics（ホスト名 `cianostal.github.io`）。
  `cianostal.github.io` は他リポジトリの Pages とホスト名を共有するので、`/Kakomi/` は
  パスフィルタで絞って見る。
- **数字は実数より少なめに出る。** JS ビーコン方式なので、広告／トラッカーブロッカーや
  JS 無効環境では計上されない。
- 詳細は `spec.md`「アクセス解析（Cloudflare Web Analytics）」節、`docs/session-log-2026-08-29-8.md`。

---

## 7. ドキュメント更新のルール

変更を入れたら、実装と同期している状態を保つ:

- **`spec.md`** … 実装仕様。コードを読んで検証しながら更新。
- **`docs/session-log-<実日付>.md`** … 新セッションごとに新規追加（同日2本目以降は `-2` `-3`）。
  ファイル名は **git コミット日時基準の実日付**（`Today's date` を信頼。前のログから推測して足さない）。
- **`docs/roadmap.md`** … 完了項目は「完了済み」表へ1行で移動し、本文を（完了）スタブに（ID は消さない）。
- **`CLAUDE.md`** … 「現在のブランチとステータス」節を更新。

---

## 8. 進め方（`CLAUDE.md` 記載の再掲）

- ユーザーへの応答・コミットメッセージの説明・コード内コメント・ドキュメントはすべて**日本語**。
  識別子・コマンド・テストのアサーション文言は英語のままでよい。
- **編集 UI と用語は Adobe Lightroom Web を参照モデルにする。**
- 各項目はまず**方向性の相談**（必要ならモックアップ）→ 実装 → Playwright 検証 →
  ユーザーのブラウザ目視、の順。**勝手にタスクを始めない。**
- コミット／プッシュはユーザーの指示後。
