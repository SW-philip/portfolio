// Seed data — real Philly stations + international picks
window.SQLCH_STATIONS = [
  // FM1 — Philly public / college
  { id: "wxpn-885-philadelphia-pa", name: "WXPN", subtitle: "88.5 Philadelphia", frequency: "88.5 FM", group: "FM1", url: "https://wxpn.xpn.org/xpnmain" },
  { id: "wxpn-hd2-xponential",     name: "XPONential", subtitle: "88.1 HD2",      frequency: "88.1 FM", group: "FM1", url: "https://wxpn.xpn.org/xponential" },
  { id: "whyy",                    name: "WHYY",       subtitle: "90.9 Philadelphia", frequency: "90.9 FM", group: "FM1", url: "https://streams.whyy.org/whyy" },
  { id: "wrti",                    name: "WRTI",       subtitle: "Temple · Jazz+Classical", frequency: "90.1 FM", group: "FM1", url: "https://wrti-prod.streamguys1.com/wrti-mp3" },
  // FM2 — Philly commercial / pool
  { id: "ynot-radio-philly",       name: "YNOT Radio", subtitle: "100.3 Independent",   frequency: "100.3 FM", group: "FM2", url: "https://ynot.example/stream" },
  { id: "wmmr",                    name: "WMMR",       subtitle: "93.3 Rock",     frequency: "93.3 FM", group: "FM2", url: "https://wmmr.example" },
  { id: "wxtu",                    name: "WXTU",       subtitle: "92.5 Country",  frequency: "92.5 FM", group: "FM2", url: "https://wxtu.example" },
  { id: "wmgk",                    name: "WMGK",       subtitle: "102.9 Classic Rock", frequency: "102.9 FM", group: "FM2", url: "https://wmgk.example" },
  // AM1 — Philly AM
  { id: "kyw",                     name: "KYW",        subtitle: "1060 News",     frequency: "1060 AM", group: "AM1", url: "https://kyw.example" },
  { id: "wpht",                    name: "WPHT",       subtitle: "1210 Talk",     frequency: "1210 AM", group: "AM1", url: "https://wpht.example" },
  { id: "wurd",                    name: "WURD",       subtitle: "900 Talk",      frequency: "900 AM",  group: "AM1", url: "https://wurd.example" },
  // INT1 — International web stations
  { id: "radio-paradise-main",     name: "Radio Paradise", subtitle: "Main Mix",    frequency: "INT·01", group: "INT1", url: "https://stream.radioparadise.com/mp3-192" },
  { id: "kexp-905",                name: "KEXP",       subtitle: "Seattle · 90.3",frequency: "INT·02", group: "INT1", url: "https://kexp.streamguys1.com/kexp160.aac" },
  { id: "nts-1",                   name: "NTS 1",      subtitle: "London",        frequency: "INT·03", group: "INT1", url: "https://stream-relay-geo.ntslive.net/stream" },
  { id: "rinse-fm",                name: "Rinse FM",   subtitle: "London · 106.8",frequency: "INT·04", group: "INT1", url: "https://stream.rinse.fm/rinse_fm.aac" },
  { id: "dublab",                  name: "dublab",     subtitle: "Los Angeles",   frequency: "INT·05", group: "INT1", url: "https://dublab.example" },
];

window.SQLCH_GROUPS = ["FM1", "FM2", "AM1", "INT1"];

// Fake ICY / MPRIS metadata feed
window.SQLCH_NOW_PLAYING = {
  "wxpn-885-philadelphia-pa": {
    artist: "Big Thief",
    track:  "Change",
    album:  "Dragon New Warm Mountain I Believe in You",
    year:   "2022",
    genre:  "Indie Folk",
    cover:  null,
    bitrate: 128,
    channels: 2,
  },
  "wxpn-hd2-xponential": {
    artist: "Yo La Tengo",
    track:  "Sinatra Drive Breakdown",
    album:  "This Stupid World",
    year:   "2023",
    genre:  "Indie Rock",
    cover:  null,
    bitrate: 96,
    channels: 2,
  },
  "radio-paradise-main": {
    artist: "Phoebe Bridgers",
    track:  "Kyoto (Copycat Killer Version)",
    album:  "Copycat Killer",
    year:   "2020",
    genre:  "Chamber Pop",
    cover:  null,
    bitrate: 192,
    channels: 2,
  },
  "kexp-905": {
    artist: "Wednesday",
    track:  "Chosen to Deserve",
    album:  "Rat Saw God",
    year:   "2023",
    genre:  "Country Shoegaze",
    cover:  null,
    bitrate: 160,
    channels: 2,
  },
  "nts-1": {
    artist: "Floating Points",
    track:  "Key103",
    album:  "Cascade",
    year:   "2024",
    genre:  "Electronic",
    cover:  null,
    bitrate: 128,
    channels: 2,
  },
};

// Fake Discover / RadioBrowser search results
window.SQLCH_DISCOVER = {
  "punk": [
    { name: "Rock Antenne - Punk Rock",       country: "Germany",                codec: "MP3",  bitrate: 128 },
    { name: "punk irratia",                    country: "Spain",                  codec: "MP3",  bitrate: 192 },
    { name: "REAL PUNK RADIO",                 country: "United States of America", codec: "MP3", bitrate: 128 },
    { name: "Radio Caprice — Punk Post-Hardcore Emo", country: "Russian Federation", codec: "AAC+", bitrate: 320 },
    { name: "punkrockers-radio",               country: "Germany",                codec: "MP3",  bitrate: 192 },
    { name: "Radio Caprice — Ska-Punk/Core",   country: "Russian Federation",     codec: "AAC+", bitrate: 320 },
    { name: "Radio Caprice — Post-Punk",       country: "Russian Federation",     codec: "AAC+", bitrate: 320 },
    { name: "Punk4all",                        country: "Germany",                codec: "MP3",  bitrate: 128 },
    { name: "Russian Punk rock",               country: "Russian Federation",     codec: "AAC+", bitrate: 320 },
    { name: "PunkRockRadio.ca",                country: "Canada",                 codec: "MP3",  bitrate: 192 },
    { name: "__12PUNKS.FM__ by rautemusik",    country: "Germany",                codec: "MP3",  bitrate: 192 },
    { name: "Exclusively Daft Punk",           country: "United Arab Emirates",   codec: "MP3",  bitrate: 192 },
  ],
  "jazz": [
    { name: "WRTI Jazz",                       country: "United States of America", codec: "MP3", bitrate: 128 },
    { name: "SomaFM — Sonic Universe",         country: "United States of America", codec: "AAC", bitrate: 128 },
    { name: "Radio Swiss Jazz",                country: "Switzerland",            codec: "MP3",  bitrate: 128 },
    { name: "TSF Jazz",                        country: "France",                 codec: "MP3",  bitrate: 128 },
    { name: "Jazz24",                          country: "United States of America", codec: "AAC", bitrate: 64 },
    { name: "Jazz FM 91",                      country: "Canada",                 codec: "MP3",  bitrate: 128 },
  ],
  "ambient": [
    { name: "SomaFM — Drone Zone",             country: "United States of America", codec: "AAC", bitrate: 128 },
    { name: "SomaFM — Deep Space One",         country: "United States of America", codec: "AAC", bitrate: 128 },
    { name: "Radio Caprice — Ambient",         country: "Russian Federation",     codec: "AAC+", bitrate: 320 },
    { name: "Hearts of Space",                 country: "United States of America", codec: "MP3", bitrate: 128 },
  ],
};
