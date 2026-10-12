#!/usr/bin/env bash
# Reports what the motion toolchain has. Never installs anything. Exit 0 always; read the output.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "MOTIONMAKER_SKILLS=$HERE"      # absolute path of the installed skills folder: use it wherever a command says $MOTIONMAKER_SKILLS
ok(){ printf "OK    %s\n" "$1"; }; no(){ printf "MISS  %s\n" "$1"; }
command -v node >/dev/null && ok "node $(node -v)" || no "node (needed for render.mjs / check.mjs)"
command -v ffmpeg >/dev/null && ok "ffmpeg" || no "ffmpeg (needed for contact sheet + export)"
CH=""
for c in "${CHROMIUM:-}" /opt/pw-browsers/chromium; do [ -n "$c" ] && [ -e "$c" ] && CH="$c" && break; done
[ -z "$CH" ] && for d in "$HOME/.cache/ms-playwright" "$HOME/Library/Caches/ms-playwright" "${LOCALAPPDATA:-/nonexistent}/ms-playwright"; do ls -d "$d"/chromium-* >/dev/null 2>&1 && CH="Playwright's downloaded Chromium ($d)" && break; done
[ -z "$CH" ] && for c in chromium chromium-browser google-chrome; do command -v $c >/dev/null && CH="$(command -v $c) (set CHROMIUM=$(command -v $c))" && break; done
[ -n "$CH" ] && ok "chromium: $CH" || no "chromium (run: npx playwright install chromium, or: npx github:Adamkyl69/motionmaker setup --browser; or set CHROMIUM=<path>)"
if node -e 'require("module").createRequire(process.cwd()+"/")("playwright")' 2>/dev/null; then ok "playwright resolvable from $(pwd)"
else no "playwright not resolvable from $(pwd) (npm i playwright, or symlink an existing install into ./node_modules/playwright)"; fi
if [ -f "$HERE/motionmaker-libs/scripts/lib.mjs" ] && command -v node >/dev/null; then
  LIBS=$(node "$HERE/motionmaker-libs/scripts/lib.mjs" list 2>/dev/null | awk '/^\[x\]/{i=i" "$2} /^\[ \]/{m=m" "$3} END{print "installed:" (i?i:" none") "  |  not installed:" (m?m:" none")}')
  echo "libs  $LIBS   (offer: node $HERE/motionmaker-libs/scripts/lib.mjs setup <group>; fonts give each look its real typeface)"
fi
echo "mode: $( command -v node >/dev/null && command -v ffmpeg >/dev/null && echo 'full (render + export)' || echo 'authoring-only (write HTML, user records screen)')"
