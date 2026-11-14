# GTA 6 HQ: performance audit

**Date:** 14 November 2026
**Build audited:** release build of the working tree on top of commit `aa2fc3e` (0.2.20), which became 0.2.21
**Plan followed:** [docs/audits/GTA-6-HQ-Performance-Audit-and-Benchmark-Plan.md](../audits/GTA-6-HQ-Performance-Audit-and-Benchmark-Plan.md)
**Machine and method:** [BENCHMARK-BASELINE.md](BENCHMARK-BASELINE.md)

This is the source-level and runtime audit the plan asked for. Every number here was measured on
the real desktop executable on the machine described in the baseline document. Findings that were
read from the code but not measured say so.

## Summary

The app was not slow before this audit: it opens its window in about half a second, searches in
7 ms and shuts down cleanly. The audit found seven things worth fixing, fixed them, and measured
again. The largest effects are steadier page changes (95th percentile 651 ms to 229 ms), lower peak
memory while browsing (1,580 MB to 1,006 MB) and a cheaper integrity report (207 ms to 39 ms).

Three things were looked at and left alone, with reasons, at the end.

## Findings

Severity is about what a person using the app would notice.

### F1. The integrity report re-read every picture and video on each Encyclopedia visit: fixed

- **Severity:** medium.
- **Where:** `ui/app.js` (`renderWiki` asks `/api/health` on every render) calls `validate::validate`,
  which calls `media::duplicates`, which hashed every file under `images/` and `wallpapers/`
  with `media::sha256`.
- **Evidence:** 207 ms median per request with the files already in the operating system's cache
  (15 requests). The media library is about 180 MB, so a first visit after start reads all of it
  from disk.
- **Fix:** `media::sha256` remembers each file's hash with its size and modified time and reads the
  file again only when either changes.
- **After:** 39 ms median.
- **Risk:** a file changed without its size or modified time changing would keep its old hash until
  restart. That affects only the duplicate-file warning.

### F2. The Media page asked every video for its opening frames: fixed

- **Severity:** medium.
- **Where:** `ui/app.js` `renderMedia`, and the three-tile strip on Home: each wallpaper was a
  `<video preload="metadata">` seeked to four seconds, so opening the page started a decoder for
  every wallpaper (41 at the time).
- **Evidence:** GPU video-decode engines averaged 25.4% while the gallery was open, and 26.4% during
  the navigation run, which passes through Home and Media.
- **Fix:** `scripts/make_posters.py` makes a still for each wallpaper in `wallpapers/posters/`. The
  server reports the poster where one exists (`media::scan`), and the page then uses
  `preload="none"` with the poster, so a video is fetched only when it is played. A wallpaper
  without a poster behaves as before.
- **After:** video decode 3.3% in the gallery and 1.3% during navigation; CPU during navigation
  78.6% to 40.3% of one logical CPU; peak memory during navigation 1,580 MB to 1,006 MB.

### F3. The Home wallpaper played where nobody could see it: fixed

- **Severity:** medium.
- **Where:** `ui/app.js` `renderHome`. The hero video had `autoplay` and the second layer
  `preload="auto"`, and Home is drawn as soon as the data arrives, which is underneath the intro.
  So one wallpaper played and a second loaded behind the intro's own two clips. Nothing paused the
  wallpaper when Home was scrolled past it. A timer could also load one more clip after the page
  had been left.
- **Evidence:** read from the code. The intro period was not measured separately.
- **Fix:** the wallpaper starts when the intro ends (`app-arrived` event), pauses when less than 2%
  of the hero is in view and resumes when it returns, and loads nothing once its page is gone.
- **After:** peak memory in the five-minute Home run 531 MB to 447 MB. CPU while the wallpaper is
  visible is unchanged (13.9% to 13.1%), as expected: it is still decoding a video.

### F4. Drifting pictures animated while off screen: fixed

- **Severity:** low to medium.
- **Where:** `ui/styles.css` gives every card picture a slow `drift` animation; a long page ran all
  of them all the time.
- **Evidence:** sitting idle on the Encyclopedia cost 16.0% of one logical CPU, more than Home with
  its video paused (4.7%).
- **Fix:** `watchDrift` in `ui/app.js` rests the animation of any picture that is off screen.
- **After:** 15.6%. **This fix did not move the number**: the cost is the pictures that are on
  screen, plus the moving side rails. See "Left alone" below.

### F5. The media catalogue was rebuilt, on a server thread, for every Home and Media visit: fixed in part

- **Severity:** low.
- **Where:** `src/server.rs` `media_catalogue` called `media::scan` directly on an async thread;
  `manual` read and parsed `data/manual.json` the same way.
- **Evidence:** 16 ms median per `/api/media` request.
- **Fix:** both now run off the async threads, and the catalogue's JSON is kept until the manifest
  or the list of files changes (`media::catalogue_json`).
- **After:** 15.7 ms. **No measurable gain**: nearly all of the time is listing the folders, which
  is still done on every request to notice new files. The gain is only that a slow disk can no
  longer hold up other requests.

### F6. A map tile that failed was asked for again at once: fixed

- **Severity:** low online, noticeable offline.
- **Where:** `src/tiles.rs` `get`: no memory of failures, so with no connection every tile waited
  out the 15-second timeout again each time the map was opened or moved.
- **Evidence:** read from the code. Not measured: the plan's offline run (B14) needs the network
  switched off, which this audit did not do.
- **Fix:** a tile that could not be fetched is not asked for again for 60 seconds.

### F7. A failed update check was repeated every time the window came back: fixed

- **Severity:** low.
- **Where:** `src/update.rs` `status` remembered successes for 30 minutes but not failures, and
  since 0.2.18 the page asks again whenever the window is shown.
- **Evidence:** read from the code; not measured.
- **Fix:** a failed check stands for 5 minutes.

### F8. Scrolling read the layout on every scroll event: fixed

- **Severity:** low.
- **Where:** `ui/app.js` `markPastHero` ran on each `scroll` event.
- **Fix:** it now runs at most once a frame.

## Checked and found sound

| Area | What the code does |
|---|---|
| Search | Input is debounced, stale answers are dropped, results are capped at 50 a page and 200 on the server. 6 to 8 ms per request. |
| Wiki content and search index | Held in memory and rebuilt only when a data file changes. |
| Image viewer | Its listeners are attached once; closing it empties the stage. |
| Discord presence | One thread, retries every 15 s only while disconnected. |
| Start-up | Nothing slow happens before the window is created. |
| Shutdown | All 8 processes gone within 3 s of closing, in every one of 14 measured closes. |
| Long session | 30 minutes and 402 page visits with no growth in memory, threads, handles or page size. |

## Left alone, and why

- **Idle CPU of about 16% of one logical CPU on pages with drifting pictures and moving rails.** This
  is the cost of motion the owner asked for (cards that drift, rails that scroll). It is 16% of one
  of 24 logical CPUs. Reducing it means reducing the motion, which is a design decision, not a bug.
- **Full-size pictures as gallery thumbnails.** The Media page lazy-loads them, but scrolling the
  whole gallery decodes all 144 and peaks at about 1.2 GB of memory. Real thumbnails would fix it,
  but need either an image-decoding dependency for JPEG and WebP in the server or pre-made thumbnail
  files. Worth doing next; see the roadmap.
- **The 10.6-second intro.** It sets how long a first-time viewer waits, but it is a deliberate
  piece of the app and can be skipped (2.5 s to a usable Home when skipped).

## What was not run

| Plan item | Status |
|---|---|
| B01 cold launch after reboot | Not run: the machine was not restarted. |
| B08 search on a large synthetic dataset | Not run. |
| B10 map with an empty tile cache | Not run: the existing cache was left in place, so "first visit" is first in the session, with tiles already on disk. |
| B14 offline start-up and navigation | Not run: it needs the network switched off. |
| B09 Field Manual page turn | Not measured: the harness's key press did not turn the page. Opening the manual and the night switch were measured. |
| `cargo bench` | The repository has no benchmark targets. |
| Edge DevTools recordings | Not captured; long tasks, heap size and page size were read through the DevTools Protocol instead. |
