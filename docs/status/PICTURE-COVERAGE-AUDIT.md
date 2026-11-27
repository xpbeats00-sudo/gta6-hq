# Picture coverage audit

Made on 2026-11-27 from the app's live data (`/api/wiki` of a release build) and the files in `images/`. It counts which entries, cards and tool pages have a picture, and lists where the gaps are. The rights side of every picture is in [MEDIA-RIGHTS-AUDIT.md](../compliance/MEDIA-RIGHTS-AUDIT.md).

**1,047 of 3,138 entries (33%) have a picture.** Every one of the 55 trophies has an icon and all 219 trophy-guide steps have a picture. All 18 card sets now have their real cover. No picture named in `data/` points at a missing file. The only missing files named anywhere are Leaflet's own default icons (`ui/vendor/leaflet.css` names `ui/vendor/images/`, which is not shipped); the app never loads them, because every map marker is given its own icon and the layers control is not used.

## Entries by section

| Section | Entries | With a picture | Without | Coverage |
|---|---:|---:|---:|---:|
| Collectibles | 1257 | 32 | 1225 | 2% |
| Activities | 223 | 34 | 189 | 15% |
| Businesses | 287 | 101 | 186 | 35% |
| Weapons | 210 | 79 | 131 | 37% |
| Locations | 156 | 65 | 91 | 41% |
| Music and Radio | 30 | 14 | 16 | 46% |
| Factions | 17 | 8 | 9 | 47% |
| Gameplay | 125 | 69 | 56 | 55% |
| Vehicles | 383 | 269 | 114 | 70% |
| Wildlife | 124 | 93 | 31 | 75% |
| Characters | 78 | 65 | 13 | 83% |
| Missions and Story | 193 | 163 | 30 | 84% |
| Achievements | 55 | 55 | 0 | 100% |

## Where the gaps are

The largest groups of entries with no picture, by type:

- **Characters**: no type (13)
- **Locations**: landmark (30), region (9), district (6), county (5), island (5), area (4), town (4), Island (4)
- **Vehicles**: no type (114)
- **Gameplay**: System (29), Job (8), Challenges (7), Story (4), Interaction (2), Driving (2)
- **Activities**: Basketball hoop (100), Race (36), Drone time trials (15), Racing Challenge (13), Shooting range course (9), Time trials and stunt runs (2), Golf (2)
- **Wildlife**: no type (31)
- **Businesses**: gang operation (30), gun store (17), jewelry store (17), garage (13), clothing store (11), pawn shop (10), electronics store (10), liquor store (7)
- **Factions**: Gang (3)
- **Music and Radio**: Radio station (12), Talk station (2)
- **Weapons**: pistol (35), rifle (22), shotgun (19), smg (18), sniper (11), equipment (8), Melee Weapon (6), Variant (5)
- **Missions and Story**: Main mission (12), Stranger mission (11), Side mission (5), Optional mission (2)
- **Collectibles**: Collectible card (469), Under the Bridge stunt (202), Stunt Jump (129), AHOL street art (112), Kenton's Treasure (45), Knife Flight (40), WAiNK Curiosity (29), WAiNK Landmark (27)

## Collectible cards

- **Set covers: 18 of 18.** Cut from in-game captures of Progress > Collections > Collectible Cards (PowerPyx's 1280x720 captures; the watermark is outside every crop). The sets also use the menu's order, names and descriptions.
- **Card faces: 1 of 473** (Wokester, Blue, from the owner's capture). A card's face appears in the game only on that set's own screen and when the card is picked up, and no clean capture of the other faces has been found. The Card Collections page draws the rest: the set's real back for a card not yet found, and a drawn face in the card's colour for one that is.
- **Card entries with a picture of any kind: 4 of 473** (where the card lies, or its face).

What would close the gap: a capture of each set's own screen (Progress > Collections > Collectible Cards > a set) with the found cards turned face up, or the pickup screen for each card. Each set screen shows up to 9 cards at a time; the large card on the right is the sharpest source.

## Garage and Weapon Locker

- **Garage**: 266 vehicles have stat bars; 71 of them have no picture.
- **Weapon Locker**: 171 weapons have stat bars; 112 of them have no picture.

<details><summary>Vehicles with stat bars and no picture</summary>

Western Zombie Bobber, Highwayman Sanchez, Willard Grouse '92, Jacksheepe Fieldmaster '99, Vapid Shuttle, Vapid Hustler, BF Injection, Cheval Picador, Rental Bus, Vapid Riata, '98 Vapid Stanier, Declasse Granger, Imponte Soaring Phoenix, Invetero Spiderweb Coquette, Vapid Smuggler Caracara, Vapid Firebug Dominator, HVY TH42 Telehandler, Moses' Sultan, Pfister Class Act Comet, Truffade Andrew Node's Thrax, Progen Royal Ruby Emerus, Buckingham Bourbon Windsor, Pegassi Charred Toros, Declasse Pink Gin Tulip, Benefactor Nightlight Schafer, Dundreary Cherry Bomb Chino, Maibatsu Speedy Boomazoom, Imponte Bloodbath Phoenix, Maibatsu Tropical Manchez, Granforma Tsunami Zorrusso, LCC Midnight Sun Avarus, BF Blood Moon Bandito, Declasse Mountain Yosemite, Brute Cherry Popper Boxville, Declasse Caliente Picador, Canis Black Moth Kamacho, Western Magma Cliffhanger, Declasse Beach Candy Bobcat, Declasse Bugstars Burrito, Declasse Ghosts Exposed Parkland, Vapid Red Hot Hustler, Bravado Elven Queen Youga, Vapid Smush! Ganado, Canis Gunrunner Kamacho, Ocelot Bloodless Jugular, Western Searing Zombie Bobber, Nagasaki Hung Carbos RS, LCC Monarch Avarus, Bravado Devil's Rope Gauntlet, Pegassi Gold Rope Infernus, Classique Emancipator Stallion, Vapid Beer Monster Marshall, BF Sludge Wraith Injection, Bravado Third Eye Youga, Canis Nancy's Crawler, Maibatsu MyWays Manchez, Vapid Grady's Slamvan, Albany Verdant Buccaneer, Vapid Finns Reclaimer, Declasse Truther Burrito, Declasse Flower Powered Rancher, Albany Driveshaft Devanity, Declasse Red Apple Orchard Rancher, Bravado Circles of Hell Youga, Karin Busted Cheater Rebel, Vapid Shrimp and Save Shifter, Declasse Cousin Carlo's Akane, Sirius Holdout Sungrazer, Driveshaft Hustler, Albany Teniente Manana, Vapid Cultivator Sandking

</details>

<details><summary>Weapons with stat bars and no picture</summary>

Goodwin LMG 6, Deever Tech GLR40, Killtelligence SM-69, Gutterball Moreland 850, Duval Signature ES9, Caminos Signature K17, Clunker 556, Cockroach Xtreme 556, Cold War 556, Drug Mule KZ-59, GRX 556, Guardia Brothers FRA, Kingpin Heathen, Kolt & Associates 556, La Polilla Negra KZ-59, La Polilla Negra VF-G1, Marabunta Grande KZ-59, Pete's KZ-59, Raul's CQB 556, Raul's Heist 556, San4San KZ-59, Star Spangled 556, Vice City Heathen, Francisco's LMG 6, Mercenary LMG 6, Black Eagle Import Kalinga, Brainwasher 1992, Brian's 1992, Convict Kalinga .50, Deadringer 1992, Dumpster K17 MCD, DWNPLY's K17, EJ's K17, Low Point Nipper .38, Martha's 1992, Money Bag 1992, Monty's 1992, Nite Raptor K17, PTT Youngin$ K17, Quarter Mile ES9, Raul's 1992, Rogue Alpha DRX, Russo's 1992, San4San K17, Stoner K17 MCD, The Guardian ES18, The Patriarch DRX, Turnt Nipper .38, Zodiac Nipper .38, Cargo H&L .38, Couch Potato Mustang .357, Honky Tonk Mustang .357, Iron & Oak WCR-1, Jack Sheepe H&L .38, Kingfishers Akulus, Lyle's H&L .38, Ride Free H&L .38, Swamp Bait Akulus, Backdoor Hobo, Basher Gorse 425, Bruiser Super400, CPD Moreland 850, Darknite Drifter, Dirty Drifter, Final Chapter KVGA-12, Final Chapter Shortstraw, Hellspawn Comshot 12, Hostile Super400, Marabunta Grande Hobo, Nitepower AZ1200, San4San Gorse 425, Smuggler Gorse 425, Throttler Vero, Unpacked Comshot 12, Watcher Pro Moreland 850, Woodhatch Longshot, Kingfishers W-22, Mossy Mediator, Redneck W-22, Cruel Huntsman's SM-69, FIB SM-69, Fincredible Laird 350, Firebreak SM-69, Hunter's Laird 350, IAA SMS-01, Internal Affairs FF-SR, Island Poacher FF-50, Kingfishers Laird 350, Twin's Laird 350, Chronic Vatra, Crabshack VF5, Double Cross Vatra, Furry DW-9, Guardia Brothers VF5, Kolt & Associates Vatra, Midlife Crisis VF5, Scrapper VF5C, Spangled Vatra, Bae-Lux's W-10, Chromium W-10, Conspiracist Type 9, Eris Fresh DSG, Little Friend W-10, Marabunta Grande Type 9, Neon Sunset Type 9, Roxy's W-10, Tyrone's W-10, Copperheads W-14, Black Eagle Import M306 TMR, Donnie's H&L .38, Gil's Kalinga .50, Mister Mangrove Laird 350

</details>

## Captures checked for this audit

- **Progress > Vehicles > Standout** (owner's capture): the tiles are vehicle classes (the chosen one reads "Ultra-Luxe", 0 / 17 discovered), not single vehicles, and the capture is 728 px wide, so a tile cannot be tied to one vehicle entry. A capture with a vehicle chosen in the Cars, Bikes or other tabs names it on the right and would.
- **Progress hub** (owner's capture): the Stats, Vehicles, Weapons and Animals tiles are menu art, not entry pictures.
- **Guide sites**: Red Bull, Tilt, gtadb.net, pro-gamer.gg and games.gg show cards being picked up or lying in the world; MetaForge and KeenGamer refused the request. None has a clean card face for a whole set.
