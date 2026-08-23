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

export async function listAccountSlugs(kv) {
  const { keys } = await kv.list({ prefix: 'account:' });
  return keys.map(({ name }) => name.slice('account:'.length));
}

export async function getMergedState(kv, storyId) {
  const slugs = await listAccountSlugs(kv);
  const progresses = await Promise.all(slugs.map(slug => getProgress(kv, slug, storyId)));
  let state = {};
  let chaptersCompleted = new Set();
  for (const progress of progresses) {
    state = { ...state, ...progress.state };
    for (const chapter of progress.chaptersCompleted) chaptersCompleted.add(chapter);
  }
  return { state, chaptersCompleted: [...chaptersCompleted].sort((a, b) => a - b) };
}
