# End-to-end audit

**Date:** 2026-11-22. **Version:** 0.2.38 plus the uncommitted work of 22 November (Rockstar look, new pictures, new entries, source clean-up). Every number below was measured from `data/`, `images/` and the running app; nothing is estimated.

## The short answer

The app works end to end. Every page opens, no script errors or failed requests occurred, all 88 Rust tests and both UI suites pass, and the data has no validation errors. Since the last release:
- the encyclopedia grew to 3,244 entries;
- entries resting only on do-not-use sites fell from 1,303 to 385;
- the whole app now uses the Rockstar GTA VI guide look.

The main open items:
- **Sources:** 385 entries still rest only on do-not-use sites.
- **Pictures:** 110 pictures were replaced with sharper copies of the same shot; 374 are still under 1,280 px wide, and many entries still have no picture.
- **Watermarks:** two pictures still carry a site's logo (Kenton's Huntress and the Animal Compendium picture).
- **Rights:** every picture's rights are recorded as "permission required".

## 1. Data

| | Count |
|---|---|
| Entries | 3,244 in 16 sections |
| Sources recorded | 1,312 |
| Official sources (Rockstar, Take-Two, PlayStation, Xbox) | 41 |
| Entries with no source | 0 |
| Validation | 0 errors |

By section:

| Section | Entries | Only do-not-use sources | Labelled Official | Spoiler-marked |
|---|---|---|---|---|
| Collectibles | 1,257 | 372 (cards, AHOL art, No Flusher tags) | 0 | 1,257 |
| Vehicles | 383 | 1 | 9 | 312 |
| Businesses | 287 | 0 | 5 | 271 |
| Activities | 222 | 0 | 2 | 215 |
| Weapons | 210 | 0 | 3 | 199 |
| Missions | 191 | 0 | 0 | 191 |
| Locations | 156 | 0 | 0 | 148 |
| Wildlife | 124 | 1 | 0 | 91 |
| Gameplay | 124 | 4 | 2 | 99 |
| News | 94 | 7 | 26 | 0 |
| Characters | 74 | 0 | 10 | 51 |
| Achievements | 55 | 0 | 0 | 55 |
| Music, factions, FAQ, editions | 67 | 0 | 18 | 30 |

Checks that found nothing wrong:
- **Duplicates:** no duplicate slugs. Two names appear twice in one section, but neither is a real duplicate. "Crystal (Standard) card" is in two different card sets, and "Pay Abe's Fee" is a separate mission in Chapter 4 and Chapter 5.
- **Dates:** every entry has a 'verified' date in November 2026.

Findings:
- **D1. 385 entries rest only on do-not-use sites,** mostly IGN's collectible lists.
  - The trading cards are only partly covered: no allowed page lists every card with its colour yet.
  - Only 3 of 83 AHOL street art pieces are covered; GTABase has mapped 39 of 112 so far.
  - The 14 No Flusher tags have no allowed source.
  - Worth repeating once PowerPyx and GTABase finish their lists.
- **D2. Basketball hoop numbers come from IGN.** GTABase confirms there are 100 hoops and the same split by county, but numbers them differently.
- **D3. Spellings where sources disagree,** left as they are with the disagreement noted where known:
  - Duke "1922" against "1992";
  - Sammy Woodsworth against Wordsworth;
  - Atonga Alaalatoa against Alaatatoa;
  - Immigrintasma against Immigrantasma;
  - Jesenia against Jesina.
- **D4. Missing cards,** which no allowed source fully lists:
  - Femi-Nemesis (Ed Universe);
  - Zaria "Ri Ri" Luckett (Jack of Hearts);
  - Maleek Rivers (Manatees).
  - They were briefly added from Fextralife, which turned out to block Claude agents, so they were removed again.
- **D5. Older citations of KeenGamer remain** (about 30 entries and 5 pictures). KeenGamer blocks only Anthropic's crawler, so under the project's rule it may be used.

## 2. Sources policy

- **Banned for blocking Claude agents (or charging them):** IGN, Sportskeeda, Eurogamer, VG247, GameSpot, Dexerto, Game Rant, TheGamer, Polygon, Game8, and, found on 22 November, Fextralife, CBR, Shacknews and AltChar.
- **Citations of the four new ones added on 22 November** were removed: 483 entries edited, 7 cards that rested only on Fextralife removed, and 3 Robbery Planner lines that rested only on AltChar removed.
- **Older citations of banned sites** stay where they were first written, alongside allowed sources wherever one has been found.

## 3. Pictures

| | Count |
|---|---|
| Picture records | 1,038 |
| Rockstar's own | 547 |
| From other sites | 485 |
| Supplied by the owner | 6 |
| Image files | 1,004 (196 MB) |
| Under 1,280 px wide (excluding achievement icons) | 374: 152 at 960–1,279 px, 183 at 640–959 px, 39 under 640 px (480 before the sharper copies) |

New on 22 November:
- 56 pictures for entries that had none, each checked by eye: no watermark, nothing sexualised, the right subject.
- 3 watermarked pictures replaced with clean ones.
- 110 pictures replaced with sharper copies of the same shot, 1.3 to 3.8 times wider: 29 from Rockstar's own pages and 81 from other sites (GTA Wiki, Rockstar, GamesRadar+ and PC Gamer, tracker.gg, GTABase, VGC, KeenGamer, Kotaku, GTA BOOM, Pure Xbox). Each was matched point by point to the old picture and checked by eye side by side; 6 were cropped to keep the old framing. Each picture record now names the sharper copy's address. Copies are capped at 1,920 px wide (1,440 for portraits).

Findings:
- **P1. Two pictures still carry a site's logo.**
  - Kenton's Huntress has GTA BOOM's watermark. No clean shot of that boat exists on an allowed site yet; the guides' clean dive-boat shots show the Sea Enchantress.
  - The Animal Compendium picture (`images/wildlife/animal-compendium.jpg`) has a faint GamesRadar+ logo across its black border, and an orange arrow added by the site. It was found during the sharper-copy check and was not upgraded. It needs a clean replacement.
- **P2. 374 pictures are still under 1,280 px** (down from 480).
  - Of the 260 non-Rockstar pictures searched, 177 have no larger copy of the same frame anywhere reachable. Most are GTABase's own captures (508–832 px at source) or crops of 1080p trailer frames.
  - Not fetched, because their robots.txt blocks Claude: Nettoge (14 pictures) and DayOne (7). Insider Gaming's robots.txt could not be read, so its one sharper copy (Lucky Dog) was not used.
  - Two pairs of news stories already shared one picture, so the validator now reports them as identical files. That is expected.
- **P3. Many entries have no picture:**
  - vehicles: 122
  - weapons: 130
  - locations: 101
  - animals: 81
  - characters: 17
  - missions: about 50

  On allowed sites, PowerPyx and Push Square burn their logo into every screenshot, and GTABase shows placeholders for most variants.
- **P4. Rights:** 1,023 pictures are recorded as "permission required" and 15 as "unknown". The app ships them under the owner's decision, and the validator warns about each one.

## 4. The app

- **Crawl:** 478 pages opened, including every top-level page and a sample of entry pages from every section. Result: 0 script or console errors, 0 failed requests and no slow page changes. No internal link leads to a missing page.
- **Tests:**
  - 88 Rust tests pass; formatting and lint checks are clean.
  - `ui_features` (46 checks) and `ui_phase2` (28 checks) pass.
  - The WebKit page check (`ci_pages.mjs`) was fixed for night reading as the Field Manual default.
- **Phones:** no sideways scrolling at 375 px in the Vice City or Light themes on the home, search, map and Field Manual pages.
- **Accessibility (WCAG 2.1 AA):**
  - No contrast failures in Vice City or Dark on seven main pages.
  - Fixed: Light-theme text over pictures, the spoiler tag in Light, the Guide's chapter-tab numbers, a main heading on every Guide page, and the back link above the picture on phones.
  - Keyboard focus is visible throughout.
- **Size of what the app sends:** `/api/wiki` is 3.3 MB and `/api/manual` 1.3 MB, uncompressed.
  - **A1:** no compression is used. That makes no difference in the desktop app, which talks to itself, but it would matter if the app were ever hosted on the web.

## 5. Code review

A review of this week's code changes (search, map planner, Field Manual, styles) found 1 real bug and 8 minor issues:
- **Fixed, the real bug:** pages whose names start with "The" or contain filler words never got the name-first boost in search.
- **Fixed, minor:**
  - names with apostrophes missed the exact-name boost;
  - "6" and "vi" were dropped from every query instead of only after "gta";
  - the search toolbar showed above "Nothing found";
  - `?plan=` wiped a `?q=` search;
  - a planned run kept narrowing the lists after the route was edited;
  - the map's detail tiles were cached without limit;
  - an unknown `?plan=` silently planned small banks.
- **Not fixed:**
  - **C1:** when a long query falls back to partial matches, the results aren't labelled as close matches.

## 6. Recommended next steps

1. Release the 22 November work (Rockstar look, pictures, entries, fixes).
2. Repeat the card, AHOL and stunt-jump sourcing once PowerPyx and GTABase complete their lists (D1, D4).
3. Keep looking for a clean Huntress picture (P1) and for pictures of the missing vehicles and weapons as GTABase replaces its placeholders (P3).
4. Label partial search matches (C1).
5. Turn on response compression only if the app is ever served over the web (A1).

## Not checked

- Chrome, Firefox and Safari: only Edge was tested here. WebKit runs in CI.
- The installed desktop window after these changes.
- Whether each entry's facts match its sources: sources were counted and spot-checked, not re-read in full.
