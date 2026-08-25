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
        // Mutate effects in place (not reassign) so the change is visible immediately to later beats in the same screen for {{key}} substitution.
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
