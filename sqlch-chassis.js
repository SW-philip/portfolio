/* sqlch — unified receiver chassis.
   Exports: window.Chassis, window.LibraryModule, window.DiscoverModule,
            window.CollapsedBar, window.MetaConsole, window.TweaksPanel */
const { useState, useEffect, useRef, useMemo } = React;

// ── Tiny atomic pieces ────────────────────────────────────────────────────────
function Orbit({ playing }) {
  return (
    <div className={`orbit-grid ${playing ? "playing" : ""}`}>
      <div className="orbit-cell" /><div className="orbit-cell"><span className="orbit-dot dn" /></div><div className="orbit-cell" />
      <div className="orbit-cell"><span className="orbit-dot dw" /></div><div className="orbit-cell"><span className="orbit-center" /></div><div className="orbit-cell"><span className="orbit-dot de" /></div>
      <div className="orbit-cell" /><div className="orbit-cell"><span className="orbit-dot ds" /></div><div className="orbit-cell" />
    </div>
  );
}

function SignalBars({ playing }) {
  return (
    <div className={`sig-strip ${playing ? "playing" : ""}`}>
      {Array.from({ length: 9 }).map((_, i) => <div key={i} className="sig-bar" />)}
    </div>
  );
}

function Seam() {
  return (
    <div className="seam-wrap">
      <div className="seam" />
      <div className="seam-shadow" />
    </div>
  );
}

function MfrBadge({ label = "SQLCH" }) {
  return (
    <div className="mfr-badge">
      <span className="sq-icon" />
      <span>{label}  ·  MMXXVI</span>
    </div>
  );
}

// ── Now Playing display ──────────────────────────────────────────────────────
function NowPlayingDisplay({ np, playing, paused, mute, loud }) {
  const playingNow = playing && !paused;
  return (
    <div className={`now-playing ${playingNow ? "playing" : ""}`}>
      <div className="np-row">
        <div className="art-panel">
          {np.cover
            ? <img src={np.cover} alt="" />
            : <div className="art-placeholder">[ NO ART ]</div>}
        </div>
        <div className="info-panel">
          <div className="display-bar station-name" title={np.station || ""}>
            {np.station || "— — —"}
          </div>
          <div className="display-bar track-info" title={np.artist && np.track ? `${np.artist} — ${np.track}` : ""}>
            {np.artist && np.track
              ? <>{np.qualifier ? <span style={{opacity:.6}}>[{np.qualifier}] </span> : null}{np.artist} — {np.track}</>
              : "— awaiting stream metadata —"}
          </div>
          <div className="meta-album">{np.album || ""}</div>
          <div className="meta-sub">
            {[np.year, np.genre, np.bitrate ? `${np.bitrate}k` : null, np.channels === 1 ? "MONO" : null].filter(Boolean).join("  ·  ")}
          </div>
        </div>
      </div>

      <div className="indicator-panel">
        <Orbit playing={playingNow} />
        <SignalBars playing={playingNow} />
        <div className={`radio-btn st-ind ${playingNow ? "lit" : ""}`}>ST</div>
        <div className={`radio-btn mono-ind ${playingNow && np.channels === 1 ? "lit" : ""}`}>MONO</div>
        <div className={`radio-btn loud-ind ${loud ? "lit" : ""}`}>LOUD</div>
        <div className={`radio-btn mute-ind ${mute ? "lit" : ""}`}>MUTE</div>
      </div>
    </div>
  );
}

// ── Transport ────────────────────────────────────────────────────────────────
function TransportBar({ playing, paused, onPlayPause, onStop, onPrev, onNext, onCollapse }) {
  return (
    <div className="controls">
      <button className="ctl-btn" onClick={onPrev} title="prev">⏮</button>
      <button className={`ctl-btn ${playing && !paused ? "lit" : ""}`} onClick={onPlayPause} title={paused ? "play" : "pause"}>
        {paused || !playing ? "▶" : "⏸"}
      </button>
      <button className="ctl-btn" onClick={onStop} title="stop">■</button>
      <button className="ctl-btn" onClick={onNext} title="next">⏭</button>
      <button className="ctl-btn" onClick={onCollapse} title="collapse">◩</button>
    </div>
  );
}

// ── Core chassis frame ───────────────────────────────────────────────────────
function Chassis({ style = "dark", accent = "cyan", className = "", children, width = 420 }) {
  const cls = `chassis style-${style} acc-${accent} ${className}`;
  return (
    <div className={cls} style={{ width }}>
      {children}
      <Seam />
      <div className="mfr-row">
        <MfrBadge />
        <div style={{fontFamily:"var(--mono)",fontSize:7,letterSpacing:".24em",color:"#3a3a3a"}}>SN·2026·PHL·001</div>
      </div>
    </div>
  );
}

// ── Collapsed quick-pick bar (Winamp/Alpine-style) ───────────────────────────
function CollapsedBar({ stations, currentId, group, onPickNum, onPrevGroup, onNextGroup, onExpand }) {
  const inGroup = stations.filter(s => s.group === group);
  // Show 6 slots: nav, 5 numbered buttons, nav
  return (
    <div className="collapsed-bar">
      <button className="quick-nav" onClick={onPrevGroup} title="prev bank">◀</button>
      <button className="group-label-btn" title="group">{group}</button>
      {Array.from({ length: 5 }).map((_, i) => {
        const st = inGroup[i];
        const active = st && st.id === currentId;
        return (
          <button
            key={i}
            className={`quick-num ${active ? "active" : ""}`}
            disabled={!st}
            onClick={() => st && onPickNum(st.id)}
            title={st ? `${st.name} — ${st.frequency}` : ""}
          >
            {i + 1}
          </button>
        );
      })}
      <button className="quick-nav" onClick={onNextGroup} title="next bank">▶</button>
      <button className="mode-toggle" onClick={onExpand} title="expand">◐</button>
    </div>
  );
}

// ── Library module ───────────────────────────────────────────────────────────
function LibraryModule({ stations, currentId, group, onPick, onGroupChange, onAddStation, width = 420 }) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const filtered = stations
    .filter(s => s.group === group)
    .filter(s => !search || (s.name + " " + (s.subtitle || "")).toLowerCase().includes(search.toLowerCase()));

  function doAdd() {
    if (!newName || !newUrl) return;
    onAddStation({ name: newName, url: newUrl });
    setNewName(""); setNewUrl(""); setAdding(false);
  }

  return (
    <div className="module" style={{ width }}>
      <div className="module-header">
        <div className="module-title">◆ LIBRARY</div>
        <div className="module-dots">
          <div className="module-dot min" /><div className="module-dot fold" /><div className="module-dot close" />
        </div>
      </div>
      <div className="module-body">
        <div className="group-bar">
          {window.SQLCH_GROUPS.map(g => (
            <button key={g} className={`group-tab ${g === group ? "active" : ""}`} onClick={() => onGroupChange(g)}>{g}</button>
          ))}
        </div>

        <div className="toolbar">
          <input className="search" placeholder="filter library…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="tb-btn" onClick={() => setAdding(a => !a)} title="add station">＋</button>
        </div>

        {adding && (
          <div className="inline-form">
            <label>add station</label>
            <div className="row"><input placeholder="name" value={newName} onChange={e => setNewName(e.target.value)} /></div>
            <div className="row"><input placeholder="stream url" value={newUrl} onChange={e => setNewUrl(e.target.value)} /></div>
            <div className="actions">
              <button className="cancel" onClick={() => setAdding(false)}>cancel</button>
              <button onClick={doAdd}>save</button>
            </div>
          </div>
        )}

        <div className="station-list">
          {filtered.length === 0
            ? <div className="placeholder-block">[ no stations in {group} ]</div>
            : filtered.map(st => (
              <div key={st.id} className={`station-row ${st.id === currentId ? "active" : ""}`} onClick={() => onPick(st.id)}>
                <div className="freq-badge">{st.frequency}</div>
                <div className="name">{st.name}<span className="sub">{st.subtitle}</span></div>
                <div className="group-badge">{st.group}</div>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Discover module ──────────────────────────────────────────────────────────
function DiscoverModule({ onAddToLibrary, width = 420 }) {
  const [query, setQuery] = useState("punk");
  const [results, setResults] = useState(window.SQLCH_DISCOVER["punk"] || []);
  const [added, setAdded] = useState(new Set());
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      const key = query.trim().toLowerCase();
      setResults(window.SQLCH_DISCOVER[key] || []);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  function addOne(r) {
    onAddToLibrary && onAddToLibrary({ name: r.name, url: `https://radiobrowser.example/${encodeURIComponent(r.name)}` });
    setAdded(prev => { const n = new Set(prev); n.add(r.name); return n; });
  }

  return (
    <div className="module" style={{ width }}>
      <div className="module-header">
        <div className="module-title">◆ DISCOVER · RADIOBROWSER</div>
        <div className="module-dots">
          <div className="module-dot min" /><div className="module-dot fold" /><div className="module-dot close" />
        </div>
      </div>
      <div className="module-body">
        <div className="toolbar">
          <input className="search" placeholder="genre / tag (punk · jazz · ambient)" value={query} onChange={e => setQuery(e.target.value)} />
          <button className="tb-btn" title="search">⌕</button>
        </div>

        <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--acc-lcd-dim)",padding:"4px 2px"}}>
          {searching ? "searching…" : results.length > 0 ? `results: ${results.length}` : "— no results (try punk, jazz, ambient) —"}
        </div>

        <div className="discover-results">
          {results.length === 0 && !searching
            ? <div className="placeholder-block">[ search term placeholder ]</div>
            : results.map((r, i) => (
              <div key={i} className="discover-result">
                <div className="info">
                  <div className="discover-name">{r.name}</div>
                  <div className="discover-meta">{r.country} · {r.codec} {r.bitrate}k</div>
                </div>
                <button className={`discover-add ${added.has(r.name) ? "added" : ""}`} onClick={() => addOne(r)}>
                  {added.has(r.name) ? "✓ added" : "+ add"}
                </button>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Metadata console ─────────────────────────────────────────────────────────
function MetaConsole({ np, width = 420 }) {
  const html = window.SqlchMeta.formatMetaConsole(np);
  return (
    <div className="module" style={{ width }}>
      <div className="module-header">
        <div className="module-title">◆ METADATA CONSOLE · MPRIS + ICY</div>
        <div className="module-dots">
          <div className="module-dot min" /><div className="module-dot fold" /><div className="module-dot close" />
        </div>
      </div>
      <div className="module-body">
        <div className="meta-console" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

// ── Tweaks panel (Tweaks toolbar integration) ────────────────────────────────
function TweaksPanel({ visible, tweaks, setTweaks }) {
  return (
    <div className={`tweaks-panel ${visible ? "visible" : ""}`}>
      <h4>Tweaks</h4>

      <div className="group">
        <div className="label">Accent</div>
        <div className="opts">
          {["cyan", "amber", "green"].map(a => (
            <button key={a} className={tweaks.accent === a ? "on" : ""} onClick={() => setTweaks({ ...tweaks, accent: a })}>{a}</button>
          ))}
        </div>
      </div>

      <div className="group">
        <div className="label">Playback</div>
        <div className="opts">
          {["playing", "paused", "idle"].map(s => (
            <button key={s} className={tweaks.state === s ? "on" : ""} onClick={() => setTweaks({ ...tweaks, state: s })}>{s}</button>
          ))}
        </div>
      </div>

      <div className="group">
        <div className="label">LOUD indicator</div>
        <div className="opts">
          <button className={tweaks.loud ? "on" : ""} onClick={() => setTweaks({ ...tweaks, loud: !tweaks.loud })}>{tweaks.loud ? "on" : "off"}</button>
        </div>
      </div>

      <div className="group">
        <div className="label">MUTE indicator</div>
        <div className="opts">
          <button className={tweaks.mute ? "on" : ""} onClick={() => setTweaks({ ...tweaks, mute: !tweaks.mute })}>{tweaks.mute ? "on" : "off"}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Chassis, NowPlayingDisplay, TransportBar,
  CollapsedBar, LibraryModule, DiscoverModule, MetaConsole, TweaksPanel,
  Orbit, SignalBars, Seam, MfrBadge,
});
