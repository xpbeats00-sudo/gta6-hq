# GTA 6 HQ video studio

Makes videos about the app, from research to an audited file. Separate from the app: nothing here is built into it or shipped with it.

```
python video/studio.py doctor                          what is installed and connected
python video/studio.py new my-video --kind game-trailer
python video/studio.py audio my-video
python video/studio.py captions my-video
python video/studio.py render my-video --preview
python video/studio.py audit my-video
python video/studio.py render my-video --final
python video/studio.py deliver my-video
```

| Folder | Holds |
|---|---|
| `engine/` | Renderer, audio builder, captions, beat analysis, audits |
| `tools/` | `capture_cdp.py`: films the app and installer over the DevTools port |
| `templates/` | 21 starter projects: 7 kinds of video in 3 formats |
| `productions/` | One folder per video: `studio-test` (the pipeline test) and `gta6-hq-trailer` |
| `integrations/` | ElevenLabs, Runway and Whisper helpers; none is connected |
| `remotion/` | A prepared Remotion project; not installed |
| `docs/` | The studio's documents, starting with `VIDEO-STUDIO-PRODUCTION-GUIDE.md` |

Skills and agents for Claude Code are in `.claude/skills/` and `.claude/agents/`.

Renders, audio stems, the trailer's footage and the supplied music are not in git (`video/.gitignore`): the footage shows Rockstar Games material that is not cleared for redistribution.
