// Ukiyo-e woodblock print (Edo period; Hokusai, Hiroshige): flat colour areas held by dark key-block outlines, Prussian blue, a bokashi gradient in the
// sky, curling waves with claw-like foam, Mount Fuji small and still, a rectangular title cartouche. Calm composition, dramatic shapes.
// Main action: the cartouche unrolls and the headline is printed into it. Motifs: (1) the big wave's crest curls and its foam fingers reach,
// (2) the swell rolls through the lower waves, (3) clouds drift past Fuji (and the boats ride the swell).
window.STYLE = {
  id: "ukiyo-e", font: "'Young Serif', 'Hiragino Mincho ProN', Georgia, serif", weight: 400,
  pal: { paper: "#ECDDBE", sky: "#C9B48A", prussian: "#1E3A66", mid: "#3D6E9E", light: "#9DB9CF", foam: "#F6F1E4", key: "#1B2433", fuji: "#5D6E86", snow: "#F6F1E4", boat: "#D8C49A", red: "#B23A2A" },
  setup(ctx, e) {
    const { W, H, rng } = e; this.tall = W / H < 1.3;
    this.paperTex = document.createElement("canvas"); this.paperTex.width = W; this.paperTex.height = H; const g = this.paperTex.getContext("2d"); g.fillStyle = this.pal.paper; g.fillRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, 0, H * 0.25); gr.addColorStop(0, "rgba(30,58,102,0.55)"); gr.addColorStop(1, "rgba(30,58,102,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.25);   // bokashi
    for (let i = 0; i < W * H / 500; i++) { g.strokeStyle = `rgba(90,70,40,${0.03 + rng() * 0.04})`; g.lineWidth = 1; const x = rng() * W, y = rng() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rng() - 0.5) * 14, y + (rng() - 0.5) * 3); g.stroke(); }
    this.fingers = Array.from({ length: 11 }, (_, i) => ({ k: i / 10, len: 0.5 + rng() * 0.6, ph: rng() * 6 }));
    this.spray = Array.from({ length: 40 }, () => ({ a: rng(), r: rng(), s: 0.4 + rng() * 0.8 }));
    this.curlT = e.loop(3); this.swellT = e.loop(2); this.cloudT = e.loop(e.secs > 5 ? e.secs : 6);
  },
  outline(ctx, w) { ctx.strokeStyle = this.pal.key; ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.stroke(); },
  draw(ctx, e, f) {
    const P = this.pal, { W, H, u } = e, t = f / e.fps, out = e.exit(f), tall = this.tall, M = Math.min(W, H);
    ctx.drawImage(this.paperTex, 0, 0);
    // Fuji, small and still in the distance; motif 3: clouds drift across it
    const fx = W * (tall ? 0.62 : 0.66), fy = H * (tall ? 0.66 : 0.72), fw = M * 0.2;
    ctx.fillStyle = P.fuji; ctx.beginPath(); ctx.moveTo(fx - fw, fy); ctx.lineTo(fx - fw * 0.18, fy - fw * 0.55); ctx.lineTo(fx + fw * 0.18, fy - fw * 0.55); ctx.lineTo(fx + fw, fy); ctx.closePath(); ctx.fill(); this.outline(ctx, 2 * u);
    ctx.fillStyle = P.snow; ctx.beginPath(); ctx.moveTo(fx - fw * 0.4, fy - fw * 0.32); ctx.lineTo(fx - fw * 0.18, fy - fw * 0.55); ctx.lineTo(fx + fw * 0.18, fy - fw * 0.55); ctx.lineTo(fx + fw * 0.4, fy - fw * 0.32);
    for (let k = 0; k <= 6; k++) ctx.lineTo(fx + fw * 0.4 - k * fw * 0.8 / 6, fy - fw * 0.32 + (k % 2 ? 6 : -2) * u); ctx.closePath(); ctx.fill(); this.outline(ctx, 2 * u);
    const cs = (t / this.cloudT) % 1, x0 = W * (tall ? 0.55 : 0.5), span = W * 1.1 - x0; ctx.save();   // clouds stay right of the wave: they fade in from its edge instead of being cut
    for (const [y, w, o] of [[tall ? 0.5 : 0.48, 0.16, 0], [tall ? 0.58 : 0.58, 0.11, 0.5]]) { const x = x0 + ((o + cs) % 1) * (span + w * W) - w * W * 0.5; ctx.globalAlpha = Math.max(0, Math.min(1, (x - w * W - x0 + W * 0.12) / (W * 0.12))); ctx.fillStyle = "rgba(246,241,228,0.9)"; ctx.beginPath(); ctx.ellipse(x, H * y, w * W, M * 0.025, 0, 0, 7); ctx.fill(); this.outline(ctx, 1.5 * u); } ctx.restore(); ctx.globalAlpha = 1;
    // motif 2: lower swell, three bands of waves rolling (phase moves), with boats riding it
    const sw = 2 * Math.PI * t / this.swellT;
    for (let b = 0; b < 3; b++) { const y0 = H * (0.78 + b * 0.08), amp = M * 0.025 * (1 + b * 0.3); ctx.fillStyle = [P.mid, P.prussian, P.prussian][b]; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 6 * u) ctx.lineTo(x, y0 + Math.sin(x / (M * 0.18) - sw - b) * amp); ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); this.outline(ctx, 2.5 * u);
      ctx.strokeStyle = P.light; ctx.lineWidth = 2 * u; for (let x = 0; x < W; x += M * 0.06) { const y = y0 + Math.sin(x / (M * 0.18) - sw - b) * amp + 12 * u; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + M * 0.03, y + 4 * u); ctx.stroke(); } }
    for (const [bx, b] of [[0.55, 0], [0.8, 1]]) { const x = W * bx, y = H * (0.78 + b * 0.08) + Math.sin(x / (M * 0.18) - sw - b) * M * 0.025 - 6 * u, ang = Math.cos(x / (M * 0.18) - sw - b) * 0.25;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = P.boat; ctx.beginPath(); ctx.moveTo(-M * 0.11, 0); ctx.quadraticCurveTo(0, M * 0.03, M * 0.12, -M * 0.02); ctx.lineTo(M * 0.1, M * 0.012); ctx.quadraticCurveTo(0, M * 0.045, -M * 0.1, M * 0.012); ctx.closePath(); ctx.fill(); this.outline(ctx, 2 * u); ctx.restore(); }
    // motif 1: the great wave on the left: body rising into a crest that curls over, foam fingers reaching (curl breathes)
    const cl = 0.5 + 0.5 * Math.sin(2 * Math.PI * t / this.curlT), cx = W * (tall ? 0.36 : 0.26), cy = H * (tall ? 0.53 : 0.34), R = M * (tall ? 0.24 : 0.22);
    ctx.fillStyle = P.prussian; ctx.beginPath(); ctx.moveTo(-W * 0.05, H); ctx.bezierCurveTo(cx - R * 1.6, H * 0.7, cx - R * 1.4, cy + R * 0.2, cx - R * 0.3, cy - R * 0.85);
    ctx.bezierCurveTo(cx + R * 0.5, cy - R * 1.35, cx + R * 1.3, cy - R * 0.6, cx + R * (1.15 + 0.08 * cl), cy + R * (0.05 + 0.06 * cl));
    ctx.bezierCurveTo(cx + R * 0.7, cy - R * 0.35, cx + R * 0.1, cy - R * 0.2, cx - R * 0.05, cy + R * 0.35); ctx.bezierCurveTo(cx - R * 0.1, cy + R * 0.9, cx + R * 0.3, H * 0.86, cx + R * 1.2, H); ctx.closePath(); ctx.fill(); this.outline(ctx, 4 * u);
    ctx.strokeStyle = P.light; ctx.lineWidth = 3 * u; for (let k = 1; k <= 5; k++) { ctx.beginPath(); ctx.moveTo(cx - R * 1.2 + k * R * 0.12, H * 0.95); ctx.bezierCurveTo(cx - R * 1.1 + k * R * 0.1, cy + R * 0.5, cx - R * 0.6 + k * R * 0.15, cy - R * 0.5, cx - R * 0.2 + k * R * 0.18, cy - R * (0.85 - k * 0.05)); ctx.stroke(); }
    // the crest lip follows the wave's real outer curve (same bezier as the body): light inner face, white foam rim, claws hanging from the rim
    const B = (p0, p1, p2, p3, k) => { const m = 1 - k; return [m * m * m * p0[0] + 3 * m * m * k * p1[0] + 3 * m * k * k * p2[0] + k * k * k * p3[0], m * m * m * p0[1] + 3 * m * m * k * p1[1] + 3 * m * k * k * p2[1] + k * k * k * p3[1]]; };
    const c0 = [cx - R * 0.3, cy - R * 0.85], c1 = [cx + R * 0.5, cy - R * 1.35], c2 = [cx + R * 1.3, cy - R * 0.6], c3 = [cx + R * (1.15 + 0.08 * cl), cy + R * (0.05 + 0.06 * cl)];
    ctx.fillStyle = P.mid; ctx.beginPath(); for (let k = 0.15; k <= 1.001; k += 0.05) { const [x, y] = B(c0, c1, c2, c3, k); ctx.lineTo(x - R * 0.06, y + R * 0.16 * (1 - k)); }
    ctx.bezierCurveTo(cx + R * 0.7, cy - R * 0.25, cx + R * 0.2, cy - R * 0.1, cx + R * 0.05, cy + R * 0.3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = P.foam; ctx.lineWidth = R * 0.07; ctx.lineCap = "round"; ctx.beginPath(); for (let k = 0.05; k <= 0.98; k += 0.03) { const [x, y] = B(c0, c1, c2, c3, k); ctx.lineTo(x, y); } ctx.stroke();
    for (const fg of this.fingers) { const k = 0.12 + fg.k * 0.85, [x, y] = B(c0, c1, c2, c3, k), [x2, y2] = B(c0, c1, c2, c3, Math.min(1, k + 0.02)), tx = x2 - x, ty = y2 - y, tn = Math.hypot(tx, ty) || 1, nx = ty / tn, ny = -tx / tn;   // outward normal
      const L = R * 0.2 * fg.len * (0.75 + 0.4 * cl + 0.08 * Math.sin(2 * Math.PI * t / this.curlT + fg.ph)), ex = x + nx * L + tx / tn * L * 0.5, ey = y + ny * L + ty / tn * L * 0.5 + L * 0.35;
      ctx.fillStyle = P.foam; ctx.beginPath(); ctx.moveTo(x - tx / tn * L * 0.22, y - ty / tn * L * 0.22); ctx.quadraticCurveTo(x + nx * L * 0.9, y + ny * L * 0.9, ex, ey);
      ctx.quadraticCurveTo(x + nx * L * 0.35 + tx / tn * L * 0.2, y + ny * L * 0.35 + ty / tn * L * 0.2, x + tx / tn * L * 0.3, y + ty / tn * L * 0.3); ctx.closePath(); ctx.fill(); this.outline(ctx, 1.6 * u); }
    for (const sp of this.spray) { const k = 0.1 + sp.a * 0.8, [x, y] = B(c0, c1, c2, c3, k); ctx.fillStyle = P.foam; ctx.beginPath(); ctx.arc(x + (sp.r - 0.3) * R * 0.5, y - sp.r * R * 0.35 - cl * 4 * u, 3.2 * u * sp.s, 0, 7); ctx.fill(); }
    // main action: the cartouche unrolls (top to bottom) and the headline is printed in it
    if (e.text) { const cw = tall ? W * 0.8 : W * 0.4, x = tall ? (W - cw) / 2 : W * 0.55, y = H * (tall ? 0.06 : 0.08), size = e.fit(e.text, cw * 0.86, H * 0.08, this.weight, this.font), ch = size * 1.9, p = e.enter(f, 6, 18, e.EASE.move) * (1 - out);
      ctx.save(); ctx.beginPath(); ctx.rect(x - 8 * u, y - 8 * u, cw + 16 * u, (ch + 16 * u) * p); ctx.clip();
      ctx.fillStyle = "#F2E6CC"; ctx.fillRect(x, y, cw, ch); ctx.strokeStyle = P.key; ctx.lineWidth = 3 * u; ctx.strokeRect(x, y, cw, ch); ctx.lineWidth = 1.2 * u; ctx.strokeRect(x + 6 * u, y + 6 * u, cw - 12 * u, ch - 12 * u);
      ctx.fillStyle = P.key; ctx.font = e.font(size, this.weight, this.font); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e.text, x + cw / 2, y + ch / 2 + size * 0.04);
      ctx.fillStyle = P.red; ctx.fillRect(x + cw - 26 * u, y + ch - 30 * u, 14 * u, 18 * u); ctx.restore(); }   // a small red seal
  },
};
