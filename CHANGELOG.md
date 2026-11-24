# Changelog

Every version is on the [releases page](https://github.com/xpbeats00-sudo/gta6-hq/releases). Newest first.

## 0.2.41 (23 November 2026)

Routes that follow the roads, lists you can group, pages that link to each other, and a tidier app.

- **Map routes follow the roads.** Route legs and robbery runs now run along the roads, bridges and land on Rockstar's map instead of straight lines:
  - a stretch that has to cross water (an island with no bridge) is dotted blue, and that stop says "by water";
  - robbery runs are put in order by road distance, so ATM runs are about 22% shorter and bank runs about 7%;
  - the 3D view draws the same path.
- **Group any big list.** The sort menu on encyclopedia lists can now group the whole list under headings with counts:
  - By type, By region (Locations) and By grade (Achievements: Platinum to Bronze)
  - By manufacturer (Vehicles and Weapons)
  - By county (Businesses, Activities, Collectibles and Missions)
  - By lead (Missions: Jason, Lucia, either or both)
  - By habitat (Wildlife: saltwater, freshwater, land and wetland)
- **Pages link to each other:**
  - characters list the missions they give, and Jason's and Lucia's pages list the missions played as them;
  - place pages list the missions, collectibles, businesses, activities and people there;
  - factions list their members and the businesses they run;
  - vehicles and weapons list more from the same maker;
  - names in a page's Facts (who gives a mission, where it is, a home, an owner, a leader) link to their pages.
- **Collectible Tracker:** filter by county, and open it from a place page already filtered to that place.
- **Tidier pages:**
  - Intel's timeline is grouped by month, week and day, with a jump bar;
  - Missions show in two columns with a chapter jump bar;
  - the map's side list folds by kind;
  - the Encyclopedia hub is grouped, and search filters show how many results each holds.
- **Menus:** the More menu is grouped into Browse, Track, News and App, and Settings starts with Profile, Appearance and Motion.
- **On a phone:** Media shows two pictures a row, and tracker rows no longer run off the screen.
- **Fixes:**
  - Ambrosia is filed under Kelly County;
  - "AHOL" and "WAiNK" are spelled as in the game;
  - the link card no longer shows in the Media gallery.

## 0.2.40 (23 November 2026)

Pictures for missions, animals, businesses and more, a progress backup, missions in story order and map tracking.

- **123 new pictures**, each checked by eye:
  - 49 animals and fish
  - 39 businesses (gun stores, pawn shops, tattoo parlours, mod shops, NINE1NINE, Merlin's Palace Casino, Brooks Boatworks)
  - 19 Strangers and Freaks and story missions
  - 10 vehicles
  - 4 places (Gellhorn Fun Fair, Key Lento Marina, the Monument of Leonidan Supremacy, the Triangler Sculpture)
  - 2 weapons
- **Three sexualised mission pictures replaced** with clean ones: Bricked Up, Photo/Shoot and The Missing Link. Nothing else was removed.
- **Mission pictures everywhere:** each row of the Missions list has its picture, and each of the 100% Guide's 16 chapter pages opens with one.
- **Back up and restore your progress** (Settings, Your data):
  - one file in your Downloads folder holds every profile's ticks, 100% counts, discovered places, guide ticks, favourites, collections, routes, journal and settings;
  - restoring saves your current progress first.
- **Missions in story order:** chapter by chapter, numbered in play order, with optional missions in their place and Strangers and Freaks after the story. Each mission page has Previous and Next.
- **Tie Up Loose Ends and Call Valentina Back** now have walkthroughs. Heavy Lifting sits after Lawyer Up, as in PowerPyx's full walkthrough.
- **Map tracking:**
  - "Hide places I have marked discovered";
  - a **Next** button for each kind of place, which flies to the next one you haven't found;
  - an **Only** button that shows one kind;
  - every pin can now be marked discovered.
- **100% Checklist page:** every line the game counts toward 100%, with its weight and your counts.
- **Safe codes** for every safe and door code the guides print, including the Balsero Kitty Litter lab (1999).
- **Map icons:** the game's own green icons on the map, and fences and drop-off points as new pins.
- **Fix:** the journal no longer writes a spoiler pin's real name.
- **Audits:** a picture-gap audit (`docs/audits/PICTURE-GAPS-2026-11-23.md`) and a pre-release audit (`docs/audits/PRE-RELEASE-AUDIT-2026-11-22.md`).

## 0.2.39 (22 November 2026)

The Rockstar guide look, more entries and sharper pictures.

- **Rockstar's GTA VI guide look** across the whole app: Vice City navy, pink and blush, pill-shaped buttons and search boxes, rounded cards and uppercase condensed titles, with topic titles set over their pictures.
- **42 new entries:** 21 businesses and hideouts (trap houses, the Saber Shipping Yard, Vespucci Mansion, Walker Farm, the convenience-store chains), 13 collectibles (the Bobcat and Belpoint dive sites and their treasures), 6 missions and 2 guides to the story's choices and endings. The Dazzler DW-9 (also seen as DQ-9) and the Stanley Furrow TC 2350 got their own sources.
- **Pictures:** 56 entries that had no picture now have one, and 110 pictures were replaced with sharper copies of the same shot (29 from Rockstar's own pages).
- **Sources:** citations of four sites that turned out to block Claude (Fextralife, CBR, Shacknews and AltChar) were removed, and 56 new allowed sources were added. Seven cards that rested only on Fextralife were taken out again: Femi-Nemesis (Bronze, Silver, Gold), Zaria "Ri Ri" Luckett (Bronze, Silver, Gold) and Maleek Rivers (Gold). Three ATM lines in the Robbery Planner went for the same reason.
- **Search:** names starting with "The" or containing filler words, and names with apostrophes ("Dre'Quan"), now come first when you search for them; "chapter 6" keeps its number.
- **Map planner fixes:** editing a planned route stops narrowing the lists, an unknown run type says so instead of planning small banks, and a `?plan=` link no longer wipes a search.
- An end-to-end audit of data, pictures, the app and the code is in `docs/audits/END-TO-END-AUDIT-2026-11-22.md`.

## 0.2.38 (22 November 2026)

A robbery guide, sharper pictures, smarter search and better sources. Nothing was removed: every entry and picture is still here.

- **Robbery Planner.** A new Field Manual chapter covers small banks, big banks, pawn shops, jewelry stores, payday loans, ATMs and security trucks, stick-ups and gang operations. Each page gives what you need, what's recommended, step-by-step instructions, the best getaway, payouts and heat.
- **Plan a robbery run on the map.** Pick a type and every target is numbered in a short route from where you are, ready to save. Each guide page links straight to its run.
- **Smarter search.** Typos ("jewlery"), questions ("how to rob a bank") and plurals now find what you mean; a page named after your search comes first; matching Field Manual pages are shown above the results.
- **Sharper pictures.** 218 pictures replaced with higher-resolution copies, Rockstar's original Leonida map, sharper detail when zooming in on the map, and a smoother Street Explorer.
- **Better sources.** 1,033 entries now also cite an allowed guide that confirms them. The eight main characters are labelled Official after a check against Rockstar's own page, and three of their bios were reworded to match it.
- **New collectibles:** Femi-Nemesis, Zaria "Ri Ri" Luckett and Maleek Rivers cards, the Aurium Condominiums knife flight, the Tisha-Wocka Flea Market West bridge flight and the Lake Leonida Lock South stunt jump.
- **Field Manual look:** Rockstar's colours and condensed type, night reading by default.
- **Accessibility:** readable text over pictures in the Light theme, darker numbers on the Guide's chapter tabs, a main heading on every Guide page, and the back link above the picture on phones.
- Fixed: the window's Close button sat off the edge; three pictures that carried another site's watermark were replaced with clean ones.

## 0.2.37 (22 November 2026)

A simpler look, and clear Official and Community labels. Nothing was removed: every entry and picture is still here.

- **Official or Community.** Every entry and picture is labelled Official (Rockstar's own) or Community (guides, reviews and fan research). A new "Official only" switch on lists and in the Media gallery shows just Rockstar's own material.
- **Simpler top bar:** Home, Map, Encyclopedia, Guides and Saved, with everything else under More.
- **Calmer pages:** sentence case in place of capitals, six text sizes, and plain page titles.
- **Collectible Tracker:** families open when you click them, so the page is a short list.
- Fixed: on phones the menu opened under the map; in the Light theme titles over pictures were hard to read.

## 0.2.36 (22 November 2026)

**Every picture is back.** 0.2.35 left out the game's pictures, logos, clips and live wallpapers; this release ships the full app again, with all of them, plus everything new in 0.2.35. Releases always include them from now on.

## 0.2.35 (22 November 2026)

The Map Explorer (3D map, Street Explorer, Discovery Journal), a new look and a full audit with its fixes. **Downloads no longer include pictures, logos or clips from the game**: none is cleared for redistribution (`docs/compliance/MEDIA-DISTRIBUTION-POLICY.md`).

- New: a 3D map, Street Explorer, Jason and Lucia profiles, the Discovery Journal, map overlays, immersive mode, and the Vice City, Dark and Light themes.
- Without the official map picture, the map uses the community tiles (CC BY 4.0, via gtadb.org), with pins converted onto them.
- Fixed:
  - saving: large journals were lost, saves are now ordered and retried, changes made while closing are kept, and damaged or locked files are never overwritten;
  - spoiler pin names are hidden;
  - phone and tablet layout;
  - 3D cards;
  - Light-theme contrast;
  - icons and page titles.
- Releases: `scripts/package_release.py` and `scripts/package_unix.py` build the public edition and refuse unapproved media. `--include-local-media` builds a personal edition.

## 0.2.34 (21 November 2026)

Cleaner pictures: 120 watermarked pictures swapped for clean ones, and 23 new ones (2,717 of 3,085 entries now have a picture).

- Clean replacements for WAiNK landmarks, mod shops, shipwrecks, weapon renders, mission scenes and more, from Game8, GTABase, PC Gamer, VGC, GamesRadar+ and GTA BOOM.
- New pictures for Chapter 3 to 5 missions, Karim, weather and public transport.
- Fixes: wrong pictures removed from the American black bear and parrotfish; Gold Doubloon 2 and 4 directions were swapped.

## 0.2.33 (20 November 2026)

40 more sourced pictures: 2,696 of 3,085 entries now have one.

- 26 standout and regular vehicles, each showing its own paint job, from Game8's vehicle pages.
- Places (the flea market, Apollo Aggregates, the Catalan Boulevard bridge, the waste site, Vespucci Island, Merlin's Palace Casino, Key Lento Police Station), weapons and equipment, the Alien Range, the pelican for the animal compendium, and the Rottweiler.
- The pre-launch Nagasaki Dinghy is folded into the Dingus Como: GTABase's old Dinghy page now names it so.

## 0.2.32 (20 November 2026)

The Field Manual, rewritten for the released game: 14 chapters, 86 written pages and 211 pictures.

- Rewritten from launch guides: How to Read, Getting Started, Robberies & Stealing and Law Enforcement.
- New chapters: Story & Missions (givers, starts and rewards, no plot), Money & Businesses, Collectibles & Challenges, and Wildlife, Fishing & Hunting.
- Places, Characters, Vehicles, Activities & Pastimes and Weapons open with written pages before their entry lists.
- Design: a title page for every chapter, coloured chapter tabs down the edge of the book, picture thumbnails in the contents, tips, a reading-progress bar, and spoiler pictures blurred under an eye.
- Fixes: two wrong encyclopedia pictures removed; the manual no longer fails if the window is resized while it loads; the data check also checks manual cover and entry pictures.

## 0.2.31 (20 November 2026)

Launch-evening news, 33 fish and new birds, about 65 more pictures, and nine duplicates merged.

- Entries: 3,086, up from 3,051; 2,658 show a picture.
- Wildlife (124): 33 fish, Gary the alligator, and the northern gannet, great egret and Caspian tern; real species names for the crane, stork, heron, pelican and gull.
- Pictures: 13 weapons, 12 vehicles, Under the Bridge spots, a Knife Flight, mission screenshots, Yasmani, Felipe and Nate.
- Duplicates: nine pairs of entries for the same thing in the same section merged into one (for example the cougar into the Florida panther).
- Facts: mission givers and starts, Richardson Jewelry's robbery details, equipment unlocks, relationship tips, Delights Cabaret, and both guides' figures for vehicle fencing.
- Intel (94 news items): DE-CIX's traffic record, Take-Two shares, PC Gamer's fact check, The Guardian's advice to parents, fired Rockstar North staff on launch day, Rob Nelson on the short opening, glitch clips.

## 0.2.30 (19 November 2026)

Launch-day news, 66 standout vehicles, 29 places and about 160 more pictures.

- Entries: 3,051, up from 2,928; 2,593 show a picture.
- Vehicles (383): 66 standout vehicles from GTABase's map, Moses' Sultan, and registration cost, sell value, seats and drive for more cars.
- Places (157): landmarks, police stations, hospitals and marinas.
- Weapons: exact spots or prices for about 85 unique weapons, story-mode prices, shop unlock rules, the ADB PD-90.
- Missions: giver, start and reward for more Chapter 1 to 4 missions and side lines, with mission screenshots; no plot.
- Easter eggs and extras: UFO abduction, giant crab, lifeguard dog, Sam Houser's cameo, Arthur Morgan's hat, Kitty Litter labs, house repairs.
- Intel (81 news items): Rockstar's launch post and support articles, Sensor Tower's ~19 million estimate, final streaming numbers, autosave reports, boxed-copy code problems.

## 0.2.29 (19 November 2026)

Two pictures put back on the right entries.

- Florida panther: Rockstar's picture is back on its entry; in 0.2.28 it showed on Bret's Target Decks.
- Nuestra Señora de la Noche: the wreck's own picture is back on its entry instead of the general Underwater discoveries entry.

## 0.2.28 (19 November 2026)

Collectible cards, stunts and races, the official credits, and 1,292 more entries.

- Entries: 2,928, up from 1,636, and 2,514 of them show a picture.
- Collectibles: 1,243, up from 154. The collectible cards by set, 201 Under the Bridge stunts, 128 stunt jumps, 39 knife flights, 25 base jumps, 34 of Kenton's treasures, and more WAiNK curiosities, landmarks and sculptures, each with where it is.
- Activities: 221, up from 66. 100 basketball hoops, and the named races and racing challenges by series.
- Characters: ten more named characters from the official cast, including Petra Navarro, Stefanie Gates, Phil, Bae-Luxe and Roxy. Story characters are marked as spoilers.
- Radio: about 40 confirmed songs added across ten stations.
- Vehicles and wildlife: 15 more vehicles with seats, drivetrain and sell value where known, and the lionfish, stingray and Carolina dog.
- Intel: Rockstar's official credits (Dylan Rourke plays Jason), Take-Two's launch press release, the Xbox dashboard backgrounds, restaurant tie-ins and more. The voice cast answer is updated.
- Pictures: near-identical pictures saved under different entries are removed, so each shot appears once.
- Where a guide site disagrees with the app (a maker, a song title), both are recorded.

## 0.2.27 (19 November 2026)

Pictures for almost everything, and 226 more entries.

- Pictures: 1,282 of 1,636 entries now show a picture. Each is tied to its entry by name on the page it came from (Rockstar's own pages where they exist, otherwise guide and news sites, recorded with each picture), no picture is used twice, and none is smaller than 480 by 260 pixels. Pictures taken from guide sites illustrate their entries only and stay out of the Media gallery.
- Weapons: 210, up from 84. IGN's weapons guide names every melee weapon, confirms the four explosives, adds the Schlamm DRX, and lists the named weapon variants, each with maker, ammunition, magazine and fire mode. About 50 guns gain their Ammu-Nation stock tier.
- Collectibles: 154, including six named shipwrecks with their treasure and 26 more WAiNK spots.
- Wildlife: 81, including dog breeds, the Florida panther, sharks and birds.
- Places and businesses: islands, the Oceanarium, a police station, motels and dealerships.
- Missions: Chapter 4 and 5 missions gain who gives them and where they start.
- Intel: eight news items with pictures (the streaming record, analysts' forecasts, the Australian broadband record, the Miami Heat's Vice City night, the union vote and others), shown on the timeline. The PC and GTA Online answers say nothing was announced at launch.
- Characters: the fan-compiled list of minor characters is removed, and named characters such as Kenton, Donnie and Mandy have pictures from Rockstar's footage.

## 0.2.26 (19 November 2026)

The game is out, and the encyclopedia has grown from 233 entries to 1,471. Every entry names its source. Entries that describe what is in the game are marked as spoilers and stay blurred unless you chose to see spoilers.

- Out now: Home and the top bar show the game as released from the moment the first region launched, not from midnight on your own computer.
- Vehicles: 295, up from 15. Names and classes from a transcription of the game's own vehicle list, with 148 pictured. 70 still rest on a fan site's pre-launch identification and are labelled Community.
- Missions and Story: one entry for each of 174 missions (who gives it, where it starts, which lead plays it, the reward, what it unlocks). No plot.
- Places and businesses: 119 locations (the five counties, their sub-regions, the parts of Vice City, landmarks) and 245 businesses (garages for sale with prices, gun stores, mod shops, banks, shop chains).
- Weapons and equipment: 84, with maker, calibre, magazine size and fire mode.
- Characters and gangs: 62 characters and 15 gangs and groups.
- Music: all 22 radio stations with songs heard on each, and the album's 34 tracks.
- Collectibles: 104 entries: each card set, named scans, books, meditation spots, stunts by county.
- Gameplay: 106 entries, adding everyday systems (phone apps, bank and cash limits, stats, wanted stars, homes, garages, vehicle registration, saving), every cheat with its requirement, all 80 challenges, and job sites with payouts.
- Activities and wildlife: 66 activities (race venues, shooting courses, all 42 drone trials, the playable video games) and 56 animals.
- Field Manual: compared with launch reviews and guides. 101 items corrected or extended, 18 launch topics added in two new pages, and a new evidence label, "Reported at launch".
- Pictures: 130 vehicle pictures (crops of Rockstar's trailers and screenshots, as published by GTABase). People and places without a picture now show as text entries instead of "No artwork on file" tiles, and the Missions, Collectibles and Achievements tiles have covers.
- Intel: the 22-station count, the album track list, Sam Houser's statement, an outside estimate of pre-launch sales, and answers on who plays the leads and who made the game.

## 0.2.25 (18 November 2026)

The launch update: what is known now that the game is out. Everything names its source. Entries that describe what is in the game are marked as spoilers and stay blurred unless you chose to see spoilers.

- Achievements: a new section with all 55 PlayStation 5 trophies, each with its icon, grade, requirement and Xbox Gamerscore, from Exophase's reading of the platforms' own lists.
- Missions and Story: how the story is divided (a prologue and five chapters), the mission names for each chapter, and the Strangers and Freaks side missions, from PowerPyx's walkthrough.
- Collectibles: the 100% checklist, all 18 collectible card sets, stunts, WAiNK locations, Cocaine Flamingos, Underwater Discoveries, meditation spots, and magazines, books and comics.
- Gameplay: what two launch reviews report (switching leads, loadout and weapon lockers, aiming and Focus, trackers and registration, escaping the police, fences, how missions fail, the bond between the leads), plus cheats, the 80 challenges, the game's Progress database, fast travel, making money, what happens after the story, earning the platinum, accessibility options, and how the game runs on each console.
- Intel: the rollout from New Zealand, review scores (99 on Metacritic from 147 PlayStation 5 reviews on 18 November), eight Game Awards nominations, the PlayStation 5 system update, the second pre-launch update, and new answers on how long the game is and what to do when it will not download.
- Microsoft Store edition: its Store name is now "Leonida HQ (Unofficial Fan Guide)", after Microsoft refused the earlier name for containing the game's title.

## 0.2.24 (16 November 2026)

- Spoilers: the first time the app opens it says that it can contain spoilers and asks whether to show them. Left unticked, anything marked as a spoiler is blurred under an eye button; pressing the eye shows that one. A new eye in the top bar shows or blurs all of them. Nothing is marked as a spoiler yet: what was known before launch, and anything in a trailer, is not one.
- Settings are kept: the spoiler choice, the Manual's night theme and last page, and a dismissed update notice are now saved in a file in your own settings folder, so they are still there after a restart or an update. Before this they were forgotten each time the app closed.

## 0.2.23 (15 November 2026)

- Gallery: 46 more of Rockstar's pictures, from its editions page, under a new "editions" filter: the Standard and Ultimate Edition covers, the Vintage Vice City Pack, the Vice City Style outfits, more cars from the Classic Car Collection, and further views of the Ultimate Edition's shops, cars, boat and revolver. Each one records where it came from and that its rights are not confirmed.
- Intel: the Standard and Ultimate Edition cards show their cover art.

## 0.2.22 (15 November 2026)

- New preview details from the creator TGG's pre-launch guide (15 November), all labelled as preview reports: the four states of the criminal profile; bank balance, carried cash and loot, with deposits at ATMs; fences and what they unlock; tools, trackers and garages for stolen cars; fuel and public transport; what can be carried; a few reported controls; chapters and a story length of about 80 hours for Rob Nelson's own playthrough.
- Field Manual: ten new pages (50 in all) across Getting Started, Robberies & Stealing and Law Enforcement. Six "not yet known" notes were removed or narrowed where the video answers them.
- Encyclopedia: 17 new Gameplay entries and one Wildlife entry; Robberies, Stealing cars, the wanted level, Racing, Water sports and Hunting and fishing gained paragraphs. 99 entries in all.
- Intel: a news item for the guide.
- For people building from source: the Microsoft Store packer gained options to include Rockstar's published pictures, the intro, or the whole GitHub edition. The app you download here is unchanged by that.

## 0.2.21 (14 November 2026)

- Home: 28 new live wallpapers made from Rockstar's artwork and screenshots. Each is the original picture, gently moved (depth, drifting camera, swaying palms, rippling water, pulsing neon); nothing is redrawn and no AI video model is used.
- Intro: Rockstar's character clips play first, then continue inside the shape of the VI logo before the logo and cover panels arrive.
- Top bar: each section has its own icon, drawn for the app.
- Faster and lighter, measured on the real app: page changes are steadier, the Encyclopedia no longer re-reads every picture and video on each visit, the Media page shows a still poster instead of loading every video, and the Home wallpaper stops playing when it is scrolled out of view or hidden under the intro. Numbers are in docs/performance.

## 0.2.20 (13 November 2026)

- Evidence labels are now solid tags. The top one, for anything stated or shown in Rockstar's own published material, reads "R★ Verified" (it was "Official" in the encyclopedia and "Demonstrated" in the Field Manual). It does not mean Rockstar has reviewed this app.

## 0.2.19 (13 November 2026)

- The intro is smoother: each panel glides in on a straight line, slows down and stops in its place, with no turning or overshoot.

## 0.2.18 (13 November 2026)

- New intro: the VI logo opens first, then the nine panels of the cover art fly in one by one to build the full picture.
- Updates are found while the app is open: it now checks at most once every half hour, and when its window comes back into view, so a new release is offered without closing and reopening the app.

## 0.2.17 (13 November 2026)

- Fan lists: five new entries name the vehicles, weapons, brands, minor characters and animals that the GTA Wiki community has picked out of trailers and screenshots. Each is marked as community research, and items the wiki flags as coming from the 2022 leak are left out.
- News: the Rockstar Store clothing and collectibles range, and the full contents of the collector's box.
- The Launch Trailer entry carries Rockstar's own story summary. Radio entries add earbuds and Mud Dog Mike of Back Country Radio.
- The score, album and radio news items now cite Rockstar's own posts.

## 0.2.16 (13 November 2026)

- Launch time: Rockstar's support site says the game releases at midnight local time in every region. Pre-load start times are recorded too.
- Editions: the boxed version holds a download code and no disc, there is no boxed Ultimate Edition, and the Vintage Vice City Pack comes with purchases made before November 20.
- New question in Intel: "Is there a disc version?", with the region rules for download codes.
- News: press reports of a first update (1.002.000) ahead of launch. Rockstar has published no patch notes.
- Vice City, Leonida Keys, Grassrivers and Leonida Penitentiary gain district, island and town names recorded by the GTA Wiki community, marked as fan readings.

## 0.2.15 (13 November 2026)

- Lori's entry has a picture, from Rockstar's official screenshot "Brian Heder 04". Rockstar does not name the woman in it, and the entry says so.

## 0.2.14 (13 November 2026)

- Four new items on the Intel timeline, each checked at its source: Grand Theft Auto VI: The Festival, the 30 frames per second target and PlayStation 5 Pro details, Take-Two saying development is complete, and the free poster and map of Leonida on launch day.
- A new question on frame rate, and a corrected answer on Xbox One: the game will stream to it through Xbox Cloud Gaming.
- Timeline items can now show further detail under their summary.

## 0.2.13 (13 November 2026)

- Windows Security wrongly flagged the 0.2.12 program as a threat and removed it. This build is not flagged. The program now carries proper file details (name, version, description and icon).

## 0.2.12 (12 November 2026)

- The **Update now** button in the update notice is a proper button again. Since 0.2.7 it was squeezed into a small circle with its text spilling over the edge.
- macOS and Linux preview packages are attached to each release.

## 0.2.11 (12 November 2026)

- More official detail, each item checked on Rockstar's or PlayStation's own page: the album's ten singles, the score's guest artists and physical releases, the ESRB rating, the GTA+ month and Ultimate Edition Upgrade on the PlayStation Store, and PlayStation 5 features.
- New entries for Lori, DWNPLY and Leonida Penitentiary, and new questions in Intel about the rating, the PlayStation 5 version and offline play.
- The app now also builds and runs on macOS and Linux. Those versions are tested automatically but are not released yet.

## 0.2.10 (12 November 2026)

- The Field Manual's day and night switch is a small Vice City scene. By day: pastel hotels, palms and the sun on the bay. Press it and the sun sets, the moon rises, and the windows and neon signs come on. The new look spreads across the page in a circle from the switch.
- The link card shown when the repository is shared is redrawn so every picture shows a face and sits inside the frame; `scripts/make_social_preview.py` draws it.

## 0.2.9 (12 November 2026)

- The splash screen dissolves into Home while the app eases in behind it, instead of cutting to it. This now plays even when Windows animation effects are turned off.

## 0.2.8 (12 November 2026)

- The police lights during an update flash about 1.5 times a second, the rate recommended for emergency lamps, with a low glow between flashes.
- The text on the update stage sits on a darker shade, as intended.

## 0.2.7 (12 November 2026)

- An installed copy can update itself. "Update now" downloads the new setup from the release on GitHub, checks it against the release's checksums, then the app closes, updates and opens again. A portable copy still gets a link.
- The update shows on Home: the hero keeps its live wallpaper and shows the progress ring.
- While an update runs, red and blue police light plays down both sides of the window.

## 0.2.6 (12 November 2026)

- The Discord invitation on Home has its own GTA VI wallpaper that changes every few seconds, the server's icon and the Discord logo.

## 0.2.5 (12 November 2026)

- Setup no longer leaves a folder named after itself beside the setup file.

## 0.2.4 (12 November 2026)

- Setup is now its own window in the app's look, with a live wallpaper, sliding picture cards and the loading ring. It installs the same way underneath, and the setup file shows the logo as its icon.
- Home has an invitation to the community Discord server, and every page has one above the footer.
- Phrases marked as spoilers in the data are covered until clicked. Nothing is marked yet.

## 0.2.3 (12 November 2026)

- The app links to the community Discord server from the top bar, the home page and the footer. The link opens in your browser.

## 0.2.2 (12 November 2026)

- The app's pages may only run the script files that ship with the app (a content security policy), and files are never used as a type other than the one they are served as.
- Pictures in the Field Manual can be reached with Tab and opened full screen with Enter or Space.

## 0.2.1 (12 November 2026)

- Home plays every live wallpaper in turn, cross-fading from one to the next.
- Still pictures drift slowly: cards, category covers, location headers, character portraits and the Media page.
- The full-screen picture viewer frames each picture to its own shape and blurs the page behind.
- The window can be dragged from the splash screen.

## 0.2.0 (12 November 2026)

- No Windows title bar: the app has its own minimise, maximise and close buttons. Drag the window by the top bars; resize it by its edges.
- Grand Theft Auto VI's sunset colours throughout, and a new splash with the logo turning inside a ring that fills.
- Live picture strips in page headers, and columns of cards sliding down the side margins on wide windows.
- Pages fade in and out as you move between tabs. The page scroll bar is hidden.
- Field Manual: now 38 pages in 10 chapters, with two new chapters (Getting Started; Robberies & Stealing), an overview of the stars and Heat icons, and full-screen pictures.
- Encyclopedia: a picture card for each category, and official pictures for 72 of the 73 entries.

## 0.1.1 (12 November 2026)

- **Security fix.** The app's built-in local server accepted requests carrying any Host header, so a malicious web page open in the browser could have reached it while the app was running. It now refuses any request not addressed to your own machine.
- An installer, alongside the portable zip.

## 0.1.0 (12 November 2026)

- First public release: encyclopedia, map, media gallery, Field Manual, Discord status, and a check for newer versions. **Superseded: do not use**, because of the weakness fixed in 0.1.1.
