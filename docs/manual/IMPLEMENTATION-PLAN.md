> **HISTORICAL — SUPERSEDED BY `docs/status/CURRENT-STATE.md`.** Kept as a record; counts and statuses here are out of date. See `docs/status/REPORT-INDEX.md`.

# Field Manual: implementation plan

Date: 2026-11-11. Source brief: `docs/GTA-6-HQ-In-App-Field-Manual-and-Police-Heat-Guide.md`.

## What was inspected

- Architecture: Rust (axum server + tao/wry window), vanilla JS interface with a hash router in `ui/app.js`, content in `data/*.json`.
- No manual or guide section existed.
- The GTA IV manual reference images named in the brief are **not in the repository** and were not attached to the request. The paper layout was built from the brief's written description (off-white paper, running header over a black rule, large heading with a coloured accent word, italic serif intro, oversized numerals, dotted separators, captions, page numbers). It has not been compared against the reference spread.
- A second agent was changing the app's core files at the same time, so the manual was built in its own files and connected with a handful of lines at the end.

## Files

| File | Role |
|---|---|
| `data/manual.json` | All manual content: chapters, pages, blocks, evidence labels, sources |
| `ui/manual.js` | The reader: builds pages, cover, contents, spreads, search, page memory, keyboard |
| `ui/manual.css` | Paper and night themes, scoped under `.manual` |
| `images/manual/law-enforcement-opening.jpg` | Chapter opening picture |
| `src/server.rs` | `/api/manual` route (serves `data/manual.json`) |
| `src/validate.rs` | Checks manual source ids and evidence labels |
| `ui/index.html`, `ui/app.js` | Navigation entry, script and style tags, `#/manual` route |

## Content model

`data/manual.json` holds `sources` (id, title, publisher, author, publishedAt, url, sourceType, lastCheckedAt, notes) and `chapters`. A chapter is one of:

- **authored**: `pages`, each a list of blocks;
- **drawn from the encyclopedia**: `wiki: { section, perPage, meta }` turns sourced wiki entries into numbered manual entries, so the manual never restates them by hand;
- **in development**: `status: "in-development"` with a `note`;
- **the sources chapter**: generated from `sources`.

Block types: `heading`, `subheading`, `intro`, `paragraph`, `numbered`, `image`, `callout`, `table`, `diagram` (`stars` or `flow`), `warning`, `unknown`, `legend`, `rule`. Blocks that state a mechanic carry `evidence` and `sources`.

Evidence values: `demonstrated`, `developer-described`, `preview-reported`, `interpretation`, `unknown`, `verified-after-release`.

## Reader behaviour

- `#/manual` cover and contents; `#/manual/<chapter>/<page>` deep links; `#/manual/search?q=`.
- Page numbers are fixed by the order of the data: the cover is page 1, the first chapter page is 2. Even pages sit on the left.
- Two pages side by side at 1180 px and wider; one page below that.
- Left/Right and Page Up/Page Down turn pages, but not while a field or button has focus.
- Last page and theme are remembered in the browser's local storage.
- Sources cited on a page are footnoted at its foot.

## Phases

| Phase | Scope | State |
|---|---|---|
| A | Reader shell, cover, contents, spreads, themes, page memory | Built |
| B | Data model, evidence labels, sources, search, deep links | Built |
| C | Law Enforcement chapter (10 pages) | Written from four sources read on 2026-11-11 |
| D | Print styling | Built from the written description |
| E | Verification | See `QA-REPORT.md` |
