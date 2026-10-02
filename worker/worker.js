// SPDX-License-Identifier: GPL-3.0-only
//
// Zähler für VerseSpotter — und die private Übersicht dazu. Läuft als
// Cloudflare Worker.
//
//   nutzung-versespotter.xharig.com/e   öffentlich. Die Seite schickt kleine
//                             Ereignisse (Aufruf, Start, Ende, Kopieren,
//                             Bild melden). Angenommen wird nur, was `check()`
//                             durchlässt — feste Felder, feste Formen, keine
//                             Kennung.
//   statistik-versespotter.xharig.com   privat. Davor sitzt Cloudflare Access
//                             (Anmeldung über GitHub); der Worker prüft dessen
//                             Zeichen zusätzlich selbst (`verifyAccess`).
//
// Gespeichert werden nur Zähler je Tag. Die Absender-Adresse wird nirgends
// abgelegt (die Mengenbremse sieht sie nur im Vorbeigehen). Das Land ist das
// Kürzel, das Cloudflare selbst ermittelt (`request.cf.country`).

import { dashboardHtml } from './dashboard.js';

const MAX_BYTES = 6000;
const SITE_ORIGIN = 'https://versespotter.xharig.com';
const STATS_HOST = 'statistik-versespotter.xharig.com';
const MAX_DAYS = 400;
const COUNTRY_RE = /^[A-Z][A-Z0-9]$/;
const LANGS = ['de', 'en'];
const PAGES = ['home', 'catalog', 'thanks'];
const DEVICES = ['handy', 'pc'];
const SOURCE_RE = /^[a-z0-9-]{2,20}$/;
const MODES = ['mixed', 'hud', 'silhouette', 'beginner'];
const LENGTHS = [10, 20, 30, 40];
const RANKS = ['ace', 'spotter', 'cadet', 'recruit'];
const REASONS = ['wrong_ship', 'name_visible', 'bad_quality', 'other'];
const IMAGE_RE = /^(catalog:[a-z0-9-]{2,60}|(hud|silhouette)-[a-z0-9-]{2,70})$/;
const FAMILY_RE = /^[\p{L}\p{N} .'\-]{1,40}$/u;
const FIELDS = {
  visit: ['t', 'l', 'p', 'd', 's', 'r'],
  start: ['t', 'l', 'm', 'n', 'c'],
  finish: ['t', 'l', 'm', 'n', 'c', 'k', 'g', 'a'],
  copy: ['t', 'l', 'm'],
  report: ['t', 'l', 'b', 'g'],
};

function answer(status, text) {
  return new Response(text, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function country(request) {
  const c = String((request.cf && request.cf.country) || '').toUpperCase();
  return COUNTRY_RE.test(c) ? c : 'XX';
}

function fail(text) {
  return { status: 400, text };
}

function oneOf(value, list, name) {
  if (!list.includes(value)) throw fail(name);
  return value;
}

// Gibt das geprüfte Ereignis zurück oder wirft { status, text }.
export async function check(request) {
  const length = Number(request.headers.get('content-length') || '0');
  if (length > MAX_BYTES) throw { status: 413, text: 'zu gross' };
  let text;
  try {
    text = await request.text();
  } catch (e) {
    throw fail('unlesbar');
  }
  if (text.length > MAX_BYTES) throw { status: 413, text: 'zu gross' };
  let d;
  try {
    d = JSON.parse(text);
  } catch (e) {
    throw fail('kein JSON');
  }
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw fail('Form');
  const allowedFields = FIELDS[d.t];
  if (!allowedFields) throw fail('Art');
  // ⚠ Nur bekannte Felder — was mehr schickt (etwa eine Kennung), wird
  // abgelehnt, statt still gespeichert zu werden.
  for (const k of Object.keys(d)) if (!allowedFields.includes(k)) throw fail('Felder');
  const ev = { type: d.t, lang: oneOf(d.l, LANGS, 'l') };

  if (d.t === 'visit') {
    ev.page = oneOf(d.p, PAGES, 'p');
    ev.device = oneOf(d.d, DEVICES, 'd');
    if (!SOURCE_RE.test(String(d.s))) throw fail('s');
    ev.source = d.s;
    ev.returning = oneOf(d.r, [0, 1], 'r');
  }
  if (d.t === 'start' || d.t === 'finish' || d.t === 'copy') ev.mode = oneOf(d.m, MODES, 'm');
  if (d.t === 'start' || d.t === 'finish') {
    ev.length = oneOf(d.n, LENGTHS, 'n');
    ev.combat = oneOf(d.c, [0, 1], 'c');
  }
  if (d.t === 'finish') {
    ev.rank = oneOf(d.g, RANKS, 'g');
    if (!Array.isArray(d.a) || d.a.length > ev.length) throw fail('a');
    ev.answers = d.a.map((row) => {
      if (!Array.isArray(row) || row.length !== 4) throw fail('a');
      const [image, correct, shown, chosen] = row;
      if (!IMAGE_RE.test(String(image))) throw fail('a.bild');
      if (correct !== 0 && correct !== 1) throw fail('a.richtig');
      if (!FAMILY_RE.test(String(shown))) throw fail('a.gezeigt');
      if (chosen !== '' && !FAMILY_RE.test(String(chosen))) throw fail('a.gewaehlt');
      return { image, correct, shown, chosen };
    });
    if (!Number.isInteger(d.k) || d.k < 0 || d.k !== ev.answers.filter((x) => x.correct).length) throw fail('k');
    ev.score = d.k;
  }
  if (d.t === 'report') {
    if (!IMAGE_RE.test(String(d.b))) throw fail('b');
    ev.image = d.b;
    ev.reason = oneOf(d.g, REASONS, 'g');
  }
  return ev;
}

// Aus einem Ereignis die Zeilen für die Datenbank.
export function statements(env, ev, day, land) {
  const out = [];
  const count = (merkmal, wert) => out.push(env.DB.prepare(
    'INSERT INTO zaehler (tag, merkmal, wert, n) VALUES (?1, ?2, ?3, 1) ' +
    'ON CONFLICT (tag, merkmal, wert) DO UPDATE SET n = n + 1'
  ).bind(day, merkmal, String(wert)));

  if (ev.type === 'visit') {
    count('aufruf', ev.page);
    count('geraet', ev.device);
    count('herkunft', ev.source);
    count('land', land);
    count('sprache', ev.lang);
    count('wiederkehrend', ev.returning ? 'ja' : 'nein');
  } else if (ev.type === 'start') {
    count('start', ev.mode);
    count('laenge', ev.length);
    count('gefecht', ev.combat ? 'an' : 'aus');
  } else if (ev.type === 'finish') {
    count('ende', ev.mode);
    count('rang', ev.rank);
    out.push(env.DB.prepare(
      'INSERT INTO ergebnisse (tag, modus, laeufe, richtig, fragen) VALUES (?1, ?2, 1, ?3, ?4) ' +
      'ON CONFLICT (tag, modus) DO UPDATE SET laeufe = laeufe + 1, richtig = richtig + ?3, fragen = fragen + ?4'
    ).bind(day, ev.mode, ev.score, ev.answers.length));
    for (const a of ev.answers) {
      out.push(env.DB.prepare(
        'INSERT INTO bilder (tag, bild, gezeigt, falsch) VALUES (?1, ?2, 1, ?3) ' +
        'ON CONFLICT (tag, bild) DO UPDATE SET gezeigt = gezeigt + 1, falsch = falsch + ?3'
      ).bind(day, a.image, a.correct ? 0 : 1));
      if (!a.correct) {
        out.push(env.DB.prepare(
          'INSERT INTO verwechslung (tag, gezeigt, gewaehlt, n) VALUES (?1, ?2, ?3, 1) ' +
          'ON CONFLICT (tag, gezeigt, gewaehlt) DO UPDATE SET n = n + 1'
        ).bind(day, a.shown, a.chosen));
      }
    }
  } else if (ev.type === 'copy') {
    count('kopiert', ev.mode);
  } else if (ev.type === 'report') {
    out.push(env.DB.prepare(
      'INSERT INTO meldungen (tag, bild, grund, n) VALUES (?1, ?2, ?3, 1) ' +
      'ON CONFLICT (tag, bild, grund) DO UPDATE SET n = n + 1'
    ).bind(day, ev.image, ev.reason));
  }
  return out;
}

async function collect(request, env) {
  if (request.method !== 'POST') return answer(405, 'nur POST');
  if (!env.DB || !env.LIMIT) return answer(503, 'nicht eingerichtet');
  if (request.headers.get('origin') !== SITE_ORIGIN) return answer(403, 'Herkunft');
  const ip = request.headers.get('cf-connecting-ip') || 'unbekannt';
  const { success } = await env.LIMIT.limit({ key: ip });
  if (!success) return answer(429, 'zu viele');
  let ev;
  try {
    ev = await check(request);
  } catch (e) {
    if (e && e.status) return answer(e.status, e.text);
    return answer(400, 'unlesbar');
  }
  // Der Tag kommt vom Worker (UTC), nicht vom Absender.
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.batch(statements(env, ev, day, country(request)));
  return new Response(null, { status: 204, headers: { 'access-control-allow-origin': SITE_ORIGIN } });
}

// ------------------------------------------------------------ Access prüfen

function b64urlBytes(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (ch) => ch.charCodeAt(0));
}

function b64urlJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(s)));
}

// Gibt die geprüften Angaben des Zeichens zurück oder null. Jede Prüfung
// muss bestehen; fehlt eine Einstellung, ist die Antwort null (Tür zu).
export async function verifyAccess(request, env, fetchCerts = fetch) {
  const team = env.TEAM_DOMAIN || '';
  const aud = env.POLICY_AUD || '';
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) || !aud) return null;
  const token = request.headers.get('cf-access-jwt-assertion') || '';
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  let head, claims;
  try {
    head = b64urlJson(parts[0]);
    claims = b64urlJson(parts[1]);
  } catch (e) {
    return null;
  }
  if (head.alg !== 'RS256' || !head.kid) return null;
  let keys;
  try {
    const r = await fetchCerts(`https://${team}/cdn-cgi/access/certs`);
    keys = (await r.json()).keys || [];
  } catch (e) {
    return null;
  }
  const jwk = keys.find((k) => k.kid === head.kid);
  if (!jwk) return null;
  let ok = false;
  try {
    const key = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch (e) {
    return null;
  }
  if (!ok) return null;
  const now = Math.floor(Date.now() / 1000);
  const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!auds.includes(aud)) return null;
  if (claims.iss !== `https://${team}`) return null;
  if (typeof claims.exp !== 'number' || claims.exp < now) return null;
  if (typeof claims.nbf === 'number' && claims.nbf > now + 60) return null;
  return claims;
}

export function allowed(claims, env) {
  const mail = (env.ERLAUBTE_MAIL || '').trim().toLowerCase();
  return !!mail && String(claims.email || '').toLowerCase() === mail;
}

// ------------------------------------------------------------ Übersicht

const TABLES = ['zaehler', 'ergebnisse', 'bilder', 'verwechslung', 'meldungen'];

async function data(env, days) {
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const out = { seit: since, tage: days };
  const results = await Promise.all(TABLES.map((t) =>
    env.DB.prepare(`SELECT * FROM ${t} WHERE tag >= ?1`).bind(since).all()));
  TABLES.forEach((t, i) => { out[t] = results[i].results || []; });
  return out;
}

const SECURITY = {
  'cache-control': 'no-store',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

async function stats(request, env, verify) {
  if (request.method !== 'GET') return answer(405, 'nur GET');
  if (!env.DB) return answer(503, 'nicht eingerichtet');
  const who = await verify(request, env);
  if (!who || !allowed(who, env)) return answer(403, 'kein Zugang');
  const url = new URL(request.url);
  if (url.pathname === '/daten') {
    const days = Math.min(MAX_DAYS, Math.max(1, Number(url.searchParams.get('tage')) || 7));
    return new Response(JSON.stringify(await data(env, days)), {
      headers: { 'content-type': 'application/json; charset=utf-8', ...SECURITY },
    });
  }
  if (url.pathname === '/export') {
    return new Response(JSON.stringify(await data(env, MAX_DAYS)), {
      headers: { 'content-type': 'application/json; charset=utf-8', ...SECURITY },
    });
  }
  if (url.pathname !== '/') return answer(404, 'nicht hier');
  const nonce = crypto.randomUUID().replace(/-/g, '');
  return new Response(dashboardHtml(nonce), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy':
        `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; ` +
        `connect-src 'self'; img-src ${SITE_ORIGIN} data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      ...SECURITY,
    },
  });
}

export default {
  async fetch(request, env, ctx, verify = verifyAccess) {
    const url = new URL(request.url);
    // ⚠ Die Übersicht NUR unter ihrer eigenen Adresse — dort sitzt Access davor.
    if (url.hostname === STATS_HOST) return stats(request, env, verify);
    if (url.pathname === '/e') return collect(request, env);
    return answer(404, 'nicht hier');
  },
};
