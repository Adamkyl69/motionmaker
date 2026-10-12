// Palette tools an art director uses before anything moves: generate a palette from one brand colour, and check a palette.
//
//   node palette.mjs gen <#hex> [--scheme mono|analogous|complementary|triad|split] [--mode light|dark]
//   node palette.mjs check <bg> <fg> <accent>
//   node palette.mjs look <look-name>          # check a look from ../looks/looks.json
//
// Checks (WCAG 2.x relative luminance): text vs background >= 4.5:1 (AA; 7:1 AAA), accent vs background >= 3:1 (large text / graphics),
// accent distinct from text, and which ink (dark/light) is readable ON the accent. Also prints the usual 60-30-10 role split.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hex2rgb = h => { h = h.replace("#", ""); if (h.length === 3) h = [...h].map(c => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb2hex = ([r, g, b]) => "#" + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = rgb => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
export const contrast = (a, b) => { const [x, y] = [lum(hex2rgb(a)), lum(hex2rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
function hsl2rgb([h, s, l]) { h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return [(r + m) * 255, (g + m) * 255, (b + m) * 255]; }
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

export function check(bg, fg, accent) {
  const out = [], row = (ok, name, detail) => out.push({ ok, name, detail });
  const t = contrast(bg, fg), a = contrast(bg, accent), fa = contrast(fg, accent);
  row(t >= 4.5, "text on background", `${t.toFixed(2)}:1 ${t >= 7 ? "(AAA)" : t >= 4.5 ? "(AA)" : "(below 4.5: too faint for text)"}`);
  row(a >= 3, "accent on background", `${a.toFixed(2)}:1 ${a >= 4.5 ? "(works for text too)" : a >= 3 ? "(OK for large text, bars, shapes; not small text)" : "(below 3: the accent will not stand out)"}`);
  const onAccent = contrast(accent, "#FFFFFF") >= contrast(accent, "#111111") ? "#FFFFFF" : "#111111", oa = Math.max(contrast(accent, "#FFFFFF"), contrast(accent, "#111111"));
  row(oa >= 4.5, "text ON the accent", `use ${onAccent} (${oa.toFixed(2)}:1)${oa < 4.5 ? ": neither ink reads well on this accent, avoid labels on it" : ""}`);
  const [hf, sf] = rgb2hsl(hex2rgb(fg)), [ha, sa] = rgb2hsl(hex2rgb(accent)), [hb] = rgb2hsl(hex2rgb(bg));
  row(fa >= 1.5 || hueDist(hf, ha) > 25 || sa > 0.35, "accent distinct from text", `${fa.toFixed(2)}:1 between them, hue gap ${hueDist(hf, ha).toFixed(0)} deg`);
  row(sa >= 0.25, "accent has real chroma", `saturation ${(sa * 100).toFixed(0)}% ${sa < 0.25 ? "(near-grey: it will not read as an accent)" : ""}`);
  return { rows: out, ok: out.every(r => r.ok), onAccent, hues: { bg: hb, fg: hf, accent: ha } };
}

function gen(base, scheme = "complementary", mode = "light") {
  const [h, s] = rgb2hsl(hex2rgb(base)), off = { mono: 0, analogous: 30, complementary: 180, triad: 120, split: 150 }[scheme] ?? 180;
  const bg = rgb2hex(hsl2rgb([h, mode === "dark" ? 0.18 : 0.22, mode === "dark" ? 0.07 : 0.95])), fg = rgb2hex(hsl2rgb([h, 0.14, mode === "dark" ? 0.94 : 0.1]));
  const ah = scheme === "mono" ? h : h + off; let l = 0.5, accent = rgb2hex(hsl2rgb([ah, Math.max(0.6, Math.min(0.85, s)), l]));
  for (let i = 0; i < 40 && contrast(bg, accent) < 3.2; i++) { l += mode === "dark" ? 0.015 : -0.015; accent = rgb2hex(hsl2rgb([ah, Math.max(0.6, Math.min(0.85, s)), Math.max(0.12, Math.min(0.9, l))])); }
  const muted = rgb2hex(hsl2rgb([h, 0.1, mode === "dark" ? 0.62 : 0.4]));
  return { scheme, mode, base, bg, fg, accent, muted };
}

const p = x => (x ? "PASS" : "WARN");
function report(bg, fg, accent) {
  const r = check(bg, fg, accent);
  console.log(`bg ${bg}   text ${fg}   accent ${accent}`); r.rows.forEach(x => console.log(`${p(x.ok)}  ${x.name.padEnd(28)} ${x.detail}`));
  console.log(`\nRoles (60-30-10): ~60% background ${bg}, ~30% secondary/text ${fg}, ~10% accent ${accent}. One accent, used for the single thing the eye should land on.`);
  return r;
}
const [cmd, ...args] = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d; };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (cmd === "gen") { const g = gen(args[0] || "#3366FF", opt("--scheme"), opt("--mode")); console.log(JSON.stringify(g, null, 1)); console.log(""); report(g.bg, g.fg, g.accent); }
  else if (cmd === "check") { const r = report(args[0], args[1], args[2]); process.exit(r.ok ? 0 : 1); }
  else if (cmd === "look") { const L = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../looks/looks.json"), "utf8")).looks[args[0]]; if (!L) { console.error("unknown look"); process.exit(1); } console.log(`# ${L.name}`); const r = report(L.bg, L.fg, L.accent); process.exit(r.ok ? 0 : 1); }
  else { console.error("usage: palette.mjs gen <#hex> [--scheme mono|analogous|complementary|triad|split] [--mode light|dark] | check <bg> <fg> <accent> | look <name>"); process.exit(1); }
}
