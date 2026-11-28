# GTA 6 HQ: UX and UI audit

28 November 2026. An audit only: nothing in the app was changed for it. Findings are measured in
the running app or read from the code; where something could not be checked, it says so.

## 1. Executive summary

The app is in good shape underneath and uneven on top. The shell (sidebar, title bar, search),
the colour system and the accessibility basics are sound: every text colour passes contrast in all
three themes, no control is missing a name, and no page scrolls sideways at any width tested.

What holds it back is **repetition and length**, not polish:

- The same content is reachable through three to four different screens (vehicles have four).
- Three pages are far too long to use: Media draws 2,595 pictures on one page 213 screens tall.
- Four menus list the same destinations (sidebar, pause menu, More page, Home).
- The app uses 27 different text sizes.

**The five most important improvements**

1. Page the three endless pages: Media (213 screens), Intel (25), Locations (22). (F-01)
2. Make the sidebar show that it scrolls: 5 destinations are hidden at 900 px tall, 7 at 768. (F-02)
3. Give each kind of thing one home: fold Vehicles, Characters and Locations browsing into one
   pattern instead of a card page plus an Encyclopedia list plus a game menu. (F-05)
4. Fix the dead link: pause menu, Help, "Questions" opens the not-found page. (F-03)
5. Cut the type scale from 27 sizes to about 6. (F-08)

**The five most repetitive things to look at first**

1. Vehicles: four screens (`#/vehicles`, `#/wiki/vehicles`, `#/garage`, `#/compare`).
2. The More page: 23 links, every one already in the sidebar.
3. Controls: three places (`#/controls`, a tab in Cheats, and the page titles itself "Settings").
4. Help: 21 tabs of excerpts that each say "From the Field Manual".
5. Trophies: `#/trophies` has the guides; `#/wiki/achievements` lists the same 55 without them.

## 2. Version and environment

| | |
|---|---|
| Folder | `C:\...\GitHub\gta6-hq`, branch `main` |
| Commit audited | `c87ebe9` (pushed; local and GitHub are the same) |
| App version | 0.2.51 in `Cargo.toml`. The installed desktop copy on this PC is 0.2.50 and does not have the redesign. |
| How it was run | The release build serving on `http://127.0.0.1:4600`, in a browser pane |
| Working tree | Clean before the audit; this report and `evidence/` are the only additions |

**Time.** The brief asked for six hours. This audit took well under that: it is one continuous
working session, not six hours of clock time. Coverage is listed in section 14 so the gaps are visible.

## 3. Design resources used

None of the three was installed or run. Each repository was downloaded and **read**; nothing in
them was executed (their installers run third-party code and change the agent's own tooling,
which was not done unattended). Their criteria were applied by hand:

- **Impeccable** (`skill/reference/critique-rubric.md`, `audit.md`, `distill.md`, the detector's
  rule list): the P0 to P3 severities below are its definitions; several findings cite its rule
  names (`nested-cards`, `tiny-text`, `kicker-above-heading`, `all-caps-body`).
  No `/impeccable` command was run and no score was produced by the tool.
- **Intent** (`skills/intent`, `evaluate`, `organize`): Nielsen's ten heuristics with its
  Holds / Strained / Broken verdicts, its wayfinding questions, and its labelling rules.
- **Perception-First Design** (`framework/PERCEPTION-FIRST-DESIGN.md`): the five layers, fixed
  lowest first. Its own caveat applies here and is respected: fewer options "does NOT apply in ...
  browse/reference interfaces"; reduce choices at decision points, not everywhere.

## 4. Overall visual quality

**Heuristic verdicts** (Intent's scale, judged by hand):

| Heuristic | Verdict | Why |
|---|---|---|
| H1 Visibility of system status | Strained | Favourite gives no confirmation beyond the button's pressed state |
| H2 Match with the real world | Holds | Game terms throughout; the purple menus mirror the game's own |
| H3 User control and freedom | Holds | Esc, back links, undoable ticks |
| H4 Consistency and standards | **Broken** | Three browsing patterns for the same kind of content; Controls titled "Settings" |
| H5 Error prevention | Holds | Confirm dialogs on destructive settings |
| H6 Recognition over recall | Strained | Sidebar hides rows with no hint |
| H7 Flexibility and efficiency | Holds | Ctrl K, slash, arrows and Enter on lists |
| H8 Aesthetic and minimalist design | **Broken** | Endless pages, four menus, 27 type sizes |
| H9 Error recovery | Strained | The not-found page ("Wasted") offers no search or way on |
| H10 Help and documentation | Holds | Help, Field Manual, tooltips |

**Perception layers.** L0 (cognitive load) is the lowest failing layer, so it comes first:
endless pages and repeated menus spend attention before the task starts. L1 (first impression) and
L2 (fluency) mostly hold: the charcoal shell and the pink accent are consistent. L2 leaks through
the type scale. L3 and L4 are not the problem.

**Strong, and should be left alone**

- Contrast: muted text 5.2 to 6.5:1, accent 6.1 to 7.4:1, in Vice City, Dark and Light.
- Structure: one `h1` per page, no skipped heading levels, 0 unnamed controls on six pages sampled.
- No sideways overflow on 31 routes at 1440 px, 27 at 1000 px, 23 at 700 px.
- The purple game menus and the Field Manual: distinct, consistent, and the app's identity.
- The accent is used with restraint: one filled button style, pink only for active and primary.

## 5. Page by page

Measured at 1440 x 900. "Screens" is page height in window heights.

| Page | Screens | Notable | Verdict |
|---|---|---|---|
| Home | 6.0 | 8 sections, 21 cards, 2 Discord links plus the title bar's | Good after reorder; long (F-07) |
| Search | 7.4 | 50 results a page, clear filters | Good |
| Encyclopedia home | 5.6 | Category menu, then a 200-row A to Z underneath | A to Z duplicates search (F-11) |
| Encyclopedia category | 1.3 to 1.8 | List and detail, type tabs, filter | Strong |
| Entry page | 1.9 to 4.5 | 4 to 10 nested cards (`nested-cards`) | Good; nesting (F-09) |
| Map | 1.0 | 157 controls, all named | Strong |
| Route planner | in Map | 27-stop run plans and follows roads | Strong |
| Collectible Tracker | 2.5 | 2,442 controls built up front | Works; heavy (F-06) |
| 100% Checklist | 3.8 | 39 cards, 96 buttons | Dense but purposeful |
| Progress | 2.5 | 14 stat cards | Good |
| Garage | 1.9 | List and stats; has its own Compare | Strong; see F-05 |
| Weapon Locker | 1.7 | Same pattern as Garage | Strong |
| Cheats | 1.3 | 6 tabs, one of them "Controls" | See F-04 |
| Characters | 9.4 | 62 cards on one page | Long; duplicates Encyclopedia (F-05) |
| Vehicles | 6.2 | 60 of 632 shown, "show more" | Duplicates three others (F-05) |
| Intel | **24.8** | 121 headings, 4,796 words | Too long (F-01) |
| Media | **213** | 2,630 cards, 2,595 pictures at once | Too long, slow (F-01) |
| Saved | 1.1 | Clear empty state | Strong |
| Settings | 2.7 | 6 groups, in-page index | Good |
| Field Manual | 2.8 | 14 type sizes, its own design | Leave as is |
| Card Collections | 1.3 | Game-menu screen | Good |
| Trophy Guides | 2.1 | List and step-by-step | Strong |
| Controls | 1.3 | Title reads "SETTINGS" | Mislabelled (F-04) |
| Help | 1.3 | 21 tabs, every panel an excerpt | Duplicates manual (F-10) |
| Locations | **21.6** | 156 cards, 46 nested, 91 texts under 12 px | Too long (F-01) |
| Businesses, Activities | 1.3 to 1.4 | Encyclopedia list and detail | Strong |
| Discovery Journal | 2.5 | Notes, filter, timeline | Good |
| Strangers and Freaks | 1.8 | Trophies-style, steps | Strong |
| More | 2.8 | 23 tiles, all in the sidebar | Redundant on desktop (F-05) |

Also inspected: sidebar open and collapsed, title bar, search suggestions, pause menu, entry
screen, footer banner, theme switching, Stream mode. Not inspected: update notices (none pending),
dialogs beyond the picture viewer, the 3D map.

## 6. Repetition

Each pair was opened and compared. "Keep both" means the two serve different needs.

| Pair | What each does | Same information twice? | Verdict |
|---|---|---|---|
| Global search vs Encyclopedia filter | Search finds across everything; the filter narrows one list | No | **Keep both** |
| Encyclopedia A to Z vs search | A to Z lists all 3,395 entries under the category menu | Yes: search does this better | **Remove** the A to Z, or move it behind a link |
| `#/vehicles` vs `#/wiki/vehicles` vs `#/garage` vs `#/compare` | Card grid; list and detail; stats and owned list; side by side | Yes, 622 to 632 of the same vehicles four ways | **Consolidate** to Garage plus the Encyclopedia list; Compare is already inside Garage |
| `#/characters` vs `#/wiki/characters` | Card grid vs list and detail, same 78 | Yes | **Consolidate** to one |
| `#/locations` vs `#/wiki/locations` | 156 cards vs list and detail | Yes | **Consolidate** to one |
| Weapon Locker vs `#/wiki/weapons` | Stats and owned list vs reference list (209 vs 210) | Mostly | **Consolidate**: Locker as the one screen |
| Trophy Guides vs `#/wiki/achievements` | Guides with steps vs the same 55 without | Yes | **Consolidate**: the wiki list should open the guide |
| Collectible Tracker vs 100% Checklist | Tick individual items vs the game's weighted lines | No; the Checklist reads the Tracker's counts | **Keep both** |
| Progress vs the trackers | A summary of the trackers | Summary only, and it stays in step (tested) | **Keep** |
| Saved vs Discovery Journal | What you chose to keep vs what you did | No | **Keep both** |
| Tracker "tick" vs entry "Mark discovered" | Two marks for "I found this" | **Yes, and not in step**: a ticked collectible's own page still reads "Mark discovered: off" | **Consolidate** (F-12) |
| Field Manual vs Help | The manual; Help shows excerpts of it in 21 tabs | Yes | **Simplify** Help to a short index into the manual |
| Field Manual vs mission steps | Steps are cut from the manual's walkthrough | By design, one source | **Keep** |
| Settings vs Controls vs Cheats' Controls tab | App settings; control layout; control layout again | Yes for controls | **Consolidate** controls to one place |
| Settings vs pause menu | Pause menu is a second map of the whole app | Navigation only | **Reconsider** (below) |
| Home vs destinations | Home previews Cast, Places, Vehicles, Media, Latest | Previews, not copies | **Simplify**: fewer previews |

**Repeated navigation.** Sixteen destinations appear in all three of sidebar, pause menu and More
page. Four exist only on the More page and are hard to find from the sidebar: Compare Vehicles,
Strangers and Freaks, Properties, Icons Explained.

**Repeated decoration.** A kicker line above nearly every Home heading (`kicker-above-heading`);
the same Rusty Anchor picture as both the More banner and its Businesses tile; two Discord
prompts on every page (the title bar's button and the strip above the footer), plus a third band
on Home.

## 7. Information architecture

The sidebar's grouping is right in kind (Intent: 15 or more items need hierarchy) but the groups
are uneven: 5, 7, 4 and 6 rows. Browse has seven, past the three-to-five chunks both frameworks
cite. Labels are destination names and pass the "does the label say where I land" test, with two
exceptions: **Controls** lands on a page titled "Settings", and **Progress** is both a sidebar row
and the first word of the purple menus' titles ("Progress / Trophies").

A proposed structure for the next phase (not implemented):

| Group | Rows |
|---|---|
| (top) | Home, Map, Encyclopedia, Field Manual, Saved |
| Browse | Characters, Locations, Vehicles and Garage, Weapons, News and Intel, Media |
| Track | Collectibles, 100% Checklist, Trophies, Cards, Progress, Journal |
| Guides | Strangers and Freaks, Cheats and Controls, Properties |
| (foot) | Help, Settings |

That is 22 rows instead of 24, with the four orphans brought in and Businesses and Activities
reached through the Encyclopedia like every other category.

## 8. User journeys

| Journey | Result | Friction |
|---|---|---|
| Search a vehicle, open it, go on | Completes. Suggestions appear as you type; entry shows 2 related links | None serious |
| Tick a collectible, see it elsewhere | Completes. Tracker, Home tile and Progress all read 1 of 1,212 | The collectible's own page does not show it as found and has no "view on the map" link (F-12) |
| Plan a multi-stop route | Completes: 27 banks ordered and drawn along roads | The map keeps the last filter ("100% objectives only", 310 of 6,595 pins) with little sign it is on |
| Compare two vehicles | Completes, two ways: inside Garage, and on `#/compare` | Two compare tools; the second is only on the More page |
| Save an entry, find it in Saved, return | Completes; Saved links back | No confirmation when saving (F-13) |

## 9. Accessibility and responsiveness

- **Contrast:** passes AA for every token pair measured, in three themes. Unmeasured: dimmed text
  (62% white) over the purple menus' wallpaper, where the background varies.
- **Small text:** 353 pieces of text at 10 to 11 px across the pages measured, and 12 px is the
  most common size after 14 px (`tiny-text`, `undersized-ui-text`). Worst: Locations (91), Field
  Manual (49), Strangers (48).
- **Capitals:** over 40% of text elements are uppercase on Characters, Vehicles, Locations, Cards,
  Strangers and More (`all-caps-body`).
- **Targets:** Settings has 29 controls under 24 px (its colour swatches and radios).
- **Keyboard:** search shortcuts, list arrows and Enter, pause menu keys all work. Not tested:
  tabbing through every page in order.
- **Motion:** the app's Motion: Off stops the rain, entry screen and logos. With only Windows
  asking for less motion, they keep running; that is the owner's choice and is documented.
- **Widths:** 700, 1000, 1440 px swept with no overflow. 1920 px checked on six pages.
- **Themes and Stream mode:** all three themes render; Stream mode has no sidebar.

## 10. Prioritised findings

Severities are Impeccable's: P0 blocks a task, P1 significant difficulty, P2 annoyance with a
workaround, P3 polish.

| ID | P | Where | Problem and evidence | Recommended action | Risk | Removes or merges? |
|---|---|---|---|---|---|---|
| F-01 | P1 | Media, Intel, Locations | 213, 24.8 and 21.6 screens; Media builds 2,630 cards and 2,595 images at once | Page or lazy-load in batches of about 60; Intel by month; Locations by region tab | Low | No |
| F-02 | P1 | Sidebar | At 900 px tall, 5 rows are below the fold (7 at 768 px); the scrollbar is hidden and nothing hints at more | Show a thin scrollbar or a bottom fade; or collapse groups | Low | No |
| F-03 | P1 | Pause menu | Help, "Questions" goes to `#/wiki/faq`, which is the not-found page | Point it at the FAQ on Intel, or remove the row | Low | No |
| F-04 | P2 | Controls | Sidebar says Controls; the page title is "SETTINGS"; Cheats has a third Controls tab | One Controls screen, titled Controls | Low | Merges |
| F-05 | P2 | Vehicles, Characters, Locations, Weapons, Trophies, More | Three or four screens per kind of content (section 6) | One browsing screen per kind; More page off the desktop | Medium: old links must redirect | Merges |
| F-06 | P2 | Collectible Tracker | 2,442 controls built before any group is opened | Build a group's rows when it opens | Low | No |
| F-07 | P2 | Home | 6 screens, 8 sections, a kicker over each heading | Keep hero, Recently opened, Track and plan, Latest; link the rest | Low | No |
| F-08 | P2 | Everywhere | 27 distinct text sizes (a clean scale is 6 or so) | Map every size to a 6-step scale in `shell.css` | Medium: visual drift | No |
| F-09 | P2 | Entry pages, Locations | 4 to 46 cards nested in cards (`nested-cards`) | Flatten: drop the inner borders | Low | No |
| F-10 | P2 | Help | 21 tabs of manual excerpts | A short index into the Field Manual | Low | Simplifies |
| F-11 | P2 | Encyclopedia home | A 200-row A to Z under the menu repeats search | Remove, or link "Browse A to Z" | Low | Removes a section |
| F-12 | P2 | Tracker and entries | "Tick" and "Mark discovered" are separate and disagree | One mark, shown in both places | Medium: saved data must be merged, never dropped | Merges |
| F-13 | P3 | Favourite | No confirmation on save | A brief "Saved" note | Low | No |
| F-14 | P3 | Not-found page | No search or suggestions | Add the search field and three links | Low | No |
| F-15 | P3 | Map | A kept filter is easy to miss | Show a "filtered" chip by the pin count | Low | No |
| F-16 | P3 | Many pages | Uppercase used for more than 40% of text | Keep capitals for labels only | Low | No |

No P0 was found: every journey tested could be completed.

## 11. Removal and consolidation

**Keep.** Global search, the Encyclopedia's list and detail screens, the Map and route planner,
Collectible Tracker, 100% Checklist, Progress, Garage, Weapon Locker, Trophy Guides, Card
Collections, Saved, Discovery Journal, Field Manual, Settings, the purple game menus, Stream mode.

**Simplify.** Home (fewer previews), Help (an index, not 21 tabs), the sidebar (even groups, a
scroll hint), the type scale.

**Consolidate.**
- Vehicles: `#/vehicles` and `#/compare` into Garage and the Encyclopedia list. Nothing is lost:
  Garage already has stats, filters, compare and an owned list. Old addresses should redirect.
- Characters and Locations: one screen each. Lost: the large card layout. Kept: every entry.
- Trophies: `#/wiki/achievements` rows open the guide.
- Controls: one screen.
- "Tick" and "Mark discovered": one mark. **Data:** both sets of saved marks must be merged into
  the new one; nothing may be discarded.

**Remove.**
- The Encyclopedia's A to Z section: search covers it, and the letters are a link away if wanted.
- The More page on desktop: every tile is a sidebar row. It stays on narrow windows, where it is
  the menu. Its four orphan pages need sidebar rows first.

**Reconsider (not enough evidence).**
- The pause menu. It is a second map of the app and repeats the sidebar, but it is also part of
  the game feel the owner asked for. Whether people use it is unknown.
- The artwork rain and the footer banner: decoration, not tasks. The owner asked for both.
- The community strip above the footer on every page.

## 12. Recommended next phase

In this order, lowest perception layer first:

1. **Load:** F-01, F-02, F-03, F-06. Small, safe, and they remove the worst friction.
2. **One home per thing:** F-05, F-04, F-11, F-10, with redirects for every retired address.
3. **Fluency:** F-08 type scale, F-09 flatten cards, F-16 capitals.
4. **Feedback:** F-12 (with a data merge), F-13, F-14, F-15.

## 13. Remaining uncertainties

- No user research, analytics or usability tests exist. Every judgement of "what users want" is
  reasoned from the feature set.
- The installed desktop app (0.2.50) was not audited; the dev build was, in a browser.
- Performance was judged by element counts, not measured in time.
- High-DPI displays, the 3D map, update notices and tab-order were not tested.
- The pause menu's and rain's value to readers is unknown.

## 14. Evidence

Screenshots (1440 x 900, the running app): `evidence/home.jpg`, `media.jpg`, `locations.jpg`,
`intel.jpg`, `more.jpg`, `controls.jpg`, `faq-not-found.jpg`, `vehicles-grid.jpg`,
`vehicles-encyclopedia.jpg`, `garage.jpg`, `help.jpg`, `tracker.jpg`.

Measurements: a script run on 33 routes counted headings, text sizes, colours, bordered rounded
boxes, nested boxes, buttons, images, badges, fields, tabs, repeated links, words and page height.
Contrast was computed from the theme tokens. Journeys were driven in the page and their results
read back. The sidebar's hidden rows were measured at 900 and 768 px window heights.
