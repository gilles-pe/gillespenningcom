import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
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
const spotsEl = document.getElementById('spots');
const viewControls = document.getElementById('view-controls');
const resetBtn = document.getElementById('reset-view');
const panBtn = document.getElementById('pan-toggle');
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
  tb.setAttribute('aria-pressed', 'false'); tb.setAttribute('aria-controls', 'panel');
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

function roomNodes(id) {
  const nodes = [...document.getElementById(id).children].map(node => node.cloneNode(true));
  nodes[0].id = 'room-detail-title';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'card-x';
  close.textContent = '×';
  close.setAttribute('aria-label', t(lang, 'ui.close'));
  close.addEventListener('click', () => {
    panel.hidden = true;
    stage.focus({ preventScroll: true });
  });
  return [close, ...nodes];
}

function openRoom(id, auto = false) {
  if (mode === 'loading') { pending = id; return; }
  const wasCurrent = current === id;
  current = id;
  document.querySelectorAll('.top nav a').forEach(a => {
    const on = a.dataset.room === id;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  });
  document.querySelectorAll('.rooms article').forEach(a => {
    a.classList.toggle('current', a.dataset.room === id);
    a.style.order = a.dataset.room === id ? -1 : '';
  });
  bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.room === id));
  if (!api) {
    if (!auto) document.getElementById(id)?.scrollIntoView();
    return;
  }
  stage.classList.add('open');
  back.hidden = false;
  panel.replaceChildren(...roomNodes(id));
  panel.hidden = false;
  api.open(id, { keepView: auto && wasCurrent });
  // Header navigation should make the scene reachable on a vertically stacked page.
  if (!auto && mobile() && stage.getBoundingClientRect().top > window.innerHeight) {
    stage.scrollIntoView({ block: 'start', behavior: reduced ? 'instant' : 'smooth' });
  }
}
function closeRoom() {
  current = null;
  const restoreFocus = document.activeElement === back || panel.contains(document.activeElement);
  stage.classList.remove('open'); panel.hidden = true; back.hidden = true;
  panel.replaceChildren();
  bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', false));
  document.querySelectorAll('.top nav a').forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
  api?.open(null);
  if (restoreFocus) stage.focus({ preventScroll: true });
}
// Desktop: clicking a room zooms/re-centers into that room (All rooms button on the right exits). Mobile: second tap toggles out.
const toggleRoom = id => (current === id && mobile() ? closeRoom() : openRoom(id));
// A tap on the canvas: id is the room under the pointer, or null.
function tapCanvas(id) {
  if (!current) { if (id) openRoom(id); return; }
  if (id === current) { if (mobile() && !api?.isCustom?.()) closeRoom(); }
  else if (id) openRoom(id);
  else if (mobile() && !api?.isCustom?.()) closeRoom();
}
back.addEventListener('click', closeRoom);
panBtn.addEventListener('click', () => {
  if (!api) return;
  const on = api.setPanMode(!api.getPanMode());
  panBtn.setAttribute('aria-pressed', String(on));
  stage.focus({ preventScroll: true });
});
resetBtn.addEventListener('click', () => { api?.reset(); stage.focus({ preventScroll: true }); });
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (api?.closeNote?.()) return;
  if (current) { closeRoom(); return; }
  if (api?.isCustom?.()) api.reset();
});
// Links to the room texts (#projects, #about ...) open the room in the model; without 3D they scroll to the section.
document.addEventListener('click', e => {
  const a = e.target.closest?.('a[href^="#"]');
  if (!a || mode === 'static' || (a.getAttribute('href').length < 2)) return;
  const h = a.getAttribute('href').slice(1);
  if (ORDER.includes(h)) { e.preventDefault(); openRoom(h); }
});

// Language switch: static text, room names, 3D lettering and room details.
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
  viewControls.hidden = true; bar.hidden = true;
  if (pending) { const id = pending; pending = null; openRoom(id); }
}

// Text and links are usable before the 3D code arrives.
import('./viewer.js').then(({ startViewer }) => {
  api = startViewer({ canvas, stage, labels, spotsEl, reduced, lang, onPick: tapCanvas,
    onAway: away => { const had = resetBtn === document.activeElement; resetBtn.hidden = !away; if (had && !away) stage.focus({ preventScroll: true }); } });
  if (!api) return useStatic();
  viewControls.hidden = false;
  // The model is keyboard-operable: arrows turn it, plus and minus zoom, Home resets (see viewer.js).
  stage.tabIndex = 0; stage.setAttribute('role', 'application');
  stage.closest('.hero').classList.add('hero--rendered');
  if (import.meta.env.DEV) window.__gp = api.debug;
  mode = '3d';
  if (pending) { const id = pending; pending = null; openRoom(id); }
}).catch(useStatic);
