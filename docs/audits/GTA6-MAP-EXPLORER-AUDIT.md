# GTA 6 Map Explorer: audit report

> **Status:** done, read-only. Nothing in the application was changed by this audit. Results come from inspection and tests run on 2026-11-21; the agents' full reports, scripts and screenshots are listed in section 13.
>
> **Update, later on 2026-11-21:** at the owner's request the Immediate items were fixed after the audit (F-01 to F-07, F-09, F-10, F-14; section 15), then the Medium findings (section 16), then the Low findings (section 17). F-08 is still open. The findings below are kept as they were found.

## 1. Executive summary

| Field | Result |
|---|---|
| Audit date | 2026-11-21, 07:16:49 to about 08:05 (UTC−08:00) |
| Project inspected | `C:\GTA6Wiki` (GTA 6 HQ) |
| Revision audited | HEAD `52fa0e9` plus the uncommitted working tree (2,180 changed paths in `git status`) |
| Environment | Windows 11 Enterprise 10.0.26300; Rust and cargo 1.99.0; Node v24.15.0; Python 3.12.10; Microsoft Edge 158.0.4370.33, headless, driven through the DevTools protocol |
| Model actually used | Claude Opus 5.5 for the lead and all five agents, at medium effort for the agents |
| Parallel agents actually used | 5 independent agents (A to E), running at the same time with one lead auditor. Each had its own server port, browser port and throwaway data folder. |
| Six-hour timebox achieved | **No.** The work took about 50 minutes. The longest agent ran 36 minutes. The scope was covered sooner than six hours, and the run was not padded to fill the time. |
| Overall health | **Fair.** The core features work and the data is consistent, but there is one data-loss defect, a spoiler leak, and several phone and tablet layout breaks. |
| Critical | 0 |
| High | 8 |
| Medium | 20 |
| Low | 39 |
| Informational | 15 |

### Overall assessment

**What works:**
- 9 of 19 user journeys pass outright, 2 pass with a minor issue, 8 are partial and none fail.
- All data counts the project claims match the data: 3,199 entries, 1,189 tracker collectibles, 1,008 pins, 36 places and 261 Street Explorer pictures.
- There are no broken references, duplicate IDs or out-of-range coordinates.
- Every user-text template reviewed is escaped, and there are no external requests at runtime.
- The Discord token is never committed, served or packaged.
- 3D loads only on demand.
- Rust format, lint and all 70 tests pass, and data validation reports 0 errors.

**The largest risks:**
1. Saved data larger than 64 KB is silently lost, and the Discovery Journal reaches that size after about 300 records.
2. Map pin names reveal post-launch content even with spoilers hidden.
3. On phones and tablets, map cards and Street Explorer can be covered or pushed off-screen, and 3D can't be reached.
4. The 3D card state is buggy: it opens a card one selection late, cards stack, and closed cards come back.
5. Release packaging ships every picture, while the project's own rights audit clears none for distribution.

### Top five actions

1. **Make saving reliable (F-01, F-09, F-10).**
   - Stop using `keepalive` for normal saves, report failures, and save the journal in smaller pieces or only its changes.
   - Keep a backup when `userdata.json` can't be read, instead of overwriting it.
2. **Fix what the map reveals and claims (F-02, F-14).** Give map markers the spoiler flag of their entries, and stop calling any picture position "Exact".
3. **Fix the phone and tablet breaks (F-03, F-04, F-05, F-06):** wrap the Street Explorer header, add pan padding for map cards, stop the toolbar items shrinking, and make the Light-theme close button visible.
4. **Fix the 3D card state (F-07, F-11, F-12, F-13, F-34):** open the card after the camera has moved, close the previous card, clear the selection on close, and guard the await in `show3d`.
5. **Settle the release and quality process (F-08, F-25, F-26, F-27):**
   - Decide what the public package may contain, given the rights audit.
   - Fix `current_state.py`.
   - Make the Edge suites wait for conditions instead of fixed times, and run checks on Windows CI.

## 2. Scope and audit rules

**In scope:** the scope in the master prompt, which is every page, both maps, Street Explorer, saved data, the tracker, the journal, settings, search, responsive behaviour, accessibility, tests and browsers, data and rights, performance, offline use and security.

**Rules kept:**
- **No changes:** no source, test, data or asset file in the application was edited, and nothing was installed, committed or pushed. Agents compared `git status` before and after and found it unchanged.
- **Separate test copies:** browser runs used separate copies of the app on ports 4656–4661, with data in `%TEMP%\hq-audit-*`. The user's real settings and data were not touched.
- **One report-writing script skipped:** `scripts/audit_media.py` and `scripts/current_state.py` both write report files into the repository, so they were **not run**.
- **No outside services:** nothing was sent to any external service.
- **One write to the repository:** this report file is the only one.

## 3. Environment and evidence

### Project access
| Item | Result |
|---|---|
| Workspace path | `C:\GTA6Wiki` |
| Project files accessible | Yes, all files |
| `MAP-EXPLORER-REPORT.md` available | Yes, `docs/status/MAP-EXPLORER-REPORT.md` |
| Build and test instructions | Header comments in `scripts/ui_features.mjs`, `ui_phase2.mjs` and `ci_pages.mjs`; `.github/workflows/build.yml` |
| Network access | Not used for the audit. The app made no external requests at runtime (Agent A). |
| Offline behaviour checked | Partly. Agent A confirmed by inspection and request logs that there are no external hosts at runtime, the fonts and MapLibre are local, and there is no font server. Running with the network switched off was not tested. |

### Execution details
| Check | Exact command or method | Result | Evidence |
|---|---|---|---|
| Repository inventory | `git status --porcelain`, `git rev-parse`, file listing | 2,180 changed paths at `52fa0e9` | Lead |
| Rust tests | `cargo test` | 70 passed, 0 failed, 1 ignored (it needs a 56 MB download) | D |
| Formatting | `cargo fmt --check` | Clean | D |
| Lint | `cargo clippy --all-targets -- -D warnings` | Clean | D |
| Script syntax | `node --check` on all 13 `ui/*.js` and `scripts/*.mjs` files | All pass | D |
| Data validation | `target\release\gta6-hq.exe --validate` | 0 errors; 983 warnings (982 rights-unconfirmed, 1 unlisted-media, 1 staged-media) | D, E |
| Browser suites | `node scripts/ui_features.mjs 9341 4656 <dir>` and `node scripts/ui_phase2.mjs 9341 4656 <dir>`, two runs each on clean data | Features 39/40, then 40/40. Phase 2 27/28, then 28/28. Both are **flaky** (F-25). | D |
| Manual journeys | Scripts driving headless Edge 158 | 19 journeys plus edge cases (section 4) | B |
| Visual review | Screenshots of 20 routes at 1,920, 1,440, 1,280, 1,024, 768, 390 and 375 px; Light and Dark themes; real Tab and hover input; a contrast scan | 20 findings | C |
| WebKit page test | `scripts/ci_pages.mjs` | **Not run**, because the `playwright` package and WebKit aren't installed and the audit installs nothing | D |

## 4. Feature coverage matrix

| Area | Status | Evidence and notes |
|---|---|---|
| Global navigation and all page routes | Pass | B journey 2: all 17 links. D: covered by `ui_phase2`. |
| Search, autocomplete, recent searches | Partial | B journey 3 passes. At phone width the focused field scrolls the page sideways and its suggestions are hidden behind the map controls (F-15). |
| 2D map rendering and controls | Pass | B journey 5 |
| Pin selection and location cards | Partial | Works in 2D. Cards are covered by the toolbar and top bar on narrow screens (F-04). Saving applies to every branch of an entry (F-17). |
| Pin clustering and hover previews | Pass | B, C |
| Category filters and overlays | Partial | Filters pass. The pin counter ignores hidden categories (F-49). In Light plus a custom accent, some 3D pins turn black (F-18). |
| 2D and 3D selection in step | Partial | Kept on switch, but closed cards reopen (F-12) |
| MapLibre 3D lazy loading | Pass | MapLibre is fetched only on the first switch to 3D, in about 1 s (A, B) |
| 3D camera, zoom, pitch and rotation | Pass | B journey 7. The 3D zoom icons are invisible in Light (F-40). |
| 3D route display and labels | Pass | Numbered stops and labels without a font server (B; `ui_phase2`) |
| Street Explorer viewer | Partial | Works on desktop. It breaks at phone widths (F-03). |
| Jason and Lucia selection and placement | Partial | Badges, dragging and click placement work. An armed walker can't be cancelled (F-38). The swap label is misleading (F-50). |
| Street Explorer keyboard | Pass | B journey 10 |
| Picture position labels | Fail (accuracy) | "Exact" is shown for 30 pictures, including whole regions, while the app says no position is exact (F-14) |
| Street Explorer mini-map and thumbnails | Pass | B |
| Locations and nearby-location links | Pass | B, C |
| Encyclopedia and guides | Partial | Pages pass. On phones the current Field Manual chapter tab overlaps the others (F-19). |
| Collectible tracker (1,189 items) | Pass | Count measured as 1,189: 1,241 collectibles minus 52 overview entries (E, B) |
| Saved locations and favourites | Partial | They persist, but apply per entry, not per pin (F-17) |
| Collections and notes | Partial | Pressing Enter in "New collection" discards the name (F-16) |
| Routes and route persistence | Pass | B journey 14 |
| Saved map views and street spots | Pass | B journey 14 |
| Progress calculations | Pass | B journey 15 |
| Discovery Journal and profiles | Partial | Profiles are kept apart (B journey 16), but journal saves are lost beyond about 64 KB (F-01) |
| Settings and persistence | Pass | Persist across reload (B journey 17) |
| Responsive layouts | Partial | Phone and tablet breaks in F-03 to F-06, F-15 and F-19 |
| Offline operation | Partial | No external hosts at runtime. A real offline run was not tested. |

## 5. Findings

Severity follows the template's definitions. **F-** IDs are the merged findings. The source column gives the agent IDs; their reports hold the full evidence, reproduction steps and screenshots (section 13).

### 5.1 High

**F-01: Saved data larger than 64 KB is silently lost**
- **Severity / confidence / category:** High / High / Data integrity. Source: A-01 and D-01, found separately.
- **Affected:** `ui/app.js:65-72` (`UserStore.set`: `fetch('/api/userdata', {…, keepalive: true}).catch(() => {})`), and the same pattern for settings at `ui/app.js:38-43`. Also `ui/journal.js:34-43`, which resaves the whole journal on every event.
- **Evidence:**
  - The lead confirmed in the code that saves use `keepalive: true` and ignore errors.
  - Agent A measured in Edge 158 that a 10 KB save went through and 60 KB and larger were refused.
  - Agent D gave the journal 600 and then 1,500 events. The server kept 300 while the page showed the full list.
- **Reproduce:** add more than about 300 journal records (each about 196 bytes), restart, and open the Discovery Journal.
- **Expected:** every record is saved, or the reader is told when one is not.
- **Actual:** records beyond the limit exist only until the app closes.
- **Impact:** journal records and notes are silently lost. Any other part that grows past 64 KB would be lost the same way.
- **Fix:** use a normal `fetch` without `keepalive` for saves, keeping `keepalive` only for small writes while closing. Check `response.ok` and tell the reader on failure. Save the journal in smaller pieces, or send only what changed.
- **Effort:** S–M. **Regression risk:** Low.

**F-02: Map pin names reveal post-launch content with spoilers hidden**
- **Severity / confidence / category:** High (the lead raised it from Medium) / Medium / Spoilers. Source: E-06.
- **Affected:** `data/wiki.json` `map.markers`, where none of the 1,008 has a `spoiler` key; `ui/app.js` around 1346–1356 (`mapPins`), hover previews and the sidebar lists.
- **Evidence:** with spoilers hidden, marker names such as the random events "Skunk Ape" and "Grandma Robber" and the mission "All Geared Up" appear in the map lists and previews. A marker that points at a spoiler entry hides its card text, but the name stays.
- **Expected:** with spoilers hidden, a marker for spoiler content shows no name, or a neutral one.
- **Impact:** it breaks the app's spoiler promise and the project rule that post-launch discoveries are marked.
- **Fix:** let a marker inherit the spoiler flag of its target entry and blur or rename it, and add a validator rule for markers without a target.
- **Effort:** S–M. **Regression risk:** Low.

**F-03: The Street Explorer viewer breaks at phone widths**
- High / High / Responsive. Source: C-01.
- **Affected:** `ui/styles.css:897` (`.sv-top`), `ui/design.css` (`.sv-actions`, `.sv-cast`).
- **Evidence:** at 375 px the header is 670 px wide. Focusing a button scrolls the overlay sideways by 295 px, leaving the picture off-screen and a black area (screenshots in `audit/C/w375`).
- **Fix:** let `.sv-top` and `.sv-actions` wrap, give `.sv` `overflow: clip`, and use icon-only actions below 640 px.
- **Effort:** S. **Regression risk:** Low.

**F-04: The map toolbar and top bar cover the location card**
- High / High / Overlap. Source: C-02.
- **Affected:** `ui/app.js:1621` (`bindPopup` has no `autoPanPaddingTopLeft`); `ui/design.css` `.map-tools` in the `max-width: 900px` block.
- **Evidence:**
  - At 375 px the card's picture, label and title sit under the toolbar.
  - At 768 px the card's top sits under the top bar, and its close button can't be clicked because the header search is on top.
- **Fix:** add auto-pan padding for the toolbar and top bar, and limit the popup's height to the space available.
- **Effort:** S. **Regression risk:** Low.

**F-05: At 390 px and below, the 3D button is clipped and toolbar buttons shrink to 22 px**
- High / High / Responsive and touch targets. Source: C-03.
- **Affected:** `ui/design.css`, where `.map-tools` is no-wrap with sideways overflow and `.map-seg` and `.map-tool` are allowed to shrink.
- **Evidence:** `.map-seg` is squeezed to 48 px while its contents need 86 px, so 3D can't be reached on phones.
- **Fix:** add `.map-tools > * { flex: none; }` inside the `max-width: 900px` block.
- **Effort:** S. **Regression risk:** Low.

**F-06: The map card's close button is invisible in the Light theme**
- High / High / Contrast. Source: C-04.
- **Affected:** `ui/design.css` (`.leaflet-popup-close-button`, background `rgba(25,13,39,.8)` with `color: var(--text-primary)`, which is dark in Light).
- **Fix:** give it a fixed light colour, or a theme token for "on dark glass".
- **Effort:** S. **Regression risk:** Low.

**F-07: In 3D with reduced or no motion, choosing a place opens the previous place's card**
- High / High / Functional. Source: B-01.
- **Affected:** `ui/app.js:1890-1893`. The lead confirmed in the code that `three.flyTo(...)` runs, then `three.map.once('moveend', …)` is attached afterwards. A zero-length flight finishes before the handler exists.
- **Evidence:** Agent B logged the move events. It happens with reduced motion and not with motion on. With the app's own "Jump straight there" setting, it is inferred from the code.
- **Fix:** attach the `moveend` handler before `flyTo`, or open the card directly when the flight lasts 0 ms.
- **Effort:** S. **Regression risk:** Low.

**F-08: The public release package ships every picture, but the project's rights audit clears none for distribution**
- High / High / Rights and process. Source: E-01.
- **Affected:** `scripts/package_release.py:32` copies all of `ui`, `data`, `images` and `wallpapers`, which the lead confirmed. `docs/compliance/MEDIA-RIGHTS-AUDIT.md` lines 19–30 say 0 files are cleared for distribution.
- **Note:** this is a conflict between the project's process and its own records. **It is not a finding of infringement.**
- **Fix:** decide a distribution policy, for example packaging only the allow-listed files or keeping pictures out of the public package, and enforce it in `package_release.py`.
- **Effort:** M. **Regression risk:** Medium, because the packaged app would look different.

### 5.2 Medium

| ID | Finding | Confidence | Affected | Evidence and fix | Source |
|---|---|---|---|---|---|
| F-09 | A damaged `userdata.json` is silently replaced and every saved part is lost | High (reproduced) | `src/userdata.rs:46-66` | Unreadable JSON is treated as empty and the next save overwrites the file. Fix: refuse to overwrite, keep `userdata.json.bad` and tell the reader. | A-02 |
| F-10 | Saves are unordered, so an older write may overwrite a newer one | Low (**unverified**) | `ui/app.js:65-72`; `ui/journal.js:84-88` | Parallel requests sent without waiting; the server's lock orders them by arrival. Confirm with a stress test. Fix: send saves one at a time, per part. | A-03 |
| F-11 | 3D cards stack: choosing a place never closes the open card | High | `ui/app.js:1724-1731` | A new popup is added each time and the old one is never removed. Fix: keep one popup and replace its content. | B-02 |
| F-12 | Closing a card doesn't clear the selection | High | `ui/app.js` 1590, 1623, 1729, 1766, 1781 | The closed card reopens on a 2D/3D switch and in immersive mode, and keeps driving "Nearby". Fix: reset `selected` on close. | B-03 |
| F-13 | The 3D card opens below the visible window and can't be scrolled | High | `ui/map3d.js:252-254` | Its action buttons are off-screen. Fix: limit the popup's height, scroll inside it, and anchor it to the side. | B-05 |
| F-14 | "Exact: at its own pin on the map" is shown for 30 pictures, including whole regions | High | `ui/map3d.js:262`; `map.photos[].precision` | It contradicts "Position: approximate" on the same pin, and 5 of the 30 sit 4.5–16 px off their pin. Fix: rename it to "At its pin (approximate)". | B-06, E-03 |
| F-15 | At phone width the focused search field scrolls the page 79 px sideways and hides its suggestions | High | `ui/styles.css:407, 964` | Fix: limit the focused width to the space available and raise the suggestions above the map controls. | B-07 |
| F-16 | Pressing Enter in "New collection" closes the picker and discards the name | High | `ui/explore.js:43-60` | The dialog form's implicit submit button is "Done". Fix: make "Create and add" the submit button. | B-08 |
| F-17 | Favourite, Discovered and Collection apply to every pin of an entry | High | `ui/app.js:1370` (`pinKey`) | Favouriting one Fleeca branch marks every branch. Fix: key branches by pin, or explain it in the interface. | B-04 |
| F-18 | Light theme plus a custom accent makes some 3D pins black | High | `ui/themes.css:59`; `ui/map3d.js:51-55` | MapLibre can't read `color-mix()` (26 console warnings). Fix: work out the colour in JavaScript before handing it to MapLibre. | B-10 |
| F-19 | On phones, the current Field Manual chapter tab overlaps the next tabs | High | `ui/manual.css:431-435` | Fix: let the tab labels wrap or scroll. | C-05 |
| F-20 | Light theme: the primary button's hover is about 1.9:1 contrast | High | `ui/design.css:135`; `ui/themes.css:105` | Fix: a separate Light hover colour. | C-06 |
| F-21 | Danger buttons look like ordinary buttons | High | `ui/design.css` (`.journal-clear button`, `.settings-btns button` outweigh `.btn-danger`) | "Delete all notes" and "Reset progress" lose their warning style. Fix: make the danger style win. | C-07 |
| F-22 | Light theme confirmation dialog: muddy footer, danger button about 2:1 contrast | High | `ui/design.css` (`.confirm-foot`, `.btn-danger`) | Fix: theme tokens for the dialog. | C-08 |
| F-23 | 1,996 pictures are removed in the working tree, but README and CHANGELOG still claim 2,719 entries with a picture | High | README l.146; CHANGELOG l.7, 15 | 764 entries have a picture now. The data is consistent. Fix: update the documents before release. | E-02 |
| F-24 | `current_state.py` merges the split data files under the wrong key | High | `scripts/current_state.py:23-29` | `CURRENT-STATE.md`, marked authoritative, reports 88 entries, 14 spoilers and 47 sources. The real figures are 3,085 category entries, 2,874 spoilers and 1,219 sources. | E-04 |
| F-25 | The Edge suites are flaky: fixed waits race the map's flight | High | `scripts/ui_phase2.mjs:209` (also 232, 283, 339); `scripts/ui_features.mjs:291-297` | Each failed one check on its first run. A card took 1,582–1,931 ms against an 1,800 ms wait. There are 149 fixed waits. Fix: wait for conditions. | D-02 |
| F-26 | The Windows CI job runs no page, server or validator check, and the Edge suites run nowhere in CI | High | `.github/workflows/build.yml:26-36` | Fix: add `--validate` and the Edge suites to the Windows job. | D-03 |
| F-27 | No Rust test calls the HTTP routes | High | `src/server.rs:43-75`, 350–389 | The 3 tests cover helpers only. Fix: router tests for `/api/userdata` and `/api/settings`. | D-05 |
| F-28 | MEDIA-RIGHTS-AUDIT counts third-party site screenshots as "official_illustration" | High | `scripts/audit_media.py:41-47` | It overstates how many pictures are official. Fix: classify by source domain. | E-05 |

### 5.3 Low

| ID | Finding | Affected | Source |
|---|---|---|---|
| F-29 | The 4 MB user-data limit can't be reached, because the server accepts at most 2 MB per request (reproduced: 413) | `src/userdata.rs:19`; `src/server.rs:43-72` | A-04 |
| F-30 | The origin check accepts any local page on any port (reproduced: 204 from `localhost:9999`) | `src/server.rs:87-93` | A-05 |
| F-31 | Leaving the map while 3D loads can leave a MapLibre map and its WebGL context alive (seen once) | `ui/app.js:1739-1757` | A-06 |
| F-32 | The map's Escape listener is added on every map render and removed only on the next key press | `ui/app.js:2077-2081` | A-07 |
| F-33 | About 6 MB of JSON on every start, uncompressed, without an ETag; `/api/manual` is parsed again on every request | `src/server.rs:129-141, 198-205` | A-08 |
| F-34 | Leaving the map or going back to 2D while 3D loads throws an error and leaves 3D-only controls | `ui/app.js:1734-1767` | B-13 |
| F-35 | Statements in the build report don't match the build: "993 pins" (it is 1,008), "Safari doesn't apply", "no sideways scroll on phones" | `docs/status/MAP-EXPLORER-REPORT.md` | B-14, D-10, E-15 |
| F-36 | "Related on the map" and Fleeca pictures point at an arbitrary branch | `ui/app.js:1961-1967` | B-12 |
| F-37 | 3D zoom icons are invisible in the Light theme | `ui/design.css` (MapLibre control `filter: invert(1)`) | B-11 |
| F-38 | An armed walker can't be cancelled: Escape is ignored, and the next map click always opens Street Explorer | `ui/app.js:1834-1880` | B-09 |
| F-39 | Sidebar place names are cut off with no tooltip | `ui/design.css` `.row-name`; `ui/app.js:2123` | B-15 |
| F-40 | At 1,440 px the focused header search covers "Guides" and "More" | `ui/styles.css:407` | B-16 |
| F-41 | The page title never changes (WCAG 2.4.2) | `ui/*.js` | B-17 |
| F-42 | Closing Street Explorer doesn't return focus to the control that opened it | `ui/map3d.js` | B-20 |
| F-43 | 3D zoom and compass sit in a different place from 2D and clash with the toolbar on phones | `ui/design.css` | C-09 |
| F-44 | Text-symbol icons remain: ← → × ❚❚ ▶ + – | `ui/app.js` (1033, 1059, 1123, 1167, 740–793, 714, 811, 867, 2568); `ui/index.html:64, 151`; `ui/styles.css:760-761`; `ui/manual.js:479-481` | C-10 |
| F-45 | Default browser scrollbars inside the redesigned panels | `.map-side`, `.sv-strip`, `.nav-more-menu` | C-11 |
| F-46 | Map search: the icon sits 8 px high and the placeholder is cut off | `ui/design.css` `.field-search` | C-12 |
| F-47 | The map attribution is covered and hard to read | `.leaflet-control-attribution`, legend, walker | C-13 |
| F-48 | Entry pages have two "map" buttons and an empty "Related" heading; search fields are inconsistent; list fonts are larger than field fonts | `ui/explore.js:106`; `ui/app.js:1047, 433, 500`; `ui/design.css` | C-14, C-15, C-16 |
| F-49 | The map counter ignores hidden categories | `ui/app.js:2110-2112` | B-18 |
| F-50 | The walker swap button is labelled with the other character's name | `ui/app.js:1545, 1704` | B-19 |
| F-51 | The Dark theme keeps the navy map backdrop | `ui/styles.css:829, 856` | C-17 |
| F-52 | `cargo fmt --check` and `node --check` aren't run in CI | `.github/workflows/build.yml` | D-04 |
| F-53 | Page checks are weak (40-character text threshold), and CI ignores console errors | `scripts/ci_pages.mjs:17, 54-56`; `ui_phase2.mjs:93-102` | D-06 |
| F-54 | The Edge suites skip the first-launch path | `ui_features.mjs:74-79`; `ui_phase2.mjs:82-87` | D-07 |
| F-55 | Untested anywhere: character detail, location detail, the not-found page, the spoiler toggle, the update interface | Test suites | D-08 |
| F-56 | The suites need their data reset by hand before each run | `ui_features.mjs`, `ui_phase2.mjs` | D-09 |
| F-57 | CI waits fixed times for the server and window to be ready | `.github/workflows/build.yml:59, 69, 83, 136, 144, 152` | D-11 |
| F-58 | Street Explorer gives compass directions between pictures whose positions are only approximate | `ui/map3d.js:346-352` | E-07 |
| F-59 | "Pick and Choose (Ocean Beach)" marker sits in Waning Sands (x 0.6939, y 0.33395) | `data/wiki.json` `map.markers` | E-08 |
| F-60 | Near-duplicate markers in the same category | `map.markers` | E-09 |
| F-61 | 35 video posters have no rights record, and the validator doesn't see them | `wallpapers/posters/*.jpg`; `src/media.rs:88-98` | E-10 |
| F-62 | The validator doesn't check `map.photos`, `map.places`, or a marker's `guide` and `via` fields | `src/validate.rs:781-870` | E-11 |
| F-63 | Tracker types that differ only in capitals hide the guide-total check | collectibles `facts.type` | E-12 |
| F-64 | The editorial policy says to keep watermarks, which contradicts current practice | `docs/Raw/EDITORIAL_POLICY.md:85` | E-13 |
| F-65 | Where the pin positions come from, and on what terms, isn't recorded | `map.attribution`; `sources.launch.json` `gamersky-map` | E-14 |
The Low count is 39 findings in 37 rows: F-48 combines three of Agent C's findings (C-14, C-15, C-16), and F-35 merges one finding reported by three agents.

### 5.4 Informational

| ID | Observation | Source |
|---|---|---|
| I-01 | The journal rewrites itself whole on every event | A-09 |
| I-02 | Coupling between globals: monkey-patched `UserStore`, polling for readiness, three copies of `esc()` | A-10 |
| I-03 | The Saved page assumes well-formed user data (unverified) | A-11 |
| I-04 | The newly added MapLibre build and Archivo font are untracked and have no recorded hash | A-12 |
| I-05 | The update download checks integrity but not authenticity (no signature) | A-13 |
| I-06 | The web view allows top-level `data:`, `blob:` and `about:` navigation | A-14 |
| I-07 | Large empty areas at desktop widths | C-18 |
| I-08 | Duplicate family filter on the Tracker (list and chips) | C-19 |
| I-09 | Field focus (pink) differs from the cyan focus ring | C-20 |
| I-10 | 256 records credit Rockstar as creator, but the file came from a third-party site | E-16 |
| I-11 | 15 `unknown` records with no recorded origin | E-17 |
| I-12 | Three news-agency or team photographs, not game imagery | E-18 |
| I-13 | Sensitive-content check: nothing flagged | E-19 |
| I-14 | Two missions share the name "Pay Abe's Fee" | E-20 |
| I-15 | The "no distances" claim is verified: distance is computed only internally, for sorting and the nearby radius | E-21 |

## 6. UI/UX and visual audit

### Design system (Agent C)
- **What works:**
  - Tokens follow the brief's palette.
  - The Archivo font is local and the type hierarchy is consistent.
  - The button system covers primary, secondary, outline, danger and icon-only buttons.
  - Keyboard focus was visible at every stop tested, and no emoji were found.
- **What doesn't:**
  - The danger button loses to older rules (F-21).
  - In the Light theme, several hover and dialog colours fail contrast (F-20, F-22, F-06, F-37).
  - Text-symbol icons remain in some places (F-44).
  - Inner panels show default browser scrollbars (F-45).
  - Search fields are styled inconsistently (F-48).

### Page by page

| Page | Visual | Interaction | Responsive | Notes |
|---|---|---|---|---|
| Home | Good | Good | Good | |
| 2D map | Good | Fair | Fair | F-04, F-05, F-46 |
| 3D map | Good | Fair | Fair | F-07, F-11 to F-13, F-43 |
| Location card | Good | Poor | Poor | F-04, F-06, F-17 |
| Street Explorer | Good | Good | Poor | F-03 |
| Locations | Good | Good | Good | |
| Characters | Good | Good | Good | |
| Vehicles | Good | Good | Good | |
| Businesses and Activities | Good | Good | Good | |
| Encyclopedia | Good | Good | Good | |
| Guides (contents) | Fair | Good | Good | Kept its own paper look |
| Guides (chapter) | Fair | Good | Poor | F-19 |
| Collectible Tracker | Good | Good | Good | I-08 |
| Saved | Good | Good | Good | |
| Progress | Good | Good | Good | |
| Discovery Journal | Good | Fair | Good | F-01 |
| Settings | Fair | Fair | Good | F-21, I-07 |
| Search results | Good | Good | Good | F-15 on phones |
| Entry page | Good | Fair | Good | F-48 |

## 7. Testing and browser compatibility

| Browser | Version | Pages tested | Result | Limits |
|---|---|---|---|---|
| Microsoft Edge | 158.0.4370.33, headless | All 20 routes, 19 journeys, both suites | Works, with the defects above; the suites are flaky | Headless only; the packaged desktop window (WebView2) wasn't driven |
| Google Chrome | Not installed | — | Not tested | Same engine as Edge, but no claim is made |
| Firefox | Not installed | — | Not tested | |
| Safari | Not available on Windows | — | Not tested | The CI `ci_pages.mjs` WebKit run wasn't checked from here |

| Suite | Passed | Failed | Skipped | Not run | Evidence |
|---|---:|---:|---:|---:|---|
| Rust tests | 70 | 0 | 1 | 0 | `audit/D` |
| Formatting | Clean | 0 | — | — | D |
| Lint (clippy) | Clean | 0 | — | — | D |
| Script syntax | 13 files | 0 | — | — | D |
| Data validation | 0 errors | — | — | — | 983 warnings, D and E |
| `ui_features.mjs` (Edge) | 39 then 40 | 1 then 0 | 0 | — | D, F-25 |
| `ui_phase2.mjs` (Edge) | 27 then 28 | 1 then 0 | 0 | — | D, F-25 |
| `ci_pages.mjs` (WebKit) | — | — | — | Not run | Playwright isn't installed |
| Accessibility | Covered inside `ui_phase2` (names, focus, contrast) and by C's scan | — | — | Screen-reader testing not run | C, D |

## 8. Data integrity and asset rights

### Measured counts (Agents E and B)

| Item | Claimed | Measured |
|---|---|---|
| Encyclopedia entries | 3,199 | 3,199 |
| Tracker collectibles | 1,189 | 1,189 (1,241 minus 52 overview entries) |
| Map pins | 1,008 (the phase 1 text says 993) | 1,008 |
| Places | 36 | 36 |
| Street Explorer pictures | 261 | 261, all loading. By precision: area 81, region 60, district 51, pin 30, town 24, landmark 15. |
| Broken references (related, manual, guide, photo, marker) | — | 0 (2,127 manual references checked) |
| Duplicate slugs and out-of-range coordinates | — | 0 and 0 |
| Media records pointing at missing files | — | 0 |

### Coordinate confidence

Every pin is approximate: they come either from Gamersky's map or from hand placement on Rockstar's poster. The interface says so on cards and previews, but Street Explorer still says "Exact" (F-14). Distances are never shown (I-15). Possible misplacements and duplicates: F-59, F-60.

### Asset rights

| Group | Files | Recorded licence | Status |
|---|---:|---|---|
| `permission_required` | 967 | none | Rights unconfirmed |
| `unknown` | 15 | none | No origin recorded (I-11) |
| Video posters with no record | 35 | — | Not seen by the validator (F-61) |

By source: gtabase.com 368, rockstargames.com 156, gta.wiki 129, exophase.com 55, others below that (see `docs/compliance/RIGHTS-WARNINGS-REPORT.md`).

A rights-unconfirmed warning is **not** proof of infringement. The process issue is F-08: the package ships pictures the project's own records don't clear. F-28 and I-10 cover records that overstate how official a picture is.

## 9. Performance and offline reliability

| Area | Measurement or observation | Assessment |
|---|---|---|
| Initial page load | About 6 MB of JSON per start, uncompressed, no ETag (measured, A) | Acceptable locally; could be cached (F-33) |
| 2D map startup | Not timed | Not measured |
| 3D lazy-load cost | MapLibre is fetched on the first switch to 3D, in about 1 s (A) | Good |
| Pins at high density | 1,008 pins, clustered when zoomed out | Not profiled |
| Search responsiveness | Not timed | Not measured |
| Image loading | Lazy-loaded; caching headers not measured | Not measured |
| Memory and listener cleanup | F-31, F-32, F-34 | Minor leaks |
| Offline operation | No external hosts at runtime; local fonts and MapLibre (A) | Likely fine; a real offline run was not tested |

## 10. Security, privacy and accessibility

- **Rendering:** every user-text template reviewed escapes its input (A), and the script policy is strict.
- **Saved data:** it stays on this computer, in user-data and settings files in the settings folder. The risks are the losses in F-01 and F-09 and the ordering in F-10.
- **Local endpoints:** any page on a local port can write saved data or settings, or start the update (F-30). That needs another program serving a page on this computer.
- **Secrets:** the token under `secrets/` is gitignored, was never committed, isn't served (404) and isn't packaged.
- **External links:** every `target="_blank"` link has `rel="noopener noreferrer"`.
- **Supply chain:** the vendored code and font have no recorded hash (I-04), and updates aren't signed (I-05).
- **Accessibility:**
  - Keyboard focus is visible, and the new pages' controls have accessible names (`ui_phase2`, C).
  - Gaps: the page title never changes (F-41), focus isn't returned after Street Explorer closes (F-42), and some Light-theme contrast fails (F-06, F-20, F-22, F-37).
  - Not tested: a screen reader.

## 11. Remediation roadmap

| Priority | Findings | Work | Impact | Effort |
|---|---|---|---|---|
| Immediate | F-01, F-09, F-10 | Reliable saving: no `keepalive`, report errors, save in pieces, back up an unreadable file | Prevents data loss | S–M |
| Immediate | F-02, F-14 | Spoiler flags on markers; drop "Exact" | Honesty and the spoiler promise | S–M |
| Immediate | F-03 to F-07 | Phone and tablet layout; the Light close button; 3D card timing | Usable on small screens | S |
| Next | F-11 to F-13, F-15 to F-22, F-34 | 3D card state; search on phones; collection Enter key; per-branch saving; Light-theme fixes | Fewer confusing states | S–M |
| Next | F-08, F-23, F-24, F-28 | Distribution policy; documents; the state script; rights classification | Release and records correct | M |
| Next | F-25 to F-27, F-52 to F-57 | Condition-based waits; Windows CI; router tests | Trustworthy tests | M |
| Later | Remaining Low and Informational | Polish, caching, hardening | Quality | S–M each |

## 12. Manual verification checklist

- [x] All primary navigation links work (B, D).
- [x] Search suggestions and recent searches work on desktop (B). **Phone width fails** (F-15).
- [x] The 2D map pans, zooms and resets (B).
- [x] Choosing a pin opens the right place in 2D (B). **3D with reduced motion fails** (F-07).
- [x] Filters and clustering behave (B).
- [x] 3D loads only when asked (A, B).
- [ ] 2D and 3D selection stay in step: closed cards come back (F-12).
- [x] Street Explorer opens the nearest pictures (B).
- [x] Jason and Lucia can be chosen and placed (B).
- [x] Keyboard navigation works in Street Explorer (B).
- [ ] Picture-position confidence is clear: "Exact" is wrong (F-14).
- [x] Saved items persist after reload, while small (B). **Large journals fail** (F-01).
- [x] Collections and notes persist (B). The Enter key discards a new name (F-16).
- [x] Routes and map views persist (B).
- [x] Collectible completion and progress are correct (B).
- [x] Journal entries and profile separation work (B).
- [x] Settings persist and apply (B).
- [ ] No sideways scrolling on phones: it fails in Street Explorer and with search focused (F-03, F-15).
- [ ] Offline behaviour matches the claims: not run with the network off.

## 13. Not audited and limitations

- **Browsers:** Chrome, Firefox and Safari weren't tested (not installed or not available). The WebKit CI job wasn't run or checked.
- **Desktop window:** the packaged app (WebView2) wasn't driven. All browser work used headless Edge.
- **Offline:** the app wasn't run with the network switched off.
- **Accessibility:** no screen reader or GPU profiling.
- **Agent B's gaps:** Tab order and the journal's 1,500-record cap weren't exercised by its driver. F-07 with the app's own "Jump straight there" setting is inferred from the code.
- **Report scripts:** `scripts/audit_media.py` and `scripts/current_state.py` weren't run, because they write into the repository.
- **Unverified:** F-10, I-03.
- **Six hours:** not used. The audit finished its scope in about 50 minutes.
- **Evidence location:** the agents' full reports, scripts and screenshots are outside the project, in `C:\Users\Mbkmo\AppData\Local\Temp\claude\7d69d3407dde4f13\2f316cc0-c2a6-4e1f-934c-f419dcdfa23d\scratchpad\audit\`:
  - `A-architecture-security-performance.md`
  - `B-functional.md` and `B\`
  - `C-ui-ux.md` and `C\`
  - `D-testing.md` and `D\`
  - `E-data-rights.md` and `E\`

  This is a temporary folder that may be cleared. Copy it if the evidence must be kept.

## 14. Final verdict

**Overall health:** Fair. The features are broad, the data is consistent, and security is careful, but there are a few serious defects.

**Release readiness:** **Not ready.** F-01 (silent data loss) and F-02 (spoiler leak) should be fixed before release, and F-08 (what the package distributes) needs a decision. The phone and tablet breaks (F-03 to F-06) should be fixed before the redesign ships.

**Most important confirmed risks:** F-01, F-02, F-03 to F-07, F-08.

**Recommended next step:** fix the Immediate items, then run the two Edge suites with condition-based waits and repeat the phone checks at 375, 390 and 768 px.

## 15. Fixes made after the audit

Made on 2026-11-21 at the owner's request. Nothing is committed.

| ID | What changed | Files |
|---|---|---|
| F-01 | Saves no longer use `keepalive`, so there is no 64 KB limit; the request size limit of 2 MB applies. A failed save is kept, tried again with the next change, and a notice tells the reader. A last small save goes out with `keepalive` when the window closes. | `ui/app.js` (`makeSaver`, `saveTrouble`), `ui/design.css` (`.save-note`) |
| F-10 | Saves go one request at a time. Changes made while one is on its way wait and go together in the next, with the newest value of each part. | `ui/app.js` (`makeSaver`) |
| F-09 | A saved-data file that can't be read is renamed `userdata.damaged-<seconds>.json` and never overwritten. The page tells the reader where it is. If it can't be moved, saving is refused instead of replacing it. New Rust test. | `src/userdata.rs` (`read`), `src/server.rs` (`x-userdata-set-aside` header) |
| F-02 | Markers can carry `spoiler: true`, and the 22 mission, random-event and task markers without an entry now do. A marker whose entry is a spoiler, or which is a spoiler itself, shows as "Spoiler" with no summary or picture while spoilers are hidden; 121 pins are affected. Its favourite key still uses the real name. The validator checks the flag. | `data/wiki.json`, `ui/app.js` (`mapPins`, `pinKey`), `src/validate.rs` |
| F-14 | "Exact: at its own pin on the map" now reads "At its entry's pin (the pin is approximate)". | `ui/map3d.js` |
| F-03 | Below 640 px the Street Explorer header wraps, its action buttons show icons only (with labels for screen readers), the note is hidden, and the mini-map moves below the header. The overlay uses `overflow: clip`. | `ui/map3d.js`, `ui/design.css` |
| F-04 | Map cards pan clear of the toolbar, the Places button and the top bar, which are measured on open and on resize. A card is never taller than the space left, and scrolls inside. On narrow screens the legend hides while a card is open. | `ui/app.js` (`fitCards`), `ui/design.css` |
| F-05 | Below 900 px toolbar pieces don't shrink, and the row scrolls sideways. | `ui/design.css` |
| F-06 | The card's close button is always white on its dark glass. | `ui/design.css` |
| F-07 | When the 3D camera jumps at once (reduced or no motion), the card opens straight away. Each flight is numbered, so a cut-short flight never opens an earlier place's card; this applies to 2D as well. | `ui/app.js` (`flyTo`) |

**Tests changed:** the 3D tests used "Lombank", whose entry is a spoiler and whose pins are now nameless with spoilers hidden. They now use "Fleeca Bank (Downtown)" and "Ascot Paragon" (`scripts/ui_features.mjs`, `scripts/ui_phase2.mjs`).

**How it was checked (headless Edge 158 only):**
- Rust: `cargo fmt --check` and `cargo clippy --release -- -D warnings` are clean. `cargo test --release`: 71 passed, 1 ignored. `--validate`: 0 errors, 983 warnings, the same as before.
- `ui_features.mjs` 40/40 and `ui_phase2.mjs` 28/28, each with fresh data. `node --check` passes on the changed scripts.
- A separate scripted check confirmed:
  - a 172,781-byte journal of 1,400 records is saved in full;
  - 40 quick saves end with the newest value;
  - no spoiler names appear in the pin data or the lists;
  - with motion off, the 3D card follows each choice;
  - at 375 and 390 px, 2D/3D stays 86 px wide and on screen;
  - at 375, 390 and 768 px the card opens below the toolbar, its close button can be clicked, and the page doesn't scroll sideways;
  - at 375 px the Street Explorer header fits and focusing its buttons doesn't slide the view;
  - in Light, the close button is white;
  - with a damaged `userdata.json`, the page shows the notice naming the kept copy, and the copy is on disk.
- Screenshots at 375 px of the card and of Street Explorer were looked at.
- **Not checked:** Chrome, Firefox and Safari; the WebKit CI job; `ci_pages.mjs`, which needs Playwright and isn't installed here; the desktop window itself.

## 16. Medium findings fixed

Made on 2026-11-21 at the owner's request. Nothing is committed.

| ID | What changed | Files |
|---|---|---|
| F-11 | One 3D card at a time: choosing another place replaces the open card. | `ui/app.js` (`openCard3d`) |
| F-12 | Closing a card, in 2D or 3D, clears the selection. A closed card no longer reopens on a 2D/3D switch or in immersive mode, and the list row loses its highlight. Switching views still carries an open card across. | `ui/app.js` (`popupclose`, `openCard3d`, `show2d`, `show3d`) |
| F-13 | 3D cards are at most `min(62vh, 560px)` tall and scroll inside. After opening, and again once the guide links load, the map pans so the whole card is inside the map, below the toolbar. | `ui/app.js` (`keepCard3dInView`), `ui/design.css` |
| F-15 | On phones the focused header search is at most `100vw - 230px` wide, and the suggestions hang from the top bar across the screen. While anything in the top bar has focus, the bar sits above the map's panels. | `ui/design.css` |
| F-16 | Enter in "New collection" creates the collection and keeps the dialog open; an empty name does nothing. | `ui/explore.js` |
| F-17 | Kept one favourite, discovered mark and collection item per entry; changing the keys would orphan everyone's saved favourites. A card for an entry with several places now says so, for example "…apply to the Fleeca Bank entry, which has 6 places on the map." | `ui/app.js` (`pinCard`, `cardFor`), `ui/design.css` |
| F-18 | 3D pin colours are painted on a one-pixel canvas and passed to MapLibre as plain `rgb()`, so `color-mix()` accents work. | `ui/map3d.js` (`solid`) |
| F-19 | On narrow screens Field Manual tabs don't shrink, and the row scrolls from its start. | `ui/manual.css` |
| F-20 | In Light, the primary-button hover darkens the accent instead of lightening it: 9.3:1 with the default accent and 8.7:1 with Ocean blue. | `ui/design.css` |
| F-21 | The danger style now wins inside the journal and settings button rows. | `ui/design.css` |
| F-22 | The confirmation dialog's danger button is filled with `--danger` (7.2:1 in Light). The Light footer uses `--surface-2`, with a lighter shadow and backdrop. | `ui/design.css` |

| F-23 | README and CHANGELOG picture counts were recounted with the app's own merge: 2,717 of 3,085 entries at 0.2.34 (it said 2,719 of 3,087) and 2,696 at 0.2.33 (it said 2,698). The working tree now has 730 of 3,085, or 764 of 3,199 counting news, editions and FAQ, after the uncommitted picture removals. That belongs in the next release's notes. | `README.md`, `CHANGELOG.md` |
| F-24 | `current_state.py` takes a split file's key from its name up to the first dot, as `src/content.rs` does. It now reports 3,085 entries, 2,874 spoilers, 1,219 sources and 1,008 markers, matching `--validate`. The status documents were regenerated. Its hand-kept "Known blockers" table is still out of date. | `scripts/current_state.py`, `docs/status/*.md` |
| F-28 | `audit_media.py` decides "official" by the source's web address: only Rockstar's own site and accounts count. Before → after: 907 → 133 official, 744 third-party screenshots, 81 owner-supplied, 23 evidence frames, 1 with no recorded source. It had the same split-file bug as F-24, so "files not used anywhere" falls from 392 to 64. It no longer rewrites reports when imported. It still exits 1 because 36 files on disk have no record in `data/media.json`, which was already the case. | `scripts/audit_media.py`, `docs/compliance/*` |
| F-27 | Five router tests for `/api/settings` and `/api/userdata`: merging, refusals, 403 for other sites and non-loopback hosts, and the damaged-file header. They use temporary files only. | `src/server.rs` |
| F-26 | The Windows CI job now builds, runs `--validate`, checks the server answers, and runs both Edge suites in headless Edge, uploading the screenshots. No YAML parser is installed here, so neither the file nor the job has been run. | `.github/workflows/build.yml` |
| F-25 | Both Edge suites wait for conditions (`waitFor`, `openPin`, `READY_3D`) instead of fixed sleeps after card, flight, 3D and Street Explorer steps. This found a real race: Leaflet's old card fades for about 200 ms, so tests could click the old card. It also found an app bug: a map flight started by `?route=`, `?focus=` or a category link 300 ms after opening could run after the page was left and throw. That flight is now skipped when the map is gone. | `scripts/ui_features.mjs`, `scripts/ui_phase2.mjs`, `ui/app.js` |

**How it was checked (headless Edge 158, scripted, with fresh data):** every interface row above passed a browser check.
- 1 card after two choices in 3D.
- The 3D card fits inside the map at 1440×900.
- A closed card stays closed in 2D, 3D and immersive mode.
- The shared-favourite note shows on a Fleeca card.
- No colour warnings with Light and a custom accent; pins are `rgb()`.
- Contrast is measured as above.
- Enter creates "Banks to rob".
- At 375 px, suggestions span 12–363 px on top of the map with no sideways scroll, and Field Manual tabs don't overlap.

Screenshots of the 3D card, the Light dialog and the phone search were looked at. The section 15 checks were rerun and still pass.

After all the fixes: `cargo test --release` 76 passed and 1 ignored, with fmt and clippy clean. `--validate` shows 0 errors and 983 warnings. `ui_features.mjs` passed 40/40 twice and `ui_phase2.mjs` passed 28/28 twice. Not run: CI itself, Chrome, Firefox, Safari, and `ci_pages.mjs`, which needs Playwright.

## 17. Low findings fixed

Made on 2026-11-21 at the owner's request. Nothing is committed.

### Interface

| ID | What changed | Files |
|---|---|---|
| F-31, F-34 | The 3D map is built once even when 3D is pressed again. If the reader leaves the map during the build, the new 3D map and its WebGL context are released. If they go back to 2D, it is kept for later but its controls, such as tilt, stay hidden. No error is thrown either way. | `ui/app.js` (`show3d`, `finish3d`) |
| F-32 | Listeners a page adds to the whole document are removed when the page changes. This covers immersive mode's Escape and the walker's Escape. | `ui/app.js` (`onLeave`, `leaving`) |
| F-36 | "Related on the map" links an entry with several places to its branch nearest the open pin. Pictures of a multi-branch entry still sit at one branch; their positions come from the data. | `ui/app.js` (`relatedOf`) |
| F-37 | In Light, MapLibre's zoom and compass icons are no longer inverted. | `ui/design.css` |
| F-38 | A waiting walker can be cancelled with Escape or by pressing it again. The hint says so. | `ui/app.js` |
| F-39 | Sidebar rows show the full name and kind as a tooltip. | `ui/app.js` |
| F-40 | On screens 1,181 to 1,760 px wide, the nav drops its icons (labels stay) while the header search is open. Measured at 1,200, 1,281, 1,366, 1,440, 1,600 and 1,760 px, the open search now covers no nav item. | `ui/design.css` |
| F-41 | The window title follows the page's main heading, for example "Fleeca bank \| GTA 6 HQ"; Home stays "GTA 6 HQ". | `ui/app.js` (`nameWindow`) |
| F-42 | When whatever opened Street Explorer is gone, or was the page itself, closing it puts focus on the walker. | `ui/map3d.js`, `ui/app.js` |
| F-43 | The 3D zoom and compass sit at the top left like the 2D ones, clear of the toolbar, and below it on phones. | `ui/map3d.js`, `ui/design.css` |
| F-44 | The ← → × ❚❚ ▶ characters in links and buttons are now icons (new `next`, `pause` and `play`). The FAQ +/– is drawn. The cover, update notice, announcement and lightbox close buttons and the Field Manual page turns use icons too. Leaflet's own zoom and close buttons are unchanged. | `ui/icons.js`, `ui/app.js`, `ui/manual.js`, `ui/index.html`, `ui/design.css` |
| F-45 | Thin scrollbars in the accent colour inside the sidebar, the picture strip, menus, suggestions, cards and the Field Manual tabs. | `ui/design.css` |
| F-46 | The map search icon is centred, and the placeholder is now "Search the map", so it fits. Room for the clear button is kept only while it shows. | `ui/app.js`, `ui/design.css` |
| F-47 | The attribution sits on the theme's panel colour, so it reads in every theme. On phones it takes the full width and the legend and walker sit above it. | `ui/design.css` |
| F-48 | An entry page has one map button, and a "Related" section only when something unhidden is in it. Every search field has the icon, and the list placeholders are lower case ("Filter activities"). Lists in control rows use the same type size as fields. | `ui/explore.js`, `ui/app.js`, `ui/design.css` |
| F-49 | The pin count leaves out categories that are switched off and says how many are hidden, for example "573 pins of 1008 (1 category hidden)". It updates when one is switched. | `ui/app.js` (`drawCount`) |
| F-50 | The walker button names who walks now, with "Walking as Jason. Switch to Lucia" as its name and tooltip. | `ui/app.js` |
| F-51 | The Dark theme's 2D and 3D map backdrop is a neutral #18181c. In Light, the area around the 3D map is still MapLibre's own navy, which CSS doesn't reach. | `ui/design.css` |
| F-58 | Street Explorer now says "roughly north-east of this one (both places are approximate)" and "placed at the same spot". | `ui/map3d.js` |

### Server, data, scripts, CI and documents

| ID | What changed | Files |
|---|---|---|
| F-29 | `/api/userdata` alone accepts requests up to the 4 MB data limit plus 64 KiB; other routes keep 2 MB. A router test covers 3 MB (204), just over 4 MB (400) and over the request limit (413). | `src/userdata.rs`, `src/server.rs` |
| F-30 | The origin check now also needs the app's own port. A page on another local port gets 403; tests cover settings, saved data and updates. | `src/server.rs`, `src/main.rs` |
| F-33 | `/api/wiki` (3,210,578 bytes) and `/api/manual` (1,231,013 bytes) send an ETag and answer 304 to `If-None-Match`. The manual is encoded once and kept until its file changes. No compression: no crate or feature was added. | `src/content.rs`, `src/server.rs` |
| F-35 | The build report's pin count (1,008), browser coverage and phone-scrolling statements are corrected to what was measured. | `docs/status/MAP-EXPLORER-REPORT.md` |
| F-52 | CI runs `cargo fmt --check` and `node --check` on every `ui/*.js` and `scripts/*.mjs`. | `.github/workflows/build.yml` |
| F-53 | Page checks need each page's exact heading and an element only that page draws, and they fail on console errors. `ci_pages.mjs` also visits a character page, a location page and the not-found page. | `scripts/ci_pages.mjs`, `scripts/ui_phase2.mjs` |
| F-54 | A first-launch check: the spoiler notice, what Continue saves, and that the notice doesn't come back. | `scripts/ui_features.mjs` |
| F-55 | New checks for the character page, the location page, the not-found page, the spoiler blur and switch, and the update notice. The update check feeds the page made-up update answers and never asks GitHub. | `scripts/ui_features.mjs` |
| F-56 | Each suite resets the saved data and settings of the app it is pointed at, through the app's own API. **Never point the suites at your real app: they erase its saved data.** | `scripts/suite_data.mjs`, both suites, CI |
| F-57 | CI polls for the server, Edge and the windows, each with a timeout. One fixed 12-second wait stays, for the intro, whose end nothing outside the app can see. | `.github/workflows/build.yml` |
| F-59 | **Not changed.** "Pick and Choose (Ocean Beach)" has only Gamersky as its source, and no recorded source gives another position. It needs a source. | — |
| F-60 | **Not merged.** No two markers share a position. The three near pairs could each be real separate places: two Berry Dream rooftop bars; Banana Cove and its main bar; Meteorite and Meteorite Shard, which are different collectible kinds. | — |
| F-61 | The validator now reports the 35 video posters that have no rights record, naming each one's video and that video's rights status. That is why warnings rose from 983 to 1,018. No records were invented. | `src/media.rs`, `src/validate.rs` |
| F-62 | The validator checks map photos (position, file, `ref`, `precision`), places, map sources, and each marker's `via` and `guide`. The `guide` must name a real Field Manual page. The current data passes. | `src/validate.rs` |
| F-63 | 31 collectible types now use one spelling ("WAiNK Landmark", "Curiosity", "Sculpture"). A validator warning catches future case splits, and the tracker compares types ignoring capitals. | `data/wiki/collectibles.*.json`, `src/validate.rs`, `ui/explore.js` |
| F-64 | The editorial policy now says never to use a picture with a site's logo or watermark, and to replace those already in the app. | `docs/Raw/EDITORIAL_POLICY.md` |
| F-65 | The `gamersky-map` source now records what it is used for, how many pins come from it, and "terms: not established". | `data/wiki/sources.launch.json` |

**How it was checked (headless Edge 158, scripted, with fresh data):** all of the interface rows passed, with no script errors. Screenshots of the 3D map in Light and of the map at 375 px were looked at. The checks for sections 15 and 16 were rerun.

After all three rounds:
- `cargo fmt --check` and clippy are clean. `cargo test --release`: 84 passed, 1 ignored.
- `--validate`: 0 errors, 1,018 warnings.
- `ui_features.mjs` 46/46 and `ui_phase2.mjs` 28/28, each run twice with the suites resetting their own data.
- The section 15, 16 and 17 checks all pass. Only one fails, a 768 px check that expected phone-sized 36 px toolbar buttons where tablets use 32 px.
- Not run: CI itself, `ci_pages.mjs` and WebKit (Playwright isn't installed), Chrome, Firefox, Safari, and the desktop window itself.
- **Still open:** F-08 (what the public package may contain), and F-59 and F-60, which need sources.
