export async function getAccount(kv, slug) {
  const raw = await kv.get(`account:${slug}`);
  return raw ? JSON.parse(raw) : null;
}

export async function getProgress(kv, slug, storyId) {
  const raw = await kv.get(`progress:${slug}:${storyId}`);
  return raw ? JSON.parse(raw) : { chaptersCompleted: [], state: {} };
}

export async function putProgress(kv, slug, storyId, progress) {
  await kv.put(`progress:${slug}:${storyId}`, JSON.stringify(progress));
}
