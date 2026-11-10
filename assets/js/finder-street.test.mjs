// Run: node --test assets/js/finder-street.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { streetLine } = createRequire(import.meta.url)('./finder-street.js');

test('signed-in detail gives number, street, town and zip', () => {
  assert.equal(streetLine({ house_number: '12', street: 'Oak St', town: 'Richmond', zip: '23219' }, { town: 'Richmond' }),
    '12 Oak St, Richmond 23219');
});

test('a missing house number or zip is left out, never guessed', () => {
  assert.equal(streetLine({ house_number: null, street: 'Oak St', town: 'Richmond', zip: null }, {}), 'Oak St, Richmond');
});

test('no street in the detail means no street line (the town line stays)', () => {
  assert.equal(streetLine({ house_number: null, street: null, town: 'Richmond', zip: '23219' }, { town: 'Richmond' }), null);
  assert.equal(streetLine(null, { town: 'Richmond' }), null);
});
