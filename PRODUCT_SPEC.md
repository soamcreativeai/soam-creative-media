# SOAM MEDIA — PRODUCT_SPEC（この事業の現在仕様・唯一の正本）

作成日: 2026-08-12 JST
対象リポジトリ: `soamcreativeai/soam-creative-media` / `main`
このファイルより上位にある仕様書は無い。**現在仕様を判断するときは、このファイルだけを正本として読む。**
過去の値・過去の判断は、このファイル末尾の `## Decision History` にだけ残す。

このファイルの根拠にした一次資料（作成時点）：

| 種類 | 場所 |
|---|---|
| 事業ルールの正本 | `mimi-creative:アフィリエイト.md`（2026-08-07 全面改訂） |
| 実装の詳細な経緯 | 本リポジトリ `docs/CURRENT.md` ／ `docs/CHANGELOG.md`（最終更新 2026-08-07） |
| 事業運用サマリ | `mimi-creative:docs/business/soam-media/CURRENT.md` ／ 同 `CHANGELOG.md`（最終更新 2026-08-07） |
| 実物（コード・設定・台帳） | 本リポジトリの `.github/workflows/` ／ `scripts/` ／ `articles/data/manifest.json` ／ `automation/affiliate-catalog.json` |

---

## 1. この事業は何か

**個人で商品やサービスを作り、売り、届ける人**が、**判断と実務で手が止まる場面**を、
**判断表・手順・チェックリストに分解した記事**で解決し、
**記事内の広告リンク経由のアフィリエイト報酬**でお金をもらう事業。

- 読者は1円も払わない。読者から見れば全部無料の読み物である。
- メディアの正式名称は **SOAM MEDIA**（2026-08-01 統一）。会社名の `SOAM CREATIVE` とは別の固有名称。
- 使命: 「個人で商品・サービスを作り、売り、届ける人の判断と実務を、使える手順へ変える」。
- 3本柱: 「判断を言葉にする」「一人で回す仕組み」「必要な人へ届ける」。

（出典: `アフィリエイト.md` §1 ／ `docs/CHANGELOG.md` 2026-08-01 メディア戦略再設計）

## 2. 事業として成立する一連の流れ

**この事業には登録・ログイン・マイページが存在しない。これは欠落ではなく意図した設計**
（2026-08-07 Founder明示確認）。**「会員機能が無い」を不足・未実装として扱わない。**
読者は匿名のまま来て読んで去る。したがって流れは「立場」ではなく3本の別々の鎖で捉える。

| 鎖 | 内容 |
|---|---|
| **A. 記事が供給される鎖（無人）** | 決まった時刻になる → AIがテーマを選び記事を生成 → 誠実性・品質チェック → 公開・本番反映 |
| **B. 読者が来て広告リンクを踏む鎖** | 検索・SNSでサイトを知る → 記事を読む → 記事末尾の広告リンクを踏む → 広告主のサービスへ移動 |
| **C. お金が入る鎖** | 読者が広告主のサービスで申込・購入 → ASP（A8／もしも）が成果を計上 → SOAM CREATIVEへ報酬 |

**Aが止まれば新しい読者が増えず、Bが繋がらなければ収益ゼロ、Cは自社では見えない**（ASPの管理画面側）。
3本のうち1本でも切れていれば事業として成立しない。

（出典: `アフィリエイト.md` §2）

## 3. 提供物（現在、外向けに出しているもの）

| 項目 | 現在値 | 確認方法（2026-08-12） |
|---|---|---|
| 公開サイト | https://media.soam-creative.com/ | `docs/CURRENT.md` 本番状態 |
| 配信基盤 | Cloudflare Pages（project: `soam-creative-media`） | 同上 |
| 記事本数 | **99本**（`article-99` まで台帳に登録） | `articles/data/manifest.json` を読んで件数を数えた（99件）。🟨 本番URLでの実在確認は今回行っていない |
| 記事以外の公開ページ | トップ、記事一覧、3本柱ハブ（`pillars/`）、比較・選び方ハブ（`guides/`）、`ai-tool-lp.html`、`shindan-ai.html`、`contact.html`、`editorial-policy.html`、`privacy.html`、`saved.html`、`404.html` | `scripts/build-pages-site.mjs` の `publicFiles` と配信ディレクトリ一覧 |
| **配信していないページ** | `shindan-ai-pro.html`（有料予定・決済導線が無いため出さない）／ `gas-demo.html` ／ `slack-demo.html`（使っていない） | 同ファイルのコメント（2026-08-07 Founder判断）。ファイルはリポジトリに残すが本番へは出さない |

## 4. 記事が供給される仕組み（鎖A の現在仕様）

### 公開・配信の経路は3本だけ

| # | workflow | 起動 |
|---|---|---|
| ① | `.github/workflows/generate-and-publish-media-article.yml` | **唯一の定時起動**。JST 07:02 / 12:02 / 20:02 の主起動＋各17分後の保険起動（cron 6本）。手動起動（`workflow_dispatch`）も可 |
| ② | `.github/workflows/publish-scheduled-articles.yml` | 手動のみ（障害時の保守用） |
| ③ | `.github/workflows/deploy-media-strategy.yml` | 手動のみ（記事を作らず配信だけ） |

保険起動は記事を増やす処理ではない。対象の枠がすでに記事台帳にある場合、OpenAI・Cloudflare・記事／一覧／sitemapの更新を一切実行せず終了する。

### 生成の仕組み

- 生成APIは OpenAI Responses API（`POST https://api.openai.com/v1/responses`）。呼び出しは `scripts/generate-media-article.mjs`。
- 構造化出力（`json_schema` / `strict: true`）で記事データだけを受け取る。**AIにHTMLや外部URLを自由生成させない。** HTMLはローカルのテンプレート変換で作る。
- 鍵・モデルは本リポジトリ専用のGitHub Secrets 3つ（`MEDIA_AI_BASE_URL` / `MEDIA_AI_API_KEY` / `MEDIA_AI_MODEL`）から注入する。**値・正確なモデルIDは秘密情報のためこの文書で確定させない。**
- 品質・重複・禁止表現・SEO・予約公開の検査を通過した場合だけ、公開対象をcommit・pushする。
- 同じ枠がすでに記録済みなら安全に no-op となる（有料生成より前に重複判定を行う）。

### 費用の上限（Founder確定・変更禁止）

- **有料の記事生成は1公開枠につき1回。** 品質チェックに落ちた時だけ、エラー内容をAIへ伝えて**1回だけ**書き直しを許可する（上限2回・Founder承認 2026-08-07）。無制限の再生成は禁止。
- 実装の現在値: `scripts/generate-media-article.mjs` の `const maxRevisions = 2;`。この値は `scripts/test-media-publication-contract.mjs` が固定検査している（🟩 実物で確認）。
- 通信エラー・タイムアウト・不正JSONによる失敗時の**同一リクエスト再送**は最大3回。これは内容のやり直しではない。

## 5. 現在の動作状態（🟥 「一度動いた」と「使える」を混ぜない）

| | 状態 | 根拠 |
|---|---|---|
| 手動起動（人が押す） | 🟩 生成→検査→公開→本番反映まで完走した実績あり | 2026-08-07 run 31150993899 で article-88 が本番URLまで到達（`docs/CURRENT.md`） |
| 無人の定時実行（cron） | 🟨 **未確認（この文書の作成時点で確定できない）** | 下記のとおり、資料の記述と実物のcommit履歴が食い違っており、cronトリガーでの完走を証明できていない |

**食い違いの内容（統合せず、両方の場所を記録する）**

1. `docs/CURRENT.md`（2026-08-07）と `mimi-creative:docs/business/soam-media/CURRENT.md`（2026-08-07）は、いずれも
   「**無人の定時実行は 2026-08-01 14:52 JST を最後に完走していない。次の検証機会は8/8朝の枠**」と書いたまま更新されていない。
2. 一方、本リポジトリのcommit履歴では **2026-08-07夜〜2026-08-12にかけて `article-89`〜`article-99` の11本が、
   `SOAM CREATIVE Publisher` 名義でほぼ毎日 朝枠・夜枠相当の時刻に追加**されている（例: `3a31c46` 2026-08-08 07:39 JST 相当、`0a11778` 2026-08-12 20:44 JST 相当）。
3. 🟥 **これが cron 起動によるものか、人が押した手動起動によるものかは、この作業環境から GitHub Actions の実行履歴（`api.github.com`）へ到達できないため確認できていない。**
   したがって「無人で使える状態になった」とは**書かない**。判定には `gh run list --workflow=generate-and-publish-media-article.yml --json event,conclusion` の `event=="schedule"` 抽出が必要。

**この状態の扱い**：定時公開を 🟩使える と記録してよいのは、**無人トリガー（schedule）での完走記録を確認できた時だけ。**
⚠️ 無人実行を検証したい日は、同じ枠で手動テストをしない（手動テストが枠を消費し、重複防止でskipされるため）。

## 6. お金の仕組み（鎖B・C の現在仕様）

- 収益源はアフィリエイト報酬のみ（ASP: A8／もしも）。読者からの課金は無い。
- 案件カタログ: `automation/affiliate-catalog.json`。現在値は **13件・すべて `active: true`**（🟩 実物で確認・2026-08-12）。
- 案件の最終決定は `scripts/editorial-strategy-utils.mjs` の `isOfferRelevant`。記事本文の具体語と一致する有効案件だけを**最大2件**まで使う。
- 広告ボタンは1サービスにつき「サービス内容を確認する」1件だけ（2026-08-01 一本化）。同じサービスへ向かう「公式情報」ボタンの重複は検査で停止する。
- 出典リンクは広告ボタンとは別種別（`source_reference_click`）として扱う。
- SOAM Link への導線の正式URL: https://link.soam-creative.com/（一元管理先 `automation/site-links.json`）。
- 適合する案件が無い記事は、広告リンクを空のまま公開してよい（ノウハウ記事として成立する）。
  **ただし「広告リンクが無い＝正常」と決めつけない。** 2026-08-07時点で広告0本の15本のうち12本は、
  カテゴリに案件が存在するのに `isOfferRelevant` のキーワード規則で弾かれた不具合だった。空欄は「案件が無い」のか「弾かれた」のかを必ず区別する。

## 7. 誠実性・安全の固定条件（絶対）

| 箇所 | 絶対にやらないこと |
|---|---|
| 広告リンクのURL・ASP名・報酬条件 | 推測で作る。`automation/affiliate-catalog.json` で `active: true` かつ `lastVerifiedAt` を持つものだけ使う |
| 紹介するツールの料金・機能・キャンペーン | 捏造する。確認できないなら書かない |
| 記事本文 | 捏造レビュー・実在しない体験談・断定的な成功保証を書く |
| 有料予定コンテンツ | 決済導線が無いまま誰でも読める状態で置く（`shindan-ai-pro.html` を配信対象へ戻さない） |
| 広告であることの表示 | 隠す。アフィリエイト広告の利用を明示する |

**無人での外部公開が許可されている唯一の事業**（Founder明示許可・2026-07-08）。
**例外の対象は本リポジトリの定時記事公開のみ。** 他機能・他事業へ広げない。

## 8. SEO・公開品質の固定条件

- 各公開記事は canonical を1件だけ持つ。形式は `https://media.soam-creative.com/articles/article-XX`（拡張子なし）。
- Article JSON-LD の `mainEntityOfPage` / `url` は canonical と一致させる。
- 記事一覧は `articles/data/manifest.json`（記事の台帳）から毎回再生成する。`AUTO:ARTICLE_LIST` マーカーが完全に失われた場合は、次回公開時に台帳から自動復旧する。片方だけ残る不完全な状態は安全のため停止する。
- 関連記事は3件以上（不足時は記事一覧から自動補完）。
- 公開前検査: `scripts/test-media-seo.mjs` ／ `test-media-strategy.mjs` ／ `test-site-links.mjs` ／ `test-publish-scheduled-articles.mjs` ／ `test-media-generation.mjs` ／ `test-media-publication-contract.mjs` ／ `test-media-publication-slot.mjs` ／ `test-generated-media-publication.mjs`。

## 9. 🟥 未確認・要Founder確認

1. **無人の定時実行（cron）の現在の成否**（§5）。資料は「2026-08-01を最後に完走していない」、実物のcommitは「8/8以降ほぼ毎日公開されている」。この環境からGitHub Actions APIへ到達できず、どちらが現在値か確定できない。
2. **`docs/CHANGELOG.md` の見出しと本文の矛盾**。2026-08-07 の見出しは「定時公開が**本物のcronで**初めて最後まで成功」だが、同じ節の本文は「**手動起動**で完走を確認」と書いている。2026-08-07 の訂正commit `55810f8`（"docs: the heading claimed cron success; the body said manual"）は `docs/CURRENT.md` の3行だけを直しており、**`docs/CHANGELOG.md` の見出しは直っていない**。今回はこの矛盾を統合も修正もせず、事実として記録するにとどめる。
3. **記事本数の記載ズレ**。`docs/CURRENT.md`「本番状態」欄は82本、同ファイル上部の記述と `mimi-creative` 側 CURRENT.md は88本、実物の台帳は99本。台帳（`manifest.json`）が実物だが、**本番URLでの99本実在確認は今回行っていない**。
4. **記事生成に使っているモデルID**は秘密情報（GitHub Secrets `MEDIA_AI_MODEL`）のため、この文書で確定させない。推論系モデル（`reasoning: { effort: 'low' }` を送り `reasoning_tokens` が返る）であることまでが確認済みの事実。

---

## Decision History

過去の決定と過去値の置き場。**ここに書かれた値を現在値として読まない。** 現在値は §1〜§8。

| 日付 | 決定・変更 | 出典 |
|---|---|---|
| 2026-07-08 | **無人での外部公開（定時記事公開）をこの事業に限りFounderが許可**（全事業共通の「無人での外部投稿禁止」に対する唯一の例外） | `アフィリエイト.md` §3 |
| 2026-07-18 | 運用台帳を開始。当時の基準状態は「実在記事13件・固定ページ計画は未実装」 | `mimi-creative:docs/business/soam-media/CHANGELOG.md` |
| 2026-07-21 | 記事生成AI基盤を `api.anthropic.com` から OpenAI へ移行。運用ドキュメントを `mimi-creative` 側（`アフィリエイト.md`／`docs/business/soam-media/`）へ統合 | 同上 |
| 2026-08-01 | メディア戦略を再設計。使命文と3本柱を確定。既存82記事へ対象読者・困りごと・検索意図・判断表・情報確認日・関連記事・主導線を付与 | `docs/CHANGELOG.md` |
| 2026-08-01 | 広告ボタンを「サービス内容を確認する」1件へ一本化。重複する「公式情報」ボタンは検査で停止 | 同上 |
| 2026-08-01 | メディア名称を **SOAM MEDIA** へ統一（旧: `SOAM CREATIVE MEDIA`／記事上の `SOAM CREATIVE` 表記） | `docs/CURRENT.md` |
| 2026-08-01 | canonical・sitemap を拡張子なしの実URLへ統一。Search Console 登録・sitemap送信（89ページ検出）完了 | `docs/CHANGELOG.md` |
| 2026-08-01 | 恋愛・占い6記事は公開URLを維持しつつ、今後の自動生成対象外・検索除外候補として HOLD 記録（削除・転送・検索除外は未実施） | `docs/CURRENT.md` |
| 2026-08-02 | 定時の記事作成・公開を `Generate and publish SOAM Media article` の1本へ一本化。`Publish scheduled articles` は手動の保守用として定時起動を持たない | `docs/CHANGELOG.md` |
| 2026-08-03 | 旧Cloudflare Worker（`aff-media.js` / `worker.js`）からのSOAM MEDIA直接投稿を削除し、二重起動を解消。**これらのファイルは廃止済みで実在しない。実装正本として参照しない** | `docs/CHANGELOG.md` ／ `アフィリエイト.md` §5 |
| 2026-08-06 | 各定時枠の17分後に保険起動を追加（公開済みならAIを呼ばず終了）。公開契約検査・slot判定検査を追加 | `docs/CHANGELOG.md` |
| 2026-08-06 | 出典リンクを広告ボタンから分離（`source_reference_click`） | 同上 |
| 2026-08-07 | 定時公開の全滅バグ（`$GITHUB_OUTPUT` の形式破壊）を修正（`ad2bf32`） | 同上 |
| 2026-08-07 | 品質チェック必須要件「向いている人／向いていない人」がAIへの生成指示に無かった欠落を修正（`fe01918`）。`max_output_tokens` 7000→9000 | 同上 |
| 2026-08-07 | 関連記事3件未満時の自動補完を追加（`130f945`） | 同上 |
| 2026-08-07 | **コスト方針の変更（Founder承認）**: 旧「1公開枠1回・再生成による費用増を禁止」→ 現「品質チェックに落ちた時だけ1回だけ書き直しを許可」（`maxRevisions` 1→2）。上限2回は固定、無制限の再生成は引き続き禁止 | `docs/CHANGELOG.md`（`4d4bca4`） |
| 2026-08-07 | ソフト404を解消（`404.html` 追加）。どのworkflowからも呼ばれていなかった `sync-affiliate-links.mjs` / `generate-strategy-audit.mjs` / `apply-media-strategy.mjs` を削除。**「アフィリエイトリンクを自動処理が挿入する」という旧記述は誤りだったと訂正済み**（実際は公開の都度 `selectOffers` が行う） | `docs/CURRENT.md` ／ `docs/CHANGELOG.md` |
| 2026-08-07 | **Founder判断**: `shindan-ai-pro.html`（有料予定）・`gas-demo.html`・`slack-demo.html` を本番配信対象から除外。ファイルは残す | `scripts/build-pages-site.mjs` コメント |
| 2026-08-07 | **Founder明示確認**: 登録・ログイン・マイページが無いのはこの事業の意図した設計であり、欠落として扱わない | `アフィリエイト.md` §2 |
| 2026-08-07 | 事業マップの「記事の自動生成・検査・公開」を 🟢使える → 🟡一部だけ へ訂正（手動起動の成功だけを根拠に🟢としていたのは記録ミス） | `mimi-creative:docs/business/soam-media/CHANGELOG.md` |
| 2026-08-12 | 本ファイル（`PRODUCT_SPEC.md`）を作成し、この事業の現在仕様の唯一の正本とした。`docs/CURRENT.md` ／ `docs/CHANGELOG.md` は**実装の詳細な経緯の記録**として残すが、現在仕様の正本ではない | 本ファイル |
