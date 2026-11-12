# Research: GTA 6 HQ trailer

The trailer is about the app, not about the game. It says nothing about Grand Theft Auto VI in its own words. Whatever the viewer sees about the game is the app's own pages on screen, and the app sources those itself.

## Facts

Every statement the trailer makes is in `claims.json`, each with the repository file it comes from and the exact text the fact audit searches for. The audit re-reads those files every time it runs.

| Claim | Statement | Source | How it is checked |
|---|---|---|---|
| c1 | GTA 6 HQ is an unofficial Grand Theft Auto VI encyclopedia and field manual for Windows | `README.md` | Wording |
| c2 | The Home page has a live wallpaper and a countdown | `README.md` (a picture description) | Wording; also visible in the Home shot |
| c3 | 73 entries in 12 categories; each entry has a confidence label and its sources | `README.md` | Wording |
| c4 | A zoomable map of Leonida with 15 markers | `docs/status/DATA-AND-MANUAL-COUNTS.md` | Wording |
| c5 | A 38-page Field Manual with two-page spreads | `README.md` | Wording |
| c6 | 23 sources in the registry | `docs/status/DATA-AND-MANUAL-COUNTS.md` | Wording |
| c8 | The setup installs for the user account only and needs no administrator access | `README.md` | Wording |
| c9 | The app is downloaded from github.com/xpbeats00-sudo/gta6-hq | `README.md` | Wording |
| c10 | Pictures and video in the app are Rockstar Games material; the project is not published, approved or endorsed by Rockstar Games or Take-Two Interactive | `README.md` | Wording |
| c11 | The music file's metadata names the track livelyfe and the producer vairaaa | `ffprobe` of the file | Read by a person and by the QA auditor; not machine-checked |
| c12 | The map tiles come from the GTA VI mapping community via gtadb.org, under CC BY 4.0 | `README.md` | Wording |

c7 (the Media page) was dropped with the Media shot.

A note on c3: of the 12 categories, two (Missions and Story, Collectibles) have no entries yet, as `docs/status/DATA-AND-MANUAL-COUNTS.md` shows. "73 entries in 12 categories" is the README's own wording and is true as written.

## Speculation

None is used. The trailer makes no prediction and repeats no rumour.

## Deliberately left out

- The release date, platforms and price. The trailer does not state them in its own titles or captions. They are readable inside the footage, because the app shows them: the banner along the top of several pages and the facts strip on the Home page. Whether that is acceptable is the owner's decision.
- "Free" and "open source". The repository has no licence file, so neither word is used.
- Any quotation.
- The Media page. Its Pier Showdown tile carries the Rockstar Games logo.

## Open questions for the owner

1. The music. The file's metadata says it is a beat called "livelyfe" produced by vairaaa, free for non-profit use with credit, and that monetised use needs a lease. The owner described it as their own beat. The trailer credits "livelyfe, prod. vairaaa" as the metadata requires. If the owner is the producer, the credit and the limits can change.
2. Publishing. The footage shows Rockstar Games pictures and video inside the app. The project's own rights audit says none of that material is cleared for redistribution. Whether to publish the trailer is the owner's decision.
3. The game facts visible in the footage (see above).
