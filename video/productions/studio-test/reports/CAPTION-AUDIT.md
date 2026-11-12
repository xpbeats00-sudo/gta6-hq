# Caption audit: Studio test video

Generated 2026-11-12 15:01 by `python video/studio.py audit studio-test --only captions`. Do not edit by hand.

**Result: PASS** (13 passed, 0 failed, 0 warnings, 2 not run)

| Check | Result | Detail |
|---|---|---|
| Caption file exists | PASS | 6 cues in captions/studio-test.srt; WebVTT present |
| Caption file matches the project | PASS | 6 cues in the file, 6 in the project (re-run the captions command after editing the project) |
| Cues are in order and do not overlap | PASS | ordered |
| Each cue stays up long enough, and not too long | PASS | all between 1.0s and 7.0s |
| Reading speed | PASS | all at or under 20 characters a second |
| Line count and line length | PASS | at most 2 lines of 42 characters |
| Cues are inside the video | PASS | last cue ends 26.01s, video is 35.80s |
| Every spoken line is captioned | PASS | 4 narration lines covered |
| Captions are in sync with speech | PASS | within 0.35s of each line |
| Caption wording matches the approved script | PASS | every caption word appears in script.md; no doubled words |
| Dictionary spell check | SKIP | no spelling dictionary is installed; wording is checked against the approved script instead, so the script itself needs a human read |
| Burned-in captions sit in the lower safe area | PASS | 6 caption boxes checked |
| Burned-in captions keep to two lines and the caption width | PASS | measured on the boxes the renderer drew, which break lines where the .srt does |
| Captions do not cover other text | PASS | no overlaps with titles, cards or credits |
| Speech recognition cross-check (Whisper) | SKIP | no Whisper model in video/models; see the installation guide |
