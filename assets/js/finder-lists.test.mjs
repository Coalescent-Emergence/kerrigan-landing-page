// Run: node --test assets/js/finder-lists.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const L = createRequire(import.meta.url)('./finder-lists.js');

function fakeStore(init) {
  const m = new Map(Object.entries(init || {}));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), keys: () => [...m.keys()] };
}

// facetValue as finder.js reads a facet: [[text, isUnknown]]
function facetValue(key, f) {
  if (!f || f.value == null) return [['Unknown', true]];
  if (typeof f.value === 'string') return [[f.value === 'yes' ? 'Yes' : f.value === 'no' ? 'No' : f.value, f.value === 'unknown']];
  if (Array.isArray(f.value)) return f.value.length ? [[(f.labels || f.value).join(', '), false]] : [['Unknown', true]];
  return Object.keys(f.value).map((k) => (f.value[k] === 'yes' ? ['Reports ' + k, false] : [k + ': Unknown', true]));
}

test('the note warning is the exact sentence the issue gives', () => {
  assert.equal(L.NOTE_WARNING, 'Notes stay in this browser. They are about the facility; do not enter client names or details.');
});

test('a signed-in note is keyed by account and facility; signed out keeps the old key', () => {
  assert.equal(L.noteKey('u-1', 'svc-3'), 'finder-note:u-1:svc-3');
  assert.equal(L.noteKey(null, 'svc-3'), 'finder-note:svc-3');
  assert.notEqual(L.noteKey('u-1', 'svc-3'), L.noteKey('u-2', 'svc-3'));
});

test('a signed-in counselor\'s first look moves the old note under the account, once', () => {
  const s = fakeStore({ 'finder-note:svc-3': 'call back Tuesday', 'finder-note:res-9': 'quiet street' });
  assert.equal(L.getNote(s, 'u-1', 'svc-3'), 'call back Tuesday');
  assert.equal(s.getItem('finder-note:svc-3'), null, 'the old key is gone');
  assert.equal(s.getItem('finder-note:u-1:svc-3'), 'call back Tuesday');
  assert.equal(s.getItem('finder-note:res-9'), 'quiet street', 'a facility not yet opened is left alone');
  assert.equal(L.getNote(fakeStore(), 'u-2', 'svc-3'), '', 'another account sees nothing');
});

test('migration never overwrites a note already kept under the account', () => {
  const s = fakeStore({ 'finder-note:svc-3': 'old', 'finder-note:u-1:svc-3': 'new' });
  assert.equal(L.getNote(s, 'u-1', 'svc-3'), 'new');
  assert.equal(s.getItem('finder-note:svc-3'), null);
});

test('an emptied note removes its key', () => {
  const s = fakeStore();
  L.setNote(s, 'u-1', 'svc-3', 'x');
  L.setNote(s, 'u-1', 'svc-3', '');
  assert.deepEqual(s.keys(), []);
});

test('a blocked store never throws', () => {
  const s = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(L.getNote(s, 'u-1', 'svc-3'), '');
  L.setNote(s, 'u-1', 'svc-3', 'x');
  L.setListName(s, 'u-1', 1, 'a');
});

test('list names live under the account and default by position', () => {
  const s = fakeStore();
  assert.equal(L.listName(s, 'u-1', 5, 1), 'My shortlist');
  assert.equal(L.listName(s, 'u-1', 6, 2), 'Shortlist 2');
  L.setListName(s, 'u-1', 5, '  Spring referrals  ');
  assert.equal(L.listName(s, 'u-1', 5, 1), 'Spring referrals');
  assert.equal(L.listName(s, 'u-2', 5, 1), 'My shortlist');
});

const svc = (id, extra) => Object.assign({ id, kind: 'service', name: 'Program ' + id, town: 'Richmond', phone: '804-555-0101', facets: {} }, extra);

test('compare has the five stored fields, and no transit row before that slice exists', () => {
  const a = svc('svc-1', { facets: { setting: { value: ['outpatient'], labels: ['Outpatient'] }, payment: { value: { medicaid: 'yes' } }, moud: { value: 'yes' }, population: { value: ['veterans'], labels: ['Veterans'] } } });
  const b = svc('svc-2', { phone: null });
  const rows = L.compareRows([a, b], facetValue);
  assert.deepEqual(rows.map((r) => r.label), ['Setting or level', 'Payment', 'Medication for opioid use disorder', 'Population', 'Phone']);
  assert.ok(!rows.some((r) => /transit/i.test(r.label)));
  assert.deepEqual(rows.map((r) => r.cells[0]), ['Outpatient', 'Reports medicaid', 'Yes', 'Veterans', '804-555-0101']);
  assert.deepEqual(rows.map((r) => r.cells[1]), Array(5).fill('Not reported'));
});

test('a residence reads as a recovery residence with the rest not reported', () => {
  const rows = L.compareRows([{ id: 'res-4', kind: 'residence', name: 'Oak House', facets: {} }], facetValue);
  assert.equal(rows[0].cells[0], 'Recovery residence');
  assert.equal(rows[4].cells[0], 'Not reported');
});

test('five on a shortlist: compare takes four, the ticked ones when there are any', () => {
  const five = ['svc-1', 'svc-2', 'svc-3', 'svc-4', 'svc-5'].map((id) => svc(id));
  assert.deepEqual(L.pickForCompare(five, []).map((e) => e.id), ['svc-1', 'svc-2', 'svc-3', 'svc-4']);
  assert.deepEqual(L.pickForCompare(five, ['svc-5', 'svc-2']).map((e) => e.id), ['svc-2', 'svc-5']);
  assert.equal(L.pickForCompare(five, five.map((e) => e.id)).length, 4);
});

const addressOf = (r) => [r.street, r.town].filter(Boolean).join(', ');
const crisis = [{ area: 'Crisis lines for Henrico County (Henrico Area CSB)', lines: [{ name: 'Henrico mental health crisis', phone: '804-727-8484', hours: '24 hours' }] }];

test('the handout carries name, address, phone and the area\'s crisis lines, and no note', () => {
  const recs = [svc('svc-1', { street: '1 Main St', hours: 'Mon-Fri 8-5' }), svc('svc-2', { subname: 'Annex' })];
  const m = L.handoutModel(recs, addressOf, crisis);
  assert.equal(m.entries[0].name, 'Program svc-1');
  assert.equal(m.entries[0].address, '1 Main St, Richmond');
  assert.equal(m.entries[0].phone, '804-555-0101');
  assert.equal(m.entries[0].hours, 'Mon-Fri 8-5');
  assert.equal(m.entries[1].name, 'Program svc-2 (Annex)');
  assert.equal(m.entries[1].hours, '');
  assert.equal(m.crisis[0].lines[0].phone, '804-727-8484');
  assert.ok(!JSON.stringify(m).includes('note'));
  assert.deepEqual(L.ALWAYS.map((l) => l.phone), ['911', '988']);
});

// A PDF whose xref offsets are wrong does not open: check each offset lands on its object.
function checkPdf(bytes) {
  const s = Buffer.from(bytes).toString('latin1');
  assert.ok(s.startsWith('%PDF-1.4\n'));
  assert.ok(s.endsWith('%%EOF\n'));
  const start = Number(/startxref\n(\d+)\n%%EOF/.exec(s)[1]);
  assert.equal(s.slice(start, start + 4), 'xref');
  const n = Number(/xref\n0 (\d+)\n/.exec(s.slice(start))[1]);
  const entries = [...s.slice(start).matchAll(/(\d{10}) 00000 n \n/g)].map((m) => Number(m[1]));
  assert.equal(entries.length, n - 1);
  entries.forEach((off, i) => assert.ok(s.startsWith((i + 1) + ' 0 obj\n', off), 'object ' + (i + 1) + ' at ' + off));
  [...s.matchAll(/<< \/Length (\d+) >>\nstream\n/g)].forEach((m) => {
    const from = m.index + m[0].length;
    assert.equal(s.slice(from + Number(m[1]), from + Number(m[1]) + 10), '\nendstream', 'stream length');
  });
  return s;
}

test('the PDF is well formed and holds the handout text', () => {
  const m = L.handoutModel([svc('svc-1', { street: '1 Main (East) St\\' })], addressOf, crisis);
  const s = checkPdf(L.buildPdf(m, 'Treatment options'));
  for (const want of ['Program svc-1', '804-555-0101', '1 Main \\(East\\) St\\\\, Richmond', '988', '911', 'Henrico County', '804-727-8484']) {
    assert.ok(s.includes(want), 'PDF text lacks ' + want);
  }
  assert.match(s, /\/Count 1 /);
});

test('a long handout breaks across pages and still has valid offsets', () => {
  const recs = Array.from({ length: 10 }, (_, i) => svc('svc-' + (i + 10), { street: 'A very long street name that goes on and on, '.repeat(6) }));
  const s = checkPdf(L.buildPdf(L.handoutModel(recs, addressOf, crisis), 'Options'));
  assert.ok(Number(/\/Count (\d+) /.exec(s)[1]) >= 2);
});

test('a handout holds at most ten entries', () => {
  const recs = Array.from({ length: 14 }, (_, i) => svc('svc-' + (i + 10)));
  assert.equal(L.handoutModel(recs, addressOf, []).entries.length, L.HANDOUT_MAX);
});

test('text a standard PDF font cannot show is made safe, not dropped silently into broken bytes', () => {
  const m = L.handoutModel([svc('svc-1', { name: 'Café “Hope” — 中' })], addressOf, []);
  const s = checkPdf(L.buildPdf(m, 'T'));
  assert.ok(s.includes('Caf? "Hope" - ?'));
});
