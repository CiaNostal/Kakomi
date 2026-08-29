# 開発セッションログ: アクセス解析に Cloudflare Web Analytics を導入（2026-08-29 その8）

`docs/session-log-2026-08-29-7.md`（E-11）の続き。フェーズ7（改訂版）の前向き項目をすべて消化した
あとの新規要望。今回は2件相談し、1件だけ実装した。

## 1. 相談内容

ユーザーからの要望は2つ:

1. **アクセス解析** — GitHub Pages で公開したサイトに「いつ・どれくらいの人が来たか」を知る
   アクセスカウンター的なものが欲しい。Google Analytics は「個人情報をある程度収集する・重い・
   オーバースペック」で不向きと感じている。Cloudflare が気楽そうという印象。
2. **マイルドな公開方法** — feature ブランチを main にマージした瞬間、操作中のユーザーがいきなり
   別物に切り替わるのを避けたい。Web サービスの「新しいバージョンがあります」→クリックで切替の形に
   できないか。

### 相談の結論

- **アクセス解析**: 選択肢（Cloudflare Web Analytics / GoatCounter / 独自ドメイン+Cloudflare プロキシ /
  ヒットカウンター画像 / Google Analytics）と各デメリットを整理して提示。ユーザーは当初 GA を
  検討したが（既存アカウントあり）、GA のデメリット（既定で Cookie 発行・EU 圏では同意バナー必須・
  gtag.js が ~50KB+ と最重量・`google-analytics.com` はブロッカーの筆頭ターゲットで計上漏れ最大・
  GA4 の UI がオーバースペック・データが Google エコシステムに入る）を確認したうえで、
  **Cloudflare Web Analytics で行く**と決定。
- **マイルドな公開**: ユーザーが撤回。「いきなり更新でいい」との判断（Kakomi は個人ツールで
  トラフィックも軽く、編集状態はもともと永続化していないため妥当な割り切り）。対応なし。
  ※ 参考として提示した案（`version.json` ポーリング方式＋`editState` の localStorage オートセーブ、
  サービスワーカー方式、`/next/` サブパスでのステージング）は将来やりたくなったとき用にこのログに残す。

## 2. 実装（Cloudflare Web Analytics のビーコン埋め込み）

ユーザーが Cloudflare ダッシュボードでサイト（ホスト名 `cianostal.github.io`）を登録し、発行された
スニペットを提供。

`index.html` の `<head>`、piexif.js の直後に追加:

```html
<script src="https://unpkg.com/piexifjs"></script>
<!-- Cloudflare Web Analytics（Cookie なし・個人データ収集なし。GitHub Pages 公開ページのアクセス計測用） -->
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js"
    data-cf-beacon='{"token": "572355e12bc345e980bb7a4b272c20a5"}'></script>
<!-- End Cloudflare Web Analytics -->
```

- スニペットは Cloudflare 発行のものをそのまま使用（`type="module"` なので暗黙 defer）。
  可読性のため2行に折り返し、前後にコメント。トークンは改変していない。
- JS 配線・データモデル・レンダラ・`presetStore`・`historyManager` は一切無変更。`index.html` の
  `<head>` に script タグ1つだけ。

### 特性・限界（`spec.md`「アクセス解析」節にも記載）

- Cookie・localStorage・フィンガープリントなし。個人を追跡する ID なし → 同意バナー不要。
- JS ビーコン方式のため、広告／トラッカーブロッカーや JS 無効環境では計上されず、実数より
  少なめに出る（クライアント型アナリティクス全般の宿命）。
- `cianostal.github.io` は他リポジトリの Pages とホスト名を共有するので、`/Kakomi/` の数字は
  Web Analytics のパスフィルタで絞って見る。

## 3. 検証

`kakomi-devtools/cf-analytics-check.js`（今回追加。ローカル専用）で Playwright スモーク:

- `script[src*="cloudflareinsights.com/beacon.min.js"]` が DOM に1つ存在。`data-cf-beacon` の
  トークンが一致。
- `beacon.min.js` が実際にロードされる。
- Kakomi 本体は正常起動（`#previewCanvas` 1個、`[data-tab]` 6個）。
- **アプリ由来のコンソール／ページエラーは無し。**
- ただしローカル（`http://localhost:8420`）では、ビーコンが `https://cloudflareinsights.com/cdn-cgi/rum`
  へ計測データを POST しようとして **CORS エラーが2行**出る（`Access-Control-Allow-Origin` が
  `http://localhost` を返し、ポート付き origin `http://localhost:8420` と一致しないため）。
  **これは本番ドメイン `https://cianostal.github.io`（ポートなし・https）では発生しない想定内の挙動**で、
  アプリの動作には影響しない。`spec.md` にもこの旨を明記した。

回帰スモークは今回未実施（`<head>` に script タグを1つ足しただけで既存 JS に触れていないため）。
必要なら `a3-test.js` ほか従来スイートで確認可能。

## 4. 現状のステータス

- **Cloudflare Web Analytics のビーコンを `index.html` に埋め込み完了。Playwright スモークで
  「タグ存在・トークン一致・ビーコン読み込み・アプリ本体エラーなし」を確認。**
- ドキュメント更新済み: `spec.md`（「外部ライブラリ」の直後に「アクセス解析（Cloudflare Web Analytics）」節を
  追加）、`CLAUDE.md` ステータス行、本ログ。
- **コミット・プッシュはユーザーの指示待ち**（ブランチは `feature/interactive-editing` のまま）。
  公開して初めて計測が始まるので、`main` へのマージ時に一緒に反映される。
- ローカル HTTP サーバー（`python3 -m http.server 8420`）は起動したまま。

## 5. 未着手・次にやること

- **マイルドな公開**は撤回済み（対応なし）。将来やるなら本ログ §1 の案を参照。
- `docs/roadmap.md` の前向き項目は引き続き空。次は `spec.md` 11.5 節の積み残し
  （`frameBorderStyle` 破線の去就／`@media` 1024px 以下の実機確認／Exif タブ拡充）か新規要望を
  ユーザーと相談して決める。
