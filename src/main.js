import '@fontsource-variable/newsreader';
import './style.css';

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
const NAMES = { projects: 'Projects', about: 'About Me', ai: 'AI & Digital Health', writing: 'Writing & Speaking' };

let api = null;          // set once the 3D scene is running
let current = null;

// Labels are real buttons, so the rooms work with keyboard and without WebGL.
const labels = {};
for (const id of ORDER) {
  const b = document.createElement('button');
  b.className = 'label'; b.textContent = NAMES[id]; b.dataset.room = id;
  b.addEventListener('click', () => openRoom(id));
  b.addEventListener('focus', () => api?.hover(id));
  b.addEventListener('blur', () => api?.hover(null));
  labelsEl.append(b); labels[id] = b;
  const t = document.createElement('button');
  t.textContent = NAMES[id]; t.dataset.room = id;
  t.addEventListener('click', () => openRoom(id));
  bar.append(t);
}

function openRoom(id, auto = false) {
  current = id;
  document.querySelectorAll('.top nav a').forEach(a => a.classList.toggle('active', a.dataset.room === id));
  document.querySelectorAll('.rooms article').forEach(a => {
    a.classList.toggle('current', a.dataset.room === id);
    a.style.order = a.dataset.room === id ? -1 : '';
  });
  bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.room === id));
  const article = document.getElementById(id);
  if (!api) { if (!auto) article.scrollIntoView(); return; }
  stage.classList.add('open'); back.hidden = false;
  panel.replaceChildren(...[...article.children].filter(n => !n.matches('.links')).map(n => n.cloneNode(true)));
  panel.hidden = false;
  // Phone: the room's text and links sit under the model, with a way back to the overview.
  const all = document.createElement('button');
  all.type = 'button'; all.className = 'allrooms'; all.textContent = '← All rooms';
  all.addEventListener('click', closeRoom);
  dock.replaceChildren(all, ...[...article.children].map(n => n.cloneNode(true)));
  dock.hidden = false;
  if (mobile() && !auto) { all.focus({ preventScroll: true }); stage.scrollIntoView({ block: 'start' }); }
  api.open(id);
}
function closeRoom() {
  const was = current; current = null;
  stage.classList.remove('open'); panel.hidden = true; back.hidden = true; dock.hidden = true;
  if (mobile() && was) bar.querySelector(`[data-room=${was}]`)?.focus({ preventScroll: true });
  bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', false));
  document.querySelectorAll('.top nav a').forEach(a => a.classList.remove('active'));
  api?.open(null);
}
back.addEventListener('click', closeRoom);
addEventListener('keydown', e => { if (e.key === 'Escape' && current) closeRoom(); });
document.querySelectorAll('a[data-room]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault(); stage.scrollIntoView({ block: 'nearest' }); openRoom(a.dataset.room);
}));

function useStatic() {
  canvas.hidden = true; stage.querySelector('.fallback').hidden = false; stage.classList.add('static');
}

// Any interaction cancels the one-off automatic tour.
let autoTimer = null;
const cancelAuto = () => { clearTimeout(autoTimer); autoTimer = null; };
['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(t => addEventListener(t, cancelAuto, { passive: true, capture: true }));
stage.addEventListener('pointermove', cancelAuto, { passive: true });

// Text and links are usable before the 3D code arrives.
import('./viewer.js').then(({ startViewer }) => {
  api = startViewer({ canvas, stage, labels, spotsEl, reduced, onPick: openRoom });
  if (!api) return useStatic();
  if (!reduced && !mobile()) autoTimer = setTimeout(() => { if (!current) openRoom('ai', true); }, 4000);
}).catch(useStatic);
