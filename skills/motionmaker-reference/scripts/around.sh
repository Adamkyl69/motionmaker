#!/usr/bin/env bash
# usage: around.sh <reference.mp4> <seconds> [before=4] [after=8] [outdir=reference-analysis/around]
# Extracts CONSECUTIVE source frames around an event, named by SOURCE frame number and timestamp, plus a numbered strip.
# Use it for entrance, landing, press, result, cut. Label every timestamp with the source frame rate.
set -euo pipefail
V=${1:?video}; T=${2:?seconds}; B=${3:-4}; A=${4:-8}; O=${5:-reference-analysis/around}; mkdir -p "$O"
FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$V" | awk -F/ '{printf "%.6f",$1/$2}')
F0=$(awk -v t="$T" -v f="$FPS" -v b="$B" 'BEGIN{x=int(t*f+0.5)-b; if(x<0)x=0; print x}'); N=$(( B + A + 1 ))
ffmpeg -loglevel error -y -i "$V" -vf "select='between(n,$F0,$((F0+N-1)))',scale=640:-2,drawtext=text='src f%{eif\\:n+'"$F0"'\\:d}':x=6:y=6:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6" -vsync 0 "$O/t${T}_f%02d.png" 2>/dev/null || \
ffmpeg -loglevel error -y -i "$V" -vf "select='between(n,$F0,$((F0+N-1)))',scale=640:-2" -vsync 0 "$O/t${T}_f%02d.png"
ls "$O"/t${T}_f*.png | wc -l | xargs echo "frames extracted:"; echo "source fps $FPS; frames $F0..$((F0+N-1)) = t ${T}s -$B/+$A frames; one source frame = $(awk -v f=$FPS 'BEGIN{printf "%.1f",1000/f}') ms"
ffmpeg -loglevel error -y -framerate 1 -i "$O/t${T}_f%02d.png" -vf "scale=320:-2,tile=5x$(( (N+4)/5 ))" -frames:v 1 -update 1 "$O/t${T}_strip.png"; echo "$O/t${T}_strip.png"
