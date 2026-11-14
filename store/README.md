# Microsoft Store edition

The same app, built for the Microsoft Store under its own name (working name: HQ Guide), icon,
intro and Home picture. It never ships the game's clips, live wallpapers, cover art or logo, has
no update check (the Store delivers updates) and no Discord presence.

## Build

    python scripts/make_store_art.py
    python scripts/package_store.py                    # no pictures from the game
    python scripts/package_store.py --official-media   # adds Rockstar's published screenshots and artwork

Output: `dist/store/app/` (the unpacked edition) and `dist/store/hq-guide-<version>-x64.msix`.
The Store version is the Cargo version with a leading 1 (0.2.21 becomes 1.2.21.0), because the
Store refuses versions that start with 0.

To look at it without installing: run `dist/store/app/hq-guide.exe`.

## What is in this folder

| File | Use |
|---|---|
| `identity.json` | Names, and the package identity copied from Partner Center |
| `AppxManifest.xml` | Package description template |
| `ui/` | The edition's own artwork code, styles and mark, added to the app's `ui/` |
| `assets/`, `app.ico`, `listing/` | Drawn by `scripts/make_store_art.py` |
| `NOTICE.txt`, `NOTICE-official-media.txt` | The notice shipped in each variant |
| `LISTING.md` | Text for the Store listing |
| `PRIVACY.md` | Privacy policy; must be reachable at a public address |

## Submitting

1. Partner Center > Apps and games > New product > MSIX or PWA app. Reserve the name.
2. Product management > Product identity: copy Package/Identity/Name, Publisher and the publisher
   display name into `identity.json`, then run `package_store.py` again.
3. Start a submission: pricing (Free), properties, age ratings, upload the `.msix`, paste the
   listing from `LISTING.md`, add the logos and screenshots.
4. Submit. The Store signs the package.

## Not done

- The package has not been installed from the `.msix` on this machine (that needs Developer Mode
  or a signing certificate). The unpacked edition was run and checked page by page.
- The Windows App Certification Kit has not been run on it.
- No Xbox build exists. This edition is Windows desktop only.
