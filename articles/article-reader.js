(() => {
  'use strict';

  const storageKey = 'soam-creative-media-saved-articles-v1';

  const track = (eventName, parameters = {}) => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, parameters);
    }
  };

  const readSaved = () => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const writeSaved = (items) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
      return true;
    } catch {
      return false;
    }
  };

  const articleFile = () => window.location.pathname.split('/').pop() || '';

  const renderSavedPage = () => {
    const target = document.querySelector('[data-saved-articles]');
    if (!target) return;

    const saved = readSaved();
    target.replaceChildren();
    if (!saved.length) {
      const empty = document.createElement('div');
      empty.className = 'saved-empty';
      empty.innerHTML = '<p>まだ保存した記事はありません。</p><a href="articles/index.html">記事を探す →</a>';
      target.append(empty);
      return;
    }

    saved.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || '')).forEach((item) => {
      const card = document.createElement('article');
      card.className = 'saved-article-card';
      const label = document.createElement('p');
      label.className = 'saved-article-label';
      label.textContent = item.category || '保存した記事';
      const title = document.createElement('a');
      title.href = item.url;
      title.textContent = item.title;
      const action = document.createElement('button');
      action.type = 'button';
      action.textContent = '保存から外す';
      action.addEventListener('click', () => {
        writeSaved(readSaved().filter((savedItem) => savedItem.url !== item.url));
        renderSavedPage();
      });
      card.append(label, title, action);
      target.append(card);
    });
  };

  const createReaderUtility = () => {
    const article = document.querySelector('.article-container');
    const date = article?.querySelector('.article-date');
    const title = article?.querySelector('h1')?.textContent.trim();
    if (!article || !date || !title) return;

    const category = article.querySelector('.article-category')?.textContent.trim() || '';
    const url = window.location.href.split('#')[0];
    const isSaved = () => readSaved().some((item) => item.url === url);
    const utility = document.createElement('section');
    utility.className = 'article-reader-utility';
    utility.setAttribute('aria-label', '記事を保存・共有する');

    const intro = document.createElement('p');
    intro.textContent = '役立ったら、あとで読めるように残したり、必要な人へ共有できます。';
    const actions = document.createElement('div');
    actions.className = 'article-reader-actions';

    const save = document.createElement('button');
    save.type = 'button';
    const updateSaveLabel = () => { save.textContent = isSaved() ? '保存済み' : 'あとで読む'; };
    updateSaveLabel();
    save.addEventListener('click', () => {
      const saved = readSaved();
      const index = saved.findIndex((item) => item.url === url);
      if (index >= 0) {
        saved.splice(index, 1);
      } else {
        saved.push({ title, category, url, savedAt: new Date().toISOString() });
      }
      if (writeSaved(saved)) {
        updateSaveLabel();
        track('article_save', { article_title: title, article_category: category, saved: isSaved() });
      } else {
        save.textContent = 'この端末では保存できません';
      }
    });

    const share = document.createElement('a');
    share.href = `https://x.com/intent/post?text=${encodeURIComponent(`この記事が役立ちました：${title}`)}&url=${encodeURIComponent(url)}`;
    share.target = '_blank';
    share.rel = 'noopener noreferrer';
    share.textContent = 'Xで共有';
    share.addEventListener('click', () => {
      track('article_share', { method: 'x', article_title: title, article_category: category });
    });

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'リンクをコピー';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        copy.textContent = 'コピーしました';
        track('article_copy_link', { article_title: title, article_category: category });
      } catch {
        copy.textContent = 'コピーできませんでした';
      }
      window.setTimeout(() => { copy.textContent = 'リンクをコピー'; }, 1800);
    });

    const savedLink = document.createElement('a');
    savedLink.href = '../saved.html';
    savedLink.textContent = '保存した記事を見る';
    actions.append(save, share, copy, savedLink);
    utility.append(intro, actions);
    date.after(utility);
  };

  const renderNextReads = async () => {
    const article = document.querySelector('.article-container');
    if (!article || document.querySelector('.reader-next')) return;

    try {
      const response = await fetch('data/manifest.json');
      if (!response.ok) return;
      const articles = await response.json();
      const current = articles.find((item) => item.file === articleFile());
      if (!current) return;

      const preferred = Array.isArray(current.relatedArticles) ? current.relatedArticles : [];
      const related = preferred
        .map((slug) => articles.find((item) => item.slug === slug))
        .filter(Boolean);
      const sameTheme = articles.filter((item) => (
        item.file !== current.file && item.categoryLabel === current.categoryLabel
      ));
      const choices = [...related, ...sameTheme]
        .filter((item, index, list) => list.findIndex((candidate) => candidate.file === item.file) === index)
        .slice(0, 3);
      if (!choices.length) return;

      const section = document.createElement('section');
      section.className = 'reader-next';
      const heading = document.createElement('h2');
      heading.textContent = 'このテーマを続けて読む';
      const list = document.createElement('div');
      list.className = 'reader-next-list';
      choices.forEach((item) => {
        const link = document.createElement('a');
        link.href = item.file;
        const label = document.createElement('small');
        label.textContent = item.categoryLabel || '関連記事';
        const title = document.createElement('strong');
        title.textContent = item.title;
        link.append(label, title);
        link.addEventListener('click', () => {
          track('related_article_click', { from_article: current.title, to_article: item.title, category: item.categoryLabel || '' });
        });
        list.append(link);
      });
      section.append(heading, list);
      const anchor = article.querySelector('.related-box, .affiliate-box, .soamlink-cta, .soamlink-cta-min');
      (anchor || article).before(section);
    } catch {
      // 既存本文の閲覧を妨げないため、関連記事を生成できない場合は何も表示しない。
    }
  };

  const addSavedLinkToArticleNav = () => {
    const nav = document.querySelector('.header-inner nav');
    if (!nav || nav.querySelector('[data-saved-nav]')) return;
    const link = document.createElement('a');
    link.href = '../saved.html';
    link.dataset.savedNav = 'true';
    link.textContent = '保存した記事';
    nav.append(link);
  };

  const addEditorialTracking = () => {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[data-track-event]');
      if (!link) return;
      track(link.dataset.trackEvent, {
        article_file: articleFile(),
        offer_id: link.dataset.offerId || '',
        link_label: link.dataset.trackLabel || link.textContent.trim(),
        destination: link.href
      });
    });
    document.querySelectorAll('a[href*="template"], a[download]').forEach((link) => {
      if (!link.dataset.trackEvent) link.dataset.trackEvent = 'template_click';
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderSavedPage();
    createReaderUtility();
    renderNextReads();
    addSavedLinkToArticleNav();
    addEditorialTracking();
  });
})();
