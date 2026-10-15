// Paper cut-out: coloured paper pieces with a soft shadow under each, paper grain in every fill, no ink, animated on threes with each piece
// sitting a little differently every drawing (stop-motion). Layered hills, a sun, clouds, a waving figure, and words cut from paper.
window.SCENE = {
  seed: 8, on: 3, ink: false, boil: 0, jitter: 1.4, drop: { dx: 3, dy: 6, blur: 9, color: "rgba(60,40,20,0.35)" }, paperFill: true, light: [-0.6, -0.8], paper: "#ece1cc",
  fx: { paper: 0.25, vignette: 0.18 },
  draw(k) {
    const W = k.Wd, t = k.t;
    k.shape(k.rect(-40, -40, W + 80, 760), { fill: "#9fd3e0", drop: false, jitter: false, id: 1 });
    k.shape(k.circle(W * 0.78, 190, 85, 20), { fill: "#f6c445", id: 2 });
    for (let i = 0; i < 3; i++) { const x = ((i * 600 + t * 40) % (W + 400)) - 200, y = 140 + i * 60; k.shape([...k.circle(x, y, 40, 12), ...k.circle(x + 50, y - 20, 50, 12), ...k.circle(x + 105, y, 38, 12)].sort((a, b) => Math.atan2(a[1] - y, a[0] - x - 50) - Math.atan2(b[1] - y, b[0] - x - 50)), { fill: "#fbf7ef", smooth: true, id: 3 + i }); }
    const hill = (y, amp, wave, ph, col, id) => { const pts = [[-60, 1100]]; for (let x = -60; x <= W + 60; x += 40) pts.push([x, y - amp * Math.sin(x / wave + ph)]); pts.push([W + 60, 1100]); k.shape(pts, { fill: col, smooth: true, id }); };
    hill(640, 60, 260, 0.4, "#7fb069", 10); hill(740, 50, 200, 2.1, "#5a9254", 11); hill(860, 40, 320, 4.2, "#3f7a46", 12);
    for (let i = 0; i < 3; i++) { const x = W * (0.15 + i * 0.32); k.shape(k.rect(x - 8, 700, 16, 120), { fill: "#7a5236", id: 20 + i }); k.shape(k.circle(x, 680, 60, 14), { fill: "#2f6b3f", id: 30 + i }); }
    k.figure(W * 0.5, 900, 400, k.pose.wave(t), { skin: "#f0c39b", shirt: "#e4572e", pants: "#2e4a7d", hair: "#3b2416", shoe: "#22223a" });
    if (window.CEL_TEXT) k.text(window.CEL_TEXT, W / 2, 470, { size: Math.min(120, W * 0.8 / Math.max(4, window.CEL_TEXT.length) * 1.7), at: k.secs * 0.3, fill: "#fbf7ef", shadow: 9, shadowColor: "rgba(60,40,20,0.45)", stroke: 0, inkColor: "rgba(0,0,0,0)", pop: false, rot: -0.02 });
  },
};
