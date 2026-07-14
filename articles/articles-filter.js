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
    ['love', '恋愛'], ['fortune', '占い']
  ];
  const categoryTerms = {
    ai: ['AI活用', '診断ツール活用'],
    creative: ['SNS・note運用'],
    templates: ['テンプレート・教材'],
    marketing: ['業界別マーケティング', 'LP・Web集客', '診断ツール活用'],
    personal: ['業界別マーケティング', 'LP・Web集客'],
    money: ['お金・確定申告', '副業・キャリア'],
    love: ['恋愛・人間関係'],
    fortune: ['占い・診断']
  };

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
