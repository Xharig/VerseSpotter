// SPDX-License-Identifier: GPL-3.0-only
// Alle sichtbaren Texte, deutsch und englisch. Elemente im HTML tragen
// data-t="schluessel" (Inhalt), data-t-title, data-t-aria oder
// data-t-placeholder (Attribute). t() liefert Texte für Skripte.

const TEXTS = {
  app_name: { de: 'VerseSpotter', en: 'VerseSpotter' },
  app_claim: {
    de: 'Erkenne jedes Schiff — am Hologramm im HUD und an der Silhouette im Flug.',
    en: 'Recognise every ship — by its HUD hologram and by its silhouette in flight.',
  },
  page_title_home: { de: 'VerseSpotter — Schiffe erkennen lernen', en: 'VerseSpotter — learn to recognise Star Citizen ships' },
  page_title_catalog: { de: 'Schiffskatalog — VerseSpotter', en: 'Ship catalogue — VerseSpotter' },
  page_title_thanks: { de: 'Danke & Lizenzen — VerseSpotter', en: 'Thanks & licences — VerseSpotter' },

  nav_all_tools: { de: 'xharig.com', en: 'xharig.com' },
  nav_all_tools_hint: { de: 'Alle Werkzeuge von Xharig', en: 'All tools by Xharig' },
  nav_train: { de: 'Training', en: 'Training' },
  nav_catalog: { de: 'Schiffskatalog', en: 'Ship catalogue' },
  nav_thanks: { de: 'Danke & Lizenzen', en: 'Thanks & licences' },
  lang_switch: { de: 'Sprache', en: 'Language' },

  // Start
  setup_label: { de: 'Training', en: 'Training' },
  setup_title: { de: 'Wie willst du üben?', en: 'How do you want to train?' },
  mode_legend: { de: 'Bildart', en: 'Image type' },
  mode_mixed: { de: 'Gemischt', en: 'Mixed' },
  mode_mixed_hint: { de: 'HUD und Silhouette durcheinander', en: 'HUD and silhouette shuffled' },
  mode_hud: { de: 'HUD', en: 'HUD' },
  mode_hud_hint: { de: 'Das Hologramm aus dem Cockpit', en: 'The hologram from the cockpit' },
  mode_silhouette: { de: 'Silhouette', en: 'Silhouette' },
  mode_silhouette_hint: { de: 'Das Schiff im Flug', en: 'The ship in flight' },
  mode_beginner: { de: 'Einsteiger', en: 'Beginner' },
  mode_beginner_hint: { de: 'Schiffsbilder zum Aufwärmen', en: 'Ship renders to warm up' },
  mode_locked: { de: 'Noch zu wenig Bilder ({n} von {min} Schiffen)', en: 'Not enough images yet ({n} of {min} ships)' },
  length_legend: { de: 'Fragen pro Lauf', en: 'Questions per run' },
  combat_title: { de: 'Gefechtsmodus', en: 'Combat mode' },
  combat_hint: { de: '{s} Sekunden pro Bild — wer zu langsam ist, liegt falsch', en: '{s} seconds per image — too slow counts as wrong' },
  start_button: { de: 'Training starten', en: 'Start training' },
  progress_title: { de: 'Dein Lernstand', en: 'Your progress' },
  progress_line: { de: '{a} von {b} Schiffen sitzen', en: '{a} of {b} ships mastered' },
  progress_note: {
    de: 'Der Lernstand liegt nur in diesem Browser. Wer den Browserverlauf komplett löscht, fängt von vorn an.',
    en: 'Your progress is stored in this browser only. Clearing all browsing data starts you from scratch.',
  },
  progress_reset: { de: 'Lernstand zurücksetzen', en: 'Reset progress' },
  reset_confirm_title: { de: 'Lernstand zurücksetzen?', en: 'Reset progress?' },
  reset_confirm_text: {
    de: 'Alle Schiffe kommen wieder ins erste Fach. Das lässt sich nicht rückgängig machen.',
    en: 'All ships go back to the first box. This cannot be undone.',
  },
  reset_yes: { de: 'Zurücksetzen', en: 'Reset' },
  cancel: { de: 'Abbrechen', en: 'Cancel' },
  close: { de: 'Schließen', en: 'Close' },
  how_title: { de: 'So funktioniert es', en: 'How it works' },
  how_1: { de: 'Du siehst ein Bild und wählst aus drei Schiffen.', en: 'You see an image and pick one of three ships.' },
  how_2: { de: 'Was du falsch hattest, kommt bald wieder. Was sitzt, kommt seltener.', en: 'What you got wrong comes back soon. What you know comes up less often.' },
  how_3: { de: 'Je besser du ein Schiff kennst, desto ähnlicher werden die falschen Antworten.', en: 'The better you know a ship, the more similar the wrong answers get.' },
  how_keys: { de: 'Tastatur: 1, 2, 3 zum Antworten, Enter für weiter.', en: 'Keyboard: 1, 2, 3 to answer, Enter to continue.' },

  // Quiz
  question_of: { de: 'Frage {i} von {n}', en: 'Question {i} of {n}' },
  question_text: { de: 'Welches Schiff ist das?', en: 'Which ship is this?' },
  image_alt: { de: 'Bild eines Schiffs, das erkannt werden soll', en: 'Image of the ship to identify' },
  answer_correct: { de: 'Richtig', en: 'Correct' },
  answer_wrong: { de: 'Falsch', en: 'Wrong' },
  answer_timeout: { de: 'Zu langsam', en: 'Too slow' },
  answer_was: { de: 'Das war: {name}', en: 'That was: {name}' },
  next: { de: 'Weiter', en: 'Next' },
  to_result: { de: 'Zur Auswertung', en: 'See results' },
  quit: { de: 'Lauf abbrechen', en: 'Quit run' },
  seconds_left: { de: '{s} s', en: '{s} s' },
  photo_by: { de: 'Bild: {name}', en: 'Image: {name}' },
  report_button: { de: 'Bild melden', en: 'Report image' },
  report_title: { de: 'Was stimmt mit dem Bild nicht?', en: 'What is wrong with this image?' },
  report_wrong_ship: { de: 'Das ist ein anderes Schiff', en: 'This is a different ship' },
  report_name_visible: { de: 'Der Schiffsname ist im Bild zu sehen', en: 'The ship name is visible in the image' },
  report_bad_quality: { de: 'Man erkennt nichts / schlechte Qualität', en: 'Nothing recognisable / poor quality' },
  report_other: { de: 'Etwas anderes', en: 'Something else' },
  report_thanks: { de: 'Danke! Das Bild wird geprüft.', en: 'Thanks! The image will be checked.' },
  report_details: { de: 'Mehr erzählen auf GitHub', en: 'Tell us more on GitHub' },

  // Ergebnis
  result_label: { de: 'Auswertung', en: 'Results' },
  rank_ace: { de: 'Ass', en: 'Ace' },
  rank_spotter: { de: 'Spotter', en: 'Spotter' },
  rank_cadet: { de: 'Kadett', en: 'Cadet' },
  rank_recruit: { de: 'Rekrut', en: 'Recruit' },
  rank_ace_text: { de: 'Fehlerfrei. Dir entgeht kein Schiff.', en: 'Flawless. No ship gets past you.' },
  rank_spotter_text: { de: 'Bestanden. Du erkennst die Schiffe zuverlässig.', en: 'Passed. You recognise ships reliably.' },
  rank_cadet_text: { de: 'Guter Anfang. Die Fehler unten kommen im nächsten Lauf wieder.', en: 'Good start. The misses below come back in your next run.' },
  rank_recruit_text: { de: 'Weiter üben — schau dir die Fehler unten an.', en: 'Keep practising — have a look at the misses below.' },
  share_title: { de: 'Ergebnis teilen', en: 'Share your result' },
  share_copy: { de: 'Für Discord kopieren', en: 'Copy for Discord' },
  share_copied: { de: 'Kopiert', en: 'Copied' },
  share_mode: { de: 'Modus', en: 'Mode' },
  share_wrong: { de: 'Falsch', en: 'Wrong' },
  share_none: { de: 'keine', en: 'none' },
  share_time: { de: 'in {time}', en: 'in {time}' },
  result_time: { de: 'Zeit: {time} · im Schnitt {avg} pro Bild', en: 'Time: {time} · {avg} per image on average' },
  mistakes_title: { de: 'Das hattest du falsch', en: 'What you missed' },
  mistakes_none: { de: 'Keine Fehler — stark!', en: 'No mistakes — great job!' },
  mistake_shown: { de: 'Gezeigt: {name}', en: 'Shown: {name}' },
  mistake_chosen: { de: 'Deine Antwort: {name}', en: 'Your answer: {name}' },
  mistake_timeout: { de: 'Deine Antwort: keine (Zeit abgelaufen)', en: 'Your answer: none (time ran out)' },
  mistake_reference: { de: 'So sieht die {name} aus', en: 'This is what the {name} looks like' },
  again: { de: 'Noch ein Lauf', en: 'Another run' },
  back_setup: { de: 'Einstellungen', en: 'Settings' },

  // Katalog
  catalog_label: { de: 'Nachschlagen', en: 'Look it up' },
  catalog_title: { de: 'Schiffskatalog', en: 'Ship catalogue' },
  catalog_intro: {
    de: 'Alle flugfähigen Raumschiffe — erst in Ruhe ansehen, dann im Training testen. Die Bilder aus dem Spiel kommen nach und nach dazu.',
    en: 'Every flight-ready spaceship — study them first, then test yourself in training. In-game images are added over time.',
  },
  catalog_search: { de: 'Schiff oder Hersteller suchen …', en: 'Search ship or manufacturer …' },
  catalog_search_label: { de: 'Suche', en: 'Search' },
  catalog_filter_label: { de: 'Größe', en: 'Size' },
  catalog_all_sizes: { de: 'Alle Größen', en: 'All sizes' },
  catalog_count: { de: '{n} Schiffe', en: '{n} ships' },
  catalog_empty: { de: 'Kein Schiff gefunden.', en: 'No ship found.' },
  catalog_no_image: { de: 'Noch kein Bild', en: 'No image yet' },
  catalog_family: { de: 'Familie', en: 'Family' },
  catalog_length: { de: '{m} m lang', en: '{m} m long' },
  catalog_hud_images: { de: 'HUD ({n})', en: 'HUD ({n})' },
  catalog_silhouette_images: { de: 'Silhouette ({n})', en: 'Silhouette ({n})' },
  catalog_gallery_hud: { de: '{name} im HUD', en: '{name} in the HUD' },
  catalog_gallery_silhouette: { de: '{name} als Silhouette', en: '{name} as a silhouette' },

  // Danke & Lizenzen
  thanks_label: { de: 'Danke', en: 'Thanks' },
  thanks_title: { de: 'Danke & Lizenzen', en: 'Thanks & licences' },
  thanks_intro: {
    de: 'Die Bilder aus dem Spiel sammelt die Community. Ohne sie gäbe es kein Training im HUD und keine Silhouetten.',
    en: 'The in-game images are collected by the community. Without them there would be no HUD or silhouette training.',
  },
  thanks_collectors: { de: 'Bildersammler', en: 'Image collectors' },
  thanks_images: { de: '{n} Bilder', en: '{n} images' },
  thanks_image_one: { de: '1 Bild', en: '1 image' },
  thanks_none: { de: 'Die ersten Bilder sind unterwegs.', en: 'The first images are on their way.' },
  licences_title: { de: 'Lizenzen', en: 'Licences' },
  licence_code: {
    de: '<strong>Programmcode:</strong> GPL-3.0. Der Quelltext liegt offen auf GitHub.',
    en: '<strong>Code:</strong> GPL-3.0. The source is openly available on GitHub.',
  },
  licence_photos: {
    de: '<strong>Bilder der Sammler:</strong> CC BY-NC 4.0 — weiterverwenden mit Namensnennung, nicht kommerziell.',
    en: '<strong>Collector images:</strong> CC BY-NC 4.0 — reuse with attribution, non-commercial.',
  },
  licence_renders: {
    de: '<strong>Schiffsbilder im Katalog und im Einsteiger-Modus:</strong> Eigentum von Cloud Imperium, bezogen über die RSI Ship Matrix und das Star Citizen Wiki (starcitizen.tools) und genutzt im Rahmen der Fan-Seiten-Regeln.',
    en: '<strong>Ship renders in the catalogue and beginner mode:</strong> property of Cloud Imperium, sourced via the RSI Ship Matrix and the Star Citizen Wiki (starcitizen.tools) and used under the fan site rules.',
  },
  licence_data: {
    de: '<strong>Schiffsdaten:</strong> Star Citizen Wiki API (api.star-citizen.wiki).',
    en: '<strong>Ship data:</strong> Star Citizen Wiki API (api.star-citizen.wiki).',
  },
  licence_icons: {
    de: '<strong>Symbole:</strong> Lucide, ISC-Lizenz, © Lucide Icons and Contributors.',
    en: '<strong>Icons:</strong> Lucide, ISC licence, © Lucide Icons and Contributors.',
  },
  privacy_title: { de: 'Datenschutz', en: 'Privacy' },
  privacy_1: {
    de: 'Die Seite setzt keine Cookies und speichert keine IP-Adressen.',
    en: 'This site sets no cookies and stores no IP addresses.',
  },
  privacy_2: {
    de: 'Dein Lernstand liegt nur in deinem Browser (localStorage) und verlässt ihn nie.',
    en: 'Your progress lives only in your browser (localStorage) and never leaves it.',
  },
  privacy_3: {
    de: 'Gezählt wird ohne Kennung, nur „wie viele": Seitenaufrufe, gestartete und beendete Läufe, Ergebnisse, welche Schiffe verwechselt werden, gemeldete Bilder, Sprache, Gerätetyp (Handy oder PC), die Seite, von der du kommst, und das Land, das Cloudflare aus der Anfrage ableitet. Daraus lässt sich niemand wiedererkennen.',
    en: 'Counting happens without any identifier, only "how many": page views, started and finished runs, results, which ships get confused, reported images, language, device type (phone or PC), the referring site and the country Cloudflare derives from the request. Nobody can be recognised from this.',
  },
  privacy_4: {
    de: 'Die Seite liegt bei GitHub Pages, die Zählung läuft über Cloudflare.',
    en: 'The site is hosted on GitHub Pages; counting runs on Cloudflare.',
  },

  // Fuß
  footer_all_tools: { de: 'Alle Werkzeuge auf xharig.com', en: 'All tools on xharig.com' },
  footer_versekit: { de: 'Verse-Kit — Baupläne live im Blick', en: 'Verse-Kit — blueprints live while you play' },
  footer_source: { de: 'Quelltext', en: 'Source code' },
  footer_by: { de: 'von Xharig', en: 'by Xharig' },
  footer_fan: {
    de: 'This is an unofficial Star Citizen fan site, not affiliated with the Cloud Imperium group of companies. All content on this site not authored by its host or users are property of their respective owners. Star Citizen®, Roberts Space Industries® and Cloud Imperium® are registered trademarks of Cloud Imperium Rights LLC.',
    en: 'This is an unofficial Star Citizen fan site, not affiliated with the Cloud Imperium group of companies. All content on this site not authored by its host or users are property of their respective owners. Star Citizen®, Roberts Space Industries® and Cloud Imperium® are registered trademarks of Cloud Imperium Rights LLC.',
  },
  load_error: {
    de: 'Die Schiffsdaten ließen sich nicht laden. Bitte die Seite neu laden.',
    en: 'Could not load the ship data. Please reload the page.',
  },
};

const LANG_KEY = 'versespotter.lang';
let currentLang = 'de';

function t(key, vars) {
  const entry = TEXTS[key];
  let s = entry ? (entry[currentLang] || entry.de) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(String(v));
  }
  return s;
}

function readStoredLang() {
  try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; }
}

function initialLang() {
  const stored = readStoredLang();
  if (stored === 'de' || stored === 'en') return stored;
  const browser = ((navigator.languages && navigator.languages[0]) || navigator.language || 'de').toLowerCase();
  return browser.startsWith('de') ? 'de' : 'en';
}

function applyTexts(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-t]').forEach(el => { el.innerHTML = t(el.dataset.t); });
  scope.querySelectorAll('[data-t-title]').forEach(el => { el.title = t(el.dataset.tTitle); });
  scope.querySelectorAll('[data-t-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.tAria)); });
  scope.querySelectorAll('[data-t-placeholder]').forEach(el => { el.placeholder = t(el.dataset.tPlaceholder); });
  scope.querySelectorAll('[data-t-alt]').forEach(el => { el.alt = t(el.dataset.tAlt); });
}

function setLang(lang, store) {
  currentLang = lang === 'en' ? 'en' : 'de';
  document.documentElement.lang = currentLang;
  if (store) {
    try { localStorage.setItem(LANG_KEY, currentLang); } catch (e) { /* ohne Speicher bleibt es bei der Sitzung */ }
  }
  document.querySelectorAll('.sprache button').forEach(b => {
    const on = b.dataset.lang === currentLang;
    b.classList.toggle('an', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const titleKey = document.body.dataset.titleKey;
  if (titleKey) document.title = t(titleKey);
  applyTexts();
  document.dispatchEvent(new CustomEvent('langchange'));
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sprache button').forEach(b => {
    b.addEventListener('click', () => setLang(b.dataset.lang, true));
  });
  setLang(initialLang(), false);
});
