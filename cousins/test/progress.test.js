import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleProgress } from '../src/api/progress.js';
import { signSession, cookieHeader } from '../src/lib/session.js';

function makeMockKv(data = {}) {
  const store = new Map(Object.entries(data));
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async put(key, value) { store.set(key, value); },
    _store: store,
  };
}

async function makeRequest(secret, slug, body) {
  const token = await signSession({ slug, exp: Date.now() + 10000 }, secret);
  return new Request('https://philipjrepko.com/cousins/api/progress', {
    method: 'POST',
    headers: { Cookie: cookieHeader(token, 100).split(';')[0] },
    body: JSON.stringify(body),
  });
}

test('handleProgress saves chapter 1 with no prior progress', async () => {
  const kv = makeMockKv();
  const env = { COUSINS_KV: kv, SESSION_SECRET: 'secret' };
  const request = await makeRequest('secret', 'olivia', {
    storyId: 'shorestorm',
    chapter: 1,
    effects: { team_spark: 1, olivia_power: 'veil' },
  });
  const response = await handleProgress(request, env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.chaptersCompleted, [1]);
  assert.equal(body.state.team_spark, 1);
  assert.equal(body.state.olivia_power, 'veil');
});

test('handleProgress rejects chapter 2 before chapter 1 is complete', async () => {
  const env = { COUSINS_KV: makeMockKv(), SESSION_SECRET: 'secret' };
  const request = await makeRequest('secret', 'olivia', { storyId: 'shorestorm', chapter: 2, effects: {} });
  assert.equal((await handleProgress(request, env)).status, 409);
});

test('handleProgress accumulates numeric effects across chapters', async () => {
  const kv = makeMockKv({
    'progress:olivia:shorestorm': JSON.stringify({ chaptersCompleted: [1], state: { team_spark: 2 } }),
  });
  const env = { COUSINS_KV: kv, SESSION_SECRET: 'secret' };
  const request = await makeRequest('secret', 'olivia', {
    storyId: 'shorestorm',
    chapter: 2,
    effects: { team_spark: 3 },
  });
  const body = await (await handleProgress(request, env)).json();
  assert.equal(body.state.team_spark, 5);
  assert.deepEqual(body.chaptersCompleted, [1, 2]);
});

test('handleProgress returns 401 without a valid session', async () => {
  const env = { COUSINS_KV: makeMockKv(), SESSION_SECRET: 'secret' };
  const request = new Request('https://philipjrepko.com/cousins/api/progress', {
    method: 'POST',
    body: JSON.stringify({ storyId: 'shorestorm', chapter: 1, effects: {} }),
  });
  assert.equal((await handleProgress(request, env)).status, 401);
});

test('handleProgress returns 400 on a malformed body', async () => {
  const env = { COUSINS_KV: makeMockKv(), SESSION_SECRET: 'secret' };
  const request = await makeRequest('secret', 'olivia', { storyId: 'shorestorm' }); // missing chapter/effects
  assert.equal((await handleProgress(request, env)).status, 400);
});
