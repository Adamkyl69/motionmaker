// Seconds <-> frames, global <-> scene-local, and reading-hold sanity checks for a frame-locked brief.
// usage: node timeline.mjs <timeline.json>
// timeline.json: { "fps":30, "total":600,
//   "events":[{"name":"press","t":6.5}, {"name":"result","frame":210}],           // give t (seconds) OR frame (global, inclusive)
//   "scenes":[{"name":"product","start":120,"end":419}],                            // optional: also prints scene-local frames
//   "holds":[{"name":"result readable","from":234,"to":419,"words":2}] }           // optional: reading-hold check
// Rules printed: frames = round(seconds*fps); 0.3 s per word + 0.5 s minimum hold; scene-local = global - scene.start.
import { readFileSync } from "node:fs";
const tl = JSON.parse(readFileSync(process.argv[2], "utf8")), fps = tl.fps, ms = f => (f*1000/fps).toFixed(0);
let bad = 0; const warn = m => { console.log("WARN  " + m); bad++; };
console.log(`fps ${fps}, ${tl.total} frames = ${(tl.total/fps).toFixed(2)} s (global frames 0..${tl.total - 1}, inclusive)\n`);
const ev = (tl.events || []).map(e => ({ ...e, frame: e.frame ?? Math.round(e.t*fps) })).sort((a, b) => a.frame - b.frame);
for (const e of ev) {
  const sc = (tl.scenes || []).find(s => e.frame >= s.start && e.frame <= s.end);
  console.log(`${String(e.frame).padStart(4)} f  ${(e.frame/fps).toFixed(2).padStart(6)} s  ${e.name}${sc ? `   [${sc.name} local f${e.frame - sc.start}]` : ""}`);
  if (e.frame < 0 || e.frame > tl.total - 1) warn(`${e.name} at frame ${e.frame} is outside 0..${tl.total - 1}`);
}
for (const h of tl.holds || []) {
  const len = h.to - h.from + 1, need = Math.ceil((0.3*(h.words || 0) + 0.5)*fps);
  console.log(`\nhold "${h.name}": frames ${h.from}-${h.to} = ${len} f = ${(len/fps).toFixed(2)} s (${ms(len)} ms); needs >= ${need} f for ${h.words || 0} words`);
  if (h.words && len < need) warn(`hold "${h.name}" is ${len} f but ${need} f are needed to read ${h.words} word(s)`);
}
if (tl.scenes) for (const s of tl.scenes) console.log(`\nscene ${s.name}: global ${s.start}-${s.end} (${s.end - s.start + 1} f); local f0 = global ${s.start}; local f30 = global ${s.start + 30}`);
process.exit(bad ? 1 : 0);
