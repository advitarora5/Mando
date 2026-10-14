import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDraftPrompt, gmailUrl, mailtoUrl, parseDrafts, pickTrigger } from '../src/domain/outreach/draft.ts';
import { defaultCustomization, defaultSettings, fillTemplate, resolveSettings, toCustomization } from '../src/domain/outreach/customization.ts';
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
 const p = buildDraftPrompt(co({ workday_signal_date: '2026-09-01' }), { name: 'Jane Doe', title: 'HRIS Director' }, 'go-live', { ...defaultCustomization, angles: { ...defaultCustomization.angles, 'go-live': 'ANGLE TEXT' } }, now);
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


test('defaults carry the Mando facts, hooks, four angles and the research notes', () => {
 const c = defaultCustomization;
 assert.match(c.facts, /intelligence layer/); assert.match(c.facts, /Workday preview tenant/);
 assert.ok(c.hooks.length >= 3); assert.ok(c.avoid.length >= 3); assert.equal(c.signOff, 'Adi');
 for (const t of ['go-live', 'job-posting', 'release', 'general']) assert.ok(c.angles[t].length > 0);
 assert.match(defaultSettings.research_notes, /OPEN QUESTIONS FOR ADI/);
 assert.match(defaultSettings.voice, /no em dashes/);
});
test('saved settings override defaults, missing fields fall back, bad rows fall back with a reason', () => {
 assert.deepEqual(resolveSettings(null).settings, defaultSettings);
 const r = resolveSettings({ sign_off: 'Pat', email_max_words: 90 });
 assert.equal(r.settings.sign_off, 'Pat'); assert.equal(r.settings.email_max_words, 90); assert.equal(r.settings.voice, defaultSettings.voice); assert.equal(r.error, undefined);
 const bad = resolveSettings({ email_max_words: 5 });
 assert.deepEqual(bad.settings, defaultSettings); assert.match(bad.error, /at least 20/);
 assert.match(resolveSettings({ sign_off: '' }).error, /Sign-off cannot be empty/);
});
test('toCustomization splits list fields into lines and maps limits', () => {
 const c = toCustomization({ ...defaultSettings, avoid: ' Jargon \n\n Buzzwords ', hooks: 'One\nTwo', go_live_window_days: 30 });
 assert.deepEqual(c.avoid, ['Jargon', 'Buzzwords']); assert.deepEqual(c.hooks, ['One', 'Two']); assert.equal(c.limits.goLiveDays, 30);
});
test('prompt uses the customization: voice, ask, sign-off, limits, facts, hooks, avoid list and example', () => {
 const custom = toCustomization({ ...defaultSettings, voice: 'Crisp.', sign_off: 'Pat', email_max_words: 80, avoid: 'Jargon', mando_facts: 'FACT ONE', hooks: 'HOOK ONE', example: 'Subject: Hi\nHello.', angle_release: 'We test releases.' });
 const p = buildDraftPrompt(co(), { name: 'Jane Doe', title: 'HRIS Director' }, 'release', custom, now);
 assert.match(p, /Voice: Crisp\./); assert.match(p, /body under 80 words, sign off as "Pat"/);
 assert.match(p, /- Jargon/); assert.match(p, /do not copy its wording/); assert.match(p, /We test releases\./);
 assert.match(p, /FACT ONE/); assert.match(p, /- HOOK ONE/);
 const bare = buildDraftPrompt(co(), { name: 'J', title: null }, 'general', toCustomization({ ...defaultSettings, example: '', mando_facts: '', hooks: '', avoid: '' }), now);
 assert.doesNotMatch(bare, /Example of a message/); assert.doesNotMatch(bare, /Facts about Mando/); assert.doesNotMatch(bare, /Opening hooks/);
});
test('configured limits apply to trigger window and email length', () => {
 assert.equal(pickTrigger(co({ workday_signal_date: '2026-09-01' }), now, 30), 'general'); // 40 days old, 30-day window
 assert.throws(() => parseDrafts(JSON.stringify({ email: { subject: 'a', body: 'one two three' }, linkedin: { body: 'x' } }), 2), /too long/);
});
test('starter templates fill placeholders and leave unknown ones alone', () => {
 const v = { first_name: 'Jane', company: 'Acme', sign_off: 'Adi' };
 assert.equal(fillTemplate('Hi {first_name}, {company}. {unknown} {sign_off}', v), 'Hi Jane, Acme. {unknown} Adi');
 assert.equal(fillTemplate(defaultSettings.email_template, v).split('\n')[0], 'Hi Jane,');
});
