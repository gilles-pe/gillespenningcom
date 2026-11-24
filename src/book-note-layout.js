// Personal copy is owner-approved content. Layout wraps every word; it never truncates.
export function personalBookNote(book, language) {
  const lang = language === 'de' ? 'de' : 'en';
  const text = book.personalNote?.[lang];
  return typeof text === 'string' && text.trim() ? text : null;
}
export function wrapBookNote(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? line + ' ' + word : word;
    if (line && ctx.measureText(candidate).width > width) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}
export function personalNoteLayout(ctx, book, language, width, height) {
  const text = personalBookNote(book, language);
  if (!text) return null;
  const lang = language === 'de' ? 'de' : 'en';
  const scale = width / 768, margin = 52 * scale, measure = width - 2 * margin;
  const blocks = [];
  let y = margin;
  function block(text, size, weight, gap) {
    ctx.font = `${weight} ${size * scale}px Georgia, serif`;
    const lines = wrapBookNote(ctx, text, measure);
    const lineHeight = size * scale * 1.22;
    blocks.push({ text, lines, font: ctx.font, lineHeight, x: margin, y });
    y += lines.length * lineHeight + gap * scale;
  }
  block(book.title, 28, '600', 12);
  block(book.author, 24, '400', 54);
  const bottom = height - margin - (book.amazonUrl ? 120 : 36) * scale;
  let size = 46 * scale, lines, lineHeight;
  do {
    ctx.font = `400 ${size}px Georgia, serif`;
    lines = wrapBookNote(ctx, text, measure);
    lineHeight = size * 1.23;
    if (y + lines.length * lineHeight <= bottom && lines.every(line => ctx.measureText(line).width <= measure)) break;
    size -= scale;
  } while (size >= 24 * scale);
  if (size < 24 * scale) throw new Error('Personal book note does not fit: ' + book.id + ':' + lang);
  blocks.push({ text, lines, font: ctx.font, lineHeight, x: margin, y });
  return { language: lang, text, blocks, bottom: y + lines.length * lineHeight, limit: bottom, bodyFontSize: size };
}

export function amazonBackLink(book, width, height) {
  if (!book.amazonUrl || !/^https:\/\//i.test(book.amazonUrl)) return null;
  const scale = width / 768;
  return { x: 52 * scale, y: height - 145 * scale, width: width - 104 * scale, height: 55 * scale };
}
export function hitAmazonBack(book, uv, materialIndex, width, height) {
  if (!uv || materialIndex !== (book.placement.orientation === 'horizontal' ? 3 : 1)) return false;
  const box = amazonBackLink(book, width, height);
  if (!box) return false;
  const flat = book.placement.orientation === 'horizontal';
  const x = (flat ? 1 - uv.x : uv.x) * width, y = (flat ? uv.y : 1 - uv.y) * height;
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}
