# sqlch Easter Egg — Design Doc
**Date:** 2026-04-17

## Summary

Replace the index.html system sidebars with a hidden easter egg: a `sqlch` link that only appears at wide viewports and opens a working web replica of the sqlch radio player as a lightbox. Uses the user's actual station library with live streams.

---

## Trigger & Entry Point

- Both `.sys-sidebar` elements removed from `index.html`
- Left sidebar replaced with a single `sqlch` text link, fixed position (`bottom: 80px; left: 40px`), matching the existing sidebar's monospace/muted style
- Visible only at `min-width: 1024px` (same breakpoint as current sidebars)
- No label, no tooltip, no explanation — discoverable by curious visitors
- Click → opens sqlch lightbox overlay

---

## Lightbox

- Dark backdrop (`rgba(0,0,0,0.75)`), same pattern as existing kebab overlay
- Centered panel, ~474px wide, fixed height with internal scroll on station list
- Close on backdrop click, Escape key, or ▼ collapse button inside player
- `z-index` above existing kebab overlay

---

## Player Panel Layout (top to bottom)

### 1. Now-Playing Header
- Dark square placeholder (no album art fetching) — `80×80px`, `var(--overlay)` background
- Station name + frequency on the right
- Artist — Track below, hardcoded per-station from `enriched.json` data, rotates every ~30s with a fade transition
- Shows "— —" until a station is selected

### 2. Controls Strip
- Buttons: `MONO` · `ST` · signal bars · `LOUD` · `MUTE`
- Signal bars: CSS animation, randomized pulse, always visible when playing
- `MUTE`: actually mutes the `<audio>` element (`audio.muted`)
- Everything else: visual toggles only — click, change state, no audio effect

### 3. Transport Row
- `◉` `⏮` `⏸/▶` `⏹` `⏭` `♦` `▼`
- `▶/⏸`: play/pause the current `<audio>` stream
- `⏹`: stops playback, clears now-playing state
- `⏮/⏭`: cycle through the filtered/visible station list
- `▼`: closes the lightbox (same as clicking backdrop)
- `◉` and `♦`: visual no-ops

### 4. Filter + Tabs
- Text input: real-time case-insensitive filter on station name
- Globe icon: visual no-op
- `+` button: visual no-op
- Tabs: `ALL` · `Rock` · `Pop` · `Talk` · `Public` (derived from actual station categories)
- Filter and tab work simultaneously — both conditions must match

### 5. Station List
- Scrollable, fixed height
- Each row: station name (left), frequency (center), genre tag (right), `%` and `×` (visual no-ops)
- Active/playing row: highlighted with `var(--foam)` accent on name
- Unavailable row: dimmed (`opacity: 0.4`), italicized, not clickable
- Click row → stops current stream, sets new `audio.src`, plays, updates now-playing header

---

## Station Data

Source: `/home/prepko/.local/share/sqlch/library.json` (stations array only — no channels).

Stations to include (all with verified stream URLs):

| Name | Freq | Category | URL |
|---|---|---|---|
| (WMMR) MMR Rocks | 93.3 FM | Rock | streamtheworld AAC redirect |
| (WMGK) Classic Rock 102.9 | 102.9 FM | Rock | streamtheworld AAC redirect |
| (WRFF) Alt 104.5 | 104.5 FM | Rock | stream.revma.ihrhls.com |
| (WZZO) Rock 95.1 | 95.1 FM | Rock | stream.revma.ihrhls.com |
| (WRPR) REAL PUNK RADIO | 900 AM | Rock | 149.56.155.73 MP3 stream |
| (XFM) Indie | 1060 AM | Rock | torontocast MP3 320k |
| (YNOT) Ynot Radio | 1490 AM | Rock | live365 cdnstream |
| (WIOQ) Q102 Philly | 102.1 FM | Pop | stream.revma HLS |
| (WBEB) B101 | 101.1 FM | Pop | amperwave AAC |
| (WOGL) Big 98.1 | 98.1 FM | Pop | amperwave AAC |
| (WBEN) Ben FM | 95.7 FM | Pop | streamtheworld AAC |
| (WSTW) Delaware Valley | 93.7 FM | Pop | streamon.fm AAC |
| (WTDY) Hot AC 96.5 | 96.5 FM | Pop | amperwave AAC |
| (WPST) Top-40 94.5 | 94.5 FM | Pop | amperwave AAC |
| (WLEV) AC 100.7 | 100.7 FM | Pop | amperwave AAC |

---

## Enrichment (Mocked)

Source: `/home/prepko/.cache/sqlch/enriched.json`

Each station gets 3–4 hardcoded tracks (artist + title). The now-playing display cycles through them every ~30 seconds with a 300ms opacity fade. Track data is embedded directly in the JS — no fetch required. Tracks are chosen from the enriched.json entries that were recently played on that station's genre.

---

## Audio & Error Handling

- Single hidden `<audio>` element, `crossorigin="anonymous"`
- On station select: `audio.src = url; audio.play()`
- `audio.onerror` after 4 seconds: mark row as unavailable, auto-advance to next station in list
- HLS streams (`.m3u8`): browser native support varies — Safari handles natively, Chrome/Firefox do not. HLS stations get a `data-hls="true"` flag; if `audio.canPlayType('application/vnd.apple.mpegurl')` returns empty, mark unavailable immediately rather than timing out.
- No fallback CDN, no service worker — if a stream is down, the row dims.

---

## Styling

- Matches sqlch screenshot aesthetic: dark blue-grey, monospace labels, teal/cyan accents (`var(--foam)`), amber highlights for active states (`#eea050` from the kebab button)
- Panel uses `var(--surface)` background, `var(--hl-med)` borders — consistent with the rest of the site
- Signal bars: 4 bars, CSS `animation: signal-pulse` with staggered delays, bars animate height randomly while playing
- All code lives in `index.html` (inline CSS + JS) — no new files except the station data which is embedded as a JS const

---

## What's Explicitly Out of Scope

- Spotify enrichment / live metadata fetching
- Favorites / play count tracking
- Adding new stations (`+` button is visual)
- Removing stations (`×` button is visual)
- MONO/ST actual audio processing
- Any persistence between sessions
