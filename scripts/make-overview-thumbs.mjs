import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SLOTS_DIR = 'public/slots';
const MODELS_DIR = 'public/models';

async function buildGroup(dir, filter, resizeOpts, webpOpts) {
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.webp') && !f.endsWith('-sm.webp') && filter(f))
    .sort();
  let totalBytes = 0;
  for (const file of files) {
    const src = join(dir, file);
    const outName = file.replace(/\.webp$/, '-sm.webp');
    const dst = join(dir, outName);
    await sharp(src).resize(resizeOpts).webp(webpOpts).toFile(dst);
    const bytes = statSync(dst).size;
    totalBytes += bytes;
    console.log(`${dst}  ${(bytes / 1024).toFixed(1)} KB`);
  }
  return { count: files.length, totalBytes };
}

const slots = await buildGroup(
  SLOTS_DIR,
  () => true,
  { width: 256, height: 256, fit: 'inside', withoutEnlargement: true },
  { quality: 78 },
);
const articles = await buildGroup(
  MODELS_DIR,
  f => f.startsWith('article-'),
  { width: 192, withoutEnlargement: true },
  { quality: 76 },
);

const totalKB = ((slots.totalBytes + articles.totalBytes) / 1024).toFixed(1);
console.log(
  `Summary -> slots(${slots.count}): ${(slots.totalBytes / 1024).toFixed(1)} KB | `
  + `articles(${articles.count}): ${(articles.totalBytes / 1024).toFixed(1)} KB | `
  + `generated total: ${totalKB} KB`,
);
