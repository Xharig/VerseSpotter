// SPDX-License-Identifier: GPL-3.0-only
// Lädt Schiffsliste und Bilder und baut daraus die Familien, nach denen im
// Training gefragt wird.

const MIN_FAMILIES_PER_MODE = 20;

async function loadJson(url) {
  const resp = await fetch(url, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(url + ': ' + resp.status);
  return resp.json();
}

async function loadData() {
  const [shipData, photoData] = await Promise.all([
    loadJson('data/ships.json'),
    loadJson('data/photos.json'),
  ]);
  const ships = shipData.ships;
  const shipById = new Map(ships.map(s => [s.id, s]));
  // Ein Bild gehört zu einem Schiff (ship) oder, bei unbekannter Variante,
  // nur zu einer Familie (family).
  const familyNames = new Set(ships.map(s => s.family));
  const photos = (photoData.photos || [])
    .map(p => Object.assign({}, p, { familyName: p.ship && shipById.has(p.ship) ? shipById.get(p.ship).family : p.family }))
    .filter(p => familyNames.has(p.familyName));

  const families = new Map();
  for (const s of ships) {
    if (!families.has(s.family)) {
      families.set(s.family, { name: s.family, ships: [], images: { beginner: [], hud: [], silhouette: [] } });
    }
    const fam = families.get(s.family);
    fam.ships.push(s);
    if (s.has_catalog_image) {
      fam.images.beginner.push({ id: 'catalog:' + s.id, src: `img/catalog/${s.id}.webp`, ship: s.id, kind: 'beginner' });
    }
  }
  for (const p of photos) {
    const fam = families.get(p.familyName);
    if (!fam.images[p.kind]) continue;
    fam.images[p.kind].push({ id: p.id, src: p.file, ship: p.ship || null, kind: p.kind, author: p.author || '' });
  }

  // Kennwerte je Familie für die Ähnlichkeit: häufigste Größe, Rolle und
  // Hersteller, mittlere Länge.
  for (const fam of families.values()) {
    const most = key => {
      const count = new Map();
      for (const s of fam.ships) count.set(key(s), (count.get(key(s)) || 0) + 1);
      return [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
    };
    fam.size = most(s => s.size_class);
    fam.career = most(s => s.career.en);
    fam.manufacturer = most(s => s.manufacturer_code);
    fam.length = fam.ships.reduce((a, s) => a + (s.length || 0), 0) / fam.ships.length;
  }

  return { ships, shipById, photos, families, gameVersion: shipData.game_version };
}

function familiesWithImages(data, kinds) {
  return [...data.families.values()].filter(f => kinds.some(k => f.images[k].length > 0));
}

const MODE_KINDS = {
  mixed: ['hud', 'silhouette'],
  hud: ['hud'],
  silhouette: ['silhouette'],
  beginner: ['beginner'],
};
