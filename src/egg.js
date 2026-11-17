// Hidden easter egg: the fax machine in the cellar on the underside of the model (see DESIGN.md, "Model layout").
// It is not in the HTML, not in the tab order and never announced. The note exists in the DOM only after the machine was clicked.
import * as THREE from 'three';
import { t } from './i18n.js';
import { LINKS } from './content.js';

const FEED_MS = 1200, SHAKE_MS = 600;
const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

export function createEgg({ cellar, camera, stage, canvas, reduced, lang }) {
  const parts = new Set(cellar.pick), things = [...cellar.pick, ...cellar.occluders];
  const ray = new THREE.Raycaster(), v = new THREE.Vector3(), dir = new THREE.Vector3();
  let opened = false, curLang = lang, note = null, text = null, link = null, closeBtn = null, anim = null, away = false;

  // True when the machine is the first thing a ray meets, so it is only found from the side it can be seen from.
  const hit = r => { const h = r.intersectObjects(things, false)[0]; return !!h && parts.has(h.object); };

  function build() {
    note = document.createElement('div');
    note.className = 'egg'; note.setAttribute('role', 'region');
    text = document.createElement('p');
    const row = document.createElement('div'); row.className = 'egg-actions';
    link = document.createElement('a'); link.className = 'egg-link'; link.href = LINKS.linkedin; link.rel = 'noopener';
    closeBtn = document.createElement('button');
    closeBtn.type = 'button'; closeBtn.className = 'egg-close';
    closeBtn.addEventListener('click', () => close(true));
    row.append(link, closeBtn);
    note.append(text, row); stage.append(note); label();
  }
  function label() {
    if (!note) return;
    note.setAttribute('aria-label', t(curLang, 'model.egg.label'));
    text.textContent = t(curLang, 'model.egg.note');
    link.textContent = t(curLang, 'model.egg.cta');
    closeBtn.textContent = t(curLang, 'model.egg.close');
  }
  function show() {
    if (!note) build();
    if (opened) return;
    opened = true; note.hidden = false; note.classList.remove('closed');
    closeBtn.focus({ preventScroll: true });
  }
  function close(restoreFocus = false) {
    anim = null; cellar.shake(0, 0, 0); cellar.feed(0);
    if (!note || !opened) return;
    opened = false;
    const had = note.contains(document.activeElement);
    note.hidden = true; note.classList.add('closed');
    if (had || restoreFocus) canvas.focus({ preventScroll: true });
  }

  return {
    // `ndc` is the pointer position in normalised device coordinates.
    hit(ndc) { ray.setFromCamera(ndc, camera); return hit(ray); },
    play() {
      cellar.feed(0);
      if (reduced) { cellar.feed(1); cellar.shake(0, 0, 0); anim = null; show(); return; }
      anim = { t0: performance.now() };
    },
    close,
    get isOpen() { return !!note && !note.hidden; },
    setLanguage(l) { curLang = l; label(); },
    // Called every frame: animation, and the note following the machine on screen.
    update(now, w, h) {
      if (anim) {
        const e = now - anim.t0, p = ease(Math.min(Math.max((e - 150) / (FEED_MS - 150), 0), 1));
        const k = Math.max(0, 1 - e / SHAKE_MS) ** 1.5, ph = e * 0.07;
        cellar.shake(Math.sin(ph) * 0.006 * k, Math.sin(ph * 1.3 + 1) * 0.004 * k, Math.sin(ph * 0.9 + 2) * 0.012 * k);
        cellar.feed(p);
        if (e >= FEED_MS) { cellar.shake(0, 0, 0); cellar.feed(1); anim = null; show(); }
      }
      if (!note || note.hidden) return;
      cellar.anchor.getWorldPosition(v); const target = v.clone();
      v.project(camera);
      const px = (v.x * 0.5 + 0.5) * w, py = (-v.y * 0.5 + 0.5) * h;
      // Hidden again when the machine is turned out of sight (seen from above, from the side).
      dir.copy(target).sub(camera.position).normalize(); ray.set(camera.position, dir);
      const gone = !hit(ray) || Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || v.z > 1;
      if (gone !== away) { away = gone; note.classList.toggle('away', gone); note.inert = gone; }
    },
  };
}
