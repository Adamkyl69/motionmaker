// The style wheel: every art style Motionmaker can make, as a numbered colour wheel of real samples (rendered by the real templates; the headline
// only in the typography one, because a slice is too thin for words), so they pick
// by looking ("7 and 13"). Each segment is rendered by the real template; a style that needs another tool (Blender) shows our own example and
// says so; rotoscope is shown traced from one of our renders (it works on the user's footage).
//
//   node stylewheel.mjs "<headline>" [--out preprod/stylewheel] [--only 1,4,7] [--title "Pick a style"]
//
// Writes <out>/stylewheel.png (the wheel), stylewheel.html, stylewheel.json (number -> how to build it) and tile-N.png. Read the PNG before
// showing it. Styles whose library is missing (three for the 3D looks) are left out and named, with the install command.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), SK = path.resolve(HERE, "../.."), ROOT = path.resolve(SK, "..");
const { serve, launch } = await import(pathToFileURL(path.join(SK, "motionmaker-build/scripts/browser.mjs")).href);
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i > -1 && a[i + 1] !== undefined ? a[i + 1] : d; };
const text = a[0] && !a[0].startsWith("--") ? a[0] : null; if (!text) { console.error('usage: stylewheel.mjs "<headline>" [--out dir] [--only 1,4,7]'); process.exit(1); }
const out = path.resolve(opt("--out", "preprod/stylewheel")), work = path.join(out, "work"), T = 480, FPS = 24;
// every style: label, how it is built (template + env), the second to show, which skill
const STYLES = [
  { name: "2D Cel Animation", focus: [0.5, 0.72], zoom: 1.35, t: "cel-scene", env: { SCENE: "night-drive" }, secs: 5, at: 3.2, skill: "motionmaker-cel" },
  { name: "Hand-Drawn Sketch", focus: [0.5, 0.48], zoom: 1.2, t: "cel-scene", env: { SCENE: "sketch" }, secs: 5, at: 2.4, skill: "motionmaker-cel" },
  { name: "Motion Graphics", focus: [0.5, 0.5], zoom: 1.0, t: "flat-scene", env: { SCENE: "shapes" }, secs: 5, at: 1.8, skill: "motionmaker-flat" },
  { name: "Stylised 3D CGI", focus: [0.5, 0.52], zoom: 1.5, t: "three-style", env: { STYLE3D: "cgi" }, secs: 4, at: 1.8, skill: "motionmaker (three-style)" },
  { name: "Stop-Motion Clay", focus: [0.5, 0.52], zoom: 1.5, t: "three-style", env: { STYLE3D: "clay" }, secs: 4, at: 1.8, skill: "motionmaker (three-style)" },
  { name: "Paper Cut-Out", focus: [0.5, 0.72], zoom: 1.4, t: "cel-scene", env: { SCENE: "paper-cutout" }, secs: 5, at: 2.6, skill: "motionmaker-cel" },
  { name: "Rotoscope", focus: [0.5, 0.52], zoom: 1.5, t: "three-style", env: { STYLE3D: "cgi" }, secs: 4, at: 1.8, roto: true, skill: "motionmaker-cel (rotoscope.mjs on your footage)" },
  { name: "Experimental / Abstract", focus: [0.62, 0.45], zoom: 1.1, t: "cel-scene", env: { SCENE: "abstract" }, secs: 5, at: 3.0, skill: "motionmaker-cel" },
  { name: "Whiteboard", focus: [0.33, 0.45], zoom: 1.5, t: "cel-scene", env: { SCENE: "whiteboard" }, secs: 6, at: 3.3, skill: "motionmaker-cel" },
  { name: "Silhouette", focus: [0.45, 0.68], zoom: 1.3, t: "cel-scene", env: { SCENE: "silhouette" }, secs: 5, at: 2.6, skill: "motionmaker-cel" },
  { name: "Pixel Art", focus: [0.42, 0.66], zoom: 1.4, t: "cel-scene", env: { SCENE: "pixel-art" }, secs: 5, at: 2.6, skill: "motionmaker-cel" },
  { name: "Typography", focus: [0.5, 0.5], zoom: 1.0, t: "title-loop", env: { LOOK: "bold-launch" }, secs: 4, at: 2.0, skill: "motionmaker (title-loop)" },
  { name: "Toon-Shaded 3D", focus: [0.5, 0.52], zoom: 1.5, t: "three-style", env: { STYLE3D: "toon" }, secs: 4, at: 1.8, skill: "motionmaker (three-style)" },
  { name: "Glass / Gradient 3D", focus: [0.5, 0.45], zoom: 1.3, t: "three-style", env: { STYLE3D: "glass" }, secs: 4, at: 1.8, skill: "motionmaker (three-style)" },
  { name: "Low-Poly 3D", focus: [0.5, 0.52], zoom: 1.5, t: "three-style", env: { STYLE3D: "lowpoly" }, secs: 4, at: 1.8, skill: "motionmaker (three-style)" },
  { name: "Flat Design", focus: [0.62, 0.45], zoom: 1.1, t: "flat-scene", env: { SCENE: "coast" }, secs: 5, at: 3.0, skill: "motionmaker-flat" },
  { name: "Painterly", focus: [0.5, 0.4], zoom: 1.0, t: "style-scene", env: { STYLE: "van-gogh" }, secs: 4, at: 2.4, skill: "motionmaker (style-scene: 6 art movements)" },
  { name: "Photoreal 3D", focus: [0.5, 0.5], zoom: 1.2, card: path.join(ROOT, "examples", "blender-turntable-frame.png"), needs: "Blender (download on your yes)", skill: "motionmaker-blender" },
];
const only = opt("--only") ? new Set(opt("--only").split(",").map(Number)) : null;
let list = STYLES.map((s, i) => ({ ...s, id: i + 1 })).filter(s => !only || only.has(s.id));
rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
const skipped = [];
list = list.filter(s => {
  if (s.card) { if (existsSync(s.card)) return true; skipped.push({ name: s.name, why: "example picture not installed" }); return false; }
  const r = spawnSync("bash", [path.join(SK, "motionmaker/scripts/scaffold.sh"), `s${s.id}`, s.t === "title-loop" ? text : "-", String(T), String(T), String(FPS), String(s.secs), "-", "-", "-", work], { env: { ...process.env, TEMPLATE: s.t, ...s.env }, encoding: "utf8" });
  if (r.status !== 0) { skipped.push({ name: s.name, why: (r.stderr || "").trim().split("\n").pop() }); return false; } return true; });
const srv = await serve(work), browser = await launch();
for (const s of list) {
  const png = path.join(out, `tile-${s.id}.png`);
  if (s.card) { copyFileSync(s.card, png); continue; }
  const page = await browser.newPage({ viewport: { width: T, height: T } });
  await page.goto(`${srv.url}/s${s.id}/anim.html?t=0&embed=1`); await page.waitForFunction(() => typeof window.renderFrame === "function", null, { timeout: 60000 });
  await page.evaluate(() => window.ready || null); await page.evaluate(() => document.fonts.ready); await page.evaluate(f => window.renderFrame(f), Math.round(s.at * FPS)); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: png }); await page.close();
  if (s.roto) { const tmp = png.replace(".png", "-src.png"); copyFileSync(png, tmp); spawnSync("node", [path.join(SK, "motionmaker-cel/scripts/rotoscope-still.mjs"), tmp, png]); rmSync(tmp, { force: true }); }
}
await browser.close(); srv.close();
// the wheel: segments clipped from each sample, a numbered badge and a label outside, a title in the middle
const n = list.length, S = 1500, C = S / 2, r1 = 210, r2 = 520, rb = 572, rl = 610, cols = ["#e8544e", "#f39a3b", "#f2c230", "#7cb342", "#43a047", "#26a69a", "#1e88e5", "#3949ab", "#7e57c2", "#ab47bc", "#ec407a", "#8d6e63"];
const esc = x => String(x).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pt = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)];
const segs = list.map((s, i) => { const gap = 0.012, a0 = -Math.PI / 2 + i / n * 2 * Math.PI + gap, a1 = -Math.PI / 2 + (i + 1) / n * 2 * Math.PI - gap, am = (a0 + a1) / 2, col = cols[i % cols.length];
  const [x0, y0] = pt(r2, a0), [x1, y1] = pt(r2, a1), [x2, y2] = pt(r1, a1), [x3, y3] = pt(r1, a0), large = a1 - a0 > Math.PI ? 1 : 0;
  const d = `M${x0},${y0} A${r2},${r2} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r1},${r1} 0 ${large} 0 ${x3},${y3} Z`;
  const [cx, cy] = pt((r1 + r2) / 2, am), sz = (r2 - r1) * 1.25 * (s.zoom || 1), fx = (s.focus || [0.5, 0.5])[0], fy = (s.focus || [0.5, 0.5])[1], [bx, by] = pt(rb, am), [lx, ly] = pt(rl + 8, am), right = Math.cos(am) >= 0, words = s.name.split(" "), half = Math.ceil(words.length / 2);
  return `<clipPath id="k${i}"><path d="${d}"/></clipPath><image href="tile-${s.id}.png" x="${cx - sz * fx}" y="${cy - sz * fy}" width="${sz}" height="${sz}" clip-path="url(#k${i})" preserveAspectRatio="xMidYMid slice"/>
  <path d="${d}" fill="none" stroke="#ffffff" stroke-width="6"/><path d="${(() => { const [p0x, p0y] = pt(r2 + 6, a0), [p1x, p1y] = pt(r2 + 6, a1); return `M${p0x},${p0y} A${r2 + 6},${r2 + 6} 0 0 1 ${p1x},${p1y}`; })()}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="${bx}" cy="${by}" r="27" fill="${col}"/><text x="${bx}" y="${by + 9}" text-anchor="middle" font-size="25" font-weight="800" fill="#fff">${String(s.id).padStart(2, "0")}</text>
  <text x="${lx + (right ? 22 : -22)}" y="${ly - (words.length > 1 ? 4 : -8)}" text-anchor="${right ? "start" : "end"}" font-size="21" font-weight="800" fill="#2b2b33" letter-spacing="0.5">${esc(words.slice(0, half).join(" ").toUpperCase())}</text>
  ${words.length > 1 ? `<text x="${lx + (right ? 22 : -22)}" y="${ly + 22}" text-anchor="${right ? "start" : "end"}" font-size="21" font-weight="800" fill="#2b2b33" letter-spacing="0.5">${esc(words.slice(half).join(" ").toUpperCase())}</text>` : ""}
  ${s.card ? `<text x="${lx + (right ? 22 : -22)}" y="${ly + 46}" text-anchor="${right ? "start" : "end"}" font-size="15" fill="#777">needs ${esc(s.needs)}</text>` : ""}`; }).join("\n");
const W2 = S + 500, html = `<!doctype html><meta charset="utf-8"><title>Style wheel</title><style>body{margin:0;background:#fbf8f2;font-family:'Helvetica Neue',Arial,sans-serif}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${S}" viewBox="${-250} 0 ${W2} ${S}"><rect x="-250" y="0" width="${W2}" height="${S}" fill="#fbf8f2"/>
<circle cx="${C}" cy="${C}" r="${r1 - 18}" fill="#ffffff" stroke="#e7e1d6" stroke-width="3"/>
<text x="${C}" y="${C - 30}" text-anchor="middle" font-size="40" font-weight="800" fill="#2b2b33">${esc(opt("--title", "Pick a style"))}</text>
<text x="${C}" y="${C + 18}" text-anchor="middle" font-size="22" fill="#666">real samples, made by</text><text x="${C}" y="${C + 48}" text-anchor="middle" font-size="22" fill="#666">Motionmaker's own tools</text>
<text x="${C}" y="${C + 98}" text-anchor="middle" font-size="19" fill="#999">say the numbers you like</text>
${segs}</svg>`;
writeFileSync(path.join(out, "stylewheel.html"), html);
const b2 = await launch(), p2 = await b2.newPage({ viewport: { width: W2, height: S } }); await p2.goto(pathToFileURL(path.join(out, "stylewheel.html")).href); await p2.waitForTimeout(300);
await p2.screenshot({ path: path.join(out, "stylewheel.png") }); await b2.close();
rmSync(work, { recursive: true, force: true });
writeFileSync(path.join(out, "stylewheel.json"), JSON.stringify({ text, styles: list.map(s => ({ n: s.id, name: s.name, skill: s.skill, ...(s.t ? { template: s.t, env: s.env } : { needs: s.needs }), ...(s.roto ? { note: "rotoscope works on the user's footage: motionmaker-cel/scripts/rotoscope.mjs" } : {}) })), skipped }, null, 1));
console.log(`${out}/stylewheel.png (${n} styles), stylewheel.html, stylewheel.json`); list.forEach(s => console.log(`  ${String(s.id).padStart(2)}. ${s.name.padEnd(24)} ${s.skill}`)); skipped.forEach(s => console.log(`  skipped: ${s.name} (${s.why})`));
