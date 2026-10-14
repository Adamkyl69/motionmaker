// Voice-over for a motion piece: the narration script, a voice audition, placing each line on its scene, captions, and the mix.
// The voice itself comes from wherever the user chose: an ElevenLabs connector or MCP server (any tool that speaks text), their own
// recording, or OpenMontage's Piper. This script never calls a paid service; it works on the audio files it is given.
//
//   node voice.mjs lines  <STORYBOARD.json> [--wps 2.5]
//        VOICE-SCRIPT.md: each scene's narration ("say"), its characters (what TTS bills) and speaking time against the scene length
//   node voice.mjs voices <voices.json> [--n 4 | --ids a,b] [--out voice/audition]
//        a free audition: downloads each candidate voice's public preview and writes voices.html (players, names, descriptions)
//        voices.json = the saved result of a voice search (ElevenLabs creative_list_voices / search_voices), or a list of {voice_id,name,preview_url}
//   node voice.mjs place  <STORYBOARD.json> --dir <voice dir> [--lead 0.25] [--tail 0.35] [--retime]
//        reads <voice dir>/scene-<n>.(wav|mp3|m4a|ogg) for every scene that has "say"; checks each line fits its scene (lead + line + tail);
//        --retime lengthens scenes that are too short (STORYBOARD.json is rewritten, the old one kept as .bak); writes <voice dir>/track.wav
//        (the voice on the piece's timeline), cues.json (when the voice speaks) and captions.srt / captions.vtt
//   node voice.mjs mix    --voice <track.wav> [--bed <music and hits .wav>] --out <mix.wav> [--lufs -14] [--duck 10] [--cues <cues.json>]
//        the bed goes down exactly --duck dB while the voice speaks (from cues.json), then the mix is normalised to --lufs (true peak <= -1 dBTP)
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";

const [cmd, ...rest] = process.argv.slice(2), opt = (k, d) => { const i = rest.indexOf(k); return i > -1 && rest[i + 1] !== undefined ? rest[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const run = (c, a) => execFileSync(c, a, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 }).toString();
const dur = f => +run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).trim();
const plain = s => String(s || "").replace(/\[[^\]]*\]/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();   // without audio tags / SSML
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const loadSB = f => { if (!f || !existsSync(f)) die("STORYBOARD.json not found"); const sb = JSON.parse(readFileSync(f, "utf8")); let t = 0; sb.scenes.forEach((s, i) => { s.n = i + 1; s.start = t; t += s.secs; }); sb.total = t; return sb; };

if (cmd === "lines") {
  const file = rest[0], sb = loadSB(file), wps = +opt("--wps", 2.5), rows = [], probs = []; let chars = 0;
  for (const s of sb.scenes) {
    if (!s.say) { rows.push(`| ${s.n} | ${s.secs} s | (no narration) | | |`); continue; }
    const words = plain(s.say).split(/\s+/).filter(Boolean).length, need = words / wps + 0.6; chars += s.say.length;
    rows.push(`| ${s.n} | ${s.secs} s | ${s.say.replace(/\|/g, "/")} | ${s.say.length} | ~${need.toFixed(1)} s |`);
    if (need > s.secs) probs.push(`scene ${s.n}: about ${need.toFixed(1)} s to say at ${wps} words/s, the scene has ${s.secs} s (shorten the line, or lengthen the scene: place --retime does it from the real recording)`);
  }
  const md = `# Voice-over script: ${sb.title || ""}\n\n${sb.scenes.filter(s => s.say).length} line(s), ${chars} characters in total (text-to-speech is billed by characters; audio tags count). Speaking pace assumed ${wps} words/s (kids' content: 2.0 to 2.3).\nThe voice says these lines; the on-screen words are in SCRIPT.md. They can differ, but the picture must not contradict the voice.\n\n| Scene | Length | Says | Chars | Needs |\n|---|---|---|---|---|\n${rows.join("\n")}\n${probs.length ? `\n## Too long for their scene\n${probs.map(p => `- ${p}`).join("\n")}\n` : ""}`;
  writeFileSync(path.join(path.dirname(path.resolve(file)), "VOICE-SCRIPT.md"), md); console.log(md);
  if (probs.length) process.exit(1);
}
else if (cmd === "voices") {
  const f = rest[0]; if (!f || !existsSync(f)) die("voices <voices.json> [--n 4 | --ids a,b] [--out dir]");
  const raw = JSON.parse(readFileSync(f, "utf8")), all = Array.isArray(raw) ? raw : raw.voices || [];
  const ids = opt("--ids") ? opt("--ids").split(",") : null, list = (ids ? ids.map(id => all.find(v => v.voice_id === id)).filter(Boolean) : all.slice(0, +opt("--n", 4)));
  if (!list.length) die("no voices to audition");
  const out = path.resolve(opt("--out", "voice/audition")); mkdirSync(out, { recursive: true });
  for (const [i, v] of list.entries()) {
    v.n = i + 1;
    if (v.preview_url) { try { run("curl", ["-sSfL", "--max-time", "30", "-o", path.join(out, `voice-${v.n}.mp3`), v.preview_url]); v.file = `voice-${v.n}.mp3`; v.secs = dur(path.join(out, v.file)); } catch { v.file = null; } }
  }
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voice audition</title>
<style>body{margin:0;background:#EEEDE9;font:15px/1.45 system-ui,sans-serif;color:#1d1d1b}main{max-width:820px;margin:auto;padding:24px 16px}h1{font-size:19px;margin:0}.sub{color:#555;margin:4px 0 18px}
.v{background:#fff;border-radius:8px;padding:14px 16px;margin:0 0 12px;box-shadow:0 1px 3px #0001}.v b{font-size:16px}.t{color:#666;font-size:13px;margin:2px 0 8px}audio{width:100%}</style>
<main><h1>Voice audition</h1><p class="sub">Each voice's own public sample (free: nothing was generated). Listen, then say the number. The samples read the provider's text, not your script: the next step is one short line of yours in the voice you pick.</p>
${list.map(v => `<div class="v"><b>${v.n}. ${esc(v.name)}</b><div class="t">${esc([v.labels?.gender, v.labels?.age, v.labels?.accent].filter(Boolean).join(", "))}${v.description ? ` · ${esc(v.description.slice(0, 220))}` : ""}</div>${v.file ? `<audio controls preload="none" src="${v.file}"></audio>` : "<i>no preview available</i>"}</div>`).join("\n")}</main>`;
  writeFileSync(path.join(out, "voices.html"), html); writeFileSync(path.join(out, "voices.json"), JSON.stringify(list.map(({ n, voice_id, name, file, secs, description, labels }) => ({ n, voice_id, name, file, secs, description, labels })), null, 1));
  console.log(`${out}/voices.html (open it in a browser and listen)`); list.forEach(v => console.log(`  ${v.n}. ${v.name}${v.file ? ` (${v.secs.toFixed(1)} s sample)` : " (no preview)"}  ${v.voice_id}`));
}
else if (cmd === "place") {
  const file = rest[0], sb = loadSB(file), vdir = path.resolve(opt("--dir", "voice")), lead = +opt("--lead", 0.25), tail = +opt("--tail", 0.35), retime = rest.includes("--retime");
  const find = n => ["wav", "mp3", "m4a", "ogg", "flac"].map(e => path.join(vdir, `scene-${n}.${e}`)).find(existsSync);
  const lines = [], probs = [], changes = [];
  for (const s of sb.scenes) { if (!s.say) continue; const f = find(s.n); if (!f) { probs.push(`scene ${s.n}: no recording (${vdir}/scene-${s.n}.mp3 or .wav)`); continue; }
    const d = dur(f), need = lead + d + tail; lines.push({ s, f, d });
    if (need > s.secs + 1e-6) { if (retime) { const to = Math.ceil(need * 10) / 10; changes.push(`scene ${s.n}: ${s.secs} s -> ${to} s (line ${d.toFixed(2)} s)`); s.secs = to; } else probs.push(`scene ${s.n}: the line is ${d.toFixed(2)} s, so the scene needs ${need.toFixed(2)} s (has ${s.secs} s): run with --retime, or record a shorter line`); } }
  if (probs.length) { probs.forEach(p => console.log("FAIL  " + p)); process.exit(1); }
  if (changes.length) { copyFileSync(file, file + ".bak"); const clean = { ...sb, scenes: sb.scenes.map(({ n, start, ...s }) => s) }; delete clean.total; writeFileSync(file, JSON.stringify(clean, null, 1));
    console.log(`retimed (old file kept as ${path.basename(file)}.bak; the script, storyboard and animatic approvals go stale and must be shown again):`); changes.forEach(c => console.log("  " + c)); }
  let t = 0; sb.scenes.forEach(s => { s.start = t; t += s.secs; }); const total = t;
  // the voice track: each line at its scene start + lead, 48 kHz stereo, total length = the piece
  const inputs = lines.flatMap(l => ["-i", l.f]), parts = lines.map((l, i) => `[${i}]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round((l.s.start + lead) * 1000)}:all=1[a${i}]`);
  run("ffmpeg", ["-loglevel", "error", "-y", ...inputs, "-filter_complex", `${parts.join(";")};${lines.map((_, i) => `[a${i}]`).join("")}amix=inputs=${lines.length}:normalize=0,apad,atrim=0:${total.toFixed(3)}[v]`, "-map", "[v]", "-c:a", "pcm_s16le", path.join(vdir, "track.wav")]);
  const cues = lines.map(l => ({ scene: l.s.n, from: +(l.s.start + lead).toFixed(3), to: +(l.s.start + lead + l.d).toFixed(3), say: plain(l.s.say) }));
  writeFileSync(path.join(vdir, "cues.json"), JSON.stringify({ total: +total.toFixed(3), lead, tail, cues }, null, 1));
  // captions: chunks of at most 42 characters, timed by their share of the line's characters
  const ts = (x, sep) => { const ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`; };
  // balanced chunks (never a one-word orphan): as few chunks as fit 42 characters each, words shared out evenly by length
  const caps = []; for (const c of cues) { const words = c.say.split(" "), k = Math.ceil(c.say.length / 42), target = c.say.length / k, chunks = []; let cur = "";
    for (const w of words) { const next = (cur + " " + w).trim(); if (cur && chunks.length < k - 1 && (next.length > 42 || Math.abs(cur.length - target) < Math.abs(next.length - target))) { chunks.push(cur); cur = w; } else cur = next; } if (cur) chunks.push(cur);
    const totalChars = chunks.reduce((a, x) => a + x.length, 0); let at = c.from; for (const ch of chunks) { const len = (c.to - c.from) * ch.length / totalChars; caps.push({ from: at, to: at + len, text: ch }); at += len; } }
  writeFileSync(path.join(vdir, "captions.srt"), caps.map((c, i) => `${i + 1}\n${ts(c.from, ",")} --> ${ts(c.to, ",")}\n${c.text}\n`).join("\n"));
  writeFileSync(path.join(vdir, "captions.vtt"), "WEBVTT\n\n" + caps.map(c => `${ts(c.from, ".")} --> ${ts(c.to, ".")}\n${c.text}\n`).join("\n"));
  console.log(`${vdir}/track.wav (${total.toFixed(2)} s), cues.json, captions.srt, captions.vtt`);
  cues.forEach(c => console.log(`  scene ${c.scene}: ${c.from.toFixed(2)}-${c.to.toFixed(2)} s  "${c.say.slice(0, 70)}"`));
}
else if (cmd === "mix") {
  const voice = opt("--voice"), bed = opt("--bed"), out = opt("--out"), lufs = +opt("--lufs", -14), duck = +opt("--duck", 10);
  if (!voice || !existsSync(voice) || !out) die("mix --voice <track.wav> [--bed <bed.wav>] --out <mix.wav> [--lufs -14] [--duck 10]");
  // ducking from the cue list, not a compressor: we know exactly when the voice speaks, so the bed goes down exactly `duck` dB there,
  // with a 0.15 s fade in before each line and a 0.3 s release after it (a compressor's depth depends on how loud the voice happens to be)
  const cf = opt("--cues", path.join(path.dirname(path.resolve(voice)), "cues.json")), cues = existsSync(cf) ? JSON.parse(readFileSync(cf, "utf8")).cues : null;
  if (bed && !cues) die(`ducking needs the cue list from place (${cf}); pass --cues <cues.json>`);
  const g = Math.pow(10, -duck / 20), env = cues ? cues.map(c => `clip((t-${(c.from - 0.15).toFixed(3)})/0.15,0,1)*clip((${(c.to + 0.3).toFixed(3)}-t)/0.3,0,1)`).join("+") : "0";
  const filt = bed
    ? `[0]aresample=48000,aformat=channel_layouts=stereo[v];[1]aresample=48000,aformat=channel_layouts=stereo,volume='1-${(1 - g).toFixed(4)}*min(1,${env})':eval=frame[bd];[v][bd]amix=inputs=2:normalize=0:duration=first[m]`
    : `[0]aresample=48000,aformat=channel_layouts=stereo[m]`;
  const tmp = out.replace(/\.wav$/, "") + ".pre.wav";
  run("ffmpeg", ["-loglevel", "error", "-y", "-i", voice, ...(bed ? ["-i", bed] : []), "-filter_complex", filt, "-map", "[m]", "-c:a", "pcm_s16le", tmp]);
  // two-pass EBU R128: measure, then normalise with the measured values (linear: keeps the voice's dynamics), then a peak limiter
  const measure = f => { const r = spawnSync("ffmpeg", ["-hide_banner", "-i", f, "-af", `loudnorm=I=${lufs}:TP=-1.5:LRA=11:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
    return JSON.parse((r.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/) || ["{}"])[0]); };
  const meas = measure(tmp);
  run("ffmpeg", ["-loglevel", "error", "-y", "-i", tmp, "-af", `loudnorm=I=${lufs}:TP=-1.5:LRA=11:measured_I=${meas.input_i}:measured_TP=${meas.input_tp}:measured_LRA=${meas.input_lra}:measured_thresh=${meas.input_thresh}:offset=${meas.target_offset}:linear=true,alimiter=limit=0.84:level=false,aresample=48000`, "-c:a", "pcm_s16le", out]);
  rmSync(tmp, { force: true });
  const fin = measure(out);
  console.log(`${out}: ${(+fin.input_i).toFixed(1)} LUFS, true peak ${(+fin.input_tp).toFixed(1)} dBTP${bed ? `, bed ${duck} dB down under each of the ${cues.length} line(s)` : ""}`);
  if (Math.abs(+fin.input_i - lufs) > 1.5 || +fin.input_tp > -1) { console.log("WARN  outside the target (+/-1.5 LU, <= -1 dBTP)"); process.exit(1); }
}
else die("commands: lines | voices | place | mix");
