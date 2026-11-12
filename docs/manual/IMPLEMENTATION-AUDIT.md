> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# Field Manual: implementation audit

Date: 2026-11-12. This is the architecture and integration role of the mission, done by the lead rather than a separate agent because another agent was rewriting the same core files at the time.

## The codebase as found

| Area | What is there |
|---|---|
| Entry point | `src/main.rs`: finds the app folder, binds `127.0.0.1`, starts the server, opens the window. Flags: `--serve`, `--port`, `--validate`, `--template`, `--import` |
| Window | `src/window.rs`: tao window, wry (WebView2) view; outside links open in the default browser |
| Server | `src/server.rs`: axum routes `/api/wiki`, `/api/search`, `/api/media`, `/api/health`, `/api/presence`, `/tiles/…`; static files from `ui/`, `images/`, `wallpapers/` only |
| Content | `src/content.rs`: in-memory store of `data/wiki.json` plus `data/wiki/*.json`, reloaded when files change |
| Checks | `src/validate.rs`: report-only integrity checks, also used by `--import` |
| Interface | `ui/index.html`, `ui/app.js` (hash router, one render function per page), `ui/styles.css` (design tokens), `ui/art.js` |
| Data conventions | JSON files in `data/`; entries carry confidence, sources and a verified date; a `sources` registry |

No manual or guide section existed. There was no reusable article renderer: pages are built by functions in `ui/app.js`.

## Baseline before the manual was connected

| Command | Exit | Result |
|---|---|---|
| `cargo fmt --all -- --check` | 0 | Clean |
| `cargo clippy --all-targets --all-features -- -D warnings` | 0 | No warnings |
| `cargo test` | 0 | 51 passed (after the core upgrade; 23 before it) |
| `cargo build --release` | 0 | Built |
| `gta6-hq --validate` | 0 | 0 errors, 33 warnings (all media rights) |
| `node --check ui/app.js` | 0 | Parses |

Before screenshots of every page: `docs/ui-redesign/screenshots/after-*` (taken at the end of the redesign, before the manual).

## Integration path chosen

The smallest safe one: the manual is a self-contained reader in its own files, connected through five small touch points.

| Touch point | Change |
|---|---|
| `ui/index.html` | One stylesheet link, one script tag, one navigation link (`Manual`, before `Intel`) |
| `ui/app.js` | One line in the route table (`manual: () => Manual.render(…)`) and one presence label |
| `src/server.rs` | One route, `/api/manual`, serving `data/manual.json` |
| `src/validate.rs` | `load_manual` and `check_manual`, called from `validate`; two tests |
| `data/media.json` | One record for the chapter's opening picture |

Nothing existing was renamed, moved or removed. No dependency was added. Manual styles are all under `.manual`, so the app's theme and the map's controls are untouched, and the manual's paper theme does not inherit the dark theme's colours.

## Regression-sensitive features identified

Splash video and skip keys; Home hero video and countdown; hash routes and deep links; search (response shape changed by the core upgrade); Leaflet map, tile cache and attribution; media viewer focus handling; Discord presence; data validation. Each was re-tested: see `REGRESSION-REPORT.md`.

## Risks noted

| Risk | Outcome |
|---|---|
| Two writers on `ui/app.js`, `src/server.rs`, `src/validate.rs` | Avoided: the manual was built apart and joined after the core agent finished. Pre-join copies are in `backups/` |
| Keyboard page-turning stealing keys from the map or search fields | The handler runs only on the manual page and ignores fields and buttons; tested |
| A broken `data/manual.json` | The route answers with an error and the reader shows "could not be loaded"; the validator reports `manual-unreadable`. The rest of the app is unaffected |
| Navigation getting crowded | Nine items fit at 1366 px and wider; below 1040 px the menu button takes over |
