#!/usr/bin/env node
// Fetches live now-playing metadata for sqlch web player stations.
// Runs in GitHub Actions on a 5-minute cron schedule.
// Output is written to assets/now-playing.json by the workflow.

const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      timeout: 6000,
      headers: { 'User-Agent': 'portfolio-now-playing/1.0' },
    }, (res) => {
      // Follow one redirect manually (streamtheworld, iheart use them)
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`timeout: ${url}`)); });
  });
}

// iHeart-network stations — callsign maps to their live-meta API.
// Covers revma/streamtheworld stream stations in the library.
const IHEART = {
  wmmr: 'WMMRFM',
  wmgk: 'WMGKFM',
  wrff: 'WRFFFM',
  wzzo: 'WZZOFM',
  wusl: 'WUSLFM',
  wdas: 'WDASFM',
  wioq: 'WIOQFM',
  wben: 'WBENFM',
  wrnb: 'WRNBHD2',
};

async function fetchIheart(callsign) {
  const url = `https://api.iheart.com/api/v3/live-meta/stream/${callsign}/currentTrack`;
  const json = await get(url);
  const d = json?.data;
  if (!d) return null;
  const artist = (d.artist || '').trim();
  const track  = (d.title  || '').trim();
  if (!artist && !track) return null;
  return { artist, track, source: 'iheart' };
}

// WXPN (88.5) — University of Pennsylvania public radio.
// Their site exposes a public now-playing endpoint.
async function fetchXpn() {
  const json = await get('https://xpn.org/api/now-playing');
  // XPN wraps in { data: { artist, song } } or similar
  const d = json?.data || json;
  const artist = (d?.artist || d?.artistName || '').trim();
  const track  = (d?.song   || d?.title      || d?.track || '').trim();
  if (!artist && !track) return null;
  return { artist, track, source: 'xpn' };
}

async function main() {
  const stations = {};

  // Fetch iHeart stations in parallel, ignore individual failures
  await Promise.allSettled(
    Object.entries(IHEART).map(async ([id, callsign]) => {
      try {
        const data = await fetchIheart(callsign);
        if (data) stations[id] = data;
      } catch {
        // station API down or callsign mismatch — falls back to mock in player
      }
    })
  );

  // XPN — same feed used for both 88.5 and HD2
  try {
    const xpn = await fetchXpn();
    if (xpn) {
      stations.wxpn = xpn;
      stations.xpon = { ...xpn, source: 'xpn-hd2' };
    }
  } catch {
    // XPN API unreachable — falls back to mock
  }

  process.stdout.write(
    JSON.stringify({ updated: new Date().toISOString(), stations }, null, 2) + '\n'
  );
}

main().catch((e) => {
  process.stderr.write(String(e) + '\n');
  process.exit(1);
});
