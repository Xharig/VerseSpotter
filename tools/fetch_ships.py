# SPDX-License-Identifier: GPL-3.0-only
"""Holt die Liste aller flugfähigen Raumschiffe aus der Star-Citizen-Wiki-API
und schreibt sie nach data/ships.json. Mit --images werden zusätzlich die
Katalogbilder geladen und als WebP unter img/catalog/ abgelegt: bevorzugt das
Wallpaper aus der RSI Ship Matrix, sonst das Bild aus dem Wiki.

Aufruf:  python tools/fetch_ships.py [--images] [--force]
"""

import argparse
import io
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "ships.json"
FAMILY_FILE = ROOT / "tools" / "families.json"
# Je slug: "wiki" (Wiki-Bild statt Ship Matrix), "none" (kein Katalogbild)
# oder eine eigene Bildadresse.
OVERRIDE_FILE = ROOT / "tools" / "image_overrides.json"
CATALOG_DIR = ROOT / "img" / "catalog"
API = "https://api.star-citizen.wiki/api/v2/vehicles"
SHIP_MATRIX = "https://robertsspaceindustries.com/ship-matrix/index"
MATRIX_IMAGE_KEY = "wallpaper_1920x1080"
USER_AGENT = "VerseSpotter (+https://versespotter.xharig.com)"
PAGE_SIZE = 50
CATALOG_WIDTH = 960


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 + attempt * 3)


def fetch_all():
    """Alle Seiten der Fahrzeugliste nacheinander abrufen."""
    page, out = 1, []
    while True:
        d = fetch_json(f"{API}?limit={PAGE_SIZE}&page={page}")
        out.extend(d["data"])
        if page >= d["meta"]["last_page"]:
            return out
        page += 1


def is_quiz_ship(v):
    """Nur Raumschiffe, die im Spiel fliegen — keine Bodenfahrzeuge, keine
    Gravlev-Bikes, keine Konzepte."""
    if not v.get("is_spaceship") or v.get("is_vehicle") or v.get("is_gravlev") or v.get("is_power_suit"):
        return False
    status = (v.get("production_status") or {}).get("en_EN") or ""
    return status.lower() == "flight-ready"


def load_families():
    base = {"by_slug": {}, "by_prefix": [], "exclude_name_patterns": [], "strip_name_prefixes": []}
    if FAMILY_FILE.exists():
        base.update(json.loads(FAMILY_FILE.read_text(encoding="utf-8")))
    return base


def display_name(v, families):
    name = v["name"].strip()
    for prefix in families["strip_name_prefixes"]:
        if name.startswith(prefix):
            name = name[len(prefix):]
    return name


def is_special_edition(name, families):
    """Lackier- und Sammlereditionen haben denselben Rumpf wie das Grundmodell."""
    return any(re.search(p, name) for p in families["exclude_name_patterns"])


def family_of(v, families):
    """Familie über die Zuordnungstabelle: erst exakt je slug, dann der
    längste passende Namensanfang, sonst das erste Wort des Namens."""
    slug = v["slug"]
    if slug in families["by_slug"]:
        return families["by_slug"][slug]
    name = display_name(v, families)
    best = None
    for prefix, fam in families["by_prefix"]:
        if name.lower().startswith(prefix.lower()) and (best is None or len(prefix) > len(best[0])):
            best = (prefix, fam)
    if best:
        return best[1]
    return name.split(" ")[0]


def name_key(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


def fetch_matrix_images():
    """Bildadressen aus der RSI Ship Matrix, geordnet nach vereinfachtem Namen."""
    try:
        d = fetch_json(SHIP_MATRIX)
    except Exception as exc:
        print(f"  ! Ship Matrix nicht erreichbar: {exc}", file=sys.stderr)
        return {}
    out = {}
    for s in d.get("data") or []:
        for media in s.get("media") or []:
            url = (media.get("images") or {}).get(MATRIX_IMAGE_KEY)
            if url:
                out[name_key(s.get("name") or "")] = url
                break
    return out


def matrix_image_for(v, name, matrix):
    """Sucht das Schiff unter seinem Anzeigenamen, dem Wiki-Namen und dem
    Namen mit Hersteller davor."""
    maker = (v.get("manufacturer") or {}).get("name") or ""
    for candidate in (name, v.get("name") or "", v.get("game_name") or "", f"{maker} {name}"):
        url = matrix.get(name_key(candidate))
        if url:
            return url
    return None


def pick_image(v):
    for img in v.get("images") or []:
        url = img.get("original_url") or img.get("thumbnail_url")
        if url:
            return url, img.get("source") or ""
    return None, ""


def localized(field):
    field = field or {}
    return {"de": field.get("de_DE") or field.get("en_EN") or "", "en": field.get("en_EN") or ""}


def load_overrides():
    if OVERRIDE_FILE.exists():
        return json.loads(OVERRIDE_FILE.read_text(encoding="utf-8"))
    return {}


def build_entry(v, families, matrix, overrides):
    focus = (v.get("foci") or [{}])[0]
    name = display_name(v, families)
    wiki_url, wiki_source = pick_image(v)
    override = overrides.get(v["slug"])
    if override == "none":
        image_url, image_source, wiki_url = None, "", None
    elif override == "wiki":
        image_url, image_source = wiki_url, wiki_source
    elif override:
        image_url, image_source = override, urllib.parse.urlparse(override).hostname or ""
    else:
        image_url = matrix_image_for(v, name, matrix)
        image_source = "robertsspaceindustries.com"
        if not image_url:
            image_url, image_source = wiki_url, wiki_source
    return {
        "id": v["slug"],
        "name": name,
        "family": family_of(v, families),
        "manufacturer": (v.get("manufacturer") or {}).get("name") or "",
        "manufacturer_code": (v.get("manufacturer") or {}).get("code") or "",
        "size_class": v.get("size_class") or 0,
        "size": localized(v.get("size")),
        "career": localized(v.get("type")),
        "role": {"de": focus.get("de_DE") or focus.get("en_EN") or "", "en": focus.get("en_EN") or ""},
        "length": (v.get("sizes") or {}).get("length") or 0,
        "image_url": image_url,
        "image_source": image_source,
        "fallback_url": wiki_url if image_url != wiki_url else None,
        "fallback_source": wiki_source,
    }


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                return resp.read()
        except urllib.error.HTTPError:
            raise
        except Exception:
            if attempt == 2:
                raise
            time.sleep(3 + attempt * 4)


def save_catalog_image(entry, force):
    """Lädt das Wiki-Bild, verkleinert es auf CATALOG_WIDTH und speichert es
    ohne Metadaten als WebP."""
    from PIL import Image

    target = CATALOG_DIR / f"{entry['id']}.webp"
    if not entry.get("image_url") and not entry.get("fallback_url"):
        target.unlink(missing_ok=True)
        return False
    if target.exists() and not force:
        return True
    raw = None
    for url_key, source_key in (("image_url", "image_source"), ("fallback_url", "fallback_source")):
        if not entry.get(url_key):
            continue
        try:
            raw = download(entry[url_key])
            entry["image_source"] = entry[source_key]
            break
        except Exception as exc:
            print(f"  ! Bild nicht ladbar: {entry['name']} ({entry[url_key]}): {exc}", file=sys.stderr)
    if raw is None:
        return target.exists()
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    if img.width > CATALOG_WIDTH:
        img = img.resize((CATALOG_WIDTH, round(img.height * CATALOG_WIDTH / img.width)), Image.LANCZOS)
    CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    img.save(target, "WEBP", quality=80, method=6)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--images", action="store_true", help="Katalogbilder laden")
    ap.add_argument("--force", action="store_true", help="vorhandene Bilder neu laden")
    args = ap.parse_args()

    families = load_families()
    raw = fetch_all()
    matrix = fetch_matrix_images()
    overrides = load_overrides()
    candidates = [build_entry(v, families, matrix, overrides) for v in raw if is_quiz_ship(v)]
    candidates = [s for s in candidates if not is_special_edition(s["name"], families)]

    # Gleicher Name unter mehreren Kennungen (Sondermodelle wie „-bis2950",
    # „-collector-…"): das Grundmodell mit der kürzesten Kennung behalten.
    by_name = {}
    for s in candidates:
        kept = by_name.get(s["name"])
        if kept is None or len(s["id"]) < len(kept["id"]):
            by_name[s["name"]] = s
    ships = sorted(by_name.values(), key=lambda s: (s["family"].lower(), s["name"].lower()))

    if args.images:
        for s in ships:
            s["has_catalog_image"] = save_catalog_image(s, args.force)
    else:
        for s in ships:
            s["has_catalog_image"] = (CATALOG_DIR / f"{s['id']}.webp").exists()

    for s in ships:
        for key in ("image_url", "fallback_url", "fallback_source"):
            s.pop(key, None)

    version = next((v.get("version") for v in raw if v.get("version")), "")
    out = {"game_version": version, "ships": ships}
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    families_count = len({s["family"] for s in ships})
    print(f"{len(ships)} Schiffe in {families_count} Familien, Spielstand {version}")
    from_wiki = [s["name"] for s in ships if s["image_source"] != "robertsspaceindustries.com"]
    print(f"Bild aus dem Wiki statt der Ship Matrix ({len(from_wiki)}): {', '.join(from_wiki)}")


if __name__ == "__main__":
    main()
