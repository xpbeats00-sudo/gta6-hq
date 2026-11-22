# Final verification and release readiness

**Date:** 2026-11-21. **Scope:** the audit fixes in sections 15–17 of `GTA6-MAP-EXPLORER-AUDIT.md`, the helper agents' changes, saving in the desktop window, CI, the media policy, and F-59/F-60. **Changes made during this check:** one CI fix (V-CI-1 below) and the new `docs/compliance/MEDIA-DISTRIBUTION-POLICY.md`. Nothing is committed.

## Verdict

**Not ready to release yet.**
- Saving in the desktop window works.
- F-59 and F-60 are untouched.
- The helper agents changed only what they reported.
- The saving and data-safety issues V-1 to V-4, V-11 and V-12 are fixed (section "Fixed after this check").
- Two things still stand in the way:
  1. The media distribution decision (F-08) is open.
  2. CI has not run on GitHub.
- V-5 to V-10 and V-13 are fixed as well (the last section).

## Release criteria

| Criterion | Result | Evidence |
|---|---|---|
| No regressions from the 20 interface fixes | **Not met.** No High regressions, but 10 Low to Medium ones (below). | An independent read-only review of every changed code path, plus the scripted Edge checks for sections 15, 16 and 17. Those checks all pass except one 768 px check that was too strict. |
| No unintended changes from the helper agents | **Met.** | Files changed this afternoon match the agents' reports, and `data/manual.json` and `data/media.json` were not touched. The collectible data changed only in `facts.type` capitals: 31 values, against `git show HEAD`; the other 39 differences in one file are earlier image removals. `sources.launch.json` gained the `gamersky-map` notes and terms. |
| Desktop saving works | **Met.** | The real WebView2 window was driven through its debugging port, using throwaway settings, saved data and cache. A map-card favourite, a collection made with Enter, the Dark theme, a 171 KB journal of 1,400 records, and a write from the window's own origin were all saved. After a normal close and a restart (the window came back on a new port, 65358) everything returned and the Saved page listed it. The real settings file (`%APPDATA%\GTA6HQ\settings.json`, last changed 04:14) was not touched. |
| CI verified | **Partly.** | The Windows job's steps were run here. Format, tests (84 passed), clippy and the build pass. Script parsing passes, and both Edge suites pass (46/46 and 28/28). The data and server step failed, and has been fixed (V-CI-1). The Linux and macOS jobs, WebKit and `ci_pages.mjs` (Playwright) can only be checked by running CI on GitHub, which needs a push. |
| Browser compatibility | **Partly.** | Only Edge 158 is available: headless, plus WebView2 in the desktop window. Chrome and Firefox aren't installed, and Safari can't run on Windows. |
| Media distribution policy documented | **Met (decision pending).** | `docs/compliance/MEDIA-DISTRIBUTION-POLICY.md`: the facts, four options and a recommendation. The decision log is empty. |
| F-59 and F-60 untouched | **Met.** | All 1,008 markers are identical to the audit's pre-fix copy (`scratchpad/audit/B/wiki-api-all.json`) apart from the 22 added spoiler flags. "Pick and Choose (Ocean Beach)" is still at 0.6939, 0.33395. The Berry Dream, Banana Cove and Meteorite pairs are unchanged. |

## Fixed during this check

**V-CI-1: the Windows data check could never pass.**
- The release build is a windowed program (`windows_subsystem = "windows"`), so PowerShell neither waited for `gta6-hq.exe --validate > validate.md` nor captured its output. `$LASTEXITCODE` stayed empty, and the step failed. This was reproduced here.
- The step now uses `Start-Process … -Wait -PassThru -RedirectStandardOutput` and reads `.ExitCode`. Rerun here, it validates, starts the server, gets an answer and stops it.

## Regressions and risks found

From the independent review. The ones marked as confirmed here were checked by reading the code.

| ID | Severity | Where | Problem | Confirmed |
|---|---|---|---|---|
| V-1 | Medium | `ui/app.js` `makeSaver` | A save already on its way when the window closes is no longer sent with `keepalive`, and the close-time send covers only changes still waiting. So a change made just before closing can be lost. It also measures the 60,000 limit in characters, not bytes. This came from today's F-01 fix. | Yes |
| V-2 | Low–Medium | `ui/app.js` `saveTrouble` | The damaged-file notice has no Dismiss button, but the code always attaches one, so it throws an error and can't be closed. It covers the walker and legend on phones until restart. If a later failure reuses it, that failure notice never clears either. | Yes |
| V-3 | Low | `ui/app.js` | Settings and saved data share one notice, so a successful settings save hides a saved-data failure that hasn't been resolved. | Yes |
| V-4 | Medium (data loss, older than today) | `src/userdata.rs` `read` and the page's load | If the saved-data file can't be read briefly (a lock or antivirus) and isn't damaged, the page starts empty. The next save of a part then replaces the saved list with one item. | Suspected; needs that read error |
| V-5 | Low–Medium | `ui/app.js` (the window resize listener in `renderMap`) | The listener is never removed, so each map visit keeps the old map in memory. | Yes |
| V-6 | Low–Medium | `ui/app.js` `fitCards` in 3D | Resizing while in 3D measures the hidden 2D map as zero. The 3D card can then pan under the toolbar. | By the reviewer |
| V-7 | Low | `ui/app.js` 3D card close | The sidebar row stays highlighted after a 3D card is closed. | By the reviewer |
| V-8 | Low | `ui/app.js` `show3d` | Pressing 3D twice while a build fails gives an unhandled rejection (a console error). | By the reviewer |
| V-9 | Low | `ui/explore.js` | Location pages still show two map buttons: the side panel's button isn't inside a paragraph. | By the reviewer |
| V-10 | Low | `ui/app.js`, `ui/explore.js`, `ui/journal.js` | A spoiler pin saved while hidden is stored as "Spoiler", and one saved while shown keeps its real name after spoilers are hidden. | By the reviewer |
| V-11 | Medium (risk to real data) | `scripts/suite_data.mjs` | The suites erase the data of any app on their port, with only a comment as a guard. Fix: have the server say whether it uses throwaway files (for example in `/api/health`) and refuse to reset otherwise. | By the reviewer |
| V-12 | Low | `src/userdata.rs` | Two copies of the app saving at once share one draft file name. Two damaged files set aside in the same second overwrite each other's copy. | Suspected |
| V-13 | Low | `src/server.rs` | With `--port 80`, writes are refused, because browsers leave the port out of `Origin`. | By the reviewer |

The reviewer checked these and found them fine:
- The icon replacements: no `${…}` inside plain strings, and every icon is defined.
- Flight numbering, card replacement and selection hand-over between 2D and 3D.
- Releasing the 3D map when the reader leaves during the build.
- The ETag/304 handling and the manual cache.
- The new validator checks.
- The z-index of the raised top bar.
- The CI PowerShell blocks.

## What is needed before release

1. **Decide F-08:** pick an option in `MEDIA-DISTRIBUTION-POLICY.md`, and enforce it in `package_release.py`.
2. **Fix V-1, V-2, V-3, V-4 and V-11.** These are the ones about saving and real data. V-5 to V-10 can go in the same small round.
3. **Run CI on GitHub** by pushing a branch, which needs the owner's yes, so the Linux, macOS and WebKit jobs and `ci_pages.mjs` actually run.
4. Optionally, test in Chrome or Firefox if one is installed.

## Evidence files

All are temporary, in `C:\Users\Mbkmo\AppData\Local\Temp\claude\7d69d3407dde4f13\2f316cc0-c2a6-4e1f-934c-f419dcdfa23d\scratchpad\`:
- `p2\desktop.mjs`: the desktop window test.
- `ci\step*.ps1`: the CI steps as run here.
- `p2\fixcheck.mjs`, `p2\medcheck.mjs`, `p2\lowcheck.mjs`, with screenshots in `p2\final-*`.

## Fixed after this check (V-1 to V-4, V-11, V-12)

Made on 2026-11-21 at the owner's request. Nothing is committed.

| ID | What changed | Files |
|---|---|---|
| V-1 | A save on its way is kept until the app confirms it, so the close-time send carries it as well as any change still waiting. That send's 60,000 limit is now counted in bytes (`TextEncoder`). A failed save is retried by itself after 2 s, and the wait doubles up to 60 s, as well as with the next change. | `ui/app.js` (`makeSaver`) |
| V-2, V-3 | Notices are kept one per kind (settings, saved data, damaged file, unreadable file) in one corner, and every one has Dismiss. A failure notice clears when that kind saves again; the damaged and unreadable notices stay until dismissed. | `ui/app.js` (`saveTrouble`), `ui/design.css` (`.save-notes`) |
| V-4 | A saved-data file that exists but can't be read now (locked or no permission) is an error, not "nothing saved". `GET /api/userdata` answers 503 and a write is refused with nothing changed. The page asks again 3 times over about 5 s. If it still can't read, it says so and saves nothing that session, not even when the window closes, so it can't overwrite the file. New Rust test. | `src/userdata.rs` (`read`), `src/server.rs`, `ui/app.js` (`UserStore.load`, the saver's gate) |
| V-11 | A new `GET /api/storage` says whether the app was started with throwaway files (`GTA6_HQ_SETTINGS` and `GTA6_HQ_USERDATA` both set). The suites' reset refuses anything else, including an older app without the route, before sending any write. | `src/server.rs`, `scripts/suite_data.mjs` |
| V-12 | Each process writes its own draft file (`userdata.json.<pid>.tmp`). A damaged copy is named to the millisecond and never overwrites an earlier one. | `src/userdata.rs` |

**How it was checked:**
- **Rust:** `cargo fmt --check` and `cargo clippy --release --all-targets -- -D warnings` are clean. `cargo test --release`: 85 passed, 1 ignored. `--validate`: 0 errors, 1,018 warnings, unchanged.
- **Headless Edge, with fetch watched from before the app starts:**
  - a save held on its way is resent by the close-time send;
  - 75 KB of three-byte text is not sent with keepalive;
  - the damaged-file notice has Dismiss and throws nothing;
  - a settings save that works leaves a saved-data failure notice in place;
  - a save failed with 503 is retried by itself, and its notice clears.
- **Unreadable file:** a server whose saved-data path was a folder. The API answered 503 and a write got 500 with the folder left as it was. The page showed the unreadable notice and sent no saved-data write, even on close.
- **Suite guard:** against a stand-in server reporting real files, and one with no `/api/storage`, the reset refused and sent no write.
- **Suites:** `ui_features.mjs` 46/46 and `ui_phase2.mjs` 28/28, each twice. The section 15, 16 and 17 checks still pass, apart from the same over-strict 768 px check.
- **Desktop window (WebView2), throwaway data:**
  - all five saves landed and came back after a restart;
  - a change made and the window closed at once was there after reopening.
  - The real settings file still shows 04:14.

**Still open:**
- F-08, the media decision.
- CI on GitHub (needs a push).
- V-5 to V-10 and V-13, which are Low to Medium and not about saving.
- F-59 and F-60, which need sources.

## Fixed after this check (V-5 to V-10, V-13)

Made on 2026-11-21 at the owner's request. Nothing is committed.

| ID | What changed | Files |
|---|---|---|
| V-5 | The map's window-resize listener is removed when the page changes. | `ui/app.js` |
| V-6 | `fitCards` measures whichever map is showing and does nothing while neither is. It re-measures on switching to 3D and back. | `ui/app.js` |
| V-7 | Closing a 3D card clears the list row's highlight. | `ui/app.js` |
| V-8 | A second press of 3D while a failing build is still running no longer gives an unhandled error. The first press shows the failure. | `ui/app.js` |
| V-9 | When the action row has "Show on map", every other map button on the page is removed, including the one in the location side panel. | `ui/explore.js` |
| V-10 | A spoiler map pin saved to favourites or a collection keeps its real name and is marked `spoiler`. On the Saved page it reads "Spoiler" while spoilers are hidden and its name once they're shown. A saved spoiler entry the reader hasn't opened is listed as "Spoiler" too; before, only its picture was hidden. | `ui/app.js` (`mapPins`, card actions), `ui/explore.js` (`describe`, the collection picker) |
| V-13 | An `Origin` with no port counts as port 80, so `--port 80` works. New Rust test. | `src/server.rs` |

**How it was checked:**
- **Rust:** `cargo test --release`: 86 passed, 1 ignored. fmt and clippy are clean. `--validate`: 0 errors, 1,018 warnings. `node --check` passes on every `ui/*.js` and `scripts/*.mjs`.
- **Headless Edge:**
  - a forced 3D failure pressed twice shows one message with no unhandled error;
  - the resize listener count stays at 3 after four map visits;
  - after resizing to 1280×760 in 3D, the card opens below the toolbar and inside the map;
  - the row highlight clears when a 3D card closes;
  - the Vice City location page has one map button;
  - a "Random Events" spoiler pin favourited while hidden is stored as "Pick Up Over $10,000 Early [Recommended]" with `spoiler: true`, and Saved shows "Spoiler" until spoilers are switched on.
- **Suites:** `ui_features.mjs` 46/46 and `ui_phase2.mjs` 28/28, each twice. The section 15, 16 and 17 checks and the saving checks all pass again, apart from the over-strict 768 px check.
- **Not repeated:** the desktop window run after these fixes. Saving itself didn't change.

**Still open before release:**
- F-08, the media decision.
- Running CI on GitHub, which needs a push.
- F-59 and F-60, which need sources.
- Routes saved while a spoiler is hidden still name the stop "Spoiler". That is consistent, but the real name isn't kept.

## F-08 decided and enforced (2026-11-21)

The owner chose option D, with B as the public default. It is enforced in `scripts/package_release.py`; `docs/compliance/MEDIA-DISTRIBUTION-POLICY.md` has the details.

**Public build** (the default):
- No game media.
- The app's own icon and mark.
- The plain installer.
- A policy check that stops the build if an unapproved picture would go in, or if anything refers to one.

It was built here: 122 files, a 4.2 MB zip and a 5.2 MB setup, with 0 data errors. Run in headless Edge:
- every main page draws, 3D builds from the downloaded tiles, and Street Explorer says it has no pictures;
- no picture or clip was requested, and there were no script errors;
- the only failed requests were map tiles that the tile server itself doesn't have (open sea).

**Personal build** (`--include-local-media`): every picture plus the setup window, in `dist/personal/`. It was built here: a 201 MB zip and a 211 MB setup.

**Made to work without the game's pictures, which helps the Store edition too:**
- the walker figure is drawn by the app;
- 3D builds its surface from the 2D tiles;
- Street Explorer picture records go when their picture does.

The Store edition was rebuilt and passes its checks with 0 errors. Before this, the stricter validator would have failed it with 261 errors.

**Blocker found (open): pins don't line up in builds without the official map picture.** The fallback tiles from gta6-wiki.org are a different scale and shape from the official poster the pins were placed on, and most of Vice City's pins land in the sea. Screenshots: `scratchpad/p2/align-full.png` and `align-public.png`. This affects the public build and today's Store build. Options:
- **(a)** Work out a position conversion from the poster to the tiles by matching the two maps, and apply it in builds without the poster.
- **(b)** Ship the official map picture in the public build, which needs a recorded basis under option C.
- **(c)** Release with the mismatch.

**Note:** the public build was written to `dist/GTA6HQ-0.2.34-*` and `dist/SHA256SUMS.txt`, overwriting the local copies of the released 0.2.34 files. The originals are on the GitHub release.

## Map conversion for builds without the official map (option a, 2026-11-21)

**How the fit was found:**
- The zoom-3 community tiles (20 of them, from the same server the app uses) were assembled into one picture.
- The land was then compared with the official map's land, with the legend, seal, compass and frame left out.
- A search over scale and offset (FFT correlation) gave a uniform scale of 0.684 and an offset of (−168, −130) in zoom-3 tile pixels. The land overlap is 88%.
- An overlay of the official coastline on the tiles was looked at: Vice City, the barrier islands, the Keys and the western islands line up.
- The fit is stored in `data/wiki.json` as `map.tileFit` (with `tileAttribution`), and is used only when the official map picture isn't present.

**Changes:**
- `ui/app.js`: `point` and `toXY` go through the fit. Tiles are requested only inside the tile set. The credit line and sidebar text name the community map.
- `ui/map3d.js`: the 3D surface is built from the zoom-3 tiles, drawn onto a canvas shaped like the official map. The credit line is the tiles'.

**Checked:**
- **Screenshots** of the same 2D view and the same 3D view in the full and public builds: the pins sit at the same places on the land in both.
- **Public build in Edge:**
  - every main page draws, and 3D builds;
  - no game picture is requested, and no request fails (the open-sea tile 404s are gone);
  - no script errors;
  - correct credit and sidebar text.
- **Store edition** rebuilt: 0 data errors.
- **Full build:** unchanged text and credit; `ui_features.mjs` 46/46 and `ui_phase2.mjs` 28/28. All earlier checks pass apart from the over-strict 768 px one. 86 Rust tests pass. `--validate` shows 0 errors.

**Not checked:** how well the two maps agree pin by pin, away from the coastlines. The fit is one scale and offset for the whole map, and the two maps are drawn differently, so inland positions can be off by a little more than on the official map.
