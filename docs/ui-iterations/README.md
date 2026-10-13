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

## Round 3

Changes from round 2:
- **Merged main.** Today's leads, a teammate's new page, now lives in the shared shell and appears in the view switcher and the palette. Its selection logic is unchanged.
- **KPI strip:** fills the full width.
- **Toolbar:** filter toggles use short labels below 1360px, so it stays on one line at 1280.
- **Status dots:** grown from 7px to 9px with a 2px ring.
- **Why now:** clamps to two lines in comfortable density, so about 50 characters are readable at 1440.
- **Phone pipeline toolbar:** two rows — search with icon-only Display/Export, then the saved view and filters in a row that scrolls sideways.
- **Outreach queue:** header, search and tabs stack on phone; the tabs scroll; the banner copy is shorter.
- **Checks:** the keyboard check still passes 11/11, and all 132 tests pass.

Note: between captures the database gained contacts (Shake Shack, Telstra and Genpact now appear in the queue), so "Ready to contact" went from 17 to 21. That is a data change, not a UI change.

| # | Item | Score | Evidence |
|---|---|---|---|
| a | Scannability | 9 | Rank, tier, total, five sub-scores, top contact and a two-line Why now are all visible for 15 rows at 1440 (round-3-pipeline-1440). |
| b | No walls of text | 9 | Every cell is one or two clamped lines. Long rationale stays behind "Read the full rationale" or raw toggles. |
| c | Alignment and type | 9 | One-line toolbar at 1440 and 1280. Numbers are tabular and right-aligned. |
| d | Calm, meaningful colour | 9 | The KPI strip spans the width. Colour carries tier, score bands and channel status only. |
| e | Layered evidence | 9 | Unchanged from round 2: score cell, category card, sub-scores, sources, Missing, raw. |
| f | Contact channels obvious | 9 | The 9px dots read at table scale (round-3-pipeline-1280, Top contact column). |
| g | First-screen hierarchy | 9 | The chrome above the table is 155px, with no wasted bar space. |
| h | No clipping; good empty and loading states | 9 | Phone pipeline and queue have no clipped controls. The wide tables scroll inside their own container with the name column sticky. |
| i | Keyboard flow | 9 | 11/11 automated checks pass. |
| j | Believable as a real product | 9 | Consistent shell across Pipeline, Today's leads, Outreach and records. No visible layout faults at the four widths. |

Round 4 is a verification round on views not captured since round 1: compact density, active filter chips, bulk selection, the evidence tab on a record, and the no-contacts empty state.

## Round 4 (interaction states)

**Captured:**
- active filters with chips and a non-default sort (`filters`)
- an empty search result (`empty`)
- bulk selection (`bulk`)
- compact density with the Display menu open (`compact`)
- row hover actions (`hover`)
- a copy-to-clipboard toast with its tooltip (`toast`)
- the no-contacts record (`rec-6a79c08a-contacts`)
- the unsourced-points evidence tab (`rec-6051d8ef-evidence`)
- the activity tab (`rec-6051d8ef-activity`)
- Today's leads

**Defects found in the first capture, all fixed in this round:**
- The Display and Saved-view menus did not close on Esc, on an outside click, or after picking a density. A shared `MenuDismiss` listener now closes them; Esc is captured first, so it closes only the menu. Three new automated checks were added (14/14 pass).
- The failure toast showed a green check. Toasts now have an error tone with a warning icon.
- An empty filter result rendered a collapsed table header with the sticky Company header overlapping Tier. The table is now hidden when there are no rows.
- Weekly history on the record used the old markup: ISO dates wrapped onto two lines and the movement read "New New". It is now a compact card table with short dates and the shared rank delta. The history logic is unchanged.

The data changed during this round, as the teammate's pipeline re-scored companies: Maybe 19 → 25, Needs evidence 105 → 83. The UI reflects the new data; nothing in the UI changed what the numbers mean.

| # | Item | Score after fixes | Evidence |
|---|---|---|---|
| a | Scannability | 9 | Filtered and sorted view (round-4-filters) keeps every column readable. |
| b | No walls of text | 9 | Unchanged. |
| c | Alignment and type | 9 | The history table is right-aligned and tabular, and no line wraps (round-4-rec-6051d8ef-activity). Before the fix: 8. |
| d | Calm, meaningful colour | 9 | Unverified chips are amber, error toasts amber, success toasts green. |
| e | Layered evidence | 9 | Fairview: every category says "Unverified" next to its points, and Authority notes the imported research. |
| f | Contact channels obvious | 9 | The tooltip reads "gaynor.witts@rmit.edu.au — Unverified. Click to copy"; the toast confirms. |
| g | First-screen hierarchy | 9 | Unchanged. |
| h | No clipping; good empty and loading states | 9 | The empty filter state is clean (round-4-empty), and so is the no-contacts record. Before the fix: 8. |
| i | Keyboard flow | 9 | 14/14 automated checks, including menu Esc and outside click. Before the fix: 8. |
| j | Believable as a real product | 9 | No visible faults in any captured state. |

Because round 4's first capture found defects, the "two rounds at 9" count restarts here. Round 5 is a full confirmation pass at every width.

## Round 5 (confirmation, production build)

**Setup:** captured against `next build` + `next start`, so the dev badge is gone, at 1440, 1280, 1024 and 390. That covers every view plus the round-4 interaction states, with the live site again at 1440 and 1280 for reference.

**Checks:**
- Keyboard and menus: 14/14.
- `npm run lint`: clean.
- `npm run build`: passes.
- `npm test`: 132/132.

No new defects were found. One possible line in the 1024 header was checked with a cropped re-render and is not there.

| # | Item | Score | Evidence |
|---|---|---|---|
| a | Scannability | 9 | round-5-pipeline-1440: 15 companies with tier, total, five sub-scores, top contact and channels, and why now. The live site (round-5-live-pipeline-1440) shows one company on the first screen. |
| b | No walls of text | 9 | round-5-slideover-1280: a reason line, a sub-score table and Missing bullets instead of a paragraph. |
| c | Alignment and type | 9 | Tabular numbers; one-line toolbar at 1440 and 1280. |
| d | Calm, meaningful colour | 9 | Blue accent; green, amber and red only for meaning. |
| e | Layered evidence | 9 | Cell, card, sub-scores, sources, Missing, raw. |
| f | Contact channels obvious | 9 | round-5-rec-e57b2dff-contacts: three contacts, each with channel icons, a status dot and the email state. |
| g | First-screen hierarchy | 9 | Shell, KPIs, toolbar, table. |
| h | No clipping; good empty and loading states | 9 | 1024 and 390 scroll inside the table with sticky rank and company. Empty and no-contact states are clean. |
| i | Keyboard flow | 9 | 14/14. |
| j | Believable as a real product | 9 | Consistent across all four views and four widths. |

**Stopping rule:** rounds 4 (after its fixes) and 5 both have every item at 9 or higher, so iteration stops here.

## Final scores

| Round | a | b | c | d | e | f | g | h | i | j |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 7 | 8 | 7 | 8 | 8 | 8 | 7 | 6 | 6 | 7 |
| 2 | 8 | 9 | 8 | 8 | 9 | 8 | 8 | 8 | 9 | 8 |
| 3 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| 4 (first capture) | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 8 | 8 | 9 |
| 4 (after fixes) | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| 5 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |

## Before and after

| View | Before (live) | After (this branch) |
|---|---|---|
| Pipeline table | round-0-live-pipeline-1440.png | round-5-pipeline-1440.png |
| Evidence slide-over | round-0-live-evidence-1440.png (the old page had no slide-over; evidence lived on the record) | round-5-scorepanel-1440.png |
| Company record | round-0-live-record-1440.png | round-5-rec-f51f6c35-1440.png, round-5-rec-f51f6c35-evidence-1440.png |
| Contacts | round-0-live-contacts-1440.png | round-5-rec-e57b2dff-contacts-1440.png |
| Outreach queue | no equivalent (new view) | round-5-outreach-1440.png |
| Phone | round-0-live-pipeline-390.png | round-5-pipeline-390.png |

## Still weaker than the reference products

- **Sub-scores are parsed from evidence strings.** Companies whose evidence doesn't follow the "a + b + c" pattern get a reason and sources but no breakdown. Structured columns would make this exact.
- **The phone pipeline is a scrolling table.** It is usable, but a card list would read better on a phone.
- **No saved custom views.** The five built-in views and URL state cover sharing, but a user can't name and store a filter set.
- **Status-driven views are empty.** The outreach queue's status tabs and "Ready" logic can't be fully used until `lead_status` exists in the database.
