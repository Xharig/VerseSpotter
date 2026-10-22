# SPDX-License-Identifier: GPL-3.0-only
"""Builds the German and English pages of the website from one source.

Each page exists twice: German at the main address (index.html, katalog.html,
danke.html) and English under en/. The German files are the source: their
structure is edited by hand, and elements carry `data-t="key"` (content) or
`data-t-title`, `data-t-aria`, `data-t-placeholder`, `data-t-alt` (attributes).
This script fills all of them from TEXTS in assets/texts.js, so search engines
find the texts in the HTML, and writes:

- the block between `<!-- head:begin -->` and `<!-- head:end -->`: title,
  description, canonical address, language links (hreflang), link preview;
- the header (navigation, language links, language bar) and the footer;
- en/<page> with the English texts and asset paths one folder up;
- sitemap.xml with both language versions of every page.

    python3 tools/build_pages.py            # write all files
    python3 tools/build_pages.py --pruefen  # exit 1 if a file is outdated

Fails loudly if a key is missing in TEXTS or lacks a language, or if a page
links to a file that does not exist.
"""

import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://versespotter.xharig.com/"
APP_VERSION = "1.0.0"
REFERRAL_CODE = "STAR-YC7L-S4W2"
LANGS = ("de", "en")

# file -> (data-page, title key, description key)
PAGES = {
    "index.html": ("home", "page_title_home", "page_desc_home"),
    "katalog.html": ("catalog", "page_title_catalog", "page_desc_catalog"),
    "danke.html": ("thanks", "page_title_thanks", "page_desc_thanks"),
}
PAGE_FILE = {page: name for name, (page, _, _) in PAGES.items()}

SOURCE_NOTE = ("<!-- German page and source of en/{name}. Texts, the head block, header and"
               " footer\n     are written by tools/build_pages.py from assets/texts.js:"
               " run it after every change. -->\n")
GENERATED_NOTE = ("<!-- Generated from ../{name} by tools/build_pages.py."
                  " Do not edit; change ../{name} and run the script. -->\n")

# Addresses that exist in both languages elsewhere.
EXTERNAL = {
    "xharig": {"de": "https://xharig.com/", "en": "https://xharig.com/en/"},
    "versekit": {"de": "https://versekit.xharig.com/?von=versespotter",
                 "en": "https://versekit.xharig.com/en/?von=versespotter"},
}

ATTRIBUTES = {"title": "title", "aria": "aria-label", "placeholder": "placeholder", "alt": "alt"}


class BuildError(Exception):
    pass


# ---------- TEXTS from assets/texts.js ----------

TOKEN = re.compile(r"""
    (?P<space>\s+|//[^\n]*|/\*.*?\*/)
  | (?P<ident>[A-Za-z_$][\w$]*)
  | (?P<string>'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")
  | (?P<punct>[{}:,;])
""", re.VERBOSE | re.DOTALL)

ESCAPES = {"n": "\n", "t": "\t", "\\": "\\", "'": "'", '"': '"'}


def _js_string(raw):
    def unescape(m):
        c = m.group(1)
        if c.startswith("u"):
            return chr(int(c[1:], 16))
        if c in ESCAPES:
            return ESCAPES[c]
        raise BuildError("texts.js: unsupported escape \\%s" % c)
    return re.sub(r"\\(u[0-9a-fA-F]{4}|.)", unescape, raw[1:-1])


def _tokens(source, pos):
    while pos < len(source):
        m = TOKEN.match(source, pos)
        if not m:
            line = source.count("\n", 0, pos) + 1
            raise BuildError("texts.js line %d: cannot read %r" % (line, source[pos:pos + 30]))
        pos = m.end()
        if m.lastgroup != "space":
            yield m.lastgroup, m.group(m.lastgroup)


def read_texts(path):
    """Reads `const TEXTS = { key: { de: '…', en: '…' }, … };` without running JS."""
    with open(path, encoding="utf-8") as f:
        source = f.read()
    start = source.find("const TEXTS = ")
    if start < 0:
        raise BuildError("texts.js: `const TEXTS = ` not found")
    tokens = _tokens(source, start + len("const TEXTS = "))

    def value(tok):
        kind, text = tok
        if kind == "string":
            return _js_string(text)
        if (kind, text) != ("punct", "{"):
            raise BuildError("texts.js: expected a string or object, found %r" % text)
        obj = {}
        while True:
            kind, text = next(tokens)
            if (kind, text) == ("punct", "}"):
                return obj
            if kind == "ident":
                key = text
            elif kind == "string":
                key = _js_string(text)
            else:
                raise BuildError("texts.js: expected a key, found %r" % text)
            if next(tokens) != ("punct", ":"):
                raise BuildError("texts.js: expected ':' after %s" % key)
            if key in obj:
                raise BuildError("texts.js: key %s appears twice" % key)
            obj[key] = value(next(tokens))
            kind, text = next(tokens)
            if (kind, text) == ("punct", "}"):
                return obj
            if (kind, text) != ("punct", ","):
                raise BuildError("texts.js: expected ',' after %s, found %r" % (key, text))

    try:
        texts = value(next(tokens))
    except StopIteration:
        raise BuildError("texts.js: TEXTS ends too early") from None
    for key, entry in texts.items():
        if not isinstance(entry, dict) or any(not isinstance(entry.get(l), str) or not entry[l]
                                              for l in LANGS):
            raise BuildError("texts.js: %s needs a de and an en text" % key)
    return texts


# ---------- addresses ----------

def href(page, lang, from_lang):
    """Relative link from a page in `from_lang` to `page` in `lang`."""
    name = "" if page == "home" else PAGE_FILE[page]
    if lang == from_lang:
        path = name
    elif lang == "en":
        path = "en/" + name
    else:
        path = "../" + name
    return path or "./"


def url(page, lang):
    name = "" if page == "home" else PAGE_FILE[page]
    return SITE + ("en/" if lang == "en" else "") + name


# ---------- generated parts ----------

def structured_data(lang, desc):
    """schema.org description of the trainer, read by search engines only."""
    data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "name": "VerseSpotter",
                "url": SITE,
                "inLanguage": ["de", "en"],
            },
            {
                "@type": "WebApplication",
                "name": "VerseSpotter",
                "url": url("home", lang),
                "description": desc,
                "applicationCategory": "GameApplication",
                "operatingSystem": "Any (web browser)",
                "browserRequirements": "Requires JavaScript",
                "inLanguage": ["de", "en"],
                "isAccessibleForFree": True,
                "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
                "keywords": "Star Citizen, ship recognition, ship identification, "
                            "HUD hologram, silhouette, spaced repetition, quiz",
                "author": {"@type": "Person", "name": "Xharig", "url": "https://xharig.com/"},
                "sameAs": ["https://github.com/Xharig/VerseSpotter"],
            },
        ],
    }
    text = json.dumps(data, ensure_ascii=False, indent=1).replace("</", "<\\/")
    return '<script type="application/ld+json">\n%s\n</script>' % text


def head_block(page, lang, texts):
    _, title_key, desc_key = PAGES[PAGE_FILE[page]]
    where = PAGE_FILE[page] + " head"
    raw_desc = _text(texts, desc_key, lang, where)
    title = html.escape(_text(texts, title_key, lang, where))
    desc = html.escape(raw_desc)
    locale, other = ("de_DE", "en_US") if lang == "de" else ("en_US", "de_DE")
    extra = [structured_data(lang, raw_desc)] if page == "home" else []
    return "\n".join([
        "<!-- head:begin (tools/build_pages.py) -->",
        "<title>%s</title>" % title,
        '<meta name="description" content="%s">' % desc,
        '<link rel="canonical" href="%s">' % url(page, lang),
        '<link rel="alternate" hreflang="de" href="%s">' % url(page, "de"),
        '<link rel="alternate" hreflang="en" href="%s">' % url(page, "en"),
        '<link rel="alternate" hreflang="x-default" href="%s">' % url(page, "en"),
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="VerseSpotter">',
        '<meta property="og:locale" content="%s">' % locale,
        '<meta property="og:locale:alternate" content="%s">' % other,
        '<meta property="og:url" content="%s">' % url(page, lang),
        '<meta property="og:title" content="%s">' % title,
        '<meta property="og:description" content="%s">' % desc,
    ] + extra + [
        "<!-- head:end -->",
    ])


# Lucide icons drawn inline in the header (the shared header of all Xharig
# sites, see assets/basis.css).
ICON_GRID = ('<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
             ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
             '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/>'
             '<rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>')
ICON_X = ('<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
          ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>')
REFERRAL_LINK = "https://robertsspaceindustries.com/enlist?referral=%s" % REFERRAL_CODE


def header(page, lang):
    """The header every Xharig site shares: mark, page links (folded into a
    menu on narrow screens), xharig.com, language switch."""
    def nav(target, key, css):
        current = ' aria-current="page"' if target == page else ""
        return ('    %s<a%s href="%s"%s data-t="%s"></a>'
                % ("  " if not css else "", css, href(target, lang, lang), current, key))

    def switch(target_lang):
        on = ' class="an" aria-current="true"' if target_lang == lang else ""
        return ('      <a href="%s" data-lang="%s" hreflang="%s" lang="%s"%s>%s</a>'
                % (href(page, target_lang, lang), target_lang, target_lang, target_lang, on,
                   target_lang.upper()))

    other = "en" if lang == "de" else "de"
    return "\n".join([
        "",
        '<div class="mitte kopf">',
        '  <a class="marke" href="%s"><img src="assets/logo.svg" alt="" width="36" height="36">'
        '<span data-t="app_name"></span></a>' % href("home", lang, lang),
        '  <nav data-t-aria="app_name">',
        nav("home", "nav_train", ' class="weg"'),
        nav("catalog", "nav_catalog", ' class="weg"'),
        nav("thanks", "nav_thanks", ' class="weg"'),
        '    <details class="menue">',
        '      <summary data-t="nav_menu"></summary>',
        '      <div class="menue-liste">',
        nav("home", "nav_train", ""),
        nav("catalog", "nav_catalog", ""),
        nav("thanks", "nav_thanks", ""),
        '        <a href="%s" data-t="footer_all_tools"></a>' % EXTERNAL["xharig"][lang],
        "      </div>",
        "    </details>",
        '    <a class="alle" href="%s" data-t-title="nav_all_tools_hint" data-t-aria="nav_all_tools_hint">'
        '%s<span data-t="nav_all_tools"></span></a>' % (EXTERNAL["xharig"][lang], ICON_GRID),
        '    <div class="sprache" role="group" data-t-aria="lang_switch">',
        switch("de"),
        switch("en"),
        "    </div>",
        "  </nav>",
        "</div>",
        '<div class="hinweis-sprache" id="hinweis-sprache" hidden>',
        '  <div class="mitte">',
        '    <span id="hinweis-sprache-text" lang="%s"></span>' % other,
        '    <a id="hinweis-sprache-link" href="%s" hreflang="%s" lang="%s"></a>'
        % (href(page, other, lang), other, other),
        '    <button type="button" id="hinweis-sprache-zu" data-t-aria="lang_hint_close"'
        ' data-t-title="lang_hint_close">%s</button>' % ICON_X,
        "  </div>",
        "</div>",
        "",
    ])


def footer(lang):
    """The footer every Xharig site shares: three columns, fan kit notice;
    here with the referral box on top."""
    return "\n".join([
        "",
        '<div class="mitte">',
        '  <div class="einladen winkel">',
        '    <p><span data-t="footer_ref_before"></span> <code translate="no">%s</code>'
        ' <span data-t="footer_ref_after"></span></p>' % REFERRAL_CODE,
        '    <p data-t="footer_ref_pass"></p>',
        '    <div class="knopfreihe">',
        '      <a class="knopf" href="%s" data-t="footer_ref_button"></a>' % REFERRAL_LINK,
        '      <button type="button" class="knopf" id="ref-teilen" data-code="%s"'
        ' data-link="%s" data-t="footer_ref_share"></button>' % (REFERRAL_CODE, REFERRAL_LINK),
        "    </div>",
        '    <p class="ref-meldung" id="ref-meldung" aria-live="polite"></p>',
        '    <script src="assets/teilen.js?v=1"></script>',
        "  </div>",
        '  <div class="fuss-raster">',
        "    <div>",
        '      <p class="fuss-titel" data-t="app_name"></p>',
        '      <a href="%s" data-t="nav_train"></a>' % href("home", lang, lang),
        '      <a href="%s" data-t="nav_catalog"></a>' % href("catalog", lang, lang),
        '      <a href="%s" data-t="nav_thanks"></a>' % href("thanks", lang, lang),
        '      <a href="https://github.com/Xharig/VerseSpotter" data-t="footer_source"></a>',
        "    </div>",
        "    <div>",
        '      <p class="fuss-titel" data-t="footer_title_community"></p>',
        '      <a href="https://xharig.com/discord" translate="no">Discord</a>',
        '      <a href="%s" data-t="footer_join"></a>' % REFERRAL_LINK,
        "    </div>",
        "    <div>",
        '      <p class="fuss-titel" data-t="footer_title_more"></p>',
        '      <a href="%s" data-t="footer_all_tools"></a>' % EXTERNAL["xharig"][lang],
        '      <a href="%s" data-t="footer_versekit"></a>' % html.escape(EXTERNAL["versekit"][lang]),
        '      <a href="https://xharig.com/impressum.html" data-t="footer_imprint"></a>',
        '      <a href="https://xharig.com/datenschutz.html" data-t="footer_privacy"></a>',
        "    </div>",
        "  </div>",
        '  <div class="fuss-fan">',
        '    <img class="fankit" src="assets/made-by-the-community-240.png"'
        ' alt="Star Citizen: Made by the Community" width="120" height="120" loading="lazy">',
        '    <p class="fan" lang="en" data-t="footer_fan"></p>',
        "  </div>",
        '  <p class="recht"><span data-t="app_name"></span> v%s, GPL-3.0, '
        '<span data-t="footer_by"></span></p>' % APP_VERSION,
        "</div>",
        "",
    ])


# ---------- filling texts ----------

ELEMENT = re.compile(
    r'<(?P<tag>[a-z][a-z0-9]*)\b(?P<attr>[^>]*?\sdata-t="(?P<key>[^"]*)"[^>]*)>'
    r'(?P<body>.*?)</(?P=tag)>', re.DOTALL)
TAG_WITH_ATTR = re.compile(r'<[a-z][a-z0-9]*\b[^>]*\sdata-t-(?:%s)="[^"]*"[^>]*>' % "|".join(ATTRIBUTES))
BARE_AMP = re.compile(r"&(?![A-Za-z][A-Za-z0-9]*;|#[0-9]+;|#x[0-9a-fA-F]+;)")


def _text(texts, key, lang, where):
    entry = texts.get(key)
    if entry is None:
        raise BuildError("%s: key %r is missing in assets/texts.js" % (where, key))
    return entry[lang]


def fill(page_html, texts, lang, where):
    def element(m):
        if re.search(r"<%s\b" % m.group("tag"), m.group("body")):
            raise BuildError("%s: <%s data-t=%r> contains another <%s>"
                             % (where, m.group("tag"), m.group("key"), m.group("tag")))
        if "data-t=" in m.group("body"):
            raise BuildError("%s: data-t=%r contains another data-t element" % (where, m.group("key")))
        value = BARE_AMP.sub("&amp;", _text(texts, m.group("key"), lang, where))
        return "<%s%s>%s</%s>" % (m.group("tag"), m.group("attr"), value, m.group("tag"))

    def attributes(m):
        tag = m.group(0)
        for kind, key in re.findall(r'\sdata-t-(%s)="([^"]*)"' % "|".join(ATTRIBUTES), tag):
            name = ATTRIBUTES[kind]
            value = html.escape(_text(texts, key, lang, where))
            existing = re.compile(r'(?<=\s)%s="[^"]*"' % re.escape(name))
            if existing.search(tag):
                tag = existing.sub(lambda _m: '%s="%s"' % (name, value), tag, count=1)
            else:
                marker = 'data-t-%s="%s"' % (kind, key)
                tag = tag.replace(marker, '%s %s="%s"' % (marker, name, value), 1)
        return tag

    page_html = ELEMENT.sub(element, page_html)
    return TAG_WITH_ATTR.sub(attributes, page_html)


# ---------- one page ----------

def _replace(pattern, replacement, text, what, where, flags=0):
    new, n = re.subn(pattern, lambda _m: replacement, text, flags=flags)
    if n != 1:
        raise BuildError("%s: %s expected once, found %d times" % (where, what, n))
    return new


def render(source, name, lang, texts):
    page = PAGES[name][0]
    where = ("en/" if lang == "en" else "") + name
    out = source
    if SOURCE_NOTE.format(name=name) not in out:
        raise BuildError("%s: note after <!DOCTYPE html> is missing:\n%s" % (name, SOURCE_NOTE.format(name=name)))
    if 'data-page="%s"' % page not in out:
        raise BuildError('%s: <body data-page="%s"> expected' % (name, page))
    out = _replace(r'<html lang="[a-z]+">', '<html lang="%s">' % lang, out, "<html lang>", where)
    out = _replace(r"<!-- head:begin.*?<!-- head:end -->", head_block(page, lang, texts),
                   out, "head block", where, re.DOTALL)
    out = _replace(r'(?<=<header id="kopf" class="kopfleiste">).*?(?=</header>)', header(page, lang),
                   out, '<header id="kopf" class="kopfleiste">', where, re.DOTALL)
    out = _replace(r'(?<=<footer id="fuss">).*?(?=</footer>)', footer(lang),
                   out, '<footer id="fuss">', where, re.DOTALL)
    out = fill(out, texts, lang, where)
    if lang == "en":
        out = out.replace(SOURCE_NOTE.format(name=name), GENERATED_NOTE.format(name=name), 1)
        out = re.sub(r'\b(src|href)="(assets/|img/|data/)', r'\1="../\2', out)
    return out


def check_links(page_html, lang, where, generated):
    """Every relative src/href must point to an existing or generated file."""
    folder = os.path.join(ROOT, "en") if lang == "en" else ROOT
    generated = {os.path.join(ROOT, rel) for rel in generated}
    missing = []
    for link in re.findall(r'\b(?:src|href)="([^"]*)"', page_html):
        if re.match(r"(?:[a-z]+:|#|$)", link):
            continue
        path = os.path.normpath(os.path.join(folder, link.split("?")[0].split("#")[0]))
        if link.split("?")[0].endswith("/"):
            path = os.path.join(path, "index.html")
        if not path.startswith(ROOT + os.sep) or not (path in generated or os.path.exists(path)):
            missing.append(link)
    if missing:
        raise BuildError("%s: links to missing files: %s" % (where, ", ".join(sorted(set(missing)))))


def sitemap():
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
             '        xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for name, (page, _, _) in PAGES.items():
        for lang in LANGS:
            lines += ["  <url>",
                      "    <loc>%s</loc>" % url(page, lang),
                      '    <xhtml:link rel="alternate" hreflang="de" href="%s"/>' % url(page, "de"),
                      '    <xhtml:link rel="alternate" hreflang="en" href="%s"/>' % url(page, "en"),
                      '    <xhtml:link rel="alternate" hreflang="x-default" href="%s"/>' % url(page, "en"),
                      "  </url>"]
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def build():
    """Returns {relative path: content} for every generated file."""
    texts = read_texts(os.path.join(ROOT, "assets", "texts.js"))
    files = {}
    for name in PAGES:
        with open(os.path.join(ROOT, name), encoding="utf-8") as f:
            source = f.read()
        files[name] = render(source, name, "de", texts)
        files["en/" + name] = render(source, name, "en", texts)
    for rel, content in files.items():
        check_links(content, "en" if rel.startswith("en/") else "de", rel, files)
    files["sitemap.xml"] = sitemap()
    return files


def main(argv):
    try:
        files = build()
    except BuildError as e:
        print("build_pages: " + str(e))
        return 1

    if "--pruefen" in argv:
        outdated = []
        for rel, content in files.items():
            try:
                with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
                    current = f.read()
            except OSError:
                current = None
            if current != content:
                outdated.append(rel)
        if outdated:
            print("outdated: %s — run python3 tools/build_pages.py" % ", ".join(outdated))
            return 1
        print("all %d files are up to date" % len(files))
        return 0

    for rel, content in files.items():
        path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        try:
            with open(path, encoding="utf-8") as f:
                if f.read() == content:
                    continue
        except OSError:
            pass
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(content)
        print("written: " + rel)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
