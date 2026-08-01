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

export const selectTheme = ({ catalog, manifest, slot, excludedThemeIds = [] }) => {
  const published = manifest.filter((article) => article.status === 'published');
  const recent = [...published].sort((a, b) => `${b.updatedAt || b.publishedAt}`.localeCompare(`${a.updatedAt || a.publishedAt}`)).slice(0, 30);
  const ranked = catalog.themes
    .filter((theme) => !excludedThemeIds.includes(theme.id) && (!Array.isArray(theme.slots) || theme.slots.includes(slot)))
    .map((theme) => {
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
  }).slice(0, 2);

const visibleText = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const sentences = (text) => String(text || '').split(/[。！？]/).map((sentence) => sentence.trim()).filter((sentence) => [...sentence].length >= 18);

export const qualityErrors = ({ article, styleGuide, expectedTitlePool, expectedTextPool = [], offers, expectedCategory, expectedRelatedIds = [] }) => {
  const errors = [];
  const whole = `${article.title}\n${article.metaDescription}\n${article.excerpt}\n${article.bodyHtml}`;
  if (!article.title || !article.metaDescription || !article.excerpt || !article.introduction || !article.sections?.length || !article.conclusion || !article.bodyHtml) errors.push('title、metaDescription、excerpt、introduction、sections、conclusion、bodyHtml は必須です。');
  if (expectedCategory && article.category !== expectedCategory) errors.push('選定テーマと記事カテゴリが不一致です。');
  if (expectedTitlePool.some((title) => similarity(article.title, title) >= 0.75)) errors.push('既存記事とのタイトル類似度が高すぎます。');
  if (expectedTextPool.some((text) => similarity(article.bodyHtml, text) >= 0.75)) errors.push('既存記事との本文類似度が高すぎます。');
  const h2Count = (article.bodyHtml.match(/<h2[\s>]/gi) || []).length;
  const h3Count = (article.bodyHtml.match(/<h3[\s>]/gi) || []).length;
  const baseline = styleGuide.qualityBaseline || {};
  if (h2Count < (baseline.minimumH2 || 1)) errors.push(`h2が不足しています（${h2Count}/${baseline.minimumH2}）。`);
  if (h3Count < (baseline.minimumH3 || 1)) errors.push(`h3が不足しています（${h3Count}/${baseline.minimumH3}）。`);
  const headings = [...String(article.bodyHtml).matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((match) => visibleText(match[1]));
  const duplicateHeading = headings.find((heading, index) => heading && headings.indexOf(heading) !== index);
  if (duplicateHeading) errors.push(`h2見出しが重複しています: ${duplicateHeading}`);
  if ((article.sections || []).some((section) => String(section.heading || '').trim() === 'まとめ')) errors.push('sections に「まとめ」を含めず、conclusion を使ってください。');
  if ([...visibleText(article.bodyHtml)].length < (baseline.minimumBodyChars || 0)) errors.push(`article-19基準の本文量を満たしません（${[...visibleText(article.bodyHtml)].length}/${baseline.minimumBodyChars}文字）。`);
  if (!/向いている人/.test(whole) || !/向いていない人/.test(whole)) errors.push('向いている人／向いていない人の判断基準が必要です。');
  if (!article.target_reader || !article.search_intent || !article.pillar || !article.problem_structure) errors.push('想定読者、検索意図、3本柱、問題の構造が必要です。');
  if (!Array.isArray(article.decision_criteria) || article.decision_criteria.length < (baseline.minimumDecisionCriteria || 1)) errors.push('判断基準が不足しています。');
  if (!Array.isArray(article.steps) || article.steps.length < (baseline.minimumSteps || 1)) errors.push('具体的な手順が不足しています。');
  if (!Array.isArray(article.checklist) || article.checklist.length < (baseline.minimumChecklistItems || 1)) errors.push('テンプレートまたは確認項目が不足しています。');
  if (!Array.isArray(article.source_ids) || article.source_ids.length < (baseline.minimumSources || 1)) errors.push('出典が不足しています。');
  if (!/<table\b/i.test(article.bodyHtml)) errors.push('判断表または比較表が必要です。');
  if (!/確認項目|チェックリスト/.test(article.bodyHtml)) errors.push('テンプレートまたは確認項目が必要です。');
  if ((article.sections || []).some((section) => !section.heading || !Array.isArray(section.paragraphs) || !section.paragraphs.length || section.paragraphs.some((paragraph) => !String(paragraph).trim()) || [...section.paragraphs.join('')].length < (baseline.minimumSectionChars || 1))) errors.push('空または極端に短いセクションがあります。');
  const repeated = sentences(visibleText(article.bodyHtml)).find((sentence, index, list) => list.indexOf(sentence) !== index);
  if (repeated) errors.push(`同一文が反復されています: ${repeated.slice(0, 30)}`);
  if (/<(?:script|iframe|html|head|body)\b|\son[a-z]+\s*=/i.test(article.bodyHtml)) errors.push('本文HTMLに許可されない要素またはイベント属性があります。');
  if (/\b(?:TODO|PLACEHOLDER)\b/i.test(whole)) errors.push('仮文または TODO が残っています。');
  for (const phrase of styleGuide.forbiddenPhrases || []) if (whole.includes(phrase)) errors.push(`禁止表現: ${phrase}`);
  for (const offer of offers) for (const phrase of offer.prohibitedClaims || []) if (whole.includes(phrase)) errors.push(`案件禁止表現: ${offer.name} / ${phrase}`);
  const externalLinkTags = [...article.bodyHtml.matchAll(/<a\b[^>]*href=["']https?:\/\/[^"']+["'][^>]*>/gi)].map((match) => match[0]);
  if (externalLinkTags.some((tag) => !/data-track-event=["']outbound_official_click["']/i.test(tag))) errors.push('AI本文に未管理の外部URLを直接入れてはいけません。外部リンクは確認済み候補から後付けします。');
  if (expectedRelatedIds.length && article.relatedArticleIds?.some((id) => !expectedRelatedIds.includes(id))) errors.push('関連記事IDが選定テーマに適合していません。');
  return errors;
};

export const fixtureArticle = (theme, sourceCandidates = [{ id: 'soam-editorial-policy' }]) => {
  const topics = [
    ['こんな悩みはありませんか', '仕事を進めたいのに、確認や準備が散らばってしまい、どこから整えればよいか分からなくなることがあります。便利そうな方法を増やしても、今困っている場面が見えなければ、かえって手間が増えることがあります。'],
    ['結論', '最初に変えるのは大きな仕組みではなく、止まりやすい場面を一つだけ言葉にすることです。目的、相手、完了の基準を短く残せば、試した方法が合っていたかを後から判断できます。'],
    ['困っている場面を観察する', '一週間の中で手が止まった作業を思い出し、何に時間がかかったかではなく、どの判断で迷ったかを書き出します。作業を細かく分けると、自分で決めるべき部分と、下準備として整えられる部分が見えてきます。'],
    ['小さな手順に分けて試す', '一度に全部を変えると、何が役立ったのか分からなくなります。最初は一つの返信、一つのメモ、一つの確認だけに範囲を絞り、使った直後に迷った点を一行だけ残します。'],
    ['判断基準を共有できる形にする', '自分だけが分かる感覚に頼るのではなく、完了とする条件を短い文章にします。相手に渡す前の確認、期限、例外時の相談先を決めておくと、作業を続ける人が変わっても戻りやすくなります。'],
    ['具体例', '問い合わせ後の案内が毎回変わる場合は、最初の返信に必要な項目だけを三つに絞ります。相談内容、次に確認すること、返信の目安を先に書くことで、説明を増やさなくても相手が次の行動を選びやすくなります。'],
    ['注意点', '料金、契約、公開、個人情報に関わることは、一般的な手順だけで判断しません。使うサービスの公式情報を確認し、迷う場合は担当者や専門家に相談する余地を残しておくことが大切です。'],
    ['向いている人・向いていない人', '同じ確認を何度も書き直している人や、作業の始め方で迷う人には小さな整理が向いています。一方で、緊急の判断や個別事情の大きい案件は、定型化だけで解決しようとせず、直接の対話を優先します。'],
    ['次に見直すこと', '一週間試した後は、続ける、項目を減らす、別の方法に戻すの三つから選びます。うまく使えなかった日も記録に残すことで、方法が自分の状況に合っているかを落ち着いて見直せます。']
  ];
  return {
  title: `${theme.titleHint}を、今日から試すための考え方`,
  meta_description: `${theme.intent}人に向けて、状況を整理し、小さく試して見直すための考え方を紹介します。`,
  excerpt: `${theme.intent}ときに、最初の一歩を決めるための実務的な整理をまとめます。`,
  category: theme.category,
  primary_keyword: theme.intent,
  secondary_keywords: [theme.categoryLabel, '小さく試す'],
  search_intent: theme.intent,
  target_reader: theme.reader,
  pillar: theme.pillar,
  problem_structure: ['目的が曖昧なまま作業を始めている', '必要な情報が複数の場所に散らばっている', '最終判断を人が行う場所が決まっていない'],
  decision_criteria: [
    { criterion: '目的', how_to_judge: '何を終えたい作業かを一文で決めます。' },
    { criterion: '必要な情報', how_to_judge: '判断前に確認する事実を三つまでに絞ります。' },
    { criterion: '人の確認', how_to_judge: '公開・契約・金額・個人情報は人が最終確認します。' }
  ],
  steps: ['困っている場面を一つ選ぶ', '必要な情報と完了条件を書く', '小さく試して迷った場所を記録する'],
  checklist: ['対象者が一文で分かる', '判断する条件が書かれている', '人が確認する場所が決まっている', '一週間後の見直し日がある'],
  source_ids: sourceCandidates.slice(0, 1).map((source) => source.id),
  introduction: 'やることが増えるほど、何から手をつけるか迷いやすくなります。',
  sections: topics.map(([heading, paragraph], index) => ({ heading, paragraphs: [paragraph, `${heading}では、急いで正解を決めるよりも今の条件に合う小さな基準を残し、次に似た場面が来ても迷いを減らしながら自分の状況に合わせて調整できます。`, `${heading}を試した後は、負担が減ったか、相手に伝わったか、例外が増えていないかを見て、合わない部分はやめてもよく、記録を次の判断に渡すことが継続につながります。`, `${heading}について一人で抱え込まないために、必要なら相談する相手や公式情報へ戻る場所も決めておき、方法は生活や仕事の変化に合わせて見直してかまいません。`], subsections: index === 2 ? [{ heading: '記録する項目', paragraphs: ['目的、必要な情報、完了の目安を短く残し、迷いが出た場所も一言添えると、次の見直しに使えます。'] }] : [] })),
  conclusion: '小さく試し、負担が減ったかを見てから次へ進みます。',
  affiliate_recommendations: [],
  related_article_ids: []
  };
};

export const sourceHash = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
