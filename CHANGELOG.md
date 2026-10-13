# Changelog

All notable changes. Dates are UTC.

## 1.0.0 (2026-10-13)
First stable release: thirteen skills, sixteen templates, tested end to end on Linux (see "What was tested" in the README).

- **Renderer:** CPU raster and compositing are now the default for every render (`MOTIONMAKER_GPU=1` opts out). With GPU raster on software GL, a frame could differ by a few pixels between runs. Renders are about 26% faster with visually equal output.
- **Templates:** removed the 0.999 opacity caps that were a workaround for that difference (equation, icon-features, footage, map, annotate, code-reveal, illustration).
- **`film-realtime.mjs`:** uses the shared browser launcher; fixed `setInterval` firing only once under the virtual clock; the fixture page is part of `smoke.sh`.
- **Docs:** README skill table names the `motionmaker` command correctly, credits list every bundled font, TESTING checklist renumbered 1-10, this changelog.

## Before 1.0.0
The manifests stayed at 0.1.0 while these landed; listed by commit.

### Anatomy and real-time filming (6c95001, 2026-10-13)
- `motionmaker-anatomy`: route "explain how X works" to Anatomy (MIT, separate install, pinned commit), direct the shots (hover, move, click, key, leave) and film the figure.
- `film-realtime.mjs`: films any real-time web page frame-exactly with a virtual clock (rAF, `performance.now`, `Date`, timers, CSS/Web animations, IntersectionObserver), seeded `Math.random`, an input gate for scripted pointer events, and `--check` (two films must be identical).

### Quality gates, art styles, music, OpenMontage (0805b33, 2026-10-12)
- `motionmaker-review`: `film-gate.mjs` (dead, blank and blue-purple stretches), `review-pack.mjs` (independent reviewer that sees only the film), `deliver.mjs` (sealed `DELIVERY.md`, `--verify`).
- Art styles: `style-scene` with six styles drawn in code (Bauhaus, Van Gogh, Constructivism, Seurat, Matisse cut-outs, ukiyo-e), style cards with honest ratings, `styles.mjs` (list, suggest, frames).
- Beat grid: `beat-grid.mjs` fits BPM from a reference's cuts; `beat.mjs` lays music on the grid, one frame after the beat, ducked under hits.
- `motionmaker-montage`: routes footage, AI video, voice and avatar requests to a separately installed OpenMontage (AGPLv3, never bundled) with a handoff, provenance import and our gates.

### Optional libraries (8900b4c, 2026-10-12)
- `motionmaker-libs`: an open-licence font per look, code reveals (Shiki), equations (KaTeX), globe routes (d3-geo), hand-drawn marks (Rough.js), four icon sets; frame-exact screen recordings (`footage.mjs`); `smoke.sh` builds and checks every template.

### Illustration and animation assets (14b192c, 2026-10-12)
- `motionmaker-assets`: Open Peeps and Humaaans built locally (CC0), LottieFiles, Rive, unDraw; inspected as untrusted input, recoloured to the brand, recorded in a licence ledger with required credits.

### Art director (1973733, 6f65452, 2026-10-12)
- `motionmaker-art-director`: creative-brief questions, three directions on real pixels, visual system (`AD-BRIEF.md`), critique tools, eight looks, type and palette tools.

### 0.1.0: first import (b92e001, 2026-10-12)
- `/motionmaker` command with preflight, intake, brief gate, build, review, synthesized sound and export; reference analysis, catalog, brief, engines, build, review, sound-export skills; plugin and `npx` installers.
