# GTA 6 HQ: product and UX brief

Written 28 November 2026 for the second design pass. It records what the app is for and the
decisions that follow, so later changes can be checked against a purpose instead of a taste.

No user research, analytics or usability tests exist for this app. Everything below is reasoned
from the app's own features and from the owner's requests. Where that is thin, it says so.

## Who it is for

Someone playing Grand Theft Auto VI on a console, with this app open on a PC or a second screen.
They look something up, go back to the game, and come back later. A smaller group browses it like
a wiki without playing. (Assumed from the feature set: trackers, route planner, step-by-step
guides and saved progress all serve a person mid-game.)

## What they come to do, in order of how much of the app serves it

1. **Look something up**: a mission, a place, a vehicle, a weapon, a cheat. Search (Ctrl K), the
   Encyclopedia, the Garage and Weapon Locker, the Field Manual.
2. **Find it on the map**: pins, filters, the route planner.
3. **Keep track of progress**: the Collectible Tracker, the 100% Checklist, Trophies, Cards,
   Progress, the Discovery Journal.
4. **Follow a guide**: mission walkthroughs, trophy guides, the Field Manual.
5. **Keep up with the game**: News and Intel, Media.

## What should be noticed first

- **Everywhere:** where you are (the lit sidebar row), and the search field. These two answer
  "where am I" and "how do I find it".
- **Home:** what the app is, then what you can do in it, then what you opened last. Joining the
  community comes after, not before.
- **A list page:** the list and its filter. The banner picture is atmosphere and sits behind the title.
- **An entry:** its name, picture and summary, then steps or facts, then sources.
- **A tracker:** how much is done, then what is left.

## What stays secondary

Community invitations, credits, confidence badges, the back layer's artwork rain, the turning
logo. They carry identity or honesty, but none of them is a task.

## Decisions taken in this pass, each with its reason

| Change | Why |
|---|---|
| Home: the tools row and "Recently opened" moved above the Discord band | The page led with an invitation before saying what the app does. Promotion ahead of purpose spends attention before the first task. |
| Home: the community strip above the footer is not shown there | Home asked the reader to join the Discord three times (title bar, band, strip). |
| Home: a "Recently opened" row from the reader's own journal | Returning mid-game is the commonest visit. It shows only real entries and is absent until there is one. |
| "Back to More" links hidden where the sidebar is shown | They point at a menu the sidebar replaced, so they named a place that is no longer the way in. |
| Encyclopedia lists take the keyboard when they open | The screen shows an Enter key; it only worked after a click. What is shown should be true. |
| "Intel" is "News and Intel" in the sidebar | The word alone did not say it is the news and release page. |
| Motion: Off stops everything the redesign added | The entry screen and the turning logos ignored the app's own setting. |

## What is deliberately not changed

- The purple game-menu screens and the Field Manual's book keep their own look: they are the
  app's identity, and each suits its content.
- The sidebar's four groups and 24 destinations: every one is a real page, and hiding any would
  cost a click.
- The map's controls, pins and route planner.

## Open questions (no evidence yet)

- Whether 24 sidebar rows is too many at small window heights (the list scrolls).
- Whether readers want the artwork rain at all on narrow windows.
- Whether "Recently opened" should also offer the last map view or tracker family.
