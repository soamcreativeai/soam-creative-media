# 毎日3本の予約公開

このディレクトリは、SOAM CREATIVE MEDIA の記事キューと生成ルールです。既存の承認済み記事は `Publish scheduled articles` で手動公開できます。定時の新規生成は `Generate and publish SOAM Media article` が担当し、テーマ重複・品質・SEO検査をすべて通過した1本だけを公開します。

| 枠 | 日本時間 | 役割 |
| --- | --- | --- |
| morning | 07:00 | 新規流入：読者の困りごと・検索意図に答える |
| noon | 12:00 | 判断支援：選び方・比較・導入条件を整理する |
| evening | 20:00 | 再訪：更新・まとめ・既存記事の見直しを届ける |

## 新規記事の自動生成

`generation-catalog.json` がテーマと文体の正本です。既存記事のタイトル・要約・タグとの類似度、直近7日・30日のカテゴリ偏りを評価してテーマを選びます。同じ日付・slotのID（例: `2026-07-27-morning-auto`）がキューに残るため、再実行や遅延実行では二重生成しません。

AIはOpenAI Responses APIだけを使います。`MEDIA_AI_BASE_URL=https://api.openai.com/v1`、`MEDIA_AI_API_KEY`、`MEDIA_AI_MODEL` をGitHub Actions Secretからだけ受け取ります。値はログへ出しません。Secretまたはモデルが未設定なら、記事・index・sitemapを変更せず明確に失敗します。品質不合格の応答は最大3回まで再生成し、それでも不合格なら書込み・公開を行いません。設定は [`docs/OPENAI_AUTOMATION_SETUP.md`](../docs/OPENAI_AUTOMATION_SETUP.md) を参照してください。

`affiliate-catalog.json` の `active: true` の案件だけを使います。正式URL・アフィリエイトURL・最終確認日・禁止表現がそろわない案件は、既存記事にリンクがあっても自動挿入しません。

```sh
node scripts/test-media-generation.mjs
node scripts/generate-media-article.mjs --dry-run --fixture --slot=morning --now=2026-07-28T07:00:00+09:00
```

## 予約記事を入れる手順

1. 本文のHTML断片を `automation/approved-content/` に置く。`<html>`、`<script>`、`<iframe>` は入れません。
2. `article-queue.json` の `articles` に、`status: "approved"` の予約を追加する。
3. `node scripts/publish-scheduled-articles.mjs --check` で検証する。
4. 指定日時になると GitHub Actions が公開済みの記事ページ、記事一覧、トップの注目記事を更新します。

公開前に、本文が読者の疑問に答えているかを編集者が確認します。特に商品・サービスを紹介する記事では、公式情報で料金・提供条件・対象外・確認日を見直し、広告または紹介リンクを含む場合は `containsAffiliateLinks` を `true` にします。裏取りできない実績、比較、利用者の声は公開しません。

記事はまず既存カテゴリに入れます。`category` と `categoryLabel` は次の組み合わせを使います。商品名・業種・用途は `tags` に入れ、単発の商品ごとにカテゴリは増やしません。

| category | categoryLabel |
| --- | --- |
| ai | AI・業務効率化 |
| creative | 動画・画像・デザイン |
| templates | テンプレート・教材 |
| marketing | 集客・販売 |
| personal | 個人サービス |
| money | 税金・副業・お金 |
| love | 恋愛・人間関係 |
| fortune | 占い・診断 |
| other | 暮らし・その他 |

`article-queue.json` の1件の形式です。紹介リンクがある場合も、リンク先・料金・対象外・確認日を本文で確認したうえで `containsAffiliateLinks` を `true` にします。

```json
{
  "id": "2026-07-15-morning-ai-workflow",
  "status": "approved",
  "slot": "morning",
  "scheduledAt": "2026-07-15T07:00:00+09:00",
  "source": "automation/approved-content/ai-workflow-basics.html",
  "article": {
    "slug": "article-20",
    "title": "タイトル",
    "category": "ai",
    "categoryLabel": "AI・業務効率化",
    "articleType": "discover",
    "targetIndustry": "all",
    "tags": ["AI", "業務効率化"],
    "excerpt": "記事の要約です。",
    "metaDescription": "検索結果向けの説明です。",
    "primaryCta": null,
    "affiliateLinks": [],
    "relatedArticles": ["article-19"],
    "containsAffiliateLinks": false
  }
}
```

## ローカル確認

```sh
node scripts/publish-scheduled-articles.mjs --check
node scripts/publish-scheduled-articles.mjs --dry-run --now=2026-07-15T07:00:00+09:00
node scripts/generate-sitemap.mjs
node scripts/test-media-seo.mjs
```

`--dry-run` はファイルを書き換えません。通常実行だけが公開対象のファイルを書き換えます。

公開済み記事の本文を、承認済み原稿から再生成する場合は `node scripts/publish-scheduled-articles.mjs --refresh-published` を使います。この保守モードは記事本文だけを書き換え、公開日・記事一覧・キューの状態は変更しません。

カテゴリ記事には、承認済み原稿に加えて、カテゴリごとの実践ガイド（試し方・見直し方・判断の安全性）を公開時に付与します。短い結論だけで終わらず、読者が実際に試せる情報量を保つためです。

編集確認済みの記事を同日にまとめて公開する必要がある場合だけは、`--publish-all` を明示して実行します。このモードは未公開の承認済み記事をすべて公開するため、予約中の記事が混ざっていないことを確認してから使います。

`test-media-seo.mjs` は、公開済み記事の検索結果向け説明、正規URL、Article構造化データ、XMLサイトマップ、および端末内保存ページの `noindex` を検証します。

GitHub Actions の時刻は混雑時に遅れる場合があります。実行が遅れた場合も、承認済みで公開時刻を過ぎた記事だけを次回実行時に補完します。記事が不足している枠は、埋め合わせ用の量産記事を作らず何も公開しません。
