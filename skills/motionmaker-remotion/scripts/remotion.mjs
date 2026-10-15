// Remotion (remotion.dev): video as React components. Motionmaker starts a pinned Remotion project from the approved brief, installs it only on
// the user's yes, renders it with Remotion's own CLI, and proves it frame-exact the same way as our own pieces (two renders compared by pixels).
//
//   node remotion.mjs init <dir> [--size 1080x1920] [--fps 30] [--secs 6] [--text "..."] [--bg --fg --accent "#hex"]   a project from our starter
//   node remotion.mjs install <dir> --yes                  npm install (Remotion 4.0.484 + React 18; about 230 MB of node_modules)
//   node remotion.mjs render <dir> [--out out/video.mp4] [--frames <png dir>]       MP4 (and/or a PNG sequence for review.mjs / contact sheets)
//   node remotion.mjs check <dir> [--frame N]              source rules (no Math.random, Date, timers, fetch) + the same frame rendered twice
//
// Licence (checked 2026-10-15, remotion.dev/license): free for individuals, for-profit organizations with up to 3 employees, non-profits, and
// evaluation; everyone else needs a Remotion Company License. The skill asks before the first render.
// Browser: Remotion downloads its own headless Chrome on first render unless one is given: we pass $CHROMIUM or the machine's Playwright Chromium.
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), PROJECT = path.join(HERE, "..", "project");
const argv = process.argv.slice(2), cmd = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const win = process.platform === "win32", npx = win ? "npx.cmd" : "npx", npm = win ? "npm.cmd" : "npm";
const browser = () => process.env.CHROMIUM || ["/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell", "/opt/pw-browsers/chromium"].find(existsSync);
const browserArgs = () => browser() ? ["--browser-executable", browser()] : [];
const dirArg = () => { const d = path.resolve(argv[1] || ""); if (!argv[1]) die(`${cmd} <dir>`); return d; };
const ready = d => existsSync(path.join(d, "node_modules", "remotion")) || die(`Remotion is not installed in ${d}: after the user's yes,  node remotion.mjs install ${d} --yes`, 3);
const run = (args, cwd) => { const r = spawnSync(npx, ["remotion", ...args], { cwd, encoding: "utf8", maxBuffer: 1 << 28, shell: win }); if (r.status !== 0) die(`remotion ${args[0]} failed:\n${(r.stderr || r.stdout || "").split("\n").slice(-15).join("\n")}`); return r.stdout; };

if (cmd === "init") {
  const d = dirArg(); if (existsSync(path.join(d, "package.json"))) die(`${d} already has a project`);
  const [width, height] = opt("--size", "1920x1080").split("x").map(Number), fps = +opt("--fps", 30), frames = Math.round(fps * +opt("--secs", 6));
  mkdirSync(d, { recursive: true }); cpSync(PROJECT, d, { recursive: true });
  writeFileSync(path.join(d, "props.json"), JSON.stringify({ width, height, fps, frames, text: opt("--text", "Made with Remotion"), bg: opt("--bg", "#0f1115"), fg: opt("--fg", "#f4f1ea"), accent: opt("--accent", "#ff5a36") }, null, 1));
  console.log(`${d}: Remotion project (${width}x${height}, ${fps} fps, ${frames} frames). Edit src/Main.tsx and props.json.\nNext (after the user's yes to the install and the licence):  node remotion.mjs install ${d} --yes`); process.exit(0);
}
if (cmd === "install") {
  const d = dirArg(); if (!argv.includes("--yes")) die(`refused: this runs npm install in ${d} (Remotion 4.0.484 + React 18, about 230 MB). Run again with --yes after the user agrees.`);
  const r = spawnSync(npm, ["install", "--no-fund", "--no-audit"], { cwd: d, stdio: "inherit", shell: win }); if (r.status !== 0) die("npm install failed"); console.log("installed"); process.exit(0);
}
if (cmd === "render") {
  const d = dirArg(); ready(d); const props = path.join(d, "props.json"), out = path.resolve(opt("--out", path.join(d, "out", "video.mp4")));
  const t0 = Date.now();
  if (!opt("--frames") || argv.includes("--out")) { run(["render", "src/index.ts", "Main", out, `--props=${props}`, ...browserArgs()], d); console.log(`MP4: ${out} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }
  if (opt("--frames")) { const fd = path.resolve(opt("--frames")); rmSync(fd, { recursive: true, force: true }); mkdirSync(fd, { recursive: true });
    run(["render", "src/index.ts", "Main", fd, "--sequence", "--image-format=png", `--props=${props}`, ...browserArgs()], d);
    const pngs = readdirSync(fd).filter(f => f.endsWith(".png")).sort(); pngs.forEach((f, i) => { const to = path.join(fd, `f${String(i).padStart(4, "0")}.png`); if (f !== path.basename(to)) cpSync(path.join(fd, f), to); if (f !== path.basename(to)) rmSync(path.join(fd, f)); });
    console.log(`PNG sequence: ${fd}/f0000.png ... (${pngs.length} frames, named like our renderer's so review tools work)`); }
  process.exit(0);
}
if (cmd === "check") {
  const d = dirArg(), problems = [];
  const walk = p => readdirSync(p, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(p, e.name)) : /\.(tsx?|jsx?)$/.test(e.name) ? [path.join(p, e.name)] : []);
  for (const f of walk(path.join(d, "src"))) { const code = readFileSync(f, "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [re, why] of [[/Math\.random\s*\(/, "Math.random(): use random(seed) from remotion"], [/\bDate\.now|new Date\s*\(|performance\.now/, "a clock: time is useCurrentFrame()"], [/setTimeout|setInterval|requestAnimationFrame/, "a timer: animate from the frame number"], [/\bfetch\s*\(|XMLHttpRequest/, "network at render time: put data in props.json or staticFile()"]])
      if (re.test(code)) problems.push(`${path.relative(d, f)}: ${why}`); }
  problems.forEach(p => console.log("FAIL  " + p)); if (!problems.length) console.log("PASS  no clock, unseeded random, timers or network in src/");
  ready(d); const props = JSON.parse(readFileSync(path.join(d, "props.json"), "utf8")), n = +opt("--frame", Math.floor(props.frames / 2)), tmp = path.join(d, "out", ".check");
  mkdirSync(tmp, { recursive: true }); const shots = ["a", "b"].map(k => { const f = path.join(tmp, `${k}.png`); run(["still", "src/index.ts", "Main", f, `--frame=${n}`, `--props=${path.join(d, "props.json")}`, ...browserArgs()], d); return f; });
  const md5 = f => { const r = spawnSync("ffmpeg", ["-loglevel", "error", "-i", f, "-f", "md5", "-"], { encoding: "utf8" }); return r.stdout.trim(); };
  const same = md5(shots[0]) === md5(shots[1]); console.log(`${same ? "PASS" : "FAIL"}  frame ${n} renders identically twice (pixels)`); rmSync(tmp, { recursive: true, force: true });
  process.exit(problems.length || !same ? 1 : 0);
}
die("commands: init <dir> | install <dir> --yes | render <dir> [--out mp4] [--frames dir] | check <dir> [--frame N]");
