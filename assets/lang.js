// SPDX-License-Identifier: GPL-3.0-only
// Page language and site root. Loaded in <head>, before the page is drawn.
// Each language has its own address: German at "/", English at "/en/"
// (written by tools/build_pages.py). The language comes from <html lang>,
// never from the browser: search engines read pages with an English browser
// and would otherwise never see the German version. A language picked once
// (language links, language bar) is stored and opens directly from then on.

const LANG_KEY = 'versespotter.lang';
// Original referrer across the redirect below, read by stats.js.
const REFERRER_KEY = 'versespotter.referrer';
const PAGE_LANG = document.documentElement.lang === 'en' ? 'en' : 'de';
// "/" or "/en/" load the same files: paths in scripts start from here.
const SITE_ROOT = document.currentScript.src.replace(/assets\/[^/]*$/, '');

// This page in each language, from the <link rel="alternate" hreflang> tags.
const LANG_URLS = {};
document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(l => {
  LANG_URLS[l.hreflang] = SITE_ROOT + new URL(l.href).pathname.replace(/^\//, '');
});

function storeLang(lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* without storage the choice lasts for this page only */ }
}

const LANG_CHOICE = (() => {
  let stored = null;
  try { stored = localStorage.getItem(LANG_KEY); } catch (e) { stored = null; }
  return stored === 'de' || stored === 'en' ? stored : null;
})();

const LANG_REDIRECT = !!LANG_CHOICE && LANG_CHOICE !== PAGE_LANG && !!LANG_URLS[LANG_CHOICE];
if (LANG_REDIRECT) {
  try { sessionStorage.setItem(REFERRER_KEY, document.referrer); } catch (e) { /* source then counts as internal */ }
  location.replace(LANG_URLS[LANG_CHOICE] + location.search + location.hash);
}
