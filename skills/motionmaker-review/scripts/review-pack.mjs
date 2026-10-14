// Prepare an INDEPENDENT review: material made only from the finished film, plus a brief for a reviewer who took no part in making it.
//
//   node review-pack.mjs <film.mp4> --dir <project> [--intent "one-sentence message"] [--platform "X feed, muted"]
//
// Writes <project>/review/pack-<sha8>/: contact sheet(s) with timecodes, key frames (evenly spaced + just after each cut), the film-gate report,
// the probe facts, INTENT.md (what the film is meant to say: read AFTER the first impression) and BRIEF.md (the reviewer's instructions).
// Then spawn a fresh subagent with: "Read <pack>/BRIEF.md and follow it." It writes <project>/review/<NN>-review.md. Do not give it the source,
// the prompt or the brief: the point is a viewer's eyes. Idea from huashu-art-motion's 审片 step (MIT); independent implementation.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ffFont } from "../../motionmaker-build/scripts/platform.mjs";   // a real font file for drawtext (Windows ffmpeg has no default)

const HERE = path.dirname(fileURLToPath(import.meta.url)), argv = process.argv.slice(2), film = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
if (!film || !existsSync(film)) { console.error('usage: review-pack.mjs <film.mp4> --dir <project> [--intent "..."] [--platform "..."]'); process.exit(1); }
const dir = path.resolve(opt("--dir", path.dirname(film))), sha = createHash("sha256").update(readFileSync(film)).digest("hex"), s8 = sha.slice(0, 8);
const pack = path.join(dir, "review", `pack-${s8}`); mkdirSync(pack, { recursive: true });
const run = (c, a) => { const r = spawnSync(c, a, { encoding: "utf8", maxBuffer: 1e8 }); if (r.status !== 0 && c !== "node") { console.error(`${c} failed: ${(r.stderr || "").slice(0, 300)}`); process.exit(1); } return r; };
const pr = JSON.parse(run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", film]).stdout);
const v = pr.streams.find(s => s.codec_type === "video"), dur = +pr.format.duration, [fa, fb] = v.r_frame_rate.split("/").map(Number), fps = fa / (fb || 1), audio = pr.streams.some(s => s.codec_type === "audio");
// gate report (also gives us the cut times)
const gj = path.join(pack, "film-gate.json"); run("node", [path.join(HERE, "film-gate.mjs"), film, "--json", gj]); const gate = JSON.parse(readFileSync(gj, "utf8"));
// contact sheets: 2 per second up to 40 s, then 1 per second; 6 columns, 4 rows per sheet, timecode on each tile
const every = dur <= 40 ? 0.5 : 1, tiles = Math.ceil(dur / every), perSheet = 24, sheets = Math.ceil(tiles / perSheet), tw = 320;
for (let s = 0; s < sheets; s++) {
  const t0 = s * perSheet * every, t1 = Math.min(dur, (s + 1) * perSheet * every);
  run("ffmpeg", ["-v", "error", "-y", "-ss", String(t0), "-t", String(t1 - t0), "-i", film, "-vf", `fps=${1 / every},scale=${tw}:-2,pad=iw:ih+24:0:24:color=0x222222,drawtext=${ffFont()}text='%{pts\\:hms\\:${t0}}':x=6:y=4:fontsize=16:fontcolor=white,tile=6x4:padding=4:color=0x222222`, "-frames:v", "1", path.join(pack, `sheet-${String(s + 1).padStart(2, "0")}.png`)]);
}
// key frames: 8 evenly spaced + just after every detected cut (max 12)
const times = new Set(Array.from({ length: 8 }, (_, i) => +((i + 0.5) * dur / 8).toFixed(2)));
const kf = path.join(pack, "frames"); mkdirSync(kf, { recursive: true });
for (const t of [...times].sort((a, b) => a - b)) run("ffmpeg", ["-v", "error", "-y", "-ss", String(t), "-i", film, "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", path.join(kf, `t${t.toFixed(2).padStart(6, "0")}s.png`)]);
const prev = existsSync(path.join(dir, "review")) ? readdirSync(path.join(dir, "review")).filter(f => /^\d+-review\.md$/.test(f)).sort() : [], next = String(prev.length + 1).padStart(2, "0");
writeFileSync(path.join(pack, "INTENT.md"), `# What the film is meant to do (read only AFTER writing your first impression)\n\n- Message: ${opt("--intent", "(not given)")}\n- Where it will be seen: ${opt("--platform", "(not given)")}\n`);
writeFileSync(path.join(pack, "BRIEF.md"), `# Independent review brief

You are a fresh reviewer. You did not make this film and you must not look at how it was made: no source code, no prompt, no brief, no chat history.
You may look at: the film itself (\`${path.resolve(film)}\`, sha256 ${sha}), and the files in this folder (contact sheets with timecodes, key frames,
film-gate.json, probe facts). You may extract more frames with ffmpeg at any timecode (\`ffmpeg -ss <t> -i <film> -frames:v 1 out.png\`), e.g. 3 frames
around a moment that looks wrong. Look at every image you cite with your own eyes.

Facts: ${v.width}x${v.height}, ${fps.toFixed(2)} fps, ${dur.toFixed(2)} s, audio: ${audio ? "yes (you cannot hear it: judge picture only)" : "none"}. Film gate: ${gate.verdict} (${gate.gates.map(g => g.id + " " + g.level).join(", ")}).

## Steps
1. **First impression** (before INTENT.md): in one sentence, what does this film say? Would you stop scrolling for it, and why or why not?
2. Read INTENT.md. Does the film deliver that message? If your sentence and the intent differ, that is the most important finding.
3. Go through the sheets in order. Look for: text that is cut off, overlaps, touches the edge or is too small for a phone; anything readable for less
   than about 1 s; stretches where nothing happens (or too much at once); jumps, flashes, blank or broken frames; a hero that is not the focal point;
   colours or type that look inconsistent; anything that looks like a generic template or "AI default"; wrong words, numbers, units or spelling.
4. Write \`${path.join(dir, "review", next + "-review.md")}\` in this format:

\`\`\`
Film: ${sha.slice(0, 12)}
Reviewer: independent (round ${next})
First impression: <one sentence>  |  Stop scrolling: yes/no, because ...
Intent delivered: yes / partly / no, because ...

| # | Timecode | What I see | Why it matters | Suggested change | Severity |
|---|---|---|---|---|---|
| 1 | 00:02.5 | ... | ... | ... | blocker / major / minor |

${prev.length ? "Regressions (problems from earlier reviews that are back): ...\nStill open from earlier reviews: ...\n" : ""}Verdict: SHIP  or  FIX (any blocker = FIX)
\`\`\`
Be specific (timecodes, what exactly), at most 10 findings, most serious first. Praise nothing; the makers only need problems. Do not fix anything yourself.
${prev.length ? `Earlier reviews: ${prev.join(", ")} (read them after step 2 to report regressions and still-open items).\n` : ""}`);
writeFileSync(path.join(pack, "probe.json"), JSON.stringify({ film: path.resolve(film), sha256: sha, width: v.width, height: v.height, fps, seconds: dur, audio }, null, 1));
console.log(`${pack}\nsheets: ${sheets}, key frames: ${times.size}, film gate: ${gate.verdict}\nNext: spawn a fresh subagent (no prior context) with the prompt:  Read ${path.join(pack, "BRIEF.md")} and follow it exactly.\nIt must write ${path.join(dir, "review", next + "-review.md")}.`);
