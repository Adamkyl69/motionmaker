#!/usr/bin/env bash
# The quick tests an art director runs by eye, as one image to Read:
#   original | grayscale (does hierarchy survive without colour?) | squint (blurred: what do you see first?) | thumbnail (phone-size legibility)
# usage: looktests.sh <still.png> [out.png]
set -euo pipefail
IN=${1:?still.png}; OUT=${2:-looktests.png}
ffmpeg -loglevel error -y -i "$IN" -filter_complex "
[0]split=4[a][b][c][d];
[a]scale=360:-2[o];
[b]format=gray,scale=360:-2,format=rgb24[g];
[c]scale=360:-2,gblur=sigma=9,format=rgb24[s];
[d]scale=90:-2:flags=area,scale=360:-2:flags=neighbor[t];
[o][g][s][t]hstack=4" -frames:v 1 -update 1 "$OUT"
echo "$OUT  (left to right: original | grayscale | squint | phone thumbnail)"
