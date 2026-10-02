// SPDX-License-Identifier: GPL-3.0-only
// Schreibt die Übersicht mit ausgedachten Probedaten als Datei, um sie ohne
// Cloudflare im Browser anzusehen. Aufruf: node dashboard_probe.mjs <ziel.html>

import { writeFileSync } from 'node:fs';
import { dashboardHtml } from './dashboard.js';

const day = new Date().toISOString().slice(0, 10);
const z = (merkmal, wert, n) => ({ tag: day, merkmal, wert, n });
const sample = {
  seit: day, tage: 7,
  zaehler: [
    z('aufruf', 'home', 120), z('aufruf', 'catalog', 40), z('aufruf', 'thanks', 6),
    z('wiederkehrend', 'nein', 38), z('wiederkehrend', 'ja', 82),
    z('land', 'DE', 80), z('land', 'AT', 15), z('land', 'US', 12), z('land', 'XX', 3),
    z('herkunft', 'discord', 60), z('herkunft', 'versekit', 25), z('herkunft', 'direkt', 20),
    z('sprache', 'de', 90), z('sprache', 'en', 30), z('geraet', 'pc', 100), z('geraet', 'handy', 20),
    z('start', 'beginner', 70), z('start', 'hud', 20), z('laenge', '20', 60), z('laenge', '10', 30),
    z('gefecht', 'an', 20), z('gefecht', 'aus', 70), z('ende', 'beginner', 60), z('ende', 'hud', 15),
    z('rang', 'ace', 5), z('rang', 'spotter', 20), z('rang', 'cadet', 30), z('rang', 'recruit', 20),
    z('kopiert', 'beginner', 12),
  ],
  ergebnisse: [{ tag: day, modus: 'beginner', laeufe: 60, richtig: 950, fragen: 1200 }],
  bilder: [{ tag: day, bild: 'hud-anvl-arrow-1', gezeigt: 10, falsch: 8 }, { tag: day, bild: 'catalog:anvl-arrow', gezeigt: 20, falsch: 2 }],
  verwechslung: [
    { tag: day, gezeigt: 'Cutlass', gewaehlt: 'Freelancer', n: 14 },
    { tag: day, gezeigt: 'Arrow', gewaehlt: 'Gladius', n: 9 },
    { tag: day, gezeigt: 'Constellation', gewaehlt: 'Mercury', n: 6 },
  ],
  meldungen: [{ tag: day, bild: 'hud-aegs-sabre-comet-1', grund: 'name_visible', n: 2 }],
};

const mock = `<script>window.fetch = async () => new Response(${JSON.stringify(JSON.stringify(sample))});</script>`;
const html = dashboardHtml('probe')
  .replace('<head>', '<head>' + mock)
  .replace('<b>VerseSpotter</b> Statistik', '<b>VerseSpotter</b> Statistik — PROBEDATEN');
writeFileSync(process.argv[2], html);
