---
name: motionmaker-brief
description: Write a directed motion prompt with exact numbers (frames, hex, easing curves, springs, stagger, holds, bans, loop). Use before building any animation, or when the user gives a vague motion request like "make it pop" or "make a cool intro".
---

# Motion brief

Each line removes one decision the model would otherwise make for you; the model's own decisions are the default (generic) look. Fill every line, defaulting from `../motionmaker-build/numbers.md` values when the user gave none.

> If an `AD-BRIEF.md` exists (from `motionmaker-art-director`), derive this brief from it: its look, palette, type and motion language are decisions, not suggestions. The motion-personality table is in `motionmaker-art-director/craft/principles.md` section 5.

## Template

```
GOAL:    one sentence: what the viewer should feel or do
OUTPUT:  engine + canvas + fps + frames   e.g. "plain HTML, 1080x1080, 24 fps, 96 frames (4 s loop)"
SUBJECT: what is on screen (one idea per shot)
PALETTE: exact hex, one accent
TYPE:    face, weight, size, tracking
MODEL/CAMERA (3D only): materials (roughness, clearcoat), lights (key/fill/rim colors+strength), fov 30-50, orbit angles, push-in curve+time
SHOTS:   frame range | hero move | handoff (hard cut on the beat / match cut / mask wipe)
EASING:  named curves, not adjectives (enter ease-out, exit ease-in 40-50% shorter, move ease-in-out)
HOLDS:   still while it reads (0.3 s/word + 0.5 s), slow 2% push
SOUND:   (optional) BPM, hits on which frames, -14 LUFS
BANS:    named defaults to avoid
LOOP:    render 0..N-1; frame N-1 flows into 0; whole-number cycles
QA:      render stills at 0, N/4, N/2, 3N/4, N-1 and check before the full render
```

## Translating feelings to numbers
- "pop": scale 1.0 -> 1.08 -> 1.0 over 6 frames, peak on the beat
- "premium": ease-out-quint entrances, springs at damping ratio 0.8, no overshoot on text
- "drags": shorten each hold by one beat (12 frames at 120 BPM/24 fps), keep cuts on the grid
- "busy": one hero move at a time; everything else starts 150 ms later at 60% travel
- "looks like AI": list the defaults it used by name, ban each, re-render

Default ban list: purple/blue gradients, glow, lens flares, decorative particles, everything fading in at once, fade-and-slide-up on every element, centered-everything, text that moves while read, dark-navy backgrounds, spinning turntables.

Output the filled brief to the user (and save as `PROMPT.md` next to the animation) before building.
