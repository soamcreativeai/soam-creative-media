# SOAM Media 変更履歴

## 2026-08-01

- 対象: トップページのタブレット表示崩れ。
- 原因: タブレット幅でPC用の3列カード配置が維持され、長い記事タイトルがカード内で詰まっていた。
- 変更: 1,100px以下を2列、700px以下を1列とする表示切替を追加。カードの最小幅と長い日本語見出しの折り返しを安定化し、CSSの版番号で旧ブラウザキャッシュを更新するようにした。
- 検証: PC・タブレット・スマホの実画面で、横スクロール・カード見切れ・文字重なりがないことを確認。site-links、media-seo（82記事）、scheduled-publish、media-generation、Cloudflare Pages buildをPASS。
- 公開: Cloudflare Pagesへ反映。デプロイURLは https://48e6f3f8.soam-creative-media.pages.dev。カスタムドメインでPC・タブレット・スマホの全表示を確認済み。

## 2026-08-01

- 対象: メディア名称の統一。
- 決定: 正式名称を **SOAM MEDIA** とし、トップ、記事一覧、全記事の表示名・ページ題名・検索用発信者名、固定ページ、今後の記事生成テンプレートを旧 `SOAM CREATIVE MEDIA` / メディア名としての `SOAM CREATIVE` から変更。
- 維持: 著作権表示の会社名と、SOAM CREATIVE公式X・SOAM Linkの固有名称は変更していない。
- 再発修復: article-81追加時に失われた記事一覧の `AUTO:ARTICLE_LIST` マーカーを復元。
- 検証: scheduled-publish、site-links、media-seo（82記事）、media-generation、差分形式検査をPASS。
- 公開: [run 30683269194](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30683269194) が成功し、article-82を含むサイトをCloudflare Pagesへ反映。デプロイURLは https://3951b2e9.soam-creative-media.pages.dev。カスタムドメインでトップ、記事一覧、article-82の公開項目を確認済み。

## 2026-08-01

- 対象: 自動記事公開停止の復旧とアフィリエイトリンク運用の再開。
- 原因: 記事一覧を旧方式で書き戻す処理が、予約公開に必要な `AUTO:ARTICLE_LIST` 更新マーカーを削除していた。記事生成後の予約公開テストで停止したため、article-68以降はCloudflare Pagesへ反映されなかった。
- 変更: 記事一覧マーカーを復元。記事68〜79のcanonical・Article JSON-LD・記事一覧・sitemapを79記事の正本へ整合させた。
- 変更: 有効な提携先のうち記事テーマに一致する13案件をアフィリエイトカタログへ登録し、リンク未設置かつ適合する28記事へ広告である旨を明記して追加した。広告リンクがない記事は31本から3本（暮らしの一般記事）へ減少。今後のためにテーマ一致時のみ挿入する同期処理を追加。
- 検証: scheduled-publish、site-links、media-seo（80記事）、media-generation、差分形式検査をPASS。
- 公開: article-80を生成し、article-68〜80をCloudflare Pagesへ反映。 [run 30680033658](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30680033658) が成功し、article-80のtitle、h1、canonical、Article JSON-LD、記事一覧、sitemap、拡張子なしURLをカスタムドメインで確認した。デプロイURLは https://5b7a6edc.soam-creative-media.pages.dev。
- 改善: 配信直後の古い内容を公開済みと判定しないよう、公開確認は検索情報を含む正しい記事内容がそろうまで待機する方式へ変更。

## 2026-07-28

- 対象: 予約公開ワークフロー復旧。
- 変更: `articles/index.html` に `AUTO:ARTICLE_LIST` マーカーを追加し、記事一覧を自動更新可能にした。
- 同時反映: SEO正規化でarticle-65・article-66、記事一覧canonical、sitemapを補正。
- 検証: site-links、media-seo（66記事）、scheduled-publish、media-generationがPASS。
- 公開: `f584cd4` をmainへpushし、GitHub Actions [run 30321297239](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30321297239)で生成・SEO・予約公開テスト・Cloudflare Pagesデプロイを確認。
- 追加公開: `article-67` を公開。カスタムドメインでtitle、h1、canonical、Article JSON-LD、記事一覧、sitemap、拡張子なしURLを検証済み。デプロイURLは https://ebc01111.soam-creative-media.pages.dev。
- 初回のカスタムドメイン確認は伝播中に失敗したが、再実行でPASS。Node 20非推奨警告は別課題として残置。
- 戻し先: push直前のmain commit `f61b3ad`。
