# Picture gaps

**Date:** 2026-11-23. **Version:** 0.2.39 plus the uncommitted work of 22 and 23 November. Every number below is counted from `data/` (an entry counts as having a picture when it names one, or when an approved record in `data/media.json` lists it under `related`).

## The short answer

- **Coverage:** 931 of 3,075 encyclopedia entries (30%) have a picture.
- **New on 23 November:** 123 new pictures, each checked by eye. Three sexualised pictures that were already in the app were replaced with clean ones.
- **Biggest gaps:** collectibles (1,242 without), businesses (224) and activities (193). These are mostly one-of-many items: single trading cards, street-art pieces, garages, drone races.
- **Little or nothing left on allowed sites:** characters, Strangers and Freaks side jobs, and Papa Audacity.

## Coverage by section

| Section | Entries | With a picture | Without |
|---|---|---|---|
| Characters | 74 | 63 (85%) | 11 |
| Locations | 156 | 59 (38%) | 97 |
| Vehicles | 383 | 274 (72%) | 109 |
| Gameplay | 124 | 67 (54%) | 57 |
| Activities | 222 | 29 (13%) | 193 |
| Wildlife | 124 | 92 (74%) | 32 |
| Businesses | 287 | 63 (22%) | 224 |
| Factions | 17 | 6 (35%) | 11 |
| Music and Radio | 30 | 25 (83%) | 5 |
| Weapons | 210 | 82 (39%) | 128 |
| Missions and Story | 191 | 156 (82%) | 35 |
| Collectibles | 1,257 | 15 (1%) | 1,242 |
| **All** | **3,075** | **931 (30%)** | **2,144** |

## What was added on 23 November

| Section | Added | From |
|---|---|---|
| Animals | 49 | GTABase's animal pages: species and fish, matched by exact name |
| Businesses | 39 | GTABase's interactive map, plus PC Gamer, TechWiser and op.gg |
| Missions | 19 | Strangers and Freaks jobs and story missions: Output Lag, GTA6 Heists, VGC, PC Gamer, Bloxodes |
| Vehicles | 10 | GTABase vehicle pages: exact names, or the same car with the year written the other way round |
| Locations | 4 | GTABase's interactive map: Gellhorn Fun Fair, Key Lento Marina, Monument of Leonidan Supremacy, Triangler Sculpture |
| Weapons | 2 | GTABase weapon pages: Hauners H-AT, Donnie's Knife |

### How the pictures were checked

- **Every picture was looked at.** None has a site logo, watermark, added arrows or text, or anything sexualised, and none comes from the 2022 leak.
- **On-screen game elements were cropped out** where they covered the picture: the minimap, money counter and button prompts. This applies to 3 locations and 9 businesses.
- **Sources:** each site's robots.txt allows Claude agents. None of the blocked sites, PowerPyx or Push Square was used.
- **Records:** every picture has a record in `data/media.json` naming the page and image address.

### Turned down

- **Unsuitable:**
  - photos of a TV screen (4 businesses);
  - pictures with profane subtitles on screen (Backseat Pilot, a Payday Loans robbery);
  - a shot framed on a character's backside (Collect Moses' Gift);
  - a shot that gives away the twist of Kyle's "Buddy?".
- **Low quality:** a 400 px Vapid Dominator GTX, a 640 px dirt-bike race.
- **Weak matches:** pictures from a different mission (Passing the Torch, Tail the Security Van) and a car park that isn't clearly Trader's Union.
- **Liveries:** named Standout liveries such as the "Smuggler Caracara" were not given the base car's picture, because it would show the wrong paint.
- **GTA BOOM:** its pictures carry a GTABOOM.COM watermark.

### Pictures that were already in the app

The first mission batch wrote over 114 mission pictures already in the app, saved again from the same GTABase addresses. All 114 were restored from git unchanged.

Seven later picks duplicated a mission picture already in the app:
- **Five kept their earlier picture:** Child's Play, Clonin' Keys, Gone Fishing, Pipework and Search for the Skunk Ape.
- **Three were sexualised and were replaced** with clean pictures under the same file name: Bricked Up, Photo/Shoot and The Missing Link. Their records carry a `note` saying why.

## What is left, and why

| Gap | Why it is still open |
|---|---|
| Characters (11) | Burim, Frankie Delight, Declan, Manuel, Bailey, Lorena, Monty, Dobbs, Raina, Vinny, Ernesto. GTABase shows placeholders, and no allowed site has a portrait. |
| Strangers and Freaks (16) and the 4 Papa Audacity jobs | GTABase uses a placeholder for every Strangers page. Output Lag, GTA6 Heists and VGC cover some jobs, but no allowed site has pictures of Billy's, Andy's, Yago's last or Pete's delivery jobs, or of Papa Audacity. |
| Story missions (15) | Got Pills?, Impounded Vehicle, Get Your Wheels, Encrypted Hard Drive, Raul's Next Job, Heist Planning, It's A Date!, both Pay Abe's Fee missions, Blood Sweat and Gear, Call Nate, Nate Will Be in Touch, Heist Plans in Place, Call Valentina Back and The End of the Road. Several are phone calls or waiting steps with nothing to picture. |
| Weapons (128) | Mostly named Standout variants (for example Raul's 1992 or San4San K17). GTABase pictures only the base models. |
| Vehicles (109) | Mostly Standout liveries and police or service variants. GTABase has no page for most of them. |
| Locations (97) | Counties, towns and islands. Rockstar's own captions name only the six regions, and GTABase's map has thumbnails, not pictures, for most places. |
| Businesses (224) | Garages, small shops and fronts. GTABase's map pictures only some place types. |
| Activities (193) and collectibles (1,242) | Individual drone races, stunt jumps, trading cards, AHOL street art and No Flusher tags. Worth a dedicated pass once GTABase or PowerPyx finish their per-item lists; PowerPyx can't be used because of the logo burned into its pictures. |

## Recommended next steps

1. Repeat the GTABase match for weapons and vehicles as GTABase replaces its placeholders.
2. Do a collectibles pass by family (cards, AHOL art, stunt jumps), using GTABase's map submissions where they name the item.
3. Look again for the 11 character portraits once more mission walkthroughs are published.
