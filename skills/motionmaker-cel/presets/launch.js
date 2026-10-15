// Launch: a rocket on its pad at dusk; steam drifts, the engine lights (flame redrawn per drawing), cel smoke billows out from the base and rolls
// sideways, the frame shakes, the rocket climbs with an ease-in and vertical speed lines, the camera tilts up with it, and the words land.
window.SCENE = {
  seed: 21, on: 2, ink: "#1b1530", inkWidth: 3.6, boil: 1.0, light: [0.6, -0.8], paper: "#2c2350",
  fx: { vignette: 0.35, grain: 0.06 },
  ignite: 1.0,
  shake(k) { const d = k.time - this.ignite; return d > 0 ? Math.max(0, 9 - d * 3) : 0; },
  setup(k) { this.cx = k.Wd / 2; this.u = Math.min(1, k.Wd / 900); },
  draw(k) {
    const c = k.ctx, t = k.t, T = k.time, I = this.ignite, cx = this.cx, u = this.u;
    const rise = T > I + 0.5 ? Math.pow(T - I - 0.5, 2) * 200 : 0, tilt = rise * 0.8;   // the camera tilts up with the rocket, letting it creep upward in frame   // the camera follows part of the climb
    // painted dusk sky (bands, no gradients inside a band) and far hills
    const bands = ["#2c2350", "#4a2f6b", "#7a3f7c", "#c0597a", "#f08a6f", "#ffc27a"]; bands.forEach((b, i) => { c.fillStyle = b; c.fillRect(-50, -400 + i * 170 + tilt * 0.2, k.Wd + 100, 175); });
    c.fillStyle = "#3b2a55"; c.beginPath(); c.moveTo(-50, 760 + tilt); for (let x = -50; x <= k.Wd + 50; x += 40) c.lineTo(x, 700 + tilt + Math.sin(x / 140) * 30 + Math.sin(x / 57) * 10); c.lineTo(k.Wd + 50, 1100 + tilt); c.lineTo(-50, 1100 + tilt); c.fill();
    c.save(); c.translate(0, tilt);
    // ground and tower
    k.shape([[-50, 830], [k.Wd + 50, 830], [k.Wd + 50, 1200], [-50, 1200]], { fill: "#2a2140", ink: false, id: 1 });
    const tx = cx + 150 * u; k.shape([[tx, 830], [tx, 300], [tx + 40 * u, 300], [tx + 40 * u, 830]], { fill: "#5a4a72", shade: "#3e3155", shadeOff: 14, id: 2 });
    for (let i = 0; i < 9; i++) k.line([[tx, 330 + i * 55], [tx + 40 * u, 355 + i * 55]], { w: 2, id: 3 + i });
    // the rocket
    const ry = 520 - rise, rw = 90 * u, body = [[cx - rw, ry + 240], [cx - rw, ry - 40], [cx - rw * 0.7, ry - 170], [cx, ry - 280], [cx + rw * 0.7, ry - 170], [cx + rw, ry - 40], [cx + rw, ry + 240]];
    if (T >= I) for (let j = 0; j < 3; j++) { const fl = 1 + k.hash(k.drawing, j) * 0.5, L = (140 + j * 40) * fl * Math.min(1, (T - I) * 2) * u;   // flame, redrawn every drawing
      k.shape([[cx - rw * (0.75 - j * 0.2), ry + 250], [cx, ry + 250 + L], [cx + rw * (0.75 - j * 0.2), ry + 250]], { fill: ["#ff7a1a", "#ffc23d", "#fff4b8"][j], ink: j === 0, smooth: true, id: 40 + j }); }
    k.shape([[cx - rw, ry + 240], [cx - rw * 1.7, ry + 290], [cx - rw * 1.6, ry + 120], [cx - rw, ry + 60]], { fill: "#e04848", shade: "#9e2a3a", shadeOff: 14, id: 20 });
    k.shape([[cx + rw, ry + 240], [cx + rw * 1.7, ry + 290], [cx + rw * 1.6, ry + 120], [cx + rw, ry + 60]], { fill: "#e04848", shade: "#9e2a3a", shadeOff: 14, id: 21 });
    k.shape(body, { fill: "#f1eef6", shade: "#a49cb8", shadeOff: rw * 0.75, hi: "#ffffff", hiOff: 8, id: 22 });
    k.shape(k.circle(cx, ry - 40, 38 * u, 20), { fill: "#5fc3e4", hi: "#c8f1ff", hiOff: 5, shade: "#2f7d9c", shadeOff: 10, id: 23 });
    k.shape([[cx - rw * 0.7, ry - 170], [cx, ry - 280], [cx + rw * 0.7, ry - 170]], { fill: "#e04848", shade: "#9e2a3a", shadeOff: 18, id: 24 });
    k.shape([[cx - rw * 0.35, ry + 240], [cx + rw * 0.35, ry + 240], [cx + rw * 0.45, ry + 262], [cx - rw * 0.45, ry + 262]], { fill: "#4b4060", id: 25 });
    // smoke: steam before ignition, then billows rolling out from the base
    const base = 790;
    if (T < I) for (let j = 0; j < 3; j++) { const age = ((t * 0.5 + j / 3) % 1); k.smoke(cx + (j - 1) * 70 * u, base - age * 120, 40 * u, age, { seed: j + 3 }); }
    else for (let j = 0; j < 22; j++) { const born = I + j * 0.06, age = (T - born) / 2.4; if (age < 0) continue; const side = j % 2 ? 1 : -1;
      k.smoke(cx + side * (40 + Math.pow(Math.min(age, 1), 0.6) * (240 + j * 26)) * u, base - age * 110 - (j % 4) * 34, (120 + (j % 5) * 22) * u, Math.min(age, 0.95), { seed: j + 10, fill: "#f2eef8", shade: "#b6aacb" }); }
    c.restore();
    if (T > I + 0.7) k.speedLines({ dir: Math.PI / 2, count: 18, color: "rgba(255,240,230,0.35)", len: 360, w: 3 });
    if (window.CEL_TEXT) k.text(window.CEL_TEXT, k.Wd / 2, 860, { size: Math.min(130, k.Wd * 0.85 / Math.max(4, window.CEL_TEXT.length) * 1.7), at: I + 1.4, fill: "#ffe14d" });
  },
};
