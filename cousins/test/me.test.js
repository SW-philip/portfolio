import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleMe } from '../src/api/me.js';
import { signSession, cookieHeader } from '../src/lib/session.js';

function makeMockKv(data) {
  const store = new Map(Object.entries(data));
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async put(key, value) { store.set(key, value); },
  };
}

test('handleMe returns account + progress for a valid session', async () => {
  const env = {
    COUSINS_KV: makeMockKv({
      'account:olivia': JSON.stringify({ slug: 'olivia', name: 'Olivia', color: '#d7afff' }),
      'progress:olivia:shorestorm': JSON.stringify({ chaptersCompleted: [1], state: { team_spark: 2 } }),
    }),
    SESSION_SECRET: 'test-secret',
  };
  const token = await signSession({ slug: 'olivia', exp: Date.now() + 10000 }, 'test-secret');
  const request = new Request('https://philipjrepko.com/cousins/api/me', {
    headers: { Cookie: cookieHeader(token, 100).split(';')[0] },
  });
  const response = await handleMe(request, env, 'shorestorm');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.name, 'Olivia');
  assert.deepEqual(body.chaptersCompleted, [1]);
  assert.equal(body.state.team_spark, 2);
});

test('handleMe returns 401 with no session cookie', async () => {
  const env = { COUSINS_KV: makeMockKv({}), SESSION_SECRET: 'test-secret' };
  const request = new Request('https://philipjrepko.com/cousins/api/me');
  assert.equal((await handleMe(request, env)).status, 401);
});

test('handleMe returns 401 for a session signed with a different secret', async () => {
  const env = { COUSINS_KV: makeMockKv({}), SESSION_SECRET: 'test-secret' };
  const token = await signSession({ slug: 'olivia', exp: Date.now() + 10000 }, 'other-secret');
  const request = new Request('https://philipjrepko.com/cousins/api/me', {
    headers: { Cookie: `cousins_session=${token}` },
  });
  assert.equal((await handleMe(request, env)).status, 401);
});
