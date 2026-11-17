// Run: node --test assets/js/finder-transit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const T = createRequire(import.meta.url)('./finder-transit.js');

test('request carries lat, lng and service ids only, once each, capped at 200', () => {
  assert.deepEqual(T.buildRequest(37.5407, -77.436, ['a', 'res-9', 'b', 'a']), { lat: 37.5407, lng: -77.436, ids: ['a', 'b'] });
  const many = Array.from({ length: 450 }, (_, i) => 's' + i);
  assert.equal(T.buildRequest(1, 2, many).ids.length, 200);
});

test('no request without a finite pin or without service ids', () => {
  assert.equal(T.buildRequest(NaN, 1, ['a']), null);
  assert.equal(T.buildRequest('1', 1, ['a']), null);
  assert.equal(T.buildRequest(1, 2, ['res-1']), null);
  assert.equal(T.buildRequest(1, 2, []), null);
});

test('minutes read "About N min by transit"', () => {
  assert.deepEqual(T.describe({ id: 'a', minutes: 34.4 }), { text: 'About 34 min by transit' });
  assert.equal(T.describe({ id: 'a', minutes: 0.2 }).text, 'About 1 min by transit');
});

test('no minutes: distance and an agency trip-planner link', () => {
  assert.deepEqual(T.describe({ id: 'a', minutes: null, distance_km: 12.34, agency: { name: 'GRTC', url: 'https://ridegrtc.com/' } }),
    { text: '12 km straight line', linkText: 'Plan the trip with GRTC', href: 'https://ridegrtc.com/' });
  assert.equal(T.describe({ id: 'a', minutes: null, distance_km: 3.26 }).text, '3.3 km straight line');
  assert.equal(T.describe({ id: 'a', minutes: null, distance_km: 3, agency: { name: 'GRTC' } }).href, undefined);
});

test('an unsafe agency url is dropped, the distance stays', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '//evil', 'not a url', 42, null]) {
    const d = T.describe({ minutes: null, distance_km: 5, agency: { name: 'X', url } });
    assert.equal(d.href, undefined, String(url));
    assert.equal(d.linkText, undefined, String(url));
    assert.match(d.text, /km straight line/);
  }
});

test('entry with neither minutes nor distance shows nothing', () => {
  assert.equal(T.describe({ id: 'a', minutes: null }), null);
  assert.equal(T.describe(null), null);
});

test('answer is an array or {results: []}', () => {
  assert.deepEqual(T.entries([{ id: 'a' }]), [{ id: 'a' }]);
  assert.deepEqual(T.entries({ results: [{ id: 'a' }] }), [{ id: 'a' }]);
  assert.deepEqual(T.entries({}), []);
});
