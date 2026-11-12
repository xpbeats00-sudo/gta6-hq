> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# Regression report

Date: 2026-11-12. Checks run after two changes landed together: the launch-readiness core upgrade and the Field Manual. Release build, served and driven in a browser pane unless noted. No console errors were logged during the run.

## Existing features

| Feature | Expected | Result |
|---|---|---|
| Splash | Plays, then Home | Pass (Desktop: Home reached; splash itself last seen playing before the upgrade) |
| Home | Five editorial sections, countdown ticking, hero video playing | Pass (Browser and Desktop) |
| Navigation | Nine links; active link underlined | Pass; fits at 1280, 1366 and 1600 px wide |
| Encyclopedia | 12 topics, A–Z, data health line | Pass ("0 errors, 33 warnings across 97 entries") |
| Characters | 8 cards; profile with portrait and 2 sources | Pass |
| Locations | 6 cards; Vice City page with "View on the map" | Pass |
| Vehicles | 14 entries with filter and sort | Pass |
| Vehicle entry | Facts table, related, sources | Pass ('95 Grotti Cheetah: maker, model, year, class, availability) |
| Weapons | 3 entries | Pass |
| Empty category | "Not yet documented" | Pass (Missions) |
| Media | 31 tiles; viewer opens and closes on Esc | Pass |
| Search | "drequan" finds Dre'Quan Priest first; "cheetah" finds the new entry | Pass |
| Intel | 14 timeline items, 8 FAQ entries | Pass |
| Map | Tiles load, pins present, Vice City popup links to its entry, attribution visible | Pass |
| Unknown route | "Wasted" page | Pass |
| Discord presence | Enabled and connected | Pass (Desktop; Discord showed its overlay prompt over the window) |
| Data validation | Exit 0 | Pass |

## Found and fixed during integration

| Item | Fix |
|---|---|
| The "Classic Cars" entry called the Vapid Ganado a classic car; Rockstar's own description (read by the core agent) is a low-riding pickup | Summary now says so |
| Manual cover cropped the Vice City sign's lettering out of frame | Picture shifted within the cover |

## Regressions

None found.

## Not re-tested

- Splash skip keys, after the upgrade (the splash code was not changed).
- Offline behaviour.
- Clicking an outside link inside the desktop window.
- Spoiler and draft handling with real data (nothing uses them yet; the core agent tested them with a throw-away entry).
- The importer on the real `data/wiki.json` with `--update` (unit-tested only).
- High-DPI and multi-monitor layouts.

## Changes to be aware of

- `/api/search` now returns `{ total, offset, limit, hits }` instead of a list. The interface was updated with it; anything else calling the route would need to follow.
- New entries added on 12 November carry `verified: 2026-11-12`.
- Entry order in `/api/wiki` now follows the data files.
