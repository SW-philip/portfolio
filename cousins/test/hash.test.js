// cousins/test/hash.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPin, verifyPin, randomSalt } from '../src/lib/hash.js';

test('hashPin is deterministic for the same salt+pin', async () => {
  const salt = 'abc123';
  const h1 = await hashPin('4821', salt);
  const h2 = await hashPin('4821', salt);
  assert.equal(h1, h2);
});

test('hashPin differs across salts for the same pin', async () => {
  const h1 = await hashPin('4821', 'salt-one');
  const h2 = await hashPin('4821', 'salt-two');
  assert.notEqual(h1, h2);
});

test('verifyPin accepts the correct pin and rejects a wrong one', async () => {
  const salt = randomSalt();
  const hash = await hashPin('1234', salt);
  assert.equal(await verifyPin('1234', salt, hash), true);
  assert.equal(await verifyPin('9999', salt, hash), false);
});

test('randomSalt returns 32 hex chars and varies each call', () => {
  const a = randomSalt();
  const b = randomSalt();
  assert.equal(a.length, 32);
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.notEqual(a, b);
});
