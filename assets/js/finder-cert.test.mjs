// Run: node --test assets/js/finder-cert.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { certLine } = createRequire(import.meta.url)('./finder-cert.js');

test('none reads not on the certified list and carries no certified wording', () => {
  const s = certLine({ status: 'none', expires_on: null, accreditor: null });
  assert.ok(s.includes("not on Virginia's certified list"));
  assert.ok(!/certified by/i.test(s));
});

test('certified names the accreditor', () => {
  assert.equal(certLine({ status: 'certified', expires_on: null, accreditor: 'NARR' }),
    'Certified by Virginia (DBHDS), through NARR');
});

test('conditional gives the date, or says it is unreadable', () => {
  assert.equal(certLine({ status: 'conditional', expires_on: '2027-03-01', accreditor: null }),
    'Conditionally certified by Virginia (DBHDS) until 2027-03-01');
  assert.equal(certLine({ status: 'conditional', expires_on: null, accreditor: null }),
    "Conditionally certified by Virginia (DBHDS), end date not readable on the state's list");
});
