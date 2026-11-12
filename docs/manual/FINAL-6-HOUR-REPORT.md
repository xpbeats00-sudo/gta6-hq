> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# GTA 6 HQ Field Manual: final mission report

Date: 2026-11-12.

## 1. Executive summary

The app has a working **Manual** destination: a printed-manual reader with a cover, contents, two-page spreads, search, page memory and a night mode. Its first substantive chapter, Law Enforcement, is ten pages written from IGN's interview with Rockstar North co-studio head Rob Nelson and four press sources, fact-checked by an independent agent and corrected. Every factual block carries an evidence label and footnoted sources. The rest of the app was re-tested and no regression was found.

**Time actually used:** well under the six-hour budget. Exact wall-clock time was not tracked. The three agents ran for about 36 minutes (core upgrade), 11 minutes (research) and 7 minutes (fact-check), partly in parallel; the lead's own work ran alongside and after them. The mission stopped because the work was complete, not because time ran out.

## 2. What was researched, and from where

| Source | Tier | Read by |
|---|---|---|
| IGN, "GTA 6: The Big Interview", Rachel Weber with Rob Nelson, 2026-10-07 (Yahoo copy) | Developer interview | Lead (police passages), both agents (in full) |
| IGN video "You're Not Just Wanted, You're Hunted", 2026-08-27 | Developer / preview | Research agent, auto-captions only |
| TGG video "The Police are Smarter Than Ever", 2026-08-29 | Hands-on preview | Research agent, auto-captions only |
| GamesRadar+ (three articles, Aug–Oct 2026) | Secondary | Lead and both agents |
| GTABase guide; VICE round-up | Secondary | Lead and both agents |
| Famitsu interview with Nelson, 2026-08-28 | Developer interview | Research agent, through a translation summary only |

Not accessed: Rockstar's Extended Look itself (sign-in age gate), ign.com (blocked to the tools), Edge's print issue, GGWaypoint (connection error). Rockstar's own site returned no police text.

Records: `research/PRIMARY-SOURCE-REGISTER.md`, `research/MECHANICS-EVIDENCE-MATRIX.md`, `research/UNKNOWN-MECHANICS.md`, `research/FACT-CHECK-REPORT.md`.

## 3. Police and Heat mechanics included, with evidence status

| Mechanic | Status | Source |
|---|---|---|
| The mechanic is called the heat system; dispatch is specific about what it knows | Developer-described | IGN |
| A crime must be witnessed, or an alarm set off, to be reported | Developer-described | IGN |
| Advanced trackers reveal a stolen car's position when driven slowly; a phone scanner shows locks, alarms, trackers | Developer-described | IGN |
| Six wanted positions | Demonstrated (stills in GamesRadar+) | GamesRadar+ |
| One star is minor; leave the area | Developer-described | IGN |
| Hollow white stars: police do not know who you are | Developer-described | IGN |
| Other star appearances (solid, flashing, gray, red) | Interpretation; guides disagree | GTABase, VICE, GamesRadar+ |
| On-screen icons show what police know: appearance, clothing, vehicle, that you are a couple | Developer-described | IGN |
| Weapon and security-camera clues | Interpretation | Guides |
| "Heat" is used both for what police know and for police searching an area | Developer-described | IGN |
| Hot area: police linger at the scene; the map keeps a star there; do not go back early | Developer-described | IGN |
| Glasses, a hat or a haircut change appearance but not the known outfit | Developer-described | IGN |
| A new outfit from a store, or from the trunk of the personal vehicle, deals with clothing | Developer-described | IGN |
| Leaving or changing vehicle deals with the vehicle clue | Developer-described | IGN |
| Splitting Jason and Lucia takes some heat off | Developer-described | IGN |
| Splitting up removes a star | Interpretation | Creators, guides |
| At three stars in the city, go on foot through the alleys | Developer-described | IGN |
| Focus is like Eagle Eye and helps locate police | Developer-described | IGN |
| Police are not on the radar and show with Focus; Focus sees through walls | Preview-reported (via TGG) | GamesRadar+ |
| "A bit more persistent memory" (Nelson) | Preview-reported (via TGG) | GamesRadar+ |
| Whole-map search at the highest level; patrol car trunk weapons and trackers | Preview-reported, flagged as hearsay | VICE |
| Mask beforehand, respray, stash the weapon, destroy camera footage | Interpretation | Guides |

Counts in the chapter: 24 developer-described, 13 interpretation, 7 preview-reported, 2 unknown, 1 demonstrated.

## 4. Mechanics deliberately left unknown

Crime-to-star thresholds; timers and decay; the size of a hot area; Focus range and duration; police sight and hearing ranges; a unit-by-star response ladder; helicopters, roadblocks and tactical units; what being busted costs; whether a new outfit clears heat inside a hot area; online behaviour. Full list: `research/UNKNOWN-MECHANICS.md`.

## 5. What was built

- **Navigation:** `Manual` added between Media and Intel. Nothing was renamed or removed.
- **Reader:** cover and contents; two-page spread at 1180 px and wider, single page below; Previous/Next; arrow and Page Up/Down keys; search across all chapters; last-page memory; Paper View and Night Reading; deep links; copy-link button.
- **Print styling:** off-white paper, dark ink, olive accent word in headings, running header over a black rule, serif italic intros, oversized numerals, dotted separators, captions, page numbers and footers, a shaded gutter.
- **Content model:** `data/manual.json` with chapters, pages and typed blocks; chapters can also be drawn from sourced encyclopedia entries.
- **Chapters:** 9, of which 7 are published and 2 are marked "In development". 30 pages.
- **Checks:** the validator now also checks the manual's evidence labels, source ids and images.

## 6. Files

Added: `data/manual.json`, `ui/manual.js`, `ui/manual.css`, `images/manual/law-enforcement-opening.jpg`, `docs/manual/*` (9 documents, a screenshots folder), `docs/manual/research/*` (4 documents).

Modified for the manual: `ui/index.html` (3 lines), `ui/app.js` (2 lines), `src/server.rs` (one route), `src/validate.rs` (manual checks, 2 tests), `data/media.json` (one record), `data/wiki.json` (one summary corrected), `docs/ui-redesign/capture.ps1` (manual pages added).

Backups: `backups/manual-before-fact-check.json`, `backups/app-before-manual.js`, `backups/server-before-manual.rs`, `backups/validate-before-manual.rs`.

The core upgrade's own file list is in `docs/LAUNCH-READINESS.md` and the README.

## 7. Agents and integration

| Agent | Result |
|---|---|
| Core upgrade | Finished: in-memory content store, split data files, indexed search, fact fields, drafts and spoilers, import and templates, data-driven map pins, large-list controls, 22 sourced entries. 51 tests |
| A, research | Finished: source register, claim matrix, unknowns list |
| B, fact-check | Finished: 61 claims judged; 45 pass, 14 downgrade, 1 remove, 1 needs source |
| C, D, E | Done by the lead, because they needed the files the core agent was changing |

The fact-check and research findings were applied before the manual was connected. Where the two agents and the lead's own reading agreed, the claim was upgraded to developer-described; where a quote turned out to be second-hand, it was downgraded.

## 8. Commands and results

| Command | Exit | Result |
|---|---|---|
| `cargo fmt --all -- --check` | 0 | Clean |
| `cargo clippy --all-targets --all-features -- -D warnings` | 0 | No warnings |
| `cargo test` | 0 | 53 passed, 0 failed |
| `cargo build --release` | 0 | 5,562,368 bytes |
| `gta6-hq --validate` | 0 | 0 errors, 33 warnings (all media rights) |
| `node --check ui/app.js`, `ui/manual.js` | 0 | Parse |

Reader and regression checks: `QA-TEST-RESULTS.md`, `REGRESSION-REPORT.md`.

## 9. Screenshots

- Before (app without the manual): `docs/ui-redesign/screenshots/after-*-1366x768.png`.
- After: `docs/ui-redesign/screenshots/final-*-1600x1100.png` (all 19 pages) and `docs/manual/screenshots/` (manual pages, single-page layout, the desktop window).

## 10. Regressions

None found. Two small issues were fixed during integration (an inaccurate vehicle summary; the cover picture's crop).

## 11. Remaining work

1. **After release:** test every Law Enforcement block in the game and relabel it; write Getting Started and Weapons.
2. **Watch the Extended Look** and record timestamps, so "demonstrated" claims rest on the footage and not on stills.
3. **Tune the layout against the GTA IV reference spread**, which was not available.
4. A legible, permitted picture of the wanted and Heat display, and a pursuit shot for the chapter opening.
5. Untested: copy-link button, screen reader, zoom, source links clicked inside the desktop window, offline use.
6. Open source conflict on whether an outfit change clears heat inside a hot area.

## 12. Confirmation

No claim in the published chapter is presented as fact without a source and an evidence label. Claims resting on creators' previews or guide authors' readings are labelled as such, and the two points where sources disagree are shown as disagreements. This was checked by the validator (labels and source ids), by an independent fact-check agent, and by the lead reading the primary interview. It was **not** checked against the released game, which is not out, or against the Extended Look footage itself.

## Superseded in part, 2026-11-12

The wanted-star pages were later rebuilt from frames of Rockstar's official Extended Look, and independently fact-checked. See `RERUN-REPORT.md` for what the footage shows, the new evidence counts, the frames added and the checks run.
