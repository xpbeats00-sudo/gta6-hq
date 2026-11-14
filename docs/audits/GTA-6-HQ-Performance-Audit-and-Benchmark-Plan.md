# GTA 6 HQ — Performance Audit & Benchmark Plan

**Repository:** https://github.com/xpbeats00-sudo/gta6-hq  
**Branch inspected:** `main`  
**Audit date:** 14 November 2026  
**Audit type:** Public-repository documentation / architecture review  
**Status:** Preliminary — source checkout and runtime measurements still required

---

## 1. Executive summary

GTA 6 HQ is documented as a Rust desktop application using Tao/Wry with a WebView UI. Its documented components include a local HTTP server, wiki/content loader, in-memory search index, media scanner, map-tile downloader/cache, Discord Rich Presence, and an HTML/CSS/JavaScript/Leaflet interface.

The README documents these developer checks:

```powershell
cargo test
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
node --check ui/app.js
cargo run -- --validate
```

The repository also documents a release build command:

```powershell
cargo build --release
```

**No CPU, RAM, GPU, startup-time, frame-time, disk-I/O, network, or long-session benchmark results are published in the inspected README.** No measured performance numbers are asserted in this report.

The immediate recommendation is to establish a repeatable Windows baseline on the actual target machine, then profile the slowest user-visible scenarios before changing code. Avoid speculative optimization until measurements identify a bottleneck.

## 2. Evidence and limitations

### Publicly documented facts

The repository README describes:

- Rust desktop shell using Tao and Wry/WebView2 on Windows.
- A local server with routes for wiki, search, media, health, map tiles and static files.
- Wiki content loaded from `data/wiki.json` and `data/wiki/*.json`, held in memory until a file changes.
- A word-search index built once per content load.
- Media scanning across `images/` and `wallpapers/`, joined with a rights manifest.
- Map tiles fetched on first view and cached under `cache/tiles/`.
- A browser UI in `ui/` using HTML, CSS, JavaScript and Leaflet.
- Optional Discord Rich Presence and GitHub update checks.
- A manual, encyclopedia, map, media gallery, search and intro/splash experience.

Source: repository README, especially its architecture, developer commands, network/privacy and map-cache descriptions.

### What could not be verified

The source archive could not be cloned in this audit environment because GitHub DNS/network access failed. Therefore this report does **not** claim to have:

- Inspected the current Rust or JavaScript implementation line by line.
- Built the current `main` branch.
- Run unit, integration, UI or release tests.
- Measured the app on the user's Windows machine.
- Confirmed CPU, memory, GPU, startup, rendering or network performance.
- Identified a proven performance defect.

Treat the items below as hypotheses and a measurement plan, not confirmed bugs.

## 3. Initial architecture performance review

| Area | Documented design | What to measure / inspect |
|---|---|---|
| Desktop shell | Tao + Wry/WebView2 | Startup time, process tree, idle CPU, memory, UI responsiveness |
| Local HTTP server | Serves API and static assets | Route latency, request concurrency, blocking work, payload size |
| Wiki loader | Loads JSON and keeps content in memory | Cold load time, parse time, allocations, peak memory |
| Search | Builds word index once per load | Index-build duration, query latency, memory per entry, large-query behavior |
| Media scanner | Scans image and wallpaper folders | Startup cost, filesystem calls, thumbnail generation, repeated scans |
| Map | Downloads tiles and caches locally | First-view latency, cache-hit latency, network retries, cache growth |
| Web UI | HTML/CSS/JS/Leaflet | Long tasks, layout/reflow, image decode, animation frame rate |
| Field Manual | Multi-page visual reader | Page-switch latency, image decode, memory growth while browsing |
| Live wallpapers / intro | Video and animated media are documented | Decode CPU/GPU, dropped frames, idle playback cost, pause/resume behavior |
| Discord presence | Retries local connection when Discord is absent | Retry CPU/wakeups, thread lifetime, clean shutdown |
| Update check | Checks GitHub for newer releases | Startup impact, timeout behavior, offline behavior |
| Installer / updater | Separate setup window and installer flow | Install/update duration, disk I/O, process cleanup |

### Priority hypotheses to test

1. **Media and wallpaper decoding:** Large images or video backgrounds may dominate memory, GPU decode and CPU use. Verify actual dimensions, codecs, bitrates, decode behavior and whether off-screen media is paused.
2. **WebView process accounting:** The desktop app may spawn multiple WebView2 processes. Measure the complete process tree rather than only the Rust executable.
3. **Large content loads:** JSON parsing, media scanning and search-index construction may affect cold startup as the content library grows.
4. **Map tile cache:** Measure cache hits/misses, cache size and repeated network requests. Confirm cache pruning and bounded disk usage.
5. **Search and UI rendering:** Large result sets, repeated DOM construction, layout thrashing and un-debounced input can affect responsiveness.
6. **Long-session memory:** Repeated page changes, image viewing, map navigation and video playback may reveal retained DOM nodes, image buffers or listeners.
7. **Background tasks:** Update checks and Discord retry loops should be bounded, cancellable and low-frequency when inactive.

These are test targets inferred from the documented architecture, not verified defects.

## 4. Benchmark protocol

### 4.1 Record the test machine

Before benchmarking, save:

- Windows edition and build.
- CPU model, core/thread count and power plan.
- Installed RAM and current available RAM.
- GPU model, driver version and dedicated/shared memory.
- Storage model and free disk space.
- WebView2 Runtime version.
- App version / Git commit SHA.
- Whether the app is installed or portable.
- Display resolution and scaling.
- Whether live wallpaper / intro video is enabled.

Do not compare results from different machines as if they were directly equivalent.

### 4.2 Build configurations

Measure both development and optimized builds only when useful, but use the **release build as the primary user-performance result**.

```powershell
cargo build
cargo build --release
```

Record the commit SHA and build profile beside every result. Do not compare a debug build against a release build and call the difference an optimization win.

### 4.3 Repeatability

For each scenario:

- Run one warm-up pass.
- Run at least five measured passes for startup and navigation.
- Report median, minimum and maximum; include p95 when enough samples exist.
- Keep resolution, power mode, network and app settings constant.
- Separate cold-cache and warm-cache runs.
- Record background processes and whether antivirus scanning interfered.
- Do not discard slow runs without documenting why.

## 5. Required benchmark scenarios

| ID | Scenario | Measurements |
|---|---|---|
| B01 | Cold launch after reboot / cleared OS cache where practical | Time to window, time to usable Home, CPU peak, peak memory |
| B02 | Warm launch | Startup time, CPU time, memory |
| B03 | Idle on Home for 5 minutes | Average / peak CPU, memory trend, GPU engine use |
| B04 | Home with live wallpaper/video | CPU, GPU, memory, frame pacing, dropped frames |
| B05 | Home with animation disabled | CPU/GPU/memory comparison |
| B06 | Encyclopedia open and category changes | Route latency, UI response, memory |
| B07 | Search: short, common and no-result queries | p50/p95 latency, CPU time, result count |
| B08 | Search on a large synthetic dataset | Index build time, query latency, memory growth |
| B09 | Field Manual: open, next page, image zoom, night mode | Interaction latency, image decode, memory |
| B10 | Map first visit / uncached tiles | Time to visible map, network bytes, CPU, cache writes |
| B11 | Map revisit / cached tiles | Cache-hit latency, network requests, CPU |
| B12 | Media gallery: scroll and open/close viewer repeatedly | Image decode time, memory growth, UI responsiveness |
| B13 | 30-minute mixed-use soak test | Memory slope, CPU average, handle/thread growth |
| B14 | Offline startup and navigation | Startup success, timeouts, offline error behavior |
| B15 | Shutdown / restart | Process cleanup, lingering WebView2/app processes |

## 6. Windows CPU and memory capture

### 6.1 Process tree

Use Task Manager → Details and Resource Monitor, but include all child WebView2 processes associated with the app. Do not attribute all WebView2 activity on the machine to GTA 6 HQ without verifying process ownership.

PowerShell process snapshot:

```powershell
Get-Process |
  Where-Object { $_.ProcessName -match 'gta6|msedgewebview2' } |
  Select-Object ProcessName, Id, CPU, WorkingSet64, PrivateMemorySize64,
                Threads, Handles |
  Sort-Object ProcessName |
  Format-Table -AutoSize
```

This is a snapshot, not a time-series benchmark. `CPU` is cumulative process CPU time in seconds; it is not instantaneous CPU percentage.

### 6.2 PerfMon counters

Use Performance Monitor (`perfmon`) and create a Data Collector Set. Capture at 1-second intervals where practical:

- `Process(*)\% Processor Time`
- `Process(*)\Private Bytes`
- `Process(*)\Working Set - Private`
- `Process(*)\IO Read Bytes/sec`
- `Process(*)\IO Write Bytes/sec`
- `Process(*)\Thread Count`
- `Process(*)\Handle Count`
- `Memory\Available MBytes`
- `Memory\Committed Bytes`
- `System\Processor Queue Length`
- `GPU Engine(*)\Utilization Percentage` (where supported)
- `GPU Process Memory(*)\Dedicated Usage` and `Shared Usage` (where supported)

Identify the app's process instances carefully. WebView2 may create several processes with similar names. Capture the Rust app and its verified WebView2 descendants.

### 6.3 Capture a CSV snapshot from PowerShell

```powershell
$names = @('gta6-hq', 'msedgewebview2')
Get-Counter -Counter @(
  '\Process(*)\% Processor Time',
  '\Process(*)\Private Bytes',
  '\Process(*)\Working Set - Private',
  '\Process(*)\IO Read Bytes/sec',
  '\Process(*)\IO Write Bytes/sec',
  '\Process(*)\Thread Count',
  '\Process(*)\Handle Count'
) -SampleInterval 1 -MaxSamples 60 |
  Export-Counter -Path '.\gta6-hq-perf.blg' -FileFormat BLG -Force
```

The wildcard captures all processes; filter and identify the relevant instances when analyzing the result. Counter names can vary by Windows language/version. If a counter is unavailable, record that fact rather than silently substituting another metric.

### 6.4 GPU

Use Windows Task Manager → Details and enable GPU / GPU Engine columns, or capture supported GPU Engine counters. Record whether the workload uses video decode, 3D or copy engines. Do not assume high GPU use is inherently bad: compare it with frame smoothness, power use and CPU offload.

## 7. Rust and frontend profiling

### Rust checks

Run from the repository root:

```powershell
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo build --release
```

Optional timing for a clean release build:

```powershell
Measure-Command { cargo build --release }
```

This includes build-system and dependency effects; it is not application runtime performance.

If the repository has benchmark targets, run:

```powershell
cargo bench
```

If it has none, add Criterion benchmarks only for measured hot paths, such as content parsing, search-index construction, query ranking, validation and media-manifest joining. Avoid benchmarking private implementation details before the source audit identifies stable units worth measuring.

### Frontend / WebView

Use Edge DevTools against the WebView where the app's development setup permits it:

- Performance recording for Home, search, manual, map and media pages.
- Long Tasks and scripting time.
- Layout / style recalculation.
- Image decode and memory.
- Network requests and cache hits.
- Animation frame pacing.
- Detached DOM nodes and event-listener growth.

The app's `--serve --port 4600` mode is documented and may help isolate UI behavior in a normal browser. Browser-mode results are useful for frontend diagnosis but are **not identical** to the packaged WebView2 desktop runtime.

## 8. Suggested performance targets

These are proposed engineering goals, not existing measured results or guarantees. Adjust after establishing a baseline on the target PC.

| Metric | Suggested goal |
|---|---:|
| Warm launch to usable Home | ≤ 3 seconds |
| Search response, typical dataset | p95 ≤ 100 ms |
| Navigation interaction response | p95 ≤ 150 ms |
| Idle CPU after settling | Average ≤ 2% of one logical CPU, where measurable |
| Idle memory | Establish baseline first; avoid arbitrary hard cap before measuring WebView2 |
| Repeated page navigation | No sustained upward memory trend |
| Cached map tile revisit | No unnecessary network fetch for valid cached tile |
| Video background disabled | Decode activity returns to idle |
| Long session | No unbounded memory, handle, thread or cache growth |
| Release build | No panic, unhandled error or failed required test |

For CPU percentage, document the tool's normalization. PerfMon process CPU can exceed 100% on multi-core systems; Task Manager often presents normalized percentages. Do not mix these definitions in one comparison.

## 9. Optimization recommendations — only after profiling

### P0 — Establish trustworthy measurements

- Add a version/commit identifier to benchmark reports.
- Save machine specifications with every run.
- Benchmark release builds.
- Include the WebView2 process tree.
- Separate cold and warm cache.
- Add a 30-minute soak test.
- Preserve raw CSV/BLG and benchmark logs.

### P1 — Likely high-value investigation areas

- Verify off-screen videos and animations pause when hidden.
- Avoid loading full-resolution gallery images until needed; use thumbnails and lazy loading.
- Ensure image viewer close releases references and event listeners.
- Debounce search input and avoid rebuilding the whole result DOM on every keystroke.
- Keep search result rendering paginated / bounded.
- Avoid rescanning the complete media directory on every navigation.
- Keep map tile caching bounded and handle failed downloads with backoff.
- Ensure network calls have timeouts and do not block the UI thread.
- Confirm background retry loops sleep and stop when disabled or shutting down.

### P2 — Rust/backend investigation

- Profile JSON parse and content assembly before changing data structures.
- Profile search-index construction and query ranking with representative datasets.
- Check whether file-change detection causes unnecessary reloads.
- Check server route handlers for synchronous filesystem or network work on request paths.
- Check large response serialization and duplicate data copies.
- Use allocation profiling only when memory profiling indicates it is useful.
- Avoid premature concurrency; it can increase contention and complexity.

### P3 — Packaging and startup

- Measure installer launch separately from app launch.
- Measure first launch after install and subsequent launches.
- Check asset discovery / path resolution costs.
- Check whether update checks delay first paint; keep network update checks asynchronous and bounded.
- Measure antivirus scanning separately from app execution where possible.

## 10. Regression and acceptance checklist

A performance change is accepted only if:

- [ ] The same machine and build profile were used before and after.
- [ ] At least five repeat runs were captured for relevant scenarios.
- [ ] Median and p95 (where sample count supports it) are compared.
- [ ] CPU, private bytes, working set and GPU are considered together.
- [ ] Cold and warm cache results are separate.
- [ ] No correctness or visual regression was introduced.
- [ ] `cargo test` passes.
- [ ] Clippy passes with warnings denied.
- [ ] Rust formatting check passes.
- [ ] `node --check ui/app.js` passes.
- [ ] `--validate` passes.
- [ ] A release build succeeds.
- [ ] A 30-minute soak test shows no unbounded growth.
- [ ] Raw logs and commit SHA are saved.

## 11. Required deliverables for a full source-level audit

Once the repository can be checked out locally, produce:

1. `docs/performance/PERFORMANCE-AUDIT.md` — findings with file paths and line references.
2. `docs/performance/BENCHMARK-BASELINE.md` — machine specs and measured baseline.
3. `docs/performance/BENCHMARK-RESULTS.csv` — raw scenario measurements.
4. `docs/performance/PROFILING-ARTIFACTS.md` — links to ETW/PerfMon/DevTools artifacts.
5. `docs/performance/OPTIMIZATION-ROADMAP.md` — prioritized, evidence-backed changes.
6. `docs/performance/REGRESSION-RESULTS.md` — before/after comparison and test status.

Every finding must include: severity, evidence, affected file/function, reproduction steps, measured impact (if measured), recommended fix, regression risk and verification.

## 12. Final assessment

**Current status: performance is undocumented, not proven slow.**

The public README reveals a sensible local-first architecture and existing correctness checks, but it does not establish actual CPU or memory performance. The most useful next step is not a speculative optimization pass: it is a reproducible baseline on the Windows machine that runs the app, followed by source-level profiling of whichever scenario is slowest.

Do not publish benchmark numbers until they have been collected from the real executable on a documented machine.
