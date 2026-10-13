import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, normalizeDomain, isSimilarName, nameSimilarity, tenantCandidates } from '../../src/domain/ingestion/normalize.ts';
import { canonicalJson, contentFingerprint, paidCallKey } from '../../src/domain/ingestion/fingerprint.ts';
import { verifyQuote, htmlToText } from '../../src/domain/ingestion/quote.ts';
import { groundExtraction } from '../../src/domain/ingestion/extraction-schema.ts';
import { decideMatch, sizeLabel, isExcludedCompany } from '../../src/domain/ingestion/matching.ts';
import { classifyTitle } from '../../src/domain/ingestion/titles.ts';
import { canSpend, sessionSpend } from '../../src/domain/ingestion/budget.ts';
import { hiringStrength } from '../../src/pipeline/extract.ts';
import { scoreCompany, authorityFromContacts, reachabilityFromContacts, budgetFromSignals, releaseFromSignals, timingFromSignals } from '../../src/domain/ingestion/pipeline-score.ts';
import { defaultSettings, isSignalFresh } from '../../src/domain/ingestion/settings.ts';
import { displayTier, NEEDS_EVIDENCE } from '../../src/domain/scoring/display.ts';
import { tierForTotal } from '../../src/domain/scoring/rubric.ts';

const NOW = new Date('2026-10-13T12:00:00Z');
const sig = (type, extra = {}) => ({ type, signal_date: null, source_url: `https://example.com/${type}`, quote: `evidence for ${type} here`, confidence: 0.9, first_seen_at: '2026-10-12T00:00:00Z', last_seen_at: '2026-10-12T00:00:00Z', project_type: null, ...extra });
const contact = extra => ({ name: 'Pat Lee', title: 'Director, HRIS', source: 'https://www.linkedin.com/in/pat', linkedin_url: 'https://www.linkedin.com/in/pat', email: null, email_status: null, phone: null, phone_status: null, mutual_connection: null, ...extra });

// ---------- normalization and dedupe ----------

test('names normalize legal suffixes, punctuation, case and SEC state tags', () => {
  assert.equal(normalizeName('NVIDIA CORP'), 'nvidia');
  assert.equal(normalizeName("Land O'Lakes, Inc."), 'land olakes');
  assert.equal(normalizeName('BROOKFIELD Corp /ON/'), 'brookfield');
  assert.equal(normalizeName('AT&T Inc.'), 'at and t');
  assert.equal(normalizeName('Société Générale SA'), 'societe generale');
  assert.equal(normalizeName('The Group'), 'the group', 'a name made only of filler words is kept');
});

test('websites normalize to a bare host; non-hosts are null', () => {
  assert.equal(normalizeDomain('https://www.Example.com/careers?x=1'), 'example.com');
  assert.equal(normalizeDomain('example.co.uk'), 'example.co.uk');
  assert.equal(normalizeDomain('WWW2.example.com'), 'example.com');
  assert.equal(normalizeDomain('not a domain'), null);
  assert.equal(normalizeDomain(''), null);
});

test('similar names: equal, whole-word prefix, or close spelling; different companies are not similar', () => {
  assert.ok(isSimilarName('Brookfield', 'Brookfield Asset Management'));
  assert.ok(isSimilarName('Marsh & McLennan Companies', 'Marsh and Mclennan'));
  assert.ok(isSimilarName('Rochester Regional Health', 'Rochester Regional Health System') );
  assert.ok(!isSimilarName('Target', 'Targa Resources'));
  assert.ok(!isSimilarName('Apple', 'Applied Materials'));
  assert.ok(nameSimilarity('abc', 'abc') === 1 && nameSimilarity('', 'x') === 0);
});

test('tenant candidates: full name first, first word only when it is distinctive', () => {
  assert.deepEqual(tenantCandidates('Marsh & McLennan Companies, Inc.').map(c => c.tenant), ['marshandmclennan', 'marsh']);
  assert.deepEqual(tenantCandidates('3M CO').map(c => c.tenant), ['3m']);
  assert.deepEqual(tenantCandidates('American Express Co').map(c => c.tenant), ['americanexpress']);
});

test('matching: exact website merges, similar name and missing website go to review, trusted new company is created', () => {
  const known = [{ id: 'c1', name: 'Brookfield Corporation', domain: 'brookfield.com' }];
  const base = { domain_confirmed: true, best_confidence: 0.95 };
  assert.deepEqual(decideMatch({ ...base, name: 'Totally Different', domain: 'https://www.brookfield.com' }, known, { canCreate: true }).action, 'attach');
  const similar = decideMatch({ ...base, name: 'Brookfield Corp', domain: 'brookfieldproperties.com' }, known, { canCreate: true });
  assert.equal(similar.action, 'review'); assert.equal(similar.reason, 'similar_name'); assert.equal(similar.suggested_company_id, 'c1');
  assert.equal(decideMatch({ ...base, name: 'Newco', domain: null }, known, { canCreate: true }).reason, 'no_website');
  assert.equal(decideMatch({ ...base, name: 'Newco', domain: 'newco.com', domain_confirmed: false }, known, { canCreate: true }).reason, 'no_website');
  assert.equal(decideMatch({ ...base, name: 'Newco', domain: 'newco.com', best_confidence: 0.6 }, known, { canCreate: true }).reason, 'untrusted_signal');
  assert.equal(decideMatch({ ...base, name: 'Newco', domain: 'newco.com' }, known, { canCreate: false }).reason, 'over_run_cap');
  assert.equal(decideMatch({ ...base, name: 'Newco', domain: 'newco.com' }, known, { canCreate: true }).action, 'create');
});

test('regression: Workday itself (the vendor) is never a lead, under any spelling', () => {
  const base = { domain: 'workday.com', domain_confirmed: true, best_confidence: 0.95 };
  for (const name of ['Workday, Inc.', 'WORKDAY INC', 'Workday']) {
    const decision = decideMatch({ ...base, name }, [], { canCreate: true });
    assert.equal(decision.action, 'skip', name);
  }
  assert.ok(isExcludedCompany('Workday, Inc.') && !isExcludedCompany('Workday Payroll Partners of Ohio'));
});

test('size: under 3,000 is labelled, not blocked; unknown size says so', () => {
  assert.equal(sizeLabel(null), 'size unknown');
  assert.match(sizeLabel(1200), /under 3,000/);
  assert.equal(sizeLabel(45000), '45,000 employees');
});

// ---------- fingerprints and quotes ----------

test('fingerprints ignore key order and listed volatile keys, but not content changes', () => {
  assert.equal(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] }), '{"a":[2,{"c":2,"d":1}],"b":1}');
  const a = contentFingerprint('{"x":1,"postedOn":"Posted Today"}', ['postedOn']);
  assert.equal(a, contentFingerprint('{"postedOn":"Posted 3 Days Ago","x":1}', ['postedOn']));
  assert.notEqual(a, contentFingerprint('{"x":2,"postedOn":"Posted Today"}', ['postedOn']));
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(contentFingerprint('a\r\nb'), contentFingerprint('a\nb'), 'line endings do not change a text fingerprint');
  assert.equal(paidCallKey('treg', 'email', 'ABC '), paidCallKey('treg', 'email', 'abc'));
});

test('quotes must be verbatim; only whitespace and quote/dash typography are forgiven; stored quote is the exact span', () => {
  const source = 'We are rolling out   “Workday HCM” in Q1 2027 — across all regions.';
  const ok = verifyQuote('rolling out "Workday HCM" in Q1 2027 - across', source);
  assert.ok(ok.ok); assert.equal(ok.quote, 'rolling out   “Workday HCM” in Q1 2027 — across'); assert.ok(source.includes(ok.quote));
  assert.equal(verifyQuote('rolling out Workday Financials in Q1', source).ok, false);
  assert.equal(verifyQuote('Rolling Out "Workday HCM"', source).ok, false, 'case must match');
  assert.equal(verifyQuote('Workday HCM', source).ok, false, 'too short');
  assert.equal(verifyQuote('', source).ok, false);
});

test('HTML job descriptions become plain text with entities decoded', () => {
  const text = htmlToText('<p>Lead the <b>Workday</b> rollout &amp; testing.</p><ul><li>Own R1/R2</li></ul><script>x()</script>');
  assert.match(text, /Lead the Workday rollout & testing\./);
  assert.match(text, /- Own R1\/R2/);
  assert.doesNotMatch(text, /x\(\)/);
});

test('grounding drops non-verbatim quotes and clears values that are not in the text', () => {
  const text = 'Acme Corp is hiring a Workday HCM analyst to support the active implementation of Workday Payroll.';
  const checked = groundExtraction({
    company_name: 'Acme Corp', workday_products: ['Workday Payroll', 'Workday Adaptive Planning'], project_type: 'implementation', role_seniority: 'individual',
    timing_words: ['next quarter'], signals: [
      { type: 'hiring', quote: 'hiring a Workday HCM analyst to support the active implementation', date_text: null },
      { type: 'go_live', quote: 'Acme went live on Workday in March 2026', date_text: 'March 2026' },
    ],
  }, text);
  assert.deepEqual(checked.output.workday_products, ['Workday Payroll']);
  assert.deepEqual(checked.output.timing_words, []);
  assert.equal(checked.signals.length, 1);
  assert.equal(checked.dropped.length, 3);
  assert.equal(groundExtraction({ company_name: 'Globex', workday_products: [], project_type: null, role_seniority: null, timing_words: [], signals: [] }, text).output.company_name, null);
});

test('regression (round 1): with type checks, a signal whose quote does not support its type is dropped', () => {
  const text = 'Partner with the HRIS team to implement, test, and define requirements for Workday performance modules. Experience leading APAC HR operations in a hyper-growth company.';
  const out = { company_name: null, workday_products: [], project_type: null, role_seniority: null, timing_words: [], signals: [
    { type: 'go_live', quote: 'implement, test, and define requirements for Workday performance modules', date_text: null },
    { type: 'known_customer', quote: 'Experience leading APAC HR operations in a hyper-growth company', date_text: null },
    { type: 'release_planning', quote: 'implement, test, and define requirements for Workday performance modules', date_text: null },
  ] };
  const loose = groundExtraction(out, text);
  assert.equal(loose.signals.length, 3, 'extract-v1 grounding keeps verbatim quotes of any type');
  const strict = groundExtraction(out, text, { typeEvidence: true });
  assert.deepEqual(strict.signals.map(s => s.type), []);
  assert.ok(strict.dropped.every(d => /does not support/.test(d.reason)));
  const ok = groundExtraction({ ...out, signals: [{ type: 'go_live', quote: 'The HCM, FIN and Payroll implementation went live successfully in July 2024', date_text: 'July 2024' }] }, 'The HCM, FIN and Payroll implementation went live successfully in July 2024.', { typeEvidence: true });
  assert.equal(ok.signals.length, 1);
});

test('regression (round 1): a posting that only lists Workday as a skill is a weaker hiring signal than a Workday role', () => {
  assert.equal(hiringStrength('Compensation Business Partner', '- Expertise with analytics, Excel, PowerPoint, and Workday'), 'skill');
  assert.equal(hiringStrength('Sr Engineer - Workday', 'You will prototype, design, build, and support features in Workday.'), 'role');
  assert.equal(hiringStrength('Compensation Analyst', '- Workday Optimization: Partner with the HRIS/Systems team to implement, test, and define requirements for Workday performance and compensation modules'), 'role');
  const skill = timingFromSignals([sig('hiring', { signal_date: '2026-10-13', confidence: 0.6 })], NOW).score;
  const role = timingFromSignals([sig('hiring', { signal_date: '2026-10-13', confidence: 0.9 })], NOW).score;
  assert.ok(skill < role, `${skill} < ${role}`);
  assert.ok(budgetFromSignals([sig('hiring', { confidence: 0.6 })]).score < budgetFromSignals([sig('hiring', { confidence: 0.9 })]).score);
});

// ---------- freshness and decay ----------

test('signals older than 14 days drop out of the score; go-live keeps its date bands', () => {
  const stale = sig('hiring', { last_seen_at: '2026-09-28T11:00:00Z', signal_date: '2026-09-25' });
  assert.equal(isSignalFresh(stale, defaultSettings, NOW), false);
  const fresh = scoreCompany('c', [sig('hiring', { signal_date: '2026-10-10' })], [], defaultSettings, NOW);
  const expired = scoreCompany('c', [stale], [], defaultSettings, NOW);
  assert.ok(fresh.result.row.timing_score > 0);
  assert.equal(expired.result.row.timing_score, 0);
  assert.match(expired.result.row.timing_evidence, /Needs evidence/);
  const goLive = scoreCompany('c', [sig('go_live', { signal_date: '2026-08-01', last_seen_at: '2025-01-01T00:00:00Z' })], [], defaultSettings, NOW);
  assert.equal(goLive.result.row.timing_score, 15, '73 days after go-live is the 31-90 day band');
});

test('hiring timing decays with posting age and is higher for an active Workday project', () => {
  const at = date => timingFromSignals([sig('hiring', { signal_date: date })], NOW).score;
  assert.equal(at('2026-10-13'), 8);
  assert.ok(at('2026-09-13') < at('2026-10-13'));
  assert.equal(at('2025-01-01'), Math.round(8 * 0.4), 'old postings floor at 40%');
  assert.equal(timingFromSignals([sig('hiring', { signal_date: '2026-10-13', project_type: 'implementation' })], NOW).score, 10);
  assert.equal(timingFromSignals([sig('event')], NOW).score, 5);
  assert.equal(timingFromSignals([], NOW).status, 'unknown');
});

// ---------- scoring rules ----------

test('no evidence is "Needs evidence" (status unknown, no URL), never a silent 0 or Disqualified on screen', () => {
  const a = scoreCompany('c', [], [], defaultSettings, NOW);
  assert.ok(a.result.ok);
  for (const cat of ['authority', 'reachability', 'budget', 'release', 'timing']) {
    assert.equal(a.result.row[`${cat}_score`], 0);
    assert.match(a.result.row[`${cat}_evidence`], /^Assessment status: unknown\. Needs evidence: /);
    assert.doesNotMatch(a.result.row[`${cat}_evidence`], /https?:/);
  }
  assert.equal(displayTier(a.result.row), NEEDS_EVIDENCE);
});

test('every awarded point carries a source link and a one-line reason', () => {
  const a = scoreCompany('c', [sig('known_customer'), sig('hiring', { signal_date: '2026-10-10', project_type: 'release_testing' }), sig('budget_clue')], [contact()], defaultSettings, NOW);
  for (const cat of ['authority', 'reachability', 'budget', 'release', 'timing']) {
    if (a.result.row[`${cat}_score`] > 0) assert.match(a.result.row[`${cat}_evidence`], /^https?:\/\/\S+ \| Assessment status: (met|partial|not_met)\. .+/, cat);
    assert.doesNotMatch(a.result.row[`${cat}_evidence`], /\n/, `${cat} reason is one line`);
  }
  assert.equal(a.result.row.rubric_version, 'week2-100:pipeline-v1');
});

test('authority: function 0-10 + seniority 0-8 + owns Workday 0-4 + coverage 0-3, capped at 25 and at 5 for an unrelated function', () => {
  const vp = authorityFromContacts([contact({ title: 'VP, HRIS and Workday' })]);
  assert.deepEqual(vp.detail, { functional: 10, seniority: 6, owns_workday: 4, coverage: 1 });
  assert.equal(vp.score, 21);
  const team = authorityFromContacts([contact({ title: 'Chief People Officer, Workday HRIS' }), contact({ title: 'HRIS Manager' }), contact({ title: 'HR Director' }), contact({ title: 'IT Director' })]);
  assert.equal(team.score, 25, 'capped at 25');
  const unrelated = authorityFromContacts([contact({ title: 'Chief Marketing Officer' })]);
  assert.equal(unrelated.score, 5); assert.equal(unrelated.status, 'partial');
  assert.equal(authorityFromContacts([]).status, 'unknown');
  assert.equal(authorityFromContacts([contact({ source: null, linkedin_url: null })]).status, 'unknown', 'a contact without a source link earns nothing');
});

test('reachability: verified channel 0-9 + warm path 0-8 + conviction 0-8 from contact-level evidence only', () => {
  assert.equal(reachabilityFromContacts([contact({ email: 'p@x.com', email_status: 'valid' })]).score, 9);
  assert.equal(reachabilityFromContacts([contact({ email: 'p@x.com', email_status: 'risky' })]).score, 4, 'LinkedIn 4 beats an unverified email 3');
  assert.equal(reachabilityFromContacts([contact({ linkedin_url: null, email: 'p@x.com', email_status: 'risky' })]).score, 3);
  assert.equal(reachabilityFromContacts([contact({ email: 'p@x.com', email_status: 'valid', mutual_connection: 'Adi', conviction: { source: 'https://talk.example', reason: 'Spoke at Workday Rising' } })]).score, 25);
  assert.equal(reachabilityFromContacts([]).status, 'unknown');
});

test('budget: best adjacent-purchase signal of each kind, summed and capped at 20', () => {
  assert.equal(budgetFromSignals([sig('budget_clue')]).score, 10);
  assert.equal(budgetFromSignals([sig('budget_clue', { confidence: 0.6 })]).score, 6);
  assert.equal(budgetFromSignals([sig('budget_clue'), sig('hiring', { project_type: 'implementation' }), sig('hiring'), sig('known_customer')]).score, 20);
  assert.equal(budgetFromSignals([sig('known_customer')]).status, 'partial');
  assert.equal(budgetFromSignals([]).status, 'unknown');
});

test('release: only release-planning signals earn calendar points; a customer alone is low neutral; nothing is Needs evidence', () => {
  const planned = releaseFromSignals([sig('release_planning')], NOW);
  assert.ok(planned.score >= 3 && planned.score <= 15); assert.equal(planned.status, 'met');
  assert.equal(releaseFromSignals([sig('hiring', { project_type: 'release_testing' })], NOW).status, 'met');
  assert.equal(releaseFromSignals([sig('known_customer')], NOW).score, 3);
  assert.equal(releaseFromSignals([], NOW).status, 'unknown');
});

test('scores spread across companies with different evidence', () => {
  const totals = [
    [], [sig('known_customer')], [sig('known_customer'), sig('hiring', { signal_date: '2026-10-01' })],
    [sig('known_customer'), sig('hiring', { signal_date: '2026-10-12', project_type: 'implementation' }), sig('budget_clue')],
    [sig('release_planning'), sig('go_live', { signal_date: '2026-08-15' }), sig('budget_clue')],
  ].map(signals => scoreCompany('c', signals, [], defaultSettings, NOW).result.total);
  assert.equal(new Set(totals).size, totals.length, `totals ${totals}`);
});

test('tier thresholds 80 / 55 and ready-for-contacts at Budget + Release + Timing >= 25', () => {
  assert.deepEqual([80, 79, 55, 54].map(tierForTotal), ['Qualified', 'Maybe', 'Maybe', 'Disqualified']);
  const ready = scoreCompany('c', [sig('budget_clue'), sig('hiring', { signal_date: '2026-10-13', project_type: 'implementation' }), sig('release_planning')], [], defaultSettings, NOW);
  assert.equal(ready.ready_for_contacts, ready.result.row.budget_score + ready.result.row.release_score + ready.result.row.timing_score >= 25);
  assert.ok(ready.ready_for_contacts);
  assert.equal(scoreCompany('c', [sig('known_customer')], [], defaultSettings, NOW).ready_for_contacts, false);
});

// ---------- titles and budget ----------

test('contact titles: function, seniority and Workday ownership come from the title text only', () => {
  assert.deepEqual(classifyTitle('Senior Director, HRIS'), { functional: 10, functionLabel: 'HR systems / Workday', seniority: 5, seniorityLabel: 'Director', ownsWorkday: 2 });
  assert.equal(classifyTitle('VP Enterprise Applications').functional, 9);
  assert.equal(classifyTitle('Chief Human Resources Officer').seniority, 8);
  assert.equal(classifyTitle('Workday Payroll Analyst').ownsWorkday, 4);
  assert.equal(classifyTitle('IT Operations Manager').functional, 6);
  assert.deepEqual([classifyTitle('Plant Manager').functional, classifyTitle(null).seniority], [0, 0]);
});

test('ledger math: spent + worst case must stay under the cap and the known balance; free calls always pass', () => {
  const entries = [{ session: 's', cost_usd: 0.3 }, { session: 's', cost_usd: 0.15 }, { session: 'other', cost_usd: 9 }];
  assert.equal(sessionSpend(entries, 's'), 0.45);
  assert.equal(canSpend({ spent: 0.45, capUsd: 0.5, worstCaseUsd: 0.05 }).ok, true);
  assert.equal(canSpend({ spent: 0.45, capUsd: 0.5, worstCaseUsd: 0.051 }).ok, false);
  assert.equal(canSpend({ spent: 0, capUsd: 0.5, worstCaseUsd: 0.05, balanceUsd: 0.04 }).ok, false, 'balance below the cap binds');
  assert.equal(canSpend({ spent: 0, capUsd: 0, worstCaseUsd: 0.01 }).ok, false);
  assert.equal(canSpend({ spent: 0, capUsd: 0, worstCaseUsd: 0 }).ok, true);
  assert.equal(canSpend({ spent: 0, capUsd: 1, worstCaseUsd: NaN }).ok, false);
});

test('regression: no control characters (e.g. a backspace that silently replaced a regex \b) in pipeline source files', async () => {
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const walk = dir => readdirSync(dir).flatMap(name => { const p = join(dir, name); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const files = ['src/pipeline', 'src/domain/ingestion', 'scripts', 'tests/ingestion'].flatMap(walk).filter(f => /\.(ts|mjs|md)$/.test(f));
  const bad = files.filter(f => /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(bad, []);
});

test('regression (round 1): display names keep acronyms and legal suffixes readable', async () => {
  const { displayName } = await import('../../src/pipeline/stages.ts');
  assert.equal(displayName('ASML HOLDING NV', null), 'ASML Holding NV');
  assert.equal(displayName('MARSH & MCLENNAN COMPANIES, INC.', null), 'Marsh & Mclennan Companies, Inc.');
  assert.equal(displayName('3M CO', null), '3M Co');
  assert.equal(displayName('NVIDIA CORP', 'NVIDIA'), 'NVIDIA');
  assert.equal(displayName('Land O\'Lakes, Inc.', null), 'Land O\'Lakes, Inc.');
});
