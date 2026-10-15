// Pixel art: the scene is drawn at 1/6 size and every pixel is snapped to a 16-colour palette, then scaled up with hard edges. A figure walks
// across a side-scrolling world (bricks, hills, bushes, clouds, a floating gem), on twos. Our own palette and characters.
window.SCENE = {
  seed: 3, on: 2, ink: "#1a1c2c", inkWidth: 6, boil: 0, pixel: 6, light: [-0.6, -0.8], paper: "#5fcde4",
  palette: ["#1a1c2c", "#5d275d", "#b13e53", "#ef7d57", "#ffcd75", "#a7f070", "#38b764", "#257179", "#29366f", "#3b5dc9", "#41a6f6", "#73eff7", "#f4f4f4", "#94b0c2", "#566c86", "#333c57"],
  draw(k) {
    const W = k.Wd, t = k.t, scroll = k.time * 160;
    k.shape(k.rect(-20, -20, W + 40, 1040), { fill: "#41a6f6", ink: false, id: 1 });
    for (let i = 0; i < 4; i++) { const x = ((i * 520 - scroll * 0.3) % 2080 + 2080) % 2080 - 200; k.shape(k.rect(x, 140 + (i % 2) * 70, 170, 40), { fill: "#f4f4f4", ink: false, id: 2 + i }); k.shape(k.rect(x + 40, 110 + (i % 2) * 70, 90, 40), { fill: "#f4f4f4", ink: false, id: 6 + i }); }
    for (let i = 0; i < 5; i++) { const x = ((i * 460 - scroll * 0.55) % 2300 + 2300) % 2300 - 300; k.shape([[x, 790], [x + 180, 520], [x + 360, 790]], { fill: "#38b764", id: 12 + i }); }
    for (let x = -((scroll) % 80) - 80; x < W + 80; x += 80) { k.shape(k.rect(x, 790, 80, 80), { fill: "#b13e53", inkW: 4, id: 30 }); k.shape(k.rect(x + 40, 870, 80, 80), { fill: "#ef7d57", inkW: 4, id: 31 }); k.shape(k.rect(x, 950, 80, 80), { fill: "#b13e53", inkW: 4, id: 32 }); }
    const gx = W * 0.72, gyy = 520 + Math.round(Math.sin(t * 4) * 3) * 6; k.shape([[gx, gyy - 40], [gx + 30, gyy], [gx, gyy + 40], [gx - 30, gyy]], { fill: "#73eff7", id: 40 });
    k.figure(W * 0.4, 790, 300, k.pose.walk(t, 1.2), { skin: "#ffcd75", shirt: "#257179", shirtB: "#257179", pants: "#29366f", hair: "#5d275d", shoe: "#1a1c2c", shade: null });
    if (window.CEL_TEXT) k.text(window.CEL_TEXT.toUpperCase(), W / 2, 330, { size: Math.min(110, W * 0.8 / Math.max(4, window.CEL_TEXT.length) * 1.5), at: k.secs * 0.3, fill: "#ffcd75", stroke: 12, shadow: 10, rot: 0, font: "'Courier New', monospace", weight: 900, pop: false });
  },
};
