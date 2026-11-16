import * as THREE from 'three';
import { buildScene, HOTSPOTS } from './scene.js';

export function startViewer({ canvas, stage, labels, spotsEl, reduced, onPick }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;

  const { scene, rooms } = buildScene();
  // Default light rig, only if the scene does not bring its own (room point lights do not count).
  let sceneLit = false;
  scene.traverse(o => { if (o.isHemisphereLight || o.isDirectionalLight || o.isAmbientLight || o.isSpotLight || o.isRectAreaLight) sceneLit = true; });
  if (!sceneLit) {
    scene.add(new THREE.HemisphereLight(0xfff4e2, 0xcbb89a, 1.5));
    const sun = new THREE.DirectionalLight(0xffe2b8, 2.6);
    sun.position.set(-7, 10, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
    sun.shadow.bias = -0.0004; sun.shadow.radius = 6; scene.add(sun);
  }
  const phone = () => matchMedia('(max-width: 800px)').matches;

  // Hotspots are real links, placed over the objects they belong to.
  const spots = [];
  for (const [id, list] of Object.entries(HOTSPOTS)) for (const [text, href, x, y, z] of list) {
    const el = document.createElement(href ? 'a' : 'span');
    el.className = 'spot' + (href ? '' : ' soon'); el.textContent = text; el.tabIndex = -1;
    if (href) el.href = href; else el.title = 'Details to follow';
    spotsEl.append(el);
    spots.push({ id, el, w: 0, h: 0, px: 0, py: 0, pos: new THREE.Vector3(x, y, z).add(rooms[id].group.position) });
  }

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  const EL = 0.74;                                        // elevation in radians
  const view = { az: 0, dist: 30, shift: 0, t: new THREE.Vector3(0, 0.2, 0.3) };
  const goal = { az: 0, dist: 30, shift: 0, t: view.t.clone() };
  const panelEl = stage.querySelector('#panel');
  let stageW = 1, stageH = 1, overviewDist = 30, openId = null, hoverId = null, userAz = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); stageW = w; stageH = h;
    const v = THREE.MathUtils.degToRad(camera.fov) / 2, hfov = Math.atan(Math.tan(v) * camera.aspect);
    overviewDist = Math.max(6.4 / Math.tan(hfov), 4.6 / Math.tan(v));
    setGoal();
  }
  function setGoal() {
    if (openId) {
      const r = rooms[openId];
      // Desktop: the text panel stands at the left of the stage, so the room is framed in the space to its right.
      const pw = phone() ? 0 : (panelEl.offsetWidth || 300) + 2 * 16;
      const free = Math.max(0.4, (stageW - pw) / stageW);
      goal.shift = pw / 2;
      goal.t.copy(r.center); goal.t.y += 0.3; goal.dist = overviewDist * (phone() ? 0.3 : 0.66 / Math.sqrt(free)); goal.az = -r.x * 0.32 + userAz * 0.5;
    } else { goal.t.set(0, 0.2, 0.3); goal.dist = overviewDist; goal.az = userAz; goal.shift = 0; }
  }
  new ResizeObserver(resize).observe(stage); resize();
  Object.assign(view, { az: goal.az, dist: goal.dist, shift: goal.shift }); view.t.copy(goal.t);

  // Drag to turn a little; a click without drag opens the room under the pointer.
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const hits = Object.values(rooms).map(r => r.hit);
  const pick = e => {
    const b = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    return ray.intersectObjects(hits)[0]?.object.userData.room ?? null;
  };
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, az: userAz, moved: false }; });
  addEventListener('pointermove', e => {
    if (drag) {
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 5) drag.moved = true;
      userAz = THREE.MathUtils.clamp(drag.az - dx * 0.004, -0.45, 0.45); setGoal();
    } else if (e.target === canvas && !openId) {
      hoverId = pick(e); canvas.style.cursor = hoverId ? 'pointer' : 'grab';
    }
  });
  addEventListener('pointerup', e => {
    if (drag && !drag.moved && e.target === canvas && !openId) { const id = pick(e); if (id) onPick(id); }
    drag = null;
  });
  canvas.addEventListener('pointerleave', () => { hoverId = null; });

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);

  const v3 = new THREE.Vector3(); let last = performance.now();
  // Hotspots follow their objects. Where two would overlap, the later one moves down by its own height,
  // and none may sit under the text panel, so every label stays readable at any stage width.
  const GAP = 4;
  function placeSpots() {
    const live = [];
    for (const s of spots) {
      const on = s.id === openId && rooms[s.id].open > 0.7;
      if (on !== s.on) { s.on = on; s.el.classList.toggle('on', on); if (s.el.href) s.el.tabIndex = on ? 0 : -1; }
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
    view.az += (goal.az - view.az) * k; view.dist += (goal.dist - view.dist) * k; view.t.lerp(goal.t, k);
    camera.position.set(
      view.t.x + view.dist * Math.cos(EL) * Math.sin(view.az),
      view.t.y + view.dist * Math.sin(EL),
      view.t.z + view.dist * Math.cos(EL) * Math.cos(view.az));
    camera.lookAt(view.t);

    for (const r of Object.values(rooms)) {
      const isOpen = r.id === openId, isHot = r.id === hoverId && !openId;
      r.open += ((isOpen ? 1 : 0) - r.open) * k;
      r.glow += ((isOpen ? 1 : isHot ? 0.35 : 0) - r.glow) * (reduced ? 1 : 1 - Math.exp(-dt * 6));
      r.door.position.z = 0.2 - r.open * 1.35;
      r.light.intensity = r.glow * 9;
      r.floor.material.emissiveIntensity = r.glow * 0.12;
      r.hotGeo.setDrawRange(0, Math.floor(r.open * 80) * 36);
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
    open(id) { openId = id; hoverId = null; if (!id) userAz = 0; setGoal(); },
    hover(id) { hoverId = id; },
  };
}
