// Find the beat a reference video is cut to: detect the cuts, then fit a regular grid to them and report the BPM.
//
//   node beat-grid.mjs <video> [--json out.json]
//
// Cuts: mean change between consecutive frames (192x108 grey) above max(8, 3x the median + 2), at least 0.3 s apart. Grid: the step (and phase) that
// puts the most cuts within 1.5 frames of a grid line, tried for 60-200 BPM; reported as quarter notes, with the eighth-note reading too, because editors
// often cut on eighths. A good fit has >= 80% of cuts on the grid. Idea from huashu-art-motion's breakdown.py (MIT); independent implementation.
import { spawnSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
const argv = process.argv.slice(2), file = argv[0], jo = argv.includes("--json") ? argv[argv.indexOf("--json") + 1] : null;
if (!file || !existsSync(file)) { console.error("usage: beat-grid.mjs <video> [--json out.json]"); process.exit(1); }
const pr = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate:format=duration", "-of", "json", file], { encoding: "utf8" }).stdout);
const [a, b] = pr.streams[0].avg_frame_rate.split("/").map(Number), fps = a / (b || 1), W = 192, H = 108, px = W * H;
const raw = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 2e9 }).stdout, n = raw.length / px;
const d = [0]; for (let i = 1; i < n; i++) { let s = 0; for (let k = 0; k < px; k++) s += Math.abs(raw[i * px + k] - raw[(i - 1) * px + k]); d.push(s / px); }
const med = d.slice(1).sort((x, y) => x - y)[Math.floor((n - 1) / 2)] || 0, thr = Math.max(8, 3 * med + 2), cuts = [];
for (let i = 1; i < n; i++) if (d[i] >= thr && (!cuts.length || i - cuts[cuts.length - 1] >= Math.round(0.3 * fps))) cuts.push(i);
const out = { file, fps: +fps.toFixed(3), frames: n, cuts, cutTimes: cuts.map(c => +(c / fps).toFixed(3)) };
if (cuts.length < 4) { out.note = "fewer than 4 cuts: no beat grid can be fitted (the motion may be continuous; count beats by ear or from the music)"; console.log(JSON.stringify(out, null, 1)); if (jo) writeFileSync(jo, JSON.stringify(out, null, 1)); process.exit(0); }
// fit: step in frames for 60..200 BPM quarter notes, and phase; score = share of cuts within 1.5 frames of t0 + k*step
function fit(tol) { let best = { score: -1 };
for (let bpm = 60; bpm <= 200; bpm += 0.25) { const step = fps * 60 / bpm;
  for (let ph = 0; ph < step; ph += 0.25) { let hit = 0, err = 0; for (const c of cuts) { const r = ((c - ph) % step + step) % step, e = Math.min(r, step - r); if (e <= tol) { hit++; err += e; } }
    const score = hit / cuts.length, mean = hit ? err / hit : 9;   // same share on the grid: the tighter fit (smaller mean error) wins
    if (score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && mean < best.err - 1e-9)) best = { score, bpm, step, phase: ph, err: mean, tol }; } }
return best; }
// tight tolerance first (cuts are rounded to whole frames: 0.75 covers that); fall back to 1.5 frames for loosely edited references
let best = fit(0.75); if (best.score < 0.8) { const loose = fit(1.5); if (loose.score > best.score) best = loose; }
// prefer the slowest tempo that explains the cuts equally well (a grid of 240 always fits a grid of 120 too)
for (const div of [2, 3, 4]) { const bpm = best.bpm / div; if (bpm < 60) break; const step = fps * 60 / bpm; let hit = 0;
  for (const c of cuts) { const r = ((c - best.phase) % step + step) % step; if (Math.min(r, step - r) <= best.tol) hit++; } if (hit / cuts.length >= best.score - 0.02) best = { ...best, bpm, step, score: hit / cuts.length }; }
out.meanErrorFrames = +best.err.toFixed(2);
const gaps = cuts.slice(1).map((c, i) => c - cuts[i]), beatsPerCut = gaps.map(g => +(g / best.step).toFixed(2));
Object.assign(out, { bpm: +best.bpm.toFixed(2), eighthReading: +(best.bpm * 2).toFixed(2), framesPerBeat: +best.step.toFixed(3), firstBeatFrame: +best.phase.toFixed(2), onGrid: +best.score.toFixed(2), beatsPerCut,
  verdict: best.score >= 0.8 ? "cut to a beat grid" : best.score >= 0.6 ? "loosely on a grid (some cuts off-beat)" : "not cut to a regular beat" });
if (jo) writeFileSync(jo, JSON.stringify(out, null, 1));
console.log(`${file}: ${cuts.length} cuts at ${out.fps} fps\nBPM ${out.bpm} (or ${out.eighthReading} counted in eighths), ${out.framesPerBeat} frames per beat, first beat at frame ${out.firstBeatFrame}\n${Math.round(best.score * 100)}% of cuts on the grid: ${out.verdict}\nbeats per cut: ${beatsPerCut.join(" ")}\ncut times: ${out.cutTimes.join(" ")}`);
