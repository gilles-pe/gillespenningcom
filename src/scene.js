// The four-room model, built from plain Three.js geometry and canvas textures.
// No external assets: wood, plaster, lettering and picture placeholders are drawn here.
import * as THREE from 'three';
import content from './content.js';

const T = 0.14;                                   // wall thickness
const wallZ = d => -d / 2 + T / 2 + 0.006;        // z of the lettering/pictures, just in front of a back wall of a room of depth d
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const FONT = "'Newsreader Variable', Georgia, serif";
const PETROL = '#12383a', CREAM = '#f6eee3';
const C = {
  wall: 0xf1e7d4, wallGreen: 0xbfc9a8, floor: 0xe5cda5, corridor: 0xdcc39b, base: 0x72877f,
  wood: 0xd9bf93, woodDark: 0xbfa479, cream: 0xf5eee0, glass: 0xe3efe6, brass: 0xb8862f,
  leaf: 0x6f8f4e, leaf2: 0x86a05f, pot: 0xe9dfcf, book: [0xe8dcc6, 0xcdb994, 0x9db0a0, 0xd9c7a8, 0x7f9488],
};
// Slightly different wall tone per room, so the four rooms do not read as copies.
const WALL_TONE = { projects: C.wallGreen, about: 0xf2e8d6, ai: 0xf1e9d9, writing: 0xf4e9d6 };

// Lettering and placeholder texts follow the page language. setModelLanguage() redraws them.
let LANG = 'en';
const modelText = () => content[LANG].model;
export function setModelLanguage(lang) {
  if (!content[lang] || lang === LANG) return;
  LANG = lang; fontRedraws.forEach(f => f());
}

// The floor plan. One table: everything else (floor, walls, door, lettering, pictures,
// furniture, light, hit box, hotspots, camera framing) is derived from these numbers.
//   x, z   side and row (-1 left/back, 1 right/front): which wall faces the corridor, view angle, order
//   w, d   inner size in world units (x and z); h wall height
//   cx, cz world position of the room centre
// Left column outer wall x = -5.2/-4.9, corridor between the columns jogs from x = 0.0 (back) to x = 0.75 (front).
export const ROOMS = {
  projects: { x: -1, z: -1, w: 4.6, d: 2.4, h: 2.1, cx: -2.9, cz: -3.7 },   // gallery, 11.0 m2
  about:    { x:  1, z: -1, w: 3.2, d: 2.6, h: 2.1, cx:  2.2, cz: -3.6 },   // study, smallest, 8.3 m2
  ai:       { x: -1, z:  1, w: 5.0, d: 4.4, h: 1.6, cx: -2.4, cz:  1.3 },   // largest, 22 m2
  writing:  { x:  1, z:  1, w: 3.4, d: 4.0, h: 1.6, cx:  3.1, cz:  1.5 },   // lounge, 13.6 m2
};
// Base plate and brass line geometry (world coordinates).
const BASE = { x0: -5.7, x1: 5.3, z0: -5.4, z1: 4.3 };
const CORR = { frontX: 0.75, backX: 0.0, jogZ: -1.7 };                      // corridor centre lines, z of the jog
// Door: a sliding pane in the corridor-side wall, near the front end of that wall.
function doorSpec(r) {
  const dw = clamp(r.d * 0.36, 1.0, 1.6), z0 = r.d / 2 - dw / 2 - 0.35;
  const room = z0 - dw / 2 + r.d / 2 - T / 2 - 0.03;                      // free run towards the back wall
  return { dw, z0, slide: Math.min(dw * 0.9, room) };
}

// ---- Image slots -----------------------------------------------------------
// One table for every picture surface. A file public/slots/<name>.webp replaces the
// placeholder automatically. Keep this table in sync with DESIGN.md ("Image slots").
// size = world units [width, height] of the picture; its ratio is the slot's aspect ratio.
export const SLOTS = [
  { name: 'ai-wall-1',        room: 'ai',       size: [1.3, 0.65],  text: 'Consultation', tint: '#b9c7a6' },
  { name: 'ai-wall-2',        room: 'ai',       size: [1.3, 0.65],  text: 'Progress',     tint: '#cdd9c0' },
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
        k.strokeStyle = `rgba(130,98,58,${a * 0.8})`; k.lineWidth = 0.6 + r() * 1.4; k.beginPath();
        for (let x = 0; x <= 512; x += 16) { const yy = y + Math.sin(x * 0.018 + ph2) * amp; x ? k.lineTo(x, yy) : k.moveTo(x, yy); }
        k.stroke();
      }
      if (planks) { k.fillStyle = 'rgba(110,80,46,0.26)'; k.fillRect(0, y0, 512, 1.5); }
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
    for (let i = 0; i < 2600; i++) { k.fillStyle = `rgba(${r() < 0.5 ? '130,115,90' : '255,255,255'},${0.025 + r() * 0.04})`; k.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3); }
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
  k.font = `600 ${fs}px ${FONT}`; k.fillText(modelText().slots[slot.name] ?? slot.text, w / 2, h * 0.36, w * 0.9);
}
// Returns a material that shows the placeholder now and public/slots/<name>.webp if it exists.
function slotMaterial(name) {
  const slot = SLOT[name], aspect = slot.size[0] / slot.size[1];
  const long = 512, c = aspect >= 1 ? canvas(long, Math.round(long / aspect)) : canvas(Math.round(long * aspect), long);
  const placeholder = tex(c);
  whenFont(() => { drawPlaceholder(slot, c); placeholder.needsUpdate = true; });
  // Unlit and not tone-mapped: a picture shows its own colours, as bright as the file, whatever the light rig does (D-016: light, friendly look).
  const m = new THREE.MeshBasicMaterial({ map: placeholder, toneMapped: false });
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
function wallPicture(parent, name, x, y, d, frameColor = C.woodDark) {
  const [w, h] = SLOT[name].size, f = 0.035, WALL_FRONT = wallZ(d);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * f, h + 2 * f, 0.03), wood(frameColor));
  frame.position.set(x, y, WALL_FRONT + 0.015); frame.castShadow = true; parent.add(frame);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), slotMaterial(name));
  pic.position.set(x, y, WALL_FRONT + 0.032); pic.name = name; parent.add(pic);
  return pic;
}

// ---- Room names on the back wall ---------------------------------------------
const LETTERING = {                        // plane height, and drop from the wall top to the plane centre
  projects: { h: 0.58, drop: 0.42 },
  about:    { h: 0.52, drop: 0.34 },
  ai:       { h: 0.44, drop: 0.23 },
  writing:  { h: 0.42, drop: 0.23 },
};
function lettering(parent, id, r) {
  const L = { ...LETTERING[id], x: 0, w: clamp(r.w * 0.75, 2.4, 3.4), color: PETROL };
  L.y = r.h - L.drop;
  const c = canvas(2048, Math.round(2048 * L.h / L.w)), k = c.getContext('2d');
  const t = tex(c);
  whenFont(() => {
    const text = modelText().rooms[id];
    k.clearRect(0, 0, c.width, c.height);
    let fs = c.height * 0.66; k.font = `600 ${fs}px ${FONT}`;
    const tw = k.measureText(text).width; if (tw > c.width * 0.96) { fs *= c.width * 0.96 / tw; k.font = `600 ${fs}px ${FONT}`; }
    k.fillStyle = L.color; k.textAlign = 'center'; k.textBaseline = 'alphabetic';
    k.fillText(text, c.width / 2, c.height * 0.5 + fs * 0.32);
    t.needsUpdate = true;
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  m.position.set(L.x, L.y, wallZ(r.d) + 0.003); m.renderOrder = 2; parent.add(m);
}

// ---- Window light on the floor ---------------------------------------------------
// Drawn at 128 px per world unit, so stripes keep the same width, spacing and slant in every room.
function windowLight(parent, r) {
  const pw = r.w * 0.92, pd = r.d * 0.92, S = 128;
  const c = canvas(Math.round(pw * S), Math.round(pd * S)), k = c.getContext('2d');
  if ('filter' in k) k.filter = 'blur(10px)';
  k.fillStyle = 'rgba(255,246,222,0.55)';
  const skew = 1.5 * S * pd / 4;                                          // slant over the full depth
  const widths = [70, 60, 50];
  for (let x = 40, i = 0; x < c.width; x += 165, i++) {
    const wd = widths[i % 3];
    k.beginPath(); k.moveTo(x, 0); k.lineTo(x + wd, 0); k.lineTo(x + wd + skew, c.height); k.lineTo(x + skew, c.height); k.fill();
  }
  const lightMat = new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, opacity: 0.5, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), lightMat);
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
function glassDoor(h, x, z, dw) {
  const dh = h - 0.25;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, dh, dw),
    new THREE.MeshStandardMaterial({ color: C.glass, transparent: true, opacity: 0.8, roughness: 0.35, metalness: 0.05, depthWrite: false }));
  door.position.set(x, 0.02 + dh / 2, z); door.renderOrder = 3;
  const fm = new THREE.MeshStandardMaterial({ color: 0xe9dfcf, roughness: 0.6 }), t = 0.05, d = 0.07;
  [[d, t, dw + t, 0, dh / 2], [d, t, dw + t, 0, -dh / 2], [d, dh, t, dw / 2, 0], [d, dh, t, -dw / 2, 0], [d, dh, t * 0.5, 0, 0]].forEach(([bx, by, bz, zz, yy]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), fm); f.position.set(0, yy, zz); door.add(f);
  });
  return door;
}

// Brass path as a polyline with rounded corners: straight runs and real bends, like a taped floor line.
function brassPath(pts, radius) {
  const path = new THREE.CurvePath(), V = (x, z) => new THREE.Vector3(x, 0.02, z);
  let cur = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], n = pts[i + 1];
    let end = b;
    if (n) {
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(n[0] - b[0], n[1] - b[1]);
      const rr = Math.min(radius, l1 / 2, l2 / 2);
      const p1 = [b[0] + (a[0] - b[0]) / l1 * rr, b[1] + (a[1] - b[1]) / l1 * rr];
      const p2 = [b[0] + (n[0] - b[0]) / l2 * rr, b[1] + (n[1] - b[1]) / l2 * rr];
      path.add(new THREE.LineCurve3(V(...cur), V(...p1)));
      path.add(new THREE.QuadraticBezierCurve3(V(...p1), V(...b), V(...p2)));
      cur = p2; continue;
    }
    path.add(new THREE.LineCurve3(V(...cur), V(...end)));
  }
  return path;
}

export function buildScene() {
  const scene = new THREE.Scene();
  const rooms = {};

  // Base and corridor
  const BW = BASE.x1 - BASE.x0, BD = BASE.z1 - BASE.z0, bx = (BASE.x0 + BASE.x1) / 2, bz = (BASE.z0 + BASE.z1) / 2;
  box(scene, BW, 0.6, BD, bx, -0.66, bz, mat(C.base, { roughness: 0.95 }));
  box(scene, BW - 0.5, 0.06, BD - 0.5, bx, -0.06, bz, floorMat(C.corridor, [(BW - 0.5) / 3.5, (BD - 0.5) / 1.9]));

  // Brass line: one dim path per room, plus a bright one drawn on demand
  const brassDim = mat(C.brass, { metalness: 0.6, roughness: 0.4 });
  const brassHot = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xd9a03c, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.3 });
  const SEG = 120;                                    // tube segments; viewer.js draws hotSegs of them (36 indices each)

  for (const [id, r] of Object.entries(ROOMS)) {
    const g = new THREE.Group();
    g.position.set(r.cx, 0, r.cz); scene.add(g);
    const { w, d } = r, wallM = wallMat(WALL_TONE[id]), sideM = wallMat(C.wall);
    const floor = box(g, w, 0.08, d, 0, -0.02, 0, floorMat(C.floor, [w / 2, d / 1.2]));
    box(g, w + T, r.h, T, 0, 0, -d / 2, wallM);                               // back wall
    box(g, T, r.h, d, r.x * w / 2, 0, 0, sideM);                              // outer side wall
    box(g, T, 0.34, d, -r.x * w / 2, 0, 0, sideM);                            // kerb to the corridor
    box(g, w, 0.34, T, 0, 0, d / 2, sideM);                                   // front kerb
    const ds = doorSpec(r);
    const door = glassDoor(r.h, -r.x * (w / 2 - 0.02), ds.z0, ds.dw); g.add(door);
    const light = new THREE.PointLight(0xffc98a, 0, Math.max(w, d) * 1.7, 1.6); light.position.set(0, 1.5, d * 0.05); g.add(light);

    const hit = new THREE.Mesh(new THREE.BoxGeometry(w, r.h, d), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = r.h / 2; hit.userData.room = id; g.add(hit);

    // path: entrance (front edge) -> front corridor -> [jog] -> door
    const doorX = r.cx - r.x * (w / 2 + 0.08), doorZ = r.cz + ds.z0;
    const via = r.z > 0 ? [] : [[CORR.frontX, CORR.jogZ], [CORR.backX, CORR.jogZ]];
    const lane = r.z > 0 ? CORR.frontX : CORR.backX;
    const curve = brassPath([[CORR.frontX, BASE.z1 - 0.3], ...via, [lane, doorZ], [doorX, doorZ]], 0.32);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, 0.022, 6), brassDim));
    const hotGeo = new THREE.TubeGeometry(curve, SEG, 0.04, 6); hotGeo.setDrawRange(0, 0);
    scene.add(new THREE.Mesh(hotGeo, brassHot));

    windowLight(g, r);
    lettering(g, id, r);
    rooms[id] = { ...r, id, group: g, floor, door, light, hit, hotGeo, hotSegs: SEG, hotCount: SEG * 6 * 6,
      doorZ: ds.z0, doorSlide: ds.slide,
      center: new THREE.Vector3(r.cx, 0.5, r.cz), labelAt: new THREE.Vector3(r.cx, r.h + 0.35, r.cz - d / 2), open: 0, glow: 0 };
    furnish(id, g, r);
  }
  // Outline of the whole model, for the camera: base corners plus the top of every room.
  const outline = [];
  for (const y of [-0.96, 0]) for (const x of [BASE.x0, BASE.x1]) for (const z of [BASE.z0, BASE.z1]) outline.push(new THREE.Vector3(x, y, z));
  for (const r of Object.values(ROOMS)) for (const sx of [-1, 1]) for (const sz of [-1, 1]) outline.push(new THREE.Vector3(r.cx + sx * r.w / 2, r.h, r.cz + sz * r.d / 2));
  return { scene, rooms, outline, center: new THREE.Vector3(bx, 0.3, bz) };
}

// Furniture positions, in room coordinates (origin = room centre). Shared by furnish() and HOTSPOTS.
function layout(id) {
  const { w, d } = ROOMS[id], back = -d / 2;
  if (id === 'projects') {
    const pitch = 1.1, z = back + 0.42, xs = [0, 1, 2, 3].map(n => (n - 1.5) * pitch);
    return { xs, z, spotZ: z + 0.6 };
  }
  if (id === 'about') {
    const shelfW = 1.2;
    return { desk: [-0.35, 0.3], shelf: [w / 2 - 0.15 - shelfW / 2, back + 0.25, shelfW], pic: [-0.65, 1.12] };
  }
  if (id === 'ai') return { desk: [0.1, 0.1], pics: [-0.9, 0.9] };
  const shelfW = 1.5;                                                   // writing
  return { table: [0, 0.5], shelf: [w / 2 - 0.15 - shelfW / 2, back + 0.25, shelfW], lamp: [-w / 2 + 0.36, back + 0.68] };
}

function furnish(id, g, r) {
  const w = wood(), cream = mat(C.cream), L = layout(id), { w: RW, d: RD } = r;
  if (id === 'projects') {
    L.xs.forEach((x, i) => {
      box(g, 0.78, 0.5, 0.6, x, 0, L.z, w);
      const face = slotMaterial(`projects-board-${i + 1}`);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.54, 0.04), [cream, cream, cream, cream, face, cream]);
      b.position.set(x, 0.86, L.z); b.rotation.x = -0.18; b.castShadow = true; g.add(b);
    });
    plant(g, -RW / 2 + 0.4, RD / 2 - 0.45, 1.1);
  }
  if (id === 'about') {
    const [dx, dz] = L.desk;
    box(g, 1.3, 0.07, 0.7, dx, 0.62, dz, w);
    [[-0.58, -0.28], [0.58, -0.28], [-0.58, 0.28], [0.58, 0.28]].forEach(([x, z]) => box(g, 0.07, 0.62, 0.07, dx + x, 0, dz + z, w));
    box(g, 0.45, 0.03, 0.33, dx - 0.3, 0.69, dz, cream).rotation.y = 0.1;
    box(g, 0.45, 0.03, 0.33, dx + 0.18, 0.69, dz, cream).rotation.y = -0.1;
    box(g, 0.5, 0.45, 0.5, dx, 0, dz - 0.75, cream); box(g, 0.5, 0.5, 0.1, dx, 0.45, dz - 0.97, cream);
    cyl(g, 0.03, 0.08, 0.3, dx + 0.45, 0.69, dz - 0.15, mat(C.brass, { metalness: 0.5 }));
    cyl(g, 0.1, 0.17, 0.14, dx + 0.45, 0.97, dz - 0.15, new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd48a, emissiveIntensity: 0.8 }));
    shelf(g, L.shelf[0], L.shelf[1], L.shelf[2], 1.45);
    wallPicture(g, 'about-wall-1', L.pic[0], L.pic[1], RD);
    plant(g, RW / 2 - 0.4, RD / 2 - 0.4, 1.0);
  }
  if (id === 'ai') {
    const [dx, dz] = L.desk;
    const desk = cyl(g, 1.05, 1.05, 0.6, dx, 0, dz, w, 32); desk.scale.z = 0.45;
    box(g, 0.42, 0.02, 0.3, dx - 0.2, 0.6, dz + 0.02, mat(0xd8d8d4)); box(g, 0.42, 0.28, 0.02, dx - 0.2, 0.62, dz - 0.12, mat(0xd8d8d4)).rotation.x = -0.2;
    box(g, 0.3, 0.1, 0.22, dx + 0.5, 0.6, dz + 0.05, mat(C.book[2]));
    box(g, 0.45, 0.5, 0.45, dx, 0, dz - 0.85, cream);
    wallPicture(g, 'ai-wall-1', L.pics[0], 0.8, RD);
    wallPicture(g, 'ai-wall-2', L.pics[1], 0.8, RD);
    plant(g, -RW / 2 + 0.4, -RD / 2 + 0.5, 1.2); plant(g, RW / 2 - 0.5, RD / 2 - 0.8, 0.9);
  }
  if (id === 'writing') {
    const [tx, tz] = L.table;
    cyl(g, 1.15, 1.15, 0.02, tx, 0.06, tz, mat(0xe9dcc6), 40);                // rug
    cyl(g, 0.52, 0.52, 0.07, tx, 0.4, tz, w, 32); cyl(g, 0.28, 0.34, 0.4, tx, 0, tz, w);
    box(g, 0.46, 0.015, 0.35, tx - 0.05, 0.47, tz, cream);                    // paper on the table
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33), slotMaterial('writing-table-1'));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(tx - 0.05, 0.4865, tz); g.add(sheet);
    cyl(g, 0.02, 0.02, 0.26, tx + 0.28, 0.47, tz - 0.05, mat(0x333333)); cyl(g, 0.05, 0.05, 0.14, tx + 0.28, 0.7, tz - 0.05, mat(0x333333));
    [[-1.0, 0.0, 0.5], [1.0, -0.15, -0.6]].forEach(([x, z, ry]) => {
      const a = new THREE.Group(); a.position.set(tx + x, 0, tz + z); a.rotation.y = ry; g.add(a);
      box(a, 0.6, 0.38, 0.6, 0, 0, 0, cream); box(a, 0.6, 0.42, 0.14, 0, 0.38, -0.23, cream);
    });
    cyl(g, 0.02, 0.02, 1.25, L.lamp[0], 0, L.lamp[1], mat(C.brass, { metalness: 0.5 }));
    cyl(g, 0.12, 0.22, 0.2, L.lamp[0], 1.2, L.lamp[1], new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd48a, emissiveIntensity: 0.9 }));
    shelf(g, L.shelf[0], L.shelf[1], L.shelf[2], 1.0);
    plant(g, -RW / 2 + 0.4, RD / 2 - 0.5, 1.1);
  }
}

// Clickable things inside each room: [label key, link, x, y, z] in room coordinates.
// Label texts are in content.js (model.spots). A null link is a placeholder without destination.
// Positions come from the same layout() as the furniture, so they follow the room's size.
const LAY = Object.fromEntries(Object.keys(ROOMS).map(id => [id, layout(id)]));
export const HOTSPOTS = {
  ai: [
    ['wimmelbild', 'https://wimmelbild.gillespenning.com/en/', LAY.ai.desk[0] - 0.4, 0.62, LAY.ai.desk[1] + 0.8],
    ['monitor', 'https://ai.gillespenning.com/', LAY.ai.desk[0] + 0.5, 0.3, LAY.ai.desk[1] + 1.3],
  ],
  // Under the plinths, so the pictures on the boards stay visible.
  projects: [
    ['wimmelbild', 'https://wimmelbild.gillespenning.com/en/', LAY.projects.xs[0], 0.1, LAY.projects.spotZ],
    ['monitorShort', 'https://ai.gillespenning.com/', LAY.projects.xs[1], 0.1, LAY.projects.spotZ],
    ['docease', null, LAY.projects.xs[2], 0.1, LAY.projects.spotZ],
    ['elbstrand', null, LAY.projects.xs[3], 0.1, LAY.projects.spotZ],
  ],
  writing: [
    ['signal', 'https://medtechsignal.substack.com/', LAY.writing.shelf[0], 0.3, LAY.writing.shelf[1] + 0.3],
    ['speaking', '#speaking', LAY.writing.table[0] - 0.1, 0.62, LAY.writing.table[1] + 0.55],
    ['linkedin', 'https://www.linkedin.com/in/gillespenning/', LAY.writing.table[0] + 0.7, 0.45, LAY.writing.table[1] + 1.0],
    ['bluesky', 'https://bsky.app/profile/gillespe.bsky.social', LAY.writing.table[0] + 1.0, 0.3, LAY.writing.table[1] - 0.1],
  ],
  about: [
    ['story', '#about', LAY.about.desk[0], 0.9, LAY.about.desk[1] + 0.4],
    ['linkedin', 'https://www.linkedin.com/in/gillespenning/', LAY.about.shelf[0], 0.3, LAY.about.shelf[1] + 0.3],
  ],
};
