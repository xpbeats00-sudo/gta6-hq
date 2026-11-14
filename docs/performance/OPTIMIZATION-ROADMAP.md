# What to do next for performance

Ordered by what a person using the app would gain. Each item rests on a measurement in
[REGRESSION-RESULTS.md](REGRESSION-RESULTS.md) or a finding in
[PERFORMANCE-AUDIT.md](PERFORMANCE-AUDIT.md).

## 1. Real thumbnails for the Media gallery

**Why:** scrolling the whole gallery decodes all 144 full-size pictures and peaks at about 1.2 GB.
This is the largest memory figure left, and the fixes did not touch it.
**How:** either pre-made thumbnails beside the pictures (a script like `make_posters.py`, about
480 pixels wide) or a thumbnail route in the server. The server's image library is built with PNG
support only, so the route would need JPEG and WebP decoding added.
**Check:** memory peak in the gallery run (B12) should fall well below 1 GB.

## 2. Decide how much idle motion is worth

**Why:** a page of drifting cards with the side rails moving costs about 16% of one logical CPU
while nothing is happening. Home with its video paused costs about 5%.
**How:** this is a design choice. Options: stop the drift after a minute without input; drift only
the card under the pointer; or leave it.
**Check:** idle CPU on the Encyclopedia (B03).

## 3. Measure what this audit could not

- A cold launch after a restart (B01).
- Start-up and the map with no network (B14), which would confirm the tile and update fixes.
- The map with an empty tile cache (B10).
- Search with a much larger made-up dataset (B08).
- A Field Manual page turn (the harness needs to drive the manual's own controls).

## 4. Smaller items

- `/api/media` still lists the media folders on every request (about 16 ms). Remembering the
  listing for a second or two would remove most of that.
- The countdown on Home keeps ticking while the window is hidden.
- The wiki fingerprint (13 file stats and a folder listing) is recomputed on every search request;
  at 7 ms a search this is not worth changing unless the library grows a great deal.

## Keeping it honest

Run `node scripts/perf/bench.mjs session <folder>` before and after any change that claims to be
faster, on the same machine, and compare with `python scripts/perf/summarise.py <folder>`. Do not
publish a number that was not measured this way.
