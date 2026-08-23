import { getMergedState } from '../lib/kv.js';
import { jsonResponse } from '../lib/http.js';

export async function handleStoryState(request, env, storyId) {
  const { state, chaptersCompleted } = await getMergedState(env.COUSINS_KV, storyId);
  return jsonResponse({ storyId, state, chaptersCompleted });
}
