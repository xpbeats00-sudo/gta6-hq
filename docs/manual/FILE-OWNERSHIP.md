> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# Field Manual: file ownership during the mission

Rule: no two writers on the same file at the same time.

| Writer | Role | Files it could write | When |
|---|---|---|---|
| Core-upgrade agent | Launch-readiness work on the app core | `src/content.rs`, `search.rs`, `validate.rs`, `server.rs`, `main.rs`, `import.rs`; `ui/app.js`, `ui/styles.css`; `data/wiki.json`, `data/wiki/*`; `README.md`, `docs/EDITORIAL_POLICY.md`, `docs/LAUNCH-READINESS.md` | First, until it reported |
| Agent A, research | Primary-source research | `docs/manual/research/PRIMARY-SOURCE-REGISTER.md`, `MECHANICS-EVIDENCE-MATRIX.md`, `UNKNOWN-MECHANICS.md` only | In parallel |
| Agent B, fact-check | Adversarial review | `docs/manual/research/FACT-CHECK-REPORT.md` only | In parallel |
| Lead | Manual build, integration, QA, reports | `data/manual.json`, `ui/manual.js`, `ui/manual.css`, `images/manual/`, `data/media.json`, `docs/manual/*` (not `research/`) throughout; `ui/index.html` throughout (no other writer); the shared core files only **after** the core agent finished | Throughout, then integration |

## How the roles in the mission brief were filled

| Role in the brief | Filled by |
|---|---|
| A, primary-source research | A separate agent |
| B, independent fact-checker | A separate agent, working from the sources itself and not from Agent A's notes |
| C, architecture and integration auditor | The lead (see `IMPLEMENTATION-AUDIT.md`) |
| D, manual implementation | The lead; the reader had been built just before the mission was issued |
| E, QA and regression | The lead (see `QA-TEST-RESULTS.md` and `REGRESSION-REPORT.md`) |

C, D and E were not separate agents because they all needed the same files the core-upgrade agent was changing; running them in parallel would have broken the one-writer rule.

## Integration order

1. Research and fact-check agents reported; the lead read IGN's interview first-hand and rewrote the chapter.
2. Core-upgrade agent reported; its checks were re-run.
3. Copies of `ui/app.js`, `src/server.rs` and `src/validate.rs` saved to `backups/`.
4. The five manual touch points applied by one script, which refuses to run unless each anchor matches exactly once.
5. Format, lint, tests, build, validation; then browser and desktop checks.
