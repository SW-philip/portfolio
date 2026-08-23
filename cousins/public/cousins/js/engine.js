import { mergeEffects } from './effects.js';

const TYPE_DELAY_MS = 18;

export function createPlayer(container, cast, options = {}) {
  const colorByName = Object.fromEntries((cast || []).map(c => [c.name, c.color]));
  const { storyMode = false, knownState = {} } = options;
  let effects = {};

  function findKnownOption(beat) {
    return beat.options.find(option =>
      Object.entries(option.effects || {}).every(([key, value]) => knownState[key] === value)
    );
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function substitute(text) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => (effects[key] != null ? effects[key] : ''));
  }

  async function typeLine(text, color, styleClass) {
    const p = document.createElement('p');
    p.className = `beat ${styleClass}`;
    if (color) p.style.color = color;
    container.appendChild(p);
    for (const ch of text) {
      p.textContent += ch;
      await sleep(TYPE_DELAY_MS);
    }
    container.scrollTop = container.scrollHeight;
  }

  function waitForTap() {
    return new Promise(resolve => {
      const btn = document.createElement('button');
      btn.className = 'tap-continue';
      btn.textContent = '[ tap to continue ]';
      btn.addEventListener('click', () => { btn.remove(); resolve(); }, { once: true });
      container.appendChild(btn);
    });
  }

  function presentChoice(beat) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'choice';
      const prompt = document.createElement('p');
      prompt.className = 'choice-prompt';
      prompt.textContent = substitute(beat.prompt);
      wrap.appendChild(prompt);
      for (const option of beat.options) {
        const btn = document.createElement('button');
        btn.className = 'choice-option';
        btn.textContent = `${option.key}. ${option.label}`;
        btn.addEventListener('click', () => { wrap.remove(); resolve(option); });
        wrap.appendChild(btn);
      }
      container.appendChild(wrap);
    });
  }

  function presentFreeText(beat) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'free-text';
      const prompt = document.createElement('p');
      prompt.textContent = substitute(beat.prompt);
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = beat.default;
      input.maxLength = 60;
      const btn = document.createElement('button');
      btn.textContent = 'Go';
      btn.addEventListener('click', () => { wrap.remove(); resolve(input.value.trim() || beat.default); });
      wrap.append(prompt, input, btn);
      container.appendChild(wrap);
    });
  }

  async function playOneBeat(beat) {
    if (beat.type === 'line') {
      await typeLine(substitute(beat.text), null, beat.style === 'beat' ? 'beat-emphasis' : 'beat-narrate');
    } else if (beat.type === 'say') {
      await typeLine(`${beat.name}: "${substitute(beat.text)}"`, colorByName[beat.name], 'beat-say');
    } else if (beat.type === 'adult') {
      await typeLine(`${beat.name}: "${substitute(beat.text)}"`, null, 'beat-adult');
    } else if (beat.type === 'power') {
      await typeLine(substitute(beat.text), colorByName[beat.name], 'beat-power');
    } else if (beat.type === 'wait') {
      await waitForTap();
    } else if (beat.type === 'choice') {
      const known = storyMode ? findKnownOption(beat) : null;
      let option;
      if (known) {
        await typeLine(substitute(beat.prompt), null, 'choice-prompt');
        option = known;
      } else {
        option = await presentChoice(beat);
      }
      effects = mergeEffects(effects, option.effects || {});
      if (option.beats) await playBeats(option.beats);
    } else if (beat.type === 'freeText') {
      const value = await presentFreeText(beat);
      effects = mergeEffects(effects, { [beat.stateKey]: value });
    } else if (beat.type === 'effect') {
      effects = mergeEffects(effects, beat.effects || {});
    }
  }

  async function playBeats(beats) {
    for (const beat of beats) {
      await playOneBeat(beat);
    }
    return effects;
  }

  return { playBeats };
}
