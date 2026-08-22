import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeEffects } from '../public/js/effects.js';

test('mergeEffects sums numeric effects across calls', () => {
  let acc = {};
  acc = mergeEffects(acc, { team_spark: 1 });
  acc = mergeEffects(acc, { team_spark: 1 });
  assert.equal(acc.team_spark, 2);
});

test('mergeEffects overwrites string effects with the latest value', () => {
  let acc = mergeEffects({}, { clementine_power: 'healer' });
  acc = mergeEffects(acc, { clementine_power: 'builder' });
  assert.equal(acc.clementine_power, 'builder');
});

test('mergeEffects does not mutate the accumulated object it was given', () => {
  const acc = { team_spark: 1 };
  mergeEffects(acc, { team_spark: 1 });
  assert.equal(acc.team_spark, 1);
});
