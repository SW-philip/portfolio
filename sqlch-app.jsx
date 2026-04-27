
const { useState, useMemo, useEffect } = React;

// Tweak defaults (tweakable via toolbar toggle)
const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "accent": "amber",
  "state": "playing",
  "loud": true,
  "mute": false
}/*EDITMODE-END*/;

// ── Synthetic enriched cache keyed by artist::track ──────────────────────────
const ENRICHED_CACHE = {};
Object.entries(window.SQLCH_NOW_PLAYING).forEach(([sid, np]) => {
  ENRICHED_CACHE[`${np.artist.toLowerCase()}::${np.track.toLowerCase()}`] = {
    album: np.album, year: np.year, genres: np.genre ? [np.genre] : [], cover: np.cover,
  };
});

/** Build a NowPlaying record for the demo by feeding our fake
 *  MPRIS/MPV payloads through the real parser. */
function buildNowPlaying(stationId, state) {
  const station = window.SQLCH_STATIONS.find(s => s.id === stationId);
  if (!station || state === "idle") {
    return window.SqlchMeta.parseNowPlaying({ mpris: null, mpv: null, enriched: ENRICHED_CACHE, station: null });
  }
  const seed = window.SQLCH_NOW_PLAYING[stationId] || null;
  if (!seed) {
    return window.SqlchMeta.parseNowPlaying({
      mpris: null,
      mpv: { metadata: {}, bitrate: null, channels: null },
      enriched: ENRICHED_CACHE,
      station,
    });
  }
  const mpv = {
    metadata: {
      "icy-title": `${seed.artist} - ${seed.track}`,
      "icy-genre": seed.genre,
      "icy-br": seed.bitrate,
    },
    bitrate: seed.bitrate,
    channels: seed.channels,
  };
  const mpris = { artist: seed.artist, title: seed.track };
  return window.SqlchMeta.parseNowPlaying({ mpris, mpv, enriched: ENRICHED_CACHE, station });
}

// ── One self-contained chassis configuration ────────────────────────────────
function Unit({ style, tweaks, setTweaks }) {
  const [currentId, setCurrentId] = useState("wxpn-885-philadelphia-pa");
  const [group, setGroup] = useState("FM1");
  const [collapsed, setCollapsed] = useState(false);
  const [localStations, setLocalStations] = useState(window.SQLCH_STATIONS);

  const np = useMemo(() => buildNowPlaying(currentId, tweaks.state), [currentId, tweaks.state]);
  const playing = tweaks.state === "playing";
  const paused  = tweaks.state === "paused";

  function pick(id) {
    setCurrentId(id);
    const st = localStations.find(s => s.id === id);
    if (st) setGroup(st.group);
  }
  function nextGroup(dir = 1) {
    const i = window.SQLCH_GROUPS.indexOf(group);
    const n = (i + dir + window.SQLCH_GROUPS.length) % window.SQLCH_GROUPS.length;
    setGroup(window.SQLCH_GROUPS[n]);
  }
  function addStation({ name, url }) {
    const id = name.toLowerCase().replace(/[^\w]+/g, "-");
    if (localStations.find(s => s.id === id)) return;
    const next = [...localStations, { id, name, url, subtitle: "added", frequency: "—", group }];
    setLocalStations(next);
  }
  function playPause() { setTweaks({ ...tweaks, state: playing ? "paused" : "playing" }); }
  function stop()      { setTweaks({ ...tweaks, state: "idle" }); }
  function prevSt() {
    const inG = localStations.filter(s => s.group === group);
    const i = inG.findIndex(s => s.id === currentId);
    const next = inG[(i - 1 + inG.length) % Math.max(inG.length, 1)];
    if (next) pick(next.id);
  }
  function nextSt() {
    const inG = localStations.filter(s => s.group === group);
    const i = inG.findIndex(s => s.id === currentId);
    const next = inG[(i + 1) % Math.max(inG.length, 1)];
    if (next) pick(next.id);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
      <Chassis style={style} accent={tweaks.accent}>
        <NowPlayingDisplay np={np} playing={playing} paused={paused} mute={tweaks.mute} loud={tweaks.loud} />
        <TransportBar
          playing={playing} paused={paused}
          onPlayPause={playPause} onStop={stop}
          onPrev={prevSt} onNext={nextSt}
          onCollapse={() => setCollapsed(c => !c)}
        />
        {collapsed && (
          <CollapsedBar
            stations={localStations}
            currentId={currentId}
            group={group}
            onPickNum={pick}
            onPrevGroup={() => nextGroup(-1)}
            onNextGroup={() => nextGroup(1)}
            onExpand={() => setCollapsed(false)}
          />
        )}
      </Chassis>

      <LibraryModule
        stations={localStations}
        currentId={currentId}
        group={group}
        onPick={pick}
        onGroupChange={setGroup}
        onAddStation={addStation}
      />

      <DiscoverModule onAddToLibrary={addStation} />

      <MetaConsole np={np} />
    </div>
  );
}

function App() {
  const [tweaks, setTweaks] = useState(() => {
    try {
      const saved = localStorage.getItem("sqlch-tweaks");
      if (saved) return { ...TWEAK_DEFAULS, ...JSON.parse(saved) };
    } catch {}
    return TWEAK_DEFAULS;
  });
  const [tweaksVisible, setTweaksVisible] = useState(false);

  // Persist
  useEffect(() => {
    try { localStorage.setItem("sqlch-tweaks", JSON.stringify(tweaks)); } catch {}
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: tweaks }, "*");
  }, [tweaks]);

  // Host Tweaks protocol
  useEffect(() => {
    function onMsg(e) {
      if (!e.data || !e.data.type) return;
      if (e.data.type === "__activate_edit_mode") setTweaksVisible(true);
      else if (e.data.type === "__deactivate_edit_mode") setTweaksVisible(false);
    }
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <>
      <DesignCanvas style={{ background: "#0a0b0e" }}>
        <DCSection id="variations" title="sqlch · three chassis variations"
          subtitle="Faux hi-fi receiver ported from the GTK4 popup + Textual TUI. Each artboard is a live interactive unit. Pop-outs mimic separate Niri layer-shell windows.">
          <DCArtboard id="dark"    label="Dark chassis (canonical)"     width={460} height={1420} bg="#0a0b0e">
            <div data-screen-label="01 Dark chassis" style={{padding:20}}>
              <Unit style="dark" tweaks={tweaks} setTweaks={setTweaks} />
            </div>
          </DCArtboard>
          <DCArtboard id="brushed" label="Brushed-metal (Alpine head unit)" width={460} height={1420} bg="#d8dbe0">
            <div data-screen-label="02 Brushed metal" style={{padding:20}}>
              <Unit style="brushed" tweaks={tweaks} setTweaks={setTweaks} />
            </div>
          </DCArtboard>
          <DCArtboard id="flat"    label="Minimal flat (electron default)" width={460} height={1420} bg="#050608">
            <div data-screen-label="03 Minimal flat" style={{padding:20}}>
              <Unit style="flat" tweaks={tweaks} setTweaks={setTweaks} />
            </div>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel visible={tweaksVisible} tweaks={tweaks} setTweaks={setTweaks} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("design-canvas-root")).render(<App />);
