> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# Performance

Single run on 2026-11-11 on the development machine, release build. These are spot measurements, not benchmarks.

| Measure | Result | Note |
|---|---|---|
| Executable size | 4,972,544 bytes | Was 4,666,368 before the upgrade |
| Window handle available | about 0.1 s after start | Time until Windows reports a main window, not until the page is drawn |
| Search request, local | 14 to 24 ms | 5 runs of `/api/search?q=vice+city`; pack target is under 150 ms |
| `/api/wiki` | 14 ms | File is re-read and images re-resolved on every request |
| `/api/media` | 3 ms | |
| `/api/health` | 35 ms | Hashes all 18 media files (about 23 MB) |
| Cached map tile | 1 ms | |
| Server-only memory | 11.5 MB | |
| App process memory, Home page | 26 MB | Rust process only |
| WebView2 memory, Home page | about 534 MB across 6 processes | One measurement, with the Home video playing. This is the browser engine, and is the bulk of the app's footprint |
| App process CPU, Home page | 0.09 s over 5 s | Rust process only. WebView2 CPU while the Home video loops was not measured |
| Map tile cache | 32 files, 0.6 MB after testing | Whole map is about 360 tiles; the cache is never pruned automatically |

## Not measured

- Cold start on a machine that has never run WebView2.
- WebView2 CPU and memory over time (a long-running session, gallery scrolling).
- Behaviour with a large data file or hundreds of gallery items. Search is a linear scan and the wiki is re-read per request, which is fine at 75 entries and would need an in-memory index at a few thousand.
