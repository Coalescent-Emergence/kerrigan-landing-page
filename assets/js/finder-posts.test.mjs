// Run: node --test assets/js/finder-posts.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const P = createRequire(import.meta.url)('./finder-posts.js');
const TODAY = '2026-11-13';
const post = (o) => Object.assign({ post_id: 'post-9', status: 'open', posted_on: '2026-11-13', stale: false, author_kind: 'counselor' }, o);

test('no post reads no recent report', () => {
  assert.equal(P.view(null, {}, TODAY).text, 'no recent report');
  assert.equal(P.view(undefined, {}, TODAY).kind, 'none');
});

test('a fresh post shows status, date and a signed-in counselor, never an author', () => {
  const v = P.view(post({ author: 'x@y.z', author_ref: 'u1' }), {}, TODAY);
  assert.equal(v.text, 'Open on 2026-11-13 by a signed-in counselor');
  assert.ok(!/x@y\.z|u1/.test(v.text));
});

test('each status has its label', () => {
  assert.match(P.view(post({ status: 'waitlist' }), {}, TODAY).text, /^Waitlist on/);
  assert.match(P.view(post({ status: 'full' }), {}, TODAY).text, /^Full on/);
});

test('older than 7 days is out of date; exactly 7 is not; the server stale flag also counts', () => {
  assert.equal(P.view(post({ posted_on: '2026-11-05' }), {}, TODAY).kind, 'stale');
  assert.match(P.view(post({ posted_on: '2026-11-05' }), {}, TODAY).text, /out of date$/);
  assert.equal(P.view(post({ posted_on: '2026-11-06' }), {}, TODAY).kind, 'current');
  assert.equal(P.view(post({ stale: true }), {}, TODAY).kind, 'stale');
});

test('a reported post reads reported and shows no status', () => {
  const v = P.view(post({ reported: true }), {}, TODAY);
  assert.equal(v.text, 'reported');
  assert.equal(v.status, '');
});

test('detox and crisis results read Posted open on <date>, never a same-day opening', () => {
  const detox = { facets: { wm: { value: 'yes' } } };
  const crisis = { type: 'crisis_receiving' };
  for (const rec of [detox, crisis]) {
    const t = P.view(post(), rec, TODAY).text;
    assert.equal(t, 'Posted open on 2026-11-13 by a signed-in counselor');
    assert.ok(!/today|now|available/i.test(t));
  }
  assert.match(P.view(post(), {}, TODAY, true).text, /^Posted open on/);
});

test('an unknown status is no report', () => {
  assert.equal(P.view(post({ status: 'maybe' }), {}, TODAY).kind, 'none');
});

test('itemsParam dedupes and joins', () => {
  assert.equal(P.itemsParam(['svc-1', 'res-4', 'svc-1', '']), 'svc-1,res-4');
});

test('failText names a repeat report', () => {
  assert.equal(P.failText(409, 'report this'), 'You already reported this.');
});
