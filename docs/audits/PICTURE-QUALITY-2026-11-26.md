# Picture quality and watermark audit, 26 November 2026

Every picture under `images/` was checked (1,248 files, not counting the map icons):

- **Measured:** size, edge sharpness and compression of every file, by script.
- **Watched:** every file looked at by eye in contact sheets that show each picture whole, plus its four corners enlarged, where site logos usually sit.

## What was found

| Problem | Pictures |
|---|---|
| Site watermark or added mark | 7 |
| Phone photo of a TV or monitor | 6 |
| Blurry, tiny, murky or the subject hidden | about 75 |
| Menu covering the scene | 8 |

Four menu screenshots were flagged but are kept on purpose, because the menu is the subject: the save screen, the map index, the ATM screen and the animal compendium.

## Fixed

- **Watermarks (all 7):**
  - The Kingfishers camp and the swamp crane: Game Informer logo. Each was re-cut, without the logo, from a 1920-pixel copy (now 1760x990).
  - "Send More Money to Lorena" and "Making Gainz": GTABase promo banners, replaced with real scenes from those missions.
  - The Mammoth Patriot entry pointed at a GTABase "Vehicles Database" banner. **Still to replace**: the only clean picture is GTABase's 832-pixel studio render.
  - Getting away from the police: an outlet's faint logo, with numbers and arrows drawn on. Replaced with Rockstar's own screenshot.
  - Benefactor Spritz: an emoji sticker. Replaced with a clean studio view.
- **Vehicles:** 40 blurry, tiny or hidden-subject pictures replaced with sharp pictures of the whole vehicle, mostly GTABase's in-game garage views. The Comet '88 and Lowline got larger 1,200- and 1,280-pixel shots from GTA Scoop. The Dorado, Hauler and Lifta pictures changed from .png to .jpg.
- **Weapons:** 5 replaced with clean renders, 1,000 to 1,920 pixels wide. The old Hauners H-AT picture showed a different, older launcher.
- **Wildlife:** the manatee (sharp 1920 close-up) and the Skunk Ape (now the creature itself, with the subtitle cropped out; the entry stays a spoiler).
- **Missions and places:**
  - Gone Fishing and Pipework: 2,560 px, up from 640.
  - The Thrillbilly Mud Club crew: 2,560 px.
  - Pay 'n' Spray: a sharp 2,560-pixel capture.
  - Starfish Island: a clear 1,280-pixel view.
  - The partner-command screen.
- **Field Manual:** the caption and credit of two of its frames were updated to match their new pictures.

Each replacement's record in `data/media.json` names its page and image address and says what it replaced. Every source site's robots.txt was checked first, and no banned site or 2022 leak material was used.

## Second pass, same day

A second search, using GTABase's species pages and its players' map screenshots, replaced 16 more:

- **Animals:** all 11 open ones, each now a sharp close-up from GTABase's species pages: the four dogs, cormorant, duck, orca, raccoon, spoonbill, squirrel and brown pelican.
- **Vehicles:** the Übermacht Apoc and Ascot Paragon (clean studio views), and the Enforcer Coquette (the same player shot, re-cut from its full-size copy without the menu).
- **The last watermark:** the Mammoth Patriot now shows GTABase's studio view of the Patriot, not its "Vehicles Database" banner.
- **Barnacle Beauties:** a clean view of the salon, with no menu over it.

These are sharper than the pictures they replace, even where they are a little narrower.

## Still open (no clean, better copy found on a site we may use)

- **Phone photos of a screen:** Bellissima Hair Salon, Iron & Oak, The Jewelry Place and the Nicole (Standard) card. Alpha Convenience Store stays as it is: it is a phone photo, but it shows the store's sign, which the only clean shot found does not.
- **Soft:** Urban Legendz.
- **Small or soft vehicles:** the Canis Terminus, Grotti Itali GTO, Bravado Bison monster truck and Pegassi Bati 801. GTABase's pages for three of them are gone, and no other site has a picture.
- **Other:**
  - Ambrosia Raceway, Leaf Links and Shoreline Market: no picture of these places was found.
  - Honey FM: the only alternative is a busy radio-wheel screenshot.
  - The headphones.
  - The two mission map cards (Tie Up Loose Ends and Unfinished Business): no scene from either mission was found.
- **Kept on purpose:** the poster map in the Field Manual. Its arrows mark where the four posters are, and it carries no site logo.

None of these was removed: under the project's rule, a picture is only taken out when a better one replaces it.
