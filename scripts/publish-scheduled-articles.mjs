#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleStructuredData, canonicalUrl, jsonForScript } from './seo-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const queuePath = path.join(rootDir, 'automation/article-queue.json');
const approvedContentDir = path.join(rootDir, 'automation/approved-content');
const manifestPath = path.join(rootDir, 'articles/data/manifest.json');
const articleIndexPath = path.join(rootDir, 'articles/index.html');
const homePath = path.join(rootDir, 'index.html');

const cliArguments = process.argv.slice(2);
const args = new Set(cliArguments);
const nowArgument = cliArguments.find((argument) => argument.startsWith('--now='));
const now = nowArgument ? new Date(nowArgument.slice('--now='.length)) : new Date();
const isCheck = args.has('--check');
const isDryRun = args.has('--dry-run');
const isSyncOnly = args.has('--sync-indexes');

if (Number.isNaN(now.getTime())) {
  throw new Error('`--now` は ISO 8601 形式で指定してください。');
}

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const datePartsInTokyo = (value) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(value);
  const values = Object.fromEntries(parts
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    display: `${Number(values.year)}年${Number(values.month)}月${Number(values.day)}日`
  };
};

const requireString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} を入力してください。`);
  }
  return value.trim();
};

const replaceManagedSection = (html, name, content) => {
  const expression = new RegExp(`(<!-- AUTO:${name}:START -->)[\\s\\S]*?(<!-- AUTO:${name}:END -->)`);
  if (!expression.test(html)) {
    throw new Error(`${name} の更新マーカーが見つかりません。`);
  }
  return html.replace(expression, `$1\n${content}\n        $2`);
};

const excerptFor = (article) => article.excerpt || article.metaDescription || '記事を読む';
const displayArticleDate = (date) => date
  ? datePartsInTokyo(new Date(`${date}T00:00:00+09:00`)).display
  : '';

const visualClassFor = (article) => {
  const key = article.category;
  if (key === 'ai') return 'media-thumb-ai';
  if (['creative', 'sns', 'templates'].includes(key)) return 'media-thumb-creative';
  if (['marketing', 'diagnosis'].includes(key)) return 'media-thumb-marketing';
  if (key === 'personal') return 'media-thumb-personal';
  if (['money', 'affiliate'].includes(key)) return 'media-thumb-money';
  if (key === 'love') return 'media-thumb-love';
  if (key === 'fortune') return 'media-thumb-fortune';
  return 'media-thumb-default';
};

const articleNumber = (article) => Number((article.slug || article.file || '').match(/(\d+)(?:\.html)?$/)?.[1] || 0);

const sortedPublished = (manifest) => manifest
  .filter((article) => article.status === 'published')
  .sort((a, b) => {
    const dateOrder = `${b.updatedAt || b.publishedAt || ''}`.localeCompare(`${a.updatedAt || a.publishedAt || ''}`);
    if (dateOrder) return dateOrder;
    const numberOrder = articleNumber(b) - articleNumber(a);
    if (numberOrder) return numberOrder;
    return `${b.file || ''}`.localeCompare(`${a.file || ''}`, 'ja');
  });

const renderArticleList = (articles) => articles.map((article) => `      <a class="article-card" href="${escapeHtml(article.file)}">
        <div class="thumb">SOAM CREATIVE</div>
        <div class="body">
          <span class="tag">${escapeHtml(article.categoryLabel || 'その他')}</span>
          <h3>${escapeHtml(article.title)}</h3>
          <p>公開日：${escapeHtml(displayArticleDate(article.publishedAt || ''))}</p>
          <span class="read-more">記事を読む →</span>
        </div>
      </a>`).join('\n\n');

const renderHomeHero = (articles) => {
  const classes = ['media-tile-main', 'media-tile-pink', 'media-tile-blue', 'media-tile-yellow'];
  return articles.slice(0, 4).map((article, index) => {
    const heading = index === 0 ? 'h1' : 'h2';
    const readLink = index === 0 ? '\n          <span class="media-read">記事を読む →</span>' : '';
    return `        <a class="media-tile ${classes[index]}" href="articles/${escapeHtml(article.file)}">
          <span class="media-pill">${escapeHtml(article.categoryLabel || '記事')}</span>
          <${heading}>${escapeHtml(article.title)}</${heading}>
          <p>${escapeHtml(excerptFor(article))}</p>${readLink}
        </a>`;
  }).join('\n');
};

const renderLatest = (articles) => articles.slice(0, 8).map((article) => {
  const date = article.updatedAt || article.publishedAt || '';
  return `          <a class="media-article" href="articles/${escapeHtml(article.file)}"><div class="media-thumb ${visualClassFor(article)}"></div><div class="media-article-copy"><small>${escapeHtml(article.categoryLabel || 'その他')}</small><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(excerptFor(article))}</p><time class="media-article-date" datetime="${escapeHtml(date)}">更新日：${escapeHtml(displayArticleDate(date))}</time><span>記事を読む →</span></div></a>`;
}).join('\n');

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const validateArticle = (entry, slots, existingManifest) => {
  requireString(entry.id, 'キューID');
  if (!['draft', 'review', 'approved', 'published'].includes(entry.status)) {
    throw new Error(`${entry.id}: status は draft / review / approved / published のいずれかにしてください。`);
  }
  const scheduledAt = new Date(requireString(entry.scheduledAt, `${entry.id}: scheduledAt`));
  if (Number.isNaN(scheduledAt.getTime())) throw new Error(`${entry.id}: scheduledAt の形式が不正です。`);
  const slot = slots.get(requireString(entry.slot, `${entry.id}: slot`));
  if (!slot) throw new Error(`${entry.id}: 定義されていない公開枠です。`);
  if (datePartsInTokyo(scheduledAt).time !== slot.time) {
    throw new Error(`${entry.id}: scheduledAt は ${slot.time}（${slot.id}）に合わせてください。`);
  }
  if (!entry.article || typeof entry.article !== 'object') {
    throw new Error(`${entry.id}: article を入力してください。`);
  }

  const article = entry.article;
  const slug = requireString(article.slug, `${entry.id}: article.slug`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`${entry.id}: article.slug は英小文字・数字・ハイフンだけで指定してください。`);
  }
  requireString(article.title, `${entry.id}: article.title`);
  requireString(article.category, `${entry.id}: article.category`);
  requireString(article.categoryLabel, `${entry.id}: article.categoryLabel`);
  requireString(article.excerpt, `${entry.id}: article.excerpt`);
  requireString(article.metaDescription, `${entry.id}: article.metaDescription`);

  const existing = existingManifest.find((item) => item.slug === slug || item.file === `${slug}.html`);
  if (entry.status !== 'published' && existing) {
    throw new Error(`${entry.id}: ${slug} はすでに公開済みの記事と重複しています。`);
  }
  if (entry.status === 'approved') {
    const source = requireString(entry.source, `${entry.id}: source`);
    const sourcePath = path.resolve(rootDir, source);
    if (!sourcePath.startsWith(`${approvedContentDir}${path.sep}`)) {
      throw new Error(`${entry.id}: source は automation/approved-content/ 配下に置いてください。`);
    }
  }
};

const validateQueue = (queue, manifest) => {
  if (!queue || queue.timezone !== 'Asia/Tokyo') {
    throw new Error('article-queue.json の timezone は Asia/Tokyo にしてください。');
  }
  if (!Array.isArray(queue.slots) || queue.slots.length !== 3) {
    throw new Error('公開枠は朝・昼・晩の3件を定義してください。');
  }
  const slots = new Map();
  queue.slots.forEach((slot) => {
    const id = requireString(slot.id, 'slot.id');
    const time = requireString(slot.time, `${id}: time`);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(`${id}: 時刻の形式が不正です。`);
    if (slots.has(id)) throw new Error(`公開枠 ${id} が重複しています。`);
    slots.set(id, { ...slot, time });
  });
  if (!Array.isArray(queue.articles)) throw new Error('articles は配列にしてください。');

  const ids = new Set();
  const articleKeys = new Set();
  const reservationKeys = new Set();
  queue.articles.forEach((entry) => {
    validateArticle(entry, slots, manifest);
    if (ids.has(entry.id)) throw new Error(`キューID ${entry.id} が重複しています。`);
    ids.add(entry.id);
    if (articleKeys.has(entry.article.slug)) throw new Error(`記事 ${entry.article.slug} がキュー内で重複しています。`);
    articleKeys.add(entry.article.slug);
    if (entry.status !== 'published') {
      const reservationKey = `${entry.scheduledAt}|${entry.slot}`;
      if (reservationKeys.has(reservationKey)) throw new Error(`${reservationKey} に複数の記事が予約されています。`);
      reservationKeys.add(reservationKey);
    }
  });
};

const readApprovedContent = async (entry) => {
  const sourcePath = path.resolve(rootDir, entry.source);
  const content = (await fs.readFile(sourcePath, 'utf8')).trim();
  if (!content) throw new Error(`${entry.id}: 本文が空です。`);
  if (/<(?:html|head|body|script|iframe)\b|\son[a-z]+\s*=/i.test(content)) {
    throw new Error(`${entry.id}: 本文にはページ全体・script・iframe・イベント属性を入れないでください。`);
  }
  return content;
};

const buildDisclosure = (article) => article.containsAffiliateLinks ? `
      <div class="affiliate-box">
        <p><strong>広告・紹介リンクについて</strong></p>
        <p>この記事には紹介リンクまたはアフィリエイト広告を含む場合があります。料金・仕様・提供条件は変更されることがあるため、リンク先の公式情報をご確認ください。</p>
      </div>` : '';

const renderArticlePage = (entry, content) => {
  const article = entry.article;
  const published = datePartsInTokyo(new Date(entry.scheduledAt));
  const file = `${article.slug}.html`;
  const structuredData = articleStructuredData({
    title: article.title,
    description: article.metaDescription,
    file,
    publishedAt: published.date,
    updatedAt: published.date
  });
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(article.metaDescription)}">
  <title>${escapeHtml(article.metaTitle || article.title)} | SOAM CREATIVE</title>
  <link rel="canonical" href="${canonicalUrl(`articles/${file}`)}" data-seo="canonical">
  <script type="application/ld+json" data-seo="article">${jsonForScript(structuredData)}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-8LDQ9J4C8B" data-analytics="ga4-loader"></script>
  <script data-analytics="ga4">
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-8LDQ9J4C8B');
  </script>
  <link rel="stylesheet" href="../style.css">
  <script src="article-reader.js" defer></script>
</head>
<body>
  <header>
    <div class="header-inner">
      <a href="../index.html" class="logo">● SOAM CREATIVE</a>
      <nav>
        <a href="../index.html">ホーム</a>
        <a href="../articles/index.html">記事一覧</a>
        <a href="../privacy.html">プライバシーポリシー</a>
        <a href="../contact.html">お問い合わせ</a>
      </nav>
    </div>
  </header>
  <main class="article-body">
    <div class="article-container">
      <p class="article-category">${escapeHtml(article.categoryLabel)}</p>
      <h1>${escapeHtml(article.title)}</h1>
      <p class="article-date">${published.display}</p>
      <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
${content}
${buildDisclosure(article)}
    </div>
  </main>
  <footer>
    <p>本サイトはアフィリエイト広告を利用しています。</p>
    <a href="../privacy.html">プライバシーポリシー</a>
    <p>© 2026 SOAM CREATIVE. All rights reserved.</p>
  </footer>
</body>
</html>
`;
};

const syncIndexes = async (manifest, dryRun) => {
  const articles = sortedPublished(manifest);
  const updated = datePartsInTokyo(now);
  const articleIndex = await fs.readFile(articleIndexPath, 'utf8');
  const home = await fs.readFile(homePath, 'utf8');
  const nextArticleIndex = replaceManagedSection(articleIndex, 'ARTICLE_LIST', renderArticleList(articles));
  const nextHome = replaceManagedSection(
    replaceManagedSection(home, 'HOME_HERO', renderHomeHero(articles)),
    'HOME_LATEST',
    renderLatest(articles)
  );
  const homeWithUpdatedDate = replaceManagedSection(
    nextHome,
    'SITE_UPDATED_AT',
    `<time class="media-site-updated" datetime="${updated.date}">最終更新：${updated.display}</time>`
  );
  if (!dryRun) {
    await Promise.all([
      fs.writeFile(articleIndexPath, nextArticleIndex),
      fs.writeFile(homePath, homeWithUpdatedDate)
    ]);
  }
};

const main = async () => {
  const [queue, manifest] = await Promise.all([readJson(queuePath), readJson(manifestPath)]);
  validateQueue(queue, manifest);
  if (isCheck) {
    console.log(`[scheduled-publish] queue is valid: ${queue.articles.length} article(s), ${queue.slots.length} slot(s).`);
    return;
  }

  const due = queue.articles
    .filter((entry) => entry.status === 'approved' && new Date(entry.scheduledAt) <= now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  if (!due.length) {
    if (isSyncOnly) {
      await syncIndexes(manifest, isDryRun);
      console.log(`[scheduled-publish] ${isDryRun ? 'would synchronize' : 'synchronized'} ${sortedPublished(manifest).length} published article(s).`);
      return;
    }
    console.log('[scheduled-publish] no approved articles are due.');
    return;
  }

  const nextManifest = [...manifest];
  for (const entry of due) {
    const content = await readApprovedContent(entry);
    const articlePath = path.join(rootDir, 'articles', `${entry.article.slug}.html`);
    const published = datePartsInTokyo(new Date(entry.scheduledAt));
    const manifestItem = {
      title: entry.article.title,
      slug: entry.article.slug,
      file: `${entry.article.slug}.html`,
      category: entry.article.category,
      categoryLabel: entry.article.categoryLabel,
      articleType: entry.article.articleType || 'editorial',
      targetIndustry: entry.article.targetIndustry || 'all',
      targetReader: entry.article.targetReader || null,
      tags: Array.isArray(entry.article.tags) ? entry.article.tags : [],
      excerpt: entry.article.excerpt,
      metaTitle: entry.article.metaTitle || entry.article.title,
      metaDescription: entry.article.metaDescription,
      publishedAt: published.date,
      updatedAt: published.date,
      status: 'published',
      primaryCta: entry.article.primaryCta || null,
      affiliateLinks: Array.isArray(entry.article.affiliateLinks) ? entry.article.affiliateLinks : [],
      relatedArticles: Array.isArray(entry.article.relatedArticles) ? entry.article.relatedArticles : []
    };
    if (!isDryRun) await fs.writeFile(articlePath, renderArticlePage(entry, content));
    nextManifest.push(manifestItem);
    entry.status = 'published';
    entry.publishedAt = new Date().toISOString();
    console.log(`[scheduled-publish] ${isDryRun ? 'would publish' : 'published'} ${entry.article.slug} (${entry.slot}, ${published.display}).`);
  }

  if (!isDryRun) {
    await fs.writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
    await fs.writeFile(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
    await syncIndexes(nextManifest, false);
  }
};

main().catch((error) => {
  console.error(`[scheduled-publish] ${error.message}`);
  process.exitCode = 1;
});
