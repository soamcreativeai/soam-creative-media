# SOAM Media 現在地

最終確認・引き継ぎ更新: 2026-08-07 JST
対象リポジトリ: `soamcreativeai/soam-creative-media` / `main`

## 2026-08-07 全体監査で見つかった軽微な指摘3件を修正・本番反映済み

- 404: 存在しないURLがHTTP 200でトップページを返す（Cloudflare Pagesのソフト404）状態を修正。`404.html`を追加し`build-pages-site.mjs`へ組み込み、本番デプロイ・実URLで404が返ることを確認済み（[run 31142235675](https://github.com/soamcreativeai/soam-creative-media/actions/runs/31142235675)）。
- 幽霊スクリプト削除: どのworkflowからも呼ばれていなかった`sync-affiliate-links.mjs`（`docs/CURRENT.md`は「自動処理」と誤記していた）`generate-strategy-audit.mjs``apply-media-strategy.mjs`（存在しない`/private/tmp`パスを参照しており実行不能だった）を削除。案件選定は`generate-media-article.mjs`の`selectOffers`が定時公開の都度その場で行う現行の仕組みのみに一本化。
- **コスト方針の変更（Founder承認・2026-08-07）**：「1公開枠につき有料生成は1回だけ、再生成による費用増を禁止」の方針を、「品質チェックに落ちた時だけ、エラー内容をAIへ伝えて1回だけ書き直させる」に緩和（`maxRevisions`: 1→2）。直近1週間で約14回、AI呼び出し自体は成功したのに品質チェック落ちで記事0本のまま費用だけ発生していたため。上限は2回のまま固定し、無制限の再生成は禁止を維持。
- 検証: ローカルの全関連テストPASS。本番push＋`deploy-media-strategy`実行でCloudflare Pages反映・404実URL確認済み。**「品質チェック落ち→1回だけ書き直し」の経路自体が実際のOpenAI応答で発動する場面は、次回以降の定時実行で確認する（未確認）。**

## 2026-08-07 定時公開が8/6 14:40以降ずっと全滅していた不具合を修正（本番反映・手動起動で疎通確認済み・次回の通常定時枠が最終確認）

- 原因: 8/6 14:40の「取りこぼし対策」（`b188f01`）で追加した`scripts/check-media-publication-slot.mjs`が、人間向けの説明文をGitHub Actionsの`$GITHUB_OUTPUT`（決まった`key=value`形式しか受け付けない）へそのまま書き込んでいた。このため8/6 13時台以降、定時実行（主起動・保険起動とも）が最初のステップで毎回即失敗し、記事生成に一度も到達していなかった。
- 修正: 該当の説明文だけを`console.error`（画面表示用）へ変更し、`$GITHUB_OUTPUT`には決まった2行だけが渡るようにした。
- 併せて: OpenAI呼び出しが通信エラー・タイムアウト・不正なJSON応答で失敗した場合に限り、同一リクエストを最大3回まで自動で再試行するようにした（**「1公開枠につき有料の記事生成は1回だけ、内容のやり直しはしない」という既存方針・検査(`test-media-publication-contract.mjs`)は変更していない**。今回変えたのは同じ1回のリクエストが通信の都合で失敗した時の再送であり、内容が気に入らないからAIに書き直させる処理ではない）。
- 検証: ローカルで`test-media-publication-contract.mjs` `test-media-publication-slot.mjs` `test-generated-media-publication.mjs` `test-media-generation.mjs`がPASS。修正後のコードを本番へpushし、本番のワークフローを手動起動（dry-run）して実OpenAI生成が成功、品質チェックも1回目で通過することを確認（[run 31141650051](https://github.com/soamcreativeai/soam-creative-media/actions/runs/31141650051)）。
- 未確認: 手動起動ではなく、実際の定時トリガー（cron）での成功。次の定時枠（本日20:02 JSTまたは明朝07:02 JST）で実際に記事が公開されることを確認するまでは「疎通未確認」として扱う。

## 2026-08-06 定時公開の広告・出典リンク判定を修正（次回定時確認待ち）

## 2026-08-06 定時公開の取りこぼし・費用防止を追加（本番反映・実定時確認待ち）

- 定時公開の起動元は引き続き `Generate and publish SOAM Media article` の1本だけ。朝・昼・晩の主起動（JST 07:02 / 12:02 / 20:02）に加え、各17分後に同じ枠を確認する保険起動を設けた。
- 保険起動は記事を増やす処理ではない。対象日時・枠のIDがすでに記事台帳にあれば、OpenAI、Cloudflare、記事・一覧・sitemapの更新を一切実行せず終了する。未記録の場合だけ、その枠の通常の1本を生成・検査・公開する。
- 追加した公開契約検査は、定時起動が上記1本だけであること、手動保守workflowに定時起動がないこと、重複判定が有料生成より前であること、1枠1回の生成であること、公開前後の工程が揃うことを固定する。
- 検証: 既に記録済みの `2026-08-01-noon` を、AI設定を与えない状態で実行して no-op を確認。slot判定、公開契約、fixtureによるarticle-88相当の生成→公開→SEO→戦略→Link検査、87記事の既存検査、Pages buildがPASS。
- 未検証: 変更後の主起動または保険起動による実OpenAI生成。本番記事の追加は、次回定時枠のみで確認し、手動生成・手動公開は実施しない。

- 2026-08-03以降の定時実行は、生成と予約公開を通過した後、`media-strategy`検査で停止していた。
- 原因: アフィリエイト主導線を持つ生成記事の「出典」リンクまで、公式情報ボタンと同じ `outbound_official_click` として出力していた。重複広告ボタンを防ぐ検査が、この出典リンクを誤って重複と判定していた。
- 修正: 出典リンクを `source_reference_click` として広告ボタンから分離し、未管理URLは引き続き拒否する回帰検査を追加。生成APIの回数、記事本文、広告ボタン数のルールは変更していない。
- 検証: 87記事の既存検査に加え、隔離環境でarticle-88相当を生成→公開→SEO→戦略→Link検査まで実行し、88記事としてすべてPASS。
- 追加: 上記の生成→公開→SEO→戦略→Link検査を、生成APIの前に毎回走らせる事前検査としてworkflowへ組み込んだ。失敗すれば有料生成APIを呼ばずに止まる。
- 保存ID: `6075892`、事前検査 `565c6f8`。未検証: 次回の実OpenAI定時処理（手動生成・手動公開は実施しない）。

## 2026-08-03 自動記事公開の二重起動を解消（本番反映・確認済み）

- 定時公開の正本は、`Generate and publish SOAM Media article` のみ。JST **07:02 / 12:02 / 20:02** に各1本を生成・検査・公開・Cloudflare Pages反映する。
- 旧Cloudflare WorkerからのSOAM MEDIA直接投稿、手動生成入口、旧専用部品を削除し、共有OPSの朝・昼・晩処理は維持した。これにより、旧処理が記事一覧の更新マーカーやSOAM Linkの正式URLを上書きする経路をなくした。
- `articles/index.html` は、更新マーカーが完全に失われても、次回公開時に公開記事台帳から自動復旧して一覧を再構築する。片方だけ残る不完全な状態は安全のため停止する。
- 生成記事の小見出しはローカルの固定構造へ移し、AIが小見出しを返さないだけで公開が止まることはない。生成APIは1公開枠1回のまま。
- article-86 / article-87は、本文・題名・公開日を維持したまま、canonical、Article JSON-LD、著者表記、読者・判断情報、正式SOAM Link、関連記事、sitemapを補正した。全87記事の検索情報も再検査済み。
- 検証: scheduled-publish、media-generation、site-links、media-seo（87記事）、media-strategy（87記事）、Cloudflare Pages buildがPASS。共有OPS側は構文検査と213件の機能検査がPASS（画面検査はこの作業場所に依存部品がなく未実施）。
- 保存ID: メディア `29c525f`、旧投稿の削除 `ef870c1`。Cloudflare Pages: https://de691d20.soam-creative-media.pages.dev
- 本番確認: `article-86`・`article-87` のHTTP 200、title、h1、canonical、Article JSON-LD、記事一覧、sitemap、article-87の拡張子なしURLを確認済み。
- 未検証: 次回の定時枠での実OpenAI生成。追加料金が発生する手動生成・手動公開は実施しない。

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

## 2026-08-02 定時記事作成・公開を一本化（共有側反映前）

- 定時処理は `Generate and publish SOAM Media article` の1本だけとし、JST 07:02 / 12:02 / 20:02に、記事作成・品質確認・公開・Cloudflare Pages反映・カスタムドメイン確認まで続けて実行する。
- `Publish scheduled articles` は、障害時の保守用の手動処理として残すが、定時起動はしない。二つの自動処理を並行させない。
- 変更前の公開専用workflowに定時設定がなかったことは確認済み。自動公開の責任は上記の一本化した処理だけに固定する。
- 検証: generation、scheduled-publish、site-links、media-seo（85記事）、media-strategy（85記事）、差分形式がPASS。
- 未検証: 次回20:02の実際の定時実行。手動生成・手動公開は行わない。

## 2026-08-02 article-85取り込み時の公開契約補正（本番反映・確認済み）

- 共有側へ追加された article-85 は、記事本文・題名・公開日を維持する。
- 同時に旧方式の記事一覧更新で消えた `AUTO:ARTICLE_LIST` マーカーと、クエリ付きSOAM Link URLを復元・正規化した。
- article-85へcanonical、Article JSON-LD、SNS共有情報、著者表記、判断情報、主導線、関連記事、情報確認日を追加し、sitemapを85記事へ更新した。
- ローカル検証: generation、scheduled-publish、site-links、media-seo（85記事）、media-strategy（85記事）、差分形式がPASS。
- 本番反映: [run 30731294798](https://github.com/soamcreativeai/soam-creative-media/actions/runs/30731294798) でCloudflare Pages反映・カスタムドメイン確認まで成功。

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
- **【2026-08-07訂正】**「自動処理`scripts/sync-affiliate-links.mjs`が今後の公開前に自動挿入する」という上記の記述は誤りだった。実際にはこのスクリプトはどのworkflowからも一度も呼ばれておらず、放置された手動ツールだったため削除した。テーマ一致・有効案件のみを最大2件挿入する処理は、現在は`scripts/generate-media-article.mjs`内の`selectOffers`が定時公開の都度その場で行っている（診断・恋愛・占い等、適合案件がない記事には入れない仕様は維持）。

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
