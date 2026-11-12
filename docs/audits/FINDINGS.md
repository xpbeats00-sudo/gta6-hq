> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# Findings

Severity: **P0** data loss, security hole or cannot launch · **P1** crash, or major feature or factual defect · **P2** significant usability, performance or content gap · **P3** polish.

No P0 findings.

| ID | Sev | Area | Finding and impact | Fix | Test / evidence | Status |
|---|---|---|---|---|---|---|
| F-01 | P1 | `ui/app.js` splash | The Enter/Esc listener was registered with `once: true`, so pressing any other key first (Tab, a letter) removed it and Enter/Esc stopped skipping the intro. | Listener stays until the splash ends and is then removed. | Manual, browser: sent Tab, `a` (splash still up), then Enter, Enter, Esc and a Skip click: one clean transition to Home. | Fixed |
| F-02 | P1 | `data/wiki.json` | Several statements were written from memory and could not be found in a source: Vice City "back streets", police boats, banner planes, sports cars on Ocean Beach, "extra time to polish" for the second delay, a muscle car "in the key art". Trailer 1 was dated 5 December 2023; sources say 4 December. | Every entry re-checked against pages read on 2026-11-11; unsupported lines removed or rewritten; date corrected. | `CONTENT_INTEGRITY.md`: 73 of 75 entries cite a source. | Fixed |
| F-03 | P1 | `images/`, `wallpapers/` | No creator, source or licence is known for any of the 18 media files (the videos and logo were supplied by the app owner; the stills are frames of those videos). The pack says unknown-rights media must not be published silently. | Added `data/media.json` with a rights record per file. Every item now shows "Rights not confirmed" and its origin in the viewer. Nothing was removed, because the files are the owner's and the app is local. | 18 `rights-unconfirmed` warnings in `CONTENT_INTEGRITY.md`; label seen in the lightbox. | **Open: needs the owner** |
| F-04 | P2 | `data/wiki.json` | No entry had a source, confidence label or last-checked date. | Schema v2: `confidence`, `sources`, `verified`, `related`, `aliases` per entry and a `sources` registry of 19 pages. Shown on every entry. v1 files still load. | Unit test `v1_files_without_categories_still_have_sections`; browser check of the Alligators entry. | Fixed |
| F-05 | P2 | `src/content.rs` | A broken `data/wiki.json` silently fell back to the built-in copy, so edits vanished with no explanation. | The app still starts on the built-in copy, but shows a red banner saying why, and `/api/health` reports `wiki-unreadable`. | Manual: wrote `{ broken` to the file; `/api/wiki` returned the error text and 8 characters; health reported 1 error. File restored and compared byte for byte. Unit test added. | Fixed |
| F-06 | P2 | `src/content.rs`, `media.rs` | A UTF-8 byte-order mark (which Notepad and PowerShell add) made the JSON unreadable. | The mark is stripped before parsing. | Reproduced before the fix ("expected value at line 1 column 1"); after it the same file loads with no error. Unit test added. | Fixed |
| F-07 | P2 | `src/search.rs` | "drequan" did not find Dre'Quan Priest: apostrophes split the name into "dre" and "quan". | Words are indexed both split and joined; `aliases` are searched. | Unit test over `DREQUAN`, `dre'quan`, curly apostrophe, `dre quan`, alias. Live: both spellings return him first. | Fixed |
| F-08 | P2 | `src/window.rs`, map | The Leaflet credit link would have navigated the app window to an outside site with no way back. | Leaflet link removed; outside links open in the default browser and never replace the app. | Unit test of the URL rule. **Not clicked in the desktop window.** | Fixed, partly verified |
| F-09 | P2 | `src/tiles.rs` | Tile cache writes were not atomic; a non-image response (for example a wifi sign-in page) would have been cached as a tile; every failure looked like "not found"; the map gave no offline message. | Temp-file-then-rename writes, WebP check before caching and when reading, 4 MB cap, 404 for "no such tile" and 502 for "provider unreachable", and an on-map notice when tiles fail. | 3 unit tests; live: valid tile 200, out-of-range 404, bad path 400, 0 temp files among 32 cached tiles. **Offline behaviour not tested live.** | Fixed, partly verified |
| F-10 | P2 | `src/main.rs` | The release build has no console, so a failed start (files missing, port taken, no WebView2) showed nothing at all. | A message box explains the problem. | Manual: ran the exe alone in an empty folder; a window titled "GTA 6 HQ" appeared and the process exited with code 1. The text of the box was not read. | Fixed |
| F-11 | P2 | `ui/app.js` video | Videos kept decoding while the window was hidden or minimised. | Videos pause on hide and resume on show. | Manual, browser: hero video playing, then paused when hidden, then resumed. | Fixed |
| F-12 | P3 | Rust source | `cargo fmt --check` failed. | Formatted; `rustfmt.toml` added. | Exit code 0. | Fixed |
| F-13 | P3 | `ui/app.js` images | A missing picture showed the browser's broken-image icon. | Falls back to generated postcard art, or an "Image unavailable" tile in the gallery. | Manual: pointed a card at a missing file; it became an SVG postcard. | Fixed |
| F-14 | P3 | Media viewer | No alt text beyond the file name; keyboard focus was not moved into or kept in the viewer, or returned on close. | Alt text from the manifest; focus moves to Close, Tab stays inside, Esc returns focus to the tile. | Manual: focus on `lightbox-close` when open, back on the tile after Esc. | Fixed |
| F-15 | P3 | `ui/styles.css` | Search results overflowed a 375 px wide window by 10 px. | Results can shrink and wrap. | Measured 0 px overflow on 12 pages at 375 px. | Fixed |
| F-16 | P3 | `ui/art.js` | The initials drawn on portrait art were inserted into SVG without escaping. | Markup characters are stripped. | Code review. | Fixed |
| F-17 | P3 | `src/server.rs` | Search accepted a query of any length. | Query capped at 200 characters. | 5,000-character query returns 200 promptly. | Fixed |

## Checked and found sound

| Check | Evidence |
|---|---|
| Server listens on loopback only | `Get-NetTCPConnection`: `127.0.0.1` |
| No path traversal or stray file access | `/images/..%2F..%2FCargo.toml`, `/..%2Fdata/wiki.json`, `/images/%2e%2e/%2e%2e/src/main.rs`, `/data/wiki.json`, `/data/media.json`, `/staging/x`, `/cache/tiles/0/0/0.webp` all return 404 |
| Wiki text cannot inject HTML | Every field goes through `esc()` before reaching the page |
| Video seeking works | `Range` request returns 206 |
| No secrets, telemetry or analytics | Source and UI read in full; the only outbound request is for map tiles |
| Audio | All six videos have no audio track; every `<video>` is muted |
| Tile attribution | Visible on the map: "Map: GTA VI mapping community via gtadb.org · CC BY 4.0 · tiles from gta6-wiki.org" |
| Closing the window releases everything | Process exited within 6 s of the close request; 0 WebView2 processes left; port freed after the server-only run was stopped |
