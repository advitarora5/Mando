// Read-only report: the top 20 companies by latest total score, their Release scores, and why most show 8.
// Reads Supabase only (never writes). Usage: node --env-file=.env.local scripts/top20-release.mjs [--out docs/release-score-top20.md]
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Configure database credentials in .env.local first.");
const outIndex = process.argv.indexOf("--out");
const out = outIndex > 0 ? process.argv[outIndex + 1] : null;
const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function all(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).order("id").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const companies = await all("companies", "id, name");
const scores = await all("scores", "id, company_id, assessed_at, rubric_version, authority_score, reachability_score, budget_score, release_score, timing_score, total, tier, release_evidence");
const name = new Map(companies.map(c => [c.id, c.name]));
const latest = new Map();
for (const s of scores) {
  const current = latest.get(s.company_id);
  if (!current || s.assessed_at > current.assessed_at) latest.set(s.company_id, s);
}

const isDemo = id => /^Demo Company \d+$/.test(name.get(id) ?? "");
const real = [...latest.values()].filter(s => !isDemo(s.company_id));
const ranked = real.toSorted((a, b) => b.total - a.total || (name.get(a.company_id) ?? "").localeCompare(name.get(b.company_id) ?? ""));
let rank = 0, previous = null;
ranked.forEach((s, i) => { if (s.total !== previous) rank = i + 1; previous = s.total; s.rank = rank; });

// The text after the first " | " is the one-line reason; evidence with no link is just the reason.
const reasonOf = e => { const i = (e ?? "").indexOf(" | "); return (i >= 0 ? e.slice(i + 3) : e ?? "").replace(/\s+/g, " ").trim(); };
const urlOf = e => { const i = (e ?? "").indexOf(" | "); return i >= 0 ? e.slice(0, i) : ""; };
// Collapse a score into its cause. Boilerplate such as "for 15, testing preparation" is NOT proof of preparation;
// real proof is a score above 8 or the new rule's "Publicly preparing" wording.
const hasProof = s => s.release_score > 8 || /Publicly preparing for/i.test(reasonOf(s.release_evidence));
function cause(s) {
  if (hasProof(s)) return "Documented public preparation for a confirmed release";
  if (s.release_score === 8) return "Baseline 8: confirmed Workday customer, no release preparation evidence";
  if (s.release_score === 5) return "Older calendar band (week2-100 rubric): same value for every company on a given day";
  if (s.release_score === 0) return "0: Workday deployment not confirmed";
  return `Other: ${reasonOf(s.release_evidence).slice(0, 90)}`;
}
const evidenceKind = s => /workday\.com\/en-us\/customer-stories/i.test(urlOf(s.release_evidence)) ? "Workday customer story (proves the customer, not release preparation)" : urlOf(s.release_evidence) ? "Other page (employer, newsroom or partner)" : "No link";

const top = ranked.slice(0, 20);
const dist = new Map();
for (const s of real) dist.set(s.release_score, (dist.get(s.release_score) ?? 0) + 1);
const causes = new Map();
for (const s of real) { const key = `${cause(s)} | release ${s.release_score}`; causes.set(key, (causes.get(key) ?? 0) + 1); }
const versions = new Map();
for (const s of real) { const key = `${s.rubric_version} | release ${s.release_score}`; versions.set(key, (versions.get(key) ?? 0) + 1); }
const topWith8 = top.filter(s => s.release_score === 8).length;
const topWithProof = top.filter(hasProof).length;
const allWith8 = real.filter(s => s.release_score === 8).length;
const kinds = new Map();
for (const s of real.filter(s => s.release_score === 8)) { const k = evidenceKind(s); kinds.set(k, (kinds.get(k) ?? 0) + 1); }
const cell = v => String(v ?? "").replace(/\|/g, "/");

const lines = [];
lines.push("# Top 20 companies and their Release scores", "");
lines.push(`Generated ${new Date().toISOString().slice(0, 10)} from the live scores table (read-only). Latest assessment per company; ${real.length} real companies${latest.size - real.length ? `, ${latest.size - real.length} demo companies excluded` : ""}. Ties share a rank.`, "");
lines.push("| Rank | Company | Total | Release | Tier | Why Release is this value |", "|---:|---|---:|---:|---|---|");
for (const s of top) lines.push(`| ${s.rank} | ${cell(name.get(s.company_id))} | ${s.total} | ${s.release_score} | ${s.tier} | ${cell(cause(s))} |`);
lines.push("", `**${topWith8} of the top 20 have a Release score of exactly 8, and ${topWithProof} of the top 20 have any documented release preparation.** Across all ${real.length} real companies, ${allWith8} score 8.`, "");
lines.push("## Release score across all real companies", "", "| Release score | Companies |", "|---:|---:|");
for (const [score, count] of [...dist].sort((a, b) => a[0] - b[0])) lines.push(`| ${score} | ${count} |`);
lines.push("", "## Why those scores were given", "", "| Cause | Release | Companies |", "|---|---:|---:|");
for (const [key, count] of [...causes].sort((a, b) => b[1] - a[1])) { const [c, r] = key.split(" | release "); lines.push(`| ${cell(c)} | ${r} | ${count} |`); }
lines.push("", "## What the link behind each 8 is", "", "| Evidence behind the 8 | Companies |", "|---|---:|");
for (const [k, count] of [...kinds].sort((a, b) => b[1] - a[1])) lines.push(`| ${cell(k)} | ${count} |`);
lines.push("", "## Diagnosis", "",
  "Release is 8 for almost every company because **8 is a baseline given to any confirmed Workday customer**, not a measure of release preparation:",
  "",
  "1. `scripts/team-public-rubric.mjs` (`releaseScore`) started every confirmed customer at `let score = 8`, and the pipeline's `releaseFromSignals` in `src/domain/ingestion/pipeline-score.ts` did the same. Higher bands (10 or 15) needed a confirmed release date and documented preparation, so only the baseline was reachable.",
  "2. The next release (2027R1) is not confirmed, so the higher bands are unreachable today; the stored evidence says so itself (\"higher windows do not apply\", \"Calendar estimates do not count\").",
  "3. The link behind each 8 is a customer story or employer page that shows the company *uses* Workday. It says nothing about preparing for a release.",
  "4. Result: Release adds the same 8 points to nearly every company, so it does not separate them. It also adds 8 points to totals that have no release proof, which inflates tiers.",
  "",
  "The new rule (this branch) removes the baseline: 0 unless the company has documented public preparation **and** a confirmed release 42-126 days out (15 or 10). Stored scores are not rewritten by this change; they change when companies are next scored.", "");
// Impact preview: drop the baseline 8 from every row that has no release proof; tiers use the shared 70/55 thresholds on totals only.
const tierOf = total => total >= 70 ? "Qualified" : total >= 55 ? "Maybe" : "Disqualified";
const after = real.map(s => ({ s, total: hasProof(s) ? s.total : s.total - s.release_score }));
const count = (rows, f) => ["Qualified", "Maybe", "Disqualified"].map(t => rows.filter(r => tierOf(f(r)) === t).length);
const [qb, mb, db_] = count(after, r => r.s.total), [qa, ma, da] = count(after, r => r.total);
const dropped = after.filter(r => tierOf(r.total) !== tierOf(r.s.total)).length;
lines.push("", "## Impact if the baseline is removed (preview, nothing is rewritten)", "",
  "Totals only; the tier evidence rules (Authority and Reachability links) are not re-run here.", "",
  "| Tier | Today | After removing unproven Release points |", "|---|---:|---:|",
  `| Qualified (70+) | ${qb} | ${qa} |`, `| Maybe (55+) | ${mb} | ${ma} |`, `| Disqualified | ${db_} | ${da} |`, "",
  `${dropped} of ${real.length} companies would change tier. The top 20 would score ${top.map(s => hasProof(s) ? s.total : s.total - s.release_score).join(", ")}.`, "");
lines.push("", "## By rubric version", "", "| Rubric version | Release | Companies |", "|---|---:|---:|");
for (const [key, count] of [...versions].sort((a, b) => b[1] - a[1])) { const [v, r] = key.split(" | release "); lines.push(`| ${cell(v)} | ${r} | ${count} |`); }
lines.push("", "## Sample evidence for the top 20", "");
for (const s of top.slice(0, 5)) lines.push(`- **${name.get(s.company_id)}** (release ${s.release_score}): ${reasonOf(s.release_evidence).slice(0, 220) || "no evidence recorded"}${urlOf(s.release_evidence) ? ` — ${urlOf(s.release_evidence)}` : ""}`);
const text = lines.join("\n") + "\n";
if (out) { writeFileSync(out, text); console.log(`Wrote ${out}`); }
console.log(text);
