# Changelog

Every version is on the [releases page](https://github.com/xpbeats00-sudo/gta6-hq/releases). Newest first.

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
