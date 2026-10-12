// Build characters from the Open Peeps and Humaaans illustration kits, LOCALLY, from the npm packages the user installs.
// Nothing third-party is bundled in Motionmaker: the art (CC0, by Pablo Stanley) and the renderer packages (MIT: react-peeps by Emre Cakir,
// humaaans by jktzes) are installed into a cache folder on the user's machine by `setup`, an explicit action.
//
//   node kit.mjs setup                         install react, react-peeps, humaaans, lottie-web, @rive-app/canvas into the kit cache and build the renderer
//   node kit.mjs list peeps|humaaans           every valid part name
//   node kit.mjs peep --hair ShortVolumed --face Cute --body Shirt --accessory GlassRoundThick --facial-hair Dali
//                     [--look swiss-minimal | --stroke "#1E1B18" --bg "#F4EFE6"|none] [--size 600] --out figure.svg
//   node kit.mjs human --head Afro --torso Hoodie --bottom BaggyPants [--posture standing|sitting] [--direction left|right] [--size 380] --out figure.svg
//   node kit.mjs where                         print the kit cache path
//
// Output is a clean <svg> with named layers (BODY/HEAD for peeps; HEAD/TORSO/BOTTOM for humaaans) so a template can animate the parts
// separately, plus <out>.json listing the parts used (feed it to ledger.mjs). Cache: $MOTIONMAKER_KITS or ~/.cache/motionmaker/kits.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KITS = path.resolve(process.env.MOTIONMAKER_KITS || path.join(os.homedir(), ".cache", "motionmaker", "kits"));
const argv = process.argv.slice(2), cmd = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const PINS = ["react@18", "react-dom@18", "react-peeps@0.1.10", "esbuild", "lottie-web@5.13.0", "@rive-app/canvas@2.44.2"];   // humaaans is fetched as a bare tarball (its npm dependencies are a full React toolchain we do not need)
const HUMAAANS_ROOT = () => path.join(KITS, "humaaans-src", "package", "src", "human", "body-parts");

function setup() {
  console.log(`Kit cache: ${KITS}\nInstalling (explicit user action): ${PINS.join(" ")}\nLicences: art = CC0 (Open Peeps, Humaaans: Pablo Stanley); code = MIT (react-peeps: Emre Cakir; humaaans npm: jktzes; lottie-web; @rive-app/canvas). Nothing is copied into your project except what you render.\n`);
  mkdirSync(KITS, { recursive: true });
  if (!existsSync(path.join(KITS, "package.json"))) writeFileSync(path.join(KITS, "package.json"), JSON.stringify({ name: "motionmaker-kits", private: true, version: "0.0.0" }));
  const r = spawnSync("npm", ["install", "--no-audit", "--no-fund", ...PINS], { cwd: KITS, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) die("npm install failed", r.status || 1);
  if (!existsSync(HUMAAANS_ROOT())) {                       // parts only: npm pack downloads the tarball without installing its dependencies
    const pk = spawnSync("npm", ["pack", "humaaans@1.7.0", "--silent", "--pack-destination", KITS], { cwd: KITS, encoding: "utf8", shell: process.platform === "win32" });
    if (pk.status !== 0) die("npm pack humaaans failed: " + (pk.stderr || "").slice(0, 200), 1);
    const tgz = path.join(KITS, pk.stdout.trim().split("\n").pop()); mkdirSync(path.join(KITS, "humaaans-src"), { recursive: true });
    const tx = spawnSync("tar", ["-xzf", tgz, "-C", path.join(KITS, "humaaans-src")], { stdio: "inherit" });
    if (tx.status !== 0) die("could not extract humaaans (needs `tar`)", 1);
  }
  build(); console.log(`\nDone. Try: node kit.mjs list peeps   |   node kit.mjs peep --hair ShortVolumed --face Cute --body Shirt --out figure.svg`);
}

function build() {
  const parts = ["head", "torso", "standing", "sitting"], root = HUMAAANS_ROOT();
  if (!existsSync(root)) die(`humaaans parts not found in ${root}: run \`kit.mjs setup\``);
  const imports = [], maps = {};
  for (const p of parts) { maps[p] = []; for (const f of readdirSync(path.join(root, p)).filter(x => x.endsWith(".js")).sort()) { const name = f.replace(/\.js$/, ""), id = `H_${p}_${name}`.replace(/\W/g, "_"); imports.push(`import ${id} from ${JSON.stringify(path.join(root, p, f))};`); maps[p].push(`${JSON.stringify(name)}: ${id}`); } }
  const entry = `import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PeepDefault, * as PeepsApi from "react-peeps";
${imports.join("\n")}
const Peep = PeepDefault.default || PeepDefault;
const humanParts = { ${parts.map(p => `${p}: { ${maps[p].join(", ")} }`).join(", ")} };
const h = React.createElement;
export const peepOptions = { hair: Object.keys(PeepsApi.Hair || {}), face: Object.keys(PeepsApi.Face || {}), accessory: Object.keys(PeepsApi.Accessories || {}), facialHair: Object.keys(PeepsApi.FacialHair || {}),
  body: { bust: Object.keys(PeepsApi.BustPose || {}), standing: Object.keys(PeepsApi.StandingPose || {}), sitting: Object.keys(PeepsApi.SittingPose || {}) } };
export const humanOptions = { head: Object.keys(humanParts.head), torso: Object.keys(humanParts.torso), bottomStanding: Object.keys(humanParts.standing), bottomSitting: Object.keys(humanParts.sitting) };
export const renderPeep = props => renderToStaticMarkup(h(Peep, props));
export function renderHuman({ head, torso, bottom, posture = "standing", direction = "right", size = 380 }) {
  const sitting = posture === "sitting", H = sitting ? 400 : 480, adj = sitting ? 24 : 31, W = 380;
  const flip = direction === "left" ? "translate(190.000000, 200.500000) scale(-1, 1) translate(-190.000000, -200.500000)" : "";
  const Head = humanParts.head[head], Torso = humanParts.torso[torso], Bottom = humanParts[sitting ? "sitting" : "standing"][bottom];
  return renderToStaticMarkup(h("svg", { height: size * (H / W), width: size, version: "1.1", viewBox: \`0 0 \${W} \${H}\`, xmlns: "http://www.w3.org/2000/svg" },
    h("g", { id: "humaaans", fillRule: "evenodd", strokeWidth: "1" }, h("g", { id: \`a-\${posture}-human\`, transform: \`\${flip} translate(40.000000, \${adj})\` },
      h("g", { id: "HEAD", transform: "translate(82.000000, 0.000000)" }, h(Head)), h("g", { id: "BOTTOM", transform: "translate(0.000000, 187.000000)" }, h(Bottom)), h("g", { id: "TORSO", transform: "translate(22.000000, 82.000000)" }, h(Torso))))));
}
`;
  writeFileSync(path.join(KITS, "kit-entry.js"), entry);
  const es = spawnSync(process.execPath, ["-e", `require("esbuild").build({entryPoints:[${JSON.stringify(path.join(KITS, "kit-entry.js"))}],bundle:true,platform:"node",format:"cjs",loader:{".js":"jsx"},outfile:${JSON.stringify(path.join(KITS, "kits.cjs"))},logLevel:"warning"}).catch(e=>{console.error(e.message);process.exit(1)})`], { cwd: KITS, stdio: "inherit" });
  if (es.status !== 0) die("kit build failed", es.status || 1);
}

function load() {
  const f = path.join(KITS, "kits.cjs");
  if (!existsSync(f)) die(`kits not built yet. Run:  node ${path.relative(process.cwd(), fileURLToPath(import.meta.url)) || "kit.mjs"} setup   (installs into ${KITS})`, 3);
  return createRequire(import.meta.url)(f);
}

// Tag the top-level child groups of the root <g> (peeps: body then head) so templates can animate them separately.
function tagGroups(svg, names) {
  const start = svg.indexOf("<g>"); if (start < 0) return svg;
  let depth = 0, idx = 0, out = svg.slice(0, start + 3), last = start + 3; const tok = /<(\/?)(g)\b([^>]*?)(\/?)>/g; tok.lastIndex = start + 3;
  for (let m; (m = tok.exec(svg));) { if (m[1]) { if (depth === 0) break; depth--; } else if (!m[4]) { if (depth === 0 && names[idx]) { out += svg.slice(last, m.index) + `<g id="${names[idx]}"${m[3]}>`; last = m.index + m[0].length; idx++; } depth++; } }
  return out + svg.slice(last);
}
const need = (v, name, valid) => { if (!v) die(`missing --${name}. Valid: ${valid.join(", ")}`); if (!valid.includes(v)) die(`unknown ${name} "${v}". Valid: ${valid.join(", ")}`); return v; };

function lookColors() {
  const name = opt("--look"); if (!name) return {};
  const L = JSON.parse(readFileSync(path.join(HERE, "../../motionmaker-art-director/looks/looks.json"), "utf8")).looks[name];
  if (!L) die(`unknown look "${name}"`); return { stroke: L.fg, bg: L.bg };
}

if (cmd === "setup") setup();
else if (cmd === "where") console.log(KITS);
else if (cmd === "list") {
  const K = load(), which = argv[1];
  if (which === "peeps") { const o = K.peepOptions; console.log(`hair: ${o.hair.join(" ")}\nface: ${o.face.join(" ")}\naccessory: ${o.accessory.join(" ")}\nfacial-hair: ${o.facialHair.join(" ")}\nbody (bust):     ${o.body.bust.join(" ")}\nbody (standing): ${o.body.standing.join(" ")}\nbody (sitting):  ${o.body.sitting.join(" ")}`); }
  else if (which === "humaaans") { const o = K.humanOptions; console.log(`head: ${o.head.join(" ")}\ntorso: ${o.torso.join(" ")}\nbottom (standing): ${o.bottomStanding.join(" ")}\nbottom (sitting): ${o.bottomSitting.join(" ")}`); }
  else die("usage: kit.mjs list peeps|humaaans");
} else if (cmd === "peep") {
  const K = load(), o = K.peepOptions, all = [...o.body.bust, ...o.body.standing, ...o.body.sitting], out = opt("--out", "figure.svg"), lc = lookColors();
  const props = { hair: need(opt("--hair"), "hair", o.hair), face: need(opt("--face"), "face", o.face), body: need(opt("--body"), "body", all), accessory: opt("--accessory") ? need(opt("--accessory"), "accessory", o.accessory) : "None", facialHair: opt("--facial-hair") ? need(opt("--facial-hair"), "facial-hair", o.facialHair) : "None",
    strokeColor: opt("--stroke", lc.stroke || "#1E1B18"), backgroundColor: opt("--bg", lc.bg || "#FFFFFF"), style: { width: +opt("--size", 600), height: +opt("--size", 600) * 1200 / 850 } };
  let svg = K.renderPeep(props); const i = svg.indexOf("<svg"); svg = svg.slice(i, svg.indexOf("</svg>", i) + 6).replace(/ style="[^"]*"/, "").replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(props.style.width)}" height="${Math.round(props.style.height)}" `);
  svg = tagGroups(svg, ["BODY", "HEAD"]);
  if (!svg.startsWith("<svg") || !svg.endsWith("</svg>") || (svg.match(/<g[ >]/g) || []).length !== (svg.match(/<\/g>/g) || []).length) die("internal error: produced an invalid SVG (unbalanced groups); not written");
  writeFileSync(out, svg); writeFileSync(out + ".json", JSON.stringify({ kit: "open-peeps", license: "CC0-1.0", creator: "Pablo Stanley", source: "https://www.openpeeps.com/", renderer: "react-peeps@0.1.10 (MIT, Emre Cakir)", parts: { hair: props.hair, face: props.face, body: props.body, accessory: props.accessory, facialHair: props.facialHair }, stroke: props.strokeColor, background: props.backgroundColor }, null, 1));
  console.log(`${out}  (${svg.length} bytes; layers BODY, HEAD)  +  ${out}.json`);
} else if (cmd === "human") {
  const K = load(), o = K.humanOptions, posture = opt("--posture", "standing"), out = opt("--out", "figure.svg");
  const params = { head: need(opt("--head"), "head", o.head), torso: need(opt("--torso"), "torso", o.torso), bottom: need(opt("--bottom"), "bottom", posture === "sitting" ? o.bottomSitting : o.bottomStanding), posture, direction: opt("--direction", "right"), size: +opt("--size", 380) };
  const svg = K.renderHuman(params); writeFileSync(out, svg);
  writeFileSync(out + ".json", JSON.stringify({ kit: "humaaans", license: "CC0-1.0", creator: "Pablo Stanley", source: "https://www.humaaans.com/", renderer: "humaaans@1.7.0 body-part components (MIT, jktzes), composed with the original layout", parts: params }, null, 1));
  console.log(`${out}  (${svg.length} bytes; layers HEAD, TORSO, BOTTOM)  +  ${out}.json   Skin tones and clothes are fixed colours: recolour with recolor.mjs only on purpose.`);
} else die("commands: setup | list peeps|humaaans | peep ... | human ... | where");
