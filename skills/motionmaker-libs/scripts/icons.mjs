// Icons from four open sets, cleaned for animation: currentColor, no fixed size, sidecar for the licence ledger.
//
//   node icons.mjs search <word> [--set lucide|tabler|phosphor|material]     names (and Lucide tags) that match
//   node icons.mjs get <set>:<name> [--style <s>] --out <file.svg>             e.g. lucide:rocket, tabler:bolt --style filled, phosphor:lightning --style bold, material:bolt --style rounded-fill
//
// Styles: lucide (outline only); tabler outline|filled; phosphor regular|thin|light|bold|fill|duotone; material outlined|rounded|sharp, add -fill for filled.
// Install a set first: node lib.mjs setup icons:lucide (or icons:tabler, icons:phosphor, icons:material, or icons for all).
// Writes <file.svg>.json for ledger.mjs sidecar (licence ISC / MIT / Apache-2.0: no credit required).
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";
import { findPkg } from "./kits.mjs";

const SETS = {
  lucide: { pkg: "lucide-static", group: "icons:lucide", license: "ISC", creator: "Lucide contributors", home: "https://lucide.dev", styles: ["outline"], file: (p, n) => path.join(p, "icons", `${n}.svg`), list: p => readdirSync(path.join(p, "icons")).map(f => f.replace(/\.svg$/, "")) },
  tabler: { pkg: "@tabler/icons", group: "icons:tabler", license: "MIT", creator: "Paweł Kuna (Tabler)", home: "https://tabler.io/icons", styles: ["outline", "filled"], file: (p, n, s) => path.join(p, "icons", s, `${n}.svg`), list: p => readdirSync(path.join(p, "icons", "outline")).map(f => f.replace(/\.svg$/, "")) },
  phosphor: { pkg: "@phosphor-icons/core", group: "icons:phosphor", license: "MIT", creator: "Phosphor Icons", home: "https://phosphoricons.com", styles: ["regular", "thin", "light", "bold", "fill", "duotone"], file: (p, n, s) => path.join(p, "assets", s, s === "regular" ? `${n}.svg` : `${n}-${s}.svg`), list: p => readdirSync(path.join(p, "assets", "regular")).map(f => f.replace(/\.svg$/, "")) },
  material: { pkg: "@material-symbols/svg-400", group: "icons:material", license: "APACHE-2.0", creator: "Google (Material Symbols)", home: "https://fonts.google.com/icons", styles: ["outlined", "rounded", "sharp", "outlined-fill", "rounded-fill", "sharp-fill"], file: (p, n, s) => { const [base, fill] = s.split("-"); return path.join(p, base, fill ? `${n}-fill.svg` : `${n}.svg`); }, list: p => readdirSync(path.join(p, "outlined")).filter(f => !f.endsWith("-fill.svg")).map(f => f.replace(/\.svg$/, "")) },
};
const argv = process.argv.slice(2), cmd = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const pkgOf = s => { const S = SETS[s]; if (!S) die(`unknown set ${s} (${Object.keys(SETS).join(", ")})`); const p = findPkg(S.pkg); if (!p) die(`${S.pkg} is not installed. Run: node ${path.join(path.dirname(new URL(import.meta.url).pathname), "lib.mjs")} setup ${S.group}`, 3); return p; };

if (cmd === "search") {
  const w = (argv[1] || "").toLowerCase(); if (!w) die("search <word>");
  for (const s of opt("--set") ? [opt("--set")] : Object.keys(SETS)) {
    const p = findPkg(SETS[s].pkg); if (!p) { console.log(`${s}: (not installed)`); continue; }
    let names = SETS[s].list(p).filter(n => n.includes(w));
    if (s === "lucide" && existsSync(path.join(p, "tags.json"))) { const tags = JSON.parse(readFileSync(path.join(p, "tags.json"), "utf8")); names = [...new Set([...names, ...Object.entries(tags).filter(([, t]) => t.some(x => x.includes(w))).map(([n]) => n)])]; }
    console.log(`${s} (${names.length}): ${names.slice(0, 40).map(n => `${s}:${n}`).join("  ")}${names.length > 40 ? "  ..." : ""}`);
  }
} else if (cmd === "get") {
  const [set, name] = (argv[1] || "").split(":"); if (!set || !name) die("get <set>:<name> --out file.svg");
  const S = SETS[set], p = pkgOf(set), style = opt("--style", S.styles[0]); if (!S.styles.includes(style)) die(`${set} styles: ${S.styles.join(" ")}`);
  const f = S.file(p, name, style); if (!existsSync(f)) die(`no ${set} icon "${name}" (${style}). Try: icons.mjs search ${name.split("-")[0]} --set ${set}`);
  let svg = readFileSync(f, "utf8").replace(/<!--[\s\S]*?-->/g, "").replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/g, "").replace(/\s(width|height|class)="[^"]*"/g, "").replace(/\s+/g, " ").trim();
  if (!/\b(fill|stroke)="currentColor"/.test(svg)) svg = svg.replace("<svg ", '<svg fill="currentColor" ');
  if (/<script|\son\w+=|javascript:/i.test(svg)) die("unexpected executable content in icon file");
  const out = opt("--out", `${set}-${name}.svg`); mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); writeFileSync(out, svg + "\n");
  const ver = JSON.parse(readFileSync(path.join(p, "package.json"), "utf8")).version;
  writeFileSync(out + ".json", JSON.stringify({ kit: `${set} icons`, license: S.license, source: S.home, creator: S.creator, parts: { name, style, package: `${S.pkg}@${ver}` }, renderer: "icons.mjs (copied and cleaned)" }, null, 1));
  console.log(`${out}  (${set}:${name} ${style}, ${S.license})`);
} else die("commands: search <word> [--set] | get <set>:<name> [--style] --out file.svg");
