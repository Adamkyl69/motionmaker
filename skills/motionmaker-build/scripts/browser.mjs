// Shared helpers: resolve playwright from cwd, serve a directory over HTTP (ES modules / importmaps / fonts
// don't work from file://), launch Chromium with software WebGL2 when no GPU is present.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
const { chromium } = createRequire(process.cwd() + "/")("playwright");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".json":"application/json", ".css":"text/css",
  ".png":"image/png", ".jpg":"image/jpeg", ".svg":"image/svg+xml", ".woff2":"font/woff2", ".woff":"font/woff", ".wasm":"application/wasm", ".glb":"model/gltf-binary", ".hdr":"application/octet-stream" };
export function serve(root) {
  const srv = createServer(async (req, res) => {
    try {
      if (req.url.startsWith("/favicon.ico")) { res.writeHead(204).end(); return; }
      const p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (!p.startsWith(root)) { res.writeHead(403).end(); return; }
      const buf = await readFile(p);
      res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" }).end(buf);
    } catch { res.writeHead(404).end("not found"); }
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ url: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() })));
}
// Browser: $CHROMIUM if set, else the container's /opt/pw-browsers/chromium if it exists, else Playwright's own downloaded Chromium
// (`npx playwright install chromium`, or `motionmaker setup --browser`). Software WebGL (SwiftShader) keeps 3D renders reproducible
// without a GPU; set MOTIONMAKER_GPU=1 to use the real GPU instead (faster, may differ slightly between machines).
const chromePath = () => process.env.CHROMIUM || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
export const launch = () => chromium.launch({
  ...(chromePath() ? { executablePath: chromePath() } : {}),
  args: [...(process.env.MOTIONMAKER_GPU ? [] : ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]), "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
// Open anim.html frozen at t=0 and wait for fonts, window.renderFrame and (optionally) window.ready.
// Pages that expose a seekable timeline instead (awesome-ai-motion style: window.__seek(sec) + window.__ready) are adapted:
// renderFrame(f) becomes __seek(f / opts.fps). W/H may be "auto" to use the page's own window.__size (default 1280x720).
export async function openAnim(file, W, H, opts = {}) {
  const abs = path.resolve(file), root = path.dirname(abs), srv = await serve(root), auto = W === "auto";
  const browser = await launch(), page = await browser.newPage({ viewport: { width: auto ? 1280 : W, height: auto ? 720 : H } });
  const errors = []; page.on("pageerror", e => errors.push(String(e))); page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  // Sandbox: only the local server is reachable. Anything else (CDNs, trackers, third-party endpoints) is blocked and reported on stderr.
  const blocked = new Set();
  await page.route(url => !/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(url.href), route => { blocked.add(route.request().url().slice(0, 120)); route.abort(); });
  process.on("exit", () => { if (blocked.size) console.error(`blocked ${blocked.size} non-local request(s): ${[...blocked].slice(0, 5).join(" , ")}`); });
  const ready = () => page.waitForFunction(() => typeof window.renderFrame === "function" || (typeof window.__seek === "function" && window.__ready === true), null, { timeout: 30000 });
  await page.goto(`${srv.url}/${path.basename(abs)}?t=0&embed=1`);
  // embed=1 hides the catalog's reference frame (folio/caption). A few catalog pages script that frame and crash without it
  // (e.g. recipes/scrolldeck-scene queries `.cap`): fall back to the normal frame so they still render.
  try { await page.waitForFunction(() => typeof window.renderFrame === "function" || (typeof window.__seek === "function" && window.__ready === true), null, { timeout: 6000 }); }
  catch { errors.length = 0; console.error("note: page did not become ready in embed mode; retrying with the reference frame visible"); await page.goto(`${srv.url}/${path.basename(abs)}?t=0`); await ready(); }
  const adapted = await page.evaluate(fps => { if (typeof window.renderFrame === "function") return false; window.renderFrame = f => window.__seek(f / fps); return true; }, opts.fps || 30);
  if (auto) { const sz = await page.evaluate(() => window.__size || [1280, 720]); await page.setViewportSize({ width: sz[0], height: sz[1] }); }
  await page.evaluate(() => (window.ready ? window.ready : Promise.resolve()));
  await page.evaluate(() => document.fonts.ready);
  // Load every declared font face (bundled fonts in fonts/fonts.css). Text drawn on a canvas does not request a font by itself, so without this
  // the first frames could be captured in a fallback font.
  await page.evaluate(() => Promise.all([...document.fonts].map(f => f.status === "unloaded" ? f.load().catch(() => null) : null)));
  return { page, errors, adapted, close: async () => { await browser.close(); srv.close(); } };
}
