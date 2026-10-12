# Examples (rendered by these skills during testing)

| File | What it is | How it was made |
|---|---|---|
| `launch-clip-1080x1080-30fps-20s-with-sound.mp4` | 20 s product-action demo: headline, card, cursor, press, finished file, closing card, with synthesized sound (whoosh, thud, click, chime, pop) | `product-demo` template (placeholder screens), `synth.mjs` + `loudnorm.sh` + `export.sh`; passes `probe.sh` and `verify-sync.mjs` |
| `launch-clip-review-stills.png` | The 17 review stills from that clip (frames 0, 18, 42, 60, 119, 120, 150, 180, 195, 201, 210, 222, 234, 419, 420, 540, 599) | `stills.mjs` |
| `three-product-540x540-24fps-4s.mp4` | 4 s Three.js product shot (lid spring, buds, orbit) | `three-product` template, run from an installed copy |
| `logo-reveal-720x406-24fps-4s-with-sound.mp4` | 4 s logo reveal with synthesized sound | `logo-reveal` template |

These are test renders with placeholder content, not finished work. Your own output goes to `motion-out/<slug>/` in the folder where you run `/motion`.
