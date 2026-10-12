# Motionmaker

Frame-exact motion graphics with Claude Code: one `/motionmaker` command that interviews you, confirms a frame-locked brief, renders, reviews, adds synthesized sound and exports MP4/GIF.

## Motionmaker: install

Pick one. All three give you the same eleven skills; then start Claude Code and type **`/motionmaker`**.

**A. Claude Code plugin (one step, auto-updatable)**
```
/plugin install motionmaker --marketplace Adamkyl69/motionmaker
```
(or in a terminal: `claude plugin marketplace add Adamkyl69/motionmaker` then `claude plugin install motionmaker@motionmaker`). Needs a Claude Code version with plugin support; the manifests pass `claude plugin validate --strict`.

**B. CLI installer (copies the skills into `~/.claude/skills` or your project)**
```
npx github:Adamkyl69/motionmaker install            # global: ~/.claude/skills (or $CLAUDE_CONFIG_DIR/skills)
npx github:Adamkyl69/motionmaker install --project  # this project only: ./.claude/skills
npx github:Adamkyl69/motionmaker install --dry-run  # show what would happen, change nothing
```
Other commands: `update`, `uninstall`, `list`, `doctor` (checks node, ffmpeg, Chromium, Playwright; never installs), and `setup [dir] [--3d] [--browser]` (npm-installs Playwright into your working folder, plus `three` and `gsap` with `--3d`, and downloads Playwright's Chromium with `--browser`). It only ever touches the skill folders it ships; a folder it did not install, or one you edited, is skipped unless you pass `--force`, and then the old one is kept as `<name>.bak-<timestamp>`. `uninstall` removes only what it installed. (From a clone: `node bin/cli.mjs install`.)

**C. Manual:** copy the folders in `skills/` into `~/.claude/skills/` (keep them together; they call each other's scripts).

**Want to test it on your machine? See [TESTING.md](TESTING.md).**

**Then, once per working folder:** `npx github:Adamkyl69/motionmaker setup --3d --browser` (or `npm i playwright` yourself; `three@0.160.0 gsap@3.12.5` only for the 3D and GSAP templates), and make sure `ffmpeg` is on your PATH. `/motionmaker` runs a preflight and tells you what is missing; it never installs anything on its own.

## Motion skill set (`skills/`)
Make frame-exact motion graphics with Claude. The method is distilled from public write-ups listed under Credits.

**Start with `/motionmaker`.** One command that checks your toolchain, interviews you (what, where it is posted, length/loop, sound, words, look, feel), shows a brief for your OK, then builds, reviews (render-look-fix, `check.mjs`), exports MP4/GIF and writes `PROMPT.md` + `RECEIPTS.md` to `motion-out/<slug>/`. It runs a small creative team: you talk to one command, and an **art director** (`motionmaker-art-director`) asks the creative-brief questions, shows three directions on real pixels, locks a visual system and critiques every round. It drives the eight skills below.

| Skill | Stage | Ships |
|---|---|---|
| `motion` | **the command**: preflight, guided intake, brief gate, build, review, sound, export, deliver | `scripts/preflight.sh`, `scripts/scaffold.sh`, 15 templates: `title-loop`, `logo-reveal`, `data-chart`, `product-demo` (20 s launch clip), `three-product` (Three.js), `gsap-kinetic` (seeked GSAP timeline), `lottie-scene`, `rive-scene`, `illustration-scene`, `footage-scene`, `code-reveal`, `equation-scene`, `map-scene`, `annotate-scene`, `icon-features` |
| `motionmaker-art-director` | **art direction**: creative-brief questions in onboarding, 3 directions as real style frames to choose from, visual system + motion language (AD-BRIEF.md), per-round critique, poster-frame sign-off | `looks/looks.json` (8 looks), `scripts/directions.mjs`, `critique.mjs` (contrast, margins, negative space, focal point, competing elements), `palette.mjs`, `type-scale.mjs`, `looktests.sh` (grayscale / squint / thumbnail), `craft/principles.md`, `craft/critique-checklist.md`, `AD-BRIEF-template.md` |
| `motionmaker-libs` | **optional libraries, installed on request**: a real open-licence font per look (identical type on every machine, Turkish/accented/Cyrillic included), code reveals (Shiki), equations (KaTeX), globe routes (d3-geo + Natural Earth), hand-drawn marks (Rough.js, fixed seed), four icon sets (Lucide, Tabler, Phosphor, Material Symbols) | `lib.mjs` (list, setup), `fonts.mjs`, `code.mjs`, `math.mjs`, `icons.mjs`, `smoke.sh` (builds and checks every template), `libs.json` |
| `motionmaker-assets` | **illustration kits and ready-made animation**: Open Peeps and Humaaans characters built locally (CC0), LottieFiles, Rive, unDraw; inspected as untrusted input, recoloured to the brand (skin tones protected), rendered frame-exact, tracked in a licence ledger with required credits | `kit.mjs` (setup, list, peep, human), `footage.mjs` (frame-exact screen recordings), `inspect-asset.mjs`, `recolor.mjs`, `ledger.mjs` (add, check, credits, report), `licenses.json`, `craft/illustration.md` |
| `motionmaker-reference` | analyze a reference video: probe, 2/s overview, frames around events, REFERENCE.md (measured / estimated / proposed) | `analyze-reference.sh`, `around.sh`, `reference-template.md` |
| `motionmaker-catalog` | match a described motion to a named technique (awesome-ai-motion: 637 cards, 11 recipes) and run its examples through our pipeline | `catalog.mjs` (search, show, recipes, adopt), `sweep.mjs` (catalog-wide health check) |
| `motionmaker-brief` | directed prompt + frame-locked BRIEF.md, feelings -> numbers, ban list | `timeline.mjs` (seconds <-> frames, global <-> scene-local, reading-hold check), `BRIEF-template.md` |
| `motionmaker-engines` | pick the engine/repo (Three.js, drei, Remotion, HyperFrames, GSAP, Motion, Fabric, Rive, deck.gl, cobe, confetti, twgl, ffmpeg.wasm) | |
| `motionmaker-build` | render contract, deterministic program, frame renderer | `render.mjs` (HTTP-served, software WebGL2, optional motion blur, `--size auto`), `browser.mjs`, `tokens.js`, `numbers.md` |
| `motionmaker-review` | render-look-fix loop, four-field corrections, fixes table | `stills.mjs` (specific frames/ranges), `contact-sheet.sh`, `check.mjs` (clock/random scan, determinism, seam duplicate, page errors), `CORRECTIONS.md` |
| `motionmaker-sound-export` | synthesized frame-synced sound (Web Audio), loudness, sync verification, X export, export probe | `synth.mjs`, `loudnorm.sh`, `verify-sync.mjs`, `export.sh`, `probe.sh` |

What was tested end to end here: all 15 templates render and pass `check.mjs` (`motionmaker-libs/scripts/smoke.sh` re-runs them); a 600-frame 1080x1080 launch clip with synthesized sound exports to an MP4 that `probe.sh` and `verify-sync.mjs` pass (hits within 0.05 frame of the target, loudness about -15 LUFS at -1.0 dBTP, AAC round trip included). The awesome-ai-motion catalog was swept with your approval in a sandboxed browser (non-local requests blocked): all 128 effects and 11 recipes run through our renderer with 0 failures; 2 effects (`pie-donut-update`, `sequence-message-draw`) are order-dependent and must be rendered once, in order (details in `motionmaker-catalog/SKILL.md`).
Asset scenes: Lottie loops and Rive loops were checked to wrap exactly (frame f equals frame f plus one cycle) and to differ within a cycle; the inspector blocked a hostile SVG (script, handlers, external URL) and a Lottie with remote images; the ledger fails on unrecorded files, unknown licences and missing CC BY credits. Libraries: footage extraction was checked exact to the frame (a video encoding its own frame number); bundled fonts were checked on all 8 looks and with Turkish text; every library template renders identically when frames are drawn out of order. Not tested: other Lottie/Rive files than the two used, state machines (not supported), Windows/macOS.
Optional libraries: `npx github:Adamkyl69/motionmaker setup --libs fonts code math maps sketch icons` (or later, `node <skills>/motionmaker-libs/scripts/lib.mjs setup <group>`).
Setup: `npm i playwright` in the working directory (plus `three@0.160.0 gsap@3.12.5` for those two templates), ffmpeg on PATH, `CHROMIUM=<path>` if Chromium is not at `/opt/pw-browsers/chromium`.

Worked examples: `demo/` (Launch day loop).

## Credits and inspiration
Linked, not copied; all rights stay with their authors. Their ideas shaped these skills; the code here is original unless stated.
- Florence (@flxrnc), "Opus 5.5 Motion Lab: Make Claude Animate Like a Studio": https://x.com/flxrnc/status/2105311836190978392 (directed prompts with numbers, render contract, review loop, export for X)
- beamnxw, "Motion Engineering with Opus 5.5: Build Launch Videos You Can Sell": https://x.com/beamnxw/status/2108616740846420354 (reference analysis, frame-locked brief, product-action shot, four-field corrections, export checks)
- donald (@donaldjewkes), the one-prompt music-video thread: https://x.com/donaldjewkes/status/2102801274173587569 (how much direction hides behind "one prompt")
- gongnyang/awesome-ai-motion (MIT; GSAP and bundled fonts keep their own licences): https://github.com/gongnyang/awesome-ai-motion, used by `motionmaker-catalog`; not bundled, cloned on demand.
- Pablo Stanley, Open Peeps, Humaaans, Open Doodles (CC0): https://www.openpeeps.com/ , https://www.humaaans.com/ , https://www.opendoodles.com/ ; wrapper packages `react-peeps` (Emre Cakir, MIT) and `humaaans` (jktzes, MIT), installed on request by `kit.mjs setup`, not bundled. LottieFiles public animations (LottieFiles Simple License), Rive community files (CC BY: credit required), unDraw (unDraw licence), `lottie-web` and `@rive-app/canvas` (MIT). Licence summaries in `skills/motionmaker-assets/licenses.json` were checked 2026-10-12 against each source; they are not legal advice.
- Installed on request by `motionmaker-libs` (not bundled): Fontsource fonts (OFL-1.1: Fraunces, Inter, Cormorant Garamond, Archivo Black, Fredoka, JetBrains Mono, Playfair Display, DM Serif Display), Shiki (MIT), KaTeX (MIT), d3 / topojson-client / world-atlas (ISC; Natural Earth data, public domain), Rough.js (MIT), Lucide (ISC), Tabler Icons (MIT), Phosphor (MIT), Material Symbols (Apache-2.0). Licences read from npm on 2026-10-12.
- Libraries named in `motionmaker-engines` (Three.js, GSAP, Remotion, HyperFrames, Motion, Fabric.js, Rive, deck.gl, cobe, canvas-confetti, twgl.js, ffmpeg.wasm): check each one's licence before you depend on it. Remotion has a company-size licence rule.

## Status
Version 0.1.0. See "What was tested" above for what is verified and what is not. No licence file has been added yet.
