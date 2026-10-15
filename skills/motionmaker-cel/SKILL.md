---
name: motionmaker-cel
description: The look of traditional 2D cel animation, made frame-exact - inked outlines that "boil" slightly from drawing to drawing, cel shading (flat colour, a hard-edged shadow, a thin highlight), drawings held on twos like hand animation at 12 fps while camera pans run on ones, painted backgrounds that loop past, light cones and glows, speed lines, smear frames, squash and stretch, impact frames, camera shake, cel smoke and flame, and comic lettering that lands with overshoot. Presets: a night drive past townhouses, a product impact, a rocket launch. Honest about the limit: shapes are drawn by code, not by an animator's hand, so it does vehicles, objects, effects and graphic shots, not full character acting (that comes from an animator's frames or an AI video route). Use when the user wants 2D animation, cel or cartoon animation, an animated ad, a music-video or TikTok/Reels ad-story look with inked drawings, or picks the 2D cel tile on the animation-style board.
---

# 2D cel animation

What makes it read as hand-made animation, and how this kit does each one:
| Craft | In the kit |
|---|---|
| Drawings held for 2 or 3 frames ("on twos") | `on: 2` (or 3): `k.t` is the drawing's time; the camera pans on ones with `k.time`, as studios shoot them |
| Inked line that lives | every `k.shape` / `k.line` is inked; the line boils (re-jittered per drawing, seeded); `boil` sets how much (0.6 calm, 1.0 classic, 1.6 rough) |
| Cel shading | `fill` + `shade` (+ `shadeOff`, the band's depth) on the side away from `light` + `hi` (+ `hiOff`) on the lit edge; hard edges, no gradients |
| Painted backgrounds | drawn once in `setup` into `k.offscreen(...)` with no ink, softer values, then panned and repeated; light painted over with `k.beam` / `k.glow` |
| Speed | `k.speedLines` (straight or `radial`), smears (draw the object 2-4 times along its path with falling alpha, stretched), squash on landing, stretch in flight |
| Hits | `impact(k)` returns true for the drawing that inverts the frame; `shake(k)` returns the shake in design units (decaying) |
| Effects animation | `k.smoke(x, y, size, age)` cel puffs; flames as shapes redrawn per drawing with `k.hash(k.drawing, i)` |
| Lettering | `k.text(str, x, y, { at, size, fill })`: fat ink outline, offset shadow, overshoot pop |

Paths: `CL=$MOTIONMAKER_SKILLS/motionmaker-cel/scripts/cel.mjs`; build with `TEMPLATE=cel-scene SCENE=<preset | scene.js> bash $MOTIONMAKER_SKILLS/motionmaker/scripts/scaffold.sh <slug> "<headline>" W H fps secs - - - motion-out` (the headline reaches the scene as `window.CEL_TEXT`).

## 1. Start from a preset
`node $CL list`: **night-drive** (a roadster on a night street: painted facade pan, lamp posts in parallax, light cones, wheel spin arcs, exhaust, headlight beam; a vertical framing of its own), **impact** (a product slams in: smears, squash, impact frame, shake, comic burst, radial lines, sparkles), **launch** (a rocket: steam, flame, billowing smoke, shake, the camera tilting with the climb). `node $CL new impact --out motion-out/<slug>/scene.js`, change it to the user's subject, `node $CL check motion-out/<slug>/scene.js` (the contract: no clock, no unseeded random, no network), build, render, look.

A scene is `window.SCENE = { seed, on, ink, inkWidth, boil, light, paper, fx: { vignette, grain }, setup(k), draw(k), shake(k)?, impact(k)? }`. Coordinates are design units, 1000 tall; `k.Wd` is the frame's width in them. Shapes are point lists (`k.circle`, `k.ellipse`, `k.rect`, `k.move` to place, scale and rotate; `smooth: true` rounds them). **Give every shape a fixed `id`** so its boil stays its own. Draw far to near.

**The user's own subject** (their product, their car, their mascot as a simple object): draw it from a reference photo or their logo as a few shapes (silhouette, two or three cel tones, a few detail lines). Keep it to 6-15 shapes: cel design is about simplification. A brand's character or a film's vehicle is someone's property: make an original design with the same energy, never a copy.

## 2. Craft rules
1. **On twos for the subject, ones for the camera.** Everything that is "drawn" (the subject, its effects, the lines) changes every 2 frames; pans and tilts move every frame. Do not mix them inside one object.
2. **Silhouette first.** The subject should read as a solid black shape. Then cel tones: base, shadow (one consistent light direction for the whole shot), a highlight only on hard materials (glass, metal, paint).
3. **Line weight**: 3-4.5 for the subject, thinner (2-2.6) for interior detail, none on backgrounds. One ink colour (a very dark tint of the palette, not pure black).
4. **Backgrounds are quieter than the subject**: lower contrast, lower saturation, no ink. The brightest, most saturated spot in the frame is the subject or the words.
5. **Timing**: anticipation before a big move (a small wind-up), a fast action, a hold. Hits get one impact drawing, a short shake (0.3-0.5 s, decaying) and a hold. Smears only on the 2-4 fastest drawings.
6. **Effects are animated on twos too**, and redrawn each drawing (flames, sparks, speed lines), not slid.
7. **Lettering lands on a beat**, after the action settles, in the palette's loudest colour with the ink outline.
8. **Vertical frames**: re-frame, do not shrink. Check `k.H > k.W` in `setup` and bring the camera closer (see night-drive).

## 3. Check
`node $MOTIONMAKER_SKILLS/motionmaker-review/scripts/check.mjs motion-out/<slug>/anim.html <secs> <fps> --size WxH`: two renders identical, no clock, no errors. Then the contact sheet: look at the silhouettes, the light direction, the hit (is the impact drawing exactly at contact?), words clear of the action.

## Limits (say them before promising)
- This is drawn by code: vehicles, objects, products, effects, graphic shots. **Full character acting** (a person walking, talking, emoting) needs an animator: their frames (exported from an animation app as MP4 or a PNG sequence turned into MP4 with ffmpeg) come in through the `footage-scene` template and get our lettering, sound and checks; or an AI video route (`motionmaker-montage`) for generated shots. Simple illustrated characters can join as assets (`motionmaker-assets`).
- Fonts are the machine's (`k.text` takes a `font`), so lettering can differ between machines.
- The boil and every effect are seeded: the same scene renders the same film every time (checked).
