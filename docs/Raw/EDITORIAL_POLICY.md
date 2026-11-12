# Editorial and media policy

GTA 6 HQ is an unofficial fan project. These rules decide what goes into `data/wiki.json`, the section files in `data/wiki/` and `data/media.json`.

## Confidence labels

Every entry has a `confidence`. The app shows it as a badge.

| Label | Use it when | Needs a source |
|---|---|---|
| `official` | Rockstar Games states it on a page you read yourself | Yes, the Rockstar page |
| `corroborated` | A secondary source reports it and cites or quotes official material | Yes |
| `community` | Community research, such as pin positions on the fan-made map | Yes |
| `rumor` | Unconfirmed. Left out of search unless asked for | If one exists |
| `unknown` | Nothing has been checked yet. Shown as "Unverified" | No |

Rules:

1. Never write a fact from memory. Read the source first, then write the entry in your own words.
2. `official` and `corroborated` entries without a source are an error and fail validation.
3. Footage is not a feature list. Something seen in a trailer is `corroborated` at most, and the text should say it was shown, not promised.
4. Do not carry features over from earlier games.
5. Do not invent names. Vehicles, weapons, missions and animals are listed only when a source names or clearly shows them.
6. An empty category says "Not yet documented". That is the correct state until there is evidence.
7. Set `verified` to the date you last read the source, written `YYYY-MM-DD`. Re-check entries when Rockstar publishes something new.
8. Fill in a fact only when the source states it. An unknown fact is left out (or `null`), never guessed. A vehicle seen once in a trailer has a name at most, not a seat count.
9. An entry that mixes sources takes the label of its weakest claim. If the name is from Rockstar but the description is from a fan site, it is `corroborated`.
10. Anything that gives away the story (missions, endings, deaths, late-game unlocks) is marked `"spoiler": true`. When in doubt, mark it.
11. Work in progress is `"status": "draft"`. A draft is checked like any other entry but is not shown or searchable until the status is `published` or removed.

## Entry fields (schema 2)

```json
{
  "slug": "url-safe-id", "name": "Title", "summary": "One or two sentences.",
  "body": ["Optional paragraphs."],
  "confidence": "corroborated", "sources": ["source-id"], "verified": "2026-11-11",
  "related": ["locations/vice-city"], "aliases": ["Other name"], "tags": ["keyword"],
  "status": "published", "spoiler": false,
  "facts": { "manufacturer": "Vapid", "seats": 2 },
  "x": 0.52, "y": 0.47, "pin": "collectibles"
}
```

| Field | Meaning |
|---|---|
| `status` | `draft` or `published`. Left out means published. Drafts are validated but hidden from the app and search |
| `spoiler` | `true` closes the entry behind a "Reveal" button, keeps its text and picture out of lists, the map and search results, and stops search matching on its text. The title, aliases and tags stay visible, so keep spoilers out of those |
| `facts` | Values for the fields the entry's category declares. Unknown field names and wrong types fail validation |
| `x`, `y` | Position on the map, each from 0 to 1. The entry then appears as a pin that links to it |
| `pin` | Which pin category the pin is drawn in (see `map.categories`). Left out, the entry's own category is used |

Sources live once in the top-level `sources` object (`title`, `publisher`, `url`, `type`, `accessed`) and are referred to by id. Categories are declared in `categories`; adding one there adds it to the encyclopedia, search and validation with no code change.

### Fact fields

A category lists the facts its entries may carry:

```json
{ "key": "weapons", "label": "Weapons", "blurb": "…", "art": "mountain",
  "fields": [
    { "key": "type", "label": "Type", "type": "text" },
    { "key": "ammo", "label": "Ammunition", "type": "text" }
  ] }
```

Field keys use `a-z`, `0-9` and `_`. Types: `text`, `number`, `boolean`, `list` (a list of text values) and `entry` (a reference such as `"locations/vice-city"`, shown as a link). `null`, empty text and an empty list all mean "not known" and are not shown. The entry page shows the known facts as a table, in the order the category declares them; fact text is searchable.

### Where entries live

`data/wiki.json` holds the settings (`game`, `sources`, `categories`, `map`) and the original entries. `data/wiki/<category>.json` is a list of further entries for that category, and `data/wiki/sources.json` an object of further sources; both are merged in when the app loads. A slug must be unique within its category across all files, and a source id across both source lists.

### Map pins

`map.categories` lists the pin types: `key`, `label`, `color` (a colour token from the design system such as `accent-yellow`, or a `#hex` value) and optionally `zoom` (how far the map zooms in when a pin is picked). A pin type that nothing uses is not shown. Hand-placed pins without an entry of their own still go in `map.markers`.

## Media

Every file in `images/` and `wallpapers/` should have a record in `data/media.json`: title, alt text, creator, source, licence, `rights_status` (`approved`, `permission_required`, `unknown`, `rejected`) and `approval_status` (`staged`, `approved`, `rejected`).

1. Being able to view something online does not make it free to copy. If the licence is unclear, link to it instead.
2. New files go into `staging/` first. Nothing there is shown. Move a file into `images/` or `wallpapers/` and add its record once you know where it came from and that you may use it.
3. Only `approved` records are shown, and the rights status is displayed with each item. `rejected` items are hidden.
4. A file with no record is shown as "Not reviewed" and flagged by the validator.
5. Keep credits and watermarks. Do not add soundtrack audio.
6. If a rights holder asks for something to be removed, set `rights_status` to `rejected` (it disappears at once) and then delete the file.

## Checking

```bash
cargo run -- --validate
```

Prints the integrity report and exits with code 1 if there are errors. The same report is on the Encyclopedia page under "Data health".

`gta6-hq --import <file>` applies the same wiki checks to a batch before writing anything, and refuses the whole batch if there is a single error. See `docs/LAUNCH-READINESS.md`.
