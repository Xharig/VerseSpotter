// SPDX-License-Identifier: GPL-3.0-only
// Schiffskatalog: alle Schiffe mit Katalogbild, Suche, Größenfilter und
// Galerie der HUD- und Silhouettenbilder.

let catalogData = null;

const SIZE_ORDER = ['snub', 'small', 'medium', 'large', 'capital'];

function sizeKey(ship) {
  return (ship.size.en || '').toLowerCase();
}

function sizeLabel(key) {
  const ship = catalogData.ships.find(s => sizeKey(s) === key);
  return ship ? (ship.size[currentLang] || ship.size.en) : key;
}

function renderSizeFilter() {
  const select = document.getElementById('groesse');
  const keep = select.value;
  const present = new Set(catalogData.ships.map(sizeKey));
  const sizes = SIZE_ORDER.filter(k => present.has(k));
  select.innerHTML = `<option value="">${t('catalog_all_sizes')}</option>` +
    sizes.map(k => `<option value="${k}">${sizeLabel(k)}</option>`).join('');
  select.value = keep;
}

// Bilder des Schiffs selbst plus Bilder seiner Familie ohne bekannte Variante.
function photosOf(ship, kind) {
  return catalogData.photos.filter(p => p.kind === kind &&
    (p.ship === ship.id || (!p.ship && p.familyName === ship.family)));
}

function renderCatalog() {
  const query = document.getElementById('suche').value.trim().toLowerCase();
  const size = document.getElementById('groesse').value;
  const list = catalogData.ships.filter(s => {
    if (size && sizeKey(s) !== size) return false;
    if (!query) return true;
    return [s.name, s.family, s.manufacturer, s.role.de, s.role.en].join(' ').toLowerCase().includes(query);
  });

  document.getElementById('anzahl').textContent = t('catalog_count', { n: list.length });
  document.getElementById('leer').hidden = list.length > 0;
  const box = document.getElementById('katalog');
  box.innerHTML = '';
  for (const s of list) {
    const card = document.createElement('article');
    card.className = 'schiff';
    const role = s.role[currentLang] || s.role.en;
    card.innerHTML =
      '<div class="bildrahmen"></div>' +
      '<div class="info"><span class="familie"></span><h3></h3><span class="daten"></span><div class="mehr"></div></div>';
    const frame = card.querySelector('.bildrahmen');
    if (s.has_catalog_image) {
      const img = document.createElement('img');
      img.src = `img/catalog/${s.id}.webp`;
      img.alt = s.name;
      img.loading = 'lazy';
      img.width = 960;
      img.height = 540;
      frame.appendChild(img);
    } else {
      frame.innerHTML = `<span class="leer"><span class="ic ic-image-off" aria-hidden="true"></span> ${t('catalog_no_image')}</span>`;
    }
    card.querySelector('.familie').textContent = s.family;
    card.querySelector('h3').textContent = s.name;
    card.querySelector('.daten').textContent =
      [s.manufacturer, role, s.size[currentLang] || s.size.en, s.length ? t('catalog_length', { m: s.length }) : '']
        .filter(Boolean).join(' · ');
    const more = card.querySelector('.mehr');
    for (const kind of ['hud', 'silhouette']) {
      const photos = photosOf(s, kind);
      if (!photos.length) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span class="ic ic-${kind === 'hud' ? 'scan-eye' : 'plane'}" aria-hidden="true"></span>` +
        t('catalog_' + kind + '_images', { n: photos.length });
      b.addEventListener('click', () => openGallery(s, kind));
      more.appendChild(b);
    }
    box.appendChild(card);
  }
}

function openGallery(ship, kind) {
  const dlg = document.getElementById('dlg-galerie');
  document.getElementById('galerie-titel').textContent = t('catalog_gallery_' + kind, { name: ship.name });
  const box = document.getElementById('galerie');
  box.innerHTML = '';
  for (const p of photosOf(ship, kind)) {
    const fig = document.createElement('figure');
    fig.style.margin = '0';
    fig.innerHTML = '<div class="bildrahmen"><img alt=""><button type="button" class="melden"></button></div>';
    const img = fig.querySelector('img');
    img.src = p.file;
    img.alt = t('catalog_gallery_' + kind, { name: ship.name });
    if (p.author) {
      const by = document.createElement('span');
      by.className = 'urheber';
      by.textContent = t('photo_by', { name: p.author });
      fig.querySelector('.bildrahmen').appendChild(by);
    }
    const report = fig.querySelector('.melden');
    report.innerHTML = `<span class="ic ic-flag" aria-hidden="true"></span>${t('report_button')}`;
    report.addEventListener('click', () => openReportDialog(p.id));
    box.appendChild(fig);
  }
  dlg.showModal();
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('galerie-zu').addEventListener('click', () => document.getElementById('dlg-galerie').close());
  document.getElementById('suche').addEventListener('input', renderCatalog);
  document.getElementById('groesse').addEventListener('change', renderCatalog);
  try {
    catalogData = await loadData();
  } catch (e) {
    document.getElementById('ladefehler').hidden = false;
    return;
  }
  renderSizeFilter();
  renderCatalog();
  document.addEventListener('langchange', () => {
    renderSizeFilter();
    renderCatalog();
  });
});
