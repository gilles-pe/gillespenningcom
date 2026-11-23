import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { personalBookNote, personalNoteLayout } from '../src/book-note-layout.js';
const { books } = JSON.parse(readFileSync(new URL('../src/data/books.json', import.meta.url), 'utf8'));
const book = books.find(b => b.id === 'riding-the-waves-of-culture');
// Exact owner-approved wording: edits require a new explicit approval.
const approved = {
  "en": "An oldie but a goldie. I keep returning to this book to better understand and manage people across different cultures. Extremely valuable in business and private life. If you don't have time to read it, take a look at the diagrams.",
  "de": "Ein Klassiker, zu dem ich immer wieder zurückkehre, um Menschen unterschiedlicher Kulturen besser zu verstehen und zu führen. Extrem wertvoll im Berufs- wie im Privatleben. Wer keine Zeit zum Lesen hat, sollte sich zumindest die Diagramme anschauen."
};
for (const lang of ['en', 'de']) {
  assert.equal(book.personalNote[lang], approved[lang]);
  assert.equal(personalBookNote(book, lang), approved[lang]);
  // Portrait, square-ish upright and lying jackets; proportional fonts at actual texture sizes.
  for (const aspect of [2 / 3, .18 / .205, .11 / .17, .15 / .22, 1]) {
    const ctx = { font: '', measureText(text) {
      const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16);
      return { width: [...text].length * size * .56 };
    }};
    const layout = personalNoteLayout(ctx, book, lang, 768, Math.round(768 / aspect));
    assert.equal(layout.blocks.at(-1).lines.join(' '), approved[lang], 'every word retained');
    assert(layout.bottom <= layout.limit, 'no vertical clipping');
    assert(layout.bodyFontSize >= 24);
    for (const block of layout.blocks) {
      ctx.font = block.font;
      assert(block.lines.every(line => ctx.measureText(line).width <= 768 - 104), 'no horizontal clipping');
    }
  }
}
assert.equal(book.summary.en, "A classic guide to cross-cultural management, showing how cultural differences shape global business.");
assert.deepEqual(book.placement, { anchor: 'writing-shelf-display-middle', orientation: 'upright', order: 4 });
for (const b of books.filter(b => b.id !== book.id)) {
  assert.equal(personalBookNote(b, 'en'), null, b.id);
  assert.equal(personalBookNote(b, 'de'), null, b.id);
}
assert.equal(personalBookNote({ personalNote: { en: 'Approved English only' } }, 'de'), null, 'no invented translation or language fallback');
console.log('Personal book notes: exact approved EN/DE, separate summary, complete wrapping, missing-note fallback: passed');
