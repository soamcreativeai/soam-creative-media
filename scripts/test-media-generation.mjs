#!/usr/bin/env node
import assert from 'node:assert/strict';
import { fixtureArticle, nextArticleNumber, qualityErrors, selectOffers, selectTheme, slotKey } from './media-generation-utils.mjs';
const catalog = { styleGuide: { forbiddenPhrases: ['誰でも簡単'] }, themes: [{ id: 'a', category: 'ai', titleHint: 'AIに任せる前に仕事を整理する', intent: '業務を整理したい', articleType: 'howto' }, { id: 'b', category: 'money', titleHint: '記録の習慣', intent: '記録を続けたい', articleType: 'guide' }] };
const manifest = [{ status: 'published', file: 'article-61.html', title: 'AIに任せる前に仕事を整理する', category: 'ai', excerpt: '仕事の整理' }];
assert.equal(nextArticleNumber(manifest), 62, '記事番号を連番で採番する');
assert.equal(slotKey('2026-07-27', 'morning'), '2026-07-27-morning', 'slotキーは日付と枠で一意にする');
const choice = selectTheme({ catalog, manifest, slot: 'morning' }); assert.equal(choice.theme.id, 'b', '重複テーマを避ける');
const offer = { id: 'x', name: '確認済み案件', category: 'money', active: true, officialUrl: 'https://example.com', affiliateUrl: 'https://example.com/track', lastVerifiedAt: '2026-07-27', prohibitedClaims: [], summary: '確認済みの説明' };
assert.deepEqual(selectOffers({ offers: [offer, { ...offer, id: 'off', active: false }], category: 'money', manifest }).map((item) => item.id), ['x'], '無効案件を除外する');
const article = fixtureArticle(choice.theme); assert.equal(qualityErrors({ article, styleGuide: catalog.styleGuide, expectedTitlePool: manifest.map((item) => item.title), offers: [] }).length, 0, 'fixture記事は品質検査を通る');
assert.match(qualityErrors({ article: { ...article, bodyHtml: '<h2>TODO</h2>' }, styleGuide: catalog.styleGuide, expectedTitlePool: [], offers: [] }).join('\n'), /TODO/, '仮文を拒否する');
console.log('[media-generation:test] passed');
