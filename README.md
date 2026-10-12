# my-good-resources

## Motionmaker: install

Pick one. All three give you the same eight skills; then start Claude Code and type **`/motionmaker`**.

**A. Claude Code plugin (one step, auto-updatable)**
```
/plugin install motionmaker --marketplace ErdemKlyc/motionmaker
```
(or in a terminal: `claude plugin marketplace add ErdemKlyc/motionmaker` then `claude plugin install motionmaker@my-good-resources`). Needs a Claude Code version with plugin support; the manifests pass `claude plugin validate --strict`.

**B. CLI installer (copies the skills into `~/.claude/skills` or your project)**
```
npx github:ErdemKlyc/motionmaker install            # global: ~/.claude/skills (or $CLAUDE_CONFIG_DIR/skills)
npx github:ErdemKlyc/motionmaker install --project  # this project only: ./.claude/skills
npx github:ErdemKlyc/motionmaker install --dry-run  # show what would happen, change nothing
```
Other commands: `update`, `uninstall`, `list`, `doctor` (checks node, ffmpeg, Chromium, Playwright; never installs), and `setup [dir] [--3d] [--browser]` (npm-installs Playwright into your working folder, plus `three` and `gsap` with `--3d`, and downloads Playwright's Chromium with `--browser`). It only ever touches the skill folders it ships; a folder it did not install, or one you edited, is skipped unless you pass `--force`, and then the old one is kept as `<name>.bak-<timestamp>`. `uninstall` removes only what it installed. (From a clone: `node bin/cli.mjs install`.)

**C. Manual:** copy the folders in `skills/` into `~/.claude/skills/` (keep them together; they call each other's scripts).

**Then, once per working folder:** `npx github:ErdemKlyc/motionmaker setup --3d --browser` (or `npm i playwright` yourself; `three@0.160.0 gsap@3.12.5` only for the 3D and GSAP templates), and make sure `ffmpeg` is on your PATH. `/motionmaker` runs a preflight and tells you what is missing; it never installs anything on its own.

## Motion skill set (`skills/`)
Make frame-exact motion graphics with Claude. The method is distilled from public write-ups listed under Credits.

**Start with `/motionmaker`.** One command that checks your toolchain, interviews you (what, where it is posted, length/loop, sound, words, look, feel), shows a brief for your OK, then builds, reviews (render-look-fix, `check.mjs`), exports MP4/GIF and writes `PROMPT.md` + `RECEIPTS.md` to `motion-out/<slug>/`. It drives the seven skills below.

| Skill | Stage | Ships |
|---|---|---|
| `motion` | **the command**: preflight, guided intake, brief gate, build, review, sound, export, deliver | `scripts/preflight.sh`, `scripts/scaffold.sh`, 6 templates: `title-loop`, `logo-reveal`, `data-chart`, `product-demo` (20 s launch clip), `three-product` (Three.js), `gsap-kinetic` (seeked GSAP timeline) |
| `motionmaker-reference` | analyze a reference video: probe, 2/s overview, frames around events, REFERENCE.md (measured / estimated / proposed) | `analyze-reference.sh`, `around.sh`, `reference-template.md` |
| `motionmaker-catalog` | match a described motion to a named technique (awesome-ai-motion: 637 cards, 11 recipes) and run its examples through our pipeline | `catalog.mjs` (search, show, recipes, adopt), `sweep.mjs` (catalog-wide health check) |
| `motionmaker-brief` | directed prompt + frame-locked BRIEF.md, feelings -> numbers, ban list | `timeline.mjs` (seconds <-> frames, global <-> scene-local, reading-hold check), `BRIEF-template.md` |
| `motionmaker-engines` | pick the engine/repo (Three.js, drei, Remotion, HyperFrames, GSAP, Motion, Fabric, Rive, deck.gl, cobe, confetti, twgl, ffmpeg.wasm) | |
| `motionmaker-build` | render contract, deterministic program, frame renderer | `render.mjs` (HTTP-served, software WebGL2, optional motion blur, `--size auto`), `browser.mjs`, `tokens.js`, `numbers.md` |
| `motionmaker-review` | render-look-fix loop, four-field corrections, fixes table | `stills.mjs` (specific frames/ranges), `contact-sheet.sh`, `check.mjs` (clock/random scan, determinism, seam duplicate, page errors), `CORRECTIONS.md` |
| `motionmaker-sound-export` | synthesized frame-synced sound (Web Audio), loudness, sync verification, X export, export probe | `synth.mjs`, `loudnorm.sh`, `verify-sync.mjs`, `export.sh`, `probe.sh` |

What was tested end to end here: all six templates render and pass `check.mjs`; a 600-frame 1080x1080 launch clip with synthesized sound exports to an MP4 that `probe.sh` and `verify-sync.mjs` pass (hits within 0.05 frame of the target, loudness about -15 LUFS at -1.0 dBTP, AAC round trip included). The awesome-ai-motion catalog was swept with your approval in a sandboxed browser (non-local requests blocked): all 128 effects and 11 recipes run through our renderer with 0 failures; 2 effects (`pie-donut-update`, `sequence-message-draw`) are order-dependent and must be rendered once, in order (details in `motionmaker-catalog/SKILL.md`).
Setup: `npm i playwright` in the working directory (plus `three@0.160.0 gsap@3.12.5` for those two templates), ffmpeg on PATH, `CHROMIUM=<path>` if Chromium is not at `/opt/pw-browsers/chromium`.

Worked examples: `demo/` (Launch day loop).

## Credits and inspiration
Linked, not copied; all rights stay with their authors. Their ideas shaped these skills; the code here is original unless stated.
- Florence (@flxrnc), "Opus 5.5 Motion Lab: Make Claude Animate Like a Studio": https://x.com/flxrnc/status/2105311836190978392 (directed prompts with numbers, render contract, review loop, export for X)
- beamnxw, "Motion Engineering with Opus 5.5: Build Launch Videos You Can Sell": https://x.com/beamnxw/status/2108616740846420354 (reference analysis, frame-locked brief, product-action shot, four-field corrections, export checks)
- donald (@donaldjewkes), the one-prompt music-video thread: https://x.com/donaldjewkes/status/2102801274173587569 (how much direction hides behind "one prompt")
- gongnyang/awesome-ai-motion (MIT; GSAP and bundled fonts keep their own licences): https://github.com/gongnyang/awesome-ai-motion, used by `motionmaker-catalog`; not bundled, cloned on demand.
- Libraries named in `motionmaker-engines` (Three.js, GSAP, Remotion, HyperFrames, Motion, Fabric.js, Rive, deck.gl, cobe, canvas-confetti, twgl.js, ffmpeg.wasm): check each one's licence before you depend on it. Remotion has a company-size licence rule.

## Status
Version 0.1.0. See "What was tested" above for what is verified and what is not. No licence file has been added yet.
