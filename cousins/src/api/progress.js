import { verifySession, readSessionCookie } from '../lib/session.js';
import { getProgress, putProgress } from '../lib/kv.js';
import { canPlayChapter, applyEffects, markComplete } from '../lib/gating.js';
import { jsonResponse } from '../lib/http.js';

export async function handleProgress(request, env) {
  const token = readSessionCookie(request);
  const payload = token ? await verifySession(token, env.SESSION_SECRET) : null;
  if (!payload) return jsonResponse({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'bad_request' }, 400);
  }
  const { storyId, chapter, effects } = body || {};
  if (!storyId || typeof chapter !== 'number' || typeof effects !== 'object' || effects === null) {
    return jsonResponse({ error: 'bad_request' }, 400);
  }

  const progress = await getProgress(env.COUSINS_KV, payload.slug, storyId);

  if (!canPlayChapter(progress.chaptersCompleted, chapter)) {
    return jsonResponse({ error: 'chapter_locked' }, 409);
  }

  const nextState = applyEffects(progress.state, effects);
  const nextProgress = markComplete({ ...progress, state: nextState }, chapter);

  await putProgress(env.COUSINS_KV, payload.slug, storyId, nextProgress);

  return jsonResponse({ chaptersCompleted: nextProgress.chaptersCompleted, state: nextProgress.state });
}
