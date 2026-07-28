# SOAM Media 現在地

最終更新: 2026-07-28 JST
対象リポジトリ: `soamcreativeai/soam-creative-media` / `main`

## 本番状態

- 公開サイト: https://media.soam-creative.com/
- 配信基盤: Cloudflare Pages（project: `soam-creative-media`）
- 公開記事数: 67本
- 最新の生成済み記事: `article-67`
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
- 2026-07-28時点の検証: 公開記事67本すべてPASS。

## SOAM Link 導線の正本

- 正式URL: https://link.soam-creative.com/
- 設定の一元管理先: `automation/site-links.json`
- `scripts/site-links.mjs` が設定値を読み、許可されるURLを固定する。
- `scripts/normalize-soam-link-urls.mjs` が旧URL・クエリ付きURLを正式URLへ正規化する。
- `scripts/test-site-links.mjs` が旧URL、クエリ付きURL、トップ・記事一覧の導線を検査する。
- 既存のSOAM Link導線52件（トップ、記事一覧、公開記事50本）を正式URLへ統一済み。
- 既存記事のタイトル、本文の意味、公開日、canonical、Article JSON-LD、画像、カテゴリ、sitemap記事URLは変更していない。

## 直近の本番反映

- 修正commit: [`4f20393`](https://github.com/soamcreativeai/soam-creative-media/commit/4f20393) `content: publish article-67 依頼のすれ違いを減らす、最初の確認メモの作り方`
- ワークフロー修正commit: [`f584cd4`](https://github.com/soamcreativeai/soam-creative-media/commit/f584cd4) `fix: restore media article index workflow markers`
- GitHub Actions: [run 30321297239](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30321297239)（成功）
- Cloudflare PagesデプロイURL: https://ebc01111.soam-creative-media.pages.dev
- 本番確認: article-67のtitle、h1、canonical、Article JSON-LD、記事一覧、sitemap、拡張子なしURLをカスタムドメインで検証済み。
- `https://link.soam-creative.com/` はHTTP 200。

## 直近検証結果

- `node scripts/normalize-soam-link-urls.mjs`: 変更対象なし
- `node scripts/test-site-links.mjs`: PASS
- `node scripts/test-media-seo.mjs`: PASS（67 published articles）
- `node scripts/test-publish-scheduled-articles.mjs`: PASS
- workflow YAML構文検査: PASS
- Cloudflare Pages build / deploy: PASS

## 2026-07-28 ワークフロー復旧

- `articles/index.html` に `AUTO:ARTICLE_LIST` 更新マーカーを追加し、予約公開テストが記事一覧を更新できる状態に修正。
- `article-65.html`・`article-66.html` のcanonical・Article JSON-LD、記事一覧canonical、sitemapを生成手順で補正。
- ローカル検証: site-links、media-seo（66記事）、scheduled-publish、media-generationをPASS。
- 本番Actionsの失敗原因は、[run 30271254182](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30271254182) の `ARTICLE_LIST` マーカー欠落。
- 本番push後の[run 30321297239](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30321297239)でarticle-67を公開し、Cloudflare Pagesへデプロイ。
- 初回のカスタムドメイン確認は伝播中に失敗したが、再実行で全検証がPASS。

## 残課題・境界

- `actions/checkout@v4` と `actions/setup-node@v4` のNode 20非推奨警告は、今回の復旧・リンク修正とは別課題として未変更。
- アフィリエイト案件の掲載可否は、activeな案件カタログと記事テーマに基づいて判断する。案件が0件でも有益な記事は生成・公開可能。
- 記事本文、外部サービスの機能・実績・数値は、確認できない事実を追加しない。
