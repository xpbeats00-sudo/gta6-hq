# Video technical audit: GTA 6 HQ trailer

Generated 2026-11-12 15:14 by `python video/studio.py audit gta6-hq-trailer --only technical`. Do not edit by hand.

**Result: PASS** (17 passed, 0 failed, 0 warnings, 0 not run)

File inspected: `renders/gta6-hq-trailer-16x9-final.mp4`

| Check | Result | Detail |
|---|---|---|
| Render file exists | PASS | gta6-hq-trailer-16x9-final.mp4, 32.66 MB |
| Container is MP4 | PASS | mov,mp4,m4a,3gp,3g2,mj2 |
| Video stream present | PASS |  |
| Video codec is H.264 | PASS | h264 (High) |
| Pixel format is yuv420p | PASS | yuv420p |
| Resolution matches the render plan | PASS | 1920x1080, planned 1920x1080 |
| Frame rate matches the render plan | PASS | 30 fps, planned 30 |
| Duration matches the timeline | PASS | 60.500s, planned 60.500s |
| Final render is full resolution | PASS | 1920x1080 for 16x9 |
| Square pixels | PASS | not stated |
| Audio codec is AAC | PASS | aac, 48000 Hz, 2 ch |
| Audio sample rate is 48 kHz | PASS | 48000 |
| Audio and video lengths agree | PASS | video 60.500s, audio 60.500s, difference 0.000s |
| Audio and video start together | PASS | video starts 0.000s, audio 0.000s |
| Whole file decodes without errors | PASS | ffmpeg decoded every frame and sample, no messages |
| Decoded frame count matches | PASS | 1815 frames decoded, 1815 planned |
| Fast start (index before media data) | PASS | moov atom is at the front |

## File facts

- Size: 34,241,415 bytes
- SHA-256: `e297f2ef086aeb9d355d47faa03b9c63ab7ef730bcd28db4481a47fc58c78011`
- 1920x1080, 30 fps, 60.500s, h264 + aac, 4527 kb/s
