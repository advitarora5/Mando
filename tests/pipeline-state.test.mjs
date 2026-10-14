import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyState, computeKpis, defaultState, fromParams, isReady, toCsv, toParams } from '../src/features/pipeline/state.ts';

const ev = (status = 'met') => `https://example.com | Evidence: x. Assessment status: ${status}.`;
const score = (total, tier, parts = {}) => ({ total, tier, authority_score: 20, reachability_score: 20, budget_score: 15, release_score: 10, timing_score: 10,
  authority_evidence: ev(), reachability_evidence: ev(), budget_evidence: ev(), release_evidence: ev(), timing_evidence: ev(), ...parts });
const company = (id, name, s, extra = {}) => ({ id, name, domain: null, industry: 'Retail', headquarters: null, employee_count: 5000, why_now: null, lead_status: 'queued', contacts: [], score: s, ...extra });
const verified = { id: 'k', name: 'Ann Lee', title: 'HRIS Director', linkedin_url: null, email: 'a@x.com', email_verified: true };
const rows = [
  company('a', 'Alpha', score(85, 'Qualified'), { contacts: [verified] }),
  company('b', 'Beta', score(60, 'Maybe', { release_score: 5 })),
  company('c', 'Gamma', score(20, 'Disqualified', { budget_score: 0, budget_evidence: ev('unknown') })),
  company('d', 'Delta', null),
];

test('URL round trip keeps only non-default values and rejects junk', () => {
  const state = { ...defaultState, q: 'hr', view: 'ready', verified: true, sort: 'authority-desc' };
  assert.equal(toParams(state), 'q=hr&view=ready&verified=1&sort=authority-desc');
  assert.deepEqual(fromParams(new URLSearchParams(toParams(state))), state);
  assert.deepEqual(fromParams(new URLSearchParams('sort=evil&view=x&min=abc&tier=Nope')), defaultState);
});

test('saved views and flags filter on derived, honest rules', () => {
  assert.deepEqual(applyState(rows, { ...defaultState, view: 'needs' }).map(c => c.id), ['c']);
  assert.deepEqual(applyState(rows, { ...defaultState, view: 'ready' }).map(c => c.id), ['a']);
  assert.deepEqual(applyState(rows, { ...defaultState, release: true }).map(c => c.id), ['a', 'c']);
  assert.deepEqual(applyState(rows, { ...defaultState, gaps: true }).map(c => c.id), ['c']);
  assert.equal(isReady({ ...rows[0], lead_status: 'contacted' }), false);
});

test('category sort orders by that score with unscored last', () => {
  const sorted = applyState(rows, { ...defaultState, sort: 'release-asc' }).map(c => c.id);
  assert.deepEqual(sorted, ['b', 'a', 'c', 'd']);
});

test('invalid score range returns no rows instead of guessing', () => {
  assert.deepEqual(applyState(rows, { ...defaultState, min: '90', max: '10' }), []);
});

test('KPIs count display tiers, verified contacts and week-over-week company change', () => {
  const k = computeKpis(rows, 3);
  assert.deepEqual(k.byTier, { qualified: 1, maybe: 1, disqualified: 0, needs: 1, unscored: 1 });
  assert.equal(k.companiesDelta, 1);
  assert.equal(k.verifiedContacts, 1);
  assert.equal(computeKpis(rows, null).companiesDelta, null);
});

test('CSV escapes commas and quotes', () => {
  const csv = toCsv([company('x', 'Acme, "Inc"', null)], new Map([['x', 4]]));
  assert.match(csv.split('\n')[1], /^4,"Acme, ""Inc""",/);
});
