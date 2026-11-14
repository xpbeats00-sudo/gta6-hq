# Caption audit: GTA 6 HQ trailer

Generated 2026-11-12 15:16 by `python video/studio.py audit gta6-hq-trailer --only captions`. Do not edit by hand.

**Result: PASS** (11 passed, 0 failed, 0 warnings, 3 not run)

| Check | Result | Detail |
|---|---|---|
| Caption file exists | PASS | 10 cues in captions/gta6-hq-trailer.srt; WebVTT present |
| Caption file matches the project | PASS | 10 cues in the file, 10 in the project (re-run the captions command after editing the project) |
| Cues are in order and do not overlap | PASS | ordered |
| Each cue stays up long enough, and not too long | PASS | all between 1.0s and 7.0s |
| Reading speed | PASS | all at or under 20 characters a second |
| Line count and line length | PASS | at most 2 lines of 42 characters |
| Cues are inside the video | PASS | last cue ends 51.31s, video is 60.51s |
| Every spoken line is captioned | SKIP | no narration: captions carry the message on their own |
| Caption wording matches the approved script | PASS | every caption word appears in script.md; no doubled words |
| Dictionary spell check | SKIP | no spelling dictionary is installed; wording is checked against the approved script instead, so the script itself needs a human read |
| Burned-in captions sit in the lower safe area | PASS | 10 caption boxes checked |
| Burned-in captions keep to two lines and the caption width | PASS | measured on the boxes the renderer drew, which break lines where the .srt does |
| Captions do not cover other text | PASS | no overlaps with titles, cards or credits |
| Speech recognition cross-check (Whisper) | SKIP | no Whisper model in video/models; see the installation guide |
