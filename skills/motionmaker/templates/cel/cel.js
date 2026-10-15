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
      if (k.jitter && o.jitter !== false) {   // stop-motion: each piece sits a little differently on every drawing (seeded)
        const jx = (hash(d, id, 11) - 0.5) * 2 * k.jitter, jy = (hash(d, id, 12) - 0.5) * 2 * k.jitter, jr = (hash(d, id, 13) - 0.5) * 0.02 * k.jitter;
        const b0 = pts[0]; ctx.translate(b0[0] + jx, b0[1] + jy); ctx.rotate(jr); ctx.translate(-b0[0], -b0[1]); }
      const drop = o.drop ?? k.drop;   // cut-out paper: a soft shadow under each piece
      if (o.fill && drop) { ctx.save(); ctx.shadowColor = drop.color ?? "rgba(0,0,0,0.35)"; ctx.shadowBlur = (drop.blur ?? 8) * k.S; ctx.shadowOffsetX = (drop.dx ?? 3) * k.S; ctx.shadowOffsetY = (drop.dy ?? 5) * k.S; ctx.fillStyle = o.fill; ctx.fill(p); ctx.restore(); }
      if (o.fill) { ctx.fillStyle = (k.paperFill && o.paper !== false) ? k.paperFill(o.fill) : o.fill; ctx.fill(p); }
      const [lx, ly] = k.light;
      if (o.hi) { ctx.save(); ctx.clip(p); const off = o.hiOff ?? 6; const band = new Path2D(); band.rect(-1e5, -1e5, 2e5, 2e5); band.addPath(p, new DOMMatrix().translate(-lx * off, -ly * off)); ctx.clip(band, "evenodd"); ctx.fillStyle = o.hi; ctx.fillRect(-1e5, -1e5, 2e5, 2e5); ctx.restore(); }
      if (o.shade) { ctx.save(); ctx.clip(p); const off = o.shadeOff ?? 18; const band = new Path2D(); band.rect(-1e5, -1e5, 2e5, 2e5); band.addPath(p, new DOMMatrix().translate(lx * off, ly * off)); ctx.clip(band, "evenodd"); ctx.fillStyle = o.shade; ctx.fillRect(-1e5, -1e5, 2e5, 2e5); ctx.restore(); }
      if (o.ink !== false && k.inkOn !== false) {
        ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = o.inkColor ?? k.inkColor;
        if (k.pencil) {   // graphite: three light passes, each re-jittered, like a pencil going over the line
          ctx.globalAlpha = (o.alpha ?? 1) * 0.55;
          for (let q = 0; q < 3; q++) { ctx.lineWidth = (o.inkW ?? k.inkW) * (0.45 + q * 0.12); ctx.stroke(pathOf(pts, o.smooth, true, (i, axis) => (hash(d * 3 + q, id * 131 + i, axis) - 0.5) * 2 * (b || 1) * (1.2 + q * 0.5))); }
        } else { ctx.lineWidth = o.inkW ?? k.inkW; ctx.stroke(pInk); }
      }
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
      const sh = o.shadow ?? size * 0.07; if (sh) { ctx.fillStyle = o.shadowColor ?? k.inkColor; ctx.fillText(str, sh, sh); }
      const sw = o.stroke ?? size * 0.12; if (sw) { ctx.lineWidth = sw; ctx.strokeStyle = o.inkColor ?? k.inkColor; ctx.strokeText(str, 0, 0); } ctx.fillStyle = o.fill ?? "#ffe14d"; ctx.fillText(str, 0, 0);
      ctx.restore(); };
    k.drawOn = (pts, p, o = {}) => {   // a line drawn progressively (whiteboard): the first p (0..1) of its length; returns the pen tip
      if (p <= 0) return null; let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
      let left = L * Math.min(1, p); const out = [pts[0]];
      for (let i = 1; i < pts.length && left > 0; i++) { const l = seg[i - 1]; if (l <= left) { out.push(pts[i]); left -= l; } else { const t = left / l; out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]); left = 0; } }
      if (out.length > 1) k.line(out, o); return out[out.length - 1]; };
    k.capsule = (x1, y1, x2, y2, r, n = 8) => { const a = Math.atan2(y2 - y1, x2 - x1), pts = [];
      for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + Math.PI * i / n; pts.push([x2 + Math.cos(t) * r, y2 + Math.sin(t) * r]); }
      for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + Math.PI * i / n; pts.push([x1 + Math.cos(t) * r, y1 + Math.sin(t) * r]); } return pts; };
    // A simple poseable figure (head, torso, two-part arms and legs) for styles that need a person: walk, wave, point, idle. Not character
    // acting: a puppet with a few honest poses. Angles are radians from straight down, positive = toward facing (dir 1 right, -1 left).
    k.pose = {
      idle: t => ({ bob: Math.sin(t * 2.2) * 2, lean: 0, head: Math.sin(t * 1.1) * 0.04, armB: [0.12, -0.15], armF: [-0.1, -0.12], legB: [0.04, 0], legF: [-0.04, 0] }),
      walk: (t, speed = 1) => { const ph = t * 5.5 * speed, s = Math.sin(ph), c = Math.cos(ph);
        return { bob: -Math.abs(Math.cos(ph)) * 7, lean: 0.06, head: 0, legF: [0.45 * s, -Math.max(0, -c) * 0.8 - 0.05], legB: [-0.45 * s, -Math.max(0, c) * 0.8 - 0.05], armF: [-0.4 * s, -0.25], armB: [0.4 * s, -0.25] }; },
      wave: t => ({ bob: Math.sin(t * 2) * 2, lean: -0.03, head: 0.06, legB: [0.06, 0], legF: [-0.06, 0], armB: [0.1, -0.1], armF: [-2.6, -0.5 + Math.sin(t * 9) * 0.45] }),
      point: t => ({ bob: Math.sin(t * 2) * 2, lean: 0, head: 0.05, legB: [0.05, 0], legF: [-0.05, 0], armB: [0.15, -0.3], armF: [-1.9, 0.1 + Math.sin(t * 3) * 0.05] }),
    };
    k.figure = (x, gy, h, pose, look = {}) => {
      const dir = look.dir ?? 1, P = pose, sil = look.silhouette, col = c => sil ? look.silhouette : c, ink = sil ? false : undefined, id0 = look.id ?? 5000;
      const thigh = 0.25 * h, shin = 0.23 * h, up = 0.18 * h, low = 0.17 * h, torsoL = 0.3 * h, R = 0.12 * h, lw = 0.055 * h, aw = 0.045 * h;
      const hip = [x, gy - thigh - shin + (P.bob || 0)], neck = [hip[0] + Math.sin(P.lean) * torsoL * dir, hip[1] - Math.cos(P.lean) * torsoL];
      const limb = (o, [a1, a2], l1, l2) => { const j = [o[0] + Math.sin(a1) * l1 * dir, o[1] + Math.cos(a1) * l1], e = [j[0] + Math.sin(a1 + a2) * l2 * dir, j[1] + Math.cos(a1 + a2) * l2]; return [j, e]; };
      const sh = [neck[0], neck[1] + 0.03 * h];
      const draw = (o, a, l1, l2, w, c1, c2, id, foot) => { const [j, e] = limb(o, a, l1, l2);
        k.shape(k.capsule(o[0], o[1], j[0], j[1], w), { fill: col(c1), shade: sil ? null : look.shade, shadeOff: w * 0.5, ink, id, smooth: false });
        k.shape(k.capsule(j[0], j[1], e[0], e[1], w * 0.9), { fill: col(c2), shade: sil ? null : look.shade, shadeOff: w * 0.5, ink, id: id + 1, smooth: false });
        if (foot) k.shape(k.capsule(e[0] - 0.01 * h * dir, e[1], e[0] + 0.07 * h * dir, e[1], w * 0.75), { fill: col(look.shoe ?? "#2b2b33"), ink, id: id + 2 }); };
      draw(sh, P.armB, up, low, aw, look.shirtB ?? look.shirt ?? "#3d6fb6", look.skin ?? "#f1c7a3", id0, false);
      draw(hip, P.legB, thigh, shin, lw, look.pantsB ?? look.pants ?? "#2d3550", look.pantsB ?? look.pants ?? "#2d3550", id0 + 10, true);
      k.shape(k.capsule(hip[0], hip[1], neck[0], neck[1] + 0.02 * h, 0.085 * h), { fill: col(look.shirt ?? "#3d6fb6"), shade: sil ? null : look.shade, shadeOff: 0.05 * h, ink, id: id0 + 20 });
      draw(hip, P.legF, thigh, shin, lw, look.pants ?? "#2d3550", look.pants ?? "#2d3550", id0 + 30, true);
      draw(sh, P.armF, up, low, aw, look.shirt ?? "#3d6fb6", look.skin ?? "#f1c7a3", id0 + 40, false);
      const hc = [neck[0] + Math.sin(P.lean + (P.head || 0)) * R * 1.1 * dir, neck[1] - R * 1.05];
      k.shape(k.circle(hc[0], hc[1], R, 26), { fill: col(look.skin ?? "#f1c7a3"), shade: sil ? null : look.shade, shadeOff: R * 0.35, ink, id: id0 + 50 });
      if (!sil) {
        k.shape([...Array.from({ length: 14 }, (_, i) => { const a = Math.PI + i / 13 * Math.PI; return [hc[0] + Math.cos(a) * R * 1.04, hc[1] + Math.sin(a) * R * 1.04 - 2]; }), [hc[0] + R * 0.6 * dir, hc[1] - R * 0.15]], { fill: look.hair ?? "#2b1d14", ink, id: id0 + 51, smooth: true });
        const ex = hc[0] + R * 0.38 * dir, ey = hc[1] + R * 0.05; ctx.fillStyle = look.inkColor ?? k.inkColor;
        if (!k.pixelMode) { ctx.beginPath(); ctx.arc(ex, ey, R * 0.09, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(ex - R * 0.32 * dir, ey, R * 0.09, 0, TAU); ctx.fill(); }
        else { ctx.fillRect(ex - R * 0.08, ey - R * 0.1, R * 0.16, R * 0.2); ctx.fillRect(ex - R * 0.4 * dir - R * 0.08, ey - R * 0.1, R * 0.16, R * 0.2); }
        k.line([[ex - R * 0.32 * dir, ey + R * 0.35], [ex - R * 0.12 * dir, ey + R * 0.45], [ex + R * 0.05 * dir, ey + R * 0.33]], { w: Math.max(1.5, R * 0.07), id: id0 + 52, smooth: true });
      }
      return { head: hc, hand: limb(sh, P.armF, up, low)[1] };
    };
    k._reset = () => { shapeId = 0; };
    return k;
  }

  function run(ctx, env, scene) {
    const pixel = scene.pixel || 0, main = ctx;   // pixel art: draw small, snap to the palette, scale up with hard edges
    let small = null, sctx = ctx;
    if (pixel) { small = document.createElement("canvas"); small.width = Math.ceil(env.W / pixel); small.height = Math.ceil(env.H / pixel); sctx = small.getContext("2d"); }
    const k = make(sctx, pixel ? { ...env, W: small.width, H: small.height } : env, scene);
    k.pixelMode = !!pixel; k.pencil = scene.line === "pencil"; k.inkOn = scene.ink !== false; k.jitter = scene.jitter || 0; k.drop = scene.drop || null;
    if (scene.paperFill) { const pr = mulberry(31), tex = k.offscreen(96, 96), tg = tex.getContext("2d"); for (let i = 0; i < 700; i++) { tg.fillStyle = `rgba(${pr() < 0.5 ? "255,255,255" : "0,0,0"},${0.03 + pr() * 0.05})`; tg.fillRect(pr() * 96, pr() * 96, 1 + pr() * 6, 1 + pr() * 2); }
      const cache = {}; k.paperFill = c => cache[c] ??= (() => { const t = k.offscreen(96, 96), g2 = t.getContext("2d"); g2.fillStyle = c; g2.fillRect(0, 0, 96, 96); g2.drawImage(tex, 0, 0); return sctx.createPattern(t, "repeat"); })(); }
    const pal = scene.palette ? scene.palette.map(h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }) : null;
    scene.setup && scene.setup(k);
    const grain = Array.from({ length: 4 }, (_, i) => { const c = k.offscreen(160, 160), g = c.getContext("2d"), d = g.createImageData(160, 160), r = mulberry(77 + i); for (let j = 0; j < d.data.length; j += 4) { const v = r() * 255; d.data[j] = d.data[j + 1] = d.data[j + 2] = v; d.data[j + 3] = 255; } g.putImageData(d, 0, 0); return c; });
    const paperTex = (() => { const c = k.offscreen(256, 256), g = c.getContext("2d"), r = mulberry(55); g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) { const v = 200 + r() * 55; g.fillStyle = `rgba(${v},${v},${v - 6},0.5)`; g.fillRect(r() * 256, r() * 256, 1 + r() * 14, 1 + r() * 1.5); } return c; })();
    return f => {
      const step = k.on, fd = Math.floor(f / step) * step;           // the drawing this frame shows
      k._reset(); k.f = f; k.time = f / env.fps; k.drawing = fd / step; k.t = fd / env.fps; k.shake = [0, 0];
      const c2 = sctx; c2.setTransform(1, 0, 0, 1, 0, 0); c2.globalAlpha = 1; c2.globalCompositeOperation = "source-over"; c2.filter = "none";
      c2.fillStyle = scene.paper ?? "#000"; c2.fillRect(0, 0, k.W, k.H);
      const sh = scene.shake ? scene.shake(k) : 0; const sx = sh ? (hash(k.drawing, 1, 3) - 0.5) * 2 * sh : 0, sy = sh ? (hash(k.drawing, 2, 3) - 0.5) * 2 * sh : 0;
      c2.setTransform(k.S, 0, 0, k.S, sx * k.S, sy * k.S);
      scene.draw(k);
      c2.setTransform(1, 0, 0, 1, 0, 0);
      if (pixel) {
        if (pal) { const im = c2.getImageData(0, 0, small.width, small.height), D = im.data;   // snap every pixel to the nearest palette colour
          for (let i = 0; i < D.length; i += 4) { let best = 0, bd = 1e9; for (let j = 0; j < pal.length; j++) { const p = pal[j], dd = (D[i] - p[0]) ** 2 + (D[i + 1] - p[1]) ** 2 + (D[i + 2] - p[2]) ** 2; if (dd < bd) { bd = dd; best = j; } } D[i] = pal[best][0]; D[i + 1] = pal[best][1]; D[i + 2] = pal[best][2]; D[i + 3] = 255; }
          c2.putImageData(im, 0, 0); }
        main.setTransform(1, 0, 0, 1, 0, 0); main.imageSmoothingEnabled = false; main.drawImage(small, 0, 0, env.W, env.H); }
      const ctx = main, KW = env.W, KH = env.H;
      if (scene.impact && scene.impact(k)) { ctx.globalCompositeOperation = "difference"; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, KW, KH); ctx.globalCompositeOperation = "source-over"; }   // an impact frame: the drawing inverted for one or two frames
      const fx = scene.fx || {};
      if (fx.paper) { ctx.save(); ctx.globalAlpha = fx.paper; ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = ctx.createPattern(paperTex, "repeat"); ctx.fillRect(0, 0, KW, KH); ctx.restore(); }   // paper grain (still: paper does not move)
      if (fx.vignette) { const g = ctx.createRadialGradient(KW / 2, KH / 2, Math.min(KW, KH) * 0.35, KW / 2, KH / 2, Math.hypot(KW, KH) * 0.62); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${fx.vignette})`); ctx.fillStyle = g; ctx.fillRect(0, 0, KW, KH); }
      if (fx.grain) { ctx.save(); ctx.globalAlpha = fx.grain; ctx.globalCompositeOperation = "overlay"; ctx.fillStyle = ctx.createPattern(grain[k.drawing % 4], "repeat"); ctx.fillRect(0, 0, KW, KH); ctx.restore(); }
    };
  }
  return { run };
})();
