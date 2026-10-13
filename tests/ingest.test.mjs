import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractCaptures } from '../scripts/ingestion/extract.mjs';
import { planIngest } from '../scripts/ingestion/ingest.mjs';

const capture = {
  capture_ref: 'run/capture-1', url: 'https://example.com/job', title: null, source_type: 'job_listing',
  collected_at: '2026-10-10T00:00:00Z', published_date: null,
  segments: [{ id: 'seg-a', parent_id: null, kind: 'page', author: null, published_date: null, text: 'Acme Corp went live on Workday HCM on 2026-09-01 after a long project.' }],
};
const claim = (quote, extra = {}) => ({
  statement: 'Acme Corp went live on Workday HCM', company: { name: 'Acme Corp', role: 'customer' }, signal_type: 'implementation',
  product_area: 'HCM', date: { raw: '2026-09-01', normalized: '2026-09-01', precision: 'day', kind: 'event' },
  evidence: { capture_ref: 'run/capture-1', segment_id: 'seg-a', quote }, ...extra,
});
const reply = content => async () => ({ ok: true, text: async () => JSON.stringify({ message: { content } }) + '\n' });
const ollama = claims => reply(JSON.stringify({ claims }));

test('extractCaptures keeps verbatim claims and rejects invented quotes', async () => {
  const { accepted, rejected, error } = await extractCaptures([capture], ollama([claim('went live on Workday HCM'), claim('never appears in the source')]));
  assert.equal(error, null);
  assert.equal(accepted.length, 1);
  assert.match(rejected[0].reason, /not verbatim/);
});

test('extractCaptures reports invalid JSON instead of throwing', async () => {
  assert.ok((await extractCaptures([capture], reply('not json'))).error);
});

test('planIngest creates new customers without scoring them and only adds signals to existing ones', () => {
  const extraction = { results: [{ capture_ref: 'run/capture-1', accepted: [claim('went live on Workday HCM'), claim('long project', { company: { name: 'Vendor Inc', role: 'vendor' } })] }] };
  const fresh = planIngest([capture], extraction, []);
  assert.equal(fresh.skipped, 1);
  assert.equal(fresh.plan[0].action, 'create');

  const known = planIngest([capture], extraction, [{ id: 'x', name: ' ACME  corp ' }]);
  assert.equal(known.plan[0].action, 'existing');
  assert.equal(known.plan[0].id, 'x');
});
