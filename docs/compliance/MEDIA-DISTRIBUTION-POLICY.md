# Media distribution policy

**Status: decided on 2026-11-21: option D (two builds), with B (allow-list only) as the public default.** See "Decision" and "How it is enforced" below. This is not legal advice.

## The situation the decision answers

- Until 2026-11-21, `scripts/package_release.py` put all of `ui/`, `data/`, `images/` and `wallpapers/` into the public portable zip and the installer, with no filter. Releases up to 0.2.34 were built that way.
- The project's own rights audit (`MEDIA-RIGHTS-AUDIT.md`, generated 2026-11-21) clears **no** file for public distribution:

| Decision | Files |
|---|---|
| approved_for_distribution | 0 |
| local_personal_use_only (copyright Rockstar Games; fine on the owner's machine, not cleared to redistribute) | 967 |
| unknown (origin or rights not established) | 51 |
| rejected | 0 |

- By source, the 982 records are:
  - 133 from Rockstar's own site or accounts;
  - 744 screenshots taken from other sites;
  - 81 supplied by the owner and not yet verified;
  - 23 evidence frames;
  - 1 with no recorded source.
- 36 files on disk have no record at all. The validator reports 35 of them, the video posters in `wallpapers/posters/`, which are frames of videos whose rights are `permission_required` or `unknown`.
- No permission has been requested or granted for any of it.

The packager and the records disagree. That is a process gap. **It is not a finding that anything infringes**: fan sites commonly show official screenshots, and Rockstar has its own terms for fan content, but this project has not recorded which, if any, apply to redistributing pictures inside a downloadable app.

The interface code, data and bundled libraries are separate from this:
- the Archivo font is under the SIL Open Font License (`ui/fonts/Archivo-OFL.txt`);
- MapLibre GL is under the BSD 3-clause licence (`ui/vendor/maplibre-gl-LICENSE.txt`);
- Leaflet is under the BSD 2-clause licence.

Shipping these with their notices is permitted.

## Options

| | What ships publicly | Effect on the app | Effort | Risk |
|---|---|---|---|---|
| **A. As now** | Everything | Unchanged | None | The package contradicts the project's own records, and any objection reaches every copy already downloaded. |
| **B. Allow-list only** | Only files marked `approved_for_distribution`; today that is none | Entries, map, Street Explorer and wallpapers show no pictures until files are cleared | S: filter by `DISTRIBUTION-ASSET-ALLOWLIST.md` in `package_release.py` | Lowest. The app looks far emptier. |
| **C. Official sources only** | The 133 records from Rockstar's own site or accounts, once the owner has recorded which Rockstar terms they rely on | Most pictures gone. Official art and screenshots stay. | M: record the terms, then mark those records approved and filter as in B | Depends on those terms being recorded and read correctly. |
| **D. Two builds** | B or C publicly; the full set in a personal build made with an explicit flag such as `--include-local-media` | The public build as B or C; the owner's own copy unchanged | S | As B or C for the public build. The personal build must never be uploaded. |

Whichever is chosen, the packager should refuse to build a public package that contains a file the allow-list doesn't approve. That turns the policy into a check rather than a habit.

## Recommendation

**D, with B as the public default**, until the owner records which Rockstar terms, if any, cover redistributing official media. C can follow once that is written down. This keeps the owner's own app as it is and makes the public package match the project's records. It is the owner's call.

## Not covered here

- The Microsoft Store submission's media, which may face its own Store content review.
- Pictures already published in earlier releases (0.2.x).
- Whether to request permission from rights holders.

## Decision

**Option D, with B as the public default.** Every public release, on GitHub or anywhere else, carries only media the allow-list approves; today that is none. The owner's own copy keeps every picture through a separate personal build. Option C (official sources only) can follow once the owner records which Rockstar terms, if any, cover redistributing official media. That will be a new entry in the log below.

## How it is enforced

`scripts/package_release.py`:
- **Default: public build.** It assembles `dist/public/app` with the Microsoft Store edition's no-game-media layout (`scripts/package_store.py`), under the GitHub name and keeping the update check and Discord presence:
  - every reference to a picture or clip that isn't shipped is removed from the data;
  - the game's logo, cover art and intro clips are replaced by the app's own mark;
  - the program carries the app's own icon (`store/app.ico`) instead of the GTA VI logo;
  - the installer uses Inno Setup's plain pages, with `installer/notice-public.txt`, instead of the key-art wizard images and the setup window (`installer/shell`), which both contain game artwork.
- **Before packing, it stops** if any file under `images/` or `wallpapers/` isn't on the allow-list, or if the data or the page refers to one. It also runs the app's own data check.
- **`--include-local-media`: personal build.** The full working tree with the setup window, written to `dist/personal/` with PERSONAL in every file name, and a warning printed. Never attach it to a release.

Checked on 2026-11-21:
- The public build: 122 files, 4.2 MB zip, 5.2 MB setup; data check 0 errors.
- Run in headless Edge: every main page draws, 3D builds, and there are no script errors. No file under `images/` or `wallpapers/` was requested.
- The personal build: 1,137 files, 201 MB zip, 211 MB setup.

**Map in builds without the official map picture (fixed 2026-11-21):** these builds show the community map tiles (the GTA VI mapping community via gtadb.org, CC BY 4.0, served by gta6-wiki.org), which draw the island at a different scale and place from the official poster that the pin positions were placed on.
- `map.tileFit` in `data/wiki.json` records how the two line up: tile pixel at zoom 3 = 0.684 × official-map pixel + (−168, −130).
- It was found by matching land against sea on both maps (land overlap 88%).
- The 2D map converts every pin, route and click through it, and 3D draws the tiles onto a canvas shaped like the official map.
- Tiles are requested only where the tile set has them (2,048 × 2,560 pixels at zoom 3).
- In those builds the map's credit line and the sidebar name the community map instead of Rockstar's.
- Pin positions stay approximate.

Updates from an earlier full install: the public installer adds and replaces files but doesn't delete the pictures an older version left in the install folder, and the in-app updater now opens the plain installer pages instead of the custom setup window.

## Decision log

| Date | Decision | By |
|---|---|---|
| 2026-11-21 | Option D (two builds); public builds carry only allow-listed media (none today). | The owner |
