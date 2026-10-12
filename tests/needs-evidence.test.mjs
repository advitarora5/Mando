import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayTier, tierSlug } from '../src/domain/scoring/display.ts';

const evidence = 'https://example.com | A one-line reason.';
const qualified = { tier: 'Qualified', authority_evidence: evidence, reachability_evidence: evidence };
const maybe = { tier: 'Maybe', authority_evidence: evidence, reachability_evidence: evidence };
const disqualifiedWithEvidence = { tier: 'Disqualified', authority_evidence: evidence, reachability_evidence: evidence };
const missingAuthority = { tier: 'Disqualified', authority_evidence: '', reachability_evidence: evidence };
const missingReachability = { tier: 'Disqualified', authority_evidence: evidence, reachability_evidence: '' };

test('a disqualified company with all evidence reads Disqualified', () => {
  assert.equal(displayTier(disqualifiedWithEvidence), 'Disqualified');
});

test('a disqualified company missing evidence reads Needs evidence', () => {
  assert.equal(displayTier(missingAuthority), 'Needs evidence');
  assert.equal(displayTier(missingReachability), 'Needs evidence');
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
  assert.equal(tierSlug(missingAuthority), 'needs-evidence');
  assert.equal(tierSlug(null), 'unscored');
});

