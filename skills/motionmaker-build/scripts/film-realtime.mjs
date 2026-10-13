// Film a page that animates in REAL time (requestAnimationFrame, timers, CSS animations): web demos, interactive figures (Anatomy), catalog pages,
// a user's own site animation. It replaces the page's clocks with a virtual clock and steps it exactly one frame per capture, so the film is
// frame-exact and repeatable even though the page was never written for video.
//
//   node film-realtime.mjs <page.html|url-path> <seconds> <fps> [--size 1280x800] [--clip "<css selector>"] [--scale 2]
//        [--frame 1920x1080 --bg "#F4F3EE"] [--actions actions.json] [--css "<extra css>"] [--warmup 0.5] [--seed 7] [--out out/frames] [--check]
// --css adapts a page for video without editing it (e.g. hide "hover to..." hints that address an interactive reader).
//
// Virtualised: performance.now, Date, requestAnimationFrame, setTimeout/setInterval, CSS/Web animations, Math.random (seeded), IntersectionObserver (all visible).
// Painting: CPU rasterisation and compositing (WebGL itself still renders through its GL context) and two real frames before each capture, so the same DOM always gives the same pixels.
// NOT virtualised: Web Workers, <video>/<audio> playback, WebAudio clocks, network timing. --check films twice and fails if a single frame differs.
// --clip films one element (e.g. ".iso-figure" for Anatomy figures); --frame scales and pads every frame to an exact output size on --bg.
// actions.json: timed input, applied before the frame at that time:
//   [{ "t": 1.0, "do": "hover", "selector": ".stage", "x": 0.5, "y": 0.5 },          x/y = fraction of the element's box
//    { "t": 2.0, "do": "move", "selector": ".stage", "from": [0.2,0.5], "to": [0.8,0.5], "dur": 1.5 },   pointer glides (one event per frame)
//    { "t": 4.0, "do": "click", "selector": "button" }, { "t": 5.0, "do": "key", "key": "ArrowRight" }, { "t": 6.0, "do": "leave" }]
// Pages are untrusted input: the page runs sandboxed in headless Chromium and every non-local request is blocked.
import { launch, serve } from "./browser.mjs";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const [file, secsA, fpsA] = argv; const secs = +secsA, fps = +fpsA, N = Math.round(secs * fps);
if (!file || !existsSync(file) || !(secs > 0) || !(fps > 0)) { console.error('usage: film-realtime.mjs <page.html> <seconds> <fps> [--size WxH] [--clip sel] [--scale 2] [--frame WxH --bg "#hex"] [--actions a.json] [--warmup 0.5] [--out dir] [--check]'); process.exit(1); }
const [VW, VH] = opt("--size", "1280x800").split("x").map(Number), clipSel = opt("--clip"), dpr = Math.max(1, Math.round(+opt("--scale", 1))),   // whole-number scales only: fractional ones rasterise text differently from run to run
      out = path.resolve(opt("--out", "out/frames")), seed = +opt("--seed", 7), warm = +opt("--warmup", 0.5);
const actions = opt("--actions") ? JSON.parse(readFileSync(opt("--actions"), "utf8")).sort((a, b) => a.t - b.t) : [];
const CLOCK = `(() => { let now = 0, rid = 0, tid = 0, seed = ${seed} || 1; const start = 1700000000000, rafQ = new Map(), timers = new Map();
  const realRAF = window.requestAnimationFrame.bind(window);   // kept for one job: waiting until the browser has really painted a stepped frame
  performance.now = () => now; const D = Date; window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [start + now])); } static now() { return start + now; } };
  Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  window.requestAnimationFrame = cb => (rafQ.set(++rid, cb), rid); window.cancelAnimationFrame = id => rafQ.delete(id);
  window.setTimeout = (f, d = 0, ...a) => (timers.set(++tid, { at: now + Math.max(0, +d || 0), f: typeof f === "function" ? f : () => {}, a }), tid); window.clearTimeout = id => { stopped.add(id); timers.delete(id); };
  const stopped = new Set();   // an interval is taken off the queue while it runs, so "still scheduled?" cannot tell whether it was cleared
  window.setInterval = (f, d = 0, ...a) => { const id = ++tid, p = Math.max(1, +d || 0), tick = () => { f(...a); if (!stopped.has(id)) timers.set(id, { at: now + p, f: tick, a: [] }); }; timers.set(id, { at: now + p, f: tick, a: [] }); return id; }; window.clearInterval = id => { stopped.add(id); timers.delete(id); };
  // IntersectionObserver: real ones fire on the browser's own schedule (the main source of unrepeatable starts). Here every observed element is
  // reported visible, delivered at the next virtual frame, so a page that waits to be on screen starts at the same virtual time on every run.
  // Input gate: Chrome synthesises pointer/mouse events on its own schedule (after scrolls, layout changes), which real-time pages treat as the
  // user (a figure stops its tour at a random frame). Only events sent by a scripted action get through; everything else is stopped at the window.
  let input = false; for (const type of ["pointerover", "pointerenter", "pointerout", "pointerleave", "pointermove", "pointerdown", "pointerup", "mouseover", "mouseenter", "mouseout", "mouseleave", "mousemove", "mousedown", "mouseup", "click"])
    window.addEventListener(type, e => { if (!input) e.stopImmediatePropagation(); }, true);
  const seenAnims = new WeakMap(), ioQ = []; window.IntersectionObserver = class { constructor(cb) { this.cb = cb; this.on = true; }
    observe(el) { ioQ.push(() => { if (!this.on) return; const r = el.getBoundingClientRect(); this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1, time: now, boundingClientRect: r, intersectionRect: r, rootBounds: null }], this); }); }
    unobserve() {} disconnect() { this.on = false; } takeRecords() { return []; } };
  window.__film = { painted: () => new Promise(r => realRAF(() => realRAF(r))), input: v => { input = v; }, pending: () => rafQ.size + ioQ.length, now: () => now, advance(ms) { const end = now + ms; while (ioQ.length) { try { ioQ.shift()(); } catch (e) { console.error(e); } }
    for (;;) { let nx = null; for (const [id, t] of timers) if (t.at <= end && (!nx || t.at < nx[1].at)) nx = [id, t]; if (!nx) break; now = nx[1].at; timers.delete(nx[0]); try { nx[1].f(...nx[1].a); } catch (e) { console.error(e); } }
    now = end; const cbs = [...rafQ.values()]; rafQ.clear(); for (const cb of cbs) { try { cb(now); } catch (e) { console.error(e); } }
    // Looping CSS animations (flowing dashes, pulses) follow the document's virtual clock: their phase is just \`now\`, so it does not matter when the
    // browser (re)creates their Animation objects. One-shot animations and transitions run from the frame they first appear in.
    for (const an of document.getAnimations()) { try { const loop = an.effect && an.effect.getTiming().iterations === Infinity;
      if (!loop && !seenAnims.has(an)) seenAnims.set(an, end - ms); an.pause(); an.currentTime = loop ? now : now - seenAnims.get(an); } catch {} } return now; } };
})();`;

async function film(dest) {
  const srv = await serve(path.dirname(path.resolve(file))), browser = await launch(["--disable-gpu-rasterization", "--disable-gpu-compositing"]),   // CPU raster + compositing: on software GL, GPU raster and WebGL compositing vary by a few pixels run to run
        page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: dpr }), errs = [];
  page.on("pageerror", e => errs.push(String(e).slice(0, 160))); await page.route(u => !/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(u.href), r => r.abort());
  await page.addInitScript(CLOCK); if (opt("--css")) await page.addInitScript(css => document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); }), opt("--css"));
  await page.goto(`${srv.url}/${path.basename(file)}`); await page.waitForLoadState("load"); await page.evaluate(() => document.fonts.ready);
  // frame the element FIRST (scrolling changes what observers report), then let the page settle, then start virtual time
  let clip = null; if (clipSel) { const r = await page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: "center" }); const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }, clipSel);
    if (!r) throw new Error(`--clip: nothing matches ${clipSel}`); clip = r; if (r.width > VW || r.height > VH) console.error(`note: ${clipSel} (${Math.round(r.width)}x${Math.round(r.height)}) is larger than the viewport ${VW}x${VH}: raise --size`); }
  // settle before virtual time starts: observers (IntersectionObserver, ResizeObserver) fire on the browser's real schedule
  await page.waitForFunction(() => window.__film.pending() > 0, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400);
  for (let t = 0; t < warm * 1000; t += 1000 / fps) await page.evaluate(ms => window.__film.advance(ms), 1000 / fps);   // warm-up: not filmed
  const box = async (sel) => sel ? page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sel) : { x: 0, y: 0, w: VW, h: VH };
  const at = async (sel, fx = 0.5, fy = 0.5) => { const b = await box(sel); if (!b) throw new Error(`action: nothing matches ${sel}`); return [b.x + b.w * fx, b.y + b.h * fy]; };
  mkdirSync(dest, { recursive: true }); const hashes = [], moves = []; let ai = 0;
  for (let f = 0; f < N; f++) {
    const t = f / fps;
    if (ai < actions.length && actions[ai].t <= t + 1e-9 || moves.some(m => t >= m.t && t <= m.t + m.dur + 1 / fps)) await page.evaluate(() => window.__film.input(true));
    while (ai < actions.length && actions[ai].t <= t + 1e-9) { const a = actions[ai++];
      if (a.do === "hover") await page.mouse.move(...await at(a.selector, a.x, a.y)); else if (a.do === "leave") await page.mouse.move(VW - 2, VH - 2);
      else if (a.do === "click") { await page.mouse.move(...await at(a.selector, a.x, a.y)); await page.mouse.down(); await page.mouse.up(); }
      else if (a.do === "key") await page.keyboard.press(a.key); else if (a.do === "move") moves.push({ ...a, from: await at(a.selector, ...(a.from || [0.2, 0.5])), to: await at(a.selector, ...(a.to || [0.8, 0.5])) });
      else throw new Error(`unknown action ${a.do}`); }
    for (const m of moves) if (t >= m.t && t <= m.t + m.dur + 1 / fps) { const k = Math.min(1, (t - m.t) / m.dur), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; await page.mouse.move(m.from[0] + (m.to[0] - m.from[0]) * e, m.from[1] + (m.to[1] - m.from[1]) * e); }
    await page.evaluate(ms => { window.__film.input(false); window.__film.advance(ms); }, 1000 / fps);
    await page.evaluate(() => window.__film.painted());   // two real frames: the stepped DOM is laid out, painted and committed before capture
    const png = await page.screenshot(clip ? { clip } : {}); hashes.push(createHash("sha1").update(png).digest("hex").slice(0, 10)); writeFileSync(path.join(dest, `f${String(f).padStart(4, "0")}.png`), png);
  }
  await browser.close(); srv.close(); return { hashes, errs };
}
const a = await film(out);

if (opt("--frame")) { const [FW, FH] = opt("--frame").split("x").map(Number), bg = opt("--bg", "#FFFFFF").replace("#", "0x"), tmp = out + ".framed";
  mkdirSync(tmp, { recursive: true }); execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-start_number", "0", "-i", path.join(out, "f%04d.png"), "-vf", `scale=${FW}:${FH}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${FW}:${FH}:(ow-iw)/2:(oh-ih)/2:color=${bg}`, "-start_number", "0", path.join(tmp, "f%04d.png")]);
  for (const f of readdirSync(out)) rmSync(path.join(out, f)); for (const f of readdirSync(tmp)) execFileSync("mv", [path.join(tmp, f), path.join(out, f)]); rmSync(tmp, { recursive: true }); }
const distinct = new Set(a.hashes).size;
console.log(`${out}: ${N} frames (${distinct} distinct)${a.errs.length ? `; page errors: ${a.errs.join(" | ")}` : ""}`);
if (distinct < 2) console.log("WARN  nothing moved: the page may wait for input (add --actions) or animate with something not virtualised");
if (argv.includes("--check")) { const b = await film(out + ".check"); rmSync(out + ".check", { recursive: true });
  const diff = a.hashes.findIndex((h, i) => h !== b.hashes[i]); if (diff >= 0) { console.log(`FAIL  not repeatable: frame ${diff} differs between two films (something in the page runs outside the virtual clock: see the NOT virtualised list)`); process.exit(1); }
  console.log("PASS  repeatable: two films are identical frame for frame"); }
