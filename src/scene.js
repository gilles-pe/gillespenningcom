// The four-room model, built from plain Three.js geometry and canvas textures.
// No external assets: wood, plaster, lettering and picture placeholders are drawn here.
import * as THREE from 'three';

const W = 4, D = 3.6, G = 1.3, T = 0.14;          // room width, depth, corridor gap, wall thickness
const WALL_FRONT = -D / 2 + T / 2 + 0.006;        // z of the lettering/pictures, just in front of the back wall
const FONT = "'Newsreader Variable', Georgia, serif";
const PETROL = '#12383a', CREAM = '#f6eee3';
const C = {
  wall: 0xefe4d2, wallGreen: 0x8d9a78, floor: 0xd9b382, corridor: 0xc99f6c, base: 0x1f4a47,
  wood: 0xc79a62, woodDark: 0xa97c48, cream: 0xf2e8d8, glass: 0xdcebe0, brass: 0xb8862f,
  leaf: 0x6f8f4e, leaf2: 0x86a05f, pot: 0xe9dfcf, book: [0xe8dcc6, 0xcdb994, 0x9db0a0, 0xd9c7a8, 0x7f9488],
};
// Slightly different wall tone per room, so the four rooms do not read as copies.
const WALL_TONE = { projects: C.wallGreen, about: 0xf0e3cf, ai: 0xeee6d4, writing: 0xf2e5d0 };

export const ROOMS = {
  projects: { x: -1, z: -1, h: 2.1, label: 'Projects' },
  about:    { x:  1, z: -1, h: 2.1, label: 'About Me' },
  ai:       { x: -1, z:  1, h: 1.6, label: 'AI & Digital Health' },
  writing:  { x:  1, z:  1, h: 1.6, label: 'Writing & Speaking' },
};

// ---- Image slots -----------------------------------------------------------
// One table for every picture surface. A file public/slots/<name>.webp replaces the
// placeholder automatically. Keep this table in sync with DESIGN.md ("Image slots").
// size = world units [width, height] of the picture; its ratio is the slot's aspect ratio.
export const SLOTS = [
  { name: 'ai-wall-1',        room: 'ai',       size: [1.2, 0.6],   text: 'Consultation', tint: '#b9c7a6' },
  { name: 'ai-wall-2',        room: 'ai',       size: [1.2, 0.6],   text: 'Progress',     tint: '#cdd9c0' },
  { name: 'projects-board-1', room: 'projects', size: [0.72, 0.54], text: 'Wimmelbild',   tint: '#b9c7a6' },
  { name: 'projects-board-2', room: 'projects', size: [0.72, 0.54], text: 'AI Monitor',   tint: '#b9c7a6' },
  { name: 'projects-board-3', room: 'projects', size: [0.72, 0.54], text: 'DocEase',      tint: '#b9c7a6' },
  { name: 'projects-board-4', room: 'projects', size: [0.72, 0.54], text: 'Elbstrand',    tint: '#b9c7a6' },
  { name: 'writing-table-1',  room: 'writing',  size: [0.44, 0.33], text: 'Writing',      tint: '#d9c7a8' },
  { name: 'about-wall-1',     room: 'about',    size: [0.54, 0.72], text: 'About',        tint: '#b9c7a6' },
];
const SLOT = Object.fromEntries(SLOTS.map(s => [s.name, s]));
const slotUrl = name => `${import.meta.env.BASE_URL}slots/${name}.webp`;

// Fonts: draw with Georgia first, redraw once the page font has loaded.
const fontRedraws = [];
function whenFont(fn) { fn(); fontRedraws.push(fn); }
if (typeof document !== 'undefined' && document.fonts) {
  Promise.all([document.fonts.load(`600 48px ${FONT}`), document.fonts.ready])
    .then(() => fontRedraws.forEach(f => f())).catch(() => {});
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, { repeat, wrap } = {}) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}
// Small deterministic random, so the model looks the same on every load.
function rng(seed) { let a = seed; return () => (a = (a * 1664525 + 1013904223) % 4294967296) / 4294967296; }

// ---- Materials --------------------------------------------------------------
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });

// Wood grain: long wavering lines along the texture's x axis, optional plank joints.
const woodCache = new Map();
function woodMap(base, planks, repeat) {
  const key = `${base}|${planks}`;
  if (!woodCache.has(key)) {
    const c = canvas(512, 512), k = c.getContext('2d'), r = rng(base % 9973 + 7);
    k.fillStyle = '#ffffff'; k.fillRect(0, 0, 512, 512);
    const n = planks ? 4 : 1, ph = 512 / n;
    for (let p = 0; p < n; p++) {
      const y0 = p * ph, tone = 0.93 + r() * 0.07;
      k.fillStyle = `rgb(${255 * tone | 0},${250 * tone | 0},${240 * tone | 0})`; k.fillRect(0, y0, 512, ph);
      for (let i = 0; i < 26; i++) {
        const y = y0 + 3 + r() * (ph - 6), a = 0.05 + r() * 0.09, ph2 = r() * 6, amp = 0.8 + r() * 2.2;
        k.strokeStyle = `rgba(120,78,36,${a})`; k.lineWidth = 0.6 + r() * 1.4; k.beginPath();
        for (let x = 0; x <= 512; x += 16) { const yy = y + Math.sin(x * 0.018 + ph2) * amp; x ? k.lineTo(x, yy) : k.moveTo(x, yy); }
        k.stroke();
      }
      if (planks) { k.fillStyle = 'rgba(90,56,24,0.38)'; k.fillRect(0, y0, 512, 1.5); }
    }
    woodCache.set(key, c);
  }
  return tex(woodCache.get(key), { wrap: true, repeat });
}
const woodMats = new Map();
function wood(color = C.wood) {
  if (!woodMats.has(color)) woodMats.set(color, new THREE.MeshStandardMaterial({ color, map: woodMap(color, false, [1, 1]), roughness: 0.7 }));
  return woodMats.get(color);
}
function floorMat(color, repeat) {
  return new THREE.MeshStandardMaterial({ color, map: woodMap(color, true, repeat), roughness: 0.62, emissive: 0xffb65c, emissiveIntensity: 0 });
}
let plasterMap;
function plaster() {
  if (!plasterMap) {
    const c = canvas(256, 256), k = c.getContext('2d'), r = rng(11);
    k.fillStyle = '#ffffff'; k.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { k.fillStyle = `rgba(${r() < 0.5 ? '120,100,70' : '255,255,255'},${0.025 + r() * 0.04})`; k.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3); }
    plasterMap = tex(c, { wrap: true });
  }
  return plasterMap;
}
const wallMat = color => new THREE.MeshStandardMaterial({ color, map: plaster(), roughness: 0.92 });

// ---- Picture slots ------------------------------------------------------------
function drawPlaceholder(slot, c) {
  const k = c.getContext('2d'), w = c.width, h = c.height;
  k.fillStyle = '#f7f0e2'; k.fillRect(0, 0, w, h);
  k.fillStyle = slot.tint;
  k.beginPath(); k.moveTo(0, h); k.bezierCurveTo(w * 0.27, h * 0.57, w * 0.58, h * 0.86, w, h * 0.63); k.lineTo(w, h); k.fill();
  k.fillStyle = PETROL; k.textAlign = 'center'; k.textBaseline = 'middle';
  const fs = Math.min(w, h) * (w >= h ? 0.2 : 0.16);
  k.font = `600 ${fs}px ${FONT}`; k.fillText(slot.text, w / 2, h * 0.36, w * 0.9);
}
// Returns a material that shows the placeholder now and public/slots/<name>.webp if it exists.
function slotMaterial(name) {
  const slot = SLOT[name], aspect = slot.size[0] / slot.size[1];
  const long = 512, c = aspect >= 1 ? canvas(long, Math.round(long / aspect)) : canvas(Math.round(long * aspect), long);
  const placeholder = tex(c);
  whenFont(() => { drawPlaceholder(slot, c); placeholder.needsUpdate = true; });
  const m = new THREE.MeshStandardMaterial({ map: placeholder, roughness: 0.8 });
  const img = new Image(); img.decoding = 'async';
  img.onload = () => {
    if (!img.naturalWidth) return;
    const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const ia = img.naturalWidth / img.naturalHeight;            // crop to the slot's ratio instead of stretching
    if (ia > aspect) { t.repeat.x = aspect / ia; t.offset.x = (1 - t.repeat.x) / 2; }
    else { t.repeat.y = ia / aspect; t.offset.y = (1 - t.repeat.y) / 2; }
    t.needsUpdate = true; placeholder.dispose(); m.map = t; m.needsUpdate = true;
  };
  img.onerror = () => {};                                       // no file for this slot: keep the placeholder
  img.src = slotUrl(name);
  return m;
}
// Flat picture on a wall, with a thin wooden frame behind it.
function wallPicture(parent, name, x, y, frameColor = C.woodDark) {
  const [w, h] = SLOT[name].size, f = 0.035;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * f, h + 2 * f, 0.03), wood(frameColor));
  frame.position.set(x, y, WALL_FRONT + 0.015); frame.castShadow = true; parent.add(frame);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), slotMaterial(name));
  pic.position.set(x, y, WALL_FRONT + 0.032); pic.name = name; parent.add(pic);
  return pic;
}

// ---- Room names on the back wall ---------------------------------------------
const LETTERING = {                        // x, y, width, height of the plane (room coordinates)
  projects: { x: 0,     y: 1.72, w: 3.0, h: 0.42, color: CREAM },
  about:    { x: 0,     y: 1.8,  w: 2.4, h: 0.40, color: PETROL },
  ai:       { x: 0,     y: 1.38, w: 2.6, h: 0.30, color: PETROL },
  writing:  { x: 0,     y: 1.32, w: 2.6, h: 0.30, color: PETROL },
};
function lettering(parent, id, text) {
  const L = LETTERING[id], c = canvas(2048, Math.round(2048 * L.h / L.w)), k = c.getContext('2d');
  const t = tex(c);
  whenFont(() => {
    k.clearRect(0, 0, c.width, c.height);
    let fs = c.height * 0.66; k.font = `600 ${fs}px ${FONT}`;
    const tw = k.measureText(text).width; if (tw > c.width * 0.96) { fs *= c.width * 0.96 / tw; k.font = `600 ${fs}px ${FONT}`; }
    k.fillStyle = L.color; k.textAlign = 'center'; k.textBaseline = 'alphabetic';
    k.fillText(text, c.width / 2, c.height * 0.5 + fs * 0.32);
    t.needsUpdate = true;
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  m.position.set(L.x, L.y, WALL_FRONT + 0.003); m.renderOrder = 2; parent.add(m);
}

// ---- Window light on the floor ---------------------------------------------------
let lightMat;
function windowLight(parent) {
  if (!lightMat) {
    const c = canvas(512, 512), k = c.getContext('2d');
    if ('filter' in k) k.filter = 'blur(10px)';
    k.fillStyle = 'rgba(255,246,222,0.55)';
    [[40, 70], [210, 60], [370, 50]].forEach(([x, wd]) => {
      k.beginPath(); k.moveTo(x, 0); k.lineTo(x + wd, 0); k.lineTo(x + wd + 190, 512); k.lineTo(x + 190, 512); k.fill();
    });
    lightMat = new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, opacity: 0.5, depthWrite: false });
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.92, D * 0.92), lightMat);
  m.rotation.x = -Math.PI / 2; m.position.y = 0.065; m.renderOrder = 1; parent.add(m);
}

// ---- Geometry helpers --------------------------------------------------------------
function box(parent, w, h, d, x, y, z, m) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y + h / 2, z); mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function cyl(parent, rt, rb, h, x, y, z, m, seg = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y + h / 2, z); mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
// Plant: a pot, thin stems and many small leaves (two instanced meshes per plant).
const leafGeo = new THREE.SphereGeometry(1, 6, 4), stemGeo = new THREE.CylinderGeometry(1, 1, 1, 5);
const leafMat = new THREE.MeshStandardMaterial({ color: C.leaf, roughness: 0.7 });
const stemMat = new THREE.MeshStandardMaterial({ color: 0x6b7f45, roughness: 0.8 });
function plant(parent, x, z, s = 1) {
  cyl(parent, 0.16 * s, 0.12 * s, 0.28 * s, x, 0, z, mat(C.pot));
  const r = rng(Math.round(x * 100 + z * 37) + 5), stems = 7, perStem = 7;
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, stems * perStem);
  const sticks = new THREE.InstancedMesh(stemGeo, stemMat, stems);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qr = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), px = new THREE.Vector3(1, 0, 0);
  let li = 0;
  for (let i = 0; i < stems; i++) {
    const a = (i / stems) * Math.PI * 2 + r() * 0.6, lean = 0.18 + r() * 0.42, len = (0.5 + r() * 0.4) * s;
    const dir = new THREE.Vector3(Math.cos(a) * Math.sin(lean), Math.cos(lean), Math.sin(a) * Math.sin(lean)).normalize();
    const base = new THREE.Vector3(x, 0.27 * s, z);
    q.setFromUnitVectors(up, dir);
    m.compose(base.clone().addScaledVector(dir, len / 2), q, new THREE.Vector3(0.007 * s, len, 0.007 * s)); sticks.setMatrixAt(i, m);
    for (let j = 0; j < perStem; j++) {
      const t = 0.3 + (j / (perStem - 1)) * 0.7, side = j % 2 ? 1 : -1;
      const ld = dir.clone().add(new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(side * 0.9)).normalize();
      qr.setFromUnitVectors(px, ld); qr.multiply(new THREE.Quaternion().setFromAxisAngle(px, r() * 0.8));
      const sz = (0.085 - t * 0.025) * s;
      m.compose(base.clone().addScaledVector(dir, len * t), qr, new THREE.Vector3(sz, 0.006 * s, sz * 0.42));
      leaves.setMatrixAt(li++, m);
    }
  }
  leaves.castShadow = false; sticks.castShadow = false; leaves.frustumCulled = sticks.frustumCulled = false;
  parent.add(sticks, leaves);
}
function shelf(parent, x, z, w, h, rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  box(g, w, h, 0.32, 0, 0, 0, wood());
  const rows = Math.floor(h / 0.36);
  for (let r = 0; r < rows; r++) {
    box(g, w - 0.1, 0.27, 0.05, 0, 0.07 + r * 0.36, 0.15, wood(C.woodDark));
    let bx = -w / 2 + 0.12;
    while (bx < w / 2 - 0.14) {
      const bw = 0.05 + ((bx * 37 + r * 11) % 5 + 5) % 5 * 0.012;
      const bh = 0.17 + ((bx * 53 + r * 7) % 4 + 4) % 4 * 0.02;
      box(g, bw, bh, 0.05, bx, 0.07 + r * 0.36, 0.19, mat(C.book[Math.abs(Math.round(bx * 9 + r)) % 5]));
      bx += bw + 0.012;
    }
  }
}

// Satin glass door with a thin frame. viewer.js slides it along z via door.position.z.
function glassDoor(h, x, z) {
  const dh = h - 0.25, dw = 1.5;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, dh, dw),
    new THREE.MeshStandardMaterial({ color: C.glass, transparent: true, opacity: 0.8, roughness: 0.35, metalness: 0.05, depthWrite: false }));
  door.position.set(x, 0.02 + dh / 2, z); door.renderOrder = 3;
  const fm = new THREE.MeshStandardMaterial({ color: 0xe9dfcf, roughness: 0.6 }), t = 0.05, d = 0.07;
  [[d, t, dw + t, 0, dh / 2], [d, t, dw + t, 0, -dh / 2], [d, dh, t, dw / 2, 0], [d, dh, t, -dw / 2, 0], [d, dh, t * 0.5, 0, 0]].forEach(([bx, by, bz, zz, yy]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), fm); f.position.set(0, yy, zz); door.add(f);
  });
  return door;
}

export function buildScene() {
  const scene = new THREE.Scene();
  const rooms = {};

  // Base and corridor
  const BW = 2 * W + G + 1.6, BD = 2 * D + G + 1.6;
  box(scene, BW, 0.6, BD, 0, -0.66, 0, mat(C.base, { roughness: 0.95 }));
  box(scene, BW - 0.5, 0.06, BD - 0.5, 0, -0.06, 0, floorMat(C.corridor, [3, 5])).material.emissiveIntensity = 0;

  // Brass line: one dim path per room, plus a bright one drawn on demand
  const brassDim = mat(C.brass, { metalness: 0.6, roughness: 0.4 });
  const brassHot = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xd9a03c, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.3 });

  for (const [id, r] of Object.entries(ROOMS)) {
    const g = new THREE.Group();
    const cx = r.x * (G / 2 + W / 2), cz = r.z * (G / 2 + D / 2);
    g.position.set(cx, 0, cz); scene.add(g);
    const wallM = wallMat(WALL_TONE[id]), sideM = wallMat(C.wall);
    const floor = box(g, W, 0.08, D, 0, -0.02, 0, floorMat(C.floor, [2, 3]));
    box(g, W + T, r.h, T, 0, 0, -D / 2, wallM);                               // back wall
    box(g, T, r.h, D, r.x * W / 2, 0, 0, sideM);                              // outer side wall
    box(g, T, 0.34, D, -r.x * W / 2, 0, 0, sideM);                            // kerb to the corridor
    box(g, W, 0.34, T, 0, 0, D / 2, sideM);                                   // front kerb
    const door = glassDoor(r.h, -r.x * (W / 2 - 0.02), 0.2); g.add(door);
    const light = new THREE.PointLight(0xffc98a, 0, 7, 1.6); light.position.set(0, 1.5, 0.2); g.add(light);

    const hit = new THREE.Mesh(new THREE.BoxGeometry(W, r.h, D), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = r.h / 2; hit.userData.room = id; g.add(hit);

    // path: entrance -> corridor -> door
    const doorX = cx - r.x * (W / 2 + 0.05);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.02, BD / 2 - 0.3), new THREE.Vector3(0, 0.02, cz + 1.6),
      new THREE.Vector3(r.x * 0.12, 0.02, cz + 0.7), new THREE.Vector3(doorX, 0.02, cz + 0.2),
    ], false, 'catmullrom', 0.4);
    const SEG = 80;
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, 0.022, 6), brassDim));
    const hotGeo = new THREE.TubeGeometry(curve, SEG, 0.04, 6); hotGeo.setDrawRange(0, 0);
    scene.add(new THREE.Mesh(hotGeo, brassHot));

    windowLight(g);
    lettering(g, id, r.label);
    rooms[id] = { ...r, id, group: g, floor, door, light, hit, hotGeo, hotCount: SEG * 6 * 6,
      center: new THREE.Vector3(cx, 0.5, cz), labelAt: new THREE.Vector3(cx, r.h + 0.35, cz - D / 2), open: 0, glow: 0 };
    furnish(id, g, r);
  }
  return { scene, rooms };
}

function furnish(id, g, r) {
  const w = wood(), cream = mat(C.cream);
  if (id === 'projects') {
    [1, 2, 3, 4].forEach(n => {
      const x = -1.38 + (n - 1) * 0.92;
      box(g, 0.78, 0.5, 0.6, x, 0, -0.9, w);
      const face = slotMaterial(`projects-board-${n}`);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.54, 0.04), [cream, cream, cream, cream, face, cream]);
      b.position.set(x, 0.86, -0.9); b.rotation.x = -0.18; b.castShadow = true; g.add(b);
    });
    plant(g, -1.6, 1.2, 1.1);
  }
  if (id === 'about') {
    box(g, 1.7, 0.07, 0.8, -0.3, 0.62, 0.2, w);
    [[-1.05, -0.1], [0.45, -0.1], [-1.05, 0.5], [0.45, 0.5]].forEach(([x, z]) => box(g, 0.07, 0.62, 0.07, x, 0, z, w));
    box(g, 0.5, 0.03, 0.36, -0.55, 0.69, 0.2, cream).rotation.y = 0.1;
    box(g, 0.5, 0.03, 0.36, -0.03, 0.69, 0.2, cream).rotation.y = -0.1;
    box(g, 0.5, 0.45, 0.5, -0.3, 0, -0.6, cream); box(g, 0.5, 0.5, 0.1, -0.3, 0.45, -0.82, cream);
    cyl(g, 0.03, 0.08, 0.3, 0.35, 0.69, 0.05, mat(C.brass, { metalness: 0.5 }));
    cyl(g, 0.1, 0.17, 0.14, 0.35, 0.97, 0.05, new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd48a, emissiveIntensity: 0.8 }));
    shelf(g, 1.2, -D / 2 + 0.25, 1.6, 1.45);
    wallPicture(g, 'about-wall-1', -0.45, 1.12);
    plant(g, -1.6, -1.3, 1.3);
  }
  if (id === 'ai') {
    const desk = cyl(g, 1.0, 1.0, 0.6, 0.1, 0, 0.5, w, 32); desk.scale.z = 0.42;
    box(g, 0.42, 0.02, 0.3, -0.1, 0.6, 0.5, mat(0xd8d8d4)); box(g, 0.42, 0.28, 0.02, -0.1, 0.62, 0.36, mat(0xd8d8d4)).rotation.x = -0.2;
    box(g, 0.3, 0.1, 0.22, 0.6, 0.6, 0.5, mat(C.book[2]));
    box(g, 0.45, 0.5, 0.45, 0.1, 0, -0.35, cream);
    wallPicture(g, 'ai-wall-1', -0.75, 0.82);
    wallPicture(g, 'ai-wall-2', 0.75, 0.82);
    plant(g, -1.65, -1.2, 1.2); plant(g, 1.55, 0.9, 0.9);
  }
  if (id === 'writing') {
    cyl(g, 1.35, 1.35, 0.02, -0.1, 0.06, 0.35, mat(0xe9dcc6), 40);            // rug
    cyl(g, 0.6, 0.6, 0.07, -0.1, 0.4, 0.35, w, 32); cyl(g, 0.3, 0.36, 0.4, -0.1, 0, 0.35, w);
    box(g, 0.46, 0.015, 0.35, -0.2, 0.47, 0.35, cream);                       // paper on the table
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33), slotMaterial('writing-table-1'));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(-0.2, 0.4865, 0.35); g.add(sheet);
    cyl(g, 0.02, 0.02, 0.26, 0.2, 0.47, 0.3, mat(0x333333)); cyl(g, 0.05, 0.05, 0.14, 0.2, 0.7, 0.3, mat(0x333333));
    [[-1.0, -0.35, 0.5], [0.95, 0.05, -0.6]].forEach(([x, z, ry]) => {
      const a = new THREE.Group(); a.position.set(x, 0, z); a.rotation.y = ry; g.add(a);
      box(a, 0.6, 0.38, 0.6, 0, 0, 0, cream); box(a, 0.6, 0.42, 0.14, 0, 0.38, -0.23, cream);
    });
    cyl(g, 0.02, 0.02, 1.25, -1.6, 0, -0.9, mat(C.brass, { metalness: 0.5 }));
    cyl(g, 0.12, 0.22, 0.2, -1.6, 1.2, -0.9, new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd48a, emissiveIntensity: 0.9 }));
    shelf(g, 1.1, -D / 2 + 0.25, 1.6, 1.0);
    plant(g, 1.6, -1.25, 1.1);
  }
}

// Clickable things inside each room: [label, link, x, y, z] in room coordinates.
export const HOTSPOTS = {
  ai: [
    ['Wimmelbild', 'https://wimmelbild.gillespenning.com/en/', 0, 0.62, 1.0],
    ['AI in Medicine Monitor', 'https://ai.gillespenning.com/', 0, 0.3, 1.0],
  ],
  projects: [
    ['Wimmelbild', 'https://wimmelbild.gillespenning.com/en/', -1.38, 1.0, -0.9],
    ['AI Monitor', 'https://ai.gillespenning.com/', -0.46, 1.3, -0.9],
    ['DocEase', null, 0.46, 1.0, -0.9],
    ['Elbstrand', null, 1.38, 1.3, -0.9],
  ],
  writing: [
    ['MedTech Signal', 'https://medtechsignal.substack.com/', 1.1, 0.8, -D / 2 + 0.3],
    ['Speaking topics', '#writing', 0.1, 0.95, 0.35],
    ['LinkedIn', 'https://www.linkedin.com/in/gillespenning/', 1.25, 0.95, 0.9],
  ],
  about: [
    ['My story', '#about', -0.3, 0.95, 0.2],
    ['LinkedIn', 'https://www.linkedin.com/in/gillespenning/', 1.2, 1.0, -D / 2 + 0.3],
  ],
};
