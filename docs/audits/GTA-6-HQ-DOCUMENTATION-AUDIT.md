# GTA 6 HQ — Documentation-Based Project Audit

**Review date:** 2026-11-12  
**Material reviewed:** `docs(2).rar` (186 archive entries; documentation, screenshots, research frame sheets, and capture script)  
**Review type:** Documentation and evidence audit — **not a source-code audit**  
**Important limitation:** The archive does not contain the Rust source, UI source, JSON data, media binaries, build output, or executable. I could inspect the documentation and visual evidence included in the archive, but I could not independently run the application, validate the live data, or confirm that the described implementation matches the current repository.

---

## 1. Executive assessment

GTA 6 HQ has moved well beyond an early prototype. The documentation describes a substantial Rust/WebView2 desktop app with an editorial UI redesign, a structured sourced encyclopedia, a data-driven map, media handling, import/validation tooling, and a multi-page in-app Field Manual. The project also has unusually good audit habits: before/after screenshots, source registers, confidence labels, test matrices, change logs, backup records, and explicit unknowns.

The biggest risk is no longer a lack of features. It is **keeping the project trustworthy, legally distributable, testable, and internally consistent as the content and media library grow**.

### Overall status

| Area | Assessment | Why |
|---|---|---|
| Core app architecture | Good foundation; verify against source | Rust + Axum loopback server + Tao/Wry/WebView2 is documented clearly |
| UI / visual direction | Strong progress | Design system, responsive captures, before/after comparisons and route coverage exist |
| Encyclopedia structure | Strong | Schema v2, source registry, confidence labels, drafts, spoilers, facts and import validation |
| Manual feature | Substantial | 9 chapters, page reader, search, page memory, evidence labels and source footnotes are documented |
| Police / Heat research | Strong but pre-release | Evidence matrix, frame sampling and independent fact-checking; some rules remain unknown |
| Data completeness | Intentionally incomplete | Missions and collectibles empty; Getting Started and other sections need more source-backed depth |
| Media rights | **High-priority blocker** | Latest asset register still marks many assets “permission needed” or “unknown” |
| Automated UI testing | Weak / incomplete | Screenshot capture and manual checks exist, but no repeatable browser interaction suite is documented |
| Accessibility | Incomplete | Screen-reader, full keyboard, zoom, and some focus flows not tested |
| Performance | Insufficiently measured | Old spot measurements show WebView2 around 534 MB and unbounded map tile cache |
| Release readiness | Needs a dedicated gate | Signing, clean-machine install, update/rollback and full offline behavior are not evidenced in this archive |
| Project governance | Needs improvement | Baseline says no Git history; multiple reports are stale or disagree on current counts |

**Recommendation:** Do not spend the next development cycle simply adding more encyclopedia pages. First establish a clean source-of-truth baseline, resolve media distribution rights, automate UI regression tests, and close release-readiness gaps. Then expand content with a repeatable research/import pipeline.

---

## 2. What the archive actually contains

The RAR contains 186 entries, mostly:
- audit reports and findings;
- manual implementation, QA, research and fact-check reports;
- official-footage frame sheets and manual screenshots;
- UI redesign design-system, asset inventory, implementation log and QA report;
- editorial policy and launch-readiness instructions;
- earlier plans for the manual and UI rewrite.

**Not present in this archive:** `src/`, `ui/` source files, `data/` JSON files, `images/`, `wallpapers/`, `Cargo.toml`, executable, installer, Git history, or actual build logs. Their existence and current state are described by the reports, but cannot be independently checked from this upload.

The archive therefore provides a good record of intended/current work, but it cannot prove that the app currently builds or that all described files are present.

---

## 3. Strengths worth preserving

### 3.1 Evidence-first editorial system

The editorial policy establishes useful rules:
- no facts written from memory;
- official/corroborated/community/rumor/unknown confidence labels;
- source required for official and corroborated claims;
- trailer appearance is not a promise of a complete feature;
- no carrying features over from previous GTA games;
- drafts remain hidden until published;
- spoilers are gated;
- each source is stored once and referenced by ID.

This is the right foundation for a fan encyclopedia that aims to be reliable. Keep it, but extend the policy to cover source-quality tiers, claim-level evidence, asset provenance, and review expiry.

### 3.2 Good engineering discipline

The documents describe:
- baseline backups;
- test and build commands;
- Rust formatting and Clippy checks;
- data validation;
- safe JSON import with dry-run and backups;
- atomic tile writes and validation;
- explicit handling of malformed data;
- loopback-only local server;
- path traversal probes;
- keyboard and responsive checks;
- regression reports.

These practices should become a repeatable release pipeline, not one-off manual work.

### 3.3 Visual redesign has a documented system

The UI redesign is not just a screenshot makeover. It defines color, type, spacing, responsive breakpoints, components, accessibility contrast targets, and rules for missing artwork. The project should keep the design tokens centralized and avoid ad hoc styling.

### 3.4 Manual research is appropriately cautious

The law-enforcement chapter distinguishes:
- developer-described mechanics;
- demonstrated footage;
- preview-reported claims;
- interpretation;
- unknowns.

The Extended Look rerun is a meaningful improvement over relying on fan guides alone. It also records that the video was sampled as still frames rather than watched in full motion. That limitation should remain visible wherever conclusions depend on the frame sampling.

---

## 4. Critical findings — fix before public distribution

### P0 — Establish a single current project baseline

**Finding:** The archive contains several reports that describe different project states. There is no source tree or current build in the archive to identify which report is authoritative.

Examples of report drift:
- `FINAL-6-HOUR-REPORT.md` says the manual is 30 pages and the law-enforcement chapter is 10 pages.
- `RERUN-REPORT.md` says the book is 32 pages and the chapter is 11 pages.
- `CONTENT-STATUS.md` still contains pre-rerun figures (30/31 pages and older evidence counts), then says it is superseded in part.
- `QA-TEST-RESULTS.md` reports 33 validator warnings.
- `RERUN-REPORT.md` reports 45 warnings.
- The later asset register update reports 61 warnings after further image additions.
- `CONTENT_INTEGRITY.md` is an earlier report with 45 media warnings, and is not a current run.

**Impact:** A developer or future agent can follow stale instructions, quote old test counts, or believe a chapter is incomplete when it has since been populated.

**Required action:**
1. Run the validator and all tests against the actual current checkout.
2. Generate one `CURRENT-STATE.md` with date, commit hash, app version, entry counts, media counts, manual chapter/page counts, warning counts, test results and known blockers.
3. Mark old reports `HISTORICAL / SUPERSEDED` at the top and link to the canonical current report.
4. Add a rule: every new implementation run updates the canonical status rather than leaving multiple apparently-current reports.

### P0 — Resolve asset rights before distributing the app

**Finding:** The asset register repeatedly says official Rockstar screenshots, Extended Look frames, owner-supplied wallpapers, logos and other media are “permission needed” or “unknown”. The validator warnings are largely media-rights warnings. The project is unofficial and uses copyrighted game imagery.

**Impact:** Local personal use and public distribution are different risk profiles. A screenshot being downloadable from an official media page does not automatically grant an unrestricted redistribution licence. A local fan app can still create problems if bundled and publicly distributed without checking the applicable terms.

**Required action:**
- Build a definitive asset manifest with creator/rightsholder, exact source URL, date retrieved, licence/permission evidence, allowed use, attribution text, local-only/distributable status and review date.
- Separate `viewable locally` from `approved for redistribution`.
- Do not bundle assets with unknown or permission-required status in a public installer unless permission or a clearly applicable licence is documented.
- Keep a rights-safe build mode that excludes unapproved media and displays a neutral placeholder or links to the official source.
- Review the user-supplied logo and wallpaper provenance too; owner-supplied does not automatically establish ownership.
- Preserve a takedown workflow and file hashes.

**Acceptance:** zero unresolved rights warnings for every asset included in the public release package. If the app remains private/local, document that restriction and still keep the asset register.

### P1 — Reconcile the current manual and research facts

**Finding:** The manual reports have been updated in stages, but `CONTENT-STATUS.md`, QA reports and the final report still include older figures. The police chapter has nuanced source limitations:
- the official Extended Look was sampled as frames, not watched continuously;
- some creator preview claims are available only through auto-captions or secondary reporting;
- Famitsu information is represented through a translation summary;
- exact star meanings and some transitions remain unknown;
- heat-clearing behavior has a source conflict;
- weapon and camera icons are visible, but their precise gameplay meaning is not fully established.

**Required action:**
- Make the claim ledger authoritative and assign a stable claim ID to every factual paragraph and diagram.
- Store source URL, publisher, author, date, source type, exact timestamp/page/paragraph, access method, language/translation status and last-reviewed date.
- Add a `supersedes` field for claims replaced by newer evidence.
- Reconcile all manual page counts and evidence-label totals.
- Re-check every chapter against the source ledger before publication.
- Keep pre-release claims marked as pre-release; do not label them as verified gameplay.

**Acceptance:** every published factual block maps to at least one current claim record; stale counts and superseded conclusions are clearly marked.

### P1 — Create a real automated UI regression suite

**Finding:** The docs describe many manual and headless screenshot checks, but explicitly say there are no automated interface tests. Important controls remain untested: copy-link, screen reader, zoom, full keyboard use of map and search filters, and some desktop-only external-link behavior.

**Required action:**
- Add Playwright or an equivalent browser automation suite for the embedded UI.
- Cover every route and the critical user flows, not only screenshots.
- Use stable test IDs and seeded fixture data.
- Run viewport snapshots at 1920×1080, 1366×768, 1280×720, 900×700 and 375×812.
- Add an accessibility pass using axe-core or equivalent plus manual keyboard and screen-reader testing.
- Keep screenshot diffs as evidence, but do not use screenshot capture as a substitute for functional tests.

**Acceptance:** critical route and interaction suite runs automatically and fails on broken navigation, missing content, overflow, console errors, broken media or invalid links.

---

## 5. High-priority gaps and improvements

### 5.1 Accessibility and usability

Not fully evidenced in the current reports:
- screen-reader reading order and landmark structure;
- accessible names for icon-only controls;
- focus management for every modal, menu, media viewer and manual search result;
- full keyboard operation of map, search filters, chapter navigation and copy-link;
- 200% zoom and Windows text scaling;
- contrast in all states, including evidence badges and image overlays;
- reduced-motion behavior for splash and looping hero video;
- captions/transcripts for any future video content.

**Improve:** create a WCAG 2.2 AA checklist, add automated axe checks, and manually test keyboard-only and screen-reader workflows. Respect `prefers-reduced-motion` by default; if the owner intentionally wants video autoplay, make the pause control obvious and persist the preference.

### 5.2 Performance and memory

The performance report is a spot measurement, not a benchmark. It records:
- about 534 MB across six WebView2 processes on Home with video playing;
- WebView2 CPU while the hero loops was not measured;
- the map cache has no automatic pruning;
- cold start and long-session behavior were not measured;
- large galleries and large content libraries need more testing.

**Improve:**
- measure cold and warm startup;
- measure WebView2 CPU/RAM with hero video on/off and while scrolling the gallery;
- lazy-load images and manual pages;
- use responsive image sizes and WebP/AVIF where practical;
- pause offscreen videos and stop decoding when hidden/minimized;
- add an LRU/size cap and cleanup policy for map tiles;
- test 500, 2,500 and 10,000 content entries;
- profile `/api/wiki`, `/api/health`, media hashing and search under realistic data.

### 5.3 Map reliability and attribution

The map relies on a third-party tile source and local caching. The docs say the cache is roughly 360 tiles and is not pruned. Offline failure messaging was not fully tested live.

**Improve:**
- document the tile provider's permitted use, attribution, rate limits and redistribution/cache policy;
- add a cache size cap, LRU pruning and a clear-cache action;
- test first load, warm cache, offline cache hit, offline cache miss, provider outage and malformed tile;
- ensure attribution remains visible at all map sizes;
- record the map data source and confidence of every community pin;
- consider clustering and viewport-based loading before adding thousands of pins.

### 5.4 Data coverage and content depth

The archive explicitly identifies:
- Missions and Collectibles as empty, intentionally;
- Getting Started as in development;
- Weapons & Equipment as in development in an earlier status report, while later asset notes say the chapter now lists three sourced weapons;
- six radio stations recorded, but three preview songs per station are not included;
- classic rock and talk radio mentioned by Rockstar but not named;
- 72 of 73 encyclopedia entries later have images, but many images are illustrative rather than specifically labelled as the named subject.

**Improve in this order:**
1. Reconcile chapter state: Getting Started, Weapons & Equipment, and Reference & Sources.
2. Finish Getting Started with only confirmed controls, interface and terminology.
3. Expand Weapons & Equipment only where Rockstar has named or clearly shown an item; no invented stats.
4. Expand Radio with station names, hosts, genres and credited songs only where source-backed; distinguish preview music from confirmed in-game track lists.
5. Add Missions and Collectibles only after reliable evidence exists; leave empty states when appropriate.
6. Add activities, wildlife, businesses, factions, gameplay systems and locations with consistent source coverage.
7. Audit every image caption: `depicts_subject`, `illustrative`, `evidence_frame`, or `community_map_reference`. Do not let an illustrative screenshot imply that it proves the adjacent text.

### 5.5 Encyclopedia authoring workflow

The docs say there is no in-app editor, no delete/rename/merge workflow, basic CSV handling, and import backups are per-import. This is workable for a small private project but fragile as content grows.

**Improve:**
- add a draft editor or a separate local authoring tool;
- add safe delete, rename and merge commands with redirect/alias handling;
- add schema migration/versioning for wiki and manual JSON;
- add bulk source registration and media manifest validation;
- add duplicate detection for claims and near-duplicate entries;
- support editorial review states: `draft → fact_checked → approved → published`;
- add a changelog for every content edit.

### 5.6 Spoiler and privacy boundaries

The launch-readiness document acknowledges:
- spoiler titles, aliases and tags remain visible/searchable;
- spoiler images may still be served if someone knows the direct URL;
- draft data is hidden in the app but remains in local files;
- Discord Rich Presence can show the title of the page being read.

**Improve:**
- ensure spoiler assets are not served by public static routes until revealed/authorized;
- make spoiler metadata policy explicit;
- let the user disable Discord Rich Presence or suppress spoiler page titles;
- ensure drafts are clearly understood as hidden, not private or encrypted;
- test deep links, search, map pins, thumbnails, page titles and presence for spoiler leakage.

### 5.7 Network and external-service inventory

One report says only map tiles leave the machine. Another regression report says Discord presence is enabled and connected. These may be compatible if Discord Rich Presence is a local IPC integration, but the docs do not reconcile the data flow.

**Improve:** publish a clear network/data-flow table for:
- tile requests;
- Discord IPC/Rich Presence;
- any update checker;
- external links;
- crash reporting (if added);
- future telemetry (prefer none by default).

State what information leaves the device, what stays local, and how to disable each integration.

### 5.8 Windows release and supportability

The archive documents a release executable and WebView2 requirement, but does not provide enough evidence of:
- a clean-machine installer test;
- signing/certificate strategy;
- update and rollback behavior;
- versioned data migrations;
- portable vs installed mode;
- backup/restore of user-edited data;
- crash logs and support bundle;
- upgrade from the previous release.

**Improve:** create a repeatable Windows packaging pipeline, test on a clean Windows account/VM, document WebView2 handling, sign when possible, and provide a safe portable fallback with checksums. If unsigned, explain SmartScreen behavior honestly.

---

## 6. Documentation conflicts to resolve

| Topic | Conflicting/stale records | Required source of truth |
|---|---|---|
| Manual page count | 30 / 31 / 32 pages across reports | Generated from `data/manual.json` at validation time |
| Law Enforcement chapter | 10 / 11 pages | Generated chapter page count |
| Evidence totals | Older 24/13/7/2/1 then rerun 24/12/9/2 etc. | Claim-ledger aggregation |
| Validator warnings | 33 / 45 / 61 | Latest run only, with warning categories |
| Media count | 18 / 33 / 45 / later additions | `data/media.json` + filesystem audit |
| UI test totals | 20 then 53 tests | Current CI test report |
| Chapter state | Weapons marked in development, later three entries added | Current `data/manual.json` |
| Network behavior | Tiles-only statement vs Discord connected | Current data-flow audit |
| Reference UI comparison | One report says not done; later report says spread was viewed and tuned | Final visual QA with exact reference and screenshot comparison |

**Do not delete historical reports.** Mark them historical, add a superseded banner, and link to the generated current-state report.

---

## 7. Recommended priority order

### P0 — Before any public release
1. Current repository baseline and Git history.
2. Media rights and distribution decision.
3. Canonical current-state report and documentation reconciliation.
4. Clean-machine install/launch test and package integrity.
5. Current full test/build/validator run.

### P1 — Release quality
6. Automated Playwright route and interaction tests.
7. Accessibility and keyboard/screen-reader audit.
8. Performance profiling and WebView2 memory/CPU measurement.
9. Map cache lifecycle and provider terms review.
10. Spoiler/draft/Discord privacy audit.

### P2 — Content quality
11. Source ledger and claim-level evidence workflow.
12. Complete Getting Started and Weapons chapters with verified content.
13. Radio/music coverage and accurate image classifications.
14. Add more content only where supported by evidence.

### P3 — Long-term product improvements
15. Local editorial interface and content lifecycle.
16. Search typo tolerance, highlighting and large-index testing.
17. Map clustering and larger POI datasets.
18. Update/rollback, diagnostics and support tooling.

---

## 8. Acceptance criteria for the next milestone

The next milestone is complete only when:

- [ ] Actual source repository is inspected and a clean baseline is recorded.
- [ ] Git repository exists, user changes are preserved, and a tagged/dated backup exists.
- [ ] One generated current-state report is authoritative.
- [ ] Manual chapter/page counts and evidence totals are generated from live data.
- [ ] Every shipped media asset has a documented distribution decision.
- [ ] Every published factual claim has a traceable source and evidence label.
- [ ] All current Rust tests, Clippy, formatter, release build and validator pass.
- [ ] Automated UI tests cover all routes and critical interactions.
- [ ] Accessibility keyboard, screen-reader and zoom checks are recorded.
- [ ] Map offline/cache/provider behavior is tested and documented.
- [ ] WebView2 memory/CPU and cold-start performance are measured.
- [ ] Windows installer/portable package is tested on a clean machine.
- [ ] No known P0/P1 issues remain open.

---

## 9. What I could not verify

Because this RAR contains documentation and screenshots rather than the application source and data, I could not independently verify:
- that the current source files match the implementation logs;
- that the reported 53 tests still pass;
- that the latest validator count is 61 warnings;
- that the current manual has 32 pages or the exact current chapter states;
- that all assets listed in the register are present and referenced correctly;
- that the app launches on a clean machine;
- that the Discord/network behavior matches the written descriptions;
- that the official media terms permit the intended redistribution.

These are explicit follow-up checks, not assumed defects.

---

## 10. Final verdict

**GTA 6 HQ has a strong foundation and a surprisingly mature documentation trail. The clearest missing work is not another visual redesign or a large batch of speculative content. It is release governance: rights clearance, one trustworthy current-state report, automated UI/accessibility testing, performance measurement, offline/map reliability, and a verified Windows distribution path.**

Once those are controlled, continue expanding the manual and encyclopedia through the existing source-first editorial workflow.
