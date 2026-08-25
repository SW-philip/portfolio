import { test } from 'node:test';
import assert from 'node:assert/strict';

class FakeEl {
  constructor(tag) { this.tag = tag; this._text = ''; this.className = ''; this.style = {}; this.children = []; this._listeners = {}; this.value = ''; this.type = ''; this.placeholder = ''; }
  set textContent(v) { this._text = v; }
  get textContent() { return this._text; }
  appendChild(el) { this.children.push(el); handleAutoClick(el); return el; }
  remove() {}
  addEventListener(evt, fn) { this._listeners[evt] = fn; }
  append(...els) { for (const el of els) { this.children.push(el); handleAutoClick(el); } }
}
globalThis.document = { createElement: (tag) => new FakeEl(tag) };
const realSetTimeout = setTimeout;
globalThis.setTimeout = (fn) => realSetTimeout(fn, 0);

let actionQueue = [];
function setActions(actions) { actionQueue = actions.slice(); }

function handleAutoClick(el) {
  if (el.className === 'controls') {
    realSetTimeout(() => {
      const action = actionQueue.shift() || { type: 'continue' };
      const target = action.type === 'back'
        ? el.children.find(c => c.className === 'back-button')
        : el.children.find(c => c.className === 'tap-continue');
      target._listeners.click();
    }, 0);
  } else if (el.className === 'choice') {
    realSetTimeout(() => {
      const action = actionQueue.shift() || { type: 'choice', index: 0 };
      if (action.type === 'back') {
        el.children.find(c => c.className === 'back-button')._listeners.click();
      } else {
        const opts = el.children.filter(c => c.className === 'choice-option');
        opts[action.index]._listeners.click();
      }
    }, 0);
  } else if (el.className === 'free-text') {
    realSetTimeout(() => {
      const action = actionQueue.shift() || { type: 'freeText', value: undefined };
      if (action.type === 'back') {
        el.children.find(c => c.className === 'back-button')._listeners.click();
      } else {
        const input = el.children.find(c => c.tag === 'input');
        if (action.value !== undefined) input.value = action.value;
        el.children.find(c => c.tag === 'button')._listeners.click();
      }
    }, 0);
  }
}

const { createPlayer } = await import('../public/cousins/js/engine.js');

function screensOf(container) {
  return container.children.filter(c => c.className === 'screen');
}
function beatsOf(screen) {
  return screen.children.filter(c => c.className.startsWith('beat '));
}

test('a line beat types its text into the current screen', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const player = createPlayer(container, []);
  await player.playBeats([{ type: 'line', style: 'speak', text: 'Hello.' }]);
  const screens = screensOf(container);
  assert.equal(screens.length, 1);
  assert.equal(beatsOf(screens[0])[0].textContent, 'Hello.');
});

test('say beat colors the line using the cast color for that name', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const cast = [{ name: 'Laine', color: '#123456' }];
  const player = createPlayer(container, cast);
  await player.playBeats([{ type: 'say', name: 'Laine', text: 'Hi.' }]);
  const beat = beatsOf(screensOf(container)[0])[0];
  assert.equal(beat.textContent, 'Laine: "Hi."');
  assert.equal(beat.style.color, '#123456');
});

test('effect beat merges silently with no visible paragraph', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const player = createPlayer(container, []);
  const effects = await player.playBeats([{ type: 'effect', effects: { spark: 2 } }]);
  assert.deepEqual(effects, { spark: 2 });
  assert.equal(beatsOf(screensOf(container)[0]).length, 0);
});

test('{{key}} in narration substitutes an already-set effect value', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const player = createPlayer(container, []);
  await player.playBeats([
    { type: 'effect', effects: { crewName: 'The Rays' } },
    { type: 'line', style: 'speak', text: 'The crew is {{crewName}}.' },
  ]);
  assert.equal(beatsOf(screensOf(container)[0])[0].textContent, 'The crew is The Rays.');
});

test('choice beat resolves an option, merges effects, and plays its nested beats', async () => {
  const container = new FakeEl('div');
  setActions([{ type: 'choice', index: 1 }]);
  const player = createPlayer(container, []);
  const effects = await player.playBeats([{
    type: 'choice',
    prompt: 'Pick one',
    options: [
      { key: 'A', label: 'A', effects: { spark: 1 } },
      { key: 'B', label: 'B', effects: { spark: 5 }, beats: [{ type: 'line', style: 'speak', text: 'B chosen.' }] },
    ],
  }]);
  assert.deepEqual(effects, { spark: 5 });
  const screens = screensOf(container);
  assert.equal(beatsOf(screens[screens.length - 1])[0].textContent, 'B chosen.');
});

test('freeText beat prompts for input and resolves with typed value', async () => {
  const container = new FakeEl('div');
  setActions([{ type: 'freeText', value: 'The Rays' }]);
  const player = createPlayer(container, []);
  const effects = await player.playBeats([{ type: 'freeText', prompt: 'Name your crew', stateKey: 'crewName', default: 'Crew' }]);
  assert.deepEqual(effects, { crewName: 'The Rays' });
});

test('a run of 11 narration beats is broken into two screens within the 6-10 soft-break range', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const beats = Array.from({ length: 11 }, (_, i) => ({ type: 'line', style: 'speak', text: `line ${i}` }));
  const player = createPlayer(container, []);
  await player.playBeats(beats);
  const screens = screensOf(container);
  assert.equal(screens.length, 2);
  const firstCount = beatsOf(screens[0]).length;
  assert.ok(firstCount >= 6 && firstCount <= 10, `expected 6-10, got ${firstCount}`);
  assert.equal(firstCount + beatsOf(screens[1]).length, 11);
});

test('the first screen of a chapter never shows a back button', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const player = createPlayer(container, []);
  await player.playBeats([{ type: 'line', style: 'speak', text: 'Only line.' }, { type: 'wait' }]);
  const controls = screensOf(container)[0].children.find(c => c.className === 'controls');
  assert.equal(controls.children.some(c => c.className === 'back-button'), false);
});

test('back after a choice undoes its effects and lets it be re-picked', async () => {
  const container = new FakeEl('div');
  const beats = [
    {
      type: 'choice',
      prompt: 'Pick one',
      options: [
        { key: 'A', label: 'A', effects: { spark: 1 }, beats: [{ type: 'line', style: 'speak', text: 'You picked A.' }, { type: 'wait' }] },
        { key: 'B', label: 'B', effects: { spark: 5 }, beats: [{ type: 'line', style: 'speak', text: 'You picked B.' }, { type: 'wait' }] },
      ],
    },
    { type: 'line', style: 'speak', text: 'The end.' },
  ];
  setActions([
    { type: 'choice', index: 0 },
    { type: 'back' },
    { type: 'choice', index: 1 },
  ]);
  const player = createPlayer(container, []);
  const effects = await player.playBeats(beats);
  assert.deepEqual(effects, { spark: 5 });
});

test('back at a plain pause re-renders the previous screen and play continues correctly', async () => {
  const container = new FakeEl('div');
  const beats = [
    { type: 'line', style: 'speak', text: 'A1' }, { type: 'wait' },
    { type: 'line', style: 'speak', text: 'B1' }, { type: 'wait' },
    { type: 'line', style: 'speak', text: 'C1' },
  ];
  setActions([{ type: 'continue' }, { type: 'back' }]);
  const player = createPlayer(container, []);
  const effects = await player.playBeats(beats);
  assert.deepEqual(effects, {});
  const screens = screensOf(container);
  assert.equal(screens.length, 5);
  assert.equal(beatsOf(screens[screens.length - 1])[0].textContent, 'C1');
});
