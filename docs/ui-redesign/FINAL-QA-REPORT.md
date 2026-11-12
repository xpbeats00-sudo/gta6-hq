> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# UI redesign: final QA report

Date: 2026-11-11.

## What changed

The interface was restyled from a purple, gradient-heavy dashboard to a near-black, image-led editorial layout: a slim announcement strip, a quiet header with an underlined active link, a full-window hero with the countdown set in type at the bottom left, a one-line fact strip, and large editorial sections. Cards lost their rounded glowing outlines; pictures now fill their tiles with the name on a fade. Entries with no artwork are plain text, or show a quiet "No artwork on file" panel instead of generated scenery and initials.

## What was preserved

The Rust desktop shell, server, search, data validation, tile cache, data files and every image and video are unchanged. Every route still opens. Splash, countdown, map, media viewer, search, confidence labels, sources, related links and data health all still work (tested below).

## Before and after

- `screenshots/before-after-desktop-window.jpg` — the real app window.
- `screenshots/before-after-home-characters.jpg` — Home and Characters at 1366×768.
- `screenshots/before-*-1366x768.png` and `after-*-1366x768.png` — all 12 pages.
- `screenshots/after-*-<size>.png` — all 12 pages at 1920×1080, 1600×900, 1280×720 and 900×700.

## Commands and results (final run)

| Command | Exit code | Result |
|---|---|---|
| `cargo fmt --all -- --check` | 0 | Clean |
| `cargo clippy --all-targets --all-features -- -D warnings` | 0 | No warnings |
| `cargo test` | 0 | 20 passed, 0 failed |
| `cargo build --release` | 0 | Built |
| `gta6-hq --validate` | 0 | 0 errors, 20 warnings (unchanged) |
| `node --check ui/app.js` and `ui/art.js` | 0 | Both parse |

There are no automated interface tests; the checks below were done by hand in a browser and in the desktop window.

## Visual acceptance

| Criterion | Result | Evidence |
|---|---|---|
| No longer a generic purple dashboard | Met | Before/after images |
| Near-black canvas, restrained accents | Met | `--bg-main` `#0b0a16`; pink used for the primary button, active link and hovers |
| Compact, minimal header | Met | 56 px; underline instead of gradient pill |
| Large, image-led hero | Met | Fills the window below the header |
| Countdown integrated into the hero | Met | Type-only, ruled separators |
| Slim fact strip | Met | One row |
| Clear type hierarchy | Met | Display, label and body roles in `DESIGN-SYSTEM.md` |
| Thin borders, no heavy rounded outlines | Met | 1 px lines, 2 px radius |
| Large imagery and editorial layouts | Partly | True where artwork exists. Six characters, four regions and most entries have none |
| No important text obscured by artwork | Met on the pages reviewed | Fades behind all text on images |
| Side by side with the reference | **Not done** | The reference would not render in the browser pane and no reference screenshot was supplied |

## Functional acceptance

| Criterion | Result | How it was checked |
|---|---|---|
| All navigation destinations work | Pass | Every route opened; menu opens, closes on Esc and after choosing a page |
| Search covers the same data | Pass | "keys" returns 10 results; "drequan" returns Dre'Quan Priest first; filter chips present |
| Countdown computes from the configured date | Pass | Ticking; shows 7 days on 11 November for 19 November |
| Detail pages open | Pass | Character, location, vehicle and wildlife entries |
| Map loads, pins work, cache intact | Pass | Flew to Vice City; popup linked to its entry |
| Map attribution visible | Pass | Text read from the page |
| Media viewer | Pass | 16 tiles; viewer showed rights and credit; Esc closed it |
| Splash and startup | Pass | Splash shown and skipped in the browser; desktop window reached Home |
| No new console errors | Pass | Only errors logged were from earlier deliberate bad-address tests |
| Offline behaviour unchanged | Not tested | The redesign adds no network requests |

## Quality acceptance

| Criterion | Result |
|---|---|
| Rust tests pass | Yes, 20 |
| UI tests added | No. A repeatable screenshot script was added instead |
| Format, lint, production build | All pass |
| Target window sizes | All five captured for all 12 pages. Reviewed by eye: Home at 1920, 1366 and 900 wide, and ten pages at 1366. Overflow measured at 900 and 375 wide: none |
| Keyboard operation | Skip link, header, hero actions, cards, menu and viewer checked. Map controls and search filters were not walked through by keyboard |
| Reduced motion | Transitions are turned off. The hero video plays regardless, by the owner's choice, and can be paused |
| Asset provenance recorded | Yes, but every asset's rights are still unknown |
| Before/after screenshots | Yes |

## Things to know

1. **The hero video always plays.** It was first made to stay paused when reduced motion is requested, which left it paused on this computer. At the owner's request it now plays on arrival regardless; the round button at the bottom right pauses it. The splash video also now starts 2 seconds in, past its near-black opening.
2. **The big logo is gone from Home.** The plan says not to use Rockstar's logo artwork, so the hero uses a text title. The small mark in the header and window icon is still the file you supplied; replacing it with an original GTA 6 HQ mark is a decision for you.
3. **The colourful generated postcards are gone.** The plan asks for a designed "artwork unavailable" state instead of gradient placeholders and initials.

## Missing assets and rights questions

- Rights are unknown for all 18 media files, including the hero video.
- No artwork exists for six characters, four regions and five vehicle entries.
- There are no trailer videos, so the Home "Media" section shows the local wallpapers, not trailers.

## Not completed

- Side-by-side comparison with the official site.
- Automated interface tests.
- Responsive image sizes and image compression (the stills are already 0.3–0.4 MB).
- Keyboard walk-through of the map and search filters; screen-reader testing.
- Performance re-measurement after the redesign.
- An original project logo.
