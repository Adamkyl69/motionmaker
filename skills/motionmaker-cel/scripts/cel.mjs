// Cel animation scenes: start from a preset, check a scene's code before building it.
//
//   node cel.mjs list                             the presets and what each shows
//   node cel.mjs new <preset> --out <scene.js>    copy a preset to edit (its shapes, colours, timing, words)
//   node cel.mjs check <scene.js>                 the scene contract: window.SCENE with draw(k); no clock, no unseeded random, no network,
//                                                 no timers; exit 1 on a problem
//
// Build: TEMPLATE=cel-scene SCENE=<preset | scene.js> bash $MOTIONMAKER_SKILLS/motionmaker/scripts/scaffold.sh <slug> "<headline>" W H fps secs - - - <out>
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), PRE = path.join(HERE, "../presets");
const [cmd, arg, ...rest] = process.argv.slice(2), opt = (k, d) => { const i = rest.indexOf(k); return i > -1 ? rest[i + 1] : d; };
const die = m => { console.error(m); process.exit(1); };
const about = src => (src.match(/^\/\/ (.+)$/m) || [, ""])[1];

if (cmd === "list") { for (const f of readdirSync(PRE).filter(f => f.endsWith(".js")).sort()) console.log(`${f.replace(".js", "").padEnd(12)} ${about(readFileSync(path.join(PRE, f), "utf8"))}`); process.exit(0); }
if (cmd === "new") { const src = path.join(PRE, `${arg}.js`); if (!existsSync(src)) die(`no preset "${arg}" (node cel.mjs list)`); const out = opt("--out") || die("--out <scene.js>");
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); writeFileSync(out, readFileSync(src)); console.log(`${out}: edit it, then  node cel.mjs check ${out}`); process.exit(0); }
if (cmd === "check") {
  const f = arg || die("check <scene.js>"), src = readFileSync(f, "utf8"), code = src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""), errs = [], notes = [];
  if (!/window\.SCENE\s*=/.test(code)) errs.push("no `window.SCENE = { ... }`");
  if (!/\bdraw\s*\(\s*k\s*\)/.test(code)) errs.push("no draw(k) method");
  for (const [re, why] of [[/Math\.random\s*\(/, "Math.random(): use k.hash(k.drawing, i) or k.rng (seeded in setup)"], [/\bDate\b|performance\.now|requestAnimationFrame|setTimeout|setInterval/, "a clock or timer: time comes from k.t (drawings) and k.time (camera)"],
    [/\bfetch\s*\(|XMLHttpRequest|import\s*\(|<script|WebSocket|navigator\./, "network, dynamic code or device access: a scene draws, nothing else"], [/\beval\s*\(|new Function/, "eval / new Function"]]) if (re.test(code)) errs.push(why);
  if (/k\.rng\s*\(/.test(code.replace(/setup\s*\(k\)\s*\{[\s\S]*?\n  \},/, ""))) notes.push("k.rng() outside setup changes with call order: use k.hash(k.drawing, i) in draw");
  if (!/id:\s*\d/.test(code)) notes.push("shapes without an `id` boil by draw order: give each shape a fixed id so adding one does not change the others' wobble");
  errs.forEach(e => console.log("ERROR " + e)); notes.forEach(n => console.log("note  " + n));
  console.log(errs.length ? `${f}: ${errs.length} problem(s)` : `${f}: OK`); process.exit(errs.length ? 1 : 0);
}
die("commands: list | new <preset> --out <scene.js> | check <scene.js>");
