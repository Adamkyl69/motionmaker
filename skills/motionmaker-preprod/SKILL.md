---
name: motionmaker-preprod
description: Pre-production for a motion piece, the way a studio does it before anything is built - find out what the user actually imagines (an open "describe it" question, targeted follow-ups, then a plain-language brief-back they confirm), show instead of asking (a numbered mood board of looks and art styles on their own words, a "what is in the picture" board, a round-2 board that changes one thing at a time, colours from a reference picture, the four motion feels side by side), lock the on-screen words (script), choose and hear the voice-over when there is one (ElevenLabs connector or their own recording), show a real frame or a sketch of every scene (storyboard), show the timing (animatic, with the voice), and build the first scene before the rest. Every approval is recorded in the user's own words and bound to the exact files they saw; the build and the delivery refuse while required approvals are missing or stale. Use during /motionmaker onboarding, before any build, or whenever the user says the result is not what they imagined.
---

# Pre-production

The most expensive mistake in motion work is building the wrong thing well. Before anything is built, make sure that what you will make is what the user pictures, by **showing** them options and **replaying** your understanding, never by assuming. Paths: `PP=$MOTIONMAKER_SKILLS/motionmaker-preprod/scripts`, project `motion-out/<slug>`.

## 0. Involvement level (ask first, one question)
AskUserQuestion: **How involved do you want to be?**
- **Guided (Recommended)**: you approve the look, the motion, the words and the scenes before the build (about 5 to 8 short decisions).
- **Quick**: you confirm what I understood and pick a look; I decide the rest.
- **Hands-on**: every step, including the timing video and the first built scene.

Then `node $PP/preprod.mjs init motion-out/<slug> --level <level> --scenes 1` (the scene count is a first guess: set the real one with `preprod.mjs scenes motion-out/<slug> <N>` once the brief-back is agreed). A request of a few words ("make me a 4 s GIF that says Hello") may skip the question: say "Quick mode: I'll confirm what I understood and show you looks; say 'more control' any time" and init with `--level quick`.

## 1. Understand what they picture
**Open question first, in chat (not multiple choice):** "Describe what you see when you imagine it, as if you were telling a friend about a video you watched: what is on screen, how it moves, what it feels like, how it ends." Keep their words; they are the brief's raw material.

**Then fill only the gaps**, with AskUserQuestion (at most 4 questions per call, 2 to 4 options each, the recommended option first, "Other" is automatic). Pick from this bank by what is still unknown; never ask what they already said:
| Gap | Question | Options (adapt) |
|---|---|---|
| Purpose | After watching, the viewer should... | understand it / feel excited / trust us / act (sign up, buy) |
| Audience and place | Who sees it, where? | a muted social feed / a website or app / a talk or screen / a product page. Children? Their age sets the reading pace and the vocabulary. |
| One message | (chat) "In 8 words or fewer, the one thing it must say?" | |
| Kind of picture | What is in the picture? | type only / a product or UI / characters or illustration / data, maps, code, maths / objects drawn for this piece (planets, animals, machines) (or show the worlds board, section 2) |
| Energy | How should it move? | calm / snappy / playful / dramatic (or show the feel video, section 3) |
| Colour mood | Colour feeling? Anything to avoid? | light and airy / dark and cinematic / bold and colourful / our brand colours |
| Type character | Lettering? | clean sans / elegant serif / chunky display / technical mono |
| The moment | Which moment must land? | (chat) "the one beat people should remember" |
| Facts and counts | (educational pieces) the exact facts, names and numbers to show, and their source | (chat) |
| Ending | How does it end? | logo / call to action / loops back / just stops |
| Words | Exact on-screen text? | (chat) every line, final wording |
| Voice | A voice-over? | none, captions and music / a generated voice (when an ElevenLabs connector is available, section 4b) / their own recording |
| Brand | Logo, colours, channel name? | (chat) files or "none" |
| References | Anything you love or hate? | (chat) links, videos, screenshots; say what about it |
| Must / must not | Mandatories, no-gos? | (chat) legal lines, colours to avoid, competitors |

References: a video goes to `motionmaker-reference` (principles, not footage). A picture (screenshot, poster, photo) gives a palette: `moodboard.mjs ... --from-image <picture>` adds a look in its colours (made readable; every change is printed).

**Brief-back (the "understanding" gate).** Write `motion-out/<slug>/BRIEF-BACK.md` in the user's language, plain words, no jargon:
```
What I'll make: <one sentence: length, format, where it is shown, for whom>
It says: "<the one message>"
On screen: <scene by scene in one line each, or the single shot>
It feels: <3 words> - and not <anti-words>
It looks: <colour mood, type, kind of picture> (to be chosen on the mood board)
Voice: <none / generated voice / your recording>, captions <yes/no>
It ends: <ending>
I assumed: <each assumption on its own line, so a wrong one is easy to spot>
Not included: <what they might expect but will not get: real footage, music they name, ...>
```
Show it and ask: **That's it** | **Change something** (say what). Record the answer verbatim: `node $PP/preprod.mjs approve motion-out/<slug> understanding --file motion-out/<slug>/BRIEF-BACK.md --words "<their words>"` (a correction first: `changes ... --words "<their correction>"`, revise, show again). Then set the scene count: `preprod.mjs scenes motion-out/<slug> <N>`.

The **headline** used on the boards below is the main on-screen line (the hook's words); with no words at all, the title or subject in two or three words.

## 2. Style: show, then narrow
1. **What is in the picture** (when the kind of picture is open, or there are several scenes): `node $PP/moodboard.mjs "<headline>" --worlds --look <closest look> --size <small, their aspect> --out motion-out/<slug>/preprod/worlds`. Eleven kinds on example content; a kind whose library is missing is skipped and named with its install command (offer it, never install unasked). Things no template draws (planets, animals, a machine, a story scene) are drawn in code for the piece: say so, and plan a sketch for the storyboard (section 4). Gate `worlds` (optional unless hands-on).
2. **Round 1 mood board:** `node $PP/moodboard.mjs "<headline>" --tone "<their feel words>" [--avoid dark|light] [--from-image <picture>] [--accent "<brand hex>"] --size <their aspect, small: 480x270, 400x400, 270x480> --out motion-out/<slug>/preprod/moodboard`. Pass `--avoid` whenever they said "not dark" (or "not light"): never show what they ruled out. **Read the PNG** before showing it. Ask in chat: "Which numbers feel like what you imagine? Any you'd never want? Mixing is fine (4's colours with 7's type)." Offer the top 3 as AskUserQuestion options plus Other. Record their answer: `preprod.mjs changes ... style --file <round-1 moodboard.png> --words "<their words>"`.
3. **Round 2** (Guided and Hands-on, or when they are torn): `node $PP/moodboard.mjs "<headline>" --vary <tile> --from motion-out/<slug>/preprod/moodboard/moodboard.json --out motion-out/<slug>/preprod/moodboard-2` (it keeps round 1's size): the favourite inverted, with two other accents, in two other typefaces. One change per tile, so "3 but with 5's type" is an exact instruction. Approve the board they made the final choice on: `preprod.mjs approve ... style --file <that moodboard.png> --words "<their words>"`.
4. The art director's three directions (`motionmaker-art-director` step 2) are optional here: use them only when layout or type is still open after round 2; never show a direction that contradicts what the user ruled out.
Each tile's recipe (look, template, style, colours) is in its `moodboard.json`; it goes into AD-BRIEF.md and every scaffold call (`LOOK=` plus the three colours).

## 3. Motion feel: let them watch it
`node $PP/feel.mjs "<headline>" --from motion-out/<slug>/preprod/moodboard-2/moodboard.json --tile <their pick> --size <small, their aspect> --out motion-out/<slug>/preprod/feel` renders the same words in **Calm, Snappy, Bouncy, Dramatic**, in exactly the chosen tile's look and colours (`feel.mp4` and `feel.gif` loop 2x2; `feel.png` is a filmstrip of each entrance for terminals). Point them to the video (the stills cannot show motion). Ask: **1 Calm** | **2 Snappy** | **3 Bouncy** | **4 Dramatic** (Other: "between 1 and 2" is valid: interpolate the numbers in `feel.json`). The pick becomes `FEEL=<name>` (title template) and the motion language numbers in AD-BRIEF.md for every other template. Gate `feel`.

## 4. Script, voice, storyboard, animatic (pieces with words or scenes)
Write `motion-out/<slug>/STORYBOARD.json` from the brief (template: `../STORYBOARD-template.json`): `audience` ("kids" for young viewers: slower reading pace), and one scene per beat with purpose (hook / build / payoff / close), seconds, template (or `custom`), the exact on-screen words (`text`), the narration (`say`, when there is a voice-over), what is in the picture, the one move, transition (cut / fade) and sound. Templates per scene come from the worlds the user chose. Scenes hold their content until the cut (`"exit": true` only for a loop that flows back into its start). Long lines in the title template break onto two lines by themselves.
**Beyond a template's limits** (more than 4 icons, a picture no template draws, a layout none offers): make that scene `custom` and write a quick **sketch** of it for the storyboard (`"preview": "sketches/<name>.html"`: a static HTML/SVG mock-up at the piece's size, in the chosen colours, with the real labels). A custom scene without a sketch is NOT SHOWN and cannot be approved.
1. **Script (words first, pictures second):** `node $PP/storyboard.mjs script motion-out/<slug>/STORYBOARD.json` writes SCRIPT.md and checks reading time against the time each line is **fully on screen** (the scene minus the template's real entrance and exit), at an adult or kids' pace. Exit 1 = fix before showing (cut words, lengthen the scene, or use a calmer feel). Show the table; ask **Words are right** | **Change words**. Gate `script` on SCRIPT.md.
2. **Voice (section 4b), when there is a voice-over:** voice chosen, a line heard, all lines generated or recorded, placed with `voice.mjs place` (it may lengthen scenes to fit the real recording: re-run the script check). Gate `voice`.
3. **Storyboard:** `node $PP/storyboard.mjs frames motion-out/<slug>/STORYBOARD.json` renders a real frame of every template scene and the sketch of every custom scene (marked SKETCH) into `storyboard.png`, with time, words, picture, move, sound and transition per panel, and any template warning in red. Exit 2 = a scene is not shown: sketch it first. **Read the PNG**: fix collisions, unreadable panels and anything the user ruled out, then show it. Ask **Approve** | **Change a scene** ("scene 3: the chart should be a map"). Change, re-render, re-show; gate `storyboard` on the PNG they approved (refused while a scene is NOT SHOWN).
4. **Animatic** (Guided with several scenes, Hands-on): `node $PP/storyboard.mjs animatic motion-out/<slug>/STORYBOARD.json [--motion] [--voice motion-out/<slug>/voice/track.wav]`: the scenes at their real lengths with labels and running time, with the voice-over when there is one (`--motion`: the real motion at 12 fps). Ask **Timing feels right** | **Faster / slower** (which scene). Gate `animatic`.
Script, voice, storyboard and animatic approvals also bind STORYBOARD.json: a change to a scene's words or timing makes them stale, and they are shown again. A single shot (one scene) needs no storyboard beyond the chosen style frame; its words are confirmed in the brief-back.

## 4b. Voice-over
**What is available.** A generated voice needs a text-to-speech tool in this session: look for ElevenLabs tools (a claude.ai connector or an MCP server added to Claude Code; tool names contain `ElevenLabs`/`elevenlabs`, such as `creative_generate_speech`, `text_to_speech`, `creative_list_voices`, `search_voices`). Search the tool list for them (ToolSearch "elevenlabs") before saying it is unavailable. Without one: offer **their own recording** (any phone recording works: one file per scene line), **captions and music only**, or connecting ElevenLabs (claude.ai Settings > Connectors; Claude Code picks up claude.ai connectors when signed in with that account, or `claude mcp add` for their own MCP server). OpenMontage's free Piper voice is the third route (`motionmaker-montage`).
**Before generating anything, say plainly and get a yes:** it uses their ElevenLabs credits (price it first: the speech tool's estimate option, or the character count from `voice.mjs lines`; quote credits and money); the text goes to ElevenLabs; **licence:** a paid plan allows commercial use (except Beta Services); the **free plan does not allow any commercial use** and needs "elevenlabs.io" in the title (so not for a monetised channel or a client); ask which plan they are on. Library and designed voices only; never clone a real person's voice without that person's consent.
Once a voice-over is chosen: `preprod.mjs require motion-out/<slug> voice on --why "voice-over chosen"`.
1. `node $MOTIONMAKER_SKILLS/motionmaker-sound-export/scripts/voice.mjs lines motion-out/<slug>/STORYBOARD.json` writes VOICE-SCRIPT.md: every `say` line, its characters (what is billed) and speaking time against its scene. Narration may differ from the on-screen words, but never contradict them. For kids: short sentences, a warm voice, pace about 2.2 words per second.
2. **Audition (free):** search voices that fit (`creative_list_voices` with language, use case, age, the user's words), save the result as `motion-out/<slug>/voice/voices.json`, then `voice.mjs voices motion-out/<slug>/voice/voices.json --n 4 --out motion-out/<slug>/voice/audition`: their public samples on one page (`voices.html`). The user listens and says the number.
3. **One line in that voice** (one generation of the hook line, after the yes on cost): they hear their own words before everything is generated. Gate `voice` on that audio file.
4. **All lines**, one file per scene, saved as `motion-out/<slug>/voice/scene-<n>.mp3` (or .wav). With a flow-based connector (`creative_generate_speech`): one flow for the piece (`creative_create_flow`), one generation per line with `generations_count` 1 (unless they want takes to choose from), poll `creative_get_flow_run_status`, then download each result's audio URL with curl into `voice/` (if the status lists no downloadable URL, give the user the flow's url and ask them to download the take and put it in `voice/`; this step is not yet verified against a live generation). Never repeat a call to retry (it charges again). With a file-writing MCP server (`text_to_speech`): set its output directory to `voice/` and rename to `scene-<n>`. Their own recording: same names.
5. `voice.mjs place motion-out/<slug>/STORYBOARD.json --dir motion-out/<slug>/voice [--retime]` puts each line on its scene (`--retime` lengthens scenes that are too short for the real recording; the script and storyboard approvals then go stale and are shown again) and writes `track.wav`, `cues.json` and `captions.srt` / `.vtt`. Then the animatic with `--voice`.
6. Record the voice in the licence ledger: `ledger.mjs add motion-out/<slug>/voice/track.wav --dir motion-out/<slug> --kind voice --license ELEVENLABS-PAID|ELEVENLABS-FREE|USER-OWNED --source "<provider, voice name and id, model>" --creator "<voice>" [--attribution "Voice: elevenlabs.io"] --notes "<plan, model, date>"`. Free-plan audio makes delivery ask for a stated non-commercial use.

## 5. Build gate and first shot
`node $PP/preprod.mjs check motion-out/<slug> build` must say READY before the full build (stale = a file changed after its approval: show the new one and ask again). Then:
- Build the first scene at full quality, show stills of it (and a short clip when you can) and, in Hands-on (or whenever several scenes share one style), ask **This is the direction** | **Change it** before building the rest. Gate `first-shot` on the still or clip they saw.
- Every later change the user asks for in review is recorded with `preprod.mjs changes`, so the board shows how the piece got where it is.
- With a voice-over: mix with `voice.mjs mix --voice voice/track.wav --bed <music and hits .wav> --out mix.wav` (the bed goes down 10 dB under every line), export with `CAPTIONS=voice/captions.srt export.sh ...` for muted feeds (for YouTube, upload `captions.srt` as a caption track instead).

## 6. The board
`node $PP/preprod.mjs board motion-out/<slug>` writes `preprod/board.html`: every gate in order with what was shown (images, the feel and animatic videos playing, the brief-back and script, the voice line) and every answer in the user's words. Give the path whenever the user wants to see everything at once, and at the end. `preprod.mjs status` is the same in text.

## Rules
- **Show, then ask.** Prefer a picture, a video or a voice sample with numbered options over adjectives. Read every image before you present it; never present one you have not looked at.
- **Never show what they ruled out** ("not dark" means `--avoid dark`, and no dark direction or feel sample either).
- **Nothing unseen is approved.** Every scene is a real frame or a sketch before the storyboard gate; every voice is heard before all lines are generated.
- **One decision per question.** At most 4 questions per AskUserQuestion call; free-text answers go in chat. Never ask what they already told you; state an assumption instead and list it in the brief-back.
- **Their words, verbatim.** `--words` is what the user said, not your summary. No approval without one; an approval binds to the file they saw (`--file`, plus STORYBOARD.json for scene gates).
- **Change requests loop back** to the gate they belong to: a new word reopens the script, a new scene reopens the storyboard, a retimed scene reopens the animatic.
- **Money and data are the user's.** Price paid generations first, generate only after a yes, never retry by calling again, and say what is sent where.
- **Respect the level.** Quick does not get a storyboard lecture; Hands-on gets every gate. The user can switch at any time (`init --force` starts the record over; `require <gate> on|off --why` adjusts one gate; `scenes` sets the scene count).
- Honest limits: boards and storyboard frames are real renders of the templates, so they show what the build can do, not more; a custom scene is a sketch until it is built; stills cannot show motion (point to the feel and animatic videos); voice samples read the provider's text until their own line is generated.
