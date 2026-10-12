# Russian Constructivism  (`constructivism`)

**Rating:** 3 - unmistakable
**Era:** 1919-1930s (El Lissitzky, Rodchenko). **Font:** oswald 700 (OFL, bundled by `lib.mjs setup fonts`).
**Good for:** announcements, calls to action, launches with urgency, protest-energy campaigns, bold data claims.

## Recognisable cues (all three must be visible in the poster frame)
- red, black and cream only, steep diagonals
- a red wedge driving into a black circle
- condensed sans in bands; halftone dot texture

## Palette
#E9DFC9 paper, #141414 ink, #C8102E red, #8C8579 grey

## Main action (the one hero move)
the wedge thrusts from the upper left into the circle; the headline snaps along its own diagonal below it, first word red.

## Motif loops (what lives in the picture; every period divides the clip length, so loops close at the seam)
1. the circle turns with its radial marks (8 s)
2. a marquee band repeats the headline along the bottom (a loop)
3. the halftone field breathes

## Pitfalls (found while building it)
- nothing may cross the headline: the circle and the wedge sit above it (an early version cut the type in half)
- red text on the red wedge disappears: keep them apart

## Known weaknesses
the halftone is a regular grid (a real print would be rougher); political iconography is deliberately absent.

## Making it yours
Keep the cues and the palette; change the headline, the timing (`e.enter` start/duration in the style file) and the seed (`SEED=`), never the motif mechanics per frame. Brand colours: only where the style allows an accent (the red in Bauhaus/Constructivism, the seal in ukiyo-e); do not repaint a style in brand colours or it stops being that style.
