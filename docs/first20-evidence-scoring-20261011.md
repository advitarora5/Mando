# First 20 companies: evidence-based scoring

Assessment date: October 11, 2026 (Chicago). Same frozen company IDs as the earlier research.

## What is live

Twenty new score rows were appended in Supabase. Scores and totals were read back and matched exactly; all 40 prior assessments for this cohort, 28 contacts, manual insight overrides and exact signal dates were preserved. RMIT workforce was updated from an older 12,000 snapshot to its employer-reported 13,000 global staff in 2025. Global counts: 127 companies, 88 contacts, 167 assessments, 17 weekly snapshots.

The production badge still requires the reviewed application deployment. The new assessments carry explicit unknown/partial statuses and generated why-now says Not Enough Evidence. The app change extends PR #14’s display approach to all five categories, uses the requested wording, rejects source-linked unknown Authority/Reachability at the tier gate, and keeps Disqualified for fully evidenced low scores. Database tier values retain the existing shared enum; this display change requires no schema migration.

## Scoring policy

GitHub supplies weights 25/25/20/15/15 and timing/release bands, but does not supply first-three point bands. The following transparent assessment policy is an interpretation of the user-authorized criteria, version first20-evidence-v1:

- Authority: 25 when sourced HRIS/IT leadership and at least 3,000 employees are both established. An HR executive qualifies only with explicit HR systems ownership. This is functional authority, not proof of a specific buying mandate. Otherwise 0 with a resolved failure or an unknown status.
- Reachability: 25 only for a verified one-degree connection plus authority and willingness to act. Public profile, public email, conference appearance and open job posting alone earn no points. None of this cohort has the required connection and conviction evidence in the reviewed records. All 20 receive 0 with unknown status, not a failed fit conclusion.
- Budget: 20 for a clear purchasing/renewal timeline plus positive financial-capacity evidence. RMIT satisfies this with a January 2027 Workday renewal and its reported AUD89 million 2025 operating surplus. Documented adjacent software/tool adoption earns 10 as a partial proxy; historical spend does not establish a current purchase window. Service support or an in-house app alone is not treated as a software purchase. Otherwise 0 with unknown status.
- Release: existing repository calendar and bands, 5 points for the estimated March 13, 2027 release, more than 18 weeks out. Fresh Del Monte remains 0/unknown because its production/product scope is unverified. A shared release date is not company-specific intent.
- Timing: existing date bands; exact older go-lives and four explicitly old month-level windows earn 0. No exact day is fabricated. Planned/published/partial module dates remain distinct from completed core go-live, with unresolved recency marked unknown.

All 20 totals are provisional because Reachability remains unresolved. None is claimed to be genuinely Disqualified or artificially promoted to Maybe.

## Results

| Company | Authority | Reachability | Budget | Release | Timing | Total | Status |
|---|---:|---:|---:|---:|---:|---:|---|
| RMIT University | 25 | 0 | 20 | 5 | 0 | 50 | Not Enough Evidence |
| Banner Health | 25 | 0 | 10 | 5 | 0 | 40 | Not Enough Evidence |
| English Schools Foundation | 25 | 0 | 10 | 5 | 0 | 40 | Not Enough Evidence |
| Hilti Aktiengesellschaft | 25 | 0 | 10 | 5 | 0 | 40 | Not Enough Evidence |
| Iowa State University | 25 | 0 | 10 | 5 | 0 | 40 | Not Enough Evidence |
| Mondelēz International | 25 | 0 | 10 | 5 | 0 | 40 | Not Enough Evidence |
| Scandic | 25 | 0 | 10 | 5 | 0 | 40 | Not Enough Evidence |
| Signify | 25 | 0 | 10 | 5 | 0 | 40 | Not Enough Evidence |
| St John of God Health Care | 25 | 0 | 10 | 5 | 0 | 40 | Not Enough Evidence |
| Sun Life | 25 | 0 | 10 | 5 | 0 | 40 | Not Enough Evidence |
| Thermo Fisher Scientific | 25 | 0 | 10 | 5 | 0 | 40 | Not Enough Evidence |
| Bronson Healthcare | 25 | 0 | 0 | 5 | 0 | 30 | Not Enough Evidence |
| First National Bank of Omaha | 25 | 0 | 0 | 5 | 0 | 30 | Not Enough Evidence |
| Jardine Matheson | 25 | 0 | 0 | 5 | 0 | 30 | Not Enough Evidence |
| Memorial Health | 25 | 0 | 0 | 5 | 0 | 30 | Not Enough Evidence |
| Roswell Park Comprehensive Cancer Center | 25 | 0 | 0 | 5 | 0 | 30 | Not Enough Evidence |
| St. Luke's University Health Network | 25 | 0 | 0 | 5 | 0 | 30 | Not Enough Evidence |
| Tokyo Electron | 25 | 0 | 0 | 5 | 0 | 30 | Not Enough Evidence |
| Topcon | 25 | 0 | 0 | 5 | 0 | 30 | Not Enough Evidence |
| Del Monte Fresh Produce Company | 25 | 0 | 0 | 0 | 0 | 25 | Not Enough Evidence |

Every category source and reason is in `src/data/research/first20-scored-20261011.json`; the underlying reviewed facts are in `src/data/research/first20-scoring-facts-20261011.json`. These files contain public professional research, not credentials or inferred private connections.

## Reproduce and validate

```sh
node scripts/score-evidence.mjs src/data/research/first20-scoring-facts-20261011.json first20-assessments.json
node --test tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build --webpack
```

The scoring command is offline: it writes insert-ready rows and performs no database writes. It has a fixed assessment timestamp for reproducibility and deterministic IDs. Save new assessments through the existing reviewed import workflow; preserve earlier assessments and weekly snapshots.

Validation: all 88 tests pass, TypeScript passes, changed-file ESLint passes, and production build succeeds. A pre-existing Windows CSV fixture issue was corrected: trailing carriage returns in the header hid the timing_source field in the demo test. No scoring bands were changed to make the test pass.

Remaining evidence: team/Adi connection and buyer willingness for all 20; present purchase/renewal window and financial review for the partial/unknown Budget rows; exact/recent core timing for unresolved rows; undisclosed Fresh Del Monte module scope. These gaps are recorded rather than guessed.
