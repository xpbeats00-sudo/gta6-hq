# Video studio installation guide

What the studio needs, what is already there, and the exact steps for the parts that need the owner. Checked on 2026-11-12. Run `python video/studio.py doctor` at any time for the current state.

## Already installed and working (nothing to do)

| Tool | Version | Used for | Tested |
|---|---|---|---|
| FFmpeg, FFprobe | 8.1.2 full build | Encoding, probing, loudness, black, freeze and silence detection, test voice (flite) | Yes, in every render and audit |
| Python | 3.12.10 | The studio itself | Yes |
| Pillow, numpy | 12.3.0, 2.5.2 | Drawing frames, audio synthesis and analysis | Yes |
| websockets | 13.1 | Filming the app over the DevTools port | Yes |
| Node, npm | 24.15.0, 11.14.0 | Only for Remotion, if installed | Version checked only |
| GitHub CLI | 2.103.3, signed in | Uploading a release asset, when the owner asks | `gh auth status` only |
| Windows speech (System.Speech) | built in | Test narration | Yes |
| Bahnschrift, Segoe UI | built in | Titles and body text | Yes |

Nothing was installed to build the studio.

## Not installed, not connected

Each of these needs the owner. None is needed for the test video or the trailer.

### 1. Remotion (optional second renderer)

- State: a project is prepared in `video/remotion/`. Not installed. Never run.
- What it downloads: Remotion 4.0.543 and React into `video/remotion/node_modules`; at first render, Chrome Headless Shell.
- Licence: free for individuals and companies of up to 3 people; larger companies need a paid licence. https://www.remotion.dev/docs/license/pricing
- To install:

```
cd video/remotion
npm install
npx remotion browser ensure
npx remotion render src/index.ts TitleCard out/title-card.mp4
```

- Source: https://www.remotion.dev/docs/brownfield , https://www.remotion.dev/docs/cli/render

### 2. Whisper (captions from speech, and the caption cross-check)

- State: FFmpeg already includes the whisper filter, so no program is needed. No model file is present, so it cannot run. The helper `video/integrations/whisper_transcribe.py` refuses and says so (tested).
- What the owner must do: approve a download of one model file, then place it at `video/models/ggml-base.en.bin`.
- Where from: https://huggingface.co/ggerganov/whisper.cpp/tree/main . Sizes: tiny 75 MiB, base 142 MiB, small 466 MiB.
- After that: `python video/integrations/whisper_transcribe.py input.mp4 out.srt`, and the caption audit runs its speech cross-check by itself.
- Not tested: the filter has never been run here. In particular, how it handles Windows paths is unconfirmed; the helper passes relative paths for that reason.
- Source: https://ffmpeg.org/ffmpeg-filters.html#whisper-1

### 3. ElevenLabs (voice)

- State: not connected. `video/integrations/elevenlabs_tts.py` is written from the API reference and refuses to run without a key (the refusal is tested; a real request is not).
- What the owner must do:
  1. Create an account and a key at https://elevenlabs.io/app/api/api-keys .
  2. Copy `video/.env.example` to `video/.env` and fill in `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`.
  3. In the production's `audio.json`, set `"narration": {"engine": "elevenlabs"}`.
- Limits: the free plan allows non-commercial use with attribution only. Paid plans grant commercial rights. https://elevenlabs.io/docs/overview/administration/billing
- Never paste the key into chat. `video/.env` is ignored by git.

### 4. Runway (AI footage)

- State: not connected. `video/integrations/runway_generate.py` is written from the API guide and refuses to run without a key and without `--yes` (the refusal is tested; a real request is not).
- What the owner must do:
  1. Sign up at https://dev.runway.com/ , create a project, open API Keys and create a key. It is shown once.
  2. Buy credits. Runway needs credits before any use; the smallest purchase listed is 10 US dollars for 1,000 credits.
  3. Put the key in `video/.env` as `RUNWAYML_API_SECRET`.
- Every generation spends credits, so each one needs the owner's go-ahead.
- Source: https://docs.dev.runwayml.com/guides/setup/ , https://docs.dev.runwayml.com/guides/using-the-api/

### 5. Playwright (visual testing)

- State: the Python and Node packages are not installed. Claude Code has a Playwright connector, which can open and screenshot pages but is not part of the studio's scripts.
- The studio does not need it: frames are checked with FFmpeg and NumPy, and the app is filmed over the DevTools port.
- To install if wanted: Python `pip install pytest-playwright` then `playwright install`; Node `npm init playwright@latest`. Source: https://playwright.dev/python/docs/intro , https://playwright.dev/docs/intro

### 6. GitHub

- State: `gh` is installed and signed in. The GitHub connector in Claude Code failed to connect in this session ("Authorization header is badly formatted"); the owner would need to reconnect it. The studio does not use it.
- To attach a video to a release, only when the owner says so: `gh release upload <tag> <file>`. Source: https://cli.github.com/manual/gh_release_upload

## Configuration files

| File | Purpose | In git |
|---|---|---|
| `video/.env.example` | Template listing every key name. Holds no key | Yes |
| `video/.env` | The owner's real keys | No (ignored) |
| `video/.gitignore` | Keeps renders, stems, the trailer footage, the supplied song, models and `.env` out of git | Yes |

## Checking an install

```
python video/studio.py doctor
```

It lists each tool, filter, font, model and key as found or not found. A key is reported as "set (not tested)": the studio does not call a paid service to prove a key works.
