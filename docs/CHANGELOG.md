# SOAM Media 変更履歴

## 2026-07-28

- 対象: 予約公開ワークフロー復旧。
- 変更: `articles/index.html` に `AUTO:ARTICLE_LIST` マーカーを追加し、記事一覧を自動更新可能にした。
- 同時反映: SEO正規化でarticle-65・article-66、記事一覧canonical、sitemapを補正。
- 検証: site-links、media-seo（66記事）、scheduled-publish、media-generationがPASS。
- 公開: 本番push後にGitHub ActionsとCloudflare Pagesを確認する。
- 戻し先: push直前のmain commit `f61b3ad`。
