> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# Asset inventory

**No asset was added, replaced, moved, resized or deleted in the redesign.** Nothing was downloaded from Rockstar's site or anywhere else: no images, video, fonts or code.

The machine-readable record is `data/media.json`; `gta6-hq --validate` checks it against the files on disk.

## Videos (`wallpapers/`)

All are 1920×1080 H.264 with no audio track. All were supplied by the app's owner. Creator and licence are not known.

| File | Length | Size | Used for |
|---|---|---|---|
| `gta6splashscreen.mp4` | 10.3 s | 0.9 MB | Loading screen |
| `gta-vi-couple-on-muscle-car-pastel-palms.mp4` | 10.2 s | 4.9 MB | Home hero; gallery |
| `gta-6-dawn-of-the-heist.mp4` | 10.3 s | 4.1 MB | Gallery; Home media strip |
| `gta-vi-pier-showdown-jason-lucia.mp4` | 12.7 s | 4.6 MB | Gallery; Home media strip |
| `gta-vi-pink-neon-logo-reflection.mp4` | 10.2 s | 4.5 MB | Gallery |
| `jason-and-lucia-vice-city-sunset-gta-vi.mp4` | 10.3 s | 2.0 MB | Gallery |

## Images (`images/`)

| File | Size | Origin | Used for |
|---|---|---|---|
| `gta6.png` | 950×720 | Supplied by the owner. Rockstar's trademark | Header mark, window icon. No longer shown in the hero |
| `muscle-car-pastel-palms.jpg` | 1920×1080 | Frame of the muscle-car video | Hero poster; Vice City |
| `pier-showdown.jpg` | 1920×1080 | Frame of the pier video | Leonida Keys |
| `dawn-of-the-heist.jpg` | 1920×1080 | Frame of the heist video | Gallery |
| `vice-city-sunset.jpg` | 1920×1080 | Frame of the sunset video | Gallery |
| `pink-neon-logo.jpg` | 1920×1080 | Frame of the neon video | Gallery |
| `vi-logo-reveal.jpg` | 1920×1080 | Frame of the splash video | Gallery |
| `characters/jason-duval.jpg` | 600×800 | Crop of `vice-city-sunset.jpg` | Jason's portrait |
| `characters/lucia-caminos.jpg` | 600×800 | Crop of `vice-city-sunset.jpg` | Lucia's portrait |
| `vehicles/muscle-car.jpg` | 1100×619 | Crop of `muscle-car-pastel-palms.jpg` | Muscle Cars |
| `vehicles/sports-car.jpg` | 960×540 | Crop of `vice-city-sunset.jpg` | Sports Cars |
| `vehicles/speedboat.jpg` | 700×394 | Crop of `pier-showdown.jpg` | Boats |

Rights status for every file above: **unknown**. Each shows "Rights not confirmed" in the media viewer.

## Fonts

| Font | Source | Licence basis |
|---|---|---|
| Bahnschrift | Installed with Windows 10/11 | Used as a system font; not bundled or redistributed |
| Segoe UI | Installed with Windows | Same |

## Code and vector art

| Item | Origin |
|---|---|
| Leaflet 1.9.4 (`ui/vendor/`) | cdnjs; BSD 2-Clause |
| "No artwork on file" panels (`ui/art.js`) | Drawn in code for this project |
| Search icon in the header | Drawn in code for this project |
| Map tiles | GTA VI mapping community via gtadb.org, CC BY 4.0, fetched from gta6-wiki.org and cached; attribution shown on the map |

## Missing artwork

| Where | State shown |
|---|---|
| Six supporting characters | "No artwork on file" portrait panel |
| Grassrivers, Port Gellhorn, Ambrosia, Mount Kalaga | "No artwork on file" panel with line work |
| Five vehicle entries; all gameplay, activity, wildlife, business, faction and music entries | Text-only entries |

To add artwork for an entry, save it as `images/<section>/<slug>.jpg` and record it in `data/media.json`. See `docs/EDITORIAL_POLICY.md`.

## Image sizes

The largest stills are 1920×1080 JPEGs of 0.3–0.4 MB, already small enough that separate responsive sizes were not generated. The two character portraits are 600×800 and are shown at up to about 560 px wide, so they are not enlarged beyond their own size.

## Additions after the redesign (2026-11-11)

Made or added at the owner's request. Details for each are in `data/media.json`.

| File | Origin | Rights status |
|---|---|---|
| `wallpapers/gta6splashscreen.mp4` | Re-rendered from the original at 60 fps (was 30 fps) with motion interpolation. Original kept as `backups/gta6splashscreen-original-30fps.mp4` | Unknown, as before |
| `images/vi-logo-reveal-discord-1024.png` | Frame of the splash video, squared and inset for a Discord server icon | Unknown |
| `images/locations/grassrivers.jpg`, `port-gellhorn.jpg`, `ambrosia.jpg`, `mount-kalaga-national-park.jpg` | Official Rockstar screenshots (Grassrivers 04, Port Gellhorn 06, Ambrosia 01, Mount Kalaga National Park 04), 1920×1080, from `rockstargames.com/VI/media/screenshots` | Permission needed |
| `images/characters/cal-hampton.jpg`, `boobie-ike.jpg`, `drequan-priest.jpg`, `real-dimez.jpg`, `raul-bautista.jpg`, `brian-heder.jpg` | Official Rockstar screenshots (Cal Hampton 01, Boobie Ike 03, Dre'Quan Priest 02, Real Dimez 04, Raul Bautista 03, Brian Heder 01), cropped to 810×1080 portrait | Permission needed |
| `images/vehicles/vapid-dominator-buggy.jpg` | Official Rockstar screenshot (Ultimate Edition Vapid Buggy 01), 1920×1080 | Permission needed |

The Rockstar screenshots are copyright Rockstar Games. Its media page offers them to download and share, but no formal licence is recorded, so they are marked "Permission needed" rather than "Rights confirmed". With these, every character and region now has artwork; the "Missing artwork" table above is out of date for those rows.

### Protagonists, Vice City and the Keys (2026-11-11)

Swapped to official Rockstar screenshots at the owner's request; rights status "Permission needed", as above.

| File | Screenshot |
|---|---|
| `images/characters/jason-duval.jpg` | Jason Duval 01, cropped to 810×1080. Previous wallpaper crop kept in `backups/wallpaper-crops/` |
| `images/characters/lucia-caminos.jpg` | Lucia Caminos 14, cropped to 810×1080. Previous crop kept in `backups/wallpaper-crops/` |
| `images/locations/vice-city.jpg` | Vice City 01, 1920×1080 |
| `images/locations/leonida-keys.jpg` | Leonida Keys 01, 1920×1080 |

`data/wiki.json` no longer points Vice City and the Leonida Keys at the wallpaper stills (previous copy: `backups/wiki-before-official-swap.json`). The stills remain in the gallery.
