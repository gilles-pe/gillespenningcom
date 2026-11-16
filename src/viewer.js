import * as THREE from 'three';
import { buildScene } from './scene.js';

export function startViewer({ canvas, stage, labels, reduced, onPick }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;

  const { scene, rooms } = buildScene();
  scene.add(new THREE.HemisphereLight(0xfff4e2, 0xcbb89a, 1.5));
  const sun = new THREE.DirectionalLight(0xffe2b8, 2.6);
  sun.position.set(-7, 10, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
  sun.shadow.bias = -0.0004; sun.shadow.radius = 6; scene.add(sun);

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  const EL = 0.74;                                        // elevation in radians
  const view = { az: 0, dist: 30, t: new THREE.Vector3(0, 0.2, 0.3) };
  const goal = { az: 0, dist: 30, t: view.t.clone() };
  let overviewDist = 30, openId = null, hoverId = null, userAz = 0;

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const v = THREE.MathUtils.degToRad(camera.fov) / 2, hfov = Math.atan(Math.tan(v) * camera.aspect);
    overviewDist = Math.max(6.4 / Math.tan(hfov), 4.6 / Math.tan(v));
    setGoal();
  }
  function setGoal() {
    if (openId) {
      const r = rooms[openId];
      goal.t.copy(r.center); goal.t.x += 0.9; goal.dist = overviewDist * 0.66; goal.az = -r.x * 0.32 + userAz * 0.5;
    } else { goal.t.set(0, 0.2, 0.3); goal.dist = overviewDist; goal.az = userAz; }
  }
  new ResizeObserver(resize).observe(stage); resize();
  Object.assign(view, { az: goal.az, dist: goal.dist }); view.t.copy(goal.t);

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
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 2.6);
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
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    open(id) { openId = id; hoverId = null; if (!id) userAz = 0; setGoal(); },
    hover(id) { hoverId = id; },
  };
}
