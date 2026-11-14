# Benchmark baseline: machine and method

**Date:** 14 November 2026

## The machine

| | |
|---|---|
| Windows | Windows 11 Enterprise, build 26300 |
| CPU | Intel Core i7-14650HX, 16 cores, 24 logical CPUs |
| Memory | 31.6 GB installed, about 12 GB free at the start |
| Graphics | NVIDIA GeForce RTX 5060 Laptop GPU (driver 32.0.16.2114) and Intel UHD Graphics (32.0.101.7077) |
| Display | 1920 x 1080 at 100% scaling |
| Storage | KIOXIA KBG60ZNV1T02 SSD, 954 GB, 93 GB free |
| Power | High performance plan, on mains power |
| WebView2 Runtime | 157.0.4341.60 |
| Toolchain | rustc 1.99.0, Node 24.15.0 |

Results from another machine are not comparable with these.

## The build

- Release build (`cargo build --release`) of the working tree on top of commit `aa2fc3e`.
- "Before" is that tree as it stood before the fixes in [PERFORMANCE-AUDIT.md](PERFORMANCE-AUDIT.md);
  "after" is the same tree with them. Both include the 33 Home wallpapers and the new intro, so the
  comparison isolates the fixes.
- Run from the repository folder, not from an installed copy.
- App window 1440 x 900. Live wallpaper and intro on, as shipped.

Required checks, run before measuring and again after the fixes, all passing:
`cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features -- -D warnings`,
`cargo test` (64 passed, 1 ignored), `node --check ui/app.js`, `--validate` (0 errors),
`cargo build --release`.

## How it was measured

Two tools in `scripts/perf/`:

- **`bench.mjs`** starts the real executable and drives its own page over the Chrome DevTools
  Protocol (the app is started with a debugging port). Nothing is clicked on the desktop. It times
  launches and page changes inside the page, and closes the app through its own Close button.
- **`sample.ps1`** samples the app process and every process it started (its WebView2 processes;
  8 in all), not every WebView2 process on the machine. It records CPU time, private bytes, working
  set, threads, handles and the GPU engine counters, labelled with the scenario running.

Definitions:

- **CPU %** is percent of one logical CPU, summed over the process tree. 100% is one full logical
  CPU; this machine has 24. It is not Task Manager's normalised figure.
- **Memory** is private bytes summed over the process tree.
- **GPU %** is the sum of the Windows GPU engine counters for those processes; "video decode" is
  the decode engines alone.
- **Page change** is the time from setting the address to the new page being drawn twice. It
  includes the app's own 190 ms fade between pages.
- The sampler takes a sample about every 8 seconds, because reading the process list and the GPU
  counters is slow. Short scenarios therefore have few samples; the count is in the raw files.

Repeats: launches are one warm-up and five measured runs; page changes are one warm-up round and
five measured rounds of 12 places; each search and route is one warm-up and 30 or 15 requests.

## Limits

- All runs are warm: the files were already in the operating system's cache. No cold launch after
  a restart was measured.
- One other copy of the app (the installed one) was open on the machine during the runs.
- Antivirus (Windows Defender) was on throughout and was not measured separately.
- The first attempt at the baseline session was lost when the app window was closed part-way
  through; it was run again from the start. The harness now reports that case.

Raw files are in `docs/performance/raw/`; see [PROFILING-ARTIFACTS.md](PROFILING-ARTIFACTS.md).
