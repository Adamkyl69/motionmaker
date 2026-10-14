// Art styles: list them, or show the client the SAME headline in 2-4 styles side by side (real renders, a frame from the hold), like directions.mjs does for looks.
//
//   node styles.mjs list [--min 2]                                   every style with its rating, era and what it is good for
//   node styles.mjs frames "<headline>" --styles bauhaus,van-gogh,seurat [--size 540x540] [--out ad/styles]
//   node styles.mjs suggest "<what it is for, tone words>" [--n 3]  rank styles by their good-for text (3-star first), then use frames
//
// Writes <out>/<id>/poster.png, <out>/styles.png (labelled A/B/C with stars) and <out>/styles.json. Read the image before presenting it.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), SK = path.resolve(HERE, "../.."), S = JSON.parse(readFileSync(path.join(HERE, "../styles/styles.json"), "utf8")).styles;
const a = process.argv.slice(2), cmd = a[0], opt = (k, d) => { const i = a.indexOf(k); return i > -1 && a[i + 1] !== undefined ? a[i + 1] : d; };
const stars = n => "★".repeat(n) + "☆".repeat(3 - n);
if (cmd === "list") { for (const [k, s] of Object.entries(S).filter(([, s]) => s.rating >= +opt("--min", 1)).sort((x, y) => y[1].rating - x[1].rating)) console.log(`${stars(s.rating)}  ${k.padEnd(16)} ${s.era.padEnd(44)} ${s.goodFor}`); console.log("\ncards: motionmaker-art-director/styles/<id>.md"); process.exit(0); }
if (cmd === "suggest") { const words = (a[1] || "").toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2), n = +opt("--n", 3);
  const ranked = Object.entries(S).map(([k, s]) => [k, s, words.reduce((t, w) => t + (s.goodFor.toLowerCase().includes(w) ? 2 : 0) + (s.name.toLowerCase().includes(w) ? 3 : 0), 0) + s.rating]).sort((x, y) => y[2] - x[2]);
  const pick = ranked.slice(0, n); pick.forEach(([k, s]) => console.log(`${stars(s.rating)}  ${k.padEnd(16)} ${s.goodFor}`)); console.log(`\nnext: node styles.mjs frames "<headline>" --styles ${pick.map(p => p[0]).join(",")}`); process.exit(0); }
if (cmd !== "frames" || !a[1]) { console.error('usage: styles.mjs list | suggest "<purpose and tone>" | frames "<headline>" --styles a,b,c [--size WxH] [--out dir]'); process.exit(1); }
const text = a[1], ids = (opt("--styles") || "bauhaus,van-gogh,seurat").split(",").map(s => s.trim()), [W, H] = opt("--size", "540x540").split("x").map(Number), out = path.resolve(opt("--out", "ad/styles"));
for (const k of ids) if (!S[k]) { console.error(`unknown style '${k}'. Have: ${Object.keys(S).join(", ")}`); process.exit(2); }
mkdirSync(out, { recursive: true }); const FPS = 24, SECS = 6, POSTER = Math.round(FPS * SECS * 0.6);
const { openAnim } = await import(pathToFileURL(path.join(SK, "motionmaker-build/scripts/browser.mjs")).href); const { ffFont } = await import(pathToFileURL(path.join(SK, "motionmaker-build/scripts/platform.mjs")).href); const tiles = [], meta = [];
for (const [i, k] of ids.entries()) {
  execFileSync("bash", [path.join(SK, "motionmaker/scripts/scaffold.sh"), k, text, String(W), String(H), String(FPS), String(SECS), "-", "-", "-", out], { env: { ...process.env, TEMPLATE: "style-scene", STYLE: k }, stdio: ["ignore", "ignore", "inherit"] });
  const dir = path.join(out, k), { page, errors, close } = await openAnim(path.join(dir, "anim.html"), W, H);
  await page.evaluate(f => window.renderFrame(f), POSTER); await page.screenshot({ path: path.join(dir, "poster.png") }); await close();
  if (errors.length) console.error(`${k}: page errors: ${errors.join("; ")}`);
  const s = S[k], label = `${"ABCD"[i]}  ${s.name}  ${"*".repeat(s.rating)}`.replace(/'/g, "");
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", path.join(dir, "poster.png"), "-vf", `pad=iw:ih+34:0:34:color=0x111111,drawtext=${ffFont()}text='${label}':x=12:y=8:fontsize=18:fontcolor=white`, path.join(dir, "tile.png")]);
  tiles.push(path.join(dir, "tile.png")); meta.push({ option: "ABCD"[i], style: k, name: s.name, rating: s.rating, era: s.era, goodFor: s.goodFor, card: `motionmaker-art-director/styles/${k}.md` });
}
execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...tiles.flatMap(t => ["-i", t]), ...(tiles.length > 1 ? ["-filter_complex", `${tiles.map((_, i) => `[${i}]`).join("")}hstack=inputs=${tiles.length}`] : []), path.join(out, "styles.png")]);
writeFileSync(path.join(out, "styles.json"), JSON.stringify(meta, null, 1));
console.log(`${path.join(out, "styles.png")}  (${tiles.length} styles, same words, frame ${POSTER} of a ${SECS}s render)`); for (const m of meta) console.log(`  ${m.option}  ${stars(m.rating)}  ${m.name}: ${m.goodFor}`);
