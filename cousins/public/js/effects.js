export function mergeEffects(accumulated, effects) {
  const next = { ...accumulated };
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value === 'number') {
      next[key] = (typeof next[key] === 'number' ? next[key] : 0) + value;
    } else {
      next[key] = value;
    }
  }
  return next;
}
