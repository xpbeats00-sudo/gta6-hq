# GTA 6 HQ --- Claude 6-Hour Autonomous Research, Audit & Implementation Mission

**Mission:** Research, verify, design, build, and integrate the GTA VI
in-app Field Manual, prioritizing the law-enforcement / wanted / Heat
system chapter.

**Execution environment:** Claude Code inside the existing GTA 6 HQ
repository\
**Reasoning setting:** Medium effort (use the user's selected Claude
model and Medium effort where available)\
**Time budget:** 6 hours maximum\
**Execution style:** Autonomous, parallel specialist agents,
evidence-first research, incremental implementation, continuous
verification\
**Primary deliverable:** A working Field Manual integrated into the
current app, not just another design document.

------------------------------------------------------------------------

## 0. Mission rules --- read first

You are operating in the user's existing GTA 6 HQ project. The project
is a Rust desktop application with an embedded web UI. The existing app
already contains Home, Encyclopedia, Characters, Locations, Vehicles,
Map, Media, and Intel features. Confirm the actual repository state
before relying on these claims.

### Non-negotiable requirements

1.  **Research before writing factual content.** The purpose is to learn
    what is actually known about GTA VI, not to invent plausible GTA
    mechanics.
2.  Use primary sources first: Rockstar footage/material and direct
    developer interviews. Use reputable preview reporting only when it
    clearly identifies its source and context.
3.  Separate direct demonstration, developer statements, preview
    reporting, interpretation, and unknown information.
4.  Do not treat GTA V, GTA IV, RDR2, leaks, fan theories, wiki
    speculation, AI-generated summaries, or copied guide pages as proof
    of GTA VI mechanics.
5.  Do not fabricate star thresholds, timers, search radii, police spawn
    rules, AI perception ranges, vehicle response tiers, or exact
    Heat-clearing formulas.
6.  Preserve the existing Rust/WebView application and all working
    functionality. Do not create a replacement app or migrate frameworks
    without a demonstrated technical reason.
7.  Build the manual as an integrated feature using the existing project
    conventions and data model where practical.
8.  Agents may work in parallel, but they must not edit the same files
    concurrently. Assign file ownership and integrate through reviewed
    patches.
9.  Do not install packages, run destructive commands, change user data,
    publish/deploy, or commit/push without authorization.
10. Never claim a build, test, source check, or UI behavior succeeded
    unless it was actually executed and observed.
11. If browsing is unavailable, record that limitation and work only
    from the sources already present. Do not invent research.
12. If the six-hour window expires, stop safely, preserve working
    changes, and write an honest handoff report.

### Success definition

At the end of six hours: - The app has a usable **MANUAL**
destination. - The reader supports a printed-guide-inspired layout. -
The first substantive chapter, **Law Enforcement & the Heat System**, is
implemented with source-backed content. - Every factual claim has a
traceable source and evidence label. - Existing app features still
work. - Tests/build/visual QA have actual recorded results. - A clear
report distinguishes completed work from unfinished work.

------------------------------------------------------------------------

# 1. Parallel agent structure

Use Claude Code subagents / Agent Teams if available. If parallel agents
are unavailable in the current environment, execute the same workstreams
sequentially and record that limitation.

## Agent A --- Primary-source research lead

**Mission:** Establish the factual baseline for GTA VI police, wanted
levels, Heat, identification, search, and evasion.

**Owns:** - `docs/manual/research/PRIMARY-SOURCE-REGISTER.md` -
`docs/manual/research/MECHANICS-EVIDENCE-MATRIX.md` -
`docs/manual/research/UNKNOWN-MECHANICS.md`

**Tasks:** 1. Locate the official Rockstar GTA VI Extended Look and
relevant official footage. 2. Locate the direct IGN interview with
Rockstar North co-studio head Rob Nelson (October 2026 interview) and
any directly attributable interview transcript. 3. Capture source title,
publisher, author/interviewee, date, URL, and exact relevant section or
timestamp. 4. Record the exact mechanics described and whether they are
spoken by a Rockstar representative or inferred from gameplay. 5.
Cross-check each proposed claim against at least one primary source. 6.
Identify conflicts between secondary guides and the primary interview.
Primary source wins. 7. Produce a claim-by-claim matrix, not a general
prose summary.

**Do not:** - Copy complete articles. - Use leaks or unattributed social
posts as fact. - Treat screenshots with fan annotations as official UI
evidence. - Guess at exact internal AI behavior.

## Agent B --- Independent fact-checker / adversarial reviewer

**Mission:** Try to disprove or downgrade every proposed claim in the
police chapter.

**Owns:** - `docs/manual/research/FACT-CHECK-REPORT.md` - Review
comments / issue list for manual content

**Tasks:** 1. Independently inspect the primary-source register from
Agent A. 2. Check whether the source actually supports each sentence. 3.
Flag overstatements, hidden assumptions, contradictions, and GTA V
carryovers. 4. Distinguish what the developer explicitly says from what
the preview footage merely appears to show. 5. Mark uncertain claims as
`UNKNOWN` or `INTERPRETATION`. 6. Verify that countermeasures are not
described as universal unless the source says so. 7. Check exact
terminology. If sources use different terms, explain the difference
rather than inventing a single official label.

**Required output:** A red-team report with `PASS`, `DOWNGRADE`,
`REMOVE`, or `NEEDS SOURCE` for each claim.

## Agent C --- App architecture and integration auditor

**Mission:** Inspect the real codebase and plan the safest integration
path for the manual.

**Owns:** - `docs/manual/IMPLEMENTATION-AUDIT.md` -
`docs/manual/FILE-OWNERSHIP.md`

**Tasks:** 1. Inspect Rust entry point, WebView setup, UI entry point,
CSS/JS structure, routes, local data conventions, and asset paths. 2.
Run baseline build/tests before edits. 3. Identify existing navigation
and determine the smallest safe way to add `MANUAL`. 4. Identify whether
a content schema or reusable article renderer already exists. 5. Map all
existing routes and record regression-sensitive features. 6. Recommend
file-level changes; do not perform broad refactors. 7. Define
shared-file ownership and integration boundaries for Agent D.

**Must preserve:** Home, Encyclopedia, Characters, Locations, Vehicles,
Map, Media, Intel, search, splash screen, local assets, and existing
Rust behavior.

## Agent D --- Manual UI / implementation engineer

**Mission:** Build the Manual reader and integrate the verified first
chapter.

**Owns (unless the architecture audit identifies different files):** -
New manual UI components. - Manual-specific CSS. - Manual-specific data
files. - Minimal navigation integration, only after Agent C assigns the
exact file.

**Tasks:** 1. Implement the `MANUAL` navigation destination. 2. Build a
book-like reader inspired by the supplied GTA IV manual spread: - warm
white/off-white paper, - dark ink, - olive/lime accent, - thin
horizontal rules, - dotted dividers, - running chapter labels, - large
numbered entries, - image figures and captions, - page numbers and
footers, - serif italic introductions, - condensed display headings. 3.
Support two-page spreads on wide desktop windows and one-page mode on
narrower windows. 4. Add table of contents, previous/next page
navigation, chapter search, and last-read persistence. 5. Add a
night-reading toggle as a secondary option. 6. Implement the
law-enforcement chapter using only claims approved by Agent B. 7. Add
visible evidence labels and source footnotes. 8. Use placeholders where
assets/rights are unclear. Do not scrape or reuse copyrighted manual
scans as GTA VI artwork. 9. Keep the manual self-contained so the
existing app's theme and map controls are not broken.

## Agent E --- QA, accessibility, and performance

**Mission:** Verify the new feature and protect the existing app.

**Owns:** - `docs/manual/QA-TEST-RESULTS.md` -
`docs/manual/REGRESSION-REPORT.md` - Screenshot evidence folder if the
project has one

**Tasks:** 1. Establish baseline commands from repository scripts and
Cargo configuration. 2. Test Manual navigation, contents, page turns,
responsive spread behavior, theme toggle, search, and persistence. 3.
Test keyboard navigation and focus handling. 4. Test reduced-motion
behavior if motion is used. 5. Check missing images, broken source
links, console errors, and Rust runtime errors. 6. Test existing Home,
Encyclopedia, Characters, Locations, Vehicles, Map, Media, Intel, and
global search. 7. Run formatter, lint, unit tests, and production build
where supported. 8. Capture before/after screenshots at the same desktop
viewport. 9. Report failures precisely. Do not silently patch unrelated
features.

### Coordination rules

-   Agent A and Agent B may research in parallel.
-   Agent C audits architecture in parallel with A/B.
-   Agent D may create isolated UI scaffolding after Agent C identifies
    boundaries, but must not publish factual chapter text until Agent B
    approves it.
-   Agent E begins with baseline QA, then tests the integrated feature.
-   The main agent owns integration, conflict resolution, final
    decisions, and final report.
-   No two agents may concurrently edit the same file.
-   Agents must return concise findings, exact source URLs, file paths,
    test commands, and blockers.

------------------------------------------------------------------------

# 2. Research protocol --- learn the true mechanics

## 2.1 Source hierarchy

Use this priority order:

1.  **Official Rockstar footage and official Rockstar material.**
2.  **Direct interview statements from Rockstar developers**, with exact
    attribution and publication date.
3.  **Hands-on preview reporting** where the author personally saw a
    build and explains what was shown.
4.  **Reputable secondary analysis** only for leads or cross-checks,
    never to override a primary source.
5.  **Community posts, fan wikis, leaks, speculation, AI summaries:**
    discovery leads only; not acceptable as evidence for factual manual
    copy.

### Initial research leads to verify

These are starting points, not automatic approval. Reopen and inspect
the actual pages/video before using a claim.

-   Rockstar Games official GTA VI page:
    https://www.rockstargames.com/VI
-   IGN, *GTA 6: The Big Interview* (October 7, 2026; direct interview
    with Rob Nelson):
    https://tech.yahoo.com/gaming/articles/gta-6-big-interview-123000402.html
-   IGN video, *In GTA 6 You're Not Just Wanted, You're Hunted ---
    Rockstar Explains* (August 27, 2026):
    https://www.youtube.com/watch?v=LCMjZPWoVUw
-   GamesRadar+ coverage of Rob Nelson's comments:
    https://www.gamesradar.com/games/grand-theft-auto/rockstar-boss-says-gta-6s-police-can-be-harder-to-shake-off-than-before-but-its-fun-because-it-forces-you-to-think-more/
-   Famitsu / direct Rob Nelson interview should be located and checked
    if accessible.

The direct IGN interview transcript is particularly important because it
includes detailed statements about: - police knowing the player's
appearance and clothing; - changing hair versus changing the outfit; -
clothing changes from a store or the personal vehicle's trunk; - a local
search/Heat area that can remain relevant after the immediate chase; -
waiting for the area to cool down; - splitting Jason and Lucia; - moving
on foot through alleys when driving is difficult; - the reported
three-star city scenario shown in the preview; - vehicle alarms,
trackers, and the in-game phone scanner (related crime/vehicle systems).

Do not copy these notes directly into final content until the interview
is reopened and checked in context.

## 2.2 Evidence labels

Every factual paragraph, table row, image caption, and diagram needs one
of these labels:

  --------------------------------------------------------------------------
  ID                         Label                   Meaning
  -------------------------- ----------------------- -----------------------
  `DEMONSTRATED`             Demonstrated            Clearly visible in
                                                     official footage;
                                                     describe only what is
                                                     visibly shown

  `DEVELOPER-DESCRIBED`      Developer-described     Explicitly stated by a
                                                     named Rockstar
                                                     developer

  `PREVIEW-REPORTED`         Preview-reported        Reported by a
                                                     journalist who
                                                     personally viewed a
                                                     preview build

  `INTERPRETATION`           Interpretation          Reasonable analysis,
                                                     not an established rule

  `UNKNOWN`                  Unknown                 Not established by
                                                     reviewed evidence

  `VERIFIED-AFTER-RELEASE`   Verified after release  Directly tested in the
                                                     public release, with
                                                     version/build and test
                                                     method recorded
  --------------------------------------------------------------------------

Do not collapse these into a single "confirmed" badge.

## 2.3 Police / Heat research checklist

Investigate each topic separately. Do not assume one answer applies to
every mission or wanted level.

### A. Wanted level

-   Does the six-position / six-star display appear in footage?
-   What does the developer say about wanted levels and police
    aggression?
-   Are exact crime-to-star thresholds published? If not, mark unknown.
-   Are response types mapped to exact stars? If not, do not invent a
    ladder.

### B. Crime reporting and detection

-   What does the developer say about witnesses?
-   What does the developer say about alarms?
-   Are cameras, vehicle trackers, or other reporting systems explicitly
    demonstrated or described?
-   Does the source say all crimes require witnesses or alarms, or only
    describe the showcased scenario?
-   Distinguish the incident being noticed from the police identifying
    the suspect.

### C. Heat / identifying information

Research every reported clue independently: - appearance / face; -
clothing / outfit; - vehicle; - weapon; - CCTV / recorded evidence; -
Jason and Lucia travelling together / companion identification.

For each clue record: - exact source; - what is shown or said; - whether
a corresponding HUD icon is visible; - what action is described as
addressing it; - what remains unknown.

### D. Pursuit and search

-   What does the developer say about persistent police memory?
-   Is losing line of sight equivalent to clearing Heat? Avoid assuming
    so.
-   What is the demonstrated relationship between wanted stars and the
    search/Heat area?
-   What does the developer say about a local area remaining risky?
-   What exact rules are unknown: radius, decay timer, boundary,
    re-entry, star interaction?

### E. Police detection / Focus

-   What does the direct source say about Focus?
-   What is shown about police visibility on the minimap?
-   Does Focus reveal officers through walls, or is that only secondary
    reporting?
-   Do not invent Focus range, duration, cooldown, or detection rules.

### F. Evasion options

Check evidence for: - changing the full outfit; - changing hair; -
changing hat/glasses; - using spare outfits in a personal vehicle; -
changing vehicles; - separating Jason and Lucia; - going on foot / using
alleys; - waiting for a search area to cool down; - masks / face
coverings; - handling CCTV; - stashing or changing weapons.

For each, distinguish developer statement from preview observation and
third-party interpretation. Do not claim an action "clears Heat
instantly" unless explicitly supported.

### G. Police response and consequences

-   Police vehicle roster.
-   Helicopters, tactical units, roadblocks, or other escalation.
-   Arrest / Busted state.
-   What happens to money, weapons, vehicle, mission progress, and
    partner.
-   Mission-specific exceptions.
-   Any online-mode behavior.

Do not create a complete police response chart unless sources actually
support it.

## 2.4 Claim ledger format

Every claim must be recorded in a table with:

  -------------------------------------------------------------------------------
  Claim ID   Proposed   Exact       Evidence   Confidence   Allowed    Unknowns
             claim      source /    type                    wording    
                        timestamp                                      
  ---------- ---------- ----------- ---------- ------------ ---------- ----------

  -------------------------------------------------------------------------------

A source is not sufficient just because its headline mentions the
mechanic. Verify the relevant paragraph or timestamp.

------------------------------------------------------------------------

# 3. Six-hour execution schedule

Time budget is strict. The lead agent should coordinate in parallel and
protect the final QA window.

## Hour 0:00--0:30 --- Repository baseline and delegation

**Main agent** - Inspect repository structure and git status. - Confirm
working directory and branch. - Run baseline build/tests. - Create a
safe work branch or worktree if available. - Assign agent file
ownership. - Record the current UI screenshot.

**Agents** - A starts primary-source research. - B starts independent
source review. - C maps architecture and current routes. - E runs
baseline QA. - D waits for UI boundaries or creates isolated component
scaffolding only.

**Checkpoint:** Baseline report exists; no existing functionality
changed.

## Hour 0:30--1:30 --- Parallel research and architecture audit

**Agent A** - Build source register and initial claim ledger.

**Agent B** - Verify sources independently and identify unsupported
assumptions.

**Agent C** - Finish file-level implementation plan and ownership map.

**Agent E** - Record existing test commands and regression-sensitive
pages.

**Main agent** - Review source quality and architecture findings. -
Decide the smallest safe implementation path.

**Checkpoint:** No unverified claim is allowed into the manual's
published data.

## Hour 1:30--2:15 --- Content approval and UI foundation

**Research** - Resolve disagreements between A/B. - Approve only
source-backed claims. - Create an explicit unknowns list.

**Implementation** - Add Manual route/navigation. - Build reader shell,
paper theme, page spread, page header/footer. - Add contents and page
navigation. - Use placeholder text/data until approved content is ready.

**Checkpoint:** Manual opens inside the app; existing routes still work.

## Hour 2:15--3:45 --- Build the law-enforcement chapter

Implement the highest-value sections first:

1.  Wanted display and six-position observation.
2.  Crime reporting: witnesses and alarms.
3.  Heat and identifying clues.
4.  Wanted state versus retained identifying information.
5.  Local search / Heat area.
6.  Focus and police detection.
7.  Evasion options supported by developer comments.
8.  Unknown mechanics / what has not been established.

Each page needs: - concise editorial copy; - evidence status; - source
footnote; - screenshot or clearly labelled explanatory illustration; -
no invented numeric values.

**Checkpoint:** The first complete chapter can be read from beginning to
end.

## Hour 3:45--4:30 --- Reader polish and content integrity

-   Complete two-page and single-page responsive behavior.
-   Add search, contents navigation, and last-read persistence.
-   Add night-reading mode if it does not threaten the core deliverable.
-   Add source links and evidence labels.
-   Run Agent B's final adversarial content review.
-   Remove or downgrade every claim that fails.

**Checkpoint:** No known unsupported police claim remains in the
published chapter.

## Hour 4:30--5:30 --- Integration and regression testing

-   Integrate agent work.
-   Resolve merge conflicts carefully.
-   Run formatting, lint, unit tests, and production build.
-   Test Manual controls and responsive layout.
-   Re-test existing pages and map/media behavior.
-   Fix only issues within scope or clear regressions caused by this
    change.

**Checkpoint:** Build and tests have actual results recorded; no
critical regression.

## Hour 5:30--6:00 --- Final QA, documentation, and handoff

-   Capture before/after screenshots.
-   Verify source links and source dates.
-   Complete unknown mechanics list.
-   Write final QA report.
-   Record incomplete tasks and blockers.
-   Leave repository in a clean, understandable state.
-   Do not rush risky late changes just to claim completion.

**Checkpoint:** A truthful handoff is ready.

------------------------------------------------------------------------

# 4. Required app implementation

## 4.1 Manual navigation and reader

Create a top-level **MANUAL** destination without removing or renaming
current navigation items.

Reader features: - manual cover / landing page; - table of contents; -
chapter list; - two-page spread on wide windows; - single-page mode on
narrower windows; - previous / next page controls; - page number and
chapter running header; - local last-read persistence; - chapter
search; - source links / footnotes; - paper and night reading themes.

## 4.2 Visual direction

Use the supplied GTA IV manual spread as a layout reference, not as a
source of GTA VI facts or reusable artwork.

Suggested design tokens:

``` css
:root {
  --manual-paper: #f7f6f0;
  --manual-paper-edge: #e9e6dc;
  --manual-ink: #191919;
  --manual-muted: #69675f;
  --manual-rule: #292929;
  --manual-dotted-rule: #9a978d;
  --manual-accent: #a8c45a;
  --manual-link: #536d2e;

  --manual-page-max-width: 720px;
  --manual-page-gutter: 28px;
}
```

Use: - condensed display headings; - serif italic chapter
introductions; - readable body copy; - large numbered entries; - thin
horizontal rules; - dotted separators; - image captions; - discreet page
footers.

Avoid copying Rockstar or GTA IV manual logos, exact typography files,
or copyrighted manual artwork.

## 4.3 Data-driven content

Use the existing JSON/content conventions if suitable. Avoid introducing
a new framework without need.

Suggested chapter schema:

``` json
{
  "id": "law-enforcement",
  "title": "Law Enforcement",
  "subtitle": "Wanted Levels & Heat",
  "chapterNumber": 7,
  "pages": [
    {
      "id": "heat-overview",
      "pageNumber": 42,
      "title": "What Police Know",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Approved source-backed text goes here.",
          "evidenceStatus": "developer-described",
          "sourceIds": ["ign-rob-nelson-interview-2026"]
        }
      ]
    }
  ]
}
```

Adapt this to the real project architecture. Validate all content at
load time and show a safe fallback if an asset or source is missing.

------------------------------------------------------------------------

# 5. Required documentation outputs

Create these files:

``` text
docs/manual/
├── IMPLEMENTATION-AUDIT.md
├── IMPLEMENTATION-PLAN.md
├── CONTENT-STATUS.md
├── QA-TEST-RESULTS.md
├── REGRESSION-REPORT.md
├── FINAL-6-HOUR-REPORT.md
└── research/
    ├── PRIMARY-SOURCE-REGISTER.md
    ├── MECHANICS-EVIDENCE-MATRIX.md
    ├── FACT-CHECK-REPORT.md
    └── UNKNOWN-MECHANICS.md
```

### Final report must contain

1.  Executive summary.
2.  What was researched and from which primary sources.
3.  The exact police / Heat mechanics included.
4.  Evidence status for every major mechanic.
5.  Mechanics deliberately left unknown.
6.  UI and app features implemented.
7.  Files added and modified.
8.  Agent work completed and integration notes.
9.  Build/test commands and actual outputs.
10. Before/after screenshots.
11. Regressions found and their status.
12. Remaining work and next recommended phase.
13. Confirmation that no unsupported claims were presented as facts.

------------------------------------------------------------------------

# 6. Stop conditions and safety rails

Stop and report instead of guessing if: - the repository is not the
expected GTA 6 HQ project; - the current branch contains uncommitted
user changes that may be overwritten; - the build is already broken and
the cause is outside this task; - a source is inaccessible or a claim
cannot be verified; - agents conflict over facts and primary evidence
does not resolve it; - a required asset has unclear usage rights; -
implementation requires destructive migration or replacing core
architecture; - a test would require launching external services,
modifying user data, or spending money.

Do not: - delete user files; - overwrite existing `CLAUDE.md`,
`.claude/`, or project configuration without reviewing them; - install
random Marketplace plugins or MCP servers; - publish the app or upload
user data; - commit or push without permission; - claim six hours of
work if execution stopped early.

------------------------------------------------------------------------

# 7. Final instruction to Claude

Start now. Use the six-hour budget as a focused autonomous mission.

First inspect the real GTA 6 HQ repository, establish a baseline, and
launch the parallel research, fact-check, architecture, and QA agents.
Research the actual GTA VI police and Heat mechanics from primary
sources before writing the manual. Build and integrate the reader in the
existing application while the research agents work. Only publish
factual content after adversarial review.

Prioritize a small, complete, verified manual chapter over a large
collection of speculative pages. Keep the app stable. At the six-hour
limit, stop safely and provide the full final report with evidence,
screenshots, tests, unknowns, and unfinished work.

**The goal is not to make the manual sound convincing. The goal is to
make it accurate, traceable, readable, and genuinely integrated into GTA
6 HQ.**
