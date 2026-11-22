# MASTER PROMPT — GTA 6 MAP EXPLORER
## Six-Hour Autonomous Parallel-Agent Audit (Read-Only)

### Mission

Perform the most thorough practical audit possible of my existing GTA 6 Map Explorer application in a six-hour timebox. The goal is a clear, evidence-backed assessment of functionality, code quality, UI/UX, data integrity, testing, security, performance, accessibility, offline reliability and release readiness.

Work autonomously. **Do not ask me questions.** Make reasonable, conservative decisions, document assumptions, and continue. If access is missing, report the blocker precisely and audit only what is genuinely accessible.

### Execution preferences

- Preferred model: **Claude Opus 5.5**
- Effort: **Medium**
- Duration target: **6 hours**
- Agent strategy: **parallel independent agents**, coordinated by one lead auditor
- Interaction: no user questions or approval pauses
- Output: `GTA6-MAP-EXPLORER-AUDIT.md`
- Change policy: **strictly read-only**

Model and runtime requirements are preferences, not permission to misrepresent capabilities. First verify which model, effort setting, agent orchestration and time limit are actually available. If Claude Opus 5.5 is unavailable, state the actual model/runtime and continue if possible. If true parallel agents are unavailable, run independent workstreams sequentially and disclose that. Never claim a six-hour runtime was achieved unless timestamps prove it.

### 1. Start by establishing access

1. Inspect the current workspace and identify the project root.
2. Inventory files and directories without modifying them.
3. Read `MAP-EXPLORER-REPORT.md`, existing README/developer documentation, test instructions and project configuration if available.
4. Identify the exact revision/commit being audited.
5. Identify the available languages, frameworks, build tools, test runners and browser automation tools.
6. Verify whether the source code and assets are actually accessible.

If the repository is not mounted or accessible, do not pretend to inspect it. Create an access-limitation report and identify the exact files or access needed. Do not substitute assumptions from a previous conversation for source-code evidence.

### 2. Parallel-agent organization

If supported, create these independent audit agents. Give each a separate workstream and require evidence, not opinions.

**Agent A — Architecture and Code Quality**
- Project structure, module boundaries and maintainability
- State management, data flow and duplicated logic
- Error handling and failure recovery
- Rust/frontend integration, build scripts and configuration
- Dependency inventory, versions, offline behavior and supply-chain concerns

**Agent B — Feature and Functional Audit**
Inspect every page and interaction:
- Global navigation and routing
- Search, autocomplete, recent searches and filtering
- 2D map, pins, clustering, previews, overlays and controls
- MapLibre GL 4.7.1 3D lazy loading, camera controls and 2D/3D synchronization
- Location cards, nearby locations, encyclopedia and guides
- Street Explorer, Jason/Lucia selection and placement, keyboard movement, thumbnails, mini-map and position-confidence labels
- Saved locations, favourites, collections, notes, routes, map views and street spots
- Collectible Tracker, including the reported 1,189 entries
- Progress, Discovery Journal and settings
- Local persistence and reload behavior

**Agent C — UI/UX and Visual Audit**
Evaluate the complete product against the requested GTA VI-inspired design direction:
- Global header, announcement strip and navigation
- Typography, colours, spacing and design tokens
- Primary, secondary, outline and icon-only buttons
- Hover, focus, active, disabled and loading states
- Map sidebar, map controls, overlays, location cards and Street Explorer
- Every secondary page, including Discovery Journal
- Desktop, tablet and mobile layout
- Accessibility and visual consistency
Identify generic/template-like visual patterns and give precise component-level recommendations. Do not confuse personal taste with a functional defect.

**Agent D — Testing and Browser Compatibility**
- Establish the baseline before interpreting results.
- Run safe existing tests, formatting, lint, syntax and data validation checks.
- Inspect whether every major page is covered by routine tests.
- Test actual available browsers: Edge, Chrome, Firefox and Safari only where installed/configured.
- Test primary user journeys and meaningful error states.
- Record exact commands, versions, pass/fail/skip counts and relevant output.
- Never claim a browser or test was run if it was not.

**Agent E — Data Integrity and Asset Rights**
- Validate IDs, duplicates, missing fields and broken references.
- Review location and collectible counts against actual source data.
- Review coordinate validity and exact versus approximate placement.
- Check image-to-entry relationships and missing/broken assets.
- Inspect source attribution and rights-unconfirmed records.
- Do not invent coordinates, sources, licences or rights conclusions.
- A rights-unconfirmed warning is not itself proof of infringement.
- Do not delete or edit assets.

**Agent F — Performance, Offline Reliability and Security**
- Startup and map responsiveness
- 2D map performance and 3D lazy-load behavior
- High-density pin rendering
- Image loading/caching
- Memory leaks and event-listener cleanup
- Network requests and offline operation
- Input validation and unsafe rendering
- Local storage privacy and persistence
- Secrets, external links and dependency risks
- Keyboard accessibility, focus and reduced motion
Do not attack external systems or perform destructive security tests.

**Lead Auditor**
- Coordinate workstreams.
- Resolve duplicate findings.
- Challenge unsupported conclusions.
- Reproduce high-impact findings independently where practical.
- Merge results into one consistent report.
- Clearly label any disagreement or uncertainty.

If the environment supports fewer agents, prioritize B, C, D and E, then complete remaining checks with the lead auditor. Disclose the actual agent arrangement.

### 3. Required project-specific context

The application has previously been described as containing:
- A Rockstar/Leonida map in 2D and MapLibre GL 4.7.1 3D mode
- Pin clustering, hover previews, filters, overlays, saved views and location cards
- A screenshot-based Street Explorer using 261 placed images, not genuine 360-degree street imagery
- Jason and Lucia character badges and drag/click placement
- Exact-pin and approximate town/district image positioning distinctions
- Saved locations, favourites, collections, notes, approximate straight-line routes, map views and street spots
- A collectible tracker reported to contain 1,189 items
- Progress and Discovery Journal pages
- Search suggestions and recent searches
- Settings page

These are **claims to verify**, not facts to assume. Recount records from the current project. Do not assume all features remain present or unchanged.

Known limitations previously reported:
- No genuine 360-degree street imagery; Street Explorer uses placed screenshots.
- The map poster's scale is unknown, so real distances cannot be derived from that scale.
- Routes are straight-line approximations, not road-following routes.
- Vehicle specifications were not added because verified data was unavailable.
- 3D route numbering was not implemented due to the offline font constraint.
- A theme setting was previously reported as unfinished.
- Prior browser testing was reported in Edge only.
- New pages were not included in the routine page test at that time.

Re-check every item against the current code. Do not repeat stale status as current truth.

### 4. Audit method and evidence standard

Start with a baseline inventory and safe test run. Then inspect the implementation and test user journeys.

For every significant finding include:
- Unique finding ID
- Title
- Severity: Critical / High / Medium / Low / Informational
- Confidence: High / Medium / Low
- Category
- Affected file and component
- Evidence: exact file path and line range, test output, console error, screenshot or reproducible observation
- Reproduction steps
- Expected behavior
- Actual behavior
- User impact
- Recommended remediation
- Approximate effort: S / M / L
- Regression risk

Separate:
1. Confirmed defects
2. Security or reliability risks
3. Partial or missing functionality
4. Data limitations
5. Visual/UX improvements
6. Suggestions and future enhancements

Do not label a suggestion as a bug. Do not elevate a concern to a confirmed vulnerability without evidence. If evidence is incomplete, mark the finding as unverified and explain what would confirm it.

### 5. Required test journeys

At minimum, attempt the following where the environment permits:

1. Load the app from a clean browser session.
2. Navigate to every primary page and return.
3. Search for a known existing location and open its card.
4. Apply and clear category filters.
5. Zoom and pan the 2D map; select a pin.
6. Switch to 3D; verify lazy loading and selected-pin synchronization.
7. Rotate, tilt, zoom and reset the 3D camera.
8. Open Street Explorer from a location.
9. Switch Jason/Lucia and place the character on the map.
10. Navigate images using keyboard, arrows and thumbnails.
11. Verify exact versus approximate image-position labels.
12. Save and remove a favourite.
13. Create/edit a collection and note.
14. Save and reopen a map view, route and street spot.
15. Mark a collectible complete and verify progress.
16. Inspect journal entries and profile separation.
17. Change settings and reload to test persistence.
18. Test responsive behavior at 1440, 1024, 768, 390 and 375 CSS pixels where browser tooling permits.
19. Test offline behavior only in a controlled, reversible way; do not alter project configuration.
20. Inspect browser console and failed network requests.

If a journey cannot be executed, state why and do not infer its result.

### 6. Read-only and safety constraints

This is an audit, not an implementation task.

- Do not edit application source, tests, assets, data, dependencies or configuration.
- Do not install, update or remove packages.
- Do not auto-fix lint, format or test failures.
- Do not run destructive commands, database migrations, cleanup scripts or reset commands.
- Do not commit, push, deploy, publish or open a pull request.
- Do not clear the user's browser storage or persistent application data.
- Do not change user settings or saved progress.
- Do not access unrelated folders, credentials or personal files.
- Do not send project data to external services.
- If a test would mutate state, use a disposable copy only if safely available; otherwise skip it and explain.
- Temporary evidence files must be stored outside the application source tree and listed in the report.

### 7. Deliverable: audit Markdown

Create `GTA6-MAP-EXPLORER-AUDIT.md` at the project root if the workspace permits creating a report without modifying application files. If not, return the complete Markdown report in the task output.

Use this structure:

1. Executive summary
2. Overall health and release-readiness assessment
3. Audit scope, access and environment
4. Actual model/runtime, agent count and parallelism disclosure
5. Timebox start/end and whether six hours were achieved
6. Project architecture overview
7. Feature-by-feature coverage matrix
8. Confirmed findings, severity-ranked, with evidence
9. UI/UX and GTA VI visual design audit
10. Test commands and exact results
11. Browser compatibility matrix
12. Data integrity and coordinate confidence review
13. Asset source, attribution and rights review
14. Performance and offline reliability
15. Security, privacy and accessibility
16. Prioritized remediation roadmap
17. Regression risks
18. Manual verification checklist
19. Not audited / access limitations
20. Five highest-priority next actions

The report must be detailed but tight:
- Use concise prose and compact tables.
- Put evidence directly beside the finding.
- Avoid filler and repeated explanations.
- Use exact counts only when measured.
- Clearly distinguish measured results from estimates.
- Mark unknown values as unknown.
- Do not claim the audit is complete if the timebox ends with work outstanding.

### 8. Final response format

When finished, provide:
- A short executive summary
- The path/link to `GTA6-MAP-EXPLORER-AUDIT.md` if it was actually created and accessible
- The number of confirmed findings by severity
- The tests and browsers actually checked
- Whether parallel agents and the requested model were actually used
- Whether the six-hour timebox was achieved
- The five most important next actions
- Any access blockers or uncompleted work

Do not implement fixes. Wait for a separate user instruction before changing anything.

**Begin now. Do not ask questions.**