> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# Baseline (before any change)

Date: 2026-11-11. Windows 11 Enterprise 10.0.26300, cargo 1.99.0, rustc 1.99.0.
Backup of the pre-audit source, UI and data: `backups/pre-audit-2026-11-11.zip` (98,954 bytes).

## Inventory

| Area | Contents |
|---|---|
| Rust source | `src/main.rs`, `window.rs`, `server.rs`, `content.rs`, `search.rs`, `media.rs`, `tiles.rs` |
| UI | `ui/index.html`, `app.js`, `art.js`, `styles.css`, `vendor/leaflet.js`, `vendor/leaflet.css` (Leaflet 1.9.4) |
| Data | `data/wiki.json`: 8 characters, 6 locations, 8 vehicles, 2 editions, 9 news items, 7 FAQ entries, 15 map pins |
| Images | 12 files in `images/` (logo, 6 stills taken from the wallpaper videos, 5 crops of those stills) |
| Videos | 6 files in `wallpapers/` (21.1 MB), including the splash video |
| Cache | `cache/tiles/` (map tiles), `cache/webview/` (WebView2 profile) |
| Not a git repository | No version history existed, hence the zip backup |

## How the app works

1. `main.rs` finds the app folder, binds `127.0.0.1` on a free port, starts the axum server on a tokio runtime.
2. `window.rs` opens a tao window with a wry (WebView2) view pointed at that address. With `--serve` there is no window.
3. `ui/index.html` plays the splash video while `app.js` fetches `/api/wiki`, then a hash router renders pages.
4. Routes: `/api/wiki`, `/api/search`, `/api/media`, `/tiles/{z}/{y}/{x}.webp`; static files from `ui/`, `images/`, `wallpapers/`.

## Network use

| Request | When | Destination |
|---|---|---|
| Map tiles | First view of each map area | `https://gta6-wiki.org/maps/tiles/yanis-17/…` (then cached on disk) |

Nothing else leaves the machine: no analytics, no telemetry, no fonts or scripts from a CDN.

## Runtime requirements

Windows with the Microsoft Edge WebView2 Runtime (included in Windows 11). The executable needs the `ui`, `data`, `images` and `wallpapers` folders.

## Commands

| Command | Exit code | Result |
|---|---|---|
| `cargo fmt --all -- --check` | 1 | **Failed**: formatting differences in the Rust source |
| `cargo clippy --all-targets --all-features -- -D warnings` | 0 | No warnings |
| `cargo test` | 0 | 6 passed, 0 failed |
| `cargo build --release` | 0 | `gta6-hq.exe`, 4,666,368 bytes |

## Baseline observations

Pages checked in the browser pane at the time the app was first built: splash, Home, Characters, a character profile, Locations, Map (including flying to a pin), Media (including the video lightbox), Search, Intel, Vehicles. All rendered with no console errors. The desktop window had been confirmed to open but had not been looked at.

Defects found by reading the code and reproducing them are listed in `FINDINGS.md`.
