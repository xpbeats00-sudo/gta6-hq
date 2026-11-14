# Before and after

**Date:** 14 November 2026. Same machine, same release profile, same content; see
[BENCHMARK-BASELINE.md](BENCHMARK-BASELINE.md). Every row is in
[BENCHMARK-RESULTS.csv](BENCHMARK-RESULTS.csv).

## What changed

| Measure | Before | After |
|---|---:|---:|
| Page change, 95th percentile (60 changes) | 651 ms | 229 ms |
| Page change, slowest | 692 ms | 230 ms |
| Page change, median | 217 ms | 215 ms |
| CPU while browsing, average (% of one logical CPU) | 78.6% | 40.3% |
| Memory peak while browsing | 1,580 MB | 1,006 MB |
| GPU video decode while browsing | 26.4% | 1.3% |
| GPU video decode in the Media gallery | 25.4% | 3.3% |
| Integrity report (`/api/health`), median | 207 ms | 39 ms |
| Memory peak, Home with live wallpaper | 531 MB | 447 MB |

The median page change did not move because most of it is the app's own 190 ms fade.

## What did not change

| Measure | Before | After |
|---|---:|---:|
| Launch to window, median | 533 ms | 530 ms |
| Launch to usable Home, intro skipped, median | 2,547 ms | 2,497 ms |
| Intro length when not skipped | 12.9 s | 12.9 s |
| Close, median | 73 ms | 52 ms |
| Search request, median (five queries) | 6.5 to 7.5 ms | 6.4 to 7.4 ms |
| CPU, Home with live wallpaper | 13.9% | 13.1% |
| CPU, Home with wallpaper paused | 4.7% | 5.9% |
| CPU, idle on the Encyclopedia | 16.0% | 15.6% |
| Media catalogue (`/api/media`), median | 16.0 ms | 15.7 ms |
| Memory peak in the Media gallery | 1,175 MB | 1,222 MB |
| Map, time to settle | 326 ms | 333 ms |
| Map revisit, bytes fetched | 0 | 0 |
| Processes left 3 s after closing | 0 | 0 |

Two fixes are in this list on purpose. Resting off-screen pictures did not lower idle CPU, and
keeping the media catalogue did not shorten its request; the audit says why.

## Long session (after the fixes)

30 minutes, 402 page visits across 12 places, with the image viewer opened on each Media visit.

| Five-minute slice | CPU average | Memory average | Memory peak | Threads | Handles |
|---|---:|---:|---:|---:|---:|
| 1 | 18.0% | 776 MB | 1,119 MB | 231 | 3,887 |
| 2 | 15.9% | 785 MB | 940 MB | 215 | 3,900 |
| 3 | 16.7% | 771 MB | 918 MB | 214 | 3,884 |
| 4 | 16.2% | 808 MB | 1,081 MB | 215 | 3,836 |
| 5 | 16.1% | 791 MB | 912 MB | 214 | 3,839 |
| 6 | 16.1% | 787 MB | 1,138 MB | 215 | 3,847 |

The page's own memory stayed between 2.4 and 2.9 MB and there were no long tasks. Nothing grows.
The soak was run only on the fixed build, so there is no "before" for it.

## Acceptance checklist

- [x] Same machine and build profile before and after.
- [x] At least five repeat runs for launches and page changes.
- [x] Median and 95th percentile compared.
- [x] CPU, private bytes, working set and GPU recorded together.
- [ ] Cold and warm cache separate: warm only.
- [x] No correctness or visual regression: all checks pass; Home, the gallery and the intro were
      checked in the app after the changes.
- [x] `cargo test` passes (64 passed, 1 ignored).
- [x] Clippy passes with warnings denied.
- [x] Rust formatting check passes.
- [x] `node --check ui/app.js` passes.
- [x] `--validate` passes (0 errors).
- [x] A release build succeeds.
- [x] A 30-minute soak shows no unbounded growth.
- [x] Raw logs saved; base commit `aa2fc3e`.
