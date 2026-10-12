// Syntax-highlight code for a code reveal, AHEAD of time in Node (Shiki), so the scene only draws coloured spans: nothing to load or run per frame.
//
//   node code.mjs tokens <file> --out <project>/code.json [--lang ts] [--theme github-dark-default | --look <name>] [--lines 3-18]
//   node code.mjs themes                       the bundled Shiki themes
//
// --look picks a legible theme for the look (dark looks: github-dark-default, light looks: github-light-default). Tabs become 2 spaces.
// The code must be the user's own or licensed for use; record it like any asset if it is not theirs.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { need } from "./kits.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), cmd = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const shiki = await import(pathToFileURL(path.join(need("shiki", "code"), "dist/index.mjs")).href);
const EXT = { ts: "ts", tsx: "tsx", js: "js", mjs: "js", jsx: "jsx", py: "python", rb: "ruby", go: "go", rs: "rust", java: "java", kt: "kotlin", swift: "swift", c: "c", h: "c", cpp: "cpp", cs: "csharp", php: "php", sh: "bash", bash: "bash", zsh: "bash", json: "json", yml: "yaml", yaml: "yaml", toml: "toml", html: "html", css: "css", scss: "scss", sql: "sql", md: "markdown", vue: "vue", svelte: "svelte", dart: "dart", lua: "lua", r: "r", ex: "elixir" };
if (cmd === "themes") { console.log(Object.keys(shiki.bundledThemes).join(" ")); process.exit(0); }
if (cmd !== "tokens") die("commands: tokens <file> --out code.json [--lang] [--theme|--look] [--lines a-b] | themes");
const file = argv[1]; if (!file) die("tokens needs a file");
let code = readFileSync(file, "utf8").replace(/\r\n/g, "\n").replace(/\t/g, "  ").replace(/\s+$/, "");
const range = opt("--lines"); if (range) { const [a, b] = range.split("-").map(Number); code = code.split("\n").slice(a - 1, b || a).join("\n"); }
const lang = opt("--lang", EXT[path.extname(file).slice(1).toLowerCase()] || "text");
let theme = opt("--theme");
if (!theme) { const look = opt("--look"); if (look) { const L = JSON.parse(readFileSync(path.join(HERE, "../../motionmaker-art-director/looks/looks.json"), "utf8")).looks[look]; if (!L) die(`unknown look ${look}`);
  const lum = h => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; }; theme = lum(L.bg) < 0.5 ? "github-dark-default" : "github-light-default"; } else theme = "github-dark-default"; }
if (!shiki.bundledThemes[theme]) die(`unknown theme ${theme}. See: code.mjs themes`);
if (lang !== "text" && !shiki.bundledLanguages[lang]) die(`unknown language ${lang}`);
const r = await shiki.codeToTokens(code, { lang, theme });
const lines = r.tokens.map(line => line.map(t => { const o = { t: t.content, c: t.color }; if (t.fontStyle & 1) o.i = 1; if (t.fontStyle & 2) o.b = 1; return o; }));
const out = { lang, theme, bg: r.bg, fg: r.fg, lines, longest: Math.max(...code.split("\n").map(l => l.length)), count: lines.length, generatedBy: "shiki (MIT), ahead of time" };
const dest = opt("--out", "code.json"); mkdirSync(path.dirname(path.resolve(dest)), { recursive: true }); writeFileSync(dest, JSON.stringify(out));
console.log(`${dest}: ${out.count} lines, longest ${out.longest} chars, ${lang}, theme ${theme}`);
if (out.count > 18) console.log("note: more than 18 lines will be small on a phone. Show the part that matters (--lines a-b).");
