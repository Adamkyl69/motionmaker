# Examples (rendered by these skills during testing)

| File | What it is | How it was made |
|---|---|---|
| `launch-clip-1080x1080-30fps-20s-with-sound.mp4` | 20 s product-action demo: headline, card, cursor, press, finished file, closing card, with synthesized sound (whoosh, thud, click, chime, pop) | `product-demo` template (placeholder screens), `synth.mjs` + `loudnorm.sh` + `export.sh`; passes `probe.sh` and `verify-sync.mjs` |
| `launch-clip-review-stills.png` | The 17 review stills from that clip (frames 0, 18, 42, 60, 119, 120, 150, 180, 195, 201, 210, 222, 234, 419, 420, 540, 599) | `stills.mjs` |
| `three-product-540x540-24fps-4s.mp4` | 4 s Three.js product shot (lid spring, buds, orbit) | `three-product` template, run from an installed copy |
| `logo-reveal-720x406-24fps-4s-with-sound.mp4` | 4 s logo reveal with synthesized sound | `logo-reveal` template |

These are test renders with placeholder content, not finished work. Your own output goes to `motion-out/<slug>/` in the folder where you run `/motionmaker`.

| `art-director-three-directions.png` | The art director's three directions (Editorial Calm, Night Cinema, Swiss Minimal) for the same headline, from `directions.mjs` on the real template | `skills/motionmaker-art-director/scripts/directions.mjs --tone "calm premium"` |
| `art-director-look-tests.png` | Look tests on a launch-clip frame: original / grayscale / squint / phone thumbnail (after the card-contrast fix) | `looktests.sh` |

- `assets-illustration-scene.png`: `illustration-scene` with an Open Peeps bust (left, night-cinema look) and a Humaaans figure (right, playful-pop look), both built locally with `kit.mjs`. Art: Pablo Stanley, CC0.
- `libs-templates.png`: the six new templates (code-reveal, equation-scene, map-scene, annotate-scene, icon-features, footage-scene with an ffmpeg test pattern), each rendered by `motionmaker-libs/scripts/smoke.sh`.
- `looks-bundled-fonts.png`: the eight looks, each in its own bundled open-licence font (Fraunces, Inter, Cormorant Garamond, Archivo Black, Fredoka, JetBrains Mono, Playfair Display, DM Serif Display).
- `art-styles.png`: the six art styles (Bauhaus, Van Gogh, Constructivism, Seurat, Matisse cut-outs, ukiyo-e) on the same headline, all drawn in code by `style-scene`.
- `anatomy-raptor-filmed.png`: Anatomy's Raptor engine example (MIT, by Ryan, github.com/wheresryan22/anatomy) filmed by `motionmaker-anatomy`: assembled, taken apart by a scripted hover, then firing (WebGL plume); two films identical frame for frame.
- `web-export-demo.png`: the 20 s launch clip exported as code (`export-web.mjs`) and playing live in its `demo.html` through the TypeScript player, with pause and a frame scrubber; frames through the player are pixel-identical to the rendered video.
- `anatomy-raptor-live-web.png`: Anatomy's Raptor engine example (MIT, by Ryan, github.com/wheresryan22/anatomy) exported live for a web page with `anatomy.mjs web` and running inside the player: assembled, taken apart by the scripted hover, reassembled, then firing after the scripted click. Visitors can do all of this themselves.
- `preprod-moodboard.png`: round 1 of the pre-production mood board: one headline in every look, two fitting art styles, and (tile 11) the colours of a reference picture, made readable.
- `preprod-worlds.png`: the animation-style board ("what kind of animation"): 16 options, each with three frames of how it moves; the last three are cards for Anatomy, Blender and real footage / AI video, and what is never offered is printed under it.
- `preprod-animation-styles.mp4`: the same options playing at once (the video the user is told to open).
- `blender-turntable-frame.png`: one frame of the Blender turntable (Cycles on the CPU, 540x540, 128 samples, 23 s for this frame on 4 cores).
- `preprod-feel.png`: the four motion feels (calm, snappy, bouncy, dramatic) as a filmstrip of each entrance; the 2x2 video is what the user watches.
- `preprod-storyboard.png`: a storyboard for a kids' planets video: real frames from the templates (the two-line fun fact sized for young readers) and a SKETCH for the scene drawn in code.
- `flat-coast-960x540-24fps-8s.mp4`: the flat design coast preset (faceted ranges in haze, swaying palms, the words set on the hills, a slow push).
- `flat-presets.png`: the five flat design presets (coast, alpine before and after its whip pan, city, night, shapes).
