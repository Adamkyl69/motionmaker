#!/usr/bin/env bash
# Reports what the motion toolchain has. Never installs anything. Exit 0 always; read the output.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "MOTIONMAKER_SKILLS=$HERE"      # absolute path of the installed skills folder: use it wherever a command says $MOTIONMAKER_SKILLS
ok(){ printf "OK    %s\n" "$1"; }; no(){ printf "MISS  %s\n" "$1"; }
command -v node >/dev/null && ok "node $(node -v)" || no "node (needed for render.mjs / check.mjs)"
command -v ffmpeg >/dev/null && ok "ffmpeg" || no "ffmpeg (needed for contact sheet + export)"
CH="${CHROMIUM:-/opt/pw-browsers/chromium}"
{ [ -x "$CH" ] || command -v chromium >/dev/null || command -v google-chrome >/dev/null; } && ok "chromium ($CH)" || no "chromium (set CHROMIUM=<path>)"
if node -e 'require("module").createRequire(process.cwd()+"/")("playwright")' 2>/dev/null; then ok "playwright resolvable from $(pwd)"
else no "playwright not resolvable from $(pwd) (npm i playwright, or symlink an existing install into ./node_modules/playwright)"; fi
echo "mode: $( command -v node >/dev/null && command -v ffmpeg >/dev/null && echo 'full (render + export)' || echo 'authoring-only (write HTML, user records screen)')"
