#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFile(path.join(root, file), 'utf8');
const manifest = JSON.parse(await read('articles/data/manifest.json'));
const catalog = JSON.parse(await read('automation/affiliate-catalog.json'));
const generation = JSON.parse(await read('automation/generation-catalog.json'));
const activeOfferIds = new Set(catalog.offers.filter((offer) => offer.active).map((offer) => offer.id));
const articleHtmls = [];

assert.equal(manifest.length, 82, '既存82記事を全件維持する');
assert.equal(generation.styleGuide.rejectionPolicy.maximumGenerationApiCallsPerSlot, 1, '1枠の生成APIは1回だけ');
for (const field of ['targetReader', 'readerProblem', 'searchIntent', 'pillar', 'pillarLabel', 'articleType', 'informationVerifiedAt', 'nextReviewAt', 'primaryCtaType']) {
  assert.equal(manifest.filter((article) => !article[field]).length, 0, `全記事に ${field} が必要`);
}

for (const article of manifest) {
  assert.ok(['decision', 'systems', 'reach'].includes(article.pillar), `${article.file}: 3本柱に分類する`);
  assert.ok(article.affiliateLinks.length <= 2, `${article.file}: 案件は最大2件`);
  assert.ok(article.affiliateLinks.every((link) => activeOfferIds.has(link.offerId)), `${article.file}: 有効な案件だけを使う`);
  assert.ok(article.relatedArticles.length >= 3, `${article.file}: 関連記事を3件以上持つ`);
  const html = await read(`articles/${article.file}`);
  articleHtmls.push(html);
  assert.equal((html.match(/AUTO:EDITORIAL_STRATEGY:START/g) || []).length, 1, `${article.file}: 編集戦略を1件表示`);
  assert.equal((html.match(/AUTO:PRIMARY_CTA:START/g) || []).length, 1, `${article.file}: 主導線を1種類だけ表示`);
  assert.equal((html.match(/AUTO:ARTICLE_FRESHNESS:START/g) || []).length, 1, `${article.file}: 情報確認日を表示`);
  assert.doesNotMatch(html, /<a\b[^>]*>[^<]*(?:今すぐ登録|案件を探す|契約する|決済する|報酬を受け取る)[^<]*<\/a>/, `${article.file}: 未提供行動をリンクにしない`);
  if (article.primaryCtaType === 'affiliate') assert.match(html, /data-track-event="affiliate_click"/, `${article.file}: affiliate_click を計測`);
  if (article.primaryCtaType === 'soam-link') assert.match(html, /data-track-event="soam_link_click"/, `${article.file}: soam_link_click を計測`);
}

const home = await read('index.html');
assert.match(home, /一人で抱えていた判断を、使える手順に。/);
assert.match(home, /SOAM MEDIAは、個人で商品やサービスを作り、売り、届ける人のための実務メディアです。/);
assert.match(home, /pillars\/decision\.html/);
assert.match(home, /guides\/index\.html/);
for (const file of ['pillars/decision.html', 'pillars/systems.html', 'pillars/reach.html', 'guides/index.html']) {
  const html = await read(file);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /G-8LDQ9J4C8B/);
}
const workflow = await read('.github/workflows/generate-and-publish-media-article.yml');
for (const cron of ['0 22 * * *', '0 3 * * *', '0 11 * * *']) assert.match(workflow, new RegExp(cron.replaceAll('*', '\\*')));
assert.doesNotMatch(workflow, /Verify OpenAI connectivity/, '定時実行で余分なモデル確認APIを呼ばない');
const reader = await read('articles/article-reader.js');
const trackedMarkup = articleHtmls.join('\n');
for (const event of ['affiliate_click', 'soam_link_click', 'related_article_click', 'template_click', 'outbound_official_click']) {
  assert.ok(reader.includes(event) || home.includes(event) || trackedMarkup.includes(event), `${event} の計測経路が必要`);
}
console.log(`[media-strategy:test] passed (${manifest.length} articles, ${manifest.filter((article) => article.primaryCtaType === 'affiliate').length} affiliate CTAs)`);
