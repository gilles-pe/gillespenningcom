// The four-room model, built from plain Three.js geometry.
import * as THREE from 'three';

const W = 4, D = 3.6, G = 1.3, T = 0.14;          // room width, depth, corridor gap, wall thickness
const C = {
  wall: 0xefe4d2, wallGreen: 0x8d9a78, floor: 0xd9b382, corridor: 0xc99f6c, base: 0x1f4a47,
  wood: 0xc79a62, woodDark: 0xa97c48, cream: 0xf2e8d8, glass: 0xcfe3d6, brass: 0xb8862f,
  leaf: 0x6f8f4e, pot: 0xe9dfcf, book: [0xe8dcc6, 0xcdb994, 0x9db0a0, 0xd9c7a8, 0x7f9488],
};

export const ROOMS = {
  projects: { x: -1, z: -1, h: 2.1, label: 'Projects' },
  about:    { x:  1, z: -1, h: 2.1, label: 'About Me' },
  ai:       { x: -1, z:  1, h: 1.6, label: 'AI & Digital Health' },
  writing:  { x:  1, z:  1, h: 1.6, label: 'Writing & Speaking' },
};

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
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
function plant(parent, x, z, s = 1) {
  cyl(parent, 0.16 * s, 0.12 * s, 0.28 * s, x, 0, z, mat(C.pot));
  const leaf = mat(C.leaf);
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 10, 8), leaf);
    const a = i * 2.4, r = 0.05 + 0.03 * i;
    m.position.set(x + Math.cos(a) * r * s, (0.4 + i * 0.11) * s, z + Math.sin(a) * r * s);
    m.scale.set(1, 0.6, 0.5); m.rotation.y = a; m.castShadow = true; parent.add(m);
  }
}
function shelf(parent, x, z, w, h, rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; parent.add(g);
  box(g, w, h, 0.32, 0, 0, 0, mat(C.wood));
  const rows = Math.floor(h / 0.36);
  for (let r = 0; r < rows; r++) {
    box(g, w - 0.1, 0.27, 0.05, 0, 0.07 + r * 0.36, 0.15, mat(C.woodDark));
    let bx = -w / 2 + 0.12;
    while (bx < w / 2 - 0.14) {
      const bw = 0.05 + ((bx * 37 + r * 11) % 5 + 5) % 5 * 0.012;
      const bh = 0.17 + ((bx * 53 + r * 7) % 4 + 4) % 4 * 0.02;
      box(g, bw, bh, 0.05, bx, 0.07 + r * 0.36, 0.19, mat(C.book[Math.abs(Math.round(bx * 9 + r)) % 5]));
      bx += bw + 0.012;
    }
  }
}
function textBoard(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384;
  const k = c.getContext('2d');
  k.fillStyle = '#f7f0e2'; k.fillRect(0, 0, 512, 384);
  k.fillStyle = '#b9c7a6'; k.beginPath(); k.moveTo(0, 384); k.bezierCurveTo(140, 220, 300, 330, 512, 240); k.lineTo(512, 384); k.fill();
  k.fillStyle = '#12383a'; k.font = '600 72px Georgia, serif'; k.textAlign = 'center'; k.fillText(text, 256, 150);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildScene() {
  const scene = new THREE.Scene();
  const rooms = {};

  // Base and corridor
  const BW = 2 * W + G + 1.6, BD = 2 * D + G + 1.6;
  box(scene, BW, 0.6, BD, 0, -0.66, 0, mat(C.base, { roughness: 0.95 }));
  box(scene, BW - 0.5, 0.06, BD - 0.5, 0, -0.06, 0, mat(C.corridor));

  // Brass line: one dim path per room, plus a bright one drawn on demand
  const brassDim = mat(C.brass, { metalness: 0.6, roughness: 0.4 });
  const brassHot = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xd9a03c, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.3 });

  for (const [id, r] of Object.entries(ROOMS)) {
    const g = new THREE.Group();
    const cx = r.x * (G / 2 + W / 2), cz = r.z * (G / 2 + D / 2);
    g.position.set(cx, 0, cz); scene.add(g);
    const wallM = mat(id === 'projects' ? C.wallGreen : C.wall);
    const floor = box(g, W, 0.08, D, 0, -0.02, 0, mat(C.floor, { emissive: 0xffb65c, emissiveIntensity: 0 }));
    box(g, W + T, r.h, T, 0, 0, -D / 2, wallM);                               // back wall
    box(g, T, r.h, D, r.x * W / 2, 0, 0, mat(C.wall));                        // outer side wall
    box(g, T, 0.34, D, -r.x * W / 2, 0, 0, mat(C.wall));                      // kerb to the corridor
    box(g, W, 0.34, T, 0, 0, D / 2, mat(C.wall));                             // front kerb
    const door = box(g, 0.06, r.h - 0.25, 1.5, -r.x * (W / 2 - 0.02), 0.02, 0.2,
      new THREE.MeshStandardMaterial({ color: C.glass, transparent: true, opacity: 0.72, roughness: 0.5 }));
    door.castShadow = false;
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

    rooms[id] = { ...r, id, group: g, floor, door, light, hit, hotGeo, hotCount: SEG * 6 * 6,
      center: new THREE.Vector3(cx, 0.5, cz), labelAt: new THREE.Vector3(cx, r.h + 0.35, cz - D / 2), open: 0, glow: 0 };
    furnish(id, g, r);
  }
  return { scene, rooms };
}

function furnish(id, g, r) {
  const wood = mat(C.wood), cream = mat(C.cream);
  if (id === 'projects') {
    ['DocEase', 'Elbstrand'].forEach((name, i) => {
      const x = -0.9 + i * 1.5;
      box(g, 1.0, 0.5, 0.7, x, 0, -0.9, wood);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.62, 0.04), [cream, cream, cream, cream, new THREE.MeshStandardMaterial({ map: textBoard(name), roughness: 0.8 }), cream]);
      b.position.set(x, 0.86, -0.9); b.rotation.x = -0.18; b.castShadow = true; g.add(b);
    });
    plant(g, -1.6, -1.3, 1.4);
  }
  if (id === 'about') {
    box(g, 1.7, 0.07, 0.8, -0.3, 0.62, 0.2, wood);
    [[-1.05, -0.1], [0.45, -0.1], [-1.05, 0.5], [0.45, 0.5]].forEach(([x, z]) => box(g, 0.07, 0.62, 0.07, x, 0, z, wood));
    box(g, 0.5, 0.03, 0.36, -0.55, 0.69, 0.2, cream).rotation.y = 0.1;
    box(g, 0.5, 0.03, 0.36, -0.03, 0.69, 0.2, cream).rotation.y = -0.1;
    box(g, 0.5, 0.45, 0.5, -0.3, 0, -0.6, cream); box(g, 0.5, 0.5, 0.1, -0.3, 0.45, -0.82, cream);
    cyl(g, 0.03, 0.08, 0.3, 0.35, 0.69, 0.05, mat(C.brass, { metalness: 0.5 }));
    cyl(g, 0.1, 0.17, 0.14, 0.35, 0.97, 0.05, new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd48a, emissiveIntensity: 0.8 }));
    shelf(g, 1.0, -D / 2 + 0.25, 1.7, 1.75);
    plant(g, -1.6, -1.3, 1.3);
  }
  if (id === 'ai') {
    const desk = cyl(g, 1.0, 1.0, 0.6, 0.1, 0, 0.5, wood, 32); desk.scale.z = 0.42;
    box(g, 0.42, 0.02, 0.3, -0.1, 0.6, 0.5, mat(0xd8d8d4)); box(g, 0.42, 0.28, 0.02, -0.1, 0.62, 0.36, mat(0xd8d8d4)).rotation.x = -0.2;
    box(g, 0.3, 0.1, 0.22, 0.6, 0.6, 0.5, mat(C.book[2]));
    box(g, 0.45, 0.5, 0.45, 0.1, 0, -0.35, cream);
    box(g, 1.25, 0.62, 0.04, -0.95, 0.72, -D / 2 + 0.1, mat(0xdfe8d6));        // picture: consultation
    cyl(g, 0.14, 0.14, 0.03, -1.2, 0.98, -D / 2 + 0.14, mat(0x2f6f6b)).rotation.x = Math.PI / 2;
    cyl(g, 0.14, 0.14, 0.03, -0.7, 0.94, -D / 2 + 0.14, mat(0xd8a45c)).rotation.x = Math.PI / 2;
    box(g, 1.25, 0.62, 0.04, 0.55, 0.72, -D / 2 + 0.1, cream);                 // picture: rising chart
    for (let i = 0; i < 6; i++) cyl(g, 0.035, 0.035, 0.03, 0.08 + i * 0.19, 0.83 + [0, 0.05, 0.04, 0.15, 0.2, 0.33][i], -D / 2 + 0.14, mat(0x2f6f6b)).rotation.x = Math.PI / 2;
    plant(g, -1.65, -1.2, 1.2); plant(g, 1.55, 0.9, 0.9);
  }
  if (id === 'writing') {
    cyl(g, 1.35, 1.35, 0.02, -0.1, 0.06, 0.35, mat(0xe9dcc6), 40);            // rug
    cyl(g, 0.6, 0.6, 0.07, -0.1, 0.4, 0.35, wood, 32); cyl(g, 0.3, 0.36, 0.4, -0.1, 0, 0.35, wood);
    box(g, 0.4, 0.03, 0.28, -0.2, 0.47, 0.35, cream);
    cyl(g, 0.02, 0.02, 0.26, 0.2, 0.47, 0.3, mat(0x333333)); cyl(g, 0.05, 0.05, 0.14, 0.2, 0.7, 0.3, mat(0x333333));
    [[-1.0, -0.35, 0.5], [0.95, 0.05, -0.6]].forEach(([x, z, ry]) => {
      const a = new THREE.Group(); a.position.set(x, 0, z); a.rotation.y = ry; g.add(a);
      box(a, 0.6, 0.38, 0.6, 0, 0, 0, cream); box(a, 0.6, 0.42, 0.14, 0, 0.38, -0.23, cream);
    });
    cyl(g, 0.02, 0.02, 1.25, -1.6, 0, -0.9, mat(C.brass, { metalness: 0.5 }));
    cyl(g, 0.12, 0.22, 0.2, -1.6, 1.2, -0.9, new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd48a, emissiveIntensity: 0.9 }));
    shelf(g, 0.75, -D / 2 + 0.25, 2.0, 1.35);
    plant(g, 1.6, -1.25, 1.1);
  }
}
