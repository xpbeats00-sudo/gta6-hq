> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# Test matrix

Run on 2026-11-11 against the final release build. "Browser" means the app served with `--serve` and driven in a browser pane; "Desktop" means the real `gta6-hq.exe` window.

## Automated (`cargo test`, 20 tests, all pass)

| Module | Tests |
|---|---|
| `search` | Name outranks text; all words must match and prefixes count; empty and punctuation-only queries; case and apostrophes; rumors excluded by default; section filter |
| `validate` | Bundled data has no errors; duplicate slugs, bad slugs, missing fields; broken links and unknown sources; confirmed claims need sources and labels must be valid; bad map pins |
| `content` | v1 files still load; broken file falls back with an error; byte-order mark is tolerated |
| `tiles` | Out-of-range tiles rejected; only WebP counts as a tile; cached tile served without the network and no temp files left |
| `media` | Readable titles; staged and rejected assets hidden and duplicates found |
| `window` | Only the app's own address stays inside the window |

## Manual

| Scenario | Expected | Result | Where |
|---|---|---|---|
| Fresh launch | Splash, then Home | **Pass** (screenshots in `evidence/`) | Desktop |
| Skip / Enter / Esc, repeated and after other keys | One safe transition | **Pass** | Browser |
| Launch from a different working directory | Files resolve | **Pass** (started from `C:\Windows\Temp`) | Desktop and server |
| Launch from a shortcut | Files resolve | Not tested (same code path as above) | |
| Program without its folders | Clear message | **Pass**: dialog appeared, exit code 1 (text not read) | Desktop |
| Offline launch | Core wiki usable | Not tested live. Nothing but map tiles uses the network | |
| Empty map cache | Loads, or explains | Loading: **Pass**. Offline notice: not tested live | Browser |
| Warm map cache | Cached tiles load | **Pass** (tile served in 1 ms from disk) | Server |
| Missing image | Graceful fallback | **Pass** | Browser |
| Missing video | Graceful fallback | Splash: covered in code (error ends the splash), not tested live | |
| Search, no match | Helpful message | **Pass** | Browser |
| Search, case and punctuation | Correct results | **Pass** | Browser and unit |
| Search filter by category | Only that category | **Pass** (10 results to 1) | Browser |
| Malformed data file | Clear error, no crash | **Pass** | Server |
| Data file with byte-order mark | Loads | **Pass** | Server |
| Narrow window (375 px) | No sideways scroll | **Pass** on 12 pages | Browser |
| High-DPI / multi-monitor | Usable | Not tested | |
| Map pin opens the right entry | Correct link | **Pass** (Ambrosia pin to `#/locations/ambrosia`) | Browser |
| Media viewer open, Esc, focus return | Works | **Pass** | Browser |
| Videos pause when window hidden | Paused, then resumed | **Pass** | Browser |
| Outside link opens the default browser | App stays put | Not tested in the desktop window (URL rule unit-tested) | |
| Close during playback | Resources released | **Pass** (no leftover processes) | Desktop |
| Path traversal attempts | 404 | **Pass** (7 probes) | Server |
