#!/usr/bin/env node
// motionmaker: install and manage the Motionmaker skills for Claude Code.
//
//   npx github:Adamkyl69/motionmaker install [--global | --project | --dir <skills-dir>] [--force] [--dry-run]
//   motionmaker update      [same target flags]     re-copy from this package (keeps backups of anything you edited)
//   motionmaker uninstall   [same target flags]     remove what this tool installed (and only that)
//   motionmaker doctor                              check node, ffmpeg, Chromium, Playwright (never installs)
//   motionmaker setup [dir] [--3d] [--browser]      install Playwright (+ three/gsap with --3d) into a working folder
//   motionmaker list                                show where the skills are installed
//
// Targets: --global = $CLAUDE_CONFIG_DIR/skills or ~/.claude/skills (default); --project = ./.claude/skills; --dir <path>.
// Safety: installs only the skill folders shipped here; refuses to overwrite a folder it did not install (or that you edited)
// unless --force, and then renames the old one to <name>.bak-<timestamp> instead of deleting it. --dry-run changes nothing.
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, renameSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(PKG_ROOT, "skills"), PKG = JSON.parse(readFileSync(path.join(PKG_ROOT, "package.json"), "utf8"));
const MANIFEST = ".motionmaker.json";
const argv = process.argv.slice(2), cmd = argv[0] && !argv[0].startsWith("-") ? argv[0] : (argv[0] === "--version" || argv[0] === "-v" ? "version" : "help");
const has = k => argv.includes(k), opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const dry = has("--dry-run"), force = has("--force");
const say = m => console.log(m), warn = m => console.error(m), die = (m, code = 1) => { warn(m); process.exit(code); };

const targetDir = () => {
  if (opt("--dir")) return path.resolve(opt("--dir"));
  if (has("--project")) return path.resolve(".claude", "skills");
  return path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "skills");
};
const sha = f => createHash("sha256").update(readFileSync(f)).digest("hex");
const walk = (dir, base = dir) => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name))]);
const shippedSkills = () => readdirSync(SRC, { withFileTypes: true }).filter(e => e.isDirectory() && existsSync(path.join(SRC, e.name, "SKILL.md"))).map(e => e.name).sort();
const readManifest = dir => { try { return JSON.parse(readFileSync(path.join(dir, MANIFEST), "utf8")); } catch { return null; } };
const ts = () => new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const modified = (dir, m, name) => (m?.files?.[name] ? Object.entries(m.files[name]).filter(([f, h]) => !existsSync(path.join(dir, name, f)) || sha(path.join(dir, name, f)) !== h).map(([f]) => f) : null);

function install(update) {
  const dir = targetDir(), skills = shippedSkills(), old = readManifest(dir);
  if (!skills.length) die(`no skills found in ${SRC}`);
  say(`${update ? "Updating" : "Installing"} ${skills.length} skills (v${PKG.version}) -> ${dir}${dry ? "   [dry run]" : ""}`);
  const files = {}, plan = [];
  for (const name of skills) {
    const dest = path.join(dir, name), exists = existsSync(dest), ours = !!old?.skills?.includes(name), edits = ours ? modified(dir, old, name) : null;
    let action = "install";
    if (exists && !ours) action = force ? "replace (backup)" : "SKIP: exists and was not installed by motionmaker (use --force to replace, the old one is kept as a backup)";
    else if (exists && ours && edits?.length) action = force ? `replace (backup; ${edits.length} edited file(s))` : `SKIP: ${edits.length} file(s) were edited since install, e.g. ${edits[0]} (use --force; the old folder is kept as a backup)`;
    else if (exists && ours) action = "update";
    plan.push({ name, dest, action });
    say(`  ${action.startsWith("SKIP") ? "!" : "+"} ${name.padEnd(22)} ${action}`);
  }
  if (dry) { say("\n(dry run: nothing was changed)"); return; }
  mkdirSync(dir, { recursive: true });
  const installed = [];
  for (const p of plan) {
    if (p.action.startsWith("SKIP")) { if (old?.files?.[p.name]) files[p.name] = old.files[p.name], installed.push(p.name); continue; }
    if (existsSync(p.dest) && p.action.includes("backup")) renameSync(p.dest, `${p.dest}.bak-${ts()}`);
    else if (existsSync(p.dest)) rmSync(p.dest, { recursive: true, force: true });
    cpSync(path.join(SRC, p.name), p.dest, { recursive: true, preserveTimestamps: true });
    files[p.name] = Object.fromEntries(walk(p.dest).map(f => [f, sha(path.join(p.dest, f))])); installed.push(p.name);
  }
  writeFileSync(path.join(dir, MANIFEST), JSON.stringify({ tool: "motionmaker", version: PKG.version, installedAt: new Date().toISOString(), skills: installed, files }, null, 1));
  const skipped = plan.filter(p => p.action.startsWith("SKIP")).length, wrote = plan.length - skipped;
  say(`\n${update ? "Updated" : "Installed"} ${wrote} of ${skills.length}${skipped ? `; ${skipped} skipped (see above)` : ""}.`);
  say(`Next:  motionmaker doctor     # check ffmpeg / Chromium / Playwright\n       motionmaker setup      # install Playwright in your working folder (add --3d for three + gsap)\n       then start Claude Code and type /motionmaker`);
}

function uninstall() {
  const dir = targetDir(), m = readManifest(dir);
  if (!m) die(`nothing to uninstall: no ${MANIFEST} in ${dir}`);
  say(`Removing ${m.skills.length} skills installed by motionmaker v${m.version} from ${dir}${dry ? "   [dry run]" : ""}`);
  for (const name of m.skills) {
    const edits = modified(dir, m, name);
    if (!existsSync(path.join(dir, name))) { say(`  - ${name}: already gone`); continue; }
    if (edits?.length && !force) { say(`  ! ${name}: ${edits.length} file(s) edited since install (e.g. ${edits[0]}); kept. Use --force to move it to a backup and remove.`); continue; }
    say(`  - ${name}${edits?.length ? " (edited: moved to backup)" : ""}`);
    if (!dry) { if (edits?.length) renameSync(path.join(dir, name), path.join(dir, `${name}.bak-${ts()}`)); else rmSync(path.join(dir, name), { recursive: true, force: true }); }
  }
  if (!dry) { const left = m.skills.filter(n => existsSync(path.join(dir, n))); if (left.length) writeFileSync(path.join(dir, MANIFEST), JSON.stringify({ ...m, skills: left }, null, 1)); else rmSync(path.join(dir, MANIFEST), { force: true }); }
  say(dry ? "\n(dry run: nothing was changed)" : "\nDone.");
}

const run = (c, a, o = {}) => { try { return execFileSync(c, a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], ...o }).trim(); } catch { return null; } };
function doctor() {
  let bad = 0; const row = (ok, name, detail, fix) => { say(`${ok ? "OK   " : "MISS "} ${name.padEnd(12)} ${detail}${!ok && fix ? "\n       -> " + fix : ""}`); if (!ok) bad++; };
  const nodeMajor = +process.versions.node.split(".")[0];
  row(nodeMajor >= 20, "node", `v${process.versions.node}`, "install Node.js 20 or newer");
  const ff = run("ffmpeg", ["-version"]); row(!!ff, "ffmpeg", ff ? ff.split("\n")[0].slice(0, 40) : "not found", "install ffmpeg (brew install ffmpeg | apt install ffmpeg | winget install ffmpeg); ffprobe comes with it");
  const fp = run("ffprobe", ["-version"]); row(!!fp, "ffprobe", fp ? "found" : "not found", "ships with ffmpeg");
  const pw = path.join(os.homedir(), ".cache", "ms-playwright"), chromes = [process.env.CHROMIUM, "/opt/pw-browsers/chromium", run("which", ["chromium"]), run("which", ["google-chrome"]), run("which", ["chromium-browser"])].filter(Boolean);
  const found = chromes.find(p => existsSync(p)) || (existsSync(pw) && readdirSync(pw).find(d => d.startsWith("chromium")) && `${pw}/chromium-*`);
  row(!!found, "chromium", found || "not found", "run `motionmaker setup --browser` (downloads Playwright's Chromium), or set CHROMIUM=<path to chrome/chromium>");
  const pwOk = hasPkg("playwright");
  row(pwOk, "playwright", pwOk ? `resolvable from ${process.cwd()}` : `not resolvable from ${process.cwd()}`, "cd into your working folder and run `motionmaker setup`");
  for (const [n, why] of [["three", "3D product-shot template"], ["gsap", "kinetic-type template"]]) { const ok = hasPkg(n); say(`${ok ? "OK   " : "opt  "} ${n.padEnd(12)} ${ok ? "found" : `not found (only for the ${why}; \`motionmaker setup --3d\`)`}`); }
  for (const [label, dir] of [["global", path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "skills")], ["project", path.resolve(".claude", "skills")]]) { const m = readManifest(dir); say(`${m ? "OK   " : "--   "} ${("skills/" + label).padEnd(12)} ${m ? `v${m.version}, ${m.skills.length} skills in ${dir}` : `not installed in ${dir}`}`); }
  say(bad ? `\n${bad} required item(s) missing: rendering needs them; authoring-only mode still works without.` : "\nAll required tools found.");
  process.exit(bad ? 1 : 0);
}
// Is <name> installed where the scripts will look for it (node_modules in the cwd or any parent, or NODE_PATH)? Checks the folder itself:
// require("<pkg>/package.json") fails for packages whose "exports" map hides it (three does), which would be a false "not found".
function hasPkg(name) {
  const roots = []; for (let d = process.cwd(); ; d = path.dirname(d)) { roots.push(path.join(d, "node_modules")); if (path.dirname(d) === d) break; }
  roots.push(...(process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean));
  return roots.some(r => existsSync(path.join(r, name, "package.json")));
}

function setup() {
  const dir = path.resolve(argv[1] && !argv[1].startsWith("--") ? argv[1] : "."), pkgs = ["playwright", ...(has("--3d") ? ["three@0.160.0", "gsap@3.12.5"] : [])];
  const steps = [];
  if (!existsSync(path.join(dir, "package.json"))) steps.push(["npm", ["init", "-y"]]);
  steps.push(["npm", ["install", ...pkgs]]);
  if (has("--browser")) steps.push(["npx", ["playwright", "install", "chromium"]]);
  say(`Setting up ${dir}\n${steps.map(([c, a]) => "  $ " + [c, ...a].join(" ")).join("\n")}${dry ? "\n[dry run]" : ""}`);
  if (dry) return;
  mkdirSync(dir, { recursive: true });
  for (const [c, a] of steps) { const r = spawnSync(c, a, { cwd: dir, stdio: "inherit", shell: process.platform === "win32" }); if (r.status !== 0) die(`step failed: ${c} ${a.join(" ")}`, r.status || 1); }
  say(`\nDone. Run \`motionmaker doctor\` from ${dir} to confirm.${has("--browser") ? "" : "\nNo browser was downloaded: use --browser, or set CHROMIUM=<path> if you already have Chrome/Chromium."}`);
}

function list() {
  for (const [label, dir] of [["global", path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "skills")], ["project", path.resolve(".claude", "skills")]]) {
    const m = readManifest(dir); say(m ? `${label}: ${dir}\n  v${m.version} installed ${m.installedAt}\n  ${m.skills.join(", ")}` : `${label}: not installed (${dir})`);
  }
}
const help = () => say(`motionmaker v${PKG.version}: install the Motionmaker skills for Claude Code\n\nCommands:\n  install    [--global|--project|--dir <path>] [--force] [--dry-run]   copy the skills (default target: ~/.claude/skills)\n  update     [same flags]                                             re-copy from this package\n  uninstall  [same flags]                                             remove only what this tool installed\n  doctor                                                              check node / ffmpeg / Chromium / Playwright\n  setup [dir] [--3d] [--browser] [--dry-run]                          npm-install Playwright (+ three, gsap) in a working folder\n  list                                                                show installed locations\n\nAfter installing, start Claude Code and type /motionmaker.`);

({ install: () => install(false), update: () => install(true), uninstall, doctor, setup, list, help, "--help": help, "-h": help, version: () => say(PKG.version) }[cmd] || help)();
