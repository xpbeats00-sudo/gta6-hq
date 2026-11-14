# Asset licence audit: Studio test video

Generated 2026-11-12 15:17 by `python video/studio.py audit studio-test --only licence`. Do not edit by hand.

**Result: PASS** (6 passed, 0 failed, 0 warnings, 0 not run)

| Check | Result | Detail |
|---|---|---|
| Asset register exists | PASS | 11 assets |
| Every file used is in the register | PASS | 9 files used, all registered |
| Every record is complete | PASS | source, creator, licence, attribution, permission, commercial limits and status all filled in |
| Every record has a recognised rights status | PASS | owned, licensed, permission, system, uncleared |
| Recorded checksums match the files | PASS | all match |
| Third-party rights | PASS | no uncleared third-party material |

## Assets

| File | Kind | Source | Creator | Licence | Attribution | Permission | Commercial use | Status |
|---|---|---|---|---|---|---|---|---|
| audio/mix.wav | final mix | Synthesised by video/engine/audio.py (mix also contains the test narration) | GTA 6 HQ video studio (generated on this machine) | Owned by the project owner | None required | Not needed | No limit from this asset | owned |
| audio/music.wav | music stem | Synthesised by video/engine/audio.py | GTA 6 HQ video studio (generated on this machine) | Owned by the project owner | None required | Not needed | No limit from this asset | owned |
| audio/narration-01.wav | test narration (synthetic voice) | Windows built-in speech synthesiser (System.Speech), driven by video/engine/audio.py | Generated on this machine; voice by Microsoft | Microsoft Windows licence terms for the built-in voice | None; label as test narration | Not requested | Test use only: do not publish as a voice-over without checking the Windows voice terms | system |
| audio/narration-02.wav | test narration (synthetic voice) | Windows built-in speech synthesiser (System.Speech), driven by video/engine/audio.py | Generated on this machine; voice by Microsoft | Microsoft Windows licence terms for the built-in voice | None; label as test narration | Not requested | Test use only: do not publish as a voice-over without checking the Windows voice terms | system |
| audio/narration-03.wav | test narration (synthetic voice) | Windows built-in speech synthesiser (System.Speech), driven by video/engine/audio.py | Generated on this machine; voice by Microsoft | Microsoft Windows licence terms for the built-in voice | None; label as test narration | Not requested | Test use only: do not publish as a voice-over without checking the Windows voice terms | system |
| audio/narration-04.wav | test narration (synthetic voice) | Windows built-in speech synthesiser (System.Speech), driven by video/engine/audio.py | Generated on this machine; voice by Microsoft | Microsoft Windows licence terms for the built-in voice | None; label as test narration | Not requested | Test use only: do not publish as a voice-over without checking the Windows voice terms | system |
| audio/narration.wav | test narration (synthetic voice) | Windows built-in speech synthesiser (System.Speech), driven by video/engine/audio.py | Generated on this machine; voice by Microsoft | Microsoft Windows licence terms for the built-in voice | None; label as test narration | Not requested | Test use only: do not publish as a voice-over without checking the Windows voice terms | system |
| audio/sfx.wav | effects stem | Synthesised by video/engine/audio.py | GTA 6 HQ video studio (generated on this machine) | Owned by the project owner | None required | Not needed | No limit from this asset | owned |
| footage/test-pattern.mp4 | generated footage | ffmpeg lavfi mandelbrot source (see production-log.md) | GTA 6 HQ video studio (generated on this machine) | Owned by the project owner | None required | Not needed | No limit from this asset | owned |
| (font) C:/Windows/Fonts/bahnschrift.ttf | font | Installed with Windows | Microsoft | Microsoft font licence (bundled with Windows) | None required | Covered by the Windows licence for use on this machine | Rendering text into video is permitted; the font file itself must not be redistributed | system |
| (font) C:/Windows/Fonts/segoeui.ttf, segoeuib.ttf | font | Installed with Windows | Microsoft | Microsoft font licence (bundled with Windows) | None required | Covered by the Windows licence for use on this machine | Rendering text into video is permitted; the font file itself must not be redistributed | system |

## Status meanings

- `owned`: made for this project; the owner holds the rights
- `licensed`: used under a stated licence
- `permission`: used with recorded permission
- `system`: part of the operating system or a tool, used under its licence
- `uncleared`: third-party material with no licence or permission
