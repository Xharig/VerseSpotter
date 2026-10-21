// Count the collectors from the released images, most images first. Wiki photos
// count separately, once per photo (outline and distance are made from it).
let collectors = [];
let photographers = [];
function ranked(photos) {
  const count = new Map();
  for (const p of photos) if (p.author) count.set(p.author, (count.get(p.author) || 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
function fillList(id, entries, label) {
  const list = document.getElementById(id);
  list.innerHTML = '';
  for (const [name, n] of entries) {
    const li = document.createElement('li');
    li.textContent = name;
    const count = document.createElement('span');
    count.textContent = label(n);
    li.appendChild(count);
    list.appendChild(li);
  }
}
function renderCollectors() {
  document.getElementById('sammler-leer').hidden = collectors.length > 0;
  fillList('sammler', collectors, n => n === 1 ? t('thanks_image_one') : t('thanks_images', { n }));
  fillList('wiki-fotografen', photographers, n => t('thanks_photos', { n }));
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  document.getElementById('lizenz-wiki').innerHTML =
    t('licence_wiki', { authors: photographers.map(([name]) => esc(name)).join(', ') || 'Wiki' });
}
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const photos = (await loadJson('data/photos.json')).photos || [];
    collectors = ranked(photos.filter(p => p.source !== 'starcitizen.tools'));
    photographers = ranked(photos.filter(p => p.source === 'starcitizen.tools' && p.kind === 'outline'));
  } catch (e) { collectors = []; photographers = []; }
  renderCollectors();
});
