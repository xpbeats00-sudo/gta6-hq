# Research and fact check: Studio test video

Generated 2026-11-12 15:17 by `python video/studio.py audit studio-test --only facts`. Do not edit by hand.

**Result: PASS** (10 passed, 0 failed, 0 warnings, 0 not run)

| Check | Result | Detail |
|---|---|---|
| Research notes exist | PASS | research.md |
| Claims register exists | PASS | 7 claims |
| Every claim has text, kind and source | PASS | complete |
| Every claim is marked fact, speculation, opinion or quote | PASS | marked |
| Every fact re-checked against its source | PASS | 7 of 7 facts verified now by wording or count, against the files in this repository |
| Scenes cite only claims that exist | PASS | all references resolve |
| Every scene with wording cites its claims | PASS | each scene lists claims, or is marked no_claims (branding or credits only) |
| Speculation is never shown as fact | PASS | no speculation used on screen |
| Every number on screen is backed by a cited claim | PASS | all numbers trace to a claim |
| No unsourced quotations | PASS | no quotations used |

## Claims

| Id | Kind | Claim | Source | Re-check |
|---|---|---|---|---|
| c1 | fact | The studio has 8 automated audits. | video/engine/audits.py | "ORDER = ['facts', 'script', 'storyboard', 'licence', 'technical', 'visual', 'audio', 'captions']" found in video/engine/audits.py |
| c2 | fact | The studio renders 3 output formats: 16:9, 9:16 and 1:1. | video/engine/config.py | "FORMATS = {'16x9': (1920, 1080), '9x16': (1080, 1920), '1x1': (1080, 1080)}" found in video/engine/config.py |
| c3 | fact | The studio has templates for 7 kinds of video. | video/engine/config.py | "KINDS = ['cinematic-trailer', 'documentary', 'game-trailer', 'tutorial', 'explainer'," found in video/engine/config.py |
| c4 | fact | The renderer has 4 transition styles. | video/engine/render.py | "TRANSITIONS = {'crossfade': t_crossfade, 'flash': t_flash, 'push': t_push, 'slant': t_slant}" found in video/engine/render.py |
| c5 | fact | The footage in scene s03 is a test pattern generated with FFmpeg. | video/productions/studio-test/production-log.md | "mandelbrot" found in video/productions/studio-test/production-log.md |
| c6 | fact | The narration is test narration from a synthetic voice, not a recorded voice-over. | video/productions/studio-test/audio.json | ""engine": "sapi"" found in video/productions/studio-test/audio.json |
| c7 | fact | The pipeline order is research, script, storyboard, audio, render, audit. | video/docs/VIDEO-STUDIO-MASTER-PLAN.md | "Research, fact check, creative direction, script, storyboard, asset generation, voiceover, sound design, editing, rendering, independent QA, final delivery." found in video/docs/VIDEO-STUDIO-MASTER-PLAN.md |

Facts are re-checked by this script every time it runs. Speculation and opinion are listed so they are never mistaken for facts.
