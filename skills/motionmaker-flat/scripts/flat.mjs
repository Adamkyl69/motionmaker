// Flat design motion scenes: start from a preset, check a scene before building it.
//
//   node flat.mjs list                              the presets and what each is
//   node flat.mjs new <preset> --out <scene.json>   copy a preset to edit (colours, layers, shots, words)
//   node flat.mjs validate <scene.json>             layer types, depths, worlds, shots, transitions, local images: exit 1 on a problem
//
// Build: TEMPLATE=flat-scene SCENE=<preset | scene.json> bash $MOTIONMAKER_SKILLS/motionmaker/scripts/scaffold.sh <slug> "<headline>" W H fps secs - - - <out>
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), PRE = path.join(HERE, "../presets");
const [cmd, arg, ...rest] = process.argv.slice(2), opt = (k, d) => { const i = rest.indexOf(k); return i > -1 ? rest[i + 1] : d; };
const die = m => { console.error(m); process.exit(1); };
const TYPES = ["sky", "stars", "sun", "clouds", "mountains", "hills", "ground", "water", "skyline", "palms", "pines", "rounds", "birds", "text", "image", "shapes"];
const TRANS = ["cut", "dissolve", "whip", "iris", "push"], EASES = ["linear", "inOut", "out", "in", "gentle"], SHAPES = ["circle", "ring", "rect", "tri", "line"];

if (cmd === "list") { for (const f of readdirSync(PRE).filter(f => f.endsWith(".json")).sort()) { const j = JSON.parse(readFileSync(path.join(PRE, f), "utf8")); console.log(`${f.replace(".json", "").padEnd(8)} ${j.about}`); } process.exit(0); }
if (cmd === "new") { const src = path.join(PRE, `${arg}.json`); if (!existsSync(src)) die(`no preset "${arg}" (node flat.mjs list)`); const out = opt("--out") || die("--out <scene.json>");
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); writeFileSync(out, readFileSync(src)); console.log(`${out}: edit it, then  node flat.mjs validate ${out}`); process.exit(0); }
if (cmd === "validate") {
  const f = arg || die("validate <scene.json>"); let j; try { j = JSON.parse(readFileSync(f, "utf8")); } catch (e) { die(`${f}: not valid JSON (${e.message})`); }
  const errs = [], warn = [], hexOk = c => typeof c === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
  if (!j.worlds || !Object.keys(j.worlds).length) errs.push("no worlds");
  for (const [name, w] of Object.entries(j.worlds || {})) {
    if (!Array.isArray(w.layers)) { errs.push(`world ${name}: no layers`); continue; }
    if (!w.layers.some(l => l.type === "sky")) warn.push(`world ${name}: no sky layer (the frame starts black)`);
    w.layers.forEach((l, i) => { const at = `world ${name} layer ${i + 1} (${l.type})`;
      if (!TYPES.includes(l.type)) errs.push(`${at}: unknown type (have: ${TYPES.join(", ")})`);
      if (l.k != null && (typeof l.k !== "number" || l.k < 0 || l.k > 4)) errs.push(`${at}: k must be a number 0..4 (0 far, 1 focal plane, >1 foreground)`);
      for (const c of ["color", "color2", "color3"]) if (l[c] != null && !hexOk(l[c])) errs.push(`${at}: ${c} must be #rrggbb`);
      if (l.k > 1.2 && !l.blur && ["palms", "pines", "rounds"].includes(l.type)) warn.push(`${at}: a foreground layer without blur looks pasted on: try "blur": 3-8`);
      if (l.type === "shapes") (l.items || []).forEach((it, k) => { if (!SHAPES.includes(it.shape)) errs.push(`${at} item ${k + 1}: shape must be ${SHAPES.join("|")}`); });
      if (l.type === "image" && (!l.src || /^[a-z]+:|^\/\/|\.\./i.test(l.src) || !existsSync(path.resolve(path.dirname(f), l.src)))) errs.push(`${at}: src must be a local file next to the scene (got ${l.src})`); }); }
  if (!Array.isArray(j.shots) || !j.shots.length) errs.push("no shots");
  (j.shots || []).forEach((s, i) => { const at = `shot ${i + 1}`;
    if (s.world && !(j.worlds || {})[s.world]) errs.push(`${at}: world "${s.world}" does not exist`);
    if (!s.world && Object.keys(j.worlds || {}).length > 1) warn.push(`${at}: no world named, uses the first`);
    if (s.ease && !EASES.includes(s.ease)) errs.push(`${at}: ease must be ${EASES.join("|")}`);
    if (s.transition && !TRANS.includes(s.transition.type)) errs.push(`${at}: transition must be ${TRANS.join("|")}`);
    if (i === 0 && s.transition && s.transition.type !== "cut") warn.push(`${at}: the first shot's transition is ignored`);
    const z = [s.from?.zoom ?? 1, s.to?.zoom ?? 1]; if (z.some(v => v < 0.8 || v > 2.5)) warn.push(`${at}: zoom ${z.join(" -> ")}: outside 0.8..2.5 the frame shows the world's edges or blurs`);
    if (Math.abs((s.to?.x ?? s.from?.x ?? 0) - (s.from?.x ?? 0)) > 900) warn.push(`${at}: a pan of more than 900 units in one shot reads as a rush; flat design moves slowly`);
    for (const t of s.text || []) if (!t.text) warn.push(`${at}: a text entry with no text`); });
  errs.forEach(e => console.log("ERROR " + e)); warn.forEach(w => console.log("note  " + w));
  console.log(errs.length ? `${f}: ${errs.length} problem(s)` : `${f}: OK (${Object.keys(j.worlds).length} world(s), ${j.shots.length} shot(s))`); process.exit(errs.length ? 1 : 0);
}
die("commands: list | new <preset> --out <scene.json> | validate <scene.json>");
