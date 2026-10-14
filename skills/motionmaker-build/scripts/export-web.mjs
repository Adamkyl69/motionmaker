// Export a finished piece as code for websites and React apps instead of (or as well as) a video.
//
//   node export-web.mjs <anim.html> [--out <dir>] [--name <slug>] [--fps n --frames n --size WxH] [--poster <frame>] [--check]
//   node export-web.mjs <page.html> --live [--clip <selector>] [--viewport 1280x800] [--actions a.json] [--repeat <secs>] [--css "..."]
//                       [--credit "..."] [--notice <LICENSE file>] [--poster <secs>] [--out <dir>] [--name <slug>] [--check]
//
// Writes <out> (default: web/ next to anim.html):
//   <slug>/          the folder to deploy (index.html, every file the piece loads, mm-embed.js, motion.json, poster.jpg)
//   motion-player.ts framework-free player: mountMotion(el, { src }) and the <motion-clip> element; motion-player.js is the same, compiled
//   Motion.tsx       React component (Motion.jsx compiled)
//   demo.html        local preview page with play / pause / seek controls
//   README.md        how to use it in a plain website, Vite, Next.js
// The file list is not guessed: the piece is loaded in the sandboxed browser and every frame is drawn once, and the files it actually
// requested are copied. Requests to other hosts are blocked and reported (a deployed piece must not depend on them).
// --check plays the export through the player and compares sample frames, pixel for pixel, with the renderer's own frames, then tests
// play, pause, loop, the end of a non-looping piece and reduced motion.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve, launch, openAnim } from "./browser.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), WEB = path.join(HERE, "web");
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const file = argv[0]; if (!file || file.startsWith("--") || !existsSync(file)) die("usage: node export-web.mjs <anim.html> [--out dir] [--name slug] [--fps n --frames n --size WxH] [--poster frame] [--check]");
const abs = path.resolve(file), root = path.dirname(abs), src = readFileSync(abs, "utf8");
const slug = (opt("--name") || path.basename(root)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "motion";
const out = path.resolve(opt("--out", path.join(root, "web"))), dest = path.join(out, slug);

if (argv.includes("--live")) { await exportLive(); process.exit(0); }

// Real-time pages (Anatomy figures, web demos): exported live, not as frames. The page keeps its own animation and interaction; mm-live.js
// (injected as its first script) lets the player pause it, crop it to --clip and play the --actions tour until the visitor takes over.
async function exportLive() {
  const clipSel = opt("--clip"), [VW, VH0] = opt("--viewport", "1280x800").split("x").map(Number), css = opt("--css", ""), credit = opt("--credit", "");
  const actions = opt("--actions") ? JSON.parse(readFileSync(opt("--actions"), "utf8")).sort((x, y) => x.t - y.t) : [];
  const repeat = +opt("--repeat", 0), posterSecs = +opt("--poster", 1.5);
  rmSync(dest, { recursive: true, force: true }); mkdirSync(dest, { recursive: true });
  // the bridge must run before any of the page's scripts; overflow:hidden keeps the measured layout (no scrollbar) identical in the iframe
  const head = `${credit ? `<!-- ${credit.replace(/--/g, "-")} -->\n` : ""}<script src="mm-live.js"></script>\n<style>html,body{overflow:hidden!important}${css}</style>\n`;
  const m = src.match(/<meta[^>]*charset[^>]*>/i) || src.match(/<head[^>]*>/i);
  writeFileSync(path.join(dest, "index.html"), m ? src.replace(m[0], `${m[0]}\n${head}`) : head + src);
  const s1 = await serve(root), b1 = await launch(), requested = new Set(), blocked = new Set(), errors = [];
  let p1 = await b1.newPage({ viewport: { width: VW, height: VH0 } });
  p1.on("pageerror", e => errors.push(String(e)));
  p1.on("request", r => { if (r.url().startsWith(s1.url)) requested.add(decodeURIComponent(new URL(r.url()).pathname).slice(1)); });
  await p1.route(u => !/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(u.href), r => { blocked.add(r.request().url().slice(0, 120)); r.abort(); });
  await p1.goto(`${s1.url}/${path.basename(abs)}`); await p1.waitForLoadState("load"); await p1.waitForTimeout(1500);
  await b1.close(); s1.close();
  const own = path.basename(abs), files = [...requested].filter(p => p && p !== own && !p.startsWith("favicon")).sort();
  for (const rel of files) { const from = path.join(root, rel), to = path.join(dest, rel); if (from.startsWith(root + path.sep) && existsSync(from)) { mkdirSync(path.dirname(to), { recursive: true }); copyFileSync(from, to); } }
  if (blocked.size) console.error(`WARN  the page asked for ${blocked.size} file(s) on other hosts (blocked, not exported): ${[...blocked].slice(0, 3).join(" , ")}`);
  if (errors.length) die(`page errors: ${errors.slice(0, 3).join("; ")}`);
  // measure the crop on the exported page itself, at the viewport the iframe will have (grown until the card fits)
  writeFileSync(path.join(dest, "mm-live.js"), "");
  const s2 = await serve(dest), b2 = await launch(); let VH = VH0, crop = null;
  const p2 = await b2.newPage({ viewport: { width: VW, height: VH } });
  await p2.goto(`${s2.url}/index.html`); await p2.waitForLoadState("load"); await p2.evaluate(() => document.fonts.ready);
  for (let k = 0; k < 3; k++) {
    crop = await p2.evaluate(sel => { const e = sel ? document.querySelector(sel) : document.documentElement; if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.floor(r.left), y: Math.floor(r.top), width: Math.ceil(r.width), height: Math.ceil(r.height) }; }, clipSel);
    if (!crop) die(`--clip: nothing matches ${clipSel}`);
    if (!clipSel) crop = { x: 0, y: 0, width: VW, height: VH };
    if (crop.y + crop.height <= VH) break;
    VH = crop.y + crop.height + 24; await p2.setViewportSize({ width: VW, height: VH }); await p2.waitForTimeout(300);
  }
  await p2.waitForTimeout(Math.max(0, posterSecs * 1000 - 300));
  writeFileSync(path.join(dest, "poster.jpg"), await p2.screenshot({ type: "jpeg", quality: 85, clip: crop }));
  await b2.close(); s2.close();
  const title = (src.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim() || slug;
  const info = { live: true, fps: 60, frames: 0, width: crop.width, height: crop.height, title, viewport: { width: VW, height: VH }, crop };
  writeFileSync(path.join(dest, "mm-live.js"), readFileSync(path.join(WEB, "live.js"), "utf8").replace("__MM_LIVE__", JSON.stringify({ info, actions, repeat })));
  writeFileSync(path.join(dest, "motion.json"), JSON.stringify(info, null, 1));
  if (opt("--notice")) copyFileSync(opt("--notice"), path.join(dest, "NOTICE-" + path.basename(opt("--notice"))));
  for (const f of ["motion-player.ts", "motion-player.js", "Motion.tsx", "Motion.jsx"]) copyFileSync(path.join(WEB, f), path.join(out, f));
  writeFileSync(path.join(out, "demo.html"), `<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}: live web export</title>
<style>body{margin:0;padding:24px;font:15px system-ui,sans-serif;background:#f4f4f2;color:#222}main{max-width:${Math.min(960, crop.width)}px;margin:auto}button{font:inherit;padding:6px 14px;margin-top:12px}</style>
<main><h1 style="font-size:18px">${title}</h1><div id="piece"></div><button id="pp">Pause</button>
<p>Live: hover, drag or use the keys on it.${actions.length ? " The scripted tour plays until you touch it." : ""} Serve this folder over HTTP (for example <code>npx serve .</code>) and open demo.html.</p></main>
<script type="module">
import { mountMotion } from "./motion-player.js";
const pp = document.getElementById("pp"), player = mountMotion(document.getElementById("piece"), { src: "./${slug}/" });
pp.onclick = () => { player.toggle(); pp.textContent = player.playing ? "Pause" : "Play"; };
</script>
`);
  writeFileSync(path.join(out, "README.md"), `# ${title}: live web export

A real-time page (${crop.width}x${crop.height} card${clipSel ? ` \`${clipSel}\`` : ""}, laid out at ${VW}x${VH}), exported live: visitors can hover, drag and use its keys${actions.length ? `; a scripted tour of ${actions.length} action(s) plays${repeat ? ` every ${repeat} s` : " once"} until the visitor first touches it` : ""}. Exported by Motionmaker's \`export-web.mjs --live\`.
${credit ? `\nCredit: ${credit}${opt("--notice") ? ` (licence notice in \`${slug}/NOTICE-${path.basename(opt("--notice"))}\`; keep it with the files)` : ""}\n` : ""}
## Use it
Same player as every Motionmaker export: put \`${slug}/\` in your static folder (\`public/motions/${slug}/\`), then
\`\`\`html
<script type="module">import { defineMotionElement } from "/js/motion-player.js"; defineMotionElement();</script>
<motion-clip src="/motions/${slug}/" label="${title}"></motion-clip>
\`\`\`
\`\`\`tsx
import { Motion } from "./Motion";
<Motion src="/motions/${slug}/" />
\`\`\`
- Pauses (the page's own clock stops) while scrolled off screen or in a background tab; \`pause()\` / \`play()\` / \`playing={false}\` do the same.
- Reduced motion: it holds still until the visitor touches it. \`interactive={false}\` makes it a non-interactive picture.
- Frame-based calls (\`seek\`, \`setSpeed\`, \`loop\`) do nothing on a live piece; for an exact, repeatable cut, film it (\`film-realtime.mjs\`) instead.
`);
  console.log(`exported live ${title}: card ${crop.width}x${crop.height} at viewport ${VW}x${VH}${actions.length ? `, tour of ${actions.length} action(s)` : ""} -> ${out}`);
  console.log(`  ${slug}/: index.html + ${files.length} file(s) + mm-live.js, motion.json, poster.jpg${opt("--notice") ? ", NOTICE" : ""}`);
  if (argv.includes("--check")) await checkLive(info, actions);
}

async function checkLive(info, actions) {
  const hostFile = path.join(out, "__check.html");
  writeFileSync(hostFile, `<!doctype html><meta charset="utf-8"><style>body{margin:0}#h{width:${Math.min(info.width, 900)}px}</style><div id="h"></div><div style="height:3000px"></div>
<script type="module">import { mountMotion } from "./motion-player.js"; window.mount = o => { window.P?.destroy(); window.P = mountMotion(document.getElementById("h"), { src: "./${slug}/", ...o }); return window.P.ready.then(() => true); }; window.go = true;</script>`);
  const s = await serve(out), b = await launch(), p = await b.newPage({ viewport: { width: 1000, height: 800 } });
  const errs = []; p.on("pageerror", e => errs.push(String(e)));
  const fails = [], ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"}  ${m}`); if (!c) fails.push(m); };
  const now = () => p.evaluate(() => document.querySelector("iframe").contentWindow.__mmLive.now());
  const shot = () => p.locator("#h").screenshot();
  await p.goto(`${s.url}/__check.html`); await p.waitForFunction(() => window.go);
  await p.evaluate(() => window.mount({}));
  ok(await p.evaluate(() => window.P.info.live && window.P.playing), "live piece ready and playing");
  const real0 = Date.now(), t0 = await now(), a0 = await shot(); await p.waitForTimeout(1000); const a1 = await shot(), t1 = await now(), real = Date.now() - real0;
  ok(t1 - t0 > 0.5 * real && t1 - t0 < 1.5 * real, `its clock runs at real speed (${Math.round(t1 - t0)} ms of page time in ${real} ms)`);
  if (a0.equals(a1)) console.log("note  nothing visibly moved in 1 s (no idle animation?)");
  // an animation loop in the page must run once per real frame (a frame scheduler bug once multiplied it until the page froze)
  const rates = await p.evaluate(() => new Promise(res => {
    const w = document.querySelector("iframe").contentWindow; let inner = 0, outer = 0, on = true;
    const a = () => { inner++; if (on) w.requestAnimationFrame(a); }, b = () => { outer++; if (on) requestAnimationFrame(b); };
    w.requestAnimationFrame(a); requestAnimationFrame(b); setTimeout(() => { on = false; res([inner, outer]); }, 1000);
  }));
  ok(rates[0] <= rates[1] * 1.25 + 2, `the page's animation loop runs once per frame (${rates[0]} calls in ${rates[1]} frames)`);
  if (actions.length) {
    const first = actions[0].t * 1000 + 400; if (t1 < first) await p.waitForTimeout(first - t1);
    const sent = await p.evaluate(() => document.querySelector("iframe").contentWindow.__mmLive.tour.sent);
    ok(sent > 0, `the scripted tour plays (${sent} event(s) dispatched)`);
  }
  await p.evaluate(() => window.P.pause()); await p.waitForTimeout(150);
  const t2 = await now(), b0 = await shot(); await p.waitForTimeout(600); const t3 = await now(), b1 = await shot();
  ok(t2 === t3 && b0.equals(b1), "pause stops its clock and the picture holds");
  await p.evaluate(() => window.P.play()); await p.waitForTimeout(400);
  ok((await now()) > t3, "play resumes it");
  await p.evaluate(() => window.scrollTo(0, 2500)); await p.waitForTimeout(300);
  const t4 = await now(); await p.waitForTimeout(500);
  ok(t4 === (await now()), "scrolled off screen, its clock stops");
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  ok((await now()) > t4, "back on screen, it runs again");
  if (actions.length) {
    await p.evaluate(() => window.mount({})); await p.waitForTimeout(actions[0].t * 1000 + 300);
    const box = await p.locator("iframe").boundingBox(), hb = await p.locator("#h").boundingBox();
    await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.move(hb.x + hb.width / 2 + 5, hb.y + hb.height / 2 + 5); await p.waitForTimeout(200);
    ok(!(await p.evaluate(() => document.querySelector("iframe").contentWindow.__mmLive.tour.active)), "the visitor's first touch ends the tour");
    await p.mouse.move(0, 0); void box;
  }
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.evaluate(() => window.mount({})); await p.waitForTimeout(300);
  const r0 = await now(); await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => window.P.playing)) && r0 === (await now()), "reduced motion: holds still");
  const hb = await p.locator("#h").boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.move(hb.x + hb.width / 2 + 8, hb.y + hb.height / 2); await p.waitForTimeout(400);
  ok(await p.evaluate(() => window.P.playing) && (await now()) > r0, "reduced motion: the visitor's touch starts it");
  ok(!errs.length, `no page errors${errs.length ? ": " + errs.slice(0, 2).join("; ") : ""}`);
  await b.close(); s.close(); rmSync(hostFile, { force: true });
  console.log(fails.length ? `\n${fails.length} check(s) failed` : "\nPASS  live web export"); if (fails.length) process.exit(1);
}

// 1. Load the piece, record every local file it requests while it draws all its frames.
const srv = await serve(root), browser = await launch(), page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const requested = new Set(), blocked = new Set(), errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("request", r => { if (r.url().startsWith(srv.url)) requested.add(decodeURIComponent(new URL(r.url()).pathname).slice(1)); });
await page.route(u => !/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(u.href), r => { blocked.add(r.request().url().slice(0, 120)); r.abort(); });
await page.goto(`${srv.url}/${path.basename(abs)}?t=0&embed=1`);
await page.waitForFunction(() => typeof window.renderFrame === "function" || (typeof window.__seek === "function" && window.__ready === true), null, { timeout: 30000 })
  .catch(() => die(`${file}: no window.renderFrame after 30 s (page errors: ${errors.join("; ") || "none"})`));

// fps / frames / size: flags, else the page's CONFIG, else the CONFIG literal in the source (module scripts hide it from the page)
const fromPage = await page.evaluate(() => { try { return typeof CONFIG === "object" ? { fps: CONFIG.fps, frames: CONFIG.frames, w: CONFIG.w, h: CONFIG.h } : {}; } catch { return {}; } });
const num = re => { const m = src.match(re); return m ? +m[1] : undefined; };
const fromSrc = { fps: num(/\bfps\s*:\s*(\d+(?:\.\d+)?)/), frames: num(/\bframes\s*:\s*(\d+)/), w: num(/\bw\s*:\s*(\d+)/), h: num(/\bh\s*:\s*(\d+)/) };
const size = (opt("--size") || "").split("x").map(Number);
const pageSize = await page.evaluate(() => window.__size || null);
const META = {
  fps: +opt("--fps", 0) || fromPage.fps || fromSrc.fps,
  frames: +opt("--frames", 0) || fromPage.frames || fromSrc.frames,
  width: size[0] || fromPage.w || pageSize?.[0] || fromSrc.w,
  height: size[1] || fromPage.h || pageSize?.[1] || fromSrc.h,
  title: (src.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim() || slug,
  poster: 0,
};
for (const k of ["fps", "frames", "width", "height"]) if (!(META[k] > 0)) die(`could not find ${k} for ${file}: pass --fps, --frames and --size WxH`);
await page.setViewportSize({ width: META.width, height: META.height });
const adapted = await page.evaluate(fps => { if (typeof window.renderFrame === "function") return false; window.renderFrame = f => window.__seek(f / fps); return true; }, META.fps);
await page.evaluate(() => (window.ready ? window.ready : null));
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => Promise.all([...document.fonts].map(f => (f.status === "unloaded" ? f.load().catch(() => null) : null))));
for (let f = 0; f < META.frames; f++) await page.evaluate(n => window.renderFrame(n), f);
// poster: shown before the piece loads and to visitors who ask for reduced motion. Default: the middle frame (frame 0 is often mid-entrance).
const posterFrame = META.poster = Math.min(META.frames - 1, Math.max(0, Math.round(+opt("--poster", Math.floor(META.frames / 2)))));
await page.evaluate(n => window.renderFrame(n), posterFrame);
await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const poster = await page.screenshot({ type: "jpeg", quality: 85 });
await browser.close(); srv.close();
if (errors.length) die(`page errors while drawing: ${errors.slice(0, 3).join("; ")}`);
if (blocked.size) console.error(`WARN  the piece asked for ${blocked.size} file(s) on other hosts (blocked, not exported): ${[...blocked].slice(0, 3).join(" , ")}`);

// 2. Write the deploy folder: the page as index.html with the bridge appended, every requested file, metadata and poster.
rmSync(dest, { recursive: true, force: true }); mkdirSync(dest, { recursive: true });
const own = path.basename(abs), files = [...requested].filter(p => p && p !== own && !p.startsWith("favicon")).sort();
for (const rel of files) {
  const from = path.join(root, rel), to = path.join(dest, rel);
  if (!from.startsWith(root + path.sep) || !existsSync(from)) continue;
  mkdirSync(path.dirname(to), { recursive: true }); copyFileSync(from, to);
}
const tag = '<script src="mm-embed.js"></script>';
writeFileSync(path.join(dest, "index.html"), /<\/body>/i.test(src) ? src.replace(/<\/body>/i, `${tag}\n</body>`) : `${src.replace(/\s*$/, "")}\n${tag}\n`);
writeFileSync(path.join(dest, "mm-embed.js"), readFileSync(path.join(WEB, "embed.js"), "utf8").replace("__MM_META__", JSON.stringify(META)));
writeFileSync(path.join(dest, "motion.json"), JSON.stringify(META, null, 1));
writeFileSync(path.join(dest, "poster.jpg"), poster);
for (const f of ["motion-player.ts", "motion-player.js", "Motion.tsx", "Motion.jsx"]) copyFileSync(path.join(WEB, f), path.join(out, f));
const secs = (META.frames / META.fps).toFixed(2).replace(/\.?0+$/, "");
writeFileSync(path.join(out, "demo.html"), `<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${META.title}: web export</title>
<style>body{margin:0;padding:24px;font:15px system-ui,sans-serif;background:#f4f4f2;color:#222}main{max-width:${Math.min(960, META.width)}px;margin:auto}
.bar{display:flex;gap:12px;align-items:center;margin-top:12px}input[type=range]{flex:1}button{font:inherit;padding:6px 14px}</style>
<main><h1 style="font-size:18px">${META.title}</h1>
<div id="piece"></div>
<div class="bar"><button id="pp">Pause</button><input id="seek" type="range" min="0" max="${META.frames - 1}" value="0"><span id="fr">0</span></div>
<p>${META.width}x${META.height}, ${META.fps} fps, ${META.frames} frames (${secs} s). Serve this folder over HTTP (for example <code>npx serve .</code>) and open demo.html.</p></main>
<script type="module">
import { mountMotion } from "./motion-player.js";
const pp = document.getElementById("pp"), seek = document.getElementById("seek"), fr = document.getElementById("fr");
const player = mountMotion(document.getElementById("piece"), { src: "./${slug}/", onFrame: f => { seek.value = f; fr.textContent = f; } });
pp.onclick = () => { player.toggle(); pp.textContent = player.playing ? "Pause" : "Play"; };
seek.oninput = () => { player.pause(); pp.textContent = "Play"; player.seek(+seek.value); };
</script>
`);
writeFileSync(path.join(out, "README.md"), `# ${META.title}: web export

${META.width}x${META.height}, ${META.fps} fps, ${META.frames} frames (${secs} s)${adapted ? ", seekable-timeline page adapted to frames" : ""}. Exported by Motionmaker's \`export-web.mjs\`.
It plays live in the browser, frame-exact: frame n on the page is frame n of the rendered video. No sound (the video's sound track is not part of the export).

## Files
- \`${slug}/\`: the piece. Put this folder where your site serves static files (\`public/motions/${slug}/\` in Vite or Next.js).
- \`motion-player.ts\` (\`motion-player.js\` compiled): the player, no dependencies. \`Motion.tsx\` (\`Motion.jsx\`): the React component.
- \`demo.html\`: try it locally: \`npx serve .\` here, then open /demo.html.

## Plain website (no build step)
\`\`\`html
<script type="module">
  import { defineMotionElement } from "/js/motion-player.js";
  defineMotionElement();
</script>
<motion-clip src="/motions/${slug}/" label="${META.title}"></motion-clip>
\`\`\`
Attributes: \`paused\`, \`loop="false"\`, \`speed="0.5"\`, \`fit="contain|cover"\` (fill the element's own box; default keeps the aspect ratio), \`interactive\`, \`label\`.

## JavaScript / TypeScript
\`\`\`ts
import { mountMotion } from "./motion-player";
const player = mountMotion(document.getElementById("hero")!, { src: "/motions/${slug}/", loop: false, onEnd: () => console.log("done") });
player.pause(); await player.seek(${Math.floor(META.frames / 2)}); player.play();
\`\`\`

## React (Vite, Next.js)
Copy \`motion-player.ts\` and \`Motion.tsx\` into your components folder (or the \`.js\`/\`.jsx\` pair for JavaScript projects).
\`\`\`tsx
import { Motion } from "./Motion";
<Motion src="/motions/${slug}/" className="hero-motion" />
<Motion src="/motions/${slug}/" playing={inView} loop={false} onEnd={() => setDone(true)} ref={playerRef} />
\`\`\`
\`Motion.tsx\` starts with "use client", so it works in the Next.js App Router.

## Behaviour
- Shows the poster image (frame ${posterFrame}) until the piece loads, then plays from frame 0; pauses while scrolled off screen or in a background tab, and resumes where it was.
- Visitors with "reduce motion" switched on see the poster frame (frame ${posterFrame}) and nothing plays unless you call \`play()\`; pass \`reducedMotion: "play"\` to ignore the setting.
- The piece sits in an iframe (its styles cannot leak into your page) and ignores clicks unless \`interactive\` is set.
- Hosting the piece on another domain works (the player talks to it by postMessage).
`);
console.log(`exported ${META.title} (${META.width}x${META.height}, ${META.fps} fps, ${META.frames} frames) -> ${out}`);
console.log(`  ${slug}/: index.html + ${files.length} file(s) + mm-embed.js, motion.json, poster.jpg (frame ${posterFrame}; --poster <frame> to choose another)`);

// 3. --check: through the real player, sample frames must equal the renderer's frames, and playback must behave.
if (argv.includes("--check")) {
  const samples = [...new Set([0, Math.floor(META.frames / 4), Math.floor(META.frames / 2), Math.floor(3 * META.frames / 4), META.frames - 1])];
  const ref = await openAnim(abs, META.width, META.height, { fps: META.fps }), want = {};
  for (const f of samples) { await ref.page.evaluate(n => window.renderFrame(n), f); await ref.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); want[f] = await ref.page.screenshot(); }
  await ref.close();
  const hostFile = path.join(out, "__check.html");
  writeFileSync(hostFile, `<!doctype html><meta charset="utf-8"><style>body{margin:0}#h{width:${META.width}px}</style><div id="h"></div>
<script type="module">import { mountMotion } from "./motion-player.js"; window.mount = o => { window.P?.destroy(); window.ends = 0; window.P = mountMotion(document.getElementById("h"), { src: "./${slug}/", pauseOffscreen: false, onEnd: () => window.ends++, ...o }); return window.P.ready.then(() => true); }; window.go = true;</script>`);
  const s2 = await serve(out), b2 = await launch(), p2 = await b2.newPage({ viewport: { width: META.width, height: META.height } });
  const errs = []; p2.on("pageerror", e => errs.push(String(e)));
  const fails = [], ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"}  ${m}`); if (!c) fails.push(m); };
  const paint = () => p2.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p2.goto(`${s2.url}/__check.html`); await p2.waitForFunction(() => window.go);
  await p2.evaluate(() => window.mount({ autoplay: false }));
  const diff = [];
  for (const f of samples) { await p2.evaluate(n => window.P.seek(n), f); await paint(); const got = await p2.locator("#h").screenshot(); if (!got.equals(want[f])) diff.push(f); }
  ok(!diff.length, `frames ${samples.join(", ")} through the player are identical to the renderer's${diff.length ? ` (differ: ${diff.join(", ")})` : ""}`);
  const step = Math.max(1, Math.round(META.fps / 2));
  await p2.evaluate(() => window.P.seek(0)); await p2.evaluate(() => window.P.play()); await p2.waitForTimeout(1000);
  const moved = await p2.evaluate(() => window.P.frame);
  ok(moved >= step, `plays: frame ${moved} after 1 s at ${META.fps} fps`);
  await p2.evaluate(() => window.P.pause()); const a = await p2.evaluate(() => window.P.frame); await p2.waitForTimeout(400);
  ok(a === (await p2.evaluate(() => window.P.frame)), "pause holds the frame");
  if (META.frames > 2 * step) {
    await p2.evaluate(n => window.P.seek(n), META.frames - step); await p2.evaluate(() => window.P.play());
    const wrapped = await p2.waitForFunction(n => window.P.frame < n, META.frames - step, { timeout: 4000 }).then(() => true, () => false);
    ok(wrapped, "loops back to frame 0 after the last frame"); await p2.evaluate(() => window.P.pause());
    await p2.evaluate(() => window.mount({ autoplay: false, loop: false }));
    await p2.evaluate(n => window.P.seek(n), META.frames - step); await p2.evaluate(() => window.P.play());
    const ended = await p2.waitForFunction(() => window.ends === 1 && !window.P.playing, null, { timeout: 4000 }).then(() => true, () => false);
    ok(ended && (await p2.evaluate(() => window.P.frame)) === META.frames - 1, "loop=false stops on the last frame and calls onEnd once");
  }
  await p2.emulateMedia({ reducedMotion: "reduce" });
  await p2.evaluate(() => window.mount({})); await p2.waitForTimeout(600);
  ok(!(await p2.evaluate(() => window.P.playing)) && (await p2.evaluate(() => window.P.frame)) === posterFrame, `reduced motion: shows the poster frame (${posterFrame}), does not autoplay`);
  ok(!errs.length, `no page errors${errs.length ? ": " + errs.slice(0, 2).join("; ") : ""}`);
  await b2.close(); s2.close(); rmSync(hostFile, { force: true });
  console.log(fails.length ? `\n${fails.length} check(s) failed` : "\nPASS  web export"); if (fails.length) process.exit(1);
}
