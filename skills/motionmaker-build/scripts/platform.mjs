// Cross-platform details that break on Windows if forgotten (found by a user's Windows run, where they had been patched locally):
//   - import() of an absolute path: Windows paths ("C:\...") are not valid module specifiers; use fileUrl(path).
//   - ffmpeg drawtext: Windows (and many macOS) ffmpeg builds have no default font; ffFont() names a real font file.
// MOTIONMAKER_FONT=<font file> overrides the font everywhere. On Linux, fontconfig's default is used unless it is set.
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const fileUrl = p => pathToFileURL(p).href;

let found;
export function fontFile() {
  if (found !== undefined) return found;
  const win = process.env.WINDIR || process.env.SystemRoot || "C:\\Windows";
  const candidates = process.env.MOTIONMAKER_FONT ? [process.env.MOTIONMAKER_FONT]
    : process.platform === "win32" ? ["arial.ttf", "segoeui.ttf", "calibri.ttf", "tahoma.ttf"].map(f => path.join(win, "Fonts", f))
    : process.platform === "darwin" ? ["/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/SFNS.ttf"]
    : [];
  found = candidates.find(f => existsSync(f)) || null;
  return found;
}
// for an ffmpeg filter: "fontfile='C\:/Windows/Fonts/arial.ttf':" (forward slashes, the drive colon escaped), or "" to let fontconfig choose
export const ffFont = () => { const f = fontFile(); return f ? `fontfile='${f.replace(/\\/g, "/").replace(/:/g, "\\:")}':` : ""; };
// the folder that holds it (for the subtitles filter's fontsdir)
export const fontDir = () => { const f = fontFile(); return f ? path.dirname(f).replace(/\\/g, "/") : null; };

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) console.log(process.argv[2] === "ffont" ? ffFont() : fontFile() || "(fontconfig default)");
