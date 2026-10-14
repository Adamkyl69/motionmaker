---
name: motionmaker-flat
description: Flat design motion graphics (flat motion design) done to a studio standard - simple geometric shapes, clean movement and a few subtle effects telling a story with restraint. Builds layered flat-vector worlds (sky, sun, clouds, faceted mountain ranges, hills, water, skylines, palms, pines, round trees, birds, geometric shapes, a logo or illustration, words set into the scene) at depths, moves a 2.5D camera through them with real parallax (slow eased pans, push-ins, rises), keeps them alive with small motion (fronds sway, clouds drift, water shimmers, shapes float), adds atmospheric haze by depth, a defocused foreground, light rays, a light leak, grain and a vignette, and cuts between shots with dissolve, whip pan, iris or push-through. Frame-exact (seeded, checked). Use when the user wants flat design, flat illustration animation, an explainer, travel or brand-film look in clean vector shapes (a generic style: never a named studio's signature look), a parallax landscape, a logo or illustration brought to life with camera moves, or picks the flat design tile on the animation-style board.
---

# Flat design motion

The look: shapes with no outlines and no gradients inside them, two or three tones per object (lit side, shadow side), depth made by **colour fading toward the sky** and by **parallax**, never by detail. The motion: slow, eased, confident; small living details; effects you feel more than see. A frame of it should work as a poster; the motion makes it breathe.

Paths: `FL=$MOTIONMAKER_SKILLS/motionmaker-flat/scripts/flat.mjs`, scaffold `TEMPLATE=flat-scene SCENE=<preset | scene.json> bash $MOTIONMAKER_SKILLS/motionmaker/scripts/scaffold.sh <slug> "<headline>" W H fps secs - - - motion-out`. Engine: `motionmaker/templates/flat/flat.js` (do not edit per piece; edit the scene).

## 1. Start from a preset, then make it theirs
`node $FL list`: **coast** (palms, faceted ranges, a sign on the hills), **alpine** (snow peaks, lake, pines; whip pan to a forest), **city** (dusk skyline with lit windows, river; iris to the words), **night** (stars, moon, town lights, round trees; dissolve), **shapes** (a geometric story on a flat field for a logo or an idea; push-through). `node $FL new coast --out motion-out/<slug>/scene.json`, edit it, `node $FL validate motion-out/<slug>/scene.json` (exit 1 on a problem; notes for weak choices), scaffold with `SCENE=motion-out/<slug>/scene.json`. Shot durations are weights: they are scaled to fill the clip exactly.

**A reference** (a GIF or video the user likes, e.g. a brand film): run `motionmaker-reference` on it to learn its principles (layers, palette, camera speed, cut rhythm) and build our own world from them. Never copy a brand's logo, wordmark, characters or layout: a reference teaches the style, the content is the user's.

## 2. The scene, in one picture
- **Worlds** (`worlds.<name>.layers`): each layer has a `type` and a depth `k`: 0 = as far as the sky (does not move), 0.2-0.5 far ranges, 0.6-0.8 the middle (where words usually live), 1 = the focal plane, 1.3-2.5 the foreground (out of focus: `"blur": 3-8`). Layers draw far to near.
- Types: `sky` (top and horizon colour), `stars`, `sun` (also a moon), `clouds`, `mountains` (faceted ranges; `snow`), `hills`, `ground`, `water` (shimmer), `skyline` (lit windows with `color2`), `palms`, `pines`, `rounds` (round trees), `birds`, `shapes` (circle, ring, rect, tri, line: enter `pop | grow | draw | fade`, `float`, `spin`), `image` (a logo or illustration: enter `rise | pop | fade | mask`), `text`.
- **Colour**: `color` (lit), `color2` (shadow), `color3` (trunk, snow, a third tone). The world's `haze` (0..1) and the scene's `haze` colour fade far layers toward the sky automatically: pick the near colours, let the far ones follow.
- **Shots**: `world`, `from` / `to` camera (`x`, `y` in design units, the frame is 1000 tall; `zoom`), `ease` (`gentle` default for flat work, `inOut`, `out`, `linear` only for loops), `transition` into the shot (`cut`, `dissolve`, `whip` with `dir`, `iris` with `x`,`y`, `push`; `dur` seconds), `text` (words with depth `k`, position, `size`, `weight`, `track`, `at` seconds into the shot, `until`), `layers` (extra shapes or images for this shot only).
- **Vertical and square**: the world's middle sits in the frame's middle. Give a shot `"portrait": {…}` or `"square": {…}` (camera and words), and a layer `"portrait": {…}` (e.g. a smaller palm, or `"items": []` to drop it) for those frames. Always look at the vertical version before showing it.
- **Effects** (`fx`): `rays` (alpha 0.03-0.06), `leak` (warm light in a corner, alpha 0.1-0.2), `vignette` (0.12-0.3), `grain` (0.04-0.07). Turn one off before turning one up.

## 3. Craft rules (what makes it look professional)
1. **Five to seven depths**, each a clear value step: far ranges light and cool, near ones darker and more saturated. If two neighbouring layers have the same value, the depth flattens.
2. **Two or three tones per object**, light from one side for the whole world (the facet shadows and tree shadows already agree: keep `color2` darker than `color`, never lighter).
3. **A limited palette**: 4-6 hues plus their shadow tones. Brand colours go on the hero and the words, not on everything.
4. **Camera**: one move per shot, eased. A pan of 60-200 design units per shot, a push of 4-12 %. No zoom bounce, no shake. The foreground should cross more of the frame than the background: that difference IS the depth.
5. **Living details, small**: palms sway 0.02-0.05, clouds drift 4-10 units/s, water shimmers, shapes float 6-14 px. One kind of detail per layer. Nothing should draw the eye away from the hero.
6. **Words in the world**: set them at the middle depth (k 0.6-0.8) so they move with the scene, white or the lightest tone on the darkest area behind them, tracked wide (0.08-0.14) for capitals. Keep them clear of the foreground: look at the last frame of the shot (the camera has moved).
7. **Rhythm**: shots of 2.5-5 s; transitions on the beat (`motionmaker-sound-export` beat grid): dissolve for time passing, whip for energy, iris for focus, push-through for "going into" an idea.
8. **Story**: establish (wide, slow) → move in (the hero, a detail) → message (words, logo) → hold (the end frame is a poster).
9. **Logos and illustrations**: an SVG must pass `motionmaker-assets/scripts/inspect-asset.mjs` (no scripts) and go in the licence ledger; the user's own logo is fine. `"type": "image", "src": "logo.svg"` next to the scene JSON (copied in by the scaffold); enter with `pop` or `mask`, at the focal depth. Characters that walk or talk are not this engine: use `motionmaker-assets` (Open Peeps, Lottie, Rive) and set them in the world as images.

## 4. Check
`node $MOTIONMAKER_SKILLS/motionmaker-review/scripts/check.mjs motion-out/<slug>/anim.html <secs> <fps> --size WxH` (determinism, no clock, page errors), then the usual contact sheet and review: look for words crossed by the foreground, a layer with no value step, a move that is too fast, effects that read as a filter. Render the vertical version separately when the piece will be posted vertically.

## Limits
No characters that move by themselves (bring them in as assets); no 3D (stylised: `three-product`; photoreal: `motionmaker-blender`); type uses the fonts installed on the machine (set the scene's `"font"` to a CSS font stack), so it can differ between machines. A long whip or a large blur costs render time (each transition frame draws both shots).
