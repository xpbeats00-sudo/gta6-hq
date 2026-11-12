> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# GTA 6 HQ audit and upgrade: final report

Date: 2026-11-11. Scope: the Rust desktop app in `C:\GTA6Wiki`, audited against the Audit & Upgrade Pack.

## Summary

**Status: no P0 findings. Of 17 findings, 14 are fixed and verified, 2 are fixed but only partly verified, and 1 (media rights) is open because only the owner can settle it.**

Completed:

- Baseline recorded, with a zip backup taken before any edit.
- 17 findings logged; the fixable ones fixed, with 14 new automated tests (6 to 20).
- A report-only data validator: `gta6-hq --validate`, `/api/health`, and a "Data health" panel in the app.
- Content schema v2 with confidence labels, sources, last-checked dates, related entries and aliases. 73 of 75 entries cite a source read on 2026-11-11.
- Nine new data-driven categories and an Encyclopedia page with an A–Z directory. Six categories have sourced entries; three say "Not yet documented".
- Media rights manifest, rights label and credit in the viewer, duplicate detection, and a `staging/` folder that is never shown.
- Search: apostrophes and aliases, category filter, rumor exclusion, result counts, error state.
- Map: pins link to entries, invalid pins are skipped, offline notice, atomic tile cache.
- Desktop: startup error dialog, outside links kept out of the app window, videos pause when hidden.

Not completed:

- **Media rights.** Every one of the 18 media files has unknown rights. They are labelled, not removed.
- **Media importer.** Only the foundation exists (manifest, staging folder, validation, SHA-256 duplicate check). There is no import screen, approval step, thumbnail generation or rollback.
- **Packaging.** No installer, and no test on a clean machine.
- **Source depth.** Most entries cite gta6-wiki.org, a secondary site that quotes Rockstar. Only 11 entries were checked against Rockstar's own page.
- **Dependency vulnerability scan** (`cargo audit`) was not run.
- District profiles, a correction/report workflow, match highlighting and search suggestions.

## Baseline vs final

| Check | Baseline | Final | Evidence |
|---|---|---|---|
| `cargo fmt --all -- --check` | Exit 1 (failed) | Exit 0 | Command output |
| `cargo clippy --all-targets --all-features -- -D warnings` | Exit 0 | Exit 0 | Command output |
| `cargo test` | 6 passed | 20 passed, 0 failed | Command output |
| `cargo build --release` | Exit 0, 4,666,368 bytes | Exit 0, 4,972,544 bytes | Command output |
| `gta6-hq --validate` | Did not exist | Exit 0: 0 errors, 20 warnings | `CONTENT_INTEGRITY.md` |
| Entries with a source | 0 of 40 | 73 of 75 | `CONTENT_INTEGRITY.md` |
| Entries with a confidence label | 0 | 75 (11 official, 62 corroborated, 2 unverified) | Count over `data/wiki.json` |
| Media files with a rights record | 0 of 18 | 18 of 18 (all "unknown") | `data/media.json` |
| Desktop window seen working | No (only confirmed open) | Yes: splash, then Home | `evidence/desktop-splash.png`, `evidence/desktop-home.png` |
| Narrow-window overflow | 10 px on Search | 0 px on 12 pages | Measured at 375 px |

## Findings

Full detail, reproduction and tests are in `FINDINGS.md`.

| ID | Severity | Finding | Status | Evidence |
|---|---|---|---|---|
| F-01 | P1 | Enter/Esc stopped skipping the splash after any other key | Fixed | Manual key sequence |
| F-02 | P1 | Unverified statements and a wrong trailer date in the wiki | Fixed | Sources per entry; validator |
| F-03 | P1 | Rights unknown for all 18 media files | **Open** | 18 validator warnings |
| F-04 | P2 | No sources, confidence or dates on entries | Fixed | Unit test; in-app check |
| F-05 | P2 | Broken data file was ignored silently | Fixed | Manual test; unit test |
| F-06 | P2 | Byte-order mark made the data file unreadable | Fixed | Reproduced, then re-tested; unit test |
| F-07 | P2 | "drequan" did not find Dre'Quan Priest | Fixed | Unit test; live query |
| F-08 | P2 | An outside link could take over the app window | Fixed, not clicked in the desktop window | Unit test of the rule |
| F-09 | P2 | Tile cache not atomic, could cache junk, no offline message | Fixed, offline not tested live | 3 unit tests; live status codes |
| F-10 | P2 | Startup failures were invisible in the release build | Fixed | Dialog appeared, exit code 1 |
| F-11 | P2 | Videos kept playing while the window was hidden | Fixed | Manual hide/show |
| F-12 | P3 | Formatting check failed | Fixed | Exit 0 |
| F-13 | P3 | Missing picture showed a broken icon | Fixed | Manual |
| F-14 | P3 | Media viewer: alt text and keyboard focus | Fixed | Manual |
| F-15 | P3 | Search page overflowed a narrow window | Fixed | Measured |
| F-16 | P3 | Unescaped initials in generated art | Fixed | Code review |
| F-17 | P3 | Unbounded search query length | Fixed | Live request |

## Changed files

| File | Reason |
|---|---|
| `src/main.rs` | `--validate`; startup failures shown in a dialog |
| `src/window.rs` | Error dialog; outside links go to the default browser; unit test |
| `src/server.rs` | `/api/health`; search filter parameters and query cap; 502 for unreachable tiles |
| `src/content.rs` | Schema v2 with v1 compatibility; visible load errors; byte-order mark; tests |
| `src/search.rs` | Apostrophes, aliases, section filter, rumor exclusion, confidence in results; tests |
| `src/tiles.rs` | Atomic cache writes, WebP check, size cap, shared HTTP client, error kinds; tests |
| `src/media.rs` | Rights manifest, hidden staged/rejected assets, SHA-256 duplicate detection; tests |
| `src/validate.rs` (new) | Data and media integrity checks, Markdown report; tests |
| `Cargo.toml`, `Cargo.lock` | Added `sha2` |
| `rustfmt.toml` (new) | Formatting settings |
| `data/wiki.json` | Rewritten to schema v2: sources, confidence, related links, 9 new categories, corrected text. Original is in the backup zip |
| `data/media.json` (new) | Rights record for every media file |
| `ui/app.js` | Encyclopedia, category and entry pages, badges, sources, related links, search filter, media credits, map notices, the fixes above |
| `ui/styles.css` | Styles for the new pages and labels; narrow-window fix |
| `ui/index.html` | Encyclopedia nav item; media viewer marked as a dialog |
| `ui/art.js` | Escaped label; smaller initials |
| `README.md` | Updated to match verified behaviour |
| `docs/EDITORIAL_POLICY.md` (new) | Source, confidence and media rules |
| `docs/audits/*` (new) | These reports and two desktop screenshots |
| `staging/README.txt` (new) | Explains the staging folder |
| `backups/pre-audit-2026-11-11.zip` (new) | Backup taken before editing |

No image or video file was added, changed or deleted. One wiki entry was removed: "Motorcycles and Dirt Bikes" had no source of its own and was folded into the off-road entry, which is sourced. The original file is in the backup zip.

## Commands and tests

Automated, final run:

| Command | Exit code | Result |
|---|---|---|
| `cargo fmt --all -- --check` | 0 | Clean |
| `cargo clippy --all-targets --all-features -- -D warnings` | 0 | No warnings |
| `cargo test` | 0 | 20 passed, 0 failed |
| `cargo build --release` | 0 | Built |
| `target\release\gta6-hq.exe --validate` | 0 | 0 errors, 20 warnings |

Manual checks are listed one by one in `TEST_MATRIX.md`. In short: 18 scenarios passed and 5 were not tested live (shortcut launch, offline launch, missing splash video, high-DPI and multi-monitor, clicking an outside link in the desktop window). The map's offline notice was also not tested live.

## Content and media

- **Missing sources (2):** `vehicles/muscle-car` and `vehicles/sports-car`. Both describe artwork in the gallery and are labelled Unverified.
- **Unknown rights (18):** every file in `images/` and `wallpapers/`, including the logo.
- **Duplicates:** none found by SHA-256.
- **Broken references:** none. All related links, source ids, entry images and map pins resolve.
- **Empty categories (3):** Weapons, Missions and Story, Collectibles.
- **Rumors:** none recorded.

## Remaining risks

1. **Media rights.** The videos and logo have no recorded creator or licence. This matters if the app is ever shared beyond this computer.
2. **Secondary sourcing.** If gta6-wiki.org is wrong about something, so is this app. The labels say "Corroborated", not "Official", for that reason.
3. **Map tiles depend on gta6-wiki.org.** If that site moves or blocks the requests, uncached areas go blank (with a notice). Their terms for automated tile requests were not reviewed.
4. **Launch-week facts will date quickly.** The release is on 2026-11-19; entries were checked on 2026-11-11.
5. **Countdown** ends at midnight local time on release day. No official unlock hour has been published, so it may be off by some hours.
6. **Untested environments:** clean machine, high-DPI, multiple monitors, offline.
7. **WebView2 memory** was about 534 MB on the Home page in one measurement.

## Next sprint

| Rank | Task | Impact | Effort |
|---|---|---|---|
| 1 | Settle media rights: record where each wallpaper came from, or replace with media whose terms allow use | High | Low to medium (owner's knowledge needed) |
| 2 | Re-verify entries against Rockstar's own pages after launch and promote them to Official; add station names, weapons and missions once published | High | Medium |
| 3 | Media importer screen: pick files, fill in rights details, approve, with thumbnails | Medium | High |
| 4 | Installer and a clean-machine test, including the WebView2 check | Medium | Medium |
| 5 | Offline and long-session testing: map with no network, memory over time, pause the Home video when scrolled out of view | Medium | Low |
