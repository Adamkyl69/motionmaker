---
name: motionmaker-preprod
description: Pre-production for a motion piece, the way a studio does it before anything is built - find out what the user actually imagines (an open "describe it" question, targeted follow-ups, then a plain-language brief-back they confirm), show instead of asking (a numbered mood board of looks and art styles on their own words, a "what is in the picture" board, a round-2 board that changes one thing at a time, colours from a reference picture, the four motion feels side by side), lock the on-screen words (script), show a real frame of every scene (storyboard), show the timing (animatic), and build the first scene before the rest. Every approval is recorded in the user's own words and bound to the exact file they saw; the build and the delivery refuse while required approvals are missing or stale. Use during /motionmaker onboarding, before any build, or whenever the user says the result is not what they imagined.
---

# Pre-production

The most expensive mistake in motion work is building the wrong thing well. Before anything is built, make sure that what you will make is what the user pictures, by **showing** them options and **replaying** your understanding, never by assuming. Paths: `PP=$MOTIONMAKER_SKILLS/motionmaker-preprod/scripts`, project `motion-out/<slug>`.

## 0. Involvement level (ask first, one question)
AskUserQuestion: **How involved do you want to be?**
- **Guided (Recommended)**: you approve the look, the motion, the words and the scenes before the build (about 4 to 6 short decisions).
- **Quick**: you confirm what I understood and pick a look; I decide the rest.
- **Hands-on**: every step, including the timing video and the first built scene.

Then `node $PP/preprod.mjs init motion-out/<slug> --level <level> --scenes <N>` (N = planned scenes; 1 for a loop or a single shot). It prints the required gates. A request of a few words ("make me a 4 s GIF that says Hello") may skip the question: say "Quick mode: I'll confirm what I understood and show you looks; say 'more control' any time" and init with `--level quick`.

## 1. Understand what they picture
**Open question first, in chat (not multiple choice):** "Describe what you see when you imagine it, as if you were telling a friend about a video you watched: what is on screen, how it moves, what it feels like, how it ends." Their words are the brief's raw material: keep them.

**Then fill only the gaps**, with AskUserQuestion (at most 4 questions per call, 2 to 4 options each, the recommended option first, "Other" is automatic). Pick from this bank by what is still unknown; never ask what they already said:
| Gap | Question | Options (adapt) |
|---|---|---|
| Purpose | After watching, the viewer should... | understand it / feel excited / trust us / act (sign up, buy) |
| Audience and place | Who sees it, where? | a muted social feed / a website or app / a talk or screen / a product page |
| One message | (chat) "In 8 words or fewer, the one thing it must say?" | |
| Kind of picture | What is in the picture? | type only / a product or UI / characters or illustration / data, maps, code, maths (or show the worlds board, section 2) |
| Energy | How should it move? | calm / snappy / playful / dramatic (or show the feel video, section 3) |
| Colour mood | Colour feeling? | light and airy / dark and cinematic / bold and colourful / our brand colours |
| Type character | Lettering? | clean sans / elegant serif / chunky display / technical mono |
| The moment | Which moment must land? | (chat) "the one beat people should remember" |
| Ending | How does it end? | logo / call to action / loops back / just stops |
| Words | Exact on-screen text? | (chat) every line, final wording |
| References | Anything you love or hate? | (chat) links, videos, screenshots; say what about it |
| Must / must not | Mandatories, no-gos? | (chat) legal lines, colours to avoid, competitors |

References: a video goes to `motionmaker-reference` (principles, not footage). A picture (screenshot, poster, photo) gives a palette: `moodboard.mjs ... --from-image <picture>` adds a look in its colours (made readable; every change is printed).

**Brief-back (the "understanding" gate).** Write `motion-out/<slug>/BRIEF-BACK.md` in the user's language, plain words, no jargon:
```
What I'll make: <one sentence: length, format, where it is shown>
It says: "<the one message>"
On screen: <scene by scene in one line each, or the single shot>
It feels: <3 words> - and not <anti-words>
It looks: <colour mood, type, kind of picture> (to be chosen on the mood board)
It ends: <ending>
I assumed: <each assumption on its own line, so a wrong one is easy to spot>
Not included: <what they might expect but will not get: voice, sound, real footage, ...>
```
Show it and ask: **That's it** | **Change something** (say what). Record the answer verbatim:
`node $PP/preprod.mjs approve motion-out/<slug> understanding --file motion-out/<slug>/BRIEF-BACK.md --words "<their words>"` (or `changes ... --words` and revise).

## 2. Style: show, then narrow
1. **What is in the picture** (when the kind of picture is open, or the piece has several scenes): `node $PP/moodboard.mjs "<their headline>" --worlds --look <closest look> --out motion-out/<slug>/preprod/worlds`. Eleven kinds on example content (type, logo, chart, product UI, 3D object, characters, icons, map, code, equation, hand-drawn mark); a kind whose library is missing is skipped and named with its install command (offer it, never install unasked). Gate `worlds` (optional unless hands-on).
2. **Round 1 mood board:** `node $PP/moodboard.mjs "<headline>" --tone "<their feel words>" [--from-image <picture>] [--accent "<brand hex>"] --size <their aspect, small> --out motion-out/<slug>/preprod/moodboard`. All eight looks (ordered by their words), two fitting art styles, and their picture's colours. **Read the PNG**, then show the path and ask in chat: "Which numbers feel like what you imagine? Any you'd never want? Mixing is fine (4's colours with 7's type)." Offer the top 3 as AskUserQuestion options plus Other for a quick answer.
3. **Round 2** (Guided and Hands-on, or when they are torn): `node $PP/moodboard.mjs "<headline>" --vary <tile> --from motion-out/<slug>/preprod/moodboard/moodboard.json --out motion-out/<slug>/preprod/moodboard-2`: the favourite inverted, with two other accents, in two other typefaces. One change per tile, so "3 but with 5's type" is an exact instruction.
4. Then hand over to `motionmaker-art-director` for the three directions on the chosen family when useful (directions vary layout and type more than colour), and its palette and type checks.
Approve the board they chose from: `preprod.mjs approve ... style --file <that moodboard.png> --words "<their words>"`. Each tile's recipe (look, template, style, colours) is in `moodboard.json` and goes straight into `scaffold.sh` and AD-BRIEF.md.

## 3. Motion feel: let them watch it
`node $PP/feel.mjs "<headline>" --look <chosen look> [--accent ..] --size <small, their aspect> --out motion-out/<slug>/preprod/feel` renders the same words in **Calm, Snappy, Bouncy, Dramatic** (`feel.mp4` and `feel.gif` loop 2x2; `feel.png` is a filmstrip of each entrance for terminals). Point them to the video (the stills cannot show motion). Ask: **1 Calm** | **2 Snappy** | **3 Bouncy** | **4 Dramatic** (plus Other: "between 1 and 2" is a valid answer: interpolate the numbers in `feel.json`). The pick becomes `FEEL=<name>` (title template) and the motion language numbers in AD-BRIEF.md for every other template. Gate `feel`.

## 4. Script, storyboard, animatic (pieces with words or scenes)
Write `motion-out/<slug>/STORYBOARD.json` from the brief (template: `../STORYBOARD-template.json`): one scene per beat, each with purpose (hook / build / payoff / close), seconds, template (or `custom`), the exact words, what is in the picture, the one move, transition (cut / fade) and sound. Templates per scene come from the worlds the user chose.
1. **Script (words first, pictures second):** `node $PP/storyboard.mjs script motion-out/<slug>/STORYBOARD.json` writes SCRIPT.md and checks reading time (0.3 s per word + 0.5 s; exit 1 on a fail: fix before showing). Show the table; ask **Words are right** | **Change words**. Gate `script` on SCRIPT.md. Wording changes after this gate reopen it.
2. **Storyboard:** `node $PP/storyboard.mjs frames motion-out/<slug>/STORYBOARD.json` renders a real frame of every scene on its template, in the chosen look and feel, into `storyboard.png` with time, words, picture, move, sound and transition per panel. **Read it** first: fix collisions, unreadable panels and anything the user ruled out, then show it. Ask **Approve** | **Change a scene** ("scene 3: the chart should be a map"). Change, re-render, re-show; gate `storyboard` on the PNG they approved.
3. **Animatic** (Guided with several scenes, Hands-on): `node $PP/storyboard.mjs animatic motion-out/<slug>/STORYBOARD.json [--motion]` gives `animatic.mp4`: the scenes at their real lengths with labels and running time (`--motion`: the real motion at 12 fps, which shows when a scene is too short for its entrance). Ask **Timing feels right** | **Faster / slower** (which scene). Gate `animatic`.
A single shot (one scene) needs no script table or storyboard beyond the chosen style frame; its words are confirmed in the brief-back.

## 5. Build gate and first shot
`node $PP/preprod.mjs check motion-out/<slug> build` must say READY before the full build (stale = a file changed after its approval: show the new one and ask again). Then:
- Build the first scene at full quality, show stills of it (and a short clip when you can) and, in Hands-on (or whenever several scenes share one style), ask **This is the direction** | **Change it** before building the rest. Gate `first-shot` on the still or clip they saw.
- Every later change the user asks for in review is recorded with `preprod.mjs changes`, so the board shows how the piece got where it is.

## 6. The board
`node $PP/preprod.mjs board motion-out/<slug>` writes `preprod/board.html`: every gate in order with what was shown (images, the feel and animatic videos playing, the brief-back and script) and every answer in the user's words. Give the path whenever the user wants to see everything at once, and at the end. `preprod.mjs status` is the same in text.

## Rules
- **Show, then ask.** Prefer a picture or a video with numbered options over adjectives. Read every image before you present it; never present one you have not looked at.
- **One decision per question.** At most 4 questions per AskUserQuestion call; free-text answers go in chat. Never ask what they already told you; state an assumption instead and list it in the brief-back.
- **Their words, verbatim.** `--words` is what the user said, not your summary. No approval without one; an approval binds to the file they saw (`--file`).
- **Change requests loop back** to the gate they belong to: a new word reopens the script, a new scene reopens the storyboard. Do not carry an old approval past a change.
- **Respect the level.** Quick does not get a storyboard lecture; Hands-on gets every gate. The user can switch at any time (`preprod.mjs init ... --force` keeps nothing; `require <gate> on|off --why` adjusts one gate).
- Honest limits: the mood board and storyboard frames are real renders of the templates, so they show what the build can do, not more; a custom scene is a drawn placeholder until it is built; stills cannot show motion (point to the feel and animatic videos).
