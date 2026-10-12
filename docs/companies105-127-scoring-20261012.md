# Companies 105–127: evidence scoring

Assessed October 12, 2026, after the separately completed research-only session. Applies the unchanged scoring-session-1 engine at commit `c7260bbc92d7073aaeb2a14b68d0ffd14a1dbd08` in [PR17](https://github.com/advitarora5/Mando-CUBE/pull/17). This new scoring step was explicitly requested by Nevin.

## Current status

**Saved and verified in Supabase on October 12, 2026.** All 23 revised consultant-route assessments are the latest score rows for their companies: 10 Maybe and 13 Not Enough Evidence under the evidence-aware display policy. The guarded import ran a successful rollback preview followed by COMMIT; complete CSV readback matches every category score and evidence field. It preserves all 211 prior global score records, 17 weekly snapshots, company/contact fields, persona/level and manual insight overrides. Total database scores are now 234; companies remain 127 and contacts 141.

The earlier strict assessment is preserved as history and was also verified in the fresh backup. Nevin authorized using the authenticated Supabase session for this save after the background-only attempt lacked credentials. The optional background importer remains available for future work; no credential was extracted or committed. The Not Enough Evidence badge still requires PR17 reviewed, merged and deployed by Group1; the database retains its existing tier enum and incomplete flags.

## Original category policy

- Authority: 25 only for evidenced HRIS/IT leadership and a sourced workforce of at least 3,000. Generic HR titles do not automatically qualify. Jane Tandy’s Workday launch/configuration leadership establishes a functional HRIS remit. Amadeus and Affin current official rosters reconfirm their technology executives.
- Original Reachability required a team/Adi mutual and willingness; the later user-authorized rule below supersedes it for this cohort only.
- Budget: 20 requires a verified purchase window and financial stability. The same explicit session-1 interpretation awards 10 **partial** points for documented adjacent-tool adoption. No company has a verified current purchase window. Broad mobile security spend (Flix), internal AI development, selling automation, and implementation services alone do not earn proxy points.
- Release and Timing: unchanged GitHub 15-point bands. All 23 operational Workday customers receive 5 Release points; March 13, 2027 is the engine’s **estimate**, not a confirmed publication. Workday’s [release documentation](https://doc.workday.com/adaptive-planning/en-us/workday-adaptive-planning-documentation/hubs-and-workflows/configurable-workflows/faq--moving-from-legacy-workflow-and-process-track.html) currently targets 2027R1 for March 2027.
- Timing: 16 verified historical windows are entirely older than 365 days and earn 0 without inventing a day. Seven remain unknown. SNG’s completed-by-April-2026 window does not establish which day-based band applies; undated later-module launches are not silently treated as old.
- The GitHub rubric supplies maxima, not granular Authority/Reachability/Budget point bands. The 10-point proxy policy is explicitly documented in session 1, not represented as an original GitHub requirement.

## Revised Reachability policy

- **25 points:** a sourced current relevant contact, a direct public LinkedIn profile, and documented personal participation in Workday/adjacent-system changes.
- **15 points, partial:** a sourced current relevant contact and profile, without individually documented systems action.
- **10 points, partial:** a documented route while current relevant role remains uncertain.
- **0 points:** a disproven relevant role. No company in this cohort receives an automatic zero for lack of a team mutual.

Historical systems leadership is a disclosed willingness proxy under Nevin’s clarified interpretation, not a confirmed response, approved Mando budget, verified email or permission to message someone. The public route is a profile link; contact availability and response rates remain unknown. All other category scores/evidence are identical to the initial session-1 calculation.

## Latest saved results

10 Maybe; 13 Not Enough Evidence; none Qualified. Reachability is 25 for 10 records and 15 for 13. Totals range from 20 to 65. Source-linked partial Reachability cannot bypass the existing evidence gate, even when the numerical total reaches 55. Budget remains unknown/partial for all companies, so these are provisional leads. SS&C, Flex and MileOne also lack confirmed HRIS/IT leadership.

| Company | Authority /25 | Reachability /25 | Budget /20 | Release /15 | Timing /15 | Total /100 | Display status |
|---|---:|---:|---:|---:|---:|---:|---|
| Sanofi | 25 | 15 | 10 | 5 | 0 | 55 | Not Enough Evidence |
| Asda | 25 | 15 | 10 | 5 | 0 | 55 | Not Enough Evidence |
| Patagonia | 25 | 25 | 10 | 5 | 0 | 65 | Maybe |
| H.Essers | 25 | 25 | 0 | 5 | 0 | 55 | Maybe |
| Discount Tire | 25 | 15 | 10 | 5 | 0 | 55 | Not Enough Evidence |
| Land O’Lakes | 25 | 25 | 10 | 5 | 0 | 65 | Maybe |
| Blue Yonder | 25 | 15 | 0 | 5 | 0 | 45 | Not Enough Evidence |
| SoftwareOne | 25 | 25 | 10 | 5 | 0 | 65 | Maybe |
| SS&C Technologies | 0 | 15 | 0 | 5 | 0 | 20 | Not Enough Evidence |
| Focus Financial Partners | 25 | 25 | 10 | 5 | 0 | 65 | Maybe |
| Sovereign Network Group (SNG) | 25 | 25 | 0 | 5 | 0 | 55 | Maybe |
| Flex | 0 | 15 | 10 | 5 | 0 | 30 | Not Enough Evidence |
| Hungry Jack’s | 25 | 25 | 10 | 5 | 0 | 65 | Maybe |
| Li & Fung | 25 | 15 | 0 | 5 | 0 | 45 | Not Enough Evidence |
| RaceTrac | 25 | 25 | 10 | 5 | 0 | 65 | Maybe |
| Amadeus | 25 | 15 | 10 | 5 | 0 | 55 | Not Enough Evidence |
| Capita | 25 | 15 | 10 | 5 | 0 | 55 | Not Enough Evidence |
| Affin Bank | 25 | 15 | 10 | 5 | 0 | 55 | Not Enough Evidence |
| Rochester Regional Health | 25 | 25 | 10 | 5 | 0 | 65 | Maybe |
| MileOne Autogroup | 0 | 15 | 0 | 5 | 0 | 20 | Not Enough Evidence |
| Flix | 25 | 25 | 0 | 5 | 0 | 55 | Maybe |
| Concentrix | 25 | 15 | 0 | 5 | 0 | 45 | Not Enough Evidence |
| Veolia UK & Ireland | 25 | 15 | 10 | 5 | 0 | 55 | Not Enough Evidence |

## Save and reproduction

`scoring-facts-20261012.json` and `scored-20261012.json` preserve the initial strict assessment. `consultant-scoring-facts-20261012.json` and `consultant-scored-20261012.json` are the latest user-authorized inputs/results, including named public routes, role/action verification and evidence. Both versions have separate stable IDs to preserve history. No database credential is needed to calculate them.

Once PR17 is merged, reproduce with:

```sh
node scripts/score-consultant-evidence.mjs src/data/research/companies105-127/consultant-scoring-facts-20261012.json /tmp/companies105-127-scored.json
```

Before PR17 is merged, use a separate checkout of its frozen commit plus this PR’s `score-consultant-evidence.mjs` and `consultant-reachability.ts`, with absolute data paths. PR17 supplies the evidence-aware tier gate and session-1 assessor; this PR does not overwrite that shared implementation.

The guarded SQL generator accepts a fresh Supabase backup, assessed output and an output prefix:

```sh
python scripts/companies105-127-scoring-sql.py /private/backup.json src/data/research/companies105-127/consultant-scored-20261012.json /private/cohort-scoring
```

Run the generated preview (ROLLBACK), review the result, then run apply (COMMIT). Keep private backup and generated SQL outside Git. It appends 23 assessments, preserves every existing score and weekly snapshot, and appends the qualification note to generated why-now without replacing research, personas, levels, contacts or manual overrides. It fails if baseline companies, contacts, scores, weekly history or manual overrides changed. Replay uses stable IDs and avoids duplicate notes.

### Background API import

`save-reviewed-evidence.mjs` can save the latest reviewed rows without Computer Use, after configuring `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in an external private env file. It checks the project, validates the batch, captures fresh private backups, previews by default, appends scores, preserves manual fields with optimistic insight-update guards, and reads scores/history back. If a concurrent edit stops an insight update, the new score rows remain saved and the same input can be retried safely. No atomic transaction across scores and insights is claimed.

```sh
node scripts/save-reviewed-evidence.mjs src/data/research/companies105-127/consultant-scored-20261012.json /private/backups --validate-only
node --env-file=/private/supabase.env scripts/save-reviewed-evidence.mjs src/data/research/companies105-127/consultant-scored-20261012.json /private/backups
# After successful preview:
node --env-file=/private/supabase.env scripts/save-reviewed-evidence.mjs src/data/research/companies105-127/consultant-scored-20261012.json /private/backups --apply
```

The database retains its existing `Disqualified` enum internally. Category unknown/partial flags encode **Not Enough Evidence**; the visible badge needs PR17 reviewed, merged and deployed by Group1. No schema migration or deployment was performed by this data task.

## Validation

The frozen session-1 engine plus revised Reachability checks pass (37 tests), the 23-row background-import validation passes, and TypeScript checks and all 76 repository tests pass. The existing Windows CSV fixture reader uses the same CRLF correction already present in PR17. Database import verification is recorded in `scoring-verification.json`; all 23 latest revised assessments are saved and verified.
