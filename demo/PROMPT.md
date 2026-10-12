# Directed prompt used for this demo

GOAL: A title card that makes the viewer feel "this launch is here". 
OUTPUT: one HTML file, plain HTML/CSS/JS, 600x600, 24 fps, 96 frames (4 s loop).
PALETTE: #FFFFFF background, #0F0F0F text, #D97757 accent only on the bar.
TYPE: system sans 800, 84px, tracking -0.04em, text "Launch day".
SHOTS:
  frames 0-30  letters rise 40px, stagger 2f, 14f each, cubic-bezier(0.16,1,0.3,1)
  frames 34-78 hold still while it reads; slow 2% push
  frames 79-95 letters exit upward, ease-in cubic-bezier(0.7,0,0.84,0), 8f each, stagger 1f
ACCENT BAR: always visible (frame 0 is a finished composition); grows 0.6 -> 1.0 on the entrance, returns on exit.
BANS: gradients, glow, particles, fade-and-slide on everything, text moving while read.
LOOP: render frames 0..95 only; frame 95 flows into frame 0.
RENDER CONTRACT: every pixel is a pure function of the frame number; no Date/performance.now/Math.random;
  window.renderFrame(n) draws frame n; ?t=<seconds> freezes a frame.
QA: render stills at 0, 24, 48, 72, 95 and check them before the full render.
