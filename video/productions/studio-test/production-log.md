# Production log: Studio test video

| Date | Stage | Who | Result |
|---|---|---|---|
| 2026-11-12 | Footage | video engineer | `footage/test-pattern.mp4` generated with `ffmpeg -f lavfi -i mandelbrot=s=1280x720:r=30:maxiter=120:end_scale=0.05 -t 8` |
| 2026-11-12 | Research, script, storyboard | main session | 7 claims about the studio's own code; 5 scenes |
| 2026-11-12 | Audio | main session | Synth score, effects and Windows test narration built; first build hung on a slow smoothing step, fixed in the engine |
| 2026-11-12 | Preview and audits | main session | Audio audit failed on loudness (-16.2 LUFS); normalisation rewritten as gain plus limiter; passed on re-run |
| 2026-11-12 | Final render 1 | main session | 1920x1080, 32.80 s |
| 2026-11-12 | Independent QA | QA auditor agent | 12 findings: stale checksum (blocker); burned-in captions on one line; credits roles and names run together and too brief; wrong numbers readable during the count-up; badge leaving the safe area in the push; flat pink flash; weak evidence for c7; thin log |
| 2026-11-12 | Fixes | main session | Engine: captions break as the .srt does; credits in two styles and held longer; numbers shown true from the start; badge drawn above transitions; softer flash; checksums refreshed when audio is rebuilt; c7 now checked by wording |
| 2026-11-12 | Final render 2 and delivery | main session | See `reports/FINAL-DELIVERY-REPORT.md` |
