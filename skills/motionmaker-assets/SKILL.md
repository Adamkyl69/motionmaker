---
name: motionmaker-assets
description: Bring illustration kits and ready-made animations into a motion piece, safely and frame-exact. Covers Open Peeps and Humaaans (CC0 characters, built locally and animated by part), LottieFiles animations, Rive community files and unDraw art. Inspects every file for executable content, recolours it onto the brand palette without touching skin tones, renders it deterministically (lottie-scene, rive-scene, illustration-scene templates), and keeps a licence ledger with the credits the licences require. Use when the user wants characters, spot illustrations, icons or a downloaded animation in the video, or asks about Open Peeps, Humaaans, LottieFiles, Rive or unDraw.
---

# Assets: illustration kits, Lottie and Rive

You are the art department's librarian and the legal conscience of the piece. Borrowed art is a source of style, speed and risk. Make it look **owned** (one family, brand colours), make it **safe** (inspected, licensed, credited) and make it **frame-exact** (every pixel a function of the frame number).

Paths: `AS=$MOTIONMAKER_SKILLS/motionmaker-assets`. Read `craft/illustration.md` when choosing and directing art; `licenses.json` holds the licence table (checked 2026-10-12 against each source's own page: summaries, not legal advice).

## Pick the source (offer these to the user in onboarding)
| Source | Is | Licence | Credit | Get it |
|---|---|---|---|---|
| **Open Peeps** (Pablo Stanley) | hand-drawn people, mix-and-match | CC0 | none (nice to give) | **build locally**: `kit.mjs peep` |
| **Humaaans** (Pablo Stanley) | flat people, mix-and-match, sitting/standing | CC0 | none | **build locally**: `kit.mjs human` |
| **Open Doodles** (Pablo Stanley) | loose doodles | CC0 | none | download from opendoodles.com |
| **unDraw** | recolourable scenes and spots | unDraw licence (free commercial) | none | one SVG at a time from undraw.co; no bulk download, no packs, no AI training |
| **LottieFiles** | animated Lottie JSON | LottieFiles Simple License (public files) | encouraged, not required | download JSON from the animation's page; record that page URL; modified copies keep the same terms |
| **Rive Community** | `.riv` animations | **CC BY: credit REQUIRED** | **required in the video or post** | download from the file page |
| The user's own / client's | anything | USER-OWNED | none | ask them to confirm they own it |
| Paid kits | anything | PAID-LICENSED | per licence | record the plan and terms URL; many forbid redistributing the source file |

Never ship an asset whose licence you could not find. Nothing from these sources is bundled in Motionmaker; the user downloads what they choose (Open Peeps and Humaaans parts are fetched on request by `kit.mjs setup`, MIT wrapper packages installed in a cache folder).

## Workflow
1. **Kit setup (only when needed, explicit action):** `node $AS/scripts/kit.mjs setup` installs `lottie-web`, `@rive-app/canvas`, `react-peeps` and the Humaaans parts into `~/.cache/motionmaker/kits` (or `$MOTIONMAKER_KITS`). Tell the user it is a download of about 60 MB.
2. **Choose or build**
   - Characters: `kit.mjs list peeps|humaaans`, then `kit.mjs peep --hair ... --face ... --body ... [--look <name>] --out figure.svg` or `kit.mjs human --head ... --torso ... --bottom ... --out figure.svg`. Names are validated. The output has named layers (BODY/HEAD or HEAD/TORSO/BOTTOM) and a `.json` sidecar. Pick diverse, fitting characters on purpose; skin tones stay as drawn.
   - Downloads: the user supplies a file (`.json` Lottie, `.riv`, `.svg`). A `.lottie` is a zip: unzip it and use `animations/*.json`.
3. **Inspect before anything else (untrusted input):** `node $AS/scripts/inspect-asset.mjs <file>`. **BLOCK** (script, event handlers, external URLs, remote images, invalid file) stops the build; **WARN** (expressions, effects, 3D, text layers, state machines) means look at the render closely. Say what it found in plain words.
4. **Make it belong:** `node $AS/scripts/recolor.mjs analyze <file>` then `apply --look <name> --neutrals` (greys onto the look) and/or `--map "#old=#new"` for clothes, props and backgrounds. **Never recolour skin tones to fit a palette**; the tool flags them PROTECTED. Lottie gradients are reported, not rewritten.
5. **Record it:** `node $AS/scripts/ledger.mjs add <file> --source <page url> --creator "<name>" --license <id> [--attribution "Title by Creator (url), CC BY 4.0"] --dir motion-out/<slug>`. For kit figures: `ledger.mjs sidecar figure.svg.json --dir ...`. `ledger.mjs licenses` lists the ids.
6. **Build the scene** with the main scaffold (it inspects again, copies the file into `assets/`, vendors the runtime):
   - Lottie: `TEMPLATE=lottie-scene ASSET=anim.json [LOOP=1] LOOK=<look> bash $MOTIONMAKER_SKILLS/motionmaker/scripts/scaffold.sh <slug> "<caption or ->" W H fps secs - - -`
   - Rive: `TEMPLATE=rive-scene ASSET=file.riv ARTBOARD=<name> ANIMATION=<linear animation> [LOOP=1] ...` (inspect lists the names). Only **linear animations** are frame-stepped; state machines are interactive and not supported.
   - Figures and spots: `TEMPLATE=illustration-scene ASSET=figure.svg ...` (idle breathing, head bob and sway by part; pop-in; caption).
   - Caption `-` means no caption. For `LOOP=1`, set the length to the asset's duration or a whole multiple, or the scaffold warns that it will jump at the loop point.
   - These templates are starting points for one asset plus a caption. For richer scenes, copy the loader code into your own composition: it is a pure function of the frame number in all three.
7. **Verify as usual:** `check.mjs` (determinism, seam, errors), stills, art-director critique (see `craft/illustration.md`), and **`ledger.mjs check --dir motion-out/<slug>`** before export (must PASS; it fails on unrecorded files, unknown licences and missing CC BY credits). Then `ledger.mjs credits` for the end card or post text and `ledger.mjs report` to write `assets/ASSETS.md` for the client.

## How frame-exactness works here (so you can debug it)
- **Lottie:** `anim.goToAndStop(frame, true)`; time is `(f/fps)`, wrapped by the animation's duration for loops, else clamped to its last frame.
- **Rive:** the animation must be passed in `animations: [name]` when constructing; then `stopRendering()`, and per frame `scrub(name, seconds); drawFrame()`. `scrub` clamps past the end, so loops wrap the time by the animation's own duration. The runtime wasm must be served from the project folder (`rive.RuntimeLoader.setWasmUrl("./vendor/rive.wasm")`), because the renderer blocks non-local requests.
- **Illustrations:** parts are wrapped in new `<g>` elements and transformed with SVG `transform` attributes (not CSS) around fixed pivots; idle periods divide the loop length evenly. The outer fade stays at 0.999 or less so the raster path never changes when the fade finishes.

## Limits to say out loud
- Lottie: `lottie-web` skips many After Effects effects, 3D and some expressions; always look at the render. Expressions are JavaScript: only render files from sources the user trusts.
- Rive: state machines and interactive logic are not driven; `.riv` community files need credit (CC BY).
- Open Peeps / Humaaans are static art: our idle motion is simple (breath, bob, sway), not full character animation. For walk cycles use a Lottie or Rive asset.
- Licence summaries were checked on 2026-10-12 and can change. A single file may carry different terms than its collection: confirm on the asset's own page and record that URL.
- No attribution is required for CC0, but crediting Pablo Stanley and LottieFiles creators is good practice.
