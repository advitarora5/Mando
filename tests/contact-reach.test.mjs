import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactSchema } from '../src/domain/contracts/contact.ts';
const id = '11111111-1111-4111-8111-111111111111';
const base = { company_id: id, id: '', name: 'Jane Doe', title: '', linkedin_url: '', source: '', mutual_connection: '', email: '', email_source: '', phone: '', phone_source: '' };
test('reach fields are optional and blank values become null', () => {
 const c = contactSchema.parse(base);
 assert.equal(c.email, null); assert.equal(c.phone, null); assert.equal(c.email_verified, false);
});
test('email is normalized and verification needs an email', () => {
 const c = contactSchema.parse({ ...base, email: ' Jane@Example.COM ', email_verified: 'on', email_source: 'https://example.com/team' });
 assert.equal(c.email, 'jane@example.com'); assert.equal(c.email_verified, true);
 assert.equal(contactSchema.parse({ ...base, email_verified: 'on' }).email_verified, false);
});
test('bad email, phone and source links are rejected', () => {
 assert.throws(() => contactSchema.parse({ ...base, email: 'not-an-email' }));
 assert.throws(() => contactSchema.parse({ ...base, phone: 'abc' }));
 assert.throws(() => contactSchema.parse({ ...base, phone_source: 'javascript:alert(1)' }));
 assert.equal(contactSchema.parse({ ...base, phone: '+1 (312) 555-0100' }).phone, '+1 (312) 555-0100');
});
