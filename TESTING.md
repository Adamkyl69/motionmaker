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

Checklist, in this order (the basics first, then the larger features):
1. **Title loop (Quick)**: "a 4 second square title loop that says Hello". Expect: it offers Quick mode for a short request, replays what it understood (a short brief-back) for your OK, shows a numbered mood board of your word in every look, then review stills and `motion-out/<name>/out/*.mp4` and `.gif`.
2. **Reference-free product demo**: "20 second launch clip: a cursor presses Export and a report.md file appears". Expect the 600-frame product-demo template, ~1-2 min render.
3. **Sound**: ask for sound on #1. Expect a sync report (each hit ~+1 frame) and a loudness line.
4. **Catalog**: "text that slides up line by line". Expect 2-3 named techniques. It will ask before cloning the 150 MB catalog and before running its examples.
5. **Correction**: reply with "at frame 30 the text is too low, move it up 24 px" and check it edits only that.
6. **Pre-production (Guided)**: "a 15 second video for kids about the planets" (or your own idea). Expect, in order: how involved you want to be; "describe what you picture" in your own words; a few follow-up questions only for what you did not say; a `BRIEF-BACK.md` with every assumption on its own line; a "what is in the picture" board, a numbered mood board and a round-2 board (open the PNG paths it prints; on Windows paste them into Explorer or a browser); a 2x2 motion-feel video (`feel.mp4`) to pick from; the script table; a storyboard with a real frame of every scene; an animatic video. Check: are the questions few and sensible, do the pictures open, is your text readable and inside every tile, does a change you ask for ("scene 2: more planets") come back changed, and does `node ~/.claude/skills/motionmaker-preprod/scripts/preprod.mjs board motion-out/<name>` give one page with everything and your own words. Then ask it to build before approving the storyboard: it must refuse (`preprod.mjs check ... build` says NOT READY). Samples: `examples/preprod-*.png`.
7. **Illustration and animation**: say "a 6 second title with a character: Open Peeps style" (or give a LottieFiles `.json` / Rive `.riv` you downloaded). Expect: onboarding asks which source; `kit.mjs setup` runs only after you agree (about 60 MB); the asset is inspected (BLOCK/WARN in plain words); it is recoloured to the look (skin tones untouched); the scene uses `illustration-scene`, `lottie-scene` or `rive-scene`; `ledger.mjs check` PASSES before export and any required credit (Rive community = CC BY) is handed to you. To try the guard rails: put a `<script>` in an SVG and confirm the build stops with BLOCK.
8. **Libraries**: `npx github:Adamkyl69/motionmaker setup --libs all` (about 125 MB into `~/.cache/motionmaker/kits`), then from your working folder `bash ~/.claude/skills/motionmaker-libs/scripts/smoke.sh` (or `.claude/skills/...` for a project install). Expect every template PASS (Lottie/Rive SKIP unless you pass `LOTTIE=` / `RIVE=` files; `three`/`gsap` SKIP unless `setup --3d`). Then try in Claude: "a code reveal of this file", "a globe from Istanbul to Berlin", "circle the word simple", "three feature icons", "this screen recording with a zoom on the export button". Check that type in every look is the look's own font (`fonts/FONTS.md` in each project) and that Turkish characters render in it.
9. **Quality gates and styles**: after any render, `node ~/.claude/skills/motionmaker-review/scripts/film-gate.mjs <film.mp4>`; then ask Claude for an independent review (it runs review-pack.mjs and a fresh subagent) and to deliver (deliver.mjs refuses without a review of that exact film). Try "a Bauhaus-style poster animation that says Less but better" and "show me three art styles for a summer travel teaser": you should get a 3-up style sheet with star ratings. For music: "add a 120 BPM music bed". For footage work: "a 30 second documentary about Istanbul from archive footage": Claude should route it to OpenMontage, explain install/licence/cost/data first, and write OPENMONTAGE-HANDOFF.md (you run OpenMontage yourself).
10. **Anatomy**: `npx skills add wheresryan22/anatomy -g -a claude-code` (or `node ~/.claude/skills/motionmaker-anatomy/scripts/anatomy.mjs install`), start a new session, then ask: "explain how a token bucket rate limiter works as a 10 second video". Expect: the route to Anatomy with its time estimate, `/anatomy` building the figure, then `anatomy.mjs film ... --check` printing PASS, an MP4 and the usual gates. Quick test without building: `anatomy.mjs film <anatomy>/examples/dial-indicator/dial-indicator-light.html --secs 6 --fps 30 --frame 1080x1080 --check`.
11. **Code export (websites, React)**: after #1, ask "I want this on my website, as code". Expect `motion-out/<name>/web/` with a deploy folder, `motion-player.ts`, `Motion.tsx`, `demo.html` and a README, and a `--check` that PASSES. Then in `web/`: `npx serve .` and open the printed address + `/demo.html` in Chrome, Edge and (if you have it) Firefox: the piece plays, Pause and the slider work, and with Windows "Animation effects" turned off (Settings > Accessibility > Visual effects) it shows a still frame. In a React app (`npm create vite@latest`), copy `motion-player.ts` + `Motion.tsx` into `src/`, the deploy folder into `public/motions/`, and render `<Motion src="/motions/<name>/" />`. Anatomy figures: `node ~/.claude/skills/motionmaker-anatomy/scripts/anatomy.mjs web <figure.html> --check`, then hover the figure in `demo.html`.

## 4. If something breaks, send me
- the output of `npx github:Adamkyl69/motionmaker doctor`
- your OS and `node -v`
- the exact error text and which step of the checklist
- the files in `motion-out/<name>/` if the output looked wrong (`anim.html`, `out/contact.png`)

## Known gaps
Art-director critique tools measure craft (contrast, margins, hierarchy), not taste; the pre-production boards are real renders of the templates, so they show what the build can do and nothing more, and a scene written as custom code is a placeholder panel on the storyboard until it is built; the three directions share one layout (the title template) and use system fonts unless you run `setup --libs fonts`, so without it they look different on machines with different fonts installed; Windows/macOS untested; the OpenMontage bridge was tested against a mock project, not a live OpenMontage run; Remotion and HyperFrames untested; sparse sound mixes can't reach -14 LUFS (the tool says so); the `/plugin` command may be namespaced; no licence file yet.
