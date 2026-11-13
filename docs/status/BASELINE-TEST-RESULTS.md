# Baseline test results

Run 2026-11-12 17:46 by `scripts/current_state.py --run-checks` against the live checkout.

| Check | Command | Exit code | Result |
|---|---|---|---|
| Formatting | `cargo fmt --all -- --check` | 0 | Pass |
| Clippy, warnings as errors | `cargo clippy --all-targets --all-features -- -D warnings` | 0 | Pass |
| Tests | `cargo test` | 0 | Pass. 61 passed, 0 failed |
| Release build | `cargo build --release` | 0 | Pass |
| Data validator | `target\release\gta6-hq.exe --validate` | 0 | Pass. 0 errors, 115 warnings; by check: empty-category 2, rights-unconfirmed 115 |
| node --check ui/app.js | `node --check ui\app.js` | 0 | Pass |
| node --check ui/art.js | `node --check ui\art.js` | 0 | Pass |
| node --check ui/manual.js | `node --check ui\manual.js` | 0 | Pass |

Not covered by this run: interface tests (none exist yet), accessibility, performance, clean-machine install.
