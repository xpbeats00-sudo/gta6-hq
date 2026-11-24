# Picture gaps: 24 November sweep

**Date:** 2026-11-24. **Version:** 0.2.42 plus this sweep. Follows [PICTURE-GAPS-2026-11-23.md](PICTURE-GAPS-2026-11-23.md).

## The short answer

- **63 new pictures** and **1 better replacement**, each looked at by eye before it went in.
- **Pictures removed for site logos could come back on an installed copy.** The installer never deleted old files, and the app attaches any picture named after an entry. An installed 0.2.42 still held 1,932 pictures removed on 21 November for watermarks such as POWERPYX.COM, and they showed in the app.
  - Fixed two ways: the installer now replaces the shipped folders whole, and the app only attaches a picture that has an approved record in `data/media.json`.

## What was added

| Section | Before | After | New |
|---|---|---|---|
| Characters | 63 | 65 | 2 (Bailey, Vinny) |
| Locations | 52 | 57 | 5, plus a cleaner Key Lento Police Station |
| Vehicles | 253 | 264 | 11 |
| Weapons | 75 | 76 | 1 (Sand Storm ES9) |
| Businesses | 63 | 79 | 16 |
| Activities | 18 | 27 | 9 |
| Gameplay | 57 | 68 | 11 |
| Missions | 156 | 163 | 7 |
| Factions | 6 | 7 | 1 (Cellerica) |

**Sources:**
- GTABase's interactive-map player screenshots
- Output Lag, Leonida Insights, GTA Boss, GTA Scoop, GTA Vice Guides
- TechWiser, VGC, PC Gamer and GamesRadar+

Each site's robots.txt allows Claude agents. None of the blocked sites, PowerPyx, GTA BOOM or rockstargames.com (its robots.txt disallows ClaudeBot) was used. Every picture has a record naming the page and the image address.

**Crops:** 9 pictures were cropped to leave out the minimap, vehicle name cards, prompts, pop-ups or the money counter. Their records say so.

## Turned down

- **Sexualised framing:**
  - shots framed on women from behind or in short dresses (Andy's Peach, Encrypted Hard Drive, Heist Planning, one Cellerica shot);
  - a bikini shot (Call Nate);
  - a strip-club stage with a bare-backed dancer in front (Frankie Delight).
- **Game display covering the scene:** phone listings for the garages; golf, map and stunt menus; Read the Label; Kolts & Associates; the finale, The End of the Road (which could also give part of the ending away).
- **Weak or unsure matches:**
  - Monty, with his face half out of frame;
  - Raina, too dark to tell who is who;
  - Dobbs, a masked diver;
  - Leonida RC Raceway, posted under two names;
  - Little Cuba and Pelican Valley, where the label is the site's own guess;
  - a distant Sea Sparrow;
  - a Swift in a company livery.
- **Radio station logos:** fan uploads with no stated source, padded to size. The CircoLoco logo only exists on rockstargames.com.
- **Other:** the Backroom weed front shot (a person lying on the floor), and pictures under 960 px wide.

## Still to look at

- **Under the Bridge collectible:** the picture (an official Rockstar beach screenshot) has a woman lying face down in a thong in the foreground. It should be replaced when a clean picture of a bridge stunt turns up.
- **Characters still without a picture:** Burim, Frankie Delight, Declan, Manuel, Lorena, Monty, Dobbs, Raina and Ernesto.
  - Most are only named in phone calls or in text.
  - Ernesto is never shown on screen.
- **Weak location pictures:** Belville, South Vice-Dale County, Shoreline Market and Bocamar Bridge. No clean replacement was found on an allowed site.
- **GTABase's map competition** runs to 28 November and new player screenshots keep arriving. Another pass there in a few days should fill more places and businesses.
- **GTABase only:** its per-item pictures for weapons, animals and standouts are under 960 px. Its larger map pictures are scrambled in the page data and weren't decoded.
