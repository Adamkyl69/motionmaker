// Night drive: a low roadster races along a street of old townhouses at night. The background is a painted facade that pans on ones (the camera
// tracks the car), lamp posts pass faster in front of it (parallax), the car is inked and cel-shaded and animated on twos (body bob, wheel spin,
// exhaust puffs, dust), its headlight cuts a beam, lamp cones fall from above, speed lines streak past, and the words pop in at the end.
// Everything here is ours: a generic car, a generic street.
window.SCENE = {
  seed: 12, on: 2, ink: "#140c16", inkWidth: 3.4, boil: 1.0, light: [0.35, -0.95], paper: "#1d2426",
  fx: { vignette: 0.45, grain: 0.06 },
  setup(k) {
    const S = k.S, Z = 1.3, TW = 640, tile = k.offscreen(TW * S * Z, 1000 * S), g = tile.getContext("2d"); g.scale(S * Z, S * Z);
    // the painted facade (one bay, repeats): no ink, soft values, thin dark lines like a background painter's
    g.fillStyle = "#33413f"; g.fillRect(0, 0, TW, 1000);
    g.fillStyle = "#2a3534"; g.fillRect(0, 300, TW, 22); g.fillRect(0, 585, TW, 26);
    g.fillStyle = "#3d4d4a"; for (let x = 0; x < TW; x += 16) g.fillRect(x, 322, 8, 10);
    const win = (x, y, w, h, lit) => { g.fillStyle = "#222b2b"; g.fillRect(x - 10, y - 10, w + 20, h + 20); g.fillStyle = lit ? "#f0b9d2" : "#3a2f3d"; g.fillRect(x, y, w, h);
      if (lit) { g.fillStyle = "#ffe3f0"; g.fillRect(x + 6, y + 6, w - 12, h * 0.35); } g.fillStyle = "#222b2b"; g.fillRect(x + w / 2 - 3, y, 6, h); g.fillRect(x, y + h * 0.45, w, 6);
      g.fillStyle = "#2c3736"; g.fillRect(x - 18, y + h + 10, w + 36, 12); };
    win(70, 80, 90, 120, true); win(270, 80, 90, 120, false); win(470, 80, 90, 120, true);
    win(70, 390, 90, 130, true); win(470, 390, 90, 130, true);
    g.fillStyle = "#222b2b"; g.fillRect(240, 360, 150, 260); g.fillStyle = "#f0b9d2"; g.fillRect(256, 380, 52, 200); g.fillRect(322, 380, 52, 200); g.fillStyle = "#2a3534"; g.fillRect(250, 360, 130, 18);
    g.fillStyle = "#2b3533"; for (let i = 0; i < 4; i++) g.fillRect(220 - i * 14, 620 + i * 22, 190 + i * 28, 22);
    g.strokeStyle = "rgba(10,14,14,0.55)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 300); g.lineTo(TW, 300); g.moveTo(0, 611); g.lineTo(TW, 611); g.moveTo(TW - 1, 0); g.lineTo(TW - 1, 700); g.stroke();
    g.fillStyle = "#262f2e"; g.fillRect(0, 700, TW, 300);
    this.tile = tile; this.TW = TW * Z;
    this.tall = k.H > k.W * 1.15; this.carScale = this.tall ? 0.72 : Math.min(1.2, (k.Wd * 1.02) / 1220);   // vertical: frame the car closer and let its tail leave the frame
  },
  shake(k) { return 0; },
  draw(k) {
    const c = k.ctx, speed = 1100, scroll = k.time * speed;          // the camera pans on ones; the drawings are on twos
    // background: the facade, panning
    const TW = this.TW, off = -((scroll * 0.45) % TW);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); for (let x = off * k.S; x < k.W; x += TW * k.S) c.drawImage(this.tile, Math.floor(x), 0); c.restore();
    // lamp cones from above (painted light, screen)
    for (let i = -1; i < 4; i++) { const x = ((i * 900 - scroll * 0.7) % 2700 + 2700) % 2700 - 300; k.beam(x, -40, x - 60, 760, 30, 180, "#e8e6ff", 0.22); }
    // lamp posts in the midground: dark painted silhouettes passing faster than the facade (parallax), each with a lantern glow
    for (let i = -1; i < 3; i++) { const x = ((i * 1400 - scroll * 0.85) % 2800 + 2800) % 2800 - 400;
      c.fillStyle = "#121719"; c.fillRect(x - 9, 250, 18, 520); c.fillRect(x - 26, 750, 52, 22); c.fillRect(x - 34, 210, 68, 48); k.glow(x, 234, 120, "rgba(255,226,170,0.9)", 0.55); }
    // the street
    c.fillStyle = "#1a1f22"; c.fillRect(-50, 760, k.Wd + 100, 300); c.fillStyle = "#272e31"; c.fillRect(-50, 760, k.Wd + 100, 14);
    c.fillStyle = "#56605f"; for (let i = 0; i < 12; i++) { const x = ((i * 300 - scroll * 1.2) % 3600 + 3600) % 3600 - 300; c.fillRect(x, 905, 140, 9); }
    k.speedLines({ y0: 120, y1: 900, count: 14, color: "rgba(230,225,255,0.18)", len: 520, w: 3 });
    // the car (inked, cel-shaded, on twos)
    const s = this.carScale, cx = this.tall ? k.Wd * 0.42 : k.Wd / 2 - 30 * s, gy = this.tall ? 900 : 985, bob = Math.sin(k.drawing * 1.7) * 3, t = k.t;
    const P = pts => k.move(pts, cx, gy + bob, s, 0, 0);            // car-local -> world (origin at the ground under the car's middle)
    // exhaust and dust behind
    for (let j = 0; j < 4; j++) { const age = ((k.drawing * 0.09 + j * 0.25) % 1); k.smoke(cx - 640 * s - age * 420, gy - 50 * s - age * 50, 50 * s, age, { seed: j + 1, fill: "#5d6468", shade: "#454b50" }); }
    // body: a long low roadster with fender bulges and wheel arches cut into the sill
    const arch = (cxw, r, from, to) => { const o = []; for (let i = 0; i <= 10; i++) { const a = from + (to - from) * i / 10; o.push([cxw + Math.cos(a) * r, -110 + Math.sin(a) * r]); } return o; };
    const body = [[595, -70], ...arch(400, 132, 0, -Math.PI), [-238, -70], ...arch(-370, 132, 0, -Math.PI), [-600, -70],
      [-612, -175], [-560, -232], [-470, -262], [-300, -256], [-180, -232], [120, -236], [300, -272], [470, -264], [562, -218], [604, -150]];
    k.shape(P(body), { fill: "#4a2a46", shade: "#2a1729", shadeOff: 46, hi: "#8a5479", hiOff: 7, id: 2 });
    k.shape(P([[-470, -262], [-300, -256], [-190, -236], [-330, -228], [-480, -240]]), { fill: "#5e3657", shade: "#3a2238", shadeOff: 8, id: 3 });     // rear deck
    k.shape(P([[300, -272], [470, -264], [540, -232], [330, -244]]), { fill: "#5e3657", shade: "#3a2238", shadeOff: 8, id: 30 });                   // front fender top
    k.shape(P([[-180, -232], [-110, -318], [70, -318], [120, -236]]), { fill: "#7a1d30", hi: "#ff5a6c", hiOff: 9, shade: "#41101c", shadeOff: 16, id: 4 });   // canopy glass
    k.shape(P([[-560, -232], [-520, -400], [-470, -404], [-440, -262]]), { fill: "#3d2440", shade: "#25152a", shadeOff: 16, hi: "#6a3f63", id: 5 });          // tail fin
    k.line(P([[-560, -150], [-238, -158], [240, -160], [560, -150]]), { w: 2.6, id: 6 });                                                              // side seam
    k.line(P([[-120, -230], [-130, -110]]), { w: 2.2, id: 31 });                                                                                         // door cut
    for (let q = 0; q < 3; q++) k.shape(P([[-30 + q * 45, -140], [-6 + q * 45, -140], [-14 + q * 45, -112], [-38 + q * 45, -112]]), { fill: "#ffe46b", inkW: 2, id: 40 + q });   // vents
    // wheels: tyre, rim, hub, spin arcs (a cartoon convention for speed)
    for (const [wx, id] of [[-370, 10], [400, 20]]) {
      const C = P([[wx, -110]])[0], R = 108 * s;
      k.shape(k.circle(C[0], C[1], R, 32), { fill: "#151015", hi: "#3d343c", hiOff: 5, id });
      k.shape(k.circle(C[0], C[1], R * 0.58, 26), { fill: "#5e5260", shade: "#362e38", shadeOff: R * 0.2, hi: "#8d808e", hiOff: 3, id: id + 1 });
      k.shape(k.circle(C[0], C[1], R * 0.16, 12), { fill: "#2b232c", id: id + 2 });
      const a0 = -k.t * 22; c.save(); c.strokeStyle = "rgba(230,220,240,0.55)"; c.lineWidth = 3.2 * s; c.lineCap = "round";
      for (let q = 0; q < 3; q++) { c.beginPath(); c.arc(C[0], C[1], R * (0.68 + q * 0.09), a0 + q * 2.1, a0 + q * 2.1 + 1.2); c.stroke(); } c.restore();
    }
    // lights: tail glow, headlight and its beam
    const tail = P([[-610, -178]])[0], head = P([[600, -152]])[0];
    k.glow(tail[0], tail[1], 90 * s, "rgba(255,40,60,0.9)", 0.6); k.glow(head[0], head[1], 70 * s, "rgba(255,240,180,1)", 0.7);
    k.beam(head[0], head[1], head[0] + 700, head[1] + 80, 10, 120, "#fff2c0", 0.35);
    // the words
    if (window.CEL_TEXT) k.text(window.CEL_TEXT, k.Wd / 2, 210, { size: Math.min(130, k.Wd * 0.8 / Math.max(4, window.CEL_TEXT.length) * 1.6), at: k.secs * 0.42, fill: "#ff4f6d" });
  },
};
