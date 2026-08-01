#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleStructuredData, canonicalUrl, jsonForScript } from './seo-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const queuePath = path.join(rootDir, 'automation/article-queue.json');
const approvedContentDir = path.join(rootDir, 'automation/approved-content');
const generatedContentDir = path.join(rootDir, 'automation/generated-content');
const manifestPath = path.join(rootDir, 'articles/data/manifest.json');
const articleIndexPath = path.join(rootDir, 'articles/index.html');
const homePath = path.join(rootDir, 'index.html');

const cliArguments = process.argv.slice(2);
const args = new Set(cliArguments);
const nowArgument = cliArguments.find((argument) => argument.startsWith('--now='));
const now = nowArgument ? new Date(nowArgument.slice('--now='.length)) : new Date();
const isCheck = args.has('--check');
const isDryRun = args.has('--dry-run');
const isSyncOnly = args.has('--sync-indexes');
// 公開済み記事の本文だけを、承認済み原稿から再生成する明示的な保守モードです。
// 記事一覧・公開日・キューの状態は変更しません。
const isRefreshPublished = args.has('--refresh-published');
// 編集確認済みの記事を一括で公開するための明示的な手動モードです。
// 通常の定時公開では使わず、予約枠の重複も許可しません。
const isPublishAll = args.has('--publish-all');

if (Number.isNaN(now.getTime())) {
  throw new Error('`--now` は ISO 8601 形式で指定してください。');
}

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const datePartsInTokyo = (value) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(value);
  const values = Object.fromEntries(parts
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    display: `${Number(values.year)}年${Number(values.month)}月${Number(values.day)}日`
  };
};

const requireString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} を入力してください。`);
  }
  return value.trim();
};

const replaceManagedSection = (html, name, content) => {
  const expression = new RegExp(`(<!-- AUTO:${name}:START -->)[\\s\\S]*?(<!-- AUTO:${name}:END -->)`);
  if (!expression.test(html)) {
    throw new Error(`${name} の更新マーカーが見つかりません。`);
  }
  return html.replace(expression, `$1\n${content}\n        $2`);
};

const excerptFor = (article) => article.excerpt || article.metaDescription || '記事を読む';
const displayArticleDate = (date) => date
  ? datePartsInTokyo(new Date(`${date}T00:00:00+09:00`)).display
  : '';

const visualClassFor = (article) => {
  const key = article.category;
  if (key === 'ai') return 'media-thumb-ai';
  if (['creative', 'sns', 'templates'].includes(key)) return 'media-thumb-creative';
  if (['marketing', 'diagnosis'].includes(key)) return 'media-thumb-marketing';
  if (key === 'personal') return 'media-thumb-personal';
  if (['money', 'affiliate'].includes(key)) return 'media-thumb-money';
  if (key === 'love') return 'media-thumb-love';
  if (key === 'fortune') return 'media-thumb-fortune';
  return 'media-thumb-default';
};

const articleNumber = (article) => Number((article.slug || article.file || '').match(/(\d+)(?:\.html)?$/)?.[1] || 0);

const sortedPublished = (manifest) => manifest
  .filter((article) => article.status === 'published')
  .sort((a, b) => {
    const dateOrder = `${b.updatedAt || b.publishedAt || ''}`.localeCompare(`${a.updatedAt || a.publishedAt || ''}`);
    if (dateOrder) return dateOrder;
    const numberOrder = articleNumber(b) - articleNumber(a);
    if (numberOrder) return numberOrder;
    return `${b.file || ''}`.localeCompare(`${a.file || ''}`, 'ja');
  });

const renderArticleList = (articles) => articles.map((article) => `      <a class="article-card" href="${escapeHtml(article.file)}">
        <div class="thumb">SOAM MEDIA</div>
        <div class="body">
          <span class="tag">${escapeHtml(article.categoryLabel || 'その他')}</span>
          <h3>${escapeHtml(article.title)}</h3>
          <p>公開日：${escapeHtml(displayArticleDate(article.publishedAt || ''))}</p>
          <span class="read-more">記事を読む →</span>
        </div>
      </a>`).join('\n\n');

const renderHomeHero = (articles) => {
  const classes = ['media-tile-main', 'media-tile-pink', 'media-tile-blue', 'media-tile-yellow'];
  return articles.slice(0, 4).map((article, index) => {
    const heading = index === 0 ? 'h1' : 'h2';
    const readLink = index === 0 ? '\n          <span class="media-read">記事を読む →</span>' : '';
    return `        <a class="media-tile ${classes[index]}" href="articles/${escapeHtml(article.file)}">
          <span class="media-pill">${escapeHtml(article.categoryLabel || '記事')}</span>
          <${heading}>${escapeHtml(article.title)}</${heading}>
          <p>${escapeHtml(excerptFor(article))}</p>${readLink}
        </a>`;
  }).join('\n');
};

const renderLatest = (articles) => articles.slice(0, 8).map((article) => {
  const date = article.updatedAt || article.publishedAt || '';
  return `          <a class="media-article" href="articles/${escapeHtml(article.file)}"><div class="media-thumb ${visualClassFor(article)}"></div><div class="media-article-copy"><small>${escapeHtml(article.categoryLabel || 'その他')}</small><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(excerptFor(article))}</p><time class="media-article-date" datetime="${escapeHtml(date)}">更新日：${escapeHtml(displayArticleDate(date))}</time><span>記事を読む →</span></div></a>`;
}).join('\n');

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const validateArticle = (entry, slots, existingManifest) => {
  requireString(entry.id, 'キューID');
  if (!['draft', 'review', 'approved', 'published'].includes(entry.status)) {
    throw new Error(`${entry.id}: status は draft / review / approved / published のいずれかにしてください。`);
  }
  const scheduledAt = new Date(requireString(entry.scheduledAt, `${entry.id}: scheduledAt`));
  if (Number.isNaN(scheduledAt.getTime())) throw new Error(`${entry.id}: scheduledAt の形式が不正です。`);
  const slot = slots.get(requireString(entry.slot, `${entry.id}: slot`));
  if (!slot) throw new Error(`${entry.id}: 定義されていない公開枠です。`);
  if (datePartsInTokyo(scheduledAt).time !== slot.time) {
    throw new Error(`${entry.id}: scheduledAt は ${slot.time}（${slot.id}）に合わせてください。`);
  }
  if (!entry.article || typeof entry.article !== 'object') {
    throw new Error(`${entry.id}: article を入力してください。`);
  }

  const article = entry.article;
  const slug = requireString(article.slug, `${entry.id}: article.slug`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`${entry.id}: article.slug は英小文字・数字・ハイフンだけで指定してください。`);
  }
  requireString(article.title, `${entry.id}: article.title`);
  requireString(article.category, `${entry.id}: article.category`);
  requireString(article.categoryLabel, `${entry.id}: article.categoryLabel`);
  requireString(article.excerpt, `${entry.id}: article.excerpt`);
  requireString(article.metaDescription, `${entry.id}: article.metaDescription`);

  const existing = existingManifest.find((item) => item.slug === slug || item.file === `${slug}.html`);
  if (entry.status !== 'published' && existing) {
    throw new Error(`${entry.id}: ${slug} はすでに公開済みの記事と重複しています。`);
  }
  if (entry.status === 'approved') {
    const source = requireString(entry.source, `${entry.id}: source`);
    const sourcePath = path.resolve(rootDir, source);
    if (!sourcePath.startsWith(`${approvedContentDir}${path.sep}`) && !sourcePath.startsWith(`${generatedContentDir}${path.sep}`)) {
      throw new Error(`${entry.id}: source は automation/approved-content/ または automation/generated-content/ 配下に置いてください。`);
    }
  }
};

const validateQueue = (queue, manifest, { allowReservedSlotOverlap = false } = {}) => {
  if (!queue || queue.timezone !== 'Asia/Tokyo') {
    throw new Error('article-queue.json の timezone は Asia/Tokyo にしてください。');
  }
  if (!Array.isArray(queue.slots) || queue.slots.length !== 3) {
    throw new Error('公開枠は朝・昼・晩の3件を定義してください。');
  }
  const slots = new Map();
  queue.slots.forEach((slot) => {
    const id = requireString(slot.id, 'slot.id');
    const time = requireString(slot.time, `${id}: time`);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(`${id}: 時刻の形式が不正です。`);
    if (slots.has(id)) throw new Error(`公開枠 ${id} が重複しています。`);
    slots.set(id, { ...slot, time });
  });
  if (!Array.isArray(queue.articles)) throw new Error('articles は配列にしてください。');

  const ids = new Set();
  const articleKeys = new Set();
  const reservationKeys = new Set();
  queue.articles.forEach((entry) => {
    validateArticle(entry, slots, manifest);
    if (ids.has(entry.id)) throw new Error(`キューID ${entry.id} が重複しています。`);
    ids.add(entry.id);
    if (articleKeys.has(entry.article.slug)) throw new Error(`記事 ${entry.article.slug} がキュー内で重複しています。`);
    articleKeys.add(entry.article.slug);
    if (entry.status !== 'published' && !allowReservedSlotOverlap) {
      const reservationKey = `${entry.scheduledAt}|${entry.slot}`;
      if (reservationKeys.has(reservationKey)) throw new Error(`${reservationKey} に複数の記事が予約されています。`);
      reservationKeys.add(reservationKey);
    }
  });
};

const readApprovedContent = async (entry) => {
  const sourcePath = path.resolve(rootDir, entry.source);
  const content = (await fs.readFile(sourcePath, 'utf8')).trim();
  if (!content) throw new Error(`${entry.id}: 本文が空です。`);
  if (/<(?:html|head|body|script|iframe)\b|\son[a-z]+\s*=/i.test(content)) {
    throw new Error(`${entry.id}: 本文にはページ全体・script・iframe・イベント属性を入れないでください。`);
  }
  return content;
};

const categoryPracticeGuide = (article) => {
  const guides = {
    templates: `<section class="article-practice-guide"><h2>実際に使った後に確認すること</h2><p>テンプレートを配っただけでは、仕事が軽くなったかは分かりません。使った人に「どこで入力が止まったか」「後から探せたか」「確認の往復が減ったか」を聞きます。入力に時間がかかるなら項目を減らし、判断に迷うなら完了の基準を一文足します。使われない原因を、人の努力不足にしないことが大切です。</p><h2>一週間だけの実践プラン</h2><ol><li>月曜：一つの定型業務を選び、今の手順を書き出す</li><li>火曜：必須項目を三つに絞って試作する</li><li>水曜〜金曜：実際の案件で使い、迷った場所を一行残す</li><li>週末：三回以上出た迷いだけを直す</li></ol><p>一度に複数のテンプレートを整えるより、一件で手戻りを減らせた経験をつくる方が、次の改善につながります。</p><h2>よくあるつまずきと戻し方</h2><p>「全パターンを入れたくなる」「説明が長くなる」「最新版が分からない」はよく起きます。例外はリンク先の補足へ逃がし、本文には標準の流れだけを残します。変更履歴も細かく残しすぎず、最新版・更新日・相談先が分かれば十分です。</p><h2>仕組みより先に守りたいこと</h2><p>テンプレートは人の判断を置き換えるものではありません。公開、送信、金額、約束、個人情報に関わる内容は、担当者が最終確認します。定型にできる確認を減らし、その分だけ例外や相手への配慮に時間を使える状態を目指します。</p></section>`,
    love: `<section class="article-practice-guide"><h2>会話の前に、自分の状態を確かめる</h2><p>相手に伝える前に、今の自分が眠れているか、食べられているか、怖さを感じていないかを確認します。感情が強いときは、結論を出す会話ではなく「今は整理する時間がほしい」と伝えるだけでもかまいません。安全が損なわれる不安がある場合は、二人だけで解決しようとしないことを優先します。</p><h2>言葉がまとまらないときの準備</h2><p>紙やメモに、事実／気持ち／希望／確認したいことの四行だけを書きます。会話で全部を言えなくても、最初の一行があれば始められます。相手の返答を聞いた後は、すぐに答えを出さず「考えてから返事をする」と保留してよいことも忘れないでください。</p><h2>小さな約束で、関係を見ていく</h2><p>大きな将来の言葉より、次の一週間で守れる小さな約束を見ます。連絡の仕方、予定変更の伝え方、嫌だと言ったことを繰り返さないこと。話し合いの内容と行動が少しずつ一致するかが、安心して関われる関係かを考える材料になります。</p><h2>相談を使う目安</h2><p>不安や恐怖で生活が小さくなる、断っても接触や要求が続く、暴力・脅し・監視がある場合は、信頼できる人や専門の相談窓口に相談してください。助けを求めることは相手を悪者にするためではなく、自分の安全と選択肢を守るための行動です。</p></section>`,
    fortune: `<section class="article-practice-guide"><h2>不確かな言葉を、生活の中で扱う</h2><p>占い・診断・SNSの助言は、今の気持ちを考えるきっかけにはなりますが、未来や他人の本心を確定するものではありません。心に残った言葉は「私はなぜこれが気になったのか」と自分へ返します。事実、希望、怖さを分けて書くと、言葉に振り回されずに扱えます。</p><h2>一週間の小さな記録</h2><ol><li>心に残った結果や言葉を一つ書く</li><li>それを読んで生まれた気持ちを書く</li><li>確認できる現実の情報を一つ集める</li><li>戻れる小さな行動を一つ試す</li><li>一週間後に負担と変化を見直す</li></ol><p>記録は正解を証明するためではありません。自分の選択が、今の生活に合っているかを見るために残します。</p><h2>結果から距離を取るサイン</h2><p>何度も読み直して眠れない、予定や支出を決められない、誰かを疑い続けてしまうなら、情報から離れる時間をつくってください。医療、法律、契約、投資、安全に関わることは、占い・簡易診断だけで決めず、公式情報や専門家、信頼できる相談先に確認します。</p><h2>判断は自分の手元へ戻せる</h2><p>助言は選択肢を増やすものとして受け取り、最終的な判断は自分の条件と現実の情報で行います。迷いが続くときに相談することも、判断を手放すことではなく、材料を増やすための方法です。</p></section>`,
    personal: `<section class="article-practice-guide"><h2>余力に合わせた基準を先に決める</h2><p>整えることが増えるほど、生活は苦しくなります。今日は五分だけ、十五分あれば進める、誰かに頼む・後日に回す、の三つに分けます。体調や仕事量によってできることが変わる前提で、最低限の形を持っておくと、できなかった日まで失敗にしなくて済みます。</p><h2>一週間だけ試して、負担を測る</h2><ol><li>一番止まりやすい場面を一つ選ぶ</li><li>そこで迷わないための案を一つ用意する</li><li>使えた日・使えなかった日を短く記録する</li><li>週末に、続ける・減らす・やめるを決める</li></ol><p>仕組みが合わないときは、自分を責めるより、手順が今の生活に合っているかを見直します。</p><h2>人に頼むことも、暮らしを回す技術</h2><p>家事、予定、連絡を一人で抱え込む必要はありません。手伝ってほしいことを「いつまでに、何を、どこまで」と短く伝えると、頼む側も受ける側も判断しやすくなります。必要な支援につながることは、生活を整える選択の一つです。</p><h2>続けるより、戻れることを大切にする</h2><p>習慣は途切れてもかまいません。体調や予定が変わったら、休む・方法を変える・再開しないという選択も含めて、自分に合う形を残します。仕組みがあなたの生活に合わせるのであって、生活を仕組みに合わせる必要はありません。</p></section>`
  };
  if (!/^article-(?:3[0-9]|4[01])$/.test(article.slug)) return '';
  const closeout = `<section class="article-practice-guide"><h2>この記事を閉じる前の三つの確認</h2><p>最後に、「今日できる一歩は一つに絞れているか」「無理をして続ける前提になっていないか」「必要なら誰に相談するか」が言葉になっているかを確認します。良い方法でも、生活の状況や相手との関係によって合わないことがあります。試した後の自分の負担を見て、残す・調整する・やめるを選んでください。</p><p>特に健康、安全、契約、金銭、相手の同意に関わることは、記事や一般的な助言だけで判断せず、公式情報、当事者との対話、必要に応じた専門家の確認を重ねます。答えを急がないことも、状況を大切に扱う選択です。</p><h2>小さく試し、記録を次の自分へ渡す</h2><p>変化を大きくしようとせず、まず一回・一日・一週間だけ試します。うまくいった理由、止まった場面、次に変えたいことを二、三行残せば、次回はゼロから考えなくて済みます。この記事の内容も、今の自分に合うところだけを使ってください。</p></section>`;
  return `${guides[article.category] || guides.personal || ''}${closeout}`;
};

const buildDisclosure = (article) => article.containsAffiliateLinks ? `
      <div class="affiliate-box">
        <p><strong>広告・紹介リンクについて</strong></p>
        <p>この記事には紹介リンクまたはアフィリエイト広告を含む場合があります。料金・仕様・提供条件は変更されることがあるため、リンク先の公式情報をご確認ください。</p>
      </div>` : '';

const socialMeta = (article, canonical) => `
  <meta property="og:title" content="${escapeHtml(article.metaTitle || article.title)} | SOAM MEDIA" data-seo="social">
  <meta property="og:description" content="${escapeHtml(article.metaDescription)}" data-seo="social">
  <meta property="og:url" content="${canonical}" data-seo="social">
  <meta property="og:type" content="article" data-seo="social">
  <meta name="twitter:card" content="summary" data-seo="social">
  <meta name="twitter:title" content="${escapeHtml(article.metaTitle || article.title)} | SOAM MEDIA" data-seo="social">
  <meta name="twitter:description" content="${escapeHtml(article.metaDescription)}" data-seo="social">`;

const renderArticlePage = (entry, content, published) => {
  const article = entry.article;
  const file = `${article.slug}.html`;
  const structuredData = articleStructuredData({
    title: article.title,
    description: article.metaDescription,
    file,
    publishedAt: published.date,
    updatedAt: published.date
  });
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(article.metaDescription)}">
  <title>${escapeHtml(article.metaTitle || article.title)} | SOAM MEDIA</title>
  <link rel="canonical" href="${canonicalUrl(`articles/${file}`)}" data-seo="canonical">
  <script type="application/ld+json" data-seo="article">${jsonForScript(structuredData)}</script>
${socialMeta(article, canonicalUrl(`articles/${file}`))}
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-8LDQ9J4C8B" data-analytics="ga4-loader"></script>
  <script data-analytics="ga4">
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-8LDQ9J4C8B');
  </script>
  <link rel="stylesheet" href="../style.css">
  <script src="article-reader.js" defer></script>
</head>
<body>
  <header>
    <div class="header-inner">
      <a href="../index.html" class="logo">● SOAM MEDIA</a>
      <nav>
        <a href="../index.html">ホーム</a>
        <a href="../articles/index.html">記事一覧</a>
        <a href="../privacy.html">プライバシーポリシー</a>
        <a href="../contact.html">お問い合わせ</a>
      </nav>
    </div>
  </header>
  <main class="article-body">
    <div class="article-container">
      <p class="article-category">${escapeHtml(article.categoryLabel)}</p>
      <h1>${escapeHtml(article.title)}</h1>
      <p class="article-date">${published.display}</p>
      <p class="article-byline" data-seo="byline">執筆・編集：SOAM MEDIA</p>
      <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
${content}
${buildDisclosure(article)}
    </div>
  </main>
  <footer>
    <p>本サイトはアフィリエイト広告を利用しています。</p>
    <a href="../privacy.html">プライバシーポリシー</a>
    <p>© 2026 SOAM CREATIVE. All rights reserved.</p>
  </footer>
</body>
</html>
`;
};

const syncIndexes = async (manifest, dryRun) => {
  const articles = sortedPublished(manifest);
  const updated = datePartsInTokyo(now);
  const articleIndex = await fs.readFile(articleIndexPath, 'utf8');
  const home = await fs.readFile(homePath, 'utf8');
  const nextArticleIndex = replaceManagedSection(articleIndex, 'ARTICLE_LIST', renderArticleList(articles));
  const nextHome = replaceManagedSection(
    replaceManagedSection(home, 'HOME_HERO', renderHomeHero(articles)),
    'HOME_LATEST',
    renderLatest(articles)
  );
  const homeWithUpdatedDate = replaceManagedSection(
    nextHome,
    'SITE_UPDATED_AT',
    `<time class="media-site-updated" datetime="${updated.date}">最終更新：${updated.display}</time>`
  );
  if (!dryRun) {
    await Promise.all([
      fs.writeFile(articleIndexPath, nextArticleIndex),
      fs.writeFile(homePath, homeWithUpdatedDate)
    ]);
  }
};

const main = async () => {
  const [queue, manifest] = await Promise.all([readJson(queuePath), readJson(manifestPath)]);
  validateQueue(queue, manifest, { allowReservedSlotOverlap: isPublishAll });
  if (isCheck) {
    console.log(`[scheduled-publish] queue is valid: ${queue.articles.length} article(s), ${queue.slots.length} slot(s).`);
    return;
  }

  const due = queue.articles
    .filter((entry) => isRefreshPublished
      ? entry.status === 'published'
      : entry.status === 'approved' && (isPublishAll || new Date(entry.scheduledAt) <= now))
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  if (!due.length) {
    if (isSyncOnly) {
      await syncIndexes(manifest, isDryRun);
      console.log(`[scheduled-publish] ${isDryRun ? 'would synchronize' : 'synchronized'} ${sortedPublished(manifest).length} published article(s).`);
      return;
    }
    console.log('[scheduled-publish] no approved articles are due.');
    return;
  }

  const nextManifest = [...manifest];
  for (const entry of due) {
    const content = `${await readApprovedContent(entry)}\n${categoryPracticeGuide(entry.article)}`;
    const articlePath = path.join(rootDir, 'articles', `${entry.article.slug}.html`);
    const existingPublished = manifest.find((item) => item.slug === entry.article.slug || item.file === `${entry.article.slug}.html`);
    const published = isRefreshPublished && existingPublished?.publishedAt
      ? datePartsInTokyo(new Date(`${existingPublished.publishedAt}T00:00:00+09:00`))
      : datePartsInTokyo(isPublishAll ? now : new Date(entry.scheduledAt));
    const manifestItem = {
      title: entry.article.title,
      slug: entry.article.slug,
      file: `${entry.article.slug}.html`,
      category: entry.article.category,
      categoryLabel: entry.article.categoryLabel,
      articleType: entry.article.articleType || 'editorial',
      targetIndustry: entry.article.targetIndustry || 'all',
      targetReader: entry.article.targetReader || null,
      tags: Array.isArray(entry.article.tags) ? entry.article.tags : [],
      excerpt: entry.article.excerpt,
      metaTitle: entry.article.metaTitle || entry.article.title,
      metaDescription: entry.article.metaDescription,
      publishedAt: published.date,
      updatedAt: published.date,
      status: 'published',
      primaryCta: entry.article.primaryCta || null,
      affiliateLinks: Array.isArray(entry.article.affiliateLinks) ? entry.article.affiliateLinks : [],
      relatedArticles: Array.isArray(entry.article.relatedArticles) ? entry.article.relatedArticles : []
    };
    if (!isDryRun) await fs.writeFile(articlePath, renderArticlePage(entry, content, published));
    if (!isRefreshPublished) {
      nextManifest.push(manifestItem);
      entry.status = 'published';
      entry.publishedAt = new Date().toISOString();
    }
    const action = isRefreshPublished ? 'refresh' : 'publish';
    console.log(`[scheduled-publish] ${isDryRun ? `would ${action}` : `${action}ed`} ${entry.article.slug} (${entry.slot}, ${published.display}).`);
  }

  if (!isDryRun && !isRefreshPublished) {
    await fs.writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
    await fs.writeFile(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
    await syncIndexes(nextManifest, false);
  }
};

main().catch((error) => {
  console.error(`[scheduled-publish] ${error.message}`);
  process.exitCode = 1;
});
