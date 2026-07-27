import crypto from 'node:crypto';

export const slots = {
  morning: '07:00',
  noon: '12:00',
  evening: '20:00'
};

export const tokyoParts = (value) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(value);
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return { date: `${map.year}-${map.month}-${map.day}`, time: `${map.hour}:${map.minute}` };
};

export const slotKey = (date, slot) => `${date}-${slot}`;
export const tokenize = (value) => {
  const text = String(value || '').toLowerCase().replace(/\s+/g, '');
  const words = text.match(/[\p{L}\p{N}]{2,}/gu) || [];
  const bigrams = [...text].filter((character) => /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(character))
    .map((character, index, characters) => index ? `${characters[index - 1]}${character}` : null).filter(Boolean);
  return [...new Set([...words, ...bigrams])];
};
export const similarity = (left, right) => {
  const a = new Set(tokenize(left)); const b = new Set(tokenize(right));
  if (!a.size || !b.size) return 0;
  const common = [...a].filter((token) => b.has(token)).length;
  return common / new Set([...a, ...b]).size;
};
export const nextArticleNumber = (manifest) => Math.max(0, ...manifest.map((article) => Number(String(article.file || article.slug || '').match(/(\d+)/)?.[1] || 0))) + 1;

export const selectTheme = ({ catalog, manifest, slot }) => {
  const published = manifest.filter((article) => article.status === 'published');
  const recent = [...published].sort((a, b) => `${b.updatedAt || b.publishedAt}`.localeCompare(`${a.updatedAt || a.publishedAt}`)).slice(0, 30);
  const ranked = catalog.themes.map((theme) => {
    const target = `${theme.titleHint} ${theme.intent}`;
    const maxSimilarity = Math.max(0, ...published.map((article) => similarity(target, `${article.title} ${article.excerpt} ${(article.tags || []).join(' ')}`)));
    const recentCategory = recent.slice(0, 7).filter((article) => article.category === theme.category).length;
    const slotRolePenalty = slot === 'morning' && theme.articleType === 'guide' ? 0.1 : 0;
    return { theme, score: maxSimilarity + recentCategory * 0.08 + slotRolePenalty, maxSimilarity };
  }).filter((item) => item.maxSimilarity < 0.55).sort((a, b) => a.score - b.score || a.theme.id.localeCompare(b.theme.id));
  if (!ranked.length) throw new Error('重複しない記事テーマを選べませんでした。テーマカタログを追加してください。');
  return ranked[0];
};

export const selectOffers = ({ offers, category, manifest }) => offers
  .filter((offer) => offer.active === true && offer.category === category && offer.officialUrl && offer.affiliateUrl && offer.lastVerifiedAt && Array.isArray(offer.prohibitedClaims))
  .sort((a, b) => {
    const count = (name) => manifest.flatMap((article) => article.affiliateLinks || []).filter((link) => link.name === name).length;
    return count(a.name) - count(b.name) || a.id.localeCompare(b.id);
  }).slice(0, 3);

export const qualityErrors = ({ article, styleGuide, expectedTitlePool, expectedTextPool = [], offers }) => {
  const errors = [];
  const whole = `${article.title}\n${article.metaDescription}\n${article.excerpt}\n${article.bodyHtml}`;
  if (!article.title || !article.metaDescription || !article.excerpt || !article.bodyHtml) errors.push('title、metaDescription、excerpt、bodyHtml は必須です。');
  if (expectedTitlePool.some((title) => similarity(article.title, title) >= 0.75)) errors.push('既存記事とのタイトル類似度が高すぎます。');
  if (expectedTextPool.some((text) => similarity(article.bodyHtml, text) >= 0.75)) errors.push('既存記事との本文類似度が高すぎます。');
  if (!/<h2[\s>]/i.test(article.bodyHtml) || !/<h3[\s>]/i.test(article.bodyHtml)) errors.push('本文には h2 と h3 が必要です。');
  if (/<(?:script|iframe|html|head|body)\b|\son[a-z]+\s*=/i.test(article.bodyHtml)) errors.push('本文HTMLに許可されない要素またはイベント属性があります。');
  if (/\b(?:TODO|PLACEHOLDER)\b/i.test(whole)) errors.push('仮文または TODO が残っています。');
  for (const phrase of styleGuide.forbiddenPhrases || []) if (whole.includes(phrase)) errors.push(`禁止表現: ${phrase}`);
  for (const offer of offers) for (const phrase of offer.prohibitedClaims || []) if (whole.includes(phrase)) errors.push(`案件禁止表現: ${offer.name} / ${phrase}`);
  const externalLinks = [...article.bodyHtml.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)].map((match) => match[1]);
  if (externalLinks.length) errors.push('AI本文に外部URLを直接入れてはいけません。案件リンクはカタログから後付けします。');
  return errors;
};

export const fixtureArticle = (theme) => ({
  title: `${theme.titleHint}を、今日から試すための考え方`,
  metaDescription: `${theme.intent}人に向けて、状況を整理し、小さく試して見直すための考え方を紹介します。`,
  excerpt: `${theme.intent}ときに、最初の一歩を決めるための実務的な整理をまとめます。`,
  bodyHtml: `<div class="what-you-get"><p><strong>この記事でわかること</strong></p><ul><li>最初に整理する項目</li><li>小さく試す順番</li><li>見直しの目安</li></ul></div><h2>こんな悩みはありませんか</h2><p>やることが増えるほど、何から手をつけるか迷いやすくなります。</p><h2>結論</h2><p>一度に仕組みを変えず、困っている場面を一つ選んで試すことから始めます。</p><h2>状況を一つに絞る</h2><p>最近止まった作業を振り返り、誰が何に迷ったかを書き出します。</p><h3>記録する項目</h3><p>目的、必要な情報、完了の目安を短く残します。</p><h2>具体例</h2><p>問い合わせ後の案内が毎回変わるなら、最初の返信に必要な項目だけをメモにします。</p><h2>注意点</h2><p>料金、契約、公開に関わる判断は、一般的な手順だけで決めず公式情報を確認します。</p><h2>まとめ</h2><p>小さく試し、負担が減ったかを見てから次へ進みます。</p>`
});

export const sourceHash = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
