#!/usr/bin/env bash
# Build every template with generated inputs and run check.mjs (determinism, seam, page errors) on each. Use it after installing or upgrading.
#   bash smoke.sh [workdir]        optional: LOTTIE=<file.json> RIVE=<file.riv> RIVE_ARTBOARD=.. RIVE_ANIMATION=.. to include those two scenes
# Needs: node, ffmpeg, Playwright (npm i playwright in the workdir or a parent), and the kit groups you want covered (lib.mjs setup all; kit.mjs setup).
# A template whose library is not installed is reported SKIP, not FAIL.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; SK="$(cd "$HERE/../.." && pwd)"; S="$SK/motionmaker/scripts/scaffold.sh"; CHK="$SK/motionmaker-review/scripts/check.mjs"
W=${1:-motion-smoke}; mkdir -p "$W" && cd "$W" || exit 1; pass=0; fail=0; skip=0
run() { local name=$1 secs=$2 size=$3; shift 3
  local out; out=$("$@" 2>&1); local rc=$?
  if [ $rc -eq 3 ]; then echo "SKIP $name (library not installed: $(echo "$out" | grep -m1 -i 'run' | sed 's/^ *//'))"; skip=$((skip+1)); return; fi
  if [ $rc -ne 0 ]; then echo "FAIL $name (scaffold exit $rc): $(echo "$out" | tail -1)"; fail=$((fail+1)); return; fi
  local w=${size%x*}; local fps=30
  if node "$CHK" "out/$name/anim.html" "$secs" "$fps" --size "$size" > "out/$name.check.txt" 2>&1; then echo "PASS $name"; pass=$((pass+1)); else echo "FAIL $name: $(grep FAIL "out/$name.check.txt" | head -2 | tr '\n' ' ')"; fail=$((fail+1)); fi; }
printf 'export function hello(name: string) {\n  return `Hello ${name}`;\n}\n' > sample.ts
[ -f rec.mp4 ] || ffmpeg -loglevel error -y -f lavfi -i "testsrc=size=1280x800:rate=30:duration=4" -pix_fmt yuv420p rec.mp4
run title-loop 4 960x540        env LOOK=swiss-minimal bash "$S" title-loop "Ship faster" 960 540 30 4 - - - out
run logo-reveal 4 960x540       env LOOK=night-cinema TEMPLATE=logo-reveal bash "$S" logo-reveal "ACME" 960 540 30 4 - - - out
run data-chart 4 960x540        env LOOK=editorial-calm TEMPLATE=data-chart bash "$S" data-chart "Growth" 960 540 30 4 - - - out
run product-demo 20 640x360     env LOOK=swiss-minimal TEMPLATE=product-demo bash "$S" product-demo "Export" 640 360 30 20 - - - out
run gsap-kinetic 4 960x540      env LOOK=bold-launch TEMPLATE=gsap-kinetic bash "$S" gsap-kinetic "Move fast" 960 540 30 4 - - - out
run three-product 4 540x540     env TEMPLATE=three-product bash "$S" three-product "Orbit" 540 540 30 4 "#0B0D12" "#F2F0EA" "#D9A441" out
run footage-scene 4 960x540     env LOOK=swiss-minimal TEMPLATE=footage-scene FOOTAGE=rec.mp4 bash "$S" footage-scene "Real footage" 960 540 30 4 - - - out
run code-reveal 4 960x540       env LOOK=tech-mono TEMPLATE=code-reveal CODE=sample.ts FOCUS=2 bash "$S" code-reveal "One function" 960 540 30 4 - - - out
run equation-scene 4 960x540    env LOOK=editorial-calm TEMPLATE=equation-scene TEX='E = \htmlClass{hl}{mc^2}' bash "$S" equation-scene "Energy" 960 540 30 4 - - - out
run map-scene 5 960x540         env LOOK=night-cinema TEMPLATE=map-scene PLACES="Istanbul@41.01,28.98;Berlin@52.52,13.40" HIGHLIGHT="Turkey,Germany" bash "$S" map-scene "Two cities" 960 540 30 5 - - - out
run annotate-scene 4 960x540    env LOOK=warm-craft TEMPLATE=annotate-scene MARK=circle KEYWORD=simple bash "$S" annotate-scene "Keep it simple" 960 540 30 4 - - - out
run icon-features 4 960x540     env LOOK=playful-pop TEMPLATE=icon-features ICONS="lucide:zap,lucide:shield-check,lucide:rocket" bash "$S" icon-features "Fast|Safe|Ready" 960 540 30 4 - - - out
for st in bauhaus van-gogh constructivism seurat matisse ukiyo-e; do run style-$st 4 960x540 env TEMPLATE=style-scene STYLE=$st bash "$S" style-$st "Made by hand" 960 540 30 4 - - - out; done
printf '[{"t":0.8,"do":"move","selector":"#card","from":[0.2,0.5],"to":[0.8,0.4],"dur":0.8},{"t":2,"do":"leave"}]' > fx-actions.json
if node "$SK/motionmaker-build/scripts/film-realtime.mjs" "$SK/motionmaker-build/scripts/fixtures/realtime-demo.html" 2.5 30 --size 800x480 --clip "#card" --actions fx-actions.json --out out/film-realtime/frames --check 2>&1 | grep -q "^PASS"; then echo "PASS film-realtime (virtual clock, repeatable)"; pass=$((pass+1)); else echo "FAIL film-realtime (two films differ or the page errored)"; fail=$((fail+1)); fi
# code export: a finished piece played live by the web player (frames must equal the renderer's), and a real-time page exported live
EW="$SK/motionmaker-build/scripts/export-web.mjs"
if [ -f out/title-loop/anim.html ] && node "$EW" out/title-loop/anim.html --out out/web-export --check 2>&1 | grep -q "^PASS  web export"; then echo "PASS web-export (TypeScript/React player, frame-exact)"; pass=$((pass+1)); else echo "FAIL web-export (run: node $EW out/title-loop/anim.html --check)"; fail=$((fail+1)); fi
if node "$EW" "$SK/motionmaker-build/scripts/fixtures/realtime-demo.html" --live --clip "#card" --viewport 800x480 --actions fx-actions.json --out out/web-live --check 2>&1 | grep -q "^PASS  live web export"; then echo "PASS web-live (real-time page: pause, tour, reduced motion)"; pass=$((pass+1)); else echo "FAIL web-live (run: node $EW <fixture> --live --clip '#card' --check)"; fail=$((fail+1)); fi
# pre-production tools (mood boards, motion feel, script / storyboard / animatic, approval record)
if bash "$SK/motionmaker-preprod/scripts/selftest.sh" out/preprod-selftest 2>&1 | grep -q "^PASS"; then echo "PASS preprod (mood boards, feel, storyboard, animatic, approvals)"; pass=$((pass+1)); else echo "FAIL preprod (run: bash $SK/motionmaker-preprod/scripts/selftest.sh)"; fail=$((fail+1)); fi
if node "$SK/motionmaker-assets/scripts/kit.mjs" peep --hair ShortVolumed --face Cute --body Shirt --out peep.svg >/dev/null 2>&1; then
  run illustration-scene 4 960x540 env LOOK=night-cinema TEMPLATE=illustration-scene ASSET=peep.svg bash "$S" illustration-scene "Meet us" 960 540 30 4 - - - out
else echo "SKIP illustration-scene (run: node $SK/motionmaker-assets/scripts/kit.mjs setup)"; skip=$((skip+1)); fi
if [ -n "${LOTTIE:-}" ]; then run lottie-scene 4 960x540 env LOOK=swiss-minimal TEMPLATE=lottie-scene ASSET="$LOTTIE" bash "$S" lottie-scene "-" 960 540 30 4 - - - out; else echo "SKIP lottie-scene (set LOTTIE=<file.json>)"; skip=$((skip+1)); fi
if [ -n "${RIVE:-}" ]; then run rive-scene 4 960x540 env LOOK=night-cinema TEMPLATE=rive-scene ASSET="$RIVE" ARTBOARD="${RIVE_ARTBOARD:-}" ANIMATION="${RIVE_ANIMATION:-}" bash "$S" rive-scene "-" 960 540 30 4 - - - out; else echo "SKIP rive-scene (set RIVE=<file.riv>)"; skip=$((skip+1)); fi
echo "---"; echo "$pass passed, $fail failed, $skip skipped   (outputs in $PWD/out)"; [ $fail -eq 0 ]
