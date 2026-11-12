# Media rights audit

Generated 2026-11-12 09:55 by `scripts/audit_media.py` from the files on disk and `data/media.json`. Do not edit by hand.

## Summary

| Check | Result |
|---|---|
| Media files on disk (`images/`, `wallpapers/`) | 102 |
| Records in `data/media.json` | 102 |
| Files with no record | 0 |
| Records with no file | 0 |
| Groups of identical files | 0 |
| Files not used anywhere | 5 |
| Records missing source, licence, creator or description | 0 |
| Records with no retrieval date | 14 |

## Distribution decision

The decision is derived from each record's `rights_status`. Nothing here is legal advice, and no permission has been requested or granted.

| Decision | Files | Meaning |
|---|---|---|
| approved_for_distribution | 0 | Cleared to ship in a public package |
| local_personal_use_only | 88 | Copyright Rockstar Games; fine on the owner's own machine, not cleared to redistribute |
| unknown | 14 | Origin or rights not established |
| rejected | 0 | Must not be used |

**No file is cleared for public distribution.** A public installer built today would have to leave out every picture and video.

## What kind of picture each record is

| Kind | Records |
|---|---|
| evidence_frame | 11 |
| official_illustration | 77 |
| owner_supplied_unverified | 14 |

`evidence_frame`: a frame of Rockstar's official video, used as evidence in the manual or as an entry picture. `official_illustration`: an official Rockstar screenshot or artwork. `owner_supplied_unverified`: supplied by the app owner, or cut from such a file; where it first came from is not recorded.

## Files with no record

None.

## Records with no file

None.

## Identical files

None.

## Files not used anywhere

On disk and recorded, but no entry, manual page or interface file points at them.

- `images/dawn-of-the-heist.jpg`
- `images/pink-neon-logo.jpg`
- `images/vi-logo-reveal-discord-1024.png`
- `images/vi-logo-reveal.jpg`
- `images/vice-city-sunset.jpg`

## Records with no retrieval date

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

## Owner decisions still needed

1. Is the app for private use only, or will it be distributed? Private use is the lower-risk case; keep this register either way.
2. For distribution: ask Rockstar Games for permission, or ship a package without the media.
3. Where did the wallpapers and the logo (`unknown`) come from? Without that they cannot be cleared.

Per-file hashes, sources and decisions: `media-hashes.csv`.
