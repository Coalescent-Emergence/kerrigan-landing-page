import test from 'node:test';
import assert from 'node:assert/strict';
import { pageDomains, compare } from './finder-care-type-check.mjs';

const fx = { ref: '4b365c0de4890d384768dbd15e18193d9efb843c', domains: ['addiction', 'mental_health', 'recovery_housing', 'crisis'], not_offered: { crisis: 'no results yet' } };
const html = (vals) => vals.map((v) => `<label><input type="radio" name="domain" value="${v}"><span>x</span></label>`).join('') + '<input type="checkbox" name="payment" value="medicare">';

test('pageDomains reads domain radios only and skips the empty Any value', () => {
  assert.deepEqual(pageDomains(html(['', 'addiction', 'mental_health'])), ['addiction', 'mental_health']);
});
test('agreement passes, with the exempt type left out', () => {
  assert.deepEqual(compare(fx, ['addiction', 'mental_health', 'recovery_housing']), []);
});
test('a service type the page lacks fails and names it', () => {
  const bad = compare(fx, ['addiction', 'recovery_housing']);
  assert.equal(bad.length, 1);
  assert.match(bad[0], /"mental_health"/);
});
test('a new service type not in not_offered fails', () => {
  const bad = compare({ ...fx, domains: [...fx.domains, 'detox'] }, ['addiction', 'mental_health', 'recovery_housing']);
  assert.match(bad.join(), /"detox"/);
});
test('a page type the service does not list fails', () => {
  assert.match(compare(fx, ['addiction', 'mental_health', 'recovery_housing', 'bogus']).join(), /"bogus"/);
});
test('no radios at all fails', () => { assert.ok(compare(fx, []).length > 0); });
