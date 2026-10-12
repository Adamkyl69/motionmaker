# Corrections (frame-specific, local, executable)

Send each correction with four fields:
1. **Location**: composition/scene, global frame (and scene-local frame if different).
2. **Observed problem**: what is visible, with the frame reference.
3. **Change**: the exact modification and constraints (frames, px, curves).
4. **Keep fixed**: what must not change (press frame, reveal frame, card geometry, copy, audio cues).

Example:
```
Revise the Launch composition using BRIEF.md.
Observed defect: the cursor overlaps the result label at global frame 210.
Change only the cursor's post-press path: start the departure at 204 and reach its resting point by 222; keep 24 px of clearance from the label.
Keep fixed: press at 195, reveal at 210, card geometry, copy, audio cues.
Render stills at 195, 210, 222, 240 and a preview of 180-249. Report changed files and output filenames.
```
Repair loop: observed defect -> one scoped edit -> affected frames -> surrounding scene boundary -> normal-speed playback to confirm.
Priority: missing information and unreadable text first, then timing, then visual detail. Review at most five frame-specific corrections per round.
Independent critique: a second session gets the brief, the images and the extracted frames only.
Scene-local vs global: local frame 30 in a sequence starting at global 120 is global 150. Always say which.
