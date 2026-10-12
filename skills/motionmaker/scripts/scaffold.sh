#!/usr/bin/env bash
# usage: [TEMPLATE=title-loop|three-product|logo-reveal|data-chart|gsap-kinetic|product-demo|lottie-scene|rive-scene|illustration-scene|footage-scene|code-reveal|icon-features|equation-scene|map-scene|annotate-scene|style-scene] [LOOK=<look-name>] [STYLE=<id>] [MARK= KEYWORD= SEED=] [PLACES=.. HIGHLIGHT=..] [TEX=..] [ICONS=set:name,..] [CODE=<file> MODE= FOCUS=] [FOOTAGE=<video> FROM= TO=] [ASSET=<file>] [ARTBOARD=..] [ANIMATION=..] [LOOP=1] \
#        scaffold.sh <slug> "<text>" <width> <height> <fps> <seconds> <bg> <fg> <accent> [outdir=motion-out]
# Creates <outdir>/<slug>/{anim.html,tokens.js,RECEIPTS.md[,vendor/...]} from a starter template.
# LOOK=<name> applies a visual direction from motionmaker-art-director/looks/looks.json (palette, type stack, weight, tracking, entrance timing).
# With LOOK set, pass "-" for bg/fg/accent to take the look's colours; a real hex overrides that one colour (brand colours on a look's typography).
# lottie-scene / rive-scene / illustration-scene need ASSET=<file> (.json Lottie, .riv Rive, .svg figure). The file is inspected (BLOCK stops the build), copied to <slug>/assets/, and must then be recorded with
#   motionmaker-assets/scripts/ledger.mjs. Caption "-" = no caption. The Lottie/Rive runtimes come from the kit cache (node motionmaker-assets/scripts/kit.mjs setup) or ./node_modules.
# three-product needs `three` and gsap-kinetic needs `gsap` in ./node_modules (npm i three@0.160.0 gsap@3.12.5) or in $MOTION_VENDOR_SRC.
set -euo pipefail
SLUG=${1:?slug}; TEXT=${2:?text}; W=${3:?w}; H=${4:?h}; FPS=${5:?fps}; SECS=${6:?seconds}; BG=${7:?bg}; FG=${8:?fg}; AC=${9:?accent}; OUT=${10:-motion-out}
TPL=${TEMPLATE:-title-loop}
HERE="$(cd "$(dirname "$0")/.." && pwd)"; SK="$(cd "$HERE/.." && pwd)"
D="$OUT/$SLUG"
find_pkg(){ for r in "${MOTION_VENDOR_SRC:-}" "$PWD/node_modules" "$D/node_modules" "$(dirname "$OUT")/node_modules" "${MOTIONMAKER_KITS:-$HOME/.cache/motionmaker/kits}/node_modules"; do [ -n "$r" ] && [ -d "$r/$1" ] && { echo "$r/$1"; return; }; done; return 1; }
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
# Bundled font: with a LOOK, ship the look's own font (OFL, from `motionmaker-libs/scripts/lib.mjs setup fonts`) so type is identical on every machine.
# FONTS=0 keeps the system stack. Without the font package installed, the system stack is used and a note says how to install it.
D="$OUT/$SLUG"; FONTLINK=""
if [ -n "${LOOK:-}" ] && [ "${FONTS:-1}" != 0 ] && [ -f "$SK/motionmaker-libs/scripts/fonts.mjs" ]; then
  if FJ=$(node "$SK/motionmaker-libs/scripts/fonts.mjs" apply --look "$LOOK" --dir "$D" 2>/dev/null); then
    FONT=$(echo "$FJ" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0,"utf8")).stack)'); GW=$(echo "$FJ" | node -e 'console.log(JSON.parse(require("fs").readFileSync(0,"utf8")).glyphWidth)'); FONTLINK=1
  else echo "note: using system fonts for '$LOOK' (for identical type everywhere: node $SK/motionmaker-libs/scripts/lib.mjs setup fonts)" >&2; fi
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
D="$OUT/$SLUG"
if [ "$TPL" = style-scene ]; then
  STYLE=${STYLE:?"style-scene needs STYLE=<id> (see motionmaker-art-director/styles/INDEX.md)"}; SF="$HERE/templates/styles/$STYLE.js"
  [ -f "$SF" ] || { echo "unknown style '$STYLE' (have: $(cd "$HERE/templates/styles" && ls *.js | sed 's/.js//' | tr '\n' ' '))" >&2; exit 6; }
  mkdir -p "$D"; cp "$SF" "$D/style.js"; SEED=${SEED:-7}; EXIT=$(( N - 10 ))
  SJ="$SK/motionmaker-art-director/styles/styles.json"
  if [ -f "$SJ" ]; then FSPEC=$(node -e 'const s=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).styles[process.argv[2]];if(s&&s.font)console.log(s.font.package+" "+s.font.weight)' "$SJ" "$STYLE")
    if [ -n "$FSPEC" ]; then node "$SK/motionmaker-libs/scripts/fonts.mjs" add $FSPEC --dir "$D" >/dev/null 2>&1 && FONTLINK=1 || echo "note: style font not installed, using fallbacks (node $SK/motionmaker-libs/scripts/lib.mjs setup fonts)" >&2; fi; fi
fi
if [ "$TPL" = annotate-scene ]; then
  P=$(find_pkg roughjs) || { echo "roughjs not found: run  node $SK/motionmaker-libs/scripts/lib.mjs setup sketch" >&2; exit 3; }
  mkdir -p "$D/vendor"; cp "$P/bundled/rough.js" "$D/vendor/rough.js"; MARK=${MARK:-circle}
  case "$MARK" in circle|underline|box|highlight|strike|arrow) ;; *) echo "MARK must be circle|underline|box|highlight|strike|arrow" >&2; exit 6;; esac
  KEYWORD=${KEYWORD:-}; SEED=${SEED:-7}; EXIT=$(( N - 10 ))
fi
if [ "$TPL" = map-scene ]; then
  PLACES=${PLACES:?"map-scene needs PLACES='Name@lat,lon;Name@lat,lon;...' (1 to 6 stops, in travel order; optional HIGHLIGHT='Country,Country' using Natural Earth names)"}
  for pk in d3 topojson-client world-atlas; do find_pkg $pk >/dev/null || { echo "$pk not found: run  node $SK/motionmaker-libs/scripts/lib.mjs setup maps" >&2; exit 3; }; done
  mkdir -p "$D/vendor"; cp "$(find_pkg d3)/dist/d3.min.js" "$(find_pkg topojson-client)/dist/topojson-client.min.js" "$(find_pkg world-atlas)/countries-110m.json" "$D/vendor/"
  PLACES="$PLACES" HIGHLIGHT="${HIGHLIGHT:-}" node -e '
    const fs=require("fs"), names=JSON.parse(fs.readFileSync(process.argv[1],"utf8")).objects.countries.geometries.map(g=>g.properties.name);
    const places=process.env.PLACES.split(";").filter(Boolean).map(s=>{const m=s.match(/^(.*)@\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*$/); if(!m){console.error(`bad place "${s}" (use Name@lat,lon)`);process.exit(6)} const lat=+m[2],lon=+m[3]; if(Math.abs(lat)>90||Math.abs(lon)>180){console.error("out of range: "+s);process.exit(6)} return {name:m[1].trim(),lat,lon}});
    if(!places.length||places.length>6){console.error("PLACES: give 1 to 6 stops");process.exit(6)}
    const AL={"usa":"United States of America","us":"United States of America","united states":"United States of America","america":"United States of America","uk":"United Kingdom","great britain":"United Kingdom","britain":"United Kingdom","england":"United Kingdom","czech republic":"Czechia","turkiye":"Turkey","türkiye":"Turkey","uae":"United Arab Emirates","korea":"South Korea","holland":"Netherlands","drc":"Dem. Rep. Congo"};
    const hl=process.env.HIGHLIGHT.split(",").map(s=>s.trim()).filter(Boolean).map(h=>AL[h.toLowerCase()]||h), bad=hl.filter(h=>!names.includes(h));
    if(bad.length){console.error("unknown country name(s): "+bad.join(", ")+". Natural Earth names, e.g. "+bad.map(b=>names.filter(n=>n.toLowerCase().includes(b.toLowerCase().slice(0,4))).slice(0,3).join(" / ")||"(no close match)").join("; "));process.exit(6)}
    fs.writeFileSync(process.argv[2], JSON.stringify({places,highlight:hl},null,1));' "$D/vendor/countries-110m.json" "$D/map.json" || exit 6
  EXIT=$(( N - 10 ))
fi
if [ "$TPL" = equation-scene ]; then
  TEX=${TEX:?"equation-scene needs TEX='<TeX>' (wrap the key part in \\htmlClass{hl}{...})"}
  MX="$SK/motionmaker-libs/scripts/math.mjs"; [ -f "$MX" ] || { echo "equation-scene needs the motionmaker-libs skill next to this one" >&2; exit 4; }
  mkdir -p "$D"; node "$MX" render "$TEX" --dir "$D" >/dev/null || exit $?; EXIT=$(( N - 10 ))
fi
if [ "$TPL" = icon-features ]; then
  ICONS=${ICONS:?"icon-features needs ICONS=set:name,set:name,... (2 to 4; e.g. lucide:zap,lucide:shield-check,lucide:rocket) and labels in the text separated by |"}
  IX="$SK/motionmaker-libs/scripts/icons.mjs"; [ -f "$IX" ] || { echo "icon-features needs the motionmaker-libs skill next to this one" >&2; exit 4; }
  mkdir -p "$D/assets"; IFS=',' read -ra ICL <<<"$ICONS"; [ ${#ICL[@]} -ge 1 ] && [ ${#ICL[@]} -le 4 ] || { echo "ICONS: give 1 to 4 icons" >&2; exit 6; }
  FJSON="["; i=0; for ic in "${ICL[@]}"; do i=$((i+1)); ic=$(echo "$ic" | tr -d ' '); spec=${ic%%@*}; sty=""; [ "$spec" != "$ic" ] && sty=${ic#*@}
    fn="icon-$i-$(echo "$spec" | tr ':' '-').svg"; node "$IX" get "$spec" ${sty:+--style "$sty"} --out "$D/assets/$fn" >/dev/null || exit 6
    node "$SK/motionmaker-assets/scripts/ledger.mjs" sidecar "$D/assets/$fn.json" --dir "$D" >/dev/null; FJSON="$FJSON{\"icon\":\"assets/$fn\"},"; done
  printf '%s' "${FJSON%,}]" > "$D/features.json"; EXIT=$(( N - 10 ))
fi
if [ "$TPL" = code-reveal ]; then
  CODE=${CODE:?"code-reveal needs CODE=<source file> (optional CODE_LANG=ts CODE_LINES=3-18 MODE=type|lines FOCUS=4-6 CODE_THEME=<shiki theme>)"}; [ -f "$CODE" ] || { echo "CODE not found: $CODE" >&2; exit 6; }
  CX="$SK/motionmaker-libs/scripts/code.mjs"; [ -f "$CX" ] || { echo "code-reveal needs the motionmaker-libs skill next to this one" >&2; exit 4; }
  mkdir -p "$D"; node "$CX" tokens "$CODE" --out "$D/code.json" ${CODE_LANG:+--lang "$CODE_LANG"} ${CODE_LINES:+--lines "$CODE_LINES"} ${CODE_THEME:+--theme "$CODE_THEME"} ${LOOK:+--look "$LOOK"} >&2 || exit $?
  node "$SK/motionmaker-libs/scripts/fonts.mjs" add jetbrains-mono 400 --dir "$D" >/dev/null 2>&1 && FONTLINK=1 || echo "note: code uses the system monospace font (node $SK/motionmaker-libs/scripts/lib.mjs setup fonts for JetBrains Mono)" >&2
  EXIT=$(( N - 10 )); MODE=${MODE:-type}; FOCUS=${FOCUS:-}
fi
if [ "$TPL" = footage-scene ]; then
  FOOTAGE=${FOOTAGE:?"footage-scene needs FOOTAGE=<video file> (a screen recording or clip; optional FROM=<s> TO=<s> to trim)"}; [ -f "$FOOTAGE" ] || { echo "FOOTAGE not found: $FOOTAGE" >&2; exit 6; }
  FX="$SK/motionmaker-assets/scripts/footage.mjs"; [ -f "$FX" ] || { echo "footage-scene needs the motionmaker-assets skill next to this one" >&2; exit 4; }
  if [ ! -f "$D/footage/footage.json" ]; then node "$FX" extract "$FOOTAGE" --dir "$D" --fps "$FPS" ${FROM:+--from "$FROM"} ${TO:+--to "$TO"} --width "${FOOTAGE_WIDTH:-$(( W * 3 / 2 ))}" >/dev/null || exit 6; fi
  EXIT=$(( N - 10 ))
  echo "Footage: frames in $D/footage/ (record it: ledger.mjs add <video> --license USER-OWNED --dir $D, after checking it shows nothing private)" >&2
fi
case "$TPL" in lottie-scene|rive-scene|illustration-scene)
  ASSET=${ASSET:?"$TPL needs ASSET=<file> (.json Lottie / .riv Rive / .svg figure). Find and vet one with the motionmaker-assets skill"}; [ -f "$ASSET" ] || { echo "ASSET not found: $ASSET" >&2; exit 6; }
  INSPECT="$SK/motionmaker-assets/scripts/inspect-asset.mjs"; [ -f "$INSPECT" ] || { echo "asset templates need the motionmaker-assets skill installed next to this one ($INSPECT not found)" >&2; exit 4; }
  IJ=$(node "$INSPECT" "$ASSET" --json) && IRC=0 || IRC=$?; if [ "$IRC" -eq 2 ]; then echo "$IJ" | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));r.block.forEach(b=>console.error("BLOCK "+b))'; echo "ASSET blocked (untrusted content). Fix the asset, or review it yourself and re-run with ALLOW_UNSAFE_ASSET=1" >&2; [ "${ALLOW_UNSAFE_ASSET:-}" = 1 ] || exit 7; fi
  ABASE=$(basename "$ASSET" | tr -c 'A-Za-z0-9._\n-' '_'); ASSETFILE="assets/$ABASE"; mkdir -p "$D/assets"; cp "$ASSET" "$D/assets/$ABASE"
  LOOPF=${LOOP:-0}; ASSETSEC=0; AB=${ARTBOARD:-}; AN=${ANIMATION:-}
  if [ "$TPL" = lottie-scene ]; then ASSETSEC=$(echo "$IJ" | node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(r.facts.durationSeconds||0)'); fi
  if [ "$TPL" = rive-scene ]; then
    RV=$(echo "$IJ" | AB="$AB" AN="$AN" node -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8")),ab=r.facts.artboards||[];const a=ab.find(x=>x.name===process.env.AB)||ab[0];if(!a){console.log("\t\t0");process.exit()}const n=a.animations.find(x=>x.name===process.env.AN)||a.animations[0];console.log([a.name,n?n.name:"",n?n.seconds:0].join("\t"))')
    IFS=$'\t' read -r AB AN ASSETSEC <<<"$RV"; [ -n "$AN" ] || { echo "no linear animation found in $ASSET (state machines are not frame-stepped): pick a file with a timeline animation" >&2; exit 8; }
  fi
  if [ "$TPL" != illustration-scene ]; then
    awk -v d="$ASSETSEC" 'BEGIN{exit !(d>0)}' || { echo "could not read the asset duration" >&2; exit 8; }
    [ "$LOOPF" = 1 ] && awk -v s="$SECS" -v d="$ASSETSEC" 'BEGIN{r=s/d; if (r-int(r+0.5) > 0.02 || int(r+0.5)-r > 0.02) exit 0; exit 1}' && echo "WARNING: LOOP=1 but ${SECS}s is not a whole multiple of the asset's ${ASSETSEC}s: the animation will jump at the loop point. Set the length to ${ASSETSEC}s (one cycle) or a multiple of it, or use LOOP=0 to play once and hold" >&2
  fi
  IDLESEC=$(awk -v s="$SECS" 'BEGIN{k=int(s/2.4+0.5); if(k<1)k=1; printf "%.4f", s/k}')
  EXIT=$(( N - 10 ));;   # exit (10 f) is still finishing on frame N-1, so the last frame never equals the empty frame 0
esac
FONTPCT=$(awk -v l="$LEN" -v gw="$GW" -v tr="$TRACK" 'BEGIN{t=(tr>0?tr:0); p=0.9/((gw+t)*l); if(p>0.14)p=0.14; printf "%.3f",p}')                 # keep text inside the frame
[ "$TPL" = logo-reveal ] && FONTPCT=$(awk -v l="$LEN" -v gw="$GW" -v tr="$TRACK" 'BEGIN{t=(tr>0?tr:0); p=0.62/((gw+t)*l); if(p>0.11)p=0.11; printf "%.3f",p}')
WORDPX=$(awk -v w="$W" -v c="$LEN" -v gw="$GW" 'BEGIN{p=0.84*w/((gw+0.03)*c); if(p>0.2*w)p=0.2*w; printf "%d",p}'); BARH=$(awk -v h="$H" 'BEGIN{printf "%d",h*0.017<4?4:h*0.017}')
EXITSEC=$(awk -v n="$N" -v f="$FPS" -v wd="$WORDS" 'BEGIN{printf "%.3f", (n-1)/f - 0.05*(wd-1) - 0.2}')
D="$OUT/$SLUG"; mkdir -p "$D"
ESC=$(printf '%s' "$TEXT" | sed 's/[&/\]/\\&/g'); FESC=$(printf '%s' "$FONT" | sed 's/[&/\]/\\&/g')
sed -e "s/__TEXT__/$ESC/g" -e "s/__W__/$W/g" -e "s/__H__/$H/g" -e "s/__FPS__/$FPS/g" -e "s/__N__/$N/g" \
    -e "s/__BG__/$BG/g" -e "s/__FG__/$FG/g" -e "s/__ACCENT__/$AC/g" -e "s/__EXIT__/$EXIT/g" -e "s/__FONTPCT__/$FONTPCT/g" \
    -e "s/__WORDPX__/$WORDPX/g" -e "s/__FONT__/$FESC/g" -e "s/__WEIGHT__/$WEIGHT/g" -e "s/__TRACK__/$TRACK/g" -e "s/__INF__/$INF/g" -e "s/__STAGGER__/$STAGGER/g" -e "s/__BARH__/$BARH/g" -e "s/__EXITSEC__/$EXITSEC/g" \
    -e "s#__ASSETFILE__#${ASSETFILE:-}#g" -e "s/__ASSETSEC__/${ASSETSEC:-0}/g" -e "s/__LOOP__/${LOOPF:-0}/g" -e "s/__IDLESEC__/${IDLESEC:-2.4}/g" -e "s/__GW__/$GW/g" -e "s/__MARK__/${MARK:-circle}/g" -e "s/__KEYWORD__/$(printf '%s' "${KEYWORD:-}" | sed 's/[&/\]/\\&/g')/g" -e "s/__SEED__/${SEED:-7}/g" -e "s/__MODE__/${MODE:-type}/g" -e "s/__FOCUS__/${FOCUS:-}/g" -e "s/__ARTBOARD__/${AB:-}/g" -e "s/__ANIMATION__/${AN:-}/g" \
    "$HERE/templates/$TPL.html" > "$D/anim.html"
[ -n "$FONTLINK" ] && node -e 'const f=process.argv[1],fs=require("fs");fs.writeFileSync(f,fs.readFileSync(f,"utf8").replace("<meta charset=\"utf-8\">","<meta charset=\"utf-8\">\n<link rel=\"stylesheet\" href=\"fonts/fonts.css\">"))' "$D/anim.html"
cp "$SK/motionmaker-build/scripts/tokens.js" "$D/tokens.js"
if [ "$TPL" = three-product ]; then
  P=$(find_pkg three) || { echo "three not found: run  npm i three@0.160.0  (or set MOTION_VENDOR_SRC=<node_modules dir>)" >&2; exit 3; }
  mkdir -p "$D/vendor/addons/environments"; cp "$P/build/three.module.min.js" "$D/vendor/"; cp "$P/examples/jsm/environments/RoomEnvironment.js" "$D/vendor/addons/environments/"
fi
if [ "$TPL" = gsap-kinetic ]; then
  P=$(find_pkg gsap) || { echo "gsap not found: run  npm i gsap@3.12.5  (or set MOTION_VENDOR_SRC=<node_modules dir>)" >&2; exit 3; }
  mkdir -p "$D/vendor"; cp "$P/dist/gsap.min.js" "$D/vendor/"
fi
if [ "$TPL" = lottie-scene ]; then P=$(find_pkg lottie-web) || { echo "lottie-web not found: run  node motionmaker-assets/scripts/kit.mjs setup  (or npm i lottie-web@5.13.0)" >&2; exit 3; }; mkdir -p "$D/vendor"; cp "$P/build/player/lottie.min.js" "$D/vendor/"; fi
if [ "$TPL" = rive-scene ]; then P=$(find_pkg @rive-app/canvas) || { echo "@rive-app/canvas not found: run  node motionmaker-assets/scripts/kit.mjs setup  (or npm i @rive-app/canvas@2.44.2)" >&2; exit 3; }; mkdir -p "$D/vendor"; cp "$P/rive.js" "$P/rive.wasm" "$D/vendor/"; fi
if [ -n "${ASSETFILE:-}" ]; then echo "Next: record the asset's licence before it ships:  node $SK/motionmaker-assets/scripts/ledger.mjs add $D/$ASSETFILE --source <page url> --creator \"<name>\" --license <id> --dir $D" >&2; fi
printf '# Receipts: %s\n\nTemplate: %s\nPrompt: see PROMPT.md\n\n## Follow-ups (exactly as sent)\n\n(none yet)\n' "$SLUG" "$TPL" > "$D/RECEIPTS.md"
echo "$D"
