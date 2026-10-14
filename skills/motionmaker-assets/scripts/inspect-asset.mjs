// Look at an animation/illustration file BEFORE using it: what it is, how big, how long, what it needs, and whether it carries anything executable.
//
//   node inspect-asset.mjs <file.json|file.svg|file.riv> [--json]
//
// Verdicts: OK / WARN (usable, read the notes) / BLOCK (do not render until the cause is removed or the user accepts the risk with --allow-unsafe).
// Why this matters: third-party assets are untrusted input. An SVG can contain <script>, event handlers or external references; a Lottie file can contain
// expressions that the player evaluates as JavaScript; a file can reference remote images. Our renderer also blocks all non-local network requests, but
// inspect first, and never render an asset from a source the user does not trust.
import { readFileSync, writeFileSync, statSync, mkdtempSync, copyFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const argv = process.argv.slice(2), file = argv.find(a => !a.startsWith("--")), asJson = argv.includes("--json"), allowUnsafe = argv.includes("--allow-unsafe");
if (!file) { console.error("usage: inspect-asset.mjs <file.json|file.svg|file.riv> [--json] [--allow-unsafe]"); process.exit(1); }
if (!existsSync(file)) { console.error(`not found: ${file}`); process.exit(1); }
const HERE = path.dirname(fileURLToPath(import.meta.url)), ext = path.extname(file).toLowerCase(), size = statSync(file).size;
const rep = { file, bytes: size, type: "?", facts: {}, warn: [], block: [] };
const W = m => rep.warn.push(m), B = m => rep.block.push(m), fmt = n => n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : (n / 1e3).toFixed(0) + " KB";
if (size > 25e6) W(`large file (${fmt(size)}): rendering will be slow`);

function lottie(j) {
  rep.type = "Lottie animation (JSON)";
  const f = rep.facts; f.size = `${j.w}x${j.h}`; f.frameRate = j.fr; f.frames = `${j.ip}..${j.op}`; f.durationSeconds = +((j.op - j.ip) / j.fr).toFixed(3); f.version = j.v; f.layers = (j.layers || []).length; f.assets = (j.assets || []).length;
  let expressions = 0, threeD = 0, effects = 0, textLayers = 0, remap = 0, gradients = 0, masks = 0, mattes = 0; const exprSamples = [];
  const walk = n => { if (Array.isArray(n)) return n.forEach(walk); if (!n || typeof n !== "object") return;
    if (typeof n.x === "string" && n.x.length > 2) { expressions++; if (exprSamples.length < 2) exprSamples.push(n.x.slice(0, 70)); }
    if (n.ddd === 1) threeD++; if (Array.isArray(n.ef) && n.ef.length) effects += n.ef.length; if (n.ty === 5) textLayers++; if (n.tm) remap++; if (n.ty === "gf" || n.ty === "gs") gradients++; if (Array.isArray(n.masksProperties) && n.masksProperties.length) masks++; if (n.tt) mattes++;
    for (const k of Object.keys(n)) walk(n[k]); };
  walk(j);
  const imgs = (j.assets || []).filter(a => a.p !== undefined && a.w !== undefined), embedded = imgs.filter(a => typeof a.p === "string" && a.p.startsWith("data:")), external = imgs.filter(a => !(typeof a.p === "string" && a.p.startsWith("data:")));
  Object.assign(f, { expressions, effects, textLayers, threeDLayers: threeD, gradients, masks, mattes, embeddedImages: embedded.length, externalImageFiles: external.length });
  if (expressions) W(`${expressions} expression(s) (JavaScript the player evaluates, e.g. "${exprSamples[0]}"): only render files from a source you trust`);
  if (external.length) B(`${external.length} image(s) loaded from outside the file (e.g. ${String(external[0].u || "")}${external[0].p}): they would not load (network is blocked) and could be remote. Embed them or remove them`);
  if (embedded.length) W(`${embedded.length} embedded raster image(s): file is heavier and may look soft when scaled`);
  if (threeD) W(`${threeD} 3D layer(s): lottie-web has limited 3D support; check the render`);
  if (effects) W(`${effects} layer effect(s): many After Effects effects are not supported by lottie-web and are silently skipped; check the render`);
  if (textLayers) W(`${textLayers} text layer(s): fonts must be installed or embedded, else a fallback font is used`);
  if (remap) W("time remapping is used: playback by frame number may not match the nominal duration");
  if (gradients) rep.facts.note = "contains gradients (recolor.mjs does not rewrite them)";
  if (j.fr > 60) W(`frame rate ${j.fr} fps: it will be resampled to the composition's fps`);
  rep.how = `duration ${f.durationSeconds}s at ${j.fr} fps; native size ${j.w}x${j.h}. Use TEMPLATE=lottie-scene ASSET=${file}; set LOOP=1 if it is meant to loop.`;
}

function svg(t) {
  rep.type = "SVG illustration"; const f = rep.facts;
  const vb = t.match(/viewBox="([^"]+)"/); f.viewBox = vb ? vb[1] : "(none)"; f.elements = (t.match(/<(path|circle|rect|ellipse|polygon|polyline|line|text|image|use)\b/g) || []).length; f.groups = (t.match(/<g\b/g) || []).length; f.namedLayers = [...new Set([...t.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]))].slice(0, 12);
  f.colors = new Set([...t.matchAll(/(?:fill|stroke)\s*[=:]\s*["']?(#[0-9a-fA-F]{3,8})/g)].map(m => m[1].toUpperCase())).size;
  if (/<script\b/i.test(t)) B("contains a <script> element: it would run JavaScript in the page");
  if (/\son[a-z]+\s*=/i.test(t)) B("contains inline event handlers (onload=, onclick=, ...): they would run JavaScript");
  if (/javascript:/i.test(t)) B("contains a javascript: URL");
  if (/<foreignObject\b/i.test(t)) B("contains <foreignObject> (embedded HTML)");
  const ext = [...t.matchAll(/(?:href|src)\s*=\s*["'](https?:[^"']+)/gi)].map(m => m[1]); if (ext.length) B(`references ${ext.length} external URL(s), e.g. ${ext[0].slice(0, 60)}`);
  if (/@import|url\(\s*["']?https?:/i.test(t)) B("CSS pulls in external resources");
  const raster = (t.match(/<image\b/g) || []).length; if (raster) W(`${raster} embedded <image> raster(s): may look soft when scaled`);
  if (/<text\b/i.test(t)) W("contains live <text>: fonts must be installed (convert text to outlines for a safe look)");
  if (/<filter\b/i.test(t)) W("uses SVG filters: slow to animate and can differ between browsers");
  if (t.length > 2e6) W("very large SVG: animating it may be slow");
  rep.how = `inline it in a template and animate named layers (${f.namedLayers.slice(0, 5).join(", ") || "none named: wrap parts in <g id=...>"}). Use TEMPLATE=illustration-scene ASSET=${file}.`;
}

async function riv() {
  rep.type = "Rive file (.riv)";
  const req = createRequire(import.meta.url); let pkg = null;
  for (const r of [process.env.MOTIONMAKER_KITS && path.join(process.env.MOTIONMAKER_KITS, "node_modules"), path.join(os.homedir(), ".cache/motionmaker/kits/node_modules"), path.join(process.cwd(), "node_modules")].filter(Boolean)) if (existsSync(path.join(r, "@rive-app/canvas/rive.js"))) { pkg = path.join(r, "@rive-app/canvas"); break; }
  if (!pkg) { W("could not inspect: the Rive runtime is not installed (run: node kit.mjs setup, or npm i @rive-app/canvas)"); return; }
  const { launch, serve } = await import(pathToFileURL(path.join(HERE, "../../motionmaker-build/scripts/browser.mjs")).href);   // a file URL: Windows paths are not import specifiers
  const tmp = mkdtempSync(path.join(os.tmpdir(), "mm-rive-")); copyFileSync(path.join(pkg, "rive.js"), path.join(tmp, "rive.js")); copyFileSync(path.join(pkg, "rive.wasm"), path.join(tmp, "rive.wasm")); copyFileSync(file, path.join(tmp, "a.riv"));
  writeFileSync(path.join(tmp, "i.html"), `<!doctype html><canvas id=c width=200 height=200></canvas><script src="rive.js"></script><script>rive.RuntimeLoader.setWasmUrl("./rive.wasm");
    window.load = (artboard, anims) => new Promise((res, rej) => { const r = new rive.Rive({ src: "a.riv", canvas: document.getElementById("c"), artboard, animations: anims, autoplay: false, onLoad() { r.stopRendering(); res(r); }, onLoadError: e => rej(String(e)) }); });</script>`);
  const srv = await serve(tmp), b = await launch(), p = await b.newPage(); const errs = []; p.on("pageerror", e => errs.push(String(e).slice(0, 120)));
  await p.route(u => !/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(u.href), r => r.abort());
  try {
    await p.goto(`${srv.url}/i.html`);
    const info = await p.evaluate(async () => { const r0 = await window.load(undefined, undefined), out = { artboards: [] }; for (const a of r0.contents.artboards) { const o = { name: a.name, stateMachines: a.stateMachines.map(s => s.name), animations: [] }; for (const an of a.animations) { try { const r = await window.load(a.name, [an]), la = r.animator.animations[0].animation; o.animations.push({ name: an, seconds: +(la.duration / la.fps).toFixed(3), fps: la.fps }); } catch (e) { o.animations.push({ name: an, error: String(e).slice(0, 60) }); } } out.artboards.push(o); } return out; });
    rep.facts = info; rep.how = `pick an artboard and a LINEAR animation (frame-exact via scrub); loops must wrap time by that animation's seconds. State machines are interactive/time-driven: they are not frame-stepped by TEMPLATE=rive-scene. Use ARTBOARD=<name> ANIMATION=<name>.`;
    if (info.artboards.some(a => a.stateMachines.length)) W("has state machines: interactive logic is not driven by our frame-exact scrub; only linear animations are");
    if (!info.artboards.some(a => a.animations.length)) W("no linear animations found: nothing to scrub frame by frame");
  } catch (e) { W("could not read the file with the Rive runtime: " + String(e).slice(0, 120)); }
  if (errs.length) W("runtime errors: " + errs[0]);
  await b.close(); srv.close();
}

let text = null;
if (ext === ".json") { text = readFileSync(file, "utf8"); let j; try { j = JSON.parse(text); } catch (e) { B("not valid JSON: " + e.message); } if (j) { if (j.layers && j.fr !== undefined && j.w) lottie(j); else { rep.type = "JSON (not a Lottie animation)"; B("missing layers/fr/w: not a Lottie file"); } } }
else if (ext === ".svg") { text = readFileSync(file, "utf8"); svg(text); }
else if (ext === ".riv") await riv();
else if (ext === ".lottie") { rep.type = "dotLottie (zip)"; W("a .lottie file is a zip: run `unzip file.lottie -d out/` and inspect out/animations/<id>.json (and out/images/ if any)"); }
else { rep.type = `unsupported (${ext || "no extension"})`; W("supported: .json (Lottie), .svg, .riv"); }

const verdict = rep.block.length ? (allowUnsafe ? "BLOCK (overridden by --allow-unsafe)" : "BLOCK") : rep.warn.length ? "WARN" : "OK";
if (asJson) console.log(JSON.stringify({ ...rep, verdict }, null, 1));
else {
  console.log(`${file}  (${fmt(size)})\ntype: ${rep.type}`); for (const [k, v] of Object.entries(rep.facts)) console.log(`  ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
  rep.block.forEach(x => console.log(`BLOCK ${x}`)); rep.warn.forEach(x => console.log(`WARN  ${x}`)); if (rep.how) console.log(`use:  ${rep.how}`);
  console.log(`\nverdict: ${verdict}\nBefore it ships: record its licence with ledger.mjs (source URL, creator, licence). Unknown licence = do not ship.`);
}
process.exit(rep.block.length && !allowUnsafe ? 2 : 0);
