// Fails (exit 1) when src/style.css uses sizes outside the token scales of src/tokens.css (see AGENTS.md).
//
// Checked properties and what they may contain:
//   font-size                     var(--t1..t6), inherit, percentages, em/rem, calc() of those
//   font (shorthand)              no raw px; size part via var(--t*)
//   border-radius                 var(--r*), 0, percentages
//   height, min-height, max-height  var(--h*) or var(--s*) (also inside calc/min/max/clamp), auto, 0, %, viewport units (vh/svh/dvh/vw)
//   margin*, padding*, gap, row-gap, column-gap   var(--s*), 0, auto, %, viewport units, calc/min/max of those
// Everywhere: a raw px value is a violation, except the documented exceptions below.
//
// Documented exceptions (edit here, with a reason):
//   - 0 and 0px.
//   - 1px and 2px: hairline borders, rules and outlines (properties border*, outline*, text-decoration-thickness). Never for spacing.
//   - Media query breakpoints (800px, 1100px, ...) are in @media preludes, not declarations, and are not checked.
//   - Properties not listed above (width, max-width, grid-template-*, top/left/inset, line-height, transforms) are not checked.
//     Layout widths such as the card width are built from tokens with calc(), but that is a convention, not enforced here.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILES = ['style.css', 'legal.css'];   // legal.css belongs to legal.html
const tokens = readFileSync(fileURLToPath(new URL('../src/tokens.css', import.meta.url)), 'utf8');
const defined = new Set([...tokens.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));

const fails = [];
for (const file of FILES) {
const css = readFileSync(fileURLToPath(new URL(`../src/${file}`, import.meta.url)), 'utf8');
const clean = css.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
const lines = clean.split('\n');
const fail = (i, prop, val, why) => fails.push(`src/${file}:${i + 1}  ${prop}: ${val.trim()}  -> ${why}`);

const SPACING = /^(margin|padding)(-(top|right|bottom|left|inline|block)(-(start|end))?)?$|^(gap|row-gap|column-gap)$/;
const HEIGHT = /^(height|min-height|max-height)$/;
const rawPx = v => [...v.replace(/var\([^)]*\)/g, '').matchAll(/(-?\d*\.?\d+)px/g)].map(m => m[1]);
const vars = v => [...v.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]);

lines.forEach((line, i) => {
  for (const m of line.matchAll(/(?:^|[{;\s])([a-z-]+)\s*:\s*([^;{}]+)/g)) {
    const prop = m[1], val = m[2];
    const px = rawPx(val).filter(n => parseFloat(n) !== 0);
    const used = vars(val);
    for (const v of used) if (!defined.has(v) && !['--font'].includes(v)) fail(i, prop, val, `unknown token ${v}`);
    if (prop === 'font-size') {
      if (px.length) fail(i, prop, val, `raw px (${px.join(', ')}), use var(--t1..t6)`);
      for (const v of used) if (!/^--t\d$/.test(v)) fail(i, prop, val, `${v} is not a font-size token`);
    } else if (prop === 'font') {
      if (px.length) fail(i, prop, val, 'raw px in shorthand, use var(--t*)');
      for (const v of used) if (v !== '--font' && !/^--t\d$/.test(v)) fail(i, prop, val, `${v} is not a font-size token`);
    } else if (prop === 'border-radius') {
      if (px.length) fail(i, prop, val, 'raw px, use var(--r*)');
      for (const v of used) if (!/^--r/.test(v)) fail(i, prop, val, `${v} is not a radius token`);
    } else if (HEIGHT.test(prop)) {
      if (px.length) fail(i, prop, val, 'raw px, use var(--h*) or calc() of var(--s*)');
      for (const v of used) if (!/^--[hs]\d$/.test(v)) fail(i, prop, val, `${v} is not a height or spacing token`);
    } else if (SPACING.test(prop)) {
      if (px.length) fail(i, prop, val, 'raw px, use var(--s*)');
      for (const v of used) if (!/^--s\d$/.test(v)) fail(i, prop, val, `${v} is not a spacing token`);
    } else if (/^(border|outline|text-decoration-thickness)/.test(prop)) {
      // Hairlines: 1px and 2px only.
      const bad = px.filter(n => !['1', '2'].includes(n));
      if (bad.length) fail(i, prop, val, `${bad.join(', ')}px is not 1px or 2px`);
    }
  }
});
}

if (fails.length) { console.error(`check-tokens: ${fails.length} violation(s)\n` + fails.join('\n')); process.exit(1); }
console.log('check-tokens: ok (src/style.css and src/legal.css use only the token scales)');
