// SPDX-License-Identifier: GPL-3.0-only
//
// Die private Übersicht auf statistik-versespotter.xharig.com. Eine Seite,
// keine fremden Skripte, keine fremden Schriften. Aussehen, Farben und Schrift
// kommen aus `assets/basis.css` der eigenen Seite (dem gemeinsamen Aussehen
// aller Xharig-Seiten); das hier ist nur, was diese Übersicht zusätzlich
// braucht. Die Content-Security-Policy des Workers lässt Skript und Stil mit
// dem Einmal-Wert (`nonce`) zu und Stilblatt, Schrift und Bilder von der
// eigenen Seite — deshalb werden Breiten über Klassen gesetzt, nicht über
// style="…".

const SITE = 'https://versespotter.xharig.com';
// Zählt hoch, wenn die Seite ihre basis.css ändert (wie `?v=` dort).
const BASIS = SITE + '/assets/basis.css?v=2';

export function dashboardHtml(nonce) {
  const widths = Array.from({ length: 101 }, (_, i) => `.w${i}{width:${i}%}`).join('');
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#10141c">
<meta name="color-scheme" content="dark">
<title>VerseSpotter Statistik</title>
<link rel="icon" href="${SITE}/assets/logo.svg">
<link rel="stylesheet" href="${BASIS}">
<style nonce="${nonce}">
/* Nur, was diese Übersicht über basis.css hinaus braucht. Farben und Maße
   kommen aus den Variablen dort (--grund, --linie, --neon …). */
:root {
  --balken: var(--neon);
  --balken-schlecht: #ff6b5e;
  --rand: var(--linie);
}
[hidden] { display:none !important; }
body { min-height:100vh; display:flex; flex-direction:column; }
main { flex:1; padding-bottom:72px; }
.sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }

/* Kopfleiste: wie auf den Webseiten, rechts nur der Weg zurück. */
.marke { min-width:0; }
@media (max-width:420px) { .marke span { display:inline; font-size:17px; } }

/* Titel der Seite */
.seitenkopf { padding-top:48px; }
.seitenkopf h1 { font-size:clamp(32px,4.5vw,46px); }

/* Bedienleiste: Zeitraum und Discord-Text */
.leiste { display:flex; flex-wrap:wrap; align-items:center; gap:14px 20px; margin:28px 0 8px; }
.leiste .feld { display:flex; align-items:center; gap:12px; color:var(--leise); font-size:15px; }
.leiste select {
  min-height:48px; padding:10px 14px; border-radius:var(--rund);
  background:var(--feld); color:var(--text); border:2px solid var(--linie-hell);
  font:inherit; font-weight:700; font-size:16px; cursor:pointer;
}
.leiste select:hover { border-color:var(--neon); background:var(--neon-dunkel); }
.leiste .knopf { min-height:48px; }
.leiste .knopf .ic { width:1.1em; height:1.1em; }
.stand { color:var(--leise); font-size:15px; }
.ok { color:var(--neon); font-weight:700; font-size:15px; }
.vorschau-rahmen { margin:14px 0 0; max-width:760px; }
#vorschau {
  display:block; width:100%; background:none; color:var(--text); border:0; padding:16px 18px;
  font:15px/1.5 ui-monospace, "SF Mono", Menlo, Consolas, monospace; resize:vertical;
}
#vorschau:focus-visible { outline-offset:-3px; }

/* Raster der Karten. Die Karte ist .winkel aus basis.css (Linie, Eckwinkel). */
.raster { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:22px; margin-top:20px; }
@media (max-width:1000px) { .raster { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:640px) { .raster { grid-template-columns:minmax(0,1fr); gap:18px; } }
.karte { padding:22px 24px 24px; min-width:0; }
@media (max-width:640px) { .karte { padding:20px 18px 22px; } }
.karte.breit { grid-column:1 / -1; }
.karte h2 { font-size:21px; line-height:1.3; letter-spacing:0; margin:0 0 16px; max-width:none; }
.karte .einleitung-klein { color:var(--leise); font-size:15px; margin:-8px 0 16px; max-width:46em; }

/* Kennzahlen: ein Streifen, durch feine Linien getrennt, keine einzelnen Kästen */
.kpis { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:26px 0; }
.kpi { padding:2px 18px 2px 20px; border-left:1px solid var(--linie); }
.kpi:nth-child(4n+1) { border-left:0; padding-left:0; }
.kpi .v { font-size:34px; line-height:1.15; font-weight:700; letter-spacing:-.01em; font-variant-numeric:tabular-nums; }
.kpi .l { color:var(--leise); font-size:15px; margin-top:2px; }
@media (max-width:640px) {
  .kpis { grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px 0; }
  .kpi:nth-child(odd) { border-left:0; padding-left:0; }
  .kpi:nth-child(even) { padding-right:0; }
  .kpi .v { font-size:30px; }
}

/* Balken: Zahl und Anteil stehen daneben, die Farbe trägt keine Information
   allein. Die Verwechslungen sind zusätzlich schraffiert, damit sie auch ohne
   Farbsehen von den übrigen Balken zu unterscheiden sind. */
.bar { display:grid; grid-template-columns:minmax(100px,42%) minmax(0,1fr) auto; gap:4px 12px; align-items:center; margin:9px 0; font-size:16px; }
.bar > span:first-child { min-width:0; overflow-wrap:anywhere; }
.bar .track { background:var(--linie); border-radius:4px; height:10px; overflow:hidden; }
.bar .fill { background:var(--balken); height:100%; border-radius:4px; }
.bar .fill.bad {
  background:repeating-linear-gradient(135deg, var(--balken-schlecht) 0 6px, #7d3a35 6px 10px);
}
.bar .n { color:var(--leise); font-size:15px; font-variant-numeric:tabular-nums; min-width:56px; text-align:right; white-space:nowrap; }
@media (min-width:641px) { .breit .bar { grid-template-columns:minmax(160px,26%) minmax(0,1fr) auto; } }
@media (max-width:640px) {
  .bar { grid-template-columns:minmax(0,1fr) auto; }
  .bar .track { grid-column:1 / -1; grid-row:2; }
  .bar > span:first-child { grid-row:1; }
  .bar .n { grid-row:1; }
}
.empty { color:var(--leise); padding:6px 0; }
.note { color:var(--leise); font-size:15px; margin:14px 0 0; border-left:2px solid var(--linie-hell); padding-left:14px; max-width:46em; }

/* Tabellen: am Handy wird jede Zeile ein kleiner Block, damit nichts seitlich läuft */
.tabelle { overflow-x:auto; }
.tab { width:100%; border-collapse:collapse; font-size:16px; }
.tab th { text-align:left; color:var(--leise); font-weight:700; font-size:15px; padding:8px 12px; border-bottom:1px solid var(--linie-hell); }
.tab td { padding:10px 12px; border-bottom:1px solid var(--linie); vertical-align:middle; overflow-wrap:anywhere; }
.tab tr:last-child td { border-bottom:0; }
.tab .num { text-align:right; font-variant-numeric:tabular-nums; }
.tab th.num { text-align:right; }
.tab img { width:96px; height:96px; object-fit:contain; background:var(--grund); border:1px solid var(--linie); border-radius:6px; display:block; }
@media (max-width:640px) {
  .tab thead { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); }
  .tab, .tab tbody { display:block; }
  .tab tr { display:grid; grid-template-columns:84px minmax(0,1fr); column-gap:14px; align-items:start; padding:14px 0; border-bottom:1px solid var(--linie); }
  .tab tr:last-child { border-bottom:0; padding-bottom:0; }
  .tab td { display:flex; gap:10px; justify-content:space-between; padding:3px 0; border:0; grid-column:2; text-align:left; }
  .tab td::before { content:attr(data-label); color:var(--leise); flex:none; }
  .tab td.bild { grid-column:1; grid-row:1 / span 6; padding:0; display:block; }
  .tab td.bild::before { content:none; }
  .tab td.bild img { width:84px; height:84px; }
  .tab .num { text-align:right; }
}

footer { margin-top:auto; padding:32px 0 36px; }
${widths}
</style>
</head>
<body>
<a class="springen" href="#haupt">Zum Inhalt springen</a>
<header class="kopfleiste">
<div class="mitte kopf">
  <a class="marke" href="${SITE}/"><img src="${SITE}/assets/logo.svg" alt="" width="36" height="36"><span>VerseSpotter Statistik</span></a>
  <nav aria-label="Weiterführende Links">
    <a class="weg" href="${SITE}/">Zur Seite</a>
    <a class="alle" href="https://xharig.com/" title="Alle Werkzeuge von Xharig" aria-label="Alle Werkzeuge von Xharig"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg><span>xharig.com</span></a>
  </nav>
</div>
</header>
<main id="haupt">
  <div class="mitte">
    <div class="seitenkopf">
      <ol class="pfad" aria-label="Pfad">
        <li><a href="${SITE}/">VerseSpotter</a></li>
        <li aria-current="page">Statistik</li>
      </ol>
      <h1>Nutzung von VerseSpotter</h1>
      <p class="einleitung">Anonyme Zähler, nur für dich sichtbar. Gespeichert wird nur, wie oft etwas passiert, nie wer es war.</p>
    </div>
    <div class="leiste">
      <label class="feld" for="zeitraum">Zeitraum
        <select id="zeitraum">
          <option value="7">7 Tage</option>
          <option value="30">30 Tage</option>
          <option value="400">gesamt</option>
        </select>
      </label>
      <button id="discord" type="button" class="knopf voll"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>Für Discord kopieren</button>
      <span id="kopiert" class="ok" role="status"></span>
      <span class="stand" id="stand">lädt …</span>
    </div>
    <div class="vorschau-rahmen winkel" hidden id="vorschau-rahmen"><textarea id="vorschau" rows="16" readonly aria-label="Text für Discord"></textarea></div>
    <div class="raster" id="inhalt"></div>
  </div>
</main>
<footer>
  <div class="mitte">
    <p class="recht">VerseSpotter Statistik. Private Übersicht, geschützt durch die Anmeldung bei Cloudflare Access.</p>
  </div>
</footer>
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
  const c = el('article', 'karte winkel' + (wide ? ' breit' : ''));
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
    track.setAttribute('aria-hidden', 'true');
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
  document.getElementById('stand').textContent = 'Zähler seit ' + d.seit;

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
  const pc = card('Auffällige Bilder', true);
  pc.appendChild(el('p', 'einleitung-klein', 'Mindestens 5× gezeigt, 60 % oder mehr falsch.'));
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
  const wrap = el('div', 'tabelle');
  const t = el('table', 'tab');
  const thead = el('thead');
  const tr = el('tr');
  const numeric = (v) => !(typeof v === 'string' && !/%$/.test(v));
  head.forEach((h, i) => tr.appendChild(el('th', i > 1 && numeric(rows[0][i - 1]) ? 'num' : '', h)));
  thead.appendChild(tr);
  t.appendChild(thead);
  const tbody = el('tbody');
  for (const row of rows) {
    const r = el('tr');
    const tdImg = el('td', 'bild');
    const img = el('img');
    img.src = imageSrc(row[0]); img.alt = row[0]; img.loading = 'lazy'; img.width = 96; img.height = 96;
    tdImg.appendChild(img);
    r.appendChild(tdImg);
    row.forEach((v, i) => {
      const td = el('td', i === 0 || !numeric(v) ? '' : 'num', String(v));
      td.setAttribute('data-label', head[i + 1]);
      r.appendChild(td);
    });
    tbody.appendChild(r);
  }
  t.appendChild(tbody);
  wrap.appendChild(t);
  c.appendChild(wrap);
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
    '🛰️ **VerseSpotter: Statistik ' + period + '**',
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
  document.getElementById('vorschau-rahmen').hidden = false;
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
