# Video studio QA standards

What a video must pass before it is called delivered, and how each point is measured. The checks are in `video/engine/audits.py`; the numbers are in `video/engine/config.py` (`QA`). Run them with `python video/studio.py audit <name>`.

## Results

| Result | Meaning |
|---|---|
| PASS | Measured, and inside the limit |
| FAIL | Measured, and outside the limit. Delivery is refused |
| WARN | A person must decide (for example uncleared third-party material). Delivery is allowed, and the warning is printed in the delivery report |
| SKIP | The check could not be run here. The reason is given. A skipped check is never counted as passed |

`python video/studio.py deliver <name>` runs all eight audits on the final render and writes `reports/FINAL-DELIVERY-REPORT.md`. It says DELIVERED only when there is no FAIL.

## 1. Factual accuracy: `RESEARCH-AND-FACT-CHECK.md`

| Check | How it is measured |
|---|---|
| Research notes and a claims register exist | `research.md`, `claims.json` |
| Every claim has text, kind and source | Fields present |
| Every claim is marked fact, speculation, opinion or quote | `kind` field |
| Every fact is re-checked against its source | The audit re-reads the named file each time it runs: `text_in_file` (exact wording present) or `json_count` (a count in a data file) |
| Facts whose wording was not machine-checked | A fact backed only by `file_exists` or `observed` gives a WARN and is listed for a person to confirm |
| Every scene with wording cites its claims | `claims` on the scene, or `no_claims` for pure branding |
| Speculation is never shown as fact | A scene citing a speculation claim must be marked `labelled_speculation` |
| Every number on screen is backed by a cited claim | Each number in titles, captions, cards and stats must appear in a cited claim |
| No unsourced quotations | Quoted text needs a claim of kind `quote` |

Limit of this audit: it proves that the video says only what the register says, and that the register matches the repository. It cannot judge whether a source outside the repository is right.

## 2. Script: `SCRIPT-AUDIT.md`

| Check | Limit |
|---|---|
| Script covers every scene | A section naming each scene id |
| On-screen and spoken wording is the approved wording | Every title, caption, card and narration line appears in `script.md` |
| Narration pace | At most 175 words a minute |
| On-screen text can be read in time | At most 4 words a second. Credits at most 5.5 a second, counting only the time they are fully on screen (not the first second or the closing fade) |
| Required wording present | Each phrase in `meta.must_say`, for example "unofficial" |
| Banned wording absent | Each phrase in `meta.must_not_say` |

## 3. Storyboard: `STORYBOARD-AUDIT.md`

Every scene has a row and every row a scene; same order as the edit; each row gives the scene's length (within 0.05 s) and names its footage file; the stated total matches the edit within 0.1 s.

## 4. Licences: `ASSET-LICENSE-AUDIT.md`

| Check | Limit |
|---|---|
| Every file used is in the register | All files referenced by the edit, and everything in `footage/`, `audio/`, `images/` |
| Every record is complete | Source, creator, licence, attribution, permission, commercial limits, status. No `TODO` |
| Recognised status | `owned`, `licensed`, `permission`, `system`, `uncleared` |
| Checksums match | SHA-256 of each file |
| Third-party rights | Any `uncleared` asset gives a WARN: the video is not cleared for public or commercial release until the owner decides |
| Points the owner must confirm | Any record with a `confirm` note gives a WARN |

Nothing in this audit is legal advice.

## 5. Technical: `VIDEO-TECHNICAL-AUDIT.md`

| Check | Limit |
|---|---|
| Container, codecs | MP4, H.264, yuv420p, AAC at 48 kHz |
| Resolution, frame rate | Exactly as planned; finals are 1920x1080, 1080x1920 or 1080x1080 |
| Duration | Within 0.25 s of the timeline |
| Audio and video lengths agree | Within 0.10 s |
| Audio and video start together | Within 0.05 s |
| Whole file decodes | FFmpeg decodes every frame and sample with no message |
| Frame count | Decoded frames equal planned frames |
| Fast start | Index at the front of the file |

## 6. Visual quality: `VISUAL-QUALITY-AUDIT.md`

| Check | Limit |
|---|---|
| Every referenced asset exists | No missing file |
| No forbidden logo in the picture | Final renders are searched, two frames a second, for the Rockstar Games logo (reference in `config.FORBIDDEN_MARKS`): a grey-scale template search at about thirty sizes from 12 to 125 pixels, each candidate then confirmed in colour. A match of 0.64 or more fails. Tested on a render known to contain the logo (found, 0.67 to 0.68) and on scenes without it (0.61 at most), so the margin is small: this check is an aid, and a person must still look |
| No black stretches | None of 0.5 s or longer (`blackdetect`) |
| No frozen picture | None of 2 s or longer (`freezedetect`), unless the scene is marked `allow_static` |
| Aspect ratio | Matches the format |
| No renderer warnings | No footage that ran out or was missing |
| Text inside the safe area | Every text block the renderer drew lies inside the safe area: 5% margins for 16:9, 6% for 1:1, and for 9:16 6% sides, 10% top, 16% bottom |
| Footage not enlarged | At most 1.3 times its own resolution (final renders; WARN) |
| Transitions | Frames before, during and after each one: never black in the middle, and the picture must change |
| No scene nearly black | Mean level above 12 of 255 at each scene's midpoint |
| Contact sheet | One frame per scene written to `reports/`, for a person or the QA agent to look at |

## 7. Audio: `AUDIO-AUDIT.md`

| Check | Limit |
|---|---|
| Audio present | A stream exists |
| No clipping | No sample at full scale |
| Loudness | -14 LUFS integrated, within 1.5 LU (EBU R128) |
| True peak | At or below -1.0 dBTP |
| No long silence | None of 2 s or longer below -50 dB |
| Mix length | Within 0.25 s of the video |
| Cuts on the beat (beat-synced videos) | Each cut within one frame of a bar line |
| Music tempo matches the grid | Tempo measured in the music stem within 0.3 BPM of the grid; beats within 70 ms |
| Narration starts where planned | Within 0.35 s |
| Narration fits its scene, no overlaps | Each line ends before its scene does |
| Music under narration | Narration at least 8 dB above the music |
| Narration voice | Synthetic test narration gives a WARN |

## 8. Captions: `CAPTION-AUDIT.md`

| Check | Limit |
|---|---|
| Files exist and match the project | `.srt` and `.vtt`, same cues as the edit |
| Order | No overlaps |
| Time on screen | 1 to 7 s each |
| Reading speed | At most 20 characters a second |
| Shape | At most 2 lines of 42 characters |
| Every spoken line captioned | At least 90% of the spoken words, within the line's time |
| In sync with speech | Within 0.35 s |
| Wording | Every caption word appears in the approved script; no doubled words |
| Position | Burned-in captions in the lower safe area, not covering other text the studio drew |
| Burned-in shape | The boxes the renderer drew keep to two lines and the caption width; burned-in captions break where the `.srt` does |
| Dictionary spell check | SKIP: no dictionary installed. A person must read the script |
| Speech recognition cross-check | SKIP until a Whisper model is present |

## Known limits of the audits

Found by the independent QA passes on 2026-11-12, and not fixed by a script:

- The safe-area check uses each text block's resting position. It does not follow text while it animates or during a transition.
- Captions and labels are checked against the studio's own text, not against text inside filmed footage. A caption can sit on top of words in the app.
- Nothing checks that a caption is true of the picture under it. The fact audit checks the wording against the claims register, not against the footage.
- Nothing measures how smoothly footage moves. `freezedetect` only finds stills of two seconds or more. Film scrolling pages with stepped capture.
- The black check needs half a second, so a black first frame (the fade-in) passes.
- The transition check only proves the picture changed and never went black.
- Required wording is read from `project.json`, not from the pixels.
- Third-party material inside screen recordings (logos, credits lines, embedded pictures in audio files) is found only by the logo search above or by a person.

## What no audit can judge

Whether the video is good: pacing, taste, whether the music suits the picture, whether colours and motion feel right. The independent QA agent looks at the contact sheet and sampled frames, and a person should watch the video once before it is published.

## The independent QA pass

The QA auditor agent (`.claude/agents/video-qa-auditor.md`) did not make the video. It runs the audits itself, looks at frames itself, never edits the production, and reports each finding with the scene, the time and the evidence. The makers fix; the auditor checks again.
