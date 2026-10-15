// Show, don't ask: the user's own headline in many looks at once, numbered, so they can point at what they imagine ("4 and 7, never 2").
//
//   Round 1  node moodboard.mjs "<headline>" [--tone "calm premium"] [--avoid dark|light] [--looks all|a,b,..] [--styles auto|none|a,b] [--from-image <picture>]
//                               [--accent "#hex"] [--size 400x400] [--out preprod/moodboard]
//   Round 2  node moodboard.mjs "<headline>" --vary <tile number from round 1 | look id> [--from <round-1 moodboard.json>] [--out preprod/moodboard-2]
//   Worlds   node moodboard.mjs "<headline>" --worlds [--look <look>] [--tone "<words>"] [--out preprod/worlds]
//            what KIND OF ANIMATION: kinetic type, logo, chart, product UI, 3D, characters, icons, map, code, equation, hand-drawn marks,
//            a painterly art movement, plus three that need another tool (explained machine, photoreal 3D, real footage or AI video: shown as
//            a card that says what it needs). Every drawn tile is a real sample of the user's words; the board shows three moments of each
//            and writes animation-styles.mp4/.gif with all of them playing. A kind whose library is missing is skipped and named, with its
//            install command; what is never offered is printed on the board.
//
// Round 1 tiles: every look (ordered by --tone), the art styles that fit (--styles auto: two, ranked by the tone words), and, with
// --from-image, a look in the colours of the user's reference picture. Round 2 takes one favourite and changes ONE thing per tile
// (light/dark inverted, two other accents, two other typefaces), so the user can say exactly what they want different.
// Writes <out>/moodboard.png (numbered tiles with captions), moodboard.html and moodboard.json. Every tile carries its build recipe
// (look, template, style, colours): the pick goes straight into scaffold.sh. Read the PNG before showing it.
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ffFont } from "../../motionmaker-build/scripts/platform.mjs";   // a real font file for drawtext (Windows ffmpeg has no default)

const HERE = path.dirname(fileURLToPath(import.meta.url)), SK = path.resolve(HERE, "../.."), AD = path.join(SK, "motionmaker-art-director");
const { serve, launch } = await import(pathToFileURL(path.join(SK, "motionmaker-build/scripts/browser.mjs")).href);
const { fromImage, turnAccent } = await import(pathToFileURL(path.join(AD, "scripts/palette.mjs")).href);
const LOOKS = JSON.parse(readFileSync(path.join(AD, "looks/looks.json"), "utf8")).looks, STYLES = JSON.parse(readFileSync(path.join(AD, "styles/styles.json"), "utf8")).styles;
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i > -1 && a[i + 1] !== undefined ? a[i + 1] : d; };
const text = a[0] && !a[0].startsWith("--") ? a[0] : null;
if (!text) { console.error('usage: moodboard.mjs "<headline>" [--tone ".."] [--styles auto|none|a,b] [--from-image pic] [--size 400x400] [--out dir]\n       moodboard.mjs "<headline>" --vary <tile|look> [--from <moodboard.json>] [--out dir]'); process.exit(1); }
const prevSize = opt("--vary") && opt("--from") && existsSync(opt("--from")) ? JSON.parse(readFileSync(opt("--from"), "utf8")).size : null;  // round 2 keeps round 1's shape
const [W, H] = opt("--size", prevSize || "400x400").split("x").map(Number), FPS = 24, SECS = 6, HOLD = Math.round(FPS * SECS * 0.55);
const worlds = a.includes("--worlds");
const out = path.resolve(opt("--out", opt("--vary") ? "preprod/moodboard-2" : worlds ? "preprod/worlds" : "preprod/moodboard")), work = path.join(out, "work");
const NOT_OFFERED = ["whiteboard hand-writing", "rigged cartoon characters (Pixar or anime style)", "any living artist's or studio's signature style (Ghibli, Kurzgesagt, Vox...)", "photographic realism without footage or Blender"];
const stars = n => "★".repeat(n) + "☆".repeat(3 - n);
const TYPE = { "editorial-calm": "serif", "night-cinema": "serif", "luxe-black-gold": "serif", "warm-craft": "serif", "swiss-minimal": "sans", "bold-launch": "display", "playful-pop": "rounded", "tech-mono": "mono" };

// ---- which tiles
let tiles = [];
rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
if (worlds) {
  const look = opt("--look", "swiss-minimal"), lastWord = text.split(/\s+/).pop(), w = (name, note, template, extra = {}, secs = SECS, win = null) => ({ name, note, ...(win ? { win } : {}), recipe: { template, look, ...(Object.keys(extra).length ? { env: extra } : {}), secs } });
  writeFileSync(path.join(work, "sample.ts"), 'export async function ship(build: Build) {\n  const report = await test(build);\n  if (!report.ok) throw report.error;\n  return deploy(build);\n}\n');
  let peep = null; try { execFileSync("node", [path.join(SK, "motionmaker-assets/scripts/kit.mjs"), "peep", "--hair", "ShortVolumed", "--face", "Cute", "--body", "Shirt", "--out", path.join(work, "peep.svg")], { stdio: ["ignore", "pipe", "pipe"] }); peep = path.join(work, "peep.svg"); } catch {}
  const tw0 = (opt("--tone", "")).toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const topStyle = Object.entries(STYLES).map(([k, st]) => [k, tw0.reduce((t, x) => t + (st.goodFor.toLowerCase().includes(x) ? 2 : 0), 0) + st.rating]).sort((x, y) => y[1] - x[1])[0][0];
  const ex = f => path.resolve(SK, "../examples", f), card = (name, note, route, needs, image) => ({ name, note, card: { route, needs, image: image && existsSync(image) ? image : null }, recipe: { route } });
  tiles = [
    w("Kinetic type", "the words are the animation: no imagery", "title-loop"),
    { name: "Flat design scene", note: "layered flat shapes, a slow camera with parallax, small living motion (example world)", recipe: { template: "flat-scene", env: { SCENE: "coast" }, secs: SECS } },
    { name: "2D cel animation", note: "inked drawings on twos, cel shading, a painted background panning (example shot)", recipe: { template: "cel-scene", env: { SCENE: "night-drive" }, secs: SECS } },
    w("Logo or wordmark", "a brand mark builds and settles", "logo-reveal"),
    w("Animated data", "numbers that grow (example data)", "data-chart"),
    w("Product or screen demo", "a screen, a cursor, a press, a result (placeholder UI)", "product-demo", {}, 20, [4, 5]),
    w("Stylised 3D object", "a product shot in 3D, simple lighting (example object)", "three-product"),
    ...(peep ? [w("Flat illustrated characters", "people in a clean vector style (Open Peeps, CC0)", "illustration-scene", { ASSET: peep })] : [{ skip: "Flat illustrated characters", why: `node ${path.join(SK, "motionmaker-assets/scripts/kit.mjs")} setup` }]),
    w("Animated icons", "three features with icons (example labels)", "icon-features", { ICONS: "lucide:zap,lucide:shield-check,lucide:rocket" }),
    w("Map or route", "places and a route on a globe (example cities)", "map-scene", { PLACES: "Istanbul@41.01,28.98;Berlin@52.52,13.40" }),
    w("Code on screen", "a code reveal with a highlight (example code)", "code-reveal", { CODE: path.join(work, "sample.ts"), FOCUS: "2" }),
    w("Equation", "a formula with the key term marked (example)", "equation-scene", { TEX: "E = \\htmlClass{hl}{mc^2}" }),
    w("Hand-drawn marks", `a sketched circle on "${lastWord}"`, "annotate-scene", { MARK: "circle", KEYWORD: lastWord }),
    { name: `Painterly (${STYLES[topStyle].name})`, note: `an art movement, drawn in code; six to choose from (${Object.values(STYLES).map(x => x.name).join(", ")}); this one fits your words best`, recipe: { template: "style-scene", style: topStyle, secs: SECS } },
    card("Explained machine (Anatomy)", "an interactive isometric figure where how it works IS the idea. Our own example, filmed", "anatomy", "Anatomy installed separately (MIT)", ex("anatomy-raptor-filmed.png")),
    card("Photoreal 3D (Blender)", "real materials, light, glass, physics: product turntables, hero shots", "blender", "Blender (one-time download of about 380 MB, only on your yes). Slow: tens of seconds per frame on a CPU", null),
    card("Real footage or AI video", "your own clips, stock footage or generated shots, edited together", "montage", "OpenMontage installed separately (AGPL). AI shots cost money, with a cap you set", null),
  ];
} else if (opt("--vary")) {
  const v = opt("--vary"), prev = opt("--from") && existsSync(opt("--from")) ? JSON.parse(readFileSync(opt("--from"), "utf8")) : null;
  let base = /^\d+$/.test(v) && prev ? prev.tiles.find(t => t.n === +v)?.recipe : LOOKS[v] ? { template: "title-loop", look: v } : null;
  if (!base) { console.error(`--vary ${v}: give a tile number with --from <round-1 moodboard.json>, or a look id (${Object.keys(LOOKS).join(", ")})`); process.exit(1); }
  if (base.template === "style-scene") { console.error("art styles carry their own palette and type; vary a look tile instead (or build the style as it is)"); process.exit(1); }
  const L = LOOKS[base.look], bg = base.bg || L.bg, fg = base.fg || L.fg, ac = base.accent || L.accent, cat = TYPE[base.look];
  const typeAlts = Object.keys(LOOKS).filter(k => TYPE[k] !== cat && k !== base.look).sort((x, y) => ["sans", "serif", "display", "rounded", "mono"].indexOf(TYPE[x]) - ["sans", "serif", "display", "rounded", "mono"].indexOf(TYPE[y]));
  const seen = new Set(), two = typeAlts.filter(k => !seen.has(TYPE[k]) && seen.add(TYPE[k])).slice(0, 2);
  const warm = turnAccent(bg, ac, 40), far = turnAccent(bg, ac, 150);
  tiles = [
    { name: "Your pick", note: "as chosen", recipe: { template: "title-loop", look: base.look, bg, fg, accent: ac } },
    { name: "Inverted", note: "light and dark swapped", recipe: { template: "title-loop", look: base.look, bg: fg, fg: bg, accent: turnAccent(fg, ac, 0) } },
    { name: `Accent ${warm}`, note: "accent turned 40° round the colour wheel", recipe: { template: "title-loop", look: base.look, bg, fg, accent: warm } },
    { name: `Accent ${far}`, note: "a contrasting accent", recipe: { template: "title-loop", look: base.look, bg, fg, accent: far } },
    ...two.map(k => ({ name: `Type: ${LOOKS[k].bundledFont?.family || LOOKS[k].font.split(",")[0].replace(/'/g, "")}`, note: `${TYPE[k]} type, same colours`, recipe: { template: "title-loop", look: k, bg, fg, accent: ac } })),
  ];
} else {
  const words = (opt("--tone", "")).toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const score = k => words.reduce((s, w) => s + (LOOKS[k].feel.some(f => f.includes(w) || w.includes(f)) ? 3 : 0) + (LOOKS[k].good_for.toLowerCase().includes(w) ? 1 : 0), 0);
  // --avoid dark|light: the user said "not dark" (or "not light"): leave those looks out instead of showing them anyway
  const lumOf = hex => { const n = parseInt(hex.replace("#", ""), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const avoid = opt("--avoid"), keep = k => !avoid || (avoid === "dark" ? lumOf(LOOKS[k].bg) > 0.4 : avoid === "light" ? lumOf(LOOKS[k].bg) <= 0.4 : true);
  const looks = (opt("--looks", "all") === "all" ? Object.keys(LOOKS) : opt("--looks").split(",").map(s => s.trim())).filter(keep).sort((x, y) => score(y) - score(x));
  for (const k of looks) { if (!LOOKS[k]) { console.error(`unknown look ${k}`); process.exit(1); } tiles.push({ name: LOOKS[k].name, note: LOOKS[k].feel.join(", "), recipe: { template: "title-loop", look: k, ...(opt("--accent") ? { accent: opt("--accent") } : {}) } }); }
  const sw = opt("--styles", "auto");
  const styleIds = sw === "none" ? [] : sw === "auto" ? Object.entries(STYLES).map(([k, s]) => [k, words.reduce((t, w) => t + (s.goodFor.toLowerCase().includes(w) ? 2 : 0), 0) + s.rating]).sort((x, y) => y[1] - x[1]).slice(0, 2).map(x => x[0]) : sw.split(",").map(s => s.trim());
  for (const k of styleIds) { if (!STYLES[k]) { console.error(`unknown style ${k}`); process.exit(1); } if (avoid === "dark" && /van-gogh|ukiyo/.test(k)) continue; tiles.push({ name: STYLES[k].name, note: `art style ${stars(STYLES[k].rating)}, ${STYLES[k].era}`, recipe: { template: "style-scene", style: k } }); }
  if (opt("--from-image")) {
    const p = fromImage(opt("--from-image")), top = looks[0];
    tiles.push({ name: "From your picture", note: `its colours ${p.bg} / ${p.fg} / ${p.accent}${p.notes.length ? " (adjusted to read)" : ""}`, recipe: { template: "title-loop", look: top, bg: p.bg, fg: p.fg, accent: p.accent }, palette: p });
  }
}
// ---- render each tile on the real templates (a frame from the hold: the shot's poster); a kind whose library is missing is skipped
const skipped = tiles.filter(t => t.skip); tiles = tiles.filter(t => !t.skip);
const caption = t => t.recipe.template === "icon-features" ? "Fast|Safe|Ready" : text;
tiles = tiles.filter((t, i) => {
  if (t.card) return true;                    // a card is drawn below: nothing to scaffold
  const r = t.recipe, env = { ...process.env, TEMPLATE: r.template, ...(r.look ? { LOOK: r.look } : {}), ...(r.style ? { STYLE: r.style } : {}), ...(r.env || {}) };
  try { execFileSync("bash", [path.join(SK, "motionmaker/scripts/scaffold.sh"), `t${i + 1}`, caption(t), String(W), String(H), String(FPS), String(r.secs || SECS), r.bg || "-", r.fg || "-", r.accent || "-", work], { env, stdio: ["ignore", "pipe", "pipe"] }); t.dir = `t${i + 1}`; return true; }
  catch (e) { const msg = String(e.stderr || e.message).trim().split("\n").pop(); if (!worlds) throw new Error(`tile ${t.name}: ${msg}`); skipped.push({ skip: t.name, why: msg }); return false; }
}).map((t, i) => ({ n: i + 1, ...t }));
const srv = await serve(work), browser = await launch(), errors = [];
const MFPS = 12, shots = [];                  // worlds board: a short moving sample of every drawn tile (MFPS frames a second)
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
for (const t of tiles) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on("pageerror", e => errors.push(`tile ${t.n}: ${e}`));
  if (t.card) {   // not drawn by this tool: say plainly what it is and what it needs (with our own example picture when we have one)
    if (t.card.image) copyFileSync(t.card.image, path.join(work, `card-${t.n}.png`));
    const e = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    await page.goto(`${srv.url}/`).catch(() => null);
    await page.setContent(`<body style="margin:0;width:${W}px;height:${H}px;background:#2b2b2a;color:#f3f1ec;font:${Math.max(11, Math.round(W / 26))}px/1.35 system-ui,sans-serif;overflow:hidden;position:relative">${t.card.image ? `<img src="${srv.url}/card-${t.n}.png" style="position:absolute;inset:0;width:100%;height:62%;object-fit:contain;background:#f3f1ec">` : ""}<div style="position:absolute;left:0;right:0;bottom:0;${t.card.image ? "height:38%" : "top:0"};padding:${Math.round(W / 24)}px;box-sizing:border-box;background:#2b2b2a;display:flex;flex-direction:column;justify-content:center"><div style="opacity:.7;font-size:.8em;letter-spacing:.06em;text-transform:uppercase">${t.card.image ? "our example, not your words" : "no sample drawn here"}</div><div style="margin-top:.4em">Needs: ${e(t.card.needs)}</div></div></body>`);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.complete || new Promise(r => { i.onload = i.onerror = r; }))));
    await page.screenshot({ path: path.join(out, `tile-${t.n}.png`) }); await page.close(); continue;
  }
  await page.goto(`${srv.url}/${t.dir}/anim.html?t=0&embed=1`);
  await page.waitForFunction(() => typeof window.renderFrame === "function", null, { timeout: 30000 });
  await page.evaluate(() => (window.ready ? window.ready : null)); await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.fonts].map(f => (f.status === "unloaded" ? f.load().catch(() => null) : null))));
  const secs = t.recipe.secs || SECS;
  if (worlds) {   // the moving sample: real time from the window's start, MFPS frames a second
    const [s0, d] = t.win || [0, Math.min(secs, 5)], nf = Math.round(d * MFPS), md = path.join(work, t.dir, "m"); mkdirSync(md, { recursive: true });
    for (let k = 0; k < nf; k++) { await page.evaluate(f => window.renderFrame(f), Math.round((s0 + k / MFPS) * FPS)); await settle(page); await page.screenshot({ path: path.join(md, `m${String(k).padStart(3, "0")}.png`) }); }
    t.motion = { start: s0, secs: d, fps: MFPS, frames: nf };
    [0.2, 0.35, 0.55].forEach((x, j) => copyFileSync(path.join(md, `m${String(Math.min(nf - 1, Math.round(x * nf))).padStart(3, "0")}.png`), path.join(out, `tile-${t.n}-m${j + 1}.png`)));
  }
  await page.evaluate(f => window.renderFrame(f), Math.round(FPS * secs * 0.55)); await settle(page);
  await page.screenshot({ path: path.join(out, `tile-${t.n}.png`) }); await page.close();
}
// ---- the sheet: an HTML page (also embedded in the pre-production board) screenshotted to PNG
const cols = tiles.length <= 4 ? tiles.length : tiles.length <= 6 ? 3 : 4, tw = Math.min(W, 300), th = Math.round(tw * H / W);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const html = `<!doctype html><meta charset="utf-8"><title>Mood board</title>
<style>body{margin:0;padding:18px;background:#E9E8E4;font:14px/1.35 system-ui,sans-serif;color:#1d1d1b}h1{font-size:16px;margin:0 0 4px}p.sub{margin:0 0 14px;color:#555}
.g{display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:14px}.t{background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px #0002}
.t img.p{display:block;width:${tw}px;height:${th}px}.m{display:flex;gap:2px;background:#fff}.m img{width:${Math.floor((tw - 4) / 3)}px;display:block}.no{margin-top:14px;color:#555;font-size:12.5px;max-width:${cols * tw + (cols - 1) * 14}px}.c{padding:8px 10px 10px}.n{font-weight:700;font-size:15px}.k{color:#666;font-size:12.5px;margin-top:2px}</style>
<h1>${opt("--vary") ? "Round 2: your favourite, one change per tile" : worlds ? "What kind of animation" : "Mood board"}: “${esc(text)}”</h1>
<p class="sub">${opt("--vary") ? "Which is closest to what you imagine? Say the number, or combine (for example: 3's accent with 5's type)." : worlds ? "Each is a real sample of your words. The three small frames show how it moves (animation-styles.mp4 plays them all). Say the numbers that fit your video: several are fine, one per scene, and they can share one look. Anything not here (planets, animals, a scene from a story) is drawn in code for your piece and sketched on the storyboard before it is built." : "Say the numbers you like and any you would never want. Combinations are fine (for example: 4's colours with 7's type)."}</p>
<div class="g">${tiles.map(t => `<div class="t"><img class="p" src="tile-${t.n}.png" alt="">${t.motion ? `<div class="m">${[1, 2, 3].map(j => `<img src="tile-${t.n}-m${j}.png" alt="">`).join("")}</div>` : ""}<div class="c"><div class="n">${t.n}. ${esc(t.name)}</div><div class="k">${esc(t.note)}</div></div></div>`).join("")}</div>${worlds ? `<p class="no"><b>Not offered:</b> ${NOT_OFFERED.map(esc).join(" · ")}</p>` : ""}`;
writeFileSync(path.join(out, "moodboard.html"), html);
const sheet = await browser.newPage({ viewport: { width: 36 + cols * tw + (cols - 1) * 14, height: 400 } });
await sheet.goto(pathToFileURL(path.join(out, "moodboard.html")).href); await sheet.screenshot({ path: path.join(out, "moodboard.png"), fullPage: true });
await browser.close(); srv.close();
let video = null;
if (worlds) {   // every tile playing at once (numbered, looping): animation-styles.mp4 and .gif. The board's filmstrips already carry the movement if this fails.
  try {
    const run = args => execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...args], { stdio: ["ignore", "pipe", "pipe"] }), D = 5, size = Math.max(10, Math.round(H / 15));
    const strip = (H + size + 14) % 2 ? size + 15 : size + 14, cw = W - (W % 2), ch = H + strip;
    const label = n => `pad=iw:ih+${strip}:0:${strip}:color=0x222222,drawtext=${ffFont()}text='${n}':x=10:y=7:fontsize=${size}:fontcolor=white,scale=${cw}:${ch}`;
    const cells = tiles.map(t => { const f = path.join(work, `cell-${t.n}.mp4`), name = `${t.n}  ${t.name}`.replace(/[':\\,]/g, "").slice(0, 34);
      run(t.motion ? ["-framerate", String(MFPS), "-i", path.join(work, t.dir, "m", "m%03d.png"), "-vf", label(name), "-t", String(D), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "22", f]
        : ["-loop", "1", "-framerate", String(MFPS), "-i", path.join(out, `tile-${t.n}.png`), "-t", String(D), "-vf", label(name), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "22", f]); return f; });
    const gc = cols, rows = Math.ceil(cells.length / gc), blanks = gc * rows - cells.length, all = [...cells];
    for (let i = 0; i < blanks; i++) { const f = path.join(work, `blank-${i}.mp4`); run(["-f", "lavfi", "-i", `color=c=0x222222:s=${cw}x${ch}:r=${MFPS}:d=${D}`, "-pix_fmt", "yuv420p", "-c:v", "libx264", f]); all.push(f); }
    const lay = all.map((_, i) => `${(i % gc) * cw}_${Math.floor(i / gc) * ch}`).join("|");
    const mp4 = path.join(out, "animation-styles.mp4");
    run([...all.flatMap(f => ["-i", f]), "-filter_complex", `${all.map((_, i) => `[${i}]`).join("")}xstack=inputs=${all.length}:layout=${lay}:fill=0x222222`, "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "22", "-movflags", "+faststart", mp4]);
    run(["-i", mp4, "-vf", `fps=10,scale=${Math.min(gc * cw, 1100)}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`, "-loop", "0", path.join(out, "animation-styles.gif")]);
    video = "animation-styles.mp4";
  } catch (e) { console.error(`note: the moving sample was not made (${String(e.stderr || e.message).trim().split("\n").pop()}); the board's three frames per tile still show the movement`); }
}
rmSync(work, { recursive: true, force: true });
tiles.forEach(t => delete t.dir);
writeFileSync(path.join(out, "moodboard.json"), JSON.stringify({ text, round: opt("--vary") ? 2 : worlds ? "worlds" : 1, size: `${W}x${H}`, tone: opt("--tone") || null, tiles, skipped, ...(worlds ? { notOffered: NOT_OFFERED, video } : {}) }, null, 1));
if (errors.length) console.error(`page errors: ${errors.join("; ")}`);
console.log(`${out}/moodboard.png (${tiles.length} tiles${worlds ? ", three frames of movement each" : ""}), moodboard.html, moodboard.json${video ? `, ${video} + .gif (all tiles playing)` : ""}`);
tiles.forEach(t => console.log(`  ${String(t.n).padStart(2)}. ${t.name.padEnd(28)} ${t.note}`));
skipped.forEach(s => console.log(`  skipped: ${s.skip} (${s.why})`));
if (worlds) console.log(`  not offered: ${NOT_OFFERED.join("; ")}`);
const pal = tiles.find(t => t.palette); if (pal) { console.log(`\nFrom the picture: ${JSON.stringify(pal.palette.swatches.slice(0, 5).map(s => s.hex))}`); pal.palette.notes.forEach(n => console.log("  note: " + n)); }
console.log(`\nRecipe of a pick: moodboard.json tiles[n-1].recipe -> TEMPLATE=<template> LOOK=<look> [STYLE=<style>] scaffold.sh ... <bg> <fg> <accent> ("-" = the look's own)`);
