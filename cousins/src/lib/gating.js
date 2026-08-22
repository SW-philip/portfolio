export function canPlayChapter(chaptersCompleted, chapterNumber) {
  if (chapterNumber === 1) return true;
  return chaptersCompleted.includes(chapterNumber - 1);
}

export function applyEffects(state, effects) {
  const next = { ...state };
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value === 'number') {
      next[key] = (typeof next[key] === 'number' ? next[key] : 0) + value;
    } else {
      next[key] = value;
    }
  }
  return next;
}

export function markComplete(progress, chapterNumber) {
  const chaptersCompleted = progress.chaptersCompleted.includes(chapterNumber)
    ? progress.chaptersCompleted
    : [...progress.chaptersCompleted, chapterNumber].sort((a, b) => a - b);
  return { ...progress, chaptersCompleted };
}
