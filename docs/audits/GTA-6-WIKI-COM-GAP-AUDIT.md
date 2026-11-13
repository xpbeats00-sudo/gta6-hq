# Gap audit against gta-6-wiki.com

Date: 12 November 2026. Compared: the Field Manual (`data/manual.json`) and the encyclopedia (`data/wiki.json` and `data/wiki/*.json`) against nine pages of the fan site gta-6-wiki.com: home, weapons, locations, vehicles, map, updates, missions, guides and gameplay.

How it was done: a research agent fetched each page and listed its items; its findings were then checked by hand against all of our data files. The agent read the pages through a summarising fetch, so item names are as that tool extracted them. The agent only searched `wiki.json` and `manual.json`, so several things it reported missing are in fact in `data/wiki/`; those are corrected below.

That site is a third-party fan wiki and links no primary sources on the pages checked. Nothing was added to the app on its word alone.

## Result

No change to the manual or the encyclopedia was needed for anything that has a primary source. The gaps that remain are either unverified, out of the manual's scope, or leak-based.

## Already covered (the first pass wrongly reported these missing)

| Item on the site | Where we have it |
|---|---|
| Girardi ES9, Klose K17, Hawk & Little Morgan Revolvers | `data/wiki/weapons.json`; shown in the manual's Weapons chapter |
| Dinka Enduro, Crest Kayak, '95 Grotti Cheetah, '55 Vapid Stanier, Vapid Ganado, Shitzu Squalo | `data/wiki/vehicles.json` |
| The "angel" morality indicator | Manual, Law Enforcement, "Your criminal profile". Our research (`docs/manual/research/GAMEPLAY-EVIDENCE.md`, row 15.24) records it in more detail, including that two previews describe it differently |
| Fatigue, the phone and its apps, Scooter Bros, character switching, the weapon wheel | Manual, Getting Started and Robberies chapters |
| Fishing, scuba, basketball, parachuting, golf, the gym, petting dogs | Encyclopedia activities; the manual's Activities chapter draws from it |
| Latest news | Ours runs to November 2026; the site's newest item is 27 August 2026 |

## Real gaps, not added

| Item | What the site says | Why it was not added |
|---|---|---|
| Leonard County | A county name seen on a police vehicle in official material | The site links no source and we have not found the frame. Add once the frame is located |
| Scooter riding, a shooting range, canoeing as activities | Listed among Extended Look activities | Attributed to unnamed press. Our own notes record the shooting range only as a previewer's guess |
| Missions playable together or apart | One line in a guide | Unnamed press; not in our interview or preview notes |
| Graphics analysis (ray tracing, about 1440p) | Digital Foundry's Trailer 2 analysis | A technical estimate from a trailer, outside what a game manual covers |
| Company news: the 34 dismissals and tribunal, Take-Two guidance, Dan Houser's comment, trailer view counts | Seven news items | About the companies, not the game. Could go in the encyclopedia's news list if wanted |
| Community-named weapons (5) and vehicles (139) | Names such as "Carbine Rifle", "Pfister Comet" | Not names Rockstar has published. Our rule is published names only |

## Disagreements worth a decision

| Topic | The site | Ours | Note |
|---|---|---|---|
| County names | Rates Mariana County a rumour from datamined signage and Ambrosia County a community model | `region` fields state Vice-Dale, Mariana, Kelly and Ambrosia County as fact, sourced to another fan wiki and labelled corroborated | Ours is the weaker position. Recommend relabelling the counties as reported, or removing them, until an official source is found |
| Vapid Ganado | A Mustang-lineage muscle car | Jason's low-riding pickup | Unresolved; needs the official vehicle text |
| First release-date announcement | 28 April 2025 | 2 May 2025 | Ours matches Rockstar's announcement as we recorded it; not re-verified today |
| Mount Kalaga | A landmark | Mount Kalaga National Park | Ours follows the official location name |

## Not added on principle

Leak-based, datamined or unsourced: a September 2026 slip, map size and coordinates, a second state, counts of interiors, vehicles and robbable stores, an NPC patent, engine version names, Waning Sands, and the cheats, trophies and PC guides (which the site itself says are empty).
