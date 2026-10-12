# Art director's critique checklist

Run on stills (the poster frame, the hero frame, one frame per shot) and again on the moving piece. Look at the images yourself; the tools only measure.

## A. Tools first (cheap, objective)
1. `node scripts/critique.mjs <stills...>`: contrast, margins, negative space, visual weight, competing focal points.
2. `bash scripts/looktests.sh <still.png>`: original | grayscale | squint | phone thumbnail. **Read the image.**
3. `node scripts/palette.mjs check <bg> <fg> <accent>` after any palette change.
4. `node scripts/type-scale.mjs <width> --chars <longest copy>` after any copy change.

## B. The looks (judgement, in this order)
| Test | Question | Fail looks like |
|---|---|---|
| 3 seconds | Can a stranger say what this is and what to do in 3 s? | needs explaining |
| Squint (blurred) | What do you see first, second? Is that the intended order? | the hero is not the brightest/biggest/most isolated thing |
| Grayscale | Does the hierarchy survive without colour? | everything the same grey |
| Thumbnail | Is the key text readable at phone size? | the type turns to mush |
| Mute | Does it work without sound? | the message lives only in audio |
| Freeze frame | Could any frame in the hold be the poster? | frames look unfinished or cropped |
| One idea | Is there exactly one hero move/message per shot? | two things compete |
| Restraint | What could be removed? Remove 20% and look again. | decoration that does no job |

## C. Consistency (a system, not a collection)
- Same margins, same type roles (label / headline / display), same easing family, same corner radius, same accent usage in every shot.
- Brand: logo clear space and size respected, brand colours exact (hex), no look-alike fonts.
- Does shot 3 look like it belongs to shot 1? Does the colour arc make sense (setup to payoff)?

## D. Motion craft
- Every move has a reason (directs the eye / shows cause and effect / sets rhythm). List each move and write the reason; delete any without one.
- Hero first, secondary 100-200 ms later and smaller; ambient under 5%; nothing moves while the viewer is reading.
- Anticipation on the hero, settle on arrival, no easing that is linear except rotation and progress.
- Holds long enough to read (0.3 s per word + 0.5 s); the payoff gets the longest hold.
- Rhythm: fast and slow contrast; cuts on the beat; the layout changes on the bar, not on every beat.
- Seams: first and last frame differ and flow (loops); scene boundaries carry position/scale/highlight.

## E. Platform and delivery
- Safe margins for the target (5%; 9:16 about 12% top and bottom clear), no flashing over 3 per second, first frame works as a thumbnail, file limits met.

## F. Sign-off
The AD names the **poster frame** (the single frame that sells it), says in one sentence what the piece is about, and lists any compromise the user accepted. If the one-sentence answer is not the brief's single-minded message, the piece is not done.

## How to phrase a note
Frame number, what you see, why it matters, what to change, what stays: "Frame 84: the label (24 px) and the cursor tip overlap, so the eye has two targets. Move the label 40 px up. The press at 195 and the layout stay."
