import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  signSession, verifySession, cookieHeader, clearCookieHeader, readSessionCookie,
} from '../src/lib/session.js';

test('signSession then verifySession round-trips the payload', async () => {
  const token = await signSession({ slug: 'olivia', exp: Date.now() + 10000 }, 'test-secret');
  const payload = await verifySession(token, 'test-secret');
  assert.equal(payload.slug, 'olivia');
});

test('verifySession rejects a token signed with a different secret', async () => {
  const token = await signSession({ slug: 'olivia', exp: Date.now() + 10000 }, 'secret-a');
  assert.equal(await verifySession(token, 'secret-b'), null);
});

test('verifySession rejects an expired token', async () => {
  const token = await signSession({ slug: 'olivia', exp: Date.now() - 1000 }, 'secret');
  assert.equal(await verifySession(token, 'secret'), null);
});

test('verifySession rejects a tampered payload', async () => {
  const token = await signSession({ slug: 'olivia', exp: Date.now() + 10000 }, 'secret');
  const [payloadB64, sigB64] = token.split('.');
  const tampered = `${payloadB64}x.${sigB64}`;
  assert.equal(await verifySession(tampered, 'secret'), null);
});

test('readSessionCookie extracts the token from a Cookie header', async () => {
  const token = await signSession({ slug: 'ivory', exp: Date.now() + 1000 }, 'secret');
  const request = new Request('https://philipjrepko.com/cousins/api/me', {
    headers: { Cookie: `other=1; cousins_session=${token}; more=2` },
  });
  assert.equal(readSessionCookie(request), token);
});

test('readSessionCookie returns null when the cookie is absent', () => {
  const request = new Request('https://philipjrepko.com/cousins/api/me');
  assert.equal(readSessionCookie(request), null);
});

test('cookieHeader and clearCookieHeader are shaped correctly', () => {
  assert.match(cookieHeader('tok', 100), /^cousins_session=tok; Path=\/cousins;.*Max-Age=100$/);
  assert.match(clearCookieHeader(), /Max-Age=0$/);
});
