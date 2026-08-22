import { getAccount } from '../lib/kv.js';
import { verifyPin } from '../lib/hash.js';
import { signSession, cookieHeader } from '../lib/session.js';
import { jsonResponse } from '../lib/http.js';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

export async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'bad_request' }, 400);
  }
  const { slug, pin } = body || {};
  if (!slug || !pin) return jsonResponse({ error: 'bad_request' }, 400);

  const account = await getAccount(env.COUSINS_KV, slug);
  if (!account) return jsonResponse({ error: 'invalid_credentials' }, 401);

  const ok = await verifyPin(pin, account.salt, account.pinHash);
  if (!ok) return jsonResponse({ error: 'invalid_credentials' }, 401);

  const exp = Date.now() + SESSION_TTL_SECONDS * 1000;
  const token = await signSession({ slug, exp }, env.SESSION_SECRET);

  return jsonResponse(
    { name: account.name, color: account.color, slug: account.slug },
    200,
    { 'Set-Cookie': cookieHeader(token, SESSION_TTL_SECONDS) },
  );
}
