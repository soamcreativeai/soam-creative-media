#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fixtureArticle, nextArticleNumber, qualityErrors, selectOffers, selectTheme, slotKey, slots, tokyoParts } from './media-generation-utils.mjs';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const value = (name) => process.argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const now = value('--now') ? new Date(value('--now')) : new Date();
const requestedSlot = value('--slot');
const dryRun = args.has('--dry-run');
const fixture = args.has('--fixture');
if (Number.isNaN(now.getTime())) throw new Error('`--now` は ISO 8601 形式で指定してください。');

const readJson = async (file) => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const selectedSlot = () => {
  if (requestedSlot) { if (!slots[requestedSlot]) throw new Error(`未知のslotです: ${requestedSlot}`); return requestedSlot; }
  const time = tokyoParts(now).time;
  if (time >= slots.evening || time < slots.morning) return 'evening';
  if (time >= slots.noon) return 'noon';
  return 'morning';
};
const modelArticle = async (input) => {
  if (fixture) return fixtureArticle(input.theme);
  const baseUrl = process.env.MEDIA_AI_BASE_URL;
  const apiKey = process.env.MEDIA_AI_API_KEY;
  const model = process.env.MEDIA_AI_MODEL;
  if (!baseUrl || !apiKey || !model) throw new Error('AI生成を実行するには MEDIA_AI_BASE_URL、MEDIA_AI_API_KEY、MEDIA_AI_MODEL をGitHub Actions Secretに設定してください。');
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.3, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'あなたはSOAM Mediaの編集者です。JSONのみを返します。事実・料金・実績・比較結果を創作せず、本文にURLや広告リンクを入れません。' }, { role: 'user', content: JSON.stringify(input) }] }) });
  if (!response.ok) throw new Error(`AI API request failed: ${response.status}`);
  const data = await response.json();
  try { return JSON.parse(data.choices?.[0]?.message?.content || ''); } catch { throw new Error('AI APIがJSON本文を返しませんでした。'); }
};
const serviceBox = (offers) => offers.length ? `<div class="affiliate-box"><p><strong>関連サービスについて</strong></p><ul>${offers.map((offer) => `<li><a href="${esc(offer.affiliateUrl)}">${esc(offer.name)}</a>｜${esc(offer.summary)}</li>`).join('')}</ul><p><small>この記事には紹介リンクまたはアフィリエイト広告を含みます。料金・仕様・対象外は公式情報をご確認ください。</small></p></div>` : '';

const main = async () => {
  const [manifest, queue, catalog, affiliateCatalog] = await Promise.all([readJson('articles/data/manifest.json'), readJson('automation/article-queue.json'), readJson('automation/generation-catalog.json'), readJson('automation/affiliate-catalog.json')]);
  const slot = selectedSlot(); const date = tokyoParts(now).date; const id = `${slotKey(date, slot)}-auto`;
  if (queue.articles.some((entry) => entry.id === id)) { console.log(`[media-generation] no-op: ${id} is already recorded.`); return; }
  const choice = selectTheme({ catalog, manifest, slot }); const number = nextArticleNumber(manifest); const slug = `article-${number}`;
  const offers = selectOffers({ offers: affiliateCatalog.offers || [], category: choice.theme.category, manifest });
  const input = { theme: choice.theme, slot, existingTitles: manifest.map((article) => article.title), styleGuide: catalog.styleGuide, offers: offers.map(({ name, summary, allowedClaims, prohibitedClaims }) => ({ name, summary, allowedClaims, prohibitedClaims })), relatedArticles: manifest.filter((article) => article.category === choice.theme.category).slice(-3).map((article) => ({ file: article.file, title: article.title })), currentSoamLinkState: 'SOAM Linkの未確認・未公開機能を提供中として書かない。' };
  const maxAttempts = Number(process.env.MEDIA_AI_MAX_ATTEMPTS || 3);
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) throw new Error('MEDIA_AI_MAX_ATTEMPTS は 1〜5 の整数にしてください。');
  let generated; let errors = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    generated = await modelArticle({ ...input, retry: attempt > 1 ? { attempt, previousErrors: errors } : undefined });
    errors = qualityErrors({ article: generated, styleGuide: catalog.styleGuide, expectedTitlePool: manifest.map((article) => article.title), expectedTextPool: manifest.map((article) => `${article.title} ${article.excerpt} ${(article.tags || []).join(' ')}`), offers });
    if (!errors.length) break;
  }
  if (errors.length) throw new Error(`品質検査に${maxAttempts}回失敗しました。書込み・公開は行いません。\n- ${errors.join('\n- ')}`);
  const scheduledAt = `${date}T${slots[slot]}:00+09:00`;
  const entry = { id, status: 'approved', slot, scheduledAt, source: `automation/generated-content/${slug}.html`, generated: { themeId: choice.theme.id, score: choice.score, provider: fixture ? 'fixture' : 'configured-ai' }, article: { slug, title: generated.title, category: choice.theme.category, categoryLabel: choice.theme.categoryLabel, articleType: choice.theme.articleType, targetIndustry: 'all', targetReader: choice.theme.reader, tags: [choice.theme.categoryLabel, ...choice.theme.intent.split(' ')], excerpt: generated.excerpt, metaDescription: generated.metaDescription, primaryCta: null, affiliateLinks: offers.map((offer) => ({ name: offer.name, asp: offer.asp, placement: '関連サービス', reason: offer.summary })), relatedArticles: input.relatedArticles.map((article) => article.file.replace('.html', '')), containsAffiliateLinks: offers.length > 0 } };
  const report = { slot, id, articleNumber: number, slug, theme: choice.theme.id, offers: offers.map((offer) => offer.name), title: generated.title, metaDescription: generated.metaDescription, headings: [...generated.bodyHtml.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi)].map((match) => match[1]), output: `articles/${slug}.html`, dryRun };
  console.log(`[media-generation] ${JSON.stringify(report)}`);
  if (dryRun) return;
  await fs.mkdir(path.join(root, 'automation/generated-content'), { recursive: true });
  await fs.writeFile(path.join(root, entry.source), `${generated.bodyHtml}\n${serviceBox(offers)}\n`);
  queue.articles.push(entry);
  await fs.writeFile(path.join(root, 'automation/article-queue.json'), `${JSON.stringify(queue, null, 2)}\n`);
  await exec(process.execPath, ['scripts/publish-scheduled-articles.mjs', `--now=${scheduledAt}`], { cwd: root });
  console.log(`[media-generation] published ${slug}: ${generated.title}`);
};
main().catch((error) => { console.error(`[media-generation] ${error.message}`); process.exitCode = 1; });
