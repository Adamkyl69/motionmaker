// Whiteboard: a hand with a marker draws the picture line by line on a white board, then writes the words. Strokes appear in order as the pen
// moves along them; the hand follows the pen tip. Marker black with one accent colour, on twos (a slight boil like a real marker re-drawn).
window.SCENE = {
  seed: 2, on: 2, ink: "#161616", inkWidth: 5, boil: 0.5, light: [-0.6, -0.8], paper: "#fbfbf8",
  setup(k) {
    const W = k.Wd, cx = W / 2, u = Math.min(1, W / 1100);
    const circ = (x, y, r, a0 = -Math.PI / 2, n = 40) => Array.from({ length: n + 1 }, (_, i) => [x + Math.cos(a0 + i / n * k.TAU) * r, y + Math.sin(a0 + i / n * k.TAU) * r]);
    const bx = cx - 330 * u, by = 430;
    this.strokes = [   // the drawing, in the order the hand draws it: a light bulb, its rays, an arrow, a chart
      { pts: circ(bx, by, 110 * u), w: 6 }, { pts: [[bx - 55 * u, by + 95 * u], [bx - 50 * u, by + 170 * u], [bx + 50 * u, by + 170 * u], [bx + 55 * u, by + 95 * u]], w: 6 },
      { pts: [[bx - 45 * u, by + 195 * u], [bx + 45 * u, by + 195 * u]], w: 6 }, { pts: [[bx - 20 * u, by + 60 * u], [bx - 10 * u, by - 10 * u], [bx + 10 * u, by + 10 * u], [bx + 20 * u, by - 10 * u], [bx + 25 * u, by + 60 * u]], w: 4, color: "#e8532f" },
      ...[0, 1, 2, 3, 4].map(i => { const a = -Math.PI * (0.15 + i * 0.175); return { pts: [[bx + Math.cos(a) * 140 * u, by + Math.sin(a) * 140 * u], [bx + Math.cos(a) * 190 * u, by + Math.sin(a) * 190 * u]], w: 5, color: "#e8532f" }; }),
      { pts: [[cx - 120 * u, by], [cx + 60 * u, by]], w: 6 }, { pts: [[cx + 30 * u, by - 30 * u], [cx + 62 * u, by], [cx + 30 * u, by + 30 * u]], w: 6 },
      { pts: [[cx + 140 * u, by - 160 * u], [cx + 140 * u, by + 170 * u], [cx + 480 * u, by + 170 * u]], w: 6 },
      { pts: [[cx + 160 * u, by + 130 * u], [cx + 240 * u, by + 40 * u], [cx + 320 * u, by + 80 * u], [cx + 450 * u, by - 120 * u]], w: 7, color: "#e8532f" },
    ];
    this.u = u;
  },
  hand(k, x, y) {   // a hand holding a marker, drawn simply: marker, fist with knuckle lines, cuff; the pen tip is at (x, y)
    const u = this.u * 1.15, P = p => p.map(([a, b]) => [x + a * u, y + b * u]);
    k.shape(P([[0, 0], [10, -16], [96, -118], [80, -132], [-4, -28]]), { fill: "#2a2a2a", hi: "#5a5a5a", hiOff: 3, inkW: 2.5, id: 900 });
    k.shape(P([[60, -88], [96, -150], [150, -170], [196, -140], [204, -88], [172, -48], [118, -40], [74, -58]]), { fill: "#f2c9a6", shade: "#d9a883", shadeOff: 18, inkW: 3, smooth: true, id: 901 });
    k.line(P([[96, -96], [132, -112]]), { w: 2.5, id: 902 }); k.line(P([[110, -70], [150, -88]]), { w: 2.5, id: 903 }); k.line(P([[130, -50], [166, -66]]), { w: 2.5, id: 904 });
    k.shape(P([[188, -160], [250, -210], [290, -150], [214, -96]]), { fill: "#3a6ea5", shade: "#2b5584", shadeOff: 10, inkW: 3, id: 905 });
  },
  draw(k) {
    const S = this.strokes, total = k.secs * 0.62, per = total / S.length; let tip = null;
    S.forEach((st, i) => { const p = k.clamp((k.t - i * per) / per); if (p > 0) { const at = k.drawOn(st.pts, k.E.inOut(p), { w: st.w, color: st.color, id: 100 + i }); if (p < 1) tip = at; } });
    const words = window.CEL_TEXT, tStart = total + 0.15, wd = Math.max(0.6, k.secs - tStart - 0.6), p = k.clamp((k.t - tStart) / wd);
    if (words && p > 0) {   // the words are written left to right: revealed behind the moving pen
      const c = k.ctx, size = Math.min(100, k.Wd * 0.8 / Math.max(4, words.length) * 1.6), y = 800; c.save(); c.font = `700 ${size}px 'Comic Sans MS', 'Segoe Print', 'Bradley Hand', 'Chalkboard SE', 'Marker Felt', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
      const w = c.measureText(words).width, x0 = k.Wd / 2 - w / 2; c.beginPath(); c.rect(x0 - 10, y - size, (w + 20) * p, size * 2); c.clip(); c.fillStyle = "#161616"; c.fillText(words, k.Wd / 2, y); c.restore();
      if (p < 1) tip = [x0 + w * p, y + size * 0.25]; }
    if (tip) this.hand(k, tip[0], tip[1]);
  },
};
