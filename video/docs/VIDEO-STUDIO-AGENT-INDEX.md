# Video studio agent index

Eight agents in `.claude/agents/`. Each owns its own files inside `video/productions/<name>/` and writes no others, so no file has two writers. The main session coordinates: it hands a stage to an agent, reads what comes back, and decides what happens next.

`.claude/` is ignored by git, so these files exist on this machine only until the owner decides otherwise.

| Agent | File | Stages | Writes | Tools |
|---|---|---|---|---|
| Researcher | `video-researcher.md` | 1 | `research.md`, `claims.json` | Read, Grep, Glob, Write, Edit |
| Creative director | `video-creative-director.md` | 3 | `creative-brief.md` | Read, Grep, Glob, Write, Edit |
| Scriptwriter | `video-scriptwriter.md` | 4 | `script.md` | Read, Grep, Glob, Write, Edit |
| Storyboard artist | `video-storyboard-artist.md` | 5 | `storyboard.md` | Read, Grep, Glob, Write, Edit |
| Video engineer | `video-engineer.md` | 6, 9, 10 | `project.json`, `footage/`, `images/`, `captions/`, `renders/` | Read, Grep, Glob, Write, Edit, Bash |
| Audio engineer | `video-audio-engineer.md` | 7, 8 | `audio.json`, `audio/` | Read, Grep, Glob, Write, Edit, Bash |
| Independent QA auditor | `video-qa-auditor.md` | 2, 11 | `reports/` (through the audit command only), frames in `reports/frames/` | Read, Grep, Glob, Bash |
| Production manager | `video-production-manager.md` | 12 | `assets.json`, `production-log.md`, `reports/FINAL-DELIVERY-REPORT.md` (through the delivery command), `exports/` | Read, Grep, Glob, Write, Edit, Bash |

## Separation

- The QA auditor has no Write or Edit tool. It runs the audits, looks at the frames itself, and reports. It never fixes what it finds and never takes the makers' word for a result.
- The audio settings live in `audio.json`, not in `project.json`, so the audio engineer and the video engineer never edit the same file. The beat grid (`meta.beat`, `until_bar`) is in `project.json`: the audio engineer measures the tempo and hands the numbers to the video engineer.
- The delivery command re-runs all eight audits, so it rewrites the audit reports in `reports/`. That is the same command the auditor runs, producing the same files; no one edits them by hand.
- No agent commits, pushes, publishes or installs. No agent works outside its production folder.

## Order of work

1. Researcher, then the QA auditor's fact check.
2. Creative director.
3. Scriptwriter, then the script audit.
4. Storyboard artist, then the storyboard audit.
5. Video engineer films or gathers footage; the audio engineer builds the sound. These two can work at the same time.
6. Video engineer builds the edit, writes captions and renders a preview.
7. QA auditor inspects the preview. The makers fix; the auditor checks again.
8. Video engineer renders the final. QA auditor inspects it.
9. Production manager completes the licence register and the log and runs delivery.

## How they were used so far

The studio, the test video and the trailer were built in one session before the agent definitions could be loaded (Claude Code loads agents at start-up). The independent QA of the test video was run by a separate agent given `video-qa-auditor.md` as its instructions; it had not made the video and could not edit it. The other seven roles were carried out by the main session. From the next session on, all eight are available by name.
