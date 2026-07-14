#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalUrl } from './seo-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const read = (file) => fs.readFile(path.join(rootDir, file), 'utf8');
const manifest = JSON.parse(await read('articles/data/manifest.json'));
const published = manifest.filter((article) => article.status === 'published');

assert.ok(published.length > 0, '公開済み記事が必要です。');

const jsonLdFor = (html, marker) => {
  const match = html.match(new RegExp(`<script type="application/ld\\+json" data-seo="${marker}">([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `${marker} の構造化データが必要です。`);
  return JSON.parse(match[1]);
};

for (const article of published) {
  assert.ok(article.metaDescription?.trim(), `${article.file}: metaDescription が必要です。`);
  const html = await read(`articles/${article.file}`);
  assert.match(html, /<meta name="description" content="[^"]+">/, `${article.file}: description が必要です。`);
  assert.ok(html.includes(`rel="canonical" href="${canonicalUrl(`articles/${article.file}`)}"`), `${article.file}: canonical が不正です。`);
  const data = jsonLdFor(html, 'article');
  assert.equal(data['@type'], 'Article', `${article.file}: Article 型が必要です。`);
  assert.equal(data.headline, article.title, `${article.file}: JSON-LD の見出しが不一致です。`);
  assert.equal(data.mainEntityOfPage?.['@id'], canonicalUrl(`articles/${article.file}`), `${article.file}: JSON-LD のURLが不正です。`);
}

for (const file of ['index.html', 'articles/index.html', 'editorial-policy.html', 'privacy.html', 'contact.html']) {
  const html = await read(file);
  const pagePath = file === 'index.html' ? '' : file;
  assert.ok(html.includes(`rel="canonical" href="${canonicalUrl(pagePath)}"`), `${file}: canonical が不正です。`);
}

const home = await read('index.html');
const webSite = jsonLdFor(home, 'website');
assert.equal(webSite['@type'], 'WebSite', 'トップページに WebSite 構造化データが必要です。');
assert.equal(webSite.url, canonicalUrl(), 'WebSite のURLが不正です。');

const robots = await read('robots.txt');
assert.ok(robots.includes(`Sitemap: ${canonicalUrl('sitemap.xml')}`), 'robots.txt に sitemap の場所が必要です。');
const sitemap = await read('sitemap.xml');
for (const article of published) {
  assert.ok(sitemap.includes(`<loc>${canonicalUrl(`articles/${article.file}`)}</loc>`), `${article.file}: sitemap にありません。`);
}
assert.ok(!sitemap.includes('saved.html'), '端末内保存ページは sitemap に含めません。');

const saved = await read('saved.html');
assert.match(saved, /<meta name="robots" content="noindex,follow">/, '保存ページは noindex,follow にします。');

console.log(`[media-seo:test] passed (${published.length} published articles)`);
