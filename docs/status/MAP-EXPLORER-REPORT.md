# Interactive map and explorer: build report

Date: 2026-11-21. Nothing here is committed. Everything since release 0.2.34 is in the working copy.

The visual redesign is described first, then phase 2, then phase 1. Later work fixed some limitations the earlier sections list.

> **Out of date since 0.2.46 (2026-11-26):** Street Explorer, the walker figures and the Street view button were removed. Their in-game pictures now appear as banners on map cards. The map panel and pin card were also redesigned. See `CHANGELOG.md`. The rest of this report is kept as a record of that build.

## Visual redesign: GTA VI-inspired design system

This is a visual redesign only. No page, data, map engine or saved data was removed.

### What was redesigned

| Component | What changed |
|---|---|
| Design tokens | **New file `ui/design.css`**, loaded after the older stylesheets. It holds the brief's palette: <ul><li>deep purple `#190D27`</li><li>plum `#271238`</li><li>charcoal `#17151C`</li><li>pink `#F17AB5`</li><li>magenta `#D94C9B`</li><li>sunset `#FFB16E`</li><li>cyan `#63DCEB`</li></ul>It also adds themable surface and accent tokens, which Light and Dark replace in `themes.css`. |
| Typography | **Archivo**, under the SIL Open Font Licence, is now bundled in `ui/fonts/`, so it works offline. It is one variable file: headings are condensed, heavy and uppercase; body text is the normal width; labels are small uppercase with wide spacing. |
| Icons | **New file `ui/icons.js`** holds one line-icon set. It replaces the ★ ☆ ✓ + ↑ ↓ × text symbols on cards, entry pages, routes, the collection picker and the journal. |
| Buttons | One system with primary (pink), secondary (plum), outline, danger and icon-only buttons, in two sizes. Each has hover, pressed, focus (a cyan ring), disabled, loading (`aria-busy`) and active states. The older button classes take the same look. |
| Form controls | Every search field, text field, list, text area, checkbox, radio button and slider has its own styling instead of the browser default: pink focus, pink checks and a pink arrow on lists. Search fields have an icon, and the map's search has a clear button. |
| Announcement strip | A peach-to-pink gradient reading "GTA VI • Leonida • Vice City • Out now". The release state comes from the data, and it can be closed. |
| Header | Deep purple, with the logo and a divider. The navigation now reads Home, Map, Locations, Characters, Vehicles, Collectibles (the tracker), Guides (the manual) and More. "More" is grouped (Explore, Yours, News) with icons. On the right are search, spoilers, a new profile and settings button showing the profile's portrait, and Discord. The current page has a pink underline. Labels are shown from 1,360 px; between that and the phone menu the bar shows icons only. |
| Page heads | Larger condensed headings over a pink rule. The picture collage is unchanged. |
| Map | <ul><li>A deep-purple sidebar.</li><li>A search field with an icon and a clear button.</li><li>Location rows show their kind, and the open pin's row has a pink marker.</li><li>Every map control is in one floating toolbar: 2D/3D in pink, Street view in cyan when on, and icon buttons with tooltips.</li><li>The zoom buttons and the 3D compass are restyled to match.</li><li>Labels, clusters, route stops and the legend follow the new type and colours.</li></ul> |
| Location cards | A sunset line along the top edge, a larger title, and "Open the entry" as the one primary button. Favourite, Discovered, Collection, Route and Street Explorer are icon buttons. Related and nearby places are compact chips, and the position note sits in the footer. |
| Street Explorer | <ul><li>Jason and Lucia are portrait badges; the one walking has a pink ring.</li><li>The previous and next controls are chevrons.</li><li>"Back to map" is a labelled primary button.</li><li>The header is dark, with the location title.</li></ul>Keyboard use is unchanged. |
| Discovery Journal | It uses the same hero as the other pages, with the description "Your personal record of exploring Leonida". The notes panel has a pink "Add note" button. The timeline shows each record's time, a thumbnail (its entry's or the Street Explorer picture) or an icon, a type label and the place. |
| Collectible Tracker | Each family is a chip showing its ticked count. Each row has a thumbnail. Found items have a pink bar, a pink check and struck-through names. |
| Dialogs | The browser's `confirm()` boxes are replaced by the app's own confirmation dialog, used for deleting a collection, resetting progress, clearing history and deleting notes. |
| Phones and tablets | Below 901 px the map sidebar becomes a drawer, opened with a "Places" button. The toolbar becomes one row that scrolls sideways. Tooltips are hidden on touch screens and never widen the page. Buttons are 38–40 px tall on phones. |

### Files

- **New:** `ui/design.css`, `ui/icons.js`, `ui/fonts/Archivo-Variable.ttf` and `ui/fonts/Archivo-OFL.txt`.
- **Changed:**
  - `ui/index.html`: the navigation, the profile button, and the new stylesheet, script and font preload
  - `ui/app.js`: map markup, cards, the confirmation dialog, the announcement
  - `ui/explore.js`: entry actions, tracker, the "More" highlighting, the picker
  - `ui/journal.js`: timeline, profile button
  - `ui/map3d.js`: Street Explorer badges and controls
  - `ui/themes.css`: themable surfaces
  - `scripts/ui_features.mjs` and `scripts/ui_phase2.mjs`: updated for the badges, the in-app confirmation dialog, the new "More" contents, focus rings and the toolbar

### Dependencies

No code dependencies were added. The only new asset is the Archivo font, under the SIL Open Font Licence (its licence file ships beside it), taken from Google's `google/fonts` repository.

### Test results (after the redesign)

- **Edge, existing test:** `ui_features.mjs` passed all 40 checks.
- **Edge, phase 2 test:** `ui_phase2.mjs` passed all 28 checks.
- **Rust:** all 70 tests pass.
- **Checks:** fmt and clippy are clean, `node --check` passes, and `--validate` reports 0 errors.
- **Screenshots** were checked at 1,920, 1,440, 1,024, 768 and 390 px wide, and none of those pages scrolled sideways. The later audit found phone-width problems these screenshots missed: the focused header search scrolled the page 79 px sideways (audit F-15), and the Street Explorer header, map cards and toolbar broke at phone widths (F-03 to F-05). Those were fixed and checked at 375, 390 and 768 px (audit sections 15 and 16).

### Remaining visual inconsistencies

- The Field Manual keeps its own paper look, and its typography is not part of the redesign.
- The map sidebar's search filters the lists as you type; it has no separate dropdown of suggestions. The global search in the top bar does.
- The 2D map has no compass, because the poster never rotates. 3D has one.
- The home page's sections below the hero were only restyled through shared tokens; they weren't reworked one by one.
- The Light theme uses the new surfaces, but it wasn't screenshot-checked page by page after the redesign. The automated contrast checks still pass.

## Phase 2: refinement, profiles, journal, map intelligence

### Status of each part

| Part | Status | Notes |
|---|---|---|
| New pages in the routine page tests | Done | `scripts/ci_pages.mjs` (the WebKit test CI runs) now visits Street Explorer, Locations, Vehicles, Businesses, Activities, the Tracker, Saved, the Journal, Progress, Settings (it applies each theme), immersive mode and Intel. It hasn't been run here, because WebKit isn't installed on this PC. |
| Every navigation path tested | Done | The new `scripts/ui_phase2.mjs` opens 20 primary pages and clicks all 17 top-bar and "More" links, checking that each opens its page and is marked as current. |
| Theme settings | Done | Themes: Vice City (the original), Dark and Light. Accents: six presets or any colour you pick. Density: comfortable or compact. Animation: full, gentle or off. Reduced motion is still a separate switch, and the system's own reduced-motion setting always wins. Map panels can be 0–60% see-through. Everything is saved in the local settings file. Every page follows the theme. The top bar keeps its sunset colours in every theme. |
| Field Manual and the theme | Partly done | The manual keeps its own day/night reading switch and paper look. The accent colour still applies to it. |
| 3D route presentation | Done | Routes have a dark casing under a wider dashed line that grows with zoom, plus numbered stop markers with names on hover. |
| Offline route and place labels | Done | Labels are small page elements pinned to the 3D map (MapLibre markers), drawn in the app's own fonts. MapLibre's own text needs glyph files built with a separate tool; producing them would have meant installing software, so I didn't. There is no font server and no network need. |
| Immersive mode | Done | The map fills the window and the bars are hidden. A floating control bar sits at the bottom, and a floating panel holds a filter and a "Nearby" list that follows the open pin or the centre of the view. Switching between 2D and 3D keeps your place. Esc leaves, and so does the address `#/map?immersive=1` when you navigate away. |
| Jason and Lucia profiles | Done | Choices are Shared, Jason or Lucia, from Settings or the profile bar on Saved, Tracker, Progress and Journal. Each profile keeps its own favourites, collections, routes, map views, street spots, discovered places, collectible and guide ticks, and journal. The Street Explorer figure follows the profile, and you can still swap it. Everything saved before stays under Shared. No story or access rules were invented. |
| Discovery Journal | Done | A new page, `#/journal`, in "More". It records entries and map cards viewed, things saved, places marked discovered, collectibles ticked, Street Explorer pictures shown, districts explored and your own notes, each with a date. It can be searched, filtered by type and sorted newest or oldest first. "Clear history" keeps your notes, favourites, collections, routes, views and progress. "Delete all notes" is a separate button. Repeat views within 30 minutes count once, and the journal keeps the last 1,500 records plus every note. |
| Nearby places and proximity filter | Done | "Only places near the open pin" narrows both the lists and the map. "Nearby" can be set to Close, Medium or Wide. |
| Category density overlay | Done | In 2D it is a grid of shaded cells; in 3D it is a heatmap. Both count only the pins shown after filters. |
| Links between related places | Done | Dashed lines run from the open pin to the pins of the entries it names as related, in 2D and 3D. Cards also list them under "Related on the map". |
| Better clustering and previews | Done | A cluster's ring shows the share of each kind of place, and hovering it gives a count by kind. Pin previews show the kind, whether you have favourited or discovered the place, and how its position was found. |
| Optional overlays | Done | Density, place names, related lines and position source can each be turned on or off and are remembered. Each has a legend. |
| Approximate versus verified positions | Done | Every card and preview says where its position came from: "approximate, from Gamersky's map" or "approximate, placed by hand on Rockstar's map". |
| Distances | Needs outside data | No pin is a surveyed in-game coordinate, so the app still shows no distances. |
| 3D improvements | Done | Pins are larger, outlined dots. The open pin has a name label and a highlighted column. There is a button to switch between looking straight down and tilted, plus the existing zoom and compass control. Density, place names and related lines are drawn in 3D too. |
| 3D at phone width | Partly done | It works at phone width, but the automated phone checks cover the 2D and immersive map, not the 3D view. |
| Browser compatibility | Partly done | It is fully tested in Microsoft Edge, headless, with real mouse and keyboard input. Chrome isn't installed here; it uses the same engine as Edge. Firefox isn't installed, Safari doesn't run on Windows, and you chose not to install test browsers. |
| Accessibility | Done | The tests check that: <ul><li>every control on the map, Journal, Settings, Saved, Tracker and Progress pages has an accessible name</li><li>keyboard focus is visible on the map tools</li><li>text, muted text and accent pass WCAG contrast in all three themes and with every accent (the light theme darkens accents to pass)</li><li>reduced motion is respected</li><li>there is no sideways scrolling at phone width</li></ul> |
| Rights audit | Done | See `docs/compliance/RIGHTS-WARNINGS-REPORT.md`, the matching `rights-warnings.csv`, and `scripts/rights_report.py`, which rebuilds them. Nothing was deleted or relicensed. |

### Rights audit in short

- **Files:** 982 files are flagged. The report matches the validator file for file. The validator's 983rd warning is a separate check: `images/social-preview.png` has no record.
- **Status:** 967 are `permission_required` and 15 are `unknown`. None has a recorded licence.
- **Largest sources:**
  - gtabase.com: 368
  - rockstargames.com: 156
  - gta.wiki: 129
  - exophase.com: 55
  - supplied by the owner, without a URL: 45
- **Recommended actions:**

  | Action | Files |
  |---|---|
  | Third-party screenshot: ask the site or replace it | 479 |
  | Rockstar picture taken via a third-party site: get it from Rockstar's own pages | 207 |
  | Official Rockstar asset: confirm the press-kit terms | 133 |
  | Exophase trophy art | 55 |
  | Owner-supplied official art: find the source | 38 |
  | Made from another file: rights follow the parent | 36 |
  | Frame from an official video | 23 |
  | No source recorded | 6 |
  | News-agency or team photograph: licence it or remove it | 3 |
  | Trademark | 2 |

- **One record contradicts itself:** `images/vehicles/speedboat.jpg` says it is from Rockstar's screenshots page, but also that it was made from `images/pier-showdown.jpg`, whose rights are unknown. The record should be corrected.

### Files (phase 2)

New files:

- `ui/appearance.js`
- `ui/themes.css`
- `ui/journal.js`
- `scripts/ui_phase2.mjs`
- `scripts/rights_report.py`
- `docs/compliance/RIGHTS-WARNINGS-REPORT.md`
- `docs/compliance/rights-warnings.csv`

Changed files:

- `ui/app.js`: saved data per profile, motion speed, map overlays, related places, the nearby filter, immersive mode, cluster rings, previews
- `ui/explore.js`: Settings, profile bars, the Progress comparison
- `ui/map3d.js`: labels, density, related lines, route casing, tilt, Street Explorer picture events
- `ui/index.html`: stylesheet, scripts, the Journal link
- `ui/styles.css`
- `src/userdata.rs`: limits raised to 64 parts and 4 MB, for the per-profile parts (until audit fix F-29 the server took at most 2 MB in one request, so 4 MB could only be reached over several saves)
- `scripts/ui_features.mjs`: now prints the details of any script error
- `scripts/ci_pages.mjs`

### Dependencies and data

No new dependencies.

- **User data:** a new `journal` part. Jason's and Lucia's parts are saved as `jason-…` and `lucia-…`.
- **Settings:** new entries `theme-app`, `accent`, `density`, `motion-level`, `panel-see`, `profile` and `map-overlays`.
- **Game data:** unchanged in phase 2.

### Performance

- Overlays draw only when they are on. Related lines are the one overlay on by default.
- Density is recomputed only when filters change.
- 3D labels are created only for the overlays you turn on.
- The journal is capped at 1,500 records plus notes.
- 3D still loads only when opened.
- Nothing was measured with a profiler. The 40 existing map checks run as before.

### Test results (phase 2 run)

- **Edge, existing feature test:** `scripts/ui_features.mjs` passed all 40 checks.
- **Edge, new test:** `scripts/ui_phase2.mjs` passed all 28 checks, including no script or console errors and no failed requests.
- **Rust:** all 70 tests pass, and fmt and clippy are clean.
- **Syntax:** `node --check` passes on every script.
- **Data validation:** `--validate` reports 0 errors and 983 warnings, the same rights notes as before.
- **Media audit:** unchanged.

### Remaining limitations

- No distances, no road-following routes and no 360° imagery. These need data that doesn't exist.
- Only Edge has been tested.
- The Field Manual keeps its own reading theme.
- A journal "district" is the nearest named place on the map within 12% of its width. It is a guide, not the game's own district boundary.
- Copying data from Shared into a character profile isn't offered. Each profile starts empty.

### For a person to check

1. In Settings, try Light, Dark and Vice City, then an accent and Compact. Open the map, the Journal and the Field Manual.
2. Switch to Jason on the Saved page, favourite a pin on the map, then switch to Shared. Your earlier favourites should be there, and Jason's should not.
3. Open a few map cards and walk through Street Explorer, then open Discovery Journal. Add a note, then use "Clear history…". The note should stay.
4. On the map, turn on all overlays from the layers button, then open a pin with related places, such as Vice City. Dashed lines should appear.
5. Press the eye button for immersive mode, choose a place from "Nearby", then press Esc.
6. Add two route stops and switch to 3D. The numbered stops and the tilt button should appear.

---

# Phase 1 report

## What was kept working

These parts of the app work as they did before:

- The encyclopedia and its 3,199 entries.
- The Field Manual, including the 100% Guide.
- Media, Intel, search and the spoiler settings.
- The 2D map on Rockstar's official poster, with its 1,008 pins (993 from Gamersky's map, 15 placed by hand) and picture cards.
- The 3D view.
- The photo Street View.

All of them pass the existing checks and the new 40-check browser test.

## Status of each part

The four statuses mean:

- **Done:** built and tested.
- **Partly done:** built, but less than the request asked for.
- **Not done:** not built.
- **Needs outside data:** it can't be done honestly until better data exists.

| Part | Status | Notes |
|---|---|---|
| Navigation | Done | Explore is a new top-level link. The other sections sit under a "More" menu: Collectible Tracker, Businesses, Activities, Saved, Progress, Media, Intel and Settings. Vehicles and Characters stay on the encyclopedia's own sections. |
| 2D map: hover previews, clustering, filters, reset, fullscreen, saved views | Done | Pins group together when zoomed out. Filters have Show all, Hide all and Clear. |
| Favourites and "discovered" marks on pins and entries | Done | They're stored in the new user-data file, not in browser storage. |
| 3D: reset, highlighted pin, fly-to, 2D/3D kept in step, loaded only when opened | Done | MapLibre loads only when 3D is opened, and the fly-to animation respects reduced motion. There is no fake terrain: the poster lies flat and the pins stand as columns. |
| 3D: route numbers on the map | Not done | MapLibre can only draw text from a font server, and the app works offline. The route list shows the numbers instead. |
| Street Explorer: choose Jason or Lucia, drag or click to place, walk with arrows and the keyboard, Back to start, how-exact labels, save a spot | Done | Each picture is labelled with how exactly its position is known: pin, landmark, district, town, region or area. |
| Street Explorer: real 360° imagery | Needs outside data | No 360° captures of the game exist that the app may use. Street Explorer shows the 261 placed screenshots and never pretends to be 360°. |
| Distances | Needs outside data | The poster's scale is unknown, so the app shows no distances anywhere. "Nearby" uses relative distance on the poster only. |
| Location cards with nearby places | Done | They appear on map cards and on entry pages. The nearby radius can be set to small, medium or large. |
| Global search: suggestions, keyboard use, recent searches, "On map" | Done | |
| Collectible tracker | Done | It lists 1,189 items, grouped by type, with filters and confidence badges. |
| Vehicle, character and business lists | Partly done | These use the existing encyclopedia sections. No new vehicle specifications were added, because inventing them isn't allowed. |
| Saved: favourites, collections with notes, routes, map views and street spots | Done | Every list can be searched and sorted. |
| Progress page | Done | It counts collectibles, places discovered and 100% Guide ticks. |
| Route planner | Partly done | Stops can be added, reordered, removed and saved. The route is drawn as straight lines and labelled "approximate". It doesn't follow roads, because there is no road data. |
| Settings page | Done | Settings cover the default map mode, motion, the nearby radius, the walker, reduced motion and the spoiler options. Progress can be reset, after a confirmation. |
| Theme setting | Not done | The app has one theme. |
| Storage layer | Done | It has a new `/api/userdata` endpoint backed by `userdata.json`, with up to 32 parts and 1 MB. Writes are atomic. |
| Accessibility | Done | It covers keyboard paths, ARIA on the menus and suggestion list, visible focus, and reduced motion. |
| Phone and narrow widths | Done | The Edge suite measured no sideways scrolling on the map, tracker, saved, progress and settings pages at 390 px. The audit later found 79 px of sideways scrolling with the header search focused (F-15) and other phone-width breaks (F-03 to F-05); those were fixed and checked at 375, 390 and 768 px (audit sections 15 and 16). |

## Files

New files:

- `src/userdata.rs`
- `ui/explore.js`
- `ui/map3d.js`
- `ui/vendor/maplibre-gl.js`, `ui/vendor/maplibre-gl-worker.js`, `ui/vendor/maplibre-gl.css` and `ui/vendor/maplibre-gl-LICENSE.txt`
- `scripts/ui_features.mjs`
- `images/map/` (the poster and the two walker badges)

Changed files:

- `src/main.rs` and `src/server.rs`
- `ui/app.js`, `ui/index.html`, `ui/manual.js`, `ui/manual.css` and `ui/styles.css`
- `data/wiki.json`: the map block, the 261 placed photos and the 36 places
- `data/media.json`
- `data/manual.json`

## Dependencies

There is one new dependency: MapLibre GL JS 4.7.1, the CSP-compatible build, under the BSD-3-Clause licence. It is stored with the app and needs no network. No Rust crates were added.

## Data changes

- A new user-data file sits next to the settings file. It holds:
  - favourites, collections and routes
  - map views and street spots
  - discovered places, collectible ticks and guide ticks
  - recent searches
- 100% Guide checklist ticks moved from settings into user data. The old settings store's 64-entry limit would have cut them off.

## Speed

- The 3D library, about 800 KB, loads only when 3D is opened.
- Pins are grouped on a 46-pixel grid when zoomed out, which keeps the 2D map light.
- Street View pictures load one at a time.

## Tests

- **Browser:** `scripts/ui_features.mjs` drives headless Microsoft Edge with real mouse and keyboard input. All 40 checks pass, and there were no console errors or failed requests.
- **Rust:** cargo fmt and clippy are clean, and all 70 tests pass.
- **Syntax:** `node --check` passes on every script.
- **Data validation:** `--validate` reports 0 errors. Its 983 warnings are all the known "rights unconfirmed" notes.

## Open data questions

- **"Pick and Choose (Ocean Beach)" at x 0.6939, y 0.33395** (audit F-59) sits in Waning Sands, beside "Cocoon Shoes (Waning Sands)", not in Ocean Beach, where the other two "Pick and Choose (Ocean Beach)" pins are. Its only recorded source is Gamersky's map (`via: gamersky`), which gives no other position. It is left as it is until a source gives its real place or name.
- **Pins close together in one category** (audit F-60). None share a position, and none were merged, because each could be a separate place:
  - two "Berry Dream Rooftop Bar" pins, 3 px apart, among six Berry Dream bars;
  - "Banana Cove" and "Banana Cove Main Bar", 1.7 px apart;
  - "Meteorite" (a Kenton's Treasure) and "Meteorite Shard" (a meteorite chunk), 1.5 px apart, which are in different 100% Guide lists.

## Browsers

- Tested in headless Edge at 1440×900, and at phone width.
- Not tested in Chrome. It uses the same engine as Edge.
- Not tested in Firefox or Safari: neither is installed here, and Safari doesn't run on Windows. Firefox's engine isn't used by any build of the app. Safari's engine, WebKit, is: the macOS and Linux windows use it. On those systems only CI covers it, with `scripts/ci_pages.mjs` in WebKit, which hasn't been run here.
- The built-in browser pane can't draw the 3D view while it is hidden.

## For a person to check

1. Open the map. Drag Jason onto a pin, walk with the arrow keys, then press Home to return to the start.
2. Switch to 3D, select a pin, then switch back to 2D. The same pin should still be selected.
3. Add a few places to a collection, write notes, and reopen them from Saved after restarting the app.
4. Tick some 100% Guide items and confirm that the Progress page counts them.

## Not finished

- The route planner follows straight lines, not roads.
- There are no distances.
- There is no 360° imagery.
- The walker badges are round faces, not full cut-outs.
- Places are marked as discovered by hand. Nothing detects it automatically.
- The new pages aren't yet in `scripts/ci_pages.mjs`.
