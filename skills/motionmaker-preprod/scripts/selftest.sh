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
  "scenes": [ { "purpose": "hook", "secs": 3, "template": "title-loop", "text": "Hello", "transition": "fade" },
              { "purpose": "close", "secs": 1.5, "template": "custom", "visual": "a custom scene", "text": "Bye", "preview": "sketch.html" } ] }
J
printf '<body style="margin:0;background:#cde"><h1 style="font:60px sans-serif;text-align:center;margin-top:30%%">Bye</h1></body>' > sketch.html
node "$HERE/storyboard.mjs" script STORYBOARD.json >/dev/null 2>&1 || fail "script"
node "$HERE/storyboard.mjs" frames STORYBOARD.json >/dev/null 2>&1 && [ -f storyboard/storyboard.png ] || fail "storyboard"
node "$HERE/storyboard.mjs" animatic STORYBOARD.json >/dev/null 2>&1 || fail "animatic"
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 animatic/animatic.mp4); awk -v d="$d" 'BEGIN{exit !(d>4.4 && d<4.6)}' || fail "animatic length $d (want 4.5)"
P=. ; PP="node $HERE/preprod.mjs"
printf "# Brief-back\nHello\n" > BRIEF-BACK.md
$PP init $P --level guided --scenes 2 >/dev/null || fail "init"
$PP check $P build >/dev/null 2>&1 && fail "check passed with nothing approved"
for g in understanding:BRIEF-BACK.md style:mb/moodboard.png feel:feel/feel.mp4 script:SCRIPT.md storyboard:storyboard/storyboard.png animatic:animatic/animatic.mp4; do
  $PP approve $P ${g%%:*} --file ${g#*:} --words "yes" >/dev/null || fail "approve ${g%%:*}"; done
$PP check $P build >/dev/null || fail "check refused after every approval"
echo " " >> SCRIPT.md; out=$($PP check $P build 2>&1); case "$out" in *"script (stale"*) ;; *) fail "an edited approved file did not go stale";; esac
$PP board $P >/dev/null && [ -f preprod/board.html ] || fail "board"
# a scene's words changed after approval: the storyboard approval goes stale too (it binds STORYBOARD.json)
node "$HERE/storyboard.mjs" script STORYBOARD.json >/dev/null 2>&1; $PP approve $P script --file SCRIPT.md --words "yes" >/dev/null
sed -i.orig 's/"Hello"/"Hullo"/' STORYBOARD.json; out=$($PP check $P build 2>&1); case "$out" in *"STORYBOARD.json changed"*) ;; *) fail "editing STORYBOARD.json did not make its approvals stale";; esac; mv STORYBOARD.json.orig STORYBOARD.json
# a custom scene with no sketch is NOT SHOWN: frames exits 2 and the storyboard cannot be approved; with a sketch it is shown
mv sketch.html sketch.off
node "$HERE/storyboard.mjs" frames STORYBOARD.json >/dev/null 2>&1; [ $? = 2 ] || fail "a custom scene without its sketch was not flagged"
$PP approve $P storyboard --file storyboard/storyboard.png --words "yes" >/dev/null 2>&1 && fail "a storyboard with an unseen scene was approved"
mv sketch.off sketch.html
node "$HERE/storyboard.mjs" frames STORYBOARD.json >/dev/null 2>&1 || fail "the sketched custom scene was not shown"
# voice-over: lines, place (with retime), captions, mix with ducking, the ledger's non-commercial rule
VO="$HERE/../../motionmaker-sound-export/scripts/voice.mjs"
node -e 'const f="STORYBOARD.json",d=JSON.parse(require("fs").readFileSync(f));d.scenes[0].say="Hello there, and welcome.";require("fs").writeFileSync(f,JSON.stringify(d))'
node "$VO" lines STORYBOARD.json >/dev/null 2>&1; [ -f VOICE-SCRIPT.md ] || fail "voice lines"
mkdir -p voice && ffmpeg -loglevel error -y -f lavfi -i "sine=f=220:d=3.4,volume=0.5" voice/scene-1.wav
node "$VO" place STORYBOARD.json --dir voice >/dev/null 2>&1 && fail "a 3.4 s line in a 3 s scene was accepted without --retime"
node "$VO" place STORYBOARD.json --dir voice --retime >/dev/null 2>&1 || fail "voice place --retime"
[ -s voice/track.wav ] && [ -s voice/captions.srt ] && grep -q "Hello there" voice/captions.srt || fail "voice track or captions"
ffmpeg -loglevel error -y -f lavfi -i "sine=f=45:d=4,volume=0.4" -ac 2 -ar 48000 bed.wav
node "$VO" mix --voice voice/track.wav --bed bed.wav --out mix.wav >/dev/null 2>&1 || fail "voice mix"
node "$HERE/../../motionmaker-assets/scripts/ledger.mjs" add voice/track.wav --dir . --kind voice --license ELEVENLABS-FREE --source "test" --creator "test" --attribution "Voice: elevenlabs.io" >/dev/null || fail "ledger add voice"
node "$HERE/../../motionmaker-assets/scripts/ledger.mjs" check --dir . | grep -q "NON-COMMERCIAL USE ONLY" || fail "free-plan voice not flagged non-commercial"
echo "PASS preprod (mood boards, feel, script, storyboard with sketches, animatic, approvals, voice-over)"
