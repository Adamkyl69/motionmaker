// The asset ledger: every third-party illustration, animation or file in a piece is recorded with where it came from and under what licence.
// `check` fails (exit 1) if anything in assets/ is unrecorded, has an unknown licence, or needs a credit that has not been written down.
//
//   node ledger.mjs add <file> --source <page url> --creator "<name>" --license <id> [--attribution "credit text"] [--kind lottie|rive|svg|illustration|voice|other] [--notes "..."] [--dir <project dir>]
//   node ledger.mjs check [--dir <project dir>]      verify the ledger covers assets/ and the licences allow shipping; prints required credits
//   node ledger.mjs credits [--dir <project dir>]    the credit lines to put in the video end card / post description
//   node ledger.mjs report [--dir <project dir>]     write assets/ASSETS.md (a table you can hand to the client)
//   node ledger.mjs licenses                         the licences Motionmaker knows, with the date each was checked
//   node ledger.mjs sidecar <figure.svg.json> --dir <d>   add a kit.mjs figure (Open Peeps / Humaaans) from its sidecar file
//
// Licence ids: CC0-1.0, LOTTIEFILES-SIMPLE, UNDRAW, CC-BY-4.0, MIT, ELEVENLABS-PAID, ELEVENLABS-FREE, USER-OWNED, PAID-LICENSED, UNKNOWN. These are summaries, not legal advice; confirm on the asset's own page.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), LIC = JSON.parse(readFileSync(path.join(HERE, "../licenses.json"), "utf8"));
const argv = process.argv.slice(2), cmd = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const dir = path.resolve(opt("--dir", ".")), assets = path.join(dir, "assets"), LF = path.join(assets, "ASSETS.json");
const read = () => existsSync(LF) ? JSON.parse(readFileSync(LF, "utf8")) : { assets: [] };
const write = d => { mkdirSync(assets, { recursive: true }); writeFileSync(LF, JSON.stringify(d, null, 1)); };
const sha = f => createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 16);
const SKIP = new Set(["ASSETS.json", "ASSETS.md"]);
const files = () => existsSync(assets) ? readdirSync(assets).filter(f => !SKIP.has(f) && !f.endsWith(".svg.json") && statSync(path.join(assets, f)).isFile()) : [];
const needsCredit = l => l !== "UNKNOWN" && LIC.licenses[l] && LIC.licenses[l].attribution === "required";

function add(file, extra = {}) {
  if (!file || !existsSync(file)) die(`file not found: ${file}`);
  const id = extra.license || opt("--license"); if (!id) die(`missing --license. Known: ${Object.keys(LIC.licenses).join(", ")}`); if (!LIC.licenses[id]) die(`unknown licence "${id}". Known: ${Object.keys(LIC.licenses).join(", ")}`);
  const source = extra.source ?? opt("--source", ""), creator = extra.creator ?? opt("--creator", ""), name = path.basename(file);
  if (id !== "USER-OWNED" && !source) die("missing --source: the page URL where you got it (and where the licence is stated). Needed to prove the licence later.");
  if (id !== "USER-OWNED" && !creator) die("missing --creator: who made it.");
  mkdirSync(assets, { recursive: true }); const dest = path.join(assets, name); if (path.resolve(file) !== path.resolve(dest)) copyFileSync(file, dest);
  const d = read(), entry = { file: name, kind: extra.kind || opt("--kind", path.extname(name).slice(1)), source, creator, license: id, attribution: extra.attribution ?? opt("--attribution", ""), notes: extra.notes ?? opt("--notes", ""), sha256: sha(dest), recordedOn: new Date().toISOString().slice(0, 10), licenseCheckedByTool: LIC.checkedOn };
  d.assets = d.assets.filter(a => a.file !== name).concat(entry); write(d);
  console.log(`recorded ${name}: ${id}${needsCredit(id) ? "  (CREDIT REQUIRED: add --attribution)" : ""}`);
  if (needsCredit(id) && !entry.attribution) console.log(`WARN  ${LIC.licenses[id].name} requires attribution: re-run with --attribution "Title by Creator (source), CC BY 4.0"`);
  if (id === "UNKNOWN") console.log("WARN  UNKNOWN licence: this will block `check`. Find the licence on the source page first.");
}

function check() {
  const d = read(), problems = [], notes = []; const listed = new Map(d.assets.map(a => [a.file, a]));
  for (const f of files()) if (!listed.has(f)) problems.push(`${f}: in assets/ but not in the ledger (run: ledger.mjs add assets/${f} --source ... --creator ... --license ...)`);
  for (const a of d.assets) {
    const L = LIC.licenses[a.license], p = path.join(assets, a.file);
    if (!L) { problems.push(`${a.file}: unknown licence id "${a.license}"`); continue; }
    if (a.license === "UNKNOWN") problems.push(`${a.file}: licence UNKNOWN (do not ship)`);
    if (!existsSync(p)) problems.push(`${a.file}: listed but missing from assets/`); else if (sha(p) !== a.sha256) notes.push(`${a.file}: changed since it was recorded (recoloured or edited?). Fine if intended; derivative terms: ${L.derivatives}`);
    if (needsCredit(a.license) && !a.attribution) problems.push(`${a.file}: ${L.name} requires attribution but none is recorded`);
    if (a.license === "PAID-LICENSED" && !a.notes) problems.push(`${a.file}: PAID-LICENSED needs --notes with the licence name/plan and the terms URL`);
    if (L.derivatives === "same-terms" && a.sha256 && existsSync(p) && sha(p) !== a.sha256) notes.push(`${a.file}: modified copy of a ${L.name} file: the modified version keeps the same terms`);
    if (L.commercial === false) notes.push(`${a.file}: ${L.name}: NON-COMMERCIAL ONLY (${(L.restrictions || []).join("; ")})`);
    if (a.license === "UNDRAW") notes.push(`${a.file}: unDraw terms: no redistributing the source file in packs; our rendered video is fine; no AI/ML training use`);
    if (a.license === "LOTTIEFILES-SIMPLE") notes.push(`${a.file}: LottieFiles terms: keep the licence terms with the file if you share it; attribution not required but encouraged`);
  }
  console.log(`ledger: ${d.assets.length} asset(s) in ${assets}`); notes.forEach(n => console.log("note  " + n));
  const credits = creditLines(d); if (credits.length) { console.log("\nREQUIRED CREDITS (put these in the end card or the post):"); credits.filter(c => c.required).forEach(c => console.log("  " + c.text)); const opt = credits.filter(c => !c.required); if (opt.length) { console.log("optional credits:"); opt.forEach(c => console.log("  " + c.text)); } }
  if (problems.length) { console.log(""); problems.forEach(x => console.log("FAIL  " + x)); console.log(`\n${problems.length} problem(s): do not ship until fixed.`); process.exit(1); }
  const nonCommercial = d.assets.filter(a => LIC.licenses[a.license]?.commercial === false).map(a => a.file);
  if (nonCommercial.length) console.log(`\nPASS FOR NON-COMMERCIAL USE ONLY: ${nonCommercial.join(", ")} may not be used commercially (no client work, ads or monetised channels).`);
  else console.log("\nPASS  every asset is recorded with a known licence that allows shipping."); console.log("(Licence summaries were checked on " + LIC.checkedOn + "; confirm on each asset's own page. Not legal advice.)");
}
function creditLines(d) { return d.assets.filter(a => a.attribution || needsCredit(a.license) || (LIC.licenses[a.license]?.attribution === "optional")).map(a => ({ required: needsCredit(a.license), text: a.attribution || `${a.file} by ${a.creator || "?"} (${a.source})` })); }
function report() {
  const d = read(); const rows = d.assets.map(a => `| ${a.file} | ${a.kind} | ${a.creator || "-"} | ${a.source ? `[source](${a.source})` : "-"} | ${a.license} | ${LIC.licenses[a.license]?.attribution || "?"} | ${a.attribution || "-"} |`);
  const md = `# Asset ledger\n\nRecorded with Motionmaker's ledger; licence summaries checked ${LIC.checkedOn} (not legal advice).\n\n| File | Kind | Creator | Source | Licence | Credit | Credit text |\n|---|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
  mkdirSync(assets, { recursive: true }); writeFileSync(path.join(assets, "ASSETS.md"), md); console.log(path.join(assets, "ASSETS.md"));
}

if (cmd === "add") add(argv[1]);
else if (cmd === "sidecar") { const sc = JSON.parse(readFileSync(argv[1], "utf8")), svg = argv[1].replace(/\.json$/, ""); add(svg, { license: sc.license, source: sc.source, creator: sc.creator, kind: "illustration", notes: `${sc.kit}: ${JSON.stringify(sc.parts)}; renderer ${sc.renderer}` }); }
else if (cmd === "check") check();
else if (cmd === "credits") { const l = creditLines(read()); if (!l.length) console.log("(no credits needed)"); l.forEach(c => console.log(`${c.required ? "REQUIRED" : "optional"}: ${c.text}`)); }
else if (cmd === "report") report();
else if (cmd === "licenses") { console.log(`checked ${LIC.checkedOn} (summaries, not legal advice)\n`); for (const [k, v] of Object.entries(LIC.licenses)) console.log(`${k.padEnd(20)} commercial ${String(v.commercial).padEnd(6)} credit ${v.attribution.padEnd(15)} derivatives ${v.derivatives}`); console.log("\nSources:"); for (const [k, s] of Object.entries(LIC.sources)) console.log(`  ${k.padEnd(15)} ${s.license.padEnd(20)} ${s.url}`); }
else die("commands: add | sidecar | check | credits | report | licenses");
