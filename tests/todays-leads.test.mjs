import { tierForTotal } from "../src/domain/scoring/rubric.ts";
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectTodaysLeads } from '../src/features/todays-leads/select.ts';

const evidence = 'https://example.com | A reason.';
const lead = (id, name, total, status) => ({
  id, name, industry: null, why_now: null, contacts: [], drafts: [],
  lead_status: status, contacted_at: null, replied_at: null, demo_booked_at: null,
  score: total === null ? null : {
    total, tier: tierForTotal(total),
    authority_evidence: evidence, reachability_evidence: evidence,
  },
});

test('defaults to the top queued leads by score', () => {
  const leads = [lead('a', 'A', 90, 'queued'), lead('b', 'B', 80, 'contacted'), lead('c', 'C', 70, 'queued'), lead('d', 'D', 60, 'queued')];
  const result = selectTodaysLeads(leads);
  assert.deepEqual(result.map(r => r.lead.id), ['a', 'c', 'd']);
  assert.equal(result[0].rank, 1);
});

test('status all ignores status and still caps at the limit', () => {
  const leads = Array.from({ length: 15 }, (_, i) => lead(`id${i}`, `Co ${i}`, 100 - i, i % 2 ? 'contacted' : 'queued'));
  const result = selectTodaysLeads(leads, { status: 'all' });
  assert.equal(result.length, 10);
  assert.equal(result[0].lead.id, 'id0');
  assert.equal(result[0].rank, 1);
});

test('unscored companies are never leads', () => {
  const leads = [lead('a', 'A', null, 'queued'), lead('b', 'B', 50, 'queued')];
  assert.deepEqual(selectTodaysLeads(leads).map(r => r.lead.id), ['b']);
});

test('limit is configurable', () => {
  const leads = Array.from({ length: 5 }, (_, i) => lead(`id${i}`, `Co ${i}`, 90 - i, 'queued'));
  assert.equal(selectTodaysLeads(leads, { limit: 3 }).length, 3);
});

test('ranks match the full scored set even when filtered to a status', () => {
  const leads = [lead('a', 'A', 90, 'queued'), lead('b', 'B', 80, 'contacted'), lead('c', 'C', 70, 'queued')];
  const result = selectTodaysLeads(leads);
  assert.deepEqual(result.map(r => [r.lead.id, r.rank]), [['a', 1], ['c', 3]]);
});
