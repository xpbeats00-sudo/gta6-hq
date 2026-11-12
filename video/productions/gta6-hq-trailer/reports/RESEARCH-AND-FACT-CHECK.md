# Research and fact check: GTA 6 HQ trailer

Generated 2026-11-12 15:13 by `python video/studio.py audit gta6-hq-trailer --only facts`. Do not edit by hand.

**Result: PASS WITH WARNINGS** (10 passed, 0 failed, 1 warnings, 0 not run)

| Check | Result | Detail |
|---|---|---|
| Research notes exist | PASS | research.md |
| Claims register exists | PASS | 11 claims |
| Every claim has text, kind and source | PASS | complete |
| Every claim is marked fact, speculation, opinion or quote | PASS | marked |
| Every fact re-checked against its source | PASS | 10 of 11 facts verified now by wording or count, against the files in this repository |
| Facts whose wording was not machine-checked | WARN | c11: evidence is only that a file exists or that someone observed it; a person must confirm these |
| Scenes cite only claims that exist | PASS | all references resolve |
| Every scene with wording cites its claims | PASS | each scene lists claims, or is marked no_claims (branding or credits only) |
| Speculation is never shown as fact | PASS | no speculation used on screen |
| Every number on screen is backed by a cited claim | PASS | all numbers trace to a claim |
| No unsourced quotations | PASS | no quotations used |

## Claims

| Id | Kind | Claim | Source | Re-check |
|---|---|---|---|---|
| c1 | fact | GTA 6 HQ is an unofficial Grand Theft Auto VI encyclopedia and field manual for Windows. | README.md | "An unofficial Grand Theft Auto VI encyclopedia and field manual for Windows." found in README.md |
| c2 | fact | The Home page has a live wallpaper and a countdown. | README.md | "Home page with a live wallpaper and a countdown" found in README.md |
| c3 | fact | The encyclopedia has 73 entries in 12 categories; each entry has a confidence label and its sources. | README.md | "73 entries in 12 categories" found in README.md |
| c4 | fact | The app has a zoomable map of Leonida with 15 markers. | docs/status/DATA-AND-MANUAL-COUNTS.md | "Map markers: 15" found in docs/status/DATA-AND-MANUAL-COUNTS.md |
| c5 | fact | The Field Manual is 38 pages, with two-page spreads. | README.md | "A 38-page printed-style manual with two-page spreads" found in README.md |
| c6 | fact | The source registry lists 23 sources. | docs/status/DATA-AND-MANUAL-COUNTS.md | "Sources in the registry: 23" found in docs/status/DATA-AND-MANUAL-COUNTS.md |
| c8 | fact | The setup installs for the user account only and needs no administrator access. | README.md | "It installs for your user account only and needs no administrator access" found in README.md |
| c9 | fact | The app is downloaded for Windows from github.com/xpbeats00-sudo/gta6-hq (the releases page). | README.md | "https://github.com/xpbeats00-sudo/gta6-hq/releases/latest" found in README.md |
| c10 | fact | The pictures and video shown in the app are Rockstar Games material; the project is not published, approved or endorsed by Rockstar Games or Take-Two Interactive. | README.md | "Not published, approved or endorsed by Rockstar Games or Take-Two Interactive" found in README.md |
| c11 | fact | The music file's own metadata names the track livelyfe and its producer vairaaa. | ffprobe of audio/XPTrailersong.mp3, read on 2026-11-12 by the main session and again by the QA auditor | observed directly: tags artist=vairaaa and a title containing livelyfe, read with ffprobe; recorded in assets.json |
| c12 | fact | The map tiles come from the GTA VI mapping community via gtadb.org, under CC BY 4.0. | README.md | "the GTA VI mapping community via gtadb.org, CC BY 4.0" found in README.md |

Facts are re-checked by this script every time it runs. Speculation and opinion are listed so they are never mistaken for facts.
