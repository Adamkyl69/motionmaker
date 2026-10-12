// Install and list the optional libraries Motionmaker can use (fonts, code highlighting, equations, maps, sketch, icon sets).
//
//   node lib.mjs list                         every group, what it is for, licence, size, and whether it is installed
//   node lib.mjs setup <group> [<group>...]   install pinned packages into the kit cache (explicit user action; groups: fonts code math maps sketch icons:lucide icons:phosphor icons:tabler icons:material, or "all", or "icons")
//   node lib.mjs where                        print the kit cache path
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KITS, findPkg } from "./kits.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), REG = JSON.parse(readFileSync(path.join(HERE, "../libs.json"), "utf8"));
const [cmd, ...rest] = process.argv.slice(2);
const installed = g => Object.keys(REG.groups[g].packages).every(p => findPkg(p));
if (cmd === "list") {
  console.log(`kit cache: ${KITS}   (licences checked ${REG.checkedOn})\n`);
  for (const [k, g] of Object.entries(REG.groups)) console.log(`${installed(k) ? "[x]" : "[ ]"} ${k.padEnd(16)} ~${String(g.approxMB).padStart(3)} MB  ${g.license.padEnd(10)}  ${g.what}`);
  console.log("\ninstall: node lib.mjs setup <group...>   (ask the user first: it downloads from npm)");
} else if (cmd === "setup") {
  let groups = rest.flatMap(g => g === "all" ? Object.keys(REG.groups) : g === "icons" ? Object.keys(REG.groups).filter(k => k.startsWith("icons:")) : [g]);
  const bad = groups.filter(g => !REG.groups[g]); if (!groups.length || bad.length) { console.error(`unknown or missing group: ${bad.join(" ") || "(none)"}. Groups: ${Object.keys(REG.groups).join(" ")} all icons`); process.exit(1); }
  const pins = groups.flatMap(g => Object.entries(REG.groups[g].packages).map(([p, v]) => `${p}@${v}`));
  console.log(`Kit cache: ${KITS}\nInstalling: ${pins.join(" ")}\n(about ${groups.reduce((s, g) => s + REG.groups[g].approxMB, 0)} MB)`);
  mkdirSync(KITS, { recursive: true }); if (!existsSync(path.join(KITS, "package.json"))) writeFileSync(path.join(KITS, "package.json"), JSON.stringify({ name: "motionmaker-kits", private: true, version: "0.0.0" }));
  const r = spawnSync("npm", ["install", "--no-audit", "--no-fund", ...pins], { cwd: KITS, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status || 1);
  for (const g of groups) console.log(`${installed(g) ? "ok  " : "FAIL"} ${g}`);
} else if (cmd === "where") console.log(KITS);
else { console.error("commands: list | setup <group...> | where"); process.exit(1); }
