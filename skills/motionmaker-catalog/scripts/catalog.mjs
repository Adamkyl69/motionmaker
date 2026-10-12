// Search the awesome-ai-motion field guide (637 effect cards, 11 recipes) and prepare a chosen effect for our pipeline.
// This script only READS the catalog's index.json (data) and COPIES files. It never executes the catalog's HTML/JS.
//
//   node catalog.mjs search <keywords...> [--purpose emphasis] [--media product] [--family camera] [--level basic] [--rendered] [--limit 8]
//   node catalog.mjs show <slug>                 card: meaning, when to use, parameters, easing, snippet, prompts, what to avoid
//   node catalog.mjs recipes                     the 11 timed recipes;   node catalog.mjs recipe <slug>   steps + prompts
//   node catalog.mjs adopt <slug|recipe:slug> <destdir>   copy the example HTML (+ shared lib) into destdir/anim.html with ../../lib -> ./lib
//   node catalog.mjs families | purposes | media
//
// Catalog location: --repo <dir>, $AWESOME_AI_MOTION, ./awesome-ai-motion, or ~/.cache/awesome-ai-motion
//   (get it with: git clone --depth 1 https://github.com/gongnyang/awesome-ai-motion.git ~/.cache/awesome-ai-motion)
import { readFileSync, existsSync, mkdirSync, cpSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const a = process.argv.slice(2), cmd = a[0];
const flag = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; }, has = k => a.includes(k);
const roots = [flag("--repo"), process.env.AWESOME_AI_MOTION, "awesome-ai-motion", path.join(os.homedir(), ".cache/awesome-ai-motion")].filter(Boolean);
const repo = roots.find(r => existsSync(path.join(r, "index.json")));
if (!repo) { console.error("catalog not found. Clone it (ask the user first):\n  git clone --depth 1 https://github.com/gongnyang/awesome-ai-motion.git ~/.cache/awesome-ai-motion\nor pass --repo <dir> / set AWESOME_AI_MOTION"); process.exit(3); }
const J = JSON.parse(readFileSync(path.join(repo, "index.json"), "utf8"));

// English -> the catalog's Korean source labels
const PURPOSE = { mood: "분위기", sequence: "순서·흐름", flow: "순서·흐름", attention: "주목 끌기", explain: "설명", compare: "비교", feedback: "피드백", emphasis: "강조", transition: "전환", branding: "브랜딩", data: "데이터 증명", proof: "데이터 증명" };
const MEDIA = { explainer: "설명 영상", short: "숏폼", shorts: "숏폼", deck: "스크롤덱", scrolldeck: "스크롤덱", presentation: "발표", product: "제품 시연", demo: "제품 시연", data: "데이터 스토리", web: "웹 UI", ui: "웹 UI" };
const LEVEL = { basic: "기본", intermediate: "중급", advanced: "고급" };

const fam = k => J.families[k]?.en || k;
const line = e => `${e.slug.padEnd(30)} ${(e.en || "").padEnd(34)} [${fam(e.family)} | ${e.level === "기본" ? "basic" : e.level === "중급" ? "intermediate" : "advanced"} | ${e.render === "done" ? "clip+HTML" : "card only"}]\n    ${e.oneLinerEn || ""}`;
const inv = (m, v) => Object.keys(m).find(k => m[k] === v) || v;

function search() {
  const stop = new Set(["a", "an", "the", "of", "to", "and", "for", "with", "in", "on", "that", "it", "is", "my", "me"]);
  const words = a.slice(1).filter((x, i, arr) => !x.startsWith("--") && !(arr[i - 1] || "").startsWith("--")).join(" ").toLowerCase().split(/[^a-z0-9]+/).filter(w => w && !stop.has(w));
  const purpose = flag("--purpose") && (PURPOSE[flag("--purpose")] || flag("--purpose")), media = flag("--media") && (MEDIA[flag("--media")] || flag("--media"));
  const family = flag("--family"), level = flag("--level") && (LEVEL[flag("--level")] || flag("--level")), limit = +flag("--limit", 8);
  let pool = J.effects.filter(e => (!purpose || e.purposes?.includes(purpose)) && (!media || e.media?.includes(media)) && (!family || e.family === family) && (!level || e.level === level) && (!has("--rendered") || e.render === "done"));
  const scored = pool.map(e => {
    const f = { slug: (e.slug + " " + (e.en || "")).toLowerCase(), aka: (e.aka || []).join(" ").toLowerCase(), one: ((e.oneLinerEn || "") + " " + (e.conveysEn || "")).toLowerCase(), use: (e.useWhenEn || []).join(" ").toLowerCase(), fam: (fam(e.family) + " " + (J.families[e.family]?.descEn || "")).toLowerCase() };
    let s = 0; for (const w of words) { if (f.slug.includes(w)) s += 5; if (f.aka.includes(w)) s += 2; if (f.one.includes(w)) s += 2; if (f.use.includes(w)) s += 2; if (f.fam.includes(w)) s += 1; }
    return { e, s };
  }).filter(x => !words.length || x.s > 0).sort((x, y) => y.s - x.s || (y.e.render === "done") - (x.e.render === "done"));
  console.log(`${scored.length} match(es) of ${pool.length} filtered / ${J.effects.length} total; showing ${Math.min(limit, scored.length)}${words.length ? " for: " + words.join(" ") : ""}\n`);
  scored.slice(0, limit).forEach(({ e, s }) => console.log(line(e) + (words.length ? `   (score ${s})` : "")));
  if (!scored.length) console.log("no match: try broader words, drop a filter, or run `families` / `purposes` / `media` to see the vocabulary");
}
function find(slug) { const e = J.effects.find(x => x.slug === slug); if (!e) { console.error(`unknown effect '${slug}'. Try: node catalog.mjs search <words>`); process.exit(1); } return e; }
function show() {
  const e = find(a[1]);
  console.log(`# ${e.en} (${e.slug})  [${fam(e.family)} | ${e.level} | ${e.render === "done" ? "has HTML + rendered clip" : "card only (no HTML example)"}]\n`);
  console.log(e.oneLinerEn + "\nConveys: " + e.conveysEn + "\nPurposes: " + (e.purposes || []).map(p => inv(PURPOSE, p)).join(", ") + "   Media: " + (e.media || []).map(p => inv(MEDIA, p)).join(", "));
  console.log("\nUse when:\n" + (e.useWhenEn || []).map(x => "  - " + x).join("\n"));
  console.log("\nDefaults (name is the catalog's Korean label; default / range / note):\n" + (e.params || []).map(p => `  - ${p.name}: ${p.default}  (${p.range})  ${p.note || ""}`).join("\n"));
  console.log("\nEase: " + e.ease + "\n\nSnippet:\n" + e.snippet);
  console.log("\nAvoid (Korean source text; translate when quoting):\n" + (e.avoid || []).map(x => "  - " + x).join("\n"));
  console.log("\nPrompt (claude):\n" + (e.promptsEn?.claude || e.prompts?.claude || ""));
  console.log("\nPairs with: " + (e.pairsWith || []).join(", "));
  const dir = path.join(repo, "effects", e.slug); console.log("\nFiles: " + dir + (existsSync(path.join(dir, "index.html")) ? "  (index.html available: `adopt " + e.slug + " <dir>`)" : "  (no index.html)"));
  console.log("Sources/licences: see " + path.join(repo, "ATTRIBUTIONS.md") + " and the card's sources list; GSAP and bundled fonts keep their own licences.");
}
function recipes() { J.recipes.forEach(r => console.log(`${r.slug.padEnd(20)} ${(r.en || "").padEnd(30)} ${r.duration || ""}  ${r.oneLinerEn || ""}`)); }
function recipe() {
  const r = J.recipes.find(x => x.slug === a[1]); if (!r) { console.error("unknown recipe. Run `recipes`."); process.exit(1); }
  console.log(`# ${r.en} (${r.slug})  ${r.duration || ""}\n${r.oneLinerEn}\nStyle: ${r.styleEn || ""}\nStructure: ${r.structureEn || ""}\nMedia: ${(r.media || []).map(p => inv(MEDIA, p)).join(", ")}\n\nSteps (Korean source):\n${JSON.stringify(r.steps, null, 1)}\n\nPrompt (claude):\n${r.promptsEn?.claude || r.prompts?.claude || ""}\n\nFiles: ${path.join(repo, "recipes", r.slug)}`);
}
function adopt() {
  const [what, dest] = [a[1], a[2]]; if (!what || !dest) { console.error("usage: adopt <slug|recipe:slug> <destdir>"); process.exit(1); }
  const isRecipe = what.startsWith("recipe:"), slug = what.replace("recipe:", ""), src = path.join(repo, isRecipe ? "recipes" : "effects", slug, "index.html");
  if (!existsSync(src)) { console.error(`no example HTML for ${what} (card-only effects have no HTML): build it from the card's snippet/prompt instead`); process.exit(1); }
  mkdirSync(dest, { recursive: true });
  const html = readFileSync(src, "utf8").replace(/\.\.\/\.\.\/lib\//g, "./lib/");
  writeFileSync(path.join(dest, "anim.html"), html); cpSync(path.join(repo, "lib"), path.join(dest, "lib"), { recursive: true });
  const renderer = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../motionmaker-build/scripts/render.mjs");
  const dur = (html.match(/data-dur="([\d.]+)"/) || [])[1] || "3", size = (html.match(/data-size="([^"]+)"/) || [])[1] || "1280x720";
  writeFileSync(path.join(dest, "SOURCE.md"), `Adopted from awesome-ai-motion (${isRecipe ? "recipe" : "effect"} '${slug}', MIT; GSAP and bundled fonts keep their own licences; see its ATTRIBUTIONS.md).\nCopied unmodified except lib paths (../../lib -> ./lib). Edit text/images/data in anim.html and keep the timeline.\n`);
  console.log(`${dest}/anim.html (+ lib/, SOURCE.md)\nduration ${dur}s, size ${size}, 30 fps\nrender through our pipeline (a third-party page: run it only with the user's OK):\n  node ${renderer} ${dest}/anim.html ${dur} 30 --size auto --out ${dest}/out/frames`);
}
const table = { search, show, recipes, recipe, adopt,
  families: () => Object.entries(J.families).forEach(([k, v]) => console.log(`${k.padEnd(12)} ${v.en.padEnd(18)} ${v.descEn}`)),
  purposes: () => console.log(Object.entries(PURPOSE).map(([k, v]) => `${k} -> ${v}`).join("\n")),
  media: () => console.log(Object.entries(MEDIA).map(([k, v]) => `${k} -> ${v}`).join("\n")) };
(table[cmd] || (() => { console.error("commands: " + Object.keys(table).join(" | ")); process.exit(1); }))();
