---
name: motionmaker-blender
description: Photoreal 3D for a motion piece through Blender (GPL, a separate program that is only downloaded on the user's yes): product turntables, hero shots, real materials, soft light, glass and glossy coats that the Three.js templates cannot draw. Checks the download against a pinned sha256, renders headless on the CPU with Cycles and a fixed seed, proves on this machine that two renders are pixel-identical, and hands the MP4 to the rest of Motionmaker (title and end cards, voice-over, film gate, review, sealed delivery). Use when the user wants a photoreal or product-shot 3D look, picks the Blender tile on the animation-style board, or imports a 3D model (glb, gltf, obj, stl, ply).
---

# Blender: photoreal 3D

Motionmaker's own 3D (`three-product`) is stylised and fast. This route is for real materials and lighting. **Say the cost before offering it**: Cycles on a CPU takes roughly 6 to 25 s per frame at 540x540 (measured on 4 cores, 24 to 128 samples) and about four times that at 1080x1080, so a 6 s clip at 24 fps is 144 frames: tens of minutes small, hours at full size. Offer a short loop, fewer frames (12 or 15 fps), or a smaller size first.

Paths: `BL=$MOTIONMAKER_SKILLS/motionmaker-blender/scripts/blender.mjs`.

## 1. Is Blender there? (ask before downloading anything)
`node $BL where`. If it is missing, tell the user in one message: it is the official Blender 4.5 LTS from blender.org, about 380 MB to download and about 1.2 GB on disk, kept in `~/.motionmaker` (nothing system-wide), checked against a sha256 pinned in this skill, and it is GPL software run as a separate program. AskUserQuestion: **Yes, download it** | **I already have Blender** (ask for the path, then set `MOTIONMAKER_BLENDER`) | **No, use the stylised 3D instead**. Only after a plain yes: `node $BL setup --yes` (the tool refuses without `--yes`). A mismatch deletes the download and installs nothing. macOS cannot unpack a .dmg unattended: the tool prints the official link and checksum; the user installs it and sets `MOTIONMAKER_BLENDER=/Applications/Blender.app/Contents/MacOS/Blender`.

## 2. Build the scene from the approved brief
Pre-production still comes first (animation style, look, script, storyboard). A Blender scene is a `custom` scene in STORYBOARD.json: give it a `"preview"`, which is **one real low-quality frame**: render it with `--frames N-N --samples 24` and point `"preview"` at the PNG, so the user approves what it will look like (the storyboard marks it as a still).
- Start: `node $BL init turntable --out motion-out/<slug>/blender --size <W>x<H> --secs <s> --fps <12-24> --bg "<brand bg>" --object "<hex>" --accent "<hex>" [--model <file>]`. It writes `scene.py` (an object on a floor, three soft lights, the camera circling once, a seamless loop) and `config.json`. Use the brand colours from AD-BRIEF.md.
- Anything else (a product with parts, a camera push, an exploded view): copy `scene.py` and change it. It is ordinary `bpy` Python; keep it deterministic: no `random` without a seed, no network, no files outside the project folder, no `os.system`.
- **Poly Haven** (`motionmaker-assets/scripts/polyhaven.mjs`): a CC0 model (`--model`), an HDRI that lights the scene while the camera still sees the brand background (`--hdri`, set `hdriStrength`, `hdriRotation` in config.json), a PBR floor (`--floor <material folder>`, `floorScale`). Show the user the thumbnail sheet first.
- **A model** must be a data format: glb, gltf, obj, stl or ply. A `.blend` or `.fbx` can carry scripts, so `init` refuses them. Treat every downloaded model as untrusted and as licensed: record it in the ledger (`motionmaker-assets/scripts/ledger.mjs add <file> --kind model --license <id> --source <url> --creator <name> --attribution "<credit line>"`); delivery blocks unknown or non-commercial material.
- Blender runs with `--disable-autoexec`.

## 3. Render, then check
1. Look first: one frame, `node $BL render <dir> --frames 1-1 --samples 32`. **Read the PNG** before spending minutes on the rest.
2. Whole piece: `node $BL render <dir> --samples 128 --mp4 motion-out/<slug>/blender.mp4` (the report gives seconds per frame: say it to the user at the start, then run it in the background and tell them how long it will take). `config.json` sets size, samples, seed and the camera.
3. `node $BL check <dir> --frames 1,12` renders those frames twice and compares the **pixels** (Blender stamps render times into PNG files, so the files differ even when the picture does not). It must say identical before you call the piece repeatable. It does when the denoiser is off (the default): **the denoiser is not deterministic** (two renders of one frame differed), so turning `"denoise": true` on buys a cleaner picture with fewer samples but gives up the guarantee; if the user wants it, say so and do not claim frame-exact.

## 4. Say what is and is not guaranteed
Same machine, same Blender version, same config: identical pixels (checked by `check`). Another CPU or Blender version can differ in the last bits, so Blender pieces are **repeatable on one machine, not pixel-identical across machines**, which is weaker than Motionmaker's browser-rendered pieces. Say it in the delivery notes.

## 5. Finish
The MP4 goes through the same finish as other footage: title and end cards with `motionmaker-montage/scripts/montage.mjs finish --film <blender.mp4> --intro <a.mp4> --outro <b.mp4> --out <mp4>` (size, fps and audio matched), voice-over and sound (`motionmaker-sound-export`), `film-gate`, the independent review and `deliver.mjs`. A model's ledger entry carries its credit line into delivery.

## Limits
CPU only (no GPU, no EEVEE here); no character rigs or simulations in the template (write them in `scene.py` and say what they cost); Windows and macOS are untested; the cost above is the real limit.
