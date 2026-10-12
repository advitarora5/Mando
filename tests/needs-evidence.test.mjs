import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayTier, tierSlug } from '../src/domain/scoring/display.ts';

const evidence = 'https://example.com | A one-line reason.';
const otherEvidence = { budget_evidence: evidence, release_evidence: evidence, timing_evidence: evidence };
const qualified = { tier: 'Qualified', authority_evidence: evidence, reachability_evidence: evidence };
const maybe = { tier: 'Maybe', authority_evidence: evidence, reachability_evidence: evidence };
const disqualifiedWithEvidence = { ...otherEvidence, tier: 'Disqualified', authority_evidence: evidence, reachability_evidence: evidence };
const missingAuthority = { tier: 'Disqualified', authority_evidence: '', reachability_evidence: evidence };
const missingReachability = { tier: 'Disqualified', authority_evidence: evidence, reachability_evidence: '' };

test('a disqualified company with all evidence reads Disqualified', () => {
  assert.equal(displayTier(disqualifiedWithEvidence), 'Disqualified');
});

test('a disqualified company missing evidence reads Not Enough Evidence', () => {
  assert.equal(displayTier(missingAuthority), 'Not Enough Evidence');
  assert.equal(displayTier(missingReachability), 'Not Enough Evidence');
});

test('Qualified and Maybe are unchanged', () => {
  assert.equal(displayTier(qualified), 'Qualified');
  assert.equal(displayTier(maybe), 'Maybe');
});

test('an unscored company reads Unscored', () => {
  assert.equal(displayTier(null), 'Unscored');
});

test('Disqualified is only shown when Authority and Reachability evidence are both present', () => {
  for (const score of [qualified, maybe, disqualifiedWithEvidence, missingAuthority, missingReachability]) {
    if (displayTier(score) === 'Disqualified') {
      assert.ok(score.authority_evidence && score.reachability_evidence);
    }
  }
});

test('tier slugs are valid single CSS classes', () => {
  assert.equal(tierSlug(qualified), 'qualified');
  assert.equal(tierSlug(maybe), 'maybe');
  assert.equal(tierSlug(disqualifiedWithEvidence), 'disqualified');
  assert.equal(tierSlug(missingAuthority), 'not-enough-evidence');
  assert.equal(tierSlug(null), 'unscored');
});

test('all five categories must be resolved, and a valid URL cannot hide unknown evidence', () => {
  for (const category of ['budget','release','timing']) {
    assert.equal(displayTier({...disqualifiedWithEvidence,[category+'_evidence']:''}),'Not Enough Evidence');
  }
  assert.equal(displayTier({...disqualifiedWithEvidence,budget_evidence:'https://example.com | Assessment status: partial. Historical purchase proxy only.'}),'Not Enough Evidence');
  assert.equal(displayTier({...disqualifiedWithEvidence,reachability_evidence:'https://example.com | No verified mutual connection.'}),'Not Enough Evidence');
  assert.equal(displayTier({...disqualifiedWithEvidence,timing_evidence:'https://example.com | Assessment status: not_met. Old launch receives zero.'}),'Disqualified');
});
