// Use real footage (a screen recording, a product clip) frame-exactly. Browsers cannot seek a <video> to an exact frame reliably, so we extract
// the frames once with ffmpeg and the scene shows frame image k on composition frame f. No guessing, no drift.
//
//   node footage.mjs probe <video>
//   node footage.mjs extract <video> --dir <project> [--fps 30] [--from 2.5] [--to 9] [--width 1600] [--quality 3]
//
// Writes <project>/footage/f00001.jpg ... and footage/footage.json {frames, fps, width, height, source, from, to}. --fps should equal the
// composition fps (then footage frame k = composition frame k). --width caps the size (keep 1.5x the on-screen size if the camera zooms in).
// Record the source in the ledger (usually USER-OWNED: the user's own recording). Screen recordings can show private data: ask before using one.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2), [cmd, video] = argv, opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
if (!cmd || !video) die("usage: footage.mjs probe <video> | extract <video> --dir <project> [--fps 30] [--from s] [--to s] [--width px] [--quality 2-8]");
if (!existsSync(video)) die(`not found: ${video}`);
function probe() {
  const j = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,codec_name:format=duration", "-of", "json", video], { encoding: "utf8" }));
  const s = j.streams[0]; if (!s) die("no video stream"); const [a, b] = s.avg_frame_rate.split("/").map(Number);
  return { width: s.width, height: s.height, fps: b ? +(a / b).toFixed(3) : null, duration: +(+j.format.duration).toFixed(3), codec: s.codec_name, variableFrameRate: s.avg_frame_rate !== s.r_frame_rate };
}
const P = probe();
if (cmd === "probe") { console.log(JSON.stringify(P, null, 1)); if (P.variableFrameRate) console.log("note: variable frame rate (common for screen recordings): extraction resamples it to a constant --fps"); }
else if (cmd === "extract") {
  const dir = opt("--dir"); if (!dir) die("--dir <project> is required");
  const fps = +opt("--fps", 30), from = +opt("--from", 0), to = +opt("--to", P.duration), width = Math.min(+opt("--width", 1600), P.width), q = opt("--quality", "3");
  if (!(to > from)) die(`--to (${to}) must be after --from (${from})`);
  const out = path.join(dir, "footage"); mkdirSync(out, { recursive: true });
  for (const f of readdirSync(out)) if (/^f\d{5}\.jpg$/.test(f)) die(`${out} already has frames: use a new --dir or clear footage/ first`);
  // -ss before -i with re-encoding is frame-accurate in current ffmpeg; fps filter resamples variable-rate recordings to a constant rate.
  execFileSync("ffmpeg", ["-loglevel", "error", "-ss", String(from), "-t", String(to - from), "-i", video, "-vf", `fps=${fps},scale=${width}:-2:flags=lanczos`, "-q:v", q, "-start_number", "1", path.join(out, "f%05d.jpg")], { stdio: "inherit" });
  const frames = readdirSync(out).filter(f => /^f\d{5}\.jpg$/.test(f)).length; if (!frames) die("no frames extracted");
  const h = Math.round(width * P.height / P.width / 2) * 2;
  const meta = { frames, fps, width, height: h, seconds: +(frames / fps).toFixed(3), source: path.basename(video), from, to, extractedWith: "ffmpeg fps+scale(lanczos), jpeg q=" + q };
  writeFileSync(path.join(out, "footage.json"), JSON.stringify(meta, null, 1)); console.log(JSON.stringify(meta));
} else die("commands: probe | extract");
