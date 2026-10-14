// Motionmaker live bridge, for pages that animate in real time (Anatomy figures, web demos) exported with `export-web.mjs --live`.
// Injected as the FIRST script of the page, so the page only ever sees these clocks. Inside the player's iframe it gives the parent
// play / pause (off screen, background tab, reduced motion), plays the scripted tour live, and hands control to the visitor at their first
// touch. Opened on its own, it does nothing and the page runs as published.
(() => {
  const CFG = __MM_LIVE__;
  const host = window.parent;
  if (host === window) return;
  const post = m => host.postMessage({ mm: 1, ...m }, "*");
  const rp = performance.now.bind(performance), RD = Date;
  const realRAF = window.requestAnimationFrame.bind(window), realCAF = window.cancelAnimationFrame.bind(window);
  const realST = window.setTimeout.bind(window), realCT = window.clearTimeout.bind(window);

  // Pausable time: page time = real time minus the time spent paused, for performance.now, Date, rAF timestamps and timers.
  let paused = false, pausedAt = 0, lost = 0;
  const vnow = () => (paused ? pausedAt : rp()) - lost;
  const d0 = RD.now() - rp();
  performance.now = vnow;
  window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(d0 + vnow()); } static now() { return d0 + vnow(); } };

  // One real frame request at a time: callbacks that ask for the next frame while the pump runs (every animation loop does) only queue,
  // and the pump asks for one frame at the end. (Asking from inside the pump as well doubled the pumps every frame.)
  const q = new Map(); let rid = 0, pumping = 0, inPump = false;
  const pump = () => {
    pumping = 0; if (paused) return;
    const cbs = [...q.values()], t = vnow(); q.clear(); inPump = true;
    for (const cb of cbs) { try { cb(t); } catch (e) { console.error(e); } }
    inPump = false;
    if (q.size && !paused && !pumping) pumping = realRAF(pump);
  };
  window.requestAnimationFrame = cb => { q.set(++rid, cb); if (!pumping && !paused && !inPump) pumping = realRAF(pump); return rid; };
  window.cancelAnimationFrame = id => { q.delete(id); };

  const timers = new Map(); let tid = 0, sched = 0;
  function arm() {
    if (sched) { realCT(sched); sched = 0; }
    if (paused || !timers.size) return;
    let next = Infinity; for (const t of timers.values()) next = Math.min(next, t.due);
    sched = realST(fire, Math.max(0, next - vnow()));
  }
  function fire() {
    sched = 0;
    const now = vnow(), due = [...timers].filter(([, t]) => t.due <= now).sort((a, b) => a[1].due - b[1].due);
    for (const [id, t] of due) {
      if (paused || !timers.has(id)) continue;
      if (t.every) t.due = now + t.every; else timers.delete(id);
      try { t.f(...t.a); } catch (e) { console.error(e); }
    }
    arm();
  }
  const fn = f => (typeof f === "function" ? f : () => {});
  window.setTimeout = (f, d = 0, ...a) => { timers.set(++tid, { due: vnow() + Math.max(0, +d || 0), f: fn(f), a }); arm(); return tid; };
  window.setInterval = (f, d = 0, ...a) => { const every = Math.max(1, +d || 0); timers.set(++tid, { due: vnow() + every, every, f: fn(f), a }); arm(); return tid; };
  window.clearTimeout = window.clearInterval = id => { timers.delete(id); arm(); };

  let frozen = [];
  function run(on) {
    if (on === !paused) return;
    if (!on) {
      pausedAt = rp(); paused = true;
      if (pumping) { realCAF(pumping); pumping = 0; }
      arm();
      frozen = document.getAnimations().filter(a => a.playState === "running");
      frozen.forEach(a => a.pause());
    } else {
      lost += rp() - pausedAt; paused = false;
      frozen.forEach(a => { try { a.play(); } catch {} }); frozen = [];
      if (q.size && !pumping) pumping = realRAF(pump);
      arm(); if (tour.active) tourLoop();
    }
    post({ type: "state", playing: on });
  }

  // The scripted tour, in page time (so it pauses with everything else). Same actions as film-realtime.mjs: hover, move, click, key, leave.
  const tour = { active: false, t0: 0, i: 0, moves: [], sent: 0, last: null, raf: 0 };
  const point = (sel, fx = 0.5, fy = 0.5) => {
    const el = sel ? document.querySelector(sel) : document.documentElement; if (!el) return null;
    const r = el.getBoundingClientRect(); return [r.left + r.width * fx, r.top + r.height * fy];
  };
  const chain = el => { const c = []; for (let n = el; n && n.nodeType === 1; n = n.parentElement) c.unshift(n); return c; };
  const init = (x, y, extra) => ({ bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 1, pointerType: "mouse", isPrimary: true, view: window, ...extra });
  const send = (el, type, x, y, extra = {}) => { tour.sent++; const P = type.startsWith("pointer") ? PointerEvent : MouseEvent; el.dispatchEvent(new P(type, init(x, y, extra))); };
  function pointerTo(x, y) {
    const to = x == null ? null : document.elementFromPoint(x, y), from = tour.last;
    if (to !== from) {
      const a = from ? chain(from) : [], b = to ? chain(to) : [];
      let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++;
      if (from) { send(from, "pointerout", x, y); send(from, "mouseout", x, y); for (const n of a.slice(k).reverse()) { send(n, "pointerleave", x, y, { bubbles: false }); send(n, "mouseleave", x, y, { bubbles: false }); } }
      if (to) { send(to, "pointerover", x, y); send(to, "mouseover", x, y); for (const n of b.slice(k)) { send(n, "pointerenter", x, y, { bubbles: false }); send(n, "mouseenter", x, y, { bubbles: false }); } }
      tour.last = to;
    }
    if (to) { send(to, "pointermove", x, y); send(to, "mousemove", x, y); }
  }
  const ease = k => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
  function tourLoop() {
    if (tour.raf || !tour.active || paused) return;
    tour.raf = realRAF(() => { tour.raf = 0; if (!tour.active || paused) return; tourStep(); tourLoop(); });
  }
  function tourStep() {
    const t = (vnow() - tour.t0) / 1000, acts = CFG.actions;
    while (tour.i < acts.length && acts[tour.i].t <= t) {
      const a = acts[tour.i++];
      if (a.do === "hover") { const p = point(a.selector, a.x, a.y); if (p) pointerTo(...p); }
      else if (a.do === "leave") pointerTo(null, null);
      else if (a.do === "click") { const p = point(a.selector, a.x, a.y); if (p) { pointerTo(...p); const el = tour.last; if (el) { send(el, "pointerdown", ...p, { buttons: 1 }); send(el, "mousedown", ...p, { buttons: 1 }); send(el, "pointerup", ...p); send(el, "mouseup", ...p); send(el, "click", ...p); } } }
      else if (a.do === "key") { const el = document.activeElement || document.body; for (const type of ["keydown", "keyup"]) { tour.sent++; el.dispatchEvent(new KeyboardEvent(type, { key: a.key, code: a.key.length === 1 ? "Key" + a.key.toUpperCase() : a.key, bubbles: true, cancelable: true, composed: true })); } }
      else if (a.do === "move") { const f = point(a.selector, ...(a.from || [0.2, 0.5])), e = point(a.selector, ...(a.to || [0.8, 0.5])); if (f && e) tour.moves.push({ t: a.t, dur: a.dur || 1, f, e }); }
    }
    for (const m of tour.moves) if (t >= m.t) { const k = ease(Math.min(1, (t - m.t) / m.dur)); pointerTo(m.f[0] + (m.e[0] - m.f[0]) * k, m.f[1] + (m.e[1] - m.f[1]) * k); }
    tour.moves = tour.moves.filter(m => t < m.t + m.dur);
    if (tour.i >= acts.length && !tour.moves.length) {
      if (CFG.repeat > 0 && t >= CFG.repeat) { tour.t0 = vnow(); tour.i = 0; } else if (!(CFG.repeat > 0)) tour.active = false;
    }
  }
  function takeOver() {
    if (tour.active) { tour.active = false; tour.moves = []; if (tour.raf) { realCAF(tour.raf); tour.raf = 0; } }
    post({ type: "input" });
  }
  // The visitor's own events are trusted; the tour's are not. The first real touch ends the tour (the figure is theirs from then on).
  // Chrome also sends trusted pointer moves of its own when content moves under a resting cursor (scrolling, layout): those report no
  // movement and do not count, or scrolling past the figure would end the tour.
  for (const type of ["pointerdown", "pointermove", "keydown", "touchstart"]) addEventListener(type, e => {
    if (e.isTrusted && (type !== "pointermove" || e.movementX || e.movementY)) takeOver();
  }, { capture: true, passive: true });

  addEventListener("message", e => {
    const m = e.data;
    if (e.source !== host || !m || m.mm !== 1) return;
    if (m.type === "run") run(!!m.on);
  });
  window.__mmLive = { now: vnow, tour, run };
  addEventListener("load", () => {
    scrollTo(0, 0);
    document.fonts.ready.then(() => {
      if (CFG.actions && CFG.actions.length) { tour.active = true; tour.t0 = vnow(); tourLoop(); }
      post({ type: "ready", ...CFG.info });
    });
  });
})();
