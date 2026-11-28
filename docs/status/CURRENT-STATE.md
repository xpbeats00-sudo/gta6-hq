# GTA 6 HQ: current state

Generated 2026-11-28 02:13 by `scripts/current_state.py`. **This is the one authoritative status report.** Older reports are history; see `REPORT-INDEX.md`.

| Item | Now |
|---|---|
| App version | 0.2.51 (`Cargo.toml`) |
| Version control | Commit bc29ef2 on main, 34 uncommitted paths. |
| Encyclopedia | 3395 entries in 13 categories; 0 categories empty |
| Field Manual | 23 chapters, 536 pages; 0 chapter in development |
| Media records | 2686: 34 approved, 2632 permission_required, 20 unknown |
| Map | 6585 markers; tile cache 809 files, 134.9 MB; never pruned, limited to 1,365 tiles by the zoom limit |
| Formatting | Pass |
| Clippy, warnings as errors | Pass |
| Tests | Pass. 93 passed, 0 failed |
| Release build | Pass |
| Data validator | Pass. 0 errors, 2688 warnings; by check: no-sources 1, rights-unconfirmed 2652, unlisted-media 35 |
| JavaScript syntax | 15 of 15 files pass `node --check` |

Detail: `DATA-AND-MANUAL-COUNTS.md`, `REPOSITORY-INVENTORY.md`, `BASELINE-TEST-RESULTS.md`, `../compliance/MEDIA-RIGHTS-AUDIT.md`.

## Known blockers

Kept by hand; included in `CURRENT-STATE.md` each time it is generated.

| Priority | Blocker | State |
|---|---|---|
| P0 | No version control | Not a Git repository. Needs the owner's go-ahead to create one |
| P0 | Media rights | No picture or video is cleared for public distribution: see `../compliance/MEDIA-RIGHTS-AUDIT.md`. Private use on the owner's machine is the lower-risk case; this is not legal advice |
| P0 | No rights-safe package | The app cannot yet be built without the uncleared media |
| P0 | No clean-machine install test | Not done |
| P1 | No automated interface tests | Only Rust unit tests and manual page checks exist |
| P1 | Accessibility not audited | Screen reader, full keyboard use and 200% zoom untested |
| P1 | Performance not measured | One old spot measurement only (`../audits/PERFORMANCE.md`) |
| P1 | Tile provider terms not reviewed | See `../architecture/NETWORK-AND-PRIVACY.md` |
| P2 | Manual claims are pre-release | Every Law Enforcement block needs checking against the released game |
| P2 | Getting Started unwritten; Missions and Collectibles empty | Deliberate: nothing reliable is published |
| P2 | One entry has no picture; several pictures are illustrative only | Listed in `../manual/ASSET-AND-RIGHTS-REGISTER.md` |
