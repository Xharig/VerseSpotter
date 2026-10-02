# SPDX-License-Identifier: GPL-3.0-only
"""Nimmt Bilder aus dem Spiel (HUD oder Silhouette) in den Trainer auf.

Eingabe ist eine Liste (CSV, Trennzeichen ;) mit den Spalten
    datei;schiff;art;sammler;ausschnitt
oder ein JSON-Export eines Discord-Kanals (DiscordChatExporter, Format JSON):
dort steht in jeder Nachricht in Zeile 1 der Schiffsname, in Zeile 2 die
Bildart, die Bilder hängen an.

- schiff:      Schiffsname (z. B. „Constellation Andromeda") oder nur die
               Familie („Constellation"), wenn die Variante unbekannt ist
- art:         hud oder silhouette (auch „HUD", „Silhouette von unten" …)
- sammler:     Anzeigename für die Danke-Seite, leer = keine Nennung
- ausschnitt:  optional, Prozent vom Bild: links,oben,breite,hoehe
               (z. B. 0,30,100,70 schneidet die oberen 30 % weg)

Jedes Bild wird zugeschnitten, mittig auf ein dunkles Quadrat (800 × 800)
gesetzt, ohne Metadaten als WebP gespeichert und in data/photos.json
eingetragen. Schon aufgenommene Bilder (gleiche Prüfsumme) werden
übersprungen. Ohne --write wird nur angezeigt, was passieren würde.

Aufruf:
    python tools/add_photos.py liste.csv [--write]
    python tools/add_photos.py export.json --discord [--write]
"""

import argparse
import csv
import difflib
import hashlib
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHIPS_FILE = ROOT / "data" / "ships.json"
PHOTOS_FILE = ROOT / "data" / "photos.json"
SIZE = 800
BACKGROUND = (6, 8, 11)
KINDS = {"hud": "hud", "silhouette": "silhouette", "silhouet": "silhouette", "flug": "silhouette"}


def load_ships():
    ships = json.loads(SHIPS_FILE.read_text(encoding="utf-8"))["ships"]
    return ships, {s["family"].lower(): s["family"] for s in ships}


def load_photos():
    if PHOTOS_FILE.exists():
        return json.loads(PHOTOS_FILE.read_text(encoding="utf-8"))
    return {"photos": []}


def norm(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


def resolve_ship(name, ships, families):
    """Gibt (ship_id, family) zurück. Exakter Name vor Familie vor ähnlichem
    Namen; bei Zweifel None."""
    key = norm(name)
    for s in ships:
        if norm(s["name"]) == key:
            return s["id"], s["family"]
    for fam_key, fam in families.items():
        if norm(fam_key) == key:
            return None, fam
    names = {norm(s["name"]): s for s in ships}
    close = difflib.get_close_matches(key, names.keys(), n=2, cutoff=0.85)
    if len(close) == 1:
        s = names[close[0]]
        return s["id"], s["family"]
    return None, None


def resolve_kind(text):
    t = (text or "").strip().lower()
    for prefix, kind in KINDS.items():
        if t.startswith(prefix):
            return kind
    return None


def parse_crop(text):
    if not text or not text.strip():
        return None
    parts = [float(p) for p in text.replace(" ", "").split(",")]
    if len(parts) != 4:
        raise ValueError(f"Ausschnitt braucht vier Zahlen: {text}")
    return parts


def rows_from_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f, delimiter=";"):
            yield {
                "file": (path.parent / row["datei"].strip()).resolve(),
                "ship": row["schiff"].strip(),
                "kind": row["art"].strip(),
                "author": (row.get("sammler") or "").strip(),
                "crop": (row.get("ausschnitt") or "").strip(),
            }


def rows_from_discord(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    for msg in data.get("messages", []):
        lines = [l.strip() for l in (msg.get("content") or "").splitlines() if l.strip()]
        images = [a for a in msg.get("attachments", []) if re.search(r"\.(png|jpe?g|webp)$", a.get("fileName", ""), re.I)]
        if not lines or not images:
            continue
        author = (msg.get("author") or {}).get("nickname") or (msg.get("author") or {}).get("name") or ""
        for a in images:
            yield {
                "file": (path.parent / a["url"]).resolve() if not a["url"].startswith("http") else None,
                "ship": lines[0].replace("❓", "").strip(),
                "kind": lines[1] if len(lines) > 1 else "",
                "author": author,
                "crop": "",
                "unsure": "❓" in (msg.get("content") or ""),
            }


def prepare(src, crop):
    img = Image.open(src)
    img.load()
    img = img.convert("RGB")
    if crop:
        left, top, width, height = crop
        box = (
            round(img.width * left / 100),
            round(img.height * top / 100),
            round(img.width * (left + width) / 100),
            round(img.height * (top + height) / 100),
        )
        img = img.crop(box)
    scale = min(SIZE / img.width, SIZE / img.height)
    resized = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGB", (SIZE, SIZE), BACKGROUND)
    canvas.paste(resized, ((SIZE - resized.width) // 2, (SIZE - resized.height) // 2))
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path)
    ap.add_argument("--discord", action="store_true", help="Quelle ist ein Discord-JSON-Export")
    ap.add_argument("--write", action="store_true", help="wirklich speichern")
    args = ap.parse_args()

    ships, families = load_ships()
    store = load_photos()
    known = {p.get("sha1") for p in store["photos"]}
    rows = rows_from_discord(args.source) if args.discord else rows_from_csv(args.source)

    added, problems = 0, []
    for row in rows:
        label = f"{row['file'].name if row['file'] else '?'} ({row['ship']})"
        if row.get("unsure"):
            problems.append(f"{label}: mit ❓ markiert — übersprungen")
            continue
        if not row["file"] or not row["file"].exists():
            problems.append(f"{label}: Datei fehlt")
            continue
        ship_id, family = resolve_ship(row["ship"], ships, families)
        if not family:
            problems.append(f"{label}: Schiff unbekannt")
            continue
        kind = resolve_kind(row["kind"])
        if not kind:
            problems.append(f"{label}: Bildart unklar ('{row['kind']}')")
            continue
        sha1 = hashlib.sha1(row["file"].read_bytes()).hexdigest()
        if sha1 in known:
            continue
        crop = parse_crop(row["crop"])
        base = ship_id or norm(family)
        n = 1 + sum(1 for p in store["photos"] if p["id"].startswith(f"{kind}-{base}-"))
        photo_id = f"{kind}-{base}-{n}"
        target = ROOT / "img" / kind / f"{photo_id}.webp"
        print(f"+ {photo_id}  ←  {label}  [{family}{' / ' + ship_id if ship_id else ''}]")
        if args.write:
            target.parent.mkdir(parents=True, exist_ok=True)
            prepare(row["file"], crop).save(target, "WEBP", quality=82, method=6)
            entry = {"id": photo_id, "kind": kind, "file": f"img/{kind}/{photo_id}.webp", "author": row["author"], "sha1": sha1}
            if ship_id:
                entry["ship"] = ship_id
            else:
                entry["family"] = family
            store["photos"].append(entry)
            known.add(sha1)
        added += 1

    if args.write and added:
        store["photos"].sort(key=lambda p: p["id"])
        PHOTOS_FILE.write_text(json.dumps(store, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{added} Bild(er) {'aufgenommen' if args.write else 'würden aufgenommen'}")
    for p in problems:
        print("  ! " + p, file=sys.stderr)


if __name__ == "__main__":
    main()
