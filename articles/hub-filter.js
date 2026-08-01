(() => {
  'use strict';
  const track = (name, parameters = {}) => {
    if (typeof window.gtag === 'function') window.gtag('event', name, parameters);
  };
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-hub-filters]');
    const cards = [...document.querySelectorAll('[data-hub-card]')];
    const results = document.querySelector('[data-hub-results]');
    if (!form || !cards.length) return;
    const apply = () => {
      const data = new FormData(form);
      const query = String(data.get('query') || '').trim().toLocaleLowerCase('ja');
      const fields = ['purpose', 'audience', 'cost', 'load'];
      let visible = 0;
      cards.forEach((card) => {
        const matchesQuery = !query || card.textContent.toLocaleLowerCase('ja').includes(query);
        const matchesFields = fields.every((field) => data.get(field) === 'all' || card.dataset[field] === data.get(field));
        card.hidden = !(matchesQuery && matchesFields);
        if (!card.hidden) visible += 1;
      });
      if (results) results.textContent = `${visible}件の選び方記事を表示しています。`;
    };
    form.addEventListener('input', apply);
    form.addEventListener('change', apply);
    form.addEventListener('submit', (event) => event.preventDefault());
    document.addEventListener('click', (event) => {
      const link = event.target.closest('[data-hub-card] a, a[data-hub-card]');
      if (link) track('related_article_click', { source: 'comparison_hub', destination: link.href });
    });
    apply();
  });
})();
