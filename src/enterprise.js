import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GLB_URL = `${import.meta.env.BASE_URL}models/enterprise-tos.glb`;
let glbPromise = null;

function loadGlbTemplate() {
  if (!glbPromise) {
    glbPromise = new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(GLB_URL, gltf => resolve(gltf.scene), undefined, reject);
    }).catch(err => {
      glbPromise = null;
      throw err;
    });
  }
  return glbPromise;
}

// Lightweight placeholder silhouette used before the GLB finishes lazy-loading
// (and in headless Node checks where fetch/WebGL are unavailable).
function buildPlaceholder(ship) {
  const hull = new THREE.MeshStandardMaterial({ color: 0xe1ded2, roughness: 0.54, metalness: 0.24 });
  const inset = new THREE.MeshStandardMaterial({ color: 0x899c9d, roughness: 0.64, metalness: 0.3 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x74bed3, emissive: 0x246d9c, emissiveIntensity: 0.5 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb45c39, emissive: 0x983f1d, emissiveIntensity: 0.3 });
  const add = (geo, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const o = new THREE.Mesh(geo, material);
    o.position.set(x, y, z); o.scale.set(sx, sy, sz);
    o.castShadow = o.receiveShadow = true;
    ship.add(o);
    return o;
  };
  add(new THREE.CylinderGeometry(0.9, 0.9, 0.14, 32), hull, 0, 0.2, -0.75);
  add(new THREE.BoxGeometry(0.14, 0.45, 0.45), hull, 0, -0.1, 0.1);
  add(new THREE.SphereGeometry(1, 20, 12), hull, 0, -0.32, 0.48, 0.23, 0.21, 0.85);
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.105, 0.105, 1.9, 16), hull, s * 0.8, 0.46, 0.82).rotation.x = Math.PI / 2;
    add(new THREE.SphereGeometry(0.105, 12, 10), red, s * 0.8, 0.46, -0.15);
    add(new THREE.BoxGeometry(0.12, 0.025, 1.35), blue, s * 0.8, 0.55, 0.85);
  }
  return { blue, red };
}

function makeLabel(text, width, height, color, bg) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const k = c.getContext('2d');
  if (bg) { k.fillStyle = bg; k.fillRect(0, 0, c.width, c.height); }
  k.fillStyle = color; k.font = '600 84px Georgia'; k.textAlign = 'center'; k.textBaseline = 'middle';
  k.fillText(text, 512, 128, 970);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: !bg, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
}

const _glowBaseColor = new THREE.Color(0x38b6ff);
const _glowHotColor = new THREE.Color(0xdff8ff);

// Single classic USS Enterprise NCC-1701 (TOS) with optional display stand.
// Starts with a tiny placeholder silhouette; call loadEnterpriseGlb(root) lazily to swap in the GLB.
export function createEnterprise(stand = true) {
  const root = new THREE.Group();
  const ship = new THREE.Group();
  root.add(ship);
  ship.position.y = 0.63;

  const placeholder = new THREE.Group();
  ship.add(placeholder);
  buildPlaceholder(placeholder);

  // Distal-only aft warp nacelle tip glow assemblies (repositioned to exact GLB tips on load).
  const distalGroup = new THREE.Group();
  distalGroup.name = 'warpDistalGlow';
  distalGroup.visible = false;
  ship.add(distalGroup);
  const coreGeo = new THREE.SphereGeometry(0.094, 18, 12);
  const haloGeo = new THREE.SphereGeometry(0.145, 16, 12);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x38b6ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x45b8ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const cores = [];
  const halos = [];
  for (const s of [-1, 1]) {
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(s * 0.80, 0.46, 1.77);
    core.scale.set(1.03, 0.92, 1.15);
    core.castShadow = false;
    core.receiveShadow = false;
    core.renderOrder = 5;
    core.raycast = () => {};
    core.userData.isWarpGlow = true;
    distalGroup.add(core);
    cores.push(core);

    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(s * 0.80, 0.46, 1.81);
    halo.scale.set(1.02, 1.0, 1.38);
    halo.castShadow = false;
    halo.receiveShadow = false;
    halo.renderOrder = 5;
    halo.raycast = () => {};
    halo.userData.isWarpGlow = true;
    distalGroup.add(halo);
    halos.push(halo);
  }

  if (stand) {
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x514438, roughness: 0.65 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xb49356, metalness: 0.65, roughness: 0.4 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.2), baseMaterial);
    base.position.set(0, 0.03, 0.05); base.castShadow = base.receiveShadow = true; root.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.5, 12), brass);
    stem.position.set(0, 0.31, 0.35); stem.castShadow = stem.receiveShadow = true; root.add(stem);
    const plaque = makeLabel('NCC-1701 · CONSTITUTION', 1.2, 0.21, '#2f332f', '#bca16c');
    plaque.rotation.x = -Math.PI / 2; plaque.position.set(0, 0.063, 0.49); root.add(plaque);
  }

  root.userData = {
    ship,
    placeholder,
    glbLoaded: false,
    glbLoading: null,
    distalGlow: { group: distalGroup, cores, halos, coreMat, haloMat },
    setWarpGlow(level) {
      const k = Math.max(0, level);
      if (k <= 0.01) {
        distalGroup.visible = false;
        coreMat.opacity = 0;
        haloMat.opacity = 0;
        return;
      }
      distalGroup.visible = true;
      coreMat.color.copy(_glowBaseColor).lerp(_glowHotColor, Math.min(k / 1.8, 1));
      coreMat.opacity = Math.min(0.96, k * 0.62);
      haloMat.color.setHex(0x45b8ff);
      haloMat.opacity = Math.min(0.42, k * 0.24);
      const haloPulse = 1 + Math.min(k, 2.5) * 0.14;
      for (const halo of halos) halo.scale.set(1.02 * haloPulse, 1.0 * haloPulse, 1.38 * haloPulse);
    },
  };
  return root;
}

export function loadEnterpriseGlb(root, { tagMesh } = {}) {
  if (!root?.userData || root.userData.glbLoaded) return Promise.resolve([]);
  if (root.userData.glbLoading) return root.userData.glbLoading;

  root.userData.glbLoading = loadGlbTemplate().then(template => {
    const model = template.clone(true);
    // Rotate bow (+Z in GLB) to -Z to match stand/inspector convention and center vertically on stand
    model.rotation.y = Math.PI;
    model.position.set(0, -0.44, 0);

    const meshes = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      if (tagMesh) tagMesh(o);
      meshes.push(o);
    });

    const { ship, placeholder, distalGlow } = root.userData;
    if (placeholder?.parent) {
      placeholder.parent.remove(placeholder);
      disposeEnterprise(placeholder);
      root.userData.placeholder = null;
    }
    ship.add(model);
    if (distalGlow) {
      [-1, 1].forEach((s, i) => {
        distalGlow.cores[i]?.position.set(s * 0.5787, 0.418, 1.938);
        distalGlow.halos[i]?.position.set(s * 0.5787, 0.418, 1.975);
      });
    }
    root.userData.glbLoaded = true;
    root.userData.setWarpGlow(0);
    return meshes;
  }).catch(() => {
    root.userData.glbLoading = null;
    return [];
  });

  return root.userData.glbLoading;
}

export function disposeEnterprise(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
      materials.add(m);
      if (m.map) textures.add(m.map);
      if (m.emissiveMap) textures.add(m.emissiveMap);
    }
  });
  geometries.forEach(g => g.dispose());
  materials.forEach(m => m.dispose());
  textures.forEach(t => t.dispose());
}

// Compute an upright orientation where local -Z faces `forward` with optional banking around `forward`.
const _up = new THREE.Vector3(0, 1, 0);
const _zAxis = new THREE.Vector3();
const _xAxis = new THREE.Vector3();
const _yAxis = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _bankQ = new THREE.Quaternion();
const _fwdLocal = new THREE.Vector3(0, 0, -1);

function orientBow(outQuat, forward, bankRad = 0) {
  _zAxis.copy(forward).normalize().negate();
  _xAxis.crossVectors(_up, _zAxis);
  if (_xAxis.lengthSq() < 1e-5) _xAxis.set(1, 0, 0);
  else _xAxis.normalize();
  _yAxis.crossVectors(_zAxis, _xAxis).normalize();
  _basis.makeBasis(_xAxis, _yAxis, _zAxis);
  outQuat.setFromRotationMatrix(_basis);
  if (bankRad) {
    _bankQ.setFromAxisAngle(_fwdLocal, bankRad);
    outQuat.multiply(_bankQ);
  }
  return outQuat;
}

const smoothstep = x => {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
};

// In-room TOS warp flight inside About Me:
// Viewscreen performs a low frontal Star Trek: TMP flyover over Enterprise on its shelf pedestal
// (warming assets/audio) -> lifts off cleanly -> follows smoothly behind -> closes BEFORE warp.
export function createRoomWarp(scene, root) {
  const ORBIT = 3.80;
  const VIEWSCREEN_END = 5.25;
  const FLIGHT_END = 6.75;
  const WARP_OUT_END = 7.60;
  const WAIT_END = 8.00;
  const WARP_IN_END = 8.85;
  const LAND_END = 11.05;

  const ship = root.userData.ship;
  const starCount = 64;
  const starPos = new Float32Array(starCount * 6);
  const starSeeds = [];
  for (let i = 0; i < starCount; i++) {
    const a = i * 2.39996;
    const r = 0.16 + (i % 11) * 0.085;
    const along = ((i % 15) - 7) * 0.24;
    starSeeds.push({ ca: Math.cos(a) * r, sa: Math.sin(a) * r, along });
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.LineBasicMaterial({ color: 0x4da8ff, transparent: true, opacity: 0, depthWrite: false });
  const stars = new THREE.LineSegments(starGeo, starMat);
  stars.visible = false;
  stars.renderOrder = 6;
  scene.add(stars);

  const flashMat = new THREE.MeshBasicMaterial({ color: 0x8de2ff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.10, 16, 12), flashMat);
  flash.visible = false;
  flash.renderOrder = 7;
  scene.add(flash);

  const glowLight = new THREE.PointLight(0x66ccff, 0, 1.1, 1.8);
  glowLight.visible = false;
  scene.add(glowLight);

  let active = false;
  let startTime = 0;
  let lastUpdateNow = 0;
  let onDoneCb = null;
  let onLiftoffCb = null;
  let liftoffFired = false;
  let chaseInitialized = false;
  let viewscreenPose = null;

  const restPos = new THREE.Vector3();
  const restQuat = new THREE.Quaternion();
  const restScale = new THREE.Vector3();
  const restLocalPos = ship.position.clone();
  const restLocalQuat = ship.quaternion.clone();
  const restLocalScale = ship.scale.clone();

  let orbitCurve, orbitEnd, flightCurve, landCurve, jumpStart, jumpDir, arriveStart, arriveEnd, arriveDir;
  const tmpPos = new THREE.Vector3();
  const tmpTan = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpQ2 = new THREE.Quaternion();
  const sideA = new THREE.Vector3();
  const sideB = new THREE.Vector3();
  const aftMid = new THREE.Vector3();

  const chaseEye = new THREE.Vector3();
  const chaseTarget = new THREE.Vector3();
  const desiredEye = new THREE.Vector3();
  const desiredTarget = new THREE.Vector3();
  const chasePt = new THREE.Vector3();
  const chaseFwd = new THREE.Vector3();
  const viewscreenPoseObj = { eye: chaseEye, target: chaseTarget };

  function updateChaseCamera(t, dt, forwardDir) {
    if (t >= VIEWSCREEN_END) {
      viewscreenPose = null;
      return;
    }
    let follow = 12;
    if (t < ORBIT) {
      orbitCurve.getPointAt(smoothstep(t / ORBIT), desiredEye);
      desiredTarget.copy(restPos);
      desiredTarget.y += 0.015;
      follow = 12;
    } else {
      chaseFwd.copy(forwardDir).normalize();
      chasePt.copy(ship.position).addScaledVector(chaseFwd, -0.48);
      chasePt.y += 0.15;
      chasePt.x = Math.min(chasePt.x, 3.55);
      chasePt.z = Math.max(chasePt.z, -4.68);
      const blendIn = smoothstep((t - ORBIT) / 1.05);
      desiredEye.lerpVectors(orbitEnd, chasePt, blendIn);
      desiredTarget.copy(ship.position).addScaledVector(chaseFwd, 0.04 * blendIn);
      if (blendIn < 0.15) desiredTarget.y += 0.015 * (1 - blendIn / 0.15);
      follow = 7.0;
    }
    if (!chaseInitialized) {
      chaseEye.copy(desiredEye);
      chaseTarget.copy(desiredTarget);
      chaseInitialized = true;
    } else {
      chaseEye.lerp(desiredEye, 1 - Math.exp(-dt * follow));
      chaseTarget.lerp(desiredTarget, 1 - Math.exp(-dt * 10));
    }
    viewscreenPose = viewscreenPoseObj;
  }

  function updateStars(center, dir, length, opacity) {
    if (opacity <= 0.01) {
      stars.visible = false;
      starMat.opacity = 0;
      return;
    }
    stars.visible = true;
    starMat.opacity = opacity;
    sideA.crossVectors(_up, dir);
    if (sideA.lengthSq() < 1e-4) sideA.set(1, 0, 0);
    else sideA.normalize();
    sideB.crossVectors(dir, sideA).normalize();
    for (let i = 0; i < starCount; i++) {
      const s = starSeeds[i];
      const bx = center.x + sideA.x * s.ca + sideB.x * s.sa + dir.x * s.along;
      const by = center.y + sideA.y * s.ca + sideB.y * s.sa + dir.y * s.along;
      const bz = center.z + sideA.z * s.ca + sideB.z * s.sa + dir.z * s.along;
      starPos[i * 6] = bx - dir.x * length * 0.5;
      starPos[i * 6 + 1] = by - dir.y * length * 0.5;
      starPos[i * 6 + 2] = bz - dir.z * length * 0.5;
      starPos[i * 6 + 3] = bx + dir.x * length * 0.5;
      starPos[i * 6 + 4] = by + dir.y * length * 0.5;
      starPos[i * 6 + 5] = bz + dir.z * length * 0.5;
    }
    starGeo.attributes.position.needsUpdate = true;
  }

  function finish() {
    if (!active) return;
    active = false;
    viewscreenPose = null;
    chaseInitialized = false;
    liftoffFired = false;
    onLiftoffCb = null;
    if (ship.parent !== root) root.add(ship);
    ship.position.copy(restLocalPos);
    ship.quaternion.copy(restLocalQuat);
    ship.scale.copy(restLocalScale);
    ship.visible = true;
    root.userData.setWarpGlow(0);
    stars.visible = false; starMat.opacity = 0;
    flash.visible = false; flashMat.opacity = 0;
    glowLight.visible = false; glowLight.intensity = 0;
    const cb = onDoneCb; onDoneCb = null;
    if (cb) cb();
  }

  function engage(onDone, onLiftoff) {
    if (active) return false;
    root.updateMatrixWorld(true);
    ship.getWorldPosition(restPos);
    ship.getWorldQuaternion(restQuat);
    ship.getWorldScale(restScale);

    // Reparent ship to world scene while keeping exact miniature scale
    scene.attach(ship);

    // Derive the ship's exact resting forward vector (local -Z) so flyover, takeoff, and landing
    // align smoothly out of and back into restQuat with zero rotational snap.
    const restFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(restQuat).setY(0).normalize();
    const aft = restFwd.clone().negate();
    const rightSide = new THREE.Vector3(1, 0, 0).applyQuaternion(restQuat).setY(0).normalize();

    // Dead-frontal Star Trek: The Motion Picture flyover over the Enterprise on its shelf stand
    orbitEnd = restPos.clone().addScaledVector(aft, 0.24).add(new THREE.Vector3(-0.04, 0.24, 0.04));
    orbitCurve = new THREE.CatmullRomCurve3([
      restPos.clone().addScaledVector(restFwd, 0.72).add(new THREE.Vector3(0, -0.01, 0)),
      restPos.clone().addScaledVector(restFwd, 0.36).add(new THREE.Vector3(0.02, 0.06, 0.02)),
      restPos.clone().addScaledVector(restFwd, 0.08).addScaledVector(rightSide, -0.08).add(new THREE.Vector3(0, 0.18, 0)),
      restPos.clone().addScaledVector(aft, 0.12).addScaledVector(rightSide, -0.07).add(new THREE.Vector3(0, 0.23, 0)),
      orbitEnd.clone(),
    ], false, 'centripetal');

    // Single continuous circular left-banked arc off the shelf straight toward warp jumpStart.
    jumpStart = new THREE.Vector3(3.15, 2.02, -2.22);
    flightCurve = new THREE.CatmullRomCurve3([
      restPos.clone(),
      new THREE.Vector3(2.74, 1.50, -4.10),
      new THREE.Vector3(2.60, 1.70, -3.45),
      new THREE.Vector3(2.78, 1.87, -2.76),
      jumpStart.clone(),
    ], false, 'centripetal');
    jumpDir = flightCurve.getTangentAt(1).setY(0.14).normalize();

    // Warp back in along the EXACT SAME axis (jumpDir) from the opposite side ("once around the world")
    arriveDir = jumpDir.clone();
    arriveStart = jumpStart.clone().addScaledVector(jumpDir, -11.5);
    arriveEnd = jumpStart.clone().addScaledVector(jumpDir, -1.65);
    // Continuous left-banked return loop matching warp-in forward heading into restPos.
    landCurve = new THREE.CatmullRomCurve3([
      arriveEnd.clone(),
      arriveEnd.clone().addScaledVector(jumpDir, 0.62).setY(1.86),
      new THREE.Vector3(3.26, 1.86, -2.86),
      new THREE.Vector3(3.42, 1.76, -3.58),
      new THREE.Vector3(3.26, 1.60, -4.28),
      new THREE.Vector3(3.15, 1.42, -4.55),
      restPos.clone(),
    ], false, 'centripetal');

    active = true;
    startTime = performance.now();
    lastUpdateNow = startTime;
    chaseInitialized = false;
    liftoffFired = false;
    viewscreenPose = null;
    onDoneCb = onDone || null;
    onLiftoffCb = onLiftoff || null;
    glowLight.visible = true;
    return true;
  }

  function update(now) {
    if (!active) return false;
    const t = (now - startTime) / 1000;
    const dt = Math.min(Math.max((now - lastUpdateNow) / 1000, 1 / 240), 0.05);
    lastUpdateNow = now;

    // Phase 0: Frontal TMP flyover over stationary Enterprise on pedestal while audio/shaders pre-decode (0 -> 3.80s)
    if (t < ORBIT) {
      ship.position.copy(restPos);
      ship.quaternion.copy(restQuat);
      ship.scale.copy(restScale);
      ship.visible = true;
      const charge = smoothstep((t - (ORBIT - 1.0)) / 1.0) * 0.55;
      root.userData.setWarpGlow(charge);
      ship.updateMatrixWorld();
      glowLight.position.copy(ship.localToWorld(aftMid.set(0, 0.42, 2.02)));
      glowLight.color.setHex(0x66ccff);
      glowLight.intensity = charge * 0.85;
      updateStars(ship.position, _fwdLocal, 0, 0);
      flash.visible = false;
      updateChaseCamera(t, dt, _fwdLocal);
      return true;
    }

    if (!liftoffFired) {
      liftoffFired = true;
      const liftoff = onLiftoffCb;
      onLiftoffCb = null;
      if (liftoff) liftoff();
    }

    // Phase 1+2: Continuous circular left-banked arc off the pedestal straight into warp (3.80 -> 6.75s)
    // Viewscreen continues trailing gracefully until 5.25s, then closes before warp.
    if (t < FLIGHT_END) {
      const p = (t - ORBIT) / (FLIGHT_END - ORBIT);
      const u = p * p * (1.85 - 0.85 * p);
      flightCurve.getPointAt(u, tmpPos);
      flightCurve.getTangentAt(u, tmpTan);
      const bank = Math.sin(p * Math.PI) * 0.34;
      orientBow(tmpQ, tmpTan, bank);
      ship.quaternion.slerp(tmpQ, 1 - Math.exp(-dt * 8));
      ship.position.copy(tmpPos);
      ship.scale.copy(restScale);
      ship.visible = true;
      root.userData.setWarpGlow(0.55 + p * 1.05);
      ship.updateMatrixWorld();
      glowLight.position.copy(ship.localToWorld(aftMid.set(0, 0.42, 2.02)));
      glowLight.color.setHex(0x8cd8ff);
      glowLight.intensity = 0.65 + p * 1.75;
      updateStars(ship.position, tmpTan, 0.12 + p * 0.28, Math.max(0, (p - 0.72) * 0.9));
      flash.visible = false;
      updateChaseCamera(t, dt, tmpTan);
      return true;
    }

    viewscreenPose = null;

    // Phase 3: TOS Warp Jump Out along jumpDir (6.75 -> 7.60s) — unobstructed without Viewscreen
    if (t < WARP_OUT_END) {
      const p = (t - FLIGHT_END) / (WARP_OUT_END - FLIGHT_END);
      const dist = p * 1.15 + (0.35 * p * p + 0.65 * p * p * p) * 10.5;
      ship.position.copy(jumpStart).addScaledVector(jumpDir, dist);
      orientBow(tmpQ, jumpDir, 0);
      ship.quaternion.copy(tmpQ);
      const shrink = Math.max(0.24, 1 - p * 0.74);
      ship.scale.copy(restScale).multiplyScalar(shrink);
      ship.visible = p < 0.95;
      root.userData.setWarpGlow(1.6 + Math.sin(p * Math.PI) * 1.2);
      ship.updateMatrixWorld();
      glowLight.position.copy(ship.localToWorld(aftMid.set(0, 0.42, 2.02)));
      glowLight.intensity = p < 0.95 ? (1 - p) * 3.0 : 0;
      updateStars(jumpStart.clone().addScaledVector(jumpDir, dist * 0.55), jumpDir, 0.45 + p * 2.4, Math.sin(p * Math.PI) * 0.90);
      const flare = Math.max(0, 1 - Math.abs(p - 0.82) / 0.22);
      flash.visible = flare > 0.02;
      flash.position.copy(ship.position);
      flash.scale.setScalar(0.35 + flare * 2.2);
      flashMat.opacity = flare * 0.92;
      return true;
    }

    // Phase 4: Brief beat + distant arrival spark on the opposite side of the same axis (6.00 -> 6.40s)
    if (t < WAIT_END) {
      const p = (t - WARP_OUT_END) / (WAIT_END - WARP_OUT_END);
      ship.visible = false;
      root.userData.setWarpGlow(0);
      glowLight.intensity = 0;
      updateStars(arriveStart, arriveDir, 0, 0);
      const spark = Math.max(0, (p - 0.35) / 0.65);
      flash.visible = spark > 0.02;
      flash.position.copy(arriveStart).lerp(arriveEnd, 0.25);
      flash.scale.setScalar(0.4 + spark * 2.0);
      flashMat.opacity = spark * 0.85;
      return true;
    }

    // Phase 5: Warp-in along the exact same axis (6.40 -> 7.25s)
    if (t < WARP_IN_END) {
      const p = (t - WAIT_END) / (WARP_IN_END - WAIT_END);
      const decel = 1 - Math.pow(1 - p, 3);
      ship.position.lerpVectors(arriveStart, arriveEnd, decel);
      orientBow(tmpQ, arriveDir, 0);
      ship.quaternion.copy(tmpQ);
      ship.scale.copy(restScale).multiplyScalar(0.18 + decel * 0.82);
      ship.visible = true;
      root.userData.setWarpGlow(1.7 * (1 - p * 0.45));
      ship.updateMatrixWorld();
      glowLight.position.copy(ship.localToWorld(aftMid.set(0, 0.42, 2.02)));
      glowLight.color.setHex(0x8cd8ff);
      glowLight.intensity = 2.4 * (1 - p * 0.4);
      updateStars(ship.position, arriveDir, 2.0 * (1 - p * 0.75), Math.sin(p * Math.PI) * 0.8);
      const flare = Math.max(0, 1 - p / 0.35);
      flash.visible = flare > 0.02;
      flash.position.copy(arriveStart).lerp(arriveEnd, 0.25);
      flash.scale.setScalar(1.9 * flare + 0.25);
      flashMat.opacity = flare * 0.8;
      return true;
    }

    // Phase 6: Continuous banked landing curve lining up directly onto restPos/restQuat (8.85 -> 11.05s)
    if (t < LAND_END) {
      const p = (t - WARP_IN_END) / (LAND_END - WARP_IN_END);
      const eased = 1 - Math.pow(1 - p, 2.2);
      landCurve.getPointAt(eased, tmpPos);
      landCurve.getTangentAt(eased, tmpTan);
      const bank = Math.sin(Math.min(p / 0.72, 1) * Math.PI) * 0.34;
      orientBow(tmpQ, tmpTan, bank);
      const align = smoothstep((p - 0.65) / 0.35);
      tmpQ2.copy(tmpQ).slerp(restQuat, align);
      ship.position.copy(tmpPos);
      const damp = Math.min(1, (1 - Math.exp(-dt * 9)) + smoothstep((p - 0.85) / 0.15));
      ship.quaternion.slerp(tmpQ2, damp);
      ship.scale.copy(restScale);
      ship.visible = true;
      root.userData.setWarpGlow(Math.max(0, (1 - p) * 0.95));
      ship.updateMatrixWorld();
      glowLight.position.copy(ship.localToWorld(aftMid.set(0, 0.42, 2.02)));
      glowLight.color.setHex(0x66ccff);
      glowLight.intensity = (1 - p) * 1.4;
      updateStars(ship.position, arriveDir, 0, 0);
      flash.visible = false;
      return true;
    }

    finish();
    return false;
  }

  let warmed = false;
  function warmup(renderer, camera) {
    if (warmed || active || !renderer?.compile || !camera) return;
    warmed = true;
    const dg = root.userData.distalGlow?.group;
    const prevStars = stars.visible, prevFlash = flash.visible, prevGlow = glowLight.visible, prevDg = dg?.visible;
    stars.visible = true; flash.visible = true; glowLight.visible = true;
    if (dg) dg.visible = true;
    try { renderer.compile(scene, camera); } catch { /* ignore headless/mock */ }
    stars.visible = prevStars; flash.visible = prevFlash; glowLight.visible = prevGlow;
    if (dg) dg.visible = prevDg;
  }

  return {
    engage,
    update,
    warmup,
    cancel: finish,
    isActive: () => active,
    getViewscreenPose: () => (active ? viewscreenPose : null),
    isViewscreenActive: () => Boolean(active && viewscreenPose),
  };
}
