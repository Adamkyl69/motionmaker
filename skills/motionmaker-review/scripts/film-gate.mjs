// Check the FINISHED film (the MP4 you will hand over), not the page: things a viewer would reject that per-frame checks cannot see.
//
//   node film-gate.mjs <film.mp4> [--json out.json] [--allow-blue-purple "reason"] [--subtitles]
//
// Hard gates (RED, exit 2: do not deliver):
//   dead stretch   a mid-film run where NOTHING visibly changes: fewer than 0.1% of pixels change by more than 12/255, both between consecutive frames
//                  (12 fps, 320 px grey) and across one second (so a slow push or drift counts as alive). RED >= 4 s, YELLOW >= 2.5 s; first/last 0.5 s ignored.
//   blank run      a run of >= 0.3 s mid-film where almost no pixel has an edge (Sobel > 24 on < 0.2% of pixels), first/last 0.5 s ignored.
//                  Judged by edges, not colour, so a black frame with thin lines or a formula is not blank.
//   blue-purple    share of frames whose pixels are >= 30% blue-purple (hue 225-300, saturation >= 0.30, value 0.12-0.90). RED >= 0.30, YELLOW >= 0.12.
//                  The default "AI" palette. --allow-blue-purple "<brand reason>" downgrades it to YELLOW and records the reason.
// Reported (never blocking): full-frame energy (share of pairs whose MEAN change >= 9/255), alive share, cuts per minute, quietest 5 s window.
// Origin and calibration: the three gates come from huashu-art-motion's film_gate.py (MIT, github.com/alchaincyf/huashu-art-motion), calibrated there on
// full-frame painterly films. Measured on Motionmaker's own templates (restrained motion graphics, small moving areas) their motion floor failed every
// one, so here the motion gate is a dead-stretch test instead (it caught a real 6.2 s frozen hold in our product-demo template, since fixed), the
// full-frame number is information only, and the blue-purple value floor is 0.12 instead of 0.06 so near-black backgrounds (#0B0D12) are not counted.
import { spawnSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";

const argv = process.argv.slice(2), file = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
if (!file || !existsSync(file)) { console.error("usage: film-gate.mjs <film.mp4> [--json out.json] [--allow-blue-purple reason] [--subtitles]"); process.exit(1); }
const probe = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file], { encoding: "utf8" }).stdout);
const SW = probe.streams[0].width, SH = probe.streams[0].height, DUR = +probe.format.duration, portrait = SH > SW;
const decode = (fps, w, pix, ch) => { const h = Math.round(w * SH / SW / 2) * 2; const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `fps=${fps},scale=${w}:${h}:flags=area,format=${pix}`, "-f", "rawvideo", "-"], { maxBuffer: 2e9 });
  if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); } const n = Math.floor(r.stdout.length / (w * h * ch)); return { w, h, n, buf: r.stdout }; };

// ---- grey analysis at 12 fps, 320 px
const FPS = 12, G = decode(FPS, 320, "gray", 1), px = G.w * G.h, maskRows = argv.includes("--subtitles") ? Math.round(G.h * (portrait ? 0.18 : 0.15)) : 0, rows = G.h - maskRows;
const frame = i => G.buf.subarray(i * px, (i + 1) * px);
const d = [0]; for (let i = 1; i < G.n; i++) { const a = frame(i - 1), b = frame(i); let s = 0; for (let k = 0; k < rows * G.w; k++) s += Math.abs(a[k] - b[k]); d.push(s / (rows * G.w)); }
const sorted = d.slice(1).sort((x, y) => x - y), median = sorted[Math.floor(sorted.length / 2)] || 0, cutT = Math.max(8, 3 * median + 2);
const cut = d.map((v, i) => i > 0 && v >= cutT && (i < 2 || d[i - 1] < cutT));   // a cut is a sudden one-pair spike
const excl = d.map((_, i) => cut[i] || cut[i - 1] || cut[i + 1]);
const pairs = d.map((v, i) => ({ i, v })).filter(p => p.i > 0 && !excl[p.i]);
const fastRatio = pairs.length ? pairs.filter(p => p.v >= 9).length / pairs.length : 0, meanMotion = pairs.reduce((s, p) => s + p.v, 0) / Math.max(1, pairs.length);
const span = FPS, far = []; for (let i = 0; i + span < G.n; i++) { const a = frame(i), b = frame(i + span); let c = 0; for (let k = 0; k < rows * G.w; k++) if (Math.abs(a[k] - b[k]) > 12) c++; far.push(c / (rows * G.w)); }
const near = [0]; for (let i = 1; i < G.n; i++) { const a = frame(i - 1), b = frame(i); let c = 0; for (let k = 0; k < rows * G.w; k++) if (Math.abs(a[k] - b[k]) > 12) c++; near.push(c / (rows * G.w)); }
const skip = Math.round(0.5 * FPS); let drun = 0, dead = { seconds: 0, from: 0 }, aliveN = 0;
for (let i = 1; i < G.n; i++) { const isDead = near[i] < 0.001 && (far[i] ?? 0) < 0.001 && (far[i - span] ?? 0) < 0.001; if (!isDead) aliveN++;
  if (i >= skip && i < G.n - skip && isDead) { drun++; if (drun / FPS > dead.seconds) dead = { seconds: drun / FPS, from: (i + 1 - drun) / FPS }; } else drun = 0; }
let still = 0, longestStill = 0; for (let i = 1; i < G.n; i++) { still = d[i] < 0.3 ? still + 1 : 0; longestStill = Math.max(longestStill, still); }
const win = 5 * FPS; let worst = { t: 0, v: Infinity }; for (let s = 1; s + win <= G.n; s += FPS) { const v = d.slice(s, s + win).reduce((a, b) => a + b, 0) / win; if (v < worst.v) worst = { t: s / FPS, v }; }
// blank frames: almost no edges
function edgeFrac(f) { let c = 0; const W = G.w; for (let y = 1; y < rows - 1; y++) for (let x = 1; x < W - 1; x++) { const p = y * W + x;
  const gx = -f[p - W - 1] - 2 * f[p - 1] - f[p + W - 1] + f[p - W + 1] + 2 * f[p + 1] + f[p + W + 1], gy = -f[p - W - 1] - 2 * f[p - W] - f[p - W + 1] + f[p + W - 1] + 2 * f[p + W] + f[p + W + 1];
  if (Math.hypot(gx, gy) / 4 > 24) c++; } return c / ((W - 2) * (rows - 2)); }
const blank = Array.from({ length: G.n }, (_, i) => edgeFrac(frame(i)) < 0.002), edgeSkip = Math.round(0.5 * FPS);
let run = 0, runStart = 0, blankRuns = []; for (let i = edgeSkip; i < G.n - edgeSkip; i++) { if (blank[i] && !excl[i]) { if (!run) runStart = i; run++; } else { if (run) blankRuns.push({ from: runStart / FPS, seconds: run / FPS }); run = 0; } }
if (run) blankRuns.push({ from: runStart / FPS, seconds: run / FPS }); const longestBlank = blankRuns.reduce((m, r) => Math.max(m, r.seconds), 0);
// ---- blue-purple at 2 fps, 160 px RGB
const C = decode(2, 160, "rgb24", 3), cpx = C.w * C.h; let bpFrames = 0;
for (let i = 0; i < C.n; i++) { let c = 0; const f = C.buf.subarray(i * cpx * 3, (i + 1) * cpx * 3);
  for (let k = 0; k < cpx; k++) { const r = f[3 * k] / 255, g = f[3 * k + 1] / 255, b = f[3 * k + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
    if (mx < 0.12 || mx > 0.9 || !mx || dl / mx < 0.3) continue; let h = mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4; h = (h * 60 + 360) % 360; if (h >= 225 && h <= 300) c++; }
  if (c / cpx >= 0.3) bpFrames++; }
const bpShare = C.n ? bpFrames / C.n : 0, allowBP = opt("--allow-blue-purple");
// ---- verdicts
const gates = [];
const deadLevel = dead.seconds >= 4 ? "RED" : dead.seconds >= 2.5 ? "YELLOW" : "GREEN";
gates.push({ id: "dead-stretch", level: deadLevel, value: +dead.seconds.toFixed(2), detail: dead.seconds ? `nothing changes for ${dead.seconds.toFixed(2)} s from ${dead.from.toFixed(2)} s (yellow 2.5 s, red 4 s): add ambient motion (a slow push, a drift, a motif loop) or cut the hold` : "something changes throughout" });
gates.push({ id: "blank", level: longestBlank >= 0.3 ? "RED" : "GREEN", value: +longestBlank.toFixed(2), detail: blankRuns.length ? blankRuns.map(r => `blank ${r.seconds.toFixed(2)} s at ${r.from.toFixed(2)} s`).join("; ") : "no blank stretch mid-film" });
const bpLevel = bpShare >= 0.3 ? (allowBP ? "YELLOW" : "RED") : bpShare >= 0.12 ? "YELLOW" : "GREEN";
gates.push({ id: "blue-purple", level: bpLevel, value: +bpShare.toFixed(3), detail: `${(bpShare * 100).toFixed(0)}% of the film has a blue-purple dominated frame${allowBP ? ` (allowed: ${allowBP})` : ""}` });
const report = { file, seconds: +DUR.toFixed(2), size: `${SW}x${SH}`, gates, info: { fullFrameEnergy: +fastRatio.toFixed(4), aliveShare: +(aliveN / Math.max(1, G.n - 1)).toFixed(2), meanMotion: +meanMotion.toFixed(2), longestStillSeconds: +(longestStill / FPS).toFixed(2), cutsPerMinute: +(cut.filter(Boolean).length / (DUR / 60)).toFixed(1), quietestWindow: { from: worst.t, meanMotion: +(worst.v === Infinity ? 0 : worst.v).toFixed(2) } }, verdict: gates.some(g => g.level === "RED") ? "RED" : gates.some(g => g.level === "YELLOW") ? "YELLOW" : "GREEN", allowBluePurple: allowBP || null };
if (opt("--json")) writeFileSync(opt("--json"), JSON.stringify(report, null, 1));
console.log(`${file}  ${report.size}  ${report.seconds}s`); for (const g of gates) console.log(`${g.level.padEnd(6)} ${g.id.padEnd(12)} ${g.detail}`);
console.log(`info   alive ${(report.info.aliveShare*100).toFixed(0)}% of the time, full-frame energy ${(report.info.fullFrameEnergy*100).toFixed(1)}%, ${report.info.cutsPerMinute} cuts/min, quietest 5 s from ${report.info.quietestWindow.from}s\nverdict: ${report.verdict}${report.verdict === "RED" ? "  (do not deliver: fix and re-render)" : ""}`);
process.exit(report.verdict === "RED" ? 2 : 0);
