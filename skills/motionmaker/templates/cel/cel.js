// Cel animation kit (Motionmaker): the look of traditional 2D cel animation, made frame-exact.
//  - Drawings, not frames: the scene is drawn "on twos" (or threes): a drawing is held for N frames, like hand-drawn animation at 12 fps.
//    k.t is the drawing's time (stepped), k.time the real time (for camera moves on ones, as studios shoot pans).
//  - Ink: every shape gets a hand-inked outline that "boils" (wobbles slightly, differently on each drawing), round joins, a weight you set.
//  - Cel shading: a flat base colour, a hard-edged shadow on the side away from the light and a thin highlight on the lit edge, no gradients.
//  - Painted backgrounds (no outlines, softer values), light cones and glows, speed lines, smears (multiples), impact frames, cel smoke, camera shake.
// All randomness is seeded by the drawing number: k.draw... in frame f is the same every time. A scene is { setup(k), draw(k) }.
window.CEL = (() => {
  const TAU = Math.PI * 2;
  const hash = (a, b = 0, c = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const E = { out: t => 1 - Math.pow(1 - t, 3), in: t => t * t * t, inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2), linear: t => t };

  function make(ctx, env, scene) {
    const W = env.W, H = env.H, S = H / 1000;                        // design units: the frame is 1000 tall
    const k = { ctx, W, H, S, Wd: W / S, fps: env.fps, secs: env.secs, E, clamp, TAU, rng: mulberry(scene.seed ?? 9), hash };
    k.on = scene.on ?? 2;                                             // animate on twos by default
    k.inkColor = scene.ink ?? "#1b1320"; k.inkW = scene.inkWidth ?? 3.2; k.boilAmt = scene.boil ?? 1.1; k.light = scene.light ?? [-0.6, -0.8];
    k.offscreen = (w, h) => { const c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };

    // ---- paths: point lists in design units; smooth: true runs a quadratic curve through the midpoints (rounded shapes)
    const pathOf = (pts, smooth, closed = true, jit = null) => {
      const P = jit ? pts.map((p, i) => [p[0] + jit(i, 0), p[1] + jit(i, 1)]) : pts, g = new Path2D();
      if (!smooth || P.length < 3) { P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); if (closed) g.closePath(); return g; }
      const n = P.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (closed) { const m0 = mid(P[n - 1], P[0]); g.moveTo(m0[0], m0[1]); for (let i = 0; i < n; i++) { const m = mid(P[i], P[(i + 1) % n]); g.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]); } g.closePath(); }
      else { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < n - 1; i++) { const m = mid(P[i], P[i + 1]); g.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]); } g.lineTo(P[n - 1][0], P[n - 1][1]); }
      return g;
    };
    k.circle = (cx, cy, r, n = 28) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * TAU) * r, cy + Math.sin(i / n * TAU) * r]);
    k.ellipse = (cx, cy, rx, ry, n = 28, rot = 0) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]; });
    k.rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    k.move = (pts, dx, dy, s = 1, ox = 0, oy = 0, rot = 0) => pts.map(([x, y]) => { const X = (x - ox) * s, Y = (y - oy) * s; return [ox + X * Math.cos(rot) - Y * Math.sin(rot) + dx, oy + X * Math.sin(rot) + Y * Math.cos(rot) + dy]; });

    // ---- the inked, cel-shaded shape. opts: fill, shade (colour) + shadeOff (how deep the shadow band is), hi (highlight colour) + hiOff,
    //      ink (false for painted backgrounds), inkW, boil (multiplier), smooth, alpha, id (keeps the boil of this shape its own)
    let shapeId = 0;
    k.shape = (pts, o = {}) => {
      const id = o.id ?? ++shapeId, b = (o.boil ?? 1) * k.boilAmt, d = k.drawing;
      const jit = b ? (i, axis) => (hash(d, id * 131 + i, axis) - 0.5) * 2 * b : null;
      const p = pathOf(pts, o.smooth, true), pInk = jit ? pathOf(pts, o.smooth, true, jit) : p;
      ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(p); }
      const [lx, ly] = k.light;
      if (o.hi) { ctx.save(); ctx.clip(p); const off = o.hiOff ?? 6; const band = new Path2D(); band.rect(-1e5, -1e5, 2e5, 2e5); band.addPath(p, new DOMMatrix().translate(-lx * off, -ly * off)); ctx.clip(band, "evenodd"); ctx.fillStyle = o.hi; ctx.fillRect(-1e5, -1e5, 2e5, 2e5); ctx.restore(); }
      if (o.shade) { ctx.save(); ctx.clip(p); const off = o.shadeOff ?? 18; const band = new Path2D(); band.rect(-1e5, -1e5, 2e5, 2e5); band.addPath(p, new DOMMatrix().translate(lx * off, ly * off)); ctx.clip(band, "evenodd"); ctx.fillStyle = o.shade; ctx.fillRect(-1e5, -1e5, 2e5, 2e5); ctx.restore(); }
      if (o.ink !== false) { ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = o.inkColor ?? k.inkColor; ctx.lineWidth = o.inkW ?? k.inkW; ctx.stroke(pInk); }
      ctx.restore();
    };
    k.line = (pts, o = {}) => {   // an inked open stroke (detail lines, panel seams, hair)
      const id = o.id ?? ++shapeId, b = (o.boil ?? 1) * k.boilAmt, d = k.drawing;
      const p = pathOf(pts, o.smooth, false, b ? (i, axis) => (hash(d, id * 131 + i, axis) - 0.5) * 2 * b : null);
      ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = o.color ?? k.inkColor; ctx.lineWidth = o.w ?? k.inkW * 0.7; ctx.stroke(p); ctx.restore();
    };
    k.glow = (x, y, r, color, a = 0.5) => { ctx.save(); ctx.globalCompositeOperation = "screen"; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore(); };
    k.beam = (x, y, x1, y1, w0, w1, color, a = 0.25) => {   // a cone of light (a street lamp, a headlight): flat, slightly brighter at the source
      const dx = x1 - x, dy = y1 - y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      ctx.save(); ctx.globalCompositeOperation = "screen"; const g = ctx.createLinearGradient(x, y, x1, y1); g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.globalAlpha = a; ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x + nx * w0, y + ny * w0); ctx.lineTo(x1 + nx * w1, y1 + ny * w1); ctx.lineTo(x1 - nx * w1, y1 - ny * w1); ctx.lineTo(x - nx * w0, y - ny * w0); ctx.closePath(); ctx.fill(); ctx.restore(); };
    k.speedLines = (o = {}) => {   // streaks across the frame (dir in radians), redrawn per drawing like hand-drawn speed lines
      const n = o.count ?? 22, d = k.drawing, dir = o.dir ?? Math.PI, cx = k.Wd / 2, cy = 500;
      ctx.save(); ctx.strokeStyle = o.color ?? "rgba(255,255,255,0.6)"; ctx.lineCap = "round";
      for (let i = 0; i < n; i++) { const r1 = hash(d, i, 7), r2 = hash(d, i, 8), r3 = hash(d, i, 9);
        if (o.radial) { const a = r1 * TAU, rin = (o.inner ?? 330) + r2 * 120, rout = rin + 200 + r3 * 500; ctx.lineWidth = 2 + r3 * (o.w ?? 7); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * rin, cy + Math.sin(a) * rin); ctx.lineTo(cx + Math.cos(a) * rout, cy + Math.sin(a) * rout); ctx.stroke(); continue; }
        const y = (o.y0 ?? 0) + r1 * ((o.y1 ?? 1000) - (o.y0 ?? 0)), x = r2 * k.Wd, len = 120 + r3 * (o.len ?? 420); ctx.lineWidth = 1.5 + r3 * (o.w ?? 4);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(dir) * len, y + Math.sin(dir) * len); ctx.stroke(); }
      ctx.restore(); };
    k.smoke = (x, y, size, age, o = {}) => {   // one cel-shaded smoke puff that grows and thins with age 0..1 (a cluster of inked circles)
      if (age < 0 || age > 1) return; const n = o.lobes ?? 5, s = size * (0.45 + E.out(age) * 0.75), seed = o.seed ?? 1;
      const pts = []; for (let i = 0; i < n * 6; i++) { const a = i / (n * 6) * TAU, lobe = 1 + 0.18 * Math.sin(a * n + seed); pts.push([x + Math.cos(a) * s * lobe, y + Math.sin(a) * s * lobe * 0.8]); }
      k.shape(pts, { fill: o.fill ?? "#e9e4ee", shade: o.shade ?? "#b9b0c6", shadeOff: s * 0.35, hi: o.hi, smooth: true, alpha: 1 - Math.pow(age, 3), inkW: k.inkW * (1 - age * 0.6), id: o.id ?? 9000 + seed });
    };
    k.text = (str, x, y, o = {}) => {   // display lettering: a fat ink outline, a hard offset shadow, a pop-in with overshoot (on the drawing grid)
      const size = o.size ?? 120, p = clamp((k.t - (o.at ?? 0)) / (o.dur ?? 0.5)); if (p <= 0) return;
      const s = o.pop === false ? 1 : E.back(p); ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.04); ctx.scale(s, s);
      ctx.font = `${o.weight ?? 900} ${size}px ${o.font ?? "'Arial Black', 'Helvetica Neue', Impact, sans-serif"}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
      const sh = o.shadow ?? size * 0.07; ctx.fillStyle = o.shadowColor ?? k.inkColor; ctx.fillText(str, sh, sh);
      ctx.lineWidth = o.stroke ?? size * 0.12; ctx.strokeStyle = o.inkColor ?? k.inkColor; ctx.strokeText(str, 0, 0); ctx.fillStyle = o.fill ?? "#ffe14d"; ctx.fillText(str, 0, 0);
      ctx.restore(); };
    k._reset = () => { shapeId = 0; };
    return k;
  }

  function run(ctx, env, scene) {
    const k = make(ctx, env, scene); scene.setup && scene.setup(k);
    const grain = Array.from({ length: 4 }, (_, i) => { const c = k.offscreen(160, 160), g = c.getContext("2d"), d = g.createImageData(160, 160), r = mulberry(77 + i); for (let j = 0; j < d.data.length; j += 4) { const v = r() * 255; d.data[j] = d.data[j + 1] = d.data[j + 2] = v; d.data[j + 3] = 255; } g.putImageData(d, 0, 0); return c; });
    return f => {
      const step = k.on, fd = Math.floor(f / step) * step;           // the drawing this frame shows
      k._reset(); k.f = f; k.time = f / env.fps; k.drawing = fd / step; k.t = fd / env.fps; k.shake = [0, 0];
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.filter = "none";
      ctx.fillStyle = scene.paper ?? "#000"; ctx.fillRect(0, 0, k.W, k.H);
      const sh = scene.shake ? scene.shake(k) : 0; const sx = sh ? (hash(k.drawing, 1, 3) - 0.5) * 2 * sh : 0, sy = sh ? (hash(k.drawing, 2, 3) - 0.5) * 2 * sh : 0;
      ctx.setTransform(k.S, 0, 0, k.S, sx * k.S, sy * k.S);
      scene.draw(k);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (scene.impact && scene.impact(k)) { ctx.globalCompositeOperation = "difference"; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, k.W, k.H); ctx.globalCompositeOperation = "source-over"; }   // an impact frame: the drawing inverted for one or two frames
      const fx = scene.fx || {};
      if (fx.vignette) { const g = ctx.createRadialGradient(k.W / 2, k.H / 2, Math.min(k.W, k.H) * 0.35, k.W / 2, k.H / 2, Math.hypot(k.W, k.H) * 0.62); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${fx.vignette})`); ctx.fillStyle = g; ctx.fillRect(0, 0, k.W, k.H); }
      if (fx.grain) { ctx.save(); ctx.globalAlpha = fx.grain; ctx.globalCompositeOperation = "overlay"; ctx.fillStyle = ctx.createPattern(grain[k.drawing % 4], "repeat"); ctx.fillRect(0, 0, k.W, k.H); ctx.restore(); }
    };
  }
  return { run };
})();
