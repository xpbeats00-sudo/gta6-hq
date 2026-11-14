# Video studio skills index

Fifteen project skills in `.claude/skills/<name>/SKILL.md`. Each has the same sections: purpose and scope, required inputs, workflow, tools, quality standards, failure handling, verification, deliverables. Claude Code loads them at the start of a session; invoke one by name, or let the `video-director` skill choose.

`.claude/` is ignored by git, so these files exist on this machine only until the owner decides otherwise.

| Skill | Pipeline stage | Use it to | Main files it works on |
|---|---|---|---|
| `video-director` | All | Run a whole production through the twelve stages and hold the gates: preview before final, audits before delivery | Coordinates; writes nothing itself |
| `video-research` | 1 | Gather what the video may say, mark each statement fact, speculation, opinion or quote, tie each fact to evidence the audit can re-check | `research.md`, `claims.json` |
| `scriptwriting` | 4 | Write the approved wording for every title, caption, card and narration line, one section per scene | `script.md` |
| `storyboarding` | 5 | Write the shot table the storyboard audit parses | `storyboard.md` |
| `remotion-production` | 9, 10 | Build the edit and choose the renderer. Explains the built-in renderer and the optional Remotion project, which is not installed | `project.json`, `video/remotion/` |
| `ffmpeg-editing` | 6, 10 | Trim, probe, generate test footage, re-encode, measure loudness directly with FFmpeg | `footage/`, `renders/` |
| `ai-video-generation` | 6 | Generate footage with Runway. Not connected; costs credits; needs the owner's go-ahead each time | `footage/`, `assets.json` |
| `voice-production` | 7 | Narration: test voices, or ElevenLabs once connected | `audio.json`, `audio/narration-*.wav` |
| `sound-design` | 8 | Music, effects, cutting to the beat, the -14 LUFS mix | `audio.json`, `audio/` |
| `caption-production` | 9 | Define captions, write `.srt` and `.vtt`, control burned-in captions | `project.json`, `captions/` |
| `video-quality-audit` | 11 | Run and read the technical, visual, audio and caption audits | `reports/` |
| `copyright-media-audit` | 12 | Record the source and rights of every media file and run the licence audit | `assets.json`, `reports/ASSET-LICENSE-AUDIT.md` |
| `platform-export` | 12 | Render other shapes and make platform copies | `renders/`, `exports/` |
| `video-performance-optimization` | 10 | Measure and reduce render time and file size | `video/engine/config.py` settings, `renders/*.layout.json` |
| `production-documentation` | All | Keep the log, the reports and the studio documents true and current | `production-log.md`, `reports/FINAL-DELIVERY-REPORT.md`, `video/docs/` |

## How they were checked

Each skill was written against the studio's code (`video/engine/cli.py`, `config.py`, `audits.py` and the rest), and the commands, flags, field names and limits in them were taken from that code. The skills themselves have not been run as skills in a fresh session: Claude Code loads new skills at start-up, and this session wrote them. The studio commands they describe were all run during the test video and the trailer.

Two skills describe integrations that are not connected (`ai-video-generation`, and the ElevenLabs part of `voice-production`) and one describes software that is not installed (`remotion-production`). Each says so in its own text.
