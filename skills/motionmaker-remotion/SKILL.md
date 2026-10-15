---
name: motionmaker-remotion
description: Make a motion piece as a Remotion project (video as React components, remotion.dev) and keep Motionmaker's guarantees - start from the approved brief with a pinned, tested Remotion version (4.0.484), install only on the user's yes, ask the licence question first (free for individuals, companies with up to 3 employees, non-profits; others need a Remotion Company License), render with Remotion's own CLI using the machine's Chromium, write a PNG sequence our review tools read, and prove it frame-exact (no clock or unseeded random in the source, the same frame rendered twice is pixel-identical). Use when the user asks for Remotion, wants the animation as React code they can keep editing, needs data-driven or templated videos (many versions from one composition), or already has a Remotion project.
---

# Remotion

Remotion makes video from React: every visual is a function of `useCurrentFrame()`, so it fits Motionmaker's rule (a frame is a pure function of its number) by design. Use it when the user wants **React code they own and can keep editing**, **templated video** (one composition, many versions from data), or already works in Remotion. For a one-off piece, our own templates are faster and need no install.

Paths: `RM=$MOTIONMAKER_SKILLS/motionmaker-remotion/scripts/remotion.mjs`.

## 1. Before anything is installed
1. **Licence** (checked 2026-10-15 at remotion.dev/license): free for an individual, a for-profit organization with **up to 3 employees**, a non-profit, or while evaluating. Anyone else needs a **Remotion Company License**. Ask once, in plain words: "Is this for you personally, a company of 3 or fewer people, or a bigger company?" Bigger company: say they need Remotion's Company License, or offer our own templates instead.
2. **Install**: `node $RM init motion-out/<slug>/remotion --size <W>x<H> --fps <fps> --secs <s> --text "<headline>" --bg --fg --accent "<hex>"` writes the project (a starter `src/Main.tsx` and `props.json` from the brief). `node $RM install <dir> --yes` only after the user's yes (npm install, about 230 MB, about 40 s here).

## 2. Write the piece
Edit `src/Main.tsx` (or add components) in Remotion's idiom: `useCurrentFrame`, `useVideoConfig`, `interpolate` (with `extrapolateLeft/Right: "clamp"`), `spring({ frame, fps, config })`, `Sequence` for timing, `random("seed")` for anything random, `staticFile()` for files in `public/`. **Never**: `Math.random`, `Date`, timers, `fetch` at render time (data goes into `props.json`). Brand colours, feel and timing come from AD-BRIEF.md and the approved storyboard, like any other piece.

## 3. Render and check
- `node $RM render <dir> --out motion-out/<slug>/out/video.mp4 --frames motion-out/<slug>/frames`: the MP4, plus a PNG sequence named `f0000.png`... so `motionmaker-review` contact sheets and the film gate work unchanged. It uses `$CHROMIUM` or the machine's Playwright Chromium, so Remotion does not download its own browser when one is there.
- `node $RM check <dir> [--frame N]`: FAIL on a clock, unseeded random, timers or network in `src/`; renders frame N twice and compares the pixels. Must PASS before delivery.
- Then the usual finish: sound (`motionmaker-sound-export`), `film-gate`, independent review, `deliver.mjs`.

Measured here: a 3 s 1080x1080 piece rendered to MP4 and 90 PNGs in 20 s (4 cores); `check` PASS.

## Limits
Remotion's own features beyond the starter (Lottie, 3D, captions, media) are separate `@remotion/*` packages: add them at the same version (4.0.484) and say what they add. Fonts are the machine's unless loaded with `@remotion/google-fonts` or `staticFile`. Windows and macOS are untested.
