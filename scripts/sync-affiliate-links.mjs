#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');
const affiliatePattern = /(?:a8\.net|moshimo\.com)/i;
const esc = (value) => String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const [manifest, catalog] = await Promise.all([
  fs.readFile(path.join(root, 'articles/data/manifest.json'), 'utf8').then(JSON.parse),
  fs.readFile(path.join(root, 'automation/affiliate-catalog.json'), 'utf8').then(JSON.parse)
]);

const offersByCategory = new Map();
for (const offer of catalog.offers || []) {
  if (!offer.active || !offer.affiliateUrl || !offer.lastVerifiedAt) continue;
  const items = offersByCategory.get(offer.category) || [];
  items.push(offer);
  offersByCategory.set(offer.category, items);
}

const box = (offers) => `\n      <div class="affiliate-box" data-affiliate-sync="2026-08-01">\n        <p><strong>関連サービスについて</strong></p>\n        <ul>${offers.map((offer) => `\n          <li><a href="${esc(offer.affiliateUrl)}" rel="nofollow sponsored">${esc(offer.name)}</a>｜${esc(offer.summary)}</li>`).join('')}\n        </ul>\n        <p><small>この記事には紹介リンクまたはアフィリエイト広告を含みます。料金・仕様・対象外はリンク先の公式情報をご確認ください。</small></p>\n      </div>`;

const changed = [];
for (const article of manifest) {
  const offers = offersByCategory.get(article.category) || [];
  if (!offers.length) continue;
  const articlePath = path.join(root, 'articles', article.file);
  const html = await fs.readFile(articlePath, 'utf8');
  if (affiliatePattern.test(html) || html.includes('data-affiliate-sync=')) continue;
  if (!html.includes('</main>')) throw new Error(`${article.file}: 記事本文の挿入位置を確認できません。`);
  const closingMain = html.includes('\n  </main>') ? '\n  </main>' : '\n</main>';
  if (!html.includes(closingMain)) throw new Error(`${article.file}: 記事本文の挿入位置を確認できません。`);
  const selected = offers.slice(0, 2);
  const next = html.replace(closingMain, `${box(selected)}${closingMain}`);
  article.affiliateLinks = selected.map((offer) => ({ name: offer.name, asp: offer.asp, placement: '関連サービス', reason: offer.summary }));
  changed.push({ slug: article.slug, offers: selected.map((offer) => offer.name) });
  if (!dryRun) await fs.writeFile(articlePath, next);
}

if (!dryRun) await fs.writeFile(path.join(root, 'articles/data/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[affiliate-sync] ${dryRun ? 'would update' : 'updated'} ${changed.length} article(s)`);
for (const item of changed) console.log(`[affiliate-sync] ${item.slug}: ${item.offers.join(', ')}`);
