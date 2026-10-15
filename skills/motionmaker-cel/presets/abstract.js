// Experimental / abstract: shapes, lines and colour fields arranged like a composition that keeps re-composing itself: circles that grow and
// orbit, arcs that draw, a grid that tilts, a bold line that swings across, hard-edged colour, a little ink. Animated on ones (smooth), seeded.
window.SCENE = {
  seed: 19, on: 1, ink: "#1d1a24", inkWidth: 4, boil: 0.6, light: [-0.6, -0.8], paper: "#f2ead8",
  fx: { paper: 0.3, grain: 0.04 },
  setup(k) { const r = k.rng; this.bits = Array.from({ length: 14 }, (_, i) => ({ x: r(), y: r(), r: 20 + r() * 120, c: ["#e63946", "#1d3557", "#f4a261", "#2a9d8f", "#e9c46a", "#264653"][i % 6], ph: r() * k.TAU, kind: i % 4, sp: 0.3 + r() * 0.8 })); },
  draw(k) {
    const c = k.ctx, W = k.Wd, T = k.time, E = k.E;
    c.save(); c.translate(W / 2, 500); c.rotate(Math.sin(T * 0.4) * 0.08); c.strokeStyle = "rgba(29,26,36,0.12)"; c.lineWidth = 2; for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(i * 70, -700); c.lineTo(i * 70, 700); c.stroke(); c.beginPath(); c.moveTo(-1200, i * 70); c.lineTo(1200, i * 70); c.stroke(); } c.restore();
    k.shape(k.rect(W * 0.08, 120, W * 0.3 * E.out(k.clamp(T / 1.2)), 380), { fill: "#e9c46a", ink: false, id: 1 });
    k.shape(k.circle(W * 0.62 + Math.cos(T * 0.6) * 40, 430 + Math.sin(T * 0.6) * 30, 240 * E.out(k.clamp((T - 0.2) / 1)), 48), { fill: "#1d3557", ink: false, id: 2 });
    k.shape(k.circle(W * 0.62 + Math.cos(T * 0.6) * 40, 430 + Math.sin(T * 0.6) * 30, 130 * E.out(k.clamp((T - 0.5) / 0.8)), 40), { fill: "#e63946", ink: false, id: 3 });
    this.bits.forEach((b, i) => { const p = E.back(k.clamp((T - 0.3 - i * 0.12) / 0.6)); if (p <= 0) return; const x = b.x * W + Math.cos(T * b.sp + b.ph) * 30, y = b.y * 1000 + Math.sin(T * b.sp + b.ph) * 30;
      if (b.kind === 0) k.shape(k.circle(x, y, b.r * 0.4 * p, 22), { fill: b.c, inkW: 3, id: 10 + i });
      else if (b.kind === 1) { c.save(); c.strokeStyle = b.c; c.lineWidth = 8; c.lineCap = "round"; c.beginPath(); c.arc(x, y, b.r * 0.6, b.ph, b.ph + k.TAU * 0.6 * p); c.stroke(); c.restore(); }
      else if (b.kind === 2) k.shape(k.move([[0, -b.r * 0.5], [b.r * 0.45, b.r * 0.4], [-b.r * 0.45, b.r * 0.4]], x, y, p, 0, 0, T * b.sp), { fill: b.c, inkW: 3, id: 10 + i });
      else k.line([[x - b.r * p, y], [x + b.r * p, y]], { w: 6, color: b.c, id: 10 + i }); });
    const a = -0.6 + Math.sin(T * 0.8) * 0.5; k.line([[W * 0.2, 860], [W * 0.2 + Math.cos(a) * W * 0.7, 860 + Math.sin(a) * W * 0.7]], { w: 10, id: 50 });
    if (window.CEL_TEXT) k.text(window.CEL_TEXT, W / 2, 880, { size: Math.min(110, W * 0.8 / Math.max(4, window.CEL_TEXT.length) * 1.7), at: k.secs * 0.45, fill: "#1d1a24", stroke: 0, shadow: 6, shadowColor: "#e63946", rot: -0.04 });
  },
};
