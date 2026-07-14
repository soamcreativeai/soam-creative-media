#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleStructuredData, canonicalUrl, jsonForScript } from './seo-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const analyticsId = 'G-8LDQ9J4C8B';
const manifest = JSON.parse(await fs.readFile(path.join(rootDir, 'articles/data/manifest.json'), 'utf8'));

const escapeAttribute = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const analyticsBlock = `  <script async src="https://www.googletagmanager.com/gtag/js?id=${analyticsId}" data-analytics="ga4-loader"></script>
  <script data-analytics="ga4">
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${analyticsId}');
  </script>`;

const removeGenerated = (html) => html
  .replace(/\s*<link[^>]*data-seo="canonical"[^>]*>\s*/gi, '\n')
  .replace(/\s*<script[^>]*data-seo="article"[^>]*>[\s\S]*?<\/script>\s*/gi, '\n')
  .replace(/\s*<script[^>]*data-seo="website"[^>]*>[\s\S]*?<\/script>\s*/gi, '\n')
  .replace(/\s*<script[^>]*data-analytics="ga4-loader"[^>]*><\/script>\s*/gi, '\n')
  .replace(/\s*<script[^>]*data-analytics="ga4"[^>]*>[\s\S]*?<\/script>\s*/gi, '\n');

const ensureDescription = (html, description) => {
  if (/<meta\s+name=["']description["']/i.test(html)) return html;
  return html.replace(/(<title>[\s\S]*?<\/title>)/i, `$1\n  <meta name="description" content="${escapeAttribute(description)}">`);
};

const insertHeadBlocks = (html, blocks) => html.replace('</head>', `${blocks.join('\n')}\n</head>`);

const applyArticle = async (article) => {
  const pagePath = path.join(rootDir, 'articles', article.file);
  const original = await fs.readFile(pagePath, 'utf8');
  const description = article.metaDescription || article.excerpt;
  if (!description) throw new Error(`${article.file}: metaDescription または excerpt が必要です。`);
  const clean = ensureDescription(removeGenerated(original), description);
  const canonical = canonicalUrl(`articles/${article.file}`);
  const structuredData = articleStructuredData({
    title: article.title,
    description,
    file: article.file,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt
  });
  const next = insertHeadBlocks(clean, [
    `  <link rel="canonical" href="${canonical}" data-seo="canonical">`,
    `  <script type="application/ld+json" data-seo="article">${jsonForScript(structuredData)}</script>`,
    analyticsBlock
  ]);
  await fs.writeFile(pagePath, next);
};

const staticPages = [
  { file: 'index.html', path: '', type: 'website' },
  { file: 'articles/index.html', path: 'articles/index.html' },
  { file: 'editorial-policy.html', path: 'editorial-policy.html' },
  { file: 'privacy.html', path: 'privacy.html' },
  { file: 'contact.html', path: 'contact.html' }
];

const applyStaticPage = async (page) => {
  const pagePath = path.join(rootDir, page.file);
  const original = await fs.readFile(pagePath, 'utf8');
  const clean = removeGenerated(original);
  const blocks = [`  <link rel="canonical" href="${canonicalUrl(page.path)}" data-seo="canonical">`];
  if (page.type === 'website') {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'SOAM CREATIVE MEDIA',
      url: canonicalUrl()
    };
    blocks.push(`  <script type="application/ld+json" data-seo="website">${jsonForScript(data)}</script>`);
  }
  blocks.push(analyticsBlock);
  await fs.writeFile(pagePath, insertHeadBlocks(clean, blocks));
};

for (const article of manifest.filter((article) => article.status === 'published')) await applyArticle(article);
for (const page of staticPages) await applyStaticPage(page);
console.log(`[media-seo] updated ${manifest.filter((article) => article.status === 'published').length} articles and ${staticPages.length} static pages.`);
