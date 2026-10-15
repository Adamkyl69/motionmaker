---
name: motionmaker-engines
description: Choose the animation engine and supporting repositories (Three.js, drei, Remotion, HyperFrames, GSAP, Motion, Fabric.js, Rive, deck.gl, cobe, canvas-confetti, twgl.js, ffmpeg.wasm) for a motion task and state it in the brief's OUTPUT line. Use when starting an animation or when the user asks which library to use.
---

# Motion engines

Name the engine in the prompt or the model picks for you ("A Remotion composition, 1920x1080, 30 fps, 450 frames").

Rule of thumb: one idea under 10 s -> plain HTML/CSS/canvas. Series/template/data-driven video -> Remotion. Think in web pages + GSAP -> HyperFrames. Anything 3D -> Three.js (stylised, fast), or Blender when it must look photoreal (slow). Motion inside a product (not a video) -> Motion or GSAP/Rive.

| Need | Use | Repo | Notes |
|---|---|---|---|
| 3D scenes, shaders, camera orbits | Three.js | mrdoob/three.js | drive time from frame number; fov 35-50; pin version (r160 TextGeometry `height`, not `depth`) |
| Lighting rigs, HDR env, controls for Three | drei | pmndrs/drei | React Three Fiber helpers |
| Raw fragment shaders, less boilerplate | twgl.js | greggman/twgl.js | raymarched blobs, glints |
| Product hero globe | cobe | shuding/cobe | dot-matrix WebGL globe < 5KB |
| Millions of animated data points | deck.gl | visgl/deck.gl | WebGL2 layers |
| 2D vector object model, serialize/animate | Fabric.js | fabricjs/fabric.js | canvas; wrap draw in renderFrame(n) |
| Celebration bursts | canvas-confetti | catdad/canvas-confetti | uses randomness: seed/replace Math.random for frame-exact renders |
| React UI springs, gestures, layout | Motion | motiondivision/motion | live UI, no video renderer |
| Interactive state-machine vector art | Rive | rive-app/rive-runtime | product UI; for video use `rive-scene` (linear animations only, via motionmaker-assets; community files need CC BY credit) |
| Exact typography per look | Fontsource fonts | fontsource/font-files | OFL; bundled per look by scaffold (`motionmaker-libs`) |
| Code on screen | Shiki | shikijs/shiki | highlight ahead of time in Node; `code-reveal` |
| Equations | KaTeX | KaTeX/KaTeX | typeset ahead of time; `equation-scene` |
| Maps, globes, routes | d3-geo + world-atlas | d3/d3, topojson/world-atlas | offline Natural Earth shapes; `map-scene` |
| Hand-drawn marks | Rough.js | rough-stuff/rough | fixed seed; `annotate-scene` |
| Icons | Lucide, Tabler, Phosphor, Material Symbols | lucide-icons/lucide etc. | `icons.mjs`, `icon-features` |
| 2D cel animation look: ink, cel shading, on twos, smears, impact frames | cel-scene (ours) | - | `motionmaker-cel`: presets, scene.js with the kit, frame-exact; not hand-drawn character acting |
| Flat design motion: layered flat worlds, parallax camera, transitions | flat-scene (ours) | - | `motionmaker-flat`: presets, scene JSON, frame-exact |
| A real 3D model (glTF) turning in the browser, HDRI-lit | three-model (ours) + Poly Haven | polyhaven.com | `motionmaker-assets/scripts/polyhaven.mjs` finds and downloads CC0 models, HDRIs, materials; `TEMPLATE=three-model MODEL= HDRI=` |
| Photoreal 3D: real materials, light, glass, product turntables | Blender (separate download, GPL) | blender/blender | `motionmaker-blender`: CPU Cycles, fixed seed, `check` proves repeatable on one machine; tens of minutes to hours per clip |
| Explain a mechanism as a working object | Anatomy | wheresryan22/anatomy | MIT skill, separate install; filmed by `film-realtime.mjs` via motionmaker-anatomy |
| Film any real-time web animation | film-realtime.mjs | (ours) | virtual clock, scripted input, CPU raster; `--check` proves two films identical |
| Ready-made animated vectors | lottie-web | airbnb/lottie-web | `lottie-scene` via motionmaker-assets; goToAndStop is frame-exact |
| Video as React components | Remotion | remotion-dev/remotion | `motionmaker-remotion` (tested 4.0.484): licence question first (free for individuals, up to 3 employees, non-profits; else a Company License), install on yes, render + frame-exact check |
| Video from HTML + GSAP | HyperFrames | heygen-com/hyperframes (npm `hyperframes`) | ships inside OpenMontage (its `make setup` installs it); no Motionmaker bridge: our own templates already render HTML + GSAP frame-exactly (`gsap-kinetic`) |
| Web timelines, kinetic type | GSAP | greensock/GSAP | free incl. SplitText, MorphSVG, DrawSVG, ScrollTrigger |
| In-browser stitching/transcode | ffmpeg.wasm | ffmpegwasm/ffmpeg.wasm | native ffmpeg preferred in cloud/CLI |

Star counts and claims for these libraries came from a user-pasted list and were not verified. Verify license and version before depending on a library; note Remotion's company-size license rule.

Frame-exact caveats: any library with its own clock/RAF must be driven manually (seek a GSAP timeline to f/fps; step a Three clock by hand); seed any randomness; confirm with `motionmaker-review/scripts/check.mjs`.
