# SOAM Media 変更履歴

## 2026-07-28

- 対象: 予約公開ワークフロー復旧。
- 変更: `articles/index.html` に `AUTO:ARTICLE_LIST` マーカーを追加し、記事一覧を自動更新可能にした。
- 同時反映: SEO正規化でarticle-65・article-66、記事一覧canonical、sitemapを補正。
- 検証: site-links、media-seo（66記事）、scheduled-publish、media-generationがPASS。
- 公開: `f584cd4` をmainへpushし、GitHub Actions [run 30321297239](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30321297239)で生成・SEO・予約公開テスト・Cloudflare Pagesデプロイを確認。
- 追加公開: `article-67` を公開。カスタムドメインでtitle、h1、canonical、Article JSON-LD、記事一覧、sitemap、拡張子なしURLを検証済み。デプロイURLは https://ebc01111.soam-creative-media.pages.dev。
- 初回のカスタムドメイン確認は伝播中に失敗したが、再実行でPASS。Node 20非推奨警告は別課題として残置。
- 戻し先: push直前のmain commit `f61b3ad`。
