#!/usr/bin/env bash
# usage: probe.sh <video.mp4> <width> <height> <fps> <seconds> [audio=auto]
# Verifies the EXPORTED file (not the project): size, frame rate (e.g. 30/1), duration (+/-0.1 s), codec, pixel format, audio stream.
set -euo pipefail
F=${1:?file}; W=${2:?w}; H=${3:?h}; FPS=${4:?fps}; S=${5:?seconds}; AUD=${6:-auto}; bad=0
v(){ ffprobe -v error -select_streams v:0 -show_entries stream=$1 -of csv=p=0 "$F"; }
chk(){ if [ "$2" = "$3" ]; then echo "PASS  $1 = $2"; else echo "FAIL  $1 = $2 (expected $3)"; bad=1; fi; }
chk size "$(v width)x$(v height)" "${W}x${H}"; chk "frame rate" "$(v r_frame_rate)" "$FPS/1"; chk codec "$(v codec_name)" h264; chk "pixel format" "$(v pix_fmt)" yuv420p
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F"); if awk -v d="$D" -v s="$S" 'BEGIN{exit !(d>s-0.1 && d<s+0.1)}'; then echo "PASS  duration = ${D}s"; else echo "FAIL  duration = ${D}s (expected ~${S}s)"; bad=1; fi
A=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$F" || true)
if [ "$AUD" = yes ] && [ -z "$A" ]; then echo "FAIL  no audio stream"; bad=1; else echo "INFO  audio: ${A:-none}"; fi
FS=$(ffprobe -v error -show_entries format=size -of csv=p=0 "$F"); echo "INFO  size $(( FS/1024 )) KB; watch it at normal speed before approving"
exit $bad
