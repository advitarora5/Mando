# Screenshot precedence and scope

Authority /25, Reachability /25 and Budget /20 follow attached-rubric.md. User screenshot replaces its Release and Timing instructions. The evaluator and schema remain unchanged.

Timing /15: highest supported signal only. 15 active implementation/migration/significant expansion with milestone next six months; 12 confirmed go-live past six months; 10 dated rollout/expansion past twelve months; 8 relevant HRIS/Workday leadership appointment or employer Workday hiring past twelve months; 5 confirmed ongoing Workday operation without a dated recent trigger; 0 selection alone without schedule or insufficient evidence. Five points indicate operational opportunity, not urgency. Date ranges must fit wholly inside the window; never invent a go-live day.

Release /15: 8 confirmed current customer affected by recurring releases; 10 at 12–18 weeks before next confirmed release; 12 at 6–12 weeks; 15 in that window plus documented testing/preparation; 0 unconfirmed deployment/applicability. At exactly 12 weeks, use the higher applicable band. Estimated calendars do not establish readiness.

43 frozen UUIDs: original first20 and positions105–127, not current ranks. Facts and every independently assessed contact are in facts.json; arithmetic and database-ready rows in assessments.json; per-company before/after review in review.md. New assessments append; company/contact fields, manual insight overrides and weekly snapshots are preserved. Generated why-now receives the new two-sentence rationale, next action and latest summary while factual earlier research is retained. No email verification bonuses are awarded without provenance. Public profiles do not establish messaging permission, introduction willingness or purchase intent.

Reproduce with Node24: node scripts/rescore-team43.mjs. Test: node --test tests/*.test.mjs. SQL generation uses a fresh private Supabase export with scripts/team43-scoring-sql.py; generated backups and SQL stay outside Git. Preview rolls back; apply commits with concurrent-edit guards. This batch does not rewrite the dashboard's automatic ingestion formula.
