---
name: motionmaker-build
description: Write and render a frame-exact animation program (single HTML file, deterministic per frame) and render it to PNG frames with headless Chromium, or export it as code for websites and React apps (TypeScript player, React component, frame-exact). Use after motionmaker-brief, when creating or editing an animation's code, when asked to render frames, or when the user wants the animation on a website or in an app rather than as a video.
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


## Export as code (websites, React apps)
A finished piece can ship as code instead of a video: `node scripts/export-web.mjs anim.html [--poster <frame>] [--out web] --check`.
- Output: `<slug>/` (the deploy folder: the page as `index.html`, every file it requested while drawing all its frames, `mm-embed.js`, `motion.json`, `poster.jpg`), `motion-player.ts` / `.js` (no dependencies: `mountMotion(el, { src })` and a `<motion-clip>` element), `Motion.tsx` / `.jsx` (React 18/19, "use client" for Next.js), `demo.html`, `README.md`.
- How it plays: the piece sits in an iframe (its CSS and globals cannot clash with the site); the player owns the clock and asks the bridge for whole frames (latest wins, so a slow frame never queues), so frame n on the page is frame n of the video. It pauses off screen and in background tabs, shows the poster frame for reduced motion, and talks by postMessage, so the piece can live on another origin.
- `--check` plays the export through the player and needs: 5 sample frames pixel-identical to the renderer's, play, pause, loop, a non-looping end with one `onEnd`, reduced motion. Tested on all 16 templates (21 pieces incl. every art style), in a React 18 StrictMode app (esbuild), against React 19 types, cross-origin, and with the `<motion-clip>` element.
- Real-time pages (an Anatomy figure, a web demo) export live: `--live --clip <selector> [--actions a.json] [--repeat <secs>]`. `web/live.js` goes in as the page's first script and gives the page a pausable clock (rAF, timers, `performance.now`, `Date`, CSS animations), crops to the clip, plays the actions tour (same format as `film-realtime.mjs`) until the visitor's first real touch, and holds still for reduced motion until touched. Its `--check` also requires the page's own animation loop to run once per frame.
- Not included: sound. The template's own live preview (`anim.html` opened directly) still works as before.
- Editing: the players are written in `web/motion-player.ts` and `web/Motion.tsx`; the `.js`/`.jsx` files are `tsc` output (target ES2020, `jsx: preserve`): regenerate them after an edit.
