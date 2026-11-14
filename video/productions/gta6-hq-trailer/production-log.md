# Production log: GTA 6 HQ trailer

| Date | Stage | Who | Result |
|---|---|---|---|
| 2026-11-12 | Research | main session | 11 claims in `claims.json`, all from `README.md` and `docs/status/`; nothing about the game in the trailer's own words |
| 2026-11-12 | Creative direction | main session | `creative-brief.md`: app footage only, the app's look, cuts on the music's bar lines |
| 2026-11-12 | Footage: app | main session | Eight clips filmed at 1920x1080 from `target/release/gta6-hq.exe` over the DevTools port with `footage/capture-app.json`. No mouse used. `vehicles.mp4` was filmed but not used |
| 2026-11-12 | Footage: installer | main session | `installer.mp4` filmed from `gta6-hq-setup.exe --demo` (installs nothing) with `footage/capture-installer.json`. The window gave 980x620, not the doubled size asked for |
| 2026-11-12 | Music | owner | Owner supplied `XPTrailersong.mp3` and asked for the video to be synced to it. Measured at 135 BPM. Used from 28.474 s (the quiet section) so the beat comes in on the cut to the Home page |
| 2026-11-12 | Music rights | main session | The file's metadata names another producer (vairaaa) and non-profit terms. Recorded in `assets.json`, credited on screen, flagged for the owner |
| 2026-11-12 | Script and storyboard | main session | `script.md`, `storyboard.md`, 12 scenes, 59.08 s |
| 2026-11-12 | Preview render | main session | First preview: lower-third labels started outside the safe area and the audio peaked at +0.5 dBTP after encoding. Fixed in the engine (labels report their resting position; limiter ceiling lowered to -3 dB, audio bitrate raised). "Home" label moved clear of the app's countdown |
| 2026-11-12 | Final render 1 | main session | 59.07 s; all eight audits passed, with the two rights warnings |
| 2026-11-12 | Independent QA | QA auditor agent | Blocker: the Rockstar Games logo was visible on the Media page's Pier Showdown tile (40.9 to 43.2 s), and a sliver of it at the edge of the installer window. Also: uncredited community map; stutter in scrolling footage; credits run together and too brief; download address on screen about 2.4 s; splash shot ran on into the Home page; captions not borne out by the footage in two shots; a "Rockstar Games presents" wordmark in the first Home wallpaper |
| 2026-11-12 | Re-film | main session | Media shot dropped and replaced by Vehicles. Home filmed on the second wallpaper, which carries no wordmark. Encyclopedia, Characters, Vehicles and Map filmed frame by frame on the page's own clock, so every frame is distinct. Installer cropped by 16 pixels on the right |
| 2026-11-12 | Re-cut | main session | Music now starts 32.03 s into the track; opening shortened by two bars; splash ends before the splash does; end title held for 5.8 s; credits in two styles, with the map credit, held 9.2 s; captions reworded to what each shot shows |
| 2026-11-12 | New check | main session | The visual audit now searches final renders for the Rockstar Games logo. Tested on final render 1: it finds the logo at 41.0 to 42.5 s, where the auditor saw it |
| 2026-11-12 | Final render 2 | main session | 60.50 s; delivered, logo search passed |
| 2026-11-12 | Independent QA, second pass | QA auditor agent | No logo or wordmark found in 121 frames plus enlargements. Still open: one repeated frame in six in the scroll shots; the end title dissolved onto the credits; credit role labels small; the origin of the wallpapers not recorded in the register; labels and captions sit over some app text |
| 2026-11-12 | Capture fix and re-film | main session | The repeats came from the clip assembly, not the filming: stills were passed through FFmpeg's 25-a-second image clock. The tool now lays frames on an exact 30-a-second grid. All app clips and the installer filmed again; measured 0 repeated frames in the three scroll clips |
| 2026-11-12 | Re-cut | main session | End title hands over to the credits with a wipe, not a dissolve; credit role labels larger; register now says the wallpapers' origin is not recorded |
| 2026-11-12 | Final render 3 and delivery | main session | See `reports/FINAL-DELIVERY-REPORT.md`. This render has had the automated audits but not a third independent QA pass |

## Open issues

- Publishing needs the owner's decision: the footage shows Rockstar Games material that is not cleared for redistribution.
- The owner must confirm who made the music (see `assets.json`).
- No narration: ElevenLabs is not connected. The trailer uses captions and music.
- No AI footage: Runway is not connected, and none was needed.
- The app's banner and Home facts strip (release date, platforms, price) are readable in the footage. The trailer's own wording does not state them.
- The installer shot ends on "GTA 6 HQ is installed", although it was filmed in demo mode and installed nothing.
- Labels and captions sit over some of the app's own text in the Encyclopedia and Field Manual shots; the corner badge sits over the app's window buttons.
- The installer background is the Pier Showdown artwork; its logo corner is hidden by the picture cards and a 16-pixel crop. Do not change that crop without looking at the right edge.
- The side rails of picture cards are shuffled each time the app is filmed, so any re-film needs the logo search and a look at the rails.
