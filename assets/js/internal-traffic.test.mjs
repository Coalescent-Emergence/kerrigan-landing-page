// Run: node --test assets/js/internal-traffic.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { isInternal, KEY } = createRequire(import.meta.url)('./internal-traffic.js');

function fakeStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('a normal visit is not internal', () => {
  assert.equal(isInternal('', fakeStore(), false), false);
});

test('?internal=1 marks the browser and it persists on later visits', () => {
  const s = fakeStore();
  assert.equal(isInternal('?internal=1', s, false), true);
  assert.equal(s.getItem(KEY), '1');
  assert.equal(isInternal('', s, false), true);
});

test('?internal=0 clears the mark', () => {
  const s = fakeStore();
  isInternal('?internal=1', s, false);
  assert.equal(isInternal('?internal=0', s, false), false);
  assert.equal(isInternal('', s, false), false);
});

test('webdriver browsers are internal without touching storage', () => {
  const s = fakeStore();
  assert.equal(isInternal('', s, true), true);
  assert.equal(s.getItem(KEY), null);
});

test('blocked storage does not throw', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  assert.equal(isInternal('?internal=1', bad, false), false);
  assert.equal(isInternal('', bad, true), true);
});
