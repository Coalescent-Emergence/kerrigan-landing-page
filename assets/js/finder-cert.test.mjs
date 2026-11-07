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

// Vacancies (tracker 254). Fixture shape follows the plan; HTML is rendered the way finder.js builds the card.
import { readFileSync } from 'node:fs';
const { vacancyView } = createRequire(import.meta.url)('./finder-cert.js');
const fx = JSON.parse(readFileSync(new URL('./testdata/residences-oxford.json', import.meta.url)));
const TODAY = '2026-11-06';
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = (r) => vacancyView(r.vacancy, r.admission, TODAY)
  .map((l) => `<p class="${l.cls}">${esc(l.text)}</p>`).join('');
const byId = (id) => fx.results.find((r) => r.id === id);

test('a fresh posting shows beds, chips, the house date, and the interview line', () => {
  const h = html(byId('r-fresh'));
  console.log(h);
  assert.ok(h.includes('Vacancies: 2 beds (men, no children)'));
  assert.ok(h.includes('Posted by the house 2026-11-04'));
  assert.ok(!h.includes('Out of date'));
  assert.ok(h.includes('Admission is by interview and house vote.'));
});

test('a posting older than 7 days reads out of date', () => {
  const h = html(byId('r-old'));
  console.log(h);
  assert.ok(h.includes('Posted by the house 2026-10-20. Out of date: older than 7 days.'));
  assert.ok(h.includes('finder-vacancy-stale'));
});

test('exactly 7 days old is not yet out of date', () => {
  assert.ok(!html({ vacancy: { beds: 1, posted_on: '2026-10-30' } }).includes('Out of date'));
});

test('no date reads out of date and says no date was given', () => {
  const h = html(byId('r-undated'));
  console.log(h);
  assert.ok(h.includes('Posted by the house, no date given. Out of date.'));
});

test('a non-Oxford residence gets no vacancy or admission lines', () => {
  assert.equal(html(byId('r-dbhds')), '');
});
