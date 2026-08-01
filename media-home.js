document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('.media-menu-button');
  const nav = document.querySelector('.media-nav');
  if (button && nav) {
    button.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', () => {
      nav.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-track-event]');
    if (!link || typeof window.gtag !== 'function') return;
    window.gtag('event', link.dataset.trackEvent, {
      link_label: link.textContent.trim(),
      destination: link.href
    });
  });
});
