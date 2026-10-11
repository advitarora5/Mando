import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayTier, tierSlug } from '../src/domain/scoring/display.ts';

const qualified = { tier: 'Qualified' };
const maybe = { tier: 'Maybe' };
const disqualified = { tier: 'Disqualified' };

test('the UI never shows the word Disqualified', () => {
  for (const score of [qualified, maybe, disqualified]) {
    assert.notEqual(displayTier(score), 'Disqualified');
  }
  assert.equal(displayTier(disqualified), 'Needs evidence');
});

test('Qualified and Maybe labels are unchanged', () => {
  assert.equal(displayTier(qualified), 'Qualified');
  assert.equal(displayTier(maybe), 'Maybe');
});

test('an unscored company reads Unscored', () => {
  assert.equal(displayTier(null), 'Unscored');
});

test('tier slugs are valid single CSS classes', () => {
  assert.equal(tierSlug(qualified), 'qualified');
  assert.equal(tierSlug(maybe), 'maybe');
  assert.equal(tierSlug(disqualified), 'needs-evidence');
  assert.equal(tierSlug(null), 'unscored');
});
