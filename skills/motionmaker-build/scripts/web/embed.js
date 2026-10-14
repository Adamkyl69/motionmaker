// Motionmaker embed bridge: copied next to an exported piece by export-web.mjs and loaded at the end of its index.html.
// Inside an iframe it lets the parent page (motion-player.js / Motion.tsx) drive the piece frame by frame; opened on its own, it does nothing
// and the page's own live preview plays. The parent owns the clock; this side only draws the latest frame asked for.
(() => {
  const META = __MM_META__;
  const host = window.parent;
  if (host === window) return;
  const post = m => host.postMessage({ mm: 1, ...m }, "*");
  const until = test => new Promise(res => { const t = () => (test() ? res() : setTimeout(t, 20)); t(); });
  // Same readiness rules as the renderer (browser.mjs openAnim): renderFrame or a seekable timeline, window.ready, every font face loaded.
  const drawReady = until(() => typeof window.renderFrame === "function" || (typeof window.__seek === "function" && window.__ready === true))
    .then(() => window.ready || null)
    .then(() => document.fonts.ready)
    .then(() => Promise.all([...document.fonts].map(f => (f.status === "unloaded" ? f.load().catch(() => null) : null))))
    .then(() => (typeof window.renderFrame === "function" ? f => window.renderFrame(f) : f => window.__seek(f / META.fps)));
  let busy = false, want = null, shown = -1;
  // Latest wins: while one frame is drawing, later requests replace each other, so a slow frame never builds a queue.
  async function pump(draw) {
    if (busy) return; busy = true;
    try {
      while (want) { const { frame, seq } = want; want = null; if (frame !== shown) { await draw(frame); shown = frame; } post({ type: "drawn", frame, seq }); }
    } catch (e) { post({ type: "error", message: String(e && e.message || e) }); }
    busy = false;
  }
  addEventListener("message", e => {
    const m = e.data;
    if (e.source !== host || !m || m.mm !== 1 || m.type !== "frame") return;
    want = { frame: Math.max(0, Math.min(META.frames - 1, Math.floor(m.frame))), seq: m.seq };
    drawReady.then(pump);
  });
  drawReady.then(() => post({ type: "ready", ...META }), e => post({ type: "error", message: String(e && e.message || e) }));
})();
