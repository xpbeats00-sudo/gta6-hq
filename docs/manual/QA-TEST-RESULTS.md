> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# Field Manual: QA test results

Date: 2026-11-12. Release build. "Browser" is the app served with `--serve` and driven in a browser pane (about 800 px wide, so it shows the single-page layout); "Headless" is Microsoft Edge headless at a fixed window size; "Desktop" is the real `gta6-hq.exe` window.

## Automated

| Command | Exit | Result |
|---|---|---|
| `cargo fmt --all -- --check` | 0 | Clean |
| `cargo clippy --all-targets --all-features -- -D warnings` | 0 | No warnings |
| `cargo test` | 0 | 53 passed, 0 failed (51 before the manual; 2 new manual tests) |
| `cargo build --release` | 0 | 5,562,368 bytes |
| `gta6-hq --validate` | 0 | 0 errors, 33 warnings across 97 entries and 33 media files. No manual warnings: every factual block has an evidence label, every cited source exists, the chapter image is on disk |
| `node --check ui/app.js`, `ui/manual.js` | 0 | Both parse |

## Manual reader

| Check | Result | How |
|---|---|---|
| `MANUAL` in the navigation, active state | Pass | Browser; Desktop screenshot |
| Cover and contents: 9 chapters, two marked "In development" | Pass | Browser; Headless |
| Two-page spread on a wide window | Pass | Headless at 1600×1100 and 1366×768 |
| Single page on a narrower window | Pass | Browser at 1000 px and 375 px; no sideways overflow on 6 manual pages at 375 px |
| Previous / Next and the page counter ("Page 20–21 of 30") | Pass | Browser; Headless |
| Right arrow, Page Down, Left arrow turn pages | Pass | Browser |
| Arrow keys ignored while the search field has focus | Pass | Browser |
| Search ("focus" finds "Finding the Police"; result opens that page) | Pass | Browser |
| Night Reading on and back to Paper | Pass | Browser (paper colour changes; class toggles) |
| Last page remembered ("Continue reading · page 22") | Pass | Browser |
| Deep link to a page; unknown chapter shows "Page not found" | Pass | Browser |
| "In development" chapters show a note, not content | Pass | Browser |
| Source links open in a new window (so the desktop app hands them to the default browser) | Link targets checked; **not clicked in the Desktop window** | Browser |
| Evidence labels and numbered footnotes on the Law Enforcement pages | Pass | Headless screenshots |
| Chapter image and cover image load | Pass | Headless screenshots |
| `/api/manual` | 200, JSON, 24 KB | Server and Desktop |
| Copy link button | **Not tested** | — |
| Reduced motion | Not applicable: the reader uses no animation | — |
| Screen reader | **Not tested** | — |
| Zoom | **Not tested** | — |

## Content integrity

| Check | Result |
|---|---|
| Every police claim has an evidence label | Pass (validator: no `manual-no-evidence`) |
| Every cited source id exists | Pass (validator) |
| Source links | Five sources. IGN (Yahoo copy), both GamesRadar+ pages, GTABase and VICE all opened on 2026-11-11/12 |
| No thresholds, timers or radii | Pass by review. One number appears, in Nelson's own "three stars in the city" example |
| Nothing attributed from GTA V | Pass (fact-check agent found none; "Not carried over" box on the last page) |
| Images genuine and captioned | The opening picture is an official Rockstar screenshot, credited. The star row and flow diagrams are captioned as manual illustrations |
| Unofficial notice | On the cover and in every page footer |
| Compared against the GTA IV reference spread | **Not done**: the reference images are not in the project |

## Screenshots

In `docs/manual/screenshots/`: cover and contents, Law Enforcement opening, Heat pages, Hot Areas and Clear the Clues, Leonida, Sources, search results (1600×1100); cover and opening at 900 px (single page); the desktop window after integration.

## Update, 2026-11-12: pictures and layout tuning

| Check | Result | How |
|---|---|---|
| `gta6-hq --validate` | Exit 0: 0 errors, 37 warnings (4 new media files, all "permission needed"); no manual issues | Command |
| `node --check ui/manual.js` | Exit 0 | Command |
| Five chapter pictures load on their pages | Pass | Headless screenshots at 1600×1250 |
| Picture-led gallery on the Leonida, Characters and Vehicles chapters; one large lead entry when a page has three | Pass | Headless screenshots; 3 gallery entries counted in the browser |
| Gallery pictures and titles link to the full entry | Pass | Browser (`#/locations/vice-city`) |
| Page turning by keyboard still works | Pass | Browser |
| No sideways overflow on 6 manual pages | Pass | Browser at 1077 px |
| Console errors | None | Browser |
| Night Reading with the new styles | **Not re-checked** | — |
| Narrow (375 px) layout with the gallery | **Not re-checked**; the gallery is set to one column below 620 px | — |

Rust code was not changed in this update, so the Rust checks were not re-run. Screenshots: `docs/manual/screenshots/tuned-manual-*.png` and `manual-overview.jpg`.

## Superseded in part, 2026-11-12

The wanted-star pages were later rebuilt from frames of Rockstar's official Extended Look, and independently fact-checked. See `RERUN-REPORT.md` for what the footage shows, the new evidence counts, the frames added and the checks run.
