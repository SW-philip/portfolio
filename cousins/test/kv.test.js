import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAccount, getProgress, putProgress, listAccountSlugs, getMergedState } from '../src/lib/kv.js';

function makeMockKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async put(key, value) { store.set(key, value); },
    async list({ prefix } = {}) {
      const keys = [...store.keys()].filter(k => !prefix || k.startsWith(prefix)).map(name => ({ name }));
      return { keys, list_complete: true, cursor: '' };
    },
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

test('listAccountSlugs returns every account key with the prefix stripped', async () => {
  const kv = makeMockKv({
    'account:laine': '{}',
    'account:ivory': '{}',
    'progress:laine:shorestorm': '{}',
  });
  const slugs = await listAccountSlugs(kv);
  assert.deepEqual(slugs.sort(), ['ivory', 'laine']);
});

test('getMergedState unions state and chaptersCompleted across every account', async () => {
  const kv = makeMockKv({
    'account:laine': '{}',
    'account:clementine': '{}',
    'progress:laine:shorestorm': JSON.stringify({ chaptersCompleted: [1, 2, 3], state: { team_spark: 17, laine_ch2: 'pulled' } }),
    'progress:clementine:shorestorm': JSON.stringify({ chaptersCompleted: [1, 2], state: { team_spark: 11, clementine_ch2: 'healed' } }),
  });
  const merged = await getMergedState(kv, 'shorestorm');
  assert.deepEqual(merged.chaptersCompleted, [1, 2, 3]);
  assert.equal(merged.state.laine_ch2, 'pulled');
  assert.equal(merged.state.clementine_ch2, 'healed');
});
