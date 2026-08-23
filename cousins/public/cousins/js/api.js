// cousins/public/js/api.js
async function apiFetch(path, options = {}) {
  return fetch(`/cousins/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
}

export async function postLogin(slug, pin) {
  const response = await apiFetch('/login', { method: 'POST', body: JSON.stringify({ slug, pin }) });
  if (!response.ok) return null;
  return response.json();
}

export async function postLogout() {
  await apiFetch('/logout', { method: 'POST' });
}

export async function getMe(storyId = 'shorestorm') {
  const response = await apiFetch(`/me?story=${encodeURIComponent(storyId)}`);
  if (!response.ok) return null;
  return response.json();
}

export async function postProgress({ storyId, chapter, effects }) {
  const response = await apiFetch('/progress', {
    method: 'POST',
    body: JSON.stringify({ storyId, chapter, effects }),
  });
  if (!response.ok) return null;
  return response.json();
}

export async function getStoryState(storyId = 'shorestorm') {
  const response = await apiFetch(`/story-state?story=${encodeURIComponent(storyId)}`);
  if (!response.ok) return null;
  return response.json();
}
