# Media rights audit

Generated 2026-11-28 02:41 by `scripts/audit_media.py` from the files on disk and `data/media.json`. Do not edit by hand.

## Summary

| Check | Result |
|---|---|
| Media files on disk (`images/`, `wallpapers/`) | 2722 |
| Records in `data/media.json` | 2722 |
| Files with no record | 0 |
| Records with no file | 0 |
| Groups of identical files | 0 |
| Files not used anywhere | 38 |
| Records missing source, licence, creator or description | 0 |
| Records with no retrieval date | 21 |

## Distribution decision

The decision is derived from each record's `rights_status`. Nothing here is legal advice, and no permission has been requested or granted.

| Decision | Files | Meaning |
|---|---|---|
| approved_for_distribution | 35 | Cleared to ship in a public package |
| local_personal_use_only | 2661 | Copyright Rockstar Games; fine on the owner's own machine, not cleared to redistribute |
| unknown | 26 | Origin or rights not established |
| rejected | 0 | Must not be used |

**No file is cleared for public distribution.** A public installer built today would have to leave out every picture and video.

## What kind of picture each record is

| Kind | Records |
|---|---|
| evidence_frame | 23 |
| official_illustration | 142 |
| owner_supplied_unverified | 136 |
| third_party_screenshot | 2413 |
| unrecorded_source | 8 |

`evidence_frame`: a frame of Rockstar's official video, used as evidence in the manual or as an entry picture. `official_illustration`: a Rockstar screenshot or artwork taken from one of Rockstar's own sites or accounts. `third_party_screenshot`: game imagery taken from another site (a wiki, a database or a news site), even when that site credits Rockstar; it is not counted as official. `owner_supplied_unverified`: supplied by the app owner, or cut from such a file; where it first came from is not recorded. `unrecorded_source`: no web address in the recorded source.

## Files with no record

None.

## Records with no file

None.

## Identical files

None.

## Files not used anywhere

On disk and recorded, but no entry, manual page or interface file points at them.

- `images/artwork/hotel-promenade-man.webp`
- `images/artwork/seaplane-dock-man.webp`
- `images/editions/classic-car-collection-05.jpg`
- `images/editions/goodtime-gear-01.jpg`
- `images/editions/grotti-cheetah-95-interior.jpg`
- `images/editions/grotti-cheetah-95-rear.jpg`
- `images/editions/hawk-and-little-morgan-revolvers-01.jpg`
- `images/editions/rideout-customs-01.jpg`
- `images/editions/saras-salon-01.jpg`
- `images/editions/saras-salon-02.jpg`
- `images/editions/standard-edition-cover.jpg`
- `images/editions/ultimate-edition-cover.jpg`
- `images/editions/vice-city-style-01.jpg`
- `images/editions/vice-city-style-02.jpg`
- `images/editions/vice-city-style-03.jpg`
- `images/editions/vice-city-style-04.jpg`
- `images/editions/vice-city-style-05.jpg`
- `images/editions/vintage-looks-01.jpg`
- `images/editions/vintage-looks-02.jpg`
- `images/editions/vintage-looks-03.jpg`
- `images/editions/vintage-looks-04.jpg`
- `images/editions/vintage-looks-05.jpg`
- `images/editions/vintage-vice-city-pack-01.jpg`
- `images/manual/footage/circuit-race-1742.jpg`
- `images/map/walker-lucia.png`
- `images/vehicles/67-transgressor.jpg`
- `images/vehicles/benefactor-shafter-s.jpg`
- `images/vehicles/benefactor-shafter-v12.jpg`
- `images/vehicles/declasse-walton-l35.jpg`
- `images/vehicles/western-zombie-chopper.jpg`
- `images/vi-logo-reveal-discord-1024.png`
- `images/vi-logo-reveal.jpg`
- `images/web/gamespot-b18e27b34182.jpg`
- `images/web/gamesradar-94c55f64825f.jpg`
- `images/web/gtabase-ebe6601473b3.jpg`
- `images/web/ign-2bde806570a0.jpg`
- `images/web/playday-0a37c7f1372f.jpg`
- `images/web/playday-9476143ebf71.jpg`

## Records with no retrieval date

- `images/community/server-icon.png`
- `images/dawn-of-the-heist.jpg`
- `images/gta6.png`
- `images/muscle-car-pastel-palms.jpg`
- `images/pier-showdown.jpg`
- `images/pink-neon-logo.jpg`
- `images/vi-logo-reveal-discord-1024.png`
- `images/vi-logo-reveal.jpg`
- `images/vice-city-sunset.jpg`
- `wallpapers/gta-6-dawn-of-the-heist.mp4`
- `wallpapers/gta-vi-couple-on-muscle-car-pastel-palms.mp4`
- `wallpapers/gta-vi-pier-showdown-jason-lucia.mp4`
- `wallpapers/gta-vi-pink-neon-logo-reflection.mp4`
- `wallpapers/gta6splashscreen.mp4`
- `wallpapers/jason-and-lucia-vice-city-sunset-gta-vi.mp4`
- `wallpapers/posters/gta-6-dawn-of-the-heist.jpg`
- `wallpapers/posters/gta-vi-couple-on-muscle-car-pastel-palms.jpg`
- `wallpapers/posters/gta-vi-pier-showdown-jason-lucia.jpg`
- `wallpapers/posters/gta-vi-pink-neon-logo-reflection.jpg`
- `wallpapers/posters/gta6splashscreen.jpg`
- `wallpapers/posters/jason-and-lucia-vice-city-sunset-gta-vi.jpg`

## Owner decisions still needed

1. Is the app for private use only, or will it be distributed? Private use is the lower-risk case; keep this register either way.
2. For distribution: ask Rockstar Games for permission, or ship a package without the media.
3. Where did the wallpapers and the logo (`unknown`) come from? Without that they cannot be cleared.

Per-file hashes, sources and decisions: `media-hashes.csv`.
