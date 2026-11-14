# Raw measurements

Everything the audit measured is kept in `docs/performance/raw/`.

| File | What it is |
|---|---|
| `before/launch.json` | Six launches (one warm-up) and one unskipped intro, before the fixes |
| `before/session.json` | The session run before the fixes: page snapshots, page-change times, search and route times, manual, map, media |
| `before/session-samples.csv` | CPU, memory, threads, handles and GPU for the process tree during that run, labelled by scenario |
| `after/launch.json`, `after/session.json`, `after/session-samples.csv` | The same three after the fixes |
| `soak.json` | The 30-minute run: a page snapshot every two minutes |
| `soak-samples.csv` | Process-tree samples for the 30-minute run |
| `summary.json` | Per-scenario averages worked out from the two sample files |

The combined table is [BENCHMARK-RESULTS.csv](BENCHMARK-RESULTS.csv).

## Reading the sample files

Columns: `time, label, processes, cpu_pct, private_mb, working_set_mb, threads, handles, gpu_pct,
gpu_decode_pct`. `cpu_pct` is percent of one logical CPU summed over the app and the processes it
started. In the "before" files a label can contain a comma (`B04 home, live wallpaper playing`);
the numbers are always the last eight fields. `scripts/perf/summarise.py` handles this.

## Tools

| File | Use |
|---|---|
| `scripts/perf/bench.mjs` | `launch`, `session` and `soak` runs against the release build |
| `scripts/perf/sample.ps1` | The process-tree sampler the runs start beside themselves |
| `scripts/perf/summarise.py` | Prints one session's results |

## Not captured

No ETW trace, no PerfMon `.blg` file and no Edge DevTools performance recording were made. The
sampler reads the same Windows counters PerfMon does, at a coarser interval.
