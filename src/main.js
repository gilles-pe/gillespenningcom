import '@fontsource-variable/newsreader';
import './style.css';

const stage = document.getElementById('stage');
const canvas = document.getElementById('scene');
const labelsEl = document.getElementById('labels');
const panel = document.getElementById('panel');
const back = document.getElementById('back');
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
}

function openRoom(id, auto = false) {
  current = id;
  document.querySelectorAll('.top nav a').forEach(a => a.classList.toggle('active', a.dataset.room === id));
  document.querySelectorAll('.rooms article').forEach(a => {
    a.classList.toggle('current', a.dataset.room === id);
    a.style.order = a.dataset.room === id ? -1 : '';
  });
  const article = document.getElementById(id);
  if (api && !mobile()) {
    stage.classList.add('open');
    panel.innerHTML = article.innerHTML; panel.hidden = false; back.hidden = false;
    api.open(id);
    if (!auto) back.focus({ preventScroll: true });
  } else {
    api?.open(id);
    if (!auto) article.scrollIntoView({ block: api ? 'nearest' : 'start' });
  }
}
function closeRoom() {
  const was = current; current = null;
  stage.classList.remove('open'); panel.hidden = true; back.hidden = true;
  document.querySelectorAll('.top nav a').forEach(a => a.classList.remove('active'));
  api?.open(null);
  if (was) labels[was].focus({ preventScroll: true });
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
  api = startViewer({ canvas, stage, labels, reduced, onPick: openRoom });
  if (!api) return useStatic();
  if (!reduced) autoTimer = setTimeout(() => { if (!current) openRoom('ai', true); }, 4000);
}).catch(useStatic);
