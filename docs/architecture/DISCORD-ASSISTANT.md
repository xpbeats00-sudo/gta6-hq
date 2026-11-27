# The GTA 6 HQ assistant on Discord

Players ask questions about GTA 6 in `#gta6-questions` in their own words. The GTA 6 HQ bot answers
from the app's own data, with a picture of the map and a button that opens the interactive map at
the place.

## What players see

- **In `#gta6-questions`**: any message is a question. The reply is public, so others can read it:
  - an embed with the short answer, steps and facts;
  - a picture of the Leonida map around the place;
  - buttons: **Open interactive map**, **View full guide** (or *View in GTA 6 HQ*), **Show nearby**,
    **Find another** and **View sources**.

  If several things match, a menu offers the closest ones instead of a guess.
- **Follow-ups**: for 15 minutes the bot remembers each player's last answer in that channel. That
  lets a player ask "fastest car", then "where do I get it?", then "which one has the most fuel?".
- **Slash commands**, anywhere on the server:

  | Command | What it does |
  | --- | --- |
  | `/ask` | Asks the assistant anything |
  | `/find` | Searches, optionally by type |
  | `/map` | Opens the map, at a named place if given |
  | `/vehicle` | Looks up a vehicle |
  | `/weapon` | Looks up a weapon |
  | `/guide` | Finds a Field Manual guide |
  | `/stunts` | Stunt jumps, knife flights, under the bridge, base jumps |
  | `/completion` | 100% completion guidance |
  | `/sources` | The sources behind your last answer, shown only to you |

Example questions it handles: where to find the Pegassi Infernus, how to complete the knife flights,
the nearest Ammu-Nation to Vice Beach, how to rob a bank, the 40 gang operations, the fastest car,
and how many stick-ups 100% needs.

## Why the map opens in a browser

A Discord embed cannot run a live map. So each answer that has a place carries two things:

- **The picture**: a crop of the official map with the places marked, so the answer is readable
  without leaving Discord.
- **The button**: it opens GTA 6 HQ on the web at <https://xpbeats00-sudo.github.io/gta6-hq/>,
  straight at the same place, with nothing to search for again.

The web version is the app itself: the same pages from `ui/`, the same map with its sidebar,
toolbar, filters, planners, 2D and 3D views and detail tiles, the same encyclopedia and Field
Manual. A player can drag, zoom, reset, go full screen, pick markers and mark places found. Their
progress and favourites are kept in their own browser. A link from Discord skips the intro and goes
straight to the page; the first visit still shows the app's spoiler notice once.

| Link | Opens |
| --- | --- |
| `#/map?focus=<pin name or section/slug>` | One place, with its card open |
| `#/map?kind=Gang+Operations` | Every place of a kind (several are separated by `\|`) |
| `#/map?at=x,y;x,y` | The pins at those map positions (0 to 1 across and down), on their own |
| `#/map?q=words` | The map's list, filtered by those words |
| `#/wiki/<section>/<slug>` | An encyclopedia entry (`#/characters/…` and `#/locations/…` for those two) |
| `#/manual/<chapter>/<page>` | A Field Manual page, numbered as the app numbers it |

Older `/map/?…` and `/guide/?…` addresses forward to the same pages.

### How the web version runs without the app's server

`scripts/build_site.py` copies `ui/`, `images/` and `wallpapers/` into `site/`. It then saves what the
app's own server answers (`/api/wiki`, `/api/manual`, `/api/media`, `/api/health`) as files, and
fetches the map's detail tiles through the server's tile cache. `web/static-host.js` loads first and
answers the app's `/api/` calls:

- the data comes from those files;
- saved data and settings go to the browser's storage, merged a part at a time as the server does;
- search runs in the page;
- desktop-only things (updates, Discord status) answer "not available".

Absolute paths are made relative, because GitHub Pages serves the site from `/gta6-hq/`. Nothing
in `ui/` is written differently for the web, apart from two things in `ui/app.js`: links skip the
intro on the web, and the map reads `at=` and several kinds.

## One source of truth

Nothing reads or copies the data files on its own:

- `scripts/hq_data.py` runs a private copy of the app in `--serve` mode, loopback only. It runs with
  its own settings and saved-data files, so it never touches the player's own app.
- It asks that server for `/api/wiki`, `/api/search` and `/api/manual`, the same answers the desktop
  window gets. Merging, drafts and search (typos, plurals) are therefore the app's own.
- Map pins are built the same way as `mapPins()` in `ui/app.js`.
- The hosted site is built from that same server by `scripts/build_site.py`, and published by
  `.github/workflows/pages.yml` whenever data, pages or scripts change on `main`.

| File | Job |
| --- | --- |
| `scripts/hq_data.py` | Data access through the app's server |
| `scripts/hq_assistant.py` | Reads the question, finds the subject, builds the answer and the map picture. No Discord code. |
| `scripts/discord_assistant.py` | Turns answers into Discord messages; handles slash commands and buttons; handles rate limits |
| `scripts/discord_online.py` | The bot's one gateway connection: status line, Member role, assistant events |
| `web/static-host.js` | Stands in for the app's server on the web |
| `scripts/build_site.py` | Builds `site/`: the app's pages, pictures, exported data and map tiles |

## Accuracy

- **What it draws on**, in order:
  1. the encyclopedia entry or map pin;
  2. the Field Manual page;
  3. the sources those cite.

  Each answer lists its sources, and **View sources** shows them all.
- **What it does without**: it uses no language model and makes up nothing. A missing fact gets a
  plain reply, never a guess. For example, there are no fuel figures and no list of the 40 knife
  flight places yet.
- **What it shows**: unknowns are quoted from the guide's "Not known yet" lists. Map positions are
  labelled approximate.
- **Spoilers**: they stay behind Discord spoiler bars (`||…||`), as the app's own text marks them.
  On the hosted pages they are veiled until clicked, or until *Show spoilers* is ticked.

## Reliability

- **Lookups**: one question is looked up at a time. Each lookup takes milliseconds, and Discord
  calls run in worker threads.
- **Repeats and spam**: a message or interaction seen before is ignored. Each player gets a
  2.5-second cool-down, and the channel has a 5-second slow mode.
- **Rate limits**: when Discord rate-limits a call, the bot waits the time Discord gives and tries
  again.
- **Data server**: the copy of the wiki is re-checked once a minute (with an ETag), so data edits
  show without a restart. If the data server stops, it is started again.
- **Logs**: go to `%LOCALAPPDATA%\GTA6HQ\bot\online.log`.

## Settings in the Discord Developer Portal

Two privileged intents are read from the portal every ten minutes. When one changes, the bot
reconnects with it, with no restart needed.

| Intent | What it is for | Without it |
| --- | --- | --- |
| **Message Content Intent** | Reading questions in `#gta6-questions` | The bot answers only messages that @mention it; slash commands still work |
| **Server Members Intent** | Giving new members the Member role | No role is given |

## Tests

```sh
python scripts/test_assistant.py                # 18 checks of answers, links and replies
python scripts/build_site.py
python -m http.server 4680 --bind 127.0.0.1 --directory site
node scripts/web_map_check.mjs 9341 http://127.0.0.1:4680   # with a headless browser on port 9341
```

`test_assistant.py` checks every answer against the data:

- every pin shown is a real map pin;
- every map link opens at real pins;
- every quoted fact is in its entry;
- spoilers stay hidden;
- several players asking at once each get one reply, and duplicates are ignored.

`web_map_check.mjs` checks the web version in a browser, also when served from a folder:

- a map link opens the app's map straight away, at the kind, kinds, positions or place it names;
- dragging pans, the wheel and the + and − buttons zoom, reset shows the whole map, and full
  screen is asked for;
- search, an entry with its picture and a Field Manual page work without the server;
- saved data survives a reload;
- nothing throws, logs an error or fails to load.

CI runs both on Linux. The Discord replies are tested against a stand-in for Discord's API.
