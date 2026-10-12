// Put motion and sound on a musical grid. Beats are where the eye expects change; landing reveals and cuts on them makes a piece feel edited.
//
//   node beat.mjs grid  --bpm 120 --fps 30 --secs 8 [--per-bar 4]           beat and bar frames (exact and rounded), and a warning if beats fall between frames
//   node beat.mjs snap  --bpm 120 --fps 30 --frames 18,47,95 [--to beat|half|bar] [--phase 0]   nearest grid frame for each event frame
//   node beat.mjs start --bpm 120 --fps 30 --beat 5 --dur 14 --reveal 0.6   start frame so a move of `dur` frames hits its reveal point (60% through) ON beat 5
//   node beat.mjs music --bpm 120 --fps 30 --secs 8 [--key A] [--minor] [--feel pulse|arp|calm] [--hits events.json] [--lag-frames 1] --out music.json
//
// music: kick on beats, hats on off-beats (pulse), a 3-note motif over a 4-chord loop (I-V-vi-IV, or i-VI-III-VII in minor) re-voiced per bar,
// all on the grid; merges your picture hits (events.json from the brief) so one file goes to synth.mjs. The clip must be a whole number of bars to loop:
// it warns and suggests a BPM that fits. Speed up by shortening note values, not by raising the tempo (one tempo per piece).
import { readFileSync, writeFileSync } from "node:fs";
const argv = process.argv.slice(2), cmd = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const bpm = +opt("--bpm", 120), fps = +opt("--fps", 30), secs = +opt("--secs", 8), per = +opt("--per-bar", 4), phase = +opt("--phase", 0), spb = 60 / bpm, fpb = fps * spb;
const die = m => { console.error(m); process.exit(1); };
const goodBpms = () => { const out = []; for (let k = 6; k <= 40; k++) { const b = 60 * fps / k; if (b >= 70 && b <= 180) out.push(+b.toFixed(2)); } return out; };
if (cmd === "grid") {
  const beats = []; for (let t = phase / fps; t < secs - 1e-9; t += spb) beats.push(t * fps);
  console.log(`${bpm} BPM at ${fps} fps: ${fpb.toFixed(3)} frames per beat, ${(fpb * per).toFixed(2)} per bar of ${per}`);
  console.log(`beats (frame, exact): ${beats.map(f => Math.round(f) + (Math.abs(f - Math.round(f)) > 0.01 ? `(${f.toFixed(2)})` : "")).join(" ")}`);
  console.log(`bars start at: ${beats.filter((_, i) => i % per === 0).map(f => Math.round(f)).join(" ")}`);
  if (Math.abs(fpb - Math.round(fpb)) > 0.01) console.log(`note: beats fall between frames (rounded above). Whole-frame tempos at ${fps} fps: ${goodBpms().join(", ")}`);
  const bars = secs / (spb * per); if (Math.abs(bars - Math.round(bars)) > 0.01) console.log(`note: ${secs}s is ${bars.toFixed(2)} bars: a loop should be a whole number of bars (e.g. ${(Math.max(1, Math.round(bars)) * spb * per).toFixed(3)}s)`);
} else if (cmd === "snap") {
  const unit = { beat: fpb, half: fpb / 2, bar: fpb * per }[opt("--to", "beat")]; if (!unit) die("--to beat|half|bar");
  for (const f of (opt("--frames", "") || "").split(",").filter(Boolean).map(Number)) { const g = phase + Math.round((f - phase) / unit) * unit; console.log(`${f} -> ${Math.round(g)}${Math.abs(g - Math.round(g)) > 0.01 ? ` (exact ${g.toFixed(2)})` : ""}   (${Math.round(g) - f >= 0 ? "+" : ""}${Math.round(g) - f} f)`); }
} else if (cmd === "start") {
  const beat = +opt("--beat"), dur = +opt("--dur"), rp = +opt("--reveal", 0.5); if (!(beat >= 0) || !(dur > 0)) die("start needs --beat N --dur frames [--reveal 0..1]");
  const hit = phase + beat * fpb, start = hit - rp * dur; console.log(`beat ${beat} is frame ${hit.toFixed(2)}; start the ${dur}-frame move at frame ${Math.round(start)} so its reveal point (${Math.round(rp * 100)}%) lands on the beat`);
} else if (cmd === "music") {
  const out = opt("--out"); if (!out) die("--out music.json");
  const KEYS = { C: 60, "C#": 61, D: 62, "D#": 63, E: 64, F: 65, "F#": 66, G: 67, "G#": 68, A: 57, "A#": 58, B: 59 }, root = KEYS[opt("--key", "A")] ?? 57, minor = argv.includes("--minor"), feel = opt("--feel", "pulse");
  const scale = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11], prog = minor ? [0, 5, 2, 6] : [0, 4, 5, 3];   // scale degrees of the chord roots
  const chord = deg => [0, 2, 4].map(k => { const d = deg + k; return root + scale[d % 7] + 12 * Math.floor(d / 7); });
  const bars = secs / (spb * per); if (Math.abs(bars - Math.round(bars)) > 0.01) console.error(`WARNING: ${secs}s is ${bars.toFixed(2)} bars at ${bpm} BPM: the music will not loop cleanly. Try --bpm ${(Math.round(bars) * per * 60 / secs).toFixed(2)} or a length of ${(Math.max(1, Math.round(bars)) * spb * per).toFixed(3)}s.`);
  // music follows the same rule as picture hits: the picture changes ON the beat frame, the sound lands one frame later (light before sound)
  const lag = +opt("--lag-frames", 1) / fps, ev = [], motif = [0, 1, 2, 1];   // 3-note motif (chord tones), the 4th step returns: same shape every bar, new chord underneath
  for (let b = 0; b * spb < secs - 1e-9; b++) { const t = b * spb + lag, bar = Math.floor(b / per), ch = chord(prog[bar % 4]), inBar = b % per;
    if (feel !== "calm") ev.push({ time: +t.toFixed(4), type: "kick", gain: inBar === 0 ? 0.85 : 0.55, music: true });
    if (feel === "pulse") ev.push({ time: +(t + spb / 2).toFixed(4), type: "hat", gain: 0.5, music: true });
    if (inBar === 0) ch.forEach(m => ev.push({ time: +t.toFixed(4), type: "note", midi: m - 12, dur: spb * per * 0.95, gain: 0.22, music: true }));   // chord pad, one octave down
    const steps = feel === "arp" ? 2 : 1; for (let s = 0; s < steps; s++) ev.push({ time: +(t + s * spb / steps).toFixed(4), type: "note", midi: ch[motif[(inBar * steps + s) % 4]] + 12, dur: spb / steps * 0.9, gain: 0.35, music: true }); }
  const hits = opt("--hits") ? JSON.parse(readFileSync(opt("--hits"), "utf8")) : [];
  // duck: music notes and drums that sound from 2 frames before to 0.5 s after a picture hit play at 30% (sustained notes at 25%), so every hit stays >= 6 dB above the music
  for (const h of hits) { const th = (h.frame + 1) / fps; for (const e of ev) if (e.time > th - 2 / fps && e.time < th + 0.5) e.gain = +(e.gain * 0.3).toFixed(3); for (const e of ev) if (e.type === "note" && e.time <= th && e.time + (e.dur || 0) > th) e.gain = +(e.gain * 0.25).toFixed(3); }
  const all = [...ev.filter(e => e.time < secs), ...hits];
  writeFileSync(out, JSON.stringify(all, null, 1)); console.log(`${out}: ${ev.length} music events (${feel}, ${opt("--key", "A")} ${minor ? "minor" : "major"}, ${bpm} BPM, ${bars.toFixed(2)} bars) + ${hits.length} picture hits. Next: node synth.mjs ${out} ${secs} ${fps} out.wav --bed 0`);
} else die("commands: grid | snap | start | music");
