import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleStoryState } from '../src/api/story-state.js';

function makeMockKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async put(key, value) { store.set(key, value); },
    async list({ prefix } = {}) {
      const keys = [...store.keys()].filter(k => !prefix || k.startsWith(prefix)).map(name => ({ name }));
      return { keys, list_complete: true, cursor: '' };
    },
  };
}

test('handleStoryState requires no session and returns the merged state', async () => {
  const kv = makeMockKv({
    'account:laine': '{}',
    'progress:laine:shorestorm': JSON.stringify({ chaptersCompleted: [1], state: { laine_ch2: 'pulled' } }),
  });
  const env = { COUSINS_KV: kv };
  const request = new Request('https://philipjrepko.com/cousins/api/story-state?story=shorestorm');
  const response = await handleStoryState(request, env, 'shorestorm');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.storyId, 'shorestorm');
  assert.deepEqual(body.chaptersCompleted, [1]);
  assert.equal(body.state.laine_ch2, 'pulled');
});
