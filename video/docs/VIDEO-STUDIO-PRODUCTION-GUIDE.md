# Video studio production guide

How to make a video with the studio in `video/`. Every command is run from the repository root (`C:\GTA6Wiki`).

## What the studio is

- `video/studio.py`: the one command line. `python video/studio.py <command> --help` lists the options.
- `video/engine/`: the renderer (Pillow draws every frame, FFmpeg encodes), audio builder, caption writer, beat analysis and the eight audits.
- `video/tools/capture_cdp.py`: films the real app or installer over the DevTools port, without the mouse.
- `video/templates/`: 21 starter projects (7 kinds of video in 3 formats).
- `video/productions/<name>/`: one folder per video.
- `video/integrations/`: ElevenLabs, Runway and Whisper helpers. They refuse to run until a key or model is supplied.
- `video/remotion/`: a prepared Remotion project. Not installed; see the installation guide.
- `.claude/skills/` and `.claude/agents/`: the fifteen skills and eight agents that run the pipeline.

Nothing in `video/` is used by the app, and the app is not changed by it.

## The pipeline

| Step | Stage | Who | Writes | Command or check |
|---|---|---|---|---|
| 1 | Research | researcher | `research.md`, `claims.json` | none |
| 2 | Fact check | QA auditor | `reports/RESEARCH-AND-FACT-CHECK.md` | `audit <name> --only facts` |
| 3 | Creative direction | creative director | `creative-brief.md` | none |
| 4 | Script | scriptwriter | `script.md` | `audit <name> --only script` |
| 5 | Storyboard | storyboard artist | `storyboard.md` | `audit <name> --only storyboard` |
| 6 | Asset generation | video engineer | `footage/`, `images/` | `capture_cdp.py`, FFmpeg, or Runway when connected |
| 7 | Voiceover | audio engineer | `audio.json`, `audio/narration-*.wav` | `audio <name>` |
| 8 | Sound design | audio engineer | `audio/music.wav`, `audio/sfx.wav`, `audio/mix.wav` | `audio <name>` |
| 9 | Editing | video engineer | `project.json`, `captions/` | `captions <name>` |
| 10 | Rendering | video engineer | `renders/` | `render <name> --preview`, then `--final` |
| 11 | Independent QA | QA auditor | `reports/*-AUDIT.md` | `audit <name>` |
| 12 | Final delivery | production manager | `assets.json`, `production-log.md`, `reports/FINAL-DELIVERY-REPORT.md` | `deliver <name>` |

The main session coordinates: it hands each stage to its agent, reads the result, and decides whether to go on. No two agents write the same file.

## Start a new production

```
python video/studio.py new my-video --kind game-trailer --format 16x9 --title "My video"
```

Kinds: `cinematic-trailer`, `documentary`, `game-trailer`, `tutorial`, `explainer`, `promotional`, `animated-infographic`. Formats: `16x9` (1920x1080), `9x16` (1080x1920), `1x1` (1080x1080).

This makes `video/productions/my-video/` with a project that already renders, and empty research, script, storyboard, claims and asset files to fill in.

## The files in a production

| File | Owner | What it holds |
|---|---|---|
| `research.md`, `claims.json` | researcher | What the video may say, and the source of each statement |
| `creative-brief.md` | creative director | Audience, message, tone, look, what must and must not be said |
| `script.md` | scriptwriter | The approved wording, one section per scene id |
| `storyboard.md` | storyboard artist | One table row per scene: picture, length, text, transition |
| `project.json` | video engineer | The edit: scenes, timing, transitions, captions |
| `footage/`, `images/`, `captions/`, `renders/` | video engineer | Pictures in, video out |
| `audio.json`, `audio/` | audio engineer | Music, narration and effects settings; the stems and the mix |
| `reports/` | QA auditor | The audit reports and contact sheets (production manager writes only `FINAL-DELIVERY-REPORT.md`, through `deliver`) |
| `assets.json`, `production-log.md` | production manager | The licence register and the record of what was done |

## project.json

```json
{
 "meta": {"title": "...", "kind": "game-trailer", "format": "16x9", "fps": 30,
          "fade_in": 0.4, "fade_out": 0.6,
          "must_say": ["unofficial"], "must_not_say": ["official app"],
          "beat": {"bpm": 135, "first_bar_at": 0.0}},
 "captions": {"burn_in": true},
 "scenes": [ ... ]
}
```

Every scene has `id` (s01, s02, ...), `type`, `duration` in seconds, and optionally:

- `transition`: how it hands over to the next scene, `{"type": "crossfade" | "slant" | "push" | "flash" | "cut", "duration": 0.5}`. The two scenes overlap for that time.
- `caption`: one caption shown for most of the scene; or `captions: [{"at": 0.5, "duration": 3, "text": "..."}]`; or, with `narration`, captions are cut from the narration and timed to the recorded line.
- `narration`, `narration_at`: a line to be spoken and when it starts in the scene.
- `claims`: the claim ids that back the scene's wording, or `"no_claims": true` for pure branding.
- `badge`: a small label held in the top right, used for "Unofficial fan project".
- `until_bar`: with `meta.beat`, replaces `duration`: the cut to the next scene lands on that bar line of the music.
- `allow_static`: set true only when a scene is meant to hold a still picture for two seconds or more.

Scene types:

| Type | Use | Its fields |
|---|---|---|
| `title` | Opening, section and end titles | `kicker`, `title`, `subtitle`, `bg_image`, `impact` |
| `footage` | A video clip | `src`, `start`, `speed`, `crop` `[x, y, width, height]`, `mode` (`full` or `window`), `heading` (window mode), `zoom` `[from, to]`, `focus`, `lower_third` `{title, text, at, lift}`, `shade` |
| `still` | A picture with a slow push-in | `src`, `zoom`, `lower_third` |
| `card` | Heading and a list arriving line by line | `heading`, `items`, `stagger` |
| `stats` | Animated infographic: numbers count up, bars grow | `heading`, `stats` `[{value, label, suffix}]`, `source` |
| `credits` | Ending credits | `heading`, `lines` (text, or `[role, name]`), `notice` |

The look (sunset palette `#f7a13c` / `#ee3f7c` / `#7c3fd6`, Bahnschrift titles, cut-edge cards, the moving night backdrop) is built into the scene types and set in `video/engine/config.py` and `video/engine/draw.py`.

## audio.json

```json
{
 "music": {"generator": "synth", "bpm": 104, "seed": 6, "gain_db": -8},
 "narration": {"engine": "none", "duck_db": 12},
 "sfx": true, "sfx_gain_db": 0,
 "mix": "audio/mix.wav"
}
```

- Music: `{"generator": "synth"}` (an original score synthesised by the studio), `{"generator": "test-tone"}`, `{"generator": "none"}`, or a file: `{"file": "audio/song.mp3", "start": 28.47, "fade_in": 0.3, "fade_out": 3}`.
- Narration engine: `none`, `sapi` (the Windows built-in voice: test narration), `flite` (FFmpeg's built-in voice: test narration) or `elevenlabs` (needs a key).
- The mix is brought to -14 LUFS with a peak limiter. Music is turned down under narration.

To cut to music, measure it first:

```
python video/studio.py beat video/productions/my-video/audio/song.mp3 --start 28.44 --bpm-hint 135
```

Put the tempo in `meta.beat`, start the music on a bar line with `music.start`, and give scenes `until_bar`.

## Film the app

```
python video/tools/capture_cdp.py --exe target/release/gta6-hq.exe --plan video/productions/my-video/footage/capture-app.json --out video/productions/my-video/footage
python video/tools/capture_cdp.py --exe target/setup/release/gta6-hq-setup.exe --args=--demo --plan video/productions/my-video/footage/capture-installer.json --out video/productions/my-video/footage --width 980 --height 620 --port 9334
```

The plan is a list of clips, each a list of steps (`wait`, `hash`, `eval`, `reload`, `scroll`, `scroll_to`, `record`); the file's own header documents them. Give a scrolling page `"stepped": true`: it is then filmed frame by frame on the page's own clock, so every frame is distinct and the scroll is smooth. Pages with a playing video (Home, the splash, the installer) need the default real-time capture. `--only home,map` re-films just those clips. Let the warm-up clip wait about 12 seconds so the splash has finished. The app must not already be running. The installer is only ever started with `--demo`, which installs nothing. See `video/productions/gta6-hq-trailer/footage/capture-app.json` for a working plan.

## Build, preview, audit, deliver

```
python video/studio.py audio my-video
python video/studio.py captions my-video
python video/studio.py assets my-video
python video/studio.py render my-video --preview
python video/studio.py audit my-video
python video/studio.py render my-video --final
python video/studio.py deliver my-video
```

- `assets` adds every used file to `assets.json` with `TODO` fields; the production manager fills them in. The licence audit fails while any `TODO` is left.
- `render --preview` is half size at 15 frames a second and takes seconds. `render --final` refuses to run until a preview of that format exists.
- Other formats: add `--format 9x16` or `--format 1x1` to `render`. Footage scenes should use `"mode": "window"` so they fit every shape.
- `audit` writes the eight reports to `reports/` and returns a failure code if any check fails. `--only technical,audio` runs some of them; `--file path.mp4` inspects a given file.
- `deliver` audits the final render and writes `reports/FINAL-DELIVERY-REPORT.md`. It says DELIVERED only when no audit fails.
- Platform copies: `python video/studio.py export my-video --platform youtube` (also `youtube-shorts`, `instagram-reels`, `tiktok`, `instagram-feed`, `x`, `discord`, `github-readme`).

## Rules that always apply

- Never state a fact about Grand Theft Auto VI that the app does not source. Put every statement in `claims.json` with the file it comes from.
- Only GTA VI imagery. No Rockstar Games logo. Keep "unofficial fan project" on screen. Known places the logo appears in the app: the Pier Showdown picture and wallpaper (bottom right corner), so the Media page, the third Home wallpaper and the right edge of the installer background. The first Home wallpaper carries a "Rockstar Games presents" wordmark on the windscreen. The visual audit searches final renders for the logo, but look at the footage yourself.
- Record every media file in `assets.json`: source, creator, licence, attribution, permission, commercial limits.
- Preview before final. Fix what the audits find and render again.
- Do not say a check passed unless the command was run and the report says so.
- Commit, push or publish only when the owner says so.
