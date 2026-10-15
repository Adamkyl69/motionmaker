// Bridge to OpenMontage (github.com/calesthio/OpenMontage, AGPLv3), a SEPARATE install the user sets up. Motionmaker never copies or runs its code:
// it routes the request, writes the brief for an OpenMontage session, imports the finished film and its provenance, and finishes/QA's it here.
//
//   node montage.mjs route "<what the user wants>"                   Motionmaker template or OpenMontage pipeline, and why
//   node montage.mjs check <openmontage dir>                          is it installed (files only; never reads .env)
//   node montage.mjs handoff --dir motion-out/<slug> --pipeline <name> [--budget 2] [--free-only] [--size 1080x1920] [--secs 30] [--message "..."]
//   node montage.mjs import <openmontage dir>/projects/<id> --dir motion-out/<slug>
//   node montage.mjs finish --film <mp4> [--intro a.mp4] [--outro b.mp4] --out <mp4>      join our title/end cards to their film (size, fps, audio matched)
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const argv = process.argv.slice(2), cmd = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
// Pipelines as listed in OpenMontage's pipeline_defs/ (checked 2026-10-12). Stability per its AGENT_GUIDE: beta = talking-head, clip-factory, podcast, character-animation, localization, documentary-montage.
const PIPES = {
  "cinematic": { what: "trailers, teasers, brand films, AI-generated live-action-looking scenes", needs: "a paid video model (Veo, Kling, Runway...) for real motion; image-only works but is stills", beta: false },
  "documentary-montage": { what: "a story cut from real stock and archive footage (Archive.org, NASA, Wikimedia, Pexels, Pixabay)", needs: "network; free keys for Pexels/Pixabay; torch for footage search", beta: true },
  "animated-explainer": { what: "narrated explainers with generated or stock visuals and TTS voice", needs: "free TTS (Piper) works; better voices are paid", beta: false },
  "avatar-spokesperson": { what: "a presenter avatar speaking a script", needs: "a paid avatar provider (e.g. HeyGen)", beta: false },
  "talking-head": { what: "editing YOUR talking-head recording (cuts, captions, b-roll)", needs: "your footage; transcription", beta: true },
  "podcast-repurpose": { what: "short clips from a podcast or long video", needs: "your recording; transcription", beta: true },
  "clip-factory": { what: "many short clips from one long source", needs: "your source video", beta: true },
  "localization-dub": { what: "translate and dub an existing video", needs: "TTS/voice provider; translation", beta: true },
  "screen-demo": { what: "narrated software demo from screen recordings", needs: "your recordings; TTS", beta: false },
  "character-animation": { what: "SVG character rigs acting out a script", needs: "local, free", beta: true },
  "hybrid": { what: "mixed: motion graphics + footage + narration", needs: "depends on the mix", beta: false },
};
const ROUTES = [
  [/talking head|my (own )?recording of me|selfie video|vlog/, "talking-head"], [/avatar|spokesperson|presenter (says|speaks)|digital human/, "avatar-spokesperson"],
  [/dub|translat|another language|locali[sz]/, "localization-dub"], [/podcast/, "podcast-repurpose"], [/clips? from (a|my|the) (long|full)|shorts from|highlights from/, "clip-factory"],
  [/documentary|archiv|stock footage|b-?roll|real footage of the world|historical footage/, "documentary-montage"],
  [/trailer|teaser|cinematic|live[- ]action|realistic (video|scene)|ai[- ]generated video|veo|sora|kling|runway|film scene/, "cinematic"],
  [/narrat|voice-?over|voiceover|explainer with (a )?voice|spoken/, "animated-explainer"],
];
const MM = [[/code|equation|formula|math/, "code-reveal / equation-scene"], [/map|globe|route|cities|countries/, "map-scene"], [/logo/, "logo-reveal"], [/chart|data|numbers|growth/, "data-chart"],
  [/screen recording|my app|product demo|click/, "footage-scene / product-demo"], [/van gogh|bauhaus|pointill|seurat|matisse|ukiyo|hokusai|constructiv|art style|painting/, "style-scene"], [/title|kinetic|type|headline|text/, "title-loop / gsap-kinetic"], [/3d|product shot|render of/, "three-product"], [/character|people|illustration|lottie|rive/, "illustration-scene / lottie-scene / rive-scene"], [/icons?|features/, "icon-features"]];
if (cmd === "route") {
  const q = (argv[1] || "").toLowerCase(); if (!q) die('route "<what the user wants>"');
  const om = ROUTES.find(([r]) => r.test(q)), mm = MM.find(([r]) => r.test(q));
  if (om) { const p = PIPES[om[1]]; console.log(`OpenMontage: ${om[1]}${p.beta ? " (beta)" : ""}\n  what: ${p.what}\n  needs: ${p.needs}\n  why: the request needs footage, generated video, voice or editing of real recordings, which Motionmaker does not make.`);
    if (mm) console.log(`  also: Motionmaker can make the ${mm[1]} parts (titles, cards, charts) and finish/QA the result (montage.mjs finish, film-gate, independent review).`); }
  else console.log(`Motionmaker: ${mm ? mm[1] : "title-loop or fresh code"}\n  why: motion graphics drawn in code (frame-exact, no API costs). Use OpenMontage only for footage, generated video, voice or avatars.`);
} else if (cmd === "check") {
  const d = argv[1]; if (!d) die("check <openmontage dir>");
  const has = p => existsSync(path.join(d, p)), lic = has("LICENSE") ? readFileSync(path.join(d, "LICENSE"), "utf8").slice(0, 200) : "";
  const rows = [["AGENT_GUIDE.md", has("AGENT_GUIDE.md")], ["pipeline_defs/", has("pipeline_defs")], ["Python env (.venv)", has(".venv")], ["Remotion composer installed (remotion-composer/node_modules)", has("remotion-composer/node_modules")], ["projects/ (runs so far)", has("projects")], ["licence is AGPLv3", /AFFERO/.test(lic)]];
  rows.forEach(([k, v]) => console.log(`${v ? "OK  " : "MISS"}  ${k}`));
  if (!has("AGENT_GUIDE.md")) console.log(`\nNot an OpenMontage folder. Install (the user runs this; it downloads Python and npm packages and is AGPLv3):\n  git clone https://github.com/calesthio/OpenMontage && cd OpenMontage && make setup && make preflight`);
  else if (!has(".venv") || !has("remotion-composer/node_modules")) console.log(`\nInstalled but not set up: cd ${d} && make setup && make preflight   (preflight lists which providers your keys unlock)`);
  if (has("projects")) console.log(`projects: ${readdirSync(path.join(d, "projects")).filter(f => !f.startsWith(".")).join(", ") || "(none)"}`);
  console.log("\n(.env is never read here. Keys are configured by the user in OpenMontage's own .env.)");
} else if (cmd === "handoff") {
  const dir = opt("--dir"), pipe = opt("--pipeline"); if (!dir || !pipe) die("handoff --dir motion-out/<slug> --pipeline <name>"); if (!PIPES[pipe]) die(`unknown pipeline ${pipe}: ${Object.keys(PIPES).join(", ")}`);
  const ad = existsSync(path.join(dir, "AD-BRIEF.md")) ? readFileSync(path.join(dir, "AD-BRIEF.md"), "utf8") : "", grab = (re, d = "") => (ad.match(re) || [])[1]?.trim() || d;
  const message = opt("--message", grab(/(?:one message|single[- ]minded message|message)[^:\n]*:\s*(.+)/i, "(state the single message)")), hexes = [...new Set(ad.match(/#[0-9A-Fa-f]{6}\b/g) || [])].slice(0, 6);
  const budget = opt("--budget", "2"), size = opt("--size", "1080x1920"), secs = opt("--secs", "30"), free = argv.includes("--free-only"), slug = path.basename(path.resolve(dir));
  const prompt = `Read AGENT_GUIDE.md first and follow it (including the mandatory preflight and every approval gate).

Make a ${secs}-second ${pipe} video, ${size}, project id "${slug}".
Message (the one thing the viewer must take away): ${message}
${hexes.length ? `Visual system from our art director (match it in titles, captions and graphics): palette ${hexes.join(" ")}.` : ""}
${ad ? "The full art-direction brief is below; treat its tone words, references and bans as hard constraints." : ""}

Constraints:
- Budget: hard cap $${budget} for the whole run. Announce every paid call with its cost before making it, and ask before any single action over $0.50.
${free ? "- Free providers only (Piper TTS, Archive.org/NASA/Wikimedia, Pexels/Pixabay with free keys, Remotion/ffmpeg). Do not use paid providers at all.\n" : ""}- Stop at every approval gate (proposal, script, scene plan, assets) and wait for me.
- Do not download videos I do not own or have rights to (no yt-dlp of other people's content). Record provenance and licence for every asset in artifacts/asset_manifest.json.
- Do not run generated code with allow_unsafe_code; if a tool needs it, stop and ask.
- No real people's likenesses or voices, no brand marks other than ours.
- Deliver projects/${slug}/renders/final.mp4 plus artifacts/asset_manifest.json and artifacts/cost_log.json. Leave the last 3 seconds clean (no captions): we add our own end card.
${ad ? "\n--- art-direction brief ---\n" + ad.slice(0, 6000) : ""}`;
  mkdirSync(dir, { recursive: true }); writeFileSync(path.join(dir, "OPENMONTAGE-HANDOFF.md"), `# Handoff to OpenMontage (${pipe})\n\nOpen a NEW Claude Code session inside your OpenMontage folder and paste the prompt below. Its rules (AGENT_GUIDE.md) apply there; Motionmaker's apply here.\nWhen it finishes: \`node montage.mjs import <openmontage>/projects/${slug} --dir ${dir}\`.\n\nPipeline: ${pipe}${PIPES[pipe].beta ? " (beta in OpenMontage)" : ""}. Needs: ${PIPES[pipe].needs}.\n\n## Prompt\n\n\`\`\`\n${prompt}\n\`\`\`\n`);
  console.log(`${path.join(dir, "OPENMONTAGE-HANDOFF.md")}\nNext: open Claude Code in your OpenMontage folder, paste the prompt from that file, answer its gates; then run montage.mjs import.`);
} else if (cmd === "import") {
  const proj = argv[1], dir = opt("--dir"); if (!proj || !dir) die("import <openmontage>/projects/<id> --dir motion-out/<slug>");
  const film = path.join(proj, "renders", "final.mp4"); if (!existsSync(film)) die(`no ${film}: the OpenMontage run has not rendered yet`);
  const md = path.join(dir, "montage"); mkdirSync(md, { recursive: true }); copyFileSync(film, path.join(md, "final.mp4"));
  // OpenMontage keeps the asset manifest inside the assets stage's checkpoint (checkpoint_assets.json -> artifacts.asset_manifest), checked
  // against its schema when written; older or hand-made runs may also have artifacts/asset_manifest.json. Read whichever exists (checkpoint first).
  const rows = [], problems = [], readJ = f => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
  const cps = existsSync(proj) ? readdirSync(proj).filter(f => /^checkpoint_.*\.json$/.test(f)).sort((a, b) => (a === "checkpoint_assets.json" ? -1 : b === "checkpoint_assets.json" ? 1 : 0)) : [];
  let m = null, manFrom = null; for (const f of cps) { const c = readJ(path.join(proj, f)); if (c?.artifacts?.asset_manifest) { m = c.artifacts.asset_manifest; manFrom = f; break; } }
  if (!m && existsSync(path.join(proj, "artifacts", "asset_manifest.json"))) { m = readJ(path.join(proj, "artifacts", "asset_manifest.json")); manFrom = "artifacts/asset_manifest.json"; }
  const cost = [path.join(proj, "artifacts", "cost_log.json"), path.join(proj, "cost_log.json")].find(existsSync), man = m ? true : false;
  if (m) { for (const a of m.assets || []) { const ai = !!a.model, lic = a.license || (ai ? `AI-generated (${a.provider || "?"} / ${a.model})` : "");
      rows.push({ id: a.id, type: a.type, path: a.path, provider: a.provider || a.source_tool || "?", license: lic || "UNKNOWN", url: a.original_url || "", model: a.model || "", cost: a.cost_usd ?? null });
      if (!lic) problems.push({ level: "RED", text: `${a.id} (${a.path}): no licence recorded` }); if (/non-?commercial|-NC\b|\bNC\b/i.test(lic)) problems.push({ level: "RED", text: `${a.id}: licence "${lic}" forbids commercial use` }); if (/CC[- ]BY/i.test(lic) && !/CC0/i.test(lic)) problems.push({ level: "YELLOW", text: `${a.id}: "${lic}" requires attribution: credit ${a.original_url || a.provider}` }); } }
  else problems.push({ level: "RED", text: "no asset manifest (checkpoint_assets.json or artifacts/asset_manifest.json): provenance of the footage, images, voice and music is unknown" });
  const spent = cost ? readJ(cost) : null;
  const prov = { source: path.resolve(proj), manifestFrom: manFrom, film: "montage/final.mp4", assets: rows, problems, costUsd: spent?.total_spent_usd ?? spent?.total_usd ?? m?.total_cost_usd ?? null, importedOn: new Date().toISOString().slice(0, 10), producedWith: "OpenMontage (AGPLv3, separate install)" };
  writeFileSync(path.join(md, "PROVENANCE.json"), JSON.stringify(prov, null, 1));
  writeFileSync(path.join(md, "PROVENANCE.md"), `# Provenance of the OpenMontage film\n\n| Asset | Type | Provider | Licence | Source |\n|---|---|---|---|---|\n${rows.map(r => `| ${r.id} | ${r.type} | ${r.provider} | ${r.license} | ${r.url || r.model || "-"} |`).join("\n") || "| (none) | | | | |"}\n\n${problems.length ? "## Problems\n" + problems.map(p => `- ${p.level}: ${p.text}`).join("\n") + "\n" : "No licence problems found in the manifest (it is only as good as what the run recorded).\n"}`);
  console.log(`${path.join(md, "final.mp4")}\n${rows.length} assets in the manifest${prov.costUsd !== null ? `, cost $${prov.costUsd}` : ""}; ${problems.length} problem(s)${problems.length ? ":\n  " + problems.map(p => `${p.level}  ${p.text}`).join("\n  ") : ""}\nNext: node montage.mjs finish --film ${path.join(md, "final.mp4")} [--intro ...] --outro <our end card mp4> --out ${path.join(dir, "out", "final.mp4")}, then film-gate, review-pack + independent review, deliver.`);
} else if (cmd === "finish") {
  const film = opt("--film"), out = opt("--out"), parts = [opt("--intro"), film, opt("--outro")].filter(Boolean); if (!film || !out) die("finish --film <mp4> [--intro] [--outro] --out <mp4>");
  for (const p of parts) if (!existsSync(p)) die(`not found: ${p}`);
  const pr = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", film], { encoding: "utf8" }).stdout).streams[0];
  const [W, H] = [pr.width, pr.height], fps = pr.r_frame_rate, hasA = p => spawnSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", p], { encoding: "utf8" }).stdout.trim() !== "";
  const args = ["-v", "error", "-y"], fc = []; parts.forEach(p => args.push("-i", p));
  parts.forEach((p, i) => { fc.push(`[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},format=yuv420p[v${i}]`);
    fc.push(hasA(p) ? `[${i}:a]aresample=48000,aformat=channel_layouts=stereo[a${i}]` : `anullsrc=r=48000:cl=stereo,atrim=0:${spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], { encoding: "utf8" }).stdout.trim()}[a${i}]`); });
  fc.push(`${parts.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${parts.length}:v=1:a=1[v][a]`);
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const r = spawnSync("ffmpeg", [...args, "-filter_complex", fc.join(";"), "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], { stdio: "inherit" });
  if (r.status !== 0) die("ffmpeg failed", r.status || 1); console.log(`${out}  (${parts.length} parts at ${W}x${H}, ${fps} fps; audio kept, silent parts padded)`);
} else die("commands: route | check | handoff | import | finish");
