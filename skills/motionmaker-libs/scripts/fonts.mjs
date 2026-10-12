// Ship the look's font with the project so type renders the same on every machine (no reliance on installed system fonts).
//
//   node fonts.mjs list                                   which font each look bundles, and whether it is installed
//   node fonts.mjs apply --look <name> --dir <project>    copy the look's font into <project>/fonts/, write fonts.css + FONTS.md; prints {"family","stack","glyphWidth"} as JSON
//   node fonts.mjs add <fontsource-name> <weight> --dir <project> [--as <css weight>]    add another font (e.g. jetbrains-mono 400 for code)
//
// Fonts come from Fontsource packages (OFL-1.1) installed by `lib.mjs setup fonts`. All subsets are copied (latin, latin-ext, cyrillic, greek,
// vietnamese where the font has them), so accented and non-Latin text uses the real font too. font-display is set to block so a frame is never
// captured in a fallback font.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findPkg } from "./kits.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOOKS = JSON.parse(readFileSync(path.join(HERE, "../../motionmaker-art-director/looks/looks.json"), "utf8")).looks;
const argv = process.argv.slice(2), cmd = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };

function addFont(pkgName, fileWeight, cssWeight, dir) {
  const pkg = findPkg(pkgName); if (!pkg) die(`${pkgName} is not installed. Run: node ${path.join(HERE, "lib.mjs")} setup fonts`, 3);
  const cssFile = path.join(pkg, `${fileWeight}.css`); if (!existsSync(cssFile)) die(`${pkgName} has no weight ${fileWeight}`);
  const short = pkgName.split("/").pop(), out = path.join(dir, "fonts"), sub = path.join(out, short); mkdirSync(sub, { recursive: true });
  const marker = `/* ${short}-${fileWeight}-as-${cssWeight} */`, fontsCss = path.join(out, "fonts.css");
  if (existsSync(fontsCss) && readFileSync(fontsCss, "utf8").includes(marker)) return;
  let css = readFileSync(cssFile, "utf8"); const family = (css.match(/font-family:\s*'([^']+)'/) || [])[1];
  css = css.replace(/src:\s*url\(\.\/files\/([^)]+\.woff2)\)\s*format\('woff2'\)[^;]*;/g, (m, f) => { copyFileSync(path.join(pkg, "files", f), path.join(sub, f)); return `src: url(./${short}/${f}) format('woff2');`; })
           .replace(/font-display:\s*swap/g, "font-display: block").replace(/font-weight:\s*\d+/g, `font-weight: ${cssWeight}`);
  appendFileSync(fontsCss, `${marker}\n${css}\n`);
  const pj = JSON.parse(readFileSync(path.join(pkg, "package.json"), "utf8"));
  appendFileSync(path.join(out, "FONTS.md"), `- ${family} ${fileWeight} (used as weight ${cssWeight}): ${pkgName}@${pj.version}, licence ${pj.license}. ${pj.homepage || ""}\n`);
  if (existsSync(path.join(pkg, "LICENSE")) && !existsSync(path.join(sub, "LICENSE"))) copyFileSync(path.join(pkg, "LICENSE"), path.join(sub, "LICENSE"));
  return family;
}

if (cmd === "list") {
  for (const [k, L] of Object.entries(LOOKS)) { const b = L.bundledFont; console.log(`${k.padEnd(16)} ${b ? `${b.family} ${b.fileWeight}`.padEnd(26) : "(none)".padEnd(26)} ${b && findPkg(b.package) ? "installed" : "not installed (lib.mjs setup fonts)"}`); }
} else if (cmd === "apply") {
  const name = opt("--look"), dir = opt("--dir"); if (!name || !dir) die("usage: fonts.mjs apply --look <name> --dir <project>");
  const L = LOOKS[name]; if (!L) die(`unknown look ${name}`); const b = L.bundledFont; if (!b) die(`look ${name} has no bundled font`, 3);
  addFont(b.package, b.fileWeight, L.weight, dir);
  console.log(JSON.stringify({ family: b.family, stack: `'${b.family}', ${L.font}`, glyphWidth: b.glyphWidth, css: "fonts/fonts.css" }));
} else if (cmd === "add") {
  const [, name, w] = argv, dir = opt("--dir"); if (!name || !w || !dir) die("usage: fonts.mjs add <fontsource-name> <weight> --dir <project> [--as <css weight>]");
  const fam = addFont(name.startsWith("@") ? name : `@fontsource/${name}`, w, opt("--as", w), dir); console.log(fam || "(already added)");
} else die("commands: list | apply | add");
