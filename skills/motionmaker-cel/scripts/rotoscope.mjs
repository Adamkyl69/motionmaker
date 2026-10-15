// Rotoscope look: turn footage (the user's own, or a render) into traced animation - flat posterised colour areas, ink lines found from the
// picture's edges, drawings held on twos (12 per second) like hand rotoscoping. A filter, not an artist tracing by hand: it follows what is in
// the footage, so clean, well-lit footage with a clear subject works best. ffmpeg only; the same input gives the same output.
//
//   node rotoscope.mjs <in.mp4> --out <out.mp4> [--on 2] [--levels 5] [--ink 0.6] [--size 1080x1920] [--from 0 --to 8]
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i > -1 && a[i + 1] !== undefined ? a[i + 1] : d; };
const inp = a[0], out = opt("--out"); if (!inp || !out || !existsSync(inp)) { console.error("usage: rotoscope.mjs <in.mp4> --out <out.mp4> [--on 2] [--levels 5] [--ink 0.6] [--size WxH] [--from s --to s]"); process.exit(1); }
const pr = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", inp], { encoding: "utf8" });
const [n, d] = (pr.stdout.trim() || "24/1").split("/").map(Number), fps = Math.round(n / (d || 1)), on = +opt("--on", 2), levels = Math.max(2, +opt("--levels", 5)), ink = +opt("--ink", 0.85);
const step = Math.round(256 / levels), q = `floor(val/${step})*${step}+${Math.floor(step / 2)}`;
const size = opt("--size"), scale = size ? `scale=${size.replace("x", ":")}:force_original_aspect_ratio=increase,crop=${size.replace("x", ":")},` : "";
// colour: smooth inside areas (bilateral keeps edges), then quantise each channel to a few levels; ink: edges of a softened copy, thickened,
// inverted and multiplied over the colour; then hold each drawing for `on` frames
const fc = `[0:v]${scale}fps=${fps / on},split[c][e];` +
  `[c]bilateral=sigmaS=10:sigmaR=0.12,bilateral=sigmaS=10:sigmaR=0.12,median=radius=2,format=rgb24,lutrgb=r='${q}':g='${q}':b='${q}'[col];` +
  `[e]format=gray,smartblur=lr=2:ls=-0.5,edgedetect=low=0.06:high=0.18,dilation,negate,format=rgb24,lutrgb=r='255-(255-val)*${ink}':g='255-(255-val)*${ink}':b='255-(255-val)*${ink}'[l0];[l0]format=gbrp[ln];` +
  `[col]format=gbrp[c2];[c2][ln]blend=all_mode=multiply,fps=${fps},format=yuv420p[v]`;
mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const args = ["-loglevel", "error", "-y", ...(opt("--from") ? ["-ss", opt("--from")] : []), ...(opt("--to") ? ["-to", opt("--to")] : []), "-i", inp, "-filter_complex", fc, "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-crf", "18", "-c:a", "copy", out];
const r = spawnSync("ffmpeg", args, { encoding: "utf8" }); if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log(`${out}: rotoscope look, ${levels} colour levels per channel, ink ${ink}, drawings on ${on}s at ${fps} fps`);
