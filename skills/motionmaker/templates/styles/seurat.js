// Seurat pointillism (1880s; public domain): the whole picture is built from small dots of pure colour placed side by side (divisionism), so the eye
// mixes them; a sunny riverside park, soft cream light, no outlines. Main action: the headline condenses out of coloured dots. Motifs: (1) a share of the
// dots twinkle between two neighbouring hues (light on water and leaves), (2) a sailboat drifts and bobs on the river, (3) the sun's halo breathes.
window.STYLE = {
  id: "seurat", font: "'Playfair Display', Didot, Georgia, serif", weight: 700,
  pal: { sky: "#BFD7E8", cream: "#F3E6C4", water: "#4E8DB3", deep: "#2E5E8C", grass: "#6E9E4A", sun: "#F6D57A", tree: "#2F5D3A", shade: "#3E6E7A", ink: "#24345C", red: "#D9583B" },
  hsl(hex) { const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0; if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; },
  dotColour(r, g, b, rng) { // split a mixed colour into a nearby pure hue: shift hue and lightness, raise saturation (divisionism)
    const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2, d = mx - mn; let h = 0, s = 0;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r / 255 ? ((g - b) / 255 / d) % 6 : mx === g / 255 ? (b - r) / 255 / d + 2 : (r - g) / 255 / d + 4; h *= 60; }
    const hh = (h + (rng() - 0.5) * 70 + 360) % 360, ss = Math.min(0.95, s * 1.35 + 0.12), ll = Math.max(0.12, Math.min(0.9, l + (rng() - 0.5) * 0.22)); return `hsl(${hh.toFixed(0)},${(ss * 100).toFixed(0)}%,${(ll * 100).toFixed(0)}%)`; },
  setup(ctx, e) {
    const { W, H, u, rng } = e, P = this.pal, tall = W / H < 1.3; this.tall = tall;
    // underpainting (never shown): sky, far bank, river, near grass, trees, sun
    const base = document.createElement("canvas"); base.width = W; base.height = H; const g = base.getContext("2d");
    const hz = H * (tall ? 0.42 : 0.46), river = [hz + H * 0.04, hz + H * (tall ? 0.2 : 0.22)];
    let gr = g.createLinearGradient(0, 0, 0, hz); gr.addColorStop(0, P.sky); gr.addColorStop(1, P.cream); g.fillStyle = gr; g.fillRect(0, 0, W, hz + 2);
    g.fillStyle = P.shade; g.fillRect(0, hz, W, river[0] - hz); gr = g.createLinearGradient(0, river[0], 0, river[1]); gr.addColorStop(0, P.water); gr.addColorStop(1, P.deep); g.fillStyle = gr; g.fillRect(0, river[0], W, river[1] - river[0]);
    gr = g.createLinearGradient(0, river[1], 0, H); gr.addColorStop(0, P.grass); gr.addColorStop(1, "#4F7F38"); g.fillStyle = gr; g.fillRect(0, river[1], W, H - river[1]);
    g.fillStyle = "#86B35C"; g.beginPath(); g.ellipse(W * 0.7, river[1] + (H - river[1]) * 0.5, W * 0.45, (H - river[1]) * 0.3, 0, 0, 7); g.fill();   // sunlit patch of lawn
    g.fillStyle = P.tree; for (const [x, w] of [[0.06, 0.12], [0.88, 0.16]]) { g.beginPath(); g.ellipse(x * W, hz - H * 0.12, w * W, H * 0.16, 0, 0, 7); g.fill(); g.fillRect(x * W - 6 * u, hz - H * 0.04, 12 * u, river[1] + H * 0.1 - hz); }
    this.sun = { x: W * (tall ? 0.68 : 0.62), y: H * (tall ? 0.16 : 0.18), r: Math.min(W, H) * 0.06 }; g.fillStyle = P.sun; g.beginPath(); g.arc(this.sun.x, this.sun.y, this.sun.r, 0, 7); g.fill();
    const data = g.getImageData(0, 0, W, H).data, step = 6.5 * u, r0 = step * 0.62;
    // dots: most are baked into a cached layer; ~15% twinkle (redrawn per frame); dots near the sun breathe with its halo
    this.layer = document.createElement("canvas"); this.layer.width = W; this.layer.height = H; const L = this.layer.getContext("2d"); L.fillStyle = P.cream; L.fillRect(0, 0, W, H);
    this.tw = []; this.halo = [];
    for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) { const jx = x + (rng() - 0.5) * step * 0.7, jy = y + (rng() - 0.5) * step * 0.7, i = (Math.floor(Math.min(H - 1, Math.max(0, jy))) * W + Math.floor(Math.min(W - 1, Math.max(0, jx)))) * 4;
      const c1 = this.dotColour(data[i], data[i + 1], data[i + 2], rng), c2 = this.dotColour(data[i], data[i + 1], data[i + 2], rng), r = r0 * (0.8 + rng() * 0.4), ds = Math.hypot(jx - this.sun.x, jy - this.sun.y);
      if (ds < this.sun.r * 2.6 && ds > this.sun.r * 1.05) this.halo.push({ x: jx, y: jy, r, d: ds, c: c1, lit: this.dotColour(246, 213, 122, rng) });
      else if (rng() < 0.15 && jy > hz) this.tw.push({ x: jx, y: jy, r, c1, c2, ph: rng() });
      else { L.fillStyle = c1; L.beginPath(); L.arc(jx, jy, r, 0, 7); L.fill(); } }
    // the sailboat: dots in its own small sprite so it can move over the cached river
    this.river = river; this.boat = []; const bw = Math.min(W, H) * 0.16, bh = bw * 0.9;
    for (let y = 0; y < bh; y += step * 0.9) for (let x = -bw / 2; x < bw / 2; x += step * 0.9) { const hull = y > bh * 0.78 && Math.abs(x) < bw * 0.5 * (1 - (y - bh * 0.78) / (bh * 0.3)), sail = y < bh * 0.76 && x > -bw * 0.05 && x < bw * 0.05 + (bh * 0.76 - y) * 0.0 + (y / (bh * 0.76)) * bw * 0.4;
      if (hull) this.boat.push({ x, y, c: this.dotColour(110, 70, 50, rng) }); else if (sail) this.boat.push({ x, y, c: this.dotColour(246, 240, 225, rng) }); }
    this.boatH = bh; this.twT = 1 / 8; this.driftT = e.loop(e.secs > 4 ? e.secs : 4); this.haloT = e.loop(2.5); this.step = step;
  },
  draw(ctx, e, f) {
    const P = this.pal, { W, H, u } = e, t = f / e.fps, out = e.exit(f), comp = e.enter(f, 0, 12) * (1 - out);
    ctx.drawImage(this.layer, 0, 0);
    // motif 1: twinkle (stepped at 8 fps: light flicker on water and grass), each dot on its own phase
    const k = Math.floor(t * 8); for (const d of this.tw) { ctx.fillStyle = (k + Math.floor(d.ph * 5)) % 3 === 0 ? d.c2 : d.c1; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill(); }
    // motif 3: sun halo breathes (the ring of dots around the sun brightens outward)
    const hp = (t / this.haloT) % 1; for (const d of this.halo) { const w = Math.max(0, 1 - Math.abs((d.d / (this.sun.r * 2.6)) - (0.45 + hp * 0.55)) * 4); ctx.fillStyle = w > 0.35 ? d.lit : d.c; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill(); }
    // motif 2: sailboat drifts left-right and bobs (closed loop)
    const a = 2 * Math.PI * t / this.driftT, bx = W * (0.42 + 0.12 * Math.sin(a)), by = this.river[0] + (this.river[1] - this.river[0]) * 0.55 - this.boatH + Math.sin(a * 3) * 3 * u;
    for (const d of this.boat) { ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(bx + d.x, by + d.y, this.step * 0.5, 0, 7); ctx.fill(); }
    // main action: the headline condenses out of dots (dense, small, two inks), on a soft cream ground band so it stays legible
    if (e.text) { const tall = this.tall, size = e.fit(e.text, W * 0.82, H * 0.14, this.weight, this.font), cy = H * (tall ? 0.8 : 0.82);
      if (!this.txt || this.txt.size !== size) this.buildText(e, size, cy);
      const p = e.enter(f, 8, 24, e.EASE.move) * (1 - out); ctx.globalAlpha = 0.55 * p; ctx.fillStyle = P.cream; ctx.fillRect(0, cy - size * 0.75, W, size * 1.5); ctx.globalAlpha = 1;
      const n = Math.floor(p * this.txt.pts.length); for (let i = 0; i < n; i++) { const d = this.txt.pts[i]; ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill(); } }
  },
  buildText(e, size, cy) { const c = document.createElement("canvas"); c.width = e.W; c.height = e.H; const g = c.getContext("2d"); g.font = e.font(size, this.weight, this.font); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(e.text, e.W / 2, cy);
    const d = g.getImageData(0, 0, e.W, e.H).data, st = Math.max(2.5, 3.2 * e.u), pts = [], rng = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(42);
    for (let y = 0; y < e.H; y += st) for (let x = 0; x < e.W; x += st) if (d[(Math.floor(y) * e.W + Math.floor(x)) * 4 + 3] > 120) pts.push({ x: x + (rng() - 0.5) * st * 0.6, y: y + (rng() - 0.5) * st * 0.6, r: st * 0.62, c: rng() < 0.78 ? this.pal.ink : rng() < 0.6 ? this.pal.red : this.pal.deep, o: rng() });
    pts.sort((a, b) => a.o - b.o); this.txt = { size, pts }; },
};
