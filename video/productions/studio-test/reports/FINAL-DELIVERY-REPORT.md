# Final delivery report: Studio test video

Generated 2026-11-12 15:00 by `python video/studio.py deliver studio-test`. Do not edit by hand.

**Result: DELIVERED**

## The file

- `renders/studio-test-16x9-final.mp4`
- 1920x1080, 30 fps, 35.80s, h264 + aac
- 10,585,596 bytes, SHA-256 `329a07d6ead97348ffb5def8f8097e8e5bf168cd37dee0e82de0769d467dd57c`

## Audits

| Audit | Result | Passed | Failed | Warnings | Not run | Report |
|---|---|---|---|---|---|---|
| Research and fact check | PASS | 10 | 0 | 0 | 0 | `reports/RESEARCH-AND-FACT-CHECK.md` |
| Script audit | PASS | 8 | 0 | 0 | 0 | `reports/SCRIPT-AUDIT.md` |
| Storyboard audit | PASS | 6 | 0 | 0 | 0 | `reports/STORYBOARD-AUDIT.md` |
| Asset licence audit | PASS | 6 | 0 | 0 | 0 | `reports/ASSET-LICENSE-AUDIT.md` |
| Video technical audit | PASS | 17 | 0 | 0 | 0 | `reports/VIDEO-TECHNICAL-AUDIT.md` |
| Visual quality audit | PASS | 12 | 0 | 0 | 0 | `reports/VISUAL-QUALITY-AUDIT.md` |
| Audio audit | PASS WITH WARNINGS | 10 | 0 | 1 | 0 | `reports/AUDIO-AUDIT.md` |
| Caption audit | PASS | 13 | 0 | 0 | 2 | `reports/CAPTION-AUDIT.md` |

## Failures

None.

## Warnings that need a human decision

- **Audio audit**, Narration voice: synthetic TEST narration (sapi); label it as test audio, do not present it as a real voice-over

## Checks that could not be run

- **Caption audit**, Dictionary spell check: no spelling dictionary is installed; wording is checked against the approved script instead, so the script itself needs a human read
- **Caption audit**, Speech recognition cross-check (Whisper): no Whisper model in video/models; see the installation guide

## Delivered with it

- `captions/studio-test.srt`
- `captions/studio-test.vtt`

What these audits cannot judge: whether the video is good, whether the music suits it, and whether colours and motion feel right. A person should watch it once before it is published.
