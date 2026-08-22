import { verifySession, readSessionCookie } from '../lib/session.js';
import { getAccount, getProgress } from '../lib/kv.js';
import { jsonResponse } from '../lib/http.js';

export async function handleMe(request, env, storyId = 'shorestorm') {
  const token = readSessionCookie(request);
  const payload = token ? await verifySession(token, env.SESSION_SECRET) : null;
  if (!payload) return jsonResponse({ error: 'unauthorized' }, 401);

  const account = await getAccount(env.COUSINS_KV, payload.slug);
  if (!account) return jsonResponse({ error: 'unauthorized' }, 401);

  const progress = await getProgress(env.COUSINS_KV, payload.slug, storyId);

  return jsonResponse({
    name: account.name,
    color: account.color,
    slug: account.slug,
    storyId,
    chaptersCompleted: progress.chaptersCompleted,
    state: progress.state,
  });
}
