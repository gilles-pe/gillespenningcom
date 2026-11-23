// Verify book metadata and scene-placement invariants before publishing.
import { readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const file = new URL('../src/data/books.json', import.meta.url);
const { books, catalogLanguage } = JSON.parse(readFileSync(file, 'utf8'));
const capacity = {
  'writing-shelf-display-left': 4,
  'writing-shelf-display-middle': 4,
  'writing-shelf-display-right-stack': 2,
  'writing-shelf-display-right-separate': 1,
  'about-cabinet-upper-left': 3,
  'about-cabinet-lower-left': 4,
  'about-cabinet-lower-right-stack': 3,
  'about-cabinet-top-upright': 4,
  'about-cabinet-top-leaning': 1,
  'about-globe-adjacent': 1,
};
const fail = msg => { throw new Error('Book catalog: ' + msg); };
const isbnValid = isbn => {
  if (!/^\d{13}$/.test(String(isbn))) return false;
  const digits = [...isbn].map(Number);
  const sum = digits.slice(0, 12).reduce((total, d, i) => total + d * (i % 2 ? 3 : 1), 0);
  return digits[12] === (10 - sum % 10) % 10;
};

if (catalogLanguage !== 'en') fail('catalogLanguage must be en');
if (!Array.isArray(books) || books.length !== 27) fail('Expected 27 books');
const ids = new Set(), slots = new Set(), roomCounts = { about: 0, writing: 0 };
const placed = Object.fromEntries(Object.keys(capacity).map(k => [k, []]));
for (const b of books) {
  if (!b.id || ids.has(b.id)) fail('Duplicate/missing id ' + b.id);
  ids.add(b.id);
  if (b.editionLanguage !== 'en' || !b.title || !b.author) fail('English title/author missing: ' + b.id);
  if (!(b.room in roomCounts)) fail('Unknown room: ' + b.id);
  roomCounts[b.room]++;
  if (!isbnValid(b.isbn13)) fail('Invalid ISBN-13: ' + b.id);
  const { anchor, orientation, order } = b.placement || {};
  if (!(anchor in capacity)) fail('Unknown anchor: ' + b.id);
  if (!['upright', 'horizontal', 'leaning'].includes(orientation)) fail('Unknown orientation: ' + b.id);
  if (!Number.isInteger(order) || order < 1 || order > capacity[anchor]) fail('Invalid order: ' + b.id);
  const key = anchor + ':' + order;
  if (slots.has(key)) fail('Duplicate shelf position: ' + key);
  slots.add(key); placed[anchor].push(order);
  if (anchor.startsWith('writing-') !== (b.room === 'writing')) fail('Wrong room for anchor: ' + b.id);
  if (b.coverImage !== null) fail('Legacy remote cover must not load: ' + b.id);
  if (!b.coverResearch?.editionSourceUrl || !b.coverResearch?.visualReview || !b.coverResearch?.usageRights) fail('Cover research incomplete: ' + b.id);
  if (b.coverImages) {
    for (const [size, maxWidth, maxHeight] of [['small', 256, 384], ['large', 512, 768]]) {
      const path = b.coverImages[size];
      const expected = `/books/${b.id}/cover-${size === 'small' ? 'sm' : 'lg'}.webp`;
      if (path !== expected) fail(`Unexpected ${size} path for ${b.id}`);
      const asset = new URL('../public' + path, import.meta.url);
      let meta, info;
      try { [meta, info] = await Promise.all([sharp(fileURLToPath(asset)).metadata(), stat(asset)]); }
      catch { fail(`Missing or invalid ${size} cover for ${b.id}`); }
      if (meta.format !== 'webp' || meta.width < 24 || meta.height < 24 || meta.width > maxWidth || meta.height > maxHeight || info.size < 100) fail(`Implausible ${size} cover for ${b.id}`);
    }
    const small = await sharp(fileURLToPath(new URL('../public' + b.coverImages.small, import.meta.url))).metadata();
    const large = await sharp(fileURLToPath(new URL('../public' + b.coverImages.large, import.meta.url))).metadata();
    if (Math.abs(small.width / small.height - large.width / large.height) > .01) fail('Cover aspect ratio differs: ' + b.id);
  } else if (b.coverImageStatus !== 'generated-fallback-pending-review') fail('Missing fallback status: ' + b.id);
  if (b.amazonUrl && !/^https:\/\//.test(b.amazonUrl)) fail('Invalid Amazon URL: ' + b.id);
}
if (roomCounts.about !== 16 || roomCounts.writing !== 11) fail('Room counts mismatch');
for (const [anchor, count] of Object.entries(capacity)) {
  if (placed[anchor].length !== count) fail('Missing shelf positions: ' + anchor);
}
if (books.find(b => b.id === 'the-wright-brothers')?.placement.anchor !== 'about-globe-adjacent')
  fail('The Wright Brothers must remain by the globe');
console.log('Books checked: 27 English editions, 16 About Me / 11 Writing, ISBNs and slots valid.');
