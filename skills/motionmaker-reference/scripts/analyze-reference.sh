#!/usr/bin/env bash
# usage: analyze-reference.sh <reference.mp4> [outdir=reference-analysis]
# 1) reports dimensions / fps / duration / frame count with ffprobe  2) extracts an overview at 2 images per second (960 px wide)
# 3) builds a numbered contact sheet of the overview for a first look.  Next: around.sh for consecutive frames at key events.
set -euo pipefail
V=${1:?video}; O=${2:-reference-analysis}; mkdir -p "$O/overview"
J=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,duration,codec_name -show_entries format=duration -of json "$V")
echo "$J" > "$O/probe.json"
node -e '
const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")), s=j.streams[0], [n,d]=s.r_frame_rate.split("/").map(Number), fps=n/d, dur=+(s.duration||j.format.duration);
console.log(`dimensions: ${s.width}x${s.height}\nframe rate: ${s.r_frame_rate} (${fps.toFixed(3)} fps)\nduration: ${dur.toFixed(3)} s\nframes: ${s.nb_frames||Math.round(dur*fps)} (${s.nb_frames?"counted":"estimated"})\ncodec: ${s.codec_name}`);
' "$O/probe.json" | tee "$O/summary.txt"
ffmpeg -loglevel error -y -i "$V" -vf "fps=2,scale=960:-2" -q:v 3 "$O/overview/ov-%04d.jpg"
N=$(ls "$O/overview" | wc -l); echo "overview: $N images at 2/s (image k is at t=(k-1)/2 s) -> $O/overview"
COLS=6; ROWS=$(( (N + COLS - 1) / COLS ))
ffmpeg -loglevel error -y -framerate 1 -i "$O/overview/ov-%04d.jpg" -vf "scale=320:-2,drawtext=text='%{n}':x=4:y=4:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6,tile=${COLS}x${ROWS}" -frames:v 1 -update 1 "$O/overview-sheet.jpg" 2>/dev/null || \
ffmpeg -loglevel error -y -framerate 1 -i "$O/overview/ov-%04d.jpg" -vf "scale=320:-2,tile=${COLS}x${ROWS}" -frames:v 1 -update 1 "$O/overview-sheet.jpg"
echo "$O/overview-sheet.jpg (tile index k = overview image k+1; time = k/2 s)"
