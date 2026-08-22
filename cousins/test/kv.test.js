import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAccount, getProgress, putProgress } from '../src/lib/kv.js';

function makeMockKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async put(key, value) { store.set(key, value); },
  };
}

test('getAccount parses the stored JSON', async () => {
  const kv = makeMockKv({ 'account:olivia': JSON.stringify({ slug: 'olivia', name: 'Olivia', color: '#c' }) });
  const account = await getAccount(kv, 'olivia');
  assert.equal(account.name, 'Olivia');
});

test('getAccount returns null for an unknown slug', async () => {
  const kv = makeMockKv();
  assert.equal(await getAccount(kv, 'nobody'), null);
});

test('getProgress returns the default shape when unset', async () => {
  const kv = makeMockKv();
  const progress = await getProgress(kv, 'olivia', 'shorestorm');
  assert.deepEqual(progress, { chaptersCompleted: [], state: {} });
});

test('putProgress then getProgress round-trips', async () => {
  const kv = makeMockKv();
  await putProgress(kv, 'olivia', 'shorestorm', { chaptersCompleted: [1], state: { team_spark: 1 } });
  const progress = await getProgress(kv, 'olivia', 'shorestorm');
  assert.deepEqual(progress, { chaptersCompleted: [1], state: { team_spark: 1 } });
});
