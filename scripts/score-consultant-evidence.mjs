import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assessEvidence } from '../src/domain/scoring/evidence-assessment.ts';
import { buildAssessment } from '../src/domain/scoring/assessment.ts';
import { parseEvidence } from '../src/domain/scoring/evidence.ts';
import { displayTier, incompleteCategories } from '../src/domain/scoring/display.ts';
import { consultantReachability, CONSULTANT_REACH_POLICY } from '../src/domain/scoring/consultant-reachability.ts';

// User-authorized Reachability revision: a direct public professional route in general,
// not a proven team/Adi mutual. Authority, Budget, Release and Timing retain session-1 logic.
export const POLICY = CONSULTANT_REACH_POLICY;
export function assessConsultant(company, now) {
  const base = assessEvidence(company.facts, now);
  const route = company.consultant_reachability;
  const reach = consultantReachability(route);
  const entries = Object.fromEntries(['authority', 'reachability', 'budget', 'release', 'timing'].map(category => {
    const evidence = parseEvidence(base.row[`${category}_evidence`]);
    return [category, { score: base.row[`${category}_score`], ...evidence }];
  }));
  entries.reachability = reach;
  const result = buildAssessment(company.facts.company_id, entries);
  if (!result.ok) throw new Error(result.errors.join(' '));
  result.row.rubric_version = `${base.row.rubric_version}:${POLICY}`;
  const states = { ...base.states, reachability: reach.status };
  return { ...result, states };
}

// Importable for tests; CLI stays offline with no database credentials or writes.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/score-consultant-evidence.mjs')) {
  const [input, output, ...extra] = process.argv.slice(2);
  if (!input || !output || extra.length) throw new Error('Usage: node scripts/score-consultant-evidence.mjs facts.json assessments.json');
  const data = JSON.parse(readFileSync(input, 'utf8'));
  const now = new Date(data.assessed_at);
  if (!Number.isFinite(now.getTime()) || !Array.isArray(data.companies)) throw new Error('Valid assessed_at and companies required.');
  const seen = new Set();
  const companies = data.companies.map(company => {
    if (seen.has(company.facts.company_id)) throw new Error('Duplicate company');
    seen.add(company.facts.company_id);
    const result = assessConsultant(company, now);
    const hex = createHash('sha256').update(`${POLICY}:${data.assessed_at}:${JSON.stringify(result.row)}`).digest('hex');
    const id = `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
    return { company_name: company.company_name, row: { id, assessed_at: now.toISOString(), ...result.row }, total: result.total,
      display_tier: displayTier(result.row), category_status: result.states, unresolved_categories: incompleteCategories(result.row) };
  });
  writeFileSync(output, JSON.stringify({ assessed_at: now.toISOString(), policy: POLICY, companies }, null, 2)+'\n');
  console.table(companies.map(c=>({company:c.company_name,reachability:c.row.reachability_score,total:c.total,status:c.display_tier})));
}
