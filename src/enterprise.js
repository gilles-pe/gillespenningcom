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

// Single classic USS Enterprise NCC-1701 (TOS) with optional display stand.
// Starts with a tiny placeholder silhouette; call loadEnterpriseGlb(root) lazily to swap in the GLB.
export function createEnterprise(stand = true) {
  const root = new THREE.Group();
  const ship = new THREE.Group();
  root.add(ship);
  ship.position.y = 0.63;

  const placeholder = new THREE.Group();
  ship.add(placeholder);
  const { blue, red } = buildPlaceholder(placeholder);

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
    glowMats: { bussard: [red], nacelle: [blue] },
    setWarpGlow(level) {
      const k = Math.max(0, level);
      for (const m of root.userData.glowMats.bussard) {
        if (!m?.emissive) continue;
        const base = m.userData.baseEmissive || new THREE.Color(0x983f1d);
        m.emissive.copy(base).lerp(new THREE.Color(0xff8c2b), Math.min(k, 1));
        m.emissiveIntensity = (m.userData.baseIntensity ?? 0.35) + k * 2.4;
      }
      for (const m of root.userData.glowMats.nacelle) {
        if (!m?.emissive) continue;
        const base = m.userData.baseEmissive || new THREE.Color(0x000000);
        m.emissive.copy(base).lerp(new THREE.Color(0x74d4ff), Math.min(k * 0.85, 1));
        m.emissiveIntensity = (m.userData.baseIntensity ?? 0.0) + k * 1.45;
      }
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

    const bussard = [];
    const nacelle = [];
    const meshes = [];
    const clonedMats = new Map();

    model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material) {
        const list = Array.isArray(o.material) ? o.material : [o.material];
        const next = list.map(m => {
          if (['THS', 'TIS', 'TDS', 'TKS'].includes(m.name)) {
            if (!clonedMats.has(m)) {
              const cm = m.clone();
              cm.userData.baseEmissive = cm.emissive ? cm.emissive.clone() : new THREE.Color(0x000000);
              cm.userData.baseIntensity = cm.emissiveIntensity ?? 1;
              clonedMats.set(m, cm);
              if (cm.name === 'THS' || cm.name === 'TIS') bussard.push(cm);
              if (cm.name === 'TDS') nacelle.push(cm);
            }
            return clonedMats.get(m);
          }
          return m;
        });
        o.material = Array.isArray(o.material) ? next : next[0];
      }
      if (tagMesh) tagMesh(o);
      meshes.push(o);
    });

    const { ship, placeholder } = root.userData;
    if (placeholder?.parent) {
      placeholder.parent.remove(placeholder);
      disposeEnterprise(placeholder);
      root.userData.placeholder = null;
    }
    ship.add(model);
    root.userData.glowMats = { bussard, nacelle };
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
// lifts off the shelf pedestal -> flies a 180° banked curve inside the room at true miniature scale ->
// warps out with TOS star streaks -> warps back in from behind the room -> lands softly on the pedestal.
export function createRoomWarp(scene, root) {
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
  const starMat = new THREE.LineBasicMaterial({ color: 0xfff3d4, transparent: true, opacity: 0, depthWrite: false });
  const stars = new THREE.LineSegments(starGeo, starMat);
  stars.visible = false;
  stars.renderOrder = 6;
  scene.add(stars);

  const flashMat = new THREE.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0, depthWrite: false });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.10, 16, 12), flashMat);
  flash.visible = false;
  flash.renderOrder = 7;
  scene.add(flash);

  const glowLight = new THREE.PointLight(0xffb464, 0, 2.2, 1.8);
  glowLight.visible = false;
  scene.add(glowLight);

  let active = false;
  let startTime = 0;
  let onDoneCb = null;

  const restPos = new THREE.Vector3();
  const restQuat = new THREE.Quaternion();
  const restScale = new THREE.Vector3();
  const restLocalPos = ship.position.clone();
  const restLocalQuat = ship.quaternion.clone();
  const restLocalScale = ship.scale.clone();

  let liftPos, outCurve, landCurve, jumpStart, jumpDir, arriveStart, arriveEnd, arriveDir;
  const tmpPos = new THREE.Vector3();
  const tmpTan = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpQ2 = new THREE.Quaternion();
  const sideA = new THREE.Vector3();
  const sideB = new THREE.Vector3();

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

  function engage(onDone) {
    if (active) return false;
    root.updateMatrixWorld(true);
    ship.getWorldPosition(restPos);
    ship.getWorldQuaternion(restQuat);
    ship.getWorldScale(restScale);

    // Reparent ship to world scene while keeping exact miniature scale
    scene.attach(ship);

    // Derive the ship's exact resting forward vector (local -Z) so takeoff and landing
    // curve smoothly out of and back into restQuat with zero spinning in place.
    const restFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(restQuat).setY(0).normalize();

    // About Me room inner space: x in [0.8..3.6], z in [-4.7..-2.5], ceiling at y=2.16
    liftPos = restPos.clone().add(new THREE.Vector3(0.04, 0.28, 0.10));
    jumpStart = new THREE.Vector3(2.48, 1.84, -2.92);
    // Clean RIGHT turn off the shelf away from the back wall into the open room,
    // sweeping across above the desk and lining up cleanly onto jumpStart / jumpDir.
    outCurve = new THREE.CatmullRomCurve3([
      liftPos.clone(),
      new THREE.Vector3(3.42, 1.66, -3.88),
      new THREE.Vector3(2.75, 1.72, -3.22),
      new THREE.Vector3(1.55, 1.78, -3.35),
      new THREE.Vector3(1.45, 1.82, -2.95),
      jumpStart.clone(),
    ]);
    jumpDir = outCurve.getTangent(1).normalize();

    // Warp back in along the EXACT SAME axis (jumpDir) from the opposite side ("once around the world")
    arriveDir = jumpDir.clone();
    arriveStart = jumpStart.clone().addScaledVector(jumpDir, -14.5);
    arriveEnd = jumpStart.clone().addScaledVector(jumpDir, -0.65);
    // Continuous landing curve: enters along arriveDir, banks smoothly toward the shelf,
    // lines up directly behind the pedestal along -restFwd, and glides straight onto restPos.
    const approachBack = restPos.clone().add(new THREE.Vector3(0, 0.24, 0)).addScaledVector(restFwd, -0.44);
    const approachFinal = restPos.clone().add(new THREE.Vector3(0, 0.08, 0)).addScaledVector(restFwd, -0.10);
    landCurve = new THREE.CatmullRomCurve3([
      arriveEnd.clone(),
      new THREE.Vector3(2.65, 1.78, -3.15),
      new THREE.Vector3(2.92, 1.68, -3.85),
      approachBack,
      approachFinal,
      restPos.clone(),
    ]);

    active = true;
    startTime = performance.now();
    onDoneCb = onDone || null;
    glowLight.visible = true;
    return true;
  }

  function update(now) {
    if (!active) return false;
    const t = (now - startTime) / 1000;

    // Phase 1: Unhurried liftoff along resting heading — no spin in place (0.0 -> 1.30s)
    if (t < 1.30) {
      const p = smoothstep(t / 1.30);
      ship.position.lerpVectors(restPos, liftPos, p);
      // Gentle nose-up lift, keeping the natural resting heading
      outCurve.getTangent(0, tmpTan);
      orientBow(tmpQ, tmpTan, 0);
      ship.quaternion.copy(restQuat).slerp(tmpQ, p * 0.25);
      ship.scale.copy(restScale);
      ship.visible = true;
      root.userData.setWarpGlow(p * 0.85);
      glowLight.position.copy(ship.position);
      glowLight.color.setHex(0xffb464);
      glowLight.intensity = p * 1.8;
      updateStars(ship.position, tmpTan, 0, 0);
      flash.visible = false;
      return true;
    }

    // Phase 2: Continuous banked curve through About Me to warp heading (1.30 -> 3.15s)
    if (t < 3.15) {
      const p = (t - 1.30) / 1.85;
      const eased = smoothstep(p);
      outCurve.getPoint(eased, tmpPos);
      outCurve.getTangent(eased, tmpTan);
      const bank = Math.sin(p * Math.PI) * 0.42;
      orientBow(tmpQ, tmpTan, bank);
      if (p < 0.25) {
        // Blend smoothly out of Phase 1's liftoff orientation
        const b = smoothstep(p / 0.25);
        ship.quaternion.copy(restQuat).slerp(tmpQ, 0.25 + b * 0.75);
      } else {
        ship.quaternion.copy(tmpQ);
      }
      ship.position.copy(tmpPos);
      ship.scale.copy(restScale);
      ship.visible = true;
      root.userData.setWarpGlow(0.85 + p * 0.55);
      glowLight.position.copy(ship.position);
      glowLight.color.setHex(0xcbe8ff);
      glowLight.intensity = 1.6 + p * 1.2;
      updateStars(ship.position, tmpTan, 0.14 + p * 0.28, Math.max(0, (p - 0.65) * 0.8));
      flash.visible = false;
      return true;
    }

    // Phase 3: TOS Warp Jump Out along jumpDir (3.15 -> 4.00s)
    if (t < 4.00) {
      const p = (t - 3.15) / 0.85;
      const dist = p * p * p * 18;
      ship.position.copy(jumpStart).addScaledVector(jumpDir, dist);
      orientBow(tmpQ, jumpDir, 0);
      ship.quaternion.copy(tmpQ);
      const shrink = Math.max(0.08, 1 - p * 0.86);
      ship.scale.copy(restScale).multiplyScalar(shrink);
      ship.visible = p < 0.95;
      root.userData.setWarpGlow(1.4 + Math.sin(p * Math.PI) * 1.3);
      glowLight.position.copy(ship.position);
      glowLight.intensity = (1 - p) * 3.6;
      updateStars(jumpStart.clone().addScaledVector(jumpDir, dist * 0.35), jumpDir, 0.45 + p * 2.2, Math.sin(p * Math.PI) * 0.85);
      const flare = Math.max(0, 1 - Math.abs(p - 0.15) / 0.18);
      flash.visible = flare > 0.02;
      flash.position.copy(jumpStart).addScaledVector(jumpDir, 0.35);
      flash.scale.setScalar(0.55 + flare * 1.8);
      flashMat.opacity = flare * 0.78;
      return true;
    }

    // Phase 4: Brief beat + distant arrival spark on the opposite side of the same axis (4.00 -> 4.40s)
    if (t < 4.40) {
      const p = (t - 4.00) / 0.40;
      ship.visible = false;
      glowLight.intensity = 0;
      updateStars(arriveStart, arriveDir, 0, 0);
      const spark = Math.max(0, (p - 0.35) / 0.65);
      flash.visible = spark > 0.02;
      flash.position.copy(arriveStart).lerp(arriveEnd, 0.25);
      flash.scale.setScalar(0.4 + spark * 2.0);
      flashMat.opacity = spark * 0.85;
      return true;
    }

    // Phase 5: Warp-in along the exact same axis (4.40 -> 5.25s)
    if (t < 5.25) {
      const p = (t - 4.40) / 0.85;
      const decel = 1 - Math.pow(1 - p, 3);
      ship.position.lerpVectors(arriveStart, arriveEnd, decel);
      orientBow(tmpQ, arriveDir, 0);
      ship.quaternion.copy(tmpQ);
      ship.scale.copy(restScale).multiplyScalar(0.18 + decel * 0.82);
      ship.visible = true;
      root.userData.setWarpGlow(1.7 * (1 - p * 0.45));
      glowLight.position.copy(ship.position);
      glowLight.color.setHex(0xd4efff);
      glowLight.intensity = 2.8 * (1 - p * 0.4);
      updateStars(ship.position, arriveDir, 2.0 * (1 - p * 0.75), Math.sin(p * Math.PI) * 0.8);
      const flare = Math.max(0, 1 - p / 0.35);
      flash.visible = flare > 0.02;
      flash.position.copy(arriveStart).lerp(arriveEnd, 0.25);
      flash.scale.setScalar(1.9 * flare + 0.25);
      flashMat.opacity = flare * 0.8;
      return true;
    }

    // Phase 6: Continuous banked landing curve lining up directly onto restPos/restQuat (5.25 -> 7.45s)
    if (t < 7.45) {
      const p = (t - 5.25) / 2.20;
      const eased = smoothstep(p);
      landCurve.getPoint(eased, tmpPos);
      landCurve.getTangent(eased, tmpTan);
      const bank = Math.sin(Math.min(p / 0.70, 1) * Math.PI) * -0.28;
      orientBow(tmpQ, tmpTan, bank);
      // Since the final curve segment already glides in along restFwd, a gentle final blend levels pitch cleanly
      const align = smoothstep((p - 0.70) / 0.30);
      tmpQ2.copy(tmpQ).slerp(restQuat, align);
      ship.position.copy(tmpPos);
      ship.quaternion.copy(tmpQ2);
      ship.scale.copy(restScale);
      ship.visible = true;
      root.userData.setWarpGlow(Math.max(0, (1 - p) * 0.95));
      glowLight.position.copy(ship.position);
      glowLight.color.setHex(0xffb464);
      glowLight.intensity = (1 - p) * 1.6;
      updateStars(ship.position, arriveDir, 0, 0);
      flash.visible = false;
      return true;
    }

    finish();
    return false;
  }

  return {
    engage,
    update,
    cancel: finish,
    isActive: () => active,
  };
}
