# sqlch showcase page — design

**Date:** 2026-04-10
**File to create:** `sqlch.html`

---

## Goal

A dedicated page for sqlch that leads with a working demo, earns its prose, and gives people who care enough to scroll the full story.

---

## Page structure

### 1. Header
- Eyebrow: "Projects"
- Title: something like *"I built a radio daemon. Then I went too far."*
- Lede: 2 sentences — what sqlch is, and that there's a working demo below. No more.

### 2. Mockup (immediately after header, before any prose)
Full-width carousel. Two slides sharing live playback state. Arrows or dot indicators to switch.

**Slide 1 — TUI**
- Terminal window aesthetic: dark background, monospace font, border
- Station list with name, frequency, tags
- Search input (filters list live)
- Now-playing bar pinned to bottom: station name, current track if available, elapsed time
- Keyboard-driven:
  - Arrow keys: navigate list
  - Enter: play selected station
  - `p`: trigger preview on selected station
  - `/`: focus search
- Preview behavior (working, real audio):
  1. Current station fades to 4% volume
  2. Preview station starts playing at normal volume
  3. After 10 seconds, preview stops
  4. Current station fades back up
  5. Visual indicator shows preview is active ("PREVIEW" badge, countdown)

**Slide 2 — Head unit**
- CSS recreation of the Alpine-style popup from sqlch-popup.py
- Rosé Pine Moon palette, skeuomorphic details (chassis border, screen surround, signal bars)
- Updates in sync with slide 1: station name, now-playing track, signal strength (fake), indicators
- Not interactive — purely display. Shows the "went too far" part.

**Stations source:**
- On load, query radio-browser.info API — search by country=US, filtered to a curated tag set (jazz, indie, classical, public radio)
- Hardcoded fallback list of ~8 stations if API fails or times out
- Prefer stations with known-good stream URLs (WXPN, WRTI, etc. from the known-frequencies list)

### 3. Story (below the mockup)
Four short sections, scannable. Same prose tone as the rest of the site.

- **What it is** — the daemon, TUI, socket interface, MPRIS
- **Why I built it** — the actual reason (not "to learn Python")
- **What it taught me** — one or two real things, not a resume bullet
- **Why the preview feature is the whole point** — explain the UX problem it solves, let the demo speak for itself

### 4. Footer links
- GitHub repo link (shown as "coming soon" until repo is public)
- ← Back to Projects

---

## Technical approach

- Single `sqlch.html` file, inline CSS and JS, no dependencies
- Two `<audio>` elements: `#audio-main` and `#audio-preview`
- Volume fade via `setInterval` stepping (no Web Audio API — avoids CORS)
- Carousel: CSS transforms + JS class toggle, no library
- Head unit: pure CSS, no canvas
- radio-browser API: `https://de1.api.radio-browser.info/json/stations/search`
- Station data shape: `{ name, url_resolved, frequency, tags, favicon, bitrate }`

---

## What this page is NOT

- Not a full documentation site
- Not a tutorial
- Not a video embed placeholder
- Not a six-paragraph setup before the demo

---

## Links from projects.html

The existing sqlch card on `projects.html` needs a "Learn more →" link added, pointing to `/sqlch`.
