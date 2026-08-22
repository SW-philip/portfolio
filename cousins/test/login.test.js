import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleLogin } from '../src/api/login.js';
import { hashPin, randomSalt } from '../src/lib/hash.js';

function makeMockKv(accounts) {
  const store = new Map(
    Object.entries(accounts).map(([slug, acct]) => [`account:${slug}`, JSON.stringify(acct)]),
  );
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async put(key, value) { store.set(key, value); },
  };
}

async function makeEnv(pin) {
  const salt = randomSalt();
  const pinHash = await hashPin(pin, salt);
  return {
    COUSINS_KV: makeMockKv({ olivia: { slug: 'olivia', name: 'Olivia', color: '#d7afff', salt, pinHash } }),
    SESSION_SECRET: 'test-secret',
  };
}

test('handleLogin sets a session cookie on the correct pin', async () => {
  const env = await makeEnv('1234');
  const request = new Request('https://philipjrepko.com/cousins/api/login', {
    method: 'POST',
    body: JSON.stringify({ slug: 'olivia', pin: '1234' }),
  });
  const response = await handleLogin(request, env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Set-Cookie'), /^cousins_session=/);
  const body = await response.json();
  assert.equal(body.name, 'Olivia');
});

test('handleLogin rejects the wrong pin with 401 and no cookie', async () => {
  const env = await makeEnv('1234');
  const request = new Request('https://philipjrepko.com/cousins/api/login', {
    method: 'POST',
    body: JSON.stringify({ slug: 'olivia', pin: '0000' }),
  });
  const response = await handleLogin(request, env);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('Set-Cookie'), null);
});

test('handleLogin rejects an unknown slug', async () => {
  const env = { COUSINS_KV: makeMockKv({}), SESSION_SECRET: 'test-secret' };
  const request = new Request('https://philipjrepko.com/cousins/api/login', {
    method: 'POST',
    body: JSON.stringify({ slug: 'nobody', pin: '1234' }),
  });
  assert.equal((await handleLogin(request, env)).status, 401);
});

test('handleLogin rejects a malformed body with 400', async () => {
  const env = await makeEnv('1234');
  const request = new Request('https://philipjrepko.com/cousins/api/login', {
    method: 'POST',
    body: 'not json',
  });
  assert.equal((await handleLogin(request, env)).status, 400);
});
