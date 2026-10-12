---
name: motionmaker-sound-export
description: Add synthesized sound (Web Audio API, no samples, frame-synced) and export animations to MP4/GIF for X with correct limits, sizes, loudness and loop handling. Use when the user wants sound, a GIF/MP4, or to post an animation.
---

# Sound and export

## Sound (optional; the picture must work muted first)
- Claude cannot hear: score from frame numbers, synthesize every sound in code (Web Audio API / OfflineAudioContext), render to WAV, verify by decoding the output and lining each hit up with its frame.
- Sync: each audio hit peaks **1 frame after** its picture (light beats sound). A sound before its picture feels wrong sooner than one slightly late.
- Mix music + SFX, normalize to **-14 LUFS**, peaks <= **-1 dBTP**. Keep energy above ~60 Hz (phone speakers play nothing below). Make hits clearly over the bed (several dB, not 0.5-1.6).
- Known traps: Web Audio gain nodes start at full volume (ramp from 0); a compressor adds ~6 ms delay; limiter can squash the final hit; codecs add ~16 ms padding at the seam (trim/compensate); beat times from `n*60/BPM`, rounded per beat.
- Check: `ffmpeg -i out.mp4 -af loudnorm=print_format=summary -f null -`.

## Export for X
- Canvas first: 1920x1080 (16:9), 1080x1080 (1:1, safest in feed), 1080x1350 (4:5), 1080x1920 (9:16); X accepts 1:3 to 3:1.
- MP4: H.264 High, yuv420p, AAC, up to 60 fps, up to 140 s (no Premium), faststart.
- GIF: <= 15 MB, <= 1280x1080, <= 350 frames, 12-24 fps, one palette. At 24 fps 350 frames ~ 14.5 s.
- GIF delay trap: delays are hundredths of a second; 24 fps = 41.7 ms. Rounding all to 40 ms runs 4% fast; use five frames at 40 ms then one at 50 ms (ffmpeg's gif muxer handles this when given -framerate 24).
- Loop: frames 0..N-1 only; frame 0 finished composition.

Run: `scripts/export.sh out/frames 24 out/launch-day [audio.wav]`.
