// A type system for a canvas, so sizes come from a scale instead of guesses.
//   node type-scale.mjs <canvasWidthPx> [--ratio 1.5] [--chars 24] [--aspect 1:1]
// Prints sizes for label / body / subhead / headline / display, and the largest headline size that fits <chars> characters on one line
// inside the safe width (so "longest copy" is checked before motion starts). Ratios: 1.25 calm, 1.333 balanced, 1.5 punchy, 1.618 dramatic.
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const W = +a[0]; if (!W) { console.error("usage: type-scale.mjs <canvasWidthPx> [--ratio 1.5] [--chars 24]"); process.exit(1); }
const ratio = +opt("--ratio", 1.5), chars = +opt("--chars", 24), safe = W * 0.9, base = Math.round(W * 0.03);
const step = k => Math.round(base * ratio ** k);
const roles = [["label (caps, +6% tracking)", step(0)], ["body / caption", step(1)], ["subhead", step(2)], ["headline", step(3)], ["display (hero word)", step(4)]];
console.log(`canvas ${W}px, ratio ${ratio}, base ${base}px, safe width ${Math.round(safe)}px (5% margin each side)\n`);
for (const [n, v] of roles) console.log(`${n.padEnd(28)} ${String(v).padStart(4)}px   ${(v / W * 100).toFixed(1)}% of width`);
const avg = 0.52, fit = Math.floor(safe / (chars * avg));      // average glyph width ~0.52em for a bold grotesque; serifs ~0.5, mono 0.6
console.log(`\nLongest headline you expect: ${chars} characters on one line -> max ~${fit}px (avg glyph 0.52em). ${fit < step(3) ? `The headline step (${step(3)}px) will NOT fit on one line: wrap to 2 lines, shorten the copy, or drop a step.` : `The headline step (${step(3)}px) fits on one line.`}`);
console.log(`Rules of thumb: display tracking -2% to -4%, caps labels +5% to +8%, line height 1.0-1.1 for headlines and 1.3-1.5 for body, max two typefaces, ~40 characters per line on screen, on-screen words stay >= 0.3 s each + 0.5 s.`);
