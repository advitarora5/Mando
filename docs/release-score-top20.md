# Top 20 companies and their Release scores

Generated 2026-10-25 from the live scores table (read-only). Latest assessment per company; 154 real companies. Ties share a rank.

| Rank | Company | Total | Release | Tier | Why Release is this value |
|---:|---|---:|---:|---|---|
| 1 | Sanofi | 79 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 2 | RMIT University | 77 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 2 | Scandic | 77 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 4 | Coteccons | 76 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 4 | Signify | 76 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 4 | Sovereign Network Group (SNG) | 76 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 7 | St. Luke's University Health Network | 75 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 8 | Affin Bank | 74 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 8 | Air Liquide | 74 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 8 | Shake Shack | 74 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 11 | Cinemark | 73 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 11 | Land O’Lakes | 73 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 11 | Mondelēz International | 73 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 11 | Thermo Fisher Scientific | 73 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 15 | Fairview Health Services | 72 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 15 | Hungry Jack’s | 72 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 15 | Leonardo | 72 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 15 | SoftwareOne | 72 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 15 | Telstra | 72 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |
| 20 | abrdn | 71 | 8 | Qualified | Baseline 8: confirmed Workday customer, no release preparation evidence |

**20 of the top 20 have a Release score of exactly 8, and 0 of the top 20 have any documented release preparation.** Across all 154 real companies, 141 score 8.

## Release score across all real companies

| Release score | Companies |
|---:|---:|
| 0 | 11 |
| 5 | 2 |
| 8 | 141 |

## Why those scores were given

| Cause | Release | Companies |
|---|---:|---:|
| Baseline 8: confirmed Workday customer, no release preparation evidence | 8 | 141 |
| 0: Workday deployment not confirmed | 0 | 11 |
| Older calendar band (week2-100 rubric): same value for every company on a given day | 5 | 2 |

## What the link behind each 8 is

| Evidence behind the 8 | Companies |
|---|---:|
| Workday customer story (proves the customer, not release preparation) | 103 |
| Other page (employer, newsroom or partner) | 38 |

## Diagnosis

Release is 8 for almost every company because **8 is a baseline given to any confirmed Workday customer**, not a measure of release preparation:

1. `scripts/team-public-rubric.mjs` (`releaseScore`) started every confirmed customer at `let score = 8`, and the pipeline's `releaseFromSignals` in `src/domain/ingestion/pipeline-score.ts` did the same. Higher bands (10 or 15) needed a confirmed release date and documented preparation, so only the baseline was reachable.
2. The next release (2027R1) is not confirmed, so the higher bands are unreachable today; the stored evidence says so itself ("higher windows do not apply", "Calendar estimates do not count").
3. The link behind each 8 is a customer story or employer page that shows the company *uses* Workday. It says nothing about preparing for a release.
4. Result: Release adds the same 8 points to nearly every company, so it does not separate them. It also adds 8 points to totals that have no release proof, which inflates tiers.

The new rule (this branch) removes the baseline: 0 unless the company has documented public preparation **and** a confirmed release 42-126 days out (15 or 10). Stored scores are not rewritten by this change; they change when companies are next scored.


## Impact if the baseline is removed (preview, nothing is rewritten)

Totals only; the tier evidence rules (Authority and Reachability links) are not re-run here.

| Tier | Today | After removing unproven Release points |
|---|---:|---:|
| Qualified (70+) | 32 | 1 |
| Maybe (55+) | 23 | 41 |
| Disqualified | 99 | 112 |

44 of 154 companies would change tier. The top 20 would score 71, 69, 69, 68, 68, 68, 67, 66, 66, 66, 65, 65, 65, 65, 64, 64, 64, 64, 64, 63.


## By rubric version

| Rubric version | Release | Companies |
|---|---:|---:|
| mando-provisional-2026-10-12-v3-qualified70 | 8 | 35 |
| mando-team-70:pipeline-v2 | 8 | 26 |
| mando-settled-rubric-20261012-v1 | 8 | 26 |
| mando-public-evidence-v4:screenshot-timing-release-20261012 | 8 | 22 |
| mando-public-evidence-v4:screenshot-timing-release-20261012:apollo-20261013 | 8 | 20 |
| mando-contact-enrichment-20261013-provider-route-v3 | 8 | 5 |
| mando-provisional-2026-10-12-v3-qualified70 | 0 | 5 |
| mando-settled-rubric-20261012-v1 | 0 | 4 |
| mando-settled-rubric-20261012-provider-route-v2 | 8 | 3 |
| mando-six-company-evidence-followup-20261013-v3 | 8 | 2 |
| week2-100 | 5 | 2 |
| mando-public-evidence-v4:screenshot-timing-release-20261012 | 0 | 1 |
| mando-settled-rubric-20261012-v1:contact-ar-veeraz-20261024 | 0 | 1 |
| mando-settled-rubric-20261013-employer-hiring-v3 | 8 | 1 |
| mando-team-70:pipeline-v2:contact-ar-veeraz-20261024 | 8 | 1 |

## Sample evidence for the top 20

- **Sanofi** (release 8): Evidence: Confirmed current Workday customer subject to recurring feature releases: 8/15. Eight-point applicability baseline is separate from release readiness. Calendar estimates do not count as confirmed dates. Assessm — https://www.workday.com/en-us/customer-stories/q-z/sanofi-improves-workforce-insights-with-real-time-data.html
- **RMIT University** (release 8): Evidence: Confirmed current Workday customer subject to recurring feature releases: 8/15. Eight-point applicability baseline is separate from release readiness. Calendar estimates do not count as confirmed dates. Assessm — https://www.workday.com/en-us/customer-stories/q-z/rmit-leads-with-intelligent-digital-infrastructure.html
- **Scandic** (release 8): Evidence: Confirmed current Workday customer subject to recurring feature releases: 8/15. Eight-point applicability baseline is separate from release readiness. Calendar estimates do not count as confirmed dates. Assessm — https://www.workday.com/en-us/customer-stories/q-z/scandic-standardizes-hr-processes-scales.html
- **Coteccons** (release 8): Evidence: Confirmed operating Workday deployment is affected by recurring releases; 8/15. Higher readiness bands need a confirmed upcoming date and, for 15, testing preparation. — https://www.coteccons.vn/coteccons-tien-phong-trien-khai-nen-tang-quan-tri-nguon-nhan-luc-chuan-quoc-te-workday-cho-hon-4000-nhan-su-nganh-xay-dung/
- **Signify** (release 8): Evidence: Confirmed current Workday customer subject to recurring feature releases: 8/15. Eight-point applicability baseline is separate from release readiness. Calendar estimates do not count as confirmed dates. Assessm — https://www.workday.com/en-us/customer-stories/q-z/signify-illuminates-hr-transformation-with-workday.html
