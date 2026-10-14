// Show, don't ask: the same headline in the four motion personalities, side by side, so the user picks how it MOVES by watching it.
//
//   node feel.mjs "<headline>" [--from <moodboard.json> --tile <n> | --look <look> [--bg --fg --accent "#hex"]] [--size 480x270] [--fps 24] [--secs 4] [--out preprod/feel]
//
// Writes <out>/feel.mp4 and feel.gif (2x2, labelled 1-4, looping), feel.png (a filmstrip: each feel's entrance frame by frame, for
// terminals that cannot play video) and feel.json (what each feel means in numbers). The pick becomes FEEL=<name> for the scaffold
// and the motion language in AD-BRIEF.md.
import { mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ffFont } from "../../motionmaker-build/scripts/platform.mjs";   // a real font file for drawtext (Windows ffmpeg has no default)

const HERE = path.dirname(fileURLToPath(import.meta.url)), SK = path.resolve(HERE, "../..");
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i > -1 && a[i + 1] !== undefined ? a[i + 1] : d; };
const text = a[0] && !a[0].startsWith("--") ? a[0] : null;
if (!text) { console.error('usage: feel.mjs "<headline>" [--look <look>] [--accent "#hex"] [--size 480x270] [--fps 24] [--secs 4] [--out preprod/feel]'); process.exit(1); }
// --from <moodboard.json> --tile <n>: the exact tile the user picked (its look AND its colours, e.g. an inverted round-2 variant)
const tileRecipe = opt("--from") && opt("--tile") ? JSON.parse(readFileSync(opt("--from"), "utf8")).tiles.find(t => t.n === +opt("--tile"))?.recipe : null;
if (opt("--from") && !tileRecipe) { console.error(`--from/--tile: no tile ${opt("--tile")} in ${opt("--from")}`); process.exit(1); }
if (tileRecipe && tileRecipe.template !== "title-loop") { console.error("that tile is an art style; feel samples use a look tile (the style keeps its own motion)"); process.exit(1); }
const [W, H] = opt("--size", "480x270").split("x").map(Number), fps = +opt("--fps", 24), secs = +opt("--secs", 4), look = tileRecipe?.look || opt("--look", "swiss-minimal");
const colours = [tileRecipe?.bg || opt("--bg", "-"), tileRecipe?.fg || opt("--fg", "-"), tileRecipe?.accent || opt("--accent", "-")];
const out = path.resolve(opt("--out", "preprod/feel")), work = path.join(out, "work");
export const FEELS = [
  { id: "calm", name: "Calm", says: "unhurried, confident, premium: long soft entrances, small moves", numbers: "entrance 0.8 s, stagger 0.10 s, ease-in-out, rise 3.5% of height, push 1%" },
  { id: "snappy", name: "Snappy", says: "quick and precise, product and tech: fast arrival, crisp stop", numbers: "entrance 0.3 s, stagger 0.03 s, expo-out, rise 6%, push 2%" },
  { id: "bouncy", name: "Bouncy", says: "playful and friendly: overshoots and settles like a spring", numbers: "entrance 0.6 s, stagger 0.06 s, spring (damping 0.42), rise 8%, push 2%" },
  { id: "dramatic", name: "Dramatic", says: "cinematic build: slow wind-up, big travel, a held beat", numbers: "entrance 1.2 s, stagger 0.12 s, strong ease-in-out, rise 8%, slow push 5%" },
];
rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
const run = (cmd, args, env = {}) => execFileSync(cmd, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
// a caption strip ABOVE the picture (never painted over it)
// (the strip height keeps the total even: H.264 needs even sizes)
const strip = size => size + 14 + ((H + size + 14) % 2);
const label = (t, size) => `pad=iw:ih+${strip(size)}:0:${strip(size)}:color=0x222222,drawtext=${ffFont()}text='${t.replace(/[':\\]/g, "")}':x=10:y=7:fontsize=${size}:fontcolor=white`;
const even = "scale=trunc(iw/2)*2:trunc(ih/2)*2";
for (const [i, f] of FEELS.entries()) {
  run("bash", [path.join(SK, "motionmaker/scripts/scaffold.sh"), f.id, text, String(W), String(H), String(fps), String(secs), ...colours, work], { FEEL: f.id, LOOK: look });
  run("node", [path.join(SK, "motionmaker-build/scripts/render.mjs"), path.join(work, f.id, "anim.html"), String(secs), String(fps), "--size", `${W}x${H}`, "--out", path.join(work, f.id, "frames")]);
  run("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(fps), "-i", path.join(work, f.id, "frames", "f%04d.png"), "-vf", `${label(`${i + 1}  ${f.name}`, Math.max(10, Math.round(H / 15)))},${even}`, "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "20", path.join(work, `${f.id}.mp4`)]);
}
const ins = FEELS.flatMap(f => ["-i", path.join(work, `${f.id}.mp4`)]);
run("ffmpeg", ["-loglevel", "error", "-y", ...ins, "-filter_complex", "[0][1][2][3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0:fill=white", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "20", "-movflags", "+faststart", path.join(out, "feel.mp4")]);
run("ffmpeg", ["-loglevel", "error", "-y", "-i", path.join(out, "feel.mp4"), "-vf", `fps=${Math.min(fps, 15)},scale=${Math.min(2 * W, 720)}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`, "-loop", "0", path.join(out, "feel.gif")]);
// filmstrip: 6 moments of each entrance (the part that differs most between feels), one row per feel
const at = [0, 0.15, 0.3, 0.5, 0.8, 1.4].map(s => Math.min(Math.round(s * fps), Math.round(fps * secs) - 1));
const rows = FEELS.map(f => { const tiles = at.map(n => ["-i", path.join(work, f.id, "frames", `f${String(n).padStart(4, "0")}.png`)]).flat(); const row = path.join(work, `${f.id}-row.png`);
  run("ffmpeg", ["-loglevel", "error", "-y", ...tiles, "-filter_complex", `${at.map((_, k) => `[${k}]scale=${Math.round(W / 2)}:-1,pad=iw+4:ih:2:0:white[t${k}]`).join(";")};${at.map((_, k) => `[t${k}]`).join("")}hstack=${at.length},${label(`${FEELS.indexOf(f) + 1}  ${f.name}: ${at.map(n => (n / fps).toFixed(2) + "s").join("  ")}`, Math.max(10, Math.round(H / 20)))}`, row]); return row; });
run("ffmpeg", ["-loglevel", "error", "-y", ...rows.flatMap(r => ["-i", r]), "-filter_complex", `${rows.map((_, k) => `[${k}]`).join("")}vstack=${rows.length}`, path.join(out, "feel.png")]);
writeFileSync(path.join(out, "feel.json"), JSON.stringify({ text, look, colours, size: `${W}x${H}`, fps, secs, feels: FEELS }, null, 1));
rmSync(work, { recursive: true, force: true });
console.log(`${out}/feel.mp4 (2x2, loops), feel.gif, feel.png (filmstrip), feel.json`);
FEELS.forEach((f, i) => console.log(`  ${i + 1} ${f.name.padEnd(9)} ${f.says}\n    ${f.numbers}`));
console.log("\nThe pick is FEEL=<name> for the scaffold (title template) and the motion language in AD-BRIEF.md (other templates take the same numbers).");
