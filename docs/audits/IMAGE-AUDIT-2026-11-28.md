# Image audit, 2026-11-28

Every picture under `images/`, graded for size and weight, with the look-alike groups found by comparing pictures
(a 256-bit difference hash; pictures within 10 bits of each other are grouped). Nothing was deleted or changed by this audit.

**Total:** 2623 pictures, 316 MB.

## Grades

Photographs and artwork only (icons, card faces, map blips and interface art are sized for their own use).

- **A**: 1280 px wide or more. Sharp at full page width.
- **B**: 800 to 1279 px. Fine in a card, a list or a side panel; slightly soft as a full-width banner.
- **C**: under 800 px. Soft when shown large.
- **Oversize**: 3000 px or more. Larger than anywhere the app shows it (the widest slot is about 1400 px).

| Folder | Pictures | MB | A | B | C | Oversize |
|---|---|---|---|---|---|---|
| vehicles | 780 | 65.4 | 73 | 691 | 13 | 3 |
| missions | 168 | 45.1 | 161 | 7 | 0 | 0 |
| collectibles | 504 | 36.6 |  |  |  |  |
| locations | 63 | 23.1 | 42 | 11 | 2 | 8 |
| businesses | 96 | 19.2 | 84 | 10 | 0 | 2 |
| weapons | 283 | 17.4 | 21 | 247 | 15 | 0 |
| web | 42 | 15.2 | 32 | 8 | 0 | 2 |
| gameplay | 57 | 15.0 | 40 | 8 | 7 | 2 |
| manual | 91 | 13.8 | 63 | 8 | 18 | 2 |
| wildlife | 98 | 11.7 | 12 | 71 | 11 | 4 |
| editions | 39 | 9.2 | 39 | 0 | 0 | 0 |
| characters | 60 | 9.0 | 28 | 23 | 8 | 1 |
| news | 28 | 8.6 | 16 | 7 | 2 | 3 |
| activities | 30 | 8.4 | 20 | 6 | 0 | 4 |
| artwork | 30 | 7.5 | 28 | 1 | 1 | 0 |
| (top) | 9 | 2.6 |  |  |  |  |
| map | 5 | 2.3 |  |  |  |  |
| music | 12 | 2.2 | 9 | 1 | 2 | 0 |
| achievements | 55 | 1.5 |  |  |  |  |
| factions | 6 | 1.1 | 5 | 1 | 0 | 0 |
| ui | 83 | 0.4 |  |  |  |  |
| splash | 10 | 0.3 |  |  |  |  |
| map-icons | 73 | 0.1 |  |  |  |  |
| community | 1 | 0.0 |  |  |  |  |

## Too much: oversize pictures

31 pictures are 3000 px wide or more (33 MB). The app never shows a picture wider than about
1400 px, so these could be saved at 1920 px with no visible change and roughly 23 MB less to download and install.
Not done here: it rewrites many files, and the originals are the best copies on hand. The ten heaviest:

| Picture | Size | MB |
|---|---|---|
| `images/news/rockstar-now-available-post.jpg` | 3840 x 2160 | 2.0 |
| `images/vehicles/declasse-yosemite-1500.jpg` | 3840 x 2160 | 1.8 |
| `images/vehicles/vapid-montagne-xl.jpg` | 3840 x 2160 | 1.6 |
| `images/manual/guide/g100-route-vice-city-rooftops.jpg` | 3840 x 2160 | 1.5 |
| `images/vehicles/70-riata.jpg` | 3840 x 2160 | 1.4 |
| `images/locations/leonida-penitentiary.jpg` | 3840 x 2160 | 1.3 |
| `images/locations/ocean-view-hotel.jpg` | 3840 x 2160 | 1.2 |
| `images/locations/mount-kalaga.jpg` | 3840 x 2160 | 1.2 |
| `images/locations/catalan-key.jpg` | 3840 x 2160 | 1.2 |
| `images/locations/stockyard-walls.jpg` | 3840 x 2160 | 1.1 |

## Too little: pictures under 800 px

79 pictures. By folder: manual 18, weapons 15, vehicles 13, wildlife 11, characters 8, gameplay 7, locations 2, news 2, music 2, artwork 1.
An earlier pass (same day) found no larger copy of these at their sources; GTABase, where most come from, serves them at this size.

## Could be similar: look-alike groups

163 groups, 356 pictures.

- **106 groups are colour variants of one collectible card** (bronze, silver, gold and so on). The game has each as its own card, so these are meant to look alike.
- **48 groups sit in one folder**: usually the same subject under two entries (a vehicle and its police or taxi version, two branches of one shop).
- **9 groups span folders**: the same picture kept twice for two sections (a place picture also used for a mission, a manual copy of an entry picture). These are the true duplicates on disk.

### Across folders

- `images/gameplay/robberies.jpg` = `images/web/pcgamer-t-5b4c3b56771c.jpg`
- `images/locations/grassrivers.jpg` = `images/web/playday-t-0c6974558b15.jpg`
- `images/locations/leonida-keys.jpg` = `images/web/playday-0a37c7f1372f.jpg`
- `images/manual/jason-and-lucia-waterfront.jpg` = `images/web/playday-4efa5c1523e2.jpg`
- `images/map/leonida-official.jpg` = `images/web/powerpyx-ceb058ea0d9d.jpg`
- `images/missions/collect-moses-gift.jpg` = `images/web/powerpyx-t-66a6875ed41b.jpg`
- `images/muscle-car-pastel-palms.jpg` = `images/artwork/couple-on-muscle-car.webp`
- `images/news/no-60fps-on-ps5-pro.jpg` = `images/web/gamesradar-94c55f64825f.jpg`
- `images/vehicles/menu/mammoth-patriot-mil-spec.jpg` = `images/web/gtabase-ebe6601473b3.jpg`

### Within one folder (cards left out)

- `images/map-icons/atm.webp` = `images/map-icons/towable-atm.webp`
- `images/map-icons/jewelry-store.webp` = `images/map-icons/smash-n-grab.webp`
- `images/map/leonida-roads.png` = `images/map/leonida-routes.png`
- `images/ui/hud/adrenaline.png` = `images/ui/hud/health-buff.png`
- `images/ui/hud/engine-critical.png` = `images/ui/hud/engine-good.png`
- `images/ui/hud/tracker-advanced.png` = `images/ui/hud/tracker-standard.png`
- `images/ui/hud/weapon-unique.png` = `images/ui/hud/weapon-unowned.png`
- `images/vehicles/benefactor-shutzen.jpg` = `images/vehicles/menu/benefactor-shutzen.jpg`
- `images/vehicles/hvy-excavator.jpg` = `images/vehicles/menu/hvy-excavator.jpg`
- `images/vehicles/maibatsu-audacity-sanchez.jpg` = `images/vehicles/maibatsu-berserker-sanchez.jpg`
- `images/vehicles/maibatsu-donk-boomazoom.jpg` = `images/vehicles/maibatsu-spec-ops-boomazoom.jpg`
- `images/vehicles/maibatsu-pharaoh-sanchez.jpg` = `images/vehicles/maibatsu-royal-sanchez.jpg`
- `images/vehicles/menu/ocelot-bloodless-jugular.jpg` = `images/vehicles/menu/ocelot-jagular.jpg`
- `images/vehicles/ubermacht-booty-fcr-1000.jpg` = `images/vehicles/ubermacht-dogfight-fcr.jpg`
- `images/weapons/adb-pd-90.jpg` = `images/weapons/gtabase/adb-pd-90.jpg`
- `images/weapons/baton.jpg` = `images/weapons/gtabase/baton.jpg`
- `images/weapons/bushcraft-knife.jpg` = `images/weapons/gtabase/bushcraft-knife.jpg`
- `images/weapons/combat-knife.jpg` = `images/weapons/gtabase/combat-knife.jpg`
- `images/weapons/diving-knife.jpg` = `images/weapons/gtabase/diving-knife.jpg`
- `images/weapons/edc-knife.jpg` = `images/weapons/gtabase/edc-knife.jpg`
- `images/weapons/fairview-ff-50.jpg` = `images/weapons/gtabase/fairview-ff-50.jpg`
- `images/weapons/fairview-ff-sr.jpg` = `images/weapons/gtabase/fairview-ff-sr.jpg`
- `images/weapons/fairview-kalinga-50.jpg` = `images/weapons/gtabase/fairview-kalinga-50.jpg`
- `images/weapons/frag-grenade.jpg` = `images/weapons/gtabase/frag-grenade.jpg`
- `images/weapons/girardi-az1200.jpg` = `images/weapons/gtabase/girardi-az1200.jpg`
- `images/weapons/girardi-es18.jpg` = `images/weapons/gtabase/girardi-es18.jpg`
- `images/weapons/girardi-verro.jpg` = `images/weapons/gtabase/girardi-verro.jpg`
- `images/weapons/goodwin-comshot-12.jpg` = `images/weapons/gtabase/goodwin-comshot-12.jpg`
- `images/weapons/gtabase/explorers-knife.jpg` = `images/weapons/gtabase/shark-knife.jpg`
- `images/weapons/hauners-h-at.jpg` = `images/weapons/gtabase/hauners-h-at.jpg`
- `images/weapons/hillinger-boomer.jpg` = `images/weapons/gtabase/hillinger-boomer.jpg`
- `images/weapons/hillinger-m306-tmr.jpg` = `images/weapons/gtabase/hillinger-m306-tmr.jpg`
- `images/weapons/hunting-knife.jpg` = `images/weapons/gtabase/hunting-knife.jpg`
- `images/weapons/klose-k17-mcd.jpg` = `images/weapons/gtabase/klose-k17-mcd.jpg`
- `images/weapons/kozlov-kvga-12.jpg` = `images/weapons/gtabase/kozlov-kvga-12.jpg`
- `images/weapons/mason-and-keen-longshot.jpg` = `images/weapons/gtabase/mason-and-keen-longshot.jpg`
- `images/weapons/mason-and-keen-shortstraw.jpg` = `images/weapons/gtabase/mason-and-keen-shortstraw.jpg`
- `images/weapons/schlamm-drx.jpg` = `images/weapons/gtabase/schlamm-drx.jpg`
- `images/weapons/schlamm-dw-9.jpg` = `images/weapons/gtabase/schlamm-dw-9.jpg`
- `images/weapons/scorpio-akulus.jpg` = `images/weapons/gtabase/scorpio-akulus.jpg`
- `images/weapons/shrewsbury-sm-69.jpg` = `images/weapons/gtabase/shrewsbury-sm-69.jpg`
- `images/weapons/shrewsbury-sms-01.jpg` = `images/weapons/gtabase/shrewsbury-sms-01.jpg`
- `images/weapons/survival-knife.jpg` = `images/weapons/gtabase/survival-knife.jpg`
- `images/weapons/switchblade.jpg` = `images/weapons/gtabase/switchblade.jpg`
- `images/weapons/vom-feuer-vf5.jpg` = `images/weapons/gtabase/vom-feuer-vf5.jpg`
- `images/weapons/vom-feuer-vf5c.jpg` = `images/weapons/gtabase/vom-feuer-vf5c.jpg`
- `images/weapons/wortham-w-10.jpg` = `images/weapons/gtabase/wortham-w-10.jpg`
- `images/weapons/wortham-w-14.jpg` = `images/weapons/gtabase/wortham-w-14.jpg`

## Verdict

- **Quality:** most photographs grade B. That suits how they are shown (cards, lists, the right-hand panel). Banners use the 2000 px artwork, which grades A.
- **Too much:** the oversize 4K pictures are the only real excess by weight. The app has many pictures, but each stands for a different entry.
- **Too similar:** the cross-folder groups are the candidates to merge (point both entries at one file). The same-folder groups mostly reuse one honest picture for two closely related entries.
- **Card faces:** covered in `CARD-PICTURES-2026-11-28.md`.
