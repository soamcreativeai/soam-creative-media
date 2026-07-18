#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const fixtureDir = await fs.mkdtemp(path.join(os.tmpdir(), 'soam-media-publisher-'));

try {
  await Promise.all([
    fs.cp(path.join(rootDir, 'articles'), path.join(fixtureDir, 'articles'), { recursive: true }),
    fs.cp(path.join(rootDir, 'automation'), path.join(fixtureDir, 'automation'), { recursive: true }),
    fs.cp(path.join(rootDir, 'scripts'), path.join(fixtureDir, 'scripts'), { recursive: true }),
    fs.copyFile(path.join(rootDir, 'index.html'), path.join(fixtureDir, 'index.html'))
  ]);

  await fs.writeFile(path.join(fixtureDir, 'automation/approved-content/test-article.html'), `
      <section class="what-you-get">
        <p><strong>この記事でわかること</strong></p>
        <ul><li>公開キューの動作確認</li></ul>
      </section>
      <h2>本文</h2>
      <p>これは予約公開の隔離テスト用本文です。</p>
  `);
  await fs.writeFile(path.join(fixtureDir, 'automation/article-queue.json'), JSON.stringify({
    version: 1,
    timezone: 'Asia/Tokyo',
    slots: [
      { id: 'morning', time: '07:00', role: 'discover', label: '新規流入' },
      { id: 'noon', time: '12:00', role: 'decide', label: '判断支援' },
      { id: 'evening', time: '20:00', role: 'return', label: '再訪' }
    ],
    articles: [{
      id: 'publisher-test-article',
      status: 'approved',
      slot: 'morning',
      scheduledAt: '2026-07-19T07:00:00+09:00',
      source: 'automation/approved-content/test-article.html',
      article: {
        slug: 'article-publisher-test',
        title: '予約公開のテスト記事',
        category: 'ai',
        categoryLabel: 'AI・業務効率化',
        articleType: 'discover',
        targetIndustry: 'all',
        tags: ['テスト'],
        excerpt: '予約公開の隔離テストです。',
        metaDescription: '予約公開の隔離テストです。',
        primaryCta: null,
        affiliateLinks: [],
        relatedArticles: ['article-19'],
        containsAffiliateLinks: false
      }
    }]
  }, null, 2));

  execFileSync(process.execPath, [
    'scripts/publish-scheduled-articles.mjs',
    '--now=2026-07-19T07:00:00+09:00'
  ], { cwd: fixtureDir, stdio: 'inherit' });

  const [article, manifest, queue, articleIndex, home] = await Promise.all([
    fs.readFile(path.join(fixtureDir, 'articles/article-publisher-test.html'), 'utf8'),
    fs.readFile(path.join(fixtureDir, 'articles/data/manifest.json'), 'utf8'),
    fs.readFile(path.join(fixtureDir, 'automation/article-queue.json'), 'utf8'),
    fs.readFile(path.join(fixtureDir, 'articles/index.html'), 'utf8'),
    fs.readFile(path.join(fixtureDir, 'index.html'), 'utf8')
  ]);
  assert.match(article, /予約公開のテスト記事/);
  assert.match(article, /隔離テスト用本文/);
  assert.match(manifest, /article-publisher-test/);
  assert.match(queue, /"status": "published"/);
  assert.match(articleIndex, /予約公開のテスト記事/);
  assert.match(home, /予約公開のテスト記事/);
  console.log('[scheduled-publish:test] passed');
} finally {
  await fs.rm(fixtureDir, { recursive: true, force: true });
}
