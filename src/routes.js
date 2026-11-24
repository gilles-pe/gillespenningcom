import substackData from './data/substack-articles.json';

export const ROOMS = ['projects', 'about', 'ai', 'writing'];
const PROJECTS = new Set(['wimmelbild', 'monitor', 'praxisfaden', 'hdrg', 'elbstrand']);

export function articleSlug(article) {
  const parts = String(article?.href || '').split('/').filter(Boolean);
  return (parts[parts.length - 1] || article?.key || '').toLowerCase();
}

export function resolveRoute(rawHash) {
  if (!rawHash) return null;
  let clean;
  try { clean = decodeURIComponent(String(rawHash).replace(/^#/, '')).trim().toLowerCase(); }
  catch { return null; }
  if (!clean) return null;

  if (ROOMS.includes(clean)) return { room: clean, focus: null, hash: clean };
  if (clean === 'enterprise' || clean === 'globe') return { room: 'about', focus: clean, hash: clean };
  if (PROJECTS.has(clean)) return { room: 'projects', focus: clean, hash: clean };
  if (clean === 'docease') return { room: 'projects', focus: 'praxisfaden', hash: 'praxisfaden' };

  const articles = substackData.articles;
  if (clean === 'latest-article' || clean === 'articles') {
    const first = articles[0];
    if (first) return { room: 'writing', focus: first.key, hash: 'article/' + articleSlug(first) };
  }
  if (clean.startsWith('article/')) {
    const part = clean.slice('article/'.length).replace(/\/+$/, '');
    if (/^[1-9]\d*$/.test(part)) {
      const a = articles[Number(part) - 1];
      if (a) return { room: 'writing', focus: a.key, hash: 'article/' + articleSlug(a) };
    } else {
      const a = articles.find(item => articleSlug(item) === part || item.key.toLowerCase() === part);
      if (a) return { room: 'writing', focus: a.key, hash: 'article/' + articleSlug(a) };
    }
    return { room: 'writing', focus: null, hash: 'writing' };
  }
  return null;
}

export function hashForView(room, focusKey) {
  if (!room) return null;
  if (room === 'about' && (focusKey === 'enterprise' || focusKey === 'globe')) return focusKey;
  if (room === 'projects' && PROJECTS.has(focusKey)) return focusKey;
  if (room === 'writing' && focusKey) {
    const article = substackData.articles.find(item => item.key === focusKey);
    if (article) return 'article/' + articleSlug(article);
  }
  return room;
}
