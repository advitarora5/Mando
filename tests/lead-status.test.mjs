import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leadStatusWrite, leadStatuses, leadStatusLabels } from '../src/domain/lead-status.ts';

test('every status has a human label', () => {
  for (const status of leadStatuses) assert.ok(leadStatusLabels[status]);
});

test('selecting a status stamps only that status date', () => {
  assert.deepEqual(leadStatusWrite('contacted', 'queued', 'T1'), { lead_status: 'contacted', contacted_at: 'T1' });
  assert.deepEqual(leadStatusWrite('replied', 'contacted', 'T2'), { lead_status: 'replied', replied_at: 'T2' });
  assert.deepEqual(leadStatusWrite('demo_booked', 'replied', 'T3'), { lead_status: 'demo_booked', demo_booked_at: 'T3' });
});

test('queued carries no date', () => {
  assert.deepEqual(leadStatusWrite('queued', 'contacted', 'T'), { lead_status: 'queued' });
});

test('re-saving the same status does not move its date', () => {
  assert.deepEqual(leadStatusWrite('contacted', 'contacted', 'T'), { lead_status: 'contacted' });
});

test('transitions are not order-enforced (manual, for now)', () => {
  assert.deepEqual(leadStatusWrite('demo_booked', 'queued', 'T'), { lead_status: 'demo_booked', demo_booked_at: 'T' });
});
