// SPDX-License-Identifier: GPL-3.0-only
// Prüfungen für den Zähler: was angenommen wird, was abgelehnt wird, und was
// in der Datenbank landet. Aufruf: node --test worker.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { check, statements } from './worker.js';
import { dashboardHtml } from './dashboard.js';

const ORIGIN = 'https://versespotter.xharig.com';

function req(body, origin = ORIGIN, method = 'POST') {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request('https://nutzung-versespotter.xharig.com/e', {
    method, body: method === 'POST' ? text : undefined,
    headers: origin ? { origin, 'content-type': 'text/plain' } : { 'content-type': 'text/plain' },
  });
}

// Nachgebaute D1: merkt sich jede Anweisung samt Werten.
function fakeEnv(limitOk = true) {
  const done = [];
  return {
    done,
    DB: {
      prepare(sql) { return { bind: (...v) => ({ sql, v }) }; },
      async batch(list) { done.push(...list); },
    },
    LIMIT: { async limit() { return { success: limitOk }; } },
  };
}

const finish = {
  t: 'finish', l: 'de', m: 'beginner', n: 10, c: 0, k: 1, g: 'recruit',
  a: [['catalog:anvl-arrow', 1, 'Arrow', 'Arrow'], ['hud-aegs-sabre-comet-1', 0, 'Sabre', 'Gladius']],
};

test('Aufruf wird angenommen', async () => {
  const ev = await check(req({ t: 'visit', l: 'de', p: 'home', d: 'pc', s: 'discord', r: 0 }));
  assert.equal(ev.source, 'discord');
});

test('unbekanntes Feld wird abgelehnt (keine Kennung einschmuggeln)', async () => {
  await assert.rejects(check(req({ t: 'visit', l: 'de', p: 'home', d: 'pc', s: 'direkt', r: 0, id: 'abc' })),
    (e) => e.status === 400 && e.text === 'Felder');
});

test('falscher Modus, falsche Länge und unbekannte Art werden abgelehnt', async () => {
  await assert.rejects(check(req({ t: 'start', l: 'de', m: 'quatsch', n: 20, c: 0 })), (e) => e.text === 'm');
  await assert.rejects(check(req({ t: 'start', l: 'de', m: 'hud', n: 25, c: 0 })), (e) => e.text === 'n');
  await assert.rejects(check(req({ t: 'boom', l: 'de' })), (e) => e.text === 'Art');
});

test('Umriss und Distanz: Modus und Bildkennungen werden angenommen', async () => {
  for (const m of ['outline', 'distance']) {
    const ev = await check(req({ t: 'start', l: 'de', m, n: 20, c: 0 }));
    assert.equal(ev.mode, m);
  }
  const ev = await check(req({
    ...finish, m: 'mixed',
    a: [['outline-aegs-gladius-port', 1, 'Gladius', 'Gladius'], ['distance-anvl-arrow-above', 0, 'Arrow', 'Gladius']],
  }));
  assert.equal(ev.answers.length, 2);
  await assert.rejects(check(req({ t: 'report', l: 'de', b: 'umriss-aegs-gladius-port', g: 'other' })), (e) => e.text === 'b');
});

test('Ergebnis: Punktzahl muss zu den Antworten passen', async () => {
  const ev = await check(req(finish));
  assert.equal(ev.answers.length, 2);
  await assert.rejects(check(req({ ...finish, k: 2 })), (e) => e.text === 'k');
});

test('Ergebnis: mehr Antworten als Fragen wird abgelehnt', async () => {
  await assert.rejects(check(req({ ...finish, n: 10, a: Array(11).fill(finish.a[0]), k: 11 })), (e) => e.text === 'a');
});

test('Bildkennung mit fremden Zeichen wird abgelehnt', async () => {
  await assert.rejects(check(req({ t: 'report', l: 'de', b: '../etc/passwd', g: 'other' })), (e) => e.text === 'b');
});

test('Ergebnis schreibt Bilder, Verwechslung und Summen', async () => {
  const env = fakeEnv();
  const ev = await check(req(finish));
  const rows = statements(env, ev, '2026-10-02', 'DE');
  const sqls = rows.map((r) => r.sql);
  assert.equal(sqls.filter((s) => s.includes('INTO bilder')).length, 2);
  const conf = rows.filter((r) => r.sql.includes('INTO verwechslung'));
  assert.equal(conf.length, 1);
  assert.deepEqual(conf[0].v, ['2026-10-02', 'Sabre', 'Gladius']);
  const sums = rows.find((r) => r.sql.includes('INTO ergebnisse'));
  assert.deepEqual(sums.v, ['2026-10-02', 'beginner', 1, 2]);
});

test('fremde Herkunft wird abgewiesen, ohne zu speichern', async () => {
  const env = fakeEnv();
  const r = await worker.fetch(req({ t: 'copy', l: 'de', m: 'hud' }, 'https://boese.example'), env, {});
  assert.equal(r.status, 403);
  assert.equal(env.done.length, 0);
});

test('Mengenbremse greift', async () => {
  const env = fakeEnv(false);
  const r = await worker.fetch(req({ t: 'copy', l: 'de', m: 'hud' }), env, {});
  assert.equal(r.status, 429);
  assert.equal(env.done.length, 0);
});

test('gültiges Ereignis landet in der Datenbank', async () => {
  const env = fakeEnv();
  const r = await worker.fetch(req({ t: 'copy', l: 'en', m: 'hud' }), env, {});
  assert.equal(r.status, 204);
  assert.equal(env.done.length, 1);
  assert.deepEqual(env.done[0].v.slice(1), ['kopiert', 'hud']);
});

test('Übersicht bleibt ohne Access-Einrichtung zu', async () => {
  const r = await worker.fetch(new Request('https://statistik-versespotter.xharig.com/'), { DB: {} }, {});
  assert.equal(r.status, 403);
});

test('Übersicht: gültiges Zeichen mit fremder Mail kommt nicht hinein', async () => {
  const env = { DB: {}, ERLAUBTE_MAIL: 'ich@example.org' };
  const verify = async () => ({ email: 'fremd@example.org' });
  const r = await worker.fetch(new Request('https://statistik-versespotter.xharig.com/'), env, {}, verify);
  assert.equal(r.status, 403);
  const own = await worker.fetch(new Request('https://statistik-versespotter.xharig.com/'), env, {},
    async () => ({ email: 'ICH@example.org' }));
  assert.equal(own.status, 200);
});

test('Übersicht: Skript im Dashboard ist gültiges JavaScript', () => {
  const html = dashboardHtml('abc');
  const script = html.split('<script nonce="abc">')[1].split('</script>')[0];
  assert.doesNotThrow(() => new Function(script));
});
