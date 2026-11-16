// News from the AI in Medicine Monitor (owner-approved feed).
// The page renders from the bundled snapshot (src/news-snapshot.json) at once, then tries the live feed once.
// Any failure (offline, blocked, timeout, wrong shape) keeps the snapshot silently. Titles and summaries are shown verbatim.
import snapshot from './news-snapshot.json';

export const NEWS_FEED = 'https://ai.gillespenning.com/data/news.json';
export const NEWS_ARCHIVE = 'https://ai.gillespenning.com/news/';
const PERMALINK = id => `https://ai.gillespenning.com/news/#${encodeURIComponent(id)}`;
const TIMEOUT_MS = 4000;

const str = v => typeof v === 'string' && v.trim() !== '';
const https = u => str(u) && /^https:\/\//i.test(u);

// Returns a clean list from a feed object, or null when the shape is not usable.
// Unapproved or malformed items are dropped; the list is sorted newest first. Used for the snapshot and the live feed.
export function normalise(data) {
  if (!data || !Array.isArray(data.items)) return null;
  const items = [];
  for (const i of data.items) {
    if (!i || i.approved !== true) continue;
    if (!str(i.id) || !str(i.date) || !/^\d{4}-\d{2}-\d{2}/.test(i.date)) continue;
    if (!(str(i.title?.en) || str(i.title?.de))) continue;
    items.push({
      id: i.id, date: i.date.slice(0, 10),
      title: { en: i.title.en, de: i.title.de }, summary: { en: i.summary?.en, de: i.summary?.de },
      sources: (Array.isArray(i.sources) ? i.sources : []).filter(s => https(s?.url)).map(s => ({ platform: String(s.platform ?? ''), url: s.url })),
    });
  }
  if (!items.length) return null;
  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

let items = normalise({ items: snapshot.items.map(i => ({ ...i, approved: true })) }) ?? [];
const listeners = new Set();
export const getNews = () => items;
export const onNews = fn => { listeners.add(fn); };

// Fetch the live feed once. Resolves quietly in every case.
export async function refreshNews() {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(NEWS_FEED, { credentials: 'omit', signal: ctl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) return;
    const live = normalise(await res.json());
    if (!live) return;
    items = live;
    listeners.forEach(fn => { try { fn(items); } catch { /* ignore */ } });
  } catch { /* offline, blocked, timeout or bad JSON: keep the snapshot */ } finally { clearTimeout(timer); }
}

// Wording in the current language; falls back to the other language only if one is missing.
export const pick = (obj, lang) => (str(obj?.[lang]) ? obj[lang] : (obj?.en ?? obj?.de ?? ''));
export function newsLink(item) {
  const s = item.sources.find(x => x.platform === 'substack') ?? item.sources[0];
  return s ? s.url : PERMALINK(item.id);
}
export function formatDate(date, lang) {
  try { return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)); }
  catch { return date; }
}
