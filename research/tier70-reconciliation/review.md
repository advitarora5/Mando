# Shared70/55 tiers — reviewed preview and authorized tier-only apply

Branch Avan/shared-tier70-preview; isolated worktree /tmp/mando-tier70 based on fetched origin/main9b7e3a2. Original research branch Avan/companies41-63-research and all local work remain intact. The preview phase made no Supabase writes. The subsequent authorized tier-only apply is documented below; no category scoring/research, merge or deployment occurred.

## Configuration and preserved behavior

Authoritative src/domain/scoring/rubric.ts now uses Qualified70/Maybe55 and week2-100-v2-qualified70. The PM’s main evaluator, invalid-score handling, required Authority/Reachability evidence-status gates, timing-only safeguard and display/Needs Evidence rules are byte-for-byte unchanged. Pipeline labels/colors/badges/layout/filter implementation are unchanged; only threshold hints derive from authoritative values. No database enum/schema changes.

Dashboard list/detail/today’s leads call applyTierRules on the latest row selected by descending assessed_at.localeCompare, ignoring stale stored tiers. The automated evidence and consultant pipelines and assessment-sheet builder use buildAssessment→evaluateTier. Team pipeline now includes the shared rubric version in metadata/deterministic IDs. HTTPS reviewed importer and legacy SQL preparers validate reviewed tiers via the same evaluator instead of trusting frozen80-point outputs. Downstream insight/draft consumers now use the shared evaluation too; none was executed. Weekly snapshot generator/scheduled main workflow already call applyTierRules; no existing snapshot is regenerated.

The dashboard computes tiers, while scores.tier is separately stored. Deploying shared code changes dashboard evaluation for all companies; reconciliation aligns latest stored rows for downstream readers. No claim is made that the deployed UI changed during this local task.

## Exact population

assignment.csv freezes original unsorted records1–127 from research-inputs/companies_rows(1).csv.127unique UUIDs and exact names match all127live company rows;0demos/extra/unmatched/missing companies. The script excludes only known exact demo UUIDs with matching demo names and stops on unexplained extras, identity mismatch or tied latest. Actual live columns are documented in summary.json; no score/tier override column is invented.

## Counts

| Basis | Qualified | Maybe | Numerical Disqualified |
|---|---:|---:|---:|
| Current stored tiers | 2 | 53 | 72 |
| Current main evaluator80/55 | 0 | 55 | 72 |
| Proposed shared evaluator70/55 | 32 | 23 | 72 |

Display-only Needs Evidence remains41; resolved Disqualified remains31. No high-total evidence-gate exception occurs in current live data; boundary tests confirm missing/unknown/partial evidence still blocks qualification at100.32computed tier changes,30stored-tier updates; Johnson Electric and Cinemark already store Qualified. All127rows are in preview.csv.

## Changed companies

| Company | Exact UUID | Latest assessment ID | Total | Current main → new | Stored-tier operation |
|---|---|---|---:|---|---|
| Mondelēz International | 00e6f2f2-171e-5cd9-9776-93e13ac0a3fb | 7655f0ed-2d6d-5e1b-a8f3-d97777620831 | 73 | Maybe → Qualified | tier:Maybe→Qualified |
| Iowa State University | 03e0cd1e-7b4e-516d-98a2-bffb3485dcd2 | c2ad180f-f9be-5ca6-a11e-5c112941d96e | 70 | Maybe → Qualified | tier:Maybe→Qualified |
| Thermo Fisher Scientific | 074b1f36-8d02-5d58-b2c8-864103766afc | eea3d51b-beba-57ec-a58c-40e2e135c896 | 73 | Maybe → Qualified | tier:Maybe→Qualified |
| RMIT University | 0c9a3679-c609-5441-bac6-3e2ecf163a62 | e645a5dd-f1d0-54f9-a0b3-411ce4bf33f3 | 77 | Maybe → Qualified | tier:Maybe→Qualified |
| Jardine Matheson | 0d7ea78d-6376-5f97-b5d8-e16e3783aee9 | 57f6850f-455e-5230-a16f-bef186dc9997 | 70 | Maybe → Qualified | tier:Maybe→Qualified |
| Signify | 15d16044-4b5a-5a79-8fe2-d7a79fe94db0 | fd5ff3bf-6f6f-5528-af54-6d86a46e7acd | 76 | Maybe → Qualified | tier:Maybe→Qualified |
| Scandic | 1d3c6696-d69f-5fdc-b408-2acfe1698038 | 762b0c59-9da9-5c52-a1ba-5a20fed60e02 | 77 | Maybe → Qualified | tier:Maybe→Qualified |
| St. Luke's University Health Network | 1e7ad73f-eea9-55af-9d8c-26b846ffb2ed | 95e007eb-f11d-597f-acab-db0bc8875cef | 75 | Maybe → Qualified | tier:Maybe→Qualified |
| Memorial Health | 22e57648-6b1f-55bd-afc2-348afaccfb25 | c1ca666f-05af-57b5-a324-eebd8803ce72 | 70 | Maybe → Qualified | tier:Maybe→Qualified |
| Hilti Aktiengesellschaft | 2552c597-e93e-5997-9898-20cc3ace9718 | 1b03babd-d47e-59b9-ab01-f57df7b91bbc | 71 | Maybe → Qualified | tier:Maybe→Qualified |
| Johnson Electric | 60231dd9-6c95-525a-b60b-d18137152a73 | 64f79b0a-f14e-5fb4-ad01-d289781d2fc6 | 71 | Maybe → Qualified | No write; already Qualified |
| Fairview Health Services | 6051d8ef-822d-5f9a-aaed-0eeb1b642790 | 7fb02c62-54ab-5672-b9a8-de5a3c9f9683 | 72 | Maybe → Qualified | tier:Maybe→Qualified |
| Cinemark | 61cb52d7-9836-502d-aa20-b696cfac4fa3 | 3df95876-cb35-549c-a560-6584d2139af0 | 73 | Maybe → Qualified | No write; already Qualified |
| abrdn | 7e44bded-da78-545a-ae07-fb8d8d6e8563 | 4bf7e756-a799-5306-a90f-703114dd8d75 | 71 | Maybe → Qualified | tier:Maybe→Qualified |
| Air Liquide | 803efcb6-1347-5ad7-ba39-6051ed1fb5c9 | ea012c1f-62eb-5b45-9970-91161751b450 | 74 | Maybe → Qualified | tier:Maybe→Qualified |
| Coteccons | 8aff5441-b71f-5e78-a688-8c3da840eead | 76cc2da1-d394-5462-bb9b-0e9722fbb6dc | 76 | Maybe → Qualified | tier:Maybe→Qualified |
| Levi Strauss & Co. | 8bfebe9d-91f5-5398-9f22-22a2bc4d9962 | 5463ed10-3e27-51c8-a79b-91397c200a01 | 71 | Maybe → Qualified | tier:Maybe→Qualified |
| Telstra | a5e79ea9-0935-5909-a36d-48600599fb62 | 0d4d6424-dd0b-582e-b8cb-ea679fe611b5 | 72 | Maybe → Qualified | tier:Maybe→Qualified |
| Genpact | acc549f9-c7e3-5db4-8e28-a2e00635bdf1 | 2f62f6e3-3170-552e-aca0-4f021d0c2967 | 70 | Maybe → Qualified | tier:Maybe→Qualified |
| JLL | bc2ae135-27a4-556c-aadd-a7ee06699451 | a35156cc-06ae-516c-aebc-19d939e695e2 | 71 | Maybe → Qualified | tier:Maybe→Qualified |
| Shake Shack | c148a9b2-d440-566f-adbc-30c253387d53 | 30043691-9368-59a4-97f4-42a29dcdca11 | 74 | Maybe → Qualified | tier:Maybe→Qualified |
| Leonardo | c4b2055d-c231-5a32-8246-25335ace9da9 | 3a196520-7f2c-5df8-b16d-799f6303179c | 72 | Maybe → Qualified | tier:Maybe→Qualified |
| Sanofi | d4a07a57-e44e-5c1e-89be-103cf7e621e0 | c40a151c-5fd5-5760-ae27-9155c8233850 | 79 | Maybe → Qualified | tier:Maybe→Qualified |
| Land O’Lakes | d6abfb39-4e7c-5d56-a2e8-3af7afb3c277 | 32241485-6fb2-5b93-a836-74bbbf499951 | 73 | Maybe → Qualified | tier:Maybe→Qualified |
| SoftwareOne | dc448146-ee50-53a2-83bb-b9766eb10394 | 8238fa2d-e711-5209-abdc-70ffbf059cce | 72 | Maybe → Qualified | tier:Maybe→Qualified |
| SS&C Technologies | df141ae3-8162-549f-ba1e-2a4d2c3280b1 | 301ab21b-b18e-59bd-a7f1-f2307f78471e | 71 | Maybe → Qualified | tier:Maybe→Qualified |
| Sovereign Network Group (SNG) | e35a0325-9045-52db-a232-c1e3979f12ca | df7f4a08-4b20-5c56-a900-347f3a19169e | 76 | Maybe → Qualified | tier:Maybe→Qualified |
| Flex | e53f08f9-86da-54fe-b068-f730bd77e256 | 9105a77d-4775-5aef-aadc-2dbb00d040e2 | 70 | Maybe → Qualified | tier:Maybe→Qualified |
| Hungry Jack’s | e57b2dff-84b6-5a94-ada4-c8d0ec2b149d | fb7247de-210b-5825-a72a-5fe510c921da | 72 | Maybe → Qualified | tier:Maybe→Qualified |
| Amadeus | f3f8581b-b489-5a20-a507-0039d20a69d3 | 26f128c5-897c-56f2-af2d-02c19f66e758 | 71 | Maybe → Qualified | tier:Maybe→Qualified |
| Affin Bank | f51f6c35-229a-5f15-8ae1-eae30e5f6dbf | 11f8ce40-b076-5c4a-a960-50d687b1326f | 74 | Maybe → Qualified | tier:Maybe→Qualified |
| Concentrix | fd1944dc-6a8e-5075-bed9-2ae50cad52c5 | 750d6660-3d03-5388-a803-bfdddbc7d760 | 70 | Maybe → Qualified | tier:Maybe→Qualified |

## Manual overrides and history

41companies have nonblank manual insight overrides; see manual-overrides.csv for company UUIDs and field names. Raw values remain in the private baseline and are protected by full-row equality. Actual scores/companies schema has no explicit score/tier override columns. Existing manual category edits are never recomputed; all127category/evidence arrays and original assessment rubric versions are preserved. Any future explicit manual score/tier override is detected and held rather than overwritten.

All411historical assessments and their stored tiers remain unchanged. All144snapshot rows,187contacts,127company rows and127insight rows are protected. Snapshot history reads score total, not score tier; total is unchanged even for snapshot references to a latest row. No snapshots are created/deleted/rewritten.

## Future reconciliation safeguards

Only patch={tier:new_shared_evaluation} for30reviewed latest score UUIDs. No assessment appends, category/evidence edits, contact/company/Why now changes or demo operations. Plan hashes freeze scope, baseline and evaluator; populated overrides are held. Preview/apply refresh full baselines; concurrent score/contact/insight/company/snapshot changes stop the operation. Each score patch uses conditional equality for every original score field and independently reads back the five tables. Retrying preserves already confirmed exact tier patches and makes no duplicate assessment rows.

HTTPS writes are separate requests, not an atomic batch. A new assessment can race between the preflight read and an individual tier write; the independent after-write check detects it and stops, logs partial state, and never performs a blind rollback or bypass. Inspect private backups/logs and re-review conflicting states before retrying. No schema/RPC was introduced.

Raw backups are private0600files outside Git under /tmp/mando-tier70-private. Per-operation log for a future apply: /tmp/mando-tier70-private/tier-reconciliation-operations.jsonl. Before backup: /tmp/mando-tier70-private/review-baseline-2026-10-14T03-21-36-783Z.json

## Commands

Read-only preview of the reviewed plan:

```sh
cd /tmp/mando-tier70
node '--env-file=/Users/avanteuer/Mando 26/Mando-CUBE/.env.local' scripts/reconcile-latest-tiers.mjs --plan research/tier70-reconciliation/import-plan.json
```

Approved apply command (completed; reviewed retries only):

```sh
cd /tmp/mando-tier70
node '--env-file=/Users/avanteuer/Mando 26/Mando-CUBE/.env.local' scripts/reconcile-latest-tiers.mjs --plan research/tier70-reconciliation/import-plan.json --apply
```

This command reconciles stored tiers only. It does not deploy the shared threshold code; deployed dashboard behavior remains on its existing evaluator until the team adopts/deploys this branch. Any reviewed retry rechecks the baseline and writes fresh preapply/postapply backups.

## Validation

149tests pass, including inclusive54/55/69/70/100 boundaries, required evidence at100, invalid scores, pipeline-filter parity, manual overrides, ambiguous populations/latest ties, conditional race checks, snapshot/history preservation and mocked lost-response retry. TypeScript and production build pass. The exact live joined dashboard query selects the same127latest IDs and shares evaluated tiers with the preview; see dashboard-verification.json. No deployed UI browser session or category scoring was run.

## Final read-only preflight

Fresh live records match the frozen reviewed baseline;30pending tier-only changes,0already applied,0conflicts/holds. The127-company joined dashboard selection agrees with the plan. Supabase writes remain0. Private preflight backup: /tmp/mando-tier70-private/preflight-2026-10-14T03-24-15-177Z.json

## Authorized apply and independent read-back —2026-10-14UTC

The user subsequently approved the reviewed tier-only plan. A fresh preflight matched the reviewed baseline, followed by a fresh preapply private backup. Exactly30conditional scores.tier updates were applied on the30reviewed latest assessment IDs; every change was Maybe→Qualified.0held,0failed,0conflicts,0partial completion. No assessment inserts/deletes, category score/evidence/rubric_version/timestamp changes, contact/fact/Why now changes or snapshot changes occurred. Earlier preview-only statements describe the phase before this authorization.

Independent HTTPS read-back confirmed all30tier patches, every other field of all538assessments unchanged, all411historical assessments and144snapshot rows preserved. All187contacts,127company rows and127insight rows/manual overrides match the original baseline exactly. Latest IDs did not change. Stored/current70evaluator counts now Qualified32/Maybe23/numericalDisqualified72; display adds the unchanged split NeedsEvidence41/resolvedDisqualified31. applied-changes.csv lists each exact company and assessment UUID, old/new tier and unchanged total.

The dashboard’s live joined data-selection query matches all127latest assessments. Its currently deployed80-point evaluator may continue to compute different labels; **this PR must be merged and deployed before the live dashboard consistently computes70/55**. This task does not merge or deploy. Category scoring/research was never rerun.

Fresh preapply backup: /tmp/mando-tier70-private/preapply-2026-10-14T03-33-08-399Z.json
Postapply backup: /tmp/mando-tier70-private/postapply-2026-10-14T03-33-40-370Z.json
Independent read-back backup: /tmp/mando-tier70-private/independent-readback-2026-10-14T03-35-00-783Z.json
Operation log: /tmp/mando-tier70-private/tier-reconciliation-operations.jsonl

These files are0600/private and outside Git. All30operations have confirmed log entries. Separate HTTPS writes were non-atomic; no failures required recovery. The committed plan is an audit/retry record tied to this machine’s private reviewed baseline, not a portable instruction to repeat unreviewed writes. From the worktree root, the read-only --plan command now reports30already_done and0pending if the live baseline remains unchanged.
