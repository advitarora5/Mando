# UI research for the dashboard revamp (2026-10-12)

**How this was checked.** Product UIs (Attio, Linear, HubSpot, Apollo, Clay, Vercel) sit behind logins. Observations below come from:
- the product imagery on their public marketing pages, captured with Playwright at 1440×900 (stored in the scratchpad, not committed);
- their own help-centre documentation;
- the design-system pages that rendered.

Blog claims were treated as hints. Anything that could not be verified is marked as such.

## Current site (round 0, `docs/ui-iterations/round-0-live-*`)
- **No company rows on the first screen.** At 1440×900 a marketing hero and three 120px KPI cards (one reads "Qualified 0") push the table down; only part of the first row is visible.
- **Huge rows.** Thirteen columns, and each score cell carries a sentence ("Category evidence awaiting review. Open company for original research."), so one row is about 150px tall.
- **Decorative styling.** Beige background, brown underlined links, uppercase tracked headers, 12px radii.
- **Record page.** It stacks seven full-width panels. Evidence cards repeat "Evidence not provided" plus a red warning even when a score exists, and the lead-status value renders blank.
- **Phone (390px).** Hero, cards and filters fill the whole first screen; no data is visible.

## What to borrow

| Source | Borrow | Verified how |
|---|---|---|
| Attio | Slim app shell; ⌘K "Quick actions" entry beside search; neutral white surfaces with hairline borders; about 13px UI text. | Product image on attio.com |
| Linear | Record view with main content left and a properties column right; "1 / 84" keyboard pager with up/down arrows; command palette as the universal entry point. | Product image on linear.app |
| HubSpot | Hover a table row → Preview opens a right-side panel (summary, properties, activities); "View record" opens the full page; X closes. | knowledge.hubspot.com "Preview a record" |
| Salesforce | Record page header with key fields and a status path above tabs. | General product knowledge, not re-verified this session |
| Apollo | Email status is a first-class filterable attribute (Verified vs Unverified). Channel state belongs next to the contact, not in a paragraph. | knowledge.apollo.io "Email Status Overview" |
| Clay | Enrichment state as a per-cell status, not prose. | Marketing page shows no product UI; principle only |
| Vercel dashboard | Restraint: one accent, plain tables, muted metadata, no gradients. | Marketing redirect; principle only |

## Data-table rules (design systems)

**Maersk** (designsystem.maersk.com/components/table, rendered):
- "Left-align text, including non-countable numerals such as dates and phone numbers."
- "Right-align numbers, and consider monospaced numbers."
- "Align each heading the same way as the data in its column."
- When a table overflows horizontally, "keep headers or the first column sticky so users do not lose track of what the data represents."
- Put the most important columns first.
- "Use a dash when a cell contains no data so users know the content was loaded and is intentionally absent."

**Polaris** (via search result excerpt; the page itself redirects to shopify.dev):
- Numbers right, text left, headers match their data, no centering.
- Prefer wrapping to truncation, because truncated titles that share a prefix look identical. We truncate one-line cells only where the full value is one hover or click away (title tooltip plus the slide-over).

**SAP Fiori:**
- Compact and condensed densities exist, but the default suits most cases.
- Let users choose density.

**Visa Product Design System:** the table page renders client-side and redirects to the homepage, so its guidance could not be retrieved and is not used.

## Score explanation pattern
A layered reveal, never a paragraph:
1. a compact score and bar in the table;
2. a slide-over with per-category cards (score, one-line reason, sub-score rows);
3. evidence source chips and a "Missing" list;
4. the raw stored text behind a "Show raw evidence" toggle.

## Brand colour
mando.work's computed link and heading colours are default blue (`rgb(0,0,238)`), black, and the same brown as the current dashboard (`rgb(145,106,63)`). The brief asks to remove the brown, so the accent is a calm blue (`#2f5bd3`), and brand brown is not used in the UI.
