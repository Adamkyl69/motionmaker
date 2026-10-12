---
name: motionmaker-reference
description: Analyze a reference video (MP4) to learn how a motion shot works before making your own: ffprobe dimensions/fps/duration, 2-per-second overview, consecutive frames around entrance/landing/press/cut, and a REFERENCE.md that separates measured values from visual estimates and proposed creative choices. Use when the user supplies a reference video or says "make it like this".
---

# Motion reference analysis

Give the reference one job (a card entrance with a controlled landing, a transition that keeps the product in view, a cursor action that makes the result obvious). You are collecting decisions to reuse, not pixels to copy: how it introduces the product, what moves first, where the eye lands, how long the result is held. Make an **original** shot with the user's own assets; never reproduce someone else's footage, logo or copy.

## Steps
1. `bash $MOTIONMAKER_SKILLS/motionmaker-reference/scripts/analyze-reference.sh reference.mp4` -> dimensions, frame rate, duration, 2/s overview, numbered contact sheet. **Read** the sheet; pick the event timestamps.
2. For each event (entrance, landing, hold, cut, press, result): `bash $MOTIONMAKER_SKILLS/motionmaker-reference/scripts/around.sh reference.mp4 <seconds> 4 8`. **Read** the strip, then individual frames. Spatial estimates from vision are approximate: verify important positions against the extracted images.
3. Write `REFERENCE.md` from `reference-template.md`. Rules:
   - Label every value **Measured** (from probe/frames), **Visual estimate**, or **Proposed** (your creative choice). Never mix them.
   - Source timestamps always carry the source frame rate and source frame number. Convert to the new composition's fps explicitly (0.5 s = 15 f at 30 fps, 30 f at 60 fps).
   - For an uncertain value, name the frames needed to check it, then extract them.
4. Propose ONE original shot using the user's assets: layout, focal point, entrance, product response, reading hold; list missing assets and questions needing approval. **Return the shot plan before implementing** and wait for approval.
5. Hand off to `motionmaker-brief` (frame-locked BRIEF.md).

Typical findings to extract: entrance direction/duration/scale/opacity change/visible overshoot; order product -> headline -> labels; readable hold; the state carried into the next shot.
