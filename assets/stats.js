// SPDX-License-Identifier: GPL-3.0-only
// Anonyme Zählung: schickt kleine Ereignisse ohne Kennung an den Zähler.
// Scheitert das Senden, merkt niemand etwas — die Seite läuft weiter.

const STATS_URL = 'https://nutzung-versespotter.xharig.com/e';

function statsDevice() {
  try { return matchMedia('(pointer:coarse)').matches ? 'handy' : 'pc'; } catch (e) { return 'pc'; }
}

function statsSource() {
  // After the language redirect (assets/lang.js) the referrer is this site;
  // the original one was kept for this one visit.
  let referrer = document.referrer;
  try {
    const kept = sessionStorage.getItem(REFERRER_KEY);
    if (kept !== null) {
      sessionStorage.removeItem(REFERRER_KEY);
      referrer = kept;
    }
  } catch (e) { /* keep document.referrer */ }
  const param = new URLSearchParams(location.search).get('von');
  if (param && /^[a-z0-9-]{2,20}$/.test(param)) return param;
  let host = '';
  try { host = referrer ? new URL(referrer).hostname.toLowerCase() : ''; } catch (e) { host = ''; }
  if (!host) return 'direkt';
  if (host === location.hostname) return 'intern';
  const known = [
    ['discord', /discord(app)?\.(com|gg)$/],
    ['versekit', /versekit\.xharig\.com$/],
    ['xharig', /xharig\.com$/],
    ['reddit', /reddit\.com$/],
    ['rsi', /robertsspaceindustries\.com$/],
    ['google', /google\./],
    ['bing', /bing\.com$/],
    ['duckduckgo', /duckduckgo\.com$/],
    ['youtube', /youtube\.com$/],
    ['github', /github\.(com|io)$/],
  ];
  for (const [name, re] of known) if (re.test(host)) return name;
  return 'andere';
}

function sendStat(type, payload) {
  if (location.protocol !== 'https:') return;
  const body = JSON.stringify(Object.assign({ t: type, l: document.documentElement.lang || 'de' }, payload || {}));
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(STATS_URL, new Blob([body], { type: 'text/plain' }))) return;
  } catch (e) { /* weiter mit fetch */ }
  try {
    fetch(STATS_URL, { method: 'POST', body, keepalive: true, mode: 'no-cors', headers: { 'content-type': 'text/plain' } }).catch(() => {});
  } catch (e) { /* bewusst still */ }
}

function hasProgress() {
  try { return !!localStorage.getItem('versespotter.progress'); } catch (e) { return false; }
}

document.addEventListener('DOMContentLoaded', () => {
  // A page that is redirecting to the stored language is not counted, and
  // leaves the kept referrer to the page it goes to.
  if (LANG_REDIRECT) return;
  sendStat('visit', {
    p: document.body.dataset.page || 'home',
    d: statsDevice(),
    s: statsSource(),
    r: hasProgress() ? 1 : 0,
  });
});
