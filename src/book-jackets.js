import * as THREE from 'three';
import catalog from './data/books.json';

// Local English-edition front covers load progressively when available.
// Back panels and spines are original typographic reconstructions, NOT publisher artwork.
// A missing or blocked image always leaves a legible local CanvasTexture fallback.
const COLORS = [
  ['#eee4cf', '#272d35', '#b8863b'], ['#d3dedc', '#173a3d', '#ad7348'],
  ['#263a48', '#f7eedc', '#d6ae62'], ['#bbd0bd', '#213c36', '#b17150'],
  ['#d5c2a4', '#332c2d', '#b88743'], ['#5a6970', '#fff2d6', '#d5b47c'],
  ['#a9a8ae', '#1b2938', '#dfc68a'], ['#c6b4a2', '#302f33', '#f0d8ad'],
];

export const booksByAnchor = Object.freeze(
  catalog.books.reduce((acc, book) => {
    (acc[book.placement.anchor] ??= []).push(book);
    return acc;
  }, {})
);
for (const items of Object.values(booksByAnchor)) items.sort((a, b) => a.placement.order - b.placement.order);

function palette(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}
function texture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function sheet(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  return texture(c);
}
function wrapped(ctx, text, maxWidth, maxLines = 7) {
  const words = String(text).split(/\s+/);
  const lines = [], current = { text: '' };
  for (const word of words) {
    const candidate = current.text ? current.text + ' ' + word : word;
    if (ctx.measureText(candidate).width > maxWidth && current.text) {
      lines.push(current.text);
      current.text = word;
    } else current.text = candidate;
  }
  if (current.text) lines.push(current.text);
  return lines.slice(0, maxLines);
}
function fit(ctx, str, maxWidth, start, minimum) {
  let size = start, lines = [];
  while (size >= minimum) {
    ctx.font = `600 ${size}px Georgia, serif`;
    lines = wrapped(ctx, str, maxWidth, 5);
    if (lines.length <= 4 && lines.every(line => ctx.measureText(line).width <= maxWidth)) break;
    size -= 2;
  }
  return { size: Math.max(minimum, size), lines };
}
function frontFallback(book, colors) {
  const [bg, ink, accent] = colors;
  return sheet(288, 432, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = accent; ctx.fillRect(24, 38, w - 48, 4);
    ctx.fillStyle = ink; ctx.textAlign = 'center';
    const { size, lines } = fit(ctx, book.title, w - 54, 32, 17);
    ctx.font = `600 ${size}px Georgia, serif`;
    const gap = size * 1.18, y = Math.max(105, h / 2 - lines.length * gap * .42);
    lines.forEach((line, i) => ctx.fillText(line, w / 2, y + i * gap));
    ctx.fillStyle = accent; ctx.fillRect(w * .36, h - 104, w * .28, 2);
    ctx.fillStyle = ink;
    ctx.font = '20px Georgia, serif';
    const authors = wrapped(ctx, book.author, w - 42, 3);
    authors.forEach((line, i) => ctx.fillText(line, w / 2, h - 74 + i * 23));
  });
}
function backReconstruction(book, colors) {
  const [bg, ink, accent] = colors;
  return sheet(256, 384, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.fillStyle = ink; ctx.textAlign = 'left';
    ctx.font = 'bold 17px Georgia, serif';
    const titleLines = wrapped(ctx, book.title, w - 54, 6);
    titleLines.forEach((line, i) => ctx.fillText(line, 27, 60 + i * 22));
    const separator = Math.max(114, 65 + titleLines.length * 22);
    ctx.fillStyle = accent; ctx.fillRect(27, separator, w - 54, 2);
    ctx.fillStyle = ink; ctx.font = '15px Georgia, serif';
    const a = wrapped(ctx, book.author, w - 52, 4);
    a.forEach((line, i) => ctx.fillText(line, 27, separator + 35 + i * 19));
    ctx.fillStyle = accent; ctx.fillRect(27, h - 49, 42, 3);
    ctx.font = '10px sans-serif'; ctx.fillStyle = ink;
    if (book.isbn13) ctx.fillText('ISBN ' + book.isbn13, 27, h - 28);
  });
}
function spineReconstruction(book, colors) {
  const [bg, ink, accent] = colors;
  return sheet(112, 600, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent; ctx.fillRect(0, 0, 9, h); ctx.fillRect(w - 8, 0, 8, h);
    ctx.fillStyle = ink; ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    let fontSize = 35;
    do { ctx.font = `600 ${fontSize}px Georgia, serif`; if (ctx.measureText(book.title).width <= h - 44) break; fontSize -= 2; } while (fontSize > 14);
    ctx.fillText(book.title, 0, -12, h - 44);
    ctx.font = '20px Georgia, serif'; ctx.fillText(book.author, 0, 30, h - 60);
    ctx.restore();
  });
}
const materialCache = new Map();
const jackets = new Map();
const MAX_LARGE_TEXTURES = 2;
let useCounter = 0;

function display(record) {
  const image = (record.active && record.large) || record.small || record.fallback;
  if (record.material.map === image) return;
  record.material.map = image;
  record.material.needsUpdate = true;
  window.dispatchEvent(new Event('book-cover-loaded'));
}
function pruneLarge() {
  const available = [...jackets.values()].filter(r => r.large && !r.active).sort((a, b) => a.used - b.used);
  while ([...jackets.values()].filter(r => r.large).length > MAX_LARGE_TEXTURES && available.length) {
    const r = available.shift();
    r.large.dispose(); r.large = null;
  }
}
function load(record, size) {
  const url = record.book.coverImages?.[size];
  if (!url || record[size] || record[`${size}Pending`] || record[`${size}Failed`]) return;
  record[`${size}Pending`] = true;
  const loader = new THREE.TextureLoader();
  // Resolve paths against Vite's deployment base, including project Pages paths.
  loader.load(`${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`, image => {
    record[`${size}Pending`] = false;
    if (!image.image || image.image.width < 24 || image.image.height < 24) {
      image.dispose(); record[`${size}Failed`] = true; return;
    }
    image.colorSpace = THREE.SRGBColorSpace;
    image.anisotropy = 4;
    record[size] = image;
    record.used = ++useCounter;
    display(record);
    if (size === 'large') pruneLarge();
  }, undefined, () => { record[`${size}Pending`] = false; record[`${size}Failed`] = true; });
}
export function loadBookCoversForRoom(room) {
  for (const record of jackets.values()) if (record.book.room === room) load(record, 'small');
}
export function showLargeBookCover(id) {
  const record = jackets.get(id);
  if (!record) return;
  record.active = true; record.used = ++useCounter;
  display(record);
  load(record, 'large');
}
export function releaseLargeBookCover(id) {
  const record = jackets.get(id);
  if (!record) return;
  record.active = false; record.used = ++useCounter;
  display(record); pruneLarge();
}

function makeMaterials(book, orientation) {
  const cacheKey = `${book.id}:${orientation}`;
  if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);
  const colors = palette(book.id);
  const paper = new THREE.MeshStandardMaterial({ color: 0xe8decc, roughness: .88 });
  const front = new THREE.MeshStandardMaterial({ map: frontFallback(book, colors), roughness: .76 });
  const back = new THREE.MeshStandardMaterial({ map: backReconstruction(book, colors), roughness: .79 });
  const spine = new THREE.MeshStandardMaterial({ map: spineReconstruction(book, colors), roughness: .76 });
  // BoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z.
  // Upright: cover on the leaf-facing (+X) side; spine looks out (+Z).
  // Horizontal: front cover looks up (+Y); spine faces out (+Z).
  const materials = orientation === 'upright' || orientation === 'leaning'
    ? [front, back, paper, paper, spine, paper]
    : [paper, paper, front, back, spine, paper];
  materialCache.set(cacheKey, materials);
  jackets.set(book.id, { book, material: front, fallback: front.map, small: null, large: null, active: false, used: 0 });
  return materials;
}

export function placeCatalogBook(parent, book, w, h, d, x, y, z, orientation = 'upright') {
  if (!book) throw new Error('Catalog book is required');
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), makeMaterials(book, orientation));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.name = `Book: ${book.title}`;
  mesh.userData.bookId = book.id;
  mesh.userData.bookTitle = book.title;
  parent.add(mesh);
  return mesh;
}
