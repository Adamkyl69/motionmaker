// Impact: a product (a generic can here: swap in the user's product drawn the same way) slams into frame. Classic cel tricks: smear frames
// (multiples along the path), a squash on landing and a stretch on the way in, a one-to-two-frame impact frame (inverted), a camera shake,
// radial speed lines redrawn every drawing, a comic burst behind, sparkles that pop, and lettering that lands with overshoot.
window.SCENE = {
  seed: 4, on: 2, ink: "#1a1020", inkWidth: 4, boil: 1.2, light: [-0.7, -0.7], paper: "#ffd23f",
  fx: { vignette: 0.25, grain: 0.05 },
  land: 0.7,
  impact(k) { return k.t >= this.land && k.t < this.land + k.on / k.fps + 1e-9; },   // the first drawing after the landing, inverted
  shake(k) { const d = k.time - this.land; return d > 0 && d < 0.4 ? 14 * (1 - d / 0.4) : 0; },
  setup(k) { this.cx = k.Wd / 2; this.cy = 520; this.u = Math.min(1, k.Wd / 1100); },
  can(k, x, y, sx, sy, rot, alpha, idBase) {   // the product: a cylinder with a label band, inked and cel-shaded
    const u = this.u, w = 200 * u * sx, h = 380 * u * sy, M = p => k.move(p, x, y, 1, 0, 0, rot);
    const bodyPts = [[-w / 2, -h / 2 + 22], [-w / 2, h / 2 - 22], [-w / 2 + 10, h / 2 - 6], [0, h / 2 + 6], [w / 2 - 10, h / 2 - 6], [w / 2, h / 2 - 22], [w / 2, -h / 2 + 22], [w / 2 - 10, -h / 2 + 8], [0, -h / 2], [-w / 2 + 10, -h / 2 + 8]];
    k.shape(M(bodyPts), { fill: "#e8ecf2", shade: "#9aa4b4", shadeOff: w * 0.32, hi: "#ffffff", hiOff: 8, alpha, id: idBase });
    k.shape(M([[-w / 2, -h * 0.2], [w / 2, -h * 0.2], [w / 2, h * 0.28], [-w / 2, h * 0.28]]), { fill: "#ff3d5a", shade: "#b81d3a", shadeOff: w * 0.32, hi: "#ff8aa0", hiOff: 6, alpha, id: idBase + 1 });
    k.shape(M(k.ellipse(0, -h / 2 + 8, w / 2 - 8, 14 * u, 20)), { fill: "#c9d0db", shade: "#9aa4b4", shadeOff: 6, alpha, id: idBase + 2 });
    k.line(M([[-w * 0.3, -h * 0.05], [w * 0.3, -h * 0.05]]), { w: 6 * u, color: "#ffffff", alpha, id: idBase + 3 });
  },
  draw(k) {
    const c = k.ctx, t = k.t, L = this.land, cx = this.cx, cy = this.cy;
    // the comic burst and radial speed lines behind (redrawn per drawing: they flicker like hand-drawn ones)
    const n = 16, burst = []; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * k.TAU + 0.1, r = (i % 2 ? 260 : 420 + k.hash(k.drawing, i) * 60) * this.u * (t < L ? 0 : k.E.back(k.clamp((t - L) / 0.3))); burst.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9]); }
    if (t >= L) k.shape(burst, { fill: "#ff8a1f", shade: "#e2621a", shadeOff: 30, id: 500 });
    k.speedLines({ radial: true, count: 30, color: "rgba(26,16,32,0.55)", inner: 360 * this.u, w: 6 });
    // the can: flies in from the upper left (stretched, with smears), lands (squash), settles (overshoot), then floats
    const pIn = k.clamp(t / L), path = p => [cx - 900 * (1 - k.E.in(p)) * 1, cy - 700 * (1 - k.E.in(p))];
    if (t < L) {
      for (let m = 3; m >= 1; m--) { const pp = Math.max(0, pIn - m * 0.06), [x, y] = path(pp); this.can(k, x, y, 0.85, 1.35, -0.6, 0.18 * (4 - m), 600 + m * 10); }   // smear: multiples along the path
      const [x, y] = path(pIn); this.can(k, x, y, 0.85, 1.35, -0.6, 1, 700);
    } else {
      const d = t - L, sq = d < 0.12 ? 1 - Math.sin(d / 0.12 * Math.PI) * 0.22 : 1 + Math.sin((d - 0.12) * 18) * Math.exp(-(d - 0.12) * 7) * 0.08, fl = d > 0.6 ? Math.sin((k.t - L - 0.6) * 3) * 8 : 0;
      this.can(k, cx, cy + fl, 1 / Math.sqrt(sq), sq, 0, 1, 700);
      for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4, r = 300 * this.u, age = (d - 0.15 - i * 0.05) / 0.5;   // sparkles pop out and shrink
        if (age > 0 && age < 1) { const sx = cx + Math.cos(a) * r * (0.7 + age * 0.4), sy = cy + Math.sin(a) * r * (0.7 + age * 0.4), z = (1 - age) * 34 * this.u;
          k.shape([[sx, sy - z], [sx + z * 0.25, sy - z * 0.25], [sx + z, sy], [sx + z * 0.25, sy + z * 0.25], [sx, sy + z], [sx - z * 0.25, sy + z * 0.25], [sx - z, sy], [sx - z * 0.25, sy - z * 0.25]], { fill: "#ffffff", inkW: 3, id: 800 + i }); } }
    }
    if (window.CEL_TEXT) k.text(window.CEL_TEXT, cx, 860, { size: Math.min(150, k.Wd * 0.85 / Math.max(4, window.CEL_TEXT.length) * 1.7), at: L + 0.35, fill: "#ffffff", rot: -0.05 });
  },
};
