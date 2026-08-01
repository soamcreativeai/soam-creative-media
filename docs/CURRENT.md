# SOAM Media 現在地

最終確認・引き継ぎ更新: 2026-08-01 JST
対象リポジトリ: `soamcreativeai/soam-creative-media` / `main`

## 本番状態

- 公開サイト: https://media.soam-creative.com/
- 配信基盤: Cloudflare Pages（project: `soam-creative-media`）
- リポジトリ収録記事数: 82本
- 本番確認済みの記事数: 82本（`article-82` まで）
- `article-68`〜`article-82` はCloudflare Pagesへ反映済み。article-82はカスタムドメインで公開項目を確認済み。
- 記事自動生成workflow: `Generate and publish SOAM Media article`
- 定時実行: JST 07:00 / 12:00 / 20:00

## 記事生成・公開フロー

- 生成APIは OpenAI Responses API（`POST https://api.openai.com/v1/responses`）を使用する。
- 認証は `Authorization: Bearer`。APIキー、モデル、ベースURLはGitHub Actions Secretから注入する。
- AIは厳格なJSONを返し、HTMLはローカルのテンプレート変換で生成する。AIにHTMLや外部URLを自由生成させない。
- 生成前にOpenAI接続と設定済みモデルを確認し、失敗時は記事・一覧・サイトマップを変更しない。
- 品質、重複、禁止表現、SEO、予約公開テストを通過した場合のみ公開対象をcommit・pushする。
- 同じslotがすでに記録済みの場合は安全に no-op となる。no-opでもSEO・リンク検査・Cloudflare Pagesデプロイは実行できる。

## SEOの正本

- 各公開記事は canonical を1件だけ持つ。
- canonical形式: `https://media.soam-creative.com/articles/article-XX.html`
- Article JSON-LD の `mainEntityOfPage` / `url` はcanonicalと一致させる。
- 生成・公開前に `scripts/test-media-seo.mjs` が全公開記事を検査する。
- 2026-08-01時点の自動検査: 82記事すべてPASS。article-82をカスタムドメインで確認済み。

## SOAM Link 導線の正本

- 正式URL: https://link.soam-creative.com/
- 設定の一元管理先: `automation/site-links.json`
- `scripts/site-links.mjs` が設定値を読み、許可されるURLを固定する。
- `scripts/normalize-soam-link-urls.mjs` が旧URL・クエリ付きURLを正式URLへ正規化する。
- `scripts/test-site-links.mjs` が旧URL、クエリ付きURL、トップ・記事一覧の導線を検査する。
- 既存のSOAM Link導線52件（トップ、記事一覧、公開記事50本）を正式URLへ統一済み。
- 既存記事のタイトル、本文の意味、公開日、canonical、Article JSON-LD、画像、カテゴリ、sitemap記事URLは変更していない。

## 直近の本番反映

- 復旧commit: [`1216920`](https://github.com/soamcreativeai/soam-creative-media/commit/1216920) `fix: restore media publishing and affiliate links`
- 公開確認待機修正: [`9a61ba6`](https://github.com/soamcreativeai/soam-creative-media/commit/9a61ba6) `fix: wait for media publication propagation`
- GitHub Actions: [run 30680033658](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30680033658)（成功）
- Cloudflare PagesデプロイURL: https://5b7a6edc.soam-creative-media.pages.dev
- 本番確認: article-80のtitle、h1、canonical、Article JSON-LD、記事一覧、sitemap、拡張子なしURLをカスタムドメインで検証済み。
- `https://link.soam-creative.com/` はHTTP 200。

## 2026-08-01 名称統一の本番反映

- [run 30683269194](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30683269194) が成功。article-82を通常どおり生成・公開し、名称統一をCloudflare Pagesへ反映した。
- デプロイURL: https://3951b2e9.soam-creative-media.pages.dev
- カスタムドメインでトップ、記事一覧、article-82のtitle、h1、canonical、Article JSON-LD、記事一覧、sitemap、拡張子なしURLを確認済み。

## 2026-08-01 レスポンシブ表示の調整

- 対象: トップページの新着記事カード。
- 原因: 940pxより広いタブレット幅ではPC用の3列配置が使われ、カード幅に対して長い記事タイトルが詰まりやすかった。
- 変更: 1,100px以下を2列、700px以下を1列へ切り替えた。カードが内容に押し広げられない指定と、長い日本語タイトルの折り返し指定も追加した。CSSの配信更新時に旧ブラウザキャッシュを使わないよう、トップのCSS参照に版番号を付けた。
- ローカル確認: PC幅・タブレット幅・スマホ幅で、横スクロールなし・カードの見切れなし・文字の重なりなしを確認。site-links、media-seo（82記事）、scheduled-publish、media-generation、Cloudflare Pages buildをPASS。
- 本番反映: Cloudflare PagesデプロイURL https://48e6f3f8.soam-creative-media.pages.dev。カスタムドメインでPC・タブレット・スマホの全表示を確認済み。

## 直近検証結果

- `node scripts/normalize-soam-link-urls.mjs`: SOAM Link URLの正規化を実施
- `node scripts/test-site-links.mjs`: PASS
- `node scripts/test-media-seo.mjs`: PASS（82 published articles）
- `node scripts/test-publish-scheduled-articles.mjs`: PASS
- レスポンシブ表示: PC / タブレット / スマホの実画面確認でPASS（横スクロール、見切れ、文字重なりなし）
- workflow YAML構文検査: PASS
- Cloudflare Pages build / deploy: PASS

## 2026-07-28 ワークフロー復旧

- `articles/index.html` に `AUTO:ARTICLE_LIST` 更新マーカーを追加し、予約公開テストが記事一覧を更新できる状態に修正。
- `article-65.html`・`article-66.html` のcanonical・Article JSON-LD、記事一覧canonical、sitemapを生成手順で補正。
- ローカル検証: site-links、media-seo（66記事）、scheduled-publish、media-generationをPASS。
- 本番Actionsの失敗原因は、[run 30271254182](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30271254182) の `ARTICLE_LIST` マーカー欠落。
- 本番push後の[run 30321297239](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30321297239)でarticle-67を公開し、Cloudflare Pagesへデプロイ。
- 初回のカスタムドメイン確認は伝播中に失敗したが、再実行で全検証がPASS。

## 2026-08-01 自動公開停止の原因と復旧準備

- `article-68`〜`article-79` の生成内容・HTML・記事一覧・manifestはリポジトリに追加済み。
- 公開停止の直接原因は、`articles/index.html` の `AUTO:ARTICLE_LIST:START/END` 更新マーカーが消えたこと。2026-07-28に一度復旧した後、旧方式の記事一覧更新が一覧全体を書き戻し、マーカーを再び削除した。
- その結果、記事の生成・保存は進んだが、予約公開テストで `ARTICLE_LIST の更新マーカーが見つかりません。` と停止し、その後のCloudflare Pages反映まで到達しなかった。
- 記事一覧マーカーを復元し、予約公開・SOAM Link・SEO・記事生成の検査を通過後、article-68〜80をCloudflare Pagesへ反映した。
- 初回のarticle-80反映では、配信直後の古い内容を公開確認が取得して失敗扱いになった。本文は反映済みだったため、公開確認を「HTTP応答がある」だけでなくtitle・h1・canonical・Article JSON-LDが揃うまで待つ方式へ修正し、成功runで再確認した。

## アフィリエイトリンクの運用

- A8で有効な提携21件、もしもで提携36件を確認した。案件カタログには登録がなかったため、自動生成時に選べる案件が0件だった。
- 記事テーマに適合する13案件をカタログへ登録し、既存記事のうちリンク未設置かつテーマが一致する28本に「関連サービスについて」を追記した。広告リンクがない記事は31本から3本（暮らしの一般記事）へ減少した。
- 自動処理 `scripts/sync-affiliate-links.mjs` は、今後の公開前にもテーマ一致・有効案件のみを最大2件挿入する。診断・恋愛・占いなど、適合案件を確認できていない記事には入れない。

## 2026-08-01 名称統一

- メディアの正式名称は **SOAM MEDIA**。旧表記の `SOAM CREATIVE MEDIA` と、記事・一覧でメディア名として表示されていた `SOAM CREATIVE` をSOAM MEDIAへ統一する。
- 対象はトップ、記事一覧、全記事のヘッダー・ページ題名・検索用発信者名、固定ページ、今後の記事生成テンプレート。
- 著作権表示の会社名 `SOAM CREATIVE`、SOAM CREATIVE公式Xへの既存導線、SOAM Linkの運営主体表記は別の固有名称のため変更しない。
- article-81追加で記事一覧の更新マーカーが再度失われていたため、名称統一と同時に `AUTO:ARTICLE_LIST` マーカーを復元し、予約公開テストをPASSした。

## 残課題・境界

- `actions/checkout@v4` と `actions/setup-node@v4` のNode 20非推奨警告は、今回の復旧・リンク修正とは別課題として未変更。
- アフィリエイト案件の掲載可否は、activeな案件カタログと記事テーマに基づいて判断する。案件が0件でも有益な記事は生成・公開可能。
- 記事本文、外部サービスの機能・実績・数値は、確認できない事実を追加しない。
- Node 20非推奨警告は出るが、今回のrunでは非停止。別課題として維持する。
