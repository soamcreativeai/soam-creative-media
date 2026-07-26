#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalUrl } from './seo-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const read = (file) => fs.readFile(path.join(rootDir, file), 'utf8');
const manifest = JSON.parse(await read('articles/data/manifest.json'));
const published = manifest.filter((article) => article.status === 'published');

const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

check(published.length > 0, '公開済み記事が必要です。');

const jsonLdFor = (html, marker) => {
  const match = html.match(new RegExp(`<script type="application/ld\\+json" data-seo="${marker}">([\\s\\S]*?)<\\/script>`));
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

for (const article of published) {
  check(article.metaDescription?.trim(), `${article.file}: metaDescription が必要です。`);
  const html = await read(`articles/${article.file}`);
  check(/<meta name="description" content="[^"]+">/.test(html), `${article.file}: description が必要です。`);
  const expectedCanonical = canonicalUrl(`articles/${article.file}`);
  const canonicals = [...html.matchAll(/<link\b[^>]*\brel="canonical"[^>]*>/gi)]
    .map((match) => match[0].match(/\bhref="([^"]+)"/i)?.[1]);
  check(canonicals.length > 0, `${article.file}: canonical がありません。`);
  check(canonicals.length <= 1, `${article.file}: canonical が重複しています。`);
  check(canonicals.length === 1 && canonicals[0] === expectedCanonical, `${article.file}: canonical が不正です。`);
  const data = jsonLdFor(html, 'article');
  check(data, `${article.file}: Article JSON-LD が必要です。`);
  if (data) {
    check(data['@type'] === 'Article', `${article.file}: Article 型が必要です。`);
    check(data.headline === article.title, `${article.file}: JSON-LD の見出しが不一致です。`);
    check(data.mainEntityOfPage?.['@id'] === expectedCanonical || data.url === expectedCanonical, `${article.file}: JSON-LD のURLが不正です。`);
  }
  const ogUrl = html.match(/<meta\b[^>]*(?:property|name)="og:url"[^>]*content="([^"]+)"[^>]*>/i)?.[1]
    || html.match(/<meta\b[^>]*content="([^"]+)"[^>]*(?:property|name)="og:url"[^>]*>/i)?.[1];
  check(!ogUrl || ogUrl === expectedCanonical, `${article.file}: og:url がcanonicalと不一致です。`);
}

for (const file of ['index.html', 'articles/index.html', 'editorial-policy.html', 'privacy.html', 'contact.html']) {
  const html = await read(file);
  const pagePath = file === 'index.html' ? '' : file;
  check(html.includes(`rel="canonical" href="${canonicalUrl(pagePath)}"`), `${file}: canonical が不正です。`);
}

const home = await read('index.html');
const webSite = jsonLdFor(home, 'website');
check(webSite, 'トップページに WebSite 構造化データが必要です。');
if (webSite) {
  check(webSite['@type'] === 'WebSite', 'トップページに WebSite 構造化データが必要です。');
  check(webSite.url === canonicalUrl(), 'WebSite のURLが不正です。');
}

const robots = await read('robots.txt');
check(robots.includes(`Sitemap: ${canonicalUrl('sitemap.xml')}`), 'robots.txt に sitemap の場所が必要です。');
const sitemap = await read('sitemap.xml');
for (const article of published) {
  check(sitemap.includes(`<loc>${canonicalUrl(`articles/${article.file}`)}</loc>`), `${article.file}: sitemap にありません。`);
}
check(!sitemap.includes('saved.html'), '端末内保存ページは sitemap に含めません。');

const saved = await read('saved.html');
check(/<meta name="robots" content="noindex,follow">/.test(saved), '保存ページは noindex,follow にします。');

if (errors.length) {
  console.error(`[media-seo:test] failed (${errors.length} issue(s) across ${published.length} published articles)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`[media-seo:test] passed (${published.length} published articles)`);
}
