> This is a running log, appended by date. For the current count, hashes and distribution decision of every file, see `docs/compliance/MEDIA-RIGHTS-AUDIT.md`.

# Field Manual: asset and rights register

Date: 2026-11-11. The machine-readable record for every file is `data/media.json`.

## Images used by the manual

| Where | File | Origin | Rights status |
|---|---|---|---|
| Cover | `images/locations/vice-city.jpg` | Official Rockstar screenshot "Vice City 01" | Permission needed |
| Law Enforcement opening | `images/manual/law-enforcement-opening.jpg` | Official Rockstar screenshot "Lucia Caminos 14", uncropped. The same screenshot, cropped, is Lucia's portrait | Permission needed |
| Leonida, Characters, Vehicles chapters | The encyclopedia's entry images (`images/locations/*`, `images/characters/*`, `images/vehicles/*`) | Official Rockstar screenshots from `rockstargames.com/VI/media/screenshots` | Permission needed |

"Permission needed" means: copyright Rockstar Games; its media page offers the screenshots to download and share, but no formal licence is recorded. This is fine for a personal app and should be reviewed before the app is distributed.

No image was downloaded for the manual: the one new file is a copy of a screenshot already fetched, with the owner's approval, for the character pages.

## Drawn for the manual

| Item | Where | Note |
|---|---|---|
| Six-star row | The Wanted Level page | Drawn in code. Captioned "Manual illustration … not the game's own artwork" |
| Flow diagrams | Becoming Aware; Wanted vs Heat | Boxes and lines in CSS. Captioned as a simplified model |

## Not used

| Item | Reason |
|---|---|
| The GTA IV manual pages | Layout reference only, and not present in the repository. No text or image from them is used |
| The game's Heat icons and wanted HUD | No permitted, legible source image; not redrawn, so nothing imitates the official interface |
| Screenshots from GamesRadar+, GTABase or VICE articles | Their images are Rockstar's or their own; not copied |
| Fan-made HUD recreations | None used |
| Images from other Grand Theft Auto games | None used |

## Fonts

Bahnschrift (headings, numerals, labels) and Georgia (body, italic intros) are Windows system fonts. Nothing is bundled or downloaded.

## Text

All manual text was written for this project. One quotation of nine words from Rob Nelson is attributed on the page and in the source list. Press sources are linked, not reproduced.

## Still wanted

- A legible, permitted image of the wanted and Heat display.
- A police pursuit screenshot for the chapter opening (the current one shows police lights behind Lucia, not a chase).

## Update, 2026-11-12: GTA VI pictures added, layout tuned

At the owner's direction the manual uses GTA VI imagery only.

| Where | File | Official Rockstar screenshot | Rights status |
|---|---|---|---|
| Law Enforcement opening | `images/manual/pursuit-jason-motorcycle.jpg` | Jason Duval 11 | Permission needed |
| What the Police Know | `images/manual/law-enforcement-opening.jpg` | Lucia Caminos 14 (moved from the opening) | Permission needed |
| Finding the Police | `images/manual/officer-through-fence.jpg` | Jason Duval 07 | Permission needed |
| Hot Areas | `images/manual/vice-city-police-on-the-road.jpg` | Vice City 17 | Permission needed |
| Clear the Clues | `images/manual/lucia-driving-police-lights.jpg` | Lucia Caminos 07 | Permission needed |

All four new files were downloaded from `rockstargames.com/VI/media/screenshots` at 1920×1080 and are recorded in `data/media.json`. Captions describe only what each picture visibly shows, and the chapter's opening page says the pictures were chosen for their subject and are not evidence for the rule printed beside them. The one exception is the Police Response entry "Cars, a boat and a helicopter", which is labelled Demonstrated and rests on what "Vice City 17" shows.

The "pursuit screenshot for the chapter opening" listed under "Still wanted" is now in place. A legible, permitted image of the wanted and Heat display is still wanted.

**GTA IV manual.** No GTA IV image or text is in the project. To tune the layout, one two-page spread of the GTA IV manual ("Places – Best Sights: The Top Five") was viewed in the browser on Archive.org and not saved. What was taken from it is layout only: a coloured lead phrase in the heading with a lighter second half, a coloured section tab at the top outer corner, picture-led numbered entries in two columns with one large lead entry, and italic caption-style location lines.

## Superseded in part, 2026-11-12

The wanted-star pages were later rebuilt from frames of Rockstar's official Extended Look, and independently fact-checked. See `RERUN-REPORT.md` for what the footage shows, the new evidence counts, the frames added and the checks run.

## Update, 2026-11-12: sixteen more official screenshots

At the owner's request, pictures were added to the manual pages that had none. All are official Rockstar screenshots downloaded at 1920x1080 from `rockstargames.com/VI/media/screenshots`, recorded in `data/media.json` with rights status "permission needed". They illustrate their subject; none is evidence for a rule.

| Where | File | Official screenshot |
|---|---|---|
| How to Read This Manual | `images/manual/jason-and-lucia-waterfront.jpg` | Jason and Lucia 01 |
| Finding Your Way | `images/manual/vice-city-skyline-night.jpg` | Vice City 27 |
| Getting Started (in development) | `images/manual/jason-and-lucia-in-car.jpg` | Jason and Lucia 03 |
| How Police Become Aware | `images/manual/robbery-with-bystanders.jpg` | Jason and Lucia 15 |
| Wanted State vs. Heat | `images/manual/officers-at-patrol-car.jpg` | Vice City 06 |
| Police Response | `images/manual/motorcycle-patrol-car-helicopter.jpg` | Jason and Lucia 09 |
| Weapons & Equipment (in development) | `images/manual/jason-loading-pistol.jpg` | Jason Duval 09 |
| Vehicles: Airboats | `images/vehicles/airboat.jpg` | Grassrivers 03 |
| Vehicles: Pickups, Dirt Bikes and ATVs | `images/vehicles/pickup-truck.jpg` | Jason Duval 14 |
| Vehicles: Planes and Helicopters | `images/vehicles/aircraft.jpg` | Mount Kalaga National Park 02 |
| Vehicles: Jet Skis and Kayaks | `images/vehicles/jet-ski.jpg` | Mount Kalaga National Park 06 (a kayak) |
| Activities: Racing | `images/activities/racing.jpg` | Mount Kalaga National Park 01 (dirt bikes and a quad; not shown to be a race) |
| Activities: Water sports | `images/activities/water-sports.jpg` | Leonida Keys 04 |
| Activities: Sports and leisure | `images/activities/sports-and-leisure.jpg` | Jason Duval 15 |
| Activities: Hunting, fishing and off-roading | `images/activities/hunting-and-fishing.jpg` | Jason Duval 03 |
| Activities: Everyday life | `images/activities/everyday-life.jpg` | Jason Duval 04 |

The vehicle and activity pictures also appear on those entries in the encyclopedia. `ui/manual.js` now shows a chapter's `image` on an in-development chapter page. Checks: `--validate` 0 errors, 61 warnings (all media rights); `cargo test` 53 passed; 14 manual pages loaded with no broken pictures and no console errors.

## Update, 2026-11-12: racing and jet ski pictures replaced

At the owner's request the two pictures that did not show their subject were replaced with frames of Rockstar's official Extended Look, read from Rockstar's server at one moment each (the video was not downloaded whole).

| Entry | File | Now | Was |
|---|---|---|---|
| Activities: Racing | `images/activities/racing.jpg` | Frame at about 18:36: a dirt bike race, with lap 1/2, position 11/12 and a timer on screen | Mount Kalaga National Park 01 |
| Vehicles: Jet Skis and Kayaks | `images/vehicles/jet-ski.jpg` | Frame at about 17:26: three jet skis on open water | Mount Kalaga National Park 06 (a kayak) |

Both frames include the game's on-screen display (minimap; the race frame also its lap, position and timer). Rights status "permission needed". The previous files are kept in `backups/`.

## Update, 2026-11-12: speedboat picture replaced; manual restyled

- `images/vehicles/speedboat.jpg` is now the official screenshot "Ultimate Edition Squalo 01" (was a crop of an owner-supplied wallpaper, rights unknown). Rights status "permission needed". The previous file is in `backups/before-swap-speedboat.jpg`.
- The manual's look was changed from olive-on-paper to Grand Theft Auto VI's sunset colours (orange, pink, violet): new cover with the owner-supplied VI logo, a colour band on every page, chapter-number openers, filled evidence badges, full-width pictures. Files: `ui/manual.css` (rewritten), `ui/manual.js` (cover and page header). Previous versions: `backups/manual-css-before-vi-restyle.css`, `backups/manual-js-before-vi-restyle.js`.
- The manual is still labelled unofficial: an "Unofficial fan manual" flag on the cover, the cover notice, and the footer of every page. No Rockstar Games logo is used.
- Checked in a local copy at 1440 px (paper and night) and 375 px: no sideways overflow on 7 pages, no console errors.

## Update, 2026-11-12: eight more official screenshots; Activities pages rebalanced

Added so that no manual page is left half empty. All are official Rockstar screenshots (1920x1080, `rockstargames.com/VI/media/screenshots`), rights status "permission needed".

| Entry | File | Official screenshot |
|---|---|---|
| Activities: PTT Youngin$ raid | `images/activities/ptt-youngins-raid.jpg` | Ultimate Edition PTT Store |
| Activities: Classic Car Collection | `images/activities/classic-car-collection.jpg` | Ultimate Edition Wyman Car Collection 01 |
| Vehicles: Dinka Enduro | `images/vehicles/dinka-enduro.jpg` | Ultimate Edition Safehouse Vehicles 02 |
| Vehicles: Crest Kayak | `images/vehicles/crest-kayak.jpg` | Ultimate Edition Safehouse Vehicles 03 |
| Vehicles: Vapid Ganado | `images/vehicles/vapid-ganado.jpg` | Ultimate Edition Safehouse Vehicles 01 |
| Vehicles: '55 Vapid Stanier | `images/vehicles/vapid-stanier-55.jpg` | Vintage Vice City Pack Vapid Stanier 01 |
| Vehicles: '95 Grotti Cheetah | `images/vehicles/grotti-cheetah-95.jpg` | Ultimate Edition '95 Grotti Cheetah 02 |
| Vehicles: Shitzu Squalo | `images/vehicles/shitzu-squalo.jpg` | Ultimate Edition Squalo 04 |

The Activities chapter now shows four entries a page instead of five (`data/manual.json`, `wiki.perPage`), so its last page carries three pictured entries.

## Update, 2026-11-12: Weapons & Equipment pictures

The chapter now lists the encyclopedia's three sourced weapon entries, each with an official Rockstar screenshot (1920x1080, rights status "permission needed").

| Entry | File | Official screenshot |
|---|---|---|
| Hawk & Little Morgan Revolvers | `images/weapons/hawk-and-little-morgan-revolvers.jpg` | Ultimate Edition Hawk and Little Morgan Revolvers 02 |
| Girardi ES9 | `images/weapons/girardi-es9.jpg` | Ultimate Edition Weapon Variants (shows both personalized pistols; the screenshot does not say which is which) |
| Klose K17 | `images/weapons/klose-k17.jpg` | Lucia Caminos 13 (Lucia aiming a pistol; the screenshot does not name the pistol) |

`ui/manual.js`: an encyclopedia-drawn chapter can now carry a chapter picture under its introduction.

## Update, 2026-11-12: Encyclopedia pictures

- 30 pictures added so that 72 of the 73 encyclopedia entries have one: 19 official screenshots and the Trailer 1 poster frame, 9 pieces of official music artwork from `rockstargames.com/VI/music` (score and album covers, the radio section picture and six station backgrounds), and one frame of the Extended Look at about 8:13 (Stealing cars: it shows a man opening a car door, not a theft). All are recorded in `data/media.json`, rights status "permission needed".
- Four entries reuse a picture already in the project through an `image` field: Deer (the cougar-and-deer screenshot), Sea turtles (the divers screenshot), Six-star wanted level (the 14:08 footage frame) and Fleeca bank (the robbery screenshot).
- No picture: Tisha-Wocka flea market. Nothing in the official gallery could be identified as it.
- Several pictures illustrate an entry without being labelled as it by Rockstar: Allied Crystal (an aerial of Ambrosia with an industrial plant), Brian Heder's boat yard (Brian with a clipboard), Raul Bautista's crew (Raul alone), Keys drug runners (Jason at a seaplane), Only Raw Records (two men in a studio), Fleeca bank.
- `ui/app.js`, `ui/styles.css`: the Encyclopedia's category list is now picture cards with the text underneath, and the A to Z list has thumbnails. Previous versions are in `backups/`.
