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
const dock = document.getElementById('dock');
const spotsEl = document.getElementById('spots');
const resetBtn = document.createElement('button');   // appears only after the model was turned, panned or zoomed away from the default
resetBtn.type = 'button'; resetBtn.className = 'reset'; resetBtn.hidden = true;
const panBtn = document.createElement('button');
panBtn.type = 'button'; panBtn.className = 'pan-toggle'; panBtn.setAttribute('aria-pressed', 'false');
stage.append(panBtn, resetBtn);
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
function roomNodes(id, { compact = false } = {}) {
  if (compact && id === 'projects') {
    const h = document.createElement('h2'); h.textContent = t(lang, 'rooms.projects.h');
    const p = document.createElement('p'); p.textContent = t(lang, 'rooms.projects.cardHint');
    return [h, p];
  }
  return [...document.getElementById(id).children].map(n => clean(n.cloneNode(true)));
}
function panelCloseBtn() {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'card-x'; b.textContent = '×';
  b.setAttribute('aria-label', t(lang, 'ui.close'));
  b.addEventListener('click', () => { panel.hidden = true; canvas.focus({ preventScroll: true }); });
  return b;
}
function showSpeaking() {
  const host = mobile() ? dock : panel, part = host.querySelector('.speaking-part');
  if (!part) return;
  part.scrollIntoView({ block: mobile() ? 'nearest' : 'start', behavior: reduced ? 'auto' : 'smooth' });
  part.querySelector('h3').focus({ preventScroll: true });
}

function openRoom(id, auto = false, { speaking = false } = {}) {
  if (mode === 'loading') { pending = { id, speaking }; return; }
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
    if (!auto) document.getElementById(speaking && document.getElementById('speaking') ? 'speaking' : id)?.scrollIntoView();
    return;
  }
  stage.classList.add('open'); back.hidden = false;
  if (id === 'ai') {
    panel.replaceChildren();
    panel.hidden = true;
  } else {
    panel.replaceChildren(panelCloseBtn(), ...roomNodes(id, { compact: true }));
    // The card scrolls inside: make it a named, keyboard-focusable region so the keyboard can scroll it in every browser.
    panel.tabIndex = 0; panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', name(id));
    panel.hidden = false; panel.scrollTop = 0;   // reset after un-hiding: a hidden element keeps its old scroll position
  }
  // Phone: the room's content sits in the dock under the model; skip off-screen live-region mutations on desktop.
  if (mobile()) {
    const all = document.createElement('button');
    all.type = 'button'; all.className = 'allrooms'; all.textContent = t(lang, 'ui.allRooms');
    all.addEventListener('click', () => { closeRoom(); bar.querySelector('button')?.focus({ preventScroll: true }); });
    dock.replaceChildren(all, ...roomNodes(id));
    dock.hidden = false;
  } else {
    dock.hidden = true;
    dock.replaceChildren();
  }
  if (mobile() && !auto) stage.scrollIntoView({ block: 'start' });
  api.open(id, { keepView: auto && wasCurrent });
  if (speaking) showSpeaking();
}
function closeRoom() {
  current = null;
  stage.classList.remove('open'); panel.hidden = true; back.hidden = true; dock.hidden = true;
  dock.replaceChildren();
  bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', false));
  document.querySelectorAll('.top nav a').forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
  api?.open(null);
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
  canvas.focus({ preventScroll: true });
});
resetBtn.addEventListener('click', () => { api?.reset(); canvas.focus({ preventScroll: true }); });
matchMedia('(max-width: 800px)').addEventListener('change', () => { if (current) openRoom(current, true); });
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

// Language switch: static text, room names, 3D lettering, and the open room's panel and dock.
// Social links and news are rendered into every placeholder on the page (source sections, footer, open card).
function renderAll() { renderSocial(lang); renderNews(lang); renderLatest(lang); }
onNews(renderAll);
const langBtns = [...document.querySelectorAll('#lang button')];
function setLang(next, { save = true } = {}) {
  if (!LANGS.includes(next)) return;
  lang = next;
  applyStatic(lang);
  resetBtn.textContent = t(lang, 'ui.resetView');
  panBtn.textContent = t(lang, 'ui.panMode');
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

// Text and links are usable before the 3D code arrives.
import('./viewer.js').then(({ startViewer }) => {
  api = startViewer({ canvas, stage, labels, spotsEl, reduced, lang, onPick: tapCanvas,
    onAway: away => { const had = resetBtn === document.activeElement; resetBtn.hidden = !away; if (had && !away) canvas.focus({ preventScroll: true }); } });
  if (!api) return useStatic();
  // The model is keyboard-operable: arrows turn it, plus and minus zoom, Home resets (see viewer.js).
  canvas.removeAttribute('aria-hidden'); canvas.tabIndex = 0; canvas.setAttribute('role', 'application');
  if (import.meta.env.DEV) window.__gp = api.debug;
  mode = '3d';
  if (pending) { const p = pending; pending = null; openRoom(p.id, false, p); }
}).catch(useStatic);
