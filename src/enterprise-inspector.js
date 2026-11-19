import { labelShipAction } from './enterprise-copy.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createEnterprise, disposeEnterprise, loadEnterpriseGlb } from './enterprise.js';

export function showEnterprise(copy, reduced, onWarp = null) {
  const dialog = document.createElement('dialog'); dialog.className = 'ship-dialog';
  const title = document.createElement('h2'); title.textContent = 'USS Enterprise NCC-1701';
  const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.className = 'ship-close'; close.setAttribute('aria-label', copy.close);
  const viewport = document.createElement('div'); viewport.className = 'ship-viewport';
  const hint = document.createElement('p'); hint.textContent = copy.hint;
  const footer = document.createElement('div'); footer.className = 'ship-actions';
  const warp = document.createElement('button'); warp.type = 'button'; labelShipAction(warp, copy.warp, 'warp');
  const reset = document.createElement('button'); reset.type = 'button'; labelShipAction(reset, copy.reset, 'reset');
  const status = document.createElement('p'); status.className = 'ship-status'; status.setAttribute('role', 'status'); status.textContent = copy.ready;
  const credit = document.createElement('span'); credit.className = 'ship-credit'; credit.textContent = copy.creditLabel;
  credit.title = copy.credit; credit.tabIndex = 0; credit.setAttribute('aria-label', copy.credit);
  footer.append(reset, credit, warp); footer.prepend(hint);
  dialog.append(close, title, viewport, footer, status);
  document.body.append(dialog);

  const previous = document.activeElement, previousOverflow = document.body.style.overflow;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { dialog.remove(); return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  viewport.append(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', copy.hint);

  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xfff3de, 0x536b70, 2.4));
  const sun = new THREE.DirectionalLight(0xfff3de, 2.8); sun.position.set(-3, 6, -3); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xc2e4f1, 1.5); rim.position.set(4, 2, 3); scene.add(rim);

  const model = createEnterprise(true);
  scene.add(model);
  loadEnterpriseGlb(model);
  const { ship } = model.userData;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false; controls.enablePan = false; controls.minDistance = 3.6; controls.maxDistance = 11;
  const home = () => { camera.position.set(4.5, 3.3, -5.2); controls.target.set(0, 0.55, 0); controls.update(); };
  home();

  const positions = new Float32Array(96 * 6);
  for (let i = 0; i < 96; i++) {
    const a = i * 2.39996, r = 2 + (i % 11) * 0.3, z = -8 + (i % 17);
    positions.set([Math.cos(a) * r, Math.sin(a) * r, z, Math.cos(a) * r, Math.sin(a) * r, z + 0.05], i * 6);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const trailMaterial = new THREE.LineBasicMaterial({ color: 0x688fa4, transparent: true, opacity: 0 });
  const trails = new THREE.LineSegments(geometry, trailMaterial);
  scene.add(trails);

  let start = null, raf = 0, disposed = false;
  function restore() {
    start = null;
    ship.position.set(0, 0.63, 0);
    ship.scale.setScalar(1);
    ship.visible = true;
    model.userData.setWarpGlow(0);
    trailMaterial.opacity = 0;
    warp.disabled = false;
    controls.enabled = true;
    status.textContent = copy.ready;
  }
  function engage() {
    if (start !== null) return;
    if (reduced) { status.textContent = copy.reduced; return; }
    controls.reset(); home(); restore();
    start = performance.now();
    warp.disabled = true; controls.enabled = false;
    status.textContent = copy.departing;
  }
  function draw(now) {
    if (disposed) return;
    if (!document.hidden) {
      if (start !== null) {
        const t = (now - start) / 1000, charge = 0.65, jump = 0.95;
        ship.position.y = 0.63 + Math.min(t / charge, 1) * 0.4;
        model.userData.setWarpGlow(Math.min(t / charge, 1) * 1.1);
        if (t > charge) {
          const p = Math.min((t - charge) / jump, 1);
          ship.position.z = -p * p * 24;
          ship.scale.setScalar(1 - p * 0.55);
          trailMaterial.opacity = 0.45 * Math.sin(p * Math.PI);
          for (let i = 0; i < 96; i++) positions[i * 6 + 5] = positions[i * 6 + 2] + 0.9 * p;
          geometry.attributes.position.needsUpdate = true;
        }
        if (t > charge + jump) ship.visible = false;
        if (t > charge + jump + 0.65) restore();
      }
      controls.update(); renderer.render(scene, camera);
    } else if (start !== null) restore();
    raf = requestAnimationFrame(draw);
  }
  const observer = new ResizeObserver(() => {
    const w = viewport.clientWidth, h = viewport.clientHeight;
    if (w && h) { renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  });
  observer.observe(viewport);
  function cleanup() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf); observer.disconnect(); controls.dispose();
    disposeEnterprise(model); geometry.dispose(); trailMaterial.dispose();
    renderer.dispose(); renderer.forceContextLoss();
    document.body.style.overflow = previousOverflow; dialog.remove();
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  }
  dialog.addEventListener('close', cleanup);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    }
  });
  dialog.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); dialog.close(); }
    if (e.target === renderer.domElement && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const offset = camera.position.clone().sub(controls.target), s = new THREE.Spherical().setFromVector3(offset);
      s.theta += e.key === 'ArrowLeft' ? -0.15 : e.key === 'ArrowRight' ? 0.15 : 0;
      s.phi = THREE.MathUtils.clamp(s.phi + (e.key === 'ArrowUp' ? -0.15 : e.key === 'ArrowDown' ? 0.15 : 0), 0.1, Math.PI - 0.1);
      camera.position.copy(controls.target).add(offset.setFromSpherical(s)); controls.update();
    }
  });
  warp.addEventListener('click', () => {
    if (typeof onWarp === 'function') {
      if (reduced) { status.textContent = copy.reduced; return; }
      dialog.close();
      onWarp();
      return;
    }
    engage();
  });
  reset.addEventListener('click', () => { restore(); home(); });
  dialog.showModal(); document.body.style.overflow = 'hidden'; close.focus();
  raf = requestAnimationFrame(draw);
  return true;
}
