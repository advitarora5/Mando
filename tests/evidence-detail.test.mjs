import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEvidenceDetail, sourceHost } from '../src/domain/scoring/evidence-detail.ts';

// Real stored values (scores table, 2026-10-12).
const affinAuthority = 'https://affin.listedcompany.com/newsroom/25_Mar_2026_-_Affin_Bank_Berhad_-_Annual_Report_Part__2.pdf | Evidence: Dr. Mohd Syukri Ahmad Sudari: Current sourced role: Group Chief People Officer. Role 18 + confirmed 3,000+ employer/group 3 + explicit individual Workday responsibility 0, capped at 25. Assessment status: met. Missing: No explicit individual Workday-program ownership bonus supported.. Additional sources: https://www.workday.com/en-us/customer-stories/a-h/affin-bank-fostering-workplace-where-ideas-flourish.html.';
const affinReach = 'https://www.linkedin.com/in/syukri-sudari | Evidence: Dr. Mohd Syukri Ahmad Sudari: sourced route 10 + second personal channel 0 + evidenced deliverability/live phone 0 + dated personal initiative 0 + distinct active Workday action 0 + confirmed willing introduction 0, capped at 25. No messaging access or buying intent inferred. Assessment status: met. Missing: Database email/verified flag has no source or verifier provenance; excluded from publication/channel/verification points. Named deliverability or live-phone verification is unconfirmed. No dated personal HR-tech/Workday initiative bonus established. No separately evidenced active Workday action bonus established. No team-confirmed willing introduction; optional, not a gate.. Additional sources: None.';
const affinBudget = 'https://affin.listedcompany.com/newsroom/25_Mar_2026_-_Affin_Bank_Berhad_-_Annual_Report_Part__3.pdf | Evidence: Financial capacity 12/12 (FY2025 consolidated group operating profit RM708.315m versus653.007m (p153 PDF); group revenue2,442m versus2,170m. Bank entity-only and profit-before-tax figures are not substituted.) + highest supported technology proxy 8/8 (Issuer FY2025 report confirms transition from Lenses 3.0 to Workday Peakon during 2025, within the 24-month window.), capped at 20. Reported annual metrics used; revenue/operating-growth bonuses apply only with positive operations. This is a proxy, not funds committed to Mando. Assessment status: met. Missing: None for this scoring level. Additional sources: https://affin.listedcompany.com/newsroom/25_Mar_2026_-_Affin_Bank_Berhad_-_Annual_Report_Part__2.pdf.';
const affinRelease = 'https://www.workday.com/en-us/customer-stories/a-h/affin-bank-fostering-workplace-where-ideas-flourish.html | Evidence: Confirmed current Workday customer subject to recurring feature releases: 8/15. Eight-point applicability baseline is separate from release readiness. Calendar estimates do not count as confirmed dates. Assessment status: met. Missing: Higher readiness windows require a confirmed upcoming release date and, for 15, documented preparation.. Additional sources: https://doc.workday.com/workday-education/en-us/course-manuals/hcm-core-for-administrators/workday-tenants-and-tools.html.';
const shakeAuthority = 'https://investor.shakeshack.com/corporate-governance/person-details/default.aspx?ItemId=8d16505f-05f2-4be2-ac05-ea72a4304df4 | Evidence: Jamie Griffin, Chief People Officer; Authority 10 functional + 8 seniority + 1 plausible ownership + 1 coverage = 20/25. Missing: Workday ownership is plausible but unproven; a champion plus a confirmed budget holder is not established.';
const shakeBudget = 'https://www.hracuity.com/why-choose-hr-acuity/customer-stories/shake-shack-hr-acuity-case-study/ | HR Acuity vendor case confirms employee-relations tooling, Speakfully and Workday RaaS/Help integration at Shake Shack. Direct Workday-adjacent adoption earns partial proxy credit; contract date/value, new buying timeline and financial stability are unverified.';
const noContact = 'Evidence: Not enough evidence to confirm a current relevant contact; Authority 0 + 0 + 0 + 0 = 0/25. Missing: A current named HRIS, HR or relevant IT contact; historical names remain research leads.';
const preserved = 'https://theorg.com/org/guess/person/susan-tenney | The Org lists Susan Tenney as Vice President of Human Resources, but labels the record unverified.\n\nPreserved previous research (historical; current role corrections above take precedence):\nUnmapped spreadsheet research; category evidence needs review.\n{"evidence":"x"}';

test('label-first sub-scores with a cap, status, missing and extra sources', () => {
  const d = parseEvidenceDetail(affinAuthority);
  assert.equal(d.source, 'https://affin.listedcompany.com/newsroom/25_Mar_2026_-_Affin_Bank_Berhad_-_Annual_Report_Part__2.pdf');
  assert.equal(d.assessment_status, 'met');
  assert.deepEqual(d.subscores.map(s => [s.label, s.points]), [['Role', 18], ['confirmed 3,000+ employer/group', 3], ['explicit individual Workday responsibility', 0]]);
  assert.equal(d.cap, 25);
  assert.equal(d.reason, 'Dr. Mohd Syukri Ahmad Sudari: Current sourced role: Group Chief People Officer.');
  assert.deepEqual(d.missing, ['No explicit individual Workday-program ownership bonus supported']);
  assert.deepEqual(d.additional_sources, ['https://www.workday.com/en-us/customer-stories/a-h/affin-bank-fostering-workplace-where-ideas-flourish.html']);
  assert.equal(d.structured, true);
});

test('multi-sentence missing list and "Additional sources: None"', () => {
  const d = parseEvidenceDetail(affinReach);
  assert.equal(d.subscores.length, 6);
  assert.deepEqual(d.subscores[0], { label: 'sourced route', points: 10, max: null, note: null });
  assert.equal(d.missing.length, 5);
  assert.equal(d.missing[4], 'No team-confirmed willing introduction; optional, not a gate');
  assert.deepEqual(d.additional_sources, []);
  assert.match(d.reason, /No messaging access or buying intent inferred/);
});

test('parenthesised notes keep their own periods and nested brackets', () => {
  const d = parseEvidenceDetail(affinBudget);
  assert.deepEqual(d.subscores.map(s => [s.label, s.points, s.max]), [['Financial capacity', 12, 12], ['highest supported technology proxy', 8, 8]]);
  assert.match(d.subscores[0].note, /RM708\.315m versus653\.007m \(p153 PDF\)/);
  assert.equal(d.cap, 20);
  assert.deepEqual(d.missing, []);
  assert.match(d.reason, /^Reported annual metrics used/);
});

test('number-first sub-scores with an "= total/max" ending', () => {
  const d = parseEvidenceDetail(shakeAuthority);
  assert.deepEqual(d.subscores.map(s => [s.label, s.points]), [['functional', 10], ['seniority', 8], ['plausible ownership', 1], ['coverage', 1]]);
  assert.equal(d.cap, 25);
  assert.equal(d.reason, 'Jamie Griffin, Chief People Officer');
  assert.equal(d.assessment_status, null);
});

test('free-text evidence keeps source and reason without inventing structure', () => {
  const d = parseEvidenceDetail(shakeBudget);
  assert.equal(sourceHost(d.source), 'hracuity.com');
  assert.deepEqual(d.subscores, []);
  assert.deepEqual(d.missing, []);
  assert.match(d.reason, /^HR Acuity vendor case confirms/);
  const release = parseEvidenceDetail(affinRelease);
  assert.deepEqual(release.subscores, []);
  assert.match(release.reason, /8\/15/);
});

test('unlabelled zero terms are not turned into fake rows', () => {
  const d = parseEvidenceDetail(noContact);
  assert.deepEqual(d.subscores, []);
  assert.equal(d.source, null);
  assert.equal(d.missing.length, 1);
});

test('empty, imported and preserved research fall back safely', () => {
  assert.equal(parseEvidenceDetail('').structured, false);
  assert.equal(parseEvidenceDetail(null).reason, '');
  const imported = parseEvidenceDetail('Unmapped spreadsheet research; category evidence needs review.\n{"a":1}');
  assert.equal(imported.structured, false);
  assert.match(imported.raw, /^Unmapped/);
  const p = parseEvidenceDetail(preserved);
  assert.equal(p.reason, 'The Org lists Susan Tenney as Vice President of Human Resources, but labels the record unverified.');
  assert.match(p.raw, /Preserved previous research/);
});
