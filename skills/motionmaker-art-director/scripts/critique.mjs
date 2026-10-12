// Measure the things an art director checks in the first three seconds of looking at a frame. Heuristics on pixels: it cannot judge taste,
// concept or brand fit; it catches the craft failures that are measurable. Read the PNGs yourself too.
//
//   node critique.mjs <still.png> [more.png ...] [--margin 5] [--json] [--fail]
//
// Per still: background colour, negative space (how much of the frame is empty), content margins vs the safe margin, where the visual
// weight sits (centre / rule-of-thirds / off), left-right balance, hierarchy (one dominant element or competing ones), and contrast of
// the dominant ink against the background (WCAG). Over several stills: the luminance arc (does the piece breathe or flatline / flash).
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2), files = argv.filter((a, i) => !a.startsWith("--") && !(argv[i - 1] || "").match(/^--margin$/));
const opt = (k, d) => { const i = argv.indexOf(k); return i > -1 ? +argv[i + 1] : d; };
if (!files.length) { console.error("usage: critique.mjs <still.png> [...] [--margin 5] [--json] [--fail]"); process.exit(1); }
const SAFE = opt("--margin", 5) / 100, W = 320;

const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = ([r, g, b]) => "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

function load(file) {
  const dim = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", file], { encoding: "utf8" }).trim().split("x").map(Number);
  const H = Math.max(2, Math.round(W * dim[1] / dim[0]));
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `scale=${W}:${H}:flags=area`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 26 });
  return { raw, H, srcW: dim[0], srcH: dim[1] };
}

function analyze(file) {
  const { raw, H, srcW, srcH } = load(file), N = W * H, px = i => [raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]];
  // background = most common colour on the outer ring (quantised), averaged
  const ring = new Map(); const bump = (x, y) => { const c = px(y * W + x), k = c.map(v => v >> 4).join(","); const e = ring.get(k) || { n: 0, s: [0, 0, 0] }; e.n++; e.s = e.s.map((v, j) => v + c[j]); ring.set(k, e); };
  for (let x = 0; x < W; x++) { bump(x, 0); bump(x, 1); bump(x, H - 1); bump(x, H - 2); } for (let y = 0; y < H; y++) { bump(0, y); bump(1, y); bump(W - 1, y); bump(W - 2, y); }
  const top = [...ring.values()].sort((a, b) => b.n - a.n)[0], bg = top.s.map(v => v / top.n);
  const dist = i => { const c = px(i); return Math.hypot(c[0] - bg[0], c[1] - bg[1], c[2] - bg[2]); };
  const ink = new Uint8Array(N); let inkN = 0, sx = 0, sy = 0, sw = 0, minx = W, maxx = -1, miny = H, maxy = -1, left = 0, right = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, d = dist(i); if (d > 48) { ink[i] = 1; inkN++; const w = Math.min(d, 255); sx += x * w; sy += y * w; sw += w; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; x < W / 2 ? left += w : right += w; } }
  const res = { file, size: `${srcW}x${srcH}`, bg: hex(bg), notes: [], warn: 0 };
  const note = (level, msg) => { res.notes.push(`${level} ${msg}`); if (level === "WARN") res.warn++; };
  res.inkCoverage = inkN / N; res.negativeSpace = 1 - res.inkCoverage;
  if (inkN === 0) {
    let faint = 0, fc = [0, 0, 0]; for (let i = 0; i < N; i++) if (dist(i) > 10) { faint++; const c = px(i); fc = fc.map((v, j) => v + c[j]); }
    if (faint > N * 0.002) { const c = fc.map(v => v / faint); note("WARN", `content is too faint to read: ${hex(c)} on ${hex(bg)} is only ${contrast(c, bg).toFixed(2)}:1 (text needs 4.5:1, large shapes 3:1)`); }
    else note("WARN", "empty frame: nothing differs from the background");
    return res;
  }
  if (res.inkCoverage > 0.45) note("WARN", `busy: ${(res.inkCoverage * 100).toFixed(0)}% of the frame is content; leave more air (aim for under ~40%)`);
  else if (res.inkCoverage < 0.015) note("WARN", `very sparse: ${(res.inkCoverage * 100).toFixed(1)}% content; the hero may be too small to read on a phone`);
  else note("OK", `negative space ${(res.negativeSpace * 100).toFixed(0)}%`);
  // margins
  const m = { left: minx / W, right: (W - 1 - maxx) / W, top: miny / H, bottom: (H - 1 - maxy) / H }; res.margins = m;
  const tight = Object.entries(m).filter(([, v]) => v < SAFE).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`);
  if (tight.length) note("WARN", `content inside the ${(SAFE * 100).toFixed(0)}% safe margin: ${tight.join(", ")} (it will be cropped or feel cramped on some platforms)`);
  else note("OK", `margins clear (smallest ${(Math.min(...Object.values(m)) * 100).toFixed(1)}%, safe margin ${(SAFE * 100).toFixed(0)}%)`);
  // visual weight: centre / thirds / off
  const cx = sx / sw / W, cy = sy / sw / H; res.centroid = [cx, cy];
  const thirds = [[1 / 3, 1 / 3], [2 / 3, 1 / 3], [1 / 3, 2 / 3], [2 / 3, 2 / 3]], dC = Math.hypot(cx - 0.5, cy - 0.5), dT = Math.min(...thirds.map(([tx, ty]) => Math.hypot(cx - tx, cy - ty)));
  res.composition = dC < 0.05 ? "centred" : dT < 0.1 ? "thirds" : "off-grid";
  note("INFO", `visual weight at (${(cx * 100).toFixed(0)}%, ${(cy * 100).toFixed(0)}%): ${res.composition}${res.composition === "off-grid" ? " (neither centred nor on a third: make it deliberate)" : ""}`);
  const bal = Math.min(left, right) / Math.max(left, right); res.balance = bal;
  if (bal < 0.25 && dC > 0.15) note("INFO", `weight sits mostly ${left > right ? "left" : "right"} (${(bal * 100).toFixed(0)}% balance): fine for an asymmetric layout if the other side is deliberate negative space`);
  // hierarchy: merge things that read as one unit (dilate), then compare the two biggest
  const dil = new Uint8Array(N), RX = 14, RY = 6; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ink[y * W + x]) for (let dy = -RY; dy <= RY; dy++) for (let dx = -RX; dx <= RX; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && xx < W && yy >= 0 && yy < H) dil[yy * W + xx] = 1; }
  const seen = new Uint8Array(N), areas = [], stack = [];
  for (let s0 = 0; s0 < N; s0++) { if (!dil[s0] || seen[s0]) continue; let a = 0; stack.push(s0); seen[s0] = 1; while (stack.length) { const i = stack.pop(); a++; const x = i % W, y = (i / W) | 0; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && dil[j] && !seen[j]) { seen[j] = 1; stack.push(j); } } areas.push(a); }
  areas.sort((p, q) => q - p); const big = areas.filter(a => a > N * 0.001); res.groups = big.length;
  if (big.length >= 2) { const r = big[0] / big[1]; res.heroRatio = r; if (r < 1.3) note("WARN", `competing focal points: the two biggest elements are within ${r.toFixed(2)}x of each other; make one clearly dominant (aim for 2x+)`); else note("OK", `clear hero: largest element is ${r.toFixed(1)}x the next`); }
  else note("OK", big.length === 1 ? "one dominant element" : "no distinct groups");
  if (big.length > 6) note("WARN", `${big.length} separate elements: reduce to what the viewer needs in 3 seconds`);
  // contrast of the dominant ink colours vs bg
  const inkc = new Map(); for (let i = 0; i < N; i++) if (ink[i] && dist(i) > 90) { const c = px(i), k = c.map(v => v >> 4).join(","); const e = inkc.get(k) || { n: 0, s: [0, 0, 0] }; e.n++; e.s = e.s.map((v, j) => v + c[j]); inkc.set(k, e); }
  // Anti-aliased edges of thin shapes and small type are blends of the background and a real colour; they are not colours the design uses.
  // Drop any candidate that lies on the line between the background and a bigger candidate.
  const cand = [...inkc.values()].sort((a, b) => b.n - a.n).map(e => ({ c: e.s.map(v => v / e.n), n: e.n }));
  const isBlend = (x, others) => others.some(o => { const u = o.c.map((v, j) => v - bg[j]), w = x.c.map((v, j) => v - bg[j]), uu = u[0] ** 2 + u[1] ** 2 + u[2] ** 2; if (!uu) return false;
    const t = (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / uu, r = Math.hypot(w[0] - t * u[0], w[1] - t * u[1], w[2] - t * u[2]); return t > 0.12 && t < 0.92 && r < 28; });
  const cols = cand.filter((x, i) => !isBlend(x, cand.filter((o, j) => j !== i && o.n >= x.n * 0.5))).slice(0, 3);
  res.ink = cols.map(({ c }) => ({ color: hex(c), contrast: contrast(c, bg) }));
  if (!cols.length) note("WARN", "no strongly contrasting content: everything is close to the background colour");
  else for (const { c, n } of cols) { const k = contrast(c, bg); if (n > inkN * 0.04) note(k < 3 ? "WARN" : k < 4.5 ? "INFO" : "OK", `${hex(c)} on ${hex(bg)}: ${k.toFixed(2)}:1${k < 3 ? " (too faint to read)" : k < 4.5 ? " (large text and shapes only)" : ""}`); }
  res.luminance = lum(bg);
  return res;
}

const results = files.map(f => { try { return analyze(f); } catch (e) { return { file: f, notes: [`WARN could not analyze: ${String(e.message).split("\n")[0]}`], warn: 1 }; } });
if (argv.includes("--json")) console.log(JSON.stringify(results, null, 1));
else {
  for (const r of results) { console.log(`\n${r.file}  (${r.size || "?"}, background ${r.bg || "?"})`); r.notes.forEach(n => console.log("  " + n)); }
  if (results.length > 1) {
    const L = results.map(r => r.luminance).filter(v => v !== undefined), flips = L.slice(1).filter((v, i) => Math.abs(v - L[i]) > 0.5).length;
    console.log(`\nAcross ${results.length} stills: ${results.filter(r => r.warn).length} with warnings; ${flips ? `background luminance jumps ${flips} time(s) (hard flash cuts: keep under 3 per second)` : "background stays consistent"}.`);
  }
  console.log(`\nThis measures craft, not taste. An art director still asks: is the idea clear in 3 seconds, does it feel like the brand, and is there anything that doesn't need to be there?`);
}
if (argv.includes("--fail") && results.some(r => r.warn)) process.exit(1);
