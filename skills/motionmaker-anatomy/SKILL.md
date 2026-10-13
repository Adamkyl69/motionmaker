---
name: motionmaker-anatomy
description: Explain a technical idea as a working machine, on video. Uses Anatomy (github.com/wheresryan22/anatomy, MIT, installed separately), which builds interactive isometric figures where the object's working IS the concept (a cache becomes a pin-tumbler lock, a rate limiter a token bucket), then films the figure frame-exactly with Motionmaker (virtual clock, scripted hover/drag/clicks, CPU-rasterised so two films are identical), and runs our film QA. Use when the user wants an explainer of how something works (software, hardware, science), a "show the mechanism" shot, an exploded view, or mentions Anatomy.
---

# Anatomy figures on film

Anatomy (by Ryan, MIT) makes the figure; Motionmaker films it, directs the shots and checks the film. Paths: `AN=$MOTIONMAKER_SKILLS/motionmaker-anatomy/scripts/anatomy.mjs`.

## 1. When to use it (onboarding)
Route here when the request is "explain how X works" and a mechanism would explain it better than words and charts: protocols, caches, queues, rate limits, engines, instruments, physics. Offer it alongside a normal motion graphic; it is slower:
- Anatomy's own sizes: **Figure** (one mechanism, 40-80 parts, up to about an hour), **Hero** (80-150 parts, about 2-4 hours), and larger. Say the size and time before starting.
- Output on film: a light or dark isometric card (Anatomy's own look, not our looks), sharp at 2x, with its live readout. Our look system does not restyle it; pick the theme that fits the brief and frame it on the page colour.
- People are not drawn; it is objects and mechanisms.

## 2. Install (the user's choice)
`node $AN where` finds it. If missing: `npx skills add wheresryan22/anatomy -g -a claude-code` (Anatomy's own installer) or `node $AN install` (git clone at a pinned commit next to the Motionmaker skills). It has no dependencies and needs Node 20.10+ and Chrome/Chromium for its checks. Start a new session after installing so `/anatomy` is loaded.

## 3. Build the figure with Anatomy
Hand over with the art director's one message as the concept: run `/anatomy <the concept>, for a <N>-second video` and follow Anatomy's own workflow and checks (its SKILL.md governs the drawing). Ask it to keep motion calm and to give the figure an idle tour or clear pointer/key interactions, because that is what the film shows. Its example pages (`examples/*/*-light.html`) are good test subjects; they are Anatomy's work, not ours to publish.

## 4. Plan the shots, then film
`node $AN inspect <figure.html>` lists what can move: idle tour, pointer stage, keys, buttons, readout. Write the shot list from the brief's beats (one hero move per shot, holds long enough to read the readout):
```
node $AN film <figure.html> --secs 9 --fps 24 --frame 1080x1080 \
  --shots "hover .rp-stage 0.5,0.45 @1.2; leave @4.4; click button.rp-fire @5.6" --out motion-out/<slug>/out/frames --check
```
- Shots: `hover <sel> x,y @t`, `move <sel> x0,y0>x1,y1 @t+dur` (a glide, one pointer event per frame), `click <sel> @t`, `key <Key> @t`, `leave @t`. No shots = the figure's idle tour.
- It films the card (`.iso-plate`), scales it to `--frame` on the page colour, hides "hover to..." hints (they address a reader, not a viewer; `--keep-hint` keeps them), and `--check` films twice and requires identical frames.
- Then the usual path: `export.sh` (MP4/GIF), `film-gate.mjs`, `review-pack.mjs` + an independent reviewer, `deliver.mjs`. Sound and a title/end card: our templates and `montage.mjs finish` (it joins any clips).

## How the filming works (so you can debug it)
`motionmaker-build/scripts/film-realtime.mjs` (general: any real-time web page, not only Anatomy):
- Virtual clock for `requestAnimationFrame`, `performance.now`, `Date`, `setTimeout`/`setInterval`, CSS and Web animations (looping ones follow the clock, one-shots run from when they appear), seeded `Math.random`, and `IntersectionObserver` (everything visible).
- An input gate: only scripted pointer events reach the page; Chrome's own synthetic hover events after scrolls are stopped (they made figures stop their tour at random frames).
- CPU rasterisation and compositing, and two real frames before each capture. Found by testing: on software GL, GPU raster painted soft shadows and composited the WebGL layer slightly differently run to run. With these, 16 of 16 films of the dial example and the Raptor's take-apart-and-fire shot (SVG plus WebGL) were identical.
- Not virtualised: Web Workers, `<video>`/`<audio>` playback, WebAudio clocks. `--check` catches pages that depend on them.
- Speed: the Raptor (about 1,500 SVG parts plus WebGL) films at about 0.7 s per frame at 1x; use `--scale 1` for heavy figures and 2 for light ones.

## Credit and limits
- Credit: "Figure built with Anatomy by Ryan (github.com/wheresryan22/anatomy, MIT)". The figure the user builds with it is theirs.
- Anatomy can publish figures to its community gallery (`scripts/publish.mjs`, GitHub pull request) only after an explicit yes; that script reads the Claude Code session log for time and token counts. Motionmaker never calls it.
- Tested here with Anatomy's own examples (dial indicator, Raptor engine), not with a figure built end to end in this environment.
