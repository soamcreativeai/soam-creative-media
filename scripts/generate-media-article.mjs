#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fixtureArticle, nextArticleNumber, qualityErrors, selectOffers, selectTheme, slotKey, slots, tokyoParts } from './media-generation-utils.mjs';
import { articleStructuredData, canonicalUrl, jsonForScript } from './seo-utils.mjs';
import { SOAM_LINK_URL } from './site-links.mjs';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const value = (name) => process.argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const now = value('--now') ? new Date(value('--now')) : new Date();
const requestedSlot = value('--slot');
const dryRun = args.has('--dry-run');
const fixture = args.has('--fixture');
const verifyOpenAI = args.has('--verify-openai');
const listOpenAIModels = args.has('--list-openai-models');
if (Number.isNaN(now.getTime())) throw new Error('`--now` は ISO 8601 形式で指定してください。');

const readJson = async (file) => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const esc = (text) => String(text || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const openAiConfig = ({ requireModel = true } = {}) => {
  const baseUrl = process.env.MEDIA_AI_BASE_URL;
  const apiKey = process.env.MEDIA_AI_API_KEY;
  const model = process.env.MEDIA_AI_MODEL;
  if (baseUrl !== 'https://api.openai.com/v1' || !apiKey || (requireModel && !model)) throw new Error(requireModel ? 'OpenAI APIには MEDIA_AI_BASE_URL=https://api.openai.com/v1、MEDIA_AI_API_KEY、MEDIA_AI_MODEL が必要です。' : 'OpenAI APIには MEDIA_AI_BASE_URL=https://api.openai.com/v1 と MEDIA_AI_API_KEY が必要です。');
  return { baseUrl, apiKey, model };
};
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const retryDelay = (response, attempt) => {
  const retryAfter = Number(response?.headers?.get('retry-after'));
  return Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter * 1000 : Math.min(1000 * 2 ** (attempt - 1), 8000);
};
const responseText = (payload) => payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text || '';
const articleSchema = {
  type: 'object', additionalProperties: false,
  required: ['title', 'meta_description', 'excerpt', 'primary_keyword', 'secondary_keywords', 'search_intent', 'target_reader', 'introduction', 'sections', 'conclusion', 'affiliate_recommendations', 'related_article_ids'],
  properties: {
    title: { type: 'string' }, meta_description: { type: 'string' }, excerpt: { type: 'string' }, primary_keyword: { type: 'string' }, secondary_keywords: { type: 'array', items: { type: 'string' } }, search_intent: { type: 'string' }, target_reader: { type: 'string' }, introduction: { type: 'string' }, conclusion: { type: 'string' }, related_article_ids: { type: 'array', items: { type: 'string' } }, affiliate_recommendations: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['offer_id', 'reason'], properties: { offer_id: { type: 'string' }, reason: { type: 'string' } } } }, sections: { type: 'array', minItems: 9, items: { type: 'object', additionalProperties: false, required: ['heading', 'paragraphs', 'subsections'], properties: { heading: { type: 'string' }, paragraphs: { type: 'array', minItems: 2, items: { type: 'string' } }, subsections: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['heading', 'paragraphs'], properties: { heading: { type: 'string' }, paragraphs: { type: 'array', minItems: 1, items: { type: 'string' } } } } } } } }
  }
};
const responseRequest = async (input) => {
  const { baseUrl, apiKey, model } = openAiConfig();
  const body = { model, store: false, max_output_tokens: 7000, reasoning: { effort: 'low' }, input: [{ role: 'system', content: [{ type: 'input_text', text: 'SOAM Mediaの編集者として、事実・実績・料金・体験を創作せず、日本語の構造化記事データだけを返す。HTML、URL、広告リンクは返さない。未提供機能を提供中と書かない。' }] }, { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(input) }] }], text: { format: { type: 'json_schema', name: 'soam_media_article', strict: true, schema: articleSchema } } };
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), Number(process.env.MEDIA_AI_TIMEOUT_MS || 90000));
    try {
      const response = await fetch(`${baseUrl}/responses`, { method: 'POST', signal: controller.signal, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) { lastError = new Error(`OpenAI Responses API failed: ${response.status}`); if (response.status !== 429 && response.status < 500) throw lastError; await delay(retryDelay(response, attempt)); continue; }
      const payload = await response.json();
      try { return { generated: JSON.parse(responseText(payload)), usage: payload.usage || {} }; } catch { lastError = new Error('OpenAI Responses APIが有効なJSONを返しませんでした。'); await delay(retryDelay(null, attempt)); }
    } catch (error) { lastError = error.name === 'AbortError' ? new Error('OpenAI Responses API timed out.') : error; if (attempt < 3) await delay(retryDelay(null, attempt)); }
    finally { clearTimeout(timer); }
  }
  throw lastError || new Error('OpenAI Responses API request failed.');
};
const verifyModels = async () => {
  const { baseUrl, apiKey, model } = openAiConfig();
  const response = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!response.ok) throw new Error(`OpenAI model list failed: ${response.status}`);
  const ids = (await response.json()).data?.map((item) => item.id) || [];
  if (!ids.includes(model)) throw new Error(`MEDIA_AI_MODEL (${model}) はこのOpenAI APIキーで利用可能なモデル一覧にありません。`);
  console.log(`[openai] connectivity verified; configured model is available: ${model}`);
};
const listModels = async () => {
  const { baseUrl, apiKey } = openAiConfig({ requireModel: false });
  const response = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!response.ok) throw new Error(`OpenAI model list failed: ${response.status}`);
  const candidates = (await response.json()).data?.map((item) => item.id).filter((id) => /^gpt-(?:5|4\.1|4o)/.test(id)).sort() || [];
  if (!candidates.length) throw new Error('記事生成向けのOpenAI GPTモデルを確認できませんでした。');
  console.log(`[openai] available candidate model IDs: ${candidates.join(', ')}`);
};
const selectedSlot = () => { if (requestedSlot) { if (!slots[requestedSlot]) throw new Error(`未知のslotです: ${requestedSlot}`); return requestedSlot; } const time = tokyoParts(now).time; return time >= slots.evening || time < slots.morning ? 'evening' : time >= slots.noon ? 'noon' : 'morning'; };
const htmlFromArticle = (article) => `<p class="article-excerpt">${esc(article.introduction)}</p>${article.sections.map((section) => `<h2>${esc(section.heading)}</h2>${section.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}${section.subsections.map((subsection) => `<h3>${esc(subsection.heading)}</h3>${subsection.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}`).join('')}`).join('')}<h2>まとめ</h2><p>${esc(article.conclusion)}</p>`;
const serviceBox = (offers) => offers.length ? `<div class="affiliate-box"><p><strong>関連サービスについて</strong></p><ul>${offers.map((offer) => `<li><a href="${esc(offer.affiliateUrl)}" rel="nofollow sponsored">${esc(offer.name)}</a>｜${esc(offer.summary)}</li>`).join('')}</ul><p><small>この記事には紹介リンクまたはアフィリエイト広告を含みます。料金・仕様・対象外は公式情報をご確認ください。</small></p></div>` : '';
const plainText = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const costEstimate = (usage) => ({ inputTokens: usage.input_tokens || 0, outputTokens: usage.output_tokens || 0, usd: Number((((usage.input_tokens || 0) * 0.000001) + ((usage.output_tokens || 0) * 0.000006)).toFixed(6)) });
const previewPage = (entry, bodyHtml, date) => {
  const data = articleStructuredData({ title: entry.article.title, description: entry.article.metaDescription, file: `${entry.article.slug}.html`, publishedAt: date, updatedAt: date });
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${esc(entry.article.metaDescription)}"><title>${esc(entry.article.title)} | SOAM MEDIA</title><link rel="canonical" href="${canonicalUrl(`articles/${entry.article.slug}.html`)}"><script type="application/ld+json">${jsonForScript(data)}</script><link rel="stylesheet" href="../../style.css"></head><body><main class="article-body"><div class="article-container"><p class="article-category">${esc(entry.article.categoryLabel)}</p><h1>${esc(entry.article.title)}</h1><p class="article-date">${date}</p>${bodyHtml}</div></main></body></html>`;
};

const main = async () => {
  if (listOpenAIModels) return listModels();
  if (verifyOpenAI) return verifyModels();
  const [manifest, queue, catalog, affiliateCatalog] = await Promise.all([readJson('articles/data/manifest.json'), readJson('automation/article-queue.json'), readJson('automation/generation-catalog.json'), readJson('automation/affiliate-catalog.json')]);
  const slot = selectedSlot(); const date = tokyoParts(now).date; const id = `${slotKey(date, slot)}-auto`;
  if (queue.articles.some((entry) => entry.id === id)) return console.log(`[media-generation] no-op: ${id} is already recorded.`);
  const choice = selectTheme({ catalog, manifest, slot }); const number = nextArticleNumber(manifest); const slug = `article-${number}`; const offers = selectOffers({ offers: affiliateCatalog.offers || [], category: choice.theme.category, manifest });
  const relatedCandidates = manifest.filter((article) => article.status === 'published' && article.category === choice.theme.category).map((article) => article.slug);
  const input = { task: 'SOAM Mediaの新規記事を構造化JSONで生成する', theme: choice.theme, slot, existingArticles: manifest.map((article) => ({ id: article.slug, title: article.title, description: article.metaDescription || article.excerpt, tags: article.tags || [] })), relatedArticleCandidates: relatedCandidates, styleGuide: catalog.styleGuide, seoRequirements: ['unique title', 'unique meta description', 'search intent', 'related articles'], activeAffiliateOffers: offers.map(({ id, name, summary, allowedClaims, prohibitedClaims }) => ({ id, name, summary, allowedClaims, prohibitedClaims })), soamLinkPolicy: { officialUrl: SOAM_LINK_URL, rule: 'SOAM Linkは紹介・成果報酬の受け皿。URLはAI本文に書かず、テンプレートまたは設定から後付けする。未公開または未提供の機能を提供中と断定しない。' }, safety: ['架空体験を作らない', '根拠のない数値を作らない', '広告リンクやURLを本文へ書かない', '禁止表現を使わない', 'sections に「まとめ」を入れず、conclusion に最終結論を書く', 'related_article_ids は relatedArticleCandidates のIDだけを使う'] };
  let generated; let normalized; let usage = {}; let errors = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = fixture ? { generated: fixtureArticle(choice.theme), usage: { input_tokens: 0, output_tokens: 0 } } : await responseRequest({ ...input, retryAttempt: attempt, previousQualityErrors: errors });
    generated = response.generated; usage = response.usage;
    const sections = (generated.sections || []).map((section) => String(section.heading || '').trim() === 'まとめ'
      ? { ...section, heading: '最後に確認したいこと' }
      : section);
    const relatedArticleIds = Array.isArray(generated.related_article_ids)
      ? generated.related_article_ids.filter((related) => relatedCandidates.includes(related))
      : [];
    normalized = {
      ...generated,
      sections,
      category: choice.theme.category,
      metaDescription: generated.meta_description,
      excerpt: generated.excerpt || generated.introduction,
      bodyHtml: htmlFromArticle({ ...generated, sections }),
      relatedArticleIds
    };
    errors = qualityErrors({ article: normalized, styleGuide: catalog.styleGuide, expectedCategory: choice.theme.category, expectedTitlePool: manifest.map((article) => article.title), expectedTextPool: manifest.map((article) => `${article.title} ${article.excerpt} ${(article.tags || []).join(' ')}`), expectedRelatedIds: relatedCandidates, offers });
    if (!Array.isArray(normalized.relatedArticleIds) || normalized.relatedArticleIds.some((related) => !manifest.some((article) => article.slug === related))) errors.push('related_article_ids に存在しない記事があります。');
    if (!Array.isArray(generated.affiliate_recommendations) || generated.affiliate_recommendations.some((recommendation) => !offers.some((offer) => offer.id === recommendation.offer_id))) errors.push('affiliate_recommendations に未選定案件があります。');
    if (!errors.length) break;
  }
  if (errors.length) throw new Error(`品質検査に3回失敗しました。書込み・公開は行いません。\n- ${errors.join('\n- ')}`);
  const scheduledAt = `${date}T${slots[slot]}:00+09:00`; const relatedArticles = normalized.relatedArticleIds.length ? normalized.relatedArticleIds : relatedCandidates.slice(-3);
  const entry = { id, status: 'approved', slot, scheduledAt, source: `automation/generated-content/${slug}.html`, generated: { themeId: choice.theme.id, score: choice.score, provider: fixture ? 'fixture' : 'openai-responses' }, article: { slug, title: normalized.title, category: normalized.category, categoryLabel: choice.theme.categoryLabel, articleType: choice.theme.articleType, targetIndustry: 'all', targetReader: normalized.target_reader, tags: [normalized.primary_keyword, ...normalized.secondary_keywords], excerpt: normalized.excerpt, metaDescription: normalized.metaDescription, primaryCta: null, affiliateLinks: offers.map((offer) => ({ name: offer.name, asp: offer.asp, placement: '関連サービス', reason: offer.summary })), relatedArticles, containsAffiliateLinks: offers.length > 0 } };
  const bodyChars = [...plainText(normalized.bodyHtml)].length; const h2Count = (normalized.bodyHtml.match(/<h2[\s>]/gi) || []).length; const h3Count = (normalized.bodyHtml.match(/<h3[\s>]/gi) || []).length;
  const summary = { slot, id, articleNumber: number, slug, theme: choice.theme.id, category: normalized.category, offers: offers.map((offer) => offer.name), title: normalized.title, metaDescription: normalized.metaDescription, excerpt: normalized.excerpt, introduction: normalized.introduction, h2: normalized.sections.map((section) => section.heading).concat('まとめ'), h3Count, bodyChars, referenceArticleChars: catalog.styleGuide.qualityBaseline.referenceBodyChars, relatedArticles, qualityErrors: errors, tokenUsage: usage, estimatedCostUsd: costEstimate(usage), output: `articles/${slug}.html`, dryRun };
  console.log(`[media-generation] ${JSON.stringify(summary)}`);
  if (dryRun) { const outputDir = path.join(root, 'automation/dry-run-output'); await fs.mkdir(outputDir, { recursive: true }); await fs.writeFile(path.join(outputDir, `${slug}-preview.html`), previewPage(entry, normalized.bodyHtml, date)); await fs.writeFile(path.join(outputDir, `${slug}-generation-summary.json`), `${JSON.stringify(summary, null, 2)}\n`); return; }
  await fs.mkdir(path.join(root, 'automation/generated-content'), { recursive: true }); await fs.writeFile(path.join(root, entry.source), `${normalized.bodyHtml}\n${serviceBox(offers)}\n`); queue.articles.push(entry); await fs.writeFile(path.join(root, 'automation/article-queue.json'), `${JSON.stringify(queue, null, 2)}\n`); await exec(process.execPath, ['scripts/publish-scheduled-articles.mjs', `--now=${scheduledAt}`], { cwd: root }); console.log(`[media-generation] published ${slug}: ${normalized.title}`);
};
main().catch((error) => { console.error(`[media-generation] ${error.message}`); process.exitCode = 1; });
