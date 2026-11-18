import sharp from 'sharp';
import fs from 'fs';

async function createSlots() {
  // 1. Praxisfaden (projects-board-3.webp)
  const mascotBuf = await sharp('C:/Users/gille/.gemini/antigravity/brain/7a90be62-ed33-4166-940a-af5cf3cca487/.user_uploaded/media_1794992213492_1c2f5b68.png')
    .resize(620, null, { kernel: 'lanczos3' })
    .toBuffer();

  const meta = await sharp(mascotBuf).metadata();
  const left = Math.round((1200 - meta.width) / 2);
  const top = Math.round((900 - meta.height) / 2) - 15;

  const shadowSvg = Buffer.from(`<svg width="1200" height="900">
    <ellipse cx="600" cy="${top + meta.height - 20}" rx="230" ry="26" fill="rgba(24, 24, 27, 0.08)" />
    <ellipse cx="600" cy="${top + meta.height - 20}" rx="140" ry="15" fill="rgba(24, 24, 27, 0.10)" />
  </svg>`);

  await sharp({
    create: {
      width: 1200,
      height: 900,
      channels: 4,
      background: { r: 247, g: 246, b: 242, alpha: 1 }
    }
  })
  .composite([
    { input: shadowSvg, top: 0, left: 0 },
    { input: mascotBuf, top, left }
  ])
  .webp({ quality: 92 })
  .toFile('public/slots/projects-board-3.webp');

  console.log('Saved projects-board-3.webp (Praxisfaden mascot)');

  // 2. hDRG-Kompass (projects-board-4.webp)
  // Let's create an editorial graphic for hDRG-Kompass:
  // Clean ivory-beige card with the compass SVG, prominent typography, and subtitle.
  const compassSvg = `<svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bgGlow" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f7f6f2" />
      </radialGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#18181b" flood-opacity="0.08" />
      </filter>
    </defs>
    <rect width="1200" height="900" fill="url(#bgGlow)" />
    
    <!-- Fine inner border hairline -->
    <rect x="36" y="36" width="1128" height="828" rx="8" fill="none" stroke="#dcd9d0" stroke-width="2" />

    <!-- Center Card -->
    <g transform="translate(600, 370)">
      <!-- Compass emblem -->
      <g transform="scale(0.85) translate(-200, -220)">
        <!-- Outer circle -->
        <circle cx="200" cy="200" r="180" fill="none" stroke="#1e3a8a" stroke-width="8"/>
        <!-- Inner compass ring -->
        <circle cx="200" cy="200" r="140" fill="none" stroke="#1e3a8a" stroke-width="20"/>
        <!-- Arrows -->
        <path d="M 200 60 L 185 100 L 200 90 L 215 100 Z" fill="#1e3a8a"/>
        <path d="M 340 200 L 300 185 L 310 200 L 300 215 Z" fill="#1e3a8a"/>
        <path d="M 200 340 L 215 300 L 200 310 L 185 300 Z" fill="#1e3a8a"/>
        <path d="M 60 200 L 100 215 L 90 200 L 100 185 Z" fill="#1e3a8a"/>
        <!-- Text hDRG -->
        <text x="200" y="200" font-family="'Source Sans 3', 'Arial', sans-serif" font-size="60" font-weight="700" fill="#1e3a8a" text-anchor="middle" dominant-baseline="middle">hDRG</text>
        <!-- Text Kompass -->
        <text x="200" y="245" font-family="'Source Sans 3', 'Arial', sans-serif" font-size="34" font-weight="500" fill="#18181b" text-anchor="middle" dominant-baseline="middle">Kompass</text>
      </g>
    </g>

    <!-- Headline and Subtitle -->
    <text x="600" y="650" font-family="'Source Serif 4', Georgia, serif" font-size="52" font-weight="600" fill="#18181b" text-anchor="middle" letter-spacing="-0.02em">hDRG-Kompass</text>
    <text x="600" y="710" font-family="'Source Sans 3', system-ui, sans-serif" font-size="24" font-weight="500" fill="#4b5563" text-anchor="middle">Leitfaden &amp; Analyseplattform für Hybrid-DRG in Praxen und MVZ</text>
    
    <!-- Link badge -->
    <rect x="490" y="756" width="220" height="42" rx="21" fill="#eff6ff" stroke="#1e3a8a" stroke-width="1.5" />
    <text x="600" y="783" font-family="'Source Sans 3', system-ui, sans-serif" font-size="16" font-weight="600" fill="#1e3a8a" text-anchor="middle">hdrg-kompass.de ↗</text>
  </svg>`;

  await sharp(Buffer.from(compassSvg))
    .webp({ quality: 92 })
    .toFile('public/slots/projects-board-4.webp');

  console.log('Saved projects-board-4.webp (hDRG-Kompass)');
}

createSlots().catch(err => {
  console.error(err);
  process.exit(1);
});
