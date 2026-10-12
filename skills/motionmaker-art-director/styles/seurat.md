# Seurat pointillism  (`seurat`)

**Rating:** 3 - reads as pointillism immediately
**Era:** 1880s (public domain). **Font:** playfair-display 700 (OFL, bundled by `lib.mjs setup fonts`).
**Good for:** leisure, travel, outdoors, slow and luminous moods, premium lifestyle.

## Recognisable cues (all three must be visible in the poster frame)
- everything made of small dots of nearly pure colour that the eye mixes
- sunny riverside park, cream light, no outlines
- a sailboat, two dark trees, a pale sun

## Palette
#BFD7E8 sky, #F3E6C4 cream, #4E8DB3 water, #2E5E8C deep, #6E9E4A grass, #2F5D3A tree, #F6D57A sun, #24345C ink

## Main action (the one hero move)
the headline condenses out of dots (ink, deep blue and a few vermilion), on a soft cream band so it stays readable.

## Motif loops (what lives in the picture; every period divides the clip length, so loops close at the seam)
1. about 15% of the dots twinkle between two hues, stepped at 8 fps (light on water and grass)
2. the sailboat drifts and bobs on the river (a closed loop)
3. the sun's halo of dots brightens outward

## Pitfalls (found while building it)
- dots must be divided colour (hue-shifted, more saturated), not the underpainting colour, or it looks like a blurred photo
- text made of dots needs dense, small dots and a light band behind it to be legible

## Known weaknesses
no figures (the famous parasols are people); dot size is uniform.

## Making it yours
Keep the cues and the palette; change the headline, the timing (`e.enter` start/duration in the style file) and the seed (`SEED=`), never the motif mechanics per frame. Brand colours: only where the style allows an accent (the red in Bauhaus/Constructivism, the seal in ukiyo-e); do not repaint a style in brand colours or it stops being that style.
