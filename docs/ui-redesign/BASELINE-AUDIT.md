> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# UI redesign: baseline audit (Phase 0)

Date: 2026-11-11. Taken before any interface file was changed.
Backup: `backups/pre-ui-redesign-2026-11-11.zip` (the `ui/` and `data/` folders, 78,063 bytes).

## Repository structure

| Part | Files | Role in the redesign |
|---|---|---|
| Rust entry point | `src/main.rs` | Not touched |
| Desktop window | `src/window.rs` (tao window, wry / WebView2 view, native title bar) | Not touched |
| Server and data | `src/server.rs`, `content.rs`, `search.rs`, `media.rs`, `tiles.rs`, `validate.rs` | Not touched |
| HTML entry point | `ui/index.html` | Rewritten shell |
| Styles | `ui/styles.css` (589 lines) | Replaced |
| Script | `ui/app.js` (hash router, one render function per page) | Home and card rendering changed; routes and data access kept |
| Placeholder art | `ui/art.js` | Replaced |
| Map library | `ui/vendor/leaflet.js`, `leaflet.css` | Not touched |
| Content | `data/wiki.json`, `data/media.json` | Not touched |
| Media | `images/` (12 files), `wallpapers/` (6 videos) | Not touched |

All page content is data-driven: nothing in the pages is hard-coded except section headings and the Home hero video path.

## Route and feature inventory

| Route | Page | Features that must survive |
|---|---|---|
| (launch) | Splash | Video, progress bar, Skip, Enter, Esc |
| `#/` | Home | Hero video, countdown, facts, links to every section |
| `#/wiki` | Encyclopedia | 12 categories, A–Z, data health panel |
| `#/wiki/<category>` | Category | Entries, or "Not yet documented" |
| `#/wiki/<category>/<slug>` | Entry | Summary, related, sources, tags |
| `#/characters`, `#/characters/<slug>` | Characters | Leads and supporting cast, profile with ties |
| `#/locations`, `#/locations/<slug>` | Locations | Six regions, "View on the map" |
| `#/vehicles` | Vehicles | Eight entries |
| `#/map`, `#/map?focus=<name>` | Map | Leaflet, tile cache, 15 pins, toggles, popups, attribution |
| `#/media` | Media | Filters, hover preview, viewer with rights and credit |
| `#/search?q=…&in=…` | Search | Live results, category filter, empty state |
| `#/intel` | Intel | Timeline, editions, FAQ |
| Header | All pages | Navigation, active state, search box |

## Baseline commands

| Command | Exit code | Result |
|---|---|---|
| `cargo fmt --all -- --check` | 0 | Clean |
| `cargo clippy --all-targets --all-features -- -D warnings` | 0 | No warnings |
| `cargo test` | 0 | 20 passed |
| `cargo build --release` | 0 | Built |
| `gta6-hq --validate` | 0 | 0 errors, 20 warnings |

## Baseline screenshots

All 12 pages at 1366×768, captured with headless Edge by `capture.ps1`: `screenshots/before-*-1366x768.png`. The desktop window before the redesign: `screenshots/before-desktop-window-home.png`.

One small script change was made before capturing: a `?nosplash` address option that skips the intro, so pages can be captured without waiting ten seconds. It does not change how any page looks.

## The reference

`https://www.rockstargames.com/VI` was opened in the browser pane. Its text loaded but the page stayed on its loading screen in the pane, so **no screenshot of the reference could be taken**, and the two screenshots the plan refers to were not supplied. The design was instead based on:

- the plan's own palette and layout description;
- computed styles read from the live page: background `rgb(17, 17, 23)`; uppercase bold headings with very wide letter spacing (about 0.15em); small bold condensed uppercase labels in pale pink; body text in a medium weight; lilac secondary text `rgb(204, 194, 245)`; fully rounded buttons;
- the page's section order: announcement, watch, editions, story statement, music, screenshots, people and places, news.

The site's own typefaces (named "ArtDeco" in its styles) are proprietary and were not downloaded or used.

## Risks identified

| Risk | Handling |
|---|---|
| Restyling could break the map, viewer or search | Their markup hooks and scripts were kept; each was re-tested |
| No licensed display typeface | Bahnschrift, which ships with Windows, with fallbacks |
| Artwork rights unknown for all media | No new assets added; existing ones keep their "rights not confirmed" label |
| The logo is Rockstar's trademark | Removed from the hero; kept only as the small window and header mark the owner supplied |
| Reference not captured | Stated here and in the final report; side-by-side comparison with the reference was not possible |
