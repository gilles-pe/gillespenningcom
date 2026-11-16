import * as THREE from 'three';
import { buildScene, setModelLanguage, HOTSPOTS } from './scene.js';
import { t } from './i18n.js';
import { createEgg } from './egg.js';

export function startViewer({ canvas, stage, labels, spotsEl, reduced, lang, onPick, onAway }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;

  setModelLanguage(lang);
  const { scene, rooms, outline, center, cellar, occluders } = buildScene();
  // Default light rig, only if the scene does not bring its own (room point lights do not count).
  let sceneLit = false;
  scene.traverse(o => { if (o.isHemisphereLight || o.isDirectionalLight || o.isAmbientLight || o.isSpotLight || o.isRectAreaLight) sceneLit = true; });
  if (!sceneLit) {
    scene.add(new THREE.HemisphereLight(0xfff6e8, 0xe0d0b6, 1.95));
    const sun = new THREE.DirectionalLight(0xffeed8, 1.7);
    sun.position.set(-7, 10, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
    sun.shadow.bias = -0.0004; sun.shadow.radius = 6; sun.shadow.intensity = 0.5; scene.add(sun);
  }
  const phone = () => matchMedia('(max-width: 800px)').matches;

  // Hotspots are real links, placed over the objects they belong to.
  const spots = [];
  for (const [id, list] of Object.entries(HOTSPOTS)) for (const [key, href, x, y, z] of list) {
    const el = document.createElement(href ? 'a' : 'span');
    el.className = 'spot' + (href ? '' : ' soon'); el.tabIndex = -1;
    if (href) el.href = href;
    const sp = { key, el };
    spotsEl.append(el);
    spots.push({ id, el, sp, w: 0, h: 0, px: 0, py: 0, pos: new THREE.Vector3(x, y, z).add(rooms[id].group.position) });
  }

  let curLang = lang;
  function labelSpots() {
    for (const s of spots) {
      s.el.textContent = t(curLang, `model.spots.${s.sp.key}`);
      if (!s.el.href) s.el.title = t(curLang, 'ui.soon');
    }
  }
  labelSpots();

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  const EL = 0.74, TAU = Math.PI * 2;                     // default elevation in radians
  // view = what is drawn (damped), goal = where it is heading. el is free all the way round (upside down included).
  const view = { az: 0, el: EL, dist: 30, shift: 0, t: new THREE.Vector3(0, 0.2, 0.3) };
  const goal = { az: 0, el: EL, dist: 30, shift: 0, t: view.t.clone() };
  const home = { az: 0, el: EL, dist: 30, shift: 0, t: view.t.clone() };   // the default pose for the current state
  const panelEl = stage.querySelector('#panel');
  let stageW = 1, stageH = 1, openId = null, hoverId = null;
  let custom = false, zoom = 1, away = false;               // custom: the user turned or zoomed away from the default
  const ZMIN = 0.2, ZMAX = 1.8, DMIN = 3;
  const near = (a, b) => b - TAU * Math.round((b - a) / TAU);   // angle equal to b that is closest to a

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); stageW = w; stageH = h;
    setGoal();
  }
  // Camera distance at which all points fit into [-halfW, halfW] x [-below, above] (NDC), seen from azimuth az.
  // Moves target t so the points are centred in that window. Every size constraint is linear in dist, so no search is needed.
  const fwd = new THREE.Vector3(), rgt = new THREE.Vector3(), upv = new THREE.Vector3(), dv = new THREE.Vector3();
  function fitView(pts, t, az, halfW, above, below) {
    fwd.set(-Math.cos(EL) * Math.sin(az), -Math.sin(EL), -Math.cos(EL) * Math.cos(az));
    rgt.set(Math.cos(az), 0, -Math.sin(az)); upv.crossVectors(rgt, fwd);
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), th = tv * camera.aspect;
    let dist = 1;
    for (let it = 0; it < 4; it++) {
      dist = 1;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of pts) {
        dv.copy(p).sub(t);
        const x = dv.dot(rgt), y = dv.dot(upv), f = dv.dot(fwd);
        dist = Math.max(dist, Math.abs(x) / (halfW * th) - f, (y >= 0 ? y / (above * tv) : -y / (below * tv)) - f);
      }
      for (const p of pts) {
        dv.copy(p).sub(t);
        const dp = dist + dv.dot(fwd), x = dv.dot(rgt) / (dp * th), y = dv.dot(upv) / (dp * tv);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      t.addScaledVector(rgt, (x0 + x1) / 2 * dist * th).addScaledVector(upv, ((y0 + y1) / 2 - (above - below) / 2) * dist * tv);
    }
    return dist;
  }
  const BAR = 64;                                          // the room bar floats over the bottom of the stage on desktop
  const roomPts = {};
  for (const r of Object.values(rooms)) {
    roomPts[r.id] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0, r.h])
      roomPts[r.id].push(new THREE.Vector3(r.cx + sx * r.w / 2, y, r.cz + sz * r.d / 2));
  }
  function setGoal() {
    if (openId) {
      const r = rooms[openId];
      // Desktop: the text panel stands at the left of the stage, so the room is framed in the space to its right.
      const pw = phone() ? 0 : (panelEl.offsetWidth || 312) + 2 * 16;
      const free = Math.max(0.4, (stageW - pw) / stageW);
      home.shift = pw / 2;
      home.t.copy(r.center); home.t.y += 0.3; home.az = -r.x * 0.32;
      // Zoom to the room's own size: it fills the free part of the stage (right of the panel on desktop).
      const bar = phone() ? 0 : 2 * BAR / stageH;
      home.dist = fitView(roomPts[openId], home.t, home.az, 0.93 * free, 0.93, Math.max(0.5, 0.93 - bar));
    } else {
      home.t.copy(center); home.az = 0; home.shift = 0;
      const bar = phone() ? 0 : 2 * 24 / stageH;           // the bar may cover the front edge of the base a little
      home.dist = fitView(outline, home.t, 0, 0.95, 0.95, Math.max(0.5, 0.95 - bar));
    }
    goal.shift = home.shift;
    if (!custom) { goal.az = near(view.az, home.az); goal.el = near(view.el, EL); goal.dist = home.dist; zoom = 1; }
    else goal.dist = Math.max(DMIN, home.dist * zoom);
    aim(); checkAway();
  }
  // Zoomed in on the underside, the orbit centre drifts to the middle of the recess, so the close view stays on it.
  function aim() {
    const w = custom ? THREE.MathUtils.clamp((0.6 - zoom) / 0.3, 0, 1) * THREE.MathUtils.clamp(-Math.sin(goal.el) * 3, 0, 1) : 0;
    goal.t.copy(home.t).lerp(cellar.center, w);
  }
  function checkAway() {
    const a = custom && (Math.abs(near(goal.az, home.az) - goal.az) > 0.03 || Math.abs(near(goal.el, EL) - goal.el) > 0.03 || Math.abs(zoom - 1) > 0.03);
    if (a !== away) { away = a; onAway?.(a); }
  }
  function resetView() {
    custom = false; zoom = 1; egg.close(); setGoal();
    if (reduced) { view.az = goal.az; view.el = goal.el; }
  }
  // Turning: signs are for a drag; when the model is upside down (cos el < 0) the horizontal sense is mirrored.
  function wrap() {
    for (const k of ['az', 'el']) while (Math.abs(goal[k]) > Math.PI) { const d = goal[k] > 0 ? -TAU : TAU; goal[k] += d; view[k] += d; }
  }
  function orbit(dAz, dEl, instant) {
    const s = Math.cos(instant ? view.el : goal.el) >= 0 ? 1 : -1;
    goal.az -= dAz * s; goal.el += dEl;
    if (instant) { view.az -= dAz * s; view.el += dEl; }
    custom = true; wrap(); aim(); checkAway();
  }
  function zoomBy(f, instant) {
    zoom = THREE.MathUtils.clamp(zoom * f, ZMIN, ZMAX); custom = true;
    goal.dist = Math.max(DMIN, home.dist * zoom);
    if (instant) view.dist = goal.dist;
    aim(); checkAway();
  }
  const egg = createEgg({ cellar, camera, stage, canvas, reduced, lang });
  new ResizeObserver(resize).observe(stage); resize();
  Object.assign(view, { az: goal.az, el: goal.el, dist: goal.dist, shift: goal.shift }); view.t.copy(goal.t);

  // Pointer: drag turns the model freely, two fingers (or the wheel) zoom. A click without drag opens the room under the pointer
  // (or plays the hidden cellar machine). Touch rule: a one-finger drag that starts mostly vertical is left to the page scroll;
  // one that starts mostly horizontal locks as an orbit (azimuth and elevation); two fingers always orbit and pinch.
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const hits = Object.values(rooms).map(r => r.hit);
  const ndc = e => { const b = canvas.getBoundingClientRect(); return ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); };
  const pick = e => {
    ray.setFromCamera(ndc(e), camera);
    // The base and corridor floor hide rooms from below: the first thing the ray meets must be a room.
    const h = ray.intersectObjects([...hits, ...occluders], false)[0];
    return h?.object.userData.room ?? null;
  };
  const K = 0.0055, pts = new Map();
  let drag = null;
  const pinchState = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, mode: e.pointerType === 'touch' ? 'pending' : 'orbit' };
    else if (pts.size === 2 && drag) { drag.moved = true; drag.mode = 'pinch'; drag.p = pinchState(); }
    canvas.style.cursor = 'grabbing';
  });
  addEventListener('pointermove', e => {
    if (drag && pts.has(e.pointerId)) {
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (drag.mode === 'pinch') {
        if (pts.size < 2) return;
        const n = pinchState();
        zoomBy(drag.p.d / n.d, true); orbit((n.x - drag.p.x) * K, (n.y - drag.p.y) * K, true);
        drag.p = n; return;
      }
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      if (!drag.moved && Math.abs(e.clientX - drag.sx) <= 5 && Math.abs(e.clientY - drag.sy) <= 5) return;
      drag.moved = true;
      if (drag.mode === 'pending') drag.mode = Math.abs(e.clientX - drag.sx) >= Math.abs(e.clientY - drag.sy) ? 'orbit' : 'scroll';
      if (drag.mode === 'orbit') { orbit((e.clientX - drag.x) * K, (e.clientY - drag.y) * K, true); drag.x = e.clientX; drag.y = e.clientY; }
      void dx; void dy;
    } else if (e.target === canvas && !drag) {
      const over = egg.hit(ndc(e));
      hoverId = !openId && !over ? pick(e) : null; canvas.style.cursor = hoverId || over ? 'pointer' : 'grab';
    }
  });
  const endPointer = (e, cancelled) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (drag && pts.size === 0) {
      if (!cancelled && !drag.moved && e.target === canvas) {
        if (egg.hit(ndc(e))) egg.play(); else onPick(pick(e));
      }
      drag = null; canvas.style.cursor = 'grab';
    } else if (drag && drag.mode === 'pinch' && pts.size === 1) { drag.mode = 'orbit'; const [r] = [...pts.values()]; drag.x = r.x; drag.y = r.y; }
  };
  addEventListener('pointerup', e => endPointer(e, false));
  addEventListener('pointercancel', e => endPointer(e, true));   // the browser took over (vertical page scroll)
  canvas.addEventListener('pointerleave', () => { hoverId = null; });
  // Touch: once a gesture is an orbit or a pinch, keep the page from scrolling under it.
  canvas.addEventListener('touchmove', e => { if (e.cancelable && (e.touches.length > 1 || drag?.mode === 'orbit' || drag?.mode === 'pinch')) e.preventDefault(); }, { passive: false });
  // Wheel zoom, only over the canvas, without ctrl/cmd (those are the browser's own zoom), and only when the page itself does not scroll.
  canvas.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey || document.documentElement.scrollHeight > innerHeight + 1) return;
    e.preventDefault(); zoomBy(Math.exp(e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)), false);
  }, { passive: false });
  // Keyboard, when the canvas has focus.
  canvas.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const S = 0.14; let used = true;
    switch (e.key) {
      case 'ArrowLeft': orbit(-S, 0); break;
      case 'ArrowRight': orbit(S, 0); break;
      case 'ArrowUp': orbit(0, -S); break;
      case 'ArrowDown': orbit(0, S); break;
      case '+': case '=': zoomBy(0.85); break;
      case '-': case '_': zoomBy(1 / 0.85); break;
      case 'Home': case '0': resetView(); break;
      default: used = false;
    }
    if (used) e.preventDefault();
  });

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);

  const v3 = new THREE.Vector3(); let last = performance.now();
  // Hotspots follow their objects. Where two would overlap, the later one moves down by its own height,
  // and none may sit under the text panel, so every label stays readable at any stage width.
  const GAP = 4;
  function placeSpots() {
    const live = [];
    for (const s of spots) {
      const on = s.id === openId && rooms[s.id].open > 0.7, low = Math.sin(view.el) < 0.12;   // seen from below or edge-on: fade out
      if (on !== s.on || low !== s.low) { s.on = on; s.low = low; s.el.classList.toggle('on', on); s.el.classList.toggle('away', low); if (s.el.href) s.el.tabIndex = on && !low ? 0 : -1; }
      if (rooms[s.id].open < 0.05) continue;
      v3.copy(s.pos).project(camera);
      s.w = s.el.offsetWidth; s.h = s.el.offsetHeight;
      s.px = (v3.x * 0.5 + 0.5) * stageW; s.py = (-v3.y * 0.5 + 0.5) * stageH;   // anchor: bottom centre
      if (s.id === openId) live.push(s);
    }
    live.sort((a, b) => a.px - b.px);
    const placed = [];
    const pr = panelEl && !panelEl.hidden ? { l: panelEl.offsetLeft, r: panelEl.offsetLeft + panelEl.offsetWidth, t: panelEl.offsetTop, b: panelEl.offsetTop + panelEl.offsetHeight } : null;
    for (const s of live) {
      let l = s.px - s.w / 2, b = s.py;
      if (pr && l < pr.r + GAP && l + s.w > pr.l && b > pr.t && b - s.h < pr.b) l = pr.r + GAP;
      l = Math.min(Math.max(l, GAP), stageW - s.w - GAP);
      for (let n = 0; n < 8; n++) {
        const hit = placed.find(p => l < p.l + p.w + GAP && p.l < l + s.w + GAP && b - s.h < p.b + GAP && p.b - p.h < b + GAP);
        if (!hit) break;
        b = hit.b + GAP + s.h;
      }
      b = Math.min(b, stageH - 80);   // keep clear of the room bar
      placed.push({ l, b, w: s.w, h: s.h });
      s.el.style.left = `${l + s.w / 2}px`; s.el.style.top = `${b}px`;
    }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 2.6);
    view.shift += (goal.shift - view.shift) * k;
    if (Math.abs(view.shift) > 0.5 || camera.view?.enabled) { camera.setViewOffset(stageW, stageH, -view.shift, 0, stageW, stageH); if (Math.abs(view.shift) <= 0.5) camera.clearViewOffset(); }
    view.az += (goal.az - view.az) * k; view.el += (goal.el - view.el) * k; view.dist += (goal.dist - view.dist) * k; view.t.lerp(goal.t, k);
    const ce = Math.cos(view.el), se = Math.sin(view.el), sa = Math.sin(view.az), ca = Math.cos(view.az);
    camera.position.set(view.t.x + view.dist * ce * sa, view.t.y + view.dist * se, view.t.z + view.dist * ce * ca);
    camera.up.set(-se * sa, ce, -se * ca);                    // tangent of the elevation arc: no flip or jump at the poles
    camera.lookAt(view.t);
    egg.update(now, stageW, stageH);

    for (const r of Object.values(rooms)) {
      const isOpen = r.id === openId, isHot = r.id === hoverId && !openId;
      r.open += ((isOpen ? 1 : 0) - r.open) * k;
      r.glow += ((isOpen ? 1 : isHot ? 0.35 : 0) - r.glow) * (reduced ? 1 : 1 - Math.exp(-dt * 6));
      r.door.position.z = r.doorZ - r.open * r.doorSlide;
      r.light.intensity = r.glow * 9;
      r.floor.material.emissiveIntensity = r.glow * 0.12;
      r.hotGeo.setDrawRange(0, Math.floor(r.open * r.hotSegs) * 36);
      labels[r.id].classList.toggle('hot', isHot);
      v3.copy(r.labelAt).project(camera);
      labels[r.id].style.left = `${(v3.x * 0.5 + 0.5) * 100}%`;
      labels[r.id].style.top = `${(-v3.y * 0.5 + 0.5) * 100}%`;
    }
    placeSpots();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    open(id, { keepView = false } = {}) {
      openId = id; hoverId = null;
      if (!keepView) { custom = false; zoom = 1; egg.close(); }
      setGoal();
    },
    hover(id) { hoverId = id; },
    reset: resetView,
    closeNote() { egg.close(true); },
    setLanguage(l) { curLang = l; setModelLanguage(l); labelSpots(); egg.setLanguage(l); },
    ...(import.meta.env.DEV ? { debug: { camera, view, goal, egg, cellar, get custom() { return custom; }, get zoom() { return zoom; } } } : {}),
  };
}
