# 毎日3本の予約公開

このディレクトリは、SOAM MEDIA の記事キューと生成ルールです。定時の新規生成は `Generate and publish SOAM Media article` が担当し、テーマ重複・品質・SEO検査をすべて通過した1本を、人の承認待ちを挟まず公開します。

| 枠 | 日本時間 | 役割 |
| --- | --- | --- |
| morning | 07:00 | 新規流入：読者の困りごと・検索意図に答える |
| noon | 12:00 | 判断支援：選び方・比較・導入条件を整理する |
| evening | 20:00 | 再訪：更新・まとめ・既存記事の見直しを届ける |

## 新規記事の自動生成

`generation-catalog.json` がテーマと文体の正本です。既存記事のタイトル・要約・タグとの類似度、直近7日・30日のカテゴリ偏りを評価してテーマを選びます。同じ日付・slotのID（例: `2026-07-27-morning-auto`）がキューに残るため、再実行や遅延実行では二重生成しません。

AIはOpenAI Responses APIだけを使います。`MEDIA_AI_BASE_URL=https://api.openai.com/v1`、`MEDIA_AI_API_KEY`、`MEDIA_AI_MODEL` をGitHub Actions Secretからだけ受け取ります。値はログへ出しません。Secretまたはモデルが未設定なら、記事・index・sitemapを変更せず明確に失敗します。**有料の生成APIは1公開枠につき1回だけ**です。必須項目は最初から固定形式で生成し、判断表・出典リンク・確認日・広告導線は手元の処理で完成させます。品質不合格でも追加の生成APIを呼びません。設定は [`docs/OPENAI_AUTOMATION_SETUP.md`](../docs/OPENAI_AUTOMATION_SETUP.md) を参照してください。

`affiliate-catalog.json` の `active: true` の案件だけを使います。正式URL・アフィリエイトURL・最終確認日・禁止表現がそろわない案件は、既存記事にリンクがあっても自動挿入しません。

```sh
node scripts/test-media-generation.mjs
node scripts/generate-media-article.mjs --dry-run --fixture --slot=morning --now=2026-07-28T07:00:00+09:00
```

## 自動公開される記事の状態

1. 合格した本文を `automation/generated-content/` に保存します。
2. `article-queue.json` に `status: "scheduled"` で記録します。
3. 同じ実行の中で指定時刻の公開処理を行います。
4. 記事ページ、記事一覧、トップ、サイトマップ、検索向け情報を検査します。

人による公開承認は挟みません。代わりに、読者・悩み・検索意図・3本柱・結論・判断表・手順・確認項目・向く人／向かない人・注意点・出典・確認日を機械検査します。裏取りできない体験・実績・比較・料金は生成しません。

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
  "status": "scheduled",
  "slot": "morning",
  "scheduledAt": "2026-07-15T07:00:00+09:00",
  "source": "automation/generated-content/ai-workflow-basics.html",
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

公開済み記事の本文を、保存済み原稿から再生成する場合は `node scripts/publish-scheduled-articles.mjs --refresh-published` を使います。この保守モードは記事本文だけを書き換え、公開日・記事一覧・キューの状態は変更しません。

公開時には、編集方針の要約、判断表、情報確認日、記事に合う主導線を付与します。短い結論だけで終わらず、読者が実際に試せる情報量を保ちます。

障害復旧で予約済みの記事をまとめて処理する必要がある場合だけ、`--publish-all` を明示して実行します。

`test-media-seo.mjs` は、公開済み記事の検索結果向け説明、正規URL、Article構造化データ、XMLサイトマップ、および端末内保存ページの `noindex` を検証します。

GitHub Actions の時刻は混雑時に遅れる場合があります。実行が遅れた場合も、予約済みで公開時刻を過ぎた記事だけを次回実行時に補完します。生成APIを再試行して費用を重ねることはしません。
