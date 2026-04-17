# sqlch Easter Egg Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the index.html system sidebars with a hidden `sqlch` easter egg link that opens a working web radio player lightbox, pixel-matched to the real sqlch app.

**Architecture:** All code lives inline in `index.html` (CSS + HTML + JS). Station data and mock enrichment tracks are embedded as JS `const` objects — no fetches. A single hidden `<audio>` element handles all playback. The trigger link occupies the left sidebar's position; the right sidebar is simply removed.

**Tech Stack:** Vanilla HTML/CSS/JS. No build step. No external libraries. HLS streams detected via `audio.canPlayType()` and marked unavailable immediately on non-Safari browsers.

---

### Task 1: Remove sidebars, add sqlch trigger link

**Files:**
- Modify: `index.html` — CSS section (sidebars block ~lines 41-58), HTML section (both aside elements)

**Step 1: Remove the sidebar CSS**

Delete the entire `/* SYSTEM SIDEBARS */` block:
```css
/* DELETE: .sys-sidebar, .sidebar-left, .sidebar-right, .stat-line, .stat-label */
```

Replace with:
```css
/* SQLCH TRIGGER */
.sqlch-trigger {
  position: fixed;
  bottom: 80px;
  left: 40px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  z-index: 10;
  transition: color 0.2s;
  display: none;
}
@media (min-width: 1024px) {
  .sqlch-trigger { display: block; }
}
.sqlch-trigger:hover { color: var(--subtle); }
```

**Step 2: Remove both aside elements from HTML**

Delete the two `<aside class="sys-sidebar ...">` blocks.

Add trigger in their place:
```html
<button class="sqlch-trigger" onclick="openSqlch()">sqlch</button>
```

**Step 3: Verify in browser**

Open `index.html` at 1200px width. Should see `sqlch` in bottom-left, muted monospace. At 900px it disappears. No broken layout.

**Step 4: Commit**
```bash
git add index.html
git commit -m "replace sidebars with sqlch easter egg trigger"
```

---

### Task 2: Add lightbox shell + overlay CSS

**Files:**
- Modify: `index.html`

**Step 1: Add lightbox CSS**

Add after `.sqlch-trigger` styles:
```css
/* SQLCH LIGHTBOX */
.sqlch-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.sqlch-overlay.open {
  opacity: 1;
  pointer-events: all;
}
.sqlch-panel {
  width: 474px;
  max-height: min(90vh, 640px);
  background: #0d1117;
  border: 1px solid #1e3a4a;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Courier New', Courier, monospace;
  color: #9ccfd8;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
}
```

**Step 2: Add lightbox HTML**

Place just before `</body>`, after the existing script block:
```html
<div class="sqlch-overlay" id="sqlch-overlay" onclick="handleSqlchOverlayClick(event)">
  <div class="sqlch-panel" id="sqlch-panel">
    <!-- populated in subsequent tasks -->
  </div>
</div>
<audio id="sqlch-audio" crossorigin="anonymous"></audio>
```

**Step 3: Add open/close JS** inside the existing `<script>` block:
```js
function openSqlch() {
  document.getElementById('sqlch-overlay').classList.add('open');
  sqCheckHls();
  sqRenderList();
}
function closeSqlch() {
  document.getElementById('sqlch-overlay').classList.remove('open');
  sqStop();
}
function handleSqlchOverlayClick(e) {
  if (e.target === document.getElementById('sqlch-overlay')) closeSqlch();
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSqlch();
});
```

**Step 4: Verify**

Click `sqlch` → dark overlay appears, empty panel centered. Click backdrop or Escape → closes.

**Step 5: Commit**
```bash
git add index.html
git commit -m "add sqlch lightbox shell and open/close logic"
```

---

### Task 3: Build now-playing header

**Files:**
- Modify: `index.html`

**Step 1: Add header CSS**
```css
.sq-header {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #0a0e14;
  border-bottom: 1px solid #1e3a4a;
  min-height: 100px;
  flex-shrink: 0;
}
.sq-art {
  width: 76px; height: 76px;
  background: #111827;
  border: 1px solid #1e3a4a;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #2a4a5a;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.sq-meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  overflow: hidden;
  min-width: 0;
}
.sq-station-name {
  font-size: 14px;
  font-weight: bold;
  color: #e0def4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sq-freq {
  font-size: 11px;
  color: #4a7a8a;
}
.sq-track {
  font-size: 12px;
  color: #9ccfd8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.3s;
}
.sq-artist {
  font-size: 11px;
  color: #6e8a96;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.3s;
}
.sq-track.fading, .sq-artist.fading { opacity: 0; }
```

**Step 2: Add header HTML inside `.sqlch-panel`**
```html
<div class="sq-header">
  <div class="sq-art">art</div>
  <div class="sq-meta">
    <div class="sq-station-name" id="sq-station-name">&#8212; &#8212;</div>
    <div class="sq-freq" id="sq-freq"></div>
    <div class="sq-track" id="sq-track">select a station</div>
    <div class="sq-artist" id="sq-artist"></div>
  </div>
</div>
```

**Step 3: Verify**

Open lightbox. Dark square labeled "art" on left, "— —" station name, "select a station" as track text.

**Step 4: Commit**
```bash
git add index.html
git commit -m "add sqlch now-playing header"
```

---

### Task 4: Build controls strip + transport row

**Files:**
- Modify: `index.html`

**Step 1: Add controls CSS**
```css
.sq-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #0a0e14;
  border-bottom: 1px solid #1e3a4a;
  flex-shrink: 0;
}
.sq-ctrl-btn {
  font-family: 'Courier New', Courier, monospace;
  font-size: 10px;
  background: #111827;
  border: 1px solid #1e3a4a;
  color: #4a7a8a;
  padding: 3px 7px;
  cursor: pointer;
  border-radius: 2px;
  letter-spacing: 0.5px;
  transition: color 0.15s, border-color 0.15s;
  user-select: none;
}
.sq-ctrl-btn:hover { color: #9ccfd8; border-color: #2e6a7a; }
.sq-ctrl-btn.active { color: #eea050; border-color: #eea050; }
.sq-signal {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
  margin: 0 4px;
}
.sq-signal-bar {
  width: 3px;
  background: #1e3a4a;
  border-radius: 1px;
  transition: background 0.3s;
}
.sq-signal-bar:nth-child(1) { height: 4px; }
.sq-signal-bar:nth-child(2) { height: 7px; }
.sq-signal-bar:nth-child(3) { height: 11px; }
.sq-signal-bar:nth-child(4) { height: 16px; }
.sqlch-overlay.playing .sq-signal-bar {
  background: #9ccfd8;
  animation: sq-pulse 0.8s ease-in-out infinite alternate;
}
.sqlch-overlay.playing .sq-signal-bar:nth-child(2) { animation-delay: 0.1s; }
.sqlch-overlay.playing .sq-signal-bar:nth-child(3) { animation-delay: 0.25s; }
.sqlch-overlay.playing .sq-signal-bar:nth-child(4) { animation-delay: 0.4s; }
@keyframes sq-pulse {
  from { opacity: 0.4; transform: scaleY(0.6); transform-origin: bottom; }
  to   { opacity: 1;   transform: scaleY(1);   transform-origin: bottom; }
}
.sq-transport {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  background: #0a0e14;
  border-bottom: 1px solid #1e3a4a;
  flex-shrink: 0;
}
.sq-transport-btn {
  font-family: 'Courier New', Courier, monospace;
  font-size: 16px;
  background: #111827;
  border: 1px solid #1e3a4a;
  color: #4a7a8a;
  width: 40px; height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  user-select: none;
}
.sq-transport-btn:hover { color: #9ccfd8; border-color: #2e6a7a; background: #172030; }
.sq-transport-btn.play-btn { width: 48px; height: 48px; font-size: 18px; }
```

**Step 2: Add controls + transport HTML** inside `.sqlch-panel`, after the header:
```html
<div class="sq-controls">
  <button class="sq-ctrl-btn" id="sq-mono" onclick="sqToggle('sq-mono')">MONO</button>
  <button class="sq-ctrl-btn active" id="sq-st" onclick="sqToggle('sq-st')">ST</button>
  <div class="sq-signal">
    <div class="sq-signal-bar"></div>
    <div class="sq-signal-bar"></div>
    <div class="sq-signal-bar"></div>
    <div class="sq-signal-bar"></div>
  </div>
  <button class="sq-ctrl-btn" id="sq-loud" onclick="sqToggle('sq-loud')">LOUD</button>
  <button class="sq-ctrl-btn" id="sq-mute" onclick="sqMute()">MUTE</button>
</div>
<div class="sq-transport">
  <button class="sq-transport-btn" title="Favorite">&#9673;</button>
  <button class="sq-transport-btn" onclick="sqPrev()" title="Previous">&#9198;</button>
  <button class="sq-transport-btn play-btn" id="sq-play" onclick="sqPlayPause()" title="Play/Pause">&#9654;</button>
  <button class="sq-transport-btn" onclick="sqStop()" title="Stop">&#9209;</button>
  <button class="sq-transport-btn" onclick="sqNext()" title="Next">&#9197;</button>
  <button class="sq-transport-btn" title="Bookmark">&#9830;</button>
  <button class="sq-transport-btn" onclick="closeSqlch()" title="Collapse">&#9660;</button>
</div>
```

**Step 3: Add toggle JS**
```js
function sqToggle(id) {
  document.getElementById(id).classList.toggle('active');
}
function sqMute() {
  var audio = document.getElementById('sqlch-audio');
  var btn = document.getElementById('sq-mute');
  audio.muted = !audio.muted;
  btn.classList.toggle('active', audio.muted);
}
```

**Step 4: Verify**

Controls strip: MONO / ST (active/amber) / signal bars / LOUD / MUTE. Transport: 7 buttons. MONO/LOUD click toggles amber. MUTE toggles amber.

**Step 5: Commit**
```bash
git add index.html
git commit -m "add sqlch controls strip and transport row"
```

---

### Task 5: Build filter bar + tabs

**Files:**
- Modify: `index.html`

**Step 1: Add filter + tab CSS**
```css
.sq-filter-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #0a0e14;
  border-bottom: 1px solid #1e3a4a;
  gap: 6px;
  flex-shrink: 0;
}
.sq-filter-input {
  flex: 1;
  background: #111827;
  border: 1px solid #1e3a4a;
  color: #9ccfd8;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  padding: 5px 8px;
  outline: none;
  border-radius: 2px;
}
.sq-filter-input::placeholder { color: #2a4a5a; }
.sq-filter-input:focus { border-color: #2e6a7a; }
.sq-filter-icon { font-size: 13px; color: #2a4a5a; user-select: none; }
.sq-tabs {
  display: flex;
  border-bottom: 1px solid #1e3a4a;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}
.sq-tabs::-webkit-scrollbar { display: none; }
.sq-tab {
  font-family: 'Courier New', Courier, monospace;
  font-size: 10px;
  color: #4a7a8a;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 6px 10px;
  cursor: pointer;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  white-space: nowrap;
  transition: color 0.15s;
}
.sq-tab:hover { color: #9ccfd8; }
.sq-tab.active { color: #9ccfd8; border-bottom-color: #9ccfd8; }
```

**Step 2: Add filter + tabs HTML** after transport row:
```html
<div class="sq-filter-row">
  <input class="sq-filter-input" id="sq-filter" placeholder="filter..." oninput="sqFilter()" />
  <span class="sq-filter-icon">&#127760;</span>
  <button class="sq-ctrl-btn">+</button>
</div>
<div class="sq-tabs" id="sq-tabs">
  <button class="sq-tab active" data-cat="ALL" onclick="sqSetTab(this)">ALL</button>
  <button class="sq-tab" data-cat="Rock" onclick="sqSetTab(this)">Rock</button>
  <button class="sq-tab" data-cat="Pop" onclick="sqSetTab(this)">Pop</button>
  <button class="sq-tab" data-cat="Urban" onclick="sqSetTab(this)">Urban</button>
  <button class="sq-tab" data-cat="Public" onclick="sqSetTab(this)">Public</button>
</div>
```

**Step 3: Add filter/tab state + stub JS**
```js
var sqActiveTab = 'ALL';
var sqFilterText = '';

function sqSetTab(btn) {
  document.querySelectorAll('.sq-tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  sqActiveTab = btn.dataset.cat;
  sqRenderList();
}
function sqFilter() {
  sqFilterText = document.getElementById('sq-filter').value.toLowerCase();
  sqRenderList();
}
function sqRenderList() { /* implemented in Task 6 */ }
```

**Step 4: Verify**

Filter input renders. Tabs ALL/Rock/Pop/Urban/Public visible and clickable. Active tab highlighted in teal. Filter typing does nothing yet.

**Step 5: Commit**
```bash
git add index.html
git commit -m "add sqlch filter bar and category tabs"
```

---

### Task 6: Embed station data + enrichment tracks

**Files:**
- Modify: `index.html` — JS section, add consts before sqlch functions

**Step 1: Add the station data const**
```js
const SQ_STATIONS = [
  // Rock
  { id:'wmmr', name:'(WMMR) MMR Rocks',         freq:'93.3 FM',  cat:'Rock',   url:'https://playerservices.streamtheworld.com/api/livestream-redirect/WMMRFMAACIHR.aac' },
  { id:'wmgk', name:'(WMGK) Classic Rock 102.9', freq:'102.9 FM', cat:'Rock',   url:'https://playerservices.streamtheworld.com/api/livestream-redirect/WMGKFMAAC.aac' },
  { id:'wrff', name:'(WRFF) Alt 104.5',           freq:'104.5 FM', cat:'Rock',   url:'https://stream.revma.ihrhls.com/zc3401' },
  { id:'wzzo', name:'(WZZO) Rock 95.1',           freq:'95.1 FM',  cat:'Rock',   url:'https://stream.revma.ihrhls.com/zc1977' },
  { id:'wrpr', name:'(WRPR) Real Punk Radio',     freq:'900 AM',   cat:'Rock',   url:'http://149.56.155.73:8080/stream' },
  { id:'xfm',  name:'(XFM) Indie',                freq:'1060 AM',  cat:'Rock',   url:'http://kathy.torontocast.com:2690/stream' },
  { id:'ynot', name:'(YNOT) Ynot Radio',          freq:'1490 AM',  cat:'Rock',   url:'https://das-edge15-live365-dal02.cdnstream.com/a54553' },
  // Pop
  { id:'wioq', name:'(WIOQ) Q102 Philly',         freq:'102.1 FM', cat:'Pop',    url:'https://stream.revma.ihrhls.com/zc1997/hls.m3u8', hls:true },
  { id:'wbeb', name:'(WBEB) B101',                 freq:'101.1 FM', cat:'Pop',    url:'https://live.amperwave.net/direct/audacy-wbebfmaac-imc' },
  { id:'wogl', name:'(WOGL) Big 98.1',             freq:'98.1 FM',  cat:'Pop',    url:'https://live.amperwave.net/direct/audacy-woglfmaac-imc' },
  { id:'wben', name:'(WBEN) Ben FM',               freq:'95.7 FM',  cat:'Pop',    url:'https://playerservices.streamtheworld.com/api/livestream-redirect/WBENFMAAC.aac' },
  { id:'wstw', name:'(WSTW) Delaware Valley',      freq:'93.7 FM',  cat:'Pop',    url:'https://ais-sa1.streamon.fm:443/7864_96k.aac' },
  { id:'wtdy', name:'(WTDY) Hot AC 96.5',          freq:'96.5 FM',  cat:'Pop',    url:'https://live.amperwave.net/direct/audacy-wtdyfmaac-imc' },
  { id:'wpst', name:'(WPST) Top-40 94.5',          freq:'94.5 FM',  cat:'Pop',    url:'https://live.amperwave.net/direct/townsquare-wpstfmaac-ibc3' },
  { id:'wlev', name:'(WLEV) AC 100.7',             freq:'100.7 FM', cat:'Pop',    url:'https://playerservices.streamtheworld.com/api/livestream-redirect/wlevfm.mp3' },
  // Urban
  { id:'wusl', name:'(WUSL) Power 99',             freq:'98.9 FM',  cat:'Urban',  url:'https://stream.revma.ihrhls.com/zc2009' },
  { id:'wdas', name:'(WDAS) Urban 105.3',          freq:'105.3 FM', cat:'Urban',  url:'https://stream.revma.ihrhls.com/zc1993' },
  { id:'wrnb', name:'(WRNB) RnB and Hip Hop',      freq:'1060 AM',  cat:'Urban',  url:'https://playerservices.streamtheworld.com/api/livestream-redirect/WRNBHD2.mp3' },
  // Public
  { id:'wxpn', name:'(WXPN) XPN Public Radio',     freq:'88.5 FM',  cat:'Public', url:'https://wxpnhi.xpn.org/xpnhi' },
  { id:'xpon', name:'(WXPN) XPonential (HD2)',      freq:'88.1 FM',  cat:'Public', url:'https://wxpn.xpn.org/xpn2mp3hi' },
  { id:'whyy', name:'(WHYY) NPR',                  freq:'90.9 FM',  cat:'Public', url:'http://whyy.streamguys1.com/whyy-mp3' },
  { id:'wxvu', name:'(WXVU) Villanova Radio',       freq:'89.1 FM',  cat:'Public', url:'http://nap.casthost.net:8002/stream' },
];
```

**Step 2: Add enrichment tracks const**

Tracks sourced from `~/.cache/sqlch/enriched.json`, assigned by station genre:
```js
const SQ_TRACKS = {
  wmmr: [{ artist:'Foo Fighters', track:'Your Favorite Toy' }, { artist:'Japandroids', track:'The House That Heaven Built' }, { artist:'DEADLETTER', track:'The Snitching Hour' }],
  wmgk: [{ artist:'Foo Fighters', track:'Your Favorite Toy' }, { artist:'Japandroids', track:'The House That Heaven Built' }, { artist:'We Are Scientists', track:'Less From You' }],
  wrff: [{ artist:'Courtney Barnett', track:'Mantis' }, { artist:'We Are Scientists', track:'Less From You' }, { artist:'The Last Dinner Party', track:'The Scythe' }],
  wzzo: [{ artist:'Foo Fighters', track:'Your Favorite Toy' }, { artist:'DEADLETTER', track:'The Snitching Hour' }, { artist:'Japandroids', track:'The House That Heaven Built' }],
  wrpr: [{ artist:'DEADLETTER', track:'The Snitching Hour' }, { artist:'Dream Nails', track:'The Information' }, { artist:'Japandroids', track:'The House That Heaven Built' }],
  xfm:  [{ artist:'Courtney Barnett', track:'Mantis' }, { artist:'The Last Dinner Party', track:'The Scythe' }, { artist:'We Are Scientists', track:'Less From You' }],
  ynot: [{ artist:'Foo Fighters', track:'Your Favorite Toy' }, { artist:'DEADLETTER', track:'The Snitching Hour' }, { artist:'Japandroids', track:'The House That Heaven Built' }],
  wioq: [{ artist:'Hazel English', track:'Jesse' }, { artist:'Cub Sport', track:'Hands' }, { artist:'The Last Dinner Party', track:'The Scythe' }],
  wbeb: [{ artist:'Hazel English', track:'Jesse' }, { artist:'Cub Sport', track:'Hands' }, { artist:'Courtney Barnett', track:'Mantis' }],
  wogl: [{ artist:'Cub Sport', track:'Hands' }, { artist:'Hazel English', track:'Jesse' }, { artist:'We Are Scientists', track:'Less From You' }],
  wben: [{ artist:'Hazel English', track:'Jesse' }, { artist:'The Last Dinner Party', track:'The Scythe' }, { artist:'Cub Sport', track:'Hands' }],
  wstw: [{ artist:'Cub Sport', track:'Hands' }, { artist:'Hazel English', track:'Jesse' }, { artist:'The Last Dinner Party', track:'The Scythe' }],
  wtdy: [{ artist:'Hazel English', track:'Jesse' }, { artist:'Cub Sport', track:'Hands' }, { artist:'Courtney Barnett', track:'Mantis' }],
  wpst: [{ artist:'Cub Sport', track:'Hands' }, { artist:'Hazel English', track:'Jesse' }, { artist:'The Last Dinner Party', track:'The Scythe' }],
  wlev: [{ artist:'Hazel English', track:'Jesse' }, { artist:'Cub Sport', track:'Hands' }, { artist:'We Are Scientists', track:'Less From You' }],
  wusl: [{ artist:'Unknown Artist', track:'Power 99 Live' }, { artist:'Unknown Artist', track:'Urban Mix' }],
  wdas: [{ artist:'Unknown Artist', track:'105.3 Live' }, { artist:'Unknown Artist', track:'Urban Mix' }],
  wrnb: [{ artist:'Unknown Artist', track:'RnB Live' }, { artist:'Unknown Artist', track:'Hip Hop Mix' }],
  wxpn: [{ artist:'Courtney Barnett', track:'Mantis' }, { artist:'The Last Dinner Party', track:'The Scythe' }, { artist:'Dream Nails', track:'The Information' }],
  xpon: [{ artist:'Hazel English', track:'Jesse' }, { artist:'Courtney Barnett', track:'Mantis' }, { artist:'We Are Scientists', track:'Less From You' }],
  whyy: [{ artist:'NPR', track:'Morning Edition' }, { artist:'NPR', track:'All Things Considered' }],
  wxvu: [{ artist:'Dream Nails', track:'The Information' }, { artist:'Courtney Barnett', track:'Mantis' }, { artist:'DEADLETTER', track:'The Snitching Hour' }],
};
```

**Step 3: Verify** — no console errors, no visible change.

**Step 4: Commit**
```bash
git add index.html
git commit -m "embed sqlch station data and enrichment tracks"
```

---

### Task 7: Build station list + render logic

**Files:**
- Modify: `index.html`

**Step 1: Add station list CSS**
```css
.sq-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #1e3a4a transparent;
}
.sq-list::-webkit-scrollbar { width: 4px; }
.sq-list::-webkit-scrollbar-thumb { background: #1e3a4a; border-radius: 2px; }
.sq-row {
  display: flex;
  align-items: center;
  padding: 7px 12px;
  border-bottom: 1px solid #0d1a24;
  cursor: pointer;
  gap: 8px;
  transition: background 0.1s;
}
.sq-row:hover { background: #111827; }
.sq-row.sq-active { background: #0a1a2a; }
.sq-row.sq-unavailable { opacity: 0.35; cursor: default; pointer-events: none; font-style: italic; }
.sq-row-name {
  flex: 1;
  font-size: 12px;
  color: #9ccfd8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sq-row.sq-active .sq-row-name { color: #eea050; }
.sq-row-freq { font-size: 10px; color: #2a4a5a; min-width: 60px; text-align: right; }
.sq-row-cat  { font-size: 10px; color: #2a4a5a; min-width: 40px; text-align: right; letter-spacing: 0.5px; }
.sq-row-actions { font-size: 10px; color: #1e3a4a; display: flex; gap: 6px; }
```

**Step 2: Add list container HTML** inside `.sqlch-panel`, after the tabs div:
```html
<div class="sq-list" id="sq-list"></div>
```

**Step 3: Implement `sqRenderList()`** — replace the stub from Task 5.

Use DOM methods (not innerHTML) to avoid XSS risk even though data is from a const:
```js
var sqUnavailable = new Set();
var sqCurrentId = null;

function sqRenderList() {
  var list = document.getElementById('sq-list');
  list.textContent = ''; // clears children safely

  SQ_STATIONS.forEach(function(s) {
    if (sqActiveTab !== 'ALL' && s.cat !== sqActiveTab) return;
    if (sqFilterText && s.name.toLowerCase().indexOf(sqFilterText) === -1) return;

    var row = document.createElement('div');
    row.className = 'sq-row' +
      (sqUnavailable.has(s.id) ? ' sq-unavailable' : '') +
      (sqCurrentId === s.id    ? ' sq-active'      : '');

    var name = document.createElement('span');
    name.className = 'sq-row-name';
    name.textContent = s.name;

    var freq = document.createElement('span');
    freq.className = 'sq-row-freq';
    freq.textContent = s.freq;

    var cat = document.createElement('span');
    cat.className = 'sq-row-cat';
    cat.textContent = s.cat;

    var actions = document.createElement('span');
    actions.className = 'sq-row-actions';
    actions.textContent = '% \u00d7';

    row.appendChild(name);
    row.appendChild(freq);
    row.appendChild(cat);
    row.appendChild(actions);

    row.addEventListener('click', (function(id) {
      return function() { sqSelectStation(id); };
    })(s.id));

    list.appendChild(row);
  });
}
```

**Step 4: Add HLS detection**
```js
function sqCheckHls() {
  var audio = document.getElementById('sqlch-audio');
  var canHls = audio.canPlayType('application/vnd.apple.mpegurl') !== '';
  if (!canHls) {
    SQ_STATIONS.forEach(function(s) {
      if (s.hls) sqUnavailable.add(s.id);
    });
  }
}
```

**Step 5: Verify**

Open lightbox. All 22 stations listed. Rock tab shows 7. Pop tab shows 8. Urban shows 3. Public shows 4. Filter by "wm" → WMMR and WMGK. WIOQ grayed out on Chrome/Firefox.

**Step 6: Commit**
```bash
git add index.html
git commit -m "add sqlch station list with filter and tab logic"
```

---

### Task 8: Implement audio engine

**Files:**
- Modify: `index.html`

**Step 1: Add `sqSelectStation()`**
```js
var sqTrackIndex = {};
var sqTrackTimer = null;
var sqErrorTimeout = null;

function sqSelectStation(id) {
  var station = SQ_STATIONS.find(function(s) { return s.id === id; });
  if (!station || sqUnavailable.has(id)) return;

  sqCurrentId = id;
  sqRenderList();

  document.getElementById('sq-station-name').textContent = station.name;
  document.getElementById('sq-freq').textContent = station.freq;

  var audio = document.getElementById('sqlch-audio');
  clearTimeout(sqErrorTimeout);
  audio.pause();
  audio.src = station.url;

  audio.onerror = function() {
    clearTimeout(sqErrorTimeout);
    sqMarkUnavailable(id);
  };
  audio.oncanplay = function() {
    clearTimeout(sqErrorTimeout);
  };

  audio.play().catch(function() { sqMarkUnavailable(id); });

  sqErrorTimeout = setTimeout(function() {
    if (audio.readyState < 3) sqMarkUnavailable(id);
  }, 4000);

  document.getElementById('sq-play').textContent = '\u23f8';
  document.getElementById('sqlch-overlay').classList.add('playing');

  sqShowTrack(id);
}

function sqMarkUnavailable(id) {
  sqUnavailable.add(id);
  if (sqCurrentId === id) sqNext();
  sqRenderList();
}
```

**Step 2: Add `sqPlayPause()` and `sqStop()`**
```js
function sqPlayPause() {
  var audio = document.getElementById('sqlch-audio');
  var btn = document.getElementById('sq-play');
  if (!sqCurrentId) return;
  if (audio.paused) {
    audio.play();
    btn.textContent = '\u23f8';
    document.getElementById('sqlch-overlay').classList.add('playing');
  } else {
    audio.pause();
    btn.textContent = '\u25b6';
    document.getElementById('sqlch-overlay').classList.remove('playing');
  }
}

function sqStop() {
  clearTimeout(sqErrorTimeout);
  clearTimeout(sqTrackTimer);
  var audio = document.getElementById('sqlch-audio');
  audio.pause();
  audio.src = '';
  sqCurrentId = null;
  document.getElementById('sq-play').textContent = '\u25b6';
  document.getElementById('sq-station-name').textContent = '\u2014 \u2014';
  document.getElementById('sq-freq').textContent = '';
  document.getElementById('sq-track').textContent = 'select a station';
  document.getElementById('sq-artist').textContent = '';
  document.getElementById('sqlch-overlay').classList.remove('playing');
  sqRenderList();
}
```

**Step 3: Add `sqNext()` and `sqPrev()`**
```js
function sqVisibleStations() {
  return SQ_STATIONS.filter(function(s) {
    if (sqUnavailable.has(s.id)) return false;
    if (sqActiveTab !== 'ALL' && s.cat !== sqActiveTab) return false;
    if (sqFilterText && s.name.toLowerCase().indexOf(sqFilterText) === -1) return false;
    return true;
  });
}

function sqNext() {
  var visible = sqVisibleStations();
  if (!visible.length) return;
  var idx = visible.findIndex(function(s) { return s.id === sqCurrentId; });
  sqSelectStation(visible[(idx + 1) % visible.length].id);
}

function sqPrev() {
  var visible = sqVisibleStations();
  if (!visible.length) return;
  var idx = visible.findIndex(function(s) { return s.id === sqCurrentId; });
  sqSelectStation(visible[(idx - 1 + visible.length) % visible.length].id);
}
```

**Step 4: Verify**

Click a station row. Header updates. Audio plays (or times out after 4s → row dims, next station loads). Play button becomes ⏸. Click ⏸ → pauses. Click ⏹ → resets. ⏮/⏭ cycle the visible filtered list.

**Step 5: Commit**
```bash
git add index.html
git commit -m "implement sqlch audio engine with play/pause/stop/cycle"
```

---

### Task 9: Enrichment track rotation

**Files:**
- Modify: `index.html`

**Step 1: Add `sqShowTrack()`**
```js
function sqShowTrack(id) {
  clearTimeout(sqTrackTimer);
  var tracks = SQ_TRACKS[id];
  if (!tracks || !tracks.length) return;
  if (sqTrackIndex[id] === undefined) sqTrackIndex[id] = 0;

  var t = tracks[sqTrackIndex[id]];
  var trackEl  = document.getElementById('sq-track');
  var artistEl = document.getElementById('sq-artist');

  trackEl.classList.add('fading');
  artistEl.classList.add('fading');

  setTimeout(function() {
    if (sqCurrentId !== id) return;
    trackEl.textContent  = t.track;
    artistEl.textContent = t.artist;
    trackEl.classList.remove('fading');
    artistEl.classList.remove('fading');
    sqTrackIndex[id] = (sqTrackIndex[id] + 1) % tracks.length;
    sqTrackTimer = setTimeout(function() { sqShowTrack(id); }, 30000);
  }, 300);
}
```

**Step 2: Verify**

Select a station. Track + artist appear after fade-in. Wait 30s — rotates to next track. Switch stations — timer resets cleanly.

**Step 3: Commit**
```bash
git add index.html
git commit -m "add sqlch enrichment track rotation"
```

---

### Task 10: Final smoke test + commit

**Step 1: Full checklist**

- [ ] `sqlch` link visible at 1200px, hidden at 900px
- [ ] Click `sqlch` opens lightbox
- [ ] Tabs filter correctly (Rock: 7, Pop: 8, Urban: 3, Public: 4)
- [ ] Filter input narrows list in real time
- [ ] Tab + filter combine correctly
- [ ] Click station row: header updates, row highlights amber
- [ ] Audio plays (at least some stations)
- [ ] WIOQ grayed out on Chrome/Firefox
- [ ] Failed stream → row dims, auto-advances
- [ ] ⏸/▶ pause/resume
- [ ] ⏹ resets everything
- [ ] ⏮/⏭ cycle filtered list only
- [ ] MUTE mutes audio and toggles amber
- [ ] MONO/LOUD toggle amber (no audio effect)
- [ ] Signal bars animate when playing, stop when paused
- [ ] ▼ closes lightbox + stops audio
- [ ] Escape closes lightbox + stops audio
- [ ] Backdrop click closes lightbox + stops audio
- [ ] Reopen lightbox: clean state, no audio
- [ ] No console errors

**Step 2: Final commit**
```bash
git add index.html
git commit -m "sqlch easter egg: working web radio player in portfolio"
```
