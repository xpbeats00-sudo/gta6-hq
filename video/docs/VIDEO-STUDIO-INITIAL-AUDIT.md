# Video studio initial audit

Taken on 2026-11-12, before anything was built, by running the commands named in each section on the owner's machine. Nothing was installed during the audit.

## Summary: what was missing

| Need | State on 2026-11-12 | What was done about it |
|---|---|---|
| A renderer | None. Remotion not installed | Built a renderer on what was already there (Python, Pillow, FFmpeg). Remotion prepared but not installed |
| Captions from speech (Whisper) | FFmpeg has the whisper filter built in, but no model file | Captions are written from the script and timed to the audio instead. Model download needs the owner's approval |
| AI footage (Runway) | No key, no credits | Helper written, refuses to run. Not needed for the trailer |
| Voice (ElevenLabs) | No key | Helper written, refuses to run. Test narration uses the Windows built-in voice, labelled as test |
| Visual testing (Playwright) | Python and Node packages not installed. A Playwright connector is available to Claude Code | Frame checks are done with FFmpeg and NumPy instead |
| GitHub | `gh` 2.103.3 signed in. The GitHub connector failed to connect ("Authorization header is badly formatted") | `gh` is enough. The connector needs the owner to reconnect it |
| Project skills and agents | None in `.claude/` | Fifteen skills and eight agents written |
| Video tooling in the repository | Only `scripts/make_animation.py` (animated WebP) | `video/` built |
| Music, sound effects | None in the repository | Studio synthesises its own; owner later supplied a beat for the trailer |
| A spelling dictionary | None | Caption wording is checked against the approved script; a person must read the script |

## Claude Code

| Item | Found | How |
|---|---|---|
| Version | 2.1.322 | `claude --version` |
| Global instructions | `~/.claude/CLAUDE.md` loads `RTK.md` (a token-saving command proxy) | read |
| Project config | `.claude/launch.json` (dev server on port 4600), `.claude/settings.local.json` (two allowed commands) | read |
| `.claude/` in git | Ignored by `.gitignore` (`/.claude`) | read |
| Project skills, project agents | None | `ls .claude` |
| User skills | `reverse-engineer-anything`, plus synced skills | `ls ~/.claude/skills` |
| Plugins in the session | superpowers, design, frontend-design, code-review, code-simplifier, claude-code-setup, playwright, context7, github | session listing |
| Connectors working | Playwright (browser), headroom, rea, built-in browser, Chrome extension, computer use | session listing |
| Connectors not working | GitHub (failed to connect); context7, Figma, Slack, Notion, Linear, Asana, Atlassian, Intercom (need sign-in). None is needed by the studio | session listing |

## Software

| Tool | Found | How |
|---|---|---|
| FFmpeg | 8.1.2 full build (gyan.dev), on PATH | `ffmpeg -version` |
| FFprobe | 8.1.2, on PATH | `ffprobe -version` |
| FFmpeg encoders | libx264, libx265, libvpx-vp9, aac, libopus, libmp3lame; hardware: h264_nvenc, hevc_nvenc, av1_nvenc, h264_qsv, h264_amf | `ffmpeg -encoders` |
| FFmpeg filters | loudnorm, ebur128, astats, silencedetect, blackdetect, freezedetect, xfade, drawtext, subtitles, ass, whisper, flite | `ffmpeg -filters` |
| Node | 24.15.0 | `node --version` |
| npm | 11.14.0; pnpm 10.33.4 also present | `npm --version` |
| Python | 3.12.10 | `python --version` |
| Python packages | Pillow 12.3.0, numpy 2.5.2, opencv-python 5.0.0.93, websockets 13.1, requests 2.34.2 | `pip list` |
| Not installed | Remotion, Playwright (Python or Node), any Whisper program or model, yt-dlp, ImageMagick, SoX, Bun, PyTorch | `command -v`, `pip list`, `npm ls -g` |
| Video software | Blackmagic Design folder (DaVinci Resolve), OBS Studio, VLC | `C:\Program Files` listing. Not used by the studio |
| Git, GitHub CLI | git present; `gh` 2.103.3 signed in as the repository owner | `gh auth status` |
| Rust | cargo present (builds the app) | `command -v cargo` |
| Fonts | Bahnschrift (variable: weight 300 to 700, width 75 to 100), Segoe UI | `C:\Windows\Fonts` |

## Remotion compatibility

Remotion 4 needs Node 16 or newer and supports Windows x64; this machine has Node 24.15 on Windows 11 x64, so it can run. It is not installed. Installing downloads a few hundred megabytes of packages and, at first render, Chrome Headless Shell. It is free for individuals and companies of up to 3 people. Sources: https://www.remotion.dev/docs , https://www.remotion.dev/docs/license/pricing (read 2026-11-12).

## Hardware

| Item | Found |
|---|---|
| Processor | Intel Core i7-14650HX, 16 cores, 24 threads |
| Memory | 31.6 GB |
| Graphics | NVIDIA GeForce RTX 5060 Laptop GPU; Intel UHD Graphics |
| Hardware encoding | Tested: `h264_nvenc` encoded a 2-second 1920x1080 test clip without error. The studio still encodes with libx264 for quality and repeatability |
| Display | 1920x1080 |
| Free disk space | 116 GB free on C: |

## Existing media in the repository

| Where | What | Rights |
|---|---|---|
| `wallpapers/` | 6 MP4 files (22 MB): five Home wallpapers and the splash animation | Rockstar Games material, not cleared (see `docs/compliance/MEDIA-RIGHTS-AUDIT.md`) |
| `images/` | 108 pictures (22 MB) in 11 folders | Rockstar Games material or owner-supplied with no recorded origin; none cleared for redistribution |
| `docs/media/` | 16 screenshots and animated WebP files for the README | Screenshots of the app |
| Audio | None anywhere in the repository | |

The rights audit states: "No file is cleared for public distribution." Any video that shows the app shows this material.

## Project structure

- `src/`: the Rust app (tao + wry/WebView2). `ui/`: the interface. `data/`: the encyclopedia, manual and media records.
- `installer/shell/`: the custom setup window. `target/release/gta6-hq.exe` and `target/setup/release/gta6-hq-setup.exe` were already built.
- `scripts/`: Python tooling, including `make_animation.py` and `audit_media.py`.
- `docs/`: status, compliance, architecture, media.
- No `video/` folder existed.

## Filming the app

Confirmed by trial: starting the app with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333` opens a DevTools port; `Emulation.setDeviceMetricsOverride` gives a true 1920x1080 page and `Page.startScreencast` delivers 30 to 50 frames a second. The setup window, started with `--demo`, films at its own 980x620. No mouse or keyboard input is needed.
