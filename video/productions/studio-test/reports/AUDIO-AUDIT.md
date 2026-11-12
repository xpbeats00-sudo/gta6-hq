# Audio audit: Studio test video

Generated 2026-11-12 15:01 by `python video/studio.py audit studio-test --only audio`. Do not edit by hand.

**Result: PASS WITH WARNINGS** (10 passed, 0 failed, 1 warnings, 0 not run)

| Check | Result | Detail |
|---|---|---|
| Audio stream present | PASS | aac, 2 channels |
| No clipped samples | PASS | 0 samples at full scale; sample peak -2.62 dBFS |
| Programme loudness on target | PASS | -14.4 LUFS integrated; target -14.0 within 1.5 LU, loudness range 5.2 LU |
| True peak below the ceiling | PASS | -2.6 dBTP; ceiling -1.0 dBTP |
| No long silence | PASS | none of 2.0s or longer below -50 dB |
| Mix length matches the video | PASS | mix 35.80s, video 35.80s |
| Narration starts where planned | PASS | 4 lines within 0.35s of plan |
| Narration fits inside its scene | PASS | every line ends before its scene does |
| Narration lines do not overlap | PASS | no overlaps |
| Music stays under narration | PASS | narration at least 8.0 dB above the music in every line |
| Narration voice | WARN | synthetic TEST narration (sapi); label it as test audio, do not present it as a real voice-over |
