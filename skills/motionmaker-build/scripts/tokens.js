// Deterministic motion helpers. Include with <script src="tokens.js"> or paste inline.
// Every function is a pure function of its inputs: safe for frame-exact rendering.
(function (g) {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // cubic-bezier(x1,y1,x2,y2) -> easing fn on [0,1]
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
    return x => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 40; i++) { const v = X(t); if (Math.abs(v - x) < 1e-7) break; v < x ? lo = t : hi = t; t = (lo + hi) / 2; }
      return Y(t);
    };
  }
  const EASE = {
    out: bezier(0.16, 1, 0.3, 1), move: bezier(0.76, 0, 0.24, 1),
    in: bezier(0.7, 0, 0.84, 0), pop: bezier(0.34, 1.56, 0.64, 1),
  };
  // Closed-form spring (0 -> 1) at time t seconds. No simulation: frame 84 needs no frame 83.
  function spring(t, { mass = 1, stiffness = 100, damping = 10 } = {}) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
    if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }
  // spring from a damping RATIO and duration-ish frequency (rad/s)
  const springRatio = (t, ratio = 0.8, w0 = 14) => spring(t, { mass: 1, stiffness: w0 * w0, damping: 2 * ratio * w0 });
  const beatFrame = (n, bpm, fps) => Math.round(n * 60 / bpm * fps);         // beat n -> frame
  const phase = (f, N) => f / N;                                             // loop phase, whole cycles only
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); } // seeded
  const lerp = (a, b, t) => a + (b - a) * t;
  g.Motion = { clamp, bezier, EASE, spring, springRatio, beatFrame, phase, rng, lerp };
})(typeof window !== "undefined" ? window : globalThis);
