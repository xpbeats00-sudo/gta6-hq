# Report index

Start with `CURRENT-STATE.md`. It is generated from the live data and is the only report to quote for counts and test results.

## Current

| Report | What it is | How it is kept current |
|---|---|---|
| `status/CURRENT-STATE.md` | One-page status: version, counts, checks, blockers | `python scripts/current_state.py --run-checks` |
| `status/DATA-AND-MANUAL-COUNTS.md` | Entries by category, manual pages, evidence labels, media | Same command |
| `status/BASELINE-TEST-RESULTS.md` | Each check, its command and exit code | Same command |
| `status/REPOSITORY-INVENTORY.md` | Folders, files, line counts | Same command |
| `status/KNOWN-BLOCKERS.md` | Open blockers by priority | By hand |
| `compliance/MEDIA-RIGHTS-AUDIT.md` | Every media file against its record; distribution decision | `python scripts/audit_media.py` |
| `compliance/DISTRIBUTION-ASSET-ALLOWLIST.md` | What may ship in a public package | Same command |
| `compliance/media-hashes.csv` | SHA-256, source and decision for each file | Same command |
| `architecture/NETWORK-AND-PRIVACY.md` | What leaves the machine and how to turn it off | By hand |
| `manual/ASSET-AND-RIGHTS-REGISTER.md` | Running log of pictures added, by date | By hand, appended |
| `ui-redesign/DESIGN-SYSTEM.md` | Colour, type and spacing rules for the app (the manual's own palette is in `ui/manual.css`) | By hand |
| `Raw/EDITORIAL_POLICY.md`, `Raw/LAUNCH-READINESS.md` | Standing rules | By hand |
| `audits/GTA-6-HQ-DOCUMENTATION-AUDIT.md`, `Raw/GTA-6-HQ-MASTER-IMPROVEMENT-ROADMAP.md` | The audit and roadmap this work follows | Owner |

## Historical

Kept as a record of what was done and found at the time. Their counts are out of date.

| Report | Dated | What it recorded |
|---|---|---|
| `audits/BASELINE.md`, `FINDINGS.md`, `TEST_MATRIX.md`, `PERFORMANCE.md`, `CONTENT_INTEGRITY.md`, `FINAL_REPORT.md` | 2026-11-11 | The first eight-hour audit |
| `ui-redesign/BASELINE-AUDIT.md`, `ASSET-INVENTORY.md`, `IMPLEMENTATION-LOG.md`, `FINAL-QA-REPORT.md` | 2026-11-11 | The interface redesign |
| `manual/IMPLEMENTATION-PLAN.md`, `IMPLEMENTATION-AUDIT.md`, `FILE-OWNERSHIP.md`, `QA-REPORT.md` | 2026-11-11 | Building the Field Manual |
| `manual/FINAL-6-HOUR-REPORT.md`, `CONTENT-STATUS.md`, `QA-TEST-RESULTS.md`, `REGRESSION-REPORT.md` | 2026-11-11/12 | The six-hour research run |
| `manual/RERUN-REPORT.md` | 2026-11-12 | The wanted-star rerun from official footage |
| `manual/research/` | 2026-11-11/12 | Source registers, evidence matrix, fact-checks, frame sheets. Still the evidence behind the manual's claims |

## Figures that differ between old reports

| Figure | Old values | Use instead |
|---|---|---|
| Manual pages | 30, 31, 32 | `DATA-AND-MANUAL-COUNTS.md` |
| Law Enforcement pages | 10, 11 | `DATA-AND-MANUAL-COUNTS.md` |
| Evidence label totals | several | `DATA-AND-MANUAL-COUNTS.md` |
| Validator warnings | 33, 45, 61 | `BASELINE-TEST-RESULTS.md` |
| Media records | 18, 33, 45 | `MEDIA-RIGHTS-AUDIT.md` |
| Tests | 20, 53 | `BASELINE-TEST-RESULTS.md` |
| Weapons chapter | "in development" | Published, three entries: `DATA-AND-MANUAL-COUNTS.md` |
| Network behaviour | "tiles only" | `NETWORK-AND-PRIVACY.md` |
