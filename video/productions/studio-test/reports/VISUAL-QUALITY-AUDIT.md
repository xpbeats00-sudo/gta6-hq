# Visual quality audit: Studio test video

Generated 2026-11-12 15:01 by `python video/studio.py audit studio-test --only visual`. Do not edit by hand.

**Result: PASS** (12 passed, 0 failed, 0 warnings, 0 not run)

File inspected: `renders/studio-test-16x9-final.mp4`

| Check | Result | Detail |
|---|---|---|
| Every referenced asset exists | PASS | 2 files checked |
| No forbidden logo in the picture | PASS | searched 72 frames (2 a second) for: Rockstar Games logo. Finds the whole mark at 12 px wide or more; a partly hidden or very small mark needs a person |
| No black stretches | PASS | none of 0.5s or longer |
| No frozen picture | PASS | no freeze of 2.0s or longer |
| Aspect ratio matches the format | PASS | 1920x1080 for 16x9 |
| No renderer warnings (missing or short footage) | PASS | none |
| All on-screen text inside the safe area | PASS | 30 text blocks inside [96, 54, 1824, 1026] |
| Text blocks do not overlap each other | PASS | no title, label, badge, card line or credit overlaps another in the same scene |
| Footage is not enlarged beyond its resolution | PASS | largest enlargement x0.89 |
| Transitions change the picture and never go black | PASS | 4 transitions sampled before, during and after |
| No scene is nearly black at its midpoint | PASS | 5 scenes sampled |
| Contact sheet written | PASS | reports/contact-sheet-16x9-final.jpg (one frame per scene, for the human or QA agent to look at) |
