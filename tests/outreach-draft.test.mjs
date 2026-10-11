import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDraftPrompt, gmailUrl, mailtoUrl, parseDrafts, pickTrigger } from '../src/domain/outreach/draft.ts';
const now = Date.parse('2026-10-11T12:00:00Z');
const co = (over = {}) => ({ name: 'Acme', industry: 'Retail', workday_signal_date: null, why_now: 'Went live recently.', score: { timing_evidence: '', release_score: 0, release_evidence: '' }, ...over });
test('trigger priority: go-live, then job posting, then release, else general', () => {
 assert.equal(pickTrigger(co({ workday_signal_date: '2026-09-01' }), now), 'go-live');
 assert.equal(pickTrigger(co({ workday_signal_date: '2025-01-01' }), now), 'general');
 assert.equal(pickTrigger(co({ workday_signal_date: '2027-01-01' }), now), 'general'); // future date is not a go-live
 assert.equal(pickTrigger(co({ score: { timing_evidence: 'https://x.com | Active Workday job posting', release_score: 0 } }), now), 'job-posting');
 assert.equal(pickTrigger(co({ score: { timing_evidence: '', release_score: 8, release_evidence: 'https://x.com | Release planning post' } }), now), 'release');
 assert.equal(pickTrigger(co({ score: null }), now), 'general');
});
test('prompt carries stored facts, the angle and the role', () => {
 const p = buildDraftPrompt(co({ workday_signal_date: '2026-09-01' }), { name: 'Jane Doe', title: 'HRIS Director' }, 'go-live', 'ANGLE TEXT', now);
 assert.match(p, /Jane Doe, HRIS Director/); assert.match(p, /40 days ago/); assert.match(p, /ANGLE TEXT/); assert.match(p, /Went live recently/);
});
test('parses an email and LinkedIn draft, tolerating wrapper text', () => {
 const out = parseDrafts('ok {"email":{"subject":" Hi ","body":" Hello Jane "},"linkedin":{"body":"Hi Jane"}}');
 assert.deepEqual(out, [{ channel: 'email', subject: 'Hi', body: 'Hello Jane' }, { channel: 'linkedin', subject: null, body: 'Hi Jane' }]);
});
test('rejects missing, too-long and non-JSON output', () => {
 assert.throws(() => parseDrafts('no json'));
 assert.throws(() => parseDrafts('{"email":{"subject":"a","body":"b"}}'));
 assert.throws(() => parseDrafts(JSON.stringify({ email: { subject: 'a', body: 'b' }, linkedin: { body: 'x'.repeat(301) } })));
 assert.throws(() => parseDrafts(JSON.stringify({ email: { subject: 'a', body: 'word '.repeat(121) }, linkedin: { body: 'x' } })));
});
test('send links encode recipient, subject and body', () => {
 assert.equal(mailtoUrl('a@b.com', 'Hi there', 'Line 1\nLine & 2'), 'mailto:a%40b.com?subject=Hi%20there&body=Line%201%0ALine%20%26%202');
 assert.match(gmailUrl('a@b.com', 'Hi', 'Body'), /^https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&to=a%40b\.com&su=Hi&body=Body$/);
});
