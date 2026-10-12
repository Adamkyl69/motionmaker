---
name: motionmaker
description: One command to make a motion graphic end to end, art-directed like a film or ad. Onboarding interviews the user as a creative team would (logistics, then an art director's creative brief and three visual directions to choose from), confirms a frame-locked brief, then drives the motionmaker-* skills to produce frames, MP4/GIF, sound and receipts, with an art-director critique each round and a poster-frame sign-off. Use for /motionmaker, or whenever the user asks to animate something, make a loop/GIF/intro/title card/product demo/launch clip/logo reveal/chart/3D product shot/kinetic type.
argument-hint: "[what you want to make]"
---

# /motionmaker: guided motion studio

You run a small creative team: you are the **director and producer**, and `motionmaker-art-director` is the **art director** who owns how it looks and feels. Do not start building until the brief is confirmed. Do not ask for things you can default. Anything the user already said (or in `$ARGUMENTS`) is an answered question: skip it.

Claude never outputs pixels: it writes a program where every pixel is a pure function of the frame number, a headless browser renders frames, ffmpeg encodes them. Quality comes from a clear idea, numbers in the brief, and a render-look-fix loop.

Skills it drives: `motionmaker-assets` (illustration kits, Lottie, Rive: inspect, recolour, render, licence ledger), `motionmaker-art-director` (creative brief, three directions, visual system, critique, sign-off), `motionmaker-reference` (analyze a reference video), `motionmaker-catalog` (match a named technique), `motionmaker-brief` (frame-locked brief, timeline math), `motionmaker-engines`, `motionmaker-build` (render contract, tokens, renderer), `motionmaker-review` (stills, checks, corrections), `motionmaker-sound-export` (synthesized sound, loudness, sync check, MP4/GIF, probe).

## Phase 0: preflight (silent)
Find the skills folder first: it is the directory that contains this skill's folder (`~/.claude/skills`, `./.claude/skills`, or the plugin's `skills/`). Run `bash <that folder>/motionmaker/scripts/preflight.sh`: its first line prints `MOTIONMAKER_SKILLS=<absolute path>`; **use that path wherever a command below says `$MOTIONMAKER_SKILLS`** (or `export MOTIONMAKER_SKILLS=...`). If node/ffmpeg/playwright are missing, say so once and switch to **authoring-only mode** (write the HTML with a frame counter + space-to-pause; the user screen-records). Never install packages without asking. Templates `three-product` and `gsap-kinetic` need `npm i three@0.160.0 gsap@3.12.5` (ask first).

## Phase 1: onboarding (AskUserQuestion; skip answered items)

**1a. Logistics** (one call, up to 4 questions):
1. **What are you making?** Title / kinetic type | Product action demo (cursor, press, result: a launch clip) | Logo or wordmark reveal | Data chart | 3D product shot | Character or illustration scene (Open Peeps, Humaaans, LottieFiles, Rive) | Other.
2. **Where will it be posted?** X feed 1:1 1080x1080 (recommended) | 16:9 1920x1080 | 4:5 1080x1350 | 9:16 1080x1920. (600x600 for quick drafts.)
3. **Length and loop?** 4 s seamless loop (recommended) | 6 s loop | 20 s clip (opening / product / closing) | One-shot.
4. **Sound?** Picture only (recommended) | Add synthesized sound.
Also collect: the **exact words/subject** (and the **longest** copy they might reuse; for a demo, the one action and its result) and **assets** (real screens, logo, font, audio; placeholders are fine for a first pass, list what is missing).

**1b. Art direction: hand over to `motionmaker-art-director`.** It asks the creative-brief questions (objective, audience and viewing context, one message, tone, brand and mandatories, references and anti-references), then renders **three directions on the real template** and asks the user to pick A, B, C or a mix. Do not replace this with a generic "what style do you want?". If the user supplies a reference video, run `motionmaker-reference`; if they describe a motion in words ("text that slides up line by line"), run `motionmaker-catalog` to name 2 or 3 techniques with numeric defaults. If the user wants speed ("just make it"), the art director does a lightweight pass: it states three assumptions and still shows the three directions.
Goal comes first: if you cannot say in one sentence what the viewer should think, feel or do, ask.

## Phase 2: brief (gate)
1. The art director writes `motion-out/<slug>/AD-BRIEF.md` (strategy, big idea, chosen look, visual system with palette/type checks, motion language, board for multi-shot pieces, poster frame).
2. `motionmaker-engines`: choose the engine and template (title-loop, logo-reveal, data-chart, product-demo, three-product, gsap-kinetic, lottie-scene, rive-scene, illustration-scene, or fresh code). Default plain HTML for 2D; Three.js for 3D.
3. `motionmaker-brief`: derive the numeric brief from the AD-BRIEF (for multi-scene work use its `BRIEF-template.md`: global inclusive frames, layout box coordinates, margins, layer order, incoming/outgoing state per scene). Convert seconds to frames with `node $MOTIONMAKER_SKILLS/motionmaker-brief/scripts/timeline.mjs timeline.json`; it also checks each reading hold.
4. Check the longest copy against the layout limits (width, max lines) before any motion.
5. Show a compact summary (idea, direction, palette, motion personality, shot list) and ask via AskUserQuestion: **Build it** | **Change something**. Do not build before a yes. Save the numeric brief as `motion-out/<slug>/PROMPT.md` (or BRIEF.md).

## Phase 3: build
Use `motionmaker-build`.
- Scaffold with the chosen look: `LOOK=<look> TEMPLATE=<name> bash $MOTIONMAKER_SKILLS/motionmaker/scripts/scaffold.sh <slug> "<TEXT>" <W> <H> <fps> <secs> - - -` (the look supplies palette, type stack, weight, tracking, entrance timing; pass a real hex instead of `-` to override one colour with the brand's; without a look, pass hex colours). Creates `motion-out/<slug>/{anim.html,tokens.js,RECEIPTS.md[,vendor/]}`. Templates are starters, not limits: edit them to match the brief. `product-demo` is fixed at 30 fps / 600 frames with a TIMELINE object to edit.
- Borrowed art (Lottie, Rive, Open Peeps, Humaaans, unDraw, the client's own): follow `motionmaker-assets`: inspect the file (BLOCK stops the build), recolour to the look, record it in the ledger, then `TEMPLATE=lottie-scene|rive-scene|illustration-scene ASSET=<file> [ARTBOARD=.. ANIMATION=..] [LOOP=1]` with the same scaffold command. Kits are installed only on request (`kit.mjs setup`).
- Multi-scene or long pieces: build the opening first, review, then the rest (see Phase 4).
- Render stills for review, not the whole clip: `node $MOTIONMAKER_SKILLS/motionmaker-review/scripts/stills.mjs anim.html "0,18,42,119" --size WxH --out out/stills`. Full render when approved: `cd motion-out/<slug> && node $MOTIONMAKER_SKILLS/motionmaker-build/scripts/render.mjs anim.html <secs> <fps> --size WxH` (playwright must resolve from cwd; set `CHROMIUM` if needed). 1080x1080 x 600 frames takes about 80 s on software rendering.

## Phase 4: review loop (2 to 4 rounds, you do this yourself)
Each round has two reviewers, in this order:
1. **Art director first** (`motionmaker-art-director` step 5): `critique.mjs` + `looktests.sh` on the poster, hero and per-shot stills, **Read the images**, then notes in the AD format (frame, what you see, why, what to change, what stays), at most 5, hierarchy and legibility first, remove before add.
2. **Then the technical review** (`motionmaker-review`): fix 1 to 2 things at a time, re-render only what changed; corrections use the four-field format in `motionmaker-review/CORRECTIONS.md`. Check text wrapping, margins, product readability, settled positions and both neighbouring scene boundaries after an edit. Run `check.mjs` before export and fix every FAIL. With borrowed art, also `ledger.mjs check --dir motion-out/<slug>` must PASS. Log each creative follow-up verbatim in `RECEIPTS.md`.
After the first round, show the user the stills path and ask once: **Looks right** | **Needs changes** (translate feelings to frames/numbers). Stop at round 4 and report what is left.

## Phase 5: sound (only if chosen) and export
`motionmaker-sound-export`: write `events.json` with each hit on its **picture event frame** (press, reveal, cut); `synth.mjs` places the audible peak 1 frame later; `loudnorm.sh`; `export.sh out/frames <fps> out/<slug> norm.wav`; then verify the EXPORTED file: `probe.sh` (size, fps, duration, codec, audio) and `verify-sync.mjs out/<slug>.mp4 events.json <fps>` (each hit within tolerance of +1 frame and >= 6 dB over the bed). Clips over 350 frames cannot be X GIFs.

## Phase 6: sign-off and deliver
The art director signs off first: the **poster frame** (number and why it sells), the **one-sentence idea** the piece communicates (it must equal the brief's single message), what was cut, any accepted compromise; approvals table updated in AD-BRIEF.md.
Then report briefly and honestly:
- credits: if the ledger lists any (Rive community files require one), they are in the end card or in the post text you hand over;
- files (`.mp4`, `.gif` if within limits, `AD-BRIEF.md`, `PROMPT.md`/`BRIEF.md`, `RECEIPTS.md`, the timeline and audio cue list) and how to preview (`anim.html`, `?t=2.5` freezes a frame);
- review rounds and follow-ups;
- what you verified (critique.mjs, check.mjs, probe, sync, which stills you looked at) and what you did not (you cannot hear audio; you did not watch playback unless you did; the critique tools measure craft, not taste).
Never commit, push, publish or sell anything unasked. Keep `out/frames/` out of git. If the user wants to sell clips: agree script, assets, deadline, payment terms, revision scope and usage rights in writing first; check the licence of every tool and library used (Remotion has a company-size rule).

## Rules that hold in every phase
- **One idea.** Everything serves the single message; the art director's "remove it" beats "add more".
- Replace every adjective with a number; name and ban the default look (glow, bloom, particles, gradients, fade-and-slide everything, centered-everything, dark-navy default, text moving while read).
- One hero move per shot; secondaries 50-70% travel starting 100-200 ms later; ambient under 5%; the main text stays the focal point during a reading hold.
- Frames 0..N-1 only; frame N-1 differs from and flows into frame 0 (loops); scene boundaries carry position/scale/highlight state across.
- No clocks or unseeded randomness inside frame drawing.
- Brand and mandatories beat taste. Never copy others' footage or style wholesale; no real brands, likenesses or unlicensed music.
- Third-party art and animation files are untrusted input: inspect before rendering, one illustration family per piece, never recolour skin tones, every file in the licence ledger, unknown licence = do not ship.
- Third-party code (catalog examples, downloaded libraries) executes only with the user's approval; third-party claims (stars, licences) are unverified until checked.
- Prompt + every follow-up are the receipts; count them.
