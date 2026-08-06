#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const workflow = read('.github/workflows/generate-and-publish-media-article.yml');
const publisher = read('.github/workflows/publish-scheduled-articles.yml');
const generator = read('scripts/generate-media-article.mjs');
const queue = JSON.parse(read('automation/article-queue.json'));

const cronEntries = [...workflow.matchAll(/- cron: "([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(cronEntries, [
  '2 22 * * *', '2 3 * * *', '2 11 * * *',
  '17 22 * * *', '17 3 * * *', '17 11 * * *'
], '朝・昼・晩の主起動と各1回の保険起動だけを定義してください。');
assert.ok(!/^\s+schedule:/m.test(publisher), 'Publish scheduled articles は保守用の手動処理であり、定時起動してはいけません。');

const requiredStages = [
  'Verify Cloudflare deployment credentials',
  'Check this publication slot before any paid generation',
  'check-media-publication-slot.mjs',
  'Preflight generated article publication contract',
  'test-media-publication-slot.mjs',
  'test-generated-media-publication.mjs',
  'Generate, validate, and publish one article',
  'Normalize SEO metadata',
  'Refresh sitemap and verify all published articles',
  'Commit and push a complete article publication',
  'Build Cloudflare Pages artifact',
  'Deploy to Cloudflare Pages',
  'Verify custom-domain article publication'
];
requiredStages.forEach((stage) => assert.ok(workflow.includes(stage), `公開契約の工程が不足しています: ${stage}`));

assert.ok(workflow.indexOf('check-media-publication-slot.mjs') < workflow.indexOf('Verify Cloudflare deployment credentials'), '重複公開枠の確認は、有料生成に関する準備より前に実行してください。');
assert.ok(workflow.indexOf('test-media-publication-contract.mjs') < workflow.indexOf('node scripts/generate-media-article.mjs --slot="$SLOT"'), '構造検査は有料生成の前に実行してください。');
assert.equal((workflow.match(/node scripts\/generate-media-article\.mjs --slot="\$SLOT"/g) || []).length, 1, '通常の有料生成呼び出しは1か所だけにしてください。');
assert.ok(workflow.includes('concurrency:\n  group: soam-media-generation\n  cancel-in-progress: false'), '同時起動で公開中の処理を取り消してはいけません。');

assert.ok(workflow.includes("steps.publication_slot.outputs.should_generate == 'true'"), '重複公開枠は、生成・配信・本番確認の全工程より前に停止してください。');
assert.match(generator, /if \(queue\.articles\.some\(\(entry\) => entry\.id === id\)\) return console\.log/, '同じ公開枠は生成APIより前に安全停止してください。');
assert.ok(generator.indexOf('queue.articles.some((entry) => entry.id === id)') < generator.indexOf('responseRequest('), '重複公開枠の判定は有料生成より前にしてください。');
assert.match(generator, /const maxThemeCandidates = 1;/, '同一枠のテーマ差し替えは行わないでください。');
assert.match(generator, /const maxRevisions = 1;/, '同一枠の再生成は行わないでください。');
assert.equal((generator.match(/\/responses/g) || []).length, 1, '記事生成のResponses API呼び出しは1実装だけにしてください。');

assert.equal(queue.timezone, 'Asia/Tokyo', '公開枠は日本時間で管理してください。');
assert.deepEqual(queue.slots.map((slot) => [slot.id, slot.time]), [
  ['morning', '07:00'], ['noon', '12:00'], ['evening', '20:00']
], '公開枠は朝・昼・晩の3件に固定してください。');

console.log('[media-publication-contract:test] passed (single publisher, three slots, one AI generation per slot)');
