import { handleLogin } from './api/login.js';
import { handleLogout } from './api/logout.js';
import { handleMe } from './api/me.js';
import { handleProgress } from './api/progress.js';
import { handleStoryState } from './api/story-state.js';
import { jsonResponse } from './lib/http.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/cousins/api/login' && request.method === 'POST') {
      return handleLogin(request, env);
    }
    if (url.pathname === '/cousins/api/logout' && request.method === 'POST') {
      return handleLogout();
    }
    if (url.pathname === '/cousins/api/me' && request.method === 'GET') {
      const storyId = url.searchParams.get('story') || 'shorestorm';
      return handleMe(request, env, storyId);
    }
    if (url.pathname === '/cousins/api/progress' && request.method === 'POST') {
      return handleProgress(request, env);
    }
    if (url.pathname === '/cousins/api/story-state' && request.method === 'GET') {
      const storyId = url.searchParams.get('story') || 'shorestorm';
      return handleStoryState(request, env, storyId);
    }
    if (url.pathname.startsWith('/cousins/api/')) {
      return jsonResponse({ error: 'not_found' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
