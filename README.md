# GTA 6 HQ

An unofficial Grand Theft Auto VI fan encyclopedia, built as a Rust desktop app.

## Run it

```bash
cargo run --release
```

The window opens on the splash video, then the app. The built program is
`target/release/gta6-hq.exe`; it needs the `ui`, `data`, `images` and
`wallpapers` folders, which it finds by looking upwards from where it sits.
It needs the Microsoft Edge WebView2 Runtime, which Windows 11 includes.

Other ways to start it:

| Command | What it does |
| --- | --- |
| `gta6-hq --serve --port 4600` | Server only; open `http://127.0.0.1:4600` in a browser |
| `gta6-hq --validate` | Print the data integrity report; exit code 1 if there are errors |
| `gta6-hq --template <category>` | Print an empty entry for that category, ready to fill in (`--csv` prints a CSV header row instead) |
| `gta6-hq --import <file> [--dry-run] [--update]` | Check a JSON or CSV batch of entries and add it; refuses the whole batch if anything is wrong |

The release program has no console window. In PowerShell, end these commands
with `| Out-Host` so the output is shown and `$LASTEXITCODE` is set, for example
`.\target\release\gta6-hq.exe --validate | Out-Host`. `cargo run -- --validate`
works as it is.

## What is in it

- **Loading screen** – plays `wallpapers/gta6splashscreen.mp4` on launch (Skip, Enter or Esc to skip).
- **Home** – live-wallpaper hero, countdown to release, key facts.
- **Encyclopedia** – every category, an A–Z directory and a data health check.
- **Characters, Locations, Vehicles** – profiles with related entries and sources.
- **Gameplay, Activities, Wildlife, Businesses, Factions, Music, Weapons** – sourced entries, each with a facts table where facts are recorded. Missions and Collectibles are empty until there is evidence for them.
- **Map** – zoomable Leonida map. Pin types come from the data; any entry with a position gets a pin. The pin list has a filter box and counts.
- **Media** – every picture in `images/` and video in `wallpapers/`, with its origin and rights status.
- **Search** – ranked search across the whole wiki, with a category filter, sorting and "show more".
- **Long lists** – category pages and the A–Z directory get a filter box, sorting and "show more" once they pass 12 entries.
- **Drafts and spoilers** – draft entries are checked but never shown. Spoiler entries stay closed until you reveal them, one at a time or with the "Spoilers" switch, which is remembered on this computer.
- **Manual** – a printed-style Field Manual with two-page spreads, search and a night mode. Its Law Enforcement chapter labels every claim with how well it is sourced. Content is `data/manual.json`; see `docs/manual/`.
- **Intel** – release timeline, editions and FAQ.

Every entry shows a confidence label (Official, Corroborated, Community, Rumor,
Unverified) and the sources it was checked against.

## Adding content

Read `docs/EDITORIAL_POLICY.md` first: nothing goes in without a source.
For adding a lot at once, read `docs/LAUNCH-READINESS.md`.

- **Text**: edit `data/wiki.json`, or a section file in `data/wiki/` (see
  below), and refresh. No rebuild needed. If a file has a mistake in it, the
  app says so: a broken `data/wiki.json` is replaced by the built-in copy, a
  broken section file is left out.
- **Section files**: `data/wiki/<category>.json` holds a list of entries that
  is added to that category, so a big category does not have to live in one
  huge file (`vehicles.boats.json` also counts as `vehicles`).
  `data/wiki/sources.json` adds sources. `--import` writes these files for you.
- **Many entries at once**: `gta6-hq --template vehicles` prints an entry to
  fill in; `gta6-hq --import batch.json --dry-run` checks a batch;
  without `--dry-run` it is added, after a backup in `backups/`.
- **A new category**: add it to `categories` in `data/wiki.json`, with the
  `fields` its entries may carry under `facts`.
- **A map pin**: give an entry `x` and `y` (0 to 1) and it appears on the map.
  Pin types are listed under `map.categories`.
- **Pictures for an entry**: save as `images/<section>/<slug>.jpg` (or png/webp),
  e.g. `images/characters/cal-hampton.jpg`. Entries without a picture get
  generated postcard art.
- **Gallery**: put new files in `staging/` (never shown), then move them to
  `images/` or `wallpapers/` and add a record to `data/media.json`.
- Run `cargo run -- --validate` afterwards.

## Discord Rich Presence

While the app window is open, your Discord status shows GTA 6 HQ, the page
you are on and how long the app has been open. Settings are in
`data/discord.json`:

| Setting | Meaning |
| --- | --- |
| `enabled` | `false` turns it off completely |
| `application_id` | The Application ID from the Discord Developer Portal |
| `large_image` | Name of an image uploaded under Rich Presence → Art Assets for that application |
| `show_page` | `false` shows only that the app is open, not which page |

Search terms are never sent. Discord must be running on the same computer;
if it is not, the app works as normal and retries every 15 seconds.
`http://127.0.0.1:<port>/api/presence` reports whether it is connected.
Restart the app after changing the file.

## How it is built

| File | Job |
| --- | --- |
| `src/main.rs` | Starts the server, then the window (or `--serve` / `--validate`) |
| `src/window.rs` | Native window (tao) with a web view (wry / WebView2) |
| `src/server.rs` | Routes: `/api/wiki`, `/api/search`, `/api/media`, `/api/health`, `/tiles/…`, static files |
| `src/content.rs` | Loads `data/wiki.json` and `data/wiki/*.json`, attaches entry images, keeps the result in memory until a file changes |
| `src/search.rs` | Word index built once per load; ranking, filters, paging |
| `src/import.rs` | `--template` and `--import`: batch checks, backups, atomic writes |
| `src/media.rs` | Scans `images/` and `wallpapers/`, joins the rights manifest |
| `src/validate.rs` | Data and media integrity report (also used by `--import`) |
| `src/tiles.rs` | Fetches map tiles once and caches them in `cache/tiles/` |
| `src/discord.rs` | Discord Rich Presence over Discord's local connection |
| `ui/` | The interface (HTML, CSS, JavaScript, Leaflet) |

Checks: `cargo test`, `cargo clippy --all-targets --all-features -- -D warnings`,
`cargo fmt --all -- --check`, `node --check ui/app.js`.

`/api/search` answers `{ total, offset, limit, hits }` and takes `q`, `section`,
`limit` (default 50, at most 200), `offset`, `sort=name`, `rumors=true` and
`spoilers=true`. `/api/wiki` has the same shape as before, minus draft entries.

Audit reports are in `docs/audits/`, starting with `FINAL_REPORT.md`.

## Credits

Map tiles: GTA VI mapping community via gtadb.org, CC BY 4.0, served by
gta6-wiki.org and cached locally on first view (the map needs internet the
first time an area is viewed).

The artwork and videos were supplied by the app's owner; their creators and
licences are not recorded (see `data/media.json`).

Not affiliated with Rockstar Games or Take-Two Interactive. Grand Theft Auto
and its artwork are trademarks of their owners.

## Project status and reports

Start with [docs/status/CURRENT-STATE.md](docs/status/CURRENT-STATE.md). It is generated from the live data:

```
python scripts/current_state.py --run-checks
python scripts/audit_media.py
```

[docs/status/REPORT-INDEX.md](docs/status/REPORT-INDEX.md) lists every report and says which are current and which are history.

## Updates

Releases are published at https://github.com/xpbeats00-sudo/gta6-hq/releases. When the app opens it asks GitHub whether a newer release exists and, if so, shows a notice with a link; nothing is downloaded or installed automatically. To turn the check off, set `"enabled": false` in `data/update.json`.

To publish a new version: raise `version` in `Cargo.toml`, build with `cargo build --release`, and attach the packaged zip to a new GitHub release tagged `v<version>`.

## Unofficial

GTA 6 HQ is a fan project. It is not published, approved or endorsed by Rockstar Games or Take-Two Interactive. Grand Theft Auto and related names, screenshots, artwork and footage are the property of their owners; see `docs/compliance/MEDIA-RIGHTS-AUDIT.md` for the status of every media file.
