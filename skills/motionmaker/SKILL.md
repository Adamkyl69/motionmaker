---
name: motionmaker
description: One command to make a motion graphic end to end. Interviews the user, optionally matches a technique from a catalog or analyzes a reference video, confirms a frame-locked brief, then drives the motionmaker-* skills to produce frames, MP4/GIF, sound and receipts. Use for /motionmaker, or whenever the user asks to animate something, make a loop/GIF/intro/title card/product demo/launch clip/logo reveal/chart/3D product shot/kinetic type.
argument-hint: "[what you want to make]"
---

# /motionmaker: guided motion studio

You are the director. Do not start building until the brief is confirmed. Do not ask the user for things you can default. Anything the user already said in their request (or in `$ARGUMENTS`) is an answered question: skip it.

Claude never outputs pixels: it writes a program where every pixel is a pure function of the frame number, a headless browser renders frames, ffmpeg encodes them. Quality comes from numbers in the brief and a render-look-fix loop.

Skills it drives: `motionmaker-reference` (analyze a reference video), `motionmaker-catalog` (match a named technique), `motionmaker-brief` (frame-locked brief, timeline math), `motionmaker-engines`, `motionmaker-build` (render contract, tokens, renderer), `motionmaker-review` (stills, checks, corrections), `motionmaker-sound-export` (synthesized sound, loudness, sync check, MP4/GIF, probe).

## Phase 0: preflight (silent)
Find the skills folder first: it is the directory that contains this skill's folder (`~/.claude/skills`, `./.claude/skills`, or the plugin's `skills/`). Run `bash <that folder>/motionmaker/scripts/preflight.sh`: its first line prints `MOTIONMAKER_SKILLS=<absolute path>`; **use that path wherever a command below says `$MOTIONMAKER_SKILLS`** (or `export MOTIONMAKER_SKILLS=...`). If node/ffmpeg/playwright are missing, say so once and switch to **authoring-only mode** (write the HTML with a frame counter + space-to-pause; the user screen-records). Never install packages without asking. Templates `three-product` and `gsap-kinetic` need `npm i three@0.160.0 gsap@3.12.5` (ask first).

## Phase 1: intake (AskUserQuestion, max 2 rounds, skip answered items)

Round 1 (one AskUserQuestion call, up to 4 questions):
1. **What are you making?** Title / kinetic type | Product action demo (cursor, press, result: a launch clip) | Logo or wordmark reveal | Data chart | 3D product shot | Other.
2. **Where will it be posted?** X feed 1:1 1080x1080 (recommended) | 16:9 1920x1080 | 4:5 1080x1350 | 9:16 1080x1920. (600x600 for quick drafts.)
3. **Length and loop?** 4 s seamless loop (recommended) | 6 s loop | 20 s clip (opening / product / closing) | One-shot.
4. **Sound?** Picture only (recommended) | Add synthesized sound.

Round 2 (only for what is still unknown; free text goes through "Other" or plain chat):
- **The words / subject**: exact text, product name, what must appear; for a demo: the one action and its result. Ask for the **longest** copy they might reuse.
- **Assets**: real screens, logo, font, audio? (Placeholders are fine for a first pass; list what is missing.)
- **Look**: brand hex colors or "pick for me" (default #FFFFFF / #0F0F0F, accent #D97757; demo default #101318 / #F5F7FA / #8AD8B0); things to avoid.
- **Feel**: playful (springs ~0.5) | premium (0.8, no overshoot on text) | punchy (hard cuts on the beat) | calm.
- **Reference?** If the user has a video they want to emulate, run `motionmaker-reference` (analyze, then propose an ORIGINAL shot). If they describe a motion in words ("text that slides up line by line"), run `motionmaker-catalog` to name 2 or 3 techniques with numeric defaults and let them pick.
Goal comes first: if you cannot say in one sentence what the viewer should feel or do, ask.

## Phase 2: brief (gate)
1. `motionmaker-engines`: choose the engine and template (title-loop, logo-reveal, data-chart, product-demo, three-product, gsap-kinetic, or fresh code). Default plain HTML for 2D; Three.js for 3D.
2. `motionmaker-brief`: fill the numeric brief (for multi-scene work use `BRIEF-template.md`: global inclusive frames, layout box coordinates, margins, layer order, incoming/outgoing state per scene). Convert seconds to frames with `node $MOTIONMAKER_SKILLS/motionmaker-brief/scripts/timeline.mjs timeline.json`; it also checks that each reading hold is long enough.
3. Check the longest copy against the layout limits (width, max lines) before any motion.
4. Show the filled brief compactly and ask via AskUserQuestion: **Build it** | **Change something**. Do not build before a yes. Save it as `motion-out/<slug>/PROMPT.md` (or BRIEF.md).

## Phase 3: build
Use `motionmaker-build`.
- Scaffold: `TEMPLATE=<name> bash $MOTIONMAKER_SKILLS/motionmaker/scripts/scaffold.sh <slug> "<TEXT>" <W> <H> <fps> <secs> <bg> <fg> <accent>` creates `motion-out/<slug>/{anim.html,tokens.js,RECEIPTS.md[,vendor/]}`. Templates are starters, not limits: edit them to match the brief. `product-demo` is fixed at 30 fps / 600 frames with a TIMELINE object to edit.
- Multi-scene or long pieces: build the opening first, review, then the rest (see Phase 4).
- Render stills for review, not the whole clip: `node $MOTIONMAKER_SKILLS/motionmaker-review/scripts/stills.mjs anim.html "0,18,42,119" --size WxH --out out/stills`. Full render when approved: `cd motion-out/<slug> && node $MOTIONMAKER_SKILLS/motionmaker-build/scripts/render.mjs anim.html <secs> <fps> --size WxH` (playwright must resolve from cwd; set `CHROMIUM` if needed). 1080x1080 x 600 frames takes about 80 s on software rendering.

## Phase 4: review loop (2 to 4 rounds, you do this yourself)
`motionmaker-review`: contact sheet or stills -> **Read the images** -> notes with frame numbers (global, and scene-local when relevant) -> fix 1 to 2 things -> re-render only what changed. Corrections use the four-field format in `motionmaker-review/CORRECTIONS.md` (location, observed problem, change, keep fixed). Check text wrapping, margins, product readability, settled positions, and both neighboring scene boundaries after an edit. Run `check.mjs` before export and fix every FAIL. Log each creative follow-up verbatim in `RECEIPTS.md`.
After the first round, show the user the stills path and ask once: **Looks right** | **Needs changes** (translate feelings to frames/numbers). Stop at round 4 and report what is left.

## Phase 5: sound (only if chosen) and export
`motionmaker-sound-export`: write `events.json` with each hit on its **picture event frame** (press, reveal, cut); `synth.mjs` places the audible peak 1 frame later; `loudnorm.sh`; `export.sh out/frames <fps> out/<slug> norm.wav`; then verify the EXPORTED file: `probe.sh` (size, fps, duration, codec, audio) and `verify-sync.mjs out/<slug>.mp4 events.json <fps>` (each hit within tolerance of +1 frame and >= 6 dB over the bed). Clips over 350 frames cannot be X GIFs.

## Phase 6: deliver
Report briefly and honestly:
- files (`.mp4`, `.gif` if within limits, `PROMPT.md`/`BRIEF.md`, `RECEIPTS.md`, the timeline and audio cue list) and how to preview (`anim.html`, `?t=2.5` freezes a frame);
- review rounds and follow-ups;
- what you verified (check.mjs, probe, sync, which stills you looked at) and what you did not (you cannot hear audio; you did not watch playback unless you did).
Never commit, push, publish or sell anything unasked. Keep `out/frames/` out of git. If the user wants to sell clips: agree script, assets, deadline, payment terms, revision scope and usage rights in writing first; check the licence of every tool and library used (Remotion has a company-size rule).

## Rules that hold in every phase
- Replace every adjective with a number; name and ban the default look (glow, bloom, particles, gradients, fade-and-slide everything, centered-everything, dark-navy default, text moving while read).
- One hero move per shot; secondaries 50-70% travel starting 100-200 ms later; ambient under 5%; the main text stays the focal point during a reading hold.
- Frames 0..N-1 only; frame N-1 differs from and flows into frame 0 (loops); scene boundaries carry position/scale/highlight state across.
- No clocks or unseeded randomness inside frame drawing.
- Third-party code (catalog examples, downloaded libraries) executes only with the user's approval; third-party claims (stars, licences) are unverified until checked.
- Prompt + every follow-up are the receipts; count them.
