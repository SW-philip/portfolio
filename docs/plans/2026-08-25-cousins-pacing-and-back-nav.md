# Cousins Player — Pacing Breaks and Back Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break up long stretches of narration in the cousins player with a 6-10-beat soft cap, and add a Back button that can undo a choice's effects and re-show the previous screen.

**Architecture:** Replace `engine.js`'s recursive beat traversal with an explicit frame stack (`[{beats, index}]`) so playback state can be snapshotted into checkpoints and restored. Beats are grouped into "screens" (runs of narration ending at a wait/choice/freeText/soft-break); a checkpoint captures `{frameStack, effects}` before each screen starts. Continuing forward advances the stack and saves the next checkpoint; Back discards the current and previous screen's DOM and re-renders the previous screen from its checkpoint.

**Tech Stack:** Vanilla JS ES modules, no build step. Tests via Node's built-in `node --test` runner against a fake-DOM test double (existing pattern in both repos).

## Global Constraints

- No stretch of narration beats (`line`/`say`/`adult`/`power`) may play longer than 10 beats without a pause; the soft-break threshold is randomized 6-10 per screen.
- Back must be available at every pause point once a previous screen exists (never on the very first screen of a chapter).
- Back must fully undo a choice's effects (no double-counting when the choice is re-picked).
- `playBeats(beats)` keeps its existing signature and return value (`Promise<effects>`) — `play.js`'s chapter-completion flow is untouched.
- `story-editor-preview.js` (the authoring tool's preview engine) gets the same screen/soft-break/Back behavior, minus the account-only "🎬 Story mode" feature it never had.

---

### Task 1: `engine.js` — frame-stack traversal with soft-break screens

**Files:**
- Modify: `cousins/public/cousins/js/engine.js` (full rewrite)
- Test: `cousins/test/engine.test.js` (create)

**Interfaces:**
- Consumes: `mergeEffects(accumulated, effects)` from `cousins/public/cousins/js/effects.js` (unchanged: `{key: value}` → new merged object, numbers add, strings overwrite).
- Produces: `createPlayer(container, cast, options = {}) → { playBeats(beats) }`, where `playBeats` returns `Promise<effects>`. Beats now render inside per-screen `<div class="screen">` wrappers appended to `container`, instead of directly in `container`. A pause renders a `<div class="controls">` (wait/soft-break) or reuses `.choice`/`.free-text` wraps for choice/freeText, exactly as before but nested inside the current `.screen` div. Task 2 will add a `back-button` class and a `canGoBack` parameter to these render functions — Task 1 does not add Back yet.

- [ ] **Step 1: Write the failing test**

Create `cousins/test/engine.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cousins && node --test test/engine.test.js`
Expected: FAIL — the current `engine.js` never wraps beats in `<div class="screen">`, so `screensOf(container)` returns an empty array in every test.

- [ ] **Step 3: Write the implementation**

Replace the full contents of `cousins/public/cousins/js/engine.js`:

```js
import { mergeEffects } from './effects.js';

const TYPE_DELAY_MS = 18;
const SOFT_BREAK_MIN = 6;
const SOFT_BREAK_MAX = 10;

export function createPlayer(container, cast, options = {}) {
  const colorByName = Object.fromEntries((cast || []).map(c => [c.name, c.color]));
  const { knownState = {} } = options;

  function findKnownOption(beat) {
    return beat.options.find(option =>
      Object.entries(option.effects || {}).every(([key, value]) => knownState[key] === value)
    );
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function randomSoftBreak() {
    return SOFT_BREAK_MIN + Math.floor(Math.random() * (SOFT_BREAK_MAX - SOFT_BREAK_MIN + 1));
  }

  function substitute(effects, text) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => (effects[key] != null ? effects[key] : ''));
  }

  function nextBeat(frameStack) {
    while (frameStack.length > 0) {
      const frame = frameStack[frameStack.length - 1];
      if (frame.index < frame.beats.length) {
        const beat = frame.beats[frame.index];
        frame.index += 1;
        return beat;
      }
      frameStack.pop();
    }
    return null;
  }

  async function typeLine(screenEl, text, color, styleClass) {
    const p = document.createElement('p');
    p.className = `beat ${styleClass}`;
    if (color) p.style.color = color;
    screenEl.appendChild(p);
    for (const ch of text) {
      p.textContent += ch;
      await sleep(TYPE_DELAY_MS);
    }
    container.scrollTop = container.scrollHeight;
  }

  function renderContinueControls(screenEl) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'controls';
      const continueBtn = document.createElement('button');
      continueBtn.className = 'tap-continue';
      continueBtn.textContent = '[ tap to continue ]';
      continueBtn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'continue' }); }, { once: true });
      wrap.appendChild(continueBtn);
      screenEl.appendChild(wrap);
    });
  }

  function presentChoice(screenEl, beat, effects) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'choice';
      const prompt = document.createElement('p');
      prompt.className = 'choice-prompt';
      prompt.textContent = substitute(effects, beat.prompt);
      wrap.appendChild(prompt);
      for (const option of beat.options) {
        const btn = document.createElement('button');
        btn.className = 'choice-option';
        btn.textContent = `${option.key}. ${option.label}`;
        btn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'choice', option }); });
        wrap.appendChild(btn);
      }
      const known = findKnownOption(beat);
      if (known) {
        const storyBtn = document.createElement('button');
        storyBtn.className = 'story-mode-option';
        storyBtn.textContent = '🎬 Story mode — show what they picked';
        storyBtn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'choice', option: known }); });
        wrap.appendChild(storyBtn);
      }
      screenEl.appendChild(wrap);
    });
  }

  function presentFreeText(screenEl, beat, effects) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'free-text';
      const prompt = document.createElement('p');
      prompt.textContent = substitute(effects, beat.prompt);
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = beat.default;
      input.maxLength = 60;
      const btn = document.createElement('button');
      btn.textContent = 'Go';
      btn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'freeText', value: input.value.trim() || beat.default }); });
      wrap.append(prompt, input, btn);
      screenEl.appendChild(wrap);
    });
  }

  async function typeScreen(screenEl, frameStack, effects) {
    const softBreakTarget = randomSoftBreak();
    let narrationCount = 0;
    while (true) {
      const beat = nextBeat(frameStack);
      if (!beat) return { kind: 'end' };
      if (beat.type === 'line') {
        await typeLine(screenEl, substitute(effects, beat.text), null, beat.style === 'beat' ? 'beat-emphasis' : 'beat-narrate');
        narrationCount += 1;
      } else if (beat.type === 'say') {
        await typeLine(screenEl, `${beat.name}: "${substitute(effects, beat.text)}"`, colorByName[beat.name], 'beat-say');
        narrationCount += 1;
      } else if (beat.type === 'adult') {
        await typeLine(screenEl, `${beat.name}: "${substitute(effects, beat.text)}"`, null, 'beat-adult');
        narrationCount += 1;
      } else if (beat.type === 'power') {
        await typeLine(screenEl, substitute(effects, beat.text), colorByName[beat.name], 'beat-power');
        narrationCount += 1;
      } else if (beat.type === 'effect') {
        Object.assign(effects, mergeEffects(effects, beat.effects || {}));
        continue;
      } else if (beat.type === 'wait') {
        return { kind: 'wait' };
      } else if (beat.type === 'choice') {
        return { kind: 'choice', beat };
      } else if (beat.type === 'freeText') {
        return { kind: 'freeText', beat };
      }
      if (narrationCount >= softBreakTarget) {
        return { kind: 'soft' };
      }
    }
  }

  async function runChapter(initialBeats) {
    const frameStack = [{ beats: initialBeats, index: 0 }];
    let effects = {};

    while (true) {
      const screenEl = document.createElement('div');
      screenEl.className = 'screen';
      container.appendChild(screenEl);

      const result = await typeScreen(screenEl, frameStack, effects);

      if (result.kind === 'end') {
        return effects;
      }

      let control;
      if (result.kind === 'wait' || result.kind === 'soft') {
        control = await renderContinueControls(screenEl);
      } else if (result.kind === 'choice') {
        control = await presentChoice(screenEl, result.beat, effects);
      } else if (result.kind === 'freeText') {
        control = await presentFreeText(screenEl, result.beat, effects);
      }

      if (control.action === 'choice') {
        effects = mergeEffects(effects, control.option.effects || {});
        if (control.option.beats) frameStack.push({ beats: control.option.beats, index: 0 });
      } else if (control.action === 'freeText') {
        effects = mergeEffects(effects, { [result.beat.stateKey]: control.value });
      }
    }
  }

  return { playBeats: runChapter };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cousins && node --test test/engine.test.js`
Expected: PASS, all 7 tests.

- [ ] **Step 5: Commit**

```bash
cd cousins
git add public/cousins/js/engine.js test/engine.test.js
git commit -m "Break long narration runs into screens with a 6-10-beat soft cap

Replaces engine.js's recursive beat traversal with an explicit frame
stack, grouping beats into 'screens' that end at an explicit wait,
choice, freeText, or a randomized 6-10-beat soft break — fixing the
wall-of-text runs found in shorestorm.json."
```

---

### Task 2: `engine.js` — checkpoints and the Back button

**Files:**
- Modify: `cousins/public/cousins/js/engine.js`
- Modify: `cousins/public/cousins/css/style.css`
- Test: `cousins/test/engine.test.js`

**Interfaces:**
- Consumes: Task 1's `renderContinueControls(screenEl)`, `presentChoice(screenEl, beat, effects)`, `presentFreeText(screenEl, beat, effects)`, `typeScreen`, `runChapter` — all modified in place below.
- Produces: `createPlayer(...).playBeats(beats)` unchanged externally; internally, pauses beyond the first screen now render a `.back-button` element. Clicking it discards the current and previous screen and re-renders the previous screen from its checkpoint, with `effects` restored to its pre-that-screen value.

- [ ] **Step 1: Write the failing tests**

Append to `cousins/test/engine.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cousins && node --test test/engine.test.js`
Expected: FAIL on the 3 new tests — Task 1's engine never renders a `back-button`, so the first test's `.some(...)` is vacuously true-by-absence (passes) but the two behavioral tests fail: `back` actions in the queue are never consumed (no back button exists to click), so `handleAutoClick`'s `el.children.find(c => c.className === 'back-button')` returns `undefined` and `._listeners.click()` throws.

- [ ] **Step 3: Write the implementation**

In `cousins/public/cousins/js/engine.js`, add a `cloneFrameStack` helper next to `nextBeat`:

```js
  function cloneFrameStack(frameStack) {
    return frameStack.map(frame => ({ beats: frame.beats, index: frame.index }));
  }
```

Replace `renderContinueControls`:

```js
  function renderContinueControls(screenEl, canGoBack) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'controls';
      if (canGoBack) {
        const backBtn = document.createElement('button');
        backBtn.className = 'back-button';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'back' }); }, { once: true });
        wrap.appendChild(backBtn);
      }
      const continueBtn = document.createElement('button');
      continueBtn.className = 'tap-continue';
      continueBtn.textContent = '[ tap to continue ]';
      continueBtn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'continue' }); }, { once: true });
      wrap.appendChild(continueBtn);
      screenEl.appendChild(wrap);
    });
  }
```

Replace `presentChoice` (adds `canGoBack` param and a trailing back button):

```js
  function presentChoice(screenEl, beat, effects, canGoBack) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'choice';
      const prompt = document.createElement('p');
      prompt.className = 'choice-prompt';
      prompt.textContent = substitute(effects, beat.prompt);
      wrap.appendChild(prompt);
      for (const option of beat.options) {
        const btn = document.createElement('button');
        btn.className = 'choice-option';
        btn.textContent = `${option.key}. ${option.label}`;
        btn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'choice', option }); });
        wrap.appendChild(btn);
      }
      const known = findKnownOption(beat);
      if (known) {
        const storyBtn = document.createElement('button');
        storyBtn.className = 'story-mode-option';
        storyBtn.textContent = '🎬 Story mode — show what they picked';
        storyBtn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'choice', option: known }); });
        wrap.appendChild(storyBtn);
      }
      if (canGoBack) {
        const backBtn = document.createElement('button');
        backBtn.className = 'back-button';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'back' }); }, { once: true });
        wrap.appendChild(backBtn);
      }
      screenEl.appendChild(wrap);
    });
  }
```

Replace `presentFreeText` (adds `canGoBack` param and a trailing back button):

```js
  function presentFreeText(screenEl, beat, effects, canGoBack) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'free-text';
      const prompt = document.createElement('p');
      prompt.textContent = substitute(effects, beat.prompt);
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = beat.default;
      input.maxLength = 60;
      const btn = document.createElement('button');
      btn.textContent = 'Go';
      btn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'freeText', value: input.value.trim() || beat.default }); });
      wrap.append(prompt, input, btn);
      if (canGoBack) {
        const backBtn = document.createElement('button');
        backBtn.className = 'back-button';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'back' }); }, { once: true });
        wrap.appendChild(backBtn);
      }
      screenEl.appendChild(wrap);
    });
  }
```

Replace `runChapter`:

```js
  async function runChapter(initialBeats) {
    let frameStack = [{ beats: initialBeats, index: 0 }];
    let effects = {};
    const checkpoints = [{ frameStack: cloneFrameStack(frameStack), effects: { ...effects } }];
    const screenEls = [];
    let screenIndex = 0;

    while (true) {
      const screenEl = document.createElement('div');
      screenEl.className = 'screen';
      container.appendChild(screenEl);
      screenEls[screenIndex] = screenEl;

      const result = await typeScreen(screenEl, frameStack, effects);

      if (result.kind === 'end') {
        return effects;
      }

      const canGoBack = screenIndex > 0;
      let control;
      if (result.kind === 'wait' || result.kind === 'soft') {
        control = await renderContinueControls(screenEl, canGoBack);
      } else if (result.kind === 'choice') {
        control = await presentChoice(screenEl, result.beat, effects, canGoBack);
      } else if (result.kind === 'freeText') {
        control = await presentFreeText(screenEl, result.beat, effects, canGoBack);
      }

      if (control.action === 'back') {
        screenEls[screenIndex].remove();
        screenEls[screenIndex - 1].remove();
        screenIndex -= 1;
        checkpoints.length = screenIndex + 1;
        frameStack = cloneFrameStack(checkpoints[screenIndex].frameStack);
        effects = { ...checkpoints[screenIndex].effects };
        continue;
      }

      if (control.action === 'choice') {
        effects = mergeEffects(effects, control.option.effects || {});
        if (control.option.beats) frameStack.push({ beats: control.option.beats, index: 0 });
      } else if (control.action === 'freeText') {
        effects = mergeEffects(effects, { [result.beat.stateKey]: control.value });
      }

      screenIndex += 1;
      checkpoints[screenIndex] = { frameStack: cloneFrameStack(frameStack), effects: { ...effects } };
    }
  }
```

In `cousins/public/cousins/css/style.css`, replace the `.tap-continue, .choice-option, .free-text button` rule block and the rules directly after it with:

```css
.tap-continue, .choice-option, .free-text button {
  display: block;
  margin-top: 10px;
  background: var(--surface);
  border: 2px solid var(--muted);
  border-radius: 12px;
  box-shadow: 0 3px 0 var(--muted);
  color: var(--text);
  font-weight: 600;
  padding: 12px 16px;
  width: 100%;
  text-align: left;
}
.tap-continue:active, .choice-option:active, .free-text button:active { background: var(--hl-med); }
.controls { display: flex; gap: 8px; margin-top: 10px; }
.controls .tap-continue { margin-top: 0; width: auto; flex: 1; text-align: center; }
.back-button {
  display: block;
  margin-top: 10px;
  width: 100%;
  background: none;
  border: 2px dashed var(--muted);
  border-radius: 12px;
  box-shadow: none;
  color: var(--subtle);
  font-weight: 600;
  padding: 12px 16px;
  text-align: center;
}
.back-button:active { background: var(--hl-med); }
.controls .back-button { margin-top: 0; width: auto; flex: 1; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cousins && node --test test/engine.test.js`
Expected: PASS, all 10 tests.

- [ ] **Step 5: Commit**

```bash
cd cousins
git add public/cousins/js/engine.js public/cousins/css/style.css test/engine.test.js
git commit -m "Add a Back button that undoes a choice and re-shows the previous screen

Checkpoints capture {frameStack, effects} before each screen; Back
restores the previous checkpoint and retypes that screen, so undoing
a choice cleanly reverses its effects instead of double-counting a
re-pick."
```

---

### Task 3: Break up the 10 wall-of-text runs in `shorestorm.json`

**Files:**
- Modify: `cousins/public/cousins/stories/shorestorm.json`

**Interfaces:**
- Consumes: nothing from Tasks 1-2 directly — this is a content edit, independent of the engine change (the automatic soft-break from Task 1 is the safety net; this task places pauses at the best narrative spots by hand).
- Produces: a `shorestorm.json` where no chapter has more than 10 consecutive narration beats (`line`/`say`/`adult`/`power`) between pauses, verified by the script in Step 2.

- [ ] **Step 1: Insert explicit `wait` beats at 10 narrative break points**

Run from `cousins/`:

```bash
python3 - <<'EOF'
import json

path = 'public/cousins/stories/shorestorm.json'
with open(path) as f:
    data = json.load(f)

# {chapter_number: [indices to insert a wait after, processed high-to-low
# so earlier insertions don't shift later target indices]}
splits = {
    1: [99, 66, 40, 4],
    2: [134, 23],
    3: [190, 170],
    4: [143, 92],
}

for ch in data['chapters']:
    for idx in splits.get(ch['number'], []):
        ch['beats'].insert(idx + 1, {"type": "wait"})

with open(path, 'w') as f:
    json.dump(data, f, indent=2)
EOF
```

- [ ] **Step 2: Verify no run exceeds 10 beats**

Run from `cousins/`:

```bash
python3 - <<'EOF'
import json

d = json.load(open('public/cousins/stories/shorestorm.json'))

def walk(beats):
    runs = []
    run = 0
    for b in beats:
        t = b['type']
        if t in ('line', 'say', 'adult', 'power'):
            run += 1
        elif t == 'choice':
            if run: runs.append(run)
            run = 0
            for opt in b.get('options', []):
                runs.extend(walk(opt.get('beats', [])))
        else:
            if run: runs.append(run)
            run = 0
    if run: runs.append(run)
    return runs

bad = False
for ch in d['chapters']:
    runs = walk(ch['beats'])
    over = [r for r in runs if r > 10]
    if over:
        bad = True
        print(f"chapter {ch['number']}: runs over 10: {over}")
if not bad:
    print("OK: no run exceeds 10 narration beats in any chapter")
EOF
```

Expected: `OK: no run exceeds 10 narration beats in any chapter`. If any chapter still shows an over-10 run, it's a spot the original scan (10 runs) already covers — re-check the `splits` indices against the current file for an off-by-one before re-running.

- [ ] **Step 3: Confirm the JSON is still valid and diff is beat-only**

Run from `cousins/`:

```bash
python3 -c "import json; json.load(open('public/cousins/stories/shorestorm.json')); print('valid JSON')"
git diff --stat public/cousins/stories/shorestorm.json
```

Expected: `valid JSON`, and the diff stat shows only additions (10 new `wait` beat objects), no deletions beyond the JSON re-serialization's line-wrapping for lines the Python `json.dump` reformats. Read through `git diff public/cousins/stories/shorestorm.json` once to confirm every change is either a `+  {\n+    "type": "wait"\n+  },` insertion or pure re-indentation — not a content change.

- [ ] **Step 4: Manual pass — play all 4 chapters live**

With Tasks 1-2's engine changes and this task's content fix both in place, run `npm run dev` (or `wrangler dev`) from `cousins/`, log in as any cast member, and play through all 4 Shorestorm chapters in a browser end to end. Confirm: no screen requires watching more than 10 beats type out before a pause; Back is available and works at a soft-break pause, at an explicit `wait`, and at a `choice` (picking, going Back, and re-picking differently); Back is never shown on a chapter's first screen; chapter completion and dashboard unlock still fire normally after finishing a chapter forward.

- [ ] **Step 5: Commit**

```bash
cd cousins
git add public/cousins/stories/shorestorm.json
git commit -m "Break up 10 wall-of-text runs in shorestorm.json with explicit waits

A scan found 10 runs of 11-15 uninterrupted narration beats across the
4 chapters. Splits each at a natural scene beat so no run exceeds the
6-10-beat target."
```

---

### Task 4: Mirror the screen/soft-break/Back model into the story-editor's preview engine

**Files:**
- Modify: `/home/prepko/games/story-editor-preview.js` (full rewrite)
- Modify: `/home/prepko/games/story-editor-preview.test.mjs` (full rewrite)

**Interfaces:**
- Consumes: nothing new — `story-editor-preview.js` has no `mergeEffects` import today (it defines its own copy inline); keep that as-is, just extend it the same way Task 1/2 extended `engine.js`'s.
- Produces: `createPreviewPlayer(container, cast) → { playBeats(beats) }`, same external signature as before, with the same screen-wrapper/soft-break/Back behavior as `engine.js` — minus `knownState`/`findKnownOption`/the "🎬 Story mode" button, which the preview tool never had (it has no accounts).

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `/home/prepko/games/story-editor-preview.test.mjs`:

```js
// story-editor-preview.test.mjs
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

const { createPreviewPlayer } = await import('./story-editor-preview.js');

function screensOf(container) {
  return container.children.filter(c => c.className === 'screen');
}
function beatsOf(screen) {
  return screen.children.filter(c => c.className.startsWith('beat '));
}

test('a line beat types its text into the current screen', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const player = createPreviewPlayer(container, []);
  await player.playBeats([{ type: 'line', style: 'speak', text: 'Hello.' }]);
  assert.equal(beatsOf(screensOf(container)[0])[0].textContent, 'Hello.');
});

test('say beat colors the line using the cast color for that name', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const cast = [{ name: 'Laine', color: '#123456' }];
  const player = createPreviewPlayer(container, cast);
  await player.playBeats([{ type: 'say', name: 'Laine', text: 'Hi.' }]);
  const beat = beatsOf(screensOf(container)[0])[0];
  assert.equal(beat.textContent, 'Laine: "Hi."');
  assert.equal(beat.style.color, '#123456');
});

test('adult beat renders text with no color override', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const player = createPreviewPlayer(container, []);
  await player.playBeats([{ type: 'adult', name: 'Salt', text: 'Line.' }]);
  const beat = beatsOf(screensOf(container)[0])[0];
  assert.equal(beat.textContent, 'Salt: "Line."');
  assert.equal(beat.style.color, undefined);
});

test('power beat renders text with cast color', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const cast = [{ name: 'Henry', color: '#abcdef' }];
  const player = createPreviewPlayer(container, cast);
  await player.playBeats([{ type: 'power', name: 'Henry', text: 'Hush.' }]);
  assert.equal(beatsOf(screensOf(container)[0])[0].style.color, '#abcdef');
});

test('effect beat merges silently with no visible paragraph', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const player = createPreviewPlayer(container, []);
  const effects = await player.playBeats([{ type: 'effect', effects: { spark: 2 } }]);
  assert.deepEqual(effects, { spark: 2 });
  assert.equal(beatsOf(screensOf(container)[0]).length, 0);
});

test('numeric effects accumulate across beats, string effects overwrite', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const player = createPreviewPlayer(container, []);
  const effects = await player.playBeats([
    { type: 'effect', effects: { spark: 2, mood: 'calm' } },
    { type: 'effect', effects: { spark: 3, mood: 'excited' } },
  ]);
  assert.deepEqual(effects, { spark: 5, mood: 'excited' });
});

test('{{key}} in narration substitutes an already-set effect value', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const player = createPreviewPlayer(container, []);
  await player.playBeats([
    { type: 'effect', effects: { crewName: 'The Rays' } },
    { type: 'line', style: 'speak', text: 'The crew is {{crewName}}.' },
  ]);
  assert.equal(beatsOf(screensOf(container)[0])[0].textContent, 'The crew is The Rays.');
});

test('choice beat resolves an option, merges effects, and plays its nested beats', async () => {
  const container = new FakeEl('div');
  setActions([{ type: 'choice', index: 1 }]);
  const player = createPreviewPlayer(container, []);
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
  const player = createPreviewPlayer(container, []);
  const effects = await player.playBeats([{ type: 'freeText', prompt: 'Name your crew', stateKey: 'crewName', default: 'Crew' }]);
  assert.deepEqual(effects, { crewName: 'The Rays' });
});

test('freeText beat with empty input uses default value', async () => {
  const container = new FakeEl('div');
  setActions([{ type: 'freeText', value: '' }]);
  const player = createPreviewPlayer(container, []);
  const effects = await player.playBeats([{ type: 'freeText', prompt: 'Name your crew', stateKey: 'crewName', default: 'Crew' }]);
  assert.deepEqual(effects, { crewName: 'Crew' });
});

test('a run of 11 narration beats is broken into two screens within the 6-10 soft-break range', async () => {
  const container = new FakeEl('div');
  setActions([]);
  const beats = Array.from({ length: 11 }, (_, i) => ({ type: 'line', style: 'speak', text: `line ${i}` }));
  const player = createPreviewPlayer(container, []);
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
  const player = createPreviewPlayer(container, []);
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
  const player = createPreviewPlayer(container, []);
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
  const player = createPreviewPlayer(container, []);
  const effects = await player.playBeats(beats);
  assert.deepEqual(effects, {});
  const screens = screensOf(container);
  assert.equal(screens.length, 5);
  assert.equal(beatsOf(screens[screens.length - 1])[0].textContent, 'C1');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test story-editor-preview.test.mjs`
Expected: FAIL — the current `story-editor-preview.js` types beats directly into `container` with no `.screen` wrapper, no soft-break, and no Back button, so every `screensOf`/`beatsOf`-based assertion fails.

- [ ] **Step 3: Write the implementation**

Replace the full contents of `/home/prepko/games/story-editor-preview.js`:

```js
// story-editor-preview.js
const TYPE_DELAY_MS = 18;
const SOFT_BREAK_MIN = 6;
const SOFT_BREAK_MAX = 10;

function mergeEffects(accumulated, effects) {
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

export function createPreviewPlayer(container, cast) {
  const colorByName = Object.fromEntries((cast || []).map(c => [c.name, c.color]));

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function randomSoftBreak() {
    return SOFT_BREAK_MIN + Math.floor(Math.random() * (SOFT_BREAK_MAX - SOFT_BREAK_MIN + 1));
  }

  function substitute(effects, text) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => (effects[key] != null ? effects[key] : ''));
  }

  function nextBeat(frameStack) {
    while (frameStack.length > 0) {
      const frame = frameStack[frameStack.length - 1];
      if (frame.index < frame.beats.length) {
        const beat = frame.beats[frame.index];
        frame.index += 1;
        return beat;
      }
      frameStack.pop();
    }
    return null;
  }

  function cloneFrameStack(frameStack) {
    return frameStack.map(frame => ({ beats: frame.beats, index: frame.index }));
  }

  async function typeLine(screenEl, text, color, styleClass) {
    const p = document.createElement('p');
    p.className = `beat ${styleClass}`;
    if (color) p.style.color = color;
    screenEl.appendChild(p);
    for (const ch of text) {
      p.textContent += ch;
      await sleep(TYPE_DELAY_MS);
    }
  }

  function renderContinueControls(screenEl, canGoBack) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'controls';
      if (canGoBack) {
        const backBtn = document.createElement('button');
        backBtn.className = 'back-button';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'back' }); }, { once: true });
        wrap.appendChild(backBtn);
      }
      const continueBtn = document.createElement('button');
      continueBtn.className = 'tap-continue';
      continueBtn.textContent = '[ tap to continue ]';
      continueBtn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'continue' }); }, { once: true });
      wrap.appendChild(continueBtn);
      screenEl.appendChild(wrap);
    });
  }

  function presentChoice(screenEl, beat, effects, canGoBack) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'choice';
      const prompt = document.createElement('p');
      prompt.className = 'choice-prompt';
      prompt.textContent = substitute(effects, beat.prompt);
      wrap.appendChild(prompt);
      for (const option of beat.options) {
        const btn = document.createElement('button');
        btn.className = 'choice-option';
        btn.textContent = `${option.key}. ${option.label}`;
        btn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'choice', option }); });
        wrap.appendChild(btn);
      }
      if (canGoBack) {
        const backBtn = document.createElement('button');
        backBtn.className = 'back-button';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'back' }); }, { once: true });
        wrap.appendChild(backBtn);
      }
      screenEl.appendChild(wrap);
    });
  }

  function presentFreeText(screenEl, beat, effects, canGoBack) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'free-text';
      const prompt = document.createElement('p');
      prompt.textContent = substitute(effects, beat.prompt);
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = beat.default;
      const btn = document.createElement('button');
      btn.textContent = 'Go';
      btn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'freeText', value: input.value.trim() || beat.default }); });
      wrap.append(prompt, input, btn);
      if (canGoBack) {
        const backBtn = document.createElement('button');
        backBtn.className = 'back-button';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => { wrap.remove(); resolve({ action: 'back' }); }, { once: true });
        wrap.appendChild(backBtn);
      }
      screenEl.appendChild(wrap);
    });
  }

  async function typeScreen(screenEl, frameStack, effects) {
    const softBreakTarget = randomSoftBreak();
    let narrationCount = 0;
    while (true) {
      const beat = nextBeat(frameStack);
      if (!beat) return { kind: 'end' };
      if (beat.type === 'line') {
        await typeLine(screenEl, substitute(effects, beat.text), null, beat.style === 'beat' ? 'beat-emphasis' : 'beat-narrate');
        narrationCount += 1;
      } else if (beat.type === 'say') {
        await typeLine(screenEl, `${beat.name}: "${substitute(effects, beat.text)}"`, colorByName[beat.name], 'beat-say');
        narrationCount += 1;
      } else if (beat.type === 'adult') {
        await typeLine(screenEl, `${beat.name}: "${substitute(effects, beat.text)}"`, null, 'beat-adult');
        narrationCount += 1;
      } else if (beat.type === 'power') {
        await typeLine(screenEl, substitute(effects, beat.text), colorByName[beat.name], 'beat-power');
        narrationCount += 1;
      } else if (beat.type === 'effect') {
        Object.assign(effects, mergeEffects(effects, beat.effects || {}));
        continue;
      } else if (beat.type === 'wait') {
        return { kind: 'wait' };
      } else if (beat.type === 'choice') {
        return { kind: 'choice', beat };
      } else if (beat.type === 'freeText') {
        return { kind: 'freeText', beat };
      }
      if (narrationCount >= softBreakTarget) {
        return { kind: 'soft' };
      }
    }
  }

  async function runChapter(initialBeats) {
    let frameStack = [{ beats: initialBeats, index: 0 }];
    let effects = {};
    const checkpoints = [{ frameStack: cloneFrameStack(frameStack), effects: { ...effects } }];
    const screenEls = [];
    let screenIndex = 0;

    while (true) {
      const screenEl = document.createElement('div');
      screenEl.className = 'screen';
      container.appendChild(screenEl);
      screenEls[screenIndex] = screenEl;

      const result = await typeScreen(screenEl, frameStack, effects);

      if (result.kind === 'end') {
        return effects;
      }

      const canGoBack = screenIndex > 0;
      let control;
      if (result.kind === 'wait' || result.kind === 'soft') {
        control = await renderContinueControls(screenEl, canGoBack);
      } else if (result.kind === 'choice') {
        control = await presentChoice(screenEl, result.beat, effects, canGoBack);
      } else if (result.kind === 'freeText') {
        control = await presentFreeText(screenEl, result.beat, effects, canGoBack);
      }

      if (control.action === 'back') {
        screenEls[screenIndex].remove();
        screenEls[screenIndex - 1].remove();
        screenIndex -= 1;
        checkpoints.length = screenIndex + 1;
        frameStack = cloneFrameStack(checkpoints[screenIndex].frameStack);
        effects = { ...checkpoints[screenIndex].effects };
        continue;
      }

      if (control.action === 'choice') {
        effects = mergeEffects(effects, control.option.effects || {});
        if (control.option.beats) frameStack.push({ beats: control.option.beats, index: 0 });
      } else if (control.action === 'freeText') {
        effects = mergeEffects(effects, { [result.beat.stateKey]: control.value });
      }

      screenIndex += 1;
      checkpoints[screenIndex] = { frameStack: cloneFrameStack(frameStack), effects: { ...effects } };
    }
  }

  return { playBeats: runChapter };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test story-editor-preview.test.mjs`
Expected: PASS, all 14 tests.

- [ ] **Step 5: Manual check in the browser**

Run: `python3 -m http.server 8765` from `/home/prepko/games`, open `http://localhost:8765/story-editor.html`, build a chapter with 12+ narration lines and no explicit pause, click "Preview (play through)", and confirm a Continue button appears partway through (the `#preview-container button` CSS rule already styles any button generically, including `.back-button`, so no CSS changes are needed here) and that Back is absent on the first screen but present afterward.

- [ ] **Step 6: Commit**

```bash
cd /home/prepko/games
git add story-editor-preview.js story-editor-preview.test.mjs
git commit -m "Mirror screen/soft-break/Back model into the story-editor preview engine

Keeps the authoring tool's 'Play through' preview in sync with the
live engine.js so pacing and navigation look the same at write time
as they do live."
```
