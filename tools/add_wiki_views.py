# SPDX-License-Identifier: GPL-3.0-only
"""Macht aus den Schiffsansichten des Star Citizen Wiki Umriss- und Distanzbilder.

Das Wiki (starcitizen.tools) hat zu vielen Schiffen einen festen Satz von
Fotos aus dem Spiel: "<Schiff> in space - Above/Below/Port/Front/Rear/
Isometric.jpg", das Schiff frei vor dem Sternenhimmel. Die Fotos stehen unter
CC BY-SA 4.0, deshalb werden nur Dateien mit dieser Lizenz und einem
Urheber genommen.

Aus jedem Foto entstehen zwei Bilder (800 × 800, WebP):
- outline:  das Schiff als flache Fläche (Umriss)
- distance: das Schiff klein auf schwarzem Himmel (Distanz)

Das Schiff wird über die Helligkeit vom Himmel getrennt. Fotos, bei denen das
nicht sauber klappt (mehrere Teile, Schiff am Bildrand, zu klein oder zu
groß), werden verworfen. Je Familie höchstens --per-family Fotos.

- tools/wiki_names.json:      Schiffe, die im Wiki anders heißen
- tools/wiki_views_skip.json: Ansichten, die am Übersichtsbogen durchfielen

Heruntergeladene Fotos landen im Zwischenspeicher eingang/wiki-cache/ (nicht
im Repo). Ohne --write wird nur angezeigt, was passieren würde.

Aufruf:
    python tools/add_wiki_views.py [--families Gladius,Arrow] [--montage bogen.png] [--write]

Braucht: Pillow, NumPy, SciPy
"""

import argparse
import hashlib
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SHIPS_FILE = ROOT / "data" / "ships.json"
PHOTOS_FILE = ROOT / "data" / "photos.json"
NAMES_FILE = ROOT / "tools" / "wiki_names.json"
SKIP_FILE = ROOT / "tools" / "wiki_views_skip.json"
CACHE = ROOT / "eingang" / "wiki-cache"
API = "https://starcitizen.tools/api.php"
UA = {"User-Agent": "VerseSpotter/1.0 (https://versespotter.xharig.com)"}

VIEWS = ["Port", "Above", "Below", "Isometric", "Front", "Rear"]
FETCH_WIDTH = 1200
SIZE = 800
BG = (6, 8, 11)
OUTLINE_FILL = (122, 134, 142)
THRESHOLD = 40
DISTANCE_SHARE = (0.16, 0.26)


def api(params):
    params = dict(params, format="json")
    url = API + "?" + urllib.parse.urlencode(params)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return json.loads(r.read())
        except OSError:
            if attempt == 2:
                raise
            time.sleep(2)
    return {}


def download(url, target):
    if target.exists():
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        target.write_bytes(r.read())
    time.sleep(0.3)


def plain(text):
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def wiki_files_any(names):
    """Ansichten unter dem ersten Wiki-Namen, für den es welche gibt."""
    for name in names:
        files = wiki_files(name)
        if files:
            return files
    return {}


def wiki_files(ship_name):
    """Ansichten eines Schiffs: {Ansicht: {title, url, author, licence, page}}."""
    prefix = f"{ship_name} in space - "
    found = api({"action": "query", "list": "allimages", "aiprefix": prefix, "ailimit": 50})
    titles = [i["title"] for i in found.get("query", {}).get("allimages", [])]
    wanted = {}
    for title in titles:
        view = title[len("File:" + prefix):].rsplit(".", 1)[0]
        if view in VIEWS:
            wanted[view] = title
    if not wanted:
        return {}
    info = api({"action": "query", "titles": "|".join(wanted.values()), "prop": "imageinfo",
                "iiprop": "url|extmetadata", "iiurlwidth": FETCH_WIDTH})
    by_title = {p["title"]: p for p in info.get("query", {}).get("pages", {}).values()}
    result = {}
    for view, title in wanted.items():
        page = by_title.get(title, {})
        ii = (page.get("imageinfo") or [{}])[0]
        meta = ii.get("extmetadata", {})
        licence = plain(meta.get("LicenseShortName", {}).get("value", ""))
        author = plain(meta.get("Artist", {}).get("value", ""))
        if not re.search(r"CC BY[- ]SA", licence, re.I) or not author or not ii.get("thumburl"):
            continue
        result[view] = {
            "title": title, "url": ii["thumburl"], "author": author,
            "licence": "CC BY-SA 4.0", "page": ii.get("descriptionurl", ""),
        }
    return result


def ship_mask(img):
    """Fläche des Schiffs oder (None, Grund)."""
    a = np.asarray(img.filter(ImageFilter.MedianFilter(7))).max(axis=2)
    m = a > THRESHOLD
    labels, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n == 0:
        return None, "leer"
    sizes = ndimage.sum(m, labels, range(1, n + 1))
    m = np.isin(labels, np.nonzero(sizes >= sizes.max() * 0.01)[0] + 1)
    m = ndimage.binary_closing(m, structure=np.ones((5, 5)), iterations=2)
    m = ndimage.binary_fill_holes(m)
    m = ndimage.binary_opening(m, structure=np.ones((3, 3)))

    labels, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n == 0:
        return None, "leer"
    sizes = ndimage.sum(m, labels, range(1, n + 1))
    if (sizes >= sizes.max() * 0.03).sum() > 1:
        return None, "mehrere Teile"
    m = labels == (int(np.argmax(sizes)) + 1)
    if m[:4].any() or m[-4:].any() or m[:, :4].any() or m[:, -4:].any():
        return None, "am Bildrand"
    share = m.mean()
    if share < 0.01:
        return None, "zu klein"
    if share > 0.6:
        return None, "zu groß"
    return m, ""


def crop_box(mask):
    ys, xs = np.nonzero(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def make_outline(mask):
    x0, y0, x1, y1 = crop_box(mask)
    sil = Image.fromarray((mask[y0:y1, x0:x1] * 255).astype(np.uint8))
    scale = SIZE * 0.86 / max(sil.size)
    sil = sil.resize((max(1, round(sil.width * scale)), max(1, round(sil.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGB", (SIZE, SIZE), BG)
    canvas.paste(Image.new("RGB", sil.size, OUTLINE_FILL),
                 ((SIZE - sil.width) // 2, (SIZE - sil.height) // 2), sil)
    return canvas


def starfield(rng):
    canvas = Image.new("RGB", (SIZE, SIZE), BG)
    draw = ImageDraw.Draw(canvas)
    for _ in range(260):
        x, y = rng.integers(0, SIZE, 2)
        v = int(rng.integers(40, 170))
        draw.point((int(x), int(y)), fill=(v, v, min(255, v + 15)))
    return canvas


def make_distance(img, mask, seed):
    rng = np.random.default_rng(seed)
    x0, y0, x1, y1 = crop_box(mask)
    ship = img.crop((x0, y0, x1, y1))
    alpha = Image.fromarray((mask[y0:y1, x0:x1] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    share = rng.uniform(*DISTANCE_SHARE)
    scale = SIZE * share / max(ship.size)
    size = (max(1, round(ship.width * scale)), max(1, round(ship.height * scale)))
    ship = ship.resize(size, Image.LANCZOS)
    alpha = alpha.resize(size, Image.LANCZOS)
    canvas = starfield(rng)
    span_x = SIZE - size[0]
    span_y = SIZE - size[1]
    x = int(span_x * rng.uniform(0.3, 0.7))
    y = int(span_y * rng.uniform(0.3, 0.7))
    canvas.paste(ship, (x, y), alpha)
    return canvas


def families_of(ships):
    fams = {}
    for s in ships:
        fams.setdefault(s["family"], []).append(s)
    for members in fams.values():
        members.sort(key=lambda s: (len(s["name"]), s["name"]))
    return fams


def save_webp(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=80, method=6)
    return hashlib.sha1(path.read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--families", help="nur diese Familien, durch Komma getrennt")
    ap.add_argument("--per-family", type=int, default=4)
    ap.add_argument("--montage", help="Übersichtsbogen aller Ergebnisse als PNG schreiben")
    ap.add_argument("--write", action="store_true", help="Bilder speichern und data/photos.json ergänzen")
    ap.add_argument("--rebuild", action="store_true",
                    help="alle Wiki-Bilder verwerfen und neu erzeugen (nur mit --write)")
    args = ap.parse_args()

    ships = json.loads(SHIPS_FILE.read_text(encoding="utf-8"))["ships"]
    photos_doc = json.loads(PHOTOS_FILE.read_text(encoding="utf-8"))
    photos = photos_doc.setdefault("photos", [])
    if args.rebuild and args.write:
        for p in photos:
            if p.get("source") == "starcitizen.tools":
                (ROOT / p["file"]).unlink(missing_ok=True)
        photos[:] = [p for p in photos if p.get("source") != "starcitizen.tools"]
    known = {p["id"] for p in photos}
    aliases = {k: v for k, v in json.loads(NAMES_FILE.read_text(encoding="utf-8")).items() if not k.startswith("_")}
    skip = set(json.loads(SKIP_FILE.read_text(encoding="utf-8"))["skip"])

    fams = families_of(ships)
    if args.families:
        wanted = [f.strip() for f in args.families.split(",")]
        missing = [f for f in wanted if f not in fams]
        if missing:
            sys.exit("Unbekannte Familie: " + ", ".join(missing))
        fams = {f: fams[f] for f in wanted}

    sheet = []
    covered = 0
    added = 0
    for fam_name, members in sorted(fams.items()):
        taken = 0
        notes = []
        for ship in members:
            if taken >= args.per_family:
                break
            files = wiki_files_any(aliases.get(ship["name"], [ship["name"]]))
            for view in VIEWS:
                if taken >= args.per_family or view not in files:
                    continue
                f = files[view]
                base = f"{ship['id']}-{view.lower()}"
                if base in skip:
                    continue
                if f"outline-{base}" in known:
                    taken += 1
                    continue
                src = CACHE / f"{base}.jpg"
                download(f["url"], src)
                img = Image.open(src).convert("RGB")
                mask, why = ship_mask(img)
                if mask is None:
                    notes.append(f"{ship['name']}/{view}: {why}")
                    continue
                outline = make_outline(mask)
                distance = make_distance(img, mask, int(hashlib.sha1(base.encode()).hexdigest()[:8], 16))
                sheet.append((base, outline, distance))
                taken += 1
                if args.write:
                    for kind, pic in (("outline", outline), ("distance", distance)):
                        pid = f"{kind}-{base}"
                        rel = f"img/{kind}/{pid}.webp"
                        sha1 = save_webp(pic, ROOT / rel)
                        photos.append({
                            "id": pid, "kind": kind, "file": rel, "author": f["author"],
                            "source": "starcitizen.tools", "source_url": f["page"],
                            "licence": f["licence"], "sha1": sha1, "ship": ship["id"],
                        })
                        known.add(pid)
                    added += 1
        if taken:
            covered += 1
        print("  " + " ".join(label for label, _o, _d in sheet if label.startswith(tuple(s["id"] + "-" for s in members))))
        status = f"{taken} Bild(er)" if taken else "keine"
        print(f"{fam_name:28} {status}" + (f"   verworfen: {'; '.join(notes)}" if notes else ""))

    print(f"\n{covered} von {len(fams)} Familien mit Bildern, {len(sheet)} Fotos brauchbar")
    if args.write:
        PHOTOS_FILE.write_text(json.dumps(photos_doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"{added} Fotos aufgenommen (je ein Umriss- und ein Distanzbild)")
    else:
        print("Probelauf — nichts gespeichert (mit --write speichern)")

    if args.montage and sheet:
        # Nur Umrisse, beschriftet mit dem Schlüssel für die Sperrliste, 40 je Seite.
        cell, cols, per_page = 240, 5, 40
        stem = Path(args.montage)
        for page, start in enumerate(range(0, len(sheet), per_page), 1):
            tiles = sheet[start:start + per_page]
            rows = (len(tiles) + cols - 1) // cols
            bogen = Image.new("RGB", (cols * cell, rows * (cell + 20)), (30, 30, 30))
            draw = ImageDraw.Draw(bogen)
            for i, (label, outline, _distance) in enumerate(tiles):
                x, y = (i % cols) * cell, (i // cols) * (cell + 20)
                bogen.paste(outline.resize((cell, cell)), (x, y + 20))
                draw.text((x + 4, y + 4), label[:38], fill=(230, 230, 230))
            out = stem.with_name(f"{stem.stem}-{page}{stem.suffix}")
            bogen.save(out)
            print("Bogen:", out)


if __name__ == "__main__":
    main()
