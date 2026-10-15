// Silhouette: everything in front of a glowing sky is one dark colour, so the story is told by outline and movement alone. A big low sun,
// layered hills, trees, birds, a figure walking along the ridge, on twos.
window.SCENE = {
  seed: 14, on: 2, ink: false, boil: 0.4, light: [-0.6, -0.8], paper: "#ff9a5a",
  fx: { vignette: 0.35, grain: 0.05 },
  draw(k) {
    const c = k.ctx, W = k.Wd, t = k.t, scroll = k.time * 40;
    const g = c.createLinearGradient(0, 0, 0, 1000); g.addColorStop(0, "#3a1c5c"); g.addColorStop(0.45, "#c2477a"); g.addColorStop(0.75, "#ff9a5a"); g.addColorStop(1, "#ffd27a"); c.fillStyle = g; c.fillRect(-50, -50, W + 100, 1100);
    k.glow(W * 0.62, 640, 420, "rgba(255,230,170,0.9)", 0.7); k.shape(k.circle(W * 0.62, 640, 170, 40), { fill: "#ffe6a8", ink: false, id: 1 });
    const ridge = (y, amp, wave, ph, col, id, sp) => { const pts = [[-60, 1100]]; for (let x = -60; x <= W + 60; x += 30) pts.push([x, y - amp * Math.sin((x + scroll * sp) / wave + ph) - amp * 0.4 * Math.sin((x + scroll * sp) / (wave * 0.37))]); pts.push([W + 60, 1100]); k.shape(pts, { fill: col, smooth: true, id }); };
    ridge(700, 50, 300, 1, "#5b2a4d", 2, 0.3); ridge(800, 40, 220, 3, "#2c1530", 3, 0.6);
    for (let i = 0; i < 4; i++) { const x = ((i * 520 - scroll * 0.6) % 2080 + 2080) % 2080 - 200; k.shape(k.rect(x - 6, 650, 12, 160), { fill: "#2c1530", id: 10 + i }); k.shape([[x, 520], [x + 70, 690], [x - 70, 690]], { fill: "#2c1530", id: 20 + i }); }
    for (let i = 0; i < 5; i++) { const bx = ((i * 140 + k.time * 60) % (W + 300)) - 150, by = 260 + (i % 3) * 40, f = Math.sin(t * 9 + i) * 10; k.line([[bx - 18, by - f], [bx, by], [bx + 18, by - f]], { color: "#2c1530", w: 4, id: 30 + i }); }
    k.figure(W * 0.4, 800, 300, k.pose.walk(t, 0.9), { silhouette: "#1a0b1f" });
    if (window.CEL_TEXT) k.text(window.CEL_TEXT, W / 2, 180, { size: Math.min(120, W * 0.8 / Math.max(4, window.CEL_TEXT.length) * 1.7), at: k.secs * 0.3, fill: "#ffe6a8", stroke: 0, shadow: 0, rot: 0, pop: false, weight: 800 });
  },
};
