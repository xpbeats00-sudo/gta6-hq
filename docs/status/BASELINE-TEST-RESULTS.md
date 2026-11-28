# Baseline test results

Run 2026-11-27 17:30 by `scripts/current_state.py --run-checks` against the live checkout.

| Check | Command | Exit code | Result |
|---|---|---|---|
| Formatting | `cargo fmt --all -- --check` | 0 | Pass |
| Clippy, warnings as errors | `cargo clippy --all-targets --all-features -- -D warnings` | 0 | Pass |
| Tests | `cargo test` | 0 | Pass. 93 passed, 0 failed |
| Release build | `cargo build --release` | 0 | Pass |
| Data validator | `target\release\gta6-hq.exe --validate` | 0 | Pass. 0 errors, 2683 warnings; by check: rights-unconfirmed 2648, unlisted-media 35 |
| node --check ui/app.js | `node --check ui\app.js` | 0 | Pass |
| node --check ui/appearance.js | `node --check ui\appearance.js` | 0 | Pass |
| node --check ui/art.js | `node --check ui\art.js` | 0 | Pass |
| node --check ui/explore.js | `node --check ui\explore.js` | 0 | Pass |
| node --check ui/hundred.js | `node --check ui\hundred.js` | 0 | Pass |
| node --check ui/icons.js | `node --check ui\icons.js` | 0 | Pass |
| node --check ui/journal.js | `node --check ui\journal.js` | 0 | Pass |
| node --check ui/manual.js | `node --check ui\manual.js` | 0 | Pass |
| node --check ui/map3d.js | `node --check ui\map3d.js` | 0 | Pass |
| node --check ui/menus.js | `node --check ui\menus.js` | 0 | Pass |
| node --check ui/more.js | `node --check ui\more.js` | 0 | Pass |
| node --check ui/research.js | `node --check ui\research.js` | 0 | Pass |
| node --check ui/routes.js | `node --check ui\routes.js` | 0 | Pass |
| node --check ui/stream.js | `node --check ui\stream.js` | 0 | Pass |

Not covered by this run: interface tests (none exist yet), accessibility, performance, clean-machine install.
