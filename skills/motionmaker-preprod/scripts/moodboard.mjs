// Show, don't ask: the user's own headline in many looks at once, numbered, so they can point at what they imagine ("4 and 7, never 2").
//
//   Round 1  node moodboard.mjs "<headline>" [--tone "calm premium"] [--avoid dark|light] [--looks all|a,b,..] [--styles auto|none|a,b] [--from-image <picture>]
//                               [--accent "#hex"] [--size 400x400] [--out preprod/moodboard]
//   Round 2  node moodboard.mjs "<headline>" --vary <tile number from round 1 | look id> [--from <round-1 moodboard.json>] [--out preprod/moodboard-2]
//   Worlds   node moodboard.mjs "<headline>" --worlds [--look <look>] [--out preprod/worlds]
//            what KIND of picture: type only, logo, chart, product UI, 3D object, characters, icons, map, code, equation, hand-drawn mark
//            (example content; a kind whose library is not installed is skipped and named, with its install command)
//
// Round 1 tiles: every look (ordered by --tone), the art styles that fit (--styles auto: two, ranked by the tone words), and, with
// --from-image, a look in the colours of the user's reference picture. Round 2 takes one favourite and changes ONE thing per tile
// (light/dark inverted, two other accents, two other typefaces), so the user can say exactly what they want different.
// Writes <out>/moodboard.png (numbered tiles with captions), moodboard.html and moodboard.json. Every tile carries its build recipe
// (look, template, style, colours): the pick goes straight into scaffold.sh. Read the PNG before showing it.
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), SK = path.resolve(HERE, "../.."), AD = path.join(SK, "motionmaker-art-director");
const { serve, launch } = await import(pathToFileURL(path.join(SK, "motionmaker-build/scripts/browser.mjs")).href);
const { fromImage, turnAccent } = await import(pathToFileURL(path.join(AD, "scripts/palette.mjs")).href);
const LOOKS = JSON.parse(readFileSync(path.join(AD, "looks/looks.json"), "utf8")).looks, STYLES = JSON.parse(readFileSync(path.join(AD, "styles/styles.json"), "utf8")).styles;
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i > -1 && a[i + 1] !== undefined ? a[i + 1] : d; };
const text = a[0] && !a[0].startsWith("--") ? a[0] : null;
if (!text) { console.error('usage: moodboard.mjs "<headline>" [--tone ".."] [--styles auto|none|a,b] [--from-image pic] [--size 400x400] [--out dir]\n       moodboard.mjs "<headline>" --vary <tile|look> [--from <moodboard.json>] [--out dir]'); process.exit(1); }
const prevSize = opt("--vary") && opt("--from") && existsSync(opt("--from")) ? JSON.parse(readFileSync(opt("--from"), "utf8")).size : null;  // round 2 keeps round 1's shape
const [W, H] = opt("--size", prevSize || "400x400").split("x").map(Number), FPS = 24, SECS = 6, HOLD = Math.round(FPS * SECS * 0.55);
const worlds = a.includes("--worlds");
const out = path.resolve(opt("--out", opt("--vary") ? "preprod/moodboard-2" : worlds ? "preprod/worlds" : "preprod/moodboard")), work = path.join(out, "work");
const stars = n => "★".repeat(n) + "☆".repeat(3 - n);
const TYPE = { "editorial-calm": "serif", "night-cinema": "serif", "luxe-black-gold": "serif", "warm-craft": "serif", "swiss-minimal": "sans", "bold-launch": "display", "playful-pop": "rounded", "tech-mono": "mono" };

// ---- which tiles
let tiles = [];
rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
if (worlds) {
  const look = opt("--look", "swiss-minimal"), lastWord = text.split(/\s+/).pop(), w = (name, note, template, extra = {}, secs = SECS) => ({ name, note, recipe: { template, look, ...(Object.keys(extra).length ? { env: extra } : {}), secs } });
  writeFileSync(path.join(work, "sample.ts"), 'export async function ship(build: Build) {\n  const report = await test(build);\n  if (!report.ok) throw report.error;\n  return deploy(build);\n}\n');
  let peep = null; try { execFileSync("node", [path.join(SK, "motionmaker-assets/scripts/kit.mjs"), "peep", "--hair", "ShortVolumed", "--face", "Cute", "--body", "Shirt", "--out", path.join(work, "peep.svg")], { stdio: ["ignore", "pipe", "pipe"] }); peep = path.join(work, "peep.svg"); } catch {}
  tiles = [
    w("Type only", "kinetic headline, no imagery", "title-loop"),
    w("Logo or wordmark", "a brand mark builds and settles", "logo-reveal"),
    w("Data chart", "numbers that grow (example data)", "data-chart"),
    w("Product UI", "a screen, a cursor, a press, a result (placeholder UI)", "product-demo", {}, 20),
    w("3D object", "a product shot in 3D (example object)", "three-product"),
    ...(peep ? [w("Characters", "illustrated people (Open Peeps, CC0)", "illustration-scene", { ASSET: peep })] : [{ skip: "Characters", why: `node ${path.join(SK, "motionmaker-assets/scripts/kit.mjs")} setup` }]),
    w("Icons and features", "three features with icons (example labels)", "icon-features", { ICONS: "lucide:zap,lucide:shield-check,lucide:rocket" }),
    w("Map or route", "places and a route on a globe (example cities)", "map-scene", { PLACES: "Istanbul@41.01,28.98;Berlin@52.52,13.40" }),
    w("Code", "a code reveal with a highlight (example code)", "code-reveal", { CODE: path.join(work, "sample.ts"), FOCUS: "2" }),
    w("Equation", "a formula with the key term marked (example)", "equation-scene", { TEX: "E = \\htmlClass{hl}{mc^2}" }),
    w("Hand-drawn mark", `a sketched circle on "${lastWord}"`, "annotate-scene", { MARK: "circle", KEYWORD: lastWord }),
  ];
} else if (opt("--vary")) {
  const v = opt("--vary"), prev = opt("--from") && existsSync(opt("--from")) ? JSON.parse(readFileSync(opt("--from"), "utf8")) : null;
  let base = /^\d+$/.test(v) && prev ? prev.tiles.find(t => t.n === +v)?.recipe : LOOKS[v] ? { template: "title-loop", look: v } : null;
  if (!base) { console.error(`--vary ${v}: give a tile number with --from <round-1 moodboard.json>, or a look id (${Object.keys(LOOKS).join(", ")})`); process.exit(1); }
  if (base.template === "style-scene") { console.error("art styles carry their own palette and type; vary a look tile instead (or build the style as it is)"); process.exit(1); }
  const L = LOOKS[base.look], bg = base.bg || L.bg, fg = base.fg || L.fg, ac = base.accent || L.accent, cat = TYPE[base.look];
  const typeAlts = Object.keys(LOOKS).filter(k => TYPE[k] !== cat && k !== base.look).sort((x, y) => ["sans", "serif", "display", "rounded", "mono"].indexOf(TYPE[x]) - ["sans", "serif", "display", "rounded", "mono"].indexOf(TYPE[y]));
  const seen = new Set(), two = typeAlts.filter(k => !seen.has(TYPE[k]) && seen.add(TYPE[k])).slice(0, 2);
  const warm = turnAccent(bg, ac, 40), far = turnAccent(bg, ac, 150);
  tiles = [
    { name: "Your pick", note: "as chosen", recipe: { template: "title-loop", look: base.look, bg, fg, accent: ac } },
    { name: "Inverted", note: "light and dark swapped", recipe: { template: "title-loop", look: base.look, bg: fg, fg: bg, accent: turnAccent(fg, ac, 0) } },
    { name: `Accent ${warm}`, note: "accent turned 40° round the colour wheel", recipe: { template: "title-loop", look: base.look, bg, fg, accent: warm } },
    { name: `Accent ${far}`, note: "a contrasting accent", recipe: { template: "title-loop", look: base.look, bg, fg, accent: far } },
    ...two.map(k => ({ name: `Type: ${LOOKS[k].bundledFont?.family || LOOKS[k].font.split(",")[0].replace(/'/g, "")}`, note: `${TYPE[k]} type, same colours`, recipe: { template: "title-loop", look: k, bg, fg, accent: ac } })),
  ];
} else {
  const words = (opt("--tone", "")).toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const score = k => words.reduce((s, w) => s + (LOOKS[k].feel.some(f => f.includes(w) || w.includes(f)) ? 3 : 0) + (LOOKS[k].good_for.toLowerCase().includes(w) ? 1 : 0), 0);
  // --avoid dark|light: the user said "not dark" (or "not light"): leave those looks out instead of showing them anyway
  const lumOf = hex => { const n = parseInt(hex.replace("#", ""), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const avoid = opt("--avoid"), keep = k => !avoid || (avoid === "dark" ? lumOf(LOOKS[k].bg) > 0.4 : avoid === "light" ? lumOf(LOOKS[k].bg) <= 0.4 : true);
  const looks = (opt("--looks", "all") === "all" ? Object.keys(LOOKS) : opt("--looks").split(",").map(s => s.trim())).filter(keep).sort((x, y) => score(y) - score(x));
  for (const k of looks) { if (!LOOKS[k]) { console.error(`unknown look ${k}`); process.exit(1); } tiles.push({ name: LOOKS[k].name, note: LOOKS[k].feel.join(", "), recipe: { template: "title-loop", look: k, ...(opt("--accent") ? { accent: opt("--accent") } : {}) } }); }
  const sw = opt("--styles", "auto");
  const styleIds = sw === "none" ? [] : sw === "auto" ? Object.entries(STYLES).map(([k, s]) => [k, words.reduce((t, w) => t + (s.goodFor.toLowerCase().includes(w) ? 2 : 0), 0) + s.rating]).sort((x, y) => y[1] - x[1]).slice(0, 2).map(x => x[0]) : sw.split(",").map(s => s.trim());
  for (const k of styleIds) { if (!STYLES[k]) { console.error(`unknown style ${k}`); process.exit(1); } if (avoid === "dark" && /van-gogh|ukiyo/.test(k)) continue; tiles.push({ name: STYLES[k].name, note: `art style ${stars(STYLES[k].rating)}, ${STYLES[k].era}`, recipe: { template: "style-scene", style: k } }); }
  if (opt("--from-image")) {
    const p = fromImage(opt("--from-image")), top = looks[0];
    tiles.push({ name: "From your picture", note: `its colours ${p.bg} / ${p.fg} / ${p.accent}${p.notes.length ? " (adjusted to read)" : ""}`, recipe: { template: "title-loop", look: top, bg: p.bg, fg: p.fg, accent: p.accent }, palette: p });
  }
}
// ---- render each tile on the real templates (a frame from the hold: the shot's poster); a kind whose library is missing is skipped
const skipped = tiles.filter(t => t.skip); tiles = tiles.filter(t => !t.skip);
const caption = t => t.recipe.template === "icon-features" ? "Fast|Safe|Ready" : text;
tiles = tiles.filter((t, i) => {
  const r = t.recipe, env = { ...process.env, TEMPLATE: r.template, ...(r.look ? { LOOK: r.look } : {}), ...(r.style ? { STYLE: r.style } : {}), ...(r.env || {}) };
  try { execFileSync("bash", [path.join(SK, "motionmaker/scripts/scaffold.sh"), `t${i + 1}`, caption(t), String(W), String(H), String(FPS), String(r.secs || SECS), r.bg || "-", r.fg || "-", r.accent || "-", work], { env, stdio: ["ignore", "pipe", "pipe"] }); t.dir = `t${i + 1}`; return true; }
  catch (e) { const msg = String(e.stderr || e.message).trim().split("\n").pop(); if (!worlds) throw new Error(`tile ${t.name}: ${msg}`); skipped.push({ skip: t.name, why: msg }); return false; }
}).map((t, i) => ({ n: i + 1, ...t }));
const srv = await serve(work), browser = await launch(), errors = [];
for (const t of tiles) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on("pageerror", e => errors.push(`tile ${t.n}: ${e}`));
  await page.goto(`${srv.url}/${t.dir}/anim.html?t=0&embed=1`);
  await page.waitForFunction(() => typeof window.renderFrame === "function", null, { timeout: 30000 });
  await page.evaluate(() => (window.ready ? window.ready : null)); await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.fonts].map(f => (f.status === "unloaded" ? f.load().catch(() => null) : null))));
  await page.evaluate(f => window.renderFrame(f), Math.round(FPS * (t.recipe.secs || SECS) * 0.55)); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: path.join(out, `tile-${t.n}.png`) }); await page.close();
}
// ---- the sheet: an HTML page (also embedded in the pre-production board) screenshotted to PNG
const cols = tiles.length <= 4 ? tiles.length : tiles.length <= 6 ? 3 : 4, tw = Math.min(W, 300), th = Math.round(tw * H / W);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const html = `<!doctype html><meta charset="utf-8"><title>Mood board</title>
<style>body{margin:0;padding:18px;background:#E9E8E4;font:14px/1.35 system-ui,sans-serif;color:#1d1d1b}h1{font-size:16px;margin:0 0 4px}p.sub{margin:0 0 14px;color:#555}
.g{display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:14px}.t{background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px #0002}
.t img{display:block;width:${tw}px;height:${th}px}.c{padding:8px 10px 10px}.n{font-weight:700;font-size:15px}.k{color:#666;font-size:12.5px;margin-top:2px}</style>
<h1>${opt("--vary") ? "Round 2: your favourite, one change per tile" : worlds ? "What is in the picture" : "Mood board"}: “${esc(text)}”</h1>
<p class="sub">${opt("--vary") ? "Which is closest to what you imagine? Say the number, or combine (for example: 3's accent with 5's type)." : worlds ? "Example content in one look. Say which kinds of picture belong in your video (several are fine: one per scene). Anything not here (planets, animals, machines, a scene from a story) is drawn in code for your piece: it is sketched for you on the storyboard before it is built." : "Say the numbers you like and any you would never want. Combinations are fine (for example: 4's colours with 7's type)."}</p>
<div class="g">${tiles.map(t => `<div class="t"><img src="tile-${t.n}.png" alt=""><div class="c"><div class="n">${t.n}. ${esc(t.name)}</div><div class="k">${esc(t.note)}</div></div></div>`).join("")}</div>`;
writeFileSync(path.join(out, "moodboard.html"), html);
const sheet = await browser.newPage({ viewport: { width: 36 + cols * tw + (cols - 1) * 14, height: 400 } });
await sheet.goto(pathToFileURL(path.join(out, "moodboard.html")).href); await sheet.screenshot({ path: path.join(out, "moodboard.png"), fullPage: true });
await browser.close(); srv.close(); rmSync(work, { recursive: true, force: true });
tiles.forEach(t => delete t.dir);
writeFileSync(path.join(out, "moodboard.json"), JSON.stringify({ text, round: opt("--vary") ? 2 : worlds ? "worlds" : 1, size: `${W}x${H}`, tone: opt("--tone") || null, tiles, skipped }, null, 1));
if (errors.length) console.error(`page errors: ${errors.join("; ")}`);
console.log(`${out}/moodboard.png (${tiles.length} tiles), moodboard.html, moodboard.json`);
tiles.forEach(t => console.log(`  ${String(t.n).padStart(2)}. ${t.name.padEnd(28)} ${t.note}`));
skipped.forEach(s => console.log(`  skipped: ${s.skip} (${s.why})`));
const pal = tiles.find(t => t.palette); if (pal) { console.log(`\nFrom the picture: ${JSON.stringify(pal.palette.swatches.slice(0, 5).map(s => s.hex))}`); pal.palette.notes.forEach(n => console.log("  note: " + n)); }
console.log(`\nRecipe of a pick: moodboard.json tiles[n-1].recipe -> TEMPLATE=<template> LOOK=<look> [STYLE=<style>] scaffold.sh ... <bg> <fg> <accent> ("-" = the look's own)`);
