#!/usr/bin/env bash
# usage: [CAPTIONS=captions.srt] export.sh <frames_dir> <fps> <name> [audio.wav]
# Writes <name>.mp4 (H.264 High yuv420p faststart, AAC if audio) and <name>.gif (one palette, X delay trap handled by ffmpeg).
set -euo pipefail
D=${1:?frames dir}; FPS=${2:?fps}; NAME=${3:?name}; AUD=${4:-}
# CAPTIONS=<captions.srt> burns the voice-over captions into the MP4 (not the GIF): for muted feeds and young viewers. For YouTube, upload the
# .srt as a caption track instead (viewers can switch it off). ffmpeg runs from the output folder with the captions copied there: the
# subtitles filter cannot take a Windows path with a drive letter.
ABS(){ case "$1" in /*|?:*) printf '%s' "$1";; *) printf '%s' "$PWD/$1";; esac; }
DA=$(ABS "$D"); NA=$(ABS "$NAME"); IN=(-framerate "$FPS" -i "$DA/f%04d.png"); AO=()
[ -n "$AUD" ] && { IN+=(-i "$(ABS "$AUD")"); AO=(-c:a aac -b:a 192k -shortest); }
VF="pad=ceil(iw/2)*2:ceil(ih/2)*2"
if [ -n "${CAPTIONS:-}" ]; then
  cp "$CAPTIONS" "$NA.captions.srt"
  VF="$VF,subtitles=$(basename "$NA").captions.srt:force_style='FontSize=20,Outline=2,Shadow=0,BorderStyle=1,MarginV=28'"
fi
( cd "$(dirname "$NA")" && ffmpeg -loglevel error -y "${IN[@]}" -vf "$VF" -c:v libx264 -profile:v high -pix_fmt yuv420p ${AO[@]+"${AO[@]}"} -movflags +faststart "$NA.mp4" )
ffmpeg -loglevel error -y -framerate "$FPS" -i "$D/f%04d.png" -vf "split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" -loop 0 "$NAME.gif"
N=$(ls "$D"/f*.png | wc -l)
[ "$N" -gt 350 ] && echo "WARNING: $N frames > 350 (X GIF cap)"
SZ=$(stat -c %s "$NAME.gif"); [ "$SZ" -gt 15728640 ] && echo "WARNING: GIF > 15 MB (X cap)"
echo "$NAME.mp4 $NAME.gif ($N frames)"
