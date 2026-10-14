// Present creative directions the way an art director does before anything moves: the SAME words in 3 different looks, side by side,
// rendered from the real template so the choice is made on actual pixels, not adjectives.
//
//   node directions.mjs "<headline>" [--tone "calm premium"] [--looks swiss-minimal,night-cinema,playful-pop] [--n 3]
//                       [--size 540x540] [--template title-loop] [--out ad/directions] [--accent "#0057FF"]
//
// --tone ranks the looks by how well their feel/good_for words match (use the user's tone words); --looks picks them explicitly;
// with neither it shows three deliberately different ones. --accent keeps the look's type and mood but swaps in the brand colour.
// Writes <out>/<look>/hero.png, <out>/directions.png (labelled A/B/C) and <out>/directions.json (the tokens behind each).
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { contrast } from "./palette.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), SK = path.resolve(HERE, "../.."), LOOKS = JSON.parse(readFileSync(path.join(HERE, "../looks/looks.json"), "utf8")).looks;
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const text = a[0] && !a[0].startsWith("--") ? a[0] : null;
if (!text) { console.error('usage: directions.mjs "<headline>" [--tone "calm premium"] [--looks a,b,c] [--n 3] [--size 540x540] [--out dir] [--accent "#hex"]'); process.exit(1); }
const n = +opt("--n", 3), [W, H] = opt("--size", "540x540").split("x").map(Number), out = path.resolve(opt("--out", "ad/directions")), tpl = opt("--template", "title-loop"), accent = opt("--accent", "-");
const FPS = 24, SECS = 6, HOLD = Math.round(FPS * SECS * 0.55);        // a frame inside the settled hold: the "poster" of the shot

function pick() {
  if (opt("--looks")) return opt("--looks").split(",").map(s => s.trim());
  if (opt("--tone")) {
    const words = opt("--tone").toLowerCase().split(/[^a-z]+/).filter(Boolean);
    const score = ([, L]) => words.reduce((s, w) => s + (L.feel.some(f => f.includes(w) || w.includes(f)) ? 3 : 0) + (L.good_for.toLowerCase().includes(w) ? 1 : 0), 0);
    const ranked = Object.entries(LOOKS).map(e => [e, score(e)]).sort((x, y) => y[1] - x[1]);
    const top = ranked.filter(r => r[1] > 0).slice(0, n).map(r => r[0][0]);
    // always include a contrasting option so the client sees a range, not three near-duplicates
    for (const k of ["swiss-minimal", "night-cinema", "playful-pop", "editorial-calm"]) if (top.length < n && !top.includes(k)) top.push(k);
    return top.slice(0, n);
  }
  return ["swiss-minimal", "night-cinema", "playful-pop"].slice(0, n);
}
const chosen = pick(); for (const k of chosen) if (!LOOKS[k]) { console.error(`unknown look '${k}'. Available: ${Object.keys(LOOKS).join(", ")}`); process.exit(2); }
mkdirSync(out, { recursive: true });

const { openAnim } = await import(pathToFileURL(path.join(SK, "motionmaker-build/scripts/browser.mjs")).href);   // a file URL: Windows paths are not import specifiers
const { ffFont } = await import(pathToFileURL(path.join(SK, "motionmaker-build/scripts/platform.mjs")).href);
const tiles = [], meta = [];
for (const [i, k] of chosen.entries()) {
  const dir = path.join(out, k);
  execFileSync("bash", [path.join(SK, "motionmaker/scripts/scaffold.sh"), k, text, String(W), String(H), String(FPS), String(SECS), "-", "-", accent, out], { env: { ...process.env, TEMPLATE: tpl, LOOK: k }, stdio: ["ignore", "pipe", "inherit"] });
  const { page, errors, close } = await openAnim(path.join(dir, "anim.html"), W, H);
  await page.evaluate(f => window.renderFrame(f), HOLD); await page.screenshot({ path: path.join(dir, "hero.png") }); await close();
  if (errors.length) console.error(`${k}: page errors: ${errors.join("; ")}`);
  const L = LOOKS[k], letter = "ABCDEFGH"[i];
  const label = `${letter}  ${L.name}`;
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", path.join(dir, "hero.png"), "-vf", `drawbox=x=0:y=0:w=iw:h=34:color=black@0.55:t=fill,drawtext=${ffFont()}text='${label}':x=12:y=8:fontsize=18:fontcolor=white`, path.join(dir, "tile.png")]);
  tiles.push(path.join(dir, "tile.png"));
  const warnings = []; if (accent !== "-") { const k = contrast(L.bg, accent); if (k < 3) warnings.push(`brand accent ${accent} on this look's background ${L.bg} is only ${k.toFixed(2)}:1 (needs 3:1 for shapes, 4.5:1 for text): use a lighter tint of the brand colour, or a light look`); }
  meta.push({ option: letter, look: k, name: L.name, feel: L.feel, good_for: L.good_for, bg: L.bg, fg: L.fg, accent: accent === "-" ? L.accent : accent, font: L.font, weight: L.weight, motion: L.motion, warnings });
}
if (tiles.length === 1) execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", tiles[0], path.join(out, "directions.png")]);
else execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...tiles.flatMap(t => ["-i", t]), "-filter_complex", `${tiles.map((_, i) => `[${i}]`).join("")}hstack=inputs=${tiles.length}`, path.join(out, "directions.png")]);
writeFileSync(path.join(out, "directions.json"), JSON.stringify(meta, null, 1));
console.log(`${path.join(out, "directions.png")}  (${tiles.length} directions, same words, real template at frame ${HOLD})`);
for (const m of meta) console.log(`  ${m.option}  ${m.name.padEnd(18)} ${m.feel.join(", ").padEnd(30)} ${m.bg} / ${m.fg} / ${m.accent}   motion: ${m.motion.personality}`);
for (const m of meta) for (const w of m.warnings) console.log(`  WARN ${m.option}: ${w}`);
