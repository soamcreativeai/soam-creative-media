#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalUrl } from './seo-utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const value = (name) => process.argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const baseUrl = (value('--base-url') || 'https://media.soam-creative.com').replace(/\/$/, '');
const articleFile = value('--article-file');
if (!articleFile || !/^article-\d+\.html$/.test(articleFile)) throw new Error('--article-file=article-XX.html が必要です。');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'articles/data/manifest.json'), 'utf8'));
const article = manifest.find((item) => item.status === 'published' && item.file === articleFile);
if (!article) throw new Error(`${articleFile} は公開済みmanifestにありません。`);
const expectedCanonical = canonicalUrl(`articles/${articleFile}`);
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const page = async (pathname) => {
  let lastError;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${pathname}`, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
      const html = await response.text();
      if (response.ok) return html;
      lastError = new Error(`${pathname}: HTTP ${response.status}`);
    } catch (error) { lastError = error; }
    await wait(3000);
  }
  throw lastError || new Error(`${pathname}: 応答を取得できませんでした。`);
};
const text = await page(`/articles/${articleFile}`);
const bareText = await page(`/articles/${articleFile.replace(/\.html$/, '')}`);
const index = await page('/articles/index.html');
const sitemap = await page('/sitemap.xml');
const title = (text.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim();
const h1 = (text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, '').trim();
const canonical = (text.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i) || [])[1];
const rawJsonLd = (text.match(/<script[^>]+data-seo="article"[^>]*>([\s\S]*?)<\/script>/i) || [])[1];
let jsonLd;
try { jsonLd = JSON.parse(rawJsonLd); } catch { throw new Error(`${articleFile}: Article JSON-LD を解析できません。`); }
const errors = [];
if (title !== `${article.title} | SOAM CREATIVE`) errors.push(`title が記事タイトルと一致しません: ${title || 'なし'}`);
if (h1 !== article.title) errors.push(`h1 が記事タイトルと一致しません: ${h1 || 'なし'}`);
if (canonical !== expectedCanonical) errors.push(`canonical が不正です: ${canonical || 'なし'}`);
if (jsonLd['@type'] !== 'Article' || jsonLd.headline !== article.title || jsonLd.mainEntityOfPage?.['@id'] !== expectedCanonical) errors.push('Article JSON-LD が記事と一致しません。');
if (!text.includes(article.title) || bareText.includes('<title>SOAM Media｜')) errors.push('記事URLがトップページfallbackを返しています。');
if (!index.includes(article.title)) errors.push('記事一覧に記事タイトルがありません。');
if (!sitemap.includes(`<loc>${expectedCanonical}</loc>`)) errors.push('sitemapに記事URLがありません。');
if (errors.length) throw new Error(`カスタムドメイン公開検証に失敗しました。\n- ${errors.join('\n- ')}`);
console.log(`[media-publication] verified ${baseUrl}/articles/${articleFile}: title, h1, canonical, Article JSON-LD, index, sitemap, and extensionless path`);
