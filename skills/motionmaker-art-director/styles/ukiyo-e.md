# Ukiyo-e woodblock print  (`ukiyo-e`)

**Rating:** 2 - recognisable as a woodblock-print homage; the wave is a graphic simplification, not Hokusai's
**Era:** Edo period, 1700s-1850s (Hokusai, Hiroshige). **Font:** young-serif 400 (OFL, bundled by `lib.mjs setup fonts`).
**Good for:** travel, Japan-related subjects, craft and heritage brands, calm-but-dramatic stories, ocean/water topics.

## Recognisable cues (all three must be visible in the poster frame)
- flat colour areas with dark key-block outlines
- Prussian blue sea, a curling wave with claw-like foam, Mount Fuji small and still
- a bokashi (graded) sky band and a rectangular title cartouche with a red seal

## Palette
#ECDDBE paper, #1E3A66 Prussian, #3D6E9E mid, #9DB9CF light, #F6F1E4 foam, #1B2433 key, #5D6E86 Fuji, #B23A2A seal

## Main action (the one hero move)
the cartouche unrolls top to bottom and the headline is printed into it.

## Motif loops (what lives in the picture; every period divides the clip length, so loops close at the seam)
1. the big wave's crest curls and its foam claws reach (3 s)
2. the lower swell rolls through three bands; the boats ride it
3. clouds drift past Fuji, fading in from the wave's edge

## Pitfalls (found while building it)
- claws must hang from the wave's real lip curve (an early version floated them like paper flags)
- clouds cut by a hard clip edge look broken: fade them instead

## Known weaknesses
the wave lacks the fractal foam and internal line work of the original; no figures in the boats.

## Making it yours
Keep the cues and the palette; change the headline, the timing (`e.enter` start/duration in the style file) and the seed (`SEED=`), never the motif mechanics per frame. Brand colours: only where the style allows an accent (the red in Bauhaus/Constructivism, the seal in ukiyo-e); do not repaint a style in brand colours or it stops being that style.
