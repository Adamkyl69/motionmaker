// Bauhaus (1919-1933): primary colours, circle / square / triangle, heavy bars, asymmetric balance, geometric sans set at an angle.
// Main action: the headline slides in along its bar; the composition snaps together around it.
// Motifs: (1) a black pointer bar sweeps like a dial, (2) a 3x3 grid recolours in steps (12 fps, not smooth: printed, not digital),
// (3) concentric arcs breathe out from the red circle.
window.STYLE = {
  id: "bauhaus", font: "'Poppins', 'Futura', 'Century Gothic', sans-serif", weight: 800,
  pal: { paper: "#EDE5D3", ink: "#171615", red: "#D3262B", blue: "#2A58B4", yellow: "#EFC12F", grey: "#C6C3BB" },
  setup(ctx, e) {
    const P = this.pal; this.grid = Array.from({ length: 9 }, () => Math.floor(e.rng() * 4));
    this.pool = [P.red, P.blue, P.yellow, P.paper];
    this.paper = document.createElement("canvas"); this.paper.width = e.W; this.paper.height = e.H;          // aged paper: cached once
    const g = this.paper.getContext("2d"); g.fillStyle = P.paper; g.fillRect(0, 0, e.W, e.H);
    for (let i = 0; i < e.W * e.H / 900; i++) { g.fillStyle = `rgba(60,40,20,${0.025 + e.rng() * 0.04})`; g.fillRect(e.rng() * e.W, e.rng() * e.H, 1 + e.rng() * 2, 1 + e.rng() * 2); }
    this.dial = e.loop(6); this.breath = e.loop(3);
  },
  draw(ctx, e, f) {
    const P = this.pal, { W, H, u } = e, tall = W / H < 1.3, t = f / e.fps, out = e.exit(f), comp = e.enter(f, 0, 18, e.EASE.move) * (1 - out);
    ctx.drawImage(this.paper, 0, 0);
    // layout: red circle top-right, grid bottom-left, bar + headline diagonal across the middle
    const cx = W * (tall ? 0.68 : 0.74), cy = H * (tall ? 0.26 : 0.32), R = Math.min(W, H) * 0.2;
    // motif 3: concentric arcs breathing out of the circle
    for (let k = 0; k < 5; k++) { const ph = ((t / this.breath) + k / 5) % 1; ctx.strokeStyle = P.ink; ctx.globalAlpha = (1 - ph) * 0.35 * comp; ctx.lineWidth = 3 * u;
      ctx.beginPath(); ctx.arc(cx, cy, R * (1.1 + ph * 0.9), Math.PI * 0.55, Math.PI * 1.05); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.red; ctx.beginPath(); ctx.arc(cx, cy, R * (0.6 + 0.4 * comp), 0, Math.PI * 2); ctx.fill();
    // motif 1: the pointer bar sweeps around the circle's hub (a slow dial, overshoot-free)
    const ang = -0.5 + 0.35 * Math.sin(2 * Math.PI * t / this.dial);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.fillStyle = P.ink; ctx.fillRect(-R * 0.08, -R * 0.08, R * 1.7 * comp, R * 0.16); ctx.restore();
    ctx.fillStyle = P.ink; ctx.beginPath(); ctx.arc(cx, cy, R * 0.12, 0, Math.PI * 2); ctx.fill();
    // motif 2: 3x3 grid, cells recolour in steps of 1/12 s on a non-mechanical pattern
    const gs = Math.min(W, H) * (tall ? 0.28 : 0.22), gx = W * (tall ? 0.08 : 0.06), gy = H * 0.94 - gs, cs = (gs - 2 * 8 * u) / 3, step = Math.floor(t * 4);
    for (let i = 0; i < 9; i++) { const r = Math.floor(i / 3), c = i % 3, on = (step + 2 * i) % 7 < 3; const col = this.pool[(this.grid[i] + (on ? Math.floor(step / 2) : 0)) % 4];
      ctx.fillStyle = col; ctx.globalAlpha = comp; ctx.fillRect(gx + c * (cs + 8 * u), gy + r * (cs + 8 * u), cs, cs); }
    ctx.globalAlpha = comp; ctx.strokeStyle = P.ink; ctx.lineWidth = 8 * u; ctx.strokeRect(gx - 4 * u, gy - 4 * u, gs + 8 * u, gs + 8 * u);
    // yellow triangle, blue square: the supporting cast
    ctx.fillStyle = P.yellow; ctx.beginPath(); const tx = W * (tall ? 0.62 : 0.8); ctx.moveTo(tx, H * 0.95); ctx.lineTo(tx + gs * 0.9 * comp, H * 0.95); ctx.lineTo(tx, H * 0.95 - gs * 0.9 * comp); ctx.fill();
    ctx.fillStyle = P.blue; ctx.fillRect(W * 0.05, H * 0.07, gs * 0.35 * comp, gs * 0.35 * comp);
    ctx.globalAlpha = 1;
    // main action: a heavy bar slides in on a diagonal and the headline rides on it
    if (e.text) {
      // portrait: centred across the middle; landscape: anchored left, rising to the right between the circle and the grid
      const rot = tall ? -0.12 : -0.08, maxW = tall ? W * 0.84 : W * 0.6, size = e.fit(e.text.toUpperCase(), maxW, H * (tall ? 0.12 : 0.15), this.weight, this.font, 0.02), slide = e.enter(f, 8, 22, e.EASE.move);
      const ax = tall ? W * 0.5 : W * 0.06, ay = tall ? H * 0.56 : H * 0.62;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(rot);
      ctx.fillStyle = P.ink; ctx.fillRect(-W, size * 0.22, W * (tall ? 2 : 1.75) * slide * (1 - out), size * 0.16);
      ctx.font = e.font(size, this.weight, this.font); ctx.textAlign = tall ? "center" : "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = P.ink;
      ctx.globalAlpha = slide * (1 - out); ctx.fillText(e.text.toUpperCase(), (1 - slide) * -W * 0.4 + out * W * 0.3, 0); ctx.restore();
    }
  },
};
