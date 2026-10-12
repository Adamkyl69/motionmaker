#!/usr/bin/env bash
# usage: loudnorm.sh <in.wav> <out.wav> [LUFS=-14] [TP=-1]
# Sparse, transient-heavy synthesized mixes are ~-24 LUFS with ~2 dB of peak headroom, so a plain loudness pass cannot reach -14 LUFS.
# Chain, picked by measuring five candidates on the test mix (result: about -15 LUFS, -1.0 dBTP, every hit >= 8 dB over the bed):
#   compressor (ratio 8, makeup 10) -> limiter -> two-pass EBU R128 loudnorm (ceiling 0.3 dB under target TP) -> final limiter.
# Trade-off: more compression = louder but narrower hit-over-bed (soft chain: -15.5 LUFS but 14 dB over bed). Keep the bed quiet (--bed 0.02; long sparse clips need it lower than short ones).
# Prints the measured result and exits 1 if outside +/-1.5 LU of target or above the true-peak ceiling.
set -euo pipefail
IN=${1:?in}; OUT=${2:?out}; I=${3:--14}; TP=${4:--1}
INT_TP=$(awk -v t="$TP" 'BEGIN{print t-0.3}')                     # loudnorm's own ceiling: small margin for the final limiter
PRE="acompressor=threshold=0.03:ratio=8:attack=2:release=60:makeup=10,alimiter=limit=0.89:attack=2:release=30:level=false"
POST="alimiter=limit=0.84:attack=1:release=20:level=false"   # -1.5 dBFS: leaves room for inter-sample (true-peak) overshoot
M=$(ffmpeg -hide_banner -nostats -i "$IN" -af "$PRE,loudnorm=I=$I:TP=$INT_TP:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
g(){ echo "$M" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -loglevel error -y -i "$IN" -af "$PRE,loudnorm=I=$I:TP=$INT_TP:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset),$POST" -ar 48000 -ac 1 "$OUT"
R=$(ffmpeg -hide_banner -nostats -i "$OUT" -af "loudnorm=I=$I:TP=$TP:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
LU=$(echo "$R" | grep '"input_i"' | sed 's/.*: "\(.*\)".*/\1/'); PK=$(echo "$R" | grep '"input_tp"' | sed 's/.*: "\(.*\)".*/\1/')
echo "$OUT  integrated ${LU} LUFS (target $I)  true peak ${PK} dBTP (ceiling $TP)"
awk -v lu="$LU" -v pk="$PK" -v i="$I" -v tp="$TP" 'BEGIN{ if (lu < i-1.5 || lu > i+1.5 || pk > tp+0.05) { print "FAIL: outside +/-1.5 LU or above true-peak ceiling"; if (lu < i-1.5) print "HINT: the mix is too sparse to reach the target (a few short hits cannot carry -14 LUFS). Add more or longer sounds, or accept the lower level (-16 to -18 LUFS is fine for sound-effect-only clips) and say so."; exit 1 } else print "PASS" }'
