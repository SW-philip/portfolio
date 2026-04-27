/* Metadata parser — merges MPRIS2 D-Bus properties and MPV ICY metadata
   into a single normalized NowPlaying record, with graceful fallbacks.

   Usage:
     const np = parseNowPlaying({ mpris, mpv, enriched });
     // np = { station, artist, track, album, year, genre, cover,
     //        bitrate, channels, sources: ["mpv.metadata.icy-title", ...] }

   The real sqlch-popup.py pulls:
     - MPV metadata dict (icy-title, artist, title, icy-genre, icy-br)
     - MPV audio-bitrate property
     - MPV audio-params/channel-count
     - playerctl -p sqlch metadata {artist,title}
     - enriched.json cache (album / year / genres / cover)
   This module reproduces that priority order and the _LIVE_RE qualifier
   stripping so "Creep (Live at Glastonbury)" still finds the studio cover. */

(function () {
  const LIVE_RE = /(?:[\s\-]+|\()(live|bootleg|demo|acoustic|session|rehearsal|rare|outtake|alternate|unreleased|b-side|soundboard)\b/i;

  function stripLiveQualifier(track) {
    if (!track) return { base: track, qualifier: null };
    const m = track.match(LIVE_RE);
    if (!m) return { base: track, qualifier: null };
    let base = track.slice(0, m.index).replace(/[\s\-\(\[]+$/, "").trim();
    return { base: base || track, qualifier: m[1].toLowerCase() };
  }

  function splitIcy(raw) {
    if (!raw) return [null, null];
    // Prefer " - " (space-dash-space) — safer against dashes inside titles
    if (raw.includes(" - ")) {
      const [a, t] = raw.split(" - ", 2);
      return [a.trim() || null, t.trim() || null];
    }
    if (raw.includes("-")) {
      const idx = raw.indexOf("-");
      return [raw.slice(0, idx).trim() || null, raw.slice(idx + 1).trim() || null];
    }
    return [null, raw.trim() || null];
  }

  function norm(s) { return (s || "").toLowerCase().trim().replace(/\s+/g, " "); }

  function enrichLookup(cache, artist, track) {
    if (!cache || !artist || !track) return null;
    const key = `${norm(artist)}::${norm(track)}`;
    const entry = cache[key];
    if (entry && entry.cover) return entry;
    const { base, qualifier } = stripLiveQualifier(track);
    if (qualifier && base !== track) {
      const studio = cache[`${norm(artist)}::${norm(base)}`];
      if (studio && studio.cover) return studio;
    }
    return entry || null;
  }

  /** parseNowPlaying({mpris, mpv, enriched, station})
   *  mpris: {artist, title, album, year, genre, arturl}
   *  mpv:   {metadata:{icy-title, icy-br, icy-genre, title, artist}, bitrate, channels}
   *  enriched: flat cache keyed "artist::track"
   *  station: {id,name,frequency,...}
   */
  function parseNowPlaying(opts = {}) {
    const { mpris, mpv, enriched, station } = opts;
    const sources = [];
    let artist = null, track = null;

    // Priority 1: MPV metadata with distinct artist + title tags
    const md = (mpv && mpv.metadata) || {};
    const mdArtist = (md.artist || md.Artist || "").trim();
    const mdTitle  = (md.title  || md.Title  || "").trim();
    if (mdArtist && mdTitle) {
      artist = mdArtist; track = mdTitle;
      sources.push("mpv.metadata.artist+title");
    }

    // Priority 2/3: icy-title split
    if (!artist || !track) {
      const raw = (md["icy-title"] || md.title || "").trim();
      if (raw) {
        const [a, t] = splitIcy(raw);
        if (a && t) { artist = a; track = t; sources.push("mpv.metadata.icy-title"); }
        else if (t) { track = t; sources.push("mpv.metadata.icy-title(title-only)"); }
      }
    }

    // Priority 4: MPRIS via playerctl
    if (!artist || !track) {
      if (mpris && (mpris.artist || mpris.title)) {
        if (!artist && mpris.artist) artist = mpris.artist;
        if (!track  && mpris.title)  track  = mpris.title;
        sources.push("mpris.playerctl");
      }
    }

    const icyGenre = (md["icy-genre"] || md.genre || "").trim() || null;
    if (icyGenre) sources.push("mpv.icy-genre");

    // Enriched cache merge
    let album = null, year = null, genre = null, cover = null;
    const e = enrichLookup(enriched, artist, track);
    if (e) {
      album = e.album || null;
      year  = e.year != null ? String(e.year) : null;
      genre = (e.genres && e.genres[0]) || null;
      cover = e.cover || null;
      sources.push("sqlch.enriched.json");
    }
    if (!genre && icyGenre) genre = icyGenre;

    // Bitrate / channels
    const bitrate = (mpv && (mpv.bitrate || md["icy-br"])) || null;
    const channels = (mpv && mpv.channels) || null;

    return {
      station: station ? (station.name || station.id) : null,
      frequency: station ? (station.frequency || null) : null,
      artist, track, album, year, genre, cover, bitrate, channels,
      qualifier: track ? stripLiveQualifier(track).qualifier : null,
      sources,
      raw: { mpris: mpris || null, mpv: mpv || null },
    };
  }

  /** Build a readable console dump of the merged metadata. */
  function formatMetaConsole(np) {
    if (!np) return "";
    const lines = [];
    const row = (k, v) => lines.push(`<span class="k">${k.padEnd(10, " ")}</span> <span class="v">${v != null ? String(v) : "—"}</span>`);
    row("station",  np.station);
    row("freq",     np.frequency);
    row("artist",   np.artist);
    row("track",    np.track);
    if (np.qualifier) row("qualifier", `[${np.qualifier}]`);
    row("album",    np.album);
    row("year",     np.year);
    row("genre",    np.genre);
    row("bitrate",  np.bitrate ? `${np.bitrate}k` : null);
    row("channels", np.channels === 1 ? "mono" : np.channels === 2 ? "stereo" : np.channels);
    row("cover",    np.cover ? "cached" : "—");
    lines.push(`<span class="src">sources</span> ${(np.sources || []).join("  ·  ") || "(none)"}`);
    return lines.join("\n");
  }

  window.SqlchMeta = { parseNowPlaying, formatMetaConsole, stripLiveQualifier, splitIcy };
})();
