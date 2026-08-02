# SOAM Media 変更履歴

## 2026-08-02（自動公開の品質停止・再発防止）

- 対象: 定時記事生成、予約公開、article-83・article-84の検索情報。
- 原因: 以前の復旧対象だった記事一覧マーカーではなく、AI sectionの「判断表」と公開処理の固定「判断表」が重複し、品質確認で停止していた。短いsectionを受け取れるJSON条件も残っていた。
- 変更: 固定ブロックの見出しを生成指示から除外し、受信時に重複を安全に正規化する処理と回帰検査を追加。sectionの最低文字数をJSON条件で強制し、生成APIは1公開枠1回のまま維持。
- 変更: 再び消えていた `AUTO:ARTICLE_LIST` マーカーを記事一覧へ復元。隔離した予約公開テストで、記事・記事一覧・トップの更新まで確認。
- 併せて: article-83・article-84のcanonical、Article JSON-LD、SNS共有情報、著者表記、sitemap、主導線情報を補正。本文・タイトル・公開日は維持。
- 検証: media-generation、scheduled-publish、site-links、media-seo（84記事）、media-strategy（84記事）、差分形式がPASS。
- 公開: [`5cceb1d`](https://github.com/soamcreativeai/soam-creative-media/commit/5cceb1d5f147f971414852fc46bc2d5da06471a4) を共有側へ反映し、[run 30727942411](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30727942411) でCloudflare Pages反映・カスタムドメイン確認まで成功。
- 未検証: 次回定時枠での実OpenAI生成のみ。余計な生成費用を出さないため、手動生成は行わない。

## 2026-08-01（アフィリエイトボタン一本化・本番反映済み）

- 対象: 広告掲載67記事・広告カード91件と、今後の記事生成テンプレート。
- 変更: 同じサービスへ向かう「公式情報」ボタンを削除し、「サービス内容を確認する」紹介ボタン1件だけへ統一。
- 再発防止: 広告カード数と紹介ボタン数の一致、重複する公式情報ボタン0件を自動検査。本番確認も主要6ページだけでなく全82記事を対象に変更。
- 公開: 表示変更 `b87470bfe25f0fdae10a2f4c6ff7f46f9243e4fb`、本番検査追加 `a1255bd9f333c1bd4acaa922e9cfeb290b644d65`。[run 30689194303](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30689194303) でCloudflare Pagesへ反映。確認URLは https://078fec4d.soam-creative-media.pages.dev。
- 本番確認: 全82記事で広告カード91件・紹介ボタン91件・重複する公式情報ボタン0件。公開処理内と公開後の直接再検査をPASS。
- 費用: 公開専用処理を使用し、記事生成APIは0回。外部アフィリエイト申請は実施していない。
- 戻し先: `5fa1aa66e9e4895fc3b2e176f0a643611716826f`。

## 2026-08-01（メディア戦略再設計・本番反映済み）

- 対象: 既存82記事、自動記事生成、アフィリエイト導線、SOAM Link接続、トップとテーマ案内の再設計。
- 変更: メディアの使命を「個人で商品・サービスを作り、売り、届ける人の判断と実務を、使える手順へ変える」に固定し、「判断を言葉にする」「一人で回す仕組み」「必要な人へ届ける」の3本柱へ再分類。
- 変更: 全82記事へ対象読者、困りごと、検索意図、判断表、情報確認日、次回見直し日、関連記事、主導線1種類を追加。公開URL・本文・公開日は維持。
- 収益導線: 有効な13案件を記事の具体語まで照合し、67記事をアフィリエイト主導線、3記事をSOAM Link、12記事を関連記事に整理。無関係な旧広告・旧SOAM Link導線は削減。
- 自動生成: 07:00・12:00・20:00の3枠を維持。生成APIは各枠1回だけとし、再生成による費用増を禁止。判断表・出典リンク・確認日・広告表示は手元の処理で付与。
- 追加: 3本柱ハブ、比較・選び方ハブ、目的・対象・費用・導入負担の絞り込み、GA4イベント5種。
- 検証: 82記事監査、generation、scheduled-publish、site-links、media-seo、media-strategy、Pages build、PC・タブレット・スマホ実画面をPASS。
- 公開: 保存ID `fe7637e3be20a3686a37cbdf57ea410735398bee` を共有側へ送り、[run 30687307314](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30687307314) でCloudflare Pagesへ反映。確認URLは https://caed2fac.soam-creative-media.pages.dev。
- 本番確認: トップ、3本柱、比較・選び方、article-82の計6ページをカスタムドメインで確認。使命文、主要導線、戦略情報、アフィリエイト主導線が揃い、伝播後の直接再検査もPASS。
- 費用制御: 今回は公開専用処理を使用し、有料の記事生成APIは呼んでいない。外部アフィリエイト申請も実施していない。

## 2026-08-01

- 対象: Google検索流入・SEO・アフィリエイト収益導線の全体監査。
- 発見: sitemapとcanonicalが `.html` 付きだった一方、Cloudflare Pagesの実URLは拡張子なしへ308移動していた。
- 変更: 公開82記事、記事一覧、固定ページ、sitemapのcanonicalを実URLへ統一。Article構造化データに著者・運営者URL・言語を追加し、全記事へ著者表記とSNS共有情報を付与。今後の自動公開にも同じ要件を追加。
- 検索管理: Google Search Consoleへ正式URLを登録し、Google Analyticsによる所有権確認を完了。sitemap.xmlを送信し、成功・89ページ検出を確認。検索語・表示回数の集計は新規登録による待機中。
- 除外: 保存ページ、未公開診断、管理デモは検索結果に出ない設定を維持。本文・公開日・画像・カテゴリ・アフィリエイト先は変更していない。
- 検証: media-seo（82記事）、scheduled-publish、media-generation、site-links、Cloudflare Pages build、差分形式検査をPASS。

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
