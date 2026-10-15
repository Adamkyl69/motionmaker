// The rotoscope look on one still (for previews: the style wheel, a storyboard panel): the same filter as rotoscope.mjs, one frame.
//   node rotoscope-still.mjs <in.png> <out.png> [--levels 5] [--ink 0.85]
import { spawnSync } from "node:child_process";
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; }, [inp, out] = a;
if (!inp || !out) { console.error("usage: rotoscope-still.mjs <in.png> <out.png>"); process.exit(1); }
const levels = +opt("--levels", 5), ink = +opt("--ink", 0.85), step = Math.round(256 / levels), q = `floor(val/${step})*${step}+${Math.floor(step / 2)}`;
const fc = `[0:v]split[c][e];[c]bilateral=sigmaS=10:sigmaR=0.12,bilateral=sigmaS=10:sigmaR=0.12,median=radius=2,format=rgb24,lutrgb=r='${q}':g='${q}':b='${q}',format=gbrp[c2];` +
  `[e]format=gray,smartblur=lr=2:ls=-0.5,edgedetect=low=0.06:high=0.18,dilation,negate,format=rgb24,lutrgb=r='255-(255-val)*${ink}':g='255-(255-val)*${ink}':b='255-(255-val)*${ink}',format=gbrp[ln];[c2][ln]blend=all_mode=multiply[v]`;
const r = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-i", inp, "-filter_complex", fc, "-map", "[v]", "-frames:v", "1", out], { encoding: "utf8" }); if (r.status) { console.error(r.stderr); process.exit(1); }
