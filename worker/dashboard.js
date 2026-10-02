// SPDX-License-Identifier: GPL-3.0-only
//
// Die private Übersicht auf statistik-versespotter.xharig.com. Eine Seite,
// keine fremden Skripte, keine Schriften von außen. Die Content-Security-Policy
// des Workers lässt nur Skript und Stil mit dem Einmal-Wert (`nonce`) zu —
// deshalb werden Breiten über Klassen gesetzt, nicht über style="…".

const SITE = 'https://versespotter.xharig.com';

export function dashboardHtml(nonce) {
  const widths = Array.from({ length: 101 }, (_, i) => `.w${i}{width:${i}%}`).join('');
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>VerseSpotter Statistik</title>
<link rel="icon" href="${SITE}/assets/logo.svg">
<style nonce="${nonce}">
:root { --bg:#0d0d0d; --card:#141414; --line:#242424; --fg:#e8e8e8; --sub:#a3a3a3; --accent:#9ce430; --bad:#ff6b5e; }
* { box-sizing:border-box; }
[hidden] { display:none !important; }
body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.45 Calibri, "Segoe UI", system-ui, sans-serif; }
header { padding:18px 16px 6px; max-width:1200px; margin:0 auto; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
h1 { font-size:21px; margin:0; display:flex; align-items:center; gap:10px; } h1 b { color:var(--accent); }
h1 img { width:30px; height:30px; }
header .sub { color:var(--sub); }
header select, header button { background:var(--card); color:var(--fg); border:1px solid var(--line); border-radius:8px; padding:6px 12px; font:inherit; cursor:pointer; }
header select { margin-left:auto; }
header button:hover { border-color:var(--accent); color:var(--accent); }
header button.voll { background:var(--accent); color:#0a0a0a; border-color:var(--accent); font-weight:700; }
.ok { color:var(--accent); font-weight:700; }
main { max-width:1200px; margin:0 auto; padding:8px 16px 32px; display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:14px; }
@media (max-width:900px) { main { grid-template-columns:1fr; } }
.card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px 16px; min-width:0; }
.wide { grid-column:1 / -1; }
.card h2 { font-size:13px; font-weight:700; color:var(--sub); margin:0 0 10px; text-transform:uppercase; letter-spacing:.05em; }
.kpis { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:10px; }
.kpi .v { font-size:30px; font-weight:800; color:var(--accent); }
.kpi .l { color:var(--sub); font-size:13px; }
.bar { display:grid; grid-template-columns:minmax(90px,40%) 1fr auto; gap:8px; align-items:center; margin:5px 0; font-size:14px; }
.bar .track { background:var(--line); border-radius:4px; height:10px; overflow:hidden; }
.bar .fill { background:var(--accent); height:100%; }
.bar .fill.bad { background:var(--bad); }
.bar .n { color:var(--sub); font-variant-numeric:tabular-nums; min-width:52px; text-align:right; }
.empty { color:var(--sub); padding:10px 0; }
.tab { width:100%; border-collapse:collapse; font-size:14px; }
.tab th { text-align:left; color:var(--sub); font-weight:700; padding:6px 8px; border-bottom:1px solid var(--line); }
.tab td { padding:6px 8px; border-bottom:1px solid var(--line); vertical-align:middle; }
.tab .num { text-align:right; font-variant-numeric:tabular-nums; }
.tab img { width:96px; height:96px; object-fit:contain; background:#06080b; border-radius:6px; display:block; }
.note { color:var(--sub); font-size:13px; margin-top:8px; }
.vorschau-rahmen { max-width:1200px; margin:0 auto; padding:0 16px; }
#vorschau { width:100%; background:#0a0a0a; color:var(--fg); border:1px solid var(--line); border-radius:10px; padding:12px; font:14px/1.45 Consolas, monospace; margin:8px 0; }
${widths}
</style>
</head>
<body>
<header>
  <h1><img src="${SITE}/assets/logo.svg" alt=""><span><b>VerseSpotter</b> Statistik</span></h1>
  <span class="sub" id="stand">lädt …</span>
  <select id="zeitraum" aria-label="Zeitraum">
    <option value="7">7 Tage</option>
    <option value="30">30 Tage</option>
    <option value="400">gesamt</option>
  </select>
  <button id="discord" type="button" class="voll">Für Discord kopieren</button>
  <span id="kopiert" class="ok" role="status"></span>
</header>
<div class="vorschau-rahmen"><textarea id="vorschau" rows="16" readonly hidden aria-label="Text für Discord"></textarea></div>
<main id="inhalt"></main>
<script nonce="${nonce}">
(() => {
'use strict';
const SITE = '${SITE}';
const MODES = { beginner: 'Einsteiger', outline: 'Umriss', distance: 'Distanz', silhouette: 'Silhouette', mixed: 'Gemischt', hud: 'HUD' };
const RANKS = [['ace', '🎖️', 'Ass'], ['spotter', '✅', 'Spotter'], ['cadet', '🔸', 'Kadett'], ['recruit', '🔻', 'Rekrut']];
const REASONS = { wrong_ship: 'anderes Schiff', name_visible: 'Name sichtbar', bad_quality: 'schlechte Qualität', other: 'anderes' };
const SOURCES = { direkt: 'direkt', intern: 'intern', discord: 'Discord', versekit: 'VerseKit', xharig: 'xharig.com', reddit: 'Reddit', rsi: 'RSI', google: 'Google', bing: 'Bing', duckduckgo: 'DuckDuckGo', youtube: 'YouTube', github: 'GitHub', andere: 'andere' };
const COUNTRY = new Intl.DisplayNames(['de'], { type: 'region' });
let current = null;

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const sum = (rows) => rows.reduce((a, r) => a + r.n, 0);
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const countryName = (c) => { try { return c === 'XX' ? 'unbekannt' : COUNTRY.of(c); } catch (e) { return c; } };

function group(rows, merkmal) {
  const m = new Map();
  for (const r of rows) if (r.merkmal === merkmal) m.set(r.wert, (m.get(r.wert) || 0) + r.n);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function card(title, wide) {
  const c = el('section', 'card' + (wide ? ' wide' : ''));
  c.appendChild(el('h2', '', title));
  document.getElementById('inhalt').appendChild(c);
  return c;
}

function bars(c, entries, label, bad) {
  if (!entries.length) { c.appendChild(el('div', 'empty', 'noch keine Daten')); return; }
  const max = Math.max(...entries.map((e) => e[1]));
  const total = entries.reduce((a, e) => a + e[1], 0);
  for (const [k, v] of entries.slice(0, 12)) {
    const row = el('div', 'bar');
    row.appendChild(el('span', '', label ? label(k) : k));
    const track = el('div', 'track');
    track.appendChild(el('div', 'fill w' + pct(v, max) + (bad ? ' bad' : '')));
    row.appendChild(track);
    row.appendChild(el('span', 'n', v + ' · ' + pct(v, total) + ' %'));
    c.appendChild(row);
  }
}

function summary(d) {
  const z = d.zaehler;
  const visits = sum(z.filter((r) => r.merkmal === 'aufruf' && r.wert === 'home'));
  const all = sum(z.filter((r) => r.merkmal === 'aufruf'));
  const fresh = sum(z.filter((r) => r.merkmal === 'wiederkehrend' && r.wert === 'nein'));
  const starts = sum(z.filter((r) => r.merkmal === 'start'));
  const ends = sum(z.filter((r) => r.merkmal === 'ende'));
  const right = d.ergebnisse.reduce((a, r) => a + r.richtig, 0);
  const asked = d.ergebnisse.reduce((a, r) => a + r.fragen, 0);
  const copies = sum(z.filter((r) => r.merkmal === 'kopiert'));
  const combat = sum(z.filter((r) => r.merkmal === 'gefecht' && r.wert === 'an'));
  const conf = new Map();
  for (const r of d.verwechslung) {
    if (!r.gewaehlt) continue;
    const key = [r.gezeigt, r.gewaehlt].sort().join(' ↔ ');
    conf.set(key, (conf.get(key) || 0) + r.n);
  }
  return { visits, all, fresh, starts, ends, right, asked, copies, combat,
    confusions: [...conf.entries()].sort((a, b) => b[1] - a[1]) };
}

function render(d) {
  current = d;
  const s = summary(d);
  const box = document.getElementById('inhalt');
  box.innerHTML = '';
  document.getElementById('stand').textContent = 'seit ' + d.seit;

  const k = card('Überblick', true);
  const kp = el('div', 'kpis');
  const kpi = (v, l) => { const x = el('div', 'kpi'); x.appendChild(el('div', 'v', String(v))); x.appendChild(el('div', 'l', l)); kp.appendChild(x); };
  kpi(s.all, 'Seitenaufrufe');
  kpi(s.fresh, 'davon zum ersten Mal');
  kpi(s.starts, 'Läufe gestartet');
  kpi(s.ends, 'Läufe beendet');
  kpi(pct(s.starts - s.ends, s.starts) + ' %', 'Abbrüche');
  kpi(pct(s.right, s.asked) + ' %', 'Ø richtig');
  kpi(s.copies, 'Ergebnisse kopiert');
  kpi(pct(s.combat, s.starts) + ' %', 'Gefechtsmodus');
  k.appendChild(kp);

  bars(card('Länder'), group(d.zaehler, 'land'), countryName);
  bars(card('Gekommen über'), group(d.zaehler, 'herkunft'), (x) => SOURCES[x] || x);
  bars(card('Seiten'), group(d.zaehler, 'aufruf'), (x) => ({ home: 'Training', catalog: 'Katalog', thanks: 'Danke' })[x] || x);
  bars(card('Modi (gestartet)'), group(d.zaehler, 'start'), (x) => MODES[x] || x);
  bars(card('Lauflänge'), group(d.zaehler, 'laenge'), (x) => x + ' Fragen');
  bars(card('Ränge'), group(d.zaehler, 'rang'), (x) => (RANKS.find((r) => r[0] === x) || [x, '', x])[2]);
  bars(card('Sprache'), group(d.zaehler, 'sprache'), (x) => x.toUpperCase());
  bars(card('Gerät'), group(d.zaehler, 'geraet'), (x) => x === 'handy' ? 'Handy' : 'PC');
  bars(card('Ergebnis kopiert je Modus'), group(d.zaehler, 'kopiert'), (x) => MODES[x] || x);

  bars(card('Am häufigsten verwechselt', true), s.confusions, null, true);

  const imgs = new Map();
  for (const r of d.bilder) {
    const x = imgs.get(r.bild) || { gezeigt: 0, falsch: 0 };
    x.gezeigt += r.gezeigt; x.falsch += r.falsch; imgs.set(r.bild, x);
  }
  const problems = [...imgs.entries()].filter(([, x]) => x.gezeigt >= 5 && x.falsch / x.gezeigt >= 0.6)
    .sort((a, b) => b[1].falsch / b[1].gezeigt - a[1].falsch / a[1].gezeigt);
  const pc = card('Auffällige Bilder — mindestens 5× gezeigt, 60 % oder mehr falsch', true);
  table(pc, problems.map(([id, x]) => [id, x.gezeigt, x.falsch, pct(x.falsch, x.gezeigt) + ' %']),
    ['Bild', 'Kennung', 'gezeigt', 'falsch', 'Quote']);
  pc.appendChild(el('div', 'note', 'Diese Liste geht nie in den Discord-Text. Erst prüfen: falsch benannt, Name sichtbar oder schlicht schwer?'));

  const reports = new Map();
  for (const r of d.meldungen) {
    const x = reports.get(r.bild) || {};
    x[r.grund] = (x[r.grund] || 0) + r.n; reports.set(r.bild, x);
  }
  const rc = card('Gemeldete Bilder', true);
  table(rc, [...reports.entries()].map(([id, x]) => [id,
    Object.entries(x).map(([g, n]) => (REASONS[g] || g) + ' ' + n).join(' · '),
    Object.values(x).reduce((a, n) => a + n, 0)]), ['Bild', 'Kennung', 'Gründe', 'Meldungen']);
}

function imageSrc(id) {
  if (id.startsWith('catalog:')) return SITE + '/img/catalog/' + id.slice(8) + '.webp';
  const kind = id.split('-')[0];
  return SITE + '/img/' + kind + '/' + id + '.webp';
}

function table(c, rows, head) {
  if (!rows.length) { c.appendChild(el('div', 'empty', 'nichts')); return; }
  const t = el('table', 'tab');
  const tr = el('tr');
  head.forEach((h) => tr.appendChild(el('th', '', h)));
  t.appendChild(tr);
  for (const row of rows) {
    const r = el('tr');
    const tdImg = el('td');
    const img = el('img');
    img.src = imageSrc(row[0]); img.alt = row[0]; img.loading = 'lazy';
    tdImg.appendChild(img);
    r.appendChild(tdImg);
    row.forEach((v, i) => r.appendChild(el('td', i === 0 || typeof v === 'string' && !/%$/.test(v) ? '' : 'num', String(v))));
    t.appendChild(r);
  }
  c.appendChild(t);
}

function discordText(d) {
  const s = summary(d);
  const days = Number(document.getElementById('zeitraum').value);
  const period = days >= 400 ? 'gesamt' : 'der letzten ' + days + ' Tage';
  const top = (merkmal, label) => {
    const g = group(d.zaehler, merkmal); const total = g.reduce((a, e) => a + e[1], 0);
    return g.slice(0, 3).map(([k, v]) => label(k) + ' ' + pct(v, total) + ' %').join(' · ');
  };
  const ranks = group(d.zaehler, 'rang');
  const rankLine = RANKS.map(([key, emoji, name]) => emoji + ' ' + name + ' ' + ((ranks.find((r) => r[0] === key) || [0, 0])[1])).join(' · ');
  const lines = [
    '🛰️ **VerseSpotter – Statistik ' + period + '**',
    '',
    '👥 **' + s.all + ' Seitenaufrufe** · ' + s.fresh + ' davon zum ersten Mal',
    '🎯 **' + s.ends + ' Läufe** beendet · Ø ' + pct(s.right, s.asked) + ' % richtig',
  ];
  const lands = top('land', countryName); if (lands) lines.push('🌍 ' + lands);
  const src = top('herkunft', (x) => SOURCES[x] || x); if (src) lines.push('🔗 Gekommen über ' + src);
  lines.push('', '🏆 Ränge: ' + rankLine);
  lines.push('⚡ Gefechtsmodus: ' + pct(s.combat, s.starts) + ' % aller Läufe');
  if (s.confusions.length) {
    lines.push('', '😵 **Am häufigsten verwechselt**');
    s.confusions.slice(0, 3).forEach(([k, n], i) => lines.push((i + 1) + '. ' + k + ' (' + n + '×)'));
  }
  lines.push('', 'versespotter.xharig.com');
  let text = lines.join('\\n');
  if (text.length > 1990) text = text.slice(0, 1990);
  return text;
}

async function load() {
  const days = document.getElementById('zeitraum').value;
  const r = await fetch('/daten?tage=' + days, { cache: 'no-store' });
  if (!r.ok) { document.getElementById('stand').textContent = 'Fehler ' + r.status; return; }
  render(await r.json());
}

document.getElementById('zeitraum').addEventListener('change', load);
document.getElementById('discord').addEventListener('click', async () => {
  if (!current) return;
  const text = discordText(current);
  const preview = document.getElementById('vorschau');
  preview.value = text;
  preview.hidden = false;
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
    preview.focus(); preview.select();
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
  }
  document.getElementById('kopiert').textContent = ok ? 'Kopiert' : 'Bitte aus dem Feld unten kopieren';
  setTimeout(() => { document.getElementById('kopiert').textContent = ''; }, 4000);
});
load();
})();
</script>
</body>
</html>`;
}
