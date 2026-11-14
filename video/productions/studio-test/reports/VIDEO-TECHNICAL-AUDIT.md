# Video technical audit: Studio test video

Generated 2026-11-12 15:17 by `python video/studio.py audit studio-test --only technical`. Do not edit by hand.

**Result: PASS** (17 passed, 0 failed, 0 warnings, 0 not run)

File inspected: `renders/studio-test-16x9-final.mp4`

| Check | Result | Detail |
|---|---|---|
| Render file exists | PASS | studio-test-16x9-final.mp4, 10.11 MB |
| Container is MP4 | PASS | mov,mp4,m4a,3gp,3g2,mj2 |
| Video stream present | PASS |  |
| Video codec is H.264 | PASS | h264 (High) |
| Pixel format is yuv420p | PASS | yuv420p |
| Resolution matches the render plan | PASS | 1920x1080, planned 1920x1080 |
| Frame rate matches the render plan | PASS | 30 fps, planned 30 |
| Duration matches the timeline | PASS | 35.800s, planned 35.800s |
| Final render is full resolution | PASS | 1920x1080 for 16x9 |
| Square pixels | PASS | not stated |
| Audio codec is AAC | PASS | aac, 48000 Hz, 2 ch |
| Audio sample rate is 48 kHz | PASS | 48000 |
| Audio and video lengths agree | PASS | video 35.800s, audio 35.800s, difference 0.000s |
| Audio and video start together | PASS | video starts 0.000s, audio 0.000s |
| Whole file decodes without errors | PASS | ffmpeg decoded every frame and sample, no messages |
| Decoded frame count matches | PASS | 1074 frames decoded, 1074 planned |
| Fast start (index before media data) | PASS | moov atom is at the front |

## File facts

- Size: 10,603,626 bytes
- SHA-256: `25072e2186f4df6cd39f7ea9efae7114363e96a98894b789e3abc4517cbc2a16`
- 1920x1080, 30 fps, 35.800s, h264 + aac, 2369 kb/s
