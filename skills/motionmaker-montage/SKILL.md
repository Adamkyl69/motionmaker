---
name: motionmaker-montage
description: The route for videos Motionmaker does not draw itself: trailers and cinematic scenes made with AI video models, documentaries cut from real stock and archive footage, narrated explainers with a synthetic voice, avatars and talking heads, podcast clips, dubbing. It hands the job to OpenMontage (a separately installed, AGPLv3 agentic video studio) with our art-direction brief, budget cap and approval gates, then imports the finished film with its asset provenance and finishes it here (title and end cards, film gate, independent review, sealed delivery). Use when the user wants real footage, generated video, voice-over, avatars or editing of their own recordings, or mentions OpenMontage.
---

# Montage: hand footage-heavy work to OpenMontage, finish it here

Motionmaker draws motion graphics in code (frame-exact, free to render). Some requests need things code cannot draw: live-action-looking scenes, archive footage, a voice, a presenter. OpenMontage (github.com/calesthio/OpenMontage) does those with web research, stock sources and paid AI providers. This skill is the bridge. Paths: `MT=$MOTIONMAKER_SKILLS/motionmaker-montage/scripts/montage.mjs`.

## 1. Route (onboarding)
`node $MT route "<the user's request>"` says which side should make it and why. If it is OpenMontage, tell the user in plain words BEFORE anything else:
- It is a **separate install** that they run themselves (`git clone https://github.com/calesthio/OpenMontage && cd OpenMontage && make setup && make preflight`): Python 3.10+, Node 18+ (HyperFrames needs 22+), ffmpeg; optional GPU stack.
- **Licence: AGPLv3.** Using it is fine; Motionmaker never copies its code. If they modify it and offer it as a network service, AGPL obligations apply.
- **Cost:** free paths exist (Piper voice, Archive.org/NASA/Wikimedia, Pexels/Pixabay with free keys, Remotion); real generated motion needs paid models (OpenMontage's own docs quote e.g. Veo about $0.40 per second, Kling about $0.07 per second). Its defaults: $10 cap, approval for any action over $0.50.
- **Data:** prompts, scripts, images and voice text go to the providers whose keys they configure; research uses live web search.
- **Safety:** some OpenMontage tools run code the model writes (Manim) behind a denylist its own comments say is not a sandbox; our handoff prompt forbids `allow_unsafe_code`.
- **Remotion** (one of its renderers) needs a paid company licence above a small company size.
Then ask (AskUserQuestion): **Go with OpenMontage** | **Do it as motion graphics instead** (say what Motionmaker can make for the same message) | **Free providers only**.

## 2. Check and hand off
- `node $MT check <their OpenMontage folder>` (files only; never reads `.env`).
- The art director still runs onboarding: creative brief, look or art style, AD-BRIEF.md. Then
  `node $MT handoff --dir motion-out/<slug> --pipeline <name> --budget <usd> [--free-only] --size WxH --secs N`
  writes `OPENMONTAGE-HANDOFF.md`: the prompt for a **new Claude Code session opened in their OpenMontage folder** (its AGENT_GUIDE.md rules apply there, ours here; do not run its pipeline from this session). The prompt carries the message, palette, tone and bans, the budget cap, "stop at every gate", provenance recording, no downloads of others' content, no unsafe code, and a clean 3-second tail for our end card.
- The user answers OpenMontage's gates in that session. Pipelines: cinematic, documentary-montage (beta), animated-explainer, avatar-spokesperson, talking-head (beta), podcast-repurpose (beta), clip-factory (beta), localization-dub (beta), screen-demo, character-animation (beta), hybrid.

## 3. Import, finish, deliver
1. `node $MT import <OpenMontage>/projects/<id> --dir motion-out/<slug>` copies `renders/final.mp4` to `montage/` and turns `artifacts/asset_manifest.json` into `montage/PROVENANCE.md/.json`: RED for assets with no licence or a non-commercial one, YELLOW for required attributions; the cost from `cost_log.json`.
2. Make our cards with any template at the film's size (title card, end card with the claim and the credits), then `node $MT finish --film montage/final.mp4 --intro title.mp4 --outro endcard.mp4 --out out/final.mp4` (matches size, fps and audio).
3. The usual quality path, unchanged: `film-gate.mjs`, `review-pack.mjs` + an independent reviewer, `deliver.mjs` (which also blocks on RED provenance).

## Limits (say them)
- This bridge was tested against OpenMontage's documented project layout and manifest schema with a mock project, not with a live OpenMontage run (installing it here was not possible). The first real run is the real test: if its folders differ, `import` says what is missing.
- Quality and cost of generated footage depend on the providers the user pays for; Motionmaker cannot preview it before the OpenMontage run.
- Provenance is only as good as what the OpenMontage run recorded in its manifest.
