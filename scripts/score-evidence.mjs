import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { assessEvidence, EVIDENCE_POLICY_VERSION } from "../src/domain/scoring/evidence-assessment.ts";
import { displayTier, incompleteCategories } from "../src/domain/scoring/display.ts";

// Offline and reproducible: reads researched facts, calls the shared engine, writes insert-ready
// assessment rows. No database credentials or automatic database writes.
const [input, output, ...extra] = process.argv.slice(2);
if (!input || !output || extra.length) throw new Error("Usage: node scripts/score-evidence.mjs researched-facts.json assessments.json");
const data = JSON.parse(readFileSync(input, "utf8"));
const now = new Date(data.assessed_at);
if (!Number.isFinite(now.getTime()) || !Array.isArray(data.companies)) throw new Error("An assessed_at timestamp and companies array are required.");
const seen = new Set();
const companies = data.companies.map(company => {
  const { facts } = company;
  if (seen.has(facts.company_id)) throw new Error(`Duplicate company ${facts.company_id}`);
  seen.add(facts.company_id);
  const result = assessEvidence(facts, now);
  const hex = createHash("sha256").update(`${EVIDENCE_POLICY_VERSION}:${data.assessed_at}:${JSON.stringify(result.row)}`).digest("hex");
  const id = `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
  return { company_name: company.company_name, row: { id, assessed_at: now.toISOString(), ...result.row }, total: result.total,
    display_tier: displayTier(result.row), category_status: result.states, unresolved_categories: incompleteCategories(result.row) };
});
writeFileSync(output, JSON.stringify({ assessed_at: now.toISOString(), policy: EVIDENCE_POLICY_VERSION, companies }, null, 2)+"\n");
console.table(companies.map(c=>({company:c.company_name,authority:c.row.authority_score,reachability:c.row.reachability_score,budget:c.row.budget_score,release:c.row.release_score,timing:c.row.timing_score,total:c.total,status:c.display_tier})));
