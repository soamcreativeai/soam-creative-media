# SOAM Media 現在地

最終更新: 2026-07-27 JST  
対象リポジトリ: `soamcreativeai/soam-creative-media` / `main`

## 本番状態

- 公開サイト: https://media.soam-creative.com/
- 配信基盤: Cloudflare Pages（project: `soam-creative-media`）
- 公開記事数: 63本
- 最新の生成済み記事: `article-62`（`article-63` は既存公開記事として記事一覧・manifestに掲載済み）
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
- 2026-07-27時点の検証: 公開記事63本すべてPASS。

## SOAM Link 導線の正本

- 正式URL: https://link.soam-creative.com/
- 設定の一元管理先: `automation/site-links.json`
- `scripts/site-links.mjs` が設定値を読み、許可されるURLを固定する。
- `scripts/normalize-soam-link-urls.mjs` が旧URL・クエリ付きURLを正式URLへ正規化する。
- `scripts/test-site-links.mjs` が旧URL、クエリ付きURL、トップ・記事一覧の導線を検査する。
- 既存のSOAM Link導線52件（トップ、記事一覧、公開記事50本）を正式URLへ統一済み。
- 既存記事のタイトル、本文の意味、公開日、canonical、Article JSON-LD、画像、カテゴリ、sitemap記事URLは変更していない。

## 直近の本番反映

- 修正commit: [`8469ef8`](https://github.com/soamcreativeai/soam-creative-media/commit/8469ef8) `fix: update SOAM Link destination across media`
- GitHub Actions: [run 30234428427](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30234428427)（成功）
- Cloudflare Pages Deployment ID: `36e92ff2-facc-40e1-a9fe-6b6db2172aa5`
- デプロイURL: https://36e92ff2.soam-creative-media.pages.dev
- 本番確認: トップ、記事一覧、全63公開記事を検査し、SOAM Link導線52件すべてが正式URLであることを確認済み。
- `https://link.soam-creative.com/` はHTTP 200。

## 直近検証結果

- `node scripts/normalize-soam-link-urls.mjs`: 変更対象なし
- `node scripts/test-site-links.mjs`: PASS
- `node scripts/test-media-seo.mjs`: PASS（63 published articles）
- `node scripts/test-publish-scheduled-articles.mjs`: PASS
- workflow YAML構文検査: PASS
- Cloudflare Pages build / deploy: PASS

## 残課題・境界

- `actions/checkout@v4` と `actions/setup-node@v4` のNode 20非推奨警告は、今回の復旧・リンク修正とは別課題として未変更。
- アフィリエイト案件の掲載可否は、activeな案件カタログと記事テーマに基づいて判断する。案件が0件でも有益な記事は生成・公開可能。
- 記事本文、外部サービスの機能・実績・数値は、確認できない事実を追加しない。
