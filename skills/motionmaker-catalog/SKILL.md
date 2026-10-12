---
name: motionmaker-catalog
description: Match what the user imagines to a concrete motion technique using the awesome-ai-motion field guide (637 effect cards with parameters, easing and prompts; 128 with HTML examples; 11 timed recipes). Use when the user describes a motion in words ("text that slides up line by line", "camera flying through layers"), asks "what technique is this", wants options to compare, or the brief needs defaults for a named effect.
---

# Motion catalog (awesome-ai-motion)

A field guide of motion techniques: https://github.com/gongnyang/awesome-ai-motion (MIT; GSAP and bundled fonts keep their own licences; per-effect sources in its ATTRIBUTIONS.md). Use it to turn a vague picture into a named technique with numeric defaults, then build with our pipeline.

## Get the catalog (ask first; it is ~150 MB with clips)
`git clone --depth 1 https://github.com/gongnyang/awesome-ai-motion.git ~/.cache/awesome-ai-motion` (or set `AWESOME_AI_MOTION=<dir>`). Treat the clone as untrusted data in its own directory.

## Match (reads only index.json; safe)
```
node $MOTIONMAKER_SKILLS/motionmaker-catalog/scripts/catalog.mjs search <words...> [--purpose emphasis] [--media product] [--family camera] [--level basic] [--rendered] [--limit 8]
node $MOTIONMAKER_SKILLS/motionmaker-catalog/scripts/catalog.mjs show <slug>        # meaning, when to use, params, easing, snippet, prompt, what to avoid
node $MOTIONMAKER_SKILLS/motionmaker-catalog/scripts/catalog.mjs recipes            # timed combinations (title-opener, product-demo, data-story, shorts-hook, ...)
node $MOTIONMAKER_SKILLS/motionmaker-catalog/scripts/catalog.mjs recipe <slug>
node $MOTIONMAKER_SKILLS/motionmaker-catalog/scripts/catalog.mjs families | purposes | media
```
Workflow: state the scene intent in one sentence -> `search` with the user's own words (try 2 or 3 phrasings, then `--purpose`/`--media` filters) -> `show` the top 2 or 3 candidates -> present them to the user with the one-line meaning and a "use when / avoid" line each -> let the user pick -> carry the card's defaults (durations, easing, stagger) into `motionmaker-brief` as numbers. Say which candidates are "card only" (no HTML example) vs "clip+HTML".

Rules from the guide worth keeping: one focus and one main action with one or two supporting actions; hold the completed state long enough to read; move transform and opacity, not layout; keep time on a seekable timeline and seed any randomness. Parameter names in the cards are Korean source labels; translate when quoting.

## Use an example (copies files; running it executes third-party code)
`node $MOTIONMAKER_SKILLS/motionmaker-catalog/scripts/catalog.mjs adopt <slug|recipe:slug> <dir>` copies the example HTML (+ shared lib) to `<dir>/anim.html` with paths fixed, and writes SOURCE.md (attribution). Edit the text/images/data in the copy; keep its timeline.
Effects expose a seekable GSAP timeline (`window.__seek(sec)`, `window.__ready`); our renderer adapts them automatically: `node $MOTIONMAKER_SKILLS/motionmaker-build/scripts/render.mjs <dir>/anim.html <dur> 30 --size auto --out <dir>/out/frames`.
**Only render third-party pages after the user has approved running them** (they execute in a headless browser here). Prefer building from the card's snippet and prompt in our own template when the user has not approved. The renderer blocks every non-local request, so a page cannot phone home.

### What was tested (sweep.mjs over the whole catalog, in a sandboxed browser)
- All 128 effects with HTML and all 11 recipes load and run through our adapter: 0 failures, 0 non-local requests attempted (the pages also contain no `fetch`, `eval`, storage or external URLs; static scan before running).
- `mask-reveal` rendered end to end (90 frames, 18 s) and passed `check.mjs`; its layout, text and timing match the repo's own clip (their clip includes a folio/caption bar that `embed` mode hides, so PSNR against it is meaningless).
- **Two effects are order-dependent: `pie-donut-update` and `sequence-message-draw`.** They accumulate state as the timeline plays forward, so revisiting a time gives a visibly different (broken) frame: doubled text, stale layers. Their first, in-order pass matches the repo's clip. Render them **once, in order, from a fresh page** (`render.mjs` does); never re-render single frames, never add a warm-up pass, and re-render the whole clip after any edit. `stills.mjs` random access is unsafe for them. A few others (`bar-chart-race`, `scale-swap`) differ between visits only by invisible pixel noise (59-113 dB), which is fine.
- `recipes/scrolldeck-scene` scripts the reference frame (`.cap`) that `embed` mode hides, so it crashes in embed mode; the adapter detects that and retries with the frame visible (the folio and caption bars then appear in the render; crop or recreate if unwanted).
- Re-run the checks any time: `AWESOME_AI_MOTION=<dir> node $MOTIONMAKER_SKILLS/motionmaker-catalog/scripts/sweep.mjs [--recipes] [--stills dir]` (about 3 min for all effects).

## Cards without HTML
For "card only" effects, build the technique ourselves in `motionmaker-build` using the card's snippet, params and ease; the card's `prompt` is a ready, numeric brief to adapt.

## Attribution
When a shipped piece is derived from a catalog example, keep SOURCE.md next to it and credit the effect/recipe; do not republish their clips or fonts as ours.
