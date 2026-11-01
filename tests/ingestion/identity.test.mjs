import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyIdentity, identitySignature, reusableIdentity, evaluateIdentity, digest, groundIdentityAnswer } from '../../src/pipeline/identity.ts';
import { prepareIdentityCase, jobIdentityText, identityTargetSchema } from '../../src/pipeline/identity-evidence.ts';
import { WebsiteHttp } from '../../src/pipeline/website.ts';
import { makeCtx, fakeFetch, response } from './helpers.mjs';

const now = new Date('2026-11-01T12:00:00Z');
function packet() {
  return { id: 'western', target_name: 'Western Digital', corporate_url: 'https://westerndigital.com/',
    site: { tenant: 'western', pod: 'wd1', site: 'WESTERN' }, review_id: null, prepared_at: now.toISOString(), errors: [],
    sources: [
      { id: 'c', side: 'corporate', url: 'https://westerndigital.com/', text: 'Western Digital develops data storage products for customers worldwide.' },
      { id: 'w', side: 'workday', url: 'https://western.wd1.myworkdayjobs.com/wday/cxs/western/WESTERN/job/Professor_1', text: 'Western Colorado University is hiring an assistant professor for its university campus.' },
    ].map(s => ({ ...s, fetched_at: now.toISOString(), content_hash: digest(s.text), capture_id: null })) };
}
const mismatch = () => ({ verdict: 'different_company', corporate_identity: 'Western Digital', workday_identity: 'Western Colorado University', explanation: 'Different named employers.', evidence: {
  corporate: { source_id: 'c', quote: 'Western Digital develops data storage products' },
  workday: { source_id: 'w', quote: 'Western Colorado University is hiring an assistant professor' },
} });
function model(answer = mismatch()) {
  const calls = [];
  return { name: 'ollama', model: 'local-test', worstCaseUsd: 0, calls,
    complete: async request => {
      calls.push(request);
      const sources = JSON.parse(request.user).sources;
      const output = structuredClone(answer);
      for (const [side, ref] of Object.entries(output.evidence)) {
        if (!ref) continue;
        const source = sources.find(s => s.id === ref.source_id);
        const excerpt = source?.excerpts.find(e => e.text.includes(ref.quote));
        output.evidence[side] = { source_id: ref.source_id, excerpt_index: excerpt?.excerpt_index ?? 999 };
      }
      return { ok: true, json: output, cost_usd: 0, ms: 1 };
    } };
}

test('identity: known first-word collision is supported by both original sources; no state mutations', async () => {
  const p = packet(), before = JSON.stringify(p), llm = model();
  const result = await verifyIdentity(p, llm, 'digest-1', now);
  assert.equal(result.verdict, 'different_company'); assert.equal(result.status, 'done');
  assert.equal(JSON.stringify(p), before);
  assert.match(llm.calls[0].system, /target name is a hypothesis/);
  assert.match(llm.calls[0].user, /Western Colorado University/);
});

test('identity: a same-employer pair can pass without a connecting hyperlink', async () => {
  const p = packet(); p.sources[1].text = 'Western Digital is hiring an engineer to develop storage products.';
  const answer = mismatch(); Object.assign(answer, { verdict: 'same_company', workday_identity: 'Western Digital' });
  answer.evidence.workday.quote = 'Western Digital is hiring an engineer';
  assert.equal((await verifyIdentity(p, model(answer), 'v1', now)).verdict, 'same_company');
});

test('identity: missing, stale, future, duplicate or wrong-site evidence cannot produce approval or call the model', async () => {
  for (const mutate of [
    p => p.sources.pop(),
    p => { p.sources[1].text = 'Careers'; },
    p => { p.sources[1].fetched_at = '2026-09-01T00:00:00Z'; },
    p => { p.sources[1].fetched_at = '2027-01-01T00:00:00Z'; },
    p => { p.sources[1].url = p.sources[1].url.replace('/WESTERN/', '/Other/'); },
    p => { p.sources[1].url = p.sources[1].url.replace('western.wd1', 'other.wd1'); },
    p => { p.sources[1].id = 'c'; },
    p => { p.sources[0].url = 'https://other.example/'; },
  ]) {
    const p = packet(), llm = model(); mutate(p);
    const result = await verifyIdentity(p, llm, 'v1', now);
    assert.equal(result.status, 'insufficient_input'); assert.equal(result.verdict, 'insufficient_evidence'); assert.equal(llm.calls.length, 0);
  }
});

test('identity: invented quotes/identities, cross-source references and malformed output fail closed', async () => {
  for (const mutate of [
    a => { a.evidence.workday.quote = 'This text was invented by the model'; },
    a => { a.evidence.workday.source_id = 'invented'; },
    a => { a.evidence.workday = null; },
    a => { a.workday_identity = 'Western Digital'; },
    a => { a.evidence.workday.source_id = 'c'; },
    a => { a.extra = 'unexpected'; },
  ]) {
    const answer = mismatch(); mutate(answer);
    const result = await verifyIdentity(packet(), model(answer), 'v1', now);
    assert.equal(result.status, 'invalid_output'); assert.equal(result.verdict, 'insufficient_evidence');
  }
});

test('identity: model outage and nonzero cost fail closed; paid providers refused before calling', async () => {
  const llm = model(); llm.complete = async () => ({ ok: false, error: 'ollama timeout', cost_usd: 0, ms: 1 });
  assert.equal((await verifyIdentity(packet(), llm, 'v1', now)).status, 'model_error');
  llm.complete = async () => ({ ok: true, json: mismatch(), cost_usd: 1, ms: 1 });
  assert.equal((await verifyIdentity(packet(), llm, 'v1', now)).verdict, 'insufficient_evidence');
  await assert.rejects(verifyIdentity(packet(), { ...llm, name: 'openai' }, 'v1', now), /local Ollama/);
});

test('identity: a citation index can be repaired only within the same source and without changing the model identity', () => {
  const p = packet(); p.sources[1].text = 'General opportunity for qualified applicants.\n' + p.sources[1].text;
  const output = { ...mismatch(), evidence: { corporate: { source_id: 'c', excerpt_index: 0 }, workday: { source_id: 'w', excerpt_index: 0 } } };
  const grounded = groundIdentityAnswer(p, output);
  assert.equal(grounded.citation_repairs, 1);
  assert.match(grounded.answer.evidence.workday.quote, /Western Colorado University/);
  assert.equal(grounded.answer.verdict, 'different_company');
  output.workday_identity = 'Western Digital';
  assert.throws(() => groundIdentityAnswer(p, output), /identity missing/);
  output.workday_identity = 'Western Colorado University'; output.evidence.workday.source_id = 'c';
  assert.throws(() => groundIdentityAnswer(p, output), /wrong side/);
});

test('identity: cached verdict invalidates on source, target, site, model, revision, age or error', async () => {
  const p = packet(), result = await verifyIdentity(p, model(), 'v1', now);
  assert.ok(reusableIdentity(result, p, 'local-test', 'v1', now));
  for (const mutate of [p => { p.target_name = 'Other'; }, p => { p.site.site = 'Other'; }, p => { p.sources[1].text += ' changed'; }]) {
    const changed = structuredClone(p); mutate(changed);
    assert.notEqual(identitySignature(changed, 'local-test', 'v1'), result.signature);
    assert.equal(reusableIdentity(result, changed, 'local-test', 'v1', now), false);
  }
  assert.equal(reusableIdentity(result, p, 'other-model', 'v1', now), false);
  assert.equal(reusableIdentity(result, p, 'local-test', 'v2', now), false);
  assert.ok(reusableIdentity(result, p, 'local-test', 'v1', new Date(+now + 86400001)));
  assert.equal(reusableIdentity(result, p, 'local-test', 'v1', new Date(+now + 15 * 86400000)), false);
  const refreshed = structuredClone(p); refreshed.prepared_at = new Date(+now + 1000).toISOString();
  refreshed.sources[0].fetched_at = refreshed.prepared_at;
  assert.equal(identitySignature(refreshed, 'local-test', 'v1'), result.signature);
  assert.equal(reusableIdentity({ ...result, status: 'model_error' }, p, 'local-test', 'v1', now), false);
});

test('identity evidence: samples exact-site jobs without the Workday keyword and never treats guessed metadata as evidence', async () => {
  const target = identityTargetSchema.strip().parse(packet());
  const ctx = makeCtx({ now: () => now, fetch: fakeFetch([
    { match: /robots.txt$/, respond: () => response(200, 'User-agent: *\nAllow: /') },
    { match: /^https:\/\/westerndigital.com\/$/, respond: () => response(200, '<title>Western Digital</title><p>Western Digital develops data storage products for customers worldwide.</p>', { 'content-type': 'text/html' }) },
    { match: /\/jobs$/, method: 'POST', respond: (url, init) => { assert.equal(JSON.parse(init.body).searchText, ''); return response(200, { jobPostings: [{ externalPath: '/job/Professor_1' }] }); } },
    { match: /\/job\/Professor_1$/, respond: () => response(200, { jobPostingInfo: { title: 'Assistant Professor', jobDescription: '<p>Western Colorado University is hiring an assistant professor for its university campus.</p>' } }) },
  ]) });
  let reads = 0;
  ctx.store = { async websiteEvidenceCaptures() { reads++; return []; } }; // No mutation methods available.
  const out = await prepareIdentityCase(ctx, target, new WebsiteHttp(ctx));
  assert.equal(out.sources.length, 2); assert.deepEqual(out.errors, []);
  assert.match(out.sources[1].text, /Western Colorado University/);
  assert.doesNotMatch(out.sources[1].text, /Western Digital/);
  assert.equal(reads, 1);
  assert.throws(() => jobIdentityText('{}'), /job description/);
});

test('identity evidence: unsafe job paths and JSON redirects never fetch outside the exact site', async () => {
  const target = identityTargetSchema.strip().parse(packet());
  for (const path of ['/job/../../Other/job/X', '//evil.example/job/X', '/job/%2e%2e/Other', '/job/X?other=1']) {
    const ctx = makeCtx({ now: () => now, fetch: fakeFetch([
      { match: /robots.txt$/, respond: () => response(200, '') },
      { match: /westerndigital.com/, respond: () => response(403, 'blocked') },
      { match: /\/jobs$/, respond: () => response(200, { jobPostings: [{ externalPath: path }] }) },
    ]) });
    const out = await prepareIdentityCase(ctx, target, new WebsiteHttp(ctx));
    assert.equal(out.sources.length, 0); assert.match(out.errors.join(' '), /invalid Workday job path/);
    assert.equal(ctx.fetch.calls.filter(c => /\/job\//.test(c.url)).length, 0);
  }
  const ctx = makeCtx({ fetch: fakeFetch([
    { match: /robots.txt$/, respond: () => response(200, '') },
    { match: /\/jobs$/, respond: () => response(302, '', { location: 'https://other.example/' }) },
  ]) });
  await assert.rejects(new WebsiteHttp(ctx).json('https://western.wd1.myworkdayjobs.com/wday/cxs/western/WESTERN/jobs'), /HTTP 302/);
  assert.ok(ctx.fetch.calls.every(c => !c.url.includes('other.example')));
});

test('identity evaluation: reports abstentions/errors and missing labels without inflating accuracy', () => {
  const results = [
    { case_id: 'match', verdict: 'insufficient_evidence', status: 'invalid_output' },
    { case_id: 'wrong', verdict: 'same_company', status: 'done' },
    { case_id: 'caught', verdict: 'different_company', status: 'done' },
    { case_id: 'unlabeled', verdict: 'same_company', status: 'done' },
  ];
  const labels = [{ case_id: 'match', expected: 'same_company' }, { case_id: 'wrong', expected: 'different_company' }, { case_id: 'caught', expected: 'different_company' }, { case_id: 'missing', expected: 'same_company' }];
  const summary = evaluateIdentity(results, labels);
  assert.equal(summary.falseAccepts, 1); assert.equal(summary.falseHolds, 1);
  assert.equal(summary.correct, 1); assert.equal(summary.tested, 3); assert.equal(summary.missing, 1);
  assert.equal(summary.coverage, 2 / 3); assert.equal(summary.decisiveAccuracy, 1 / 2);
  assert.equal(summary.errors, 1); assert.equal(summary.unlabeledResults, 1);
  assert.equal(summary.modelEvaluated, 2); assert.equal(summary.accuracy, 1 / 2);
  const failedAbstention = evaluateIdentity([{ case_id: 'bad', verdict: 'insufficient_evidence', status: 'invalid_output' }], [{ case_id: 'bad', expected: 'insufficient_evidence' }]);
  assert.equal(failedAbstention.correct, 0); assert.equal(failedAbstention.accuracy, null);
  assert.throws(() => evaluateIdentity([...results, results[0]], labels), /duplicate/);
});
