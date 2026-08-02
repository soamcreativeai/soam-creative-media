# SOAM Media 現在地

最終確認・引き継ぎ更新: 2026-08-01 JST
対象リポジトリ: `soamcreativeai/soam-creative-media` / `main`

## 2026-08-02 自動公開の再発防止（本番反映・確認済み）

- 2026-08-02 07:46 JST の定時処理 [run 30721985176](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30721985176) は、記事一覧マーカーではなく、生成結果の品質確認で停止した。
- 直接原因: AIが返した section 見出し「判断表」と、公開処理が固定で追加する「判断表」が二重になった。加えて、短すぎる section をJSONの受け取り条件で防げていなかった。
- 修正: 固定ブロックの見出しをAIへ禁止し、万一含まれた場合も別の見出しへ正規化する。section の見出し重複を解消し、各段落の最低文字数をJSON条件へ追加した。**生成APIは1公開枠につき1回のまま**で、再生成は追加しない。
- 併発していた停止要因: `articles/index.html` から予約公開用の `AUTO:ARTICLE_LIST` マーカーが再び失われていたため復元した。隔離した予約公開テストで、記事・記事一覧・トップの更新までPASS。
- 直近の手動追加 article-83 / article-84 は、本文・タイトル・公開日を維持したまま、canonical、Article JSON-LD、SNS共有情報、著者表記、sitemap、主導線の共通ルールを補正した。
- ローカル検証: media-generation、scheduled-publish、site-links、media-seo（84記事）、media-strategy（84記事）、差分形式がPASS。
- 保存ID: [`5cceb1d`](https://github.com/soamcreativeai/soam-creative-media/commit/5cceb1d5f147f971414852fc46bc2d5da06471a4)。
- 本番反映: [run 30727942411](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30727942411) が、検査・Cloudflare Pages反映・カスタムドメイン確認まで成功。
- 未検証: 次回定時枠での実際のOpenAI生成のみ。追加料金が発生する手動生成は行わず、通常の定時枠で確認する。

## 2026-08-02 予約記事の自動公開を復旧（共有側反映前）

- 12時の確認で、公開専用workflow `Publish scheduled articles` は `workflow_dispatch`（手動実行）だけで、定時起動が設定されていないことを確認した。
- 変更: 生成はJST 07:02 / 12:02 / 20:02、予約記事の公開専用処理はJST 07:07 / 12:07 / 20:07に設定。毎時ちょうどの集中を避け、同じ処理が重ならないようにした。
- 変更: 公開専用処理は、記事を公開した場合だけCloudflare Pagesへ反映し、カスタムドメインの公開確認まで実行する。公開対象がなければ何も変更しない。
- 検証: generation、scheduled-publish、site-links、media-seo（84記事）、media-strategy（84記事）、差分形式がPASS。
- 未検証: 共有側反映後の次回20時枠での定時起動・公開。

## 2026-08-01 アフィリエイトボタン一本化（本番確認済み）

- 状態: **全82記事の本番反映・カスタムドメイン確認まで完了**。
- 広告掲載67記事・広告カード91件について、同じサービスへ向かう「公式情報」ボタンを外し、「サービス内容を確認する」紹介ボタン1件だけへ統一。
- 今後の記事生成も同じ1ボタン形式とし、広告カード数と紹介ボタン数が一致しない場合や、重複する公式情報ボタンがある場合は検査で停止する。
- 本番保存ID: `a1255bd9f333c1bd4acaa922e9cfeb290b644d65`（表示変更 `b87470bfe25f0fdae10a2f4c6ff7f46f9243e4fb`、本番全記事検査追加 `a1255bd9f333c1bd4acaa922e9cfeb290b644d65`）。
- 公開処理: [run 30689194303](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30689194303) が成功。
- Cloudflare Pages確認URL: https://078fec4d.soam-creative-media.pages.dev
- 本番確認: 主要6ページと全82記事を検査し、広告カード91件・紹介ボタン91件・重複する公式情報ボタン0件を確認。公開処理内と公開後の直接再検査の両方でPASS。
- 戻し先: `5fa1aa66e9e4895fc3b2e176f0a643611716826f`。
- 費用: 公開専用処理のため、記事生成APIは呼んでいない。

## 2026-08-01 メディア戦略再設計（本番反映・確認済み）

- 状態: **GitHub送信・Cloudflare Pages本番反映・カスタムドメイン確認まで完了**。
- 作業開始時の保存ID: `c3e7ba67adb29eebb2ea8a3d3c7762a282a52080`。本番統合時は共有側の最新 `fe3da52` を土台に再適用。
- メディアの使命、3本柱、トップ、3本柱ハブ、比較・選び方ハブを追加。
- 既存82記事を全件監査し、読者、困りごと、検索意図、記事種類、3本柱、情報確認日、次回見直し日、関連記事3件以上、主導線1種類を記録・表示。
- 主導線: アフィリエイト67本、SOAM Link 3本、関連記事12本。案件は有効な13件のうち、記事本文の具体語と一致するものだけ最大2件。
- 恋愛・占い6記事は公開URLを維持し、今後の自動生成対象外・検索除外候補としてHOLD記録。削除・転送・検索除外は未実施。
- 今後の有料記事生成APIは **07:00・12:00・20:00の各枠で1回だけ**。再生成APIを呼ばず、固定形式と手元の処理で判断表・出典・確認日・導線を完成させる。
- ローカル検査: generation、scheduled-publish、site-links、media-seo（82記事）、media-strategy、Pages build、差分形式がPASS。
- 実画面: PC、タブレット、スマホでトップ、article-82、比較絞り込みを確認。横方向のページずれなし、記事の主導線1種類、比較の「お金・事業手続き」12件表示を確認。
- 本番保存ID: `fe7637e3be20a3686a37cbdf57ea410735398bee`。
- 公開処理: [run 30687307314](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30687307314) が成功。82記事の生成・予約公開・SOAM Link・SEO・戦略検査、Pages build、本番反映、カスタムドメイン確認をすべて通過。
- Cloudflare Pages確認URL: https://caed2fac.soam-creative-media.pages.dev
- 本番確認: トップ、3本柱、比較・選び方、article-82の計6ページで使命文、主要導線、戦略情報、アフィリエイト主導線を確認。伝播待ち後の再検査もPASS。
- 未検証: 次回07:00・12:00・20:00枠での実際の記事生成。今回の公開専用処理では有料生成APIを呼んでいない。
- 詳細: `docs/STRATEGY_IMPLEMENTATION_REPORT_20260801.md`、`docs/ARTICLE_AUDIT_20260801.csv`。

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
- 定時実行では、モデル一覧確認のための余分なAPI通信を行わない。設定不足や生成失敗時は記事・一覧・サイトマップを変更しない。
- 品質、重複、禁止表現、SEO、予約公開テストを通過した場合のみ公開対象をcommit・pushする。
- 同じslotがすでに記録済みの場合は安全に no-op となる。no-opでもSEO・リンク検査・Cloudflare Pagesデプロイは実行できる。

## SEOの正本

- 各公開記事は canonical を1件だけ持つ。
- canonical形式: `https://media.soam-creative.com/articles/article-XX`
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

## 2026-08-01 検索流入・SEO基盤の整備

- Google Search Consoleに `https://media.soam-creative.com/` を登録し、Google Analyticsによる所有権確認を完了。`sitemap.xml`を送信し、Google側で成功・89ページ検出を確認した。
- インデックス数・検索語・表示回数は新規登録による集計待ちのため、翌日以降に確認する。
- 実際の配信先は `.html` なしURLのため、公開82記事・記事一覧・固定ページ・サイトマップのcanonicalを実URLへ統一。
- 全82記事に、著者・運営者・言語・公開日・更新日を含むArticle構造化データ、表示上の著者表記、SNS共有情報を追加。今後の自動公開にも同じ検査を適用する。
- 収益記事はテーマに一致する有効案件だけを使い、広告明示・公式情報確認・向く人/向かない人の記載を必須とする。監査詳細は `docs/SEO_AUDIT_20260801.md`。

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
