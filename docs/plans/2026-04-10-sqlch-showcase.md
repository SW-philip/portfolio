# sqlch Showcase Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `sqlch.html` — a project showcase page with a working TUI + head unit carousel mockup, real radio streams, and working preview behavior.

**Architecture:** Single self-contained HTML file. Two `<audio>` elements share playback state. A JS state object drives both the TUI slide and the head unit slide. Carousel is CSS transforms + class toggling. No frameworks, no build step.

**Tech Stack:** HTML, inline CSS, vanilla JS, radio-browser.info API, `<audio>` volume fading via setInterval

---

## Before you start: validate the API

Open browser console and run:

```js
fetch('https://de1.api.radio-browser.info/json/stations/search?countrycode=US&limit=5&order=votes&reverse=true&hidebroken=true')
  .then(r => r.json()).then(d => console.log(d[0]))
```

Expected: a station object with `name`, `url_resolved`, `frequency`, `tags`, `bitrate`. If the mirror is down, try `nl1.api.radio-browser.info` or `at1.api.radio-browser.info`. Pick one that responds and use it throughout.

---

### Task 1: Page shell

**Files:**
- Create: `sqlch.html`

**Step 1: Create the file with nav, header, footer, and palette**

Copy the `:root` CSS vars, nav, and footer pattern from `projects.html` exactly. The header gets:
- Eyebrow: "Projects"
- `<h1>`: "I built a radio daemon. Then I went too far."
- Lede `<p>`: "sqlch is a headless radio streaming daemon with a Unix socket interface, MPRIS support, and a Textual TUI. Below is a working demo — real stations, real audio, the preview feature and all."

Page eyebrow color: `var(--foam)` (matching the foam tag sqlch uses on projects.html).

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>sqlch — Philip Repko</title>
  <style>
    :root {
      --base: #232136; --surface: #2a273f; --overlay: #393552;
      --muted: #6e6a86; --subtle: #908caa; --text: #e0def4;
      --love: #eb6f92; --gold: #f6c177; --rose: #ea9a97;
      --pine: #3e8fb0; --foam: #9ccfd8; --iris: #c4a7e7;
      --hl-low: #2a283e; --hl-med: #44415a;
    }
    /* nav, footer, page-header: copy from projects.html */
  </style>
</head>
<body>
  <!-- nav: copy from projects.html, active link = Projects -->
  <main>
    <div class="container">
      <div class="page-header">
        <p class="page-eyebrow">Projects</p>
        <h1>I built a radio daemon. Then I went too far.</h1>
        <p>sqlch is a headless radio streaming daemon with a Unix socket interface, MPRIS support, and a Textual TUI. Below is a working demo — real stations, real audio, the preview feature and all.</p>
      </div>
      <!-- mockup section: Task 2+ -->
      <!-- story section: Task 9 -->
    </div>
  </main>
  <!-- footer: copy from projects.html -->
</body>
</html>
```

**Step 2: Open in browser, verify**

Nav, header text, footer render correctly. Palette colors match projects.html.

**Step 3: Commit**

```bash
git -C ~/portfolio add sqlch.html
git -C ~/portfolio commit -m "feat: sqlch page shell"
```

---

### Task 2: Carousel structure

**Files:**
- Modify: `sqlch.html`

**Step 1: Add carousel CSS**

```css
.mockup-section {
  padding: 48px 0 64px;
  border-bottom: 1px solid var(--hl-med);
}

.carousel {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--hl-med);
  background: var(--surface);
}

.carousel-track {
  display: flex;
  transition: transform 0.35s ease;
}

.carousel-slide { min-width: 100%; }

.carousel-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.carousel-btn {
  background: none;
  border: 1px solid var(--hl-med);
  color: var(--subtle);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.carousel-btn:hover { border-color: var(--muted); color: var(--text); }
.carousel-btn:disabled { opacity: 0.3; cursor: default; }

.carousel-dots { display: flex; gap: 8px; }

.carousel-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--hl-med); cursor: pointer;
  transition: background 0.15s;
}

.carousel-dot.active { background: var(--foam); }

.carousel-label {
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  min-width: 80px;
  text-align: center;
}
```

**Step 2: Add carousel HTML**

```html
<div class="mockup-section">
  <div class="carousel" id="carousel">
    <div class="carousel-track" id="carousel-track">
      <div class="carousel-slide" id="slide-tui">
        <div style="height:400px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;">
          TUI placeholder
        </div>
      </div>
      <div class="carousel-slide" id="slide-headunit">
        <div style="height:400px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;">
          Head unit placeholder
        </div>
      </div>
    </div>
  </div>
  <div class="carousel-controls">
    <button class="carousel-btn" id="btn-prev" disabled>←</button>
    <div class="carousel-dots">
      <div class="carousel-dot active" data-slide="0"></div>
      <div class="carousel-dot" data-slide="1"></div>
    </div>
    <span class="carousel-label" id="carousel-label">TUI</span>
    <button class="carousel-btn" id="btn-next">→</button>
  </div>
</div>
```

**Step 3: Add carousel JS**

```html
<script>
const track = document.getElementById('carousel-track');
const dots  = document.querySelectorAll('.carousel-dot');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const labelEl = document.getElementById('carousel-label');
const LABELS  = ['TUI', 'Head Unit'];
let current = 0;

function goTo(n) {
  current = n;
  track.style.transform = `translateX(-${n * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === n));
  btnPrev.disabled = n === 0;
  btnNext.disabled = n === LABELS.length - 1;
  labelEl.textContent = LABELS[n];
}

btnPrev.addEventListener('click', () => goTo(current - 1));
btnNext.addEventListener('click', () => goTo(current + 1));
dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.slide)));
</script>
```

**Step 4: Verify in browser**

Carousel renders, arrows work, dots update, label swaps between "TUI" and "Head Unit".

**Step 5: Commit**

```bash
git -C ~/portfolio commit -am "feat: carousel structure"
```

---

### Task 3: Shared state + audio elements

**Files:**
- Modify: `sqlch.html`

**Step 1: Add audio elements before `</body>`**

```html
<audio id="audio-main" preload="none"></audio>
<audio id="audio-preview" preload="none"></audio>
```

**Step 2: Add state and helpers at top of `<script>`**

```js
const State = {
  stations:         [],     // loaded from API or fallback
  filtered:         [],     // after search
  cursor:           0,      // selected index in filtered
  playing:          null,   // { name, url, frequency, tags } or null
  nowPlaying:       '',     // track string from ICY or static
  previewing:       false,
  previewTimer:     null,
  previewCountdown: 0,
};

const audioMain    = document.getElementById('audio-main');
const audioPreview = document.getElementById('audio-preview');

function fadeTo(audioEl, targetVol, durationMs) {
  const steps = 20;
  const interval = durationMs / steps;
  const start = audioEl.volume;
  const delta = (targetVol - start) / steps;
  let step = 0;
  const t = setInterval(() => {
    step++;
    audioEl.volume = Math.max(0, Math.min(1, start + delta * step));
    if (step >= steps) clearInterval(t);
  }, interval);
}

// Stubs — filled in later tasks
function renderTUI() {}
function renderHeadUnit() {}
```

**Step 3: Verify — no console errors on load**

**Step 4: Commit**

```bash
git -C ~/portfolio commit -am "feat: shared state and audio elements"
```

---

### Task 4: Station loading

**Files:**
- Modify: `sqlch.html`

**Step 1: Add fallback stations**

```js
const FALLBACK_STATIONS = [
  { name: 'WXPN 88.5',           url: 'https://wxpnfm.streamguys1.com/wxpn128',            frequency: '88.5 FM', tags: 'public radio, indie' },
  { name: 'WRTI 90.1',           url: 'https://wrti.streamguys1.com/wrti128',               frequency: '90.1 FM', tags: 'classical, jazz' },
  { name: 'KEXP 90.3',           url: 'https://kexp.streamguys1.com/kexp128.mp3',           frequency: '90.3 FM', tags: 'indie, alternative' },
  { name: 'Jazz 24',             url: 'https://live.wostreaming.net/direct/ppm-jazz24aac-ibc1', frequency: '—',   tags: 'jazz' },
  { name: 'BBC Radio 6',         url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_6music',   frequency: '—',      tags: 'indie, alternative' },
  { name: 'NTS Radio 1',         url: 'https://stream-relay-geo.ntslive.net/stream',         frequency: '—',      tags: 'experimental, electronic' },
  { name: 'SomaFM Groove Salad', url: 'https://ice6.somafm.com/groovesalad-128-mp3',        frequency: '—',      tags: 'ambient, electronic' },
  { name: 'SomaFM Lush',         url: 'https://ice6.somafm.com/lush-128-mp3',               frequency: '—',      tags: 'ambient, chillout' },
];
```

**Step 2: Add loadStations**

```js
async function loadStations() {
  try {
    const res = await fetch(
      'https://de1.api.radio-browser.info/json/stations/search?' +
      new URLSearchParams({
        countrycode: 'US', limit: '40', order: 'votes',
        reverse: 'true', hidebroken: 'true',
      })
    );
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const mapped = data
      .filter(s => s.url_resolved && s.bitrate >= 64)
      .slice(0, 20)
      .map(s => ({
        name:      s.name.trim(),
        url:       s.url_resolved,
        frequency: s.frequency ? s.frequency + ' FM' : '—',
        tags:      s.tags.split(',').slice(0, 3).join(', '),
      }));
    if (mapped.length < 4) throw new Error('too few results');
    State.stations = mapped;
  } catch {
    State.stations = FALLBACK_STATIONS;
  }
  State.filtered = [...State.stations];
  renderTUI();
}

document.addEventListener('DOMContentLoaded', () => {
  loadStations();
  initHeadUnit(); // Task 8
});
```

**Step 3: Verify — console shows State.stations populated after load**

**Step 4: Commit**

```bash
git -C ~/portfolio commit -am "feat: station loading with fallback"
```

---

### Task 5: TUI slide CSS + HTML

**Files:**
- Modify: `sqlch.html` — replace TUI placeholder

**Step 1: Add TUI CSS**

```css
.tui {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  background: #1a1826;
  color: var(--text);
  min-height: 420px;
  display: flex;
  flex-direction: column;
}

.tui-titlebar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  background: var(--overlay);
  border-bottom: 1px solid var(--hl-med);
}

.tui-dot { width: 10px; height: 10px; border-radius: 50%; }
.tui-dot.red    { background: #eb6f92; }
.tui-dot.yellow { background: #f6c177; }
.tui-dot.green  { background: #9ccfd8; }
.tui-titlebar-label { font-size: 12px; color: var(--muted); margin-left: auto; }

.tui-search {
  padding: 8px 14px;
  border-bottom: 1px solid var(--hl-med);
  display: flex; align-items: center; gap: 8px;
}

.tui-search-prompt { color: var(--foam); }

.tui-search-input {
  background: none; border: none; outline: none;
  color: var(--text); font-family: inherit; font-size: inherit;
  flex: 1; caret-color: var(--foam);
}

.tui-list {
  flex: 1; overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--hl-med) transparent;
}

.tui-row {
  display: flex; align-items: baseline; gap: 12px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.1s;
}

.tui-row:hover    { background: var(--hl-low); }
.tui-row.selected { background: var(--overlay); }
.tui-row.playing .tui-name { color: var(--foam); }

.tui-cursor { color: var(--foam); width: 10px; flex-shrink: 0; }
.tui-name   { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tui-freq   { font-size: 11px; color: var(--muted); white-space: nowrap; min-width: 60px; text-align: right; }
.tui-tags   { font-size: 11px; color: var(--iris); white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }

.tui-nowplaying {
  padding: 8px 14px;
  border-top: 1px solid var(--hl-med);
  background: var(--overlay);
  display: flex; align-items: center; gap: 10px;
  min-height: 36px;
}

.tui-np-indicator         { color: var(--foam); white-space: nowrap; }
.tui-np-indicator.preview { color: var(--gold); }
.tui-np-station           { color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tui-np-track             { color: var(--subtle); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tui-np-countdown         { color: var(--gold); margin-left: auto; font-size: 11px; flex-shrink: 0; }

.tui-hints {
  padding: 4px 14px 8px;
  border-top: 1px solid var(--hl-low);
  font-size: 11px; color: var(--muted);
  display: flex; gap: 16px;
}

.tui-hints kbd { color: var(--subtle); font-family: inherit; }
```

**Step 2: Replace TUI placeholder**

```html
<div class="tui" id="tui">
  <div class="tui-titlebar">
    <div class="tui-dot red"></div>
    <div class="tui-dot yellow"></div>
    <div class="tui-dot green"></div>
    <span class="tui-titlebar-label">sqlch</span>
  </div>
  <div class="tui-search">
    <span class="tui-search-prompt">/</span>
    <input class="tui-search-input" id="tui-search"
           placeholder="search stations…" autocomplete="off" spellcheck="false">
  </div>
  <div class="tui-list" id="tui-list"></div>
  <div class="tui-nowplaying">
    <span class="tui-np-indicator" id="np-indicator">—</span>
    <span class="tui-np-station"   id="np-station">—</span>
    <span class="tui-np-track"     id="np-track"></span>
    <span class="tui-np-countdown" id="np-countdown"></span>
  </div>
  <div class="tui-hints">
    <span><kbd>↑↓</kbd> navigate</span>
    <span><kbd>enter</kbd> play</span>
    <span><kbd>p</kbd> preview</span>
    <span><kbd>/</kbd> search</span>
  </div>
</div>
```

**Step 3: Verify — TUI renders with correct layout. List area is empty (stations not wired yet).**

**Step 4: Commit**

```bash
git -C ~/portfolio commit -am "feat: TUI slide HTML and CSS"
```

---

### Task 6: TUI render + keyboard

**Files:**
- Modify: `sqlch.html` — implement renderTUI, keyboard handler, search

**Step 1: Replace the renderTUI stub**

Use DOM methods throughout — no innerHTML — because station names come from an external API.

```js
function renderTUI() {
  const list = document.getElementById('tui-list');

  // Remove old rows
  while (list.firstChild) list.removeChild(list.firstChild);

  State.filtered.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'tui-row' +
      (i === State.cursor ? ' selected' : '') +
      (State.playing && State.playing.url === s.url ? ' playing' : '');

    const cursor = document.createElement('span');
    cursor.className = 'tui-cursor';
    cursor.textContent = i === State.cursor ? '▶' : ' ';

    const name = document.createElement('span');
    name.className = 'tui-name';
    name.textContent = s.name;

    const tags = document.createElement('span');
    tags.className = 'tui-tags';
    tags.textContent = s.tags;

    const freq = document.createElement('span');
    freq.className = 'tui-freq';
    freq.textContent = s.frequency;

    row.append(cursor, name, tags, freq);

    row.addEventListener('click', () => { State.cursor = i; renderTUI(); });
    row.addEventListener('dblclick', () => playStation(State.filtered[i]));
    list.appendChild(row);
  });

  const selected = list.querySelector('.selected');
  if (selected) selected.scrollIntoView({ block: 'nearest' });

  updateNowPlaying();
}

function updateNowPlaying() {
  const ind = document.getElementById('np-indicator');
  const stEl = document.getElementById('np-station');
  const trEl = document.getElementById('np-track');
  const cdEl = document.getElementById('np-countdown');

  if (State.previewing) {
    const s = State.filtered[State.cursor];
    ind.textContent = '⏵ PREVIEW';
    ind.className = 'tui-np-indicator preview';
    stEl.textContent = s ? s.name : '—';
    trEl.textContent = '';
    cdEl.textContent = State.previewCountdown + 's';
  } else if (State.playing) {
    ind.textContent = '▶';
    ind.className = 'tui-np-indicator';
    stEl.textContent = State.playing.name;
    trEl.textContent = State.nowPlaying ? '· ' + State.nowPlaying : '';
    cdEl.textContent = '';
  } else {
    ind.textContent = '—';
    ind.className = 'tui-np-indicator';
    stEl.textContent = '—';
    trEl.textContent = '';
    cdEl.textContent = '';
  }
}
```

**Step 2: Add playStation**

```js
function playStation(station) {
  if (State.previewing) stopPreview(false);
  State.playing = station;
  audioMain.src = station.url;
  audioMain.volume = 1;
  audioMain.play().catch(() => {});
  renderTUI();
  renderHeadUnit();
}
```

**Step 3: Add keyboard handler**

```js
document.addEventListener('keydown', e => {
  if (current !== 0) return; // only active on TUI slide

  const search = document.getElementById('tui-search');
  const searchFocused = document.activeElement === search;

  if (e.key === '/' && !searchFocused) {
    e.preventDefault();
    search.focus();
    return;
  }
  if (searchFocused && e.key === 'Escape') { search.blur(); return; }
  if (searchFocused) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    State.cursor = Math.min(State.cursor + 1, State.filtered.length - 1);
    renderTUI();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    State.cursor = Math.max(State.cursor - 1, 0);
    renderTUI();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (State.filtered[State.cursor]) playStation(State.filtered[State.cursor]);
  } else if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    if (State.filtered[State.cursor]) startPreview(State.filtered[State.cursor]);
  }
});
```

**Step 4: Add search handler**

```js
document.getElementById('tui-search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  State.filtered = q
    ? State.stations.filter(s =>
        s.name.toLowerCase().includes(q) || s.tags.toLowerCase().includes(q))
    : [...State.stations];
  State.cursor = 0;
  renderTUI();
});
```

**Step 5: Verify in browser**

Stations render in list. Arrow keys move cursor. Enter starts audio. `/` focuses search and filters list. Esc blurs search.

**Step 6: Commit**

```bash
git -C ~/portfolio commit -am "feat: TUI render and keyboard navigation"
```

---

### Task 7: Preview feature

**Files:**
- Modify: `sqlch.html`

**Step 1: Add startPreview and stopPreview**

```js
const PREVIEW_DURATION = 10;

function startPreview(station) {
  if (!State.playing) { playStation(station); return; }
  if (State.previewing) stopPreview(false);

  State.previewing = true;
  State.previewCountdown = PREVIEW_DURATION;

  fadeTo(audioMain, 0.04, 800);

  audioPreview.src = station.url;
  audioPreview.volume = 1;
  audioPreview.play().catch(() => {});

  renderTUI();
  renderHeadUnit();

  const ticker = setInterval(() => {
    State.previewCountdown--;
    updateNowPlaying();
    if (State.previewCountdown <= 0) {
      clearInterval(ticker);
      stopPreview(true);
    }
  }, 1000);

  State.previewTimer = ticker;
}

function stopPreview(fadeUp = true) {
  if (State.previewTimer) { clearInterval(State.previewTimer); State.previewTimer = null; }
  audioPreview.pause();
  audioPreview.src = '';
  State.previewing = false;
  State.previewCountdown = 0;
  if (fadeUp && State.playing) fadeTo(audioMain, 1, 1200);
  renderTUI();
  renderHeadUnit();
}
```

**Step 2: Verify in browser**

1. Play a station (Enter).
2. Move cursor to a different station.
3. Press `p`.
4. First station fades quiet, second plays overtop.
5. Countdown ticks down from 10 in now-playing bar.
6. After 10s: preview stops, first station fades back up.

**Step 3: Commit**

```bash
git -C ~/portfolio commit -am "feat: preview with fade"
```

---

### Task 8: Head unit slide

**Files:**
- Modify: `sqlch.html` — replace head unit placeholder

**Step 1: Add head unit CSS**

```css
.headunit {
  background: #111018;
  min-height: 420px;
  display: flex; align-items: center; justify-content: center;
  padding: 32px;
}

.hu-chassis {
  width: 100%; max-width: 480px;
  background: #1a1820;
  border: 1px solid #555;
  border-bottom-color: #222; border-right-color: #222;
  border-radius: 4px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.6);
  overflow: hidden;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.hu-badge {
  font-size: 8px; color: #333;
  letter-spacing: 0.15em; text-transform: uppercase;
  text-align: right; padding: 4px 10px 2px;
}

.hu-screen {
  margin: 0 10px;
  background: #0d1a12;
  border: 1px solid #1a2a1a; border-radius: 2px;
  padding: 10px 12px;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04);
  min-height: 80px;
}

.hu-screen-station {
  font-size: 11px; color: #4a8a5a;
  letter-spacing: 0.08em; text-transform: uppercase;
  margin-bottom: 6px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.hu-screen-track {
  font-size: 13px; color: #7acc8a; line-height: 1.4; min-height: 36px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.hu-screen-idle { color: #2a4a32; letter-spacing: 0.1em; }

.hu-seam {
  height: 1px; margin: 0 10px;
  background: linear-gradient(to right, transparent, #333 20%, #555 50%, #333 80%, transparent);
}

.hu-controls {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px;
}

.hu-indicators { display: flex; gap: 6px; }

.hu-ind {
  font-size: 9px; letter-spacing: 0.06em;
  padding: 2px 5px;
  border: 1px solid #1a2a1a; border-radius: 2px;
  color: #2a3a2a;
}

.hu-ind.active  { color: #9ccfd8; border-color: #2a5a5a; text-shadow: 0 0 6px #9ccfd8; }
.hu-ind.preview { color: #f6c177; border-color: #5a4a1a; text-shadow: 0 0 6px #f6c177; }

.hu-signal { display: flex; gap: 2px; align-items: flex-end; padding-right: 4px; }
.hu-bar    { width: 4px; background: #2a3a2a; border-radius: 1px; }
.hu-bar.lit { background: #3e8fb0; }
```

**Step 2: Replace head unit placeholder**

```html
<div class="headunit">
  <div class="hu-chassis">
    <div class="hu-badge">SQLCH  ◈  DEH-S</div>
    <div class="hu-screen">
      <div class="hu-screen-station" id="hu-station">—</div>
      <div class="hu-screen-track hu-screen-idle" id="hu-track">NO SIGNAL</div>
    </div>
    <div class="hu-seam"></div>
    <div class="hu-controls">
      <div class="hu-indicators">
        <span class="hu-ind" id="hu-st">ST</span>
        <span class="hu-ind" id="hu-mono">MONO</span>
        <span class="hu-ind" id="hu-loud">LOUD</span>
        <span class="hu-ind" id="hu-prv">PRV</span>
      </div>
      <div class="hu-signal" id="hu-signal"></div>
    </div>
  </div>
</div>
```

**Step 3: Implement renderHeadUnit and initHeadUnit**

```js
function initHeadUnit() {
  const sig = document.getElementById('hu-signal');
  [4, 6, 8, 10, 12, 10, 8, 6, 4].forEach(h => {
    const bar = document.createElement('div');
    bar.className = 'hu-bar';
    bar.style.height = h + 'px';
    sig.appendChild(bar);
  });
}

function renderHeadUnit() {
  const stEl  = document.getElementById('hu-station');
  const trEl  = document.getElementById('hu-track');
  const stInd = document.getElementById('hu-st');
  const prvInd = document.getElementById('hu-prv');
  const bars  = document.querySelectorAll('.hu-bar');

  if (State.previewing) {
    const s = State.filtered[State.cursor];
    stEl.textContent = s ? s.name.toUpperCase() : '—';
    trEl.textContent = 'PREVIEW';
    trEl.className = 'hu-screen-track';
    prvInd.className = 'hu-ind preview';
    stInd.className  = 'hu-ind';
    bars.forEach(b => b.classList.toggle('lit', Math.random() > 0.3));
  } else if (State.playing) {
    stEl.textContent = State.playing.name.toUpperCase();
    trEl.textContent = State.nowPlaying || State.playing.name;
    trEl.className   = 'hu-screen-track';
    prvInd.className = 'hu-ind';
    stInd.className  = 'hu-ind active';
    bars.forEach(b => b.classList.toggle('lit', Math.random() > 0.4));
  } else {
    stEl.textContent = '—';
    trEl.textContent = 'NO SIGNAL';
    trEl.className   = 'hu-screen-track hu-screen-idle';
    prvInd.className = 'hu-ind';
    stInd.className  = 'hu-ind';
    bars.forEach(b => b.classList.remove('lit'));
  }
}

// Animate signal bars while playing
setInterval(() => {
  if (State.playing || State.previewing) renderHeadUnit();
}, 800);
```

**Step 4: Verify in browser**

Play a station, switch to head unit slide. Station name appears on screen, ST lights up, bars animate. Preview from TUI slide — switch to head unit to confirm PRV lights up.

**Step 5: Commit**

```bash
git -C ~/portfolio commit -am "feat: head unit slide"
```

---

### Task 9: Story sections

**Files:**
- Modify: `sqlch.html` — add prose below mockup section

**Step 1: Add story HTML**

After `.mockup-section`, before the footer. Reuse `<section>`, `.section-label`, `.approach-body` pattern from `work.html`.

```html
<section>
  <p class="section-label">What it is</p>
  <div class="approach-body">
    <p>sqlch is a headless radio streaming daemon. It runs in the background, exposes a Unix socket for control, implements MPRIS so your desktop environment can interact with it, and enriches ICY stream metadata through <strong>Spotify and MusicBrainz</strong> so "Artist - Song Title" actually resolves to something real.</p>
    <p>There's a <strong>Textual TUI</strong> for when you want a terminal interface, a <strong>Waybar module</strong> for passive now-playing display, and a GTK4 layer-shell popup that looks like an Alpine head unit from 2003.</p>
  </div>
</section>

<section>
  <p class="section-label">Why I built it</p>
  <div class="approach-body">
    <p>I listen to radio constantly. Every solution I tried either had too much UI, too many dependencies, or couldn't tell my desktop what was playing. I wanted <em>exactly one thing in the background</em>, controlled from anywhere.</p>
    <p>The MPRIS requirement was non-negotiable — if my media keys don't work, it's not a real player.</p>
  </div>
</section>

<section>
  <p class="section-label">What it taught me</p>
  <div class="approach-body">
    <p>Unix sockets are <strong>shockingly simple</strong> to work with and dramatically underused for local IPC. The daemon/client pattern let me separate concerns in a way that made every piece independently testable and replaceable.</p>
    <p>ICY metadata is chaos. Stations format their stream titles however they feel — "Artist - Song", "Song by Artist", "ARTIST / SONG", raw JSON, nothing at all. Handling that gracefully without losing your mind is a design problem, not an engineering one.</p>
  </div>
</section>

<section style="border-bottom: none;">
  <p class="section-label">The preview feature</p>
  <div class="approach-body">
    <p>The UX problem: you're listening to something, you go hunting for something else, you find a station called "Peacock Jamboree in the Spring Radio, Tallahassee." You want to know if it's worth switching to — <em>without stopping what you're listening to.</em></p>
    <p>Press <strong>p</strong>. Your current station fades to 4%. The new one plays overtop for 10 seconds. Then it stops and your station fades back up. No mode switching, no menu exits, no undo stack. It's in the demo above.</p>
  </div>
</section>
```

**Step 2: Add approach-body CSS (from work.html)**

```css
section { padding: 64px 0; border-bottom: 1px solid var(--hl-med); }
section:last-of-type { border-bottom: none; }
.section-label { font-size: 12px; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 32px; }
.approach-body { font-size: 16px; color: var(--subtle); line-height: 1.8; max-width: 580px; }
.approach-body p + p { margin-top: 18px; }
.approach-body strong { color: var(--text); font-weight: 500; }
.approach-body em { font-style: normal; color: var(--gold); }
```

**Step 3: Verify — prose renders below mockup, typography matches site**

**Step 4: Commit**

```bash
git -C ~/portfolio commit -am "feat: story prose sections"
```

---

### Task 10: Wire projects.html + mobile polish

**Files:**
- Modify: `projects.html`
- Modify: `sqlch.html`

**Step 1: Add link in projects.html sqlch card**

Find the sqlch `.project-body` in `projects.html`. After the `.feature-list` closing tag:

```html
<a href="/sqlch" class="project-link link-foam">View project →</a>
```

**Step 2: Add back link at bottom of sqlch.html**

Before `</main>`, after the last section:

```html
<div class="container" style="padding: 32px 28px 0;">
  <a href="/projects" style="font-size:13px; color:var(--subtle);">← Back to Projects</a>
</div>
```

**Step 3: Mobile check at < 520px**

Resize browser. Verify: carousel works, TUI list scrolls, head unit chassis doesn't overflow. Add if needed:

```css
@media (max-width: 520px) {
  .tui { font-size: 12px; }
  .headunit { padding: 16px; }
  .tui-tags { display: none; } /* too cramped on small screens */
}
```

**Step 4: Final commit**

```bash
git -C ~/portfolio add -A
git -C ~/portfolio commit -m "feat: wire projects link and mobile polish"
```

---

## Notes for implementer

- `renderHeadUnit()` and `renderTUI()` are stubbed as empty functions in Task 3 — this prevents reference errors while the real implementations are built in later tasks.
- The `current` variable (carousel position) is declared in outer scope — the keyboard handler reads it to disable keys when not on the TUI slide.
- Test each fallback station URL in a browser `<audio>` element before publishing. Stream URLs go stale.
- If radio-browser API returns unexpected shape, check the "Before you start" step at the top of this plan — mirror servers sometimes return different formats.
