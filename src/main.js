import '@fontsource-variable/newsreader';
import './style.css';
import { t, initialLang, rememberLang, applyStatic, LANGS } from './i18n.js';
import { renderSocial, renderNews, renderLatest } from './widgets.js';
import { onNews, refreshNews } from './news.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('scene');
const labelsEl = document.getElementById('labels');
const panel = document.getElementById('panel');
const back = document.getElementById('back');
const bar = document.getElementById('bar');
const dock = document.getElementById('dock');
const spotsEl = document.getElementById('spots');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => matchMedia('(max-width: 800px)').matches;
const ORDER = ['projects', 'about', 'ai', 'writing'];
let lang = initialLang();
const name = id => t(lang, `nav.${id}`);

let api = null;          // set once the 3D scene is running
let current = null;

// Labels are real buttons, so the rooms work with keyboard and without WebGL.
const labels = {};
for (const id of ORDER) {
  const b = document.createElement('button');
  b.className = 'label'; b.textContent = name(id); b.dataset.room = id;
  b.addEventListener('click', () => toggleRoom(id));
  b.addEventListener('focus', () => api?.hover(id));
  b.addEventListener('blur', () => api?.hover(null));
  labelsEl.append(b); labels[id] = b;
  const tb = document.createElement('button');
  tb.textContent = name(id); tb.dataset.room = id;
  tb.addEventListener('click', () => toggleRoom(id));
  bar.append(tb);
}

// The room texts live in the page as ordinary English sections (#source). With the 3D model running they are hidden
// and the card is filled from them. Without 3D (or JavaScript) the sections stay visible.
const html = document.documentElement;
const source = document.getElementById('source');
source.hidden = true;
let mode = 'loading';    // 'loading' | '3d' | 'static'
let pending = null;

const clean = n => { n.removeAttribute?.('id'); n.querySelectorAll?.('[id]').forEach(e => e.removeAttribute('id')); return n; };
function roomNodes(id) {
  const nodes = [...document.getElementById(id).children].map(n => clean(n.cloneNode(true)));
  if (id === 'writing') {
    const sp = document.getElementById('speaking');
    const part = document.createElement('section');
    const h = document.createElement('h3');
    h.textContent = sp.querySelector('h2').textContent; h.tabIndex = -1;
    part.className = 'speaking-part'; part.setAttribute('aria-label', h.textContent);
    part.append(h, clean(sp.querySelector('.speaking-body').cloneNode(true)));
    nodes.push(part);
  }
  return nodes;
}
function showSpeaking() {
  const host = mobile() ? dock : panel, part = host.querySelector('.speaking-part');
  if (!part) return;
  part.scrollIntoView({ block: mobile() ? 'nearest' : 'start', behavior: reduced ? 'auto' : 'smooth' });
  part.querySelector('h3').focus({ preventScroll: true });
}

function openRoom(id, auto = false, { speaking = false } = {}) {
  if (mode === 'loading') { pending = { id, speaking }; return; }
  current = id;
  document.querySelectorAll('.top nav a').forEach(a => a.classList.toggle('active', a.dataset.room === id));
  document.querySelectorAll('.rooms article').forEach(a => {
    a.classList.toggle('current', a.dataset.room === id);
    a.style.order = a.dataset.room === id ? -1 : '';
  });
  bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.room === id));
  if (!api) { if (!auto) document.getElementById(speaking ? 'speaking' : id).scrollIntoView(); return; }
  stage.classList.add('open'); back.hidden = false;
  panel.replaceChildren(...roomNodes(id));
  // The card scrolls inside: make it a named, keyboard-focusable region so the keyboard can scroll it in every browser.
  panel.tabIndex = 0; panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', name(id));
  panel.hidden = false; panel.scrollTop = 0;   // reset after un-hiding: a hidden element keeps its old scroll position
  // Phone: the room's content sits in the dock under the model; the room bar stays visible.
  const all = document.createElement('button');
  all.type = 'button'; all.className = 'allrooms'; all.textContent = t(lang, 'ui.allRooms');
  all.addEventListener('click', () => { closeRoom(); bar.querySelector('button')?.focus({ preventScroll: true }); });
  dock.replaceChildren(all, ...roomNodes(id));
  dock.hidden = false;
  if (mobile() && !auto) stage.scrollIntoView({ block: 'start' });
  api.open(id);
  if (speaking) showSpeaking();
}
function closeRoom() {
  current = null;
  stage.classList.remove('open'); panel.hidden = true; back.hidden = true; dock.hidden = true;
  bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', false));
  document.querySelectorAll('.top nav a').forEach(a => a.classList.remove('active'));
  api?.open(null);
}
// First tap opens, second tap on the same room closes. Tapping another room switches.
const toggleRoom = id => (current === id ? closeRoom() : openRoom(id));
// A tap on the canvas: id is the room under the pointer, or null.
function tapCanvas(id) {
  if (!current) { if (id) openRoom(id); return; }
  if (id === current) closeRoom();
  else if (id) openRoom(id);
  else if (mobile()) closeRoom();
}
back.addEventListener('click', closeRoom);
addEventListener('keydown', e => { if (e.key === 'Escape' && current) closeRoom(); });
// Links to the room texts (#projects, #speaking ...) open the room in the model; without 3D they scroll to the section.
document.addEventListener('click', e => {
  const a = e.target.closest?.('a[href^="#"]');
  if (!a || mode === 'static' || (a.getAttribute('href').length < 2)) return;
  const h = a.getAttribute('href').slice(1);
  if (h === 'speaking') { e.preventDefault(); openRoom('writing', false, { speaking: true }); }
  else if (ORDER.includes(h)) { e.preventDefault(); openRoom(h); }
});

// Language switch: static text, room names, 3D lettering, and the open room's panel and dock.
// Social links and news are rendered into every placeholder on the page (source sections, footer, open card).
function renderAll() { renderSocial(lang); renderNews(lang); renderLatest(lang); }
onNews(renderAll);
const langBtns = [...document.querySelectorAll('#lang button')];
function setLang(next, { save = true } = {}) {
  if (!LANGS.includes(next)) return;
  lang = next;
  applyStatic(lang);
  renderAll();
  langBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
  for (const id of ORDER) { labels[id].textContent = name(id); bar.querySelector(`[data-room="${id}"]`).textContent = name(id); }
  api?.setLanguage(lang);
  if (current) openRoom(current, true);
  if (save) rememberLang(lang);
}
langBtns.forEach(b => b.addEventListener('click', () => { if (b.dataset.lang !== lang) setLang(b.dataset.lang); }));
setLang(lang, { save: false });
refreshNews();   // snapshot is already on screen; the live feed replaces it if it arrives and is valid

function useStatic() {
  mode = 'static'; html.classList.remove('js'); html.classList.add('static'); source.hidden = false;
  canvas.hidden = true; stage.querySelector('.fallback').hidden = false; stage.classList.add('static');
  if (pending) { const p = pending; pending = null; openRoom(p.id, false, p); }
}

// Any interaction cancels the one-off automatic tour.
let autoTimer = null;
const cancelAuto = () => { clearTimeout(autoTimer); autoTimer = null; };
['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(t => addEventListener(t, cancelAuto, { passive: true, capture: true }));
stage.addEventListener('pointermove', cancelAuto, { passive: true });

// Text and links are usable before the 3D code arrives.
import('./viewer.js').then(({ startViewer }) => {
  api = startViewer({ canvas, stage, labels, spotsEl, reduced, lang, onPick: tapCanvas });
  if (!api) return useStatic();
  mode = '3d';
  if (pending) { const p = pending; pending = null; openRoom(p.id, false, p); }
  if (!reduced && !mobile()) autoTimer = setTimeout(() => { if (!current) openRoom('ai', true); }, 4000);
}).catch(useStatic);
