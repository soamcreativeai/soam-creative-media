#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalUrl } from './seo-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const manifestPath = path.join(rootDir, 'articles/data/manifest.json');
const sitemapPath = path.join(rootDir, 'sitemap.xml');
const xmlEscape = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const articles = manifest
  .filter((article) => article.status === 'published')
  .sort((a, b) => `${a.file}`.localeCompare(`${b.file}`, 'ja'));
const latestDate = articles.map((article) => article.updatedAt || article.publishedAt).sort().at(-1) || '2026-07-14';
const staticPages = [
  { path: '', lastmod: latestDate },
  { path: 'articles/index.html', lastmod: latestDate },
  { path: 'editorial-policy.html', lastmod: '2026-07-14' },
  { path: 'privacy.html', lastmod: '2026-07-14' },
  { path: 'contact.html', lastmod: '2026-07-14' },
  { path: 'shindan-ai.html', lastmod: latestDate },
  { path: 'ai-tool-lp.html', lastmod: latestDate }
];
const urls = [
  ...staticPages.map((page) => ({ loc: canonicalUrl(page.path), lastmod: page.lastmod })),
  ...articles.map((article) => ({
    loc: canonicalUrl(`articles/${article.file}`),
    lastmod: article.updatedAt || article.publishedAt
  }))
];
const body = urls.map((entry) => `  <url>\n    <loc>${xmlEscape(entry.loc)}</loc>\n    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>\n  </url>`).join('\n');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

await fs.writeFile(sitemapPath, sitemap);
console.log(`[sitemap] generated ${urls.length} URLs.`);
