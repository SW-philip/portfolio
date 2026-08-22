import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canPlayChapter, applyEffects, markComplete } from '../src/lib/gating.js';

test('chapter 1 is always playable', () => {
  assert.equal(canPlayChapter([], 1), true);
});

test('chapter N requires N-1 to be completed', () => {
  assert.equal(canPlayChapter([1], 2), true);
  assert.equal(canPlayChapter([1], 3), false);
  assert.equal(canPlayChapter([], 2), false);
});

test('applyEffects adds numeric fields onto existing state without mutating it', () => {
  const state = { team_spark: 3 };
  const next = applyEffects(state, { team_spark: 1 });
  assert.equal(next.team_spark, 4);
  assert.equal(state.team_spark, 3);
});

test('applyEffects overwrites non-numeric fields', () => {
  const next = applyEffects({ clementine_power: null }, { clementine_power: 'healer' });
  assert.equal(next.clementine_power, 'healer');
});

test('applyEffects treats a missing numeric field as starting at 0', () => {
  assert.equal(applyEffects({}, { team_spark: 1 }).team_spark, 1);
});

test('markComplete appends a chapter number once, kept sorted', () => {
  const p1 = markComplete({ chaptersCompleted: [1], state: {} }, 2);
  assert.deepEqual(p1.chaptersCompleted, [1, 2]);
  const p2 = markComplete(p1, 2);
  assert.deepEqual(p2.chaptersCompleted, [1, 2]);
});
