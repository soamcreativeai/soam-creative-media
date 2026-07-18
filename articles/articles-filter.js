document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.article-grid');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.article-card'));
  const params = new URLSearchParams(window.location.search);
  const query = (params.get('q') || '').trim();
  const selected = params.get('category') || 'all';
  const categories = [
    ['all', 'すべて'], ['ai', 'AI・仕事'], ['creative', '制作'],
    ['templates', 'テンプレート'], ['marketing', '集客・販売'],
    ['personal', '個人サービス'], ['money', '税金・副業'],
    ['love', '恋愛'], ['fortune', '占い'], ['other', '暮らし・その他']
  ];
  const categoryPages = {
    ai: { title: 'AI・業務効率化の記事', description: 'AIツール、業務効率化、仕事の摩擦を減らすための記事をまとめています。' },
    creative: { title: '動画・画像・デザインの記事', description: '動画編集、画像制作、発信素材づくりに関する記事をまとめています。' },
    templates: { title: 'テンプレート・教材の記事', description: '業務フォーマット、教材、デジタル成果物に関する記事をまとめています。' },
    marketing: { title: '集客・販売の記事', description: 'SNS、広告、店舗集客、販売導線に関する記事をまとめています。' },
    personal: { title: '個人サービスの記事', description: '相談、代行、制作、専門家サービスに関する記事をまとめています。' },
    money: { title: '税金・副業・お金の記事', description: '確定申告、副業、家計、働き方に関する記事をまとめています。' },
    love: { title: '恋愛・人間関係の記事', description: '恋愛、結婚、コミュニケーションに関する記事をまとめています。' },
    fortune: { title: '占い・診断の記事', description: '占い、自己理解、診断コンテンツに関する記事をまとめています。' },
    other: { title: '暮らし・その他の記事', description: '生活、美容、そのほかのテーマに関する記事をまとめています。' }
  };
  const categoryTerms = {
    ai: ['AI・業務効率化', 'AI活用', '診断ツール活用'],
    creative: ['動画・画像・デザイン', 'SNS・note運用'],
    templates: ['テンプレート・教材'],
    marketing: ['集客・販売', '業界別マーケティング', 'LP・Web集客', '診断ツール活用'],
    personal: ['個人サービス', '業界別マーケティング', 'LP・Web集客'],
    money: ['税金・副業・お金', 'お金・確定申告', '副業・キャリア', 'アフィリエイト・収益化'],
    love: ['恋愛・人間関係'],
    fortune: ['占い・診断'],
    other: ['暮らし・その他', 'その他']
  };

  const page = categoryPages[selected];
  if (page) {
    const heading = document.querySelector('.page-head h1');
    const description = document.querySelector('.page-head p');
    const breadcrumb = document.querySelector('.breadcrumb');
    if (heading) heading.textContent = page.title;
    if (description) description.textContent = page.description;
    if (breadcrumb) breadcrumb.innerHTML = '<a href="../index.html">ホーム</a> ／ カテゴリ ／ ' + page.title.replace('の記事', '');
    document.title = `${page.title}｜SOAM MEDIA`;
  }

  const tools = document.createElement('div');
  tools.className = 'article-tools';
  tools.innerHTML = `
    <form class="article-search">
      <input type="search" name="q" aria-label="記事を検索" placeholder="記事タイトルやテーマを検索" value="${query.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">
      <button type="submit">検索する</button>
    </form>
    <nav class="article-filters" aria-label="記事カテゴリ">
      ${categories.map(([key, label]) => `<a class="article-filter${selected === key ? ' active' : ''}" href="?category=${key}">${label}</a>`).join('')}
    </nav>
    <p class="article-results-note" aria-live="polite"></p>
    <div class="article-no-results">このテーマの記事は準備中です。ほかのカテゴリもご覧ください。</div>`;
  grid.before(tools);

  const form = tools.querySelector('form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    const value = form.elements.q.value.trim();
    if (value) next.set('q', value);
    if (selected !== 'all') next.set('category', selected);
    window.location.search = next.toString();
  });

  const lowered = query.toLocaleLowerCase('ja');
  const terms = categoryTerms[selected] || [];
  let visible = 0;
  cards.forEach((card) => {
    const text = card.textContent.toLocaleLowerCase('ja');
    const label = card.querySelector('.tag')?.textContent.trim() || '';
    const categoryMatch = selected === 'all' || terms.includes(label);
    const queryMatch = !lowered || text.includes(lowered);
    const show = categoryMatch && queryMatch;
    card.hidden = !show;
    if (show) visible += 1;
  });

  tools.querySelector('.article-results-note').textContent = query
    ? `「${query}」に一致する記事を表示しています。`
    : selected === 'all' ? '公開中の記事をすべて表示しています。' : '選択したテーマの記事を表示しています。';
  tools.querySelector('.article-no-results').classList.toggle('show', visible === 0);
});
