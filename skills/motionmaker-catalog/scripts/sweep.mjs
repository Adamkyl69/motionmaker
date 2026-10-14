// Sweep every catalog example that has HTML through our adapter and report problems. RUNS THIRD-PARTY PAGES in a sandboxed
// headless browser (only the local static server is reachable; other requests are blocked and counted). Ask the user first.
//   node sweep.mjs [--repo <dir>] [--only slug,slug] [--limit N] [--recipes] [--out report.json] [--stills dir]
// Per page: duration/size, page errors, blocked network requests, determinism (same frame twice), moving timeline (start != end),
// time to render a frame. --stills saves frames at 0, 40% and the end for visual review.
import { launch, serve } from "../../motionmaker-build/scripts/browser.mjs";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i > -1 ? a[i + 1] : d; };
const repo = [opt("--repo"), process.env.AWESOME_AI_MOTION, path.join(os.homedir(), ".cache/awesome-ai-motion")].filter(Boolean).find(r => existsSync(path.join(r, "index.json")));
if (!repo) { console.error("catalog not found (set AWESOME_AI_MOTION or --repo)"); process.exit(3); }
const J = JSON.parse(readFileSync(path.join(repo, "index.json"), "utf8"));
let items = J.effects.filter(e => e.render === "done" && existsSync(path.join(repo, "effects", e.slug, "index.html"))).map(e => ({ id: e.slug, url: `effects/${e.slug}/index.html` }));
if (a.includes("--recipes")) items = J.recipes.filter(r => existsSync(path.join(repo, "recipes", r.slug, "index.html"))).map(r => ({ id: "recipe:" + r.slug, url: `recipes/${r.slug}/index.html` }));
const only = opt("--only"); if (only) items = items.filter(i => only.split(",").includes(i.id.replace("recipe:", "")));
if (opt("--limit")) items = items.slice(0, +opt("--limit"));
const stills = opt("--stills"); if (stills) mkdirSync(stills, { recursive: true });
const srv = await serve(path.resolve(repo)), browser = await launch(), results = [];
for (const it of items) {
  const r = { id: it.id, ok: true, problems: [] }, t0 = Date.now(); let page;
  try {
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = [], blocked = new Set();
    page.on("pageerror", e => errs.push(String(e).slice(0, 160))); page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
    await page.route(u => !/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(u.href), route => { blocked.add(route.request().url().slice(0, 100)); route.abort(); });
    const isReady = () => page.waitForFunction(() => typeof window.__seek === "function" && window.__ready === true, null, { timeout: 6000 });
    await page.goto(`${srv.url}/${it.url}?t=0&embed=1`);
    try { await isReady(); } catch { errs.length = 0; (r.notes ||= []).push("needed non-embed mode (page scripts the reference frame)"); await page.goto(`${srv.url}/${it.url}?t=0`); await isReady(); }
    const { dur, size } = await page.evaluate(() => ({ dur: window.__dur, size: window.__size || [1280, 720] }));
    await page.setViewportSize({ width: size[0], height: size[1] });
    const shot = async s => { await page.evaluate(s => window.__seek(s), s); return page.screenshot(); };
    const mid = dur * 0.4, A = await shot(mid); await shot(0); const B = await shot(mid), first = await shot(0), last = await shot(dur);
    r.dur = dur; r.size = size.join("x");
    // Revisiting a time can differ for two very different reasons: sub-pixel noise (harmless) or timeline state that accumulates as it plays
    // forward (visible: doubled text, stale layers). Measure it. Order-dependent effects are correct only when rendered ONCE, IN ORDER, on a fresh page.
    if (!A.equals(B)) {
      const ta = path.join(os.tmpdir(), "_sweep-a.png"), tb = path.join(os.tmpdir(), "_sweep-b.png"); writeFileSync(ta, A); writeFileSync(tb, B);   // os.tmpdir(): there is no /tmp on Windows
      const m = spawnSync("ffmpeg", ["-hide_banner", "-i", ta, "-i", tb, "-lavfi", "psnr", "-f", "null", "-"], { encoding: "utf8" }).stderr.match(/average:([\d.]+|inf)/);
      r.psnr = m ? +m[1] : null;
      if (r.psnr !== null && r.psnr >= 50) r.notes = [`revisit differs by noise only (${r.psnr.toFixed(0)} dB)`];
      else { r.orderDependent = true; r.problems.push(`ORDER-DEPENDENT: revisiting a time looks different (${r.psnr ? r.psnr.toFixed(0) + " dB" : "?"}); render once, in order, fresh page; never re-render single frames`); }
    }
    let moves = !(first.equals(A) && A.equals(last));
    for (let k = 1; k < 16 && !moves; k++) if (!(await shot(dur * k / 16)).equals(first)) moves = true;      // short effects can be at rest at 0, 40% and the end: sample 15 more points
    if (!moves) { r.ok = false; r.problems.push("nothing changes anywhere in the timeline (16 samples)"); }
    else if (first.equals(last)) (r.notes ||= []).push("start == end (loop or return-to-rest)");
    if (errs.length) { r.ok = false; r.problems.push("page errors: " + [...new Set(errs)].slice(0, 2).join(" | ")); }
    if (blocked.size) { r.problems.push("blocked non-local requests: " + [...blocked].slice(0, 2).join(" , ")); r.blockedCount = blocked.size; }
    if (stills) { const id = it.id.replace(":", "-"); writeFileSync(`${stills}/${id}-0.png`, first); writeFileSync(`${stills}/${id}-mid.png`, A); writeFileSync(`${stills}/${id}-end.png`, last); }
  } catch (e) { r.ok = false; r.problems.push("failed: " + String(e).slice(0, 140)); }
  finally { r.ms = Date.now() - t0; await page?.close(); }
  const tag = !r.ok ? "FAIL" : r.orderDependent ? "ORDR" : "OK  ";
  results.push(r); console.log(`${tag} ${r.id.padEnd(32)} ${String(r.dur ?? "?").padStart(4)}s ${String(r.size ?? "").padEnd(9)} ${String(r.ms).padStart(5)} ms  ${[...r.problems, ...(r.notes || [])].join("; ")}`);
}
await browser.close(); srv.close();
const bad = results.filter(r => !r.ok), ord = results.filter(r => r.ok && r.orderDependent), blk = results.filter(r => r.blockedCount);
console.log(`\n${results.length} pages: ${results.length - bad.length - ord.length} ok, ${ord.length} order-dependent (render once, in order), ${bad.length} failed; ${blk.length} tried non-local requests; total ${(results.reduce((s, r) => s + r.ms, 0) / 1000).toFixed(0)} s`);
if (opt("--out")) writeFileSync(opt("--out"), JSON.stringify(results, null, 1));
process.exit(bad.length ? 1 : 0);
