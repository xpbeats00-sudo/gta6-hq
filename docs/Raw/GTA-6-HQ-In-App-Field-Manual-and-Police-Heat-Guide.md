# GTA 6 HQ --- In-App Field Manual & Law Enforcement / Heat System Guide

> **Project:** GTA 6 HQ (unofficial fan encyclopedia)\
> **Feature:** Interactive, illustrated GTA VI field manual inside the
> desktop app\
> **Primary inspiration:** The supplied two-page Grand Theft Auto IV
> manual spread and the linked Archive.org GTA IV manual scans.\
> **Primary chapter:** Law Enforcement & the Heat System\
> **Research snapshot:** 11 November 2026\
> **Status policy:** Separate directly demonstrated /
> developer-described information from preview reporting,
> interpretation, and unknown mechanics.

------------------------------------------------------------------------

## 1. Goal

Add a dedicated **FIELD MANUAL** area to GTA 6 HQ. It should feel like a
digital version of a printed Grand Theft Auto instruction manual rather
than another modern dashboard page.

The supplied GTA IV manual spread is a layout reference: -
White/off-white paper background. - Two-column editorial page
composition. - Small running chapter label at the top. - Thin black
horizontal rule. - Large chapter heading with a colored accent word. -
Short italic introduction. - Numbered entries with oversized numerals. -
Large in-game screenshots with captions and location/context labels. -
Dotted separators between entries. - Compact page numbers and footer
text.

The three uploaded images show the same two-page **"Places --- Best
Sights: The Top Five"** spread. They are useful for the editorial design
language, but they do not contain GTA VI police or Heat information. Use
them as layout inspiration only.

The manual must be clearly labelled as an **unofficial fan-made
reference**. Do not present it as an official Rockstar publication.

------------------------------------------------------------------------

## 2. How it should appear inside GTA 6 HQ

Add a top-level navigation destination:

**MANUAL**

Suggested information architecture:

``` text
MANUAL
├── Welcome / Contents
├── Getting Started
├── Leonida & Vice City
├── Characters
├── Vehicles
├── Activities
├── Law Enforcement
│   ├── Police Overview
│   ├── Wanted Level
│   ├── Heat System
│   ├── Police Identification
│   ├── Search Areas
│   └── Escaping a Pursuit
├── Weapons & Equipment
└── Reference / Sources
```

Only publish sections for which the project has reliable material. Empty
sections should be marked "In development" rather than filled with
invented facts.

### Manual landing page

Create a book-like landing page: - A cover treatment with the title
**GRAND THEFT AUTO VI --- FIELD MANUAL** and the subtitle **An
Unofficial Guide to Leonida**. - A large cover image selected from
assets already approved for the app. - A contents index with numbered
chapters. - A "Continue Reading" button that remembers the last opened
chapter/page locally. - Search within manual chapters. - Previous / Next
page navigation. - A two-page spread mode on wide desktop windows and
single-page mode on narrow windows. - A toggle for **Paper View** and
**Night Reading**. Paper View is the default because it matches the GTA
IV manual reference. - A visible source/status label on every article
where information is pre-release or not fully confirmed.

Do not alter or remove the existing Home, Encyclopedia, Characters,
Locations, Vehicles, Map, Media, or Intel sections.

------------------------------------------------------------------------

## 3. Visual design specification

### 3.1 Paper / print mode

Use the GTA IV manual spread as the strongest visual reference.

Suggested CSS tokens (tune against the uploaded image):

  -------------------------------------------------------------------------
  Token                     Value                   Purpose
  ------------------------- ----------------------- -----------------------
  `--manual-paper`          `#F7F6F0`               Main paper

  `--manual-paper-shadow`   `#E8E6DD`               Page edge / gutter

  `--manual-ink`            `#171717`               Main text

  `--manual-muted`          `#66645D`               Captions and secondary
                                                    text

  `--manual-rule`           `#252525`               Main horizontal rules

  `--manual-dotted`         `#8C8A82`               Dotted section dividers

  `--manual-accent`         `#A8C45A`               Olive/lime editorial
                                                    accent inspired by the
                                                    supplied spread

  `--manual-link`           `#526A2B`               Links and interactive
                                                    references
  -------------------------------------------------------------------------

Typography: - Chapter/section headings: bold condensed sans-serif, large
scale. - Secondary heading: thin/regular sans-serif in the same line
where appropriate. - Intro paragraph: readable serif italic. - Entry
titles: bold condensed sans-serif. - Body copy: highly legible serif or
neutral sans-serif, depending on page density. - Captions: small italic
text. - Number markers: oversized bold condensed numerals.

Do not use a novelty font for body paragraphs. Bundle licensed fonts
locally or use suitable system fallbacks.

### 3.2 Night reading mode

Offer an optional night palette, not the default: - Near-black paper
surface. - Warm off-white text. - Muted olive accent. - Subtle
separators. - Preserve the same typography and editorial grid.

### 3.3 Page composition

Desktop two-page spread: - Center the manual in the app content area. -
Use two fixed-ratio pages with a visible center gutter. - Each page has
a top running label and horizontal rule. - Use an editorial grid with
asymmetric image/text blocks. - Maintain generous outer margins and
consistent baseline spacing. - Use dotted rules to separate numbered
topics. - Page number and manual title in the footer.

At smaller window widths: - Switch to one page at a time. - Never shrink
body text to unreadable sizes. - Keep page navigation and chapter index
accessible.

Do not make the manual look like the existing dark/purple app dashboard.
The manual is a distinct reading experience inside the same app.

------------------------------------------------------------------------

## 4. Editorial content policy

Every factual block must carry an internal evidence status:

-   **DEMONSTRATED** --- clearly visible in official Rockstar footage or
    official material.
-   **DEVELOPER-DESCRIBED** --- described by a Rockstar developer in an
    interview.
-   **PREVIEW-REPORTED** --- reported by journalists or creators who saw
    a preview build.
-   **INTERPRETATION** --- a reasonable reading of footage or reporting,
    but not a confirmed rule.
-   **UNKNOWN** --- not established by the sources currently available.
-   **UPDATED AFTER RELEASE** --- verified against the final public
    game, only after release and direct verification.

Display a small unobtrusive status badge beside the relevant heading or
paragraph. Provide a source drawer / footnote panel with article name,
publisher, date, and link.

Never turn a preview report into a guaranteed gameplay rule. Avoid
phrases like "always," "every time," "instant," or exact numeric
thresholds unless a reliable source explicitly establishes them.

------------------------------------------------------------------------

# PART I --- LAW ENFORCEMENT & THE HEAT SYSTEM

## 5. Chapter opening page

### Chapter title

**LAW ENFORCEMENT**\
*The Heat System & Wanted Response*

Intro copy:

> Law enforcement in Leonida is designed around more than escaping the
> officer currently chasing you. The available pre-release reporting
> describes a system in which police can retain identifying information
> after a pursuit, making it important to understand what they know, not
> just whether they can see you.

Add: - A large approved screenshot of a police pursuit. - A secondary
image of the wanted-level HUD / Heat indicators, if the project has a
permitted, legible source image. - A short callout: **Losing sight of
the police is not necessarily the same as losing their information.** -
Evidence status: **DEVELOPER-DESCRIBED / PREVIEW-REPORTED** depending on
the specific paragraph.

Do not use an image from an unrelated GTA game and label it as GTA VI
footage.

------------------------------------------------------------------------

## 6. Section 1 --- The Wanted Level

### What the manual can say

GTA VI footage and pre-release reporting show a six-position wanted
display. The six-star format returns after GTA V used five stars. The
exact crime thresholds and the complete behavior of every star level
have not been published in a definitive official mechanics manual.

The wanted display represents the immediate law-enforcement response,
while the separate Heat indicators represent information police may have
about the suspect.

**Evidence status:** Six visible wanted positions --- DEMONSTRATED in
published footage. Exact star thresholds --- UNKNOWN.

### Page layout

-   Large six-star HUD crop across the top.
-   Six numbered explanatory blocks only if their exact behavior is
    supported.
-   A side panel distinguishing:
    -   **Wanted response:** the active police response / pursuit state.
    -   **Heat information:** identifying details that may remain
        relevant after line of sight is broken.
-   A caution note: Do not publish a fixed "crime X equals Y stars"
    table unless verified in the final game.

### Suggested manual text

> The wanted display returns to six positions. The number of active
> stars communicates the current level of police attention, but the
> exact escalation thresholds should be treated as unconfirmed until
> they are verified in the released game.

------------------------------------------------------------------------

## 7. Section 2 --- How Police Become Aware of a Crime

Pre-release developer/interview coverage describes a more witness-driven
approach: crimes may need to be seen or reported, or an alarm may alert
law enforcement. Preview reporting also discusses alarms and
vehicle-related reporting as possible alert paths.

### Include these as separate, carefully labelled concepts

1.  **Witness report** --- a person sees an incident and reports it.
2.  **Alarm** --- an alarm can alert police to an incident.
3.  **Other reporting mechanisms** --- some preview coverage describes
    vehicle trackers and other alert sources; keep these marked
    PREVIEW-REPORTED until independently verified.

Do not state that every crime requires an NPC witness in all
circumstances. Do not state that police never respond without a witness.
The final rules may vary by mission, scripted event, alarm, or other
game system.

### Page layout

A numbered, illustrated process: 1. Incident occurs. 2. Information may
be observed or recorded. 3. A report/alarm reaches police. 4. Police
response begins. 5. Police attempt to identify and locate the suspect.

Label this as a **simplified explanatory model**, not a confirmed exact
internal game simulation.

------------------------------------------------------------------------

## 8. Section 3 --- What the Heat System Tracks

The central concept of Heat is that police may retain information that
can help identify the player after the immediate chase has changed or
ended.

Pre-release material and reporting describe the following information
categories:

  -----------------------------------------------------------------------
  Heat clue               What it represents      Editorial status
  ----------------------- ----------------------- -----------------------
  Physical appearance /   A description or visual DEVELOPER-DESCRIBED /
  face                    identification of the   PREVIEW-REPORTED
                          suspect                 

  Clothing                What the suspect was    DEVELOPER-DESCRIBED /
                          wearing                 PREVIEW-REPORTED

  Vehicle                 A vehicle associated    DEVELOPER-DESCRIBED /
                          with the incident or    PREVIEW-REPORTED
                          escape                  

  Weapon                  A weapon associated     PREVIEW-REPORTED
                          with the crime          

  CCTV / camera sighting  Recorded or observed    PREVIEW-REPORTED
                          footage that may        
                          identify the suspect    

  Companion / accomplice  Information linking     PREVIEW-REPORTED
                          Jason and Lucia as      
                          being together          
  -----------------------------------------------------------------------

Important: - The exact icon art may differ from fan-made diagrams. Do
not draw invented official HUD icons and imply they are exact. - Use
simplified custom pictograms only when labelled **manual
illustration**. - The full list and exact effect of every clue should be
rechecked after launch.

### Suggested two-page spread

**Left page --- "What the Police Know"** - Large central screenshot of
the Heat indicator row. - Three numbered entries: appearance, clothing,
vehicle.

**Right page --- "Evidence That Can Identify You"** - Three more
entries: weapon, camera, companion. - A small summary diagram showing
that multiple clues can coexist. - A source note beneath the diagram.

### Suggested manual copy

> Heat is separate from the immediate chase. It represents the
> identifying information law enforcement may retain about a suspect. A
> pursuit can change state while some of that information remains
> relevant.

------------------------------------------------------------------------

## 9. Section 4 --- Wanted State vs. Heat

Make this distinction one of the clearest pages in the chapter.

  -----------------------------------------------------------------------
  Concept                             Meaning in the guide
  ----------------------------------- -----------------------------------
  Wanted state                        Whether police are actively
                                      responding, pursuing, or searching

  Heat                                What identifying information police
                                      may have retained

  Line of sight                       Whether officers currently have
                                      visual contact

  Search area                         An area where police are reported
                                      to be looking after losing direct
                                      contact
  -----------------------------------------------------------------------

Do not imply these are four independent numerical meters. This is a
plain-language explanation of related concepts, not a claim about the
game's internal code.

### Visual diagram

Use a simple editorial flow:

``` text
CRIME / INCIDENT
       |
       v
REPORT OR ALARM
       |
       v
POLICE RESPONSE
       |
       v
IDENTIFICATION INFORMATION (HEAT)
       |
       v
PURSUIT / SEARCH
       |
       v
BREAK LINE OF SIGHT
       |
       v
POLICE MAY STILL RETAIN CLUES
```

Caption: "Conceptual guide based on published pre-release descriptions;
not a verified internal state diagram."

------------------------------------------------------------------------

## 10. Section 5 --- Police Identification and Search

Reporting based on Rockstar developer comments says police will have
more persistent memory than in earlier entries. GamesRadar's coverage of
Rob Nelson's comments also says police will not simply appear as normal
radar blips during a chase; the player is expected to use **Focus** to
locate police.

### Supported description

-   Police may retain information about the player after a pursuit.
-   The player should not assume that breaking line of sight clears
    every identifying clue.
-   Police are reported not to appear as ordinary police radar markers
    on the minimap during pursuits.
-   Focus is described as a way to detect police, including through
    walls, in the preview reporting.

### Avoid overclaiming

-   Do not invent exact police vision cones, search radii, reaction
    times, dispatch delays, or AI perception distances.
-   Do not state that Focus works in every situation or has a fixed
    range unless verified.
-   Do not state that the minimap is always completely free of all
    police-related information; phrase this narrowly around the reported
    absence of normal police radar markers during pursuits.

### Page layout

-   Large map/HUD screenshot.
-   Side-by-side comparison:
    -   Traditional radar-marker expectation.
    -   Reported GTA VI approach: use Focus to locate nearby police.
-   Label the comparison as an explanatory illustration, not a direct UI
    screenshot unless genuine footage is used.

------------------------------------------------------------------------

## 11. Section 6 --- Red Search Areas / Hot Areas

Some published guides interpret red wanted indicators and red map zones
as a continuing search area after the player has broken direct pursuit.
Treat this carefully.

### Content status

-   A post-pursuit search area is described in published footage and
    preview coverage.
-   Exact boundaries, radius, decay rules, and how every star level
    affects the search area are not fully established.
-   "Hot Area" is a useful editorial label only if the source being
    cited uses it; otherwise call it **Search Area** and note
    terminology differences across guides.

### Suggested manual copy

> Breaking direct contact may not end the search immediately. Published
> footage and preview reporting show a search area in which police may
> continue looking. The exact size and duration of that area should be
> verified in the final game.

### Page layout

-   Large map image with a red translucent zone, only if taken from
    genuine published footage or recreated as an explicitly labelled
    explanatory graphic.
-   Numbered notes:
    1.  Active pursuit.
    2.  Direct contact is broken.
    3.  Search may continue in the area.
    4.  Returning too soon may risk renewed contact (mark
        PREVIEW-REPORTED / INTERPRETATION unless directly confirmed).

Do not invent a precise countdown or exact escape boundary.

------------------------------------------------------------------------

## 12. Section 7 --- Reducing Identifying Information

Pre-release reports describe ways a player may address individual clues.
These should be explained as clue-specific examples, not guaranteed
universal escape recipes.

  -----------------------------------------------------------------------
  Information police may  Reported countermeasure Caution
  have                                            
  ----------------------- ----------------------- -----------------------
  Clothing                Change outfit           Exact conditions and
                                                  timing require
                                                  final-game verification

  Known vehicle           Leave / switch vehicle  Do not assume every
                                                  vehicle association
                                                  clears instantly

  Physical appearance     Conceal or alter        Exact mask / disguise
                          visible appearance      rules require
                                                  verification

  Weapon                  Stash or remove the     Do not assume all
                          identified weapon       weapon evidence is
                                                  cleared by one action

  CCTV                    Avoid or interfere with Exact camera/evidence
                          cameras where gameplay  persistence is not
                          permits                 fully known

  Companion link          Separate Jason and      Exact effects and
                          Lucia                   conditions need
                                                  verification
  -----------------------------------------------------------------------

### Important wording

Prefer: - "Preview reporting indicates..." - "This may reduce the
identifying information..." - "The game appears to distinguish..." -
"Verify this behavior in the final release."

Avoid: - "This instantly removes Heat." - "Changing clothes always
clears your wanted level." - "A mask makes you invisible to police." -
"Switching cars guarantees escape."

### Layout

Create a six-entry "Clear the Clues" spread with numbered images and
concise captions. Each entry should have: - Clue icon (custom manual
icon, not falsely presented as official HUD art). - What the police may
know. - Reported response. - Evidence status. - Source footnote.

------------------------------------------------------------------------

## 13. Section 8 --- Police Response and Escalation

Create a future-proof section for police vehicles, tactical response,
helicopters, and other law-enforcement units.

At the current research snapshot, only include specific units or tactics
that can be tied to actual published GTA VI footage or reliable preview
reporting. Do not invent a full response ladder or assign units to exact
star counts.

For each entry, store: - Unit / vehicle name. - Screenshot or footage
reference. - What is visibly demonstrated. - Whether the behavior is
developer-described or preview-reported. - Unknowns and caveats.

Do not automatically import GTA V police behavior and label it as GTA
VI.

------------------------------------------------------------------------

# PART II --- CONTENT AND DATA IMPLEMENTATION

## 14. Manual content model

Keep manual content data-driven. Do not hard-code every chapter into a
single HTML page.

Suggested JSON structure:

``` json
{
  "id": "law-enforcement-heat",
  "title": "Law Enforcement & the Heat System",
  "chapterNumber": "07",
  "status": "pre-release-guide",
  "pages": [
    {
      "pageNumber": 42,
      "title": "The Wanted Level",
      "intro": "A six-position wanted display returns in GTA VI.",
      "layout": "feature-left",
      "blocks": [
        {
          "type": "paragraph",
          "text": "The wanted display communicates the current level of police attention.",
          "evidenceStatus": "demonstrated",
          "sourceIds": ["gamesradar-heat-2026"]
        }
      ],
      "assets": ["media/manual/police/wanted-hud-approved.webp"]
    }
  ]
}
```

Adapt the schema to the project's existing data conventions. Do not
introduce a new data framework if the app already has a suitable JSON
content system.

### Recommended block types

-   `paragraph`
-   `heading`
-   `numbered-entry`
-   `image`
-   `image-caption`
-   `quote-callout`
-   `fact-box`
-   `comparison-table`
-   `diagram`
-   `source-note`
-   `warning`
-   `page-break`

### Source metadata

Each source record should include: - `id` - `title` - `publisher` -
`author` (if available) - `publishedAt` - `url` - `sourceType` -
`lastCheckedAt` - `notes`

### Evidence status values

Use stable identifiers: - `demonstrated` - `developer-described` -
`preview-reported` - `interpretation` - `unknown` -
`verified-after-release`

------------------------------------------------------------------------

## 15. Manual reader UI components

Build reusable components that match the printed guide:

-   `ManualReader`
-   `ManualCover`
-   `ManualContents`
-   `ManualSpread`
-   `ManualPage`
-   `ManualRunningHeader`
-   `ManualPageFooter`
-   `ManualChapterHeading`
-   `ManualNumberedEntry`
-   `ManualImageFigure`
-   `ManualCaption`
-   `ManualDottedRule`
-   `ManualEvidenceBadge`
-   `ManualSourceFootnote`
-   `ManualSearch`
-   `ManualPageNavigation`
-   `ManualThemeToggle`

Requirements: - Page numbers must be deterministic and consistent. -
Keyboard navigation: Page Up / Page Down or left/right arrows when focus
is inside the reader. - Do not steal arrow keys while a text input, map,
or other interactive control has focus. - Remember last read
chapter/page locally. - Search results should jump to the relevant
chapter and page. - Support copy-link / deep-link to a chapter. -
Preserve zoom and readable layout. - Use local images where possible and
provide fallback placeholders.

------------------------------------------------------------------------

## 16. Asset sourcing and rights

The GTA IV manual pages are supplied as visual references. Do not
extract and reuse their images or text as GTA VI content.

For GTA VI imagery: - Prefer official Rockstar press/trailer screenshots
where usage is permitted and properly attributed. - Record the original
source URL, creator/rights holder, access date, and permitted use. - Do
not scrape or rehost assets just because they are publicly visible. - If
redistribution rights are unclear, link to the source or use a locally
created diagram instead. - Do not use fan-made HUD recreations without
labelling them as fan-made. - Do not imply that a custom diagram is an
official Rockstar interface screenshot.

Create `docs/manual/ASSET-AND-RIGHTS-REGISTER.md`.

------------------------------------------------------------------------

## 17. QA checklist

### Reader UI

-   [ ] Manual appears as a top-level navigation section.
-   [ ] Landing page and contents index work.
-   [ ] Two-page spread works on wide windows.
-   [ ] Single-page mode works on narrow windows.
-   [ ] Paper View matches the supplied GTA IV editorial reference.
-   [ ] Night Reading mode works.
-   [ ] Page numbers, previous/next navigation, and chapter links work.
-   [ ] Search jumps to the right page.
-   [ ] Last-read position is saved and restored.
-   [ ] Keyboard and focus behavior are accessible.

### Content integrity

-   [ ] All police facts have evidence status.
-   [ ] All source links work.
-   [ ] Unconfirmed rules are not presented as facts.
-   [ ] No invented exact wanted thresholds or heat timers.
-   [ ] No GTA V mechanics are silently attributed to GTA VI.
-   [ ] Images are genuine, permitted, and correctly captioned.
-   [ ] Manual clearly states that it is unofficial and pre-release
    where applicable.

### App regression

-   [ ] Existing Home page still works.
-   [ ] Encyclopedia, Characters, Locations, Vehicles, Map, Media,
    Intel, and search still work.
-   [ ] Existing Rust tests pass.
-   [ ] No new console/runtime errors.
-   [ ] App still starts and functions offline where expected.

------------------------------------------------------------------------

## 18. Research sources used for this draft

The following sources informed the initial police/Heat chapter. They are
secondary reporting and preview coverage, not a substitute for
final-game testing.

1.  **GamesRadar+ --- "GTA 6 Wanted Levels and Heat system explained"**\
    https://www.gamesradar.com/games/grand-theft-auto/gta-6-wanted-levels-heat/\
    Used for the overview of six wanted positions, reported Heat clues,
    and the distinction between active pursuit and retained information.
    Some interpretations of icon states and countermeasures should be
    checked against the final game.

2.  **GamesRadar+ --- "Rockstar boss says GTA 6's police can be harder
    to shake off..."**\
    https://www.gamesradar.com/games/grand-theft-auto/rockstar-boss-says-gta-6s-police-can-be-harder-to-shake-off-than-before-but-its-fun-because-it-forces-you-to-think-more/\
    Used for Rob Nelson's comments about more persistent police memory,
    Heat, and using Focus rather than relying on ordinary police radar
    markers.

3.  **GTABase --- "GTA 6 Wanted Level Explained & Police System
    Guide"**\
    https://www.gtabase.com/articles/gta-6/gta-6-wanted-level-explained-police-system-guide\
    Used as a secondary guide to identify reported clue categories and
    possible wanted/search display states. Exact state interpretation
    and countermeasures must remain qualified.

4.  **VICE --- "GTA 6 Just Revealed a Massive Number of New Gameplay
    Details"**\
    https://www.vice.com/en/article/gta-6-new-gameplay-features-details-revealed/\
    Used for preview coverage context and the reported
    witness/alarm/Heat discussion. Some details are attributed to
    preview attendees and should be labelled PREVIEW-REPORTED.

5.  **GGWaypoint --- "GTA 6 Wanted System: What Rockstar Confirmed"**\
    https://ggwaypoint.com/gta-6-wanted-system/\
    Used as a cross-check for the distinction between
    developer-described concepts, footage, and still-unknown rules.

Before publication, revisit each source and record the date checked.
Update the guide after the public game release by testing the mechanics
directly.

------------------------------------------------------------------------

# PART III --- CLAUDE CODE EXECUTION PLAN

## 19. Instructions for the implementation agent

You are working inside the existing GTA 6 HQ repository. Implement the
in-app manual described in this document.

### First: inspect, do not assume

1.  Inspect the full repository and identify the existing Rust/WebView
    architecture.
2.  Locate current navigation, styling, JSON data, asset folders, and
    test commands.
3.  Check whether a manual/guide section already exists.
4.  Inspect the supplied GTA IV manual reference images if they are
    present in the repository.
5.  Write a short implementation plan with exact files to add or modify.
6.  Preserve the existing application and all existing pages.

### Then implement in phases

**Phase A --- Manual framework** - Add Manual navigation entry. - Create
reader shell, cover, contents, page/spread layout. - Add paper theme and
optional night theme. - Add page navigation and local last-read
persistence.

**Phase B --- Data-driven content** - Implement the manual chapter/page
data model. - Add evidence statuses and source references. - Add search
and deep-link support.

**Phase C --- Law enforcement chapter** - Build the chapter opening. -
Add wanted level, witness/reporting, Heat clues, wanted-vs-Heat,
Focus/search, search areas, and reducing clues sections. - Use only
source-supported claims from this document. - Mark uncertain mechanics
as preview-reported, interpretation, or unknown.

**Phase D --- Visual polish** - Match the supplied GTA IV manual's print
layout: typography, page rules, numbered entries, dotted dividers,
captions, large imagery, and page numbers. - Ensure the reader feels
like a digital manual, not a dashboard. - Optimize images and preserve
responsive behavior.

**Phase E --- Verification** - Run existing tests, formatting, lint, and
production build. - Test two-page and single-page layouts. - Test
keyboard navigation, search, page persistence, and deep links. - Check
all source links and evidence badges. - Confirm the rest of GTA 6 HQ
still works.

### Non-negotiable rules

-   Do not create a replacement app.
-   Do not remove or break existing features.
-   Do not fabricate police mechanics.
-   Do not present leaks, guesses, or interpretations as confirmed.
-   Do not claim the manual is official.
-   Do not copy GTA IV manual text or artwork into GTA VI content.
-   Do not download/rehost copyrighted imagery without permission.
-   Do not claim tests passed unless they were actually run.
-   If a mechanic cannot be verified, include it in an "Unknown / To
    Verify" panel instead of inventing an answer.

### Required output

Create or update: - `docs/manual/IMPLEMENTATION-PLAN.md` -
`docs/manual/CONTENT-STATUS.md` -
`docs/manual/ASSET-AND-RIGHTS-REGISTER.md` - `docs/manual/QA-REPORT.md`

At completion, report: - Files added/modified. - Pages and chapters
implemented. - Police/Heat mechanics included and their evidence
status. - Sources linked. - Build/test commands and actual results. -
Before/after screenshots. - Known unknowns and unfinished work.

**Definition of done:** GTA 6 HQ contains a polished, searchable,
illustrated field manual with a printed GTA IV-inspired editorial
reading experience and a carefully sourced GTA VI law-enforcement
chapter. Existing application functionality remains intact.
