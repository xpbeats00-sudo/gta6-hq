> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# Implementation log

All work on 2026-11-11. Only files in `ui/` and `docs/` changed. No Rust source, data file, image or video was modified, and no dependency was added.

## Phase 0 — Baseline and inventory

- Backed up `ui/` and `data/` to `backups/pre-ui-redesign-2026-11-11.zip`.
- Ran format, lint, tests, release build and data validation: all passed (see `BASELINE-AUDIT.md`).
- Added `?nosplash` to `ui/app.js` so pages can be captured without the intro.
- Wrote `capture.ps1` (headless Edge) and captured all 12 pages at 1366×768 as `before-*`.
- Opened the reference site. It stayed on its loading screen in the browser pane, so its computed styles were read instead of taking a screenshot.

## Phase 1 — Design tokens and shell

- `ui/styles.css` replaced: tokens for colour, type, spacing, radius and motion, then every component written against them.
- `ui/index.html`: skip link, announcement bar, quieter header with a menu button, icon search, footer with the fan-project line.
- `ui/app.js`: announcement text built from the release date; menu open/close with Esc; `--announce` height variable so the hero and map still fit the window.

Check: script parses (`node --check`), pages load with no new console errors.

## Phase 2 — Home hero and landing page

- `renderHome` rewritten: full-bleed hero with title, tagline, typographic countdown and two actions bottom-left; pause button; scroll cue.
- The large logo was removed from the hero so nothing covers the artwork and the app does not present Rockstar's mark as its own.
- Fact strip slimmed to one ruled row.
- Five editorial sections: The Cast (two portraits and a roster), Vice City and Beyond (large image and a region list), Vehicles (three image tiles), Media (three video tiles), Latest (four timeline items).
- Countdown hides itself if the configured date is unusable.

Check: sections present in order, countdown ticking, media strip filled with three tiles, pause button toggles the video and its label.

## Phase 3 — Content pages

- `card()` now leads with the image and puts the name on a fade; entries with no artwork in art-less categories render as text notes (`entryGrid`).
- Encyclopedia categories became a numbered topic index; A–Z and data health kept.
- Characters: two large lead portraits, then the supporting grid.
- Locations and Vehicles: feature grids with the illustrated entries large.
- `ui/art.js` replaced: the colourful generated postcards and initials are gone; missing artwork shows a quiet "No artwork on file" panel.
- Entry pages for art-less categories dropped the picture column.

Check: every route in the inventory opened; related links, sources and tags present.

## Phase 4 — Map, media, search and Intel

- Map: dark sidebar with ruled groups, round pins in the new palette (pink regions, white districts, yellow landmarks), square popups and zoom control. Leaflet, tile cache, pins and attribution untouched.
- Media: 16:9 tiles with a play mark on videos; viewer restyled; rights label and credit kept.
- Search: large underlined field, compact filter chips, ruled result rows; thumbnails only where a real image exists.
- Intel: ruled timeline with dates in a left column; editions and FAQ restyled.

Check: map flew to Vice City and its popup linked to the entry; attribution visible; viewer opened, showed rights and closed on Esc; "drequan" still finds Dre'Quan Priest.

## Phase 5 — Responsive and accessibility

- Breakpoints at 1280, 1040 and 700 px. Navigation collapses to a menu at 1040 px.
- Measured sideways overflow: 0 px on 13 pages at 900 px and on 10 pages at 375 px.
- Contrast computed for every text colour; the plan's muted colour was lightened to pass 4.5:1.
- Focus outline (2 px pink) confirmed on the first 16 tab stops of Home; the search field shows focus with a border and background change.
- Reduced motion: transitions off. (The hero video was also held paused at first; that was reverted at the owner's request.)

Fixes made during this phase: the Vice City label on the Home feature image wrapped into a narrow column (given a full-width box and a fade); lead portraits on the Characters page were taller than the window (width capped).

## Phase 6 — Final QA

- Captured all 12 pages at 1920×1080, 1600×900, 1366×768, 1280×720 and 900×700 as `after-*`.
- Captured the real desktop window before and after.
- Re-ran format, lint, tests, release build, validation and script syntax checks.
- Wrote the design system, asset inventory, this log and the final report.

## Files changed

| File | Change |
|---|---|
| `ui/styles.css` | Replaced (589 lines before, 469 after) |
| `ui/index.html` | Shell rewritten |
| `ui/app.js` | Home, cards, encyclopedia index, entry layout, media tiles, search results, announcement, menu, `?nosplash` |
| `ui/art.js` | Replaced |
| `docs/ui-redesign/*` | New: five documents, `capture.ps1`, screenshots |
| `backups/pre-ui-redesign-2026-11-11.zip` | New |
