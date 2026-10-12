# Demo: building a directed motion loop

A 4 s, 600x600, 24 fps "Launch day" title loop, built the way the Motion Lab article describes.

- `PROMPT.md`  the directed prompt (goal, time, palette, type, shots, easing, holds, bans, loop, QA)
- `anim.html`  the program: every pixel is a pure function of the frame number (`window.renderFrame(n)`, `?t=2.5` freezes a frame)
- `render.mjs` headless renderer: `CHROMIUM=<path> node render.mjs anim.html 4 24` -> `out/frames/*.png` (frames 0..95)
- `out/launch-day.gif|mp4|contact.png`  results

Lab loop used: render -> contact sheet -> note with frame numbers -> fix -> re-render.
Round 1 note: "frames 32-64: title is wider than the frame" -> font 110px -> 84px. Round 2 passed. check.mjs then found frame 95 == frame 0 (doubled seam frame); exit start moved 76 -> 79 so the loop ends mid-exit.
Setup: `npm i playwright` (or link an existing install), ffmpeg on PATH.
