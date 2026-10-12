#!/usr/bin/env bash
# usage: export.sh <frames_dir> <fps> <name> [audio.wav]
# Writes <name>.mp4 (H.264 High yuv420p faststart, AAC if audio) and <name>.gif (one palette, X delay trap handled by ffmpeg).
set -euo pipefail
D=${1:?frames dir}; FPS=${2:?fps}; NAME=${3:?name}; AUD=${4:-}
if [ -n "$AUD" ]; then
  ffmpeg -loglevel error -y -framerate "$FPS" -i "$D/f%04d.png" -i "$AUD" -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" -c:v libx264 -profile:v high -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "$NAME.mp4"
else
  ffmpeg -loglevel error -y -framerate "$FPS" -i "$D/f%04d.png" -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" -c:v libx264 -profile:v high -pix_fmt yuv420p -movflags +faststart "$NAME.mp4"
fi
ffmpeg -loglevel error -y -framerate "$FPS" -i "$D/f%04d.png" -vf "split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" -loop 0 "$NAME.gif"
N=$(ls "$D"/f*.png | wc -l)
[ "$N" -gt 350 ] && echo "WARNING: $N frames > 350 (X GIF cap)"
SZ=$(stat -c %s "$NAME.gif"); [ "$SZ" -gt 15728640 ] && echo "WARNING: GIF > 15 MB (X cap)"
echo "$NAME.mp4 $NAME.gif ($N frames)"
