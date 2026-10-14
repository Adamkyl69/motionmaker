// Guards against the two Windows breakages a user's Windows run found (they had been patched by hand there and were lost on update):
//   1. import() of a filesystem path: on Windows "C:\..." is not a module specifier. Use pathToFileURL(path).href (or platform.mjs fileUrl).
//   2. ffmpeg drawtext without a font file: Windows builds have no default font. Use platform.mjs ffFont() in JS and $FF in bash scripts;
//      the subtitles filter needs fontsdir on Windows ($FD).
//   node portability.mjs [skills dir]     exit 1 listing every offending line
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."));
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === "node_modules" || e.name.startsWith(".") ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const bad = [];
for (const f of walk(root).filter(f => /\.(mjs|js|sh)$/.test(f) && !f.endsWith("portability.mjs") && !/[\\/]web[\\/]/.test(f))) {
  readFileSync(f, "utf8").split("\n").forEach((l, i) => {
    const at = `${path.relative(root, f)}:${i + 1}`;
    for (const m of l.matchAll(/await import\(\s*([^)]*)/g)) { const arg = m[1].trim(); if (!/^(pathToFileURL|fileUrl)\(|^["'`](node:|\.\.?\/|[a-z@])/.test(arg)) bad.push(`${at}: import() of a path: wrap it in pathToFileURL(...).href`); }
    if (/drawtext=/.test(l) && (f.endsWith(".sh") ? !/drawtext=\$\{FF\}/.test(l) : !/drawtext=\$\{ffFont\(\)\}/.test(l))) bad.push(`${at}: drawtext without a font file (${f.endsWith(".sh") ? "${FF}" : "${ffFont()}"})`);
    if (/subtitles=/.test(l) && f.endsWith(".sh") && !/\$FD/.test(l)) bad.push(`${at}: subtitles without fontsdir on Windows ($FD)`);
  });
}
if (bad.length) { bad.forEach(b => console.log("FAIL  " + b)); process.exit(1); }
console.log("PASS  portability (import() of paths, drawtext fonts, subtitles fonts)");
