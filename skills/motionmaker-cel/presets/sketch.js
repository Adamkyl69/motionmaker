// Hand-drawn, frame by frame: pencil on paper. Every line is graphite, re-drawn on each drawing (strong boil), animated on twos; a light
// colour wash sits under the lines; faint blue construction lines show the animator's rough. A figure walks on the spot, the scene drifts by.
window.SCENE = {
  seed: 5, on: 2, ink: "#3b3833", inkWidth: 3.2, boil: 1.8, line: "pencil", light: [-0.6, -0.8], paper: "#f3eee3",
  fx: { paper: 0.35, vignette: 0.12 },
  setup(k) { this.u = Math.min(1, k.Wd / 1100); },
  draw(k) {
    const c = k.ctx, t = k.t, W = k.Wd, gy = 820, scroll = k.time * 70;
    c.strokeStyle = "rgba(80,130,200,0.25)"; c.lineWidth = 1.2; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(W * 0.5, 470 + i * 6, 210 - i * 8, 300, 0.05 * i, 0, k.TAU); c.stroke(); }   // the rough
    k.line([[-50, gy], [W + 50, gy + 6]], { w: 2.5, id: 1 });
    for (let i = 0; i < 6; i++) { const x = ((i * 420 - scroll) % 2520 + 2520) % 2520 - 300;   // grass tufts and a tree drifting past
      k.line([[x, gy], [x + 8, gy - 26], [x + 14, gy], [x + 22, gy - 18], [x + 28, gy]], { w: 2, id: 10 + i });
      if (i % 3 === 0) { k.shape(k.circle(x + 120, gy - 300, 110, 18), { fill: "rgba(140,170,110,0.35)", smooth: true, id: 30 + i }); k.line([[x + 120, gy], [x + 115, gy - 200]], { w: 4, id: 40 + i }); } }
    k.shape(k.circle(W * 0.82, 170, 60, 16), { fill: "rgba(240,200,110,0.35)", smooth: true, id: 2 });
    k.figure(W * 0.5, gy, 520 * Math.max(0.8, this.u), k.pose.walk(t, 0.8), { skin: "rgba(245,215,190,0.55)", shirt: "rgba(110,150,210,0.45)", pants: "rgba(90,90,110,0.4)", hair: "rgba(80,60,40,0.5)", shoe: "rgba(60,60,60,0.5)" });
    if (window.CEL_TEXT) k.text(window.CEL_TEXT, W / 2, 120, { size: Math.min(110, W * 0.8 / Math.max(4, window.CEL_TEXT.length) * 1.7), at: k.secs * 0.3, fill: "#f3eee3", shadow: 0, stroke: 5, inkColor: "#3b3833", font: "'Comic Sans MS', 'Segoe Print', 'Bradley Hand', 'Chalkboard SE', 'Marker Felt', sans-serif", weight: 700, rot: -0.03 });
  },
};
