#!/usr/bin/env bash
# Pre-production tools end to end on a small piece (run by motionmaker-libs/scripts/smoke.sh, or alone: bash selftest.sh [workdir]).
# Checks: mood board (round 1 + round 2 from its json), motion feel, script / storyboard / animatic, and the approval record:
# check refuses before approvals, passes after, and goes stale when an approved file changes.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; W=${1:-preprod-selftest}; rm -rf "$W"; mkdir -p "$W" && cd "$W" || exit 1
fail(){ echo "FAIL preprod: $1"; exit 1; }
node "$HERE/moodboard.mjs" "Hello" --looks swiss-minimal,night-cinema --styles none --size 240x240 --out mb >/dev/null 2>&1 || fail "moodboard round 1"
[ -f mb/moodboard.png ] && [ "$(node -e 'console.log(require("./mb/moodboard.json").tiles.length)')" = 2 ] || fail "moodboard tiles"
node "$HERE/moodboard.mjs" "Hello" --vary 1 --from mb/moodboard.json --size 240x240 --out mb2 >/dev/null 2>&1 && [ -f mb2/moodboard.png ] || fail "moodboard round 2"
node "$HERE/feel.mjs" "Hello" --size 240x136 --secs 2 --out feel >/dev/null 2>&1 && [ -s feel/feel.mp4 ] && [ -s feel/feel.png ] || fail "feel"
cat > STORYBOARD.json <<'J'
{ "title": "Selftest", "size": "320x320", "fps": 24, "look": "editorial-calm", "feel": "calm",
  "scenes": [ { "purpose": "hook", "secs": 2, "template": "title-loop", "text": "Hello", "transition": "fade" },
              { "purpose": "close", "secs": 1.5, "template": "custom", "visual": "a custom scene", "text": "Bye" } ] }
J
node "$HERE/storyboard.mjs" script STORYBOARD.json >/dev/null 2>&1 || fail "script"
node "$HERE/storyboard.mjs" frames STORYBOARD.json >/dev/null 2>&1 && [ -f storyboard/storyboard.png ] || fail "storyboard"
node "$HERE/storyboard.mjs" animatic STORYBOARD.json >/dev/null 2>&1 || fail "animatic"
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 animatic/animatic.mp4); awk -v d="$d" 'BEGIN{exit !(d>3.4 && d<3.6)}' || fail "animatic length $d (want 3.5)"
P=. ; PP="node $HERE/preprod.mjs"
printf "# Brief-back\nHello\n" > BRIEF-BACK.md
$PP init $P --level guided --scenes 2 >/dev/null || fail "init"
$PP check $P build >/dev/null 2>&1 && fail "check passed with nothing approved"
for g in understanding:BRIEF-BACK.md style:mb/moodboard.png feel:feel/feel.mp4 script:SCRIPT.md storyboard:storyboard/storyboard.png animatic:animatic/animatic.mp4; do
  $PP approve $P ${g%%:*} --file ${g#*:} --words "yes" >/dev/null || fail "approve ${g%%:*}"; done
$PP check $P build >/dev/null || fail "check refused after every approval"
echo " " >> SCRIPT.md; out=$($PP check $P build 2>&1); case "$out" in *"script (stale"*) ;; *) fail "an edited approved file did not go stale";; esac
$PP board $P >/dev/null && [ -f preprod/board.html ] || fail "board"
echo "PASS preprod (mood boards, feel, script, storyboard, animatic, approvals)"
