// SOAM Media の利用者向け正規公開先。GitHub Pages はソース確認用の配信先です。
export const SITE_ORIGIN = 'https://media.soam-creative.com';

export const canonicalUrl = (pathname = '') => {
  const normalized = pathname.replace(/^\/+/, '');
  return normalized ? `${SITE_ORIGIN}/${normalized}` : `${SITE_ORIGIN}/`;
};

export const jsonForScript = (value) => JSON.stringify(value)
  .replaceAll('<', '\\u003c')
  .replaceAll('>', '\\u003e')
  .replaceAll('&', '\\u0026');

export const articleStructuredData = ({ title, description, file, publishedAt, updatedAt }) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': canonicalUrl(`articles/${file}`)
  },
  headline: title,
  description,
  datePublished: `${publishedAt}T00:00:00+09:00`,
  dateModified: `${updatedAt || publishedAt}T00:00:00+09:00`,
  isAccessibleForFree: true,
  publisher: {
    '@type': 'Organization',
    name: 'SOAM MEDIA'
  }
});
