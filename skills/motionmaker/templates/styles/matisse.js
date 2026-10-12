// Matisse paper cut-outs (late 1940s-1950s): shapes cut freely from gouache-painted paper (cobalt, vermilion, lemon, emerald, pink, black) on
// coloured paper rectangles; leaf and algae forms, stars, wavy edges; the slight unevenness of hand-painted paper. Joy, rhythm, no outlines.
// Main action: the paper rectangles slide into a collage and the headline is "cut out" (revealed by a wavy scissor edge). Motifs: (1) the algae forms
// sway like seaweed, (2) the stars turn slowly, (3) small confetti cut-outs drift and settle in a loop.
window.STYLE = {
  id: "matisse", font: "'Fraunces', 'Cooper Black', Georgia, serif", weight: 700,
  pal: { wall: "#F3EBDD", cobalt: "#1F3FA6", red: "#E2482B", lemon: "#F4C434", emerald: "#1F8A5B", pink: "#EE9AA8", ink: "#1B1B1B", sky: "#7FB3E6" },
  setup(ctx, e) {
    const { rng, W, H } = e, P = this.pal, cols = [P.cobalt, P.red, P.lemon, P.emerald, P.pink, P.ink];
    this.tex = c => { const t = document.createElement("canvas"); t.width = 64; t.height = 64; const g = t.getContext("2d"); g.fillStyle = c; g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${rng() < 0.5 ? "255,255,255" : "0,0,0"},${0.03 + rng() * 0.05})`; g.fillRect(rng() * 64, rng() * 64, 2 + rng() * 10, 1 + rng() * 3); } return g.createPattern(t, "repeat"); };
    this.fills = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, this.tex(v)]));
    const tall = W / H < 1.3;
    this.papers = tall ? [{ x: 0.06, y: 0.06, w: 0.5, h: 0.4, c: "sky" }, { x: 0.44, y: 0.3, w: 0.5, h: 0.42, c: "pink" }, { x: 0.1, y: 0.62, w: 0.36, h: 0.3, c: "lemon" }]
                       : [{ x: 0.05, y: 0.08, w: 0.32, h: 0.62, c: "sky" }, { x: 0.33, y: 0.18, w: 0.3, h: 0.5, c: "pink" }, { x: 0.6, y: 0.06, w: 0.34, h: 0.42, c: "lemon" }];
    this.algae = this.papers.map((p, i) => ({ x: (p.x + p.w * (0.35 + rng() * 0.3)) * W, y: (p.y + p.h * 0.95) * H, h: p.h * H * 0.85, c: ["cobalt", "emerald", "red"][i], seed: rng() * 10 }));
    this.stars = [[0.84, 0.7, "cobalt"], [0.5, 0.84, "red"], [0.18, 0.86, "emerald"]].map(([x, y, c]) => ({ x: x * W, y: y * H, r: Math.min(W, H) * 0.07, c, ph: rng() }));
    this.confetti = Array.from({ length: 18 }, () => ({ x: rng() * W, y: rng() * H, r: Math.min(W, H) * (0.012 + rng() * 0.02), c: Object.keys(P).filter(k => k !== "wall")[Math.floor(rng() * 7)], ph: rng() }));
    this.swayT = e.loop(3); this.turnT = e.loop(10); this.driftT = e.loop(e.secs > 4 ? e.secs : 4);
  },
  // an algae / leaf form: a central stem with lobes left and right, wavy edge, swaying from its base
  algaeShape(ctx, a, sway, e) {   // stem with alternating leaf lobes (left, right, left...), narrowing to the tip, swaying from the base
    const n = 6, seg = a.h / n, base = a.h * 0.16, pt = (i, side) => { const k = i / n, bend = sway * Math.pow(k, 1.5) * a.h * 0.22, lobe = (i % 2 === (side > 0 ? 1 : 0)) ? 1.35 : 0.35;
      return [a.x + bend + side * base * (1 - 0.75 * k) * lobe * (0.9 + 0.2 * Math.sin(a.seed + i * 1.7)), a.y - i * seg]; };
    ctx.beginPath(); let [x, y] = pt(0, 1); ctx.moveTo(x, y);
    for (let i = 1; i <= n; i++) { const [x1, y1] = pt(i - 0.5, 1), [x2, y2] = pt(i, 1); ctx.quadraticCurveTo(x1 + base * 0.6 * (i % 2), y1, x2, y2); }
    const tip = pt(n + 0.6, 0); ctx.quadraticCurveTo(tip[0] + base * 0.3, tip[1] + seg * 0.3, tip[0], tip[1]);
    for (let i = n; i >= 0; i--) { const [x1, y1] = pt(i + 0.5, -1), [x2, y2] = pt(i, -1); ctx.quadraticCurveTo(x1 - base * 0.6 * ((i + 1) % 2), y1, x2, y2); }
    ctx.closePath(); },
  star(ctx, s, rot) { ctx.beginPath(); for (let k = 0; k < 16; k++) { const r = k % 2 ? s.r * 0.42 : s.r * (1 + 0.08 * Math.sin(k * 1.7)), a = rot + k * Math.PI / 8; ctx.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r); } ctx.closePath(); },
  draw(ctx, e, f) {
    const P = this.pal, { W, H, u } = e, t = f / e.fps, out = e.exit(f);
    ctx.fillStyle = this.fills.wall; ctx.fillRect(0, 0, W, H);
    // main action part 1: papers slide in, one after another, from alternating sides
    this.papers.forEach((p, i) => { const s = e.enter(f, i * 4, 16, e.EASE.move) * (1 - out), dx = (i % 2 ? 1 : -1) * (1 - s) * W * 0.3;
      ctx.globalAlpha = Math.min(1, s * 1.5); ctx.fillStyle = this.fills[p.c]; ctx.fillRect(p.x * W + dx, p.y * H, p.w * W, p.h * H); });
    // motif 1: algae sway from their base (the slowest, largest motion)
    this.algae.forEach((a, i) => { const s = e.enter(f, 10 + i * 4, 18) * (1 - out), sway = Math.sin(2 * Math.PI * t / this.swayT + i * 1.3) * 0.5; ctx.globalAlpha = s; ctx.fillStyle = this.fills[a.c];
      ctx.save(); ctx.translate(a.x, a.y); ctx.scale(1, s); ctx.translate(-a.x, -a.y); this.algaeShape(ctx, a, sway, e); ctx.fill(); ctx.restore(); });
    // motif 2: stars turn slowly; motif 3: confetti drift on a closed path and come back
    this.stars.forEach(s => { ctx.globalAlpha = e.enter(f, 18, 12, e.EASE.pop) * (1 - out); ctx.fillStyle = this.fills[s.c]; this.star(ctx, s, 2 * Math.PI * (t / this.turnT + s.ph)); ctx.fill(); });
    this.confetti.forEach(c => { const a = 2 * Math.PI * (t / this.driftT + c.ph); ctx.globalAlpha = 0.9 * e.enter(f, 20, 10) * (1 - out); ctx.fillStyle = this.fills[c.c];
      ctx.beginPath(); ctx.ellipse(c.x + Math.cos(a) * 14 * u, c.y + Math.sin(a * 2) * 9 * u, c.r, c.r * 0.6, a, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    // main action part 2: the headline is cut out: a black paper strip, the type knocked out in the wall colour, revealed by a wavy scissor edge
    if (e.text) { const tall = W / H < 1.3, size = e.fit(e.text, W * 0.78, H * 0.13, this.weight, this.font), cy = H * (tall ? 0.53 : 0.8), p = e.enter(f, 16, 22, e.EASE.move) * (1 - out);
      ctx.font = e.font(size, this.weight, this.font); const tw = ctx.measureText(e.text).width, x0 = W / 2 - tw / 2 - size * 0.35, w = tw + size * 0.7, h = size * 1.35;
      ctx.save(); ctx.beginPath(); ctx.moveTo(x0, cy - h / 2); const edge = x0 + w * p; for (let y = cy - h / 2; y <= cy + h / 2; y += 6 * u) ctx.lineTo(edge + Math.sin(y * 0.15) * 5 * u, y); ctx.lineTo(x0, cy + h / 2); ctx.closePath(); ctx.clip();
      ctx.fillStyle = this.fills.ink; ctx.fillRect(x0, cy - h / 2, w, h); ctx.fillStyle = P.wall; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.text, W / 2, cy + size * 0.05); ctx.restore(); }
  },
};
