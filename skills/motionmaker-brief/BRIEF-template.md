# BRIEF.md  (frame-locked; global, inclusive frame numbers; seconds first, then frames)

## 1. Goal
Demonstrate how [product] [does one action]. Viewer: [who uses this feature].
Opening copy: [outcome, max eight words]. Closing copy: [one next action + destination].
Longest copy you expect to reuse (check wrapping against this, not the short one): [ ]

## 2. Delivery and assets
Composition: [name], [W]x[H], [fps] fps, [frames] frames. All timeline numbers are global, inclusive frames.
Assets under public/: [logo] [screen A] [result screen] [font] [audio]
Before building: inspect asset dimensions, confirm the font loads; request missing screens or illegible crops.

## 3. Layout (origin top-left, px)
Background [hex], text [hex], accent [hex]. Essential content inside a [64] px outer margin.
Headline box: x[ ] y[ ] w[ ], [size] px, [lh] line height, max [2] lines.
Product card: x[ ] y[ ] w[ ] h[ ] radius [ ]. Record button/result anchors from the fitted screen.
Layer order: [bottom ... top]. Layout limits: headline width, max lines, logo space, final positions of text + card.

## 4. Timeline (global frames; incoming/outgoing state per scene)
Opening [0-119]: headline enters [0-18] (offset, opacity), card enters [18-42], settled hold [42-119]. Easing: cubic ease-out, clamped.
Product [120-419]: carry the card into f120 at its exact settled position/scale. Cursor [150-180] along a recorded clear path;
  press f195 (cursor scale 1@192 -> 0.92@195 -> 1@201); button response @195; result @210, readable by 234; stationary through 419.
Closing [420-599]: cut at 420; copy fade [420-438]; hold through 599.
Outgoing state of each scene = incoming state of the next (position, scale, highlighted field).

## 5. Implementation and review
Drive values from the frame number; expose timing + layout constants; fixed seeds; camera stationary this pass.
Audio: click on the visible press (f195), reveal hit on f210.
Pass 1: build the opening; render stills [0,18,42,60,119] + moving preview; check wrapping, margins, readability, settled positions; report; WAIT.
After approval: remaining scenes; inspect stills [120,195,234,419,420,540,599]; label scene-local frames explicitly.
