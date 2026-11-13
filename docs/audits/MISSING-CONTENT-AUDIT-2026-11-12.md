# Missing-content audit, 12 November 2026

What is publicly known about Grand Theft Auto VI but absent from the app. Nothing in the app's data was changed; this report is the only file written.

## How it was done

**App side.** Every data file was read or searched: `data/wiki.json` (characters, locations, vehicles, gameplay, activities, wildlife, businesses, factions, music, editions, news, FAQ), all five files in `data/wiki/` (`activities`, `businesses`, `music`, `vehicles`, `weapons`), `data/manual.json` (all Field Manual prose; `ui/manual.js` holds only the renderer), `data/media.json`, plus `docs/audits/GTA-6-WIKI-COM-GAP-AUDIT.md`, `CHANGELOG.md`, `docs/status/DATA-AND-MANUAL-COUNTS.md` and `docs/manual/research/`. "Missing" below means a case-insensitive search for the term found nothing in any of those data files; "partial" means the term is mentioned inside another entry.

**Web side.** Pages were read through a summarising fetch tool, so names are as that tool extracted them; long pages were truncated. No video was watched: everything about the content of the Extended Look and trailers comes from written descriptions of them.

**Evidence labels.**
- OFFICIAL: read on a Rockstar Games or PlayStation page I opened.
- REPORTED: read in press coverage I opened, describing official material or Rockstar-run previews.
- COMMUNITY: read only on a fan wiki (mostly gta.wiki's shot-by-shot description of the official Extended Look). The underlying footage is official, but the names and readings are the wiki's and I did not check them against the video.
- LEAKED: leak-based. Listed only so the owner knows it exists; not recommended for the app.

## 1. Summary

69 gaps in 14 categories: 14 OFFICIAL, 38 REPORTED, 16 COMMUNITY, 1 LEAKED. Of the 69, 31 are expansions of something the app already mentions and 38 are new.

| Category | Gaps | OFFICIAL | REPORTED | COMMUNITY | LEAKED |
|---|---|---|---|---|---|
| Characters | 6 | 2 | 2 | 2 | 0 |
| Locations | 7 | 1 | 3 | 3 | 0 |
| Vehicles | 2 | 0 | 2 | 0 | 0 |
| Weapons and combat | 1 | 0 | 1 | 0 | 0 |
| Businesses and brands | 5 | 1 | 2 | 2 | 0 |
| Factions | 3 | 1 | 0 | 2 | 0 |
| Wildlife | 3 | 0 | 3 | 0 | 0 |
| Music and radio | 10 | 3 | 2 | 4 | 1 |
| Activities | 4 | 0 | 4 | 0 | 0 |
| Gameplay systems | 10 | 0 | 10 | 0 | 0 |
| Missions and story | 2 | 0 | 0 | 2 | 0 |
| Editions, release, platforms | 12 | 5 | 6 | 1 | 0 |
| Trailers and media | 2 | 1 | 1 | 0 | 0 |
| Development | 2 | 0 | 2 | 0 | 0 |
| **Total** | **69** | **14** | **38** | **16** | **1** |

(Four rows carry a mixed label: Jack of Hearts, the Ultimate Edition Upgrade, pre-load timing, and the further radio stations. Each is counted once, under the first label shown in its row; the row itself is the precise statement.)

Separately, section 3 lists two groups (community-identified vehicle and weapon model names) that are known but fall under the owner's existing "published names only" rule, and are not counted as gaps.

## 2. Gaps by category

### Characters

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| Lori (Brian Heder's wife) | Brian's third wife; runs the household with him at the boat yard. Also appears with Brian in the Extended Look, per the wiki description. | OFFICIAL | https://www.rockstargames.com/VI/only-in-leonida | `data/wiki.json` characters | Partial: named inside Brian Heder's entry only |
| DWNPLY | Local rapper who had an early hit with Real Dimez. | OFFICIAL | https://www.rockstargames.com/VI/only-in-leonida | `data/wiki.json` characters | Partial: named inside Real Dimez's entry only |
| Macca the Gator and Chunkee the Manatee | Mascot characters on the collector's box items (figure, mirror, shot glass, poster). A fan wiki says Macca is from an in-game TV show, "Macca & Friends" (COMMUNITY, https://gta.wiki/w/Grand_Theft_Auto_VI). | REPORTED | https://www.videogameschronicle.com/news/grand-theft-auto-6-is-getting-a-400-box-of-merch-with-11-items-including-a-figure-sunglasses-and-new-era-hat/ | `data/wiki.json` characters or businesses | New |
| Kodak Black | Coverage of the Launch Gallery describes one screenshot as showing Kodak Black inside a nightclub. | REPORTED | https://beebom.com/all-39-new-gta-6-screenshots-from-the-launch-gallery/ | `data/wiki.json` characters or music | New. Identification is the outlet's, not a Rockstar caption |
| Raymond, Ernesto, Mendez, Aunt Tee | People in the Extended Look's opening drug-bust sequence: Boobie's associate at the apartments, his informant partner, the police task-force lead, and a resident whose flat the leads escape through. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look | `data/wiki.json` characters | New |
| Valentina, Andrés de León, Petra Navarro | Megamundo figures in the Extended Look's closing sequence: the contact who hires the leads as security, the man they guard, and the company's COO. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look | `data/wiki.json` characters | New |

### Locations

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| Leonida Penitentiary | The prison Lucia has just left. | OFFICIAL | https://www.rockstargames.com/VI/only-in-leonida | `data/wiki.json` locations | Partial: named in Lucia's entry, no location entry |
| Stockyard's murals | Stockyard draws on Miami's Wynwood; more than 50 real street artists made murals for the game. | REPORTED | https://www.dazeddigital.com/life-culture/article/70859/1/gta-6-grand-theft-auto-vi-rockstar-exclusive-deep-dive-game-unparalleled-world | Vice City entry in `data/wiki.json` | Expand: Stockyard is named, the detail is not |
| Zoo and military base | Previews list a visitable zoo and a military base among the map's places. | REPORTED | https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed ; https://www.keengamer.com/articles/news/gta-6-extended-look-recap-all-gameplay-details/ | `data/wiki.json` locations | New |
| Map scale | Previews put the whole map at about three times the playable area of Red Dead Redemption 2 and Vice City at about twice Los Santos. | REPORTED | https://www.keengamer.com/articles/news/gta-6-extended-look-recap-all-gameplay-details/ ; https://www.vice.com/en/article/gta-6-new-gameplay-features-details-revealed/ | Manual, "Leonida & Vice City"; or `game.facts` | New. Earlier audit refused leak-based map size; this figure is from press previews, not leaks |
| Vice City streets and districts in the Extended Look | Rockridge, Bayside, Hamlet, Crosstown, Downtown, Rialto Islands, Rivo Bridge, Admiral Causeway, Rialto Causeway, Catalan Boulevard. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look | Vice City entry; map markers | Expand the district list (app has La Perle, Stockyard, Tequesta, Vice Beach, Ocean Beach, Little Cuba, Washington Beach) |
| Landmarks in the Extended Look | Venture Apartments (Rockridge), Effluvia rooftop bar (Vice Beach), the Megamundo Building, Vice City International Airport, Archipelago Apartments, Grassrivers Visitor Center. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look | `data/wiki.json` locations; map markers | New |
| Rural spots in the Extended Look | Kelly County Road 62, Tucker's Citrus Farms, and an Ambrosia Police Department. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look | Ambrosia entry | Expand |

### Vehicles

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| Owning and running a car | Previews describe a working fuel gauge and refuelling (a Launch Gallery shot shows Jason at a pump), charging for electric cars, registering stolen cars so they are kept, a starting limit of three cars with garages adding room, impound recovery, Pay 'n' Spray for repaint, repair and registration, and nitrous. | REPORTED | https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed ; https://www.vice.com/en/article/gta-6-new-gameplay-features-details-revealed/ ; https://beebom.com/all-39-new-gta-6-screenshots-from-the-launch-gallery/ | Manual, Vehicles chapter and "Stealing Cars"; `data/wiki.json` gameplay | Expand: manual covers "Keep it" and "Your own car" but has no fuel, charging, impound, Pay 'n' Spray or nitrous |
| Public transport and fast travel | Buses, trains, trams and taxis alongside the Ryde Me app. | REPORTED | https://www.vice.com/en/article/gta-6-new-gameplay-features-details-revealed/ ; https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed | Manual, "Phone & Money: Rides" | Expand: only Ryde Me is covered |

### Weapons and combat

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| Camera and aiming options | Shoulder swapping, kill cameras and crash cameras, light aim assist and a cinematic camera toggle. | REPORTED | https://www.vice.com/en/article/gta-6-new-gameplay-features-details-revealed/ ; https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed | Manual, "Guns and Fighting" | Expand |

### Businesses and brands

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| Jack of Hearts | The name appears with Boobie Ike on Rockstar's page; Dazed and KeenGamer both give it as the name of his strip club. | OFFICIAL (name) / REPORTED (that it is the club) | https://www.rockstargames.com/VI/only-in-leonida ; https://www.dazeddigital.com/life-culture/article/70859/1/gta-6-grand-theft-auto-vi-rockstar-exclusive-deep-dive-game-unparalleled-world | `data/wiki.json` businesses; Boobie Ike entry | New: app says "a strip club" with no name |
| Returning chains | Drive-thrus at Burger Shot and Cluckin' Bell; pawn shops acting as fences; Pay 'n' Spray. | REPORTED | https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed | `data/wiki.json` businesses | New (Ammu-Nation and Fleeca are already in) |
| Phone apps not yet in the app | BuckMe (banking) and WhatUp (messaging), plus an unnamed fitness app. | REPORTED | https://www.vice.com/en/article/gta-6-new-gameplay-features-details-revealed/ | Manual, "Phone & Money" | Expand: WAINK, Ryde Me, Snapmatic and Scooter Bros are covered. BuckMe is in `docs/manual/research` but not in the manual |
| Megamundo | A corporation whose building, party and executives feature in the Extended Look's last sequence. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look | `data/wiki.json` businesses | New |
| In-world brands seen in the Extended Look | eCola, Azteca Gold!, Lavazas, Juice Loose, Angstipan, Chacey's (and its Prairie Sandwich), Quads, Leonida City Tours, Bigness, Gruppe Sechs, W. Blanco's Cuban Foods, Mami's Grocery Market. KeenGamer also names Angstipan and the Prairie Sandwich. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look | `data/wiki.json` businesses | New |

### Factions

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| PTT Youngin$ | A Southside Vice City gang whose compound is the target of the Ultimate Edition raid. | OFFICIAL | https://www.rockstargames.com/VI/media/screenshots (set title); app's own `data/wiki/activities.json` | `data/wiki.json` factions | Partial: covered as an activity, no faction entry |
| San4San | A gang tied to Boobie's operation, seen in the Extended Look. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look | `data/wiki.json` factions | New |
| Police forces | VCPD (Vice City), VBPD and an Ambrosia Police Department are named in the Extended Look, plus a task force led by Mendez. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look | `data/wiki.json` factions; Manual, Law Enforcement | New: the manual describes police behaviour but names no force |

### Wildlife

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| Studying animals | Animals can be studied and the game keeps a record of species found, compared by previews to Red Dead Redemption 2. | REPORTED | https://www.keengamer.com/articles/news/gta-6-extended-look-recap-all-gameplay-details/ ; https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed | `data/wiki.json` wildlife (overview) | New |
| Dog interactions | Pet, Scold or Study; previews add feeding and asking the owner first. | REPORTED | https://www.keengamer.com/articles/news/gta-6-extended-look-recap-all-gameplay-details/ | Dogs entry | Expand: app has petting only |
| Snakes and police dogs | Launch Gallery coverage describes a Grassrivers shot with an alligator and a snake at a campfire, and a shot of Jason firing beside a K9 unit. | REPORTED | https://beebom.com/all-39-new-gta-6-screenshots-from-the-launch-gallery/ | `data/wiki.json` wildlife | New. Check against the image before adding |

### Music and radio

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| The Album's named singles | Rockstar lists ten: Yung Lean "That's It" (feat. Future and Metro Boomin), Travis Scott "RHYNO", CA7RIEL & Paco Amoroso with PinkPantheress, Fred again.. and Etienne de Crécy "Sexy Magic", Justice "Flower in a Hurricane", Morgan Wallen "Last Thing You Need", Fuerza Regida "Suzuki", Rauw Alejandro "Macacoa 2000", Cardi B "Don't Chart", Tove Lo "Blood In Your Eyes", Keith Richards "Bright Lights, Big City". | OFFICIAL | https://www.rockstargames.com/VI/music | Album entry in `data/wiki.json` music | Expand: the entry's body is empty |
| Justice detail | The duo are Gaspard Augé and Xavier de Rosnay. "Flower in a Hurricane" features Tame Impala, SZA and King Gizzard & The Lizard Wizard; "Pusher" features Gesaffelstein. | OFFICIAL | https://www.rockstargames.com/VI/music | Score entry | Expand |
| Physical music releases | A limited triple crystal-clear vinyl and a double CD of the score; an exclusive and a standard vinyl of the album. | OFFICIAL | https://www.rockstargames.com/VI/music | Music entries or editions | New |
| Station detail | Cocoteo covers bachata, merengue, dembow and reggaeton; Back Country Radio has a roving reporter, Mud Dog Mike; radio and podcasts play through headphones or earbuds on foot. | REPORTED | https://gameinformer.com/2026/10/08/you-can-preview-6-of-the-radio-stations-in-grand-theft-auto-vi-right-now-plus-new | `data/wiki/music.json` | Expand |
| Creator options | A copyright-free music toggle for streamers; VICE mentions a "Streamer Mode". | REPORTED | https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed ; https://www.vice.com/en/article/gta-6-new-gameplay-features-details-revealed/ | Radio overview entry | New |
| Real people behind the hosts | The wiki gives Kerry King and Tom Araya (The Chamber), Trick Daddy and Trina (Dirty South Classics) and Alex Consani (Flash FM). Search results also named Bad Bunny for Cocoteo; I did not open a page confirming that. | COMMUNITY | https://gta.wiki/w/Radio_Stations_in_GTA_VI | `data/wiki/music.json` | Expand |
| Songs heard in station previews | Three or four tracks per station, for example Slayer "Raining Blood" on The Chamber and MGMT "Electric Feel" on Flash FM. | COMMUNITY | https://gta.wiki/w/Radio_Stations_in_GTA_VI | `data/wiki/music.json` | Expand |
| Trailer 2 and Launch Trailer songs | Trailer 2: The Pointer Sisters, "Hot Together". Launch Trailer: Justice, "Flower in a Hurricane". | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI | `data/wiki.json` music (beside "Trailer 1 song") | New for Trailer 2; the app says only "new music from Justice" for the Launch Trailer |
| Songs in the Extended Look | Tracks by Birdman and Lil Wayne, Sexyy Red, Kodak Black, The Bellamy Brothers, Def Leppard, Depeche Mode, Captain & Tennille, Prefab Sprout, and Elderbrook with Bob Moses. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look | `data/wiki.json` music | New |
| Further stations | The wiki lists Honey FM (taxi advert), Vice City FM, V-Rock and CircoLoco Records Radio as seen in official material, and eight more (Emotion 98.3, Kaleidoscope FM, La Ola, Radio On-U, Stockyard FM, Symphony FM, The Wipe, WorldWide FM) from leaked footage only. | COMMUNITY (first four) / LEAKED (the eight) | https://gta.wiki/w/Radio_Stations_in_GTA_VI | Not recommended until Rockstar names them | New |

### Activities

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| Activities not yet listed | Base jumping, backyard wrestling, drag racing, monster-truck racing, a shooting range, zoo visits, shipwreck treasure, alligator hunting, sunbathing, cigars. | REPORTED | https://www.keengamer.com/articles/news/gta-6-extended-look-recap-all-gameplay-details/ ; https://www.redbull.com/int-en/gta-6-extended-look-everything-revealed ; https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed | `data/wiki.json` activities | Expand. The earlier audit held the shooting range back as one previewer's guess; three outlets now list it |
| Trunk Challenge and livestream events | A livestream-style encounter with a man hanging from a moving car's boot; social feeds and streams point to events and hideouts in the world. | REPORTED | https://www.keengamer.com/articles/news/gta-6-extended-look-recap-all-gameplay-details/ | `data/wiki.json` activities | New |
| Gym detail | Tracked stats (health, cardio, fitness, stamina, strength, calories, body fat), rhythm minigames, and strength gains needing three training days running. | REPORTED | https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed | Manual, "Health, Food & Fitness" | Expand |
| What is not in the game | Previews say there is no full tennis, surfing or skateboarding. | REPORTED | https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed | FAQ in `data/wiki.json` | New |

### Gameplay systems

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| Talking to passers-by | Greet, Taunt, Defuse and Provoke options; people react to staring, following and eavesdropping and may confront you. (VICE words it as Greet and Antagonize.) | REPORTED | https://www.keengamer.com/articles/news/gta-6-extended-look-recap-all-gameplay-details/ | Manual, Getting Started; `data/wiki.json` gameplay | New |
| Criminal Profile states | VICE names four: Professional, Aggressive, Violent, Psycho. Previews add that shooting police tyres helps the profile and that extreme violence can break the icon for good. | REPORTED | https://www.vice.com/en/article/gta-6-new-gameplay-features-details-revealed/ ; https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed | Manual, "Your criminal profile" | Expand |
| Story shape and length | Story choices with later consequences, a chapter structure, some story steps needing a minimum of cash, and about 80 hours for one Rockstar playthrough (Rob Nelson, originally to The New York Times, which I did not open). | REPORTED | https://www.keengamer.com/articles/news/gta-6-extended-look-recap-all-gameplay-details/ ; https://www.gamesradar.com/games/grand-theft-auto/how-long-is-gta-6-about-80-hours-according-to-one-rockstar-devs-playthrough/ | FAQ; `data/wiki.json` gameplay | New |
| Money | Cash on hand is lost when Wasted or Busted; it is banked at ATMs into an account the leads share. | REPORTED | https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed | Manual, "Phone & Money" | Expand |
| Lucia's ankle monitor | Part of the story, per the previews recap. | REPORTED | https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed | Lucia entry | Expand |
| Scale of animation | More than 600,000 animations, against about 55,000 in GTA V. | REPORTED | https://www.keengamer.com/articles/news/gta-6-extended-look-recap-all-gameplay-details/ | `game.facts` or FAQ | New |
| In-game social media | Working feeds on the phone; Real Dimez's career is followed through viral posts. | REPORTED | https://www.dazeddigital.com/life-culture/article/70859/1/gta-6-grand-theft-auto-vi-rockstar-exclusive-deep-dive-game-unparalleled-world | Manual, "Phone & Money"; Real Dimez entry | Expand |
| Appearance over time | Long spells without sleep, long chases and multi-day drinking show on the characters; hair does not grow by itself; items such as a passer-by's sunglasses can be picked up and worn. | REPORTED | https://www.dazeddigital.com/life-culture/article/70859/1/gta-6-grand-theft-auto-vi-rockstar-exclusive-deep-dive-game-unparalleled-world ; https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed | Manual, "Health, Food & Fitness" | Expand |
| Options and modes | No first-person mode apart from some aiming, a Photo Mode, a HUD-off option, a satellite-style pause map revealed as you explore, accessibility options. | REPORTED | https://www.gtabase.com/articles/gta-6/gta-6-previews-recap-all-new-gameplay-features-revealed | FAQ; Manual, Getting Started | New. Sources disagree on the Rockstar Editor (see section 4) |
| Single-player purchases | Red Bull's recap says the single-player game has no microtransactions. | REPORTED | https://www.redbull.com/int-en/gta-6-extended-look-everything-revealed | FAQ | New. Rockstar's own page carries the ESRB "In-Game Purchases" notice (see section 4) |

### Missions and story

The app's Missions category is empty. No official mission title has been published that I could find; the names below are the wiki's labels for sequences.

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| The four Extended Look sequences | A pickup for Boobie at Venture Apartments that turns out to be a police raid; meeting Brian and Lori at Effluvia; Lucia driving the getaway for Raul, ending with the car burned; a security job for Megamundo that ends in a shootout. KeenGamer describes the same outline without the names. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look | `data/wiki.json` missions | New. The manual has "A getaway in the footage" |
| Flashback arrest | A flashback at the Grassrivers Visitor Center showing an undercover sting. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look | `data/wiki.json` missions or Lucia/Jason entries | New. Check against the video first |

### Editions, release and platforms

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| Age rating | ESRB Mature 17+: Blood and Gore, Intense Violence, Mature Humor, Nudity, Strong Language, Strong Sexual Content, Use of Drugs and Alcohol; In-Game Purchases. | OFFICIAL | https://www.rockstargames.com/VI | `game.facts`; FAQ | New |
| GTA+ month | Digital pre-orders of either edition include one month of GTA+, which renews as a paid subscription unless cancelled; pre-order before 20 November 2026, claim by 31 March 2027. | OFFICIAL | https://www.playstation.com/GTAVIfeatures | Editions | New |
| Ultimate Edition Upgrade | Sold as a separate add-on for Standard owners. Press adds that the Ultimate Edition is digital only. | OFFICIAL / REPORTED | https://www.playstation.com/GTAVIfeatures ; https://www.gtabase.com/articles/gta-6/gta-6-launch-prep-guide-pre-load-date-storage-editions | Editions | Expand |
| Ultimate Edition apparel | Two clothing sets, Vice City Style and Goodtime Gear, each with its own screenshot set. | OFFICIAL | https://www.rockstargames.com/VI/media/screenshots ; https://www.playstation.com/GTAVIfeatures | Ultimate Edition entry | Expand: neither name is in the app |
| PlayStation 5 features | Marketed as "Plays Best on PlayStation 5"; listed as PS5 Pro Enhanced; Tempest 3D audio, haptic feedback, adaptive triggers and controller speaker; Remote Play; single player, playable offline. No resolution or frame rate is stated. | OFFICIAL | https://www.playstation.com/GTAVIfeatures ; https://www.rockstargames.com/VI | FAQ; `game.facts` | New |
| Pre-load timing and boxed copies | PS5 pre-load opens at midnight local time, Xbox at 12 a.m. GMT worldwide. Boxed copies hold a download code, not a disc, and reach shops from 12 November. | REPORTED (PS5 timing is OFFICIAL on the PlayStation page) | https://www.keengamer.com/articles/news/grand-theft-auto-vi-pre-load-starts-november-10-with-a-212-gb-file/ ; https://www.gtabase.com/articles/gta-6/gta-6-launch-prep-guide-pre-load-date-storage-editions | "Pre-load opens" news item; FAQ | Expand |
| Free poster and map | On 19 November Rockstar's site offers a printable cover-art poster and a map of Leonida as a free download; a double-sided physical poster follows at $0.99, free with any Rockstar Store order. | REPORTED | https://www.keengamer.com/articles/news/grand-theft-auto-vi-pre-load-starts-november-10-with-a-212-gb-file/ ; https://www.gtaboom.com/gta-6-pre-load-goes-live-november-10-and-rockstar-is-giving-away-a-free-leonida-map-4fe6 | News; the app's Map page | New. Worth watching: an official map would supersede the community map |
| Collector's box contents | The eleven items: Macca the Gator figure, Oakley Frogskins sunglasses, Leonida Keys crossbody bag, New Era 9FORTY cap, Macca magnetic mirror, Chunkee the Manatee shot glass, swizzle spoon, razor-blade keychain, enamel pin set, sticker pack, and a double-sided poster with a map of Leonida. UK price £349.99. | REPORTED | https://www.videogameschronicle.com/news/grand-theft-auto-6-is-getting-a-400-box-of-merch-with-11-items-including-a-figure-sunglasses-and-new-era-hat/ | "Collector's box announced" news item; editions | Expand: the app gives price and count only |
| Limited-edition controllers | Two GTA VI DualSense controllers, black and white, $84.99, out 19 November; announced by PlayStation on 3 September 2026. No console bundle has been announced. | REPORTED | https://www.videogameschronicle.com/news/gta-6-is-getting-two-custom-ps5-dualsense-controllers/ | News | New |
| Miami Heat night | On 18 November the Miami Heat play Milwaukee as "Vice City", with a themed court, kit and merchandise. | REPORTED | https://www.pushsquare.com/news/2026/10/gta-6-rebrands-miami-basketball-team-to-vice-city-for-one-night-only | News | New |
| Regional prices | €79.99 and €99.99 in the euro area. | REPORTED | https://www.gtabase.com/articles/gta-6/gta-6-launch-prep-guide-pre-load-date-storage-editions | Editions | Expand |
| Languages | Thirteen listed: English, French, Italian, German, Spanish, Latin American Spanish, Brazilian Portuguese, Polish, Russian, Japanese, Korean, Traditional and Simplified Chinese. | COMMUNITY | https://gta.wiki/w/Grand_Theft_Auto_VI | `game.facts`; FAQ | New. Confirm on a store listing |

### Trailers and media

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| Official media library | Rockstar's media page now holds 5 videos (including a "Pre-Load Now" video), 9 clips (cover-art animation, character clips), 138 screenshots, 51 Ultimate Edition images, 12 Vintage Vice City Pack images and 27 artworks and wallpapers. | OFFICIAL | https://www.rockstargames.com/VI/media | `data/media.json`; news | Expand: 115 records in the app; no record for the pre-load video or the clips |
| Launch Gallery contents | Beyond the three captions the app records, coverage describes a bank robbery in bandanas, a police blockade at night, a K9 unit, Jason refuelling, cycling through a mall, lifting weights, a salon, a tattoo parlour, a resort pool and Keys sea life. | REPORTED | https://beebom.com/all-39-new-gta-6-screenshots-from-the-launch-gallery/ | "Launch gallery" news item; media captions | Expand |

### Development

| Item | What is known | Label | Source | Where it goes | New or expand |
|---|---|---|---|---|---|
| Named Rockstar staff and collaborators | Rupert Humphries (narrative), Michael Wiafe (writer), Jamie-Lee Lloyd (character art), Stu Petri (2D/UI), and Miami stylist Jillian Carr, who has worked on the game's fashion since 2023. Rob Nelson is already in the manual. | REPORTED | https://www.dazeddigital.com/life-culture/article/70859/1/gta-6-grand-theft-auto-vi-rockstar-exclusive-deep-dive-game-unparalleled-world | Manual, Reference & Sources; a new "development" note | New |
| How it was made | About 13 years in development; a team more than twice the size of Red Dead Redemption 2's; a Los Angeles group working almost wholly on pedestrians; a research team based in Miami; racing drivers on the handling team. | REPORTED | https://www.dazeddigital.com/life-culture/article/70859/1/gta-6-grand-theft-auto-vi-rockstar-exclusive-deep-dive-game-unparalleled-world | FAQ or a new entry | New. Dazed is not among the manual's 13 sources |

## 3. Checked and already covered, or deliberately left out

**Already in the app**

- Release date, platforms, both prices, both delays, the pre-load date and the 212 GB figure, all four trailers, the Extended Look.
- All eight official characters, with Bae-Luxe, Roxy, DWNPLY, Lori, Lucia's mother and Liberty City mentioned in their entries.
- All six official regions, plus Ocean Beach, Little Cuba, Tisha-Wocka, VC Port, La Perle, Stockyard, Tequesta, Vice Beach, Washington Beach, Lake Leonida.
- Every named Ultimate Edition and Vintage Vice City Pack item on Rockstar's screenshot page except the two apparel sets: the Cheetah, Stanier, Ganado Retro Build, Squalo, Dominator Buggy, Enduro, Crest Kayak, both revolvers, the personalised ES9 and K17, the five shops, the PTT Youngin$ raid, the Classic Car Collection, the weapon pattern.
- All six radio stations with hosts, the score, The Album, podcasts, on-foot listening, the mention of classic rock and talk radio.
- Fleeca, The Rusty Anchor, Delights Cabaret, Only Raw Records, Allied Crystal, Ammu-Nation.
- In the manual: Heat and wanted stars, the criminal profile, switching, safehouses, the relationship, fatigue and food, WAINK, Ryde Me, Snapmatic, Scooter Bros, key cloner, slim jim, trackers, fences, safes, masks, the two-handgun/two-long-gun carry, hit-marker colours, Focus, Lucia's MMA background, lung capacity.
- Voice cast: not a gap. Rockstar has not named any actor; the names in circulation are guesses.
- PC version and GTA Online: nothing newer than what the FAQ says.

**Known but outside the owner's rules (not counted as gaps)**

- Community-identified vehicle models in the Extended Look: Sentinel Classic, Schafter, Burrito, Faggio, Tulip, Mule, Contender, Gauntlet Hellfire, Tempesta, Reclaimer, Coquette D10, Dubsta, Bobcat XL, Buster, Seashark, Ruiner, Emperor, Primo, Blista Compact, Stockade, Alvino V1, Double T (COMMUNITY, https://gta.wiki/w/Grand_Theft_Auto_VI:_An_Extended_Look). Same class as the 139 names the earlier audit left out under "published names only".
- Community-identified weapons in the same footage: an "850" shotgun, a carbine, sticky bomb, Molotov (same source, same rule).
- County names (the wiki now also lists Leonard and Lummox counties): left as they are, by the owner's decision.
- Graphics figures (about 1440p at 30 frames a second): the earlier audit ruled these out of scope.
- Leak material: a fan wiki records gameplay, map and cutscene leaks between August and October 2026, and station names drawn from them. Not opened beyond that summary and not recommended.

## 4. Could not reach, and unsure

**Could not reach**

- `ign.com` (the "69 details" article and the interview): blocked for the fetch tool. Preview details above therefore rest on KeenGamer, GTABase, VICE and Red Bull summaries, which mostly do not say which outlet each detail came from.
- The New York Times piece carrying the 80-hour figure: not opened; taken from GamesRadar's headline and KeenGamer.
- Edge's cover story on GamesRadar and the GamesRadar 80-hour article: opened, but only the headline came through.
- Rockstar Newswire: the index and the pre-load article returned a title and no body. Pre-load, boxed-copy and free-map details come from press that cites it.
- Rockstar Support article on pre-loading: timed out.
- `techspot.com`: refused (403). Rockstar's per-location pages: the address I tried returned 404, and the "Only in Leonida" page came through with the character text but only links for the regions, so region descriptions were not re-read.
- `rockstargames.com/VI/launch-gallery` returned no per-image captions; `rockstargames.com/VI` and the gta.wiki pages were truncated.
- Take-Two's November 2026 results: a search found nothing newer than May 2026.
- No trailer or the Extended Look was watched.

**Unsure**

- Everything labelled COMMUNITY from the Extended Look is one wiki's reading of the footage. Names such as Megamundo, San4San, Raymond and Rockridge should be checked against the video before use.
- Rockstar Editor: GTABase says there is none at launch; VICE lists it. Unresolved.
- Microtransactions: Red Bull says none in single player, while Rockstar's page shows "In-Game Purchases". These may both be true (the notice could refer to the GTA+ offer or upgrade), but I found no statement settling it.
- Launch hour: the wiki gives midnight local time as official; GTABase says Rockstar has not confirmed the unlock hour.
- Review embargo (18 November) and a disc edition (December, or never): seen only in search results, sourced to leakers and conflicting reports. Not verified.
- Bad Bunny as a Cocoteo host: seen only in search-result headlines.
- Station names: Rockstar's music page, as extracted, gives "Cocoteo", "Back Country" and "Afro Bank FM"; the app and Game Informer use "Cocoteo FM", "Back Country Radio" and "AfroBank FM". Worth one look at the page.
- Vehicle and money systems from the GTABase recap (three-car limit, nitrous, charging, ATMs) are aggregated from several previews without per-item attribution.
- GTABase's launch guide still gives 12 November for the pre-load; Rockstar's site and later coverage give 10 November, which matches the app.
