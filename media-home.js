document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('.media-menu-button');
  const nav = document.querySelector('.media-nav');
  if (!button || !nav) return;
  button.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', () => {
    nav.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
  });
});
