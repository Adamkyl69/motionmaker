---
name: motionmaker-build
description: Write and render a frame-exact animation program (single HTML file, deterministic per frame) and render it to PNG frames with headless Chromium. Use after motionmaker-brief, when creating or editing an animation's code or when asked to render frames.
---

# Motion build

## Render contract (paste under every motion prompt)
```
- One self-contained HTML file; Claude writes code, the browser draws it.
- Every pixel is a pure function of the frame number f. No Date, performance.now, setTimeout-driven state, or unseeded Math.random (use Motion.rng(seed)).
- Expose window.renderFrame(n) (accept fractional n if motion blur is wanted). ?t=<seconds> freezes a frame.
- Wait for document.fonts.ready before first capture.
- Animate only transform and opacity (no width/top/left): avoids jank and subpixel jumps.
- Loop: frames 0..N-1 only; drive loops from phase = f/N with whole-number cycles; sample noise on a circle.
- Use only the tokens in the TOKENS object (easing curves, durations, stagger); no inline magic numbers.
- Frame 0 is a finished composition (it is the GIF poster).
```

## Steps
1. Copy `scripts/tokens.js` next to the animation (beziers, closed-form springs, beat math, seeded rng).
2. Write `anim.html` with a `TOKENS` object and `renderFrame(f)`. Reference implementation: `demo/anim.html`.
3. Render: `CHROMIUM=<path> node scripts/render.mjs anim.html <seconds> <fps> --size WxH` (add `--blur 8` for motion blur).
   Setup: `npm i playwright` (or symlink an existing install into `node_modules/`), ffmpeg on PATH. Chromium is at `/opt/pw-browsers/chromium` in cloud sessions.
4. Hand off to `motionmaker-review`. Do not export before review passes.

Numbers: `numbers.md`. Engine choice: `motionmaker-engines`. In Claude app (no shell): ask for a frame counter + space-to-pause for naming frames, remove before final recording.

## Filming pages that animate in real time
Pages not written for `renderFrame(n)` (web demos, interactive figures, a user's site animation): `node scripts/film-realtime.mjs <page.html> <secs> <fps> [--clip "<selector>"] [--scale 2] [--frame WxH --bg "#hex"] [--actions a.json] [--css "..."] [--check]`. It replaces the page's clocks with a virtual one and steps it one frame per capture, gates input to scripted actions, and rasterises on the CPU so two films are identical (`--check`). Test fixture: `scripts/fixtures/realtime-demo.html`. Not virtualised: Web Workers, media playback, WebAudio clocks.

