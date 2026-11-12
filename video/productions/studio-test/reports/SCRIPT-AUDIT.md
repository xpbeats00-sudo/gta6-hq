# Script audit: Studio test video

Generated 2026-11-12 15:17 by `python video/studio.py audit studio-test --only script`. Do not edit by hand.

**Result: PASS** (8 passed, 0 failed, 0 warnings, 0 not run)

| Check | Result | Detail |
|---|---|---|
| Script exists | PASS | 231 words |
| Script covers every scene | PASS | 5 scenes |
| On-screen and spoken wording is the approved script wording | PASS | every title, caption, card and narration line appears in script.md |
| Narration pace | PASS | no line needs more than 175 words a minute |
| On-screen text can be read in the time given | PASS | at most 4 words a second in every scene; credits at most 5.5 a second, counting only the time they are fully on screen |
| Says "unofficial" | PASS | present on screen or in narration |
| Says "test narration" | PASS | present on screen or in narration |
| No banned wording | PASS | official app, release date absent |
