#!/usr/bin/env node
import assert from 'node:assert/strict';
import { fixtureArticle, nextArticleNumber, normalizeGeneratedSections, qualityErrors, renderedSectionHeadingAlternatives, selectOffers, selectTheme, slotKey } from './media-generation-utils.mjs';
const catalog = { styleGuide: { forbiddenPhrases: ['誰でも簡単'], qualityBaseline: { minimumSources: 1, minimumChecklistItems: 3 } }, themes: [{ id: 'a', category: 'ai', titleHint: 'AIに任せる前に仕事を整理する', intent: '業務を整理したい', reader: '個人事業主', pillar: 'systems', articleType: 'howto', slots: ['morning'] }, { id: 'b', category: 'money', titleHint: '記録の習慣', intent: '記録を続けたい', reader: '個人事業主', pillar: 'systems', articleType: 'guide', slots: ['morning'] }] };
const manifest = [{ status: 'published', file: 'article-61.html', title: 'AIに任せる前に仕事を整理する', category: 'ai', excerpt: '仕事の整理' }];
assert.equal(nextArticleNumber(manifest), 62, '記事番号を連番で採番する');
assert.equal(slotKey('2026-07-27', 'morning'), '2026-07-27-morning', 'slotキーは日付と枠で一意にする');
const choice = selectTheme({ catalog, manifest, slot: 'morning' }); assert.equal(choice.theme.id, 'b', '重複テーマを避ける');
const fallback = selectTheme({ catalog, manifest: [], slot: 'morning', excludedThemeIds: ['a'] }); assert.equal(fallback.theme.id, 'b', '不合格テーマを除外して同じ枠の別テーマへ切り替える');
const offer = { id: 'x', name: '確認済み案件', category: 'money', active: true, officialUrl: 'https://example.com', affiliateUrl: 'https://example.com/track', lastVerifiedAt: '2026-07-27', prohibitedClaims: [], summary: '確認済みの説明' };
assert.deepEqual(selectOffers({ offers: [offer, { ...offer, id: 'off', active: false }], category: 'money', manifest }).map((item) => item.id), ['x'], '無効案件を除外する');
const fixture = fixtureArticle(choice.theme);
const article = { ...fixture, title: fixture.title, metaDescription: fixture.meta_description, excerpt: fixture.excerpt, introduction: fixture.introduction, category: choice.theme.category, relatedArticleIds: [], sections: fixture.sections, conclusion: fixture.conclusion, bodyHtml: '<h2>結論</h2><h3>補足</h3><table><tr><td>判断表</td></tr></table><h2>確認用チェックリスト</h2><ul class="article-checklist"><li>確認1</li><li>確認2</li><li>確認3</li></ul><p>向いている人と向いていない人の条件を確認します。</p>' };
assert.equal(qualityErrors({ article, styleGuide: catalog.styleGuide, expectedTitlePool: manifest.map((item) => item.title), offers: [] }).length, 0, 'fixture記事は品質検査を通る');
assert.match(qualityErrors({ article: { ...article, bodyHtml: '<h2>TODO</h2>' }, styleGuide: catalog.styleGuide, expectedTitlePool: [], offers: [] }).join('\n'), /TODO/, '仮文を拒否する');
assert.match(qualityErrors({ article: { ...article, bodyHtml: '<h2>結論</h2><h2>結論</h2><h3>補足</h3><p>向いている人と向いていない人の条件を確認します。</p>' }, styleGuide: catalog.styleGuide, expectedTitlePool: [], offers: [] }).join('\n'), /h2見出しが重複/, '重複した見出しを拒否する');
const normalizedSections = normalizeGeneratedSections([
  { heading: '判断表', paragraphs: ['a'.repeat(80), 'b'.repeat(80)], subsections: [] },
  { heading: '判断表', paragraphs: ['c'.repeat(80), 'd'.repeat(80)], subsections: [] },
  { heading: 'まとめ', paragraphs: ['e'.repeat(80), 'f'.repeat(80)], subsections: [] }
]);
assert.equal(normalizedSections[0].heading, '判断表を使う前に決めること', '固定の判断表見出しをAI sectionから分離する');
assert.equal(new Set(normalizedSections.map((section) => section.heading)).size, normalizedSections.length, 'AI sectionの見出しを一意にする');
assert.ok(normalizedSections.every((section) => !renderedSectionHeadingAlternatives.has(section.heading)), '固定ブロックの見出しをAI sectionに残さない');
console.log('[media-generation:test] passed');
