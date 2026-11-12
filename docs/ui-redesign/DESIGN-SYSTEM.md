# GTA 6 HQ design system

Everything here lives in `ui/styles.css` as CSS variables on `:root`. Change a token there and the whole app follows.

## Principles

1. The picture leads. Artwork is full-bleed or fills its tile; text sits on a fade at the bottom or underneath.
2. The canvas is near-black. Pink is an accent for one thing per view: the primary button, the active link, a hover.
3. Thin lines, square corners. One-pixel low-contrast borders; 2 px radius; pills only for buttons, chips and labels.
4. Two type voices. Wide-tracked uppercase for titles and labels; plain sentence case for reading.
5. No picture, no pretend picture. Entries without artwork are text, or a quiet "No artwork on file" panel.

## Colour

| Token | Value | Use |
|---|---|---|
| `--bg-main` | `#0b0a16` | Page background |
| `--bg-deep` | `#080713` | Footer, map sidebar, behind the hero |
| `--bg-header` | `#171426` | Header, popups |
| `--bg-panel` | `#17102a` | Panels, image placeholders |
| `--bg-panel-raised` | `#211438` | Hover on list rows |
| `--text-primary` | `#f7f3f7` | Headings and body (17.9:1 on the page background) |
| `--text-secondary` | `#b9afc7` | Supporting copy (9.4:1) |
| `--text-muted` | `#8f86a0` | Quiet metadata (5.7:1). Lightened from the plan's `#82788f` to clear 4.5:1 |
| `--accent-pink` | `#f3a0bc` | Primary button, links, active state (9.9:1) |
| `--accent-pink-strong` | `#ff6f9e` | Region pins |
| `--accent-purple` | `#8b3bea` | Reserved; not currently used |
| `--accent-yellow` | `#f2c44e` | Small metadata labels only (12.0:1) |
| `--border-subtle` | `rgba(220,190,235,.16)` | Card and section lines |
| `--border-strong` | `rgba(240,205,225,.30)` | Hover and focus lines |
| `--ok` / `--info` / `--danger` | `#8fe3b4` / `#9fd4f5` / `#ff8d8d` | Confidence labels (always with a word, never colour alone) |

Announcement bar: `#f1c9d6` with `#2a1524` text (11.4:1). Primary button text: `#1c0f1a` on pink (9.3:1).

## Type

| Role | Family | Style |
|---|---|---|
| Display (`--font-display`) | Bahnschrift, then DIN Alternate, Franklin Gothic Medium, Arial Narrow, Helvetica Neue, Arial | 700, uppercase, letter spacing 0.10–0.14em |
| Labels | Same family, `font-stretch: 85%` | 700, 0.62–0.74rem, letter spacing 0.14–0.24em |
| Body (`--font-body`) | Segoe UI, then Helvetica Neue, Arial | 400, 16px / 1.6, sentence case |
| Numerals | Display family | `tabular-nums` |

Bahnschrift ships with Windows 10 and 11, so nothing is downloaded or bundled. The display face is never used for paragraphs.

| Element | Size |
|---|---|
| `h1` | `clamp(1.9rem, 4vw, 3.4rem)` |
| `h2` | `clamp(1.35rem, 2.4vw, 2rem)` |
| `h3` | `1.05rem` |
| Lede | `1.25rem` |
| Body | `1rem` |

## Space, shape, motion

- Spacing scale `--s1`…`--s9`: 4, 8, 12, 16, 24, 32, 48, 64, 96 px.
- `--gutter`: `clamp(16px, 5vw, 72px)` side margin. `--content`: 1320 px maximum width.
- `--radius`: 2 px. `--pill`: 999 px.
- `--ease`: 0.2 s for colour and border changes; 0.6 s for the 3% image zoom on hover.
- `prefers-reduced-motion` turns off all transitions. The hero video still plays (owner's choice) and has a pause button.

## Components

| Component | Where | Notes |
|---|---|---|
| AnnouncementBar | `#announce` | Pale pink strip. Text is built from the release date and platforms in `data/wiki.json` ("Coming …" before, "Out now" after), or `game.announcement` if set. Dismissible for the session |
| AppHeader | `.topbar` | 56 px, near-opaque, bottom line. Quiet uppercase links; the active one gets a 2 px pink underline. Collapses to a menu button at 1040 px |
| SearchControl | `.nav-search` | An icon that opens into a field on focus |
| HeroSection | `.hero` | Full-bleed video or poster, fade to the page colour at the bottom, content bottom-left, pause button, scroll cue |
| Countdown | `.countdown` | Large tabular numerals separated by thin rules; hidden if the date is unusable |
| FactStrip | `.facts` | One slim row with vertical separators; wraps to two columns when narrow |
| EditorialSection | `.editorial` | Label, title, one-line description, link at the right, then a layout |
| FeatureTile | `.card` | Image with name on a fade; summary and confidence label beneath |
| CharacterFeatureCard | `.card` in `.cast` / `.grid-portrait` | 3:4 portrait |
| Note | `.note` | Text-only entry for categories with no artwork |
| Roster | `.roster` | List rows with name, role and arrow |
| MediaTile | `.tile` | 16:9, play mark on videos, title on a fade |
| Footer | `.footer` | "GTA 6 HQ — Unofficial Fan Encyclopedia" and the disclaimer |
| ListTools | `.list-tools`, `.list-more` | Filter box, sort menu, count and a "show more" button for long lists. Appears once a list has more than 12 entries. Pill fields on `--bg-deep`, same look as the chips |
| Toggle | `.toggle` | A chip-style on/off button (the spoiler switch). Pink outline when on |
| FactTable | `.fact-table` | Label and value rows under an entry's text; labels in the yellow metadata style, thin rules between rows |
| SpoilerGate | `.spoiler-gate`, `.conf-spoiler` | A panel that replaces a closed spoiler entry's text, with "Reveal" as the primary button; the "Spoiler" label uses the confidence-label shape in pink |
| MapFilter | `.map-filter`, `.map-n`, `.map-more` | Filter box, per-type counts and "Show all" in the map sidebar. Pin colours come from `map.categories` in the data and must be colour tokens or hex values |

Layouts: `.cast` (two portraits and a roster), `.feature` (large image and a roster), `.trio` (one wide and two standard tiles), `.grid-feature` (first two or three tiles large, the rest smaller), `.grid-notes`, `.index` (numbered topic list).

## Breakpoints

| Width | Change |
|---|---|
| 1280 px and below | Tighter navigation spacing |
| 1040 px and below | Menu button; one-column profile, location and Intel; fact strip in two columns |
| 700 px and below | Single-column grids; map list above the map; timeline stacks |

## Do and do not

- Do add new colours as tokens first.
- Do not add gradients as panel backgrounds, glows around cards, or drop shadows (the map popup is the one exception, to lift it off the map).
- Do not use initials, generated scenery or stock art to stand in for missing artwork.
