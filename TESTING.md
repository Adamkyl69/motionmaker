# Try Motionmaker yourself

Everything below was tested in a Linux container. **macOS and Windows are untested**: that is what this guide is for. Please report what breaks.

## 0. Prerequisites
| Need | Check | Get it |
|---|---|---|
| Node.js 20+ | `node -v` | https://nodejs.org (Windows: `winget install OpenJS.NodeJS.LTS`) |
| git | `git --version` | needed by `npx github:`; Windows: `winget install Git.Git` (also gives you Git Bash) |
| ffmpeg + ffprobe | `ffmpeg -version` | Windows: `winget install Gyan.FFmpeg`; macOS: `brew install ffmpeg` |
| Claude Code | `claude --version` | https://claude.com/claude-code |
| bash | `bash --version` | the helper scripts are bash: macOS/Linux have it; on Windows use Git Bash or WSL |

## 1. Install: pick ONE route (not both, or you get duplicate skills)
**A. Plugin**
```
claude plugin marketplace add Adamkyl69/motionmaker
claude plugin install motionmaker@motionmaker
```
**B. npx installer**
```
npx github:Adamkyl69/motionmaker install            # all projects (~/.claude/skills)
npx github:Adamkyl69/motionmaker install --dry-run   # preview only
```
Remove later: A `claude plugin uninstall motionmaker@motionmaker`; B `npx github:Adamkyl69/motionmaker uninstall`.

## 2. Set up a working folder (once)
```
mkdir mm-test
cd mm-test
npx github:Adamkyl69/motionmaker setup --3d --browser
npx github:Adamkyl69/motionmaker doctor
```
`setup` runs `npm install playwright three gsap` here and downloads Playwright's Chromium (~150 MB). `doctor` should print OK for node, ffmpeg, ffprobe, chromium, playwright.

## 3. Run it
Start `claude` inside `mm-test` and type `/motionmaker` (if the command does not autocomplete, try `/motionmaker:motionmaker`, or just say "make a 4 second title loop that says Hello": it should trigger from the description).

Checklist, in this order:
0. **Art direction (new)**: when `/motionmaker` onboards you it should ask creative-brief questions (objective, audience, one message, tone, brand, references), then show a `directions.png` with **three directions (A/B/C) of your own headline** and ask you to pick. Check: does the picture open for you (path is printed), do the three differ, is your headline fully visible and inside the frame, does it write `AD-BRIEF.md`, and do the review rounds quote frame numbers with critique notes. Samples: `examples/art-director-*.png`.
0b. **Illustration and animation (new)**: say "a 6 second title with a character: Open Peeps style" (or give a LottieFiles `.json` / Rive `.riv` you downloaded). Expect: onboarding asks which source; `kit.mjs setup` runs only after you agree (about 60 MB); the asset is inspected (BLOCK/WARN in plain words); it is recoloured to the look (skin tones untouched); the scene uses `illustration-scene`, `lottie-scene` or `rive-scene`; `ledger.mjs check` PASSES before export and any required credit (Rive community = CC BY) is handed to you. To try the guard rails: put a `<script>` in an SVG and confirm the build stops with BLOCK.
0c. **Libraries (new)**: `npx github:Adamkyl69/motionmaker setup --libs all` (about 125 MB into `~/.cache/motionmaker/kits`), then from your working folder `bash ~/.claude/skills/motionmaker-libs/scripts/smoke.sh` (or `.claude/skills/...` for a project install). Expect every template PASS (Lottie/Rive SKIP unless you pass `LOTTIE=` / `RIVE=` files; `three`/`gsap` SKIP unless `setup --3d`). Then try in Claude: "a code reveal of this file", "a globe from Istanbul to Berlin", "circle the word simple", "three feature icons", "this screen recording with a zoom on the export button". Check that type in every look is the look's own font (`fonts/FONTS.md` in each project) and that Turkish characters render in it.
1. **Title loop**: "a 4 second square title loop that says Hello". Expect: a few multiple-choice questions, a brief you must approve, review stills, then `motion-out/<name>/out/*.mp4` and `.gif`.
2. **Reference-free product demo**: "20 second launch clip: a cursor presses Export and a report.md file appears". Expect the 600-frame product-demo template, ~1-2 min render.
3. **Sound**: ask for sound on #1. Expect a sync report (each hit ~+1 frame) and a loudness line.
4. **Catalog**: "text that slides up line by line". Expect 2-3 named techniques. It will ask before cloning the 150 MB catalog and before running its examples.
5. **Correction**: reply with "at frame 30 the text is too low, move it up 24 px" and check it edits only that.

## 4. If something breaks, send me
- the output of `npx github:Adamkyl69/motionmaker doctor`
- your OS and `node -v`
- the exact error text and which step of the checklist
- the files in `motion-out/<name>/` if the output looked wrong (`anim.html`, `out/contact.png`)

## Known gaps
Art-director critique tools measure craft (contrast, margins, hierarchy), not taste; the three directions share one layout (the title template) and use system fonts, so they look different on machines with different fonts installed; 
Windows/macOS untested; Remotion and HyperFrames untested; sparse sound mixes can't reach -14 LUFS (the tool says so); the `/plugin` command may be namespaced; no licence file yet.
