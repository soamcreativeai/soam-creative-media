import { SOAM_LINK_URL } from './site-links.mjs';

export const STRATEGY_DATE = '2026-08-01';

export const PILLARS = {
  decision: {
    label: '判断を言葉にする',
    description: '感覚のまま抱えていた判断を、条件・比較軸・確認項目へ分けます。'
  },
  systems: {
    label: '一人で回す仕組み',
    description: '繰り返す仕事を手順へ変え、AIと人が担当する範囲を分けます。'
  },
  reach: {
    label: '必要な人へ届ける',
    description: '発信・集客・販売・紹介を、相手が納得して選べる導線へ整えます。'
  }
};

const categoryProfiles = {
  ai: {
    pillar: 'systems',
    reader: 'AIを仕事に取り入れたい個人事業主・小規模事業者',
    problem: 'AIへ任せる範囲と、人が確認する範囲を分けられず、かえって作業が増えている。'
  },
  templates: {
    pillar: 'systems',
    reader: '繰り返す仕事や確認の往復を減らしたい個人事業主・小規模事業者',
    problem: '同じ内容を毎回考え直し、確認漏れや手戻りが起きている。'
  },
  money: {
    pillar: 'systems',
    reader: '事業のお金・記録・申告の準備を一人で進めている個人事業主・副業者',
    problem: '必要な記録や確認の順番が分からず、期限前に判断が集中している。'
  },
  affiliate: {
    pillar: 'reach',
    reader: '商品やサービスを紹介し、誠実な収益導線を作りたい個人事業主・発信者',
    problem: '読者の課題解決と広告収益を、押し売りにならない形で両立できていない。'
  },
  marketing: {
    pillar: 'reach',
    reader: '集客や販売を一人で担っている小規模事業者・個人サービス提供者',
    problem: '発信や施策を増やしても、必要な人が次に何をすればよいか伝わっていない。'
  },
  sns: {
    pillar: 'reach',
    reader: 'SNSやnoteで商品・サービスの発信を続けたい個人事業主・小規模事業者',
    problem: '発信の目的と相手が曖昧になり、投稿を続けても販売や相談につながりにくい。'
  },
  lp: {
    pillar: 'reach',
    reader: 'LPやWebサイトから相談・販売につなげたい個人事業主・小規模事業者',
    problem: 'ページに情報はあるものの、読者が判断して次へ進むための順番が整っていない。'
  },
  creative: {
    pillar: 'reach',
    reader: '画像・動画・デザインを発信や販売に使う個人事業主・小規模事業者',
    problem: '制作の目的や条件を言葉にできず、依頼や確認で手戻りが起きている。'
  },
  diagnosis: {
    pillar: 'decision',
    reader: '診断や質問を使って、顧客の迷いを整理したい小規模事業者・個人サービス提供者',
    problem: '診断結果を見せるだけになり、読者が自分に合う次の行動を選べていない。'
  },
  personal: {
    pillar: 'decision',
    reader: '相談・講師・制作などの個人サービスを提供している事業者',
    problem: '提供範囲や依頼条件が曖昧で、相談後の認識違いや追加対応が起きている。'
  },
  love: {
    pillar: 'decision',
    reader: '人間関係の中で、自分の気持ちと相手への伝え方を整理したい人',
    problem: '事実と想像、希望と不安が混ざり、次の言葉や行動を選びにくくなっている。'
  },
  fortune: {
    pillar: 'decision',
    reader: '診断や占いを答えとしてではなく、自分の判断材料として使いたい人',
    problem: '結果を受け取るだけになり、自分で選ぶための問いや確認が不足している。'
  },
  other: {
    pillar: 'systems',
    reader: '日々の記録・整理・判断を一人で抱え、負担を軽くしたい人',
    problem: '情報や予定が散らばり、必要なときに判断材料を取り出せない。'
  }
};

const fallbackProfile = categoryProfiles.systems;

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const addDays = (date, days) => {
  const value = new Date(`${date}T00:00:00+09:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const profileFor = (article) => categoryProfiles[article.category] || fallbackProfile || {
  pillar: 'systems',
  reader: '一人で事業や仕事を進めている人',
  problem: '判断材料が散らばり、次に何をすればよいか決めにくい。'
};

export const isOfferRelevant = (article, offer) => {
  const text = `${article.title || ''} ${article.excerpt || ''} ${(article.tags || []).join(' ')}`;
  const category = article.category;
  const offerKeywordRules = {
    'value-ai-writer': /文章|執筆|ライティング|記事|ブログ|原稿/,
    'plaud-note': /録音|文字起こし|議事録|打ち合わせ|会議|メモ/,
    'ai-blog-gold': /ブログ|記事|SEO|コンテンツ|投稿|発信/,
    localgoat: /店舗|地域|来店|予約|サロン|整体|エステ|地図|Googleマップ/,
    'conoha-ai-canvas': /画像|デザイン|バナー|イラスト|制作素材/,
    miricanvas: /画像|デザイン|バナー|テンプレート|SNS素材/,
    mitsumotaro: /見積|請求|請求書|見積書/,
    'moneyforward-accounting': /会計|確定申告|経費|帳簿|請求|インボイス|税/,
    'tax-audit-membership': /税務|確定申告|税理士|法人化|税務調査|インボイス/,
    gleasin: /診断|商圏|店舗分析/,
    newma: /恋愛|結婚|婚活|人間関係/,
    iraada: /占い|スピリチュアル|運勢/,
    coconala: /外注|依頼|相談|個人サービス|制作|フリーランス/
  };
  if (offerKeywordRules[offer.id]) {
    if (offer.category === category && ['creative', 'diagnosis', 'love', 'fortune', 'money', 'personal'].includes(category)) return true;
    return offerKeywordRules[offer.id].test(text);
  }
  if (offer.category === category && category !== 'affiliate') return true;
  const rules = {
    ai: ['ai'],
    marketing: ['marketing', 'sns', 'lp'],
    creative: ['creative', 'sns'],
    templates: ['templates'],
    money: ['money'],
    affiliate: ['money'],
    diagnosis: ['diagnosis', 'marketing'],
    love: ['love'],
    fortune: ['fortune'],
    personal: ['personal']
  };
  if ((rules[offer.category] || []).includes(category)) return true;
  const keywordRules = {
    ai: /AI|録音|文字起こし|議事録|記事作成/,
    marketing: /集客|発信|ブログ|記事|販売|店舗/,
    creative: /画像|デザイン|動画|制作/,
    templates: /見積|請求|依頼|テンプレート/,
    money: /会計|確定申告|税|経費|請求/,
    affiliate: /税務|確定申告|税|法人/,
    diagnosis: /診断|商圏|店舗/,
    love: /恋愛|結婚|人間関係/,
    fortune: /占い|診断|スピリチュアル/,
    personal: /相談|依頼|外注|個人サービス/
  };
  return keywordRules[offer.category]?.test(text) || false;
};

export const normalizeAffiliateLinks = (article, catalog, usage = new Map()) => {
  const offers = (catalog.offers || []).filter((offer) => (
    offer.active === true
    && offer.id
    && offer.name
    && offer.officialUrl
    && offer.affiliateUrl
    && offer.lastVerifiedAt
    && Array.isArray(offer.prohibitedClaims)
    && isOfferRelevant(article, offer)
  ));
  const byName = new Map(offers.map((offer) => [offer.name, offer]));
  const current = (article.affiliateLinks || [])
    .map((link) => byName.get(link.name))
    .filter(Boolean);
  const unique = [...new Map(current.map((offer) => [offer.id, offer])).values()];
  if (!unique.length && offers.length) {
    const selected = [...offers]
      .sort((a, b) => (usage.get(a.id) || 0) - (usage.get(b.id) || 0) || a.id.localeCompare(b.id))
      .slice(0, 2);
    unique.push(...selected);
  }
  const selected = unique.slice(0, 2);
  selected.forEach((offer) => usage.set(offer.id, (usage.get(offer.id) || 0) + 1));
  return selected.map((offer) => ({
    offerId: offer.id,
    name: offer.name,
    asp: offer.asp,
    placement: '主な選択肢',
    reason: offer.summary,
    officialUrl: offer.officialUrl,
    informationVerifiedAt: offer.lastVerifiedAt,
    nextReviewAt: addDays(offer.lastVerifiedAt, 30)
  }));
};

const soamLinkEligible = (article, affiliateLinks) => {
  if (affiliateLinks.length) return false;
  const text = `${article.title || ''} ${article.excerpt || ''}`;
  return ['marketing', 'affiliate', 'personal', 'lp', 'creative'].includes(article.category)
    && /商品|サービス|紹介|販売|集客|依頼|外注|協力|LP|制作/.test(text);
};

const holdCategory = (category) => ['love', 'fortune'].includes(category);

export const enrichArticle = (article, { catalog, usage = new Map(), date = STRATEGY_DATE } = {}) => {
  const profile = profileFor(article);
  const affiliateLinks = normalizeAffiliateLinks(article, catalog || { offers: [] }, usage);
  const contentType = /比較|選び方/.test(`${article.title} ${article.articleType}`) ? 'comparison' : article.articleType || 'guide';
  const reviewCycleDays = contentType === 'comparison' ? 90 : affiliateLinks.length ? 30 : 180;
  const informationVerifiedAt = article.informationVerifiedAt || article.updatedAt || article.publishedAt || date;
  const eligibleForSoamLink = soamLinkEligible(article, affiliateLinks);
  const primaryCtaType = affiliateLinks.length ? 'affiliate' : eligibleForSoamLink ? 'soam-link' : 'related-article';
  return {
    ...article,
    targetReader: article.targetReader || profile.reader,
    readerProblem: article.readerProblem || profile.problem,
    searchIntent: article.searchIntent || `「${article.title}」について、判断基準と具体的な進め方を知りたい。`,
    pillar: article.pillar || profile.pillar,
    pillarLabel: PILLARS[article.pillar || profile.pillar].label,
    articleType: contentType,
    informationVerifiedAt,
    reviewCycleDays,
    nextReviewAt: addDays(informationVerifiedAt, reviewCycleDays),
    affiliateLinks,
    containsAffiliateLinks: affiliateLinks.length > 0,
    soamLinkEligible: eligibleForSoamLink,
    primaryCtaType,
    primaryCta: primaryCtaType === 'affiliate' ? affiliateLinks[0]?.name || null : primaryCtaType === 'soam-link' ? 'SOAM Linkの公開内容' : null,
    auditStatus: holdCategory(article.category) ? 'HOLD' : 'KEEP',
    auditNotes: holdCategory(article.category)
      ? '今後の自動生成対象外。公開URLは維持し、主題との関係を次回見直す。'
      : '3本柱・読者・検索意図・鮮度・主導線を明示して維持する。'
  };
};

const criteriaFor = (article) => {
  if (article.pillar === 'decision') return [
    ['事実と解釈', '確認できた事実と、自分の受け止めを分ける。'],
    ['選ぶ条件', '何を優先するか、避けたい条件は何かを先に書く。'],
    ['最終判断', '診断や他人の意見を答えにせず、自分で決める。']
  ];
  if (article.pillar === 'reach') return [
    ['相手の困りごと', article.readerProblem],
    ['次の行動', '読者が理解した後に、選べる行動を一つに絞る。'],
    ['導線の適合', '商品・サービスは、記事の課題に合う場合だけ案内する。']
  ];
  return [
    ['繰り返す部分', '同じ確認や作業が起きる場所を先に見つける。'],
    ['仕組みに任せる部分', '整理・記録・下書きなど、やり直せる作業を分ける。'],
    ['人が決める部分', '公開・契約・金額・個人情報は、人が最終確認する。']
  ];
};

export const renderEditorialSummary = (article) => {
  const pillar = PILLARS[article.pillar];
  const rows = criteriaFor(article).map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('');
  return `<!-- AUTO:EDITORIAL_STRATEGY:START -->
      <section class="editorial-strategy" data-editorial-strategy data-pillar="${escapeHtml(article.pillar)}" data-article-type="${escapeHtml(article.articleType)}">
        <p class="editorial-strategy__pillar">${escapeHtml(pillar.label)}</p>
        <h2>この記事で整理すること</h2>
        <dl class="editorial-strategy__summary">
          <div><dt>対象読者</dt><dd>${escapeHtml(article.targetReader)}</dd></div>
          <div><dt>困りごと</dt><dd>${escapeHtml(article.readerProblem)}</dd></div>
          <div><dt>知りたいこと</dt><dd>${escapeHtml(article.searchIntent)}</dd></div>
        </dl>
        <h3>判断するときの確認表</h3>
        <div class="article-table-scroll"><table><tbody>${rows}</tbody></table></div>
      </section>
      <!-- AUTO:EDITORIAL_STRATEGY:END -->`;
};

const offerDetails = (article, link, offer) => {
  const suitable = offer?.suitableFor || `${article.targetReader}のうち、${offer?.summary || link.reason}が必要な人`;
  const unsuitable = offer?.unsuitableFor || '料金・仕様・提供条件を確認せず、結果だけを求めている人';
  return `<li class="affiliate-option" data-offer-id="${escapeHtml(link.offerId)}">
          <h3>${escapeHtml(link.name)}</h3>
          <p>${escapeHtml(link.reason)}</p>
          <dl><div><dt>向いている人</dt><dd>${escapeHtml(suitable)}</dd></div><div><dt>向いていない人</dt><dd>${escapeHtml(unsuitable)}</dd></div></dl>
          <p class="affiliate-option__links"><a href="${escapeHtml(offer.affiliateUrl)}" rel="nofollow sponsored" data-track-event="affiliate_click" data-offer-id="${escapeHtml(link.offerId)}">サービス内容を確認する</a></p>
          <p class="affiliate-option__date">情報確認日：${escapeHtml(link.informationVerifiedAt)}／次回見直し：${escapeHtml(link.nextReviewAt)}</p>
        </li>`;
};

export const renderPrimaryCta = (article, catalog) => {
  const offersById = new Map((catalog.offers || []).map((offer) => [offer.id, offer]));
  if (article.primaryCtaType === 'affiliate' && article.affiliateLinks.length) {
    const items = article.affiliateLinks.map((link) => offerDetails(article, link, offersById.get(link.offerId))).join('');
    return `<!-- AUTO:PRIMARY_CTA:START -->
      <section class="editorial-monetization affiliate-box" data-primary-cta="affiliate">
        <p class="advertising-label">広告・紹介リンクを含みます</p>
        <h2>条件に合う場合の選択肢</h2>
        <p>記事の判断基準と照らし、必要な場合だけ公式情報と提供条件を確認してください。料金・仕様は変更されることがあります。</p>
        <ul class="affiliate-options">${items}</ul>
      </section>
      <!-- AUTO:PRIMARY_CTA:END -->`;
  }
  if (article.primaryCtaType === 'soam-link') {
    return `<!-- AUTO:PRIMARY_CTA:START -->
      <aside class="editorial-monetization soamlink-cta" data-primary-cta="soam-link">
        <p class="advertising-label">関連する仕組み</p>
        <h2>紹介する人・掲載する人・選ぶ人が納得できる仕組み</h2>
        <p>商品やサービスを選ぶ前に、紹介する人・掲載する人・選ぶ人が納得できる仕組みについて知りたい方は、SOAM Linkの公開内容をご覧ください。</p>
        <p><a href="${escapeHtml(SOAM_LINK_URL)}" data-track-event="soam_link_click">SOAM Linkの公開内容を見る →</a></p>
      </aside>
      <!-- AUTO:PRIMARY_CTA:END -->`;
  }
  return '<!-- AUTO:PRIMARY_CTA:START -->\n      <!-- 主な外部CTAはありません。関連記事から次の判断へ進みます。 -->\n      <!-- AUTO:PRIMARY_CTA:END -->';
};

export const renderFreshness = (article) => `<!-- AUTO:ARTICLE_FRESHNESS:START -->
      <aside class="article-freshness" data-article-freshness>
        <p><strong>情報の扱い：</strong>確認日 ${escapeHtml(article.informationVerifiedAt)}／次回見直し ${escapeHtml(article.nextReviewAt)}</p>
        <p>料金・仕様・制度など変わりやすい内容は、本文の注意事項とリンク先の公式情報を確認してください。</p>
      </aside>
      <!-- AUTO:ARTICLE_FRESHNESS:END -->`;

const removeManagedDivs = (html, classNames) => {
  let output = html;
  const classPattern = new RegExp(`class=["'][^"']*(?:${classNames.join('|')})[^"']*["']`, 'i');
  let cursor = 0;
  while (cursor < output.length) {
    const open = output.slice(cursor).match(/<div\b[^>]*>/i);
    if (!open) break;
    const start = cursor + open.index;
    const tag = open[0];
    if (!classPattern.test(tag)) {
      cursor = start + tag.length;
      continue;
    }
    const tagMatcher = /<div\b[^>]*>|<\/div>/gi;
    tagMatcher.lastIndex = start;
    let depth = 0;
    let end = -1;
    for (let match = tagMatcher.exec(output); match; match = tagMatcher.exec(output)) {
      if (/^<\/div/i.test(match[0])) depth -= 1;
      else depth += 1;
      if (depth === 0) {
        end = tagMatcher.lastIndex;
        break;
      }
    }
    if (end < 0) throw new Error('既存CTAのHTML構造を安全に読み取れませんでした。');
    output = `${output.slice(0, start)}${output.slice(end)}`;
    cursor = start;
  }
  return output;
};

const removeManagedSection = (html, name) => html.replace(
  new RegExp(`\\s*<!-- AUTO:${name}:START -->[\\s\\S]*?<!-- AUTO:${name}:END -->`, 'g'),
  ''
);

const insertBeforeArticleClose = (html, content) => {
  const startMatch = html.match(/<div\b[^>]*class=["'][^"']*article-container[^"']*["'][^>]*>/i);
  if (!startMatch || startMatch.index === undefined) throw new Error('article-container の開始位置が見つかりません。');
  const tagMatcher = /<div\b[^>]*>|<\/div>/gi;
  tagMatcher.lastIndex = startMatch.index;
  let depth = 0;
  for (let match = tagMatcher.exec(html); match; match = tagMatcher.exec(html)) {
    if (/^<\/div/i.test(match[0])) depth -= 1;
    else depth += 1;
    if (depth === 0) return `${html.slice(0, match.index)}\n${content}${html.slice(match.index)}`;
  }
  throw new Error('article-container の終了位置が見つかりません。');
};

export const decorateArticleHtml = (html, article, catalog) => {
  let output = html;
  for (const name of ['EDITORIAL_STRATEGY', 'PRIMARY_CTA', 'ARTICLE_FRESHNESS']) output = removeManagedSection(output, name);
  output = removeManagedDivs(output, ['affiliate-box', 'soamlink-cta', 'soamlink-cta-min', 'cta-box']);
  output = output.replace(/(<div\b[^>]*class=["'][^"']*related-box[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/gi, (match, open, body, close) => (
    `${open}${body.replace(/<a\b(?![^>]*data-track-event=)/gi, '<a data-track-event="related_article_click"')}${close}`
  ));
  const summary = renderEditorialSummary(article);
  const byline = /(<p class="article-byline"[^>]*>[\s\S]*?<\/p>)/;
  if (!byline.test(output)) throw new Error(`${article.file}: 著者表記が見つかりません。`);
  output = output.replace(byline, `$1\n${summary}`);
  output = insertBeforeArticleClose(output, `${renderFreshness(article)}\n${renderPrimaryCta(article, catalog)}\n`);
  return output.replace(/\n{4,}/g, '\n\n\n');
};

export const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
