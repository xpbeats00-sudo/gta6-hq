# Video studio master plan

Written 2026-11-12 after the environment audit (`VIDEO-STUDIO-INITIAL-AUDIT.md`). It sets out what the studio is, the order it was built in, and what remains.

## Goal

A studio inside this repository that can take a video from research to an audited file, and a trailer for GTA 6 HQ made with it. Everything lives in `video/`, plus skills and agents in `.claude/`. The app is not changed.

## Decisions

| Decision | Why |
|---|---|
| The renderer is Python, Pillow and FFmpeg | All three were already installed, so the studio works today with no install and no account. Frames are drawn in code, which makes every render repeatable and lets the renderer report exactly where it put each piece of text |
| Remotion is prepared, not installed | The specification names it, but installing needs the owner's approval and nothing in the trailer needs it |
| The trailer uses real app footage | Filmed over the DevTools port, so nothing is mocked up and the mouse is never touched |
| Captions come from the script, not from speech recognition | No Whisper model is present. The caption audit checks them against the approved script and the measured audio timing |
| Audits are scripts, not opinions | Each check measures the real file with FFprobe, FFmpeg or NumPy and says PASS, FAIL, WARN or SKIP. A skipped check is reported as not run |
| No two agents write the same file | Audio settings were moved out of `project.json` into `audio.json` so the audio engineer and the video engineer never share a file |
| Generated media is kept out of git | `video/.gitignore` ignores renders, WAV stems, the trailer's footage (it shows Rockstar material), the supplied song, models and `.env` |

## Priorities and status

| Priority | Work | Status |
|---|---|---|
| 1 | Environment audit | Done |
| 2 | Render engine: scenes, transitions, captions, three formats, preview and final | Done, exercised |
| 3 | Audio: synthesised score, effects, test narration, loudness, cutting to a beat | Done, exercised |
| 4 | The eight audits and the delivery report | Done, exercised |
| 5 | Test video through the whole pipeline, with an independent QA pass | Done |
| 6 | Filming tool for the app and installer | Done, exercised |
| 7 | The trailer | Done |
| 8 | Fifteen skills, eight agents | Written |
| 9 | Integration helpers and `.env.example` for ElevenLabs, Runway, Whisper | Written; not tested, because nothing is connected |
| 10 | Remotion project | Prepared; not installed, not run |
| 11 | Documentation | Done |

## The pipeline

Research, fact check, creative direction, script, storyboard, asset generation, voiceover, sound design, editing, rendering, independent QA, final delivery. The table of who does what and which file each stage writes is in `VIDEO-STUDIO-PRODUCTION-GUIDE.md`.

## What needs the owner

1. Whether `.claude/skills` and `.claude/agents` should be tracked in git (`.claude` is ignored today).
2. Whether to install Remotion, download a Whisper model, or connect ElevenLabs or Runway. Exact steps are in `VIDEO-STUDIO-INSTALLATION-GUIDE.md`.
3. Whether to publish the trailer, given that it shows Rockstar Games material that is not cleared, and who made the music.
4. When to commit. Nothing has been committed or pushed.

## Later, if wanted

- 9:16 and 1:1 cuts of the trailer (the engine renders both; the trailer's full-frame shots would be re-framed in window mode).
- A recorded or ElevenLabs voice-over.
- Word-by-word caption highlighting.
- A Remotion composition library that mirrors the scene types.
