# Official sources and simplicity audit

**Date:** 2026-11-22. **Version audited:** 0.2.36 (`main`). **Read-only:** nothing in the app, its data or its pictures was changed. Numbers were measured from `data/` and the running app; nothing here is estimated unless it says so.

## The short answer

**The app is not, and cannot be, 100% official without losing almost everything in it.**
- Rockstar has published official material for only a small part of what the app covers.
- Everything found after launch comes from guides and reviews, not from Rockstar: missions, collectibles, vehicle and weapon lists, map positions.
- Going 100% official would mean removing about 97% of the entries and 85% of the pictures. That contradicts the standing rule that pictures are never removed.

What can be done without removing anything is in "Options" below.

## 1. Text: where the entries come from

"Official" here means Rockstar Games, Take-Two, PlayStation or Xbox's own sites and accounts.

| | Count | Share |
|---|---|---|
| Sources recorded | 1,219 | |
| Sources on official sites | 40 | 3% |
| Sources marked `official` but hosted elsewhere (Apple Music ×2, Business Wire ×1) | 3 | |
| Entries (all sections) | 3,199 | |
| Entries resting **only** on official sources | 21 | 0.7% |
| Entries with official **and** other sources | 67 | 2.1% |
| Entries with **no** official source | 3,111 | 97.2% |
| Entries with no source at all | 0 | |

The official sources are rockstargames.com (17), support.rockstargames.com (15), PlayStation (4), Take-Two (2), Xbox (1) and Rockstar's X account (1).

The largest non-official publishers are PowerPyx (339 sources), GTABase (293), IGN (142), Dexerto (40), GameSpot (38), Game8 (28) and GamesRadar+ (27).

By section, entries with no official source:

| Section | No official source | Total |
|---|---|---|
| Collectibles | 1,241 | 1,241 |
| Vehicles | 374 | 383 |
| Businesses | 261 | 266 |
| Activities | 220 | 222 |
| Weapons | 207 | 210 |
| Missions | 185 | 185 |
| Locations | 154 | 156 |
| Wildlife | 124 | 124 |
| Gameplay | 120 | 122 |
| Characters | 69 | 74 |
| Achievements | 55 | 55 |
| News | 62 | 94 |
| Music | 19 | 30 |
| Factions | 17 | 17 |
| FAQ | 3 | 18 |
| Editions | 0 | 2 |

Other findings:
- **Confidence labels:** 3,059 entries are "corroborated", 73 "community" and 67 "official". The app already tells readers which is which, and every entry lists its sources.
- **Banned publishers still cited:** IGN, Dexerto, GameSpot, Eurogamer, Game Rant, Polygon and Game8 are on the project's do-not-use list, because they block or charge automated readers. They still account for about 284 recorded sources, presumably added before the rule or cited second-hand. This is a clean-up item, not a factual error.
- **Spoilers:** 2,874 entries are marked as post-launch discoveries. Almost all of what is not official is the released game's own content, which Rockstar doesn't document item by item.

## 2. Pictures: where they come from

| Kind | Records | Share |
|---|---|---|
| From Rockstar's own site or accounts | 133 | 14% |
| Taken from another site | 744 | 76% |
| Supplied by the owner, source not verified | 81 | 8% |
| Evidence frames | 23 | 2% |
| No source recorded | 1 | |
| **Total records** | **982** | |

A further 36 files on disk have no record at all; 35 of them are video posters.

Of the 744 from other sites:
- 248 name Rockstar as the creator. They are Rockstar's own screenshots, artwork or trailer frames, republished or cropped by a fan site. 118 of them say so in their description.
- The rest are the sites' own captures of the released game.
- They come mainly from GTABase (368), GTA Wiki (129), Exophase (55, the achievement icons), GamesRadar+ (44), PC Gamer (37) and VGC (32).

Where pictures are used:

| Use | Official | Other site | Owner / evidence | None |
|---|---|---|---|---|
| Entry pictures (3,085 entries) | 68 | 651 | 11 | 2,355 have no picture |
| Street Explorer (261) | 50 | 200 | 11 | |
| Field Manual (371 uses) | 40 | 294 | 37 | |

Sections whose pictures are almost all from other sites:
- achievements: 55 of 55;
- missions: 116 of 117;
- weapons: 60 of 64;
- vehicles: 223 of 237.

**What "official" could realistically reach:** the 248 republished Rockstar pictures could be replaced by the same pictures from Rockstar's own pages where Rockstar still hosts them. That would raise official pictures from 133 to at most 381, about 39%. The remaining captures of the released game have no official equivalent. Rockstar publishes a few dozen screenshots, not a picture of every vehicle, weapon and mission.

## 3. Simplicity and look

Measured at 1440 × 900 in the full build.

| Screen | Text sizes in use | Text colours | Upper-case labels | Page height |
|---|---|---|---|---|
| Home | 19 | 9 | 78 | 4,956 px |
| Vehicles list | 15 | 7 | 191 | 5,378 px |
| Entry | 15 | 7 | 8 | 1,269 px |
| Collectible Tracker | 12 | 6 | 2,416 | 29,038 px |
| Settings | 8 | 5 | 10 | 2,308 px |
| Map | 15 | 6 | 40 | one screen |

- **Navigation:** 8 items in the top bar plus 10 more under "More", then the search, the spoiler switch, the profile and Discord. That is 22 destinations or controls before any content.
- **Styles:** 5 stylesheets, 2,776 lines and 215 KB, layered over each other (the original, the Field Manual, the stream mode, the redesign, the themes). Later rules override earlier ones, which caused most of the layout bugs the last audit fixed.
- **What works:** the hero, the type, the card grid and the map toolbar are consistent and look professional. Light, Dark and Vice City all work.

What makes it feel busy:
1. **Too many type sizes.** 15 to 19 sizes on one screen; a simple system uses 5 or 6.
2. **Upper-case everywhere.** Nav, buttons, chips, labels and badges are all in spaced capitals, so nothing stands out. The tracker has 2,416 upper-case labels.
3. **Three strips before the content:** the announcement bar, the top bar, and each page's large title with a picture collage beside it.
4. **Repeated controls:** the tracker has family chips and a Family list that do the same job; profile buttons appear on several pages as well as in the top bar.
5. **Very long pages:** the tracker is 29,000 px tall and shows all 1,189 items at once.
6. **Decoration:** slanted picture collages, gradient lines and badge marks on most pages.

## Options

### Official content

| | What it does | Cost |
|---|---|---|
| **A. Keep everything, and make "official" obvious** (recommended) | Nothing is removed. Every entry and picture gets a clear, simple label: **Official** (Rockstar) or **Community** (guides and reviews). An "Official only" filter shows just what Rockstar published. Where Rockstar hosts the same picture a fan site republished, the record is switched to Rockstar's own copy (up to 248 pictures), which is a swap, not a removal. | Medium. No content lost. |
| B. Official-only edition | A second build with only the 88 entries and 133 pictures that have official sources. | Small, but it is a nearly empty app. |
| C. Make the whole app official-only | Removes about 3,111 entries and about 850 pictures. | Contradicts "never remove images"; not recommended. |

### Simple and modern

A proposed direction, to confirm before any redesign:
1. **One type scale of six sizes**, sentence case for labels and buttons, upper case kept only for the page title.
2. **Top bar of five items:** Home, Map, Encyclopedia, Guides, Saved. Everything else moves into Encyclopedia or a single menu, and the announcement strip goes.
3. **Quieter page headers:** a title and one line, with no collage except on Home.
4. **One control per job:** drop duplicate filters and repeated profile rows.
5. **Long lists in pages or collapsed groups,** so no screen is tens of thousands of pixels tall.
6. **One stylesheet** built from the existing design tokens, replacing the five layered ones.

Pictures, the map, Street Explorer, themes and every feature stay.

## Not checked

- Whether each of the 248 republished Rockstar pictures is still on Rockstar's own pages. That needs fetching each one.
- Whether the facts in entries match their sources. This audit counted where sources come from, not whether each statement is right.
- Phone widths, for the simplicity measurements.

## What was done (2026-11-22)

Option A and the simpler design, at the owner's request. Nothing was removed: every entry, picture and feature is still there. Nothing is committed or released.

### Official and Community

- **Entries** carry one of two labels: **Official** (stated by Rockstar in its own material; 67 entries) or **Community** (guides, reviews and fan research). "Verified" and "Corroborated" are gone as names; the tooltip still says what each means.
- **Pictures** carry the same two labels. The media API now gives each picture an `origin`:
  - `official`: 155 pictures from Rockstar's own site and accounts, trailer frames included.
  - `official-via`: 248 of Rockstar's own pictures as published by another site.
  - `community`: 496 pictures.
  - `owner`: 37 pictures and 33 live wallpapers.
  The first two show as Official and the other two as Community. The gallery shows an "Official" tag on each official picture, and the picture viewer shows the label with the full credit.
- **"Official only"** is a switch on every entry list that has official entries, and in the Media gallery (403 pictures). It stays on from page to page while the app is open.
- **Not done:** the 248 republished Rockstar pictures were not swapped for copies from Rockstar's own pages. That needs each one found and checked on rockstargames.com, and many are crops that Rockstar doesn't host in that form. They are labelled Official, with the site they came through named in the credit.
- **Not done:** the roughly 284 sources from do-not-use sites are still cited.

### Simpler design

| | Before | After |
|---|---|---|
| Top bar | 8 links, "More" with 10, and an announcement strip | 5 links (Home, Map, Encyclopedia, Guides, Saved), "More" with 12 in three groups, no strip |
| Labels and buttons | Spaced capitals | Sentence case in the body typeface |
| Fixed text sizes | About 30 different values | Six steps: 0.75, 0.875, 1, 1.25, 1.75 and 2.5 rem, plus the fluid page title |
| Text sizes on one screen | 8 to 19 | 4 to 8 |
| Upper-case labels on the tracker | 2,416 | 0 |
| Page headers | Title, text and a moving picture collage | Title and one line (the hero stays on Home) |
| Tracker | Every collectible listed, 29,038 px tall; chips and a Family list | Families as groups that open on demand, 2,422 px tall; chips only |
| Profile row | On Saved, Tracker, Journal and Progress | On Saved, plus the top-bar button and Settings |

Also fixed, both older problems:
- On phones the menu opened underneath the map.
- In Light, titles written over pictures were dark on dark.

**Not done:** merging the five stylesheets into one. The type and case changes were made inside the existing files instead; a full merge is a refactor with a real risk of breaking layouts and should be its own step.

### Checked (headless Edge 158)

- **Suites:** `ui_features.mjs` 46/46 and `ui_phase2.mjs` 28/28, unchanged.
- **Earlier fix checks:** all pass, except the one 768 px check that was written too strictly.
- **Phone and tablet:** no sideways scrolling at 375 and 768 px on eight pages each. The phone menu was looked at.
- **Light theme:** list and gallery looked at.
- **Official only:** 403 gallery pictures, all tagged official; 9 of 383 vehicles, all labelled Official.
- **Rust:** 86 tests, fmt and clippy clean; `--validate` 0 errors.
- **Store edition:** still builds with 0 errors.

Not checked: Chrome, Firefox, Safari, the desktop window, CI.
