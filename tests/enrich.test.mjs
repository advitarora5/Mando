import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptable, isWorkEmail, pickContacts, pickDomain } from '../scripts/enrich-contacts.mjs';

test('pickDomain takes the exact-name match with the most known emails, else nothing', () => {
  const matches = [
    { domain: 'flix.vn', company_name: 'Flix', email_count: 1 },
    { domain: 'flix.eu', company_name: 'Flix', email_count: 2 },
    { domain: 'flixbus.it', company_name: 'FlixBus', email_count: 99 },
  ];
  assert.equal(pickDomain('Flix', matches), 'flix.eu');
  assert.equal(pickDomain('Flix Corp', matches), null);
});

test('pickContacts keeps one senior person per target role and drops juniors', () => {
  const lead = (firstname, lastJobTitle) => ({ firstname, lastname: 'Smith', lastJobTitle, profileUrl: `https://www.linkedin.com/in/${firstname}` });
  const picks = pickContacts([
    lead('Ann', 'Vice President, Human Resources'),
    lead('Bob', 'Human Resources Generalist'), // junior
    lead('Cy', 'Director, HRIS and Workday'),
    lead('Di', 'IT Operations Manager'),
    lead('Ed', 'Senior Information Technology Security Analyst'), // not a lead
  ]);
  assert.deepEqual(picks.map(p => [p.slot, p.first]), [['hris', 'Cy'], ['hr', 'Ann'], ['it', 'Di']]);
});

test('only an address at the company domain counts as a work email', () => {
  assert.equal(isWorkEmail('a.b@wawa.com', 'wawa.com'), true);
  assert.equal(isWorkEmail('aka1992@hotmail.com', 'wawa.com'), false);
  assert.equal(isWorkEmail(undefined, 'wawa.com'), false);
});

test('truncated names, junior titles and placeholder emails are refused', () => {
  assert.equal(acceptable('Raquel', 'L.', 'IT HR Systems Manager'), false);
  assert.equal(acceptable('D J', 'Rao', 'Head of HR Systems'), false);
  assert.equal(acceptable('Rini', 'Sarangi', 'Senior IT Business Analyst/Delivery Lead'), false);
  assert.equal(acceptable('Chris', 'Snavely', 'Information Technology Program Director'), false);
  assert.equal(acceptable('Rick', 'Jost', 'Senior Vice President Human Resources'), true);
  assert.equal(isWorkEmail('placeholder@mgmresorts.com', 'mgmresorts.com'), false);
});
