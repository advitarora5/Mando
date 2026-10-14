import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactFunction, contactProvenance, emailLabel, emailState, rankContacts, reachSummary } from '../src/domain/contacts/contact-view.ts';

const person = (name, title, extra = {}) => ({ name, title, linkedin_url: null, email: null, email_verified: false, email_status: null, phone: null, ...extra });

test('titles map to buyer functions, HR systems first', () => {
 assert.equal(contactFunction('HR Systems Lead / Workday Functional Owner'), 'hr-systems');
 assert.equal(contactFunction('Vice President, Global HR Information Systems and Transformation'), 'hr-systems');
 assert.equal(contactFunction('Senior Vice President, Integrated Workforce & Operations Technology'), 'hr-systems');
 assert.equal(contactFunction('EVP & Chief People Officer'), 'hr-leadership');
 assert.equal(contactFunction('Co-founder, Chief Information Officer and Chief HR Officer'), 'hr-leadership');
 assert.equal(contactFunction('Chief Information Officer'), 'technology');
 assert.equal(contactFunction('Chief Operating Officer'), 'other');
 assert.equal(contactFunction(null), 'other');
});

test('email state keeps email_verified as the source of truth', () => {
 assert.equal(emailState(person('A', null, { email: 'a@x.com', email_verified: true, email_status: 'valid' })), 'verified');
 assert.equal(emailState(person('A', null, { email: 'a@x.com', email_status: 'valid' })), 'unverified');
 assert.equal(emailState(person('A', null, { email: 'a@x.com', email_status: 'risky' })), 'risky');
 assert.equal(emailLabel(person('A', null, { email: 'a@x.com', email_status: 'invalid' })), 'Failed verification');
 assert.equal(emailLabel(person('A', null, { email_status: 'invalid' })), 'Searched · no valid email');
 assert.equal(emailLabel(person('A', null, { email_status: 'not_found' })), 'Searched · not found');
 assert.equal(emailLabel(person('A', null)), 'No email recorded');
});

test('main contact is the most relevant reachable buyer', () => {
 const ranked = rankContacts([
  person('Zed CIO', 'Chief Information Officer', { email: 'z@x.com', email_verified: true }),
  person('Amy CPO', 'Chief People Officer'),
  person('Bob CHRO', 'Chief Human Resources Officer', { email: 'b@x.com', email_verified: true }),
  person('Cat HRIS', 'HRIS Director'),
 ]);
 assert.deepEqual(ranked.map(c => c.name), ['Cat HRIS', 'Bob CHRO', 'Amy CPO', 'Zed CIO']);
 assert.deepEqual(reachSummary(ranked), { total: 4, verified: 2, linkedin: 0, phone: 0 });
});

test('provenance reads enrichment jsonb defensively', () => {
 const p = contactProvenance({
  email: { source: 'treg.people.email.find via trykitt', verification: 'valid via bounceban', flag: 'common name' },
  linkedin: { status: 'unconfirmed', candidate_url: 'https://www.linkedin.com/in/example' },
  free_extras: { company_hq_line: '+12128966600', provider_title: 'VP, HR' },
 });
 assert.equal(p.emailSource, 'treg.people.email.find via trykitt');
 assert.deepEqual(p.flags, ['common name']);
 assert.equal(p.linkedinCandidate, 'https://www.linkedin.com/in/example');
 assert.equal(p.companyLine, '+12128966600');
 assert.equal(contactProvenance({ linkedin: { status: 'confirmed', candidate_url: 'https://x.test' } }).linkedinCandidate, null);
 assert.deepEqual(contactProvenance(null).flags, []);
 assert.equal(contactProvenance('garbage').emailSource, null);
});
