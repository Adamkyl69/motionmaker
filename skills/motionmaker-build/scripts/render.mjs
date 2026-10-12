// Frame-exact renderer. usage:
//   node render.mjs <anim.html> <seconds> <fps> [--size 1080x1080] [--out out/frames] [--blur 8]
// The page must expose window.renderFrame(n) (pure function of n). Renders frames 0..N-1.
// --blur K averages K subframes spread over half a frame (180-degree shutter) via window.renderFrame(n + j/K*0.5);
// the page's renderFrame must accept fractional n. Needs: npm i playwright; set CHROMIUM if not at /opt/pw-browsers/chromium.
import { openAnim } from "./browser.mjs";   // resolves playwright from cwd, serves the folder over HTTP, software WebGL2
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const a = process.argv.slice(2);
const opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const [file, secs, fps] = [a[0], +a[1], +a[2]];
if (!file || !secs || !fps) { console.error("usage: node render.mjs anim.html seconds fps [--size WxH] [--out dir] [--blur K]"); process.exit(1); }
const sizeArg = opt("--size", "600x600"), [W, H] = sizeArg === "auto" ? ["auto", "auto"] : sizeArg.split("x").map(Number);   // "auto" = the page's own size
const dir = opt("--out", "out/frames"), K = +opt("--blur", 0), N = Math.round(secs * fps);
mkdirSync(dir, { recursive: true });
const { page, errors, close } = await openAnim(file, W, H, { fps });
const name = n => `${dir}/f${String(n).padStart(4, "0")}.png`;
for (let n = 0; n < N; n++) {                       // 0..N-1, never N
  if (!K) { await page.evaluate(n => window.renderFrame(n), n); await page.screenshot({ path: name(n) }); continue; }
  const subs = [];
  for (let j = 0; j < K; j++) { await page.evaluate(x => window.renderFrame(x), n + (j / K) * 0.5); subs.push(await page.screenshot()); }
  const tmp = `${dir}/_sub`; mkdirSync(tmp, { recursive: true });
  subs.forEach((b, j) => writeFileSync(`${tmp}/s${j}.png`, b));
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", "1", "-i", `${tmp}/s%d.png`, "-vf", `tmix=frames=${K}:weights=${"1 ".repeat(K).trim()}`, "-frames:v", "1", "-update", "1", name(n)]);
}
await close();
if (errors.length) { console.error("page errors:\n" + errors.join("\n")); process.exit(2); }
console.log(`${N} frames (${W}x${H}) -> ${dir}`);
