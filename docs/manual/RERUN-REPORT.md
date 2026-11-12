> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# Field Manual: rerun report (wanted stars from real footage)

Date: 2026-11-12. This supersedes the parts of `FINAL-6-HOUR-REPORT.md`, `CONTENT-STATUS.md` and `ASSET-AND-RIGHTS-REGISTER.md` that say the Extended Look was not seen, that only one claim is "Demonstrated", and that the game's wanted and Heat display is not pictured.

## What the rerun was for

The first run could not view Rockstar's "An Extended Look", so what the manual said about the wanted stars rested on guides. The owner asked for real information and real images.

## How the footage was obtained

Rockstar's media page (`rockstargames.com/VI/media/videos`) links an official download: `GTAVI_An_Extended_Look.mp4`, 3840×2160, 26:48, 14.1 GB. It was **not downloaded whole**. Single frames were read from Rockstar's server at chosen times:

| Pass | Frames | Purpose |
|---|---|---|
| Whole video, every 12 s | 134 | Find where the wanted display appears |
| 10:00 to 19:00, every 4 s | 136 | Find every star state in the gameplay stretch |
| Full-resolution crops, every 1 to 4 s | 77 | Read the stars and icons exactly |
| Whole frames | 22 | See what is happening in the scene |

The video was read as stills, not watched in motion. Evidence sheets with a key: `research/frames/`.

## What the footage shows (seconds from the start of the file)

| Observation | When | Evidence |
|---|---|---|
| Six positions at the top right; unlit ones are dim placeholders; lit stars are always the right-most | Every frame with a display | Sheets A to D |
| **Gray stars**: two, with five Heat icons (camera, two heads, coat hanger, head, pistol) | 708 to 712 s (11:48 to 11:52), and 728 s (12:08). At 11:48 the scene is a convenience store | Sheet A; scan |
| **White stars**: four, with four icons (two heads, coat hanger, head, car) | 844 to 872 s (14:04 to 14:32) and 920 to 940 s (15:20 to 15:40). At 14:08 a character fires a rifle at a police pickup | Sheets A, B |
| **Red stars**: four | 950 to 992 s (15:50 to 16:32). Car inside a parking garage by 15:53; two characters on foot by 15:59 | Sheets B, C |
| Car icon present, then gone | Present at 950, 953, 956 s; absent from 959 s. Stars red throughout | Sheet B |
| Camera icon alone, no stars | 1081 to 1083 s (18:01 to 18:03), inside a jewelry store | Sheet D |
| **Hollow stars**: two outlined stars with dark centres, no icons | 1084 to 1091 s (18:04 to 18:11), as two masked characters get onto a motorcycle | Sheet D |
| Two white stars with three icons, then four | 1104 to 1108 s, then 1120 to 1124 s | Sheet C, D |

Gray and hollow are different drawings: gray has a mid-gray fill and a thin dark outline; hollow has a dark centre inside a white ring. The fact-check agent compared them over the same pale background and agreed.

## What changed in the manual

- **"The Wanted Level"** rewritten around the footage; the drawn six-star illustration is gone.
- **New page, "The Stars Change Appearance"**: the four looks, each with its real frame, the time, and what the scene shows. Only the hollow stars have a meaning stated by Rockstar (Rob Nelson, IGN: the police do not know who you are). The gray, white and red meanings are labelled as guides' and creators' readings.
- **"What the Police Know"** and **"Evidence That Can Identify You"**: the six icons are now shown and described from the footage; the pistol and camera icons are Demonstrated to exist, while what they mean remains Interpretation.
- **"Clear the Clues"**: the car icon disappearing is now Demonstrated, with a before-and-after pair of frames.
- The Law Enforcement chapter is now 11 pages; the book is 31.

| Evidence label | Before the rerun | After |
|---|---|---|
| Developer-described | 24 | 24 |
| Demonstrated | 2 | 12 |
| Interpretation | 13 | 14 |
| Preview-reported | 7 | 7 |
| Unknown | 2 | 2 |

## Independent fact-check

A separate agent compared every revised claim with the frame sheets and re-opened the sources (`research/FACT-CHECK-STARS.md`): 33 items, 16 pass, 15 reword, 2 need a source, none wrong on star count, colour, icon shape or icon count. All 17 were applied:

- Scene descriptions cut back to what a frame shows ("fires a rifle at a police pickup", not "a firefight"; "get onto a motorcycle across the road from a jewellers", not "ride away from a jewelry store").
- The gray stars' time range corrected: 11:48 to 11:52 and again at 12:08, not a continuous 11:48 to 12:08.
- "Stars light from the right" reworded to "the lit stars are the right-most ones": no frame shows one being lit.
- The change from white to red is stated as not seen.
- Guides' readings quoted for what each guide actually says, and moved out of Demonstrated blocks into Interpretation blocks with their own sources.
- A credit with a time added under every frame.
- The opening page's note about pictures corrected: the large photographs are illustrative; the small frames of the display are evidence.

## Images added

Eight frames of the official video in `images/manual/footage/`, each recorded in `data/media.json` as a frame of Rockstar's Extended Look at a stated time, rights status "permission needed". Four more frames were cut and then removed because the manual did not use them.

## Checks

| Check | Result |
|---|---|
| `cargo fmt --all -- --check`, `cargo clippy … -D warnings` | Exit 0 |
| `cargo test` | 53 passed (the manual-image test now also covers frames) |
| `cargo build --release` | Exit 0 |
| `gta6-hq --validate` | 0 errors, 45 warnings (all media rights); no manual issues |
| `node --check ui/manual.js` | Exit 0 |
| Star pages render with frames and credits | Seen in screenshots (`screenshots/manual-stars-overview.jpg`) |
| Night Reading on the star pages | Pass |
| Phone width (375 px), 7 manual pages | No sideways overflow; frames stay inside the page |
| Console errors | None |

## Still not established

- **Flashing white stars**, reported by creators: stills cannot show flashing.
- **The moment and cause of each change** (white to red, hollow to anything else).
- **What gray, white and red mean**, in Rockstar's words.
- Anything shorter than the gap between frames, and everything outside 10:00 to 19:00 at finer than 12-second steps.
- Whole-frame context exists for 12 moments only.

## Research agent

A second agent collected first-hand statements about the stars (`research/STARS-EVIDENCE.md`: 33 claims traced to their origin). It viewed no footage. Nothing it found contradicts the manual's Rob Nelson paragraphs. Its main findings:

- Only the hollow stars have a meaning stated by the developer. Rockstar's own pages say nothing about stars.
- The solid, flashing and red readings in VICE and GTABase all originate with one creator, TGG, who attended the preview. Gray comes from one guide author who did not attend.
- It suggested the gray stars might be the dim phase of "flashing white", and that the two white stars at 18:24 might follow the hollow stars directly. Both were then tested in the footage.

### Tested in the footage afterwards

| Question | Frames read | Result | Sheet in `research/frames/` |
|---|---|---|---|
| Do the gray stars flash? | 706.5 to 713.5 s at 6 per second (42 frames); 725 to 731 s at 6 per second | No. Two stars stay gray in every frame with a display (to about 713.5 s, and about 726.3 to 729.2 s). The five icons do not change | `gray_706.5-713.5_6fps.jpg`, `gray_725-731_6fps.jpg` |
| Is a hollow-to-solid change on screen? | 1089 to 1107 s at 2 per second | No. Hollow stars until about 1092 s; no display for about 12 s; then two solid white stars with three icons (coat hanger, head, car) and a red "LIVE" label at the left | `hollow-to-white_1089-1107_2fps.jpg` |

### Applied to the manual

- White and red readings now credit TGG as an attendee and are labelled Preview-reported; two GamesRadar+ writers' independent readings of red stay Interpretation.
- The gray entry states that the stars do not flash, and that no attendee or developer mentions gray.
- The unknown list now names: flashing white (reported by one attendee, not found), the meaning of gray, and the two changes that are not on screen.
- "Splitting up takes a star off" is credited to one attendee.
- Two sources added: TGG's video and Dustin Bailey's GamesRadar+ news piece. Both were read by the research agent (TGG's as auto-captions, star-related parts only), not by the lead.

Law Enforcement labels after this pass: Developer-described 24, Demonstrated 12, Interpretation 12, Preview-reported 9, Unknown 2. The book is 32 pages. `--validate`: 0 errors, 45 warnings (all media rights); `cargo test`: 53 passed; the page was read in the running app with no console errors.

Not done: ign.com could not be opened, so IGN's written demo preview is unread; TGG's "bank" description of the hollow-star clip was not adopted because the frames show a jewellers.
