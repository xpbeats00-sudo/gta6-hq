# Repository inventory

Generated 2026-11-19 08:44 by `scripts/current_state.py`. Do not edit by hand.

| Folder | Files | Size |
|---|---|---|
| `src/` | 12 | 0.2 MB |
| `ui/` | 8 | 0.4 MB |
| `data/` | 74 | 4.8 MB |
| `images/` | 2659 | 239.3 MB |
| `wallpapers/` | 70 | 98.1 MB |
| `docs/` | 253 | 104.0 MB |
| `scripts/` | 24 | 0.2 MB |
| `cache/` | 1972 | 284.0 MB |
| `backups/` | 73 | 113.0 MB |
| `staging/` | 9 | 78.3 MB |
| `zips/` | 1 | 0.0 MB |
| `target/release/` | 3605 | 1392.1 MB |

## Source files

| File | Lines |
|---|---|
| `src/content.rs` | 570 |
| `src/discord.rs` | 232 |
| `src/import.rs` | 1044 |
| `src/main.rs` | 207 |
| `src/media.rs` | 346 |
| `src/search.rs` | 624 |
| `src/server.rs` | 368 |
| `src/settings.rs` | 170 |
| `src/tiles.rs` | 154 |
| `src/update.rs` | 530 |
| `src/validate.rs` | 1287 |
| `src/window.rs` | 320 |
| `ui/app.js` | 2037 |
| `ui/art.js` | 86 |
| `ui/manual.js` | 473 |
| `ui/manual.css` | 331 |
| `ui/styles.css` | 950 |
| `ui/index.html` | 138 |
| `data/discord.json` | 7 |
| `data/manual.json` | 4440 |
| `data/media.json` | 2699 |
| `data/update.json` | 4 |
| `data/wiki.json` | 738 |
| `data/wiki/achievements.json` | 1332 |
| `data/wiki/activities.json` | 60 |
| `data/wiki/activities.launch-detail.json` | 1030 |
| `data/wiki/activities.launch-world.json` | 652 |
| `data/wiki/activities.night-ign.json` | 4194 |
| `data/wiki/activities.reviews.json` | 39 |
| `data/wiki/businesses.community.json` | 27 |
| `data/wiki/businesses.json` | 157 |
| `data/wiki/businesses.launch-places.json` | 7195 |
| `data/wiki/businesses.launch-world2.json` | 179 |
| `data/wiki/businesses.night-world.json` | 148 |
| `data/wiki/categories.achievements.json` | 26 |
| `data/wiki/characters.community.json` | 1 |
| `data/wiki/characters.json` | 52 |
| `data/wiki/characters.launch-cast.json` | 1385 |
| `data/wiki/characters.launch-cast2.json` | 64 |
| `data/wiki/characters.night-r5.json` | 254 |
| `data/wiki/collectibles.json` | 233 |
| `data/wiki/collectibles.launch-items.json` | 2658 |
| `data/wiki/collectibles.launch-world2.json` | 1244 |
| `data/wiki/collectibles.night-ign.json` | 15976 |
| `data/wiki/collectibles.night-sites.json` | 81 |
| `data/wiki/collectibles.night-world.json` | 9777 |
| `data/wiki/collectibles.night-world2.json` | 3015 |
| `data/wiki/factions.launch-cast.json` | 329 |
| `data/wiki/gameplay.launch-detail.json` | 739 |
| `data/wiki/gameplay.launch-systems.json` | 1434 |
| `data/wiki/gameplay.launch-world.json` | 320 |
| `data/wiki/gameplay.launch.json` | 323 |
| `data/wiki/gameplay.night-ign.json` | 170 |
| `data/wiki/gameplay.night-sites.json` | 85 |
| `data/wiki/gameplay.previews.json` | 467 |
| `data/wiki/gameplay.reviews.json` | 311 |
| `data/wiki/locations.json` | 32 |
| `data/wiki/locations.launch-places.json` | 3393 |
| `data/wiki/locations.launch-world2.json` | 170 |
| `data/wiki/locations.night-sites.json` | 32 |
| `data/wiki/locations.night-world.json` | 37 |
| `data/wiki/missions.json` | 238 |
| `data/wiki/missions.launch-each.json` | 6173 |
| `data/wiki/missions.launch-each2.json` | 75 |
| `data/wiki/missions.night-ign.json` | 67 |
| `data/wiki/music.json` | 234 |
| `data/wiki/music.launch-radio.json` | 555 |
| `data/wiki/music.launch-world.json` | 94 |
| `data/wiki/sources.launch.json` | 5259 |
| `data/wiki/sources.previews.json` | 9 |
| `data/wiki/vehicles.community.json` | 26 |
| `data/wiki/vehicles.json` | 232 |
| `data/wiki/vehicles.launch-detail.json` | 102 |
| `data/wiki/vehicles.launch-garage.json` | 5460 |
| `data/wiki/vehicles.launch-garage2.json` | 2309 |
| `data/wiki/vehicles.launch-world2.json` | 75 |
| `data/wiki/vehicles.night-ign.json` | 117 |
| `data/wiki/vehicles.night-r5.json` | 169 |
| `data/wiki/vehicles.night-sites.json` | 31 |
| `data/wiki/vehicles.night-world.json` | 131 |
| `data/wiki/weapons.community.json` | 25 |
| `data/wiki/weapons.json` | 123 |
| `data/wiki/weapons.launch-arsenal.json` | 2228 |
| `data/wiki/weapons.launch-ign.json` | 4062 |
| `data/wiki/weapons.launch-more.json` | 333 |
| `data/wiki/wildlife.community.json` | 42 |
| `data/wiki/wildlife.launch-more.json` | 557 |
| `data/wiki/wildlife.launch-world.json` | 635 |
| `data/wiki/wildlife.launch-world2.json` | 585 |
| `data/wiki/wildlife.night-r5.json` | 76 |
| `data/wiki/wildlife.night-sites.json` | 67 |
| `data/wiki/wildlife.previews.json` | 23 |
| `scripts/audit_media.py` | 162 |
| `scripts/ci_pages.mjs` | 96 |
| `scripts/current_state.py` | 209 |
| `scripts/discord_announce_release.py` | 103 |
| `scripts/discord_cards.py` | 100 |
| `scripts/discord_check.py` | 63 |
| `scripts/discord_online.py` | 120 |
| `scripts/discord_safety.py` | 111 |
| `scripts/discord_setup.py` | 252 |
| `scripts/live_wallpaper_scenes.py` | 246 |
| `scripts/make_animation.py` | 26 |
| `scripts/make_installer_art.py` | 147 |
| `scripts/make_live_wallpapers.py` | 282 |
| `scripts/make_posters.py` | 23 |
| `scripts/make_readme_art.py` | 166 |
| `scripts/make_social_preview.py` | 111 |
| `scripts/make_store_art.py` | 167 |
| `scripts/package_release.py` | 69 |
| `scripts/package_store.py` | 309 |
| `scripts/package_unix.py` | 139 |
| `scripts/start_stream.cmd` | 15 |

## Top level

`.claude`, `.git`, `.github`, `.gitignore`, `CHANGELOG.md`, `Cargo.lock`, `Cargo.toml`, `GTA VI - Official Main Theme Extended Remake by XPBeats.mp3`, `GTA-6-HQ-starter.zip`, `GTAVI_Launch_Trailer.mp4`, `GTAVI_Pre-Load_Now.mp4`, `New Text Document.txt`, `README.md`, `backups`, `build.rs`, `cache`, `data`, `discord`, `dist`, `docs`, `docs.rar`, `images`, `installer`, `rustfmt.toml`, `scripts`, `secrets`, `src`, `staging`, `store`, `ui`, `video`, `wallpapers`, `zips`
