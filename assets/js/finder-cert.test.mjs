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

// Vacancies (tracker 254). The fixture is a recorded kerr-finder response; a post's age is set by the test.
import { readFileSync } from 'node:fs';
const { vacancyView } = createRequire(import.meta.url)('./finder-cert.js');
const fx = JSON.parse(readFileSync(new URL('./testdata/residences-oxford.json', import.meta.url)));
const TODAY = '2026-11-02'; // 7 days after the cards' 2026-10-26 posts
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = (r, today = TODAY) => vacancyView(r.vacancy, r.admission, today)
  .map((l) => `<p class="${l.cls}">${esc(l.text)}</p>`).join('');
const byName = (name) => fx.results.find((r) => r.name === name);
const cottonwood = byName('Oxford House Cottonwood');

test('a house with vacancies reads Posted by the house with the card date, apart from counselor posts', () => {
  const h = html(cottonwood);
  console.log(h);
  assert.ok(h.includes('Vacancies: 1 bed'));
  assert.ok(h.includes('Posted by the house 2026-10-26'));
  assert.ok(h.includes('finder-vacancy-posted'));
  assert.ok(!/counselor/i.test(h));
  assert.ok(!h.includes('Out of date'));
});

test('a posting more than 7 days old reads out of date', () => {
  const h = html(cottonwood, '2026-11-03');
  console.log(h);
  assert.ok(h.includes('Posted by the house 2026-10-26. Out of date: older than 7 days.'));
  assert.ok(h.includes('finder-vacancy-stale'));
});

test('exactly 7 days old is not yet out of date', () => {
  assert.ok(!html(cottonwood, '2026-11-02').includes('Out of date'));
});

test('no date reads out of date and says no date was given', () => {
  const h = html({ vacancy: { ...cottonwood.vacancy, posted_on: null }, admission: null });
  console.log(h);
  assert.ok(h.includes('Posted by the house, no date given. Out of date.'));
});

test('no vacancies posted reads as such', () => {
  assert.ok(html({ vacancy: { beds: 0, posted_on: '2026-10-26', stale_after_days: 7 } }).includes('No vacancies posted'));
});

test('every Oxford House says admission is by interview and house vote', () => {
  const houses = fx.results.filter((r) => r.name.startsWith('Oxford House '));
  assert.ok(houses.length >= 3);
  for (const r of houses) assert.ok(html(r).includes('Admission is by interview and house vote.'), r.name);
});

test('a house that is not an Oxford House gets no vacancy or admission lines', () => {
  const r = byName('Moton House');
  assert.equal(r.vacancy, null);
  assert.equal(html(r), '');
});
