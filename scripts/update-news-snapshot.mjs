// Regenerates src/news-snapshot.json from the AI in Medicine Monitor news feed.
// Usage:  node scripts/update-news-snapshot.mjs [path-or-url] [output]
//   path-or-url  a local news.json or an https URL (default: https://ai.gillespenning.com/data/news.json)
//   output       default: src/news-snapshot.json
// Keeps only approved items, newest first, and only the fields the page shows: id, date, title, summary, sources.
// Titles and summaries are copied verbatim. Nothing is rewritten.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const src = process.argv[2] || 'https://ai.gillespenning.com/data/news.json';
const out = process.argv[3] || fileURLToPath(new URL('../src/news-snapshot.json', import.meta.url));

const raw = /^https?:\/\//.test(src) ? await (async () => {
  const res = await fetch(src, { credentials: 'omit' });
  if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
  return res.text();
})() : await readFile(src, 'utf8');

const data = JSON.parse(raw);
if (!Array.isArray(data?.items)) throw new Error('Unexpected shape: no "items" array');
const str = v => typeof v === 'string' && v.trim() !== '';
const items = data.items
  .filter(i => i && i.approved === true && str(i.id) && str(i.date) && str(i.title?.en) && str(i.title?.de) && str(i.summary?.en) && str(i.summary?.de))
  .map(i => ({
    id: i.id, date: i.date,
    title: { en: i.title.en, de: i.title.de },
    summary: { en: i.summary.en, de: i.summary.de },
    sources: (Array.isArray(i.sources) ? i.sources : []).filter(s => str(s?.url) && /^https:\/\//.test(s.url)).map(s => ({ platform: String(s.platform ?? ''), url: s.url })),
  }))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
if (!items.length) throw new Error('No approved items found; snapshot not written');

await writeFile(out, JSON.stringify({ items }, null, 2) + '\n');
console.log(`Wrote ${items.length} approved items to ${out}`);
