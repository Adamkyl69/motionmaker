# Bauhaus  (`bauhaus`)

**Rating:** 3 - recognisable at a glance in all three formats
**Era:** 1919-1933 (Dessau/Weimar school; public domain style). **Font:** poppins 800 (OFL, bundled by `lib.mjs setup fonts`).
**Good for:** product launches, design and architecture, data, anything that wants order and confidence.

## Recognisable cues (all three must be visible in the poster frame)
- primary red/yellow/blue + black on aged off-white paper
- circle, square, triangle and heavy bars; nothing curvy
- geometric sans (Poppins 800) set on a slight diagonal, all caps

## Palette
#EDE5D3 paper, #171615 ink, #D3262B red, #2A58B4 blue, #EFC12F yellow

## Main action (the one hero move)
a heavy black bar slides in on a diagonal and the headline rides on it; the shapes snap into place around it.

## Motif loops (what lives in the picture; every period divides the clip length, so loops close at the seam)
1. the black pointer bar sweeps around the red circle like a dial (6 s period)
2. the 3x3 grid recolours in steps (4 per second, non-mechanical pattern): printed, not digital
3. concentric arcs breathe out of the circle

## Pitfalls (found while building it)
- tall/square layouts centre the headline across the middle; landscape anchors it left between circle and grid: keep the type clear of the grid
- black in the recolour pool reads as a broken cell (kept out)

## Known weaknesses
no characters; the grid cells are evenly sized (a real Bauhaus poster would vary them).

## Making it yours
Keep the cues and the palette; change the headline, the timing (`e.enter` start/duration in the style file) and the seed (`SEED=`), never the motif mechanics per frame. Brand colours: only where the style allows an accent (the red in Bauhaus/Constructivism, the seal in ukiyo-e); do not repaint a style in brand colours or it stops being that style.
