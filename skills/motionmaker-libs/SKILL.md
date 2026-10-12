---
name: motionmaker-libs
description: Optional libraries that widen what a motion piece can show, each made frame-exact and installed only on request. Bundled open-licence fonts per look (identical type on every machine, accented and non-Latin text included), syntax-highlighted code reveals (Shiki), typeset equations (KaTeX), globe and route maps (d3-geo, Natural Earth), hand-drawn circles, underlines and arrows (Rough.js), and four icon sets (Lucide, Tabler, Phosphor, Material Symbols). Use when a piece needs code, maths, a map, a sketched annotation, icons or exact brand-quality type, or when the user asks which libraries Motionmaker supports.
---

# Libraries: fonts, code, equations, maps, sketch, icons

Paths: `LB=$MOTIONMAKER_SKILLS/motionmaker-libs`. Registry with pinned versions and licences: `libs.json` (licences read from npm on 2026-10-12).

## Rule for admitting a library
A library is used here only if (1) the output is a pure function of the frame number (rendering frame 90 before frame 10 gives the same pixels), (2) its licence is permissive, (3) it works offline (our renderer blocks the network), (4) it gives the art director something new. Heavy work happens **ahead of time in Node** (Shiki, KaTeX) so the page only shows ready-made markup. Every template here passed `check.mjs` (determinism out of order, seam, page errors); `scripts/smoke.sh` re-runs all of them.

## Install (ask first: it downloads from npm into the kit cache)
`node $LB/scripts/lib.mjs list` shows each group, its size and licence, installed or not. Then `node $LB/scripts/lib.mjs setup fonts code math maps sketch icons:lucide` (or `all`, or `icons` for every icon set). Cache: `~/.cache/motionmaker/kits` or `$MOTIONMAKER_KITS`.

| Group | What it adds | Template | Licence |
|---|---|---|---|
| `fonts` (~15 MB) | a real font per look (Fraunces, Inter, Cormorant Garamond, Archivo Black, Fredoka, JetBrains Mono, Playfair Display, DM Serif Display), all subsets (latin-ext, cyrillic, greek, vietnamese where available) | every template, automatically with `LOOK=` | OFL-1.1 |
| `code` (~12 MB) | Shiki highlighting, 200+ languages, light/dark themes per look | `code-reveal` | MIT |
| `math` (~4 MB) | KaTeX typesetting | `equation-scene` | MIT (fonts OFL) |
| `maps` (~10 MB) | d3-geo, topojson, Natural Earth countries (110m) | `map-scene` | ISC (data public domain) |
| `sketch` (~1 MB) | Rough.js hand-drawn marks with a fixed seed | `annotate-scene` | MIT |
| `icons:lucide` / `:tabler` / `:phosphor` / `:material` | icon sets (about 1,600 to 3,000+ each) | `icon-features`, or any scene | ISC / MIT / MIT / Apache-2.0 |

## Use
- **Fonts:** nothing to do: `scaffold.sh` with `LOOK=<name>` copies the look's font into `<project>/fonts/` (with `FONTS.md` and the licence) and links it. `FONTS=0` keeps system fonts. Extra font: `node $LB/scripts/fonts.mjs add <fontsource-name> <weight> --dir <project>`. The renderer loads every declared face before the first frame, so canvas text is never caught in a fallback font.
- **Code reveal:** `TEMPLATE=code-reveal CODE=<file> [CODE_LANG=ts] [CODE_LINES=3-18] [MODE=type|lines] [FOCUS=4-6] [CODE_THEME=<shiki theme>] LOOK=<look> scaffold.sh <slug> "<caption or ->" W H fps secs - - -`. Typing fills the first half of the clip; then FOCUS lights a line range and dims the rest. Keep it under about 18 lines and 70 columns for phones (`code.mjs` warns). Themes: `node $LB/scripts/code.mjs themes`.
- **Equation:** `TEMPLATE=equation-scene TEX='E = \htmlClass{hl}{mc^2}' ...`. Terms reveal in reading order; the `\htmlClass{hl}{...}` part takes the accent and an underline. Invalid TeX stops the scaffold with KaTeX's message.
- **Map:** `TEMPLATE=map-scene PLACES='Istanbul@41.01,28.98;Berlin@52.52,13.40' HIGHLIGHT='Turkey,Germany' ...`. 1 to 6 stops in travel order; the camera follows each great-circle leg, one label at a time (the current stop). Country names are Natural Earth's (`USA`, `UK`, `Türkiye` and a few others are accepted); unknown names stop with suggestions. Coordinates: give them yourself or ask the user; do not guess for small places.
- **Sketch:** `TEMPLATE=annotate-scene MARK=circle|underline|box|highlight|strike|arrow KEYWORD=<word> [SEED=7] ...`. The mark draws like a marker on the key word (default: last word). Circles and boxes open the spacing around the word so the mark never cuts neighbouring words. Change `SEED` for a different hand, never per frame.
- **Icons:** `node $LB/scripts/icons.mjs search <word>` then `TEMPLATE=icon-features ICONS='lucide:zap,lucide:shield-check,lucide:rocket' ... "Fast|Secure|Ships today"` (labels split on `|`; style with `@`: `phosphor:lightning@fill`, `material:lock@rounded-fill`, `tabler:bolt@filled`). Icons are copied into `assets/` and recorded in the ledger automatically. For other scenes: `icons.mjs get <set>:<name> --out file.svg` (currentColor, no fixed size) and inline it.

## Art direction notes
- **One icon set per piece** (stroke weight and corner style must match), the same way as one illustration family. Outline icons draw on; filled icons pop.
- Code on screen is read, not admired: one idea, the focus range is the message, the rest dims. Big enough to read on a phone or cut lines.
- A map is a stage for a claim ("3 cities", "shipping to Europe"), not decoration: highlight only what the caption names.
- Hand-drawn marks are an accent: one mark per shot, in the accent colour, on the single word that carries the message.

## Limits
- Equations: KaTeX covers most LaTeX maths but not every package; `\htmlClass` is trusted only for the `hl` class.
- Maps: 110m shapes are right for a globe; small countries and islands are simplified or missing. No street maps (tiles need the network and their own licences).
- Shiki and KaTeX run at scaffold time, so editing the code or formula means re-running the scaffold (or `code.mjs` / `math.mjs`) for that project.
- Not tested on Windows or macOS.
