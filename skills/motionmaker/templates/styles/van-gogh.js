// Van Gogh, night sky (1889 era; public domain): thick directional strokes (impasto) that follow the flow of the sky, ultramarine and cobalt
// with chrome-yellow stars ringed by halos, a dark cypress flame in the foreground, a sleeping village line. Strokes, never flat fills.
// Main action: the headline is painted in, stroke by stroke, then glows like a star. Motifs: (1) the sky swirls along its flow field (strokes advance
// along their own direction, wrapping, so the sky turns without the picture changing shape), (2) star halos pulse outward in rings, (3) the cypress sways.
window.STYLE = {
  id: "van-gogh", font: "'Young Serif', 'Georgia', serif", weight: 400,
  pal: { night: "#13234A", deep: "#0C1736", cobalt: "#2E5AA8", sky: "#5E86C9", pale: "#A9C3E8", chrome: "#F2C230", lemon: "#F7E27A", cypress: "#13241A", moss: "#2F4A2B", village: "#20304F", window: "#F2C230" },
  // swirl centres (fractions of W,H): the sky's flow circles around them
  swirls: [[0.32, 0.30, 1], [0.62, 0.22, -1], [0.86, 0.38, 1]],
  flow(x, y, e) { let vx = 1, vy = 0.15; for (const [sx, sy, dir] of this.swirls) { const dx = x - sx * e.W, dy = y - sy * e.H, d2 = dx * dx + dy * dy, R = Math.min(e.W, e.H) * 0.22, k = Math.exp(-d2 / (R * R)) * 2.4;
      vx += dir * -dy / Math.sqrt(d2 + 1) * k; vy += dir * dx / Math.sqrt(d2 + 1) * k; } const m = Math.hypot(vx, vy); return [vx / m, vy / m]; },
  setup(ctx, e) {
    const { W, H, u, rng } = e, P = this.pal; this.skyH = H * (e.portrait ? 0.68 : 0.7);
    // sky strokes: seeded positions, colour by height and distance to swirl centres; each stroke is a short polyline traced along the flow field
    const n = Math.round(W * this.skyH / (260 * u * u) * 1.0); this.strokes = [];
    for (let i = 0; i < n; i++) { const x = rng() * W, y = rng() * this.skyH, near = Math.min(...this.swirls.map(([sx, sy]) => Math.hypot(x - sx * W, y - sy * H))) / (Math.min(W, H) * 0.22);
      const pick = rng(), col = near < 0.6 ? (pick < 0.5 ? P.pale : P.sky) : near < 1.2 ? (pick < 0.4 ? P.sky : P.cobalt) : (pick < 0.6 ? P.cobalt : P.night);
      this.strokes.push({ x, y, len: (14 + rng() * 22) * u, w: (3 + rng() * 3.5) * u, col, ph: rng() }); }
    this.stars = [[0.14, 0.14, 1], [0.48, 0.1, 0.8], [0.7, 0.36, 0.9], [0.24, 0.46, 0.7]].map(([x, y, s]) => ({ x: x * W, y: y * H, r: 18 * s * u }));
    this.moon = { x: W * 0.9, y: H * 0.14, r: 46 * u };
    this.village = Array.from({ length: 14 }, (_, i) => ({ x: (i + rng() * 0.6) * W / 14, w: (30 + rng() * 40) * u, h: (24 + rng() * 40) * u, win: rng() < 0.6 }));
    // ground: rolling hills painted with near-horizontal strokes (cached once: it does not move)
    this.ground = document.createElement("canvas"); this.ground.width = W; this.ground.height = H; const g = this.ground.getContext("2d");
    const hill = x => this.skyH - Math.sin(x / W * 5 + 1) * 16 * u - Math.sin(x / W * 13) * 6 * u;
    g.fillStyle = "#16244A"; g.beginPath(); g.moveTo(0, hill(0)); for (let x = 0; x <= W; x += 8 * u) g.lineTo(x, hill(x)); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    for (let i = 0; i < W * (H - this.skyH) / (90 * u * u); i++) { const x = rng() * W, y = hill(x) + 6 * u + rng() * (H - hill(x)), sl = Math.cos(x / W * 5 + 1) * 0.3;
      g.strokeStyle = [P.village, "#1E3A5C", "#2B4A3A", "#16244A", "#33547A"][Math.floor(rng() * 5)]; g.lineWidth = (3 + rng() * 3) * u; g.lineCap = "round";
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (16 + rng() * 18) * u, y - sl * 10 * u); g.stroke(); }
    // village: small houses with roofs and one church spire, outlined in dark paint, lit windows
    const vy = this.skyH + 26 * u;
    this.village.forEach((v, i) => { const x = v.x, w = v.w * 0.8, h = v.h * 0.6; g.fillStyle = "#24365E"; g.fillRect(x, vy - h, w, h); g.fillStyle = "#3A2E3E"; g.beginPath(); g.moveTo(x - 3 * u, vy - h); g.lineTo(x + w / 2, vy - h - 14 * u); g.lineTo(x + w + 3 * u, vy - h); g.fill();
      g.strokeStyle = "#0B1430"; g.lineWidth = 2 * u; g.strokeRect(x, vy - h, w, h); if (v.win) { g.fillStyle = P.window; g.fillRect(x + w * 0.35, vy - h * 0.6, 6 * u, 8 * u); } });
    const sx = W * 0.58; g.fillStyle = "#24365E"; g.fillRect(sx, vy - 70 * u, 14 * u, 70 * u); g.beginPath(); g.moveTo(sx - 2 * u, vy - 70 * u); g.lineTo(sx + 7 * u, vy - 130 * u); g.lineTo(sx + 16 * u, vy - 70 * u); g.fill(); g.strokeStyle = "#0B1430"; g.stroke();
    // cypress: a dense flame of dark strokes (many, layered) around a filled silhouette
    this.cyp = Array.from({ length: 420 }, () => ({ a: rng(), r: rng(), w: (4 + rng() * 6) * u, col: [P.cypress, P.cypress, P.moss, "#1D3324", "#0A160F"][Math.floor(rng() * 5)], c: rng() }));
    this.swirlT = e.loop(e.secs > 5 ? e.secs : 6); this.haloT = e.loop(2); this.swayT = e.loop(4);
    // text strokes are revealed in seeded order along the text mask (built once the font is ready)
    this.textMask = null;
  },
  stroke(ctx, x, y, len, w, col, e, curve = 1) { const pts = [[x, y]]; let px = x, py = y; for (let k = 0; k < 4; k++) { const [vx, vy] = this.flow(px, py, e); px += vx * len / 4 * curve; py += vy * len / 4 * curve; pts.push([px, py]); }
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.stroke(); },
  draw(ctx, e, f) {
    const P = this.pal, { W, H, u } = e, t = f / e.fps, out = e.exit(f);
    ctx.fillStyle = P.deep; ctx.fillRect(0, 0, W, H);
    // motif 1: each stroke slides forward along the flow by a fraction of its own length, looping: the sky turns, its shape stays
    const adv = (t / this.swirlT) % 1;
    for (const s of this.strokes) { const k = ((s.ph + adv) % 1); let x = s.x, y = s.y; const steps = Math.floor(k * 3); for (let j = 0; j < steps; j++) { const [vx, vy] = this.flow(x, y, e); x += vx * s.len * 0.33; y += vy * s.len * 0.33; }
      ctx.globalAlpha = 0.9; this.stroke(ctx, x, y, s.len, s.w, s.col, e); }
    ctx.globalAlpha = 1;
    // motif 2: stars with halos pulsing outward in rings of short strokes
    const stars = [...this.stars, this.moon];
    stars.forEach((st, i) => { const ph = ((t / this.haloT) + i * 0.27) % 1;
      for (let ring = 0; ring < 3; ring++) { const rr = st.r * (1.4 + ring * 0.7 + ph * 0.7), n = 18 + ring * 6; ctx.globalAlpha = (1 - ring * 0.3) * (1 - ph * 0.5);
        for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + ring * 0.3, x = st.x + Math.cos(a) * rr, y = st.y + Math.sin(a) * rr; ctx.strokeStyle = ring === 0 ? P.lemon : ring === 1 ? P.chrome : P.pale; ctx.lineWidth = 3 * u;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(a) * 8 * u, y + Math.cos(a) * 8 * u); ctx.stroke(); } }
      ctx.globalAlpha = 1; ctx.fillStyle = st === this.moon ? P.chrome : P.lemon; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill(); });
    // ground: dark hills and the village with lit windows
    ctx.drawImage(this.ground, 0, 0);
    // motif 3: the cypress sways (flame of strokes, anchored at the ground)
    const cx = W * (e.portrait ? 0.15 : 0.1), base = H * 1.02, top = H * 0.08, sway = Math.sin(2 * Math.PI * t / this.swayT) * 0.025, half = W * (e.portrait ? 0.09 : 0.055);
    const widthAt = a => half * Math.pow(Math.sin(Math.min(1, a * 1.15) * Math.PI * 0.5), 0.9) * (1 - 0.15 * a), bend = a => sway * (1 - a) * (base - top);   // a: 0 = tip, 1 = base
    ctx.fillStyle = "#0A160F"; ctx.beginPath(); for (let k = 0; k <= 40; k++) { const a = k / 40; ctx.lineTo(cx + bend(a) - widthAt(a) * 0.8, top + a * (base - top)); }
    for (let k = 40; k >= 0; k--) { const a = k / 40; ctx.lineTo(cx + bend(a) + widthAt(a) * 0.8, top + a * (base - top)); } ctx.fill();
    for (const c of this.cyp) { const yy = top + c.a * (base - top), x = cx + bend(c.a) + (c.r - 0.5) * 2 * widthAt(c.a);
      ctx.strokeStyle = c.col; ctx.lineWidth = c.w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, yy + 22 * u); ctx.quadraticCurveTo(x + (c.c - 0.5) * 14 * u, yy, x + (c.r - 0.5) * 10 * u, yy - 24 * u); ctx.stroke(); }
    // main action: the headline is painted in with short warm strokes, then holds; a soft glow under it
    if (e.text) { const size = e.fit(e.text, W * (e.portrait ? 0.84 : 0.7), H * 0.13, this.weight, this.font), y = this.skyH + (H - this.skyH) * 0.55;
      if (!this.textMask || this.textMask.size !== size) this.buildMask(e, size, y);
      const p = e.enter(f, 6, 30, e.EASE.move) * (1 - out), m = this.textMask; const show = Math.floor(p * m.pts.length);
      for (let i = 0; i < show; i++) { const [x, yy, c] = m.pts[i]; ctx.strokeStyle = c; ctx.lineWidth = 4.2 * u; ctx.beginPath(); ctx.moveTo(x - 4 * u, yy + 1.5 * u); ctx.lineTo(x + 4 * u, yy - 1.5 * u); ctx.stroke(); }
    }
  },
  buildMask(e, size, y) {   // sample the headline's shape into stroke positions (seeded order), so the type is made of paint, not a flat font
    const c = document.createElement("canvas"); c.width = e.W; c.height = e.H; const g = c.getContext("2d"); g.font = e.font(size, this.weight, this.font); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#000"; g.fillText(e.text, e.W / 2, y);
    const d = g.getImageData(0, 0, e.W, e.H).data, pts = [], step = Math.max(3, Math.round(3.2 * e.u)), rng = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(1234567);
    for (let yy = 0; yy < e.H; yy += step) for (let x = 0; x < e.W; x += step) if (d[(yy * e.W + x) * 4 + 3] > 128) pts.push([x + (rng() - 0.5) * step, yy + (rng() - 0.5) * step, rng() < 0.75 ? this.pal.chrome : this.pal.lemon, rng()]);
    pts.sort((a, b) => (a[0] + a[3] * 60 * e.u) - (b[0] + b[3] * 60 * e.u)); this.textMask = { size, pts };
  },
};
