// Russian Constructivism (1919-1930s; El Lissitzky, Rodchenko): red, black and cream, everything on a steep diagonal, a red wedge driving into a circle,
// condensed sans type in bands, halftone dots as texture. Agitation, not decoration.
// Main action: the red wedge thrusts in and the headline band snaps along the diagonal behind it. Motifs: (1) a black circle turns with its radial
// marks, (2) a thin type band of repeated words scrolls along a second diagonal (a looping marquee), (3) a halftone field pulses.
window.STYLE = {
  id: "constructivism", font: "'Oswald', 'Bebas Neue', 'Arial Narrow', sans-serif", weight: 700,
  pal: { paper: "#E9DFC9", red: "#C8102E", ink: "#141414", grey: "#8C8579" },
  setup(ctx, e) {
    this.paper = document.createElement("canvas"); this.paper.width = e.W; this.paper.height = e.H; const g = this.paper.getContext("2d");
    g.fillStyle = this.pal.paper; g.fillRect(0, 0, e.W, e.H); for (let i = 0; i < e.W * e.H / 700; i++) { g.fillStyle = `rgba(80,50,20,${0.02 + e.rng() * 0.05})`; g.fillRect(e.rng() * e.W, e.rng() * e.H, 1.5, 1.5); }
    this.turn = e.loop(8); this.scroll = e.loop(e.secs > 4 ? e.secs : 4); this.pulse = e.loop(2);
  },
  draw(ctx, e, f) {
    const P = this.pal, { W, H, u } = e, t = f / e.fps, out = e.exit(f), tall = W / H < 1.3, A = -0.52, M = Math.min(W, H);
    ctx.drawImage(this.paper, 0, 0);
    // motif 3: halftone field, lower right, dots breathe in size
    const hp = 0.5 + 0.5 * Math.sin(2 * Math.PI * t / this.pulse); ctx.fillStyle = P.ink;
    for (let y = H * 0.55; y < H; y += 18 * u) for (let x = W * 0.55; x < W; x += 18 * u) { const d = Math.hypot(x - W, y - H) / (M * 0.6), r = Math.max(0, (1 - d) * 6.5 * u * (0.8 + 0.25 * hp)); if (r > 0.3) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); } }
    // layout: circle right/top, wedge drives in from the left ABOVE the headline, headline on its own diagonal below, marquee at the bottom; nothing crosses the type
    const cx = W * (tall ? 0.66 : 0.8), cy = H * (tall ? 0.22 : 0.3), R = M * (tall ? 0.24 : 0.22), cin = e.enter(f, 0, 14, e.EASE.move) * (1 - out);
    ctx.fillStyle = P.ink; ctx.beginPath(); ctx.arc(cx, cy, R * cin, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(2 * Math.PI * t / this.turn); ctx.strokeStyle = P.paper; ctx.lineWidth = 4 * u;
    for (let k = 0; k < 12; k++) { ctx.rotate(Math.PI / 6); ctx.globalAlpha = cin; ctx.beginPath(); ctx.moveTo(R * 0.72 * cin, 0); ctx.lineTo(R * 0.9 * cin, 0); ctx.stroke(); } ctx.restore(); ctx.globalAlpha = 1;
    // main action part 1: the red wedge drives in from the upper left into the circle
    const w = e.enter(f, 4, 16, e.EASE.move) * (1 - out), from = { x: -W * 0.06, y: H * (tall ? 0.06 : 0.1) }, tip = { x: cx - R * 0.35, y: cy + R * 0.05 };
    const hx = from.x + (tip.x - from.x) * w, hy = from.y + (tip.y - from.y) * w, n = Math.hypot(tip.x - from.x, tip.y - from.y), px = -(tip.y - from.y) / n, py = (tip.x - from.x) / n, half = M * 0.075;
    ctx.fillStyle = P.red; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(from.x + px * half, from.y + py * half); ctx.lineTo(from.x - px * half, from.y - py * half); ctx.closePath(); ctx.fill();
    // motif 2: marquee band along the bottom on a shallow diagonal, the headline's words repeated small
    const words = (e.text || "FORWARD").toUpperCase(), band = (words + "  \u2022  ").repeat(16), bs = 24 * u;
    ctx.save(); ctx.translate(W * 0.5, H * 0.93); ctx.rotate(-0.06); ctx.fillStyle = P.ink; ctx.fillRect(-W, -bs * 0.9, W * 2, bs * 1.35);
    ctx.font = e.font(bs, this.weight, this.font); ctx.fillStyle = P.paper; ctx.textBaseline = "middle"; const bw = ctx.measureText(words + "  \u2022  ").width;
    ctx.fillText(band, -W - ((t / this.scroll) * bw * Math.max(1, Math.round(this.scroll / 2))) % bw, -bs * 0.22); ctx.restore();
    // main action part 2: the headline snaps in along its own diagonal (fits inside the frame at that angle), first word red
    if (e.text) {
      const up = e.text.toUpperCase(), A2 = -0.32, ax = W * (tall ? 0.5 : 0.33), ay = H * (tall ? 0.6 : 0.68);
      const maxTw = Math.min((tall ? W * 0.9 : W * 0.56) / Math.cos(A2), (tall ? H * 0.3 : H * 0.34) / Math.sin(-A2));
      const size = e.fit(up, maxTw, M * (tall ? 0.13 : 0.16), this.weight, this.font, 0.01), s = e.enter(f, 12, 14, e.EASE.move) * (1 - out);
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(A2); ctx.font = e.font(size, this.weight, this.font); ctx.textBaseline = "middle";
      const tw = ctx.measureText(up).width; ctx.fillStyle = P.ink; ctx.globalAlpha = s; ctx.fillRect(-tw / 2 - size * 0.3, size * 0.55, (tw + size * 0.6) * s, size * 0.11);
      const [first, ...rest] = up.split(" "); const fw = ctx.measureText(first + " ").width, x0 = -tw / 2 + (1 - s) * -W * 0.4;
      ctx.textAlign = "left"; ctx.fillStyle = P.red; ctx.fillText(first + " ", x0, 0); ctx.fillStyle = P.ink; ctx.fillText(rest.join(" "), x0 + fw, 0); ctx.restore();
    }
  },
};
