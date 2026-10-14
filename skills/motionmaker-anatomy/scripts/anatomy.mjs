// Bridge to Anatomy (github.com/wheresryan22/anatomy, MIT, by Ryan): interactive isometric figures that explain an idea as a working machine.
// Anatomy BUILDS the figure (its own skill and rules); Motionmaker FILMS it frame-exactly (or exports it live for the web), art-directs the shots and runs the QA.
//
//   node anatomy.mjs where                                   is the Anatomy skill installed, and where
//   node anatomy.mjs install [--global|--project]           clone Anatomy (pinned commit) next to the Motionmaker skills (explicit user action)
//   node anatomy.mjs inspect <figure.html>                   title, hint, readout, controls, idle tour: what the figure can show on film
//   node anatomy.mjs film <figure.html> --secs 8 --fps 30 --frame 1080x1080 [--shots "<shot list>"] [--actions a.json] [--out motion-out/<slug>/out/frames] [--check]
//   node anatomy.mjs web <figure.html> [--shots "<shot list>"] [--repeat <secs>] [--out <dir>] [--name <slug>] [--hide-hint] [--check]
//                                                            the LIVE figure for a website / React app (export-web.mjs --live), with the player
//
// Shot list (applied at film time t, seconds):  "hover .stage 0.5,0.45 @1.5; leave @5.5; key ArrowRight @3; click button.rp-fire @6; move .stage 0.2,0.5>0.8,0.5 @2+1.5"
// Without shots the figure's own idle tour plays (most figures have one). The "hover to..." hint is hidden on film (it talks to a reader, not a viewer): --keep-hint keeps it. The film crops to the figure's card (.iso-plate), sized to --frame on the page colour.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), SK = path.resolve(HERE, "../.."), PIN = "454a0ef", REPO = "https://github.com/wheresryan22/anatomy";
const argv = process.argv.slice(2), cmd = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const homes = () => [path.join(SK, "anatomy"), path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "skills", "anatomy"), path.resolve(".claude/skills/anatomy"), path.join(os.homedir(), ".agents", "skills", "anatomy")];
const where = () => homes().find(h => existsSync(path.join(h, "SKILL.md")) && /name:\s*anatomy/.test(readFileSync(path.join(h, "SKILL.md"), "utf8")));
// "hover .stage 0.5,0.4 @1.5; move .stage 0.2,0.5>0.8,0.5 @2+1.5; click sel @t; key K @t; leave @t" -> film-realtime / live-bridge actions
function parseShots(list) {
  return list.split(";").map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(hover|leave|key|click|move)\s*(.*?)\s*@\s*([\d.]+)(?:\+([\d.]+))?$/); if (!m) die(`bad shot "${s}" (e.g. "hover .stage 0.5,0.4 @1.5")`);
    const [, act, rest, t, dur] = m, parts = rest.split(/\s+/).filter(Boolean), a = { t: +t, do: act };
    if (act === "key") a.key = parts[0]; else if (act !== "leave") { a.selector = parts[0]; const xy = parts[1];
      if (act === "move") { const [fr, to] = (xy || "0.2,0.5>0.8,0.5").split(">"); a.from = fr.split(",").map(Number); a.to = to.split(",").map(Number); a.dur = +(dur || 1); }
      else if (xy) [a.x, a.y] = xy.split(",").map(Number); }
    return a; });
}

if (cmd === "where") { const w = where(); console.log(w ? `Anatomy: ${w}` : `Anatomy is not installed. Install (the user's choice):\n  npx skills add wheresryan22/anatomy -g -a claude-code\nor: node anatomy.mjs install`); process.exit(w ? 0 : 3); }
if (cmd === "install") {
  const dest = argv.includes("--project") ? path.resolve(".claude/skills/anatomy") : path.join(SK, "anatomy"); if (existsSync(dest)) die(`already there: ${dest}`);
  console.log(`Cloning ${REPO} (MIT) at ${PIN} into ${dest}`); const r = spawnSync("git", ["clone", "--quiet", REPO, dest], { stdio: "inherit" }); if (r.status) die("git clone failed", r.status);
  spawnSync("git", ["-C", dest, "checkout", "--quiet", PIN], { stdio: "inherit" }); console.log("Done. Start a new Claude Code session so /anatomy is picked up."); process.exit(0);
}
if (cmd === "inspect") {
  const f = argv[1]; if (!f || !existsSync(f)) die("inspect <figure.html>"); const t = readFileSync(f, "utf8");
  const text = re => (t.match(re) || [])[1]?.replace(/<[^>]+>/g, "").trim();
  const info = { file: f, theme: (t.match(/data-theme="(\w+)"/) || [])[1] || "?", title: text(/<title>([^<]+)<\/title>/), caption: text(/class="iso-caption">([^<$]{3,300})/),
    idleTour: /tourAt|touring/.test(t), readout: /data-readout/.test(t), keyboard: /addEventListener\("keydown"/.test(t), pointer: /addEventListener\("pointer(move|enter)"/.test(t),
    buttons: [...new Set([...t.matchAll(/<button[^>]*class="([^"]+)"[^>]*>([^<]{0,30})/g)].map(m => `button.${m[1].split(" ")[0]} "${m[2].trim()}"`))].slice(0, 8),
    webgl: /getContext\("webgl2?"/.test(t), threeD: /turn-fixed|turn\.mjs|TurnGroup/.test(t), random: /Math\.random/.test(t), externalUrls: [...new Set(t.match(/https?:\/\/(?!www\.w3\.org)[^"' )]+/g) || [])].length,
    stageSelectors: [...new Set([...t.matchAll(/class="([a-z]+-stage)"/g)].map(m => "." + m[1]))] };
  console.log(JSON.stringify(info, null, 1));
  console.log(`\nShots: ${info.idleTour ? "the idle tour already moves it (no shots needed for a loop); " : ""}${info.pointer ? `pointer: hover/move over ${info.stageSelectors[0] || "the stage"}; ` : ""}${info.keyboard ? "keys: see the legend under the card; " : ""}${info.buttons.length ? "buttons: " + info.buttons.join(", ") : ""}`);
  if (info.externalUrls) console.log(`WARN  ${info.externalUrls} external URL(s): they will be blocked while filming`); process.exit(0);
}
if (cmd === "film") {
  const f = argv[1]; if (!f || !existsSync(f)) die("film <figure.html> --secs 8 --fps 30 --frame 1080x1080 [--shots ...]");
  const secs = opt("--secs", "8"), fps = opt("--fps", "30"), frame = opt("--frame", "1080x1080"), out = path.resolve(opt("--out", "out/frames"));
  let actions = opt("--actions");
  if (opt("--shots")) { mkdirSync(path.dirname(out), { recursive: true }); actions = path.join(path.dirname(out), "shots.json"); writeFileSync(actions, JSON.stringify(parseShots(opt("--shots")), null, 1)); }
  const [FW, FH] = frame.split("x").map(Number), t = readFileSync(f, "utf8"), light = /data-theme="light"/.test(t), bg = opt("--bg", light ? "#F3F2EE" : "#141413");
  const args = [path.join(SK, "motionmaker-build/scripts/film-realtime.mjs"), f, secs, fps, "--size", opt("--size", "1400x1100"), "--clip", opt("--clip", ".iso-plate"), "--scale", opt("--scale", String(Math.max(FW, FH) > 900 ? 2 : 1)),
    "--frame", frame, "--bg", bg, "--out", out, "--css", opt("--css", argv.includes("--keep-hint") ? "" : '[data-corner="hint"],[class$="-hint"],[class*="-hint "]{visibility:hidden}'), "--warmup", opt("--warmup", "0.5")]; if (actions) args.push("--actions", actions); if (argv.includes("--check")) args.push("--check");
  const r = spawnSync("node", args, { stdio: "inherit" }); if (r.status) process.exit(r.status);
  console.log(`\nNext: bash ${path.join(SK, "motionmaker-sound-export/scripts/export.sh")} ${out} ${fps} <name>   then film-gate, review-pack + independent review, deliver.`);
  process.exit(0);
}
if (cmd === "web") {
  // The live figure for a website or React app: visitors hover, drag and use its keys; the player pauses it off screen and honours reduced
  // motion; --shots plays a tour until the visitor's first touch. The "hover to..." hint stays (on a page the visitor IS the reader).
  const f = argv[1]; if (!f || !existsSync(f)) die("web <figure.html> [--shots \"...\"] [--repeat <secs>] [--out <dir>] [--name <slug>] [--hide-hint] [--check]");
  const out = path.resolve(opt("--out", path.join(path.dirname(path.resolve(f)), "web")));
  const args = [path.join(SK, "motionmaker-build/scripts/export-web.mjs"), f, "--live", "--clip", opt("--clip", ".iso-plate"), "--viewport", opt("--viewport", "1280x800"), "--out", out,
    "--credit", "Figure built with Anatomy by Ryan (github.com/wheresryan22/anatomy), MIT License"];
  if (opt("--shots")) { mkdirSync(out, { recursive: true }); const sj = path.join(out, "shots.json"); writeFileSync(sj, JSON.stringify(parseShots(opt("--shots")), null, 1)); args.push("--actions", sj); }
  for (const k of ["--repeat", "--name", "--poster"]) if (opt(k)) args.push(k, opt(k));
  if (argv.includes("--hide-hint")) args.push("--css", '[data-corner="hint"],[class$="-hint"],[class*="-hint "]{visibility:hidden}');
  // MIT asks for its notice to travel with copies of the code: a figure carries Anatomy's runtime, so its LICENSE goes along.
  const lic = [where(), ...[1, 2, 3, 4].map(n => path.resolve(path.dirname(path.resolve(f)), ...Array(n).fill("..")))].filter(Boolean).map(d => path.join(d, "LICENSE"))
    .find(l => existsSync(l) && /MIT License/.test(readFileSync(l, "utf8")) && /Ryan/.test(readFileSync(l, "utf8")));
  if (lic) args.push("--notice", lic); else console.error("note: Anatomy's LICENSE was not found next to the figure or the install; add its MIT notice to the exported folder yourself.");
  if (argv.includes("--check")) args.push("--check");
  const r = spawnSync("node", args, { stdio: "inherit" }); process.exit(r.status ?? 1);
}
die("commands: where | install | inspect | film | web");
