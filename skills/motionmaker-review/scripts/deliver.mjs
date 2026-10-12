// The last door before a film is handed over. Refuses (exit 2) when something is red; otherwise writes DELIVERY.md whose facts are sealed with a hash.
//
//   node deliver.mjs <film.mp4> --dir <project> [--allow-blue-purple "reason"] [--override-review "reason"] [--override-provenance "reason"]
//   node deliver.mjs --verify <project>/DELIVERY.md        has anyone edited the facts, or swapped the film, since delivery?
//
// Red = film-gate RED; no independent review of THIS film (review/NN-review.md containing "Film: <first 12 of its sha256>"); the latest review
// says "Verdict: FIX" (override only with a stated reason, recorded); the licence ledger fails (when the project has assets/).
// The facts block is written by this script; the maker may write only under "Notes from the maker". Idea from huashu-art-motion's deliver.py (MIT).
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const H = b => createHash("sha256").update(b).digest("hex"), seal = facts => H(JSON.stringify(facts));
if (argv[0] === "--verify") {
  const f = argv[1]; if (!f || !existsSync(f)) { console.error("--verify <DELIVERY.md>"); process.exit(1); }
  const t = readFileSync(f, "utf8"), m = t.match(/```json facts\n([\s\S]*?)\n```/), s = (t.match(/^Seal: ([0-9a-f]{64})$/m) || [])[1];
  if (!m || !s) { console.log("TAMPERED: facts block or seal missing"); process.exit(2); }
  const facts = JSON.parse(m[1]); if (seal(facts) !== s) { console.log("TAMPERED: the facts were edited after delivery"); process.exit(2); }
  const film = path.resolve(path.dirname(f), facts.film.path); if (!existsSync(film)) { console.log(`MISSING: ${film}`); process.exit(2); }
  if (H(readFileSync(film)) !== facts.film.sha256) { console.log("CHANGED: the film is not the one that was delivered"); process.exit(2); }
  console.log("OK: facts sealed and the film matches"); process.exit(0);
}
const film = argv[0]; if (!film || !existsSync(film)) { console.error("usage: deliver.mjs <film.mp4> --dir <project> | --verify <DELIVERY.md>"); process.exit(1); }
const dir = path.resolve(opt("--dir", path.dirname(film))), sha = H(readFileSync(film)), red = [], yellow = [];
// 1. film gate
const gargs = [path.join(HERE, "film-gate.mjs"), film, "--json", path.join(dir, "film-gate.json")]; if (opt("--allow-blue-purple")) gargs.push("--allow-blue-purple", opt("--allow-blue-purple"));
spawnSync("node", gargs, { stdio: "inherit" }); const gate = JSON.parse(readFileSync(path.join(dir, "film-gate.json"), "utf8"));
gate.gates.forEach(g => { if (g.level === "RED") red.push(`film gate: ${g.id}: ${g.detail}`); if (g.level === "YELLOW") yellow.push(`film gate: ${g.id}: ${g.detail}`); });
// 2. independent review of this exact film
const rd = path.join(dir, "review"), reviews = existsSync(rd) ? readdirSync(rd).filter(f => /^\d+-review\.md$/.test(f)).sort() : [];
const mine = reviews.filter(f => readFileSync(path.join(rd, f), "utf8").includes(`Film: ${sha.slice(0, 12)}`)), latest = mine[mine.length - 1];
let reviewVerdict = null;
if (!latest) red.push(`no independent review of this film (expected review/NN-review.md containing "Film: ${sha.slice(0, 12)}"; run review-pack.mjs and a fresh subagent)`);
else { reviewVerdict = (readFileSync(path.join(rd, latest), "utf8").match(/^Verdict:\s*(SHIP|FIX)/mi) || [])[1]?.toUpperCase() || "MISSING";
  if (reviewVerdict !== "SHIP") { if (opt("--override-review")) yellow.push(`review ${latest} says ${reviewVerdict}; overridden: ${opt("--override-review")}`); else red.push(`review ${latest} says ${reviewVerdict}: fix, re-render, review again (or --override-review "reason")`); } }
// 3. licence ledger
let ledger = "no third-party assets folder";
if (existsSync(path.join(dir, "assets"))) { const r = spawnSync("node", [path.join(HERE, "../../motionmaker-assets/scripts/ledger.mjs"), "check", "--dir", dir], { encoding: "utf8" });
  ledger = r.status === 0 ? "PASS" : "FAIL"; if (r.status !== 0) red.push("licence ledger fails: run ledger.mjs check --dir " + dir); }
const credits = existsSync(path.join(dir, "assets")) ? spawnSync("node", [path.join(HERE, "../../motionmaker-assets/scripts/ledger.mjs"), "credits", "--dir", dir], { encoding: "utf8" }).stdout.trim().split("\n").filter(l => l.startsWith("REQUIRED")) : [];
// 3b. provenance of an imported OpenMontage film (motionmaker-montage): unknown or non-commercial material blocks; attribution needs go to the credits
const provFile = path.join(dir, "montage", "PROVENANCE.json"); let provenance = null;
if (existsSync(provFile)) { provenance = JSON.parse(readFileSync(provFile, "utf8")); for (const p of provenance.problems || []) { const t = typeof p === "string" ? { level: "RED", text: p } : p;
  if (t.level === "RED" && !opt("--override-provenance")) red.push(`provenance: ${t.text}`); else (t.level === "RED" ? yellow : yellow).push(`provenance: ${t.text}${t.level === "RED" ? ` (overridden: ${opt("--override-provenance")})` : ""}`); } }
// 4. probe
const pr = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate:format=duration,size", "-of", "json", film], { encoding: "utf8" }).stdout);
const vs = pr.streams.find(s => s.codec_type === "video"), as = pr.streams.find(s => s.codec_type === "audio");
console.log(""); red.forEach(r => console.log("RED     " + r)); yellow.forEach(y => console.log("YELLOW  " + y));
if (red.length) { console.log(`\nNOT DELIVERED: ${red.length} red item(s). Fix, re-render, re-review.`); process.exit(2); }
const facts = { film: { path: path.relative(dir, path.resolve(film)), sha256: sha, bytes: +pr.format.size, seconds: +(+pr.format.duration).toFixed(3), size: `${vs.width}x${vs.height}`, fps: vs.r_frame_rate, video: vs.codec_name, audio: as ? as.codec_name : "none" },
  filmGate: { verdict: gate.verdict, gates: gate.gates.map(g => ({ id: g.id, level: g.level, value: g.value })), allowBluePurple: gate.allowBluePurple },
  provenance: provenance ? { source: provenance.producedWith, assets: (provenance.assets || []).length, problems: (provenance.problems || []).length, costUsd: provenance.costUsd } : null, review: { file: latest, verdict: reviewVerdict, override: opt("--override-review") || null, rounds: reviews.length }, ledger, requiredCredits: credits, yellow, deliveredBy: "motionmaker deliver.mjs" };
const md = `# Delivery\n\n## Facts (written by deliver.mjs; do not edit: \`node deliver.mjs --verify DELIVERY.md\` detects changes)\n\n\`\`\`json facts\n${JSON.stringify(facts, null, 1)}\n\`\`\`\n\nSeal: ${seal(facts)}\n\n## Notes from the maker\n\n(what was cut, accepted compromises, known limits)\n`;
writeFileSync(path.join(dir, "DELIVERY.md"), md); console.log(`\nDELIVERED${yellow.length ? ` with ${yellow.length} yellow note(s)` : ""}: ${path.join(dir, "DELIVERY.md")}${credits.length ? "\nCredits to show: " + credits.join(" | ") : ""}`);
