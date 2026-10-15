# Changelog

All notable changes. Dates are UTC.

## 1.7.0 (2026-10-15): Poly Haven 3D assets
- `motionmaker-assets/scripts/polyhaven.mjs`: Poly Haven's free API (no key, commercial use allowed, checked 2026-10-15): 521 glTF models, 997 HDRIs, 869 PBR materials, all CC0. `search` (names, tags, categories; listing cached a day), `categories`, `sheet` (numbered thumbnails to show before choosing), `get` (every file checked against Poly Haven's md5, paths kept inside the asset folder, a ledger entry crediting the authors and Poly Haven as their API asks). Sends a unique User-Agent as the API requires.
- New template `three-model`: a glTF model on a turntable in the browser, fitted to the frame from its bounding box (portrait or landscape), HDRI reflections with the flat brand background, a contact shadow; seconds to render, frame-exact, a seamless loop. A generated test box ships for the smoke test.
- Blender: `init turntable --hdri <.hdr>` lights the scene from an HDRI (the camera still sees the brand colour) and `--floor <material folder>` puts a PBR material on the floor. Tested with a Poly Haven lantern, studio HDRI and mud-and-leaves material.
- `smoke.sh`: three-model with the test box, and the Poly Haven id guard (39 checks; no network calls in the smoke test).

## 1.6.0 (2026-10-15): 2D cel animation
- **`motionmaker-cel`** (new, 17 skills) and the `cel-scene` template: the look of traditional 2D cel animation, frame-exact. A kit (`cel.js`) for inked shapes whose line boils per drawing (seeded), cel shading (flat colour, a hard shadow band away from the light, a highlight on the lit edge), drawings held on twos or threes while camera moves run on ones, painted backgrounds drawn once and panned, light cones and glows, straight and radial speed lines, smears, impact frames, decaying camera shake, cel smoke, flames redrawn per drawing, and display lettering with an ink outline and an overshoot pop.
- Presets: night-drive (a roadster past townhouses at night, with its own vertical framing), impact (a product slam), launch (a rocket in billowing smoke). `cel.mjs list | new | check` (the scene contract: no clock, no unseeded random, no network or dynamic code).
- Said plainly in the skill and on the board: shapes are drawn by code, so it does objects, vehicles, effects and graphic shots; full character acting needs an animator's frames (brought in with `footage-scene`) or the AI-video route.
- The animation-style board gains a "2D cel animation" tile (17 options); `smoke.sh` renders every preset and a vertical version (37 checks).

## 1.5.0 (2026-10-14): flat design motion graphics
- **`motionmaker-flat`** (new, 16 skills) and the `flat-scene` template: flat design motion done to a studio standard. A scene is worlds of flat layers at depths (sky, sun or moon, stars, clouds, faceted mountain ranges with lit, shadow and snow facets, hills, ground, water with shimmer, skylines with lit windows, palms with serrated swaying fronds, pines, round trees, birds, geometric shapes that pop / grow / draw / float, a logo or illustration, words) and shots that move a 2.5D camera through them with real parallax (pan, push, rise; gentle easing). Haze toward the sky by depth, a defocused foreground, light rays, a light leak, a vignette and grain, all subtle. Transitions: cut, dissolve, whip pan (a horizontal streak), iris, push-through. Shot lengths are weights scaled to the clip; shots and layers take `portrait` / `square` overrides so vertical versions are composed, not cropped.
- Presets: coast, alpine, city, night, shapes. `flat.mjs list | new | validate` (unknown types, bad colours, missing worlds, image paths outside the project, and notes on weak craft: an unblurred foreground, a rushed pan, an extreme zoom). Images (logos, illustrations) are copied next to the piece by the scaffold; URLs and ".." paths are refused.
- The animation-style board gains a "Flat design scene" tile (16 options). `smoke.sh` renders and checks every preset and a vertical version (33 checks); each is identical when rendered twice.

## 1.4.0 (2026-10-14): choose the animation style by watching it; photoreal 3D through Blender
- **Animation-style board, asked first.** Onboarding used to show the same headline in different fonts and colours: the look, not the kind of animation. `moodboard.mjs --worlds` is now "What kind of animation": up to 15 numbered options, 12 drawn as real samples of the user's own words (kinetic type, logo, animated data, product demo, stylised 3D, flat illustrated characters, icons, map, code, equation, hand-drawn marks, a painterly art movement), each with three frames of how it moves, and `animation-styles.mp4` / `.gif` with all of them playing. Three more are cards that say what they need: an explained machine (Anatomy, with our own filmed example), photoreal 3D (Blender), real footage or AI video (OpenMontage). The board prints what is never offered (whiteboard hand-writing, rigged cartoon characters, living artists' styles); the skill says what it recommends for the brief, and offers the nearest real thing when a user asks for a style we do not have. The gate `worlds` is now required at the Guided level (old records are unaffected).
- **`motionmaker-blender`** (new, 15 skills): Blender 4.5 LTS downloaded only on the user's yes, kept in `~/.motionmaker`, sha256-checked against a pin in the repo (a mismatch deletes it); `setup` refuses without `--yes`. Headless Cycles on the CPU, `init turntable` (object, floor, three soft lights, a seamless orbit; or an imported glb/gltf/obj/stl/ply: a `.blend` or `.fbx` is refused), `render` (frames and MP4, seconds per frame reported), `check`. Measured here: 6 to 25 s per frame at 540x540 on 4 cores, so a 144-frame clip takes tens of minutes. **Determinism, stated honestly:** with a fixed seed and the denoiser off, two renders are pixel-identical on one machine; with the denoiser on they differ, so it is off by default; not promised across machines. `check` compares decoded pixels (Blender writes timestamps into PNG files).

## 1.3.3 (2026-10-14): show before asking; ask the format
From a user's run (a tennis-forehand explainer): the brief-back question pointed at a file the user never saw, and the format (16:9) was assumed.
- Text the user approves (brief-back, script, voice lines) is pasted in full in the message right before the question; a file path alone does not count as showing it.
- Platform and format are always asked, in platform words: Instagram Reels / TikTok / YouTube Shorts (9:16, 1080x1920), YouTube or a website (16:9, 1920x1080), Instagram or Facebook feed (4:5, 1080x1350), X or LinkedIn feed (1:1, 1080x1080); several platforms get one version each; vertical pieces keep words out of the apps' button and caption areas. The brief-back has a Format line, and `preprod.mjs` refuses to approve one without a real size.

## 1.3.2 (2026-10-14): Windows fixes from a real Windows install
A user's Windows machine had hand-patched three scripts; `update --force` replaced them and the diff showed what Windows needs. Fixed for every script, not only those three:
- `import()` of a file path (Node on Windows rejects "C:\..."): `directions.mjs`, `styles.mjs`, `inspect-asset.mjs` now import file URLs.
- ffmpeg `drawtext` with no font file (Windows builds have no default font): a shared `platform.mjs` finds one (Arial or Segoe UI on Windows, Arial or Helvetica on macOS, fontconfig on Linux; `MOTIONMAKER_FONT` overrides), used by `directions.mjs`, `styles.mjs`, `review-pack.mjs`, `feel.mjs`, `storyboard.mjs`, and the same logic in `around.sh` and `analyze-reference.sh`. Burned-in captions point libass at the Windows fonts folder.
- `sweep.mjs` used `/tmp` (none on Windows): `os.tmpdir()`. `export.sh` used GNU-only `stat -c` (fails on macOS): `wc -c`.
- **Backups no longer go inside the skills folder.** Claude Code loads every folder there that has a SKILL.md, so `<name>.bak-*` showed up as duplicate skills. Backups now go to `motionmaker-backups/` next to it (`~/.claude/motionmaker-backups`), and `install`/`update` move any old `.bak-*` folders there.
- `portability.mjs` (in `smoke.sh`, 26 checks) fails if a path `import()` or a font-less `drawtext` comes back.

## 1.3.1 (2026-10-14): voice-over verified with a real ElevenLabs generation
- One plain yes covers credits, plan and licence; after it, the voice is generated without further asking (again only when a run would cost clearly more than agreed). The user may give a **voice ID** directly (Voice Library, their own or designed voices): no audition needed. The audition page shows every voice's ID.
- `voice.mjs get "<url>" --scene <n>`: downloads a generated take and checks it is audio (an expired link fails with a clear message). Verified live: a flow run's `content_url` is an MP3 valid for 2 hours; 55 credits ($0.011) for a 55-character line on eleven_v4; 3.55 s, mono 44.1 kHz, about -24 LUFS before the mix.

## 1.3.0 (2026-10-14): voice-over, and the gaps a test run found
- **Voice-over**, from an ElevenLabs connector or MCP server when one is available (detected by its tools), or the user's own recording: `voice.mjs` (sound-export) writes the narration script with characters and speaking time, a free audition page from the voices' public samples, places each line on its scene (`--retime` lengthens scenes the real recording does not fit), writes captions (SRT/VTT, balanced chunks) and mixes with the music ducked exactly 10 dB under every line (cue-driven, not a compressor) at -14 LUFS. The animatic plays with the voice (`--voice`); `export.sh` can burn in captions (`CAPTIONS=`). Pre-production gets a `voice` gate, and the skills say to price the generation, ask the plan and get a yes before any credit is spent.
- Licences: `ELEVENLABS-PAID` (commercial, except Beta Services) and `ELEVENLABS-FREE` (no commercial use; "elevenlabs.io" in the title), from ElevenLabs' own help page. The ledger says "non-commercial use only" and delivery then needs `--non-commercial "<stated use>"`, recorded in DELIVERY.md.
- Fixed after a no-context agent ran the onboarding for a kids' planets video:
  - custom scenes need a sketch (`"preview"`): without one the storyboard says NOT SHOWN, `frames` exits 2 and the approval is refused;
  - the script check counts only the time a line is fully on screen (the template's real entrance and exit, from the scaffold's new `timing.json`) and reads at a kids' pace when `"audience": "kids"`;
  - scenes in a storyboard hold until their cut (`NO_EXIT`), and the title template's exit is at most 0.5 s at any frame rate (at 12 fps a long line used to crawl out for seconds);
  - long titles break onto two balanced lines instead of shrinking (one-line titles unchanged, checked frame for frame);
  - scene approvals also bind STORYBOARD.json; `preprod.mjs scenes` sets the scene count once known; old records gain new gates on load;
  - `moodboard.mjs --avoid dark|light`; round 2 keeps round 1's size; `feel.mjs --from <moodboard.json> --tile <n>` uses the exact tile (colours included); scaffold warnings are shown on the storyboard; old scene images are cleared; `type-scale.mjs --chars` takes the text itself;
  - the playbook: the headline is defined, both mood-board rounds are recorded, the art director's directions are optional after the style gate, no extra "approve the brief" yes, what to do beyond a template's limits.

## 1.2.0 (2026-10-14): pre-production, so it builds what you imagine
- **`motionmaker-preprod`** (new skill): onboarding the way a studio does it. Involvement level (Quick / Guided / Hands-on); "describe what you picture" in your own words, follow-ups only for the gaps, and a plain-language **brief-back** with every assumption listed; then **show, don't ask**:
  - `moodboard.mjs`: your headline in every look plus fitting art styles, numbered; `--from-image` adds the colours of a reference picture (made readable, every change reported); `--vary` makes round 2 (inverted, two accents, two typefaces: one change per tile); `--worlds` shows eleven kinds of picture (type, logo, chart, product UI, 3D, characters, icons, map, code, equation, hand-drawn mark). Every tile carries its build recipe.
  - `feel.mjs`: the same words in four motion personalities (calm, snappy, bouncy, dramatic) as a 2x2 video, GIF and filmstrip; the pick becomes `FEEL=` in the scaffold.
  - `storyboard.mjs`: script (exact words, reading-time check), storyboard (a real frame of every scene, with words, picture, move, sound, transition), animatic (the timing as a video; `--motion` for real motion at 12 fps).
  - `preprod.mjs`: approvals in the user's own words, bound to the exact file they saw; stale when the file changes; `check build` / `check deliver`; `board.html` with everything shown and said. `deliver.mjs` refuses on missing or stale approvals.
- `/motionmaker` Phase 1-2 rewritten around it; the art director no longer re-asks what pre-production settled.
- Scaffold: `FEEL=calm|snappy|bouncy|dramatic` for the title template (default output unchanged, checked frame for frame), fractional seconds (a 2.5 s scene).
- Fixed: the equation template never fitted wide equations to the frame and, with the installed KaTeX (renamed classes), never revealed its terms one by one; its highlight underline is now measured on the layout the frames show.
- `smoke.sh`: 25 checks, including a pre-production self-test.

## 1.1.0 (2026-10-14): animations as code for websites and React apps
- **`export-web.mjs`** (motionmaker-build): any finished piece ships as code: a deploy folder (the page plus exactly the files it loads, found by drawing every frame in the sandboxed browser), `motion-player.ts` / `.js` (no dependencies: `mountMotion`, `<motion-clip>`), `Motion.tsx` / `.jsx` (React 18/19, Next.js client component), `demo.html` and a README. Frame n on the page is frame n of the video; it pauses off screen and in background tabs, shows a poster frame for reduced motion, and works across origins. `--check` compares sample frames pixel for pixel with the renderer and tests play, pause, loop, end and reduced motion.
- **Live export** (`--live`) for real-time pages: a pausable clock injected as the page's first script, a crop to the card, a scripted tour (same actions as `film-realtime.mjs`) that ends at the visitor's first real touch.
- **`anatomy.mjs web`**: Anatomy figures live on a website, the visitor takes them apart; carries the Anatomy credit and its MIT notice.
- `smoke.sh` runs both exports (24 checks).
- Fixed while testing: player file names that clash on case-insensitive file systems (`motion.ts` vs `Motion.tsx`; now `motion-player.ts`), React's explicit `undefined` props overriding defaults, a frame scheduler that doubled every frame, Chrome's own pointer moves after scrolling counted as the visitor, and a misleading sandbox warning in every host page's console.

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
