#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decorateArticleHtml, enrichArticle, PILLARS, STRATEGY_DATE, csvValue } from './editorial-strategy-utils.mjs';
import { canonicalUrl } from './seo-utils.mjs';
import { similarity } from './media-generation-utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'articles/data/manifest.json');
const catalogPath = path.join(root, 'automation/affiliate-catalog.json');
const auditCsvPath = path.join(root, 'docs/ARTICLE_AUDIT_20260801.csv');
const auditMarkdownPath = path.join(root, 'docs/ARTICLE_AUDIT_20260801.md');
const pillarDir = path.join(root, 'pillars');
const guideDir = path.join(root, 'guides');

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const list = (value) => Array.isArray(value) ? value : [];
const sameSet = (left, right) => [...left].sort().join('|') === [...right].sort().join('|');

const loadStrategySource = async () => {
  const source = '/private/tmp/soam-media-name-record-20260801/docs';
  const files = ['CHATGPT_STRATEGY_REQUEST_20260801.md', 'CHATGPT_STRATEGY_MATERIAL_20260801.md'];
  for (const file of files) {
    try {
      await fs.access(path.join(root, 'docs', file));
    } catch {
      try {
        await fs.copyFile(path.join(source, file), path.join(root, 'docs', file));
      } catch {
        // 戦略資料が別作業場所にない場合も、サイト修正自体は継続できる。
      }
    }
  }
};

const chooseRelated = (article, articles) => {
  const existing = list(article.relatedArticles)
    .map((slug) => articles.find((candidate) => candidate.slug === slug))
    .filter((candidate) => candidate && candidate.slug !== article.slug);
  const sameCategory = articles.filter((candidate) => candidate.slug !== article.slug && candidate.category === article.category);
  const samePillar = articles.filter((candidate) => candidate.slug !== article.slug && candidate.pillar === article.pillar);
  return [...existing, ...sameCategory, ...samePillar]
    .filter((candidate, index, all) => all.findIndex((item) => item.slug === candidate.slug) === index)
    .slice(0, 3)
    .map((candidate) => candidate.slug);
};

const duplicateCandidates = (articles) => {
  const map = new Map();
  for (let left = 0; left < articles.length; left += 1) {
    for (let right = left + 1; right < articles.length; right += 1) {
      const score = similarity(
        `${articles[left].title} ${articles[left].excerpt}`,
        `${articles[right].title} ${articles[right].excerpt}`
      );
      if (score >= 0.58) {
        const newer = Number(articles[left].slug.match(/\d+/)?.[0] || 0) > Number(articles[right].slug.match(/\d+/)?.[0] || 0)
          ? articles[left]
          : articles[right];
        const older = newer === articles[left] ? articles[right] : articles[left];
        map.set(newer.slug, { mergeInto: older.slug, score: Number(score.toFixed(2)) });
      }
    }
  }
  return map;
};

const pageHead = ({ title, description, canonicalPath }) => `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}｜SOAM MEDIA</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonicalUrl(canonicalPath)}">
  <meta property="og:title" content="${escapeHtml(title)}｜SOAM MEDIA">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonicalUrl(canonicalPath)}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-8LDQ9J4C8B"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-8LDQ9J4C8B');</script>
  <link rel="stylesheet" href="../style.css">
  <script src="../articles/hub-filter.js" defer></script>
</head>
<body>
  <header><div class="header-inner"><a href="../index.html" class="logo">● SOAM MEDIA</a><nav><a href="../index.html">ホーム</a><a href="../articles/index.html">記事一覧</a><a href="../guides/index.html">比較・選び方</a></nav></div></header>`;

const pageFoot = `  <footer><p>本サイトはアフィリエイト広告を利用しています。</p><a href="../editorial-policy.html">編集方針</a><p>© 2026 SOAM CREATIVE. All rights reserved.</p></footer>
</body>
</html>
`;

const renderArticleCards = (articles) => articles.map((article) => `        <a class="hub-article-card" href="../articles/${escapeHtml(article.file)}" data-hub-card data-purpose="${escapeHtml(article.category)}" data-audience="${/事業|店舗|個人事業|サービス/.test(article.targetReader) ? 'business' : 'personal'}" data-cost="${article.affiliateLinks.length ? 'official-check' : 'none'}" data-load="${article.affiliateLinks.length ? 'check-required' : 'self'}">
          <small>${escapeHtml(article.pillarLabel)}／${escapeHtml(article.categoryLabel)}</small>
          <h2>${escapeHtml(article.title)}</h2>
          <p>${escapeHtml(article.readerProblem)}</p>
          <span>記事を読む →</span>
        </a>`).join('\n');

const renderPillarPage = (key, articles) => {
  const pillar = PILLARS[key];
  return `${pageHead({ title: pillar.label, description: pillar.description, canonicalPath: `pillars/${key}.html` })}
  <main class="hub-page">
    <section class="hub-hero"><div class="container"><p class="hub-eyebrow">SOAM MEDIAの3本柱</p><h1>${escapeHtml(pillar.label)}</h1><p>${escapeHtml(pillar.description)}</p></div></section>
    <section class="container hub-content"><p class="hub-count">該当記事 ${articles.length}本</p><div class="hub-article-grid">${renderArticleCards(articles)}</div></section>
  </main>
${pageFoot}`;
};

const renderComparisonPage = (articles, catalog) => {
  const purposeFor = (category) => {
    if (['marketing', 'sns', 'lp'].includes(category)) return 'marketing';
    if (category === 'affiliate') return 'money';
    if (['personal', 'love', 'fortune', 'other'].includes(category)) return 'decision';
    return category;
  };
  const offerMap = new Map((catalog.offers || []).map((offer) => [offer.id, offer]));
  const cards = articles.map((article) => {
    const offers = article.affiliateLinks.map((link) => offerMap.get(link.offerId)).filter(Boolean);
    const cost = offers.some((offer) => offer.costType === 'free') ? 'free'
      : offers.some((offer) => offer.costType === 'paid') ? 'paid'
        : offers.some((offer) => offer.costType === 'freemium') ? 'freemium' : 'official-check';
    const load = offers[0]?.setupLoad || 'check-required';
    const audience = offers[0]?.audienceType || (/事業|店舗|個人事業/.test(article.targetReader) ? 'business' : 'personal');
    return `        <article class="comparison-card" data-hub-card data-purpose="${escapeHtml(purposeFor(article.category))}" data-audience="${escapeHtml(audience)}" data-cost="${escapeHtml(cost)}" data-load="${escapeHtml(load)}">
          <p class="comparison-card__meta">確認日 ${escapeHtml(article.informationVerifiedAt)}</p>
          <h2><a href="../articles/${escapeHtml(article.file)}">${escapeHtml(article.title)}</a></h2>
          <p>${escapeHtml(article.readerProblem)}</p>
          <dl><div><dt>利用目的</dt><dd>${escapeHtml(article.searchIntent)}</dd></div><div><dt>費用</dt><dd>${cost === 'official-check' ? '公式情報で確認' : cost === 'freemium' ? '無料・有料の両方' : cost === 'free' ? '無料' : '有料'}</dd></div><div><dt>導入負担</dt><dd>${load === 'light' ? '小さい' : load === 'medium' ? '確認が必要' : '公式手順を確認'}</dd></div></dl>
          <a class="comparison-card__link" href="../articles/${escapeHtml(article.file)}">選ぶ基準を確認する →</a>
        </article>`;
  }).join('\n');
  return `${pageHead({ title: '比較・選び方', description: '商品名ではなく、困りごと・利用目的・費用・導入負担・確認日から選ぶための案内です。', canonicalPath: 'guides/index.html' })}
  <main class="hub-page">
    <section class="hub-hero"><div class="container"><p class="hub-eyebrow">比較・選び方</p><h1>商品名より先に、選ぶ条件を決める。</h1><p>困りごとと利用目的を整理し、向く人・向かない人、公式情報の確認日を見ながら選べます。</p></div></section>
    <section class="container hub-content">
      <form class="hub-filters" data-hub-filters>
        <label>困りごと・目的<input type="search" name="query" placeholder="例：集客、画像、会計"></label>
        <label>利用目的<select name="purpose"><option value="all">すべて</option><option value="ai">AI・業務</option><option value="marketing">集客・発信・LP</option><option value="creative">制作</option><option value="money">お金・事業手続き</option><option value="templates">テンプレート</option><option value="diagnosis">診断</option><option value="decision">判断・相談</option></select></label>
        <label>対象<select name="audience"><option value="all">個人・事業者すべて</option><option value="personal">個人向け</option><option value="business">事業者向け</option></select></label>
        <label>費用<select name="cost"><option value="all">無料・有料すべて</option><option value="free">無料</option><option value="freemium">無料・有料</option><option value="paid">有料</option><option value="official-check">公式確認</option></select></label>
        <label>導入負担<select name="load"><option value="all">すべて</option><option value="light">小さい</option><option value="medium">確認が必要</option><option value="check-required">公式手順を確認</option></select></label>
      </form>
      <p class="hub-results" data-hub-results></p><div class="comparison-grid">${cards}</div>
    </section>
  </main>
${pageFoot}`;
};

const main = async () => {
  await loadStrategySource();
  const [original, catalog] = await Promise.all([readJson(manifestPath), readJson(catalogPath)]);
  const usage = new Map();
  let enriched = original.map((article) => enrichArticle(article, { catalog, usage, date: STRATEGY_DATE }));
  enriched = enriched.map((article) => ({ ...article, relatedArticles: chooseRelated(article, enriched) }));
  const duplicates = duplicateCandidates(enriched);
  const auditRows = [];

  for (let index = 0; index < enriched.length; index += 1) {
    const before = original[index];
    const article = enriched[index];
    const articlePath = path.join(root, 'articles', article.file);
    const html = await fs.readFile(articlePath, 'utf8');
    const actions = new Set(['KEEP']);
    const beforeOffers = list(before.affiliateLinks).map((link) => link.name);
    const afterOffers = article.affiliateLinks.map((link) => link.name);
    if (beforeOffers.some((name) => !afterOffers.includes(name))) actions.add('REMOVE_AFFILIATE');
    if (afterOffers.some((name) => !beforeOffers.includes(name))) actions.add('ADD_AFFILIATE');
    const hadSoamLink = /soamlink-cta/.test(html);
    if (hadSoamLink && !article.soamLinkEligible) actions.add('REMOVE_LINK_CTA');
    if (!hadSoamLink && article.soamLinkEligible) actions.add('ADD_LINK_CTA');
    if (!before.targetReader || !before.searchIntent || !before.pillar || !before.readerProblem) actions.add('REWRITE');
    if (!sameSet(list(before.relatedArticles), article.relatedArticles)) actions.add('REWRITE');
    if (article.auditStatus === 'HOLD') {
      actions.add('HOLD');
      actions.add('NOINDEX_CANDIDATE');
    }
    const duplicate = duplicates.get(article.slug);
    if (duplicate) {
      actions.add('MERGE');
      actions.add('REDIRECT_CANDIDATE');
    }
    const orderedActions = [...actions];
    enriched[index] = { ...article, auditActions: orderedActions, duplicateCandidate: duplicate || null };
    await fs.writeFile(articlePath, decorateArticleHtml(html, enriched[index], catalog));
    auditRows.push({ before, after: enriched[index], actions: orderedActions });
  }

  await fs.writeFile(manifestPath, `${JSON.stringify(enriched, null, 2)}\n`);
  await fs.mkdir(pillarDir, { recursive: true });
  await fs.mkdir(guideDir, { recursive: true });
  await Promise.all(Object.keys(PILLARS).map((key) => fs.writeFile(
    path.join(pillarDir, `${key}.html`),
    renderPillarPage(key, enriched.filter((article) => article.pillar === key))
  )));
  await fs.writeFile(guideDir + '/index.html', renderComparisonPage(enriched.filter((article) => article.affiliateLinks.length), catalog));

  const headers = ['タイトル', 'URL', '現在カテゴリ', '想定読者', '読者の困りごと', '検索意図', '記事種類', '3本柱', 'アフィリエイト案件ID', '案件との一致', 'SOAM Linkとの一致', '関連記事', '情報確認日', '次回見直し日', '必要な処理', '統合候補'];
  const csvRows = auditRows.map(({ after, actions }) => [
    after.title,
    canonicalUrl(`articles/${after.file}`),
    after.categoryLabel,
    after.targetReader,
    after.readerProblem,
    after.searchIntent,
    after.articleType,
    after.pillarLabel,
    after.affiliateLinks.map((link) => link.offerId).join('|'),
    after.affiliateLinks.length ? 'active案件・記事テーマ一致を確認' : '表示案件なし',
    after.soamLinkEligible ? '表示条件に一致' : '主導線にはしない',
    after.relatedArticles.join('|'),
    after.informationVerifiedAt,
    after.nextReviewAt,
    actions.join('|'),
    after.duplicateCandidate ? `${after.duplicateCandidate.mergeInto} (${after.duplicateCandidate.score})` : ''
  ].map(csvValue).join(','));
  await fs.writeFile(auditCsvPath, `${headers.map(csvValue).join(',')}\n${csvRows.join('\n')}\n`);

  const actionCounts = auditRows.flatMap((row) => row.actions).reduce((counts, action) => ({ ...counts, [action]: (counts[action] || 0) + 1 }), {});
  const markdown = `# SOAM MEDIA 82記事全件監査表\n\n確認日: ${STRATEGY_DATE} JST\n\n## 集計\n\n| 項目 | 件数 |\n| --- | ---: |\n| 確認記事 | ${enriched.length} |\n| アフィリエイト主導線 | ${enriched.filter((article) => article.primaryCtaType === 'affiliate').length} |\n| SOAM Link主導線 | ${enriched.filter((article) => article.primaryCtaType === 'soam-link').length} |\n| 関連記事主導線 | ${enriched.filter((article) => article.primaryCtaType === 'related-article').length} |\n${Object.entries(actionCounts).map(([action, count]) => `| ${action} | ${count} |`).join('\n')}\n\n全項目は \`docs/ARTICLE_AUDIT_20260801.csv\` に記録。MERGE、REDIRECT_CANDIDATE、NOINDEX_CANDIDATEは候補記録のみで、公開URLの削除・転送・検索除外は今回実施しない。\n`;
  await fs.writeFile(auditMarkdownPath, markdown);
  console.log(`[media-strategy] enriched ${enriched.length} articles; affiliate=${enriched.filter((article) => article.primaryCtaType === 'affiliate').length}; soam-link=${enriched.filter((article) => article.primaryCtaType === 'soam-link').length}`);
};

await main();
