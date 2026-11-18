import * as THREE from 'three';
import { albumPages } from './album-pages.js';

const FONT_SERIF = "'Source Serif 4', Georgia, serif";
const FONT_SANS = "'Source Sans 3', system-ui, sans-serif";

const COVER_W = 0.308;
const COVER_D = 0.368;
const COVER_H = 0.005;
const OPEN_SHIFT_X = 0.21;
const PAGE_W = 0.286;
const PAGE_D = 0.342;
const PAGE_THICK = 0.0020;
const PAGE_ROOT_THICK = 0.0034;
const SHEET_GAP = 0.0044;
const Z_SEGMENTS = 20;

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const cosineInterpolate = (a, b, t) => a + (b - a) * ((1 - Math.cos(Math.PI * t)) / 2);
const approach = (val, target, speed, dt) => {
  const diff = target - val;
  if (Math.abs(diff) < 0.0001) return target;
  return val + diff * (1 - Math.exp(-speed * dt));
};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function makeRng(seed) {
  let a = seed;
  return () => (a = (a * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

class PageLeaf {
  constructor({ width, depth, thickness, rootThickness, isCover = false, isFrontCover = false, edgeColor = 0xf4efe4 }) {
    this.width = width;
    this.depth = depth;
    this.thickness = thickness;
    this.rootThickness = rootThickness;
    this.isCover = isCover;
    this.isFrontCover = isFrontCover;
    this.elevationLeft = 0;
    this.elevationRight = 0;
    this.turnProgress = 1;
    this.turnProgressLag = 1;
    this.openFactor = 0;
    this.bendingEnabled = false;
    this.dirty = true;
    this.baseSpineY = 0;
    this.spinePivotX = 0;

    const edgeMat = new THREE.MeshStandardMaterial({ color: edgeColor, roughness: 0.85 });
    const frontMat = new THREE.MeshStandardMaterial({
      color: isCover ? 0x203d3b : 0xffffff,
      roughness: isCover ? 0.82 : 0.9,
      vertexColors: !isCover,
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: isCover ? 0x203d3b : 0xffffff,
      roughness: isCover ? 0.82 : 0.9,
      vertexColors: !isCover,
    });

    // Materials: [+X Front (up when tp=+1), -X Back (up when tp=-1), +Y, -Y, +Z fore-edge, -Z spine-edge]
    this.frontMat = frontMat;
    this.backMat = backMat;
    const materials = [frontMat, backMat, edgeMat, edgeMat, edgeMat, edgeMat];

    const zSegs = isCover ? 1 : Z_SEGMENTS;
    const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, zSegs);
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const norm = geometry.attributes.normal;
    const colors = new Float32Array(pos.count * 3);
    this.relCoords = [];

    for (let i = 0; i < pos.count; i++) {
      const uThick = pos.getX(i); // -0.5 or +0.5
      const uHeight = pos.getY(i) + 0.5; // 0..1 -> mapped to Z (-depth/2..+depth/2)
      let uSpine = pos.getZ(i) + 0.5; // 0..1 -> along width from spine (0) to fore-edge (1)

      if (!isCover) {
        uSpine = cosineInterpolate(0, 2, uSpine / 2);
        const nx = norm.getX(i);
        // Set exact UVs for +X (front) and -X (back) faces with v=1 at top (-Z) and v=0 at bottom (+Z).
        if (nx > 0.5) {
          uv.setXY(i, uSpine, 1 - uHeight);
        } else if (nx < -0.5) {
          uv.setXY(i, 1 - uSpine, 1 - uHeight);
        }
      } else {
        const nx = norm.getX(i);
        if (nx > 0.5) {
          uv.setXY(i, uSpine, 1 - uHeight);
        } else if (nx < -0.5) {
          uv.setXY(i, 1 - uSpine, 1 - uHeight);
        }
      }

      this.relCoords[i] = { uThick, uHeight, uSpine };

      // Subtle gutter AO near spine (uSpine near 0) on inner leaves.
      const darken = isCover ? 0 : clamp((1 - uSpine) ** 4 - 0.58, 0, 1) * 0.42;
      colors[i * 3] = 1 - darken;
      colors[i * 3 + 1] = 1 - darken;
      colors[i * 3 + 2] = 1 - darken;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    uv.needsUpdate = true;

    this.mesh = new THREE.Mesh(geometry, materials);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.pivot = new THREE.Group();
    this.pivot.add(this.mesh);
  }

  getCurve() {
    if (this.isCover) {
      // Hinge at spine edge: tp = +1 lies flat right (+X), tp = 0 stands straight up (+Y), tp = -1 lies flat left (-X).
      const angle = (1 - this.turnProgress) * (Math.PI / 2);
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const p0 = new THREE.Vector2(0, 0);
      const p2 = new THREE.Vector2(dx * this.width, dy * this.width);
      const p1 = new THREE.Vector2().addVectors(p0, p2).multiplyScalar(0.5);
      return new THREE.QuadraticBezierCurve(p0, p1, p2);
    }

    const absTp = clamp(Math.abs(this.turnProgress), 0, 1);
    const midTurn = Math.cos(absTp * (Math.PI / 2)); // 0 when flat (|tp|=1), 1 at mid-flip (tp=0)
    const isRight = this.turnProgress >= 0;
    const stackH = isRight ? this.elevationRight : this.elevationLeft;
    const open = clamp(this.openFactor, 0, 1);

    // Closed book (open=0): perfectly flat at y=0 so pages stay strictly below the leather cover.
    // Open book (open>0): subtle spine saddle when resting + arched Bezier curve during page flip.
    const baseArc = 0.030;
    const restingSaddle = open * 0.0055;
    const liftPeak = open * midTurn * (stackH + baseArc);
    const p1elev = restingSaddle + liftPeak * 1.4;
    const outerElev = open * midTurn * stackH;

    const calcPt = (tp, dist) => {
      const a = (1 - tp) * (Math.PI / 2);
      return new THREE.Vector2(Math.cos(a) * dist, Math.sin(a) * dist + outerElev);
    };

    const signDir = this.turnProgress >= 0 ? 1 : -1;
    const p0 = new THREE.Vector2(0, 0);
    const p1 = new THREE.Vector2(signDir * this.width * 0.25 * (1 - midTurn * 0.85), p1elev);
    const p2 = calcPt(this.turnProgress, this.width * 0.55);
    const p3 = calcPt(this.turnProgressLag, this.width);

    return new THREE.CubicBezierCurve(p0, p1, p2, p3);
  }

  setTurnProgress(tp, immediate = false) {
    if (tp === this.turnProgress && !immediate) return;
    if (immediate || !this.bendingEnabled) {
      const delta = tp - this.turnProgress;
      this.turnProgressLag = immediate ? tp : clamp(this.turnProgressLag + delta, -1.08, 1.08);
    }
    this.turnProgress = tp;
    this.dirty = true;
  }

  needsUpdate() {
    if (this.dirty) return true;
    const resting = Math.abs(this.turnProgress) === 1 || this.turnProgress === 0;
    return !resting || Math.abs(this.turnProgress - this.turnProgressLag) > 0.0005;
  }

  update(dt, immediate = false) {
    let targetLag = this.turnProgress;
    if (this.bendingEnabled && !immediate) {
      targetLag = clamp(targetLag * 1.06, -1, 1);
    }
    this.turnProgressLag = immediate
      ? this.turnProgress
      : approach(this.turnProgressLag, targetLag, this.bendingEnabled ? 6.5 : 28, dt);

    const curve = this.getCurve();
    const curveLen = Math.max(curve.getLength(), 0.001);
    const curveStretch = Math.max(curveLen / this.width, 1);

    const position = this.mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const { uThick, uHeight, uSpine } = this.relCoords[i];
      const u = clamp(uSpine / curveStretch, 0, 1);
      const pt = curve.getPointAt(u);
      const tan = curve.getTangentAt(u);
      // Curve in (X, Y): normal pointing to +Y when flat right (tan=(1,0)) is angle + PI/2.
      const normalAngle = Math.atan2(tan.y, tan.x) + Math.PI / 2;
      const thick = lerp(this.rootThickness, this.thickness, uSpine);
      const offset = uThick * thick;
      const nx = pt.x + Math.cos(normalAngle) * offset;
      const ny = pt.y + Math.sin(normalAngle) * offset;
      const nz = (uHeight - 0.5) * this.depth;
      position.setXYZ(i, nx, ny, nz);
    }

    position.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.computeBoundingSphere();

    this.dirty = Math.abs(this.turnProgress - this.turnProgressLag) > 0.0005;
  }
}

export function createBookAlbum(parent, { x, y, z, rotY = -0.22, getModelText, onNeedRender } = {}) {
  let _onNeedRender = onNeedRender;
  let _onStateChange = null;
  const emitRender = () => _onNeedRender?.();
  const emitState = () => _onStateChange?.(getState());
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = rotY;
  parent.add(root);

  // Moving sub-group slides open horizontally so left open cover clears nearby desk laptop.
  const bookGroup = new THREE.Group();
  root.add(bookGroup);

  const spineX = -COVER_W / 2; // Closed center x=0 -> spine edge at -COVER_W/2
  const getAlbumMeta = () => getModelText?.()?.album || {};
  const getPhotos = () => getAlbumMeta().photos || [];

  // Build ordered inner face descriptors: [Instructions Page 1, PhotoPage 1..K]
  function computeSlots() {
    const album = getAlbumMeta();
    const pages = albumPages(album.photos || []);
    const totalInner = 1 + pages.length;
    const sheetCount = Math.max(1, Math.ceil(totalInner / 2));
    const slots = [{ type: 'instructions', pageNum: 1, totalPages: totalInner }];
    pages.forEach((items, idx) => {
      slots.push({ type: 'photos', items, pageNum: idx + 2, totalPages: totalInner });
    });
    return { slots, sheetCount };
  }

  const { sheetCount } = computeSlots();
  const totalLeaves = sheetCount + 2; // front cover + paper sheets + back cover
  const maxSpread = sheetCount + 1;   // progress 1 = Instructions, ..., sheetCount + 1 = end spread
  const closedStackH = COVER_H * 2 + (sheetCount + 1) * SHEET_GAP;

  const goldMat = new THREE.MeshStandardMaterial({ color: 0xb99a60, metalness: 0.45, roughness: 0.52 });
  const coverTealMat = new THREE.MeshStandardMaterial({ color: 0x203d3b, roughness: 0.82 });
  const ribbonMat = new THREE.MeshStandardMaterial({ color: 0x789084, roughness: 0.85 });

  // Outer cover texture (loaded even when closed to keep existing desk appearance intact).
  const coverCanvas = makeCanvas(512, 640);
  const coverCtx = coverCanvas.getContext('2d');
  const coverTex = new THREE.CanvasTexture(coverCanvas);
  coverTex.colorSpace = THREE.SRGBColorSpace;
  coverTex.anisotropy = 8;

  const coverPhoto = new Image();
  const drawCover = () => {
    coverCtx.fillStyle = '#203d3b';
    coverCtx.fillRect(0, 0, 512, 640);
    const rng = makeRng(406);
    for (let i = 0; i < 2400; i++) {
      coverCtx.fillStyle = `rgba(238,228,200,${rng() * 0.055})`;
      coverCtx.fillRect(rng() * 512, rng() * 640, 2, 2);
    }
    coverCtx.strokeStyle = '#b99a60';
    coverCtx.lineWidth = 5;
    coverCtx.strokeRect(30, 30, 452, 580);
    coverCtx.lineWidth = 2;
    coverCtx.strokeRect(42, 42, 428, 556);
    coverCtx.fillStyle = '#efe7d7';
    coverCtx.textAlign = 'center';
    coverCtx.textBaseline = 'middle';
    coverCtx.font = `600 45px ${FONT_SERIF}`;
    coverCtx.fillText(getModelText?.()?.spots?.album ?? 'Photo Album', 256, 105, 390);
    coverCtx.fillStyle = '#efe7d7';
    coverCtx.fillRect(82, 183, 348, 274);
    if (coverPhoto.naturalWidth) {
      const s = Math.min(328 / coverPhoto.naturalWidth, 254 / coverPhoto.naturalHeight);
      const pw = coverPhoto.naturalWidth * s, ph = coverPhoto.naturalHeight * s;
      coverCtx.drawImage(coverPhoto, 92 + (328 - pw) / 2, 193 + (254 - ph) / 2, pw, ph);
    } else {
      coverCtx.fillStyle = '#8fa59a';
      coverCtx.fillRect(92, 193, 328, 254);
    }
    coverCtx.fillStyle = '#b99a60';
    coverCtx.fillRect(166, 503, 180, 3);
    coverCtx.font = '500 24px system-ui, sans-serif';
    coverCtx.fillText('GILLES PENNING', 256, 545, 340);
    coverTex.needsUpdate = true;
    emitRender();
  };
  drawCover();
  coverPhoto.onload = drawCover;
  coverPhoto.src = `${import.meta.env.BASE_URL}album/photo-1.webp`;

  // Construct physical leaves: Leaf 0 (Front Cover), Leaf 1..sheetCount (Paper Sheets), Leaf N-1 (Back Cover)
  const leaves = [];

  // Leaf 0: Front cover
  const frontCover = new PageLeaf({
    width: COVER_W,
    depth: COVER_D,
    thickness: COVER_H,
    rootThickness: COVER_H,
    isCover: true,
    isFrontCover: true,
    edgeColor: 0x203d3b,
  });
  frontCover.frontMat.map = coverTex;
  frontCover.frontMat.needsUpdate = true;
  frontCover.pivot.position.set(spineX, closedStackH - COVER_H / 2, 0);
  // Gold corner mounts swing synchronously with front cover curve hinge!
  const frontCornerGroup = new THREE.Group();
  for (const fx of [0.018, COVER_W - 0.018]) {
    for (const fz of [-COVER_D / 2 + 0.018, COVER_D / 2 - 0.018]) {
      const corner = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.002, 0.017), goldMat);
      corner.position.set(fx, COVER_H / 2 + 0.001, fz);
      frontCornerGroup.add(corner);
    }
  }
  frontCover.pivot.add(frontCornerGroup);
  bookGroup.add(frontCover.pivot);
  leaves.push(frontCover);

  // Leaves 1..sheetCount: bendable paper sheets
  for (let i = 1; i <= sheetCount; i++) {
    const sheet = new PageLeaf({
      width: PAGE_W,
      depth: PAGE_D,
      thickness: PAGE_THICK,
      rootThickness: PAGE_ROOT_THICK,
      isCover: false,
      edgeColor: 0xeae2d2,
    });
    sheet.elevationRight = (sheetCount + 1 - i) * SHEET_GAP * 0.55;
    sheet.elevationLeft = i * SHEET_GAP * 0.55;
    sheet.pivot.position.set(spineX + 0.006, COVER_H + (sheetCount + 1 - i) * SHEET_GAP, 0);
    bookGroup.add(sheet.pivot);
    leaves.push(sheet);
  }

  // Last Leaf: Back cover
  const backCover = new PageLeaf({
    width: COVER_W,
    depth: COVER_D,
    thickness: COVER_H,
    rootThickness: COVER_H,
    isCover: true,
    isFrontCover: false,
    edgeColor: 0x203d3b,
  });
  backCover.pivot.position.set(spineX, COVER_H / 2, 0);
  bookGroup.add(backCover.pivot);
  leaves.push(backCover);

  // Physical spine bridging top and bottom covers with gold bands
  const spineGroup = new THREE.Group();
  spineGroup.position.set(spineX - 0.002, closedStackH / 2, 0);
  const spineMesh = new THREE.Mesh(new THREE.BoxGeometry(0.016, closedStackH, COVER_D + 0.006), coverTealMat);
  spineMesh.castShadow = true;
  spineMesh.receiveShadow = true;
  spineGroup.add(spineMesh);
  for (const sz of [-0.12, -0.085, 0.085, 0.12]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.007), goldMat);
    band.position.set(-0.001, 0, sz);
    spineGroup.add(band);
  }
  bookGroup.add(spineGroup);

  // Subtle bookmark ribbon peeking out at fore-edge bottom when closed
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.002, 0.055), ribbonMat);
  ribbon.position.set(0.078, COVER_H + 0.002, COVER_D / 2 + 0.012);
  bookGroup.add(ribbon);

  // Interactive picks and center anchor for inspectionPose framing
  const anchor = new THREE.Object3D();
  anchor.position.set(0, closedStackH + 0.06, 0);
  bookGroup.add(anchor);

  const picks = [
    ...leaves.map(l => l.mesh),
    spineMesh,
    ribbon,
  ];
  picks.forEach(m => { m.userData.album = true; m.userData.anchor = anchor; });

  // ---- Lazy Face Textures & UV Photo Hit Regions ----------------------------
  // Faces map:
  //   'cover-in': frontCover.backMat
  //   'face-0':   leaves[1].frontMat  (Instruction page)
  //   'face-1':   leaves[1].backMat   (Photo page 1)
  //   'face-2':   leaves[2].frontMat  (Photo page 2)
  //   ...
  //   'back-in':  backCover.frontMat
  const faceCache = new Map(); // faceKey -> { tex, mat, uvRegions, photos: Image[], disposed: boolean }
  const PAGE_W_PX = 800, PAGE_H_PX = 960;

  function faceBinding(faceKey) {
    if (faceKey === 'cover-in') return { leaf: frontCover, mat: frontCover.backMat, side: 'back' };
    if (faceKey === 'back-in') return { leaf: backCover, mat: backCover.frontMat, side: 'front' };
    const idx = Number(faceKey.slice(5));
    const sheetIdx = 1 + Math.floor(idx / 2);
    const leaf = leaves[sheetIdx];
    if (!leaf || sheetIdx >= totalLeaves - 1) return null;
    return idx % 2 === 0 ? { leaf, mat: leaf.frontMat, side: 'front' } : { leaf, mat: leaf.backMat, side: 'back' };
  }

  function drawCoverInner(ctx) {
    const album = getAlbumMeta();
    const photos = album.photos || [];
    ctx.fillStyle = '#f2ede2';
    ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);
    // Double border matching outer leather plate
    ctx.strokeStyle = '#c8bfa9';
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, PAGE_W_PX - 96, PAGE_H_PX - 96);
    ctx.strokeStyle = '#dcd4c2';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(64, 64, PAGE_W_PX - 128, PAGE_H_PX - 128);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1e3a8a';
    ctx.font = `600 22px ${FONT_SANS}`;
    ctx.fillText((album.title || 'Photo Album').toUpperCase(), PAGE_W_PX / 2, 340);

    ctx.fillStyle = '#18181b';
    ctx.font = `600 48px ${FONT_SERIF}`;
    ctx.fillText(album.title || 'Photo Album', PAGE_W_PX / 2, 415, 620);

    ctx.fillStyle = '#4b5563';
    ctx.font = `400 26px ${FONT_SANS}`;
    ctx.fillText(album.subtitle || '', PAGE_W_PX / 2, 475, 620);

    ctx.fillStyle = '#b99a60';
    ctx.fillRect(PAGE_W_PX / 2 - 70, 530, 140, 2);

    ctx.fillStyle = '#4b5563';
    ctx.font = `600 22px ${FONT_SANS}`;
    const countLabel = photos.length === 18 && album.title === 'Fotoalbum' ? `${photos.length} Aufnahmen` : `${photos.length} Photographs`;
    ctx.fillText(countLabel, PAGE_W_PX / 2, 580);

    ctx.fillStyle = '#18181b';
    ctx.font = `600 20px ${FONT_SANS}`;
    ctx.fillText('GILLES PENNING', PAGE_W_PX / 2, 790);
  }

  function drawBackInner(ctx) {
    const album = getAlbumMeta();
    ctx.fillStyle = '#f2ede2';
    ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);
    ctx.strokeStyle = '#dcd4c2';
    ctx.lineWidth = 2;
    ctx.strokeRect(56, 56, PAGE_W_PX - 112, PAGE_H_PX - 112);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4b5563';
    ctx.font = `400 24px ${FONT_SERIF}`;
    ctx.fillText(album.subtitle || 'Personal snapshots & perspectives', PAGE_W_PX / 2, PAGE_H_PX / 2 - 20, 600);
    ctx.fillStyle = '#b99a60';
    ctx.fillRect(PAGE_W_PX / 2 - 50, PAGE_H_PX / 2 + 24, 100, 2);
    ctx.fillStyle = '#1e3a8a';
    ctx.font = `600 20px ${FONT_SANS}`;
    ctx.fillText('GILLES PENNING', PAGE_W_PX / 2, PAGE_H_PX / 2 + 64);
  }

  // Page 1: Exact instructions ("Anleitung auf Seite 1") preserving unchanged wording & hierarchy
  function drawInstructionsPage(ctx, slot) {
    const album = getAlbumMeta();
    ctx.fillStyle = '#f7f6f2';
    ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);

    const padX = 76;
    const maxW = PAGE_W_PX - padX * 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Top tag (matches .album-tag)
    ctx.fillStyle = '#1e3a8a';
    ctx.font = `600 22px ${FONT_SANS}`;
    ctx.fillText((album.title || 'Photo Album').toUpperCase(), padX, 82);

    // Subtle hairline header rule (matches .album-header border)
    ctx.fillStyle = '#dcd9d0';
    ctx.fillRect(padX, 128, maxW, 2);

    // Subtitle heading
    ctx.fillStyle = '#18181b';
    ctx.font = `600 42px ${FONT_SERIF}`;
    const subLines = wrapLines(ctx, album.subtitle || 'Personal snapshots & perspectives', maxW);
    let cy = 178;
    for (const ln of subLines) {
      ctx.fillText(ln, padX, cy, maxW);
      cy += 54;
    }

    // Accent bar
    ctx.fillStyle = '#b99a60';
    ctx.fillRect(padX, cy + 14, 96, 3);
    cy += 56;

    // Unchanged full instruction text inside a quiet editorial card on the page
    const cardPad = 36;
    ctx.font = `400 28px ${FONT_SANS}`;
    const hintText = album.hint || 'Turn the spread with the buttons or swipe · Tap a photo to enlarge';
    const hintLines = wrapLines(ctx, hintText, maxW - cardPad * 2);
    const boxH = hintLines.length * 42 + cardPad * 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padX, cy, maxW, boxH);
    ctx.strokeStyle = '#dcd9d0';
    ctx.lineWidth = 2;
    ctx.strokeRect(padX, cy, maxW, boxH);

    ctx.fillStyle = '#18181b';
    let hy = cy + cardPad;
    for (const ln of hintLines) {
      ctx.fillText(ln, padX + cardPad, hy);
      hy += 42;
    }

    // Visual next cue at bottom right + page counter (matches page numbering)
    ctx.fillStyle = '#1e3a8a';
    ctx.font = `600 24px ${FONT_SANS}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${album.next || 'Next'} ›`, PAGE_W_PX - padX, PAGE_H_PX - 130);

    ctx.fillStyle = '#4b5563';
    ctx.font = `400 20px ${FONT_SANS}`;
    ctx.fillText(`${slot.pageNum} / ${slot.totalPages}`, PAGE_W_PX - padX, PAGE_H_PX - 76);
  }

  function drawPhotoPage(ctx, slot, images, entry) {
    ctx.fillStyle = '#f7f6f2';
    ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);

    const padX = 56;
    const padTop = 54;
    const padBottom = 86;
    const gap = 24;
    const items = slot.items;
    const cardW = PAGE_W_PX - padX * 2;
    const availH = PAGE_H_PX - padTop - padBottom - (items.length > 1 ? gap : 0);
    const cardH = items.length === 1 ? availH : availH / 2;

    entry.uvRegions = [];
    items.forEach((photo, idx) => {
      const cy = padTop + idx * (cardH + gap);
      const captionH = 44;
      const innerPad = 14;
      const imgAreaW = cardW - innerPad * 2;
      const imgAreaH = cardH - innerPad * 2 - captionH;

      // White card frame (matches .album-photo-card)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(padX, cy, cardW, cardH);
      ctx.strokeStyle = '#dcd9d0';
      ctx.lineWidth = 2;
      ctx.strokeRect(padX, cy, cardW, cardH);

      const img = images[idx];
      if (img && img.naturalWidth > 0) {
        const s = Math.min(imgAreaW / img.naturalWidth, imgAreaH / img.naturalHeight);
        const dw = img.naturalWidth * s;
        const dh = img.naturalHeight * s;
        const dx = padX + innerPad + (imgAreaW - dw) / 2;
        const dy = cy + innerPad + (imgAreaH - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      } else {
        ctx.fillStyle = '#eeece5';
        ctx.fillRect(padX + innerPad, cy + innerPad, imgAreaW, imgAreaH);
      }

      // Photo title beneath image
      ctx.fillStyle = '#18181b';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `600 22px ${FONT_SANS}`;
      ctx.fillText(photo.title || '', padX + innerPad, cy + cardH - captionH / 2 - 4, imgAreaW);

      // Record normalized UV hit region (UV origin bottom-left: v = 1 - py / PAGE_H_PX)
      entry.uvRegions.push({
        photo,
        u0: padX / PAGE_W_PX,
        u1: (padX + cardW) / PAGE_W_PX,
        v0: 1 - (cy + cardH) / PAGE_H_PX,
        v1: 1 - cy / PAGE_H_PX,
      });
    });

    // Bottom page counter
    ctx.fillStyle = '#4b5563';
    ctx.textAlign = slot.pageNum % 2 === 0 ? 'left' : 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `400 20px ${FONT_SANS}`;
    const numX = slot.pageNum % 2 === 0 ? padX : PAGE_W_PX - padX;
    ctx.fillText(`${slot.pageNum} / ${slot.totalPages}`, numX, PAGE_H_PX - 44);
  }

  function ensureFaceTexture(faceKey) {
    if (faceCache.has(faceKey)) return faceCache.get(faceKey);
    const binding = faceBinding(faceKey);
    if (!binding) return null;

    const c = makeCanvas(PAGE_W_PX, PAGE_H_PX);
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    const entry = { tex, mat: binding.mat, leaf: binding.leaf, uvRegions: [], images: [], disposed: false };
    faceCache.set(faceKey, entry);

    const { slots } = computeSlots();
    if (faceKey === 'cover-in') {
      drawCoverInner(ctx);
      tex.needsUpdate = true;
    } else if (faceKey === 'back-in') {
      drawBackInner(ctx);
      tex.needsUpdate = true;
    } else {
      const slotIdx = Number(faceKey.slice(5));
      const slot = slots[slotIdx];
      if (!slot) {
        drawBackInner(ctx);
        tex.needsUpdate = true;
      } else if (slot.type === 'instructions') {
        drawInstructionsPage(ctx, slot);
        tex.needsUpdate = true;
      } else {
        const imgs = slot.items.map(photo => {
          const im = new Image();
          im.onload = () => {
            if (entry.disposed) return;
            drawPhotoPage(ctx, slot, imgs, entry);
            tex.needsUpdate = true;
            emitRender();
          };
          im.src = `${import.meta.env.BASE_URL}${photo.src}`;
          return im;
        });
        entry.images = imgs;
        drawPhotoPage(ctx, slot, imgs, entry);
        tex.needsUpdate = true;
      }
    }

    binding.mat.map = tex;
    binding.mat.needsUpdate = true;
    emitRender();
    return entry;
  }

  function disposeFace(faceKey) {
    const entry = faceCache.get(faceKey);
    if (!entry) return;
    entry.disposed = true;
    entry.images.forEach(im => { im.onload = null; });
    entry.images.length = 0;
    entry.mat.map = null;
    entry.mat.needsUpdate = true;
    entry.tex.dispose();
    faceCache.delete(faceKey);
  }

  function syncTexturesWindow(centerProgress) {
    if (centerProgress <= 0.001 && targetProgress <= 0.001) {
      for (const key of [...faceCache.keys()]) disposeFace(key);
      return;
    }

    const wanted = new Set();
    const minS = clamp(Math.floor(centerProgress) - 1, 1, maxSpread);
    const maxS = clamp(Math.ceil(centerProgress) + 1, 1, maxSpread);
    const { slots } = computeSlots();

    for (let s = minS; s <= maxS; s++) {
      // Spread s displays sheet s-1 back on left and sheet s front on right
      if (s === 1) {
        wanted.add('cover-in');
      } else {
        const leftSlotIdx = (s - 1) * 2 - 1;
        if (leftSlotIdx >= 0 && leftSlotIdx < slots.length) wanted.add(`face-${leftSlotIdx}`);
      }
      if (s >= totalLeaves - 1) {
        wanted.add('back-in');
      } else {
        const rightSlotIdx = (s - 1) * 2;
        if (rightSlotIdx >= 0 && rightSlotIdx < slots.length) wanted.add(`face-${rightSlotIdx}`);
        else wanted.add('back-in');
      }
    }

    for (const existingKey of [...faceCache.keys()]) {
      if (!wanted.has(existingKey)) disposeFace(existingKey);
    }
    for (const key of wanted) {
      ensureFaceTexture(key);
    }
  }

  // ---- Book Animation & Interaction State -----------------------------------
  let progress = 0;        // 0 = closed, 1 = spread 1 (Instructions), 2..maxSpread = photo spreads
  let targetProgress = 0;
  let dragging = null;     // { startProgress, moved }
  let reducedMotion = false;
  let closingToClosed = false;

  const isClosed = () => progress < 0.01 && targetProgress < 0.01;
  const isOpen = () => targetProgress >= 1 || progress >= 0.01;

  function applyProgressPose(immediate = false) {
    const openFactor = clamp(Math.min(progress, totalLeaves - progress, 1), 0, 1);

    // Slide rightward as book opens so left cover clears nearby desk laptop,
    // and lift gently above desk surface during cover arc.
    const liftY = Math.sin(openFactor * Math.PI) * 0.022 + openFactor * 0.016;
    bookGroup.position.x = openFactor * OPEN_SHIFT_X;
    bookGroup.position.y = liftY;

    // Anchor tracks visual center of book (0 when closed, spineX inside shifted group when open)
    anchor.position.set(openFactor * spineX, closedStackH + 0.05, 0);

    // Spine smoothly lays flat horizontally under open hinge
    const spineY = lerp(closedStackH / 2, COVER_H / 2, openFactor);
    spineGroup.position.set(spineX - 0.002 * (1 - openFactor), spineY, 0);
    spineGroup.rotation.z = openFactor * (Math.PI / 2);

    // Ribbon tucks unobtrusively once open
    ribbon.visible = openFactor < 0.35;

    // Position Front Cover hinge cleanly across closed-top -> open-left-bottom
    const frontOpenT = clamp((1 - clamp(progress, 0, 1)), 0, 1);
    frontCover.pivot.position.y = lerp(COVER_H / 2, closedStackH - COVER_H / 2, frontOpenT);
    frontCornerGroup.rotation.z = (1 - clamp(1 - progress * 2, -1, 1)) * (Math.PI / 2);

    leaves.forEach((leaf, index) => {
      let tp;
      if (index === 0) {
        // Front cover opens across progress 0..1 from +1 to -1
        tp = clamp(1 - progress * 2, -1, 1);
      } else if (index === totalLeaves - 1) {
        // Back cover stays resting flat on right (+1)
        tp = 1;
      } else {
        // Sheet index i (1..sheetCount) sits between progress i and i+1
        const local = progress - index;
        if (local <= 0) tp = 1;
        else if (local >= 1) tp = -1;
        else tp = 1 - local * 2;
      }

      leaf.openFactor = openFactor;
      leaf.bendingEnabled = !leaf.isCover && progress > 0.85 && progress < totalLeaves - 0.85;
      if (!leaf.isCover) {
        const leftFrac = clamp((1 - tp) / 2, 0, 1);
        const yLeft = COVER_H + index * SHEET_GAP;
        const yRight = COVER_H + (sheetCount + 1 - index) * SHEET_GAP;
        leaf.pivot.position.y = lerp(yRight, yLeft, leftFrac);
      }

      // Render order keeps top leaves above lower leaves on both stacks
      leaf.mesh.renderOrder = 20 - Math.round(Math.abs(progress - index - 0.5) * 2);

      leaf.setTurnProgress(tp, immediate);
    });
  }

  // Initial closed pose compute (ensures valid world bounding boxes immediately!)
  applyProgressPose(true);
  leaves.forEach(l => l.update(1, true));

  function openBook(immediate = false) {
    reducedMotion = Boolean(immediate);
    closingToClosed = false;
    const prevTarget = targetProgress;
    targetProgress = 1; // Always open onto Page 1 Instructions!
    syncTexturesWindow(targetProgress);
    if (immediate) {
      progress = 1;
      applyProgressPose(true);
      leaves.forEach(l => l.update(1, true));
    }
    if (prevTarget !== targetProgress) emitState();
    emitRender();
  }

  function closeBook(immediate = false) {
    reducedMotion = Boolean(immediate);
    closingToClosed = true;
    const prevTarget = targetProgress;
    targetProgress = 0;
    if (immediate) {
      progress = 0;
      applyProgressPose(true);
      leaves.forEach(l => l.update(1, true));
      syncTexturesWindow(0);
      closingToClosed = false;
    }
    if (prevTarget !== targetProgress) emitState();
    emitRender();
  }

  function setSpread(spreadIndex, immediate = false) {
    const clamped = clamp(Math.round(spreadIndex), 1, maxSpread);
    if (clamped === targetProgress && !immediate) return false;
    closingToClosed = false;
    targetProgress = clamped;
    syncTexturesWindow(clamped);
    if (immediate) {
      progress = clamped;
      applyProgressPose(true);
      leaves.forEach(l => l.update(1, true));
      syncTexturesWindow(clamped);
    }
    emitState();
    emitRender();
    return true;
  }

  function nextSpread(immediate = false) {
    const current = Math.round(targetProgress || progress);
    if (current < 1) { openBook(immediate); return true; }
    return setSpread(current + 1, immediate);
  }

  function prevSpread(immediate = false) {
    const current = Math.round(targetProgress || progress);
    if (current <= 1) return false;
    return setSpread(current - 1, immediate);
  }

  function startDrag() {
    if (targetProgress < 1) return false;
    closingToClosed = false;
    dragging = { base: progress };
    return true;
  }

  function moveDrag(deltaX, stageWidth) {
    if (!dragging) return;
    const span = Math.max(stageWidth * 0.36, 180);
    // Drag left (deltaX < 0) advances progress (+), drag right goes backward (-)
    progress = clamp(progress - deltaX / span, 1, maxSpread);
    targetProgress = progress;
    syncTexturesWindow(progress);
    applyProgressPose(false);
    emitRender();
  }

  function endDrag(velocityX = 0) {
    if (!dragging) return;
    dragging = null;
    const frac = progress - Math.floor(progress);
    let target;
    if (Math.abs(velocityX) > 0.25) {
      target = velocityX < 0 ? Math.ceil(progress) : Math.floor(progress);
    } else {
      target = frac >= 0.45 ? Math.ceil(progress) : Math.floor(progress);
    }
    setSpread(target, reducedMotion);
  }

  function getState() {
    const spread = Math.round(targetProgress);
    const { slots } = computeSlots();
    const photos = getPhotos();
    if (targetProgress < 0.5) {
      return { open: false, spread: 0, maxSpread, totalPhotos: photos.length, canPrev: false, canNext: false, label: '', isInstructions: false };
    }
    if (spread === 1) {
      return {
        open: true,
        spread: 1,
        maxSpread,
        totalPhotos: photos.length,
        canPrev: false,
        canNext: maxSpread > 1,
        isInstructions: true,
        label: getAlbumMeta().instructionsLabel || getAlbumMeta().title || 'Guide',
      };
    }
    const leftIdx = (spread - 1) * 2 - 1;
    const rightIdx = leftIdx + 1;
    const leftSlot = slots[leftIdx];
    const rightSlot = slots[rightIdx];
    const items = [...(leftSlot?.items || []), ...(rightSlot?.items || [])];
    const label = items.length
      ? `${items[0].index + 1}–${items.at(-1).index + 1} / ${photos.length}`
      : `${spread} / ${maxSpread}`;
    return {
      open: true,
      spread,
      maxSpread,
      totalPhotos: photos.length,
      canPrev: spread > 1,
      canNext: spread < maxSpread,
      isInstructions: false,
      label,
    };
  }

  // Hit-testing on open 3D book pages (detects photo click vs prev/next page click)
  function hitAction(raycaster) {
    const hits = raycaster.intersectObjects(picks, false);
    const hit = hits[0];
    if (!hit) return null;

    if (progress < 0.5) return { type: 'closedBook' };

    const leafIdx = leaves.findIndex(l => l.mesh === hit.object);
    if (leafIdx < 0) return { type: 'bookArea' };

    const spread = Math.round(progress);
    const hitPointLocal = bookGroup.worldToLocal(hit.point.clone());
    const onLeftSide = hitPointLocal.x < spineX;

    // Identify visible face key
    let faceKey = null;
    if (onLeftSide) {
      if (spread === 1 && leafIdx === 0) faceKey = 'cover-in';
      else if (leafIdx === spread - 1) faceKey = `face-${(spread - 1) * 2 - 1}`;
    } else {
      if (leafIdx === spread) faceKey = `face-${(spread - 1) * 2}`;
      else if (leafIdx === totalLeaves - 1) faceKey = 'back-in';
    }

    if (faceKey && hit.uv) {
      const entry = faceCache.get(faceKey);
      if (entry?.uvRegions?.length) {
        const { x: u, y: v } = hit.uv;
        const found = entry.uvRegions.find(r => u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1);
        if (found) return { type: 'photo', photo: found.photo };
      }
    }

    return onLeftSide ? { type: 'prev' } : { type: 'next' };
  }

  function getClosedBounds() {
    const box = new THREE.Box3();
    for (const m of picks) { m.updateWorldMatrix(true, true); box.expandByObject(m); }
    return box;
  }

  // Exact 8 rotated world corners of the full open 2-page spread for optimal responsive framing.
  function getOpenCorners() {
    root.updateWorldMatrix(true, true);
    const minX = spineX + OPEN_SHIFT_X - COVER_W - 0.01;
    const maxX = spineX + OPEN_SHIFT_X + COVER_W + 0.01;
    const minY = 0;
    const maxY = 0.085;
    const minZ = -COVER_D / 2 - 0.01;
    const maxZ = COVER_D / 2 + 0.01;
    const corners = [];
    const vec = new THREE.Vector3();
    for (const cx of [minX, maxX]) {
      for (const cy of [minY, maxY]) {
        for (const cz of [minZ, maxZ]) {
          vec.set(cx, cy, cz).applyMatrix4(root.matrixWorld);
          corners.push([vec.x, vec.y, vec.z]);
        }
      }
    }
    return corners;
  }

  function update(dt) {
    let anyChanged = false;
    if (!dragging && Math.abs(progress - targetProgress) > 0.0005) {
      const speed = closingToClosed ? 7.5 : 5.8;
      progress = approach(progress, targetProgress, speed, dt);
      if (Math.abs(progress - targetProgress) <= 0.001) {
        progress = targetProgress;
        if (progress === 0) closingToClosed = false;
        syncTexturesWindow(progress);
      }
      applyProgressPose(false);
      anyChanged = true;
    }

    for (const leaf of leaves) {
      if (leaf.needsUpdate()) {
        leaf.update(dt, false);
        anyChanged = true;
      }
    }
    return anyChanged;
  }

  function refreshLanguage() {
    drawCover();
    const activeKeys = [...faceCache.keys()];
    for (const key of activeKeys) disposeFace(key);
    syncTexturesWindow(targetProgress || progress);
    emitState();
    emitRender();
  }

  function setCallbacks({ onStateChange: nextState, onNeedRender: nextRender } = {}) {
    _onStateChange = nextState;
    _onNeedRender = nextRender;
  }

  function dispose() {
    for (const key of [...faceCache.keys()]) disposeFace(key);
    coverPhoto.onload = null;
    coverTex.dispose();
  }

  return {
    root,
    picks,
    anchor,
    open: openBook,
    close: closeBook,
    next: nextSpread,
    prev: prevSpread,
    setSpread,
    startDrag,
    moveDrag,
    endDrag,
    hitAction,
    isOpen,
    isClosed,
    isAnimating: () => Math.abs(progress - targetProgress) > 0.001 || leaves.some(l => l.needsUpdate()),
    getSpread: () => Math.round(targetProgress),
    getState,
    getClosedBounds,
    getOpenCorners,
    update,
    refreshLanguage,
    setCallbacks,
    getLoadedFaces: () => [...faceCache.keys()],
    dispose,
  };
}
