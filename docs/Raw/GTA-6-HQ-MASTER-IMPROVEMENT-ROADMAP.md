# GTA 6 HQ — Master Improvement & Release Roadmap

**Roadmap date:** 2026-11-12  
**Based on:** Documentation audit of `docs(2).rar`  
**Target:** Turn GTA 6 HQ into a reliable, polished, maintainable Windows fan encyclopedia and field manual  
**Execution rule:** Inspect the real repository before changing anything. The uploaded archive did not include source code or live data.

---

## Mission statement

Build on the existing Rust/WebView2 application rather than replacing it. Protect the current working features, establish a trustworthy source of truth, clear distribution risks, automate regression checks, and expand the encyclopedia/manual only with verifiable information.

This roadmap is deliberately ordered by risk. New content and cosmetic polish must not outrank rights, stability, data integrity, or release readiness.

## 0. Operating rules

1. Preserve the current Rust + Axum + Tao/Wry/WebView2 architecture unless measurements demonstrate a real need to change it.
2. Begin every work session by checking Git status, current branch, uncommitted changes, current version and latest test report.
3. Never overwrite user files or existing `CLAUDE.md` / `.claude` configuration without reviewing them.
4. Do not claim a test passed unless it was run in the current checkout and its result recorded.
5. Do not invent GTA VI facts, names, item stats, wanted-level thresholds, police behavior, locations, missions or collectibles.
6. Distinguish official statements, demonstrated footage, preview reporting, interpretation, community research and unknowns.
7. Do not ship media with unresolved rights status in a public distribution package.
8. Do not install dependencies, publish, sign, upload, commit or push without the user's authorization where required.
9. Keep backups and a change log for every data migration and bulk content import.
10. If a task cannot be verified, record it as blocked or unknown instead of silently treating it as complete.

---

# 1. Workstream map

Use specialist agents in parallel only after file ownership is assigned. Main Claude agent coordinates, reviews, and integrates.

| Agent | Role | Primary responsibility |
|---|---|---|
| A | Release & architecture auditor | Source baseline, Git, packaging, runtime, current-state report |
| B | Rights & asset compliance | Asset manifest, provenance, distribution decisions |
| C | QA automation engineer | Playwright, route/interaction tests, regression suite |
| D | Accessibility & UX reviewer | Keyboard, screen reader, zoom, reduced motion, responsive QA |
| E | Performance & reliability engineer | WebView2 profiling, map cache, startup, large-data tests |
| F | Research & editorial lead | Claim ledger, source validation, content coverage |
| G | Manual / encyclopedia content editor | Chapter reconciliation and approved content expansion |

**Ownership rules**
- Agent A owns release and architecture reports.
- Agent B owns rights register and media policy proposals.
- Agent C owns test automation files.
- Agent D owns accessibility findings and fixes, after assigning exact UI file ownership.
- Agent E owns performance measurements and cache work.
- Agent F owns research/source ledger; Agent G may only publish claims after review.
- Main agent owns shared navigation, shared styles, integration and final acceptance.
- No two agents edit the same file concurrently. If the repository cannot support safe parallel work, use sequential tasks.

---

# 2. Phase 0 — Reopen the real project and establish truth

**Priority:** P0  
**Suggested time:** 45–90 minutes  
**Do not proceed to broad edits until complete.**

### Tasks

1. Locate the actual repository root and confirm it is GTA 6 HQ.
2. Inventory `src/`, `ui/`, `data/`, `images/`, `wallpapers/`, `cache/`, build scripts, `Cargo.toml`, README and installer files.
3. Check `git status`, branch, remotes and commit history.
4. If no Git repository exists, create one only after backing up the current working tree and receiving approval if needed.
5. Compare the actual tree against the archive's implementation logs.
6. Run:
   - `cargo fmt --all -- --check`
   - `cargo clippy --all-targets --all-features -- -D warnings`
   - `cargo test`
   - `cargo build --release`
   - `gta6-hq --validate` (or the actual current CLI form)
   - `node --check` for every shipped JavaScript file
7. Launch the real desktop executable and confirm the WebView2 UI.
8. Generate current counts from actual data:
   - encyclopedia entries by category;
   - published/draft/spoiler entries;
   - source count;
   - manual chapters/pages and chapter states;
   - media files and rights states;
   - map pins and tile cache size;
   - test count and validator warnings.

### Deliverables

- `docs/status/CURRENT-STATE.md`
- `docs/status/REPOSITORY-INVENTORY.md`
- `docs/status/BASELINE-TEST-RESULTS.md`
- dated backup / Git baseline
- list of differences between actual source and supplied reports

### Exit gate

No stale report is treated as current. The current checkout, not old documentation, determines the next steps.

---

# 3. Phase 1 — Rights, provenance and distribution decision

**Priority:** P0  
**Suggested time:** 1–2 hours, plus owner decisions

### Tasks

1. Enumerate every media file on disk and compare it with `data/media.json`.
2. Detect missing records, duplicate hashes, unreferenced files, broken paths and stale entries.
3. For every asset, record:
   - filename and SHA-256;
   - creator/rightsholder;
   - exact source URL;
   - retrieval date;
   - licence or permission evidence;
   - allowed uses;
   - attribution text;
   - local-only / public-distribution status;
   - approval owner and review date.
4. Classify assets into:
   - `approved_for_distribution`;
   - `local_personal_use_only`;
   - `permission_requested`;
   - `unknown`;
   - `rejected`.
5. Separate artwork used as factual evidence from artwork used only as illustration.
6. Review user-supplied wallpaper, logo and trailer-derived frames; provenance must be documented rather than assumed.
7. Create a rights-safe package mode that excludes assets not cleared for redistribution.
8. Document tile-provider terms, cache policy, rate limits and attribution.

### Deliverables

- `docs/compliance/MEDIA-RIGHTS-AUDIT.md`
- `docs/compliance/DISTRIBUTION-ASSET-ALLOWLIST.md`
- updated `data/media.json`
- `scripts/audit-media.*` or equivalent validator extension
- a rights-safe build option

### Exit gate

Every asset in a public release package is explicitly approved for that use. No unknown or permission-required asset is silently bundled.

---

# 4. Phase 2 — Documentation and data-source reconciliation

**Priority:** P0/P1  
**Suggested time:** 1–2 hours

### Known reconciliation tasks

The supplied documents contain historical values:
- manual: 30, 31 and 32 pages;
- law-enforcement chapter: 10 and 11 pages;
- validator warnings: 33, 45 and 61;
- different evidence-label totals;
- Weapons & Equipment described as in development in one report, but later asset notes show three entries;
- tile-only network statement versus Discord Rich Presence being connected.

### Tasks

1. Generate manual chapter/page counts from the live manual data.
2. Generate evidence-label totals from the claim ledger or manual blocks.
3. Generate media counts and rights warnings from actual files and manifest.
4. Generate test counts from the current test runner.
5. Reconcile network behavior, including Discord Rich Presence and any external integrations.
6. Add a banner to old reports: `HISTORICAL — SUPERSEDED BY docs/status/CURRENT-STATE.md`.
7. Keep historical records; do not erase research history.
8. Update README and the docs index so there is one clear starting point.

### Deliverables

- `docs/status/CURRENT-STATE.md`
- `docs/status/REPORT-INDEX.md`
- `docs/status/DATA-AND-MANUAL-COUNTS.md`
- `docs/architecture/NETWORK-AND-PRIVACY.md`

### Exit gate

A new developer or agent can identify the current state without reconciling contradictory reports manually.

---

# 5. Phase 3 — Automated UI testing and regression protection

**Priority:** P1  
**Suggested time:** 2–4 hours for a first reliable suite

### Tasks

1. Add Playwright or a compatible browser automation framework.
2. Create deterministic test fixtures and stable test IDs.
3. Test every route:
   - Home;
   - Encyclopedia;
   - A–Z;
   - entry detail;
   - Characters;
   - Locations;
   - Vehicles;
   - Map;
   - Media;
   - Search;
   - Intel;
   - Manual;
   - unknown route / fallback.
4. Test core flows:
   - splash skip via Enter/Esc after other keys;
   - navigation and active state;
   - search, category filters, no results, apostrophe/alias matching;
   - map pin opens correct entry;
   - map filter and popup;
   - media viewer, Escape, focus return;
   - manual TOC, page turn, deep link, search, copy link, page memory;
   - night mode;
   - spoiler reveal/hide and search exclusion;
   - draft exclusion;
   - external links open outside the app.
5. Capture visual snapshots at 1920×1080, 1600×900, 1366×768, 1280×720, 900×700 and 375×812.
6. Fail tests on browser console errors, missing assets, invalid image dimensions or sideways overflow.
7. Run the browser suite against the same built UI served by the actual Rust app where possible.

### Deliverables

- `tests/ui/` or equivalent
- `playwright.config.*`
- `docs/qa/UI-AUTOMATION.md`
- CI workflow or documented local command

### Exit gate

A single documented command runs the core UI regression suite and catches critical route/interaction failures.

---

# 6. Phase 4 — Accessibility and responsive quality

**Priority:** P1  
**Suggested time:** 2–3 hours for first pass

### Tasks

- Add semantic landmarks, heading order and skip links.
- Verify accessible names for all icon-only buttons.
- Test keyboard-only navigation across all pages.
- Test map controls, filters, manual navigation and media viewer without a mouse.
- Verify focus trapping and focus return for all dialogs/lightboxes.
- Test screen reader reading order and labels.
- Test browser zoom to 200% and Windows text scaling.
- Check contrast for normal, hover, active, disabled and evidence-label states.
- Respect reduced-motion preference for splash and hero video; retain a clear pause/play control.
- Add captions/transcripts for any future video/audio material.
- Test touch targets and responsive behavior on narrow widths.

### Deliverables

- `docs/qa/ACCESSIBILITY-AUDIT.md`
- fixes to UI semantics and focus management
- axe-core or equivalent automated accessibility check

### Exit gate

No critical keyboard trap, missing control label, unreadable text, or inaccessible modal remains. Screen-reader and zoom results are documented.

---

# 7. Phase 5 — Performance and map reliability

**Priority:** P1  
**Suggested time:** 2–4 hours

### Baseline measurements

Measure:
- cold launch to first meaningful paint;
- warm launch;
- WebView2 memory and CPU with Home video on/off;
- scrolling the Media page;
- loading the Manual and large chapter;
- search at 100, 500, 2,500 and 10,000 entries;
- `/api/wiki`, `/api/search`, `/api/media`, `/api/health`;
- map first load, warm-cache load and cache size growth.

### Tasks

1. Add lazy loading for below-the-fold images and manual content.
2. Generate responsive thumbnails rather than serving large 1920×1080 originals everywhere.
3. Pause offscreen video and release media resources when hidden/minimized.
4. Profile video decoding and reduce simultaneous video playback.
5. Add a map tile cache cap and LRU pruning.
6. Add clear-cache action and cache diagnostics.
7. Test offline behavior:
   - no cached tiles;
   - partially cached map;
   - fully cached map;
   - provider outage;
   - malformed tile response.
8. Review the map provider's caching and attribution rules.
9. Add large-data tests for map pins and encyclopedia list rendering.
10. Optimize only after measurements identify the bottleneck.

### Deliverables

- `docs/performance/PERFORMANCE-BASELINE.md`
- `docs/performance/PERFORMANCE-AFTER.md`
- map cache policy and tests
- image/video loading improvements

### Exit gate

Measured cold/warm startup, memory/CPU and map cache behavior are within documented budgets. No unbounded cache growth remains.

---

# 8. Phase 6 — Editorial and content expansion

**Priority:** P2  
**Suggested time:** ongoing, in source-backed batches

### 8.1 Canonical research pipeline

For every new fact:
1. Find the primary source first.
2. Capture URL, title, publisher, author, date and retrieval date.
3. Record exact paragraph, timestamp or screenshot identifier.
4. Write the claim in original wording.
5. Assign evidence type: `official-stated`, `demonstrated`, `preview-reported`, `community`, `interpretation`, `unknown`, or `verified-after-release`.
6. Add uncertainty and conflicting-source notes.
7. Independent fact-check before publication.
8. Import as draft.
9. Run validator.
10. Publish only after review.

### 8.2 Manual chapter reconciliation and expansion

First reconcile actual state for:
- How to Read This Manual;
- Getting Started;
- Leonida & Vice City;
- Characters;
- Vehicles;
- Activities;
- Law Enforcement;
- Weapons & Equipment;
- Reference & Sources.

Then prioritize:
1. **Getting Started:** verified controls, UI, terminology and known setup information only.
2. **Weapons & Equipment:** names and descriptions only where Rockstar has named or clearly shown them; no invented damage, recoil, ammo capacity or stats.
3. **Radio & Music:** named stations, hosts, genres and preview song credits with explicit status.
4. **Activities:** distinguish demonstrated activity from inferred activity and distinguish a screenshot illustration from proof.
5. **Police & Heat:** preserve the existing unknown list and update only when new primary evidence appears.
6. **Locations and businesses:** sourced names, region associations and carefully labelled community map positions.
7. **Missions and collectibles:** keep empty until reliable evidence exists; do not fill for visual completeness.

### 8.3 Encyclopedia coverage

Review categories already described in the project:
- characters;
- locations and districts;
- vehicles;
- weapons;
- wildlife;
- activities;
- businesses;
- factions;
- gameplay systems;
- music and radio;
- missions;
- collectibles;
- points of interest.

For each category, define required fields and source expectations. Unknown values remain empty.

### 8.4 Image classification

Each image should be explicitly tagged:
- `evidence_frame`;
- `official_illustration`;
- `illustrative_only`;
- `community_reference`;
- `owner_supplied_unverified`.

Captions must say what the image actually shows. Do not use a picture of a similar object as proof of a named item.

### Deliverables

- `docs/editorial/CLAIM-LEDGER.md` or structured claim data
- reconciled `data/manual.json`
- source-backed encyclopedia batches
- updated `docs/manual/CONTENT-STATUS.md`
- image-to-entry evidence mapping

### Exit gate

No new factual content is published without source IDs, evidence status, verification date and independent review for sensitive mechanics.

---

# 9. Phase 7 — Authoring tools and data lifecycle

**Priority:** P2  
**Suggested time:** 3–6 hours

### Tasks

1. Add a local-only editorial interface or companion tool.
2. Support create/edit/delete/rename/merge with validation.
3. Preserve aliases and redirects when slugs change.
4. Add schema versioning and safe migrations for wiki and manual JSON.
5. Add source registry management.
6. Add media import staging, hash duplicate detection, thumbnail generation and rights review.
7. Add review states: `draft → fact_checked → approved → published`.
8. Add content change history and restore.
9. Improve CSV import with validation, encoding handling and clear row-level errors.
10. Add bulk import dry-run and rollback tests.

### Deliverables

- local authoring tool;
- schema migration tests;
- editorial workflow docs;
- media staging/import workflow.

### Exit gate

Routine content additions no longer require fragile hand edits, and all edits can be validated, reviewed and rolled back.

---

# 10. Phase 8 — Windows release, installer and support

**Priority:** P0/P1 before public distribution  
**Suggested time:** 2–4 hours plus clean-machine validation

### Tasks

1. Define version number and release channel.
2. Build release artifacts reproducibly.
3. Test on a clean Windows 11 user account or VM.
4. Verify WebView2 runtime behavior and install guidance.
5. Test portable folder layout and installed layout.
6. Review code signing certificate options; if unsigned, document SmartScreen behavior.
7. Add SHA-256 checksums for release artifacts.
8. Add safe backup/restore for user-created content.
9. Add crash/startup diagnostics that do not upload data.
10. Add update and rollback strategy, or explicitly state that updates are manual.
11. Test upgrade from the previous release.
12. Produce a public release checklist and known-issues page.

### Deliverables

- `docs/release/RELEASE-CHECKLIST.md`
- `docs/release/INSTALL-WINDOWS.md`
- reproducible package
- checksums
- clean-machine test report

### Exit gate

The app installs and launches from a clean machine, preserves user data on upgrade, and has a documented recovery path.

---

# 11. Suggested execution schedule

This is a milestone sequence, not a promise that all work fits in one session.

| Sprint | Focus | Required output |
|---|---|---|
| Sprint 1 | Baseline, Git, docs reconciliation | Current-state report and clean test baseline |
| Sprint 2 | Rights and distribution | Approved asset allowlist and rights-safe package |
| Sprint 3 | UI automation | Playwright regression suite |
| Sprint 4 | Accessibility | Keyboard/screen-reader/zoom report and fixes |
| Sprint 5 | Performance/map | Measured profile, bounded cache, offline tests |
| Sprint 6 | Editorial pipeline | Claim ledger and reconciled manual status |
| Sprint 7 | Content expansion | Getting Started, Weapons, Radio and other verified chapters |
| Sprint 8 | Authoring and release | Content tools, Windows installer, clean-machine report |

### Recommended next work session

Do **Sprint 1 + the first half of Sprint 2**. Do not begin with a broad content expansion. The first deliverable should be a truthful current-state report from the actual repository, followed by a media distribution decision.

---

# 12. Definition of done

GTA 6 HQ is ready for a stable public release when:

- [ ] Current source, data and docs are under version control.
- [ ] Current-state counts are generated automatically.
- [ ] No stale report is mistaken for current status.
- [ ] All public-bundle assets have approved distribution status.
- [ ] All factual entries have traceable sources and evidence labels.
- [ ] Police/Heat claims preserve uncertainty and do not invent mechanics.
- [ ] Rust formatting, Clippy, tests, release build and validator pass.
- [ ] Automated UI tests cover routes and critical flows.
- [ ] Accessibility testing is complete and documented.
- [ ] Responsive layouts are verified at desktop and mobile widths.
- [ ] WebView2 CPU/RAM and startup are measured.
- [ ] Map cache is bounded and offline behavior is tested.
- [ ] Spoiler and draft leaks are tested across search, map, thumbnails, direct URLs and Discord presence.
- [ ] Windows install/upgrade/rollback has been tested on a clean machine.
- [ ] Release notes, checksums, known issues and support instructions exist.

---

# 13. Final instruction to the implementation agent

Start by inspecting the actual repository. The supplied documentation archive is not the source tree. Do not assume the reports' counts are current. Generate a new baseline from the current code and data, reconcile the documentation, and identify the exact files that need work.

Then execute the roadmap in priority order. Protect existing functionality, keep media rights explicit, automate regression tests, and only then expand content. Every completed phase must include changed files, test commands and real results, screenshots where relevant, unresolved risks, and a clear next step.

**The goal is not simply a larger GTA 6 HQ. The goal is a trustworthy, visually polished, fast, accessible, legally cautious, maintainable desktop encyclopedia that can grow without losing accuracy or stability.**
