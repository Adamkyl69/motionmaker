# Van Gogh night sky  (`van-gogh`)

**Rating:** 3 - unmistakable
**Era:** 1889 era (public domain). **Font:** young-serif 400 (OFL, bundled by `lib.mjs setup fonts`).
**Good for:** stories, launches with a dreamy or romantic tone, night/sleep/space products, art and culture.

## Recognisable cues (all three must be visible in the poster frame)
- sky built from short directional strokes that swirl around a few centres
- chrome-yellow stars and moon with stroked halos
- a dark cypress flame in the foreground, a sleeping village with lit windows and a spire

## Palette
#0C1736 deep, #13234A night, #2E5AA8 cobalt, #5E86C9 sky, #A9C3E8 pale, #F2C230 chrome, #F7E27A lemon, #13241A cypress

## Main action (the one hero move)
the headline is painted in, stroke by stroke (strokes sampled from the type's own shape), in chrome and lemon.

## Motif loops (what lives in the picture; every period divides the clip length, so loops close at the seam)
1. the sky turns: every stroke advances along the flow field and loops, so the swirls move but keep their shape
2. star and moon halos pulse outward in rings of strokes
3. the cypress sways from its base

## Pitfalls (found while building it)
- strokes must follow the flow field, never random angles, or it reads as noise
- the ground and village are painted too: a flat fill breaks the illusion (fixed during build)
- do not put a star on the moon

## Known weaknesses
heavy: about 3,000 strokes per frame at 1280x720 (renders fine, previews in a browser may be slow); no figures.

## Making it yours
Keep the cues and the palette; change the headline, the timing (`e.enter` start/duration in the style file) and the seed (`SEED=`), never the motif mechanics per frame. Brand colours: only where the style allows an accent (the red in Bauhaus/Constructivism, the seal in ukiyo-e); do not repaint a style in brand colours or it stops being that style.
