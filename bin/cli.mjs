#!/usr/bin/env node
// motionmaker: install and manage the Motionmaker skills for Claude Code.
//
//   npx github:Adamkyl69/motionmaker install [--global | --project | --dir <skills-dir>] [--force] [--dry-run] [--no-anatomy]
//                                   also installs the Anatomy skill (by Ryan, MIT) at a pinned, tested commit; --no-anatomy skips it;
//                                   asks whether to install OpenMontage too (default no; --with-openmontage / --no-openmontage answer it)
//   motionmaker openmontage [--dir <path>]         install OpenMontage (AGPLv3, separate program) at a tested commit, default ~/OpenMontage
//   motionmaker update      [same target flags]     re-copy from this package (keeps backups of anything you edited)
//   motionmaker uninstall   [same target flags]     remove what this tool installed (and only that)
//   motionmaker doctor                              check node, ffmpeg, Chromium, Playwright (never installs)
//   motionmaker setup [dir] [--3d] [--browser] [--libs [groups]]   install Playwright (+ three/gsap with --3d) into a working folder; --libs installs optional libraries into the kit cache
//   motionmaker list                                show where the skills are installed
//
// Targets: --global = $CLAUDE_CONFIG_DIR/skills or ~/.claude/skills (default); --project = ./.claude/skills; --dir <path>.
// Safety: installs only the skill folders shipped here; refuses to overwrite a folder it did not install (or that you edited)
// unless --force, and then moves the old one to motionmaker-backups/<name>-<timestamp> NEXT TO the skills folder (never inside it: Claude
// Code loads every folder there that has a SKILL.md, so a backup inside showed up as a duplicate skill). --dry-run changes nothing.
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, renameSync, readdirSync, statSync, readSync as require_fs_readSync } from "node:fs";
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
// backups live next to the skills folder (~/.claude/motionmaker-backups), not in it
const backupRoot = dir => path.join(path.dirname(dir), "motionmaker-backups");
const backup = (dir, name) => { const to = path.join(backupRoot(dir), `${name}-${ts()}`); mkdirSync(backupRoot(dir), { recursive: true }); renameSync(path.join(dir, name), to); return to; };
// versions up to 1.3.1 left <name>.bak-<timestamp> folders INSIDE the skills folder (loaded as duplicate skills): move them out
function relocateOldBackups(dir, names) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir)) { const m = e.match(/^(.+)\.bak-(\d{14})$/); if (!m || !names.includes(m[1])) continue;
    const to = path.join(backupRoot(dir), `${m[1]}-${m[2]}`);
    say(`  > old backup ${e} ${dry ? "would move" : "moved"} to ${to} (inside the skills folder it was loaded as a duplicate skill)`);
    if (!dry) { mkdirSync(backupRoot(dir), { recursive: true }); renameSync(path.join(dir, e), to); } }
}
const modified = (dir, m, name) => (m?.files?.[name] ? Object.entries(m.files[name]).filter(([f, h]) => !existsSync(path.join(dir, name, f)) || sha(path.join(dir, name, f)) !== h).map(([f]) => f) : null);

// Companions: other people's skills Motionmaker installs next to its own, at a pinned, tested version, with their licence kept in the folder.
// Anatomy (by Ryan, MIT): explain-how-it-works figures that motionmaker-anatomy films and exports. Skipped with --no-anatomy, or when you already
// have an anatomy folder that Motionmaker did not install (yours is left alone). Removed by uninstall only if Motionmaker installed it.
const COMPANIONS = { anatomy: { repo: "https://github.com/wheresryan22/anatomy", commit: "454a0ef801b6d9b905f08309d094491c7085b3dd", license: /MIT License/, by: "Ryan (wheresryan22), MIT", flag: "--no-anatomy" } };
function companions(dir, old, update) {
  const out = {};
  for (const [name, c] of Object.entries(COMPANIONS)) {
    const dest = path.join(dir, name), prev = old?.companions?.[name];
    if (has(c.flag)) { say(`  - ${name.padEnd(22)} skipped (${c.flag})`); if (prev) out[name] = prev; continue; }
    if (existsSync(dest) && !prev) { say(`  = ${name.padEnd(22)} you already have one (not installed by motionmaker): left as it is`); continue; }
    if (existsSync(dest) && prev?.commit === c.commit) { say(`  = ${name.padEnd(22)} up to date (${c.commit.slice(0, 7)}, ${c.by})`); out[name] = prev; continue; }
    say(`  + ${name.padEnd(22)} ${prev ? "update" : "install"}: ${c.repo} at ${c.commit.slice(0, 7)} (${c.by})`);
    if (dry) continue;
    const tmp = path.join(os.tmpdir(), `mm-${name}-${process.pid}`); rmSync(tmp, { recursive: true, force: true });
    let ok = spawnSync("git", ["clone", "--quiet", c.repo, tmp], { stdio: "ignore" }).status === 0 && spawnSync("git", ["-C", tmp, "checkout", "--quiet", c.commit], { stdio: "ignore" }).status === 0;
    if (ok) rmSync(path.join(tmp, ".git"), { recursive: true, force: true });
    else {   // no git: the same commit as a tarball (curl and tar ship with Windows 10+, macOS and Linux)
      rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); const tgz = tmp + ".tgz";
      ok = spawnSync("curl", ["-sSL", "--fail", "-o", tgz, `${c.repo.replace("github.com", "codeload.github.com")}/tar.gz/${c.commit}`], { stdio: "ignore" }).status === 0 && spawnSync("tar", ["-xzf", tgz, "-C", tmp, "--strip-components=1"], { stdio: "ignore" }).status === 0; rmSync(tgz, { force: true }); }
    const lic = ["LICENSE", "LICENSE.md"].map(f => path.join(tmp, f)).find(existsSync);
    if (!ok || !existsSync(path.join(tmp, "SKILL.md")) || !lic || !c.license.test(readFileSync(lic, "utf8"))) { rmSync(tmp, { recursive: true, force: true }); warn(`  ! ${name}: could not fetch ${c.repo} (no network, or the download did not look right). Motionmaker works without it; try again later with  motionmaker update`); if (prev) out[name] = prev; continue; }
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
    cpSync(tmp, dest, { recursive: true }); rmSync(tmp, { recursive: true, force: true });
    out[name] = { commit: c.commit, repo: c.repo, by: c.by };
  }
  return out;
}

// OpenMontage (github.com/calesthio/OpenMontage, AGPLv3): the footage / AI-video / avatar studio motionmaker-montage hands work to. It is a separate
// program with its own setup and must stay one (its licence would otherwise cover Motionmaker), so it is cloned into its own folder, never into the
// skills folder, at a pinned commit tested with our bridge. Asked during install (default no), or: motionmaker openmontage [--dir <path>].
const OM = { repo: "https://github.com/calesthio/OpenMontage", commit: "e45f5b1", dir: path.join(os.homedir(), "OpenMontage") };
function openmontage(target) {
  const dir = path.resolve(target || opt("--dir", OM.dir)), win = process.platform === "win32", py = win ? "py" : "python3", pyArgs = win ? ["-3"] : [];
  const pv = run(py, [...pyArgs, "-c", "import sys;print('%d.%d'%sys.version_info[:2])"]), nv = run("node", ["-v"]);
  const missing = [!pv || +pv.split(".")[1] < 10 && pv.startsWith("3.") ? "Python 3.10+" : null, !nv ? "Node.js 18+" : null, !run("ffmpeg", ["-version"]) ? "FFmpeg" : null, !run("git", ["--version"]) ? "git" : null].filter(Boolean);
  if (missing.length) { warn(`OpenMontage needs ${missing.join(", ")}: install them, then run  motionmaker openmontage`); return false; }
  say(`OpenMontage (AGPLv3, a separate program) -> ${dir}  [${OM.commit}, 2 to 6 minutes, several hundred MB of Python and Node packages]`);
  if (dry) return true;
  if (!existsSync(path.join(dir, "AGENT_GUIDE.md"))) {
    if (spawnSync("git", ["clone", "--quiet", OM.repo, dir], { stdio: "inherit" }).status !== 0) { warn("git clone failed"); return false; }
    spawnSync("git", ["-C", dir, "checkout", "--quiet", OM.commit], { stdio: "inherit" });
  } else say("  already cloned: keeping it (your projects and .env are untouched)");
  const vpy = win ? path.join(dir, ".venv", "Scripts", "python.exe") : path.join(dir, ".venv", "bin", "python");
  const steps = [[py, [...pyArgs, "-m", "venv", ".venv"], dir], [vpy, ["-m", "pip", "install", "-q", "-r", "requirements.txt"], dir], ["npm", ["install", "--no-fund", "--no-audit"], path.join(dir, "remotion-composer")], [vpy, ["-m", "pip", "install", "-q", "piper-tts"], dir]];
  for (const [c, a, cwd] of steps) { if (c === py && existsSync(vpy)) continue; say(`  $ ${path.basename(c)} ${a.join(" ")}`); const r = spawnSync(c, a, { cwd, stdio: "inherit", shell: win }); if (r.status !== 0) { warn(`  step failed (${c} ${a.join(" ")}): fix it and run  motionmaker openmontage  again`); return false; } }
  if (!existsSync(path.join(dir, ".env"))) cpSync(path.join(dir, ".env.example"), path.join(dir, ".env"));
  say(`\nOpenMontage is ready in ${dir}. It works with no keys (free narration, open archives, Remotion); add keys for paid AI video or avatars in ${path.join(dir, ".env")} (Motionmaker never reads that file).\nCheck: node <skills>/motionmaker-montage/scripts/montage.mjs check ${dir}`);
  return true;
}
const askYesNo = q => { if (!process.stdin.isTTY || has("--yes") || dry) return null; process.stdout.write(q); const b = Buffer.alloc(16); let n = 0; try { n = require_fs_readSync(0, b, 0, 16, null); } catch { return null; } return /^y/i.test(b.toString("utf8", 0, n).trim()); };

function install(update) {
  const dir = targetDir(), skills = shippedSkills(), old = readManifest(dir);
  if (!skills.length) die(`no skills found in ${SRC}`);
  say(`${update ? "Updating" : "Installing"} ${skills.length} skills (v${PKG.version}) -> ${dir}${dry ? "   [dry run]" : ""}`);
  relocateOldBackups(dir, skills);
  const files = {}, plan = [];
  for (const name of skills) {
    const dest = path.join(dir, name), exists = existsSync(dest), ours = !!old?.skills?.includes(name), edits = ours ? modified(dir, old, name) : null;
    let action = "install";
    if (exists && !ours) action = force ? "replace (backup)" : "SKIP: exists and was not installed by motionmaker (use --force to replace; the old one is moved to motionmaker-backups next to the skills folder)";
    else if (exists && ours && edits?.length) action = force ? `replace (backup; ${edits.length} edited file(s))` : `SKIP: ${edits.length} file(s) were edited since install, e.g. ${edits[0]} (use --force; the old folder is moved to motionmaker-backups next to the skills folder)`;
    else if (exists && ours) action = "update";
    plan.push({ name, dest, action });
    say(`  ${action.startsWith("SKIP") ? "!" : "+"} ${name.padEnd(22)} ${action}`);
  }
  if (dry) { say("\nCompanions:"); companions(dir, old, update); say("\n(dry run: nothing was changed)"); return; }
  mkdirSync(dir, { recursive: true });
  const installed = [];
  for (const p of plan) {
    if (p.action.startsWith("SKIP")) { if (old?.files?.[p.name]) files[p.name] = old.files[p.name], installed.push(p.name); continue; }
    if (existsSync(p.dest) && p.action.includes("backup")) say(`  > ${p.name}: the old folder is kept at ${backup(dir, p.name)}`);
    else if (existsSync(p.dest)) rmSync(p.dest, { recursive: true, force: true });
    cpSync(path.join(SRC, p.name), p.dest, { recursive: true, preserveTimestamps: true });
    files[p.name] = Object.fromEntries(walk(p.dest).map(f => [f, sha(path.join(p.dest, f))])); installed.push(p.name);
  }
  say("\nCompanions (other people's skills Motionmaker uses, pinned and tested; licences kept in their folders):");
  const comp = companions(dir, old, update);
  writeFileSync(path.join(dir, MANIFEST), JSON.stringify({ tool: "motionmaker", version: PKG.version, installedAt: new Date().toISOString(), skills: installed, files, companions: comp }, null, 1));
  if (!update && has("--with-openmontage")) openmontage();
  else if (!update && !has("--no-openmontage") && !existsSync(path.join(OM.dir, "AGENT_GUIDE.md"))) {
    const yes = askYesNo(`\nAlso install OpenMontage for real footage, AI video, avatars and dubbing? It is a separate program (AGPLv3, 2 to 6 minutes, needs Python 3.10+ and Node), installed in ${OM.dir}. [y/N] `);
    if (yes) openmontage(); else say("OpenMontage: not installed (any time:  motionmaker openmontage).");
  }
  const skipped = plan.filter(p => p.action.startsWith("SKIP")).length, wrote = plan.length - skipped;
  say(`\n${update ? "Updated" : "Installed"} ${wrote} of ${skills.length}${skipped ? `; ${skipped} skipped (see above)` : ""}.`);
  say(`Next:  motionmaker doctor     # check ffmpeg / Chromium / Playwright\n       motionmaker setup      # install Playwright in your working folder (add --3d for three + gsap)\n       then start Claude Code and type /motionmaker`);
}

function uninstall() {
  const dir = targetDir(), m = readManifest(dir);
  if (!m) die(`nothing to uninstall: no ${MANIFEST} in ${dir}`);
  say(`Removing ${m.skills.length} skills installed by motionmaker v${m.version} from ${dir}${dry ? "   [dry run]" : ""}`);
  relocateOldBackups(dir, m.skills);
  for (const name of m.skills) {
    const edits = modified(dir, m, name);
    if (!existsSync(path.join(dir, name))) { say(`  - ${name}: already gone`); continue; }
    if (edits?.length && !force) { say(`  ! ${name}: ${edits.length} file(s) edited since install (e.g. ${edits[0]}); kept. Use --force to move it to a backup and remove.`); continue; }
    say(`  - ${name}${edits?.length ? " (edited: moved to backup)" : ""}`);
    if (!dry) { if (edits?.length) say(`    kept at ${backup(dir, name)}`); else rmSync(path.join(dir, name), { recursive: true, force: true }); }
  }
  for (const name of Object.keys(m.companions || {})) { if (!existsSync(path.join(dir, name))) continue; say(`  - ${name} (companion installed by motionmaker)`); if (!dry) rmSync(path.join(dir, name), { recursive: true, force: true }); }
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
  const pwDirs = [path.join(os.homedir(), ".cache", "ms-playwright"), path.join(os.homedir(), "Library", "Caches", "ms-playwright"), path.join(process.env.LOCALAPPDATA || "/nonexistent", "ms-playwright")], pw = pwDirs.find(d => existsSync(d) && readdirSync(d).some(x => x.startsWith("chromium"))) || pwDirs[0], chromes = [process.env.CHROMIUM, "/opt/pw-browsers/chromium", run("which", ["chromium"]), run("which", ["google-chrome"]), run("which", ["chromium-browser"])].filter(Boolean);
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
  // --libs [groups]: optional libraries (fonts, code, math, maps, sketch, icons:*) into the shared kit cache, not the working folder
  const li = argv.indexOf("--libs"); if (li > -1) { const groups = argv.slice(li + 1).filter(a => !a.startsWith("--")); steps.push(["node", [path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "skills", "motionmaker-libs", "scripts", "lib.mjs"), "setup", ...(groups.length ? groups : ["fonts"])]]); }
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
const help = () => say(`motionmaker v${PKG.version}: install the Motionmaker skills for Claude Code\n\nCommands:\n  install    [--global|--project|--dir <path>] [--force] [--dry-run] [--no-anatomy] [--with-openmontage|--no-openmontage]\n             copy the skills (default target: ~/.claude/skills), with the Anatomy skill; asks about OpenMontage\n  update     [same flags]                                             re-copy from this package\n  uninstall  [same flags]                                             remove only what this tool installed\n  doctor                                                              check node / ffmpeg / Chromium / Playwright\n  setup [dir] [--3d] [--browser] [--libs [groups]] [--dry-run]         npm-install Playwright (+ three, gsap) in a working folder; --libs adds fonts (default) or the named groups: fonts code math maps sketch icons all\n  openmontage [--dir <path>]                                          install OpenMontage (AGPLv3, separate) at a tested commit (default ~/OpenMontage)\n  list                                                                show installed locations\n\nAfter installing, start Claude Code and type /motionmaker.`);

({ install: () => install(false), update: () => install(true), openmontage: () => openmontage(), uninstall, doctor, setup, list, help, "--help": help, "-h": help, version: () => say(PKG.version) }[cmd] || help)();
