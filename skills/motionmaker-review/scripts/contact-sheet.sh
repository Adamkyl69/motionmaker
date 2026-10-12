#!/usr/bin/env bash
# usage: contact-sheet.sh <frames_dir> [every_n=8] [cols=4] [rows=3] [out=contact.png]
set -euo pipefail
D=${1:?frames dir}; E=${2:-8}; C=${3:-4}; R=${4:-3}; O=${5:-contact.png}
ffmpeg -loglevel error -y -framerate 24 -i "$D/f%04d.png" -vf "select='not(mod(n\,$E))',scale=300:-1,tile=${C}x${R}" -frames:v 1 -update 1 "$O"
echo "$O"
