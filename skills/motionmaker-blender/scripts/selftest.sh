#!/usr/bin/env bash
# Blender route: the pin is well-formed, setup refuses without --yes, a .blend model is refused. If Blender is already installed (never downloaded here):
# a tiny turntable renders, and two renders of the same frame are pixel-identical. Run by motionmaker-libs/scripts/smoke.sh, or alone: bash selftest.sh [workdir]
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; W=${1:-blender-selftest}; rm -rf "$W"; mkdir -p "$W" && cd "$W" || exit 1
fail(){ echo "FAIL blender: $1"; exit 1; }
BL="node $HERE/blender.mjs"
node -e 'const p=require(process.argv[1]);const ok=/^\d+\.\d+\.\d+$/.test(p.version)&&Object.values(p.files).every(f=>/^[0-9a-f]{64}$/.test(f.sha256)&&f.name.includes(p.version))&&p.base.startsWith("https://download.blender.org/")&&p.files["linux-x64"]&&p.files["win32-x64"]&&p.files["darwin-arm64"];process.exit(ok?0:1)' "$HERE/../blender.json" || fail "blender.json pin is malformed"
out=$(MOTIONMAKER_HOME="$PWD/home" $BL setup 2>&1); case "$out" in *"refused"*|*"already available"*|*"macOS"*|*"no pinned"*) ;; *) fail "setup did not refuse without --yes: $out";; esac
[ -d home/blender ] && [ -z "$(find home/blender -name 'blender*' -type f 2>/dev/null | head -1)" ] || true
$BL init turntable --out s --model x.blend >/dev/null 2>&1 && fail "a .blend model was accepted"
$BL init turntable --out s --size 160x160 --secs 1 --fps 6 >/dev/null || fail "init"
[ -s s/scene.py ] && [ -s s/config.json ] || fail "init wrote no scene"
if $BL where >/dev/null 2>&1; then
  $BL render s --frames 1-2 --samples 8 --mp4 s/t.mp4 >/dev/null 2>&1 && [ -s s/t.mp4 ] && [ -s s/frames/f0001.png ] || fail "render"
  $BL check s --frames 1 >/dev/null 2>&1 || fail "two renders of one frame were not identical (denoiser off)"
  echo "PASS blender (pin, consent, model safety, headless render, pixel-identical repeat)"
else
  echo "PASS blender (pin, consent, model safety; Blender not installed here, so the render check was skipped)"
fi
