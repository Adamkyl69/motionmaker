#!/usr/bin/env bash
# usage: [TEMPLATE=title-loop|three-product|logo-reveal|data-chart|gsap-kinetic|product-demo] [LOOK=<look-name>] \
#        scaffold.sh <slug> "<text>" <width> <height> <fps> <seconds> <bg> <fg> <accent> [outdir=motion-out]
# Creates <outdir>/<slug>/{anim.html,tokens.js,RECEIPTS.md[,vendor/...]} from a starter template.
# LOOK=<name> applies a visual direction from motionmaker-art-director/looks/looks.json (palette, type stack, weight, tracking, entrance timing).
# With LOOK set, pass "-" for bg/fg/accent to take the look's colours; a real hex overrides that one colour (brand colours on a look's typography).
# three-product needs `three` and gsap-kinetic needs `gsap` in ./node_modules (npm i three@0.160.0 gsap@3.12.5) or in $MOTION_VENDOR_SRC.
set -euo pipefail
SLUG=${1:?slug}; TEXT=${2:?text}; W=${3:?w}; H=${4:?h}; FPS=${5:?fps}; SECS=${6:?seconds}; BG=${7:?bg}; FG=${8:?fg}; AC=${9:?accent}; OUT=${10:-motion-out}
TPL=${TEMPLATE:-title-loop}
HERE="$(cd "$(dirname "$0")/.." && pwd)"; SK="$(cd "$HERE/.." && pwd)"
FONT="'Helvetica Neue', Helvetica, Arial, sans-serif"; WEIGHT=800; TRACK=-0.04; INF=14; STAGGER=2; GW=0.52
[ "$TPL" = logo-reveal ] && TRACK=-0.03
if [ -n "${LOOK:-}" ]; then
  LF="$SK/motionmaker-art-director/looks/looks.json"; [ -f "$LF" ] || { echo "LOOK needs the motionmaker-art-director skill installed next to this one ($LF not found)" >&2; exit 4; }
  while IFS=$'\t' read -r k v; do case "$k" in bg) LBG=$v;; fg) LFG=$v;; accent) LAC=$v;; font) FONT=$v;; weight) WEIGHT=$v;; tracking) TRACK=$v;; enter) INF=$v;; stagger) STAGGER=$v;; gw) GW=$v;; esac; done < <(node -e '
    const L=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).looks[process.argv[2]]; if(!L){console.error("unknown look \""+process.argv[2]+"\"");process.exit(5)}
    for (const [k,v] of Object.entries({bg:L.bg,fg:L.fg,accent:L.accent,font:L.font,weight:L.weight,tracking:L.tracking,enter:L.motion.enterFrames,stagger:L.motion.staggerFrames,gw:L.glyphWidth||0.52})) console.log(k+"\t"+v)' "$LF" "$LOOK") || exit 5
  [ -n "${LBG:-}" ] || { echo "unknown look '$LOOK' (see motionmaker-art-director/looks/looks.json)" >&2; exit 5; }
  [ "$BG" = "-" ] && BG=$LBG; [ "$FG" = "-" ] && FG=$LFG; [ "$AC" = "-" ] && AC=$LAC
fi
[ -f "$HERE/templates/$TPL.html" ] || { echo "unknown template '$TPL' (have: $(cd "$HERE/templates" && ls *.html | sed 's/.html//' | tr '\n' ' '))" >&2; exit 1; }
N=$(( FPS * SECS )); LEN=${#TEXT}; WORDS=$(echo "$TEXT" | wc -w)
# Art-direction rule: the letters of a headline must all have arrived within ~1.5 s however long it is. Cap the per-letter stagger (fractional frames are fine).
STAGGER=$(awk -v st="$STAGGER" -v fps="$FPS" -v l="$LEN" 'BEGIN{cap=fps*1.5/l; if(st>cap) st=cap; printf "%.2f", st}')
case "$TPL" in
  title-loop)  EXIT=$(( N - 6 - LEN )); ENT=$(awk -v i="$INF" -v s="$STAGGER" -v l="$LEN" 'BEGIN{printf "%d", i + s * l}');;       # last letter still mid-exit on frame N-1, so the seam frame differs from frame 0
  logo-reveal) EXIT=$(( N - 16 )); ENT=34;;                              # exit (12 f) finishes by frame N-4; ambient hairline keeps frame 0 composed
  data-chart)  EXIT=$(( N - 14 )); ENT=40;;                             # exit (10 f) finishes by frame N-4
  *)           EXIT=0; ENT=0;;
esac
if [ "$EXIT" -gt 0 ] && [ "$EXIT" -lt $(( ENT + 12 )) ]; then
  echo "WARNING: ${SECS}s is too short for this content (entrance ends f$ENT, exit starts f$EXIT, hold < 12 frames): shorten text or lengthen the loop" >&2; fi
FONTPCT=$(awk -v l="$LEN" -v gw="$GW" -v tr="$TRACK" 'BEGIN{t=(tr>0?tr:0); p=0.9/((gw+t)*l); if(p>0.14)p=0.14; printf "%.3f",p}')                 # keep text inside the frame
[ "$TPL" = logo-reveal ] && FONTPCT=$(awk -v l="$LEN" -v gw="$GW" -v tr="$TRACK" 'BEGIN{t=(tr>0?tr:0); p=0.62/((gw+t)*l); if(p>0.11)p=0.11; printf "%.3f",p}')
WORDPX=$(awk -v w="$W" -v c="$LEN" -v gw="$GW" 'BEGIN{p=0.84*w/((gw+0.03)*c); if(p>0.2*w)p=0.2*w; printf "%d",p}'); BARH=$(awk -v h="$H" 'BEGIN{printf "%d",h*0.017<4?4:h*0.017}')
EXITSEC=$(awk -v n="$N" -v f="$FPS" -v wd="$WORDS" 'BEGIN{printf "%.3f", (n-1)/f - 0.05*(wd-1) - 0.2}')
D="$OUT/$SLUG"; mkdir -p "$D"
ESC=$(printf '%s' "$TEXT" | sed 's/[&/\]/\\&/g'); FESC=$(printf '%s' "$FONT" | sed 's/[&/\]/\\&/g')
sed -e "s/__TEXT__/$ESC/g" -e "s/__W__/$W/g" -e "s/__H__/$H/g" -e "s/__FPS__/$FPS/g" -e "s/__N__/$N/g" \
    -e "s/__BG__/$BG/g" -e "s/__FG__/$FG/g" -e "s/__ACCENT__/$AC/g" -e "s/__EXIT__/$EXIT/g" -e "s/__FONTPCT__/$FONTPCT/g" \
    -e "s/__WORDPX__/$WORDPX/g" -e "s/__FONT__/$FESC/g" -e "s/__WEIGHT__/$WEIGHT/g" -e "s/__TRACK__/$TRACK/g" -e "s/__INF__/$INF/g" -e "s/__STAGGER__/$STAGGER/g" -e "s/__BARH__/$BARH/g" -e "s/__EXITSEC__/$EXITSEC/g" \
    "$HERE/templates/$TPL.html" > "$D/anim.html"
cp "$SK/motionmaker-build/scripts/tokens.js" "$D/tokens.js"
find_pkg(){ for r in "${MOTION_VENDOR_SRC:-}" "$PWD/node_modules" "$D/node_modules" "$(dirname "$OUT")/node_modules"; do [ -n "$r" ] && [ -d "$r/$1" ] && { echo "$r/$1"; return; }; done; return 1; }
if [ "$TPL" = three-product ]; then
  P=$(find_pkg three) || { echo "three not found: run  npm i three@0.160.0  (or set MOTION_VENDOR_SRC=<node_modules dir>)" >&2; exit 3; }
  mkdir -p "$D/vendor/addons/environments"; cp "$P/build/three.module.min.js" "$D/vendor/"; cp "$P/examples/jsm/environments/RoomEnvironment.js" "$D/vendor/addons/environments/"
fi
if [ "$TPL" = gsap-kinetic ]; then
  P=$(find_pkg gsap) || { echo "gsap not found: run  npm i gsap@3.12.5  (or set MOTION_VENDOR_SRC=<node_modules dir>)" >&2; exit 3; }
  mkdir -p "$D/vendor"; cp "$P/dist/gsap.min.js" "$D/vendor/"
fi
printf '# Receipts: %s\n\nTemplate: %s\nPrompt: see PROMPT.md\n\n## Follow-ups (exactly as sent)\n\n(none yet)\n' "$SLUG" "$TPL" > "$D/RECEIPTS.md"
echo "$D"
