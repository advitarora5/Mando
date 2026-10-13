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

## Round 2

Changes from round 1:
- The table fits exactly 1440px through the Top contact column, measured in the browser.
- "Needs evidence" in score cells is a two-line dashed chip, so it no longer widens every score column.
- Row actions are a hover overlay instead of their own column.
- Why now takes the remaining width with an ellipsis, and hides below 1360px; it is always in the slide-over.
- The rank cell shows the rank, then the delta.
- The KPI delta is labelled with its comparison week.
- Missing `lead_status` is shown as "Not tracked", with a banner in the queue.
- Evidence cards flag unsourced points.
- Contact rows are two compact lines.
- An automated keyboard check passes 11/11.

| # | Item | Score | Evidence |
|---|---|---|---|
| a | Scannability | 8 | The top 15 rows, with tier, total, five sub-scores and top contact, are all on the first screen at 1440 and 1280. Why now is only about 146px at 1440 and mostly reads "Confirmed ongoin…", so the "why" still needs the panel. |
| b | No walls of text | 9 | Every cell is one line. The panel and record use bullets, sub-score rows and clamped reasons. Raw text sits behind toggles. |
| c | Alignment and type | 8 | Numbers are tabular, and rank and total are right-aligned. At 1280 the toolbar wraps to a second line. |
| d | Calm, meaningful colour | 8 | Colour is used only for tier, bars and status. The KPI strip leaves the right half of the bar empty, which looks unfinished. |
| e | Layered evidence | 9 | Score cell, then category card, then status and sub-scores, then source chips, then Missing, then raw text (round-2-scorepanel). |
| f | Contact channels obvious | 8 | The three icons with dots are clear in the queue and record. At table scale the 7px dots are hard to read at a glance. |
| g | First-screen hierarchy | 8 | The shell, KPIs, toolbar and table fit in 155px of chrome. The KPI strip doesn't use its full width. |
| h | No clipping; good empty and loading states | 8 | Nothing is clipped at 1440 or 1280. Empty states and skeletons exist. On phone the toolbar takes three rows. |
| i | Keyboard flow | 9 | Automated: Ctrl+K, palette filter and Enter, "/", typing guard, Esc, J/K, Enter to open, J inside the panel, Esc to close, score click to evidence. 11/11 pass. |
| j | Believable as a real product | 8 | It reads like a mid-stage SaaS CRM. The wrapping toolbar at 1280 and the sparse KPI bar are the visible tells. |

**Fixes for round 3:**
- **KPI strip:** fill its width.
- **Toolbar toggles:** shorter labels below 1360px.
- **Status dots:** larger.
- **Phone toolbar:** two rows, with icon-only Display and Export buttons.
- **Why now:** a few more pixels.
