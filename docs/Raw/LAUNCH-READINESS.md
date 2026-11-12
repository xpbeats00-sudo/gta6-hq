# Launch readiness: adding data quickly and safely

Written 2026-11-12, a week before release. This is the working guide for launch day, when hundreds of real entries (vehicles, weapons, missions, radio, collectibles, places) need to go in fast. The content rules are in `EDITORIAL_POLICY.md`; nothing here relaxes them.

## The short version

```powershell
# 1. Get an empty entry for the category
.\target\release\gta6-hq.exe --template weapons | Out-File -Encoding utf8 batch.json

# 2. Fill it in (copy the entry as many times as you need), then check it
.\target\release\gta6-hq.exe --import batch.json --dry-run | Out-Host

# 3. Add it
.\target\release\gta6-hq.exe --import batch.json | Out-Host

# 4. Check everything, then refresh the app (F5, or restart it)
.\target\release\gta6-hq.exe --validate | Out-Host
```

`| Out-Host` matters in PowerShell: the release program has no console window, so without it the output is not shown and `$LASTEXITCODE` is not set. `cargo run -- --import batch.json` needs no pipe. The app does not need a rebuild or a restart for new data, only a refresh. The desktop app can stay open while you import.

## Where data lives

| File | Holds |
|---|---|
| `data/wiki.json` | Settings (`game`, `sources`, `categories`, `map`) and the original entries |
| `data/wiki/<category>.json` | A list of further entries for that category. `--import` puts new entries here. `vehicles.boats.json` also counts as `vehicles`, if you want to split a big category by hand |
| `data/wiki/sources.json` | Further sources, by id. `--import` puts new sources here |
| `backups/import-<date>-<time>/` | The previous version of every file an import replaced (time in UTC) |

All of it is merged when the app loads. The app keeps the result in memory and re-reads only when a data file, or a picture folder under `images/`, changes.

## Templates

`gta6-hq --template <category>` prints one empty entry with every fact field that category declares, wrapped so the file can go straight back into `--import`. `--template <category> --csv` prints the matching CSV header row. `gta6-hq --template x` lists the valid category names.

The template starts as `"status": "draft"` and `"confidence": "unknown"`, so a half-filled entry cannot go live by accident. Before publishing, each entry needs at least:

- `slug` (a-z, 0-9, hyphens; unique in its category), `name`, `summary`
- `confidence`, and for `official` or `corroborated` at least one id in `sources`
- `verified`: the date you read the source, `YYYY-MM-DD`
- `status`: `published`, or delete the line

Leave unknown facts empty (`""`, `null` or `[]`). They are not shown. Delete `"x": null, "y": null` or leave them; `null` means no pin.

## Import

```
gta6-hq --import <file.json | file.csv> [--dry-run] [--update]
```

The whole batch is merged in memory with the current data and checked with the same rules as `--validate`. If there is one error anywhere, nothing is written and every problem is listed. Typical refusals:

| Message | Fix |
|---|---|
| `duplicate slug, this entry already exists. Use --update to replace it.` | Pick another slug, or add `--update` if you mean to replace the entry |
| `duplicate slug, listed twice in the import file` | Remove one of the two |
| `Source … is not in the sources list. [unknown-source]` | Add the source under `"sources"` in the batch, or fix the id |
| `Marked as confirmed but cites no source. [unsourced-claim]` | Add a source, or lower the confidence |
| `Fact … must be a number, but is "two". [bad-fact]` | Fix the value's type |
| `… is not a field of this category. [unknown-fact]` | Use a declared field, or declare the new field in `categories` first |
| `Related entry … does not exist. [broken-link]` | Fix the reference, or import the other entry in the same batch |

If it passes: files that will be replaced are copied to `backups/import-<date>-<time>/`, each new version is written to a temporary file and then swapped in, and the report lists what was added (`+`), replaced (`~`), which sources are new and which files changed. Warnings about the imported entries are printed but do not block.

- **New entries** go to `data/wiki/<category>.json`.
- **`--update`** replaces an existing entry as a whole (it does not merge fields) in the file where it lives. Replacing an entry that lives in `data/wiki.json` rewrites that file in standard JSON formatting: the content and key order are kept, the hand-made one-line layout is not.
- **`--dry-run`** does everything except write.
- **To undo an import**, copy the files back from its `backups/import-…` folder. Files the import created (no backup exists for them) are simply deleted.

### JSON batch

The shape `--template` prints. Several categories and new sources can go in one file:

```json
{
  "sources": {
    "rockstar-weapons": { "title": "…", "publisher": "Rockstar Games", "url": "https://…", "type": "official", "accessed": "2026-11-19" }
  },
  "weapons": [
    { "slug": "example-pistol", "name": "Example Pistol", "summary": "…", "confidence": "official",
      "sources": ["rockstar-weapons"], "verified": "2026-11-19", "facts": { "type": "Pistol" } }
  ],
  "missions": [ { "slug": "…", "name": "…", "summary": "…", "spoiler": true, "status": "draft" } ]
}
```

A plain list also works if every entry carries `"section": "<category>"`.

### CSV batch

One entry per row; the first row names the columns (get it from `--template <category> --csv`). Rules:

- `section` and `slug` columns are required.
- Lists (`sources`, `aliases`, `tags`, `related`) are separated by `;`. Paragraphs in `body` are separated by `|`.
- Facts go in `facts.<field>` columns and are typed by the category: numbers as `4`, booleans as `true`/`false`/`yes`/`no`, lists with `;`.
- `spoiler` is `true`/`false`; `x` and `y` are numbers; empty cells are left out.
- Cells with commas or line breaks go in double quotes; a quote inside is written `""`.
- CSV cannot register new sources. Add those first with a small JSON batch or in `data/wiki/sources.json`.

## Drafts

`"status": "draft"` keeps an entry out of the app, the map and search while still running every check on it. `--validate` lists each draft as a note, and the Data health panel says how many there are. To publish, change the status to `published` (or remove it) and refresh. A published entry that links to a draft gets a `link-to-draft` warning, because that link is not shown yet.

Suggested launch-day routine: import everything as drafts, read the entries against their sources, then publish in a second `--update` batch or by editing the section file.

## Spoilers

`"spoiler": true` on an entry:

- shows only its title in lists, with a "Spoiler" label; the entry page has **Reveal this entry** (lasts until the app is closed) and **Always show spoilers**;
- once any spoiler entry exists, category pages, the A–Z list and search get a **Spoilers: hidden / shown** switch, remembered on this computer;
- keeps its summary and picture out of search results, and search does not match on its hidden text (so searching for a plot word does not reveal which entries contain it);
- removes its own pin from the map.

The title, aliases and tags are always visible and searchable, so write those spoiler-free. Mark every mission that names a story event; when unsure, mark it.

## Facts

Each category's `fields` are in `data/wiki.json` under `categories`. Current sets:

| Category | Fields |
|---|---|
| characters | affiliation, occupation, home, voice_actor |
| locations | type, county, districts (list) |
| vehicles | manufacturer, model, year, class, seats (number), drivetrain, availability |
| gameplay | type, shown_in |
| activities | type, location, players |
| wildlife | species, habitat, hostile (boolean), huntable (boolean) |
| businesses | type, location, owner, purchasable (boolean), availability |
| factions | type, territory, leader, allies (list), enemies (list) |
| music | type, genre, host (list), frequency, artists (list), tracks (number), release_date |
| weapons | type, ammo, manufacturer, slot, availability |
| missions | giver, location, reward, protagonist, chapter, order (number), type, unlocks (list) |
| collectibles | type, region, total (number), reward |

To add a field, add `{ "key": "top_speed", "label": "Top speed", "type": "text" }` to the category's `fields`. No code change. Types: `text`, `number`, `boolean`, `list`, `entry`.

## Map pins

- Give any entry `"x"` and `"y"` (0 to 1, from the top-left of the map) and it becomes a pin that opens the entry. **Right-click the map** to read off the position under the cursor in exactly that form.
- The pin is drawn in the pin type named by `"pin"`, or the entry's own category if `pin` is left out. Pin types (label, colour, zoom) are declared in `map.categories` in `data/wiki.json`; `businesses`, `collectibles`, `missions` and `poi` are already declared and appear in the sidebar as soon as something uses them. An undeclared type still works, with a default colour.
- Pin positions are community research: use `"confidence": "community"` unless Rockstar publishes a map.
- Pins without an entry of their own still go in `map.markers`.
- `#/map?focus=collectibles/<slug>` opens the map on an entry's pin; entry pages with a pin get a "View on the map" button.

## Pictures

Unchanged: save a picture as `images/<category>/<slug>.jpg` (or png/webp) and the entry picks it up on refresh. The media rules in `EDITORIAL_POLICY.md` still apply, and nothing in this tooling downloads or imports media.

## What was tested, and how far

On a throw-away copy of the app with 2,395 entries (1,500 vehicles, 300 weapons, 120 missions, 400 collectibles; generated test data, never written to this folder):

| Check | Result |
|---|---|
| `/api/wiki` (710 KB) | 38 ms on first load, about 3 ms afterwards (served from memory) |
| `/api/search?q=test+vehicle` (1,500 matches) | 3 ms |
| Vehicles page | 60 cards at a time; all 1,508 rendered in 0.4 s after 25 "show more" clicks; filter and sort respond as you type |
| A–Z | 200 rows at a time; letter links render as far as needed |
| Map | 463 pins, sidebar filter and counts, 40 listed per type with "Show all" |
| Narrow window (375 px) | No sideways overflow on Encyclopedia, Search, Map, Vehicles |

Not tested beyond that: more than about 2,400 entries, more than about 460 pins, and the desktop window itself (the checks above ran against the server in a browser pane).

## What is still missing

Tooling:

1. **No in-app editor.** Everything is files and the command line.
2. **No delete, rename or merge.** `--import` adds and (with `--update`) replaces whole entries. Removing or renaming an entry is a hand edit, and old links to a renamed slug break (the validator reports them).
3. **CSV is basic**: no new sources, one separator convention, no Excel-specific handling beyond the byte-order mark.
4. **Console output of the release build** needs `| Out-Host` in PowerShell (see the top of this page).
5. **No media import.** Pictures are still placed by hand and every media file still has unconfirmed rights.
6. **Backups are per import, not versioned.** The folder is not a git repository; consider making it one before launch day.

App:

7. **Spoilers hide text, not titles.** Titles, aliases and tags of spoiler entries are visible and searchable. Discord Rich Presence also shows the title of the page being read. Pictures of spoiler entries are hidden in the app but still served if someone types their address.
8. **Drafts are hidden from the app, not secret.** They are in the data files, and the Data health panel lists warnings about them by slug.
9. **Map pins are not clustered.** A few hundred are fine; several thousand have not been tried.
10. **Search has no typo tolerance or highlighting.** It matches whole words and word beginnings only.
11. **Jumping to a late letter in A–Z** renders every row before it.
12. **The app loads the wiki once at start.** New data needs a refresh (F5) or a restart of the window.

Content (as of 2026-11-12):

13. **Missions and Collectibles are empty**, correctly: nothing sourced exists yet.
14. **Weapons** has only the three items Rockstar has named in the Ultimate Edition description. No stats.
15. **Vehicles** have names, makers and edition availability only. No seats, drivetrain, class or performance from the game itself.
16. **Radio**: six stations with genre and hosts. Rockstar's music page also credits three preview songs per station; those are not recorded. Stations for classic rock and talk radio are mentioned by Rockstar but not named.
17. **No positions** for the new Ultimate Edition shops, Watson Bay, Lake Leonida, Washington Beach or Gambit Bay: no source for their coordinates was read, so they have no pins.
18. **Most older entries** still rest on gta6-wiki.org (a secondary site) and were checked on 2026-11-11. Re-read everything against Rockstar's own pages once the game is out.
