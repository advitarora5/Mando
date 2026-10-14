# Mando — shared research and scoring rubric

Version: `mando-public-evidence-v4`. This revises the earlier practical rubric and replaces the five-point and strict contact-component drafts for future assessments. It is a manual research rubric, not an already-deployed application formula. Authority, Reachability and Budget accept whole-number scores, with the arithmetic below determining the points. Do not round existing scores or increase points to reach a tier.

## How teammates use this

Attach this document to your Codex conversation and say:

> Apply this rubric to my assigned companies. Use the batch already established in this chat, research missing public evidence, and show the proposed scores and sources. Use existing company IDs, preserve earlier assessments and weekly history, and save changes when I have authorized database updates.

Each person uses their own assigned batch; no need to type all company names again. If the batch is not established, ask which companies belong to it. Freeze the assignment using IDs from the team export; dashboard ranks change. Use the same team assessment date, otherwise today's America/Chicago date and state it. Inspect the current repository and existing records before scoring. Work only on the assigned companies.

## Authority — maximum 25

Score each relevant contact; use the company's highest contact score. Choose one role base:

| Current, sourced role | Base |
|---|---:|
| C-level/VP/Head explicitly responsible for HRIS, HR Operations or enterprise IT systems | 22 |
| Director/Senior Manager explicitly responsible for HR technology or enterprise systems | 20 |
| General CHRO/CPO/HR executive, or relevant CIO/IT executive | 18 |
| General HR/IT Director or Head | 15 |
| Relevant HR/IT manager, lead or specialist | 10 |
| Relevant staff member, or historical relevant leader whose current role is unconfirmed | 5 |
| No named relevant person, or unrelated department | 0 |

For a confirmed current relevant contact, add **3** if their employer/group is confirmed to have 3,000+ employees, and **2** if a source explicitly identifies that person as responsible for the company's Workday program. Cap at 25. Historical/unconfirmed contacts receive no bonuses. Match workforce scope to the contact's employer; employee count alone earns no Authority points. A job at another company or an unrelated VP title earns no credit. Do not combine different people's role and ownership evidence.

Example: current CHRO 18 + confirmed employer size 3 + no proven Workday ownership 0 = **21/25**.

## Reachability — maximum 25

Score each relevant contact independently; use the company's highest contact score. Choose the strongest evidenced route base:

| Contact route | Base |
|---|---:|
| Published named work email/phone, or explicitly confirmed usable LinkedIn messaging | 15 |
| Confirmed matching personal LinkedIn profile; messaging availability unknown | 10 |
| Company contact form, general email or switchboard only | 5 |
| No sourced route; name or biography alone | 0 |

For a current relevant named contact with a personal route (base 10 or 15), add independently supported bonuses:

- **3:** A second personal channel is available (email, phone or personal LinkedIn; two emails do not count twice).
- **2:** A named email is validated deliverable or a direct phone is confirmed live. Publication alone does not satisfy this bonus. Award it once.
- **3:** That person is publicly tied to an HR technology/Workday initiative, relevant customer case or event within the past 24 months. Require a dated initiative/event, not just a recently crawled page.
- **2:** That person is explicitly leading an active Workday expansion, implementation or Workday hiring on their team within the past 12 months. A generic company vacancy is insufficient. Do not award both initiative bonuses for the same event; the +3 and +2 require separate evidence of distinct activities.
- **5:** A named team-confirmed connection is willing to introduce that person. Record who confirmed it and when; it is optional, not a qualification gate.

Cap at 25. Keep published contact details separate from verification status. Do not infer messaging access, mutual connections or willingness to buy. A shared switchboard is not a personal phone. A general company route cannot receive personal-contact bonuses.

Example: published named email 15 + matching personal LinkedIn 3 + dated personal Workday engagement 3 = **21/25**, with email deliverability still unverified.

## Customer Budget — maximum 20

Use public financial and technology evidence as proxies; label them as proxies rather than confirmed funds available to Mando.

**Financial capacity:** latest annual report shows positive operating income/surplus = **10**; add **1** for year-over-year revenue growth and **1** for year-over-year operating income/surplus growth. Without positive operating income/surplus, capacity = 0; revenue or company size alone is insufficient.

**Technology investment:** choose one highest supported value: actual internal purchase/deployment of an adjacent testing, automation or Workday-related tool in the past 24 months = **8**; documented active HR technology modernization = **6**; confirmed historical/undated adjacent-tool adoption = **3**; no investment evidence = **0**. An article's publication date does not establish deployment date. A vendor logo, partnership, client project or proof of concept does not prove an internal purchase.

Budget = financial capacity + technology investment, capped at 20. A current relevant RFP or explicitly funded Workday expansion earns **20** directly. An explicit current freeze of the relevant project's budget earns **0**, unless a documented funded exception applies; conflicting evidence needs review. General layoffs alone do not prove that budget is unavailable.

Example: positive operating income 10 + revenue growth 1 + profit growth 1 + active HR modernization 6 = **18/20**. A deployment without financial evidence can still earn its supported investment points.

## Release, Timing and qualification

Keep the current repository's Release /15 and Timing /15 formulas, evidence gates and tier evaluator. Total maximum = 100; Qualified = 80+, Maybe = 55+. Timing alone cannot qualify a company. Preserve the distinction between stored tiers and any dashboard “Not Enough Evidence” label. Do not rewrite code, thresholds or schema to improve the result.

Use confirmed go-live dates with their entity/module scope. Announcement, hiring and technology-detection dates are not completed go-live dates. Keep month/year or regional dates as notes; do not invent a day. Label estimated release dates. If Release is 5 and Timing is 0, the maximum possible total is 75: public research can support Maybe, but cannot produce Qualified without more timing evidence or an explicitly approved rule change.

## Same output for every company

Show company name and ID, assessment date, rubric version, previous → proposed category scores, total and evaluated tier. Use one row per category:

| Category | Score | Evidence and calculation | Missing | Source |
|---|---|---|---|---|
| Authority / Reachability / Budget / Release / Timing | points / maximum | One factual sentence plus arithmetic | Specific gap, or “None for this scoring level” | Supporting HTTPS links |

In the existing database evidence field use:

`HTTPS_SOURCE_URL | Evidence: [supported fact and calculation]. Missing: [specific gap].`

Choose a primary URL that actually supports the awarded points; retain additional sources and verification/connection provenance in the review report or existing notes. Private team confirmation must not be given a fabricated public URL. If the repository cannot represent its provenance, flag that before saving.

When a fact is unknown, write **“Not enough evidence to confirm [specific fact]”** and award only supported components. Do not replace all evidence with that phrase when other components are supported. For an unsourced zero, omit the URL rather than inventing one. Unknown is not a confirmed negative.

**Why now:** two concise sentences: strongest supported opportunity/trigger, then the main unresolved outreach or buying gap. **Next action:** one concrete step. Distinguish a historical Workday deployment from current urgency.

Use public company pages, leadership directories, annual reports, employer career sites and vendor/implementation-partner cases. Public LinkedIn links/search results may help match a person; do not scrape LinkedIn. Never guess contact details, invent intent, spend enrichment credits without authorization, send outreach or commit secrets.

When database updates are authorized, back up records, check for concurrent edits, append reviewed assessments through existing structures, preserve previous assessments and weekly history, update stale score-summary text carefully, and independently verify the live result. Research artifacts and scoring-code changes follow the team's own-branch → PR → review workflow; never push directly to main. No new schema or history feature is required for this rubric.
