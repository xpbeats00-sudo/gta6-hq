# Network and privacy

Written 2026-11-12 from the source files named in each row. Update this file whenever an integration is added or changed.

## What leaves the machine

| Integration | What is sent, and to whom | When | How to turn it off | Source |
|---|---|---|---|---|
| Map tiles | A request for a tile image (zoom, row, column) to `gta6-wiki.org`. No account, no identifier beyond what any web request carries (IP address) | The first time each map tile is viewed. After that the tile is read from `cache/tiles/` | Do not open the Map page; or work offline, in which case uncached tiles show as missing | `src/tiles.rs` |
| Discord Rich Presence | The app name and, while `show_page` is on, the name of the page being read. Sent over a local pipe to the Discord desktop client on this machine, which shows it on the owner's Discord profile | While Discord is running and `enabled` is true. Retries every 15 seconds; does nothing if Discord is closed | Set `"enabled": false` in `data/discord.json`, or `"show_page": false` to hide page names | `src/discord.rs`, `data/discord.json` |
| Update check | One request to `api.github.com` asking for the latest release of the repository named in `data/update.json`. No account and no identifier beyond what any web request carries (IP address). Nothing is downloaded or installed; the app only offers a link to the release page | When the app opens, and at most once every six hours after that | Set `"enabled": false` in `data/update.json` | `src/update.rs`, `data/update.json` |
| Update download | Only when the reader presses "Update now" in an installed copy: the release's setup program and its `SHA256SUMS.txt` are downloaded from `github.com/<repository>/releases/download/...` (GitHub redirects to its own file servers). The address comes from GitHub's answer to the update check and is accepted only under that repository's releases; the file is saved in the temp folder, its SHA-256 is checked against the list, and only then is it run. The checksum guards against a damaged or swapped download, not against the repository itself being compromised: the setup is not code-signed. A portable copy never does this. | `src/update.rs`, `src/server.rs` (`/api/update/download`, `/api/update/progress`, `/api/update/install`)  | |
| External links | Nothing is sent by the app. A source link opens in the default browser, which then makes its own request | Only when a link is clicked | Do not click | `src/window.rs` |

## What does not exist

No telemetry, no crash reporting, no automatic download or install, no account, no analytics. The app's own server listens on `127.0.0.1` only, on a random port, and is not reachable from other machines. Since 0.1.1 it also refuses any request that is not addressed to the loopback address or that a browser says came from another site, so a web page elsewhere cannot reach it by pointing its own domain at this machine (src/server.rs).

## What stays on the machine

All encyclopedia and manual data (`data/`), pictures and videos (`images/`, `wallpapers/`), the map tile cache (`cache/tiles/`), and the reader's manual page and theme (the web view's local storage).

## Known limits

- **Rich Presence can reveal what is being read.** With `show_page` on, a spoiler entry's title would be shown on the Discord profile. Not tested for spoiler entries; none exist in the data yet.
- **Drafts and spoilers are hidden, not private.** They stay readable in the data files, and a spoiler picture is served to anyone on this machine who knows its address.
- **The tile cache has no pruning, but it is bounded.** The map stops at zoom 5, so there are at most 1,365 tiles; each is refused above 4 MB. On 2026-11-12 it held 1,212 tiles in 380 MB. Delete `cache/tiles/` to reset it.
- **The tile provider's terms have not been reviewed.** The tiles are credited CC BY 4.0 to gta6-wiki.org in the app; its caching and rate-limit rules are not documented here.

## Earlier statements this replaces

`docs/audits/FINAL_REPORT.md` said only map tiles leave the machine; it was written before Discord Rich Presence was added. Both statements are reconciled above: the tile request is the only request the app itself makes to the internet, and Rich Presence goes through the local Discord client.
