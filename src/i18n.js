// Language handling: which language is active, and swapping the text of the static page.
// Text lives in content.js. The static HTML is complete English; German replaces it by data-i18n keys.
import content from './content.js';

export const LANGS = ['en', 'de'];
const KEY = 'gp-lang';

export const t = (lang, path) => path.split('.').reduce((o, k) => o?.[k], content[lang]);

export function initialLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
  } catch { /* ignore */ }
  try {
    const s = localStorage.getItem(KEY);
    if (LANGS.includes(s)) return s;
  } catch { /* storage may be blocked */ }
  return 'en';   // never chosen from the browser language
}

export function rememberLang(lang) {
  try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
  try {
    const u = new URL(location.href);
    if (u.searchParams.has('lang')) { u.searchParams.set('lang', lang); history.replaceState(null, '', u); }
  } catch { /* ignore */ }
}

// Swap all text marked with data-i18n (text), data-i18n-html (text with links) and data-i18n-attr ("attr:key;attr:key").
export function applyStatic(lang) {
  document.documentElement.lang = lang;
  const title = t(lang, 'meta.title');
  const description = t(lang, 'meta.description');
  const pageUrl = lang === 'de' ? 'https://gillespenning.com/?lang=de' : 'https://gillespenning.com/';
  document.title = title;
  document.querySelector('meta[name=description]')?.setAttribute('content', description);
  document.querySelector('link[rel=canonical]')?.setAttribute('href', pageUrl);
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', pageUrl);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content', lang === 'de' ? 'de_DE' : 'en_US');
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(lang, el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(lang, el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    for (const pair of el.dataset.i18nAttr.split(';')) { const [attr, key] = pair.split(':'); el.setAttribute(attr, t(lang, key)); }
  });
}
