#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { canonicalUrl } from './seo-utils.mjs';
import { csvValue } from './editorial-strategy-utils.mjs';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv.find((arg) => arg.startsWith('--base='))?.slice(7);
if (!base) throw new Error('--base=<作業開始時の保存ID> が必要です。');
const current = JSON.parse(await fs.readFile(path.join(root, 'articles/data/manifest.json'), 'utf8'));
const { stdout } = await exec('git', ['show', `${base}:articles/data/manifest.json`], { cwd: root });
const original = JSON.parse(stdout);
const originalBySlug = new Map(original.map((article) => [article.slug, article]));
const rows = [];

for (const article of current) {
  const before = originalBySlug.get(article.slug) || {};
  const beforeOffers = new Set((before.affiliateLinks || []).map((link) => link.name));
  const afterOffers = new Set((article.affiliateLinks || []).map((link) => link.name));
  const actions = new Set(['KEEP']);
  if ([...beforeOffers].some((name) => !afterOffers.has(name))) actions.add('REMOVE_AFFILIATE');
  if ([...afterOffers].some((name) => !beforeOffers.has(name))) actions.add('ADD_AFFILIATE');
  if (!before.targetReader || !before.readerProblem || !before.searchIntent || !before.pillar || !before.informationVerifiedAt) actions.add('REWRITE');
  const { stdout: oldHtml } = await exec('git', ['show', `${base}:articles/${article.file}`], { cwd: root });
  if (/soamlink-cta/.test(oldHtml) && article.primaryCtaType !== 'soam-link') actions.add('REMOVE_LINK_CTA');
  if (!/soamlink-cta/.test(oldHtml) && article.primaryCtaType === 'soam-link') actions.add('ADD_LINK_CTA');
  if (article.auditStatus === 'HOLD') actions.add('HOLD');
  if (article.auditStatus === 'HOLD') actions.add('NOINDEX_CANDIDATE');
  if (article.duplicateCandidate) actions.add('MERGE');
  if (article.duplicateCandidate) actions.add('REDIRECT_CANDIDATE');
  rows.push({ article, actions: [...actions] });
}

const headers = ['タイトル', 'URL', '現在カテゴリ', '想定読者', '読者の困りごと', '検索意図', '記事種類', '3本柱', 'アフィリエイト案件ID', '案件との一致', 'SOAM Linkとの一致', '関連記事', '情報確認日', '次回見直し日', '必要な処理', '統合候補'];
const csvRows = rows.map(({ article, actions }) => [
  article.title, canonicalUrl(`articles/${article.file}`), article.categoryLabel, article.targetReader,
  article.readerProblem, article.searchIntent, article.articleType, article.pillarLabel,
  article.affiliateLinks.map((link) => link.offerId).join('|'),
  article.affiliateLinks.length ? 'active案件・記事テーマ一致を確認' : '表示案件なし',
  article.soamLinkEligible ? '表示条件に一致' : '主導線にはしない', article.relatedArticles.join('|'),
  article.informationVerifiedAt, article.nextReviewAt, actions.join('|'),
  article.duplicateCandidate ? `${article.duplicateCandidate.mergeInto} (${article.duplicateCandidate.score})` : ''
].map(csvValue).join(','));
await fs.writeFile(path.join(root, 'docs/ARTICLE_AUDIT_20260801.csv'), `${headers.map(csvValue).join(',')}\n${csvRows.join('\n')}\n`);
const counts = rows.flatMap((row) => row.actions).reduce((all, action) => ({ ...all, [action]: (all[action] || 0) + 1 }), {});
const markdown = `# SOAM MEDIA 82記事全件監査表\n\n確認日: 2026-08-01 JST\n比較元: ${base}\n\n## 集計\n\n| 項目 | 件数 |\n| --- | ---: |\n| 確認記事 | ${rows.length} |\n| アフィリエイト主導線 | ${current.filter((article) => article.primaryCtaType === 'affiliate').length} |\n| SOAM Link主導線 | ${current.filter((article) => article.primaryCtaType === 'soam-link').length} |\n| 関連記事主導線 | ${current.filter((article) => article.primaryCtaType === 'related-article').length} |\n${Object.entries(counts).map(([action, count]) => `| ${action} | ${count} |`).join('\n')}\n\n全項目は \`docs/ARTICLE_AUDIT_20260801.csv\` に記録。MERGE、REDIRECT_CANDIDATE、NOINDEX_CANDIDATEは候補記録のみで、公開URLの削除・転送・検索除外は今回実施しない。\n`;
await fs.writeFile(path.join(root, 'docs/ARTICLE_AUDIT_20260801.md'), markdown);
console.log(`[strategy-audit] wrote ${rows.length} rows from ${base}`);
