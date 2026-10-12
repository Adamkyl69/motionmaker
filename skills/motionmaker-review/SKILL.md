---
name: motionmaker-review
description: The render -> look -> fix critique loop for animations: contact sheets, frame-numbered notes, determinism and loop-seam checks, and a fixes table. Use after rendering frames, when the user says an animation feels off, or before exporting.
---

# Motion review (the lab loop)

> Art direction first: when `motionmaker-art-director` is installed, run its critique (`critique.mjs`, `looktests.sh`, checklist) before this technical loop, and give notes in its frame-specific format.

The first render is a draft. Do 2-4 rounds: render stills -> **Read the images** -> notes with frame numbers -> fix one or two things -> re-render only what changed.

1. Stills: frames 0, N/4, N/2, 3N/4, N-1, plus a contact sheet: `scripts/contact-sheet.sh out/frames 8 4 3 out/contact.png`, then Read `out/contact.png`.
2. Freeze any frame: `anim.html?t=2.5`; screenshot and Read it.
3. Notes point at frames, not feelings: "frame 84 peaks late, move it 2 frames earlier", "frames 32-64 title wider than the frame". Translate feelings with `../motionmaker-brief/SKILL.md`.
4. Sharper views: onion skin (stack frames at low opacity: even spacing = robotic; tightening near keys = easing works) and speed graph (straight line = linear, corners = dead starts/stops). Compare the two frames either side of a problem and describe the difference.
5. Before export run `node scripts/check.mjs anim.html <seconds> <fps> --size WxH` (clock/random scan, determinism, no duplicated seam frame, page errors).
6. Count the creative follow-ups; keep prompt + follow-ups as receipts.

Pick 1-2 follow-ups per round; pasting many turns a fix into a rewrite. When a fix works, add it to the render contract.

## Fixes
| Symptom | Cause | Fix |
|---|---|---|
| Flicker / differs per run | Math.random, timers | seeded rng; frame = f(t) |
| Wrong font | captured before load | await document.fonts.ready |
| Loop hiccup | last frame repeats first | render 0..N-1 |
| Audio drift | beats rounded to whole frames | beat time = n*60/BPM, round each |
| Jank | animating width/top/left | transform + opacity only |
| Banding in GIF | gradients | flat color or dithered palette |
| Reads as "AI default" | model used default look | name each default, ban, re-render |
| Chrome looks like plastic (3D) | no reflections | add horizon/studio env, roughness ~0.05 |
| Letters 50 deep (three r160 TextGeometry) | `depth` overwritten with 50 | pin version; use `height` for extrusion |

## Finished-film checks, independent review, delivery (after check.mjs)
- `scripts/film-gate.mjs <film.mp4>`: judges the exported film like a viewer: RED dead stretch (nothing visibly changes for >= 4 s; a slow push counts as change), RED blank stretch (>= 0.3 s mid-film, judged by edges), RED blue-purple film (>= 30% of frames). Thresholds adapted from huashu-art-motion (MIT) and re-calibrated on our own templates (their full-frame motion floor failed all of ours; it is reported, not gated).
- `scripts/review-pack.mjs <film.mp4> --dir <project> --intent "..." --platform "..."`: contact sheets with timecodes, key frames, gate report, BRIEF.md and INTENT.md for a reviewer who never saw the code. Spawn a fresh subagent with only "Read <pack>/BRIEF.md and follow it exactly." It writes `review/NN-review.md` (first impression before the intent, timecoded findings with severity, regressions, Verdict SHIP/FIX). In testing it found a squashed-picture bug in our own product-demo template that every automated check had passed.
- `scripts/deliver.mjs <film.mp4> --dir <project>`: refuses (exit 2) on RED gate, no review of this exact film (matched by its sha256), a FIX verdict, a failing ledger or RED provenance; `--override-review "reason"` / `--override-provenance "reason"` are recorded. Writes DELIVERY.md with a sealed facts block; `deliver.mjs --verify DELIVERY.md` detects edited facts or a swapped film.

