# 毎日3本の予約公開

このディレクトリは、SOAM CREATIVE MEDIA の**承認済み記事を予約公開するためのキュー**です。記事を自動生成して無確認で公開する仕組みではありません。

| 枠 | 日本時間 | 役割 |
| --- | --- | --- |
| morning | 07:00 | 新規流入：読者の困りごと・検索意図に答える |
| noon | 12:00 | 判断支援：選び方・比較・導入条件を整理する |
| evening | 20:00 | 再訪：更新・まとめ・既存記事の見直しを届ける |

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

`test-media-seo.mjs` は、公開済み記事の検索結果向け説明、正規URL、Article構造化データ、XMLサイトマップ、および端末内保存ページの `noindex` を検証します。

GitHub Actions の時刻は混雑時に遅れる場合があります。実行が遅れた場合も、承認済みで公開時刻を過ぎた記事だけを次回実行時に補完します。記事が不足している枠は、埋め合わせ用の量産記事を作らず何も公開しません。
