# Audio audit: GTA 6 HQ trailer

Generated 2026-11-12 15:16 by `python video/studio.py audit gta6-hq-trailer --only audio`. Do not edit by hand.

**Result: PASS** (9 passed, 0 failed, 0 warnings, 2 not run)

| Check | Result | Detail |
|---|---|---|
| Audio stream present | PASS | aac, 2 channels |
| No clipped samples | PASS | 0 samples at full scale; sample peak -2.23 dBFS |
| Programme loudness on target | PASS | -14.3 LUFS integrated; target -14.0 within 1.5 LU, loudness range 9.8 LU |
| True peak below the ceiling | PASS | -2.2 dBTP; ceiling -1.0 dBTP |
| No long silence | PASS | none of 2.0s or longer below -50 dB |
| Mix length matches the video | PASS | mix 60.51s, video 60.50s |
| Every cut lands on a bar line | PASS | 11 cuts, each within one frame of a bar line at 135 BPM |
| Measured music tempo matches the beat grid | PASS | measured 135.01 BPM in the music stem, grid uses 135 |
| Measured beats line up with the grid | PASS | beats in the music fall 20 ms from the grid (limit 70 ms, under two frames) |
| Narration timing | SKIP | this production has no narration |
| Music stays under narration | SKIP | this production has no narration |
