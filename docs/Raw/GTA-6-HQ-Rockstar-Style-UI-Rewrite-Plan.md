# GTA 6 HQ --- Rockstar-Inspired UI Rewrite Master Plan

> **Purpose:** Rewrite the existing GTA 6 HQ desktop application's
> visual interface so it closely follows the layout language,
> typography, color system, spacing, borders, image presentation, and
> cinematic atmosphere of the official Grand Theft Auto VI website:
> https://www.rockstargames.com/VI
>
> **Project type:** Unofficial fan-made encyclopedia / desktop
> companion.\
> **Implementation constraint:** Preserve the existing Rust desktop
> application, embedded web UI, data, navigation destinations, search,
> map, media, and working functionality. This is a UI/UX overhaul, not
> permission to discard or replace the application architecture.

------------------------------------------------------------------------

## 1. Design target

Use the two supplied screenshots as the primary visual comparison:

-   **Reference screenshot:** official Rockstar GTA VI website in a
    browser.
-   **Current screenshot:** GTA 6 HQ desktop application, showing its
    current navigation, countdown, facts strip, and character cards.

The target is to make GTA 6 HQ feel like it belongs to the same visual
family as the official website: cinematic, restrained, image-led,
premium, and editorial.

### Important distinction

Recreate the *design language and layout patterns*, not Rockstar's
proprietary source code, exact logo artwork, or website assets. Do not
make the app appear to be an official Rockstar product. Keep a discreet
but clear fan-project identity such as **GTA 6 HQ --- Unofficial Fan
Encyclopedia** in About/footer metadata. Use artwork only when the
project has the right to use it; prefer locally managed assets with
source and permission metadata.

### Design priorities, in order

1.  Cinematic hero artwork and full-bleed media presentation.
2.  Minimal, elegant top navigation.
3.  Near-black / deep navy backgrounds with restrained pink and
    warm-white accents.
4.  Rockstar-like display typography hierarchy and compact uppercase
    labels.
5.  Thin, low-contrast borders and carefully controlled card treatments.
6.  Large editorial content sections with strong imagery and generous
    negative space.
7.  Consistent responsive behavior inside the desktop WebView.

------------------------------------------------------------------------

## 2. Audit before changing anything

Do not begin by replacing files blindly.

1.  Inspect the complete repository and identify:
    -   Rust entry point and desktop window configuration.
    -   WebView / Wry or Tao integration.
    -   HTML entry point and all CSS/JS files.
    -   Existing routing/navigation implementation.
    -   Data files and schemas for characters, locations, vehicles,
        facts, media, and map.
    -   Local image/video assets and their dimensions.
    -   Existing splash screen, wallpaper, countdown, search, map, and
        media interactions.
    -   Build scripts, dependencies, tests, and packaging process.
2.  Record the current working state and run the existing build and
    tests before edits.
3.  Take screenshots of every current page at the same viewport size.
4.  Create a route/feature inventory. Every existing page and feature
    must be accounted for in the new UI.
5.  Identify whether the current screenshot's content is driven by data
    or hard-coded markup. Preserve data-driven rendering wherever
    possible.
6.  Make a safe branch or backup before major refactoring.
7.  Do not claim that a feature works merely because its markup exists.
    Test it.

**Deliverable:** `docs/ui-redesign/BASELINE-AUDIT.md`, containing
repository structure, current UI inventory, baseline screenshots,
commands run, test results, and risks.

------------------------------------------------------------------------

## 3. Visual system

The following values are **starting estimates sampled by eye from the
supplied reference screenshot**, not official Rockstar design tokens.
Centralize them as CSS variables and tune them against the live
reference.

### 3.1 Color palette

  ---------------------------------------------------------------------------
  Token                                  Starting value Usage
  ------------------------ ---------------------------- ---------------------
  `--bg-main`                                 `#0B0A16` Main page background

  `--bg-deep`                                 `#080713` Hero lower fade /
                                                        footer

  `--bg-header`                               `#171426` Navigation and top
                                                        chrome

  `--bg-panel`                                `#17102A` Subtle content
                                                        surfaces

  `--bg-panel-raised`                         `#211438` Hover/raised card
                                                        surface

  `--text-primary`                            `#F7F3F7` Main headings and
                                                        body

  `--text-secondary`                          `#B9AFC7` Supporting copy

  `--text-muted`                              `#82788F` Metadata and quiet
                                                        labels

  `--accent-pink`                             `#F3A0BC` Primary CTA /
                                                        selected accent

  `--accent-pink-strong`                      `#FF6F9E` Hover and active
                                                        accent

  `--accent-purple`                           `#8B3BEA` Limited gradient
                                                        accent

  `--accent-yellow`                           `#F2C44E` Small metadata labels
                                                        only

  `--border-subtle`          `rgba(220, 190, 235, .16)` Card and section
                                                        borders

  `--border-strong`          `rgba(240, 205, 225, .30)` Focus / active
                                                        outlines
  ---------------------------------------------------------------------------

Rules: - Keep the overall canvas dark. Do not use large purple gradient
panels as the default background. - Pink should be an accent, not a
page-wide glow. - Avoid neon outlines around every card. - Avoid strong
drop shadows except where needed to separate overlays from artwork. -
Use gradients mainly for hero image readability, image overlays, and
occasional CTA treatments.

### 3.2 Typography

The current app uses a highly condensed, game-like style almost
everywhere. Move to a more editorial hierarchy:

-   **Display headings:** bold condensed or tightly tracked uppercase
    display face, used sparingly for section titles.
-   **Navigation:** compact uppercase sans-serif, medium/semi-bold, with
    moderate letter spacing.
-   **Body:** clean, highly legible sans-serif with normal sentence
    case.
-   **Metadata:** small uppercase labels with increased letter spacing.
-   **Numbers/countdown:** large bold numerals with consistent tabular
    widths.

Inspect the official site in browser developer tools where possible to
identify available font families and weights. If the exact font is not
licensed or cannot be obtained legitimately, choose a close locally
bundled alternative. Do not hotlink or scrape proprietary font files.
Provide a sensible system fallback stack.

Suggested CSS fallback concept:

``` css
font-family: "Arial Narrow", "Roboto Condensed", "Helvetica Neue", sans-serif;
```

Use a separate readable body stack, for example:

``` css
font-family: "Helvetica Neue", Arial, sans-serif;
```

Do not use the condensed display font for long paragraphs.

### 3.3 Borders, radii, and surfaces

-   Prefer square or subtly rounded corners over the current heavily
    rounded dashboard-card look.
-   Use thin 1px borders with low opacity.
-   Use image crops as the main card visual; avoid large empty gradient
    placeholders.
-   Use subtle background shifts to distinguish sections.
-   Keep buttons compact and confident, with pill-shaped styling only
    where it matches the reference CTA.
-   Establish consistent spacing tokens: 4 / 8 / 12 / 16 / 24 / 32 / 48
    / 64 / 96 px.

------------------------------------------------------------------------

## 4. Application shell and navigation

### Current problem

The existing header is a dense row of bright tabs (HOME, ENCYCLOPEDIA,
CHARACTERS, LOCATIONS, VEHICLES, MAP, MEDIA, INTEL) with a prominent
search capsule. It reads like a generic web dashboard rather than the
Rockstar site.

### Target

Create a restrained top navigation system inspired by the official
site's minimal header:

-   Dark, nearly opaque header with a subtle bottom border.
-   Compact project mark at the left; use the existing GTA 6 HQ
    identity, not a copied Rockstar logo.
-   Primary destinations presented as quiet uppercase links.
-   Active page indicated by a thin pink underline or subtle text/accent
    treatment, not a large gradient pill.
-   Search remains available but visually quiet; use a small icon/field
    that expands or gains focus when selected.
-   A compact menu button may collapse secondary navigation if the
    desktop viewport is narrow.
-   Keep the native Windows title bar unless the project already has a
    tested custom title-bar implementation. Do not sacrifice window
    controls or accessibility for visual imitation.
-   Header height should be compact and consistent; avoid consuming
    excessive hero space.

Navigation must continue to work with mouse, keyboard, and screen
readers. Provide visible focus states.

------------------------------------------------------------------------

## 5. Home page rewrite

The Home page is the most important visual change. Rebuild it as a
cinematic, vertically scrolling landing page rather than a dashboard of
widgets.

### 5.1 Top promotional strip

Add a slim horizontal announcement strip above the main header or
immediately below the native window frame.

-   Pale pink / muted rose background.
-   Small uppercase announcement text, centered.
-   Optional subtle decorative palm/leaf silhouette pattern if created
    from original project artwork or properly licensed assets.
-   Make the strip configurable and dismissible if it contains
    time-sensitive announcements.
-   Do not hard-code a false pre-load or release status.

### 5.2 Hero section

Replace the short cropped wallpaper area with a large hero composition.

-   Use a high-resolution locally stored hero image or approved artwork.
-   Aim for a wide cinematic crop (16:9 or wider); preserve focal
    subjects.
-   The image should occupy most of the initial viewport.
-   Apply a dark gradient at the bottom and, only if necessary, behind
    text.
-   Place the countdown and primary actions in a quiet overlay area,
    preferably bottom-left or lower-left.
-   Primary action: **Explore the Map**.
-   Secondary action: **Open the Encyclopedia**.
-   Use the same pink / warm-white visual language as the reference.
-   Avoid placing cards, panels, or metadata tables over the most
    important part of the image.
-   Add a restrained scroll cue at the bottom center.
-   Hero motion is optional. If using video, support pause/mute, reduced
    motion, local playback, and a static fallback. Do not autoplay
    audio.

### 5.3 Countdown

-   Retain the existing release countdown functionality.
-   Use large, clean numerals in small separated blocks or a typographic
    inline layout.
-   Avoid oversized bright dashboard tiles.
-   Keep labels small and uppercase.
-   Use a single authoritative release-date setting in the data/config
    layer.
-   Correctly handle the target date, timezone, expired countdown, and
    invalid configuration.
-   Do not display stale hard-coded countdown values.

### 5.4 Key facts strip

The current six-column fact table should become a slim editorial
metadata strip below the hero.

Fields may include: - Release date - Platforms - Developer - Setting -
Protagonists - Price (only if verified and kept current)

Design: - Dark transparent surface. - Thin border and subtle vertical
separators. - Compact uppercase yellow or muted accent labels. - Larger
warm-white values. - Responsive wrapping/stacking on smaller widths. -
Do not let this strip dominate the page.

### 5.5 Home page editorial sections

Create large, image-led sections in the style of the reference website.
Each section should have a clear title, a short description, a visual
lead image, and a simple action link.

Recommended order: 1. **The Cast** --- featured character cards with
real available artwork. 2. **Vice City and Beyond** --- location/region
feature with a large map or location image. 3. **Vehicles** ---
cinematic image tiles, not generic icon cards. 4. **Trailers and Media**
--- video thumbnails with clear play affordance. 5. **Intel / Latest
Updates** --- concise verified facts, timeline, and project news.

Use asymmetric image grids where appropriate. Avoid making every section
look like the same row of four dashboard cards.

------------------------------------------------------------------------

## 6. Page-by-page visual redesign

### 6.1 Encyclopedia

-   Present a clean editorial index with large topic tiles.
-   Use image-led categories for Characters, Locations, Vehicles, Media,
    and other supported topics.
-   Keep search/filter tools compact and functional.
-   Use clear source/confidence labels for uncertain or
    community-sourced information.
-   Preserve existing encyclopedia data and links.

### 6.2 Characters

-   Replace the current uniform card wall with a featured character
    layout.
-   Use portrait artwork as the dominant visual.
-   Character detail pages should have a large hero/portrait area, name,
    role, concise intro, and structured information below.
-   Use consistent image aspect ratios and `object-fit` rules.
-   Avoid fabricated initials or generic gradient placeholders where
    actual artwork is missing. Instead, show a designed
    unavailable-artwork state that fits the palette.
-   Keep source and confidence metadata legible but unobtrusive.

### 6.3 Locations

-   Treat each region as an editorial destination.
-   Use large landscape imagery, region title, short summary, and a
    route to the map.
-   Keep region descriptions and map references driven by existing data.
-   Preserve the current six-region data if those records are present;
    do not invent additional confirmed locations.

### 6.4 Vehicles

-   Use a gallery of image-led vehicle entries.
-   Distinguish confirmed identity from descriptive placeholder labels.
-   Do not invent official vehicle model names.
-   Vehicle detail pages should use a large image, category, known
    details, and confidence/source metadata.

### 6.5 Map

-   Preserve the existing Leaflet map, map tile cache, pins, and
    interaction logic.
-   Redesign the surrounding map page only: dark frame, restrained
    toolbar, clean search/filter controls, and elegant detail panel.
-   Do not obscure map labels or attribution.
-   Keep provider attribution visible and comply with tile provider
    terms.
-   Make selected pins and hover states use the new accent palette.
-   Ensure the map remains usable at common desktop sizes.

### 6.6 Media

-   Make this page a cinematic gallery.
-   Large video/image thumbnails with consistent crops.
-   Hover effects should be subtle; do not force video playback if it
    causes performance or focus issues.
-   Clicking an item should open a detail/lightbox/player view with
    keyboard close and focus management.
-   Preserve existing local media paths and playback behavior.
-   Show source/rights metadata where appropriate.
-   Do not assume that official website assets may be downloaded,
    redistributed, or rehosted.

### 6.7 Intel / Search

-   Keep search fast and accessible.
-   Style search results as a restrained list with category labels and
    clear matching text.
-   Use a compact filter bar.
-   Preserve keyboard navigation, empty states, and no-results states.
-   Avoid turning search into a decorative panel that is hard to use.

------------------------------------------------------------------------

## 7. Interaction and motion language

Use motion to add polish, not distraction.

-   Short opacity/transform transitions for navigation and cards.
-   Gentle image zoom on hover (small scale only).
-   Soft underline or color transitions for links.
-   Smooth scroll only where it does not interfere with keyboard
    navigation.
-   Respect `prefers-reduced-motion`.
-   Avoid continuous parallax, flashing, large pulsing glows, or
    unnecessary particle effects.
-   Never animate large areas in a way that reduces text legibility.
-   Provide clear hover, active, focus, disabled, and loading states.

------------------------------------------------------------------------

## 8. Asset and media rules

1.  Inventory every existing asset before replacing or moving it.
2.  Prefer local assets for reliability and offline use.
3.  Store asset metadata: filename, dimensions, source URL,
    creator/owner, license or permission basis, attribution requirement,
    and intended use.
4.  Do not scrape the Rockstar website or extract proprietary
    assets/fonts without permission.
5.  Do not hotlink remote artwork as the only source for core UI
    imagery.
6.  Generate responsive image sizes or use appropriate
    `srcset`/equivalent if supported.
7.  Use modern formats only where the current WebView supports them;
    retain safe fallbacks.
8.  Compress large images and videos without visibly damaging quality.
9.  Ensure thumbnails are not stretched or pixelated.
10. Keep an explicit placeholder state for missing artwork.

Create `docs/ui-redesign/ASSET-INVENTORY.md` and record all new assets
and their provenance.

------------------------------------------------------------------------

## 9. Technical implementation requirements

-   Preserve the current Rust desktop shell and its existing integration
    unless the audit proves a change is necessary.
-   Do not migrate frameworks or replace the UI stack merely to achieve
    the visual target.
-   Keep content and metadata separate from presentation.
-   Centralize colors, typography, spacing, borders, and transitions in
    design tokens.
-   Prefer reusable components:
    -   `AppHeader`
    -   `AnnouncementBar`
    -   `HeroSection`
    -   `Countdown`
    -   `FactStrip`
    -   `EditorialSection`
    -   `FeatureTile`
    -   `CharacterFeatureCard`
    -   `MediaTile`
    -   `SearchControl`
    -   `Footer`
-   Use CSS Grid/Flexbox and responsive sizing rather than fixed pixel
    positioning.
-   Avoid global CSS selectors that unintentionally break the map,
    modal, or media player.
-   Keep all navigation routes and deep links working.
-   Preserve local data files and schemas. If schema changes are
    required, provide migration/backward-compatibility handling.
-   Avoid adding dependencies unless they solve a real problem.
-   Keep startup time and memory use reasonable for a desktop app.
-   Ensure the app still works when offline wherever current features
    are designed to work offline.

------------------------------------------------------------------------

## 10. Responsive layout targets

Even though this is a desktop app, the WebView can be resized. Support:

-   1920×1080
-   1600×900
-   1366×768
-   1280×720
-   Narrow/resized window around 900 px wide

At large widths: - Wide hero image. - Centered content container with
generous side margins. - Editorial grids with asymmetric spans.

At medium widths: - Reduce horizontal gaps. - Collapse multi-column fact
strips. - Reduce navigation spacing.

At narrow widths: - Collapse navigation into a menu. - Stack fact
items. - Use one-column content sections. - Keep text and controls
readable. - Avoid horizontal scrolling except inside intentionally
scrollable galleries.

------------------------------------------------------------------------

## 11. Accessibility and usability

-   Maintain readable contrast for body text and metadata.
-   Use semantic headings in a logical order.
-   Provide keyboard-operable navigation, search, gallery, map controls,
    and dialogs.
-   Give meaningful alternative text to content images.
-   Decorative images should use empty alt text.
-   Provide visible focus indicators.
-   Respect reduced-motion preferences.
-   Do not encode important information using color alone.
-   Keep buttons and interactive targets comfortably sized.
-   Ensure overlays do not trap focus incorrectly.

------------------------------------------------------------------------

## 12. Verification and acceptance criteria

The redesign is complete only when all of the following are true.

### Visual acceptance

-   [ ] The app no longer resembles a generic purple dashboard.
-   [ ] Main canvas is near-black/deep navy with restrained accent
    colors.
-   [ ] Header is compact, minimal, and visually close to the
    reference's navigation treatment.
-   [ ] Hero is cinematic, large, and image-led.
-   [ ] Countdown is integrated into the hero rather than presented as
    generic dashboard tiles.
-   [ ] Fact strip is slim and understated.
-   [ ] Section headings, labels, body text, and metadata have a clear
    typographic hierarchy.
-   [ ] Borders are thin and subtle; cards do not all have heavy rounded
    outlines.
-   [ ] Character, location, vehicle, and media sections use large
    imagery and editorial layouts.
-   [ ] No important text is obscured by artwork.
-   [ ] Screenshots at the same viewport can be compared side by side
    with the supplied reference.

### Functional acceptance

-   [ ] All existing navigation destinations still work.
-   [ ] Search works across the same data as before.
-   [ ] Countdown computes correctly from the configured date.
-   [ ] Character/location/vehicle detail pages still open.
-   [ ] Leaflet map loads, pins work, and tile cache behavior remains
    intact.
-   [ ] Map attribution remains visible.
-   [ ] Media playback/lightbox behavior still works.
-   [ ] Splash screen and app startup still work.
-   [ ] No console errors or Rust runtime errors are introduced.
-   [ ] Offline behavior is unchanged or improved.

### Quality acceptance

-   [ ] Existing Rust tests pass.
-   [ ] Add/adjust UI tests where feasible.
-   [ ] Run formatting, linting, and production build.
-   [ ] Test all target window sizes.
-   [ ] Check keyboard-only operation and reduced motion.
-   [ ] Verify all assets have recorded provenance.
-   [ ] Provide before/after screenshots.
-   [ ] Provide a final report listing changed files, tests run, known
    limitations, and remaining work.

------------------------------------------------------------------------

## 13. Suggested implementation phases

### Phase 0 --- Baseline and inventory

Audit repository, assets, routes, tests, and current appearance. Produce
baseline report. No destructive edits.

### Phase 1 --- Design tokens and shell

Implement color/type/spacing tokens, header, announcement strip, content
container, buttons, and global surfaces.

### Phase 2 --- Home hero and landing page

Rebuild the hero, countdown, fact strip, scroll cue, and editorial home
sections.

### Phase 3 --- Content pages

Redesign encyclopedia, characters, locations, and vehicles while
preserving all current data and route behavior.

### Phase 4 --- Map, media, and search

Restyle the map shell, media gallery, and search/Intel pages without
breaking their underlying functionality.

### Phase 5 --- Responsive and accessibility pass

Test resizing, keyboard behavior, focus, contrast, reduced motion, and
overlays.

### Phase 6 --- Performance and final QA

Optimize images, remove unused CSS, verify startup and runtime behavior,
run all tests, capture screenshots, and write final report.

Work in small, reviewable changes. After each phase, run the relevant
tests and inspect the app visually before proceeding.

------------------------------------------------------------------------

## 14. Required final deliverables

Create or update these project documents:

-   `docs/ui-redesign/BASELINE-AUDIT.md`
-   `docs/ui-redesign/DESIGN-SYSTEM.md`
-   `docs/ui-redesign/ASSET-INVENTORY.md`
-   `docs/ui-redesign/IMPLEMENTATION-LOG.md`
-   `docs/ui-redesign/FINAL-QA-REPORT.md`

The final response must include: 1. What was changed. 2. Which existing
features were preserved. 3. Which files were added/modified. 4.
Build/test commands and their actual results. 5. Before/after
screenshots. 6. Any missing assets, rights questions, or unresolved
issues. 7. A clear statement of anything not completed.

------------------------------------------------------------------------

## 15. Instructions to Claude Code --- execution prompt

You are working inside the existing **GTA 6 HQ** repository.

Your task is to carry out this complete UI/UX redesign using this
document and the supplied screenshots. Use
https://www.rockstargames.com/VI as the live visual reference.

**Non-negotiable rules:**

-   Start by inspecting the repository. Do not assume the README or
    prior descriptions accurately represent the current implementation.
-   Do not create a separate replacement app.
-   Do not migrate the Rust/WebView stack without a demonstrated
    technical necessity.
-   Do not delete or regress existing functionality.
-   Do not invent GTA VI facts, character details, prices, release
    information, or vehicle names.
-   Do not copy Rockstar's source code, proprietary logos, fonts, or
    media assets.
-   Preserve existing content and data schemas unless a documented
    migration is required.
-   Do not mark tests as passed unless you actually ran them.
-   If a required asset is missing or its usage rights are unclear,
    report it and use a neutral placeholder rather than scraping or
    assuming permission.
-   Make changes incrementally and verify each phase.

Begin with **Phase 0**. Produce the baseline audit and a proposed
file-level implementation plan. Then proceed through the phases,
stopping only when a genuine blocker requires user input. Do not
silently skip incomplete work. At the end, provide the final QA report
and screenshots.

**Definition of success:** GTA 6 HQ retains its existing desktop-app
identity and functionality, but its visual experience is transformed
into a polished, cinematic, Rockstar-GTA-VI-inspired fan encyclopedia
with a restrained dark palette, premium typography, minimal navigation,
a dramatic hero, and editorial image-led content.
