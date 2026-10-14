// Photoreal 3D through Blender (github.com/blender/blender, GPL), a SEPARATE program: never bundled, downloaded only on the user's yes, run headless.
//
//   node blender.mjs where                                         is Blender available (yours, or the one we set up), which version
//   node blender.mjs setup --yes                                   download the pinned official build, verify its sha256, unpack under ~/.motionmaker/blender (macOS: see the message)
//   node blender.mjs init turntable --out DIR [--size 1080x1080] [--secs 6] [--fps 24] [--bg "#hex"] [--object "#hex"] [--accent "#hex"] [--model file.glb]
//                                                                  write scene.py + config.json to start from (edit them, or write your own scene.py)
//   node blender.mjs render DIR [--frames 1-24] [--samples 64] [--mp4 out.mp4]   render DIR/scene.py on the CPU (Cycles), PNG frames in DIR/frames, optional MP4
//   node blender.mjs check DIR [--frames 1,12]                    render the same frames twice and compare the pixels: identical on this machine?
//
// Determinism, said plainly: Cycles on a CPU with a fixed seed and fixed threads gives the same pixels for the same scene on the same machine and Blender version
// (`check` proves it for your scene). Another CPU or another Blender version can differ in the last bits: we do not promise pixel identity across machines here.
// Safety: a model must be a data format (glb, gltf, obj, stl, ply); a .blend or .fbx can carry scripts or surprises, so it is refused unless --allow-blend, and Blender runs with --disable-autoexec.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, rmSync, createReadStream, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), SKILL = path.resolve(HERE, ".."), PIN = JSON.parse(readFileSync(path.join(SKILL, "blender.json"), "utf8"));
const argv = process.argv.slice(2), cmd = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const HOME = process.env.MOTIONMAKER_HOME || path.join(os.homedir(), ".motionmaker"), OURS = path.join(HOME, "blender", PIN.version);
const plat = `${process.platform}-${process.arch}`, exe = process.platform === "win32" ? "blender.exe" : "blender";

const find = (dir, depth = 3) => { if (!existsSync(dir) || depth < 0) return null; for (const e of readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isFile() && e.name === exe) return p; if (e.isDirectory() && !/^\.|^(python|datafiles|scripts)$/.test(e.name)) { const r = find(p, depth - 1); if (r) return r; } } return null; };
const candidates = () => [process.env.MOTIONMAKER_BLENDER, find(OURS), "/Applications/Blender.app/Contents/MacOS/Blender",
  ...(process.platform === "win32" ? ["C:\\Program Files\\Blender Foundation"].flatMap(d => existsSync(d) ? readdirSync(d).map(v => path.join(d, v, exe)) : []) : []), "blender"].filter(Boolean);
const version = b => { const r = spawnSync(b, ["--version"], { encoding: "utf8", timeout: 60000 }); return r.status === 0 ? (r.stdout.match(/Blender\s+([\d.]+)/) || [])[1] || "?" : null; };
const locate = () => { for (const b of candidates()) { const v = version(b); if (v) return { bin: b, version: v }; } return null; };
const sha256 = f => new Promise((res, rej) => { const h = createHash("sha256"); createReadStream(f).on("data", c => h.update(c)).on("error", rej).on("end", () => res(h.digest("hex"))); });
// Blender writes render time and other text into the PNG, so two identical renders differ as FILES: compare the decoded pixels instead
const pixels = f => { const r = spawnSync("ffmpeg", ["-loglevel", "error", "-i", f, "-f", "md5", "-"], { encoding: "utf8" }); if (r.status !== 0) die(`ffmpeg could not read ${f}: ${r.stderr}`); return r.stdout.trim().replace("MD5=", ""); };
const need = () => locate() || die(`Blender is not available. It is a one-time download of about ${(PIN.files[plat] || {}).mb || 380} MB, to be done only if the user says yes:\n  node blender.mjs setup --yes\n(or point MOTIONMAKER_BLENDER at a Blender you already have)`, 3);

if (cmd === "where") {
  const b = locate(); if (!b) { const f = PIN.files[plat]; console.log(`Blender: not found.${f ? ` Setup would download ${f.name} (${f.mb} MB${f.unpackedGb ? `, about ${f.unpackedGb} GB on disk` : ""}) from blender.org and check its sha256.` : ` No pinned build for ${plat}.`}`); process.exit(3); }
  console.log(`Blender ${b.version}: ${b.bin}${b.version.startsWith(PIN.version.slice(0, 3)) ? "" : `  (tested with ${PIN.version}; other versions may differ)`}`); process.exit(0);
}

if (cmd === "setup") {
  const f = PIN.files[plat]; if (!f) die(`no pinned Blender build for ${plat}. Install Blender yourself and set MOTIONMAKER_BLENDER=<path to the blender program>.`);
  const have = locate(); if (have) { console.log(`Blender ${have.version} is already available: ${have.bin}. Nothing to download.`); process.exit(0); }
  if (f.manual) die(`macOS: a .dmg cannot be unpacked without mounting it. Install Blender ${PIN.version} from ${PIN.base}${f.name}\n(sha256 ${f.sha256}), then run with MOTIONMAKER_BLENDER=/Applications/Blender.app/Contents/MacOS/Blender.`);
  if (!argv.includes("--yes")) die(`refused: this downloads ${f.name} (${f.mb} MB, about ${f.unpackedGb} GB once unpacked) from blender.org into ${OURS}. Run again with --yes only after the user has said yes.`);
  mkdirSync(OURS, { recursive: true }); const tmp = path.join(OURS, f.name);
  console.log(`downloading ${PIN.base}${f.name} (${f.mb} MB)...`);
  const dl = spawnSync("curl", ["-L", "--fail", "--retry", "3", "-o", tmp, PIN.base + f.name], { stdio: ["ignore", "inherit", "inherit"] });
  if (dl.status !== 0) die("download failed (is blender.org reachable from here?). Nothing was installed.");
  const got = await sha256(tmp);
  if (got !== f.sha256) { rmSync(tmp, { force: true }); die(`CHECKSUM MISMATCH: expected ${f.sha256}, got ${got}. The download was deleted and nothing was installed.`); }
  console.log("sha256 matches the pinned value. Unpacking...");
  const x = spawnSync("tar", [f.name.endsWith(".zip") ? "-xf" : "-xJf", tmp, "-C", OURS], { stdio: ["ignore", "inherit", "inherit"] });
  if (x.status !== 0) die("unpacking failed (needs tar" + (f.name.endsWith(".xz") ? " with xz" : "") + ").");
  rmSync(tmp, { force: true });
  const b = locate(); if (!b) die("unpacked, but the blender program was not found inside."); console.log(`ready: Blender ${b.version} at ${b.bin}`); process.exit(0);
}

if (cmd === "init") {
  const kind = argv[1]; if (kind !== "turntable") die("init turntable --out DIR [...]   (turntable: an object on a floor, the camera circling it; for anything else write your own scene.py)");
  const out = path.resolve(opt("--out", "")); if (!opt("--out")) die("--out DIR is required");
  const [W, H] = opt("--size", "1080x1080").split("x").map(Number), fps = +opt("--fps", 24), secs = +opt("--secs", 6), model = opt("--model");
  if (model) { if (!/\.(glb|gltf|obj|stl|ply)$/i.test(model)) die(`model must be glb, gltf, obj, stl or ply (a .blend or .fbx can carry scripts); got ${model}`); if (!existsSync(model)) die(`no such file: ${model}`); }
  mkdirSync(out, { recursive: true }); copyFileSync(path.join(SKILL, "scripts/scenes/turntable.py"), path.join(out, "scene.py"));
  const cfg = { width: W, height: H, fps, frames: Math.round(fps * secs), samples: 128, seed: 7, denoise: false, bg: opt("--bg", "#EEE9E1"), floor: opt("--bg", "#EEE9E1"), object: opt("--object", "#1C1C1C"), accent: opt("--accent", "#D4472B"), model: model ? path.resolve(model) : null, elevation: 28, distance: 9, loop: true };
  writeFileSync(path.join(out, "config.json"), JSON.stringify(cfg, null, 2));
  console.log(`${out}/scene.py and config.json (${cfg.frames} frames, ${W}x${H}, ${fps} fps). Edit config.json (colours, samples, camera) or scene.py, then: node blender.mjs render ${out}${model ? `\nthe model ${path.basename(model)} needs a licence-ledger entry (motionmaker-assets/scripts/ledger.mjs add ...)` : ""}`); process.exit(0);
}

const renderTo = (b, dir, frames, outDir, samples) => {   // one headless Cycles render of DIR/scene.py into outDir
  mkdirSync(outDir, { recursive: true });
  const [a, z] = frames.split("-").map(Number), cfgPath = path.join(dir, "config.json");
  const args = ["-b", "--disable-autoexec", "-noaudio", "-P", path.join(dir, "scene.py"), "-o", path.join(outDir, "f####"), "-F", "PNG", "-s", String(a), "-e", String(z ?? a), "-a", "--", cfgPath, ...(samples ? ["--samples", String(samples)] : [])];
  const t0 = Date.now(), r = spawnSync(b.bin, args, { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) die(`Blender failed (exit ${r.status}):\n${(r.stdout || "").split("\n").slice(-12).join("\n")}\n${(r.stderr || "").split("\n").slice(-12).join("\n")}`);
  return (Date.now() - t0) / 1000;
};
if (cmd === "render") {
  const dir = path.resolve(argv[1] || ""); if (!existsSync(path.join(dir, "scene.py"))) die(`no scene.py in ${dir}: run  node blender.mjs init turntable --out ${dir}`);
  const b = need(), cfg = JSON.parse(readFileSync(path.join(dir, "config.json"), "utf8")), frames = opt("--frames", `1-${cfg.frames}`), n = frames.split("-").map(Number); const count = (n[1] ?? n[0]) - n[0] + 1;
  console.log(`Blender ${b.version}, Cycles on CPU, ${cfg.width}x${cfg.height}, ${opt("--samples", cfg.samples)} samples, ${count} frame(s)...`);
  const secs = renderTo(b, dir, frames, path.join(dir, "frames"), opt("--samples"));
  console.log(`rendered ${count} frame(s) in ${secs.toFixed(0)} s (${(secs / count).toFixed(1)} s per frame on ${os.cpus().length} cores) -> ${dir}/frames/f####.png`);
  if (opt("--mp4")) { const r = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(cfg.fps), "-start_number", String(n[0]), "-i", path.join(dir, "frames", "f%04d.png"), "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "16", "-movflags", "+faststart", path.resolve(opt("--mp4"))], { encoding: "utf8" }); if (r.status !== 0) die(`ffmpeg: ${r.stderr}`); console.log(`MP4: ${path.resolve(opt("--mp4"))}`); }
  process.exit(0);
}

if (cmd === "check") {
  const dir = path.resolve(argv[1] || ""); if (!existsSync(path.join(dir, "scene.py"))) die(`no scene.py in ${dir}`);
  const b = need(), list = opt("--frames", "1,12").split(",").map(Number), bad = [];
  for (const fr of list) { const A = path.join(dir, "check-a"), B = path.join(dir, "check-b"); renderTo(b, dir, String(fr), A); renderTo(b, dir, String(fr), B);
    const name = `f${String(fr).padStart(4, "0")}.png`, [ha, hb] = [pixels(path.join(A, name)), pixels(path.join(B, name))]; console.log(`frame ${fr}: ${ha === hb ? "identical" : "DIFFERENT"} (${ha.slice(0, 12)} / ${hb.slice(0, 12)})`); if (ha !== hb) bad.push(fr); rmSync(A, { recursive: true, force: true }); rmSync(B, { recursive: true, force: true }); }
  console.log(bad.length ? `NOT deterministic here: frames ${bad.join(", ")} differ between two renders. Say so; do not call this piece frame-exact.` : `Deterministic on this machine (Blender ${b.version}, ${os.cpus().length} cores). Another CPU or Blender version can differ in the last bits.`); process.exit(bad.length ? 1 : 0);
}
die("commands: where | setup --yes | init turntable --out DIR | render DIR | check DIR");
