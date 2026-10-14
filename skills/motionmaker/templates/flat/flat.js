// Flat design motion graphics engine (Motionmaker). A scene is one or more WORLDS made of layers of simple flat shapes (sky, sun, clouds, faceted
// mountains, hills, water, skyline, palms, pines, round trees, birds, words), each at a DEPTH k (0 = as far as the sky, 1 = the focal plane,
// above 1 = foreground). SHOTS move a 2.5D camera through a world: a pan moves near layers more than far ones (parallax), a push-in grows near
// layers more. Small living motion (fronds sway, clouds drift, water shimmers, birds flap), atmospheric haze by depth, a soft defocus on the
// nearest layer, light rays, a light leak, grain and a vignette: all subtle, all seeded. Transitions between shots: cut, dissolve, whip, iris,
// push. Frame-exact: every shape is generated once from the scene's seed; draw(f) is a pure function of the frame number.
window.FLAT = (() => {
  const TAU = Math.PI * 2;
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hex = h => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const css = (c, a = 1) => `rgba(${c.map(Math.round).join(",")},${a})`;
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const shade = (c, t) => mix(c, t < 0 ? [0, 0, 0] : [255, 255, 255], Math.abs(t));   // t -0.3 = 30% darker, +0.2 = 20% lighter
  const smooth = t => t * t * (3 - 2 * t);
  const EASES = { linear: t => t, inOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, out: t => 1 - Math.pow(1 - t, 3), in: t => t * t * t, gentle: t => 0.5 - Math.cos(Math.PI * t) / 2 };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // ---------- geometry, generated once ----------
  function makeMountains(L, R) {   // jagged ridges: each peak has shoulders; the far side of each peak is in shadow, with a mid-tone facet and a lit facet on the near side
    const pts = [], facets = [], x0 = L.from ?? -2600, x1 = L.to ?? 3600, base = L.y, H = L.height;
    const j = (v, a) => v + (R() - 0.5) * a;
    let x = x0, prevY = base - H * 0.1;
    while (x < x1) {
      const w = (L.width || 380) * (0.55 + R() * 0.9), ph = H * (0.4 + R() * 0.6), px = x + w * (0.3 + R() * 0.4), top = base - ph, vRy = base - H * (0.05 + R() * 0.25);
      const vL = { x, y: prevY }, pk = { x: px, y: top }, vR = { x: x + w, y: vRy };
      const sl = { x: j(x + (px - x) * 0.55, w * 0.05), y: j(prevY + (top - prevY) * 0.6, H * 0.08) };        // left shoulder
      const sr = { x: j(px + (vR.x - px) * 0.4, w * 0.05), y: j(top + (vRy - top) * 0.35, H * 0.06) };        // right shoulder
      pts.push(vL, sl, pk, sr);
      const foot = { x: px + (vR.x - px) * (0.05 + R() * 0.25), y: base + 2 }, mid = { x: (pk.x + foot.x) / 2 + w * 0.05, y: (pk.y + base) / 2 };
      facets.push({ kind: "shadow", poly: [pk, sr, vR, { x: vR.x, y: base + H }, { x: foot.x, y: base + H }, mid] });
      facets.push({ kind: "deep", poly: [sr, vR, { x: vR.x - w * 0.08, y: j((vR.y + base) / 2, H * 0.05) }, { x: j(sr.x + w * 0.05, w * 0.04), y: (sr.y + base) / 2 }] });
      if (R() < 0.85) { const m = { x: j(px - w * 0.18, w * 0.05), y: top + ph * (0.45 + R() * 0.2) }; facets.push({ kind: "light", poly: [pk, sl, m, { x: px - w * 0.02, y: top + ph * 0.7 }] }); }
      if (L.snow) { const d = 0.22 + R() * 0.08, a = { x: px + (sl.x - px) * d * 1.6, y: pk.y + (sl.y - pk.y) * d * 1.6 }, b = { x: px + (sr.x - px) * d * 1.6, y: pk.y + (sr.y - pk.y) * d * 1.6 };
        facets.push({ kind: "snow", poly: [pk, b, { x: (px + b.x) / 2 + 6, y: b.y - 8 }, { x: px, y: (a.y + b.y) / 2 + 4 }, { x: (px + a.x) / 2, y: a.y - 10 }, a] }); }
      x += w; prevY = vRy;
    }
    pts.push({ x, y: prevY });
    return { pts, facets };
  }
  function makeClouds(L, R) {
    const n = L.count ?? 6, span = (L.to ?? 3600) - (L.from ?? -2600);
    return Array.from({ length: n }, (_, i) => { const s = (L.size || 60) * (0.6 + R() * 0.9), bumps = 2 + Math.floor(R() * 3);
      return { x: (L.from ?? -2600) + span * (i + R() * 0.8) / n, y: L.y + (R() - 0.5) * (L.spread ?? 80), w: s * (3 + R() * 2.5), h: s, bumps: Array.from({ length: bumps }, () => ({ fx: 0.2 + R() * 0.6, r: s * (0.55 + R() * 0.6) })) }; });
  }
  function makeSkyline(L, R) {
    const out = []; let x = L.from ?? -2600;
    while (x < (L.to ?? 3600)) { const w = (L.width || 70) * (0.6 + R() * 1.1), h = (L.height || 260) * (0.3 + R() * 0.9) * (R() < 0.08 ? 1.6 : 1);
      const lit = []; for (let yy = 14; yy < h - 14; yy += 22) for (let xx = 10; xx < w - 14; xx += 18) if (R() < (L.lit ?? 0.35)) lit.push([xx, yy]);
      out.push({ x, w, h, roof: R() < 0.2 ? "spire" : R() < 0.3 ? "step" : "flat", lit }); x += w + (L.gap ?? 4) * R(); }
    return out;
  }
  function makeTrees(L, R) {
    if (L.items) return L.items.map(it => ({ h: L.height || 300, ...it, ph: R() * TAU, lean: it.lean ?? (R() - 0.5) * 0.25 }));
    const n = L.count ?? 8, span = (L.to ?? 2400) - (L.from ?? -1400);
    return Array.from({ length: n }, (_, i) => ({ x: (L.from ?? -1400) + span * (i + 0.2 + R() * 0.6) / n, y: L.y, h: (L.height || 200) * (0.7 + R() * 0.5), ph: R() * TAU, lean: (R() - 0.5) * 0.3 }));
  }
  function makeBirds(L, R) { return Array.from({ length: L.count ?? 5 }, () => ({ x: (L.x ?? 0) + (R() - 0.5) * 300, y: L.y + (R() - 0.5) * 90, s: (L.size || 14) * (0.7 + R() * 0.6), ph: R() * TAU })); }
  function makeWater(L, R) { return Array.from({ length: L.count ?? 70 }, () => ({ x: -2600 + R() * 6200, y: L.y + 8 + Math.pow(R(), 1.6) * (L.depth ?? 400), w: 20 + R() * 70, ph: R() * TAU })); }

  function build(scene, env) {
    const R = mulberry(scene.seed ?? 7), haze = hex(scene.haze || "#cfe6ee");
    const worlds = {};
    for (const [name, W] of Object.entries(scene.worlds)) {
      const tall = env.H > env.W * 1.15, sq = !tall && env.W < env.H * 1.3;
      worlds[name] = W.layers.map(La => { const L0 = { ...La, ...((tall && La.portrait) || (sq && La.square) || {}) };
        const L = { k: ["sky", "stars"].includes(L0.type) ? -1 : 1, ...L0 }, h = L.haze ?? Math.max(0, 1 - L.k) * (W.haze ?? 0.55);   // farther = more haze
        const col = key => L[key] ? mix(hex(L[key]), haze, L.type === "sky" ? 0 : h) : null;
        L.c = col("color"); L.c2 = col("color2"); L.c3 = col("color3");
        if (L.type === "mountains") Object.assign(L, makeMountains(L, R));
        if (L.type === "clouds") L.items = makeClouds(L, R);
        if (L.type === "skyline") L.items = makeSkyline(L, R);
        if (["palms", "pines", "rounds"].includes(L.type)) L.items = makeTrees(L, R);
        if (L.type === "birds") L.items = makeBirds(L, R);
        if (L.type === "water") L.items = makeWater(L, R);
        if (L.type === "stars") L.items = Array.from({ length: L.count ?? 90 }, () => ({ x: R(), y: R() * (L.below ?? 0.6), r: 0.6 + R() * 1.6, ph: R() * TAU }));
        return L;
      }).sort((a, b) => a.k - b.k);
    }
    const grain = Array.from({ length: 6 }, () => { const c = document.createElement("canvas"); c.width = c.height = 192; const g = c.getContext("2d"), d = g.createImageData(192, 192);
      for (let i = 0; i < d.data.length; i += 4) { const v = R() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); return c; });
    const off = [0, 1].map(() => { const c = document.createElement("canvas"); c.width = env.W; c.height = env.H; return c; });
    // shots: durations are weights, scaled so they fill the clip exactly
    const shots = scene.shots, total = shots.reduce((s, x) => s + (x.dur ?? 1), 0); let acc = 0;
    const tall = env.H > env.W * 1.15, sq = !tall && env.W < env.H * 1.3;   // a shot may carry "portrait" or "square" overrides (camera, words) for those frames
    const timed = shots.map(s0 => { const s = { ...s0, ...((tall && s0.portrait) || (sq && s0.square) || {}) }; const d = (s.dur ?? 1) / total * env.secs, o = { ...s, world: s.world || Object.keys(worlds)[0], t0: acc, t1: acc + d }; acc += d; return o; });
    return { scene, worlds, grain, off, images: env.images || {}, shots: timed, font: scene.font || "'Inter', 'Helvetica Neue', Arial, sans-serif" };
  }

  // ---------- drawing ----------
  function poly(g, pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.fill(); }
  function palm(g, L, it, t) {
    const sw = Math.sin(TAU * t / (L.period || 4.5) + it.ph) * (L.sway ?? 0.035), h = it.h, bend = it.lean + sw * 0.6;
    const top = { x: it.x + Math.sin(bend) * h, y: it.y - Math.cos(bend) * h };
    // trunk: a tapered curve
    const segs = 16, wB = h * 0.045, wT = h * 0.022, left = [], right = [];
    for (let i = 0; i <= segs; i++) { const s = i / segs, cx = it.x + (top.x - it.x) * s + Math.sin(s * Math.PI) * h * 0.06 * Math.sign(bend || 1), cy = it.y + (top.y - it.y) * s, w = wB + (wT - wB) * s; left.push({ x: cx - w, y: cy }); right.unshift({ x: cx + w, y: cy }); }
    g.fillStyle = css(L.c3 || [80, 40, 70]); poly(g, [...left, ...right]);
    // fronds: serrated leaves that rise then droop; darker ones behind, lighter on top; a dark crown where they meet
    const n = L.fronds ?? 11;
    for (const pass of [0, 1]) for (let i = 0; i < n; i++) {
      if ((i % 2) !== pass) continue;
      if (pass && i === 1) { g.fillStyle = css(L.c3 || [80, 40, 70]); g.beginPath(); g.ellipse(top.x, top.y + h * 0.03, h * 0.032, h * 0.055, bend, 0, TAU); g.fill(); }
      const side = (i / (n - 1) - 0.5) * 2, a0 = -Math.PI / 2 + side * Math.PI * 0.9 + sw * (1.2 + (i % 3) * 0.3), len = h * (0.36 + ((i * 37) % 11) / 55) * (1 - Math.abs(side) * 0.1);
      const droop = (0.55 + (i % 4) * 0.12) * (0.35 + Math.abs(Math.cos(a0))), dir = side < 0 ? -1 : 1;
      const spine = []; for (let s2 = 0; s2 <= 16; s2++) { const u = s2 / 16, a = a0 + dir * droop * u * u; spine.push({ x: top.x + Math.cos(a) * len * u, y: top.y + Math.sin(a) * len * u + u * u * len * 0.18 }); }
      const A = [], Bs = [];
      spine.forEach((p, k) => { if (!k) return; const q = spine[k - 1], dx = p.x - q.x, dy = p.y - q.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, u = k / 16, w = h * 0.07 * Math.sin(Math.PI * Math.min(1, u * 1.1)) * (k % 2 ? 1 : 0.72);
        A.push({ x: p.x + nx * w, y: p.y + ny * w }); Bs.unshift({ x: p.x - nx * w * 0.75, y: p.y - ny * w * 0.75 }); });
      g.fillStyle = css(pass ? L.c : (L.c2 || shade(L.c, -0.25))); poly(g, [top, ...A, ...Bs]);
      g.strokeStyle = css(shade(pass ? L.c : (L.c2 || shade(L.c, -0.25)), -0.18)); g.lineWidth = h * 0.004; g.beginPath(); spine.forEach((p, k) => k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke();
    }
  }
  function pine(g, L, it, t) {
    const sw = Math.sin(TAU * t / (L.period || 5) + it.ph) * (L.sway ?? 0.01), h = it.h, w = h * 0.36;
    g.fillStyle = css(L.c3 || shade(L.c, -0.5)); g.fillRect(it.x - h * 0.025, it.y - h * 0.18, h * 0.05, h * 0.18);
    for (let i = 0; i < 3; i++) { const y0 = it.y - h * (0.12 + i * 0.25), y1 = y0 - h * 0.42, ww = w * (1 - i * 0.22), tip = { x: it.x + sw * h * (0.4 + i * 0.3), y: y1 };
      g.fillStyle = css(L.c); poly(g, [tip, { x: it.x - ww, y: y0 }, { x: it.x, y: y0 }]); g.fillStyle = css(L.c2 || shade(L.c, -0.22)); poly(g, [tip, { x: it.x, y: y0 }, { x: it.x + ww, y: y0 }]); }
  }
  function round(g, L, it, t) {
    const sw = Math.sin(TAU * t / (L.period || 5) + it.ph) * (L.sway ?? 0.012), h = it.h, r = h * 0.32, cx = it.x + sw * h, cy = it.y - h * 0.62;
    g.fillStyle = css(L.c3 || shade(L.c, -0.5)); g.fillRect(it.x - h * 0.03, it.y - h * 0.45, h * 0.06, h * 0.45);
    g.fillStyle = css(L.c); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    g.fillStyle = css(L.c2 || shade(L.c, -0.2)); g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2); g.fill();
  }
  function text(g, L, t, b) {   // words that live in the world (a sign on a hill) or on the screen; letters rise in one after another
    const local = t - (L.at ?? 0), size = L.size || 60, font = `${L.weight || 600} ${size}px ${L.font || b.font}`, tr = (L.track ?? 0.08) * size;
    g.font = font; g.textBaseline = "alphabetic";
    const chars = [...L.text], widths = chars.map(c => g.measureText(c).width), total = widths.reduce((s, w) => s + w, 0) + tr * (chars.length - 1);
    let x = L.x - (L.align === "left" ? 0 : total / 2);
    chars.forEach((c, i) => { const p = EASES.out(clamp((local - i * (L.stagger ?? 0.04)) / (L.dur ?? 0.7))), out = L.until != null ? 1 - EASES.in(clamp((t - L.until) / 0.4)) : 1;
      g.globalAlpha = p * out; g.fillStyle = css(L.c || [255, 255, 255]); g.fillText(c, x, L.y + (1 - p) * size * 0.35); x += widths[i] + tr; });
    g.globalAlpha = 1;
  }
  function drawLayer(g, L, t, b, env) {
    switch (L.type) {
      case "sun": { const r = L.r || 70; if (L.glow !== 0) { const gr = g.createRadialGradient(L.x, L.y, r * 0.8, L.x, L.y, r * (L.glow || 4)); gr.addColorStop(0, css(L.c, 0.35)); gr.addColorStop(1, css(L.c, 0)); g.fillStyle = gr; g.fillRect(L.x - r * 5, L.y - r * 5, r * 10, r * 10); }
        g.fillStyle = css(L.c); g.beginPath(); g.arc(L.x, L.y, r, 0, TAU); g.fill(); break; }
      case "clouds": { const span = (L.to ?? 3600) - (L.from ?? -2600);
        for (const c of L.items) { const x = (L.from ?? -2600) + ((c.x - (L.from ?? -2600) + t * (L.speed ?? 8)) % span + span) % span;
          g.fillStyle = css(L.c, L.alpha ?? 1); g.beginPath(); g.roundRect(x, c.y - c.h * 0.5, c.w, c.h * 0.5, c.h * 0.25); g.fill();
          for (const bp of c.bumps) { g.beginPath(); g.arc(x + c.w * bp.fx, c.y - c.h * 0.5, bp.r * 0.6, Math.PI, 0); g.fill(); } } break; }
      case "mountains": { g.fillStyle = css(L.c); poly(g, [...L.pts, { x: L.pts.at(-1).x, y: L.y + 2000 }, { x: L.pts[0].x, y: L.y + 2000 }]);
        for (const f of L.facets) { g.fillStyle = f.kind === "shadow" ? css(L.c2 || shade(L.c, -0.16)) : f.kind === "deep" ? css(shade(L.c2 || shade(L.c, -0.16), -0.08)) : f.kind === "light" ? css(shade(L.c, 0.1)) : css(L.c3 || [245, 248, 250]); poly(g, f.poly); }
        g.fillStyle = css(L.c); g.fillRect(L.pts[0].x, L.y, L.pts.at(-1).x - L.pts[0].x, 2000); break; }
      case "hills": { g.fillStyle = css(L.c); g.beginPath(); g.moveTo(-2600, L.y + 2000);
        for (let x = -2600; x <= 3600; x += 20) g.lineTo(x, L.y - (L.amp ?? 40) * (Math.sin(x / (L.wave ?? 260) + (L.phase ?? 0)) * 0.6 + Math.sin(x / ((L.wave ?? 260) * 0.43) + 1.3) * 0.4));
        g.lineTo(3600, L.y + 2000); g.closePath(); g.fill(); break; }
      case "ground": g.fillStyle = css(L.c); g.fillRect(-2600, L.y, 6200, 3000); break;
      case "water": { g.fillStyle = css(L.c); g.fillRect(-2600, L.y, 6200, 3000); g.fillStyle = css(L.c2 || shade(L.c, 0.25), 0.8);
        for (const s of L.items) { const k = 0.5 + 0.5 * Math.sin(TAU * t / (L.period || 3) + s.ph); g.globalAlpha = k * 0.9; g.fillRect(s.x + Math.sin(t * 0.7 + s.ph) * 12, s.y, s.w * (0.5 + k * 0.5), 3); } g.globalAlpha = 1; break; }
      case "skyline": for (const s of L.items) { const top = L.y - s.h; g.fillStyle = css(L.c); g.fillRect(s.x, top, s.w, s.h + 2000);
          if (s.roof === "spire") poly(g, [{ x: s.x + s.w * 0.3, y: top }, { x: s.x + s.w / 2, y: top - s.h * 0.25 }, { x: s.x + s.w * 0.7, y: top }]);
          if (s.roof === "step") g.fillRect(s.x + s.w * 0.2, top - 24, s.w * 0.6, 24);
          if (L.c2) { g.fillStyle = css(L.c2); for (const [xx, yy] of s.lit) g.fillRect(s.x + xx, top + yy, 7, 10); } } break;
      case "palms": for (const it of L.items) palm(g, L, it, t); break;
      case "pines": for (const it of L.items) pine(g, L, it, t); break;
      case "rounds": for (const it of L.items) round(g, L, it, t); break;
      case "birds": { g.strokeStyle = css(L.c || [40, 40, 50]); g.lineWidth = 2.4; g.lineCap = "round";
        for (const bd of L.items) { const x = bd.x + t * (L.speed ?? 40), f = Math.sin(TAU * t * 2.2 + bd.ph) * 0.6, s = bd.s; g.beginPath(); g.moveTo(x - s, bd.y - f * s * 0.6); g.quadraticCurveTo(x - s * 0.4, bd.y - s * 0.3, x, bd.y); g.quadraticCurveTo(x + s * 0.4, bd.y - s * 0.3, x + s, bd.y - f * s * 0.6); g.stroke(); } break; }
      case "text": text(g, L, t, b); break;
      case "image": { const im = b.images[L.src]; if (!im) break; const local = t - (L.at ?? 0), p = clamp(local / (L.dur ?? 0.8)), w = L.w || 300, hh = w * im.naturalHeight / im.naturalWidth, e = L.enter || "rise";
        const sc = e === "pop" ? (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(9 * p)) : 1, dy = e === "rise" ? (1 - EASES.out(p)) * hh * 0.25 : 0;
        g.save(); g.globalAlpha = e === "mask" ? 1 : EASES.out(Math.min(1, p * 1.6)); g.translate(L.x, L.y + dy); g.scale(sc, sc);
        if (e === "mask") { g.beginPath(); g.rect(-w / 2, -hh / 2, w * EASES.inOut(p), hh); g.clip(); }
        g.drawImage(im, -w / 2, -hh / 2, w, hh); g.restore(); break; }
      case "shapes": for (const it of L.items) {   // simple geometric storytelling: circle, ring, rect, tri; entrance pop | grow | draw | fade
          const local = t - (it.at ?? 0), p = clamp(local / (it.dur ?? 0.7)); if (p <= 0) continue;
          const e = it.enter || "pop", sc = e === "pop" ? (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(9 * p)) : e === "grow" ? EASES.out(p) : 1, c = hex(it.color || "#ffffff");
          const bob = it.float ? Math.sin(TAU * t / (it.period || 4) + (it.ph || 0)) * it.float : 0;
          g.save(); g.translate(it.x, it.y + bob); g.rotate((it.rot || 0) + (it.spin ? TAU * t / it.spin : 0)); g.scale(sc, sc); g.globalAlpha = e === "fade" ? EASES.out(p) : 1;
          g.fillStyle = css(c); g.strokeStyle = css(c); g.lineWidth = it.stroke || 8; g.lineCap = "round"; const w = it.w || 100, hh = it.h || w;
          if (it.shape === "circle") { g.beginPath(); g.arc(0, 0, w / 2, 0, TAU); g.fill(); }
          else if (it.shape === "ring") { g.beginPath(); g.arc(0, 0, w / 2, -Math.PI / 2, -Math.PI / 2 + TAU * (e === "draw" ? EASES.inOut(p) : 1)); g.stroke(); }
          else if (it.shape === "tri") { poly(g, [{ x: 0, y: -hh / 2 }, { x: w / 2, y: hh / 2 }, { x: -w / 2, y: hh / 2 }]); }
          else if (it.shape === "line") { g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2 + w * (e === "draw" ? EASES.inOut(p) : 1), 0); g.stroke(); }
          else { g.beginPath(); g.roundRect(-w / 2, -hh / 2, w, hh, it.radius || 0); g.fill(); }
          g.restore(); } break;
    }
  }
  function drawWorld(g, b, env, shot, t) {
    const extra = (shot.layers || []).map(x => ({ k: 1, ...x, at: (x.at ?? 0) + shot.t0, items: x.items && x.items.map(it => ({ ...it, at: (it.at ?? 0) + shot.t0 })) }));
    const u = clamp((t - shot.t0) / (shot.t1 - shot.t0)), e = (EASES[shot.ease || "inOut"])(u), A = shot.from || {}, Z = shot.to || A;
    const cam = { x: (A.x ?? 0) + ((Z.x ?? A.x ?? 0) - (A.x ?? 0)) * e, y: (A.y ?? 0) + ((Z.y ?? A.y ?? 0) - (A.y ?? 0)) * e, zoom: (A.zoom ?? 1) + ((Z.zoom ?? A.zoom ?? 1) - (A.zoom ?? 1)) * e };
    const S = env.H / 1000, Wd = env.W / S, cx = Wd / 2, cy = 500, X0 = b.scene.center ?? 889;   // the world's middle (a 16:9 design) sits at the screen's middle, so square and vertical frames show its centre
    // words stay inside a 6% safe margin at both ends of the camera move, whatever the frame's shape: shifted (or, if too wide, made smaller) once per shot
    shot._fit ??= (shot.text || []).map(x => { const size = x.size || 60; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = `${x.weight || 600} ${size}px ${x.font || b.font}`;
      const chars = [...(x.text || "")], tw = chars.reduce((a, c) => a + g.measureText(c).width, 0) + (x.track ?? 0.08) * size * Math.max(0, chars.length - 1); g.restore();
      const k = x.k ?? 1, ends = [A, Z].map(c => ({ x: c.x ?? A.x ?? 0, z: 1 + ((c.zoom ?? A.zoom ?? 1) - 1) * k })), m = Wd * 0.06;
      let scale = 1; for (const c of ends) scale = Math.min(scale, (Wd - 2 * m) / (tw * c.z));
      const w = tw * scale, lo = x.align === "left" ? 0 : -w / 2; let shift = 0;
      for (const c of ends) { const L = cx + c.z * (x.x + lo - X0 - c.x * k), R = L + c.z * w; if (L < m) shift = Math.max(shift, (m - L) / c.z); if (R > Wd - m) shift = Math.min(shift, (Wd - m - R) / c.z); }
      return { shift, scale }; });
    g.setTransform(1, 0, 0, 1, 0, 0); g.filter = "none"; g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    const layers = [...b.worlds[shot.world], ...extra, ...(shot.text || []).map((x, i) => ({ type: "text", k: 1, ...x, x: x.x + shot._fit[i].shift, size: (x.size || 60) * shot._fit[i].scale, c: hex(x.color || "#ffffff"), at: (x.at ?? 0.3) + shot.t0, until: x.until != null ? x.until + shot.t0 : null }))].sort((a, z) => a.k - z.k);
    for (const L of layers) {
      if (L.type === "sky") { g.setTransform(1, 0, 0, 1, 0, 0); const gr = g.createLinearGradient(0, 0, 0, env.H); gr.addColorStop(0, css(L.c)); gr.addColorStop(L.horizon ?? 0.62, css(L.c2 || L.c)); gr.addColorStop(1, css(L.c2 || L.c)); g.fillStyle = gr; g.fillRect(0, 0, env.W, env.H); continue; }
      if (L.type === "stars") { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#fff"; for (const s of L.items) { g.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * t / 2.5 + s.ph)); g.beginPath(); g.arc(s.x * env.W, s.y * env.H, s.r * S * 1.5, 0, TAU); g.fill(); } g.globalAlpha = 1; continue; }
      const k = L.k, z = 1 + (cam.zoom - 1) * k;
      g.setTransform(S * z, 0, 0, S * z, S * (cx - z * (X0 + cam.x * k)), S * (cy - z * (cy + cam.y * k)));
      g.filter = L.blur ? `blur(${(L.blur * S * z).toFixed(2)}px)` : "none";
      drawLayer(g, L, t, b, env);
      g.filter = "none";
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  function finish(g, b, env, f, t) {   // light rays, light leak, vignette, grain: subtle, over the whole frame
    const fx = b.scene.fx || {}, W = env.W, H = env.H, S = H / 1000;
    if (fx.rays) { const r = fx.rays, ox = (r.x ?? 0.15) * W, oy = (r.y ?? -0.05) * H; g.save(); g.globalCompositeOperation = "screen"; g.translate(ox, oy); g.rotate(Math.sin(TAU * t / 9) * 0.04);
      for (let i = 0; i < (r.count ?? 6); i++) { const a = 0.25 + i * 0.16, w = 0.035 + (i % 3) * 0.02; g.fillStyle = `rgba(255,248,225,${(r.alpha ?? 0.07) * (0.6 + 0.4 * Math.sin(TAU * t / 5 + i))})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - w) * W * 2, Math.sin(a - w) * W * 2); g.lineTo(Math.cos(a + w) * W * 2, Math.sin(a + w) * W * 2); g.closePath(); g.fill(); }
      g.restore(); }
    if (fx.leak) { const gr = g.createRadialGradient(W * (fx.leak.x ?? 0.95), H * (fx.leak.y ?? 0.1), 0, W * (fx.leak.x ?? 0.95), H * (fx.leak.y ?? 0.1), Math.max(W, H) * 0.6); const c = hex(fx.leak.color || "#ffb070"), a = (fx.leak.alpha ?? 0.18) * (0.75 + 0.25 * Math.sin(TAU * t / 6));
      gr.addColorStop(0, css(c, a)); gr.addColorStop(1, css(c, 0)); g.save(); g.globalCompositeOperation = "screen"; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); }
    if (fx.vignette) { const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, `rgba(0,0,0,${fx.vignette})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    if (fx.grain) { g.save(); g.globalAlpha = fx.grain; g.globalCompositeOperation = "overlay"; const p = g.createPattern(b.grain[f % b.grain.length], "repeat"); g.translate((f * 37) % 192, (f * 71) % 192); g.fillStyle = p; g.fillRect(-192, -192, W + 384, H + 384); g.restore(); }
  }
  function draw(ctx, env, b, f) {
    const t = f / env.fps, i = Math.max(0, b.shots.findIndex(s => t < s.t1) < 0 ? b.shots.length - 1 : b.shots.findIndex(s => t < s.t1)), shot = b.shots[i];
    const tr = i > 0 && shot.transition && shot.transition.type !== "cut" ? shot.transition : null, td = tr ? (tr.dur ?? 0.6) : 0;
    if (tr && t < shot.t0 + td / 2 + 1e-9 || (b.shots[i + 1]?.transition && b.shots[i + 1].transition.type !== "cut" && t >= shot.t1 - (b.shots[i + 1].transition.dur ?? 0.6) / 2)) {
      // inside a transition window centred on the cut: render both shots and combine
      const [A, B, T] = tr && t < shot.t0 + td / 2 ? [b.shots[i - 1], shot, tr] : [shot, b.shots[i + 1], b.shots[i + 1].transition], d = T.dur ?? 0.6, p = clamp((t - (B.t0 - d / 2)) / d);
      const [ca, cb] = b.off, ga = ca.getContext("2d"), gb = cb.getContext("2d");
      drawWorld(ga, b, env, A, Math.min(t, A.t1)); drawWorld(gb, b, env, B, Math.max(t, B.t0));
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = "none"; const W = env.W, H = env.H, q = EASES.inOut(p);
      if (T.type === "dissolve") { ctx.drawImage(ca, 0, 0); ctx.globalAlpha = q; ctx.drawImage(cb, 0, 0); ctx.globalAlpha = 1; }
      else if (T.type === "whip") {   // both frames slide sideways with a horizontal streak (copies along the motion), strongest mid-way
        const dir = T.dir === "right" ? 1 : -1, streak = Math.sin(Math.PI * p) * W * 0.12, n = Math.max(2, Math.ceil(streak / 2.5));
        for (let j = 0; j < n; j++) { const o = (j / (n - 1) - 0.5) * streak; ctx.globalAlpha = j ? 1 / (j + 1) : 1; ctx.drawImage(ca, dir * q * W + o, 0); ctx.drawImage(cb, dir * (q - 1) * W + o, 0); }
        ctx.globalAlpha = 1; }
      else if (T.type === "iris") { ctx.drawImage(ca, 0, 0); ctx.save(); ctx.beginPath(); ctx.arc(W * (T.x ?? 0.5), H * (T.y ?? 0.5), q * Math.hypot(W, H), 0, TAU); ctx.clip(); ctx.drawImage(cb, 0, 0); ctx.restore(); }
      else if (T.type === "push") {   // push through: the new shot settles in behind while the old one flies past the camera and fades
        const sb = 1.1 - q * 0.1, sa = 1 + q * 0.6; ctx.drawImage(cb, W / 2 - W * sb / 2, H / 2 - H * sb / 2, W * sb, H * sb);
        ctx.globalAlpha = Math.pow(1 - q, 2); ctx.drawImage(ca, W / 2 - W * sa / 2, H / 2 - H * sa / 2, W * sa, H * sa); ctx.globalAlpha = 1; }
      else { ctx.drawImage(p < 0.5 ? ca : cb, 0, 0); }
    } else drawWorld(ctx, b, env, shot, t);
    finish(ctx, b, env, f, t);
  }
  // images (logos, illustrations) used anywhere in the scene, loaded before build: every src must be a local file next to anim.html
  function load(scene) {
    const srcs = new Set(); const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === "object") { if (o.type === "image" && o.src) srcs.add(o.src); Object.values(o).forEach(walk); } }; walk(scene);
    return Promise.all([...srcs].map(src => new Promise((res, rej) => { const im = new Image(); im.onload = () => (im.decode ? im.decode().catch(() => 0) : Promise.resolve()).then(() => res([src, im])); im.onerror = () => rej(new Error("image not found: " + src)); im.src = src; }))).then(Object.fromEntries);
  }
  return { build, draw, load, mix, hex };
})();
