// Pre-production for a piece with scenes: lock the words, see every scene, feel the timing, before anything is built.
//
//   node storyboard.mjs script    <STORYBOARD.json>                 SCRIPT.md: scene, time, on-screen words; reading-time check (exit 1 on a fail)
//   node storyboard.mjs frames    <STORYBOARD.json> [--out dir]     a real key frame of every scene + storyboard.png / .html / STORYBOARD.md
//   node storyboard.mjs animatic  <STORYBOARD.json> [--motion] [--voice voice/track.wav] [--out dir]
//                                 animatic.mp4: the key frames held for each scene's length (default), or the scenes' real motion at
//                                 low size and frame rate (--motion), with the scene label and running time burned in. Timing, not polish.
//
// STORYBOARD.json (see ../STORYBOARD-template.json):
//   { "title", "size": "1080x1080", "fps": 30, "look": "<look>", "feel": "<calm|snappy|bouncy|dramatic>", "bg"/"fg"/"accent": "#hex" or "-",
//     "scenes": [ { "id", "purpose": "hook|build|payoff|close", "secs": 2.5, "template": "title-loop" (or any template, or "custom"),
//                   "text": "on-screen words", "visual": "what is in the picture", "move": "the one hero move", "transition": "cut|fade",
//                   "sound": "the hit or bed", "env": { template inputs: ASSET, ICONS, PLACES, ... }, "style": "<art style>", "keyAt": 0.6 } ] }
// "custom" scenes (code written for this piece, not a template) show their "preview" sketch (an HTML or image mock-up next to STORYBOARD.json);
// without one the panel says NOT SHOWN YET and frames exits 2: a storyboard with an unseen scene is not ready for approval.
// Scenes hold their content until the cut ("exit": true keeps a template's own exit); "audience": "kids" uses a kids' reading pace.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), SK = path.resolve(HERE, "../..");
const [cmd, file, ...rest] = process.argv.slice(2), opt = (k, d) => { const i = rest.indexOf(k); return i > -1 && rest[i + 1] !== undefined ? rest[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
if (!["script", "frames", "animatic"].includes(cmd) || !file || !existsSync(file)) die("usage: storyboard.mjs script|frames|animatic <STORYBOARD.json> [--out dir] [--motion]");
const SB = JSON.parse(readFileSync(file, "utf8")), base = path.dirname(path.resolve(file));
const [W, H] = (SB.size || "1080x1080").split("x").map(Number), fps = SB.fps || 30, scenes = SB.scenes || [];
if (!scenes.length) die("no scenes");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const tc = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
let t = 0; const timed = scenes.map((s, i) => { const r = { ...s, n: i + 1, start: t, end: t + s.secs }; t += s.secs; return r; }), total = t;
// a scene's scaffold environment: template, look, feel, style and its inputs (a value naming an existing file is resolved next to STORYBOARD.json)
// scenes hold their content until the cut ("exit": true keeps the template's own exit, for a loop that flows back into its start)
const sceneEnv = s => ({ ...process.env, NO_EXIT: s.exit ? "0" : "1", TEMPLATE: s.template || "title-loop", ...(s.look || SB.look ? { LOOK: s.look || SB.look } : {}), ...(s.feel || SB.feel ? { FEEL: s.feel || SB.feel } : {}), ...(s.style ? { STYLE: s.style } : {}),
  ...Object.fromEntries(Object.entries(s.env || {}).map(([k, v]) => [k, typeof v === "string" && existsSync(path.resolve(base, v)) ? path.resolve(base, v) : String(v)])) });
const shown = t => String(t).replace(/\|/g, " · "); // labels separated by | (icon-features) read as a list
const words = s => (s.text && s.text !== "-" ? s.text.replace(/\|/g, " ").split(/\s+/).filter(Boolean).length : 0);

// ---- script: the words, locked before pictures. Reading time is a rule, not a taste: 0.3 s per word + 0.5 s for adults (timeline.mjs),
// 0.45 s per word + 0.8 s when "audience": "kids" (early readers), counted only while the words are FULLY on screen: the scene minus its
// entrance and exit, as the template really times them (scaffolded once per scene to read timing.json).
const RATE = SB.audience === "kids" ? { perWord: 0.45, base: 0.8 } : { perWord: 0.3, base: 0.5 };
function readable(s) {
  if ((s.template || "title-loop") === "custom") return { secs: Math.max(0, s.secs - 0.6), how: "custom scene: 0.6 s allowed for its entrance" };
  const tmp = path.join(base, ".storyboard-timing"); mkdirSync(tmp, { recursive: true });
  try { execFileSync("bash", [path.join(SK, "motionmaker/scripts/scaffold.sh"), `s${s.n}`, s.text || "-", "320", String(Math.round(320 * H / W)), String(fps), String(s.secs), "-", "-", "-", tmp], { env: sceneEnv(s), stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { return { secs: s.secs, how: `not checked (${String(e.stderr || e.message).trim().split("\n").pop()})` }; }
  const tj = JSON.parse(readFileSync(path.join(tmp, `s${s.n}`, "timing.json"), "utf8")); rmSync(tmp, { recursive: true, force: true });
  const enter = tj.enterEnds ? tj.enterEnds / fps : 0.6, exit = (tj.frames - tj.exitStarts) / fps;
  return { secs: Math.max(0, s.secs - enter - exit), how: `entrance ${enter.toFixed(1)} s${exit > 0 ? `, exit ${exit.toFixed(1)} s` : ""}` };
}
function script() {
  const rows = [], probs = [];
  for (const s of timed) {
    const need = RATE.perWord * words(s) + RATE.base, r = words(s) ? readable(s) : null;
    if (!(s.secs > 0)) probs.push(`scene ${s.n}: secs must be > 0`);
    if (r && r.secs < need) probs.push(`scene ${s.n} "${shown(s.text)}": ${words(s)} word(s) need ${need.toFixed(1)} s fully on screen${SB.audience === "kids" ? " (kids' reading pace)" : ""}; the scene shows them complete for ${r.secs.toFixed(1)} s of its ${s.secs} s (${r.how}): cut words or lengthen the scene`);
    if (s.secs < 0.8) probs.push(`scene ${s.n}: ${s.secs} s is shorter than a cut can be read (0.8 s minimum)`);
    rows.push(`| ${s.n} | ${s.purpose || "-"} | ${tc(s.start)}-${tc(s.end)} (${s.secs} s) | ${s.text && s.text !== "-" ? `"${shown(s.text)}"` : "(no words)"} | ${words(s)} | ${r ? `${r.secs.toFixed(1)} s of ${need.toFixed(1)} s` : ""} |`);
  }
  const notes = [];
  if (timed[0].purpose && timed[0].purpose !== "hook") notes.push("the first scene is not a hook: in a feed, the first 1.5 s decide whether anyone keeps watching");
  if (timed.length > 1 && timed.at(-1).purpose && timed.at(-1).purpose !== "close") notes.push("the last scene is not a close (logo, call to action or the loop back)");
  if (SB.length && Math.abs(SB.length - total) > 0.05) probs.push(`scenes add up to ${total.toFixed(1)} s but the brief says ${SB.length} s`);
  const md = `# Script: ${SB.title || ""}\n\n${total.toFixed(1)} s, ${timed.length} scene(s), ${fps} fps, ${W}x${H}. These are the exact on-screen words: approve them before any picture is made.\n\n| # | Purpose | Time | On screen | Words | Readable (needed) |\n|---|---|---|---|---|---|\n${rows.join("\n")}\n\n${notes.map(n => `- Note: ${n}`).join("\n")}${probs.length ? `\n\n## Problems\n${probs.map(p => `- ${p}`).join("\n")}` : ""}\n`;
  writeFileSync(path.join(base, "SCRIPT.md"), md);
  console.log(md); if (probs.length) { console.log(`${probs.length} problem(s): fix the script before the storyboard.`); process.exit(1); }
  console.log(`PASS  script (${path.join(base, "SCRIPT.md")})`);
}

// ---- key frames on the real templates, then the sheet
const keyFrame = s => Math.min(Math.round(s.secs * fps) - 1, Math.round((s.keyAt ?? 0.6) * s.secs * fps));
async function frames(out) {
  const work = path.join(out, "work"); rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
  for (const f of readdirSync(out)) if (/^scene-\d+\.png$/.test(f)) rmSync(path.join(out, f));   // no panels left over from an earlier version
  const { serve, launch } = await import(pathToFileURL(path.join(SK, "motionmaker-build/scripts/browser.mjs")).href);
  const pw = Math.min(W, 520), ph = Math.round(pw * H / W);
  for (const s of timed) {
    if ((s.template || "title-loop") === "custom") { s.custom = true; s.sketch = s.preview && existsSync(path.resolve(base, s.preview)) ? path.resolve(base, s.preview) : null; continue; }
    const r = spawnSync("bash", [path.join(SK, "motionmaker/scripts/scaffold.sh"), `s${s.n}`, s.text || "-", String(pw), String(ph), String(fps), String(s.secs), s.bg || SB.bg || "-", s.fg || SB.fg || "-", s.accent || SB.accent || "-", work], { env: sceneEnv(s), encoding: "utf8" });
    s.warnings = (r.stderr || "").split("\n").filter(l => /^WARNING/.test(l)).map(l => l.replace(/^WARNING:\s*/, ""));
    if (r.status === 0) s.dir = `s${s.n}`; else s.error = (r.stderr || "").trim().split("\n").pop();
  }
  const srv = await serve(work), browser = await launch();
  for (const s of timed) {
    if (!s.dir) continue;
    const page = await browser.newPage({ viewport: { width: pw, height: ph } });
    await page.goto(`${srv.url}/${s.dir}/anim.html?t=0&embed=1`);
    await page.waitForFunction(() => typeof window.renderFrame === "function", null, { timeout: 30000 });
    await page.evaluate(() => (window.ready ? window.ready : null)); await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.fonts].map(f => (f.status === "unloaded" ? f.load().catch(() => null) : null))));
    await page.evaluate(f => window.renderFrame(f), keyFrame(s)); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: path.join(out, `scene-${s.n}.png`) }); await page.close();
  }
  // custom scenes: their sketch (an HTML or image mock-up written for the storyboard), or an honest "not shown yet" card
  for (const s of timed.filter(x => x.custom || x.error)) {
    const page = await browser.newPage({ viewport: { width: pw, height: ph } });
    if (s.sketch && /\.html?$/i.test(s.sketch)) await page.goto(pathToFileURL(s.sketch).href);
    else if (s.sketch) await page.setContent(`<body style="margin:0;background:#fff"><img src="${pathToFileURL(s.sketch).href}" style="width:${pw}px;height:${ph}px;object-fit:contain"></body>`);
    else await page.setContent(`<body style="margin:0;display:flex;align-items:center;justify-content:center;height:${ph}px;background:repeating-linear-gradient(45deg,#f6e3e1,#f6e3e1 10px,#efd2cf 10px,#efd2cf 20px);font:${Math.round(ph / 16)}px/1.35 system-ui,sans-serif;color:#7a1d17;text-align:center;padding:0 8%;box-sizing:border-box"><div><b>NOT SHOWN YET</b><br>${esc(s.error ? `not rendered: ${s.error}` : `custom scene without a sketch: ${s.visual || ""}`)}</div></body>`);
    await page.waitForLoadState("load"); await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, `scene-${s.n}.png`) }); await page.close();
    s.shown = !!s.sketch && !s.error;
  }
  const unshown = timed.filter(s => (s.custom || s.error) && !s.shown);
  const cols = timed.length <= 2 ? timed.length : timed.length === 4 ? 2 : 3, tw = Math.min(pw, 360), th = Math.round(tw * H / W);
  const panel = s => `<div class="p"><div class="h"><b>${s.n}</b> ${esc((s.purpose || "").toUpperCase())}${s.custom && s.shown ? ' <em class="sk">SKETCH</em>' : ""}<span>${tc(s.start)}-${tc(s.end)} · ${s.secs} s</span></div>
<img src="scene-${s.n}.png" alt="">${(s.warnings || []).map(w => `<div class="warn">⚠ ${esc(w)}</div>`).join("")}
<div class="b">${s.text && s.text !== "-" ? `<div class="w">“${esc(shown(s.text))}”</div>` : `<div class="w muted">(no words)</div>`}
${s.visual ? `<div><i>Picture</i> ${esc(s.visual)}</div>` : ""}${s.move ? `<div><i>Move</i> ${esc(s.move)}</div>` : ""}${s.sound ? `<div><i>Sound</i> ${esc(s.sound)}</div>` : ""}
<div class="tr">${s.n < timed.length ? `→ ${esc(s.transition || "cut")}` : "end"}</div></div></div>`;
  const html = `<!doctype html><meta charset="utf-8"><title>Storyboard</title>
<style>body{margin:0;padding:18px;background:#E9E8E4;font:13.5px/1.4 system-ui,sans-serif;color:#1d1d1b}h1{font-size:17px;margin:0}p.sub{margin:3px 0 14px;color:#555}
.g{display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:16px}.p{background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px #0002}
.h{padding:7px 10px;background:#222;color:#fff;font-size:12.5px;letter-spacing:.04em}.h b{font-size:15px;margin-right:6px}.h span{float:right;opacity:.8}
.p img{display:block;width:${tw}px;height:${th}px}.ph{display:flex;flex-direction:column;justify-content:center;padding:16px;background:repeating-linear-gradient(45deg,#f2f2f0,#f2f2f0 8px,#e6e6e2 8px,#e6e6e2 16px);color:#444;box-sizing:border-box}
.warn{background:#FBE0DE;color:#9B1C1C;font-size:12px;padding:5px 10px}.sk{font-style:normal;background:#F5C451;color:#222;padding:0 5px;border-radius:3px;font-size:11px;margin-left:4px}.b{padding:9px 11px 11px}.w{font-weight:600;font-size:15px;margin-bottom:4px}.muted{color:#888;font-weight:400}.b i{color:#777;font-style:normal;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;margin-right:5px}.tr{margin-top:6px;color:#777;font-size:12px}</style>
<h1>Storyboard: ${esc(SB.title || "")}</h1><p class="sub">${timed.length} scenes, ${total.toFixed(1)} s, ${W}x${H} at ${fps} fps${SB.look ? `, look ${esc(SB.look)}` : ""}${SB.feel ? `, ${esc(SB.feel)} motion` : ""}. ${unshown.length ? `<b style="color:#9B1C1C">Scene(s) ${unshown.map(s => s.n).join(", ")} not shown yet: not ready for approval.</b> ` : ""}${timed.some(s => s.custom && s.shown) ? "Panels marked SKETCH are mock-ups of scenes that will be drawn in code; the others are real frames from their templates." : "Each picture is a real frame from its scene."} Approve, or say "scene N: ..." to change one.</p>
<div class="g">${timed.map(panel).join("")}</div>`;
  writeFileSync(path.join(out, "storyboard.html"), html);
  const sheet = await browser.newPage({ viewport: { width: 36 + cols * tw + (cols - 1) * 16, height: 400 } });
  await sheet.goto(pathToFileURL(path.join(out, "storyboard.html")).href); await sheet.screenshot({ path: path.join(out, "storyboard.png"), fullPage: true });
  await browser.close(); srv.close(); rmSync(work, { recursive: true, force: true });
  const md = `# Storyboard: ${SB.title || ""}\n\n![storyboard](storyboard.png)\n\n| # | Purpose | Time | On screen | Picture | Move | Sound | Next |\n|---|---|---|---|---|---|---|---|\n${timed.map(s => `| ${s.n} | ${s.purpose || ""} | ${tc(s.start)}-${tc(s.end)} | ${s.text && s.text !== "-" ? `"${shown(s.text)}"` : ""} | ${s.visual || ""} | ${s.move || ""} | ${s.sound || ""} | ${s.n < timed.length ? s.transition || "cut" : "end"} |`).join("\n")}\n`;
  writeFileSync(path.join(out, "STORYBOARD.md"), md + (unshown.length ? `\nNOT SHOWN: scene(s) ${unshown.map(s => s.n).join(", ")}. Not ready for approval.\n` : ""));
  console.log(`${out}/storyboard.png (${timed.length} panels), storyboard.html, STORYBOARD.md`);
  timed.forEach(s => (s.warnings || []).forEach(w => console.log(`  WARN scene ${s.n}: ${w}`)));
  if (unshown.length) { unshown.forEach(s => console.log(`  NOT SHOWN scene ${s.n}: ${s.error ? `not rendered (${s.error})` : `custom scene without a sketch: add "preview": "<sketch.html or .png>" to it`}`)); if (cmd === "frames") process.exitCode = 2; }
  return timed;
}

// ---- animatic: timing you can watch
async function animatic(out) {
  const motion = rest.includes("--motion"), aw = Math.min(W, 640) & ~1, ah = Math.round(aw * H / W) & ~1, afps = motion ? 12 : fps;
  const clips = path.join(out, "clips"); rmSync(clips, { recursive: true, force: true }); mkdirSync(clips, { recursive: true });
  await frames(out);   // a still for every scene (sketches for custom scenes, which have no motion to render yet)
  const fsz = Math.max(14, Math.round(ah / 26)), list = [];
  // a "fade" dips through the piece's own background colour, not black (a black flash on a light look reads as a mistake)
  const LOOKS = JSON.parse(readFileSync(path.join(SK, "motionmaker-art-director/looks/looks.json"), "utf8")).looks;
  const bgOf = s => { const b = s.bg || SB.bg; return /^#?[0-9a-f]{6}$/i.test(b || "") ? b.replace("#", "0x") : (LOOKS[s.look || SB.look]?.bg || "#000000").replace("#", "0x"); };
  for (const s of timed) {
    const label = `${s.n} ${(s.purpose || "").toUpperCase()}`.replace(/[':\\]/g, ""), fade = 0.25;
    const vf = [`scale=${aw}:${ah}:force_original_aspect_ratio=decrease,pad=${aw}:${ah}:(ow-iw)/2:(oh-ih)/2:color=0xDDDDDD`, `fps=${afps}`,
      ...(s.n > 1 && (timed[s.n - 2].transition === "fade") ? [`fade=t=in:st=0:d=${fade}:color=${bgOf(timed[s.n - 2])}`] : []), ...(s.transition === "fade" && s.n < timed.length ? [`fade=t=out:st=${(s.secs - fade).toFixed(3)}:d=${fade}:color=${bgOf(s)}`] : []),
      `drawbox=x=0:y=0:w=iw:h=${fsz + 12}:color=black@0.6:t=fill`, `drawtext=text='${label}':x=8:y=6:fontsize=${fsz}:fontcolor=white`,
      `drawtext=text='%{pts\\:hms\\:${s.start.toFixed(3)}}':x=w-tw-8:y=6:fontsize=${fsz}:fontcolor=white`];
    const clip = path.join(clips, `c${s.n}.mp4`);
    let input;
    if (motion && (s.template || "title-loop") !== "custom") {
      const d = path.join(clips, `s${s.n}`), env = sceneEnv(s);
      try {
        execFileSync("bash", [path.join(SK, "motionmaker/scripts/scaffold.sh"), `s${s.n}`, s.text || "-", String(aw), String(ah), String(afps), String(s.secs), s.bg || SB.bg || "-", s.fg || SB.fg || "-", s.accent || SB.accent || "-", clips], { env, stdio: ["ignore", "pipe", "pipe"] });
        execFileSync("node", [path.join(SK, "motionmaker-build/scripts/render.mjs"), path.join(d, "anim.html"), String(s.secs), String(afps), "--size", `${aw}x${ah}`, "--out", path.join(d, "frames")], { stdio: ["ignore", "pipe", "pipe"] });
        input = ["-framerate", String(afps), "-i", path.join(d, "frames", "f%04d.png")];
      } catch (e) { console.error(`scene ${s.n}: motion not rendered (${String(e.stderr || e.message).trim().split("\n").pop()}); using a still`); }
    }
    if (!input) {
      const still = path.join(out, `scene-${s.n}.png`);
      if (!existsSync(still)) execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=0xEEEEEE:s=${aw}x${ah}`, "-frames:v", "1", "-vf", `drawtext=text='${(s.visual || "custom scene").replace(/[':\\]/g, "").slice(0, 60)}':x=(w-tw)/2:y=(h-th)/2:fontsize=${fsz}:fontcolor=0x444444`, still]);
      input = ["-loop", "1", "-framerate", String(afps), "-t", String(s.secs), "-i", still];
    }
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...input, "-t", String(s.secs), "-vf", vf.join(","), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "23", "-r", String(afps), clip]);
    list.push(`file '${clip}'`);
  }
  writeFileSync(path.join(clips, "list.txt"), list.join("\n"));
  // --voice <track.wav>: the voice-over on the animatic, so the timing is approved against the real narration (voice.mjs place makes the track)
  const vo = opt("--voice");
  if (vo && !existsSync(vo)) die(`--voice: ${vo} not found (voice.mjs place writes voice/track.wav)`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(clips, "list.txt"), ...(vo ? ["-i", vo, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "160k", "-shortest"] : []), "-c:v", "copy", "-movflags", "+faststart", path.join(out, "animatic.mp4")]);
  rmSync(clips, { recursive: true, force: true });
  const dur = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(out, "animatic.mp4")]).toString().trim();
  console.log(`${out}/animatic.mp4 (${motion ? "real motion at 12 fps" : "key frames held"}${vo ? ", with the voice-over" : ""}, ${aw}x${ah}, ${dur.toFixed(2)} s; the scenes add up to ${total.toFixed(2)} s)`);
  timed.forEach(s => console.log(`  ${tc(s.start)}  ${s.n} ${(s.purpose || "").padEnd(7)} ${s.text && s.text !== "-" ? `"${shown(s.text)}"` : "(no words)"}${s.n < timed.length ? `  -> ${s.transition || "cut"}` : ""}`));
}

const out = path.resolve(opt("--out", path.join(base, cmd === "animatic" ? "animatic" : "storyboard")));
mkdirSync(out, { recursive: true });
if (cmd === "script") script();
else if (cmd === "frames") await frames(out);
else await animatic(out);
