// Social links (logo marks) and the news list. Both are rendered into placeholders that exist as plain links in index.html,
// so the page still works without JavaScript. All wording comes from content.js; news wording comes from the feed, verbatim.
import { LINKS } from './content.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { getNews, newsLink, formatDate, pick, NEWS_ARCHIVE } from './news.js';

const SOCIAL = [['substack', LINKS.signal], ['bluesky', LINKS.bluesky], ['linkedin', LINKS.linkedin]];

// data-social="icons": logo marks only (aria-label carries the name). data-social="labelled": logo mark plus visible name.
export function renderSocial(lang, root = document) {
  root.querySelectorAll('[data-social]').forEach(el => {
    const labelled = el.dataset.social === 'labelled';
    const links = SOCIAL.map(([key, href]) => {
      const a = document.createElement('a');
      a.className = 'social-link'; a.href = href; a.rel = 'me noopener';
      a.setAttribute('aria-label', t(lang, `social.${key}`));
      if (!labelled) a.title = t(lang, `social.${key}`);
      a.append(icon(key));
      if (labelled) { const s = document.createElement('span'); s.textContent = t(lang, key === 'substack' ? 'social.substackText' : `social.${key}`); a.append(s); }
      return a;
    });
    el.replaceChildren(...links);
  });
}

// Signature of what is shown, so a re-render happens only when something visible changed (keeps keyboard focus otherwise).
const sig = (items, lang, n) => `${lang}|${items.slice(0, n).map(i => [i.id, i.date, pick(i.title, lang), pick(i.summary, lang), newsLink(i)].join('\u0001')).join('\u0002')}`;
function ext(a, href) { a.href = href; a.rel = 'noopener'; return a; }

// The Writing & Speaking card: heading, the three newest items, link to the full archive.
export function renderNews(lang, root = document) {
  const items = getNews();
  root.querySelectorAll('[data-news]').forEach(el => {
    const key = sig(items, lang, 3);
    if (el.dataset.sig === key) return;
    el.dataset.sig = key;
    const h = document.createElement('h3'); h.className = 'news-h'; h.textContent = t(lang, 'news.latest');
    const ul = document.createElement('ul'); ul.className = 'news-list';
    for (const it of items.slice(0, 3)) {
      const li = document.createElement('li');
      const time = document.createElement('time'); time.dateTime = it.date; time.textContent = formatDate(it.date, lang);
      const a = ext(document.createElement('a'), newsLink(it)); a.textContent = pick(it.title, lang);
      const sum = document.createElement('span'); sum.className = 'news-sum'; sum.textContent = pick(it.summary, lang);
      li.append(time, a, sum); ul.append(li);
    }
    const all = ext(document.createElement('a'), NEWS_ARCHIVE); all.className = 'news-all'; all.textContent = t(lang, 'news.all');
    el.replaceChildren(h, ul, all);
  });
}

// Footer strip: one line, "Latest:" and the newest title linking to its original source.
export function renderLatest(lang) {
  const el = document.getElementById('latest'), first = getNews()[0];
  if (!el) return;
  if (!first) { el.hidden = true; return; }
  const key = sig(getNews(), lang, 1);
  if (el.dataset.sig === key) { el.hidden = false; return; }
  el.dataset.sig = key;
  const label = document.createElement('span'); label.className = 'latest-label'; label.textContent = `${t(lang, 'news.latest')}:`;
  const a = ext(document.createElement('a'), newsLink(first)); a.textContent = pick(first.title, lang);
  el.replaceChildren(label, a); el.hidden = false;
}
