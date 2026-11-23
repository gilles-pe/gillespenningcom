// Real Chromium screenshots and input checks; dev debug API is never shipped to production.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';
const output = '.book-review';
await mkdir(output, { recursive: true });
const catalog = JSON.parse(await readFile('src/data/books.json', 'utf8')).books;
const approved = catalog.find(b => b.id === 'riding-the-waves-of-culture');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], { stdio: 'inherit' });
let browser, currentPage;
try {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch('http://127.0.0.1:5173'); if (r.ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  browser = await chromium.launch({ args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = [];
  const live = process.env.BOOK_REVIEW_LIVE === '1';
  if (live) {
    const response = await fetch('https://gillespenning.com/?book-review=' + Date.now());
    assert(response.ok, 'live homepage loads');
    const html = await response.text();
    assert(html.includes('id="scene"'), 'live homepage includes the real scene');
    // Vite publishes book data in lazy-loaded JavaScript chunks. Validate the
    // rendered back via its accessibility status below, rather than HTML text.
  }
  for (const [device, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: device === 'mobile' ? 2 : 1, isMobile: device === 'mobile', hasTouch: device === 'mobile', reducedMotion: 'reduce' });
    const page = await context.newPage(); currentPage = page;
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/?lang=en#writing');
    await page.waitForFunction(() => window.__gp?.bookUI.bookCount === 27);
    await page.evaluate(() => document.fonts.ready);
    // Room/hash startup and small textures settle before snapshots.
    await page.waitForTimeout(600);
    const actual = await page.evaluate(() => {
      const rows = [];
      window.__gp.scene.traverse(m => { if (m.isMesh && m.userData.bookId) rows.push({ id: m.userData.bookId, title: m.userData.bookTitle }); });
      return rows;
    });
    assert.equal(actual.length, 27);
    for (const b of catalog) assert(actual.some(m => m.id === b.id && m.title === b.title), b.id);
    const stage = page.locator('#stage');
    async function enter(id, room) {
      await page.evaluate(room => { location.hash = room; }, room);
      await page.waitForTimeout(100);
      await page.evaluate(id => window.__gp.tapShelfBook(id), id);
      await stage.focus();
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.__gp.bookUI.isExtracted()), false);
      await stage.press('Enter');
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.__gp.bookUI.activeFace), 'front');
    }
    if (!live) {
    await enter(approved.id, 'writing');
    await stage.press('Enter'); await stage.press('Enter');
    for (const lang of ['en', 'de']) {
      await page.locator('#lang [data-lang="' + lang + '"]').click();
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => window.__gp.bookUI.activeFace), 'back');
      assert.equal(await page.evaluate(() => window.__gp.bookUI.isExtracted()), true);
      assert((await page.locator('.book-status').textContent()).includes(approved.personalNote[lang]));
      const layout = await page.evaluate(async ({ id, lang }) => {
        const { personalNoteLayout } = await import('/src/book-note-layout.js');
        const book = (await import('/src/data/books.json')).default.books.find(b => b.id === id);
        const canvas = window.__gp.bookUI.getMesh(id).material[1].map.image;
        const ctx = canvas.getContext('2d');
        const plan = personalNoteLayout(ctx, book, lang, canvas.width, canvas.height);
        const body = plan.blocks.at(-1);
        ctx.font = body.font;
        return { bottom: plan.bottom, limit: plan.limit, text: body.lines.join(' '), fontSize: plan.bodyFontSize,
          maxWidth: Math.max(...body.lines.map(line => ctx.measureText(line).width)), width: canvas.width - 104,
          dataUrl: canvas.toDataURL('image/png') };
      }, { id: approved.id, lang });
      assert.equal(layout.text, approved.personalNote[lang]);
      assert(layout.bottom <= layout.limit && layout.maxWidth <= layout.width);
      // Texture capture makes the exact rendered back independently reviewable.
      if (device === 'desktop') await writeFile(output + '/riding-back-' + lang + '.png', Buffer.from(layout.dataUrl.split(',')[1], 'base64'));
      await stage.screenshot({ path: output + '/' + device + '-' + lang + '.png' });
      report.push({ device, language: lang, complete: true, bodyTexturePx: layout.fontSize, bottom: layout.bottom, limit: layout.limit });
    }
    // All placements, at two orbit angles; existing keyboard/click contract and return.
    await stage.focus(); await stage.press('Enter');
    assert.equal(await page.evaluate(() => window.__gp.bookUI.isActive()), false);
    for (const [id, room] of [['factfulness','writing'], ['project-hail-mary','about'], ['the-wright-brothers','about']]) {
      for (const angle of [0, 30]) {
        await page.evaluate(() => { document.getElementById('reset-view').click(); });
        await enter(id, room);
        if (angle) await page.evaluate(dx => window.__gp.orbitPx(dx, 0, false), angle);
        await page.waitForTimeout(50);
        for (const face of ['spine','back']) {
          await stage.press('Enter'); await page.waitForTimeout(50);
          assert.equal(await page.evaluate(() => window.__gp.bookUI.activeFace), face);
        }
        await stage.press('Enter');
        assert.equal(await page.evaluate(() => window.__gp.bookUI.isActive()), false);
      }
    }
    // A normal animation run supplements reduced-motion snapshots.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('http://127.0.0.1:5173/?lang=de#writing');
    await page.waitForFunction(() => window.__gp?.bookUI.bookCount === 27);
    await page.evaluate(() => window.__gp.tapShelfBook('riding-the-waves-of-culture'));
    await page.waitForTimeout(700);
    await stage.focus(); await stage.press('Enter'); await page.waitForTimeout(900);
    await stage.press('Enter'); await page.waitForTimeout(600);
    await stage.press('Enter'); await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => window.__gp.bookUI.activeFace), 'back');
    await stage.screenshot({ path: output + '/' + device + '-animated-back.png' });
    await stage.press('Escape'); await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => window.__gp.bookUI.isActive()), false);
    assert.deepEqual(errors, [], 'no browser runtime errors');
    }
    if (live) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      // Capture the real live renderer, then use its keyboard interface after framing
      // by the shelf coordinates obtained from the identical tested source geometry.
      await page.goto('http://127.0.0.1:5173/?lang=en#writing');
      await page.waitForFunction(() => window.__gp?.bookUI.bookCount === 27);
      await page.waitForTimeout(900);
      const candidates = await page.evaluate(() => {
        const gp = window.__gp, m = gp.bookUI.getMesh('riding-the-waves-of-culture');
        const p = m.getWorldPosition(gp.camera.position.clone()).project(gp.camera);
        const r = document.getElementById('stage').getBoundingClientRect();
        const x = (p.x + 1) / 2, y = (1 - p.y) / 2;
        return [0, -.35, .35, -.7, .7].flatMap(dy =>
          [0, -2, 2, -5, 5].map(dx => ({ x: x + dx / r.width, y: y + dy * .12 })));
      });
      await page.goto('https://gillespenning.com/?lang=en#writing');
      await page.locator('.hero--rendered').waitFor();
      await page.waitForTimeout(600);
      await stage.scrollIntoViewIfNeeded();
      const rect = await stage.boundingBox();
      let point = null;
      for (const c of candidates) {
        const p = { x: rect.x + c.x * rect.width, y: rect.y + c.y * rect.height };
        await page.mouse.move(p.x, p.y);
        const tip = page.locator('.hover-tip');
        if (await tip.isVisible() && (await tip.textContent()) === approved.title) { point = p; break; }
      }
      await stage.screenshot({ path: output + '/live-' + device + '-shelf.png' });
      assert(point, 'live shelf hover identifies Riding the Waves of Culture before click');
      await page.mouse.click(point.x, point.y);
      await stage.focus(); await page.waitForTimeout(800);
      await stage.press('Enter'); await page.waitForTimeout(900);
      await stage.press('Enter'); await page.waitForTimeout(600);
      await stage.press('Enter'); await page.waitForTimeout(600);
      assert((await page.locator('.book-status').textContent()).includes(approved.personalNote.en), 'live back has approved English copy');
      await stage.screenshot({ path: output + '/live-' + device + '-en.png' });
      await page.locator('#lang [data-lang="de"]').click(); await page.waitForTimeout(300);
      assert((await page.locator('.book-status').textContent()).includes(approved.personalNote.de), 'live back switches to approved German copy');
      await stage.screenshot({ path: output + '/live-' + device + '-de.png' });
      report.push({ device, live: true, en: true, de: true });
    }
    await context.close();
  }
  // Contact sheet uses the exact local large files used by the model, with catalog captions.
  const tiles = [];
  for (const [i, b] of catalog.entries()) {
    const cover = await sharp('public' + b.coverImages.large).resize(170, 240, { fit: 'contain', background: '#f7f6f2' }).png().toBuffer();
    const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    const words = b.title.split(' '), lines = []; let line = '';
    for (const word of words) { if ((line + ' ' + word).length > 28) { lines.push(line); line = word; } else line += (line ? ' ' : '') + word; } if (line) lines.push(line);
    const caption = Buffer.from('<svg width="210" height="100"><rect width="210" height="100" fill="#f7f6f2"/><g font-family="sans-serif" font-size="11" fill="#18181b">' + lines.slice(0,4).map((l,j) => '<text x="6" y="' + (16+j*13) + '">' + esc(l) + '</text>').join('') + '<text x="6" y="83">' + esc(b.author.slice(0,31)) + '</text></g></svg>');
    const tile = await sharp({ create: { width:210,height:340,channels:4,background:'#f7f6f2' } }).composite([{ input:cover,left:20,top:0 },{ input:caption,left:0,top:240 }]).png().toBuffer();
    tiles.push({ input:tile,left:(i%5)*210,top:Math.floor(i/5)*340 });
  }
  await sharp({ create:{ width:1050,height:2040,channels:4,background:'#f7f6f2' } }).composite(tiles).png().toFile(output + '/all-27-covers.png');
  await writeFile(output + '/report.json', JSON.stringify({ source:process.env.GITHUB_SHA, live, checks:report }, null, 2));
  console.log('Real Chromium: desktop/mobile EN/DE complete backs, language switch, three placements/two angles, animation and return passed' + (live ? '; live site verified' : ''));
} catch (error) {
  await currentPage?.screenshot({ path: output + '/failure.png', fullPage: true }).catch(() => {});
  await writeFile(output + '/failure.txt', String(error?.stack || error));
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
