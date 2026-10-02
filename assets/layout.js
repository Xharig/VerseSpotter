// SPDX-License-Identifier: GPL-3.0-only
// Kopf- und Fußzeile für alle Seiten aus einer Quelle. Läuft beim Einlesen,
// also vor texts.js, das danach alle data-t-Texte füllt.

const APP_VERSION = '1.0.0';

(function () {
  const page = document.body.dataset.page || '';
  const link = (href, key, icon, name) =>
    `<a href="${href}"${page === name ? ' aria-current="page"' : ''}>` +
    `<span class="ic ic-${icon}" aria-hidden="true"></span><span class="txt" data-t="${key}"></span></a>`;

  const header = document.getElementById('kopf');
  if (header) {
    header.innerHTML =
      '<div class="mitte kopf">' +
      '<a class="logo" href="./"><img src="assets/logo.svg" alt="" width="38" height="38">' +
      '<span class="marke" data-t="app_name"></span></a>' +
      '<nav data-t-aria="app_name">' +
      link('./', 'nav_train', 'crosshair', 'home') +
      link('katalog.html', 'nav_catalog', 'book-open', 'catalog') +
      link('danke.html', 'nav_thanks', 'heart-handshake', 'thanks') +
      '<div class="sprache" role="group" data-t-aria="lang_switch">' +
      '<button type="button" data-lang="de" lang="de">DE</button>' +
      '<button type="button" data-lang="en" lang="en">EN</button>' +
      '</div></nav></div>';
  }

  const footer = document.getElementById('fuss');
  if (footer) {
    footer.innerHTML =
      '<div class="mitte">' +
      '<div class="fusslinks">' +
      '<a href="https://versekit.xharig.com/?von=versespotter" data-t="footer_versekit"></a>' +
      '<a href="danke.html" data-t="nav_thanks"></a>' +
      '<a href="https://github.com/Xharig/VerseSpotter" data-t="footer_source"></a>' +
      '</div>' +
      '<img class="fankit" src="assets/made-by-the-community.png" alt="Star Citizen — Made by the Community" width="120">' +
      '<p class="fan" lang="en" data-t="footer_fan"></p>' +
      `<p class="recht"><span data-t="app_name"></span> v${APP_VERSION} · GPL-3.0 · <span data-t="footer_by"></span></p>` +
      '</div>';
  }
})();
