// Measure the finished audio: where does each hit's attack PEAK land relative to its picture frame?
// usage: node verify-sync.mjs <audio-or-mp4> <events.json> <fps> [--tol 0.6]
// Decodes with ffmpeg (so it checks the real file, codec padding included). Pass = each hit lands 1 frame (+/- tol frames) after its event frame.
// Percussive hits are judged by onset (50% rise point, what the ear syncs to). Swells (whoosh) are judged by arrival: where the
// energy plateau ends (last point >= 85% of max), because compression flattens a swell's peak into a plateau.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const a = process.argv.slice(2), [file, evFile, fps] = [a[0], a[1], +a[2]], ti = a.indexOf("--tol"), tol = ti > -1 ? +a[ti+1] : 0.6;
const SR = 48000, raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", "1", "-ar", String(SR), "-"], { maxBuffer: 1 << 28 });
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4), events = JSON.parse(readFileSync(evFile, "utf8"));
const win = Math.round(0.012*SR), env = new Float32Array(x.length);          // 12 ms RMS envelope
let acc = 0; for (let i = 0; i < x.length; i++) { acc += x[i]*x[i]; if (i >= win) acc -= x[i-win]*x[i-win]; env[i] = Math.sqrt(acc / win); }
let ok = true;
for (const e of events.filter(e => !e.music && e.frame !== undefined)) {   // music on the BPM grid is not a picture hit
  const t0 = e.frame/fps, lo = Math.round((t0 - 0.5/fps)*SR), hi = Math.min(x.length, Math.round((t0 + 4.5/fps)*SR));   // search: from half a frame before the picture to 4.5 frames after
  let best = lo, bv = -1; for (let i = Math.max(0, lo); i < hi; i++) if (env[i] > bv) { bv = env[i]; best = i; }
  const swell = e.type === "whoosh";
  // baseline = quietest point in the 3 frames before the search window (the bed, not a previous hit's tail); onset = 50% of the way from baseline to peak
  const lead = swell ? Math.round(0.3*SR) : 0;                                   // a swell ramps up for ~0.2 s before it peaks: take the baseline before the ramp starts
  let base = Infinity; for (let i = Math.max(0, lo - lead - Math.round(3/fps*SR)); i < Math.max(1, lo - lead); i += 24) base = Math.min(base, env[i]);
  if (!isFinite(base)) base = 0;
  const over = 20*Math.log10(bv/Math.max(base, 1e-6)), thr = base + 0.5*(bv - base);
  let on = best; while (on > Math.max(0, lo) && env[on] > thr) on--;
  let arr = best; while (arr < hi && env[arr] >= bv*0.85) arr++;                                            // end of the >=85% plateau
  const f = (i) => (i/SR)*fps - e.frame, got = swell ? f(arr) : f(on), pass = Math.abs(got - 1) <= (swell ? 0.75 : tol) && over >= 6;
  ok &&= pass; console.log(`${pass ? "PASS" : "FAIL"}  frame ${String(e.frame).padStart(3)} ${e.type.padEnd(6)} ${swell ? "arrival" : "onset  "} ${got.toFixed(2)} f (${(got*1000/fps).toFixed(0)} ms)   (target +1.00 f)   ${over.toFixed(1)} dB over bed${over < 6 ? "  <-- buried: raise hit gain or lower --bed" : ""}`);
}
process.exit(ok ? 0 : 1);
