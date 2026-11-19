// Hidden easter egg: the fax machine in the cellar on the underside of the model (see DESIGN.md, "Model layout").
// It is not in the HTML, not in the tab order and never announced. Everything happens on the machine itself:
// the sheet comes out slowly and carries the text and the "Send me a message" button as a canvas texture.
// The first click on the machine is handled by viewer.js (it frames the machine); the second one calls play().
import * as THREE from 'three';
import { LINKS } from './content.js';
import { openExternal } from './external-links.js';

const FEED_MS = 7000, START_MS = 400;
const ease = u => u * u * (3 - 2 * u);

export function createEgg({ cellar, camera, reduced, onDone }) {
  const parts = new Set(cellar.pick), things = [...cellar.pick, ...cellar.occluders];
  const ray = new THREE.Raycaster();
  let anim = null, done = false;

  // What is the first thing a ray meets? 'button' (printed on the finished sheet), 'machine' or null.
  // Only found from the side the machine can be seen from, because the base occludes it from everywhere else.
  function pick(ndc) {
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(things, false)[0];
    if (!h || !parts.has(h.object)) return null;
    if (done && h.object === cellar.sheet && h.uv) {
      const b = cellar.button();
      if (h.uv.x >= b.u0 && h.uv.x <= b.u1 && h.uv.y >= b.v0 && h.uv.y <= b.v1) return 'button';
    }
    return 'machine';
  }

  function close() {
    anim = null; done = false;
    cellar.shake(0, 0, 0); cellar.feed(0);
  }

  return {
    pick,
    hit: ndc => pick(ndc) !== null,
    send: () => openExternal(LINKS.linkedin),
    play() {
      if (anim || done) return;
      cellar.feed(0);
      if (reduced) { cellar.feed(1); cellar.shake(0, 0, 0); done = true; onDone?.(); return; }
      anim = { t0: performance.now() };
    },
    close,
    get isOpen() { return done || !!anim; },
    get isAnimating() { return !!anim; },
    // Called every frame. The sheet leaves the slot slowly; a short jolt at the start, then a faint printer rattle.
    update(now) {
      if (!anim) return;
      const e = now - anim.t0, u = Math.min(Math.max((e - START_MS) / (FEED_MS - START_MS), 0), 1);
      const jolt = Math.max(0, 1 - e / 600) ** 1.5, run = e > START_MS ? 1 - u : 0, ph = e * 0.07;
      cellar.shake(
        Math.sin(ph) * (0.006 * jolt + 0.0012 * run),
        Math.sin(ph * 1.3 + 1) * (0.004 * jolt + 0.0008 * run),
        Math.sin(ph * 0.9 + 2) * (0.012 * jolt + 0.0025 * run));
      cellar.feed(ease(u));
      if (e >= FEED_MS) { cellar.shake(0, 0, 0); cellar.feed(1); anim = null; done = true; onDone?.(); }
    },
  };
}
