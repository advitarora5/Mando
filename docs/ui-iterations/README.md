# UI iterations

**Screenshot sources.**
- `round-0-live-*` are the live production site, captured as the reference.
- `round-N-*` are the local build (`npm run dev`) against the same Supabase project.

**Method.** Playwright logs in with the password from `MANDO_PASSWORD`; the login page is never captured. File names are `round-N-<view>-<viewport width>.png`. `rec-<id prefix>` means a company record, followed by its tab when one is open.

**Test companies:**

| Company | Why it is a test case |
|---|---|
| Affin Bank `f51f6c35` | All five structured scores |
| State of Delaware `6a79c08a` | Needs evidence, no contacts |
| Hungry Jack's `e57b2dff` | Three contacts |
| Roswell Park Comprehensive Cancer Center `1667a535` | Long name |

Scores are 1–10 against the brief's checklist (a–j), each with one line of evidence. A score of 9 needs no visible defect at 1440 and 1280.

## Round 1 (first full build)

| # | Item | Score | Evidence |
|---|---|---|---|
| a | Scannability | 7 | Rank, tier and total for the top 14 are visible in one screen. But the Top contact column is cut off at 1440 and Why now is off-screen, so the "why" half of "top 5 and why" is missing. |
| b | No walls of text | 8 | Table cells are one line. Contact rows on the record stack 5–6 lines each. |
| c | Alignment and type | 7 | Rank cell reads "▲4 1" (delta before rank). The record header's globe icon wraps onto its own line. Score headers carry "/25", which widens columns. |
| d | Calm, meaningful colour | 8 | Restrained palette. The Release column is a solid wall of amber, because 8/15 is a baseline every company shares. "+110 this week" in green overstates a snapshot artefact. |
| e | Layered evidence | 8 | Score, then card, then sub-scores, sources, missing items, and raw text all work. Fairview's points without any evidence read "No evidence recorded" without flagging the points as unsourced. |
| f | Contact channels obvious | 8 | Channel icons and status dots work, but the dots are small. |
| g | First-screen hierarchy | 7 | The toolbar wraps to two rows and wastes 40px. The KPI strip is fine. |
| h | No clipping; good empty and loading states | 6 | Table overflow cuts off Top contact. The outreach queue shows "Queued 0" because `lead_status` is missing from the database (migration `202610110003` was never applied), so the UI must stop implying "queued". On phone the toolbar wraps to six rows. |
| i | Keyboard flow | 6 | J/K/Enter/Esc and / are wired, but Ctrl+K did not open the palette in the automated run, so this is unverified. |
| j | Believable as a real product | 7 | It looks like a modern CRM, but the overflow and empty queue undercut it. |

**Fixes for round 2:**
- **Toolbar:** keep it on one line.
- **Score columns:** narrower, with short headers and the maximum in the tooltip.
- **Rank cell:** show the rank, then the delta.
- **Maybe icon:** stop using a minus.
- **KPI delta:** label it with its comparison week.
- **Unsourced points:** flag them in evidence cards.
- **Record header:** keep the globe icon inline.
- **Contact rows:** make them compact.
- **Lead status:** show "Not tracked" when the column is missing, and add a queue banner.
- **Phone toolbar:** scroll horizontally instead of wrapping.
- **Palette:** verify it after hydration.
