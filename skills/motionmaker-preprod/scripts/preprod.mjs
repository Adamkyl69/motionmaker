// The pre-production record: which gates the user has passed, in their own words, on exactly which file.
// An approval is bound to the file's fingerprint: if the storyboard is re-rendered after the user said yes, the yes no longer counts.
//
//   node preprod.mjs init     <project> --level quick|guided|hands-on [--scenes N]
//   node preprod.mjs approve  <project> <gate> --file <what they saw> --words "<their exact words>"
//   node preprod.mjs changes  <project> <gate> --words "<what they asked to change>" [--file <what they saw>]
//   node preprod.mjs require  <project> <gate> on|off [--why "..."]        add or drop a gate for this piece (recorded)
//   node preprod.mjs scenes   <project> <N>                                 the number of scenes, once it is known (adjusts the gates it implies)
//   node preprod.mjs status   <project>
//   node preprod.mjs check    <project> build|deliver                      exit 1 until the required gates are approved and still current
//   node preprod.mjs board    <project>                                    preprod/board.html: everything shown so far, in order, with the verdicts
//
// Gates, in order: understanding (BRIEF-BACK.md), worlds (what is in the picture), style (mood board / directions), feel (motion), script
// (SCRIPT.md), voice (a line in the chosen voice; required once a voice-over is chosen), storyboard (storyboard.png), animatic (animatic.mp4),
// first-shot (the first scene built for real). Script, voice, storyboard, animatic and first-shot approvals also bind STORYBOARD.json. "build" needs every
// required gate before first-shot; "deliver" needs all of them.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const GATES = ["understanding", "worlds", "style", "feel", "script", "voice", "storyboard", "animatic", "first-shot"];
// approvals of these gates also bind STORYBOARD.json: changing a scene's words or timing after the yes makes the yes stale
const BOUND = new Set(["script", "voice", "storyboard", "animatic", "first-shot"]);
const WHAT = { understanding: "the brief-back: what will be made, in plain words", worlds: "what is in the picture", style: "the look (mood board, variants, directions)", feel: "how it moves", script: "the exact on-screen words and timing", voice: "the voice-over: the voice chosen and a line of the script in it", storyboard: "a real frame of every scene", animatic: "the timing, as a video", "first-shot": "the first scene, built for real" };
const LEVELS = {
  quick: { about: "you decide most things; two approvals", gates: ["understanding", "style"] },
  guided: { about: "the recommended middle: look, motion, words and scenes approved before the build", gates: ["understanding", "style", "feel", "script", "storyboard"] },
  "hands-on": { about: "every gate, including the animatic and the first built scene", gates: GATES },
};
const [cmd, proj, ...rest] = process.argv.slice(2), opt = (k, d) => { const i = rest.indexOf(k); return i > -1 && rest[i + 1] !== undefined ? rest[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
if (!cmd || !proj) die("usage: preprod.mjs init|approve|changes|require|status|check|board <project> ...");
const dir = path.resolve(proj), pdir = path.join(dir, "preprod"), F = path.join(pdir, "PREPROD.json");
const sha = f => createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 16);
const now = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
const load = () => { if (!existsSync(F)) die(`no pre-production record in ${dir}: run  preprod.mjs init ${proj} --level guided`);
  const d = JSON.parse(readFileSync(F, "utf8")); for (const k of GATES) d.gates[k] ??= { required: false, status: "pending", history: [] }; return d; };  // records from older versions lack newer gates
const save = d => { mkdirSync(pdir, { recursive: true }); writeFileSync(F, JSON.stringify(d, null, 1)); };
const rel = f => path.relative(dir, path.resolve(f));
// a gate's state: approved and still the same file / approved but the file changed since / changes asked / waiting
function state(g) {
  if (g.status !== "approved") return g.status;
  if (!g.artifact) return "approved";
  for (const b of [{ artifact: g.artifact, sha: g.sha }, ...(g.also || [])]) {
    const f = path.join(dir, b.artifact);
    if (!existsSync(f)) return `stale: ${b.artifact} is gone`;
    if (sha(f) !== b.sha) return `stale: ${b.artifact} changed after approval`;
  }
  return "approved";
}

if (cmd === "init") {
  const level = opt("--level", "guided"); if (!LEVELS[level]) die(`--level quick | guided | hands-on`);
  if (existsSync(F) && !rest.includes("--force")) die(`${F} exists (--force to start over)`);
  const scenes = +opt("--scenes", 1), req = new Set(LEVELS[level].gates);
  if (level === "guided" && scenes > 1) req.add("animatic");          // several scenes: their timing is worth seeing before the build
  if (scenes <= 1 && level !== "hands-on") { req.delete("storyboard"); }  // one shot: the style frame IS its storyboard
  const d = { project: path.basename(dir), level, scenes, created: now(), gates: Object.fromEntries(GATES.map(k => [k, { required: req.has(k), status: "pending", history: [] }])) };
  save(d); console.log(`pre-production record: ${F}\nlevel ${level} (${LEVELS[level].about}), ${scenes} scene(s)\nrequired: ${GATES.filter(k => req.has(k)).join(", ")}`);
}
else if (cmd === "approve" || cmd === "changes") {
  const d = load(), name = rest[0], g = d.gates[name]; if (!g) die(`unknown gate "${name}" (${GATES.join(", ")})`);
  const words = opt("--words"); if (!words) die(`--words "<the user's exact words>" is required: an approval is what the user said, not what you concluded`);
  const file = opt("--file");
  if (cmd === "approve" && !file) die(`--file <what the user saw> is required: the approval is bound to that exact file`);
  if (file && !existsSync(file)) die(`file not found: ${file}`);
  // a storyboard with a scene nobody has seen cannot be approved (storyboard.mjs marks it NOT SHOWN)
  const sbmd = file && path.join(path.dirname(path.resolve(file)), "STORYBOARD.md");
  if (cmd === "approve" && name === "storyboard" && sbmd && existsSync(sbmd) && /NOT SHOWN/.test(readFileSync(sbmd, "utf8"))) die(`refused: ${readFileSync(sbmd, "utf8").match(/NOT SHOWN.*/)[0]} Sketch those scenes, re-render the storyboard and show it again.`);
  const sbFile = path.join(dir, "STORYBOARD.json"), also = BOUND.has(name) && existsSync(sbFile) && path.resolve(file || "") !== sbFile ? [{ artifact: "STORYBOARD.json", sha: sha(sbFile) }] : [];
  const entry = { at: now(), status: cmd === "approve" ? "approved" : "changes", words, ...(file ? { artifact: rel(file), sha: sha(file) } : {}), ...(also.length ? { also } : {}) };
  g.history.push(entry); g.status = entry.status; if (file) { g.artifact = entry.artifact; g.sha = entry.sha; } g.also = also;
  save(d); console.log(`${name}: ${entry.status}${file ? ` (${entry.artifact} ${entry.sha})` : ""}\n  "${words}"`);
}
else if (cmd === "require") {
  const d = load(), name = rest[0], on = rest[1]; if (!d.gates[name] || !["on", "off"].includes(on)) die("require <gate> on|off [--why ...]");
  d.gates[name].required = on === "on"; d.gates[name].history.push({ at: now(), status: `required ${on}`, words: opt("--why", "") }); save(d); console.log(`${name}: required ${on}`);
}
else if (cmd === "scenes") {
  const d = load(), n = +rest[0]; if (!(n >= 1)) die("scenes <project> <N>");
  d.scenes = n;
  if (d.level !== "hands-on") { d.gates.storyboard.required = n > 1 || d.level === "hands-on"; if (d.level === "guided") d.gates.animatic.required = n > 1; }
  d.gates.storyboard.history.push({ at: now(), status: `scenes ${n}`, words: "" }); save(d);
  console.log(`${n} scene(s); required: ${GATES.filter(k => d.gates[k].required).join(", ")}`);
}
else if (cmd === "status" || cmd === "check") {
  const d = load(), upto = cmd === "check" && rest[0] === "build" ? GATES.indexOf("first-shot") : GATES.length;
  if (cmd === "check" && !["build", "deliver"].includes(rest[0])) die("check <project> build|deliver");
  console.log(`${d.project}: level ${d.level}, ${d.scenes} scene(s)\n`);
  const missing = [];
  GATES.forEach((k, i) => { const g = d.gates[k], st = state(g), last = g.history.filter(h => h.words && !h.status.startsWith("required")).at(-1);
    console.log(`${g.required ? "*" : " "} ${k.padEnd(13)} ${st.padEnd(32)} ${last ? `"${last.words.slice(0, 70)}"` : WHAT[k]}`);
    if (g.required && st !== "approved" && i < upto) missing.push(`${k} (${st})`); });
  console.log("\n* required at this level");
  if (cmd === "check") { if (missing.length) { console.log(`\nNOT READY for ${rest[0]}: ${missing.join(", ")}`); process.exit(1); } console.log(`\nREADY for ${rest[0]}`); }
}
else if (cmd === "board") {
  const d = load(), esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const media = a => { if (!a) return ""; const src = path.relative(pdir, path.join(dir, a)).split(path.sep).join("/"), ext = path.extname(a).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) return `<img src="${esc(src)}" alt="">`;
    if ([".mp4", ".webm"].includes(ext)) return `<video src="${esc(src)}" controls loop muted autoplay playsinline></video>`;
    if ([".md", ".txt", ".json"].includes(ext) && existsSync(path.join(dir, a))) return `<pre>${esc(readFileSync(path.join(dir, a), "utf8").slice(0, 6000))}</pre>`;
    if (ext === ".html") return `<iframe src="${esc(src)}"></iframe>`;
    return `<a href="${esc(src)}">${esc(a)}</a>`; };
  const badge = st => `<span class="b ${st === "approved" ? "ok" : st.startsWith("stale") ? "st" : st === "changes" ? "ch" : "pe"}">${esc(st)}</span>`;
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pre-production: ${esc(d.project)}</title>
<style>body{margin:0;background:#EEEDE9;color:#1d1d1b;font:15px/1.45 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:24px 16px}h1{font-size:20px;margin:0}
.sub{color:#555;margin:4px 0 20px}section{background:#fff;border-radius:8px;padding:16px 18px;margin:0 0 16px;box-shadow:0 1px 3px #0001}h2{font-size:16px;margin:0 0 4px;display:flex;gap:10px;align-items:center}
.w{color:#666;font-size:13.5px;margin-bottom:10px}img,video{max-width:100%;border-radius:4px;display:block}iframe{width:100%;height:520px;border:1px solid #ddd;border-radius:4px}pre{white-space:pre-wrap;background:#f6f6f4;padding:12px;border-radius:4px;font-size:13px;max-height:420px;overflow:auto}
.b{font-size:12px;font-weight:600;padding:2px 8px;border-radius:10px}.ok{background:#DDF3E4;color:#17663A}.ch{background:#FFF0D6;color:#8A5A00}.st{background:#FBE0DE;color:#9B1C1C}.pe{background:#ECECEA;color:#555}
.h{font-size:13px;color:#444;margin-top:10px;border-left:3px solid #ddd;padding-left:10px}.h div{margin:3px 0}.opt{color:#888;font-weight:400;font-size:13px}</style>
<main><h1>Pre-production: ${esc(d.project)}</h1><p class="sub">Level: ${esc(d.level)} (${esc(LEVELS[d.level].about)}), ${d.scenes} scene(s). Everything shown so far, in order, with what was said about it.</p>
${GATES.map(k => { const g = d.gates[k], st = state(g); if (!g.required && !g.history.length) return "";
  return `<section><h2>${esc(k)} ${badge(st)}${g.required ? "" : ' <span class="opt">optional</span>'}</h2><div class="w">${esc(WHAT[k])}</div>${media(g.artifact)}
${g.history.length ? `<div class="h">${g.history.map(h => `<div><b>${esc(h.status)}</b> ${esc(h.at.replace("T", " ").replace("Z", ""))}${h.words ? `: “${esc(h.words)}”` : ""}${h.artifact ? ` <span class="opt">(${esc(h.artifact)})</span>` : ""}</div>`).join("")}</div>` : ""}</section>`; }).join("\n")}
</main>`;
  writeFileSync(path.join(pdir, "board.html"), html); console.log(`${path.join(pdir, "board.html")} (open it in a browser: images, videos and the history of every gate)`);
}
else die(`unknown command ${cmd}`);
