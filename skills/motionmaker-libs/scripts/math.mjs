// Typeset an equation AHEAD of time with KaTeX, so the scene only reveals ready-made HTML.
//
//   node math.mjs render "<TeX>" --dir <project>        writes <project>/math/eq.html and vendors KaTeX's CSS + fonts into <project>/vendor/katex/
//
// Mark the part to emphasise with \htmlClass{hl}{...}: the equation-scene template colours it with the look's accent after the reveal.
// Example: E = \htmlClass{hl}{mc^2}     or     \int_0^1 x^2\,dx = \htmlClass{hl}{\tfrac{1}{3}}
import { writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { need } from "./kits.mjs";

const argv = process.argv.slice(2), [cmd, tex] = argv, opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
if (cmd !== "render" || !tex) die('usage: math.mjs render "<TeX>" --dir <project>');
const dir = opt("--dir"); if (!dir) die("--dir <project> is required");
const pkg = need("katex", "math"), katex = createRequire(import.meta.url)(path.join(pkg, "dist/katex.js"));
let html; try {
  html = katex.renderToString(tex, { displayMode: true, output: "html", throwOnError: true, strict: "ignore", trust: c => c.command === "\\htmlClass" && c.class === "hl" });   // only our own highlight class is trusted
} catch (e) { die("KaTeX could not typeset it: " + e.message); }
mkdirSync(path.join(dir, "math"), { recursive: true }); writeFileSync(path.join(dir, "math", "eq.html"), html);
const v = path.join(dir, "vendor", "katex"); if (!existsSync(path.join(v, "katex.min.css"))) { mkdirSync(v, { recursive: true }); cpSync(path.join(pkg, "dist", "katex.min.css"), path.join(v, "katex.min.css")); cpSync(path.join(pkg, "dist", "fonts"), path.join(v, "fonts"), { recursive: true, filter: s => !/\.(ttf|woff)$/.test(s) }); }
console.log(`${path.join(dir, "math", "eq.html")}  (${html.length} bytes; KaTeX MIT, fonts OFL)`);
