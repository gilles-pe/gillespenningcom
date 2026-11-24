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
assert.equal(new URL(book.amazonUrl).searchParams.get('tag'), 'aiinmedicine-21', 'owner-supplied affiliate tracking ID');
assert(new URL(book.amazonUrl).pathname.includes('/dp/1529346185'), 'owner-supplied book destination');
assert.deepEqual(book.placement, { anchor: 'writing-shelf-display-middle', orientation: 'upright', order: 4 });
const hail = books.find(b => b.id === 'project-hail-mary');
const hailApproved = {
  "en": "The movie is good, the book is fantastic. Science and emotion come together in a way a movie can never quite capture. A quick, smart and emotional read.",
  "de": "Der Film ist gut, das Buch fantastisch. Wissenschaft und Emotionen werden auf eine Weise verbunden, die ein Film nie ganz einfangen kann. Eine kurzweilige, kluge und emotionale Lektüre."
};
for (const lang of ['en','de']) {
  assert.equal(personalBookNote(hail, lang), hailApproved[lang], 'approved Project Hail Mary text');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, hail, lang, 768, Math.round(768 / (.15 / .22)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), hailApproved[lang], 'complete personal note');
  assert(layout.bottom <= layout.limit, 'personal note does not overlap the Amazon link');
}
const leviathan = books.find(b => b.id === 'leviathan-wakes');
const leviathanApproved = {
  "en": "The start of a series that rivals The Lord of the Rings. The first book starts slowly, but the story grows to incredible proportions with each book, while staying grounded in physics. Fantastic.",
  "de": "Der Auftakt zu einer Serie, die ein Rivale für Der Herr der Ringe ist. Das erste Buch startet langsam, doch die Geschichte wächst mit jedem Buch in unfassbare Dimensionen und bleibt dabei in der Physik verankert. Fantastisch."
};
for (const lang of ['en', 'de']) {
  assert.equal(personalBookNote(leviathan, lang), leviathanApproved[lang], 'approved Leviathan Wakes text');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, leviathan, lang, 768, Math.round(768 / (.16 / .23)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), leviathanApproved[lang], 'complete personal note');
  assert(layout.bottom <= layout.limit, 'note must not overlap the Amazon link');
}
assert.equal(new URL(leviathan.amazonUrl).searchParams.get('tag'), 'aiinmedicine-21');
assert(new URL(leviathan.amazonUrl).pathname.includes('/dp/B004XCGKYQ'));
const kahneman = books.find(b => b.id === 'thinking-fast-and-slow');
const kahnemanApproved = {
  "en": "Everyone talks about it. Hardly anyone finishes it. I fought my way through it and, in the years since, have kept returning to it in certain situations. It was worth it.",
  "de": "Alle reden darüber. Kaum jemand liest es zu Ende. Ich habe mich durchgekämpft und bin in den Jahren danach in bestimmten Situationen immer wieder darauf zurückgekommen. Es war es wert."
};
for (const lang of ['en', 'de']) {
  assert.equal(personalBookNote(kahneman, lang), kahnemanApproved[lang], 'approved Thinking, Fast and Slow text');
  const ctx = { font: '', measureText(text) { const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 16); return { width: [...text].length * size * .56 }; } };
  const layout = personalNoteLayout(ctx, kahneman, lang, 768, Math.round(768 / (.18 / .205)));
  assert.equal(layout.blocks.at(-1).lines.join(' '), kahnemanApproved[lang], 'complete personal note');
  assert(layout.bottom <= layout.limit, 'note must fit on the back');
}
for (const b of books.filter(b => b.id !== book.id && b.id !== hail.id && b.id !== leviathan.id && b.id !== kahneman.id)) {
  assert.equal(personalBookNote(b, 'en'), null, b.id);
  assert.equal(personalBookNote(b, 'de'), null, b.id);
}
assert.equal(personalBookNote({ personalNote: { en: 'Approved English only' } }, 'de'), null, 'no invented translation or language fallback');
console.log('Personal book notes: exact approved EN/DE, separate summary, complete wrapping, missing-note fallback: passed');
