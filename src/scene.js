// The four-room model, built from plain Three.js geometry and canvas textures.
// No external assets: wood, plaster, lettering and picture placeholders are drawn here.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import content, { LINKS } from './content.js';
import { PATHS } from './icons.js';

const T = 0.14;                                   // wall thickness
const wallZ = d => -d / 2 + T / 2 + 0.006;        // z of the lettering/pictures, just in front of a back wall of a room of depth d
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const FONT = "'Source Serif 4', Georgia, serif";
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
// Recess in the underside of the base (a small cellar, see buildCellar). Centre and inner size in world units.
const CELLAR = { x: 0.5, z: -0.6, w: 1.8, d: 1.3 };
const CORR = { frontX: 0.75, backX: 0.0, jogZ: -1.7 };                      // corridor centre lines, z of the jog
// Door: a sliding pane in the corridor-side wall. The AI room uses a 3-panel frosted glass partition where the front panel slides.
function doorSpec(r, id) {
  if (id === 'ai') {
    const dw = r.d / 3, z0 = r.d / 2 - dw / 2;
    return { dw, z0, slide: dw * 0.92 };
  }
  const dw = clamp(r.d * 0.36, 1.0, 1.6), z0 = r.d / 2 - dw / 2 - 0.35;
  const room = z0 - dw / 2 + r.d / 2 - T / 2 - 0.03;                      // free run towards the back wall
  return { dw, z0, slide: Math.min(dw * 0.9, room) };
}

// ---- Image slots -----------------------------------------------------------
// One table for every picture surface. A file public/slots/<name>.webp replaces the
// placeholder automatically. Keep this table in sync with DESIGN.md ("Image slots").
// size = world units [width, height] of the picture; its ratio is the slot's aspect ratio.
export const SLOTS = [
  { name: 'ai-wall-1',        room: 'ai',       size: [1.04, 0.52], text: 'Wimmelbild',   tint: '#b9c7a6' },
  { name: 'ai-wall-2',        room: 'ai',       size: [0.76, 0.38], text: 'AI Monitor',   tint: '#cdd9c0' },
  { name: 'projects-board-1', room: 'projects', size: [0.72, 0.54], text: 'Wimmelbild',   tint: '#b9c7a6' },
  { name: 'projects-board-2', room: 'projects', size: [0.72, 0.54], text: 'AI Monitor',   tint: '#b9c7a6' },
  { name: 'projects-board-3', room: 'projects', size: [0.72, 0.54], text: 'Praxisfaden',  tint: '#b9c7a6' },
  { name: 'projects-board-4', room: 'projects', size: [0.72, 0.54], text: 'Elbstrand',    tint: '#b9c7a6' },
  { name: 'writing-table-1',  room: 'writing',  size: [0.44, 0.33], text: 'MedTech Signal', tint: '#d9c7a8' },
  { name: 'writing-shelf-1',  room: 'writing',  size: [0.36, 0.48], text: 'Speaking',     tint: '#d9c7a8' },
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
  pic.position.set(x, y, WALL_FRONT + 0.032); pic.name = name; pic.userData.frame = frame; parent.add(pic);
  return pic;
}
// Freestanding framed picture with kickstand, e.g. for standing on a shelf or desk.
function standingPicture(parent, name, x, y, z, rotY = 0, frameColor = C.woodDark) {
  const [w, h] = SLOT[name].size, f = 0.024;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; parent.add(g);
  const tilt = new THREE.Group(); tilt.rotation.x = -0.14; g.add(tilt);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * f, h + 2 * f, 0.02), wood(frameColor));
  frame.position.set(0, (h + 2 * f) / 2, 0); frame.castShadow = true; tilt.add(frame);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), slotMaterial(name));
  pic.position.set(0, (h + 2 * f) / 2, 0.011); pic.name = name; pic.userData.frame = frame; tilt.add(pic);
  const leg = box(g, 0.018, h * 0.65, 0.012, 0, h * 0.3, -h * 0.11, wood(frameColor));
  leg.rotation.x = 0.26;
  return { pick: [pic, frame, leg], anchor: pic };
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
// Two-door cabinet below + two open bookshelves above, with standing and stacked books.
function bookStack(parent, x, y, z, count, imperfect, rand) {
  const palette = [0xebe3d3, 0xd8cbb4, 0xe4dac7, 0xc9d0bd, 0xcebda0];
  let cy = y;
  for (let i = 0; i < count; i++) {
    const bw = 0.16 + rand() * 0.04, bh = 0.036 + rand() * 0.014, bd = 0.13 + rand() * 0.03;
    const b = box(parent, bw, bh, bd, x + (imperfect ? (rand() - 0.5) * 0.025 : 0), cy, z + (imperfect ? (rand() - 0.5) * 0.02 : 0), mat(palette[(i + 1) % palette.length]));
    b.rotation.y = (rand() - 0.5) * (imperfect ? 0.18 : 0.05);
    cy += bh;
  }
}

function cabinetShelf(parent, x, z, w, h, rotY = 0, { imperfect = false, skipUpperRight = false } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0.06, z); g.rotation.y = rotY; parent.add(g);
  const rand = rng(Math.round((x * 131 + z * 73 + w * 41) * 10) + 19);
  const depth = 0.34, sideT = 0.035, topT = 0.035, backT = 0.025;
  const cabH = Math.min(0.42, h * 0.36);
  // Outer cabinet carcass
  box(g, w, h, backT, 0, 0, -depth / 2 + backT / 2, wood());
  box(g, sideT, h, depth, -w / 2 + sideT / 2, 0, 0, wood());
  box(g, sideT, h, depth, w / 2 - sideT / 2, 0, 0, wood());
  box(g, w, topT, depth, 0, h - topT, 0, wood());
  box(g, w - 2 * sideT, 0.04, depth - backT, 0, 0, backT / 2, wood());
  // Lower closed cabinet with two flush wooden doors
  box(g, w - 2 * sideT, 0.03, depth - backT, 0, cabH - 0.03, backT / 2, wood());
  const doorW = (w - 2 * sideT - 0.03) / 2;
  const doorH = cabH - 0.075;
  for (const sx of [-1, 1]) {
    box(g, doorW, doorH, 0.022, sx * (doorW / 2 + 0.008), 0.04, depth / 2 - 0.018, skipUpperRight ? wood() : wood(C.woodDark));
    if (skipUpperRight) box(g, 0.012, 0.065, 0.012, sx * 0.044, cabH * 0.47, depth / 2 - 0.002, mat(C.brass, { metalness: 0.55 }));
  }
  // Open shelves above the cabinet
  const innerW = w - 2 * sideT;
  const openH = h - cabH - topT;
  const midY = cabH + openH * 0.5;
  box(g, innerW, 0.028, depth - backT, 0, midY, backT / 2, wood());
  if (skipUpperRight) {
    // One dark inset and an off-centre partition distinguish this personal
    // cabinet from the open writing shelf and frame the social plaques.
    box(g, innerW - 0.02, openH - 0.015, 0.008, 0, cabH, -depth / 2 + backT, mat(0x8fa59a));
    box(g, 0.025, openH * 0.48, depth - backT, -0.18, midY + 0.014, backT / 2, wood());
  }
  const palette = [0xebe3d3, 0x8fa395, 0xd8cbb4, 0x5c7672, 0xcbb693];
  for (const [si, sy] of [[0, cabH], [1, midY + 0.028]]) {
    const availH = (si === 0 ? midY - cabH : h - topT - (midY + 0.028));
    // Left cluster: upright books, slightly imperfect heights and tilt when requested
    let bx = -innerW / 2 + 0.08;
    const nStand = (skipUpperRight && si === 1) ? 3 : w > 1.3 ? 4 : 3;
    for (let i = 0; i < nStand; i++) {
      const bw = 0.042 + rand() * 0.018;
      const bh = Math.min(availH * 0.84, 0.21 + rand() * 0.06);
      const bd = 0.16 + rand() * 0.03;
      const bk = box(g, bw, bh, bd, bx, sy, 0.05 + (rand() - 0.5) * 0.018, mat(palette[(i + si * 2) % palette.length]));
      if (imperfect && i === nStand - 1 && !skipUpperRight) { bk.rotation.z = -0.14; bk.position.x += 0.022; }
      else if (imperfect && !skipUpperRight && rand() > 0.55) { bk.rotation.z = (rand() - 0.5) * 0.06; }
      bx += bw + 0.012;
    }
    // Right cluster: horizontal stacked books (skipped when trophies occupy upper-right)
    if (!(skipUpperRight && si === 1)) bookStack(g, innerW * 0.2, sy, 0.04, si === 0 ? 3 : 2, imperfect, rand);
  }
  if (skipUpperRight) {
    // Small brass globe / paperweight beside the lower shelf stack so the bookshelf feels lived-in
    const gx = innerW * 0.40, gy = cabH;
    cyl(g, 0.036, 0.042, 0.014, gx, gy, 0.05, mat(C.woodDark));
    cyl(g, 0.008, 0.008, 0.045, gx, gy + 0.014, 0.05, mat(C.brass, { metalness: 0.6 }));
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), mat(0x6e8882, { roughness: 0.5 }));
    globe.position.set(gx, gy + 0.095, 0.05); globe.castShadow = true; g.add(globe);
  }
  g.userData.upperY = midY + 0.028;
  return g;
}

// A lighter editorial shelf for Writing & Speaking; the standing talk photo
// remains the hero object on top instead of being lost among tiny props.
function writingDisplayShelf(parent, x, z, w) {
  const g = new THREE.Group(); g.position.set(x, 0.06, z); parent.add(g);
  const oak = wood(), dark = mat(0x82988d, { roughness: 0.9 });
  const depth = 0.32, height = 1.0, side = 0.026;
  for (const sx of [-1, 1]) box(g, side, height, depth, sx * (w / 2 - side / 2), 0, 0, oak);
  for (const y of [0, 0.34, 0.68, height - 0.025]) box(g, w, 0.025, depth, 0, y, 0, oak);
  // Recessed sage back makes a few pale objects readable at room scale.
  box(g, w - 2 * side, 0.67, 0.012, 0, 0.34, -depth / 2 + 0.006, dark);
  // The upper bay is intentionally open around the photo.
  const palette = [0xebe3d3, 0xc9d0bd, 0x5c7672, 0xd8cbb4];
  for (let i = 0; i < 4; i++) box(g, 0.047, 0.23 - (i % 2) * 0.025, 0.18,
    -w / 2 + 0.13 + i * 0.055, 0.365, 0.015, mat(palette[i]));
  for (let i = 0; i < 3; i++) box(g, 0.17 - i * 0.015, 0.028, 0.19,
    w / 2 - 0.21, 0.365 + i * 0.032, 0.02, mat(palette[(i + 1) % palette.length]));
  // One concealed base shelf, not another pair of prominent cupboard doors.
  box(g, w - 2 * side, 0.18, 0.26, 0, 0.04, -0.02, wood(C.woodDark));
  return g;
}

// Satin glass door with a thin frame. viewer.js slides it along z via door.position.z.
function glassDoor(h, x, z, dw, { frame = 0xe9dfcf, dh = h - 0.25, y0 = 0.02, middle = true } = {}) {
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.035, dh, dw),
    new THREE.MeshStandardMaterial({ color: C.glass, transparent: true, opacity: 0.78, roughness: 0.35, metalness: 0.05, depthWrite: false }));
  door.position.set(x, y0 + dh / 2, z); door.renderOrder = 3;
  const fm = new THREE.MeshStandardMaterial({ color: frame, roughness: 0.6 }), t = 0.045, d = 0.06;
  const bars = [[d, t, dw + t, 0, dh / 2], [d, t, dw + t, 0, -dh / 2], [d, dh, t, dw / 2, 0], [d, dh, t, -dw / 2, 0]];
  if (middle) bars.push([d, dh, t * 0.5, 0, 0]);
  bars.forEach(([bx, by, bz, zz, yy]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), fm); f.position.set(0, yy, zz); door.add(f);
  });
  return door;
}

// Three-panel frosted glass partition along the corridor edge of the Operating Room (ai room only).
// The two rear/middle panels are fixed; the front panel slides back smoothly behind the middle one when opened.
function frostedPartition(parent, r, ds) {
  const { d, h, x } = r, px = -x * (r.w / 2 - 0.02), dh = h - 0.14, y0 = 0.06;
  const fm = new THREE.MeshStandardMaterial({ color: 0xece3d3, roughness: 0.55 });
  const paneM = new THREE.MeshStandardMaterial({ color: C.glass, transparent: true, opacity: 0.82, roughness: 0.32, metalness: 0.05, depthWrite: false });
  // Continuous top and bottom horizontal rails along the corridor edge
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.04, d), fm); topRail.position.set(px, y0 + dh, 0); parent.add(topRail);
  const botRail = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.03, d - ds.dw), fm); botRail.position.set(px, y0 + 0.015, -ds.dw / 2); parent.add(botRail);
  for (let i = 0; i < 2; i++) {
    const pz = -d / 2 + ds.dw * (i + 0.5);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.03, dh, ds.dw), paneM);
    pane.position.set(px, y0 + dh / 2, pz); pane.renderOrder = 3; parent.add(pane);
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.065, dh, 0.045), fm);
    mullion.position.set(px, y0 + dh / 2, pz - ds.dw / 2); parent.add(mullion);
  }
  const endMullion = new THREE.Mesh(new THREE.BoxGeometry(0.065, dh, 0.045), fm);
  endMullion.position.set(px, y0 + dh / 2, d / 2 - ds.dw); parent.add(endMullion);
  const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.065, dh, 0.045), fm);
  frontPost.position.set(px, y0 + dh / 2, d / 2 - 0.022); parent.add(frontPost);
  const door = glassDoor(h, px + x * 0.042, ds.z0, ds.dw, { frame: 0xece3d3, dh, y0, middle: false });
  parent.add(door);
  return door;
}

// Brass path as a polyline with rounded corners: straight runs and real bends, like a taped floor line.
function brassPath(pts, radius) {
  const path = new THREE.CurvePath(), V = p => new THREE.Vector3(p[0], p[2] ?? 0.02, p[1]);
  let cur = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], n = pts[i + 1];
    if (n) {
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(n[0] - b[0], n[1] - b[1]);
      const rr = Math.min(radius, l1 / 2, l2 / 2);
      const yA = a[2] ?? 0.02, yB = b[2] ?? 0.02, yN = n[2] ?? 0.02;
      const t1 = l1 > 0 ? rr / l1 : 0, t2 = l2 > 0 ? rr / l2 : 0;
      const p1 = [b[0] + (a[0] - b[0]) * t1, b[1] + (a[1] - b[1]) * t1, yB + (yA - yB) * t1];
      const p2 = [b[0] + (n[0] - b[0]) * t2, b[1] + (n[1] - b[1]) * t2, yB + (yN - yB) * t2];
      path.add(new THREE.LineCurve3(V(cur), V(p1)));
      path.add(new THREE.QuadraticBezierCurve3(V(p1), V(b), V(p2)));
      cur = p2; continue;
    }
    path.add(new THREE.LineCurve3(V(cur), V(b)));
  }
  return path;
}


// ---- The cellar on the underside of the base ------------------------------------------
// A recess cut into the bottom of the base: cream walls, a small light, and a fax machine standing on the "floor"
// (which is the underside of the slab, so the machine hangs downwards and reads upright when the model is turned over).
// Nothing in the normal views can see it. viewer.js and egg.js make it clickable.
const EGG_PAPER = { w: 0.19, h: 0.27 };
function drawPaper(c) {
  const k = c.getContext('2d'), w = c.width, h = c.height;
  k.fillStyle = '#fffdf8'; k.fillRect(0, 0, w, h);
  k.fillStyle = 'rgba(18,56,58,0.18)'; k.fillRect(w * 0.1, h * 0.18, w * 0.8, 2);
  k.fillStyle = PETROL; k.textAlign = 'left'; k.textBaseline = 'alphabetic';
  const fs = w * 0.082; k.font = `600 ${fs}px ${FONT}`;
  const words = (modelText().egg?.note ?? '').split(' '), lines = []; let cur = '';
  for (const wd of words) { const tst = cur ? `${cur} ${wd}` : wd; if (k.measureText(tst).width > w * 0.8 && cur) { lines.push(cur); cur = wd; } else cur = tst; }
  if (cur) lines.push(cur);
  lines.forEach((ln, i) => k.fillText(ln, w * 0.1, h * 0.27 + i * fs * 1.28));
}
function buildCellar(scene, occluders) {
  const H = CELLAR, top = -0.66 + 0.45, bottom = -0.66;               // ceiling and opening of the recess (world y)
  const cream = new THREE.MeshStandardMaterial({ color: C.cream, roughness: 0.95, side: THREE.BackSide, emissive: 0xf3e4c8, emissiveIntensity: 0.25 });
  const lining = new THREE.Mesh(new THREE.BoxGeometry(H.w - 0.004, top - bottom - 0.004, H.d - 0.004), cream);
  lining.position.set(H.x, (top + bottom) / 2 - 0.0, H.z); scene.add(lining);
  // Thin frame around the opening, so it reads as a niche.
  const fm = new THREE.MeshStandardMaterial({ color: C.woodDark, roughness: 0.7 }), ft = 0.05, fd = 0.03;
  for (const [fw, fh, fx, fz] of [[H.w + 2 * ft, fd, H.x, H.z - H.d / 2 - ft / 2], [H.w + 2 * ft, fd, H.x, H.z + H.d / 2 + ft / 2]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(fw, fd, ft), fm); m.position.set(fx, bottom - fd / 2 + 0.002, fz); scene.add(m);
  }
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ft, fd, H.d), fm); m.position.set(H.x + sx * (H.w / 2 + ft / 2), bottom - fd / 2 + 0.002, H.z); scene.add(m);
  }
  const lamp = new THREE.PointLight(0xffe2b0, 3.2, 3.2, 1.4); lamp.position.set(H.x, bottom - 0.12, H.z - 0.15); scene.add(lamp);

  // Everything of the machine is built upright in `g` (y up from the standing surface, front towards +z)
  // and the group is turned over so that it stands on the ceiling of the recess and its front faces world -z.
  const root = new THREE.Group(); root.position.set(H.x, top, H.z + 0.05); root.rotation.x = Math.PI; scene.add(root);
  const g = new THREE.Group(); root.add(g);
  const putty = new THREE.MeshStandardMaterial({ color: 0xdcd5c6, roughness: 0.6 }), dark = new THREE.MeshStandardMaterial({ color: 0x3a403e, roughness: 0.5 });
  const key = new THREE.MeshStandardMaterial({ color: 0xf3ede0, roughness: 0.5 });
  const screen = new THREE.MeshStandardMaterial({ color: 0xa9c4ad, emissive: 0x7fa28a, emissiveIntensity: 0.6, roughness: 0.4 });
  const woodM = wood(C.woodDark);
  const pick = [];
  const add = (geo, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; g.add(o); pick.push(o); return o; };
  const bx = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  add(bx(0.72, 0.2, 0.44), woodM, 0, 0.1, 0);                            // little cabinet
  const bodyY = 0.2, bodyH = 0.16, front = 0.17;
  add(bx(0.54, bodyH, 0.34), putty, 0, bodyY + bodyH / 2, 0);            // body
  add(bx(0.4, 0.1, 0.06), putty, 0, bodyY + bodyH + 0.04, -0.12, -0.3); // rear paper holder
  add(bx(0.19, 0.15, 0.006), new THREE.MeshStandardMaterial({ color: 0xfffdf8, roughness: 0.9 }), 0, bodyY + bodyH + 0.1, -0.165, -0.3); // blank sheet waiting at the back
  const panelY = bodyY + bodyH + 0.012, panelZ = 0.07, tilt = 0.16;      // control panel, tilted towards the user
  add(bx(0.33, 0.012, 0.15), dark, 0.07, panelY, panelZ, tilt);
  const onPanel = (x, dz, h) => [x, panelY + h - Math.sin(tilt) * dz, panelZ + dz];
  add(bx(0.12, 0.014, 0.045), screen, ...onPanel(-0.01, -0.02, 0.012), tilt);
  const dot = new THREE.CylinderGeometry(0.0105, 0.0105, 0.01, 10);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) add(dot, key, ...onPanel(0.105 + c * 0.045, (r - 1.5) * 0.03, 0.01), tilt);
  // handset on a cradle at the left
  add(bx(0.13, 0.03, 0.28), dark, -0.19, bodyY + bodyH + 0.015, 0.0);
  add(bx(0.045, 0.03, 0.26), dark, -0.19, bodyY + bodyH + 0.05, 0.0);
  add(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 16), dark, -0.19, bodyY + bodyH + 0.055, 0.125);
  add(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 16), dark, -0.19, bodyY + bodyH + 0.055, -0.125);
  // paper slot on the front, and the tray below it
  const A = 0.26, slotY = bodyY + 0.075;
  add(bx(0.32, 0.014, 0.012), dark, 0, slotY, front + 0.001);
  const trayLen = 0.22;
  add(bx(0.26, 0.012, trayLen), putty, 0, slotY - Math.sin(A) * trayLen / 2 - 0.008, front + Math.cos(A) * trayLen / 2, A);
  // The sheet: its leading edge (page bottom) is the pivot; the page extends back into the machine.
  const sheetTex = new THREE.CanvasTexture(canvas(512, Math.round(512 * EGG_PAPER.h / EGG_PAPER.w)));
  sheetTex.colorSpace = THREE.SRGBColorSpace; sheetTex.anisotropy = 8;
  whenFont(() => { drawPaper(sheetTex.image); sheetTex.needsUpdate = true; });
  const sg = new THREE.PlaneGeometry(EGG_PAPER.w, EGG_PAPER.h); sg.translate(0, EGG_PAPER.h / 2, 0);
  const sheet = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: sheetTex, emissiveIntensity: 0.35 }));
  sheet.rotation.x = A - Math.PI / 2; g.add(sheet); pick.push(sheet);
  const dir = new THREE.Vector3(0, -Math.sin(A), Math.cos(A)), slot = new THREE.Vector3(0, slotY + 0.004, front);
  const E0 = 0.07, E1 = 0.22;
  const feed = p => sheet.position.copy(slot).addScaledVector(dir, E0 + (E1 - E0) * p);
  feed(0);
  const anchor = new THREE.Object3D(); anchor.position.set(0, 0.3, 0.1); g.add(anchor);
  // `shake` moves the machine (not the sheet's own feed) a little: x/z in metres, roll in radians.
  const shake = (x, z, roll) => { g.position.set(x, 0, z); g.rotation.z = roll; };
  return { pick, occluders, anchor, feed, shake, lamp, center: new THREE.Vector3(H.x, bottom - 0.1, H.z) };
}

export function buildScene() {
  const scene = new THREE.Scene();
  const rooms = {};

  // Base and corridor
  const BW = BASE.x1 - BASE.x0, BD = BASE.z1 - BASE.z0, bx = (BASE.x0 + BASE.x1) / 2, bz = (BASE.z0 + BASE.z1) / 2;
  // The base is a slab with a lower part around a recess on the underside (the cellar, see buildCellar).
  const baseMat = mat(C.base, { roughness: 0.95 }), occluders = [];
  const SLAB = 0.15, LOW = 0.45, lowY = -0.66, H = CELLAR;
  occluders.push(box(scene, BW, SLAB, BD, bx, lowY + LOW, bz, baseMat));
  const hx0 = H.x - H.w / 2, hx1 = H.x + H.w / 2, hz0 = H.z - H.d / 2, hz1 = H.z + H.d / 2;
  occluders.push(
    box(scene, hx0 - BASE.x0, LOW, BD, (BASE.x0 + hx0) / 2, lowY, bz, baseMat),
    box(scene, BASE.x1 - hx1, LOW, BD, (hx1 + BASE.x1) / 2, lowY, bz, baseMat),
    box(scene, H.w, LOW, hz0 - BASE.z0, H.x, lowY, (BASE.z0 + hz0) / 2, baseMat),
    box(scene, H.w, LOW, BASE.z1 - hz1, H.x, lowY, (hz1 + BASE.z1) / 2, baseMat));
  occluders.push(box(scene, BW - 0.5, 0.06, BD - 0.5, bx, -0.06, bz, floorMat(C.corridor, [(BW - 0.5) / 3.5, (BD - 0.5) / 1.9])));

  // Brass line: one dim path per room, plus a bright one drawn on demand
  const brassDim = mat(C.brass, { metalness: 0.6, roughness: 0.4 });
  const brassHot = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xd9a03c, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.3 });
  const SEG = 120;                                    // tube segments; viewer.js draws hotSegs of them (36 indices each)

  const projectPicks = [], trophyPicks = [], storyPicks = [], albumPicks = [];
  for (const [id, r] of Object.entries(ROOMS)) {
    const g = new THREE.Group();
    g.position.set(r.cx, 0, r.cz); scene.add(g);
    const { w, d } = r, wallM = wallMat(WALL_TONE[id]), sideM = wallMat(C.wall);
    const floor = box(g, w, 0.08, d, 0, -0.02, 0, floorMat(C.floor, [w / 2, d / 1.2]));
    const backWall = box(g, w + T, r.h, T, 0, 0, -d / 2, wallM);       // back wall
    if (id === 'about') occluders.push(backWall);
    box(g, T, r.h, d, r.x * w / 2, 0, 0, sideM);                              // outer side wall
    box(g, w, 0.34, T, 0, 0, d / 2, sideM);                                   // front kerb
    const ds = doorSpec(r, id);
    let door;
    if (id === 'ai') {
      door = frostedPartition(g, r, ds);
    } else {
      // Split corridor kerb around the doorway opening so the brass path enters through a true threshold.
      const g0 = ds.z0 - ds.dw / 2, g1 = ds.z0 + ds.dw / 2;
      const len1 = g0 + d / 2, len2 = d / 2 - g1;
      if (len1 > 0.02) box(g, T, 0.34, len1, -r.x * w / 2, 0, (-d / 2 + g0) / 2, sideM);
      if (len2 > 0.02) box(g, T, 0.34, len2, -r.x * w / 2, 0, (g1 + d / 2) / 2, sideM);
      door = glassDoor(r.h, -r.x * (w / 2 - 0.02), ds.z0, ds.dw); g.add(door);
    }
    const light = new THREE.PointLight(0xffc98a, 0, Math.max(w, d) * 1.7, 1.6); light.position.set(0, 1.5, d * 0.05); g.add(light);

    const hit = new THREE.Mesh(new THREE.BoxGeometry(w, r.h, d), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = r.h / 2; hit.userData.room = id; g.add(hit);

    // path: entrance (front edge) -> front corridor -> [jog] -> through doorway onto room floor
    const doorOut = r.cx - r.x * (w / 2 + 0.06), doorIn = r.cx - r.x * (w / 2 - 0.22), doorZ = r.cz + ds.z0;
    const via = r.z > 0 ? [] : [[CORR.frontX, CORR.jogZ], [CORR.backX, CORR.jogZ]];
    const lane = r.z > 0 ? CORR.frontX : CORR.backX;
    const curve = brassPath([[CORR.frontX, BASE.z1 - 0.3], ...via, [lane, doorZ], [doorOut, doorZ, 0.02], [doorIn, doorZ, 0.065]], 0.32);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, 0.022, 6), brassDim));
    const hotGeo = new THREE.TubeGeometry(curve, SEG, 0.04, 6); hotGeo.setDrawRange(0, 0);
    scene.add(new THREE.Mesh(hotGeo, brassHot));

    windowLight(g, r);
    lettering(g, id, r);
    rooms[id] = { ...r, id, group: g, floor, door, light, hit, hotGeo, hotSegs: SEG, hotCount: SEG * 6 * 6,
      doorZ: ds.z0, doorSlide: ds.slide,
      center: new THREE.Vector3(r.cx, 0.5, r.cz), labelAt: new THREE.Vector3(r.cx, r.h + 0.35, r.cz - d / 2), open: 0, glow: 0 };
    const extra = furnish(id, g, r);
    if (extra?.photo) rooms[id].photo = extra.photo;
    if (extra?.speakingPic) rooms[id].speakingPic = extra.speakingPic;
    if (extra?.projectPicks) projectPicks.push(...extra.projectPicks);
    if (extra?.trophyPicks) trophyPicks.push(...extra.trophyPicks);
    if (extra?.storyPicks) storyPicks.push(...extra.storyPicks);
    if (extra?.albumPicks) albumPicks.push(...extra.albumPicks);
  }
  // Outline of the whole model, for the camera: base corners plus the top of every room.
  const outline = [];
  for (const y of [-0.96, 0]) for (const x of [BASE.x0, BASE.x1]) for (const z of [BASE.z0, BASE.z1]) outline.push(new THREE.Vector3(x, y, z));
  for (const r of Object.values(ROOMS)) for (const sx of [-1, 1]) for (const sz of [-1, 1]) outline.push(new THREE.Vector3(r.cx + sx * r.w / 2, r.h, r.cz + sz * r.d / 2));
  const cellar = buildCellar(scene, occluders);
  return { scene, rooms, outline, center: new THREE.Vector3(bx, 0.3, bz), cellar, occluders, photo: rooms.about.photo, speakingPhoto: rooms.writing?.speakingPic, projectPicks, trophyPicks, storyPicks, albumPicks };
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
  if (id === 'ai') return { cart: [-1.80, -1.10], desk: [1.34, -0.06], table: [-0.82, 0.24], rack: [2.04, back + 0.34] };
  const shelfW = 1.5;                                                   // writing
  return { table: [0, 0.5], shelf: [w / 2 - 0.15 - shelfW / 2, back + 0.25, shelfW], lamp: [-w / 2 + 0.36, back + 0.68] };
}

// ---- Detailed props & room assemblies -----------------------------------------------
function enterpriseModel(parent, x, y, z, rotY = -0.5) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; parent.add(g);
  const hull = mat(0xdce1de, { metalness: 0.28, roughness: 0.48 });
  const panel = mat(0xb8c4c2, { metalness: 0.22, roughness: 0.54 });
  const dark = mat(0x425963, { metalness: 0.3, roughness: 0.48 });
  const red = mat(0xc15b47, { emissive: 0x722819, emissiveIntensity: 0.35, roughness: 0.36 });
  const blue = mat(0x61adcc, { emissive: 0x397d9c, emissiveIntensity: 0.55, roughness: 0.36 });
  const gold = mat(0xc59c56, { emissive: 0x704319, emissiveIntensity: 0.2, metalness: 0.45 });
  const brass = mat(C.brass, { metalness: 0.55, roughness: 0.35 });

  // Museum-style display stand and discreet nameplate.
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.018, 0.12, 2, 0.008), wood(C.woodDark));
  base.position.y = 0.009; base.castShadow = true; g.add(base);
  cyl(g, 0.008, 0.009, 0.105, 0, 0.018, 0.025, brass, 12);
  const plaque = box(g, 0.13, 0.004, 0.025, 0, 0.018, 0.045, brass);
  const ship = new THREE.Group(); ship.position.set(0, 0.143, 0); ship.rotation.x = -0.10; g.add(ship);

  // The long, bevelled oval saucer is the defining Sovereign-class silhouette.
  const profile = [[0, -0.011], [0.083, -0.011], [0.102, -0.006], [0.113, 0.001], [0.104, 0.008], [0.075, 0.017], [0, 0.019]];
  const saucer = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), 40), hull);
  saucer.scale.z = 1.48; saucer.position.set(0, 0.008, -0.078); saucer.castShadow = true; ship.add(saucer);
  const inlay = new THREE.Mesh(new THREE.CylinderGeometry(0.073, 0.078, 0.003, 32), panel);
  inlay.scale.z = 1.48; inlay.position.set(0, 0.029, -0.078); ship.add(inlay);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.106, 0.0028, 5, 48), dark);
  rim.rotation.x = Math.PI / 2; rim.scale.y = 1.48; rim.position.set(0, 0.008, -0.078); ship.add(rim);
  const bridge = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 10), hull);
  bridge.scale.set(1, 0.35, 1.45); bridge.position.set(0, 0.036, -0.089); ship.add(bridge);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 8), dark);
  dome.scale.y = 0.4; dome.position.set(0, 0.042, -0.089); ship.add(dome);

  // Tapered engineering hull under the saucer, with a forward glowing deflector.
  const eng = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), hull);
  eng.scale.set(0.049, 0.033, 0.145); eng.position.set(0, -0.019, 0.081); eng.castShadow = true; ship.add(eng);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.018, 0.095), panel);
  spine.position.set(0, 0.009, 0.033); ship.add(spine);
  const deflector = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.009, 18), gold);
  deflector.rotation.x = Math.PI / 2; deflector.position.set(0, -0.02, -0.052); ship.add(deflector);
  const deflectorRim = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.002, 5, 20), dark);
  deflectorRim.position.set(0, -0.02, -0.058); ship.add(deflectorRim);

  for (const sx of [-1, 1]) {
    // Swept pylons leave a clear gap between hull and each long nacelle.
    const shape = new THREE.Shape();
    shape.moveTo(sx * 0.028, 0.07); shape.lineTo(sx * 0.19, 0.15);
    shape.lineTo(sx * 0.19, 0.178); shape.lineTo(sx * 0.035, 0.11); shape.closePath();
    const pylon = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.009, bevelEnabled: false }), panel);
    pylon.rotation.x = Math.PI / 2; pylon.position.y = 0.011; pylon.castShadow = true; ship.add(pylon);
    const nacelle = new THREE.Mesh(new THREE.CapsuleGeometry(0.019, 0.20, 5, 10), hull);
    nacelle.rotation.x = Math.PI / 2; nacelle.position.set(sx * 0.19, 0.042, 0.15); nacelle.castShadow = true; ship.add(nacelle);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.004, 0.165), blue);
    grille.position.set(sx * 0.19, 0.062, 0.16); ship.add(grille);
    const bussard = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 8), red);
    bussard.position.set(sx * 0.19, 0.042, 0.027); ship.add(bussard);
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), blue);
    tail.position.set(sx * 0.19, 0.042, 0.273); ship.add(tail);
    for (let i = 0; i < 5; i++) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.0025, 0.003), dark);
      window.position.set(sx * (0.045 + i * 0.010), 0.026, -0.14 + i * 0.012); ship.add(window);
    }
  }

  const registryCanvas = canvas(512, 128), k = registryCanvas.getContext('2d');
  k.fillStyle = '#dce1de'; k.fillRect(0, 0, 512, 128);
  k.fillStyle = '#34474d'; k.textAlign = 'center'; k.textBaseline = 'middle';
  k.font = '600 47px sans-serif'; k.fillText('NCC-1701-E', 256, 66);
  const registry = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.023), new THREE.MeshBasicMaterial({ map: tex(registryCanvas), toneMapped: false }));
  registry.rotation.x = -Math.PI / 2; registry.position.set(0, 0.033, -0.171); ship.add(registry);

  const anchor = new THREE.Object3D(); anchor.position.set(0, 0.27, 0); g.add(anchor);
  const picks = [];
  ship.traverse(o => { if (o.isMesh) { o.userData.project = 'enterprise'; o.userData.anchor = anchor; picks.push(o); } });
  for (const o of [base, plaque]) { o.userData.project = 'enterprise'; o.userData.anchor = anchor; picks.push(o); }
  return picks;
}

function openLaptop(parent, x, y, z, rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; parent.add(g);
  const body = mat(0xd8d7d0, { roughness: 0.45, metalness: 0.2 });
  const keys = mat(0x3a403e, { roughness: 0.7 });
  const c = canvas(512, 312), k = c.getContext('2d'), t = tex(c);
  whenFont(() => {
    k.fillStyle = '#fbf6ee'; k.fillRect(0, 0, 512, 312);
    k.fillStyle = '#a9792b'; k.fillRect(156, 186, 200, 6);
    k.fillStyle = PETROL; k.textAlign = 'center'; k.textBaseline = 'middle';
    k.font = `600 54px ${FONT}`;
    k.fillText(modelText().spots.story ?? 'My Story', 256, 134, 440);
    t.needsUpdate = true;
  });
  const screen = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  const base = box(g, 0.36, 0.014, 0.25, 0, 0, 0, body);
  const kb = box(g, 0.30, 0.003, 0.12, 0, 0.013, -0.03, keys);
  const lid = new THREE.Group(); lid.position.set(0, 0.014, -0.12); lid.rotation.x = -0.25; g.add(lid);
  const back = box(lid, 0.36, 0.23, 0.012, 0, 0, 0, body);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.195), screen);
  disp.position.set(0, 0.118, 0.007); lid.add(disp);
  const anchor = new THREE.Object3D(); anchor.position.set(0, 0.14, 0); lid.add(anchor);
  const picks = [base, kb, back, disp];
  picks.forEach(m => { m.userData.story = true; m.userData.anchor = anchor; });
  return picks;
}

function deskPhotoAlbum(parent, x, y, z, rotY = -0.22) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; parent.add(g);
  const w = 0.30, h = 0.042, d = 0.36;
  const coverMat = mat(0x203d3b, { roughness: 0.82 });
  const pageMat = mat(0xf4efe4, { roughness: 0.8 });
  const gold = mat(0xb99a60, { metalness: 0.45, roughness: 0.52 });

  const lower = box(g, w + 0.008, 0.005, d + 0.008, 0, 0, 0, coverMat);
  const pages = box(g, w - 0.014, h - 0.011, d - 0.018, 0.004, 0.005, 0, pageMat);
  const spine = box(g, 0.016, h + 0.008, d + 0.012, -w / 2 - 0.002, 0, 0, coverMat);
  for (const sz of [-0.12, -0.085, 0.085, 0.12])
    box(g, 0.018, 0.002, 0.006, -w / 2 - 0.003, h - 0.002, sz, gold);
  for (const py of [0.011, 0.018, 0.025])
    box(g, w - 0.018, 0.001, 0.002, 0.004, py, d / 2 - 0.006, mat(0xd9d0c0));
  const ribbon = box(g, 0.017, 0.002, 0.055, 0.078, 0.006, d / 2 + 0.012, mat(0x789084));

  const c = canvas(512, 640), k = c.getContext('2d'), t = tex(c);
  const coverPhoto = new Image();
  const drawCover = () => {
    k.fillStyle = '#203d3b'; k.fillRect(0, 0, 512, 640);
    const random = rng(406);
    for (let i = 0; i < 2600; i++) {
      k.fillStyle = `rgba(238,228,200,${random() * 0.055})`;
      k.fillRect(random() * 512, random() * 640, 2, 2);
    }
    k.strokeStyle = '#b99a60'; k.lineWidth = 5; k.strokeRect(30, 30, 452, 580);
    k.lineWidth = 2; k.strokeRect(42, 42, 428, 556);
    k.fillStyle = '#efe7d7'; k.textAlign = 'center'; k.textBaseline = 'middle';
    k.font = `600 45px ${FONT}`;
    k.fillText(modelText().spots.album ?? 'Photo Album', 256, 105, 390);
    k.fillStyle = '#efe7d7'; k.fillRect(82, 183, 348, 274);
    if (coverPhoto.naturalWidth) {
      const scale = Math.min(328 / coverPhoto.naturalWidth, 254 / coverPhoto.naturalHeight);
      const pw = coverPhoto.naturalWidth * scale, ph = coverPhoto.naturalHeight * scale;
      k.drawImage(coverPhoto, 92 + (328 - pw) / 2, 193 + (254 - ph) / 2, pw, ph);
    }
    else { k.fillStyle = '#8fa59a'; k.fillRect(92, 193, 328, 254); }
    k.fillStyle = '#b99a60'; k.fillRect(166, 503, 180, 3);
    k.font = '500 24px system-ui, sans-serif';
    k.fillText('GILLES PENNING', 256, 545, 340);
    t.needsUpdate = true;
  };
  whenFont(drawCover);
  coverPhoto.onload = drawCover;
  coverPhoto.src = `${import.meta.env.BASE_URL}album/photo-1.webp`;
  const topMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(w + 0.008, 0.005, d + 0.008), [coverMat, coverMat, topMat, coverMat, coverMat, coverMat]);
  cover.position.set(0, h + 0.002, 0); cover.castShadow = true; g.add(cover);
  for (const cx of [-w / 2 + 0.012, w / 2 - 0.012]) for (const cz of [-d / 2 + 0.012, d / 2 - 0.012])
    box(g, 0.017, 0.002, 0.017, cx, h + 0.005, cz, gold);

  const anchor = new THREE.Object3D(); anchor.position.set(0, h + 0.08, 0); g.add(anchor);
  const picks = [lower, pages, spine, ribbon, cover];
  picks.forEach(m => { m.userData.album = true; m.userData.anchor = anchor; });
  return { picks, anchor };
}

function coffeeMug(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  cyl(g, 0.042, 0.038, 0.088, 0, 0, 0, mat(C.cream), 20);
  cyl(g, 0.035, 0.035, 0.006, 0, 0.083, 0, mat(0x4a3121), 16);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.023, 0.006, 8, 14, Math.PI), mat(C.cream));
  handle.rotation.z = -Math.PI / 2; handle.position.set(0.04, 0.046, 0); g.add(handle);
}

function tableMic(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = -0.35; parent.add(g);
  const dark = mat(0x2e3432, { roughness: 0.5, metalness: 0.25 });
  const meshM = mat(0xc4c9cb, { roughness: 0.4, metalness: 0.55 });
  const brass = mat(C.brass, { roughness: 0.35, metalness: 0.6 });
  cyl(g, 0.065, 0.072, 0.016, 0, 0, 0, dark, 20);
  cyl(g, 0.012, 0.014, 0.13, 0, 0.016, 0, dark, 14);
  cyl(g, 0.016, 0.016, 0.012, 0, 0.125, 0, brass, 14);
  // U-shaped yoke mount
  box(g, 0.09, 0.012, 0.014, 0, 0.145, 0, dark);
  for (const sx of [-1, 1]) box(g, 0.01, 0.075, 0.014, sx * 0.04, 0.155, 0, dark);
  // Tilted condenser mic body & grille capsule
  const head = new THREE.Group(); head.position.set(0, 0.21, 0); head.rotation.x = 0.32; g.add(head);
  cyl(head, 0.028, 0.025, 0.075, 0, -0.04, 0, dark, 18);
  cyl(head, 0.03, 0.03, 0.009, 0, 0.034, 0, brass, 18);
  cyl(head, 0.028, 0.028, 0.056, 0, 0.043, 0, meshM, 18);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), meshM);
  dome.position.set(0, 0.099, 0); dome.castShadow = true; head.add(dome);
}

function caster(parent, x, y, z) {
  cyl(parent, 0.024, 0.024, 0.03, x, y, z, mat(0x3a403e), 12);
}

// Internal glass partition separating the OR from the practice Vorraum inside AI & Digital Health.
// Starts at the middle third (leaving the rear section open so the back wall lettering stays uninterrupted).
function internalGlassWall(g, r) {
  const px = 0.18, dh = r.h - 0.14, y0 = 0.06;
  const fm = new THREE.MeshStandardMaterial({ color: 0xece3d3, roughness: 0.55 });
  const paneM = new THREE.MeshStandardMaterial({ color: C.glass, transparent: true, opacity: 0.68, roughness: 0.25, metalness: 0.05, depthWrite: false });
  const segW = 1.44, zMid = -r.d / 2 + T / 2 + segW;                  // starts at z ≈ -0.69
  const frontEnd = r.d / 2 - T / 2;
  const topLen = frontEnd - zMid;
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, topLen), fm);
  topRail.position.set(px, y0 + dh, zMid + topLen / 2); g.add(topRail);
  const botRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, segW), fm);
  botRail.position.set(px, y0 + 0.015, zMid + segW / 2); g.add(botRail);
  const pane = new THREE.Mesh(new THREE.BoxGeometry(0.024, dh, segW), paneM);
  pane.position.set(px, y0 + dh / 2, zMid + segW / 2); pane.renderOrder = 3; g.add(pane);
  for (const pz of [zMid, zMid + segW, frontEnd]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.055, dh, 0.04), fm);
    post.position.set(px, y0 + dh / 2, pz); g.add(post);
  }
  // Partially slid-open internal glass door leaf next to the doorway
  const leaf = glassDoor(r.h, px - 0.04, zMid + segW - 0.42, 1.24, { frame: 0xece3d3, dh, y0, middle: false });
  g.add(leaf);
}

function officeChair(parent, x, z, rotY = 0, s = 1) {
  const c = new THREE.Group(); c.position.set(x, 0.02, z); c.rotation.y = rotY; c.scale.setScalar(s); parent.add(c);
  const metal = mat(0x3a4240, { roughness: 0.4, metalness: 0.55 });
  const fabric = mat(0x1b3b3d, { roughness: 0.78 });
  const shell = mat(0x28302f, { roughness: 0.6 });
  const brass = mat(C.brass, { roughness: 0.35, metalness: 0.55 });
  // 5-star swivel base + gas lift
  cyl(c, 0.035, 0.042, 0.05, 0, 0.05, 0, metal, 12);
  cyl(c, 0.022, 0.026, 0.34, 0, 0.07, 0, metal, 12);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.022, 0.24), metal);
    arm.position.set(Math.sin(a) * 0.12, 0.048, Math.cos(a) * 0.12);
    arm.rotation.y = a; c.add(arm);
    caster(c, Math.sin(a) * 0.22, 0.024, Math.cos(a) * 0.22);
  }
  // Seat cushion + shell
  box(c, 0.46, 0.03, 0.44, 0, 0.39, 0.01, shell);
  box(c, 0.45, 0.06, 0.43, 0, 0.42, 0.01, fabric);
  // T-armrests
  for (const sx of [-1, 1]) {
    box(c, 0.032, 0.17, 0.032, sx * 0.25, 0.41, 0.01, metal);
    box(c, 0.055, 0.026, 0.24, sx * 0.25, 0.58, 0.02, shell);
  }
  // Curved high backrest, lumbar support, brass spine accent & headrest
  const back = new THREE.Group(); back.position.set(0, 0.43, -0.20); back.rotation.x = -0.10; c.add(back);
  box(back, 0.06, 0.20, 0.03, 0, -0.02, -0.02, brass);
  box(back, 0.40, 0.48, 0.035, 0, 0.08, -0.015, shell);
  box(back, 0.39, 0.46, 0.055, 0, 0.09, 0.015, fabric);
  box(back, 0.24, 0.12, 0.065, 0, 0.58, 0.025, fabric);
}

export function podcastArmchair(parent, x, z, rotY = 0) {
  const chair = new THREE.Group(); chair.position.set(x, 0.02, z); chair.rotation.y = rotY; parent.add(chair);
  // Fine, deterministic leather grain; all detail is local and loads with the scene.
  const grain = canvas(128, 128), ctx = grain.getContext('2d'), random = rng(2817);
  ctx.fillStyle = '#b9b9b9'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 3600; i++) {
    const shade = 150 + Math.floor(random() * 54);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(random() * 128, random() * 128, 1.5, 1.5);
  }
  const texture = tex(grain, { wrap: true, repeat: [2, 2] });
  const outer = mat(0xb7a184, { roughness: 0.76, bumpMap: texture, bumpScale: 0.005, side: THREE.DoubleSide });
  const inner = mat(0xd0bea2, { roughness: 0.81, bumpMap: texture, bumpScale: 0.005, side: THREE.DoubleSide });
  const seat = mat(0xe4d7be, { roughness: 0.85, bumpMap: texture, bumpScale: 0.006 });
  const piping = mat(0x9f8b70, { roughness: 0.83 });
  const frame = wood(C.woodDark);

  // The back and both arms are one continuous upholstered tub. Its inner and
  // outer skins share a curved top profile: high at the back, low at the arms.
  const count = 48, rows = 8, start = -2.12, span = 4.24;
  const topAt = t => 0.615 + 0.31 * Math.pow(Math.max(0, Math.cos(t)), 1.7);
  const point = (t, v, radius) => {
    const r = radius + 0.018 * v;
    return [r * Math.sin(t), 0.285 + (topAt(t) - 0.285) * v, 0.12 - r * Math.cos(t)];
  };
  function skin(radius, material, reverse) {
    const positions = [], uvs = [], indices = [];
    for (let i = 0; i <= count; i++) {
      const u = i / count, t = start + span * u;
      for (let j = 0; j <= rows; j++) {
        const v = j / rows;
        positions.push(...point(t, v, radius)); uvs.push(u * 2, v);
      }
    }
    for (let i = 0; i < count; i++) for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j, b = a + rows + 1;
      indices.push(...(reverse ? [a, a + 1, b, b, a + 1, b + 1] : [a, b, a + 1, b, b + 1, a + 1]));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = mesh.receiveShadow = true; chair.add(mesh);
  }
  skin(0.41, outer, true);
  skin(0.34, inner, false);
  const capPositions = [], capUvs = [], capIndices = [];
  for (let i = 0; i <= count; i++) {
    const u = i / count, t = start + span * u;
    capPositions.push(...point(t, 1, 0.41), ...point(t, 1, 0.34));
    capUvs.push(u * 2, 0, u * 2, 1);
  }
  for (let i = 0; i < count; i++) {
    const a = i * 2;
    capIndices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  const capGeo = new THREE.BufferGeometry();
  capGeo.setAttribute('position', new THREE.Float32BufferAttribute(capPositions, 3));
  capGeo.setAttribute('uv', new THREE.Float32BufferAttribute(capUvs, 2));
  capGeo.setIndex(capIndices); capGeo.computeVertexNormals();
  const cap = new THREE.Mesh(capGeo, outer); cap.castShadow = true; chair.add(cap);
  // Close the exposed front ends of the arms rather than leaving hollow skins.
  for (const t of [start, start + span]) {
    const vertices = [point(t, 0, 0.41), point(t, 1, 0.41), point(t, 1, 0.34), point(t, 0, 0.34)];
    const endGeo = new THREE.BufferGeometry();
    endGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
    endGeo.setIndex([0, 1, 2, 0, 2, 3]); endGeo.computeVertexNormals();
    const end = new THREE.Mesh(endGeo, outer); end.castShadow = true; chair.add(end);
  }

  // A narrow sewn edge follows the silhouette. Two short inner seams suggest
  // shaped upholstery without a busy tufted pattern at overview scale.
  function stitchedLine(points, radius, material) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const line = new THREE.Mesh(new THREE.TubeGeometry(curve, points.length * 3, radius, 5, false), material);
    line.castShadow = true; chair.add(line);
  }
  const topSeam = [];
  for (let i = 0; i <= 32; i++) {
    const t = start + span * i / 32, p = point(t, 1, 0.36);
    topSeam.push([p[0], p[1] + 0.003, p[2]]);
  }
  stitchedLine(topSeam, 0.0045, piping);
  for (const t of [-0.56, 0.56]) {
    stitchedLine([0.18, 0.35, 0.55, 0.75, 0.92].map(v => {
      const p = point(t, v, 0.339);
      return [p[0], p[1], p[2] + 0.003];
    }), 0.0025, piping);
  }

  // Loose seat cushion above a visible walnut underframe.
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.63, 0.08, 0.59, 3, 0.025), frame);
  base.position.set(0, 0.245, 0.035); base.castShadow = true; chair.add(base);
  const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.585, 0.14, 0.60, 4, 0.065), seat);
  cushion.position.set(0, 0.355, 0.065); cushion.castShadow = cushion.receiveShadow = true; chair.add(cushion);
  const frontSeam = new THREE.Mesh(new RoundedBoxGeometry(0.51, 0.008, 0.012, 2, 0.003), piping);
  frontSeam.position.set(0, 0.335, 0.367); chair.add(frontSeam);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.215, 10), frame);
    leg.position.set(sx * 0.24, 0.112, sz * 0.215 + 0.035);
    leg.rotation.z = sx * 0.14; leg.rotation.x = sz * 0.11;
    leg.castShadow = true; chair.add(leg);
  }
}

// The tailored left chair contrasts with the sculptural tub chair on the right.
export function tailoredArmchair(parent, x, z, rotY = 0) {
  const chair = new THREE.Group();
  chair.position.set(x, 0.02, z); chair.rotation.y = rotY; parent.add(chair);

  // A tiny woven bump pattern breaks up the flat surfaces without image assets.
  const weave = canvas(128, 128), ctx = weave.getContext('2d');
  ctx.fillStyle = '#b8b8b8'; ctx.fillRect(0, 0, 128, 128);
  const random = rng(734);
  for (let i = 0; i < 4200; i++) {
    const shade = 140 + Math.floor(random() * 72);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(random() * 128, random() * 128, 1.2, 2.2);
  }
  const bump = tex(weave, { wrap: true, repeat: [2, 2] });
  const shell = mat(0xe4ddce, { roughness: 0.96, bumpMap: bump, bumpScale: 0.006 });
  const seat = mat(0xf0e8d9, { roughness: 0.94, bumpMap: bump, bumpScale: 0.007 });
  const seam = mat(0xc9bda8, { roughness: 0.95 });
  const pillow = mat(0x718c84, { roughness: 0.92, bumpMap: bump, bumpScale: 0.006 });
  const timber = wood(C.woodDark);
  const darkTimber = mat(0x826f59, { roughness: 0.72 });

  function soft(w, h, d, radius, px, py, pz, material, tilt = 0) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), material);
    mesh.position.set(px, py, pz); mesh.rotation.x = tilt;
    mesh.castShadow = mesh.receiveShadow = true; chair.add(mesh);
    return mesh;
  }

  // Four splayed oak legs, with the back pair visible under the open frame.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.029, 0.19, 10), timber);
    leg.position.set(sx * 0.255, 0.105, sz * 0.215);
    leg.rotation.z = sx * 0.12; leg.rotation.x = sz * 0.10;
    leg.castShadow = true; chair.add(leg);
  }
  soft(0.64, 0.075, 0.57, 0.027, 0, 0.22, 0.015, darkTimber);
  soft(0.66, 0.125, 0.60, 0.052, 0, 0.305, 0.015, shell);
  soft(0.505, 0.115, 0.52, 0.05, 0, 0.38, 0.075, seat);
  // The inset line gives the cushion a separate upholstered edge.
  soft(0.48, 0.012, 0.018, 0.005, 0, 0.342, 0.337, seam);

  // Outer back, slightly reclined; a second padded insert and narrow piping
  // read as a sewn chair rather than a solid block of foam.
  soft(0.64, 0.62, 0.17, 0.075, 0, 0.60, -0.275, shell, -0.13);
  soft(0.52, 0.50, 0.05, 0.025, 0, 0.615, -0.171, seam, -0.13);
  soft(0.49, 0.47, 0.073, 0.043, 0, 0.619, -0.137, seat, -0.13);

  for (const sx of [-1, 1]) {
    soft(0.14, 0.31, 0.54, 0.065, sx * 0.325, 0.405, -0.015, shell);
    soft(0.125, 0.037, 0.44, 0.018, sx * 0.325, 0.552, 0.005, seat);
    // Tiny side seam: present up close, quiet at overview scale.
    soft(0.008, 0.15, 0.39, 0.003, sx * 0.398, 0.395, 0.005, seam);
  }
  // A small removable cushion echoes the muted green of the model's base.
  soft(0.265, 0.15, 0.065, 0.037, 0.02, 0.46, -0.098, pillow, -0.09);
}

// 19-inch medical/hospital IT server rack along the back wall of the AI Vorraum.
function itRack(g, x, z, projectPicks = []) {
  const r = new THREE.Group(); r.position.set(x, 0.06, z); g.add(r);
  const dark = mat(0x262c2b, { roughness: 0.6 }), blade = mat(0x1b201f, { roughness: 0.5 });
  const trim = mat(0x3a4240, { roughness: 0.5 }), steel = mat(0xadb3b5, { roughness: 0.35, metalness: 0.6 });
  const W = 0.74, H = 1.16, D = 0.44;
  const backP = box(r, W, H, 0.03, 0, 0, -D / 2 + 0.015, dark);         // back
  for (const sx of [-1, 1]) {
    box(r, 0.03, H, D, sx * (W / 2 - 0.015), 0, 0, dark);               // sides
    box(r, 0.025, H - 0.08, 0.02, sx * (W / 2 - 0.055), 0.04, D / 2 - 0.04, steel); // rails
  }
  box(r, W, 0.04, D, 0, 0, 0, dark);                                    // base
  const topP = box(r, W, 0.04, D, 0, H - 0.04, 0, dark);                // top
  // Stacked 1U/2U blades with status LEDs
  const leds = [0x58c96a, 0x62b8d8, 0xd9a03c, 0x58c96a, 0x62b8d8, 0x58c96a];
  for (let i = 0; i < 6; i++) {
    const by = 0.09 + i * 0.165, bh = i % 2 === 0 ? 0.11 : 0.08;
    const bl = box(r, W - 0.13, bh, D - 0.08, 0, by, 0, i % 2 ? trim : blade);
    projectPicks.push(tagProject(bl, 'rack', r, new THREE.Vector3(0, H * 0.65, 0)));
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.012, 0.01),
      new THREE.MeshStandardMaterial({ color: leds[i], emissive: leds[i], emissiveIntensity: 1.0 }));
    led.position.set(0.20, by + bh * 0.5, D / 2 - 0.032); r.add(led);
  }
  // Subtle tinted front glass door frame
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W - 0.08, H - 0.08, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x2c3635, transparent: true, opacity: 0.25, roughness: 0.2, depthWrite: false }));
  glass.position.set(0, H / 2, D / 2 - 0.012); r.add(glass);
  projectPicks.push(
    tagProject(backP, 'rack', r, new THREE.Vector3(0, H * 0.65, 0)),
    tagProject(topP, 'rack', r, new THREE.Vector3(0, H * 0.65, 0)),
    tagProject(glass, 'rack', r, new THREE.Vector3(0, H * 0.65, 0)),
  );
}

function tagProject(mesh, id, anchorParent, pos) {
  const anchor = new THREE.Object3D(); anchor.position.copy(pos); anchorParent.add(anchor);
  mesh.userData.project = id; mesh.userData.anchor = anchor;
  return mesh;
}

// Small brass-rimmed display trophy / plaque inside the About Me bookshelf for Substack, Bluesky, and LinkedIn.
function trophyPlaque(parent, key, project, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const base = box(g, 0.135, 0.022, 0.072, 0, 0, 0, mat(0x283534, { roughness: 0.55 }));
  const brass = mat(C.brass, { metalness: 0.6, roughness: 0.35 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.16, 0.014), brass);
  plate.position.set(0, 0.098, -0.004); plate.rotation.x = -0.18; plate.castShadow = true; g.add(plate);
  const c = canvas(256, 256), k = c.getContext('2d');
  k.fillStyle = '#fbf6ee'; k.fillRect(0, 0, 256, 256);
  k.strokeStyle = '#a9792b'; k.lineWidth = 8; k.strokeRect(12, 12, 232, 232);
  k.save(); k.translate(64, 48); k.scale(5.3, 5.3); k.fillStyle = PETROL; k.fill(new Path2D(PATHS[key])); k.restore();
  k.fillStyle = '#a9792b'; k.fillRect(64, 206, 128, 6);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.125, 0.14), new THREE.MeshBasicMaterial({ map: tex(c), toneMapped: false }));
  face.position.set(0, 0, 0.008); plate.add(face);
  const anchor = new THREE.Object3D(); anchor.position.set(0, 0.1, 0); g.add(anchor);
  for (const m of [base, plate, face]) { m.userData.project = project; m.userData.anchor = anchor; }
  return [base, plate, face];
}

function operatingRoom(g, L, projectPicks) {
  const cream = mat(C.cream), putty = mat(0xdad4c6, { roughness: 0.6 });
  const steel = mat(0xc6cbcd, { roughness: 0.3, metalness: 0.65 });
  const dark = mat(0x2e3433, { roughness: 0.55 });
  const drape = mat(0x88a496, { roughness: 0.85 });

  // 1. Operating Table + 10 mm Rigid Endoscope with Camera Head
  const op = new THREE.Group(); op.position.set(L.table[0], 0.06, L.table[1]); op.rotation.y = 0.36; g.add(op);
  box(op, 0.78, 0.045, 0.48, 0, 0, 0, putty);
  box(op, 0.22, 0.42, 0.22, 0, 0.045, 0, putty);
  box(op, 1.32, 0.036, 0.38, 0, 0.465, 0, steel);
  box(op, 0.56, 0.075, 0.50, 0, 0.50, 0, cream);                        // center torso cushion
  const headSec = new THREE.Group(); headSec.position.set(-0.28, 0.50, 0); headSec.rotation.z = -0.18; op.add(headSec);
  box(headSec, 0.46, 0.075, 0.50, -0.23, 0, 0, cream);                   // slightly elevated head/back section
  box(op, 0.48, 0.075, 0.48, 0.52, 0.495, 0, cream);                     // leg section
  // Sterile drape & 10 mm rigid endoscope + camera head lying on the middle cushion
  const scopeSet = new THREE.Group(); scopeSet.position.set(0.02, 0.576, 0.02); scopeSet.rotation.y = 0.18; op.add(scopeSet);
  box(scopeSet, 0.46, 0.008, 0.32, 0, 0, 0, drape);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.34, 12), steel);
  shaft.rotation.z = Math.PI / 2; shaft.position.set(0.06, 0.02, 0); shaft.castShadow = true; scopeSet.add(shaft);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.032, 12), steel);
  collar.rotation.z = Math.PI / 2; collar.position.set(-0.11, 0.02, 0); scopeSet.add(collar);
  const lightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.036, 10), steel);
  lightPost.rotation.x = Math.PI / 2; lightPost.position.set(-0.105, 0.02, 0.022); scopeSet.add(lightPost);
  // Ergonomic camera head coupled to the eyepiece
  box(scopeSet, 0.092, 0.032, 0.042, -0.172, 0.008, 0, dark);
  box(scopeSet, 0.018, 0.008, 0.018, -0.162, 0.040, 0, mat(C.brass));
  // Flexible camera cable trailing toward the endoscopic cart
  const cablePts = [
    new THREE.Vector3(-0.22, 0.02, 0), new THREE.Vector3(-0.34, 0.015, -0.06),
    new THREE.Vector3(-0.46, -0.14, -0.20), new THREE.Vector3(-0.72, -0.48, -0.62),
  ];
  op.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts.map(p => p.clone().add(scopeSet.position))), 16, 0.006, 6), dark));

  // 2. Ceiling-suspended dual-wing Surgical Light (Decken-OP-Leuchte mit zwei Flügeln, no floor stand)
  const hubX = L.table[0] - 0.05, hubZ = L.table[1] - 0.12, hubY = 1.48;
  // Overhead cantilever boom anchored cleanly at the top of the back wall above the lettering line
  cyl(g, 0.055, 0.065, 0.04, hubX - 0.55, 1.59, -2.14, putty, 16);
  const railP0 = new THREE.Vector3(hubX - 0.55, 1.62, -2.14), railP1 = new THREE.Vector3(hubX, 1.59, hubZ);
  const railVec = railP1.clone().sub(railP0);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, railVec.length(), 10), putty);
  rail.position.copy(railP0).addScaledVector(railVec, 0.5);
  rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), railVec.clone().normalize());
  rail.castShadow = true; g.add(rail);
  cyl(g, 0.042, 0.042, 0.14, hubX, hubY, hubZ, putty, 18);          // central ceiling swivel column
  const lensM = new THREE.MeshStandardMaterial({ color: 0xfff8e6, emissive: 0xffe4a8, emissiveIntensity: 1.4, roughness: 0.2 });
  const wings = [
    { head: [-0.30, 1.26, 0.18], rot: [0.38, 0.15, -0.24], r: 0.27 },   // primary surgical wing
    { head: [0.34, 1.32, -0.22], rot: [0.34, -0.28, 0.28], r: 0.21 },   // satellite wing
  ];
  for (const w of wings) {
    const hPos = new THREE.Vector3(hubX + w.head[0], w.head[1], hubZ + w.head[2]);
    const elbow = new THREE.Vector3(hubX + w.head[0] * 0.65, hubY - 0.04, hubZ + w.head[2] * 0.65);
    const hubPt = new THREE.Vector3(hubX, hubY + 0.02, hubZ);
    for (const [a, b, rad] of [[hubPt, elbow, 0.015], [elbow, hPos.clone().add(new THREE.Vector3(0, 0.04, 0)), 0.013]]) {
      const v = b.clone().sub(a);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, v.length(), 10), putty);
      seg.position.copy(a).addScaledVector(v, 0.5);
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
      seg.castShadow = true; g.add(seg);
    }
    const lampHead = new THREE.Group(); lampHead.position.copy(hPos); lampHead.rotation.set(...w.rot); g.add(lampHead);
    cyl(lampHead, w.r, w.r * 0.93, 0.052, 0, 0, 0, cream, 26);
    cyl(lampHead, 0.016, 0.018, 0.055, 0, -0.055, 0, drape, 12);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(w.r * 0.18, w.r * 0.18, 0.008, 12), lensM);
      lens.position.set(Math.cos(a) * w.r * 0.54, -0.002, Math.sin(a) * w.r * 0.54); lampHead.add(lens);
    }
  }

  // 3. Small Rolling Drawer Cart (Beistellwagen) flush against the left OR wall
  const dc = new THREE.Group(); dc.position.set(-2.22, 0.06, 0.48); dc.rotation.y = 1.48; g.add(dc);
  for (const [cx, cz] of [[-0.17, -0.13], [0.17, -0.13], [-0.17, 0.13], [0.17, 0.13]]) caster(dc, cx, 0, cz);
  box(dc, 0.44, 0.46, 0.36, 0, 0.03, 0, cream);
  for (let i = 0; i < 3; i++) {
    box(dc, 0.38, 0.11, 0.015, 0, 0.07 + i * 0.135, 0.184, putty);
    box(dc, 0.12, 0.012, 0.012, 0, 0.12 + i * 0.135, 0.194, wood(C.woodDark));
  }

  // 4. Endoscopic Equipment Cart for Rigid Endoscopy + Large Rolling Monitor (Wimmelbild / ai-wall-1)
  const ec = new THREE.Group(); ec.position.set(L.cart[0], 0.06, L.cart[1]); ec.rotation.y = 0.42; g.add(ec);
  for (const [cx, cz] of [[-0.28, -0.20], [0.28, -0.20], [-0.28, 0.20], [0.28, 0.20]]) caster(ec, cx, 0, cz);
  box(ec, 0.68, 0.035, 0.50, 0, 0.03, 0, putty);
  for (const sx of [-0.30, 0.30]) box(ec, 0.035, 0.80, 0.04, sx, 0.065, -0.18, steel);
  for (const sy of [0.24, 0.47, 0.70]) box(ec, 0.62, 0.025, 0.46, 0, sy, 0, putty);
  // CO2 cylinder strapped behind the cart
  cyl(ec, 0.055, 0.055, 0.44, -0.22, 0.065, -0.26, mat(0x7d8884), 14);
  // Insufflator (bottom shelf)
  box(ec, 0.52, 0.13, 0.38, 0, 0.07, 0.02, putty);
  box(ec, 0.48, 0.08, 0.015, 0, 0.095, 0.215, dark);
  // Cold Light Source (middle shelf) with glowing fiber-optic light port
  box(ec, 0.52, 0.13, 0.38, 0, 0.27, 0.02, putty);
  box(ec, 0.48, 0.08, 0.015, 0, 0.295, 0.215, dark);
  const port = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 12),
    new THREE.MeshStandardMaterial({ color: 0xe6f8ff, emissive: 0x9be0ff, emissiveIntensity: 1.1 }));
  port.rotation.x = Math.PI / 2; port.position.set(-0.14, 0.335, 0.225); ec.add(port);
  // Camera Control Unit (upper shelf)
  box(ec, 0.52, 0.13, 0.38, 0, 0.50, 0.02, putty);
  box(ec, 0.48, 0.08, 0.015, 0, 0.525, 0.215, dark);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x9de8a6, emissive: 0x58c96a, emissiveIntensity: 0.9 }));
  led.position.set(0.16, 0.57, 0.224); ec.add(led);
  // Large rolling medical monitor (1.04 x 0.52, 2:1 aspect -> ai-wall-1 / Wimmelbild)
  const [mw, mh] = SLOT['ai-wall-1'].size;
  box(ec, 0.055, 0.24, 0.05, 0, 0.725, -0.14, steel);
  const monBezel = box(ec, mw + 0.05, mh + 0.05, 0.038, 0, 0.78, -0.06, dark);
  box(ec, mw + 0.03, mh + 0.03, 0.022, 0, 0.79, -0.082, putty);
  const monPic = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), slotMaterial('ai-wall-1'));
  monPic.position.set(0, 0.78 + (mh + 0.05) / 2, -0.040); monPic.name = 'ai-wall-1'; ec.add(monPic);
  projectPicks.push(
    tagProject(monPic, 'wimmelbild', ec, monPic.position),
    tagProject(monBezel, 'wimmelbild', ec, monPic.position),
  );
}

function practiceCorner(g, L, projectPicks) {
  const w = wood(), cream = mat(C.cream), dark = mat(0x2e3433, { roughness: 0.5 }), putty = mat(0xdcd6c8);
  // IT server rack against the back-right wall of the Vorraum
  itRack(g, L.rack[0], L.rack[1], projectPicks);
  // Angled consultation / practice desk (AI Monitor on the desk)
  const d = new THREE.Group(); d.position.set(L.desk[0], 0.06, L.desk[1]); d.rotation.y = -0.34; g.add(d);
  box(d, 1.18, 0.055, 0.64, 0, 0.565, 0, w);
  [[-0.53, -0.26], [0.53, -0.26], [-0.53, 0.26], [0.53, 0.26]].forEach(([x, z]) => box(d, 0.055, 0.565, 0.055, x, 0, z, w));
  // Ergonomic office chair behind desk
  officeChair(d, -0.08, -0.60, 0, 0.92);
  // Writing pad / folder on left side of desk
  const pad = box(d, 0.34, 0.018, 0.24, -0.26, 0.62, 0.08, cream); pad.rotation.y = 0.08;
  // Practice desktop monitor (0.76 x 0.38, 2:1 aspect -> ai-wall-2 / AI in Medicine Monitor)
  const mon = new THREE.Group(); mon.position.set(0.20, 0.62, -0.08); mon.rotation.y = 0.14; d.add(mon);
  box(mon, 0.22, 0.014, 0.16, 0, 0, 0, putty);
  box(mon, 0.036, 0.14, 0.028, 0, 0.014, -0.04, putty);
  const [dw, dh] = SLOT['ai-wall-2'].size;
  const monBezel = box(mon, dw + 0.04, dh + 0.04, 0.028, 0, 0.09, -0.02, dark);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(dw, dh), slotMaterial('ai-wall-2'));
  scr.position.set(0, 0.09 + (dh + 0.04) / 2, -0.004); scr.name = 'ai-wall-2'; mon.add(scr);
  projectPicks.push(
    tagProject(scr, 'monitor', mon, scr.position),
    tagProject(monBezel, 'monitor', mon, scr.position),
  );
}

const PROJECT_KEYS = ['wimmelbild', 'monitor', 'praxisfaden', 'elbstrand'];
function furnish(id, g, r) {
  const w = wood(), cream = mat(C.cream), L = layout(id), { w: RW, d: RD } = r;
  if (id === 'projects') {
    const projectPicks = [];
    L.xs.forEach((x, i) => {
      const plinth = box(g, 0.78, 0.5, 0.6, x, 0, L.z, w);
      const face = slotMaterial(`projects-board-${i + 1}`);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.54, 0.04), [cream, cream, cream, cream, face, cream]);
      b.position.set(x, 0.86, L.z); b.rotation.x = -0.18; b.castShadow = true; g.add(b);
      projectPicks.push(
        tagProject(b, PROJECT_KEYS[i], g, b.position),
        tagProject(plinth, PROJECT_KEYS[i], g, b.position),
      );
    });
    plant(g, -RW / 2 + 0.4, RD / 2 - 0.45, 1.1);
    return { projectPicks };
  }
  if (id === 'about') {
    const [dx, dz] = L.desk;
    box(g, 1.3, 0.07, 0.7, dx, 0.62, dz, w);
    [[-0.58, -0.28], [0.58, -0.28], [-0.58, 0.28], [0.58, 0.28]].forEach(([x, z]) => box(g, 0.07, 0.62, 0.07, dx + x, 0, dz + z, w));
    // Open laptop ("My Story"), photo album and coffee mug on the desk (lamp moved onto the shelf)
    const storyPicks = openLaptop(g, dx - 0.24, 0.69, dz + 0.03, 0.14);
    const album = deskPhotoAlbum(g, dx + 0.18, 0.69, dz + 0.07, -0.22);
    coffeeMug(g, dx + 0.39, 0.69, dz - 0.12);
    // Ergonomic office chair behind the desk
    officeChair(g, dx, dz - 0.72, 0, 1);
    // Cabinet bookshelf with imperfect books and Substack / Bluesky / LinkedIn trophies
    const shelfH = 1.18, trophyPicks = [];
    const sh = cabinetShelf(g, L.shelf[0], L.shelf[1], L.shelf[2], shelfH, 0, { imperfect: true, skipUpperRight: true });
    for (const [key, project, tx] of [['substack', 'signal', 0.06], ['bluesky', 'bluesky', 0.25], ['linkedin', 'linkedin', 0.44]]) {
      trophyPicks.push(...trophyPlaque(sh, key, project, tx, sh.userData.upperY, 0.05));
    }
    // On top of the About Me shelf: books with leaning end book, brass lamp, and USS Enterprise-E
    const topPal = [0xebe3d3, 0xd8cbb4, 0xc9d0bd];
    for (let i = 0; i < 3; i++) box(sh, 0.048, 0.23, 0.16, -0.44 + i * 0.056, shelfH, 0.03, mat(topPal[i]));
    const lean = box(sh, 0.044, 0.22, 0.15, -0.22, shelfH, 0.03, mat(0xd8cbb4));
    lean.rotation.z = -0.25;
    cyl(sh, 0.03, 0.08, 0.28, 0.02, shelfH, 0.01, mat(C.brass, { metalness: 0.5 }));
    cyl(sh, 0.1, 0.17, 0.14, 0.02, shelfH + 0.26, 0.01, new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd48a, emissiveIntensity: 0.8 }));
    trophyPicks.push(...enterpriseModel(sh, 0.36, shelfH, 0.02, -1.42));
    const pic = wallPicture(g, 'about-wall-1', L.pic[0], L.pic[1], RD);
    const anchor = new THREE.Object3D(); anchor.position.copy(pic.position); g.add(anchor);
    plant(g, RW / 2 - 0.4, RD / 2 - 0.4, 1.0);
    return { photo: { pick: [pic.userData.frame, pic], anchor }, trophyPicks, storyPicks, albumPicks: album.picks };
  }
  if (id === 'ai') {
    const projectPicks = [];
    internalGlassWall(g, r);
    operatingRoom(g, L, projectPicks);
    practiceCorner(g, L, projectPicks);
    return { projectPicks };
  }
  if (id === 'writing') {
    const projectPicks = [];
    const [tx, tz] = L.table;
    cyl(g, 1.15, 1.15, 0.02, tx, 0.06, tz, mat(0xe9dcc6), 40);                // rug
    cyl(g, 0.52, 0.52, 0.07, tx, 0.4, tz, w, 32); cyl(g, 0.28, 0.34, 0.4, tx, 0, tz, w);
    const paperBase = box(g, 0.46, 0.015, 0.35, tx - 0.05, 0.47, tz, cream);                    // paper on the table
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33), slotMaterial('writing-table-1'));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(tx - 0.05, 0.4865, tz); g.add(sheet);
    projectPicks.push(
      tagProject(sheet, 'signal', g, sheet.position),
      tagProject(paperBase, 'signal', g, sheet.position),
    );
    tableMic(g, tx + 0.28, 0.47, tz - 0.05);
    tailoredArmchair(g, tx - 1.0, tz, 0.5);
    podcastArmchair(g, tx + 1.0, tz - 0.15, -0.6);
    cyl(g, 0.02, 0.02, 1.25, L.lamp[0], 0, L.lamp[1], mat(C.brass, { metalness: 0.5 }));
    cyl(g, 0.12, 0.22, 0.2, L.lamp[0], 1.2, L.lamp[1], new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd48a, emissiveIntensity: 0.9 }));
    writingDisplayShelf(g, L.shelf[0], L.shelf[1], L.shelf[2]);
    const speakingPic = standingPicture(g, 'writing-shelf-1', L.shelf[0] - 0.22, 1.06, L.shelf[1] + 0.02, 0.12);
    plant(g, -RW / 2 + 0.4, RD / 2 - 0.5, 1.1);
    return { projectPicks, speakingPic };
  }
}

// Clickable things inside each room: [label key, link, x, y, z] in room coordinates.
// Label texts are in content.js (model.spots). A null link is a placeholder without destination.
// Positions come from the same layout() as the furniture, so they follow the room's size.
const LAY = Object.fromEntries(Object.keys(ROOMS).map(id => [id, layout(id)]));
export const HOTSPOTS = {
  ai: [
    ['wimmelbild', 'https://wimmelbild.gillespenning.com/en/', LAY.ai.cart[0], 1.46, LAY.ai.cart[1] + 0.1, 'wimmelbild'],
    ['monitor', 'https://ai.gillespenning.com/', LAY.ai.desk[0] + 0.20, 1.16, LAY.ai.desk[1] - 0.06, 'monitor'],
    ['rack', null, LAY.ai.rack[0], 0.9, LAY.ai.rack[1], 'rack'],
  ],
  // Under the plinths, so the pictures on the boards stay visible.
  projects: [
    ['wimmelbild', 'https://wimmelbild.gillespenning.com/en/', LAY.projects.xs[0], 0.1, LAY.projects.spotZ, 'wimmelbild'],
    ['monitorShort', 'https://ai.gillespenning.com/', LAY.projects.xs[1], 0.1, LAY.projects.spotZ, 'monitor'],
    ['praxisfaden', null, LAY.projects.xs[2], 0.1, LAY.projects.spotZ, 'praxisfaden'],
    ['elbstrand', 'https://penning.info/', LAY.projects.xs[3], 0.1, LAY.projects.spotZ, 'elbstrand'],
  ],
  writing: [
    ['signal', 'https://medtechsignal.substack.com/', LAY.writing.table[0] - 0.05, 0.52, LAY.writing.table[1], 'signal'],
    ['speaking', null, LAY.writing.shelf[0] - 0.22, 1.30, LAY.writing.shelf[1] + 0.02, 'speaking'],
  ],
  about: [
    ['photo', null, LAY.about.pic[0], LAY.about.pic[1], -ROOMS.about.d / 2 + 0.1, 'photo'],
    ['story', null, LAY.about.desk[0] - 0.24, 0.85, LAY.about.desk[1] + 0.03, 'story'],
    ['album', null, LAY.about.desk[0] + 0.18, 0.74, LAY.about.desk[1] + 0.07, 'album'],
    ['enterprise', null, LAY.about.shelf[0] + 0.36, 1.35, LAY.about.shelf[1] + 0.02, 'enterprise'],
    ['signal', LINKS.signal, LAY.about.shelf[0] + 0.06, 0.9, LAY.about.shelf[1] + 0.05, 'signal'],
    ['bluesky', LINKS.bluesky, LAY.about.shelf[0] + 0.25, 0.9, LAY.about.shelf[1] + 0.05, 'bluesky'],
    ['linkedin', LINKS.linkedin, LAY.about.shelf[0] + 0.44, 0.9, LAY.about.shelf[1] + 0.05, 'linkedin'],
  ],
};
