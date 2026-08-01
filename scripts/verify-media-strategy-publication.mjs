#!/usr/bin/env node

const baseUrl = 'https://media.soam-creative.com';
const articlePaths = Array.from({ length: 82 }, (_, index) => `/articles/article-${String(index + 1).padStart(2, '0')}`);
const expectedAffiliateButtons = 91;
const checks = [
  {
    path: '/',
    patterns: [
      '一人で抱えていた判断を、使える手順に。',
      '個人で商品やサービスを作り、売り、届ける人のための実務メディアです。',
      'pillars/decision.html',
      'guides/index.html'
    ]
  },
  { path: '/pillars/decision', patterns: ['判断を言葉にする', 'SOAM MEDIAの3本柱'] },
  { path: '/pillars/systems', patterns: ['一人で回す仕組み', 'SOAM MEDIAの3本柱'] },
  { path: '/pillars/reach', patterns: ['必要な人へ届ける', 'SOAM MEDIAの3本柱'] },
  { path: '/guides/', patterns: ['商品名より先に、選ぶ条件を決める。', 'data-hub-filters'] },
  { path: '/articles/article-82', patterns: ['data-editorial-strategy', 'data-primary-cta="affiliate"', 'data-track-event="affiliate_click"'] }
];
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const verify = async () => {
  const failures = [];
  for (const check of checks) {
    const response = await fetch(`${baseUrl}${check.path}`, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } });
    const html = await response.text();
    if (!response.ok) failures.push(`${check.path}: HTTP ${response.status}`);
    for (const pattern of check.patterns) if (!html.includes(pattern)) failures.push(`${check.path}: ${pattern}`);
  }
  let affiliateButtons = 0;
  let affiliateCards = 0;
  for (const path of articlePaths) {
    const response = await fetch(`${baseUrl}${path}`, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } });
    const html = await response.text();
    if (!response.ok) failures.push(`${path}: HTTP ${response.status}`);
    const pageButtons = (html.match(/data-track-event="affiliate_click"/g) || []).length;
    const pageCards = (html.match(/class="affiliate-option"/g) || []).length;
    affiliateButtons += pageButtons;
    affiliateCards += pageCards;
    if (pageButtons !== pageCards) failures.push(`${path}: 広告カード${pageCards}件に対して紹介ボタン${pageButtons}件`);
    if (/data-track-event="outbound_official_click"/.test(html)) failures.push(`${path}: 重複する公式情報ボタン`);
  }
  if (affiliateButtons !== expectedAffiliateButtons) failures.push(`全記事: 紹介ボタン ${affiliateButtons}/${expectedAffiliateButtons}`);
  if (affiliateCards !== expectedAffiliateButtons) failures.push(`全記事: 広告カード ${affiliateCards}/${expectedAffiliateButtons}`);
  return failures;
};

let failures = [];
for (let attempt = 1; attempt <= 12; attempt += 1) {
  failures = await verify();
  if (!failures.length) {
    console.log(`[media-strategy:production] verified ${checks.length} key pages and ${articlePaths.length} articles (${expectedAffiliateButtons} single affiliate buttons).`);
    process.exit(0);
  }
  console.log(`[media-strategy:production] waiting for propagation (${attempt}/12): ${failures.join(' | ')}`);
  if (attempt < 12) await delay(15000);
}
throw new Error(`本番反映を確認できませんでした: ${failures.join(' | ')}`);
