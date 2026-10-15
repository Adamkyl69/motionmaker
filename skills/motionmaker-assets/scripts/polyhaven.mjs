// Poly Haven (polyhaven.com): about 2,400 CC0 assets through a free public API: 3D models (glTF), HDRI lighting environments and PBR
// materials. No key. Their API asks two things, which this tool does: a unique User-Agent on every request, and telling users the assets
// come from Poly Haven (the ledger entry and the credit line say so, though CC0 itself requires no credit).
//
//   node polyhaven.mjs search "<words>" [--type models|hdris|textures] [--category <c>] [--limit 12]   find assets (names, tags, categories)
//   node polyhaven.mjs categories <models|hdris|textures>                                               what categories exist, with counts
//   node polyhaven.mjs sheet <id,id,...> --out <sheet.png>                                               numbered thumbnails to SHOW the user before choosing
//   node polyhaven.mjs get <id> --dir motion-out/<slug> [--res 1k|2k|4k] [--format hdr|exr]            download (each file checked against Poly Haven's md5),
//                                                                                                        record it in the project's licence ledger
//
// Files land in <dir>/assets/polyhaven/<id>/: a model's .gltf with its .bin and textures, an HDRI's .hdr (or .exr), a material's maps
// (diffuse, normal (GL), roughness, AO/rough/metal, displacement). The API listing is cached for a day in ~/.cache/motionmaker/polyhaven.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { ffFont } from "../../motionmaker-build/scripts/platform.mjs";

const API = "https://api.polyhaven.com", UA = "Motionmaker (github.com/Adamkyl69/motionmaker)", TYPES = ["models", "hdris", "textures"], TYPE_OF = { 0: "hdris", 1: "textures", 2: "models" };
const argv = process.argv.slice(2), cmd = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const CACHE = path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"), "motionmaker", "polyhaven");
const curl = (url, out) => { const r = spawnSync("curl", ["-sS", "-L", "--fail", "--retry", "2", "-m", "300", "-A", UA, ...(out ? ["-o", out] : []), url], { encoding: out ? undefined : "utf8", maxBuffer: 1 << 30 });
  if (r.status !== 0) die(`request failed: ${url}\n${r.stderr || ""}(is polyhaven.com reachable from here?)`); return r.stdout; };
const json = p => JSON.parse(curl(API + p));
const listing = type => { mkdirSync(CACHE, { recursive: true }); const f = path.join(CACHE, `${type}.json`);
  if (existsSync(f) && Date.now() - statSync(f).mtimeMs < 864e5) return JSON.parse(readFileSync(f, "utf8"));
  const d = json(`/assets?t=${type}`); writeFileSync(f, JSON.stringify(d)); return d; };
const md5 = f => createHash("md5").update(readFileSync(f)).digest("hex");
const safeId = id => /^[A-Za-z0-9_\-]+$/.test(id || "") ? id : die(`not a Poly Haven asset id: ${id}`);

if (cmd === "search") {
  const q = (argv[1] || "").toLowerCase().split(/\s+/).filter(Boolean), types = opt("--type") ? [opt("--type")] : TYPES, cat = opt("--category"), lim = +opt("--limit", 12);
  if (types.some(t => !TYPES.includes(t))) die(`--type ${TYPES.join("|")}`);
  const hits = [];
  for (const t of types) for (const [id, a] of Object.entries(listing(t))) {
    if (cat && !a.categories.includes(cat)) continue;
    const hay = [id, a.name, ...a.tags, ...a.categories].join(" ").toLowerCase(), score = q.reduce((s, w) => s + (a.name.toLowerCase().includes(w) ? 3 : 0) + (a.tags.some(x => x.includes(w)) ? 2 : 0) + (hay.includes(w) ? 1 : 0), 0);
    if (!q.length || score) hits.push({ id, t, a, score: score + (a.download_count || 0) / 1e7 });
  }
  hits.sort((x, y) => y.score - x.score).slice(0, lim).forEach(h => console.log(`${h.id.padEnd(30)} ${h.t.padEnd(8)} ${h.a.name}  [${h.a.categories.slice(0, 3).join(", ")}]${h.t === "models" ? `  ${h.a.polycount} polys` : ""}`));
  if (!hits.length) console.log("no matches: try fewer or other words, or `categories`");
  else console.log(`\n${hits.length} match(es). Show them before choosing:  node polyhaven.mjs sheet ${hits.slice(0, Math.min(lim, 8)).map(h => h.id).join(",")} --out <sheet.png>`);
  process.exit(0);
}
if (cmd === "categories") { const t = argv[1]; if (!TYPES.includes(t)) die(`categories ${TYPES.join("|")}`); const c = json(`/categories/${t}`); Object.entries(c).forEach(([k, v]) => console.log(`${String(v).padStart(5)}  ${k}`)); process.exit(0); }
if (cmd === "sheet") {   // numbered thumbnails, so the user picks by looking
  const ids = (argv[1] || "").split(",").filter(Boolean).map(safeId), out = path.resolve(opt("--out") || die("--out <sheet.png>")); if (!ids.length) die("sheet <id,id,...> --out <png>");
  const tmp = path.join(os.tmpdir(), `ph-sheet-${process.pid}`); mkdirSync(tmp, { recursive: true });
  const cells = ids.map((id, i) => { const info = json(`/info/${id}`), src = path.join(tmp, `${i}.img`), png = path.join(tmp, `${i}.png`);
    curl(info.thumbnail_url.replace(/format=webp/, "format=png").replace(/width=\d+/, "width=320").replace(/height=\d+/, "height=320"), src);
    const label = `${i + 1}  ${info.name}`.replace(/[':\\,%]/g, "").slice(0, 30);
    const r = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-i", src, "-vf", `scale=320:320:force_original_aspect_ratio=decrease,pad=320:320:(ow-iw)/2:(oh-ih)/2:color=0xeeeeee,pad=320:354:0:0:color=0x222222,drawtext=${ffFont()}text='${label}':x=8:y=327:fontsize=17:fontcolor=white`, png]);
    if (r.status !== 0) die(`could not make a tile for ${id}: ${r.stderr}`); return png; });
  const cols = Math.min(4, cells.length), rows = Math.ceil(cells.length / cols), all = [...cells];
  while (all.length < cols * rows) { const b = path.join(tmp, `b${all.length}.png`); spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=0x222222:s=320x354", "-frames:v", "1", b]); all.push(b); }
  const lay = all.map((_, i) => `${(i % cols) * 320}_${Math.floor(i / cols) * 354}`).join("|");
  const r = spawnSync("ffmpeg", ["-loglevel", "error", "-y", ...all.flatMap(f => ["-i", f]), "-filter_complex", all.length > 1 ? `xstack=inputs=${all.length}:layout=${lay}` : "null", "-frames:v", "1", out]);
  rmSync(tmp, { recursive: true, force: true }); if (r.status !== 0) die(r.stderr); console.log(`${out}: ${ids.map((id, i) => `${i + 1}=${id}`).join("  ")}  (Poly Haven, CC0)`); process.exit(0);
}
if (cmd === "get") {
  const id = safeId(argv[1]), dir = path.resolve(opt("--dir") || die("--dir motion-out/<slug> (the project; files go in its assets/polyhaven/<id>)")), res = opt("--res", "1k");
  const info = json(`/info/${id}`), files = json(`/files/${id}`), type = TYPE_OF[info.type], dest = path.join(dir, "assets", "polyhaven", id); mkdirSync(dest, { recursive: true });
  const fetchChecked = (f, rel) => { const to = path.join(dest, rel); if (path.relative(dest, to).startsWith("..")) die(`refused: ${rel} points outside the asset folder`); mkdirSync(path.dirname(to), { recursive: true });
    if (!(existsSync(to) && md5(to) === f.md5)) curl(f.url, to); const got = md5(to); if (got !== f.md5) { rmSync(to, { force: true }); die(`md5 mismatch for ${rel} (expected ${f.md5}, got ${got}): deleted`); } return { rel, size: f.size }; };
  let main, got = [];
  if (type === "models") { const g = files.gltf?.[res]?.gltf || die(`no ${res} glTF for ${id} (have: ${Object.keys(files.gltf || {}).join(", ")})`);
    got.push(fetchChecked(g, path.basename(g.url))); for (const [rel, f] of Object.entries(g.include || {})) got.push(fetchChecked(f, rel)); main = path.basename(g.url); }
  else if (type === "hdris") { const fmt = opt("--format", "hdr"), f = files.hdri?.[res]?.[fmt] || die(`no ${res} ${fmt} for ${id} (have: ${Object.keys(files.hdri || {}).join(", ")})`); got.push(fetchChecked(f, path.basename(f.url))); main = path.basename(f.url); }
  else { const maps = { Diffuse: "diffuse", nor_gl: "normal", Rough: "roughness", arm: "arm", Displacement: "displacement" };
    for (const [k, name] of Object.entries(maps)) { const f = files[k]?.[res]?.jpg || files[k]?.[res]?.png; if (f) got.push(fetchChecked(f, `${name}${path.extname(f.url)}`)); }
    if (!got.length) die(`no ${res} maps for ${id}`); main = got[0].rel; }
  // the licence ledger (same format as ledger.mjs): CC0, with Poly Haven named as the source as their API asks
  const LF = path.join(dir, "assets", "ASSETS.json"), L = existsSync(LF) ? JSON.parse(readFileSync(LF, "utf8")) : { assets: [] }, rel = `polyhaven/${id}/${main}`;
  L.assets = L.assets.filter(a => a.file !== rel);
  L.assets.push({ file: rel, kind: { models: "model", hdris: "hdri", textures: "material" }[type], source: `https://polyhaven.com/a/${id}`, creator: Object.keys(info.authors || {}).join(", "), license: "CC0-1.0",
    attribution: `${info.name} by ${Object.keys(info.authors || {}).join(", ")}, Poly Haven (polyhaven.com), CC0`, notes: `${res}; ${got.length} file(s), each matched Poly Haven's md5; ${got.map(g => g.rel).join(", ")}`,
    sha256: createHash("sha256").update(readFileSync(path.join(dest, main))).digest("hex").slice(0, 16), recordedOn: new Date().toISOString().slice(0, 10) });
  writeFileSync(LF, JSON.stringify(L, null, 1));
  const mb = got.reduce((s, g) => s + g.size, 0) / 1048576;
  console.log(`${type.slice(0, -1)} ${info.name} (${id}, ${res}): ${got.length} file(s), ${mb.toFixed(1)} MB, md5 checked -> ${path.join(dest, main)}\nledger: CC0, credited to ${Object.keys(info.authors || {}).join(", ")} and Poly Haven (${LF})`);
  if (type === "models") console.log(`Blender:  node $MOTIONMAKER_SKILLS/motionmaker-blender/scripts/blender.mjs init turntable --out <dir> --model ${path.join(dest, main)}`);
  if (type === "hdris") console.log(`Blender lighting:  add --hdri ${path.join(dest, main)} to blender.mjs init`);
  process.exit(0);
}
die("commands: search \"<words>\" [--type ..] | categories <type> | sheet <ids> --out <png> | get <id> --dir <project> [--res 1k]");
