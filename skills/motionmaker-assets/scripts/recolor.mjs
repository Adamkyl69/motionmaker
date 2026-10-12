// Make a borrowed illustration belong to the brand palette. Works on SVG and Lottie JSON.
//
//   node recolor.mjs analyze <file>                                   list every colour, how often it is used, and what role it probably plays
//   node recolor.mjs apply <file> --map "#aabbcc=#112233,#ffffff=#F4EFE6" [--out out.ext]
//   node recolor.mjs apply <file> --look <name> --neutrals [--out out.ext]   remap the greys/black/white by lightness onto the look's text/background colours
//
// Rules this tool enforces on purpose:
//  * Only the colours you name (or, with --neutrals, the near-greys) change. Saturated colours are left alone unless mapped explicitly.
//  * Anything that looks like a human SKIN TONE is flagged "protected" and is never changed by --neutrals. Do not recolour skin tones to fit a
//    palette: it erases representation and usually looks wrong. Recolour clothes, backgrounds and props instead.
//  * Gradients in Lottie are reported, not rewritten. Alpha is preserved. The input file is never modified.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), [cmd, file] = argv, opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
if (!cmd || !file) die("usage: recolor.mjs analyze <file> | apply <file> (--map \"#a=#b,...\" | --look <name> --neutrals) [--out file]");

const hex2 = h => { h = h.replace("#", ""); if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join(""); return { rgb: [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)), a: h.length === 8 ? h.slice(6, 8) : "" }; };
const toHex = ([r, g, b]) => "#" + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
function hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
const role = rgb => { const [h, s, l] = hsl(rgb); if (s < 0.12) return l < 0.2 ? "neutral: ink/black" : l > 0.88 ? "neutral: paper/white" : "neutral: grey"; if (h >= 8 && h <= 42 && s >= 0.2 && s <= 0.8 && l >= 0.2 && l <= 0.85) return "PROTECTED? skin-tone range (do not recolour to fit a palette)"; return "colour"; };
const isNeutral = rgb => hsl(rgb)[1] < 0.12, isSkin = rgb => role(rgb).startsWith("PROTECTED");
const blend = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// ---------- colour tokens inside an SVG (attributes, inline style, <style> blocks)
const SVG_RE = /((?:fill|stroke|stop-color|flood-color|lighting-color)\s*[=:]\s*["']?)(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/g;
function parseRgbFn(s) { const m = s.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/); return m ? [+m[1], +m[2], +m[3]] : null; }
function svgColors(text) { const map = new Map(); for (const m of text.matchAll(SVG_RE)) { const tok = m[2], rgb = tok.startsWith("#") ? hex2(tok).rgb : parseRgbFn(tok); if (!rgb) continue; const k = toHex(rgb); map.set(k, (map.get(k) || 0) + 1); } return map; }
function svgApply(text, fn) { return text.replace(SVG_RE, (all, pre, tok) => { const isHex = tok.startsWith("#"), c = isHex ? hex2(tok) : { rgb: parseRgbFn(tok), a: "" }; if (!c.rgb) return all; const to = fn(toHex(c.rgb)); return to ? pre + to + c.a : all; }); }

// ---------- Lottie: colour arrays [r,g,b,(a)] in 0..1 under a "c" property of fills/strokes, "fc" of text, "sc" (hex) of solids
function walk(node, visit) { if (Array.isArray(node)) node.forEach(n => walk(n, visit)); else if (node && typeof node === "object") { visit(node); for (const k of Object.keys(node)) walk(node[k], visit); } }
function lottieColors(json) {
  const map = new Map(), add = arr => { const k = toHex(arr.slice(0, 3).map(v => v * 255)); map.set(k, (map.get(k) || 0) + 1); }; let gradients = 0;
  walk(json, o => {
    if (o.ty === "gf" || o.ty === "gs") gradients++;
    for (const key of ["c", "fc"]) { const p = o[key]; if (p && typeof p === "object" && "k" in p) { if (!p.a && Array.isArray(p.k) && typeof p.k[0] === "number") add(p.k); else if (p.a && Array.isArray(p.k)) p.k.forEach(kf => { if (Array.isArray(kf.s) && typeof kf.s[0] === "number") add(kf.s); if (Array.isArray(kf.e) && typeof kf.e[0] === "number") add(kf.e); }); } }
    if (typeof o.sc === "string" && o.sc.startsWith("#")) map.set(toHex(hex2(o.sc).rgb), (map.get(toHex(hex2(o.sc).rgb)) || 0) + 1);
  });
  return { map, gradients };
}
function lottieApply(json, fn) {
  const re = arr => { const to = fn(toHex(arr.slice(0, 3).map(v => v * 255))); if (!to) return arr; const c = hex2(to).rgb.map(v => v / 255); return [...c, ...(arr.length > 3 ? [arr[3]] : [])]; };
  walk(json, o => {
    for (const key of ["c", "fc"]) { const p = o[key]; if (p && typeof p === "object" && "k" in p) { if (!p.a && Array.isArray(p.k) && typeof p.k[0] === "number") p.k = re(p.k); else if (p.a && Array.isArray(p.k)) p.k.forEach(kf => { if (Array.isArray(kf.s) && typeof kf.s[0] === "number") kf.s = re(kf.s); if (Array.isArray(kf.e) && typeof kf.e[0] === "number") kf.e = re(kf.e); }); } }
    if (typeof o.sc === "string" && o.sc.startsWith("#")) { const to = fn(toHex(hex2(o.sc).rgb)); if (to) o.sc = to; }
  });
}

const raw = readFileSync(file, "utf8"), isLottie = /\.json$/i.test(file), isSvg = /\.svg$/i.test(file);
if (!isLottie && !isSvg) die("recolor supports .svg and Lottie .json");
let json = null; if (isLottie) { try { json = JSON.parse(raw); } catch (e) { die("not valid JSON: " + e.message); } if (!(json.layers && json.fr)) die("this JSON does not look like a Lottie animation (needs layers and fr)"); }
const { map: colors, gradients } = isLottie ? lottieColors(json) : { map: svgColors(raw), gradients: 0 };

if (cmd === "analyze") {
  const rows = [...colors.entries()].sort((a, b) => b[1] - a[1]); console.log(`${file}: ${rows.length} distinct colours${gradients ? `, ${gradients} gradient(s) not listed (not rewritten by this tool)` : ""}\n`);
  for (const [hx, n] of rows) { const rgb = hex2(hx).rgb; console.log(`${hx}  ${String(n).padStart(5)}x  lum ${lum(rgb).toFixed(2)}  ${role(rgb)}`); }
  console.log(`\nNext: recolor.mjs apply ${file} --look <name> --neutrals   (greys onto the look)   or   --map "#old=#new,..."`);
} else if (cmd === "apply") {
  const explicit = Object.fromEntries((opt("--map", "") || "").split(",").filter(Boolean).map(p => { const [a, b] = p.split("="); if (!a || !b) die(`bad --map entry "${p}" (use #old=#new)`); return [toHex(hex2(a.trim()).rgb), toHex(hex2(b.trim()).rgb)]; }));
  let fn = hx => explicit[hx] || null, note = `${Object.keys(explicit).length} explicit mapping(s)`;
  if (argv.includes("--neutrals")) {
    const name = opt("--look"); if (!name) die("--neutrals needs --look <name>");
    const L = JSON.parse(readFileSync(path.join(HERE, "../../motionmaker-art-director/looks/looks.json"), "utf8")).looks[name]; if (!L) die(`unknown look "${name}"`);
    const fg = hex2(L.fg).rgb, bg = hex2(L.bg).rgb, prev = fn;
    fn = hx => { if (explicit[hx]) return explicit[hx]; const rgb = hex2(hx).rgb; if (!isNeutral(rgb) || isSkin(rgb)) return null; return toHex(blend(fg, bg, Math.min(1, lum(rgb) ** 0.5))); };   // dark -> text colour, light -> background colour
    note += `, near-greys mapped onto ${name} (text ${L.fg}, background ${L.bg})`;
  }
  const changed = new Set(); const wrap = hx => { const to = fn(hx); if (to && to !== hx) changed.add(`${hx}->${to}`); return to; };
  let out; if (isLottie) { lottieApply(json, wrap); out = JSON.stringify(json); } else out = svgApply(raw, wrap);
  const skin = [...colors.keys()].filter(h => isSkin(hex2(h).rgb) && !explicit[h]);
  const dest = opt("--out", file.replace(/(\.[^.]+)$/, ".recolored$1")); writeFileSync(dest, out);
  console.log(`${dest}\n${note}; ${changed.size} colour(s) changed${changed.size ? ":\n  " + [...changed].join("\n  ") : ""}`);
  if (skin.length) console.log(`kept as-is (skin-tone range, protected): ${skin.join(" ")}`);
  if (gradients) console.log(`note: ${gradients} gradient(s) were not recoloured`);
  if (!changed.size) console.log("nothing changed: nothing matched. Run `analyze` and map the colours you want.");
} else die("commands: analyze | apply");
