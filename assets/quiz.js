// SPDX-License-Identifier: GPL-3.0-only
// Training: Auswahl der Fragen nach Karteikasten (5 Fächer je Familie und
// Bildart), zwei ähnliche falsche Antworten, Auswertung und Kopiertext.

const LENGTHS = [10, 20, 30, 40];
const DEFAULT_LENGTH = 20;
const COMBAT_SECONDS = 5;
const MODES = ['beginner', 'silhouette', 'mixed', 'hud'];
const MODE_ICONS = { mixed: 'crosshair', hud: 'scan-eye', silhouette: 'plane', beginner: 'graduation-cap' };
const PROGRESS_KEY = 'versespotter.progress';
const SETTINGS_KEY = 'versespotter.settings';
const BOX_WEIGHT = { 1: 16, 2: 8, 3: 4, 4: 2, 5: 1 };
const MASTERED_BOX = 5;
const SITE_URL = 'versespotter.xharig.com';

let data = null;
let run = null;
let timer = null;

// ---------- Speicher ----------

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ohne Speicher kein Lernstand */ }
}

function progressKey(kind, family) {
  return kind + ':' + family;
}

function boxOf(progress, kind, family) {
  const p = progress[progressKey(kind, family)];
  return p ? p.box : 1;
}

// ---------- Auswahl ----------

function weightedPick(items, weightOf) {
  const total = items.reduce((a, it) => a + weightOf(it), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= weightOf(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function similarity(a, b) {
  let score = 0;
  const sizeGap = Math.abs(a.size - b.size);
  score += sizeGap === 0 ? 4 : sizeGap === 1 ? 2 : 0;
  if (a.career === b.career) score += 2;
  if (a.manufacturer === b.manufacturer) score += 1.5;
  const longer = Math.max(a.length, b.length) || 1;
  score += 2 * (1 - Math.min(1, Math.abs(a.length - b.length) / longer));
  return score;
}

// Je höher das Fach, desto weiter vorn in der Ähnlichkeitsliste wird gesucht.
const DISTRACTOR_WINDOW = { 1: [0.45, 1.0], 2: [0.25, 0.6], 3: [0.1, 0.35], 4: [0.03, 0.18], 5: [0, 0.08] };

function pickDistractors(family, pool, box) {
  const others = pool.filter(f => f.name !== family.name)
    .map(f => ({ f, s: similarity(family, f) + Math.random() * 0.3 }))
    .sort((x, y) => y.s - x.s)
    .map(x => x.f);
  const [from, to] = DISTRACTOR_WINDOW[box] || DISTRACTOR_WINDOW[1];
  let start = Math.floor(from * others.length);
  let end = Math.max(start + 2, Math.ceil(to * others.length));
  end = Math.min(end, others.length);
  start = Math.min(start, Math.max(0, end - 2));
  return shuffle(others.slice(start, end)).slice(0, 2);
}

function buildQuestions(mode, length) {
  const kinds = MODE_KINDS[mode];
  const progress = readStore(PROGRESS_KEY, {});
  // Ein Eintrag je Familie und Bildart mit Bildern.
  const candidates = [];
  for (const fam of data.families.values()) {
    for (const kind of kinds) {
      if (fam.images[kind].length) candidates.push({ fam, kind, box: boxOf(progress, kind, fam.name) });
    }
  }
  const chosen = [];
  const usedFamilies = new Set();
  let pool = candidates.slice();
  while (chosen.length < length && candidates.length) {
    if (!pool.length) pool = candidates.slice();
    const fresh = pool.filter(c => !usedFamilies.has(c.fam.name));
    const from = fresh.length ? fresh : pool;
    const pick = weightedPick(from, c => BOX_WEIGHT[c.box] || 1);
    pool = pool.filter(c => c !== pick);
    usedFamilies.add(pick.fam.name);
    chosen.push(pick);
  }
  // Falsche Antworten kommen aus allen Familien, auch aus solchen ohne Bild
  // in dieser Bildart.
  const answerPool = [...data.families.values()];
  return shuffle(chosen).map(c => {
    const image = c.fam.images[c.kind][Math.floor(Math.random() * c.fam.images[c.kind].length)];
    const options = shuffle([c.fam, ...pickDistractors(c.fam, answerPool, c.box)]);
    return { family: c.fam, kind: c.kind, image, options, chosen: null, correct: null };
  });
}

// ---------- Start ----------

function settings() {
  return Object.assign({ mode: 'mixed', length: DEFAULT_LENGTH, combat: false }, readStore(SETTINGS_KEY, {}));
}

function modeAvailable(mode) {
  if (mode === 'beginner') return familiesWithImages(data, ['beginner']).length >= 2;
  return familiesWithImages(data, MODE_KINDS[mode]).length >= MIN_FAMILIES_PER_MODE;
}

function renderSetup() {
  const s = settings();
  if (!modeAvailable(s.mode)) s.mode = MODES.find(modeAvailable) || 'beginner';

  const modes = document.getElementById('modi');
  modes.innerHTML = '';
  for (const mode of MODES) {
    const ok = modeAvailable(mode);
    const n = familiesWithImages(data, MODE_KINDS[mode]).length;
    const hint = ok ? t('mode_' + mode + '_hint') : t('mode_locked', { n, min: MIN_FAMILIES_PER_MODE });
    modes.insertAdjacentHTML('beforeend',
      `<div class="option"><input type="radio" name="modus" id="modus-${mode}" value="${mode}"` +
      `${mode === s.mode ? ' checked' : ''}${ok ? '' : ' disabled'}>` +
      `<label for="modus-${mode}"><span class="titel"><span class="ic ic-${MODE_ICONS[mode]}" aria-hidden="true"></span>` +
      `${t('mode_' + mode)}</span><span class="klein">${hint}</span></label></div>`);
  }

  const lengths = document.getElementById('laengen');
  lengths.innerHTML = '';
  for (const n of LENGTHS) {
    lengths.insertAdjacentHTML('beforeend',
      `<div class="option"><input type="radio" name="laenge" id="laenge-${n}" value="${n}"${n === s.length ? ' checked' : ''}>` +
      `<label for="laenge-${n}">${n}</label></div>`);
  }

  document.getElementById('gefecht').checked = !!s.combat;
  document.getElementById('gefecht-hinweis').textContent = t('combat_hint', { s: COMBAT_SECONDS });
  modes.querySelectorAll('input').forEach(i => i.addEventListener('change', renderProgress));
  renderProgress();
}

function selectedMode() {
  const el = document.querySelector('input[name=modus]:checked');
  return el ? el.value : 'beginner';
}

function renderProgress() {
  const mode = selectedMode();
  const kinds = MODE_KINDS[mode];
  const progress = readStore(PROGRESS_KEY, {});
  let total = 0;
  let mastered = 0;
  for (const fam of data.families.values()) {
    for (const kind of kinds) {
      if (!fam.images[kind].length) continue;
      total++;
      if (boxOf(progress, kind, fam.name) >= MASTERED_BOX) mastered++;
    }
  }
  const pct = total ? Math.round(mastered / total * 100) : 0;
  document.getElementById('fortschritt-text').textContent = t('progress_line', { a: mastered, b: total });
  const bar = document.getElementById('fortschritt-balken');
  bar.setAttribute('aria-valuenow', String(pct));
  bar.setAttribute('aria-label', t('progress_line', { a: mastered, b: total }));
  bar.firstElementChild.style.width = pct + '%';
}

// ---------- Ablauf ----------

function show(view) {
  for (const id of ['ansicht-start', 'ansicht-quiz', 'ansicht-ergebnis']) {
    document.getElementById(id).hidden = id !== view;
  }
  window.scrollTo(0, 0);
}

function startRun(mode, length, combat) {
  writeStore(SETTINGS_KEY, { mode, length, combat });
  run = { mode, length, combat, questions: buildQuestions(mode, length), index: 0, answered: false };
  sendStat('start', { m: mode, n: length, c: combat ? 1 : 0 });
  show('ansicht-quiz');
  renderQuestion();
}

function familyLabel(fam) {
  return fam.name;
}

function renderQuestion() {
  const q = run.questions[run.index];
  run.answered = false;
  document.getElementById('zaehler').innerHTML =
    t('question_of', { i: `<strong>${run.index + 1}</strong>`, n: run.questions.length });
  const img = document.getElementById('bild');
  img.src = q.image.src;
  img.alt = t('image_alt');
  const author = document.getElementById('urheber');
  author.hidden = !q.image.author;
  author.textContent = q.image.author ? t('photo_by', { name: q.image.author }) : '';

  const box = document.getElementById('antworten');
  box.innerHTML = '';
  q.options.forEach((fam, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'antwort';
    b.innerHTML = `<span class="taste" aria-hidden="true">${i + 1}</span><span class="name"></span>` +
      '<span class="ic zeichen" aria-hidden="true"></span>';
    b.querySelector('.name').textContent = familyLabel(fam);
    b.addEventListener('click', () => answer(i));
    box.appendChild(b);
  });
  document.getElementById('rueckmeldung').hidden = true;
  box.querySelector('button').focus({ preventScroll: true });
  run.shownAt = performance.now();
  startTimer();
}

function startTimer() {
  stopTimer();
  const clock = document.getElementById('uhr');
  const bar = document.getElementById('zeitleiste');
  clock.hidden = bar.hidden = !run.combat;
  if (!run.combat) return;
  const started = performance.now();
  const total = COMBAT_SECONDS * 1000;
  const tick = () => {
    const left = Math.max(0, total - (performance.now() - started));
    document.getElementById('uhr-text').textContent = t('seconds_left', { s: Math.ceil(left / 1000) });
    clock.classList.toggle('knapp', left < 2000);
    bar.firstElementChild.style.width = (left / total * 100) + '%';
    if (left <= 0) {
      stopTimer();
      answer(-1);
      return;
    }
    timer = requestAnimationFrame(tick);
  };
  timer = requestAnimationFrame(tick);
}

function stopTimer() {
  if (timer) cancelAnimationFrame(timer);
  timer = null;
}

function answer(i) {
  if (run.answered) return;
  run.answered = true;
  stopTimer();
  const q = run.questions[run.index];
  // Gezählt wird nur die Zeit vom Bild bis zur Antwort, nicht das Lesen der Rückmeldung.
  q.ms = i < 0 ? COMBAT_SECONDS * 1000 : performance.now() - run.shownAt;
  q.chosen = i >= 0 ? q.options[i] : null;
  q.correct = q.chosen === q.family;
  updateProgress(q);

  const buttons = document.querySelectorAll('#antworten .antwort');
  buttons.forEach((b, j) => {
    b.disabled = true;
    const fam = q.options[j];
    const sign = b.querySelector('.zeichen');
    if (fam === q.family) {
      b.classList.add('richtig');
      sign.classList.add('ic-circle-check');
    } else if (j === i) {
      b.classList.add('falsch');
      sign.classList.add('ic-circle-x');
    }
  });

  const fb = document.getElementById('rueckmeldung');
  fb.className = 'rueckmeldung ' + (q.correct ? 'gut' : 'schlecht');
  document.getElementById('rueck-symbol').className = 'ic ' + (q.correct ? 'ic-circle-check' : 'ic-circle-x');
  document.getElementById('rueck-text').textContent =
    q.correct ? t('answer_correct') : (i < 0 ? t('answer_timeout') : t('answer_wrong'));
  const ship = data.shipById.get(q.image.ship);
  document.getElementById('rueck-zusatz').textContent =
    q.correct ? (ship && ship.name !== q.family.name ? ship.name : '') : t('answer_was', { name: familyLabel(q.family) });
  const last = run.index === run.questions.length - 1;
  document.getElementById('weiter-text').textContent = last ? t('to_result') : t('next');
  fb.hidden = false;
  document.getElementById('weiter').focus({ preventScroll: true });
}

function updateProgress(q) {
  const progress = readStore(PROGRESS_KEY, {});
  const key = progressKey(q.kind, q.family.name);
  const p = progress[key] || { box: 1, right: 0, wrong: 0 };
  if (q.correct) {
    p.box = Math.min(MASTERED_BOX, p.box + 1);
    p.right++;
  } else {
    p.box = 1;
    p.wrong++;
  }
  p.last = Date.now();
  progress[key] = p;
  writeStore(PROGRESS_KEY, progress);
}

function next() {
  if (!run || !run.answered) return;
  if (run.index < run.questions.length - 1) {
    run.index++;
    renderQuestion();
  } else {
    finishRun();
  }
}

// ---------- Auswertung ----------

function rankFor(pct) {
  if (pct >= 100) return 'ace';
  if (pct >= 90) return 'spotter';
  if (pct >= 70) return 'cadet';
  return 'recruit';
}

const RANK_ICONS = { ace: 'trophy', spotter: 'shield-check', cadet: 'graduation-cap', recruit: 'rotate-ccw' };
const RANK_EMOJI = { ace: '🎖️', spotter: '✅', cadet: '🔸', recruit: '🔻' };

// Unter einer Minute mit einer Nachkommastelle („42,3 s"), darüber Minuten und Sekunden („1:42").
function formatTime(ms) {
  const s = ms / 1000;
  if (s < 60) {
    return s.toLocaleString(currentLang === 'en' ? 'en-GB' : 'de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' s';
  }
  const whole = Math.round(s);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function shareText(score, total, pct, rank, mistakes, ms) {
  const wrong = mistakes.length
    ? mistakes.map(q => familyLabel(q.family)).filter((v, i, a) => a.indexOf(v) === i).join(', ')
    : t('share_none');
  const combat = run.combat ? ` · ⚡ ${t('share_combat', { s: COMBAT_SECONDS })}` : '';
  // Discord-Markdown: Zitatbalken (>), Kleintext (-#), Link in <…> ohne Vorschaukarte.
  return `🛰️ **${t('app_name')}** · **${score}/${total}** (${pct} %) · ${RANK_EMOJI[rank]} **${t('rank_' + rank)}**\n` +
    `> ⏱️ ${t('result_time', { time: formatTime(ms), avg: formatTime(total ? ms / total : 0) })}\n` +
    `> 🎯 ${t('share_mode')}: ${t('mode_' + run.mode)}${combat}\n` +
    `> ${mistakes.length ? '❌' : '✅'} ${t('share_wrong')}: ${wrong}\n` +
    `-# [${SITE_URL}](<https://${SITE_URL}>)`;
}

function finishRun() {
  const total = run.questions.length;
  const score = run.questions.filter(q => q.correct).length;
  const pct = total ? Math.round(score / total * 100) : 0;
  const rank = rankFor(pct);
  const mistakes = run.questions.filter(q => !q.correct);
  const ms = run.questions.reduce((a, q) => a + (q.ms || 0), 0);
  run.result = { total, score, pct, rank, mistakes, ms };

  sendStat('finish', {
    m: run.mode, n: total, c: run.combat ? 1 : 0, k: score, g: rank,
    a: run.questions.map(q => [q.image.id, q.correct ? 1 : 0, q.family.name, q.chosen ? q.chosen.name : '']),
  });
  renderResult();
  show('ansicht-ergebnis');
}

function renderResult() {
  const { total, score, pct, rank, mistakes, ms } = run.result;
  document.getElementById('ergebnis-zahl').textContent = `${score} / ${total}`;
  const rankEl = document.getElementById('ergebnis-rang');
  rankEl.className = 'rang' + (rank === 'recruit' ? ' schwach' : '');
  rankEl.innerHTML = `<span class="ic ic-${RANK_ICONS[rank]}" aria-hidden="true"></span>` +
    `<span>${pct} % · ${t('rank_' + rank)}${run.combat ? ' ' : ''}</span>` +
    (run.combat ? '<span class="ic ic-zap" aria-hidden="true"></span>' : '');
  document.getElementById('ergebnis-zeit-text').textContent =
    t('result_time', { time: formatTime(ms), avg: formatTime(total ? ms / total : 0) });
  document.getElementById('ergebnis-text').textContent = t('rank_' + rank + '_text');
  document.getElementById('kopiertext').textContent = shareText(score, total, pct, rank, mistakes, ms);
  document.getElementById('kopiert').textContent = '';

  const list = document.getElementById('fehlerliste');
  list.innerHTML = '';
  if (!mistakes.length) {
    list.innerHTML = `<p class="leer">${t('mistakes_none')}</p>`;
    return;
  }
  for (const q of mistakes) {
    const ref = q.family.images.beginner[0];
    const shown = document.createElement('div');
    shown.className = 'fehler';
    shown.innerHTML =
      '<figure><div class="bildrahmen"><img alt=""></div><figcaption><strong class="a"></strong><br><span class="b"></span></figcaption></figure>' +
      '<figure><div class="bildrahmen"><img alt=""></div><figcaption class="c"></figcaption></figure>';
    const [imgShown, imgRef] = shown.querySelectorAll('img');
    imgShown.src = q.image.src;
    imgShown.alt = t('mistake_shown', { name: familyLabel(q.family) });
    shown.querySelector('.a').textContent = t('mistake_shown', { name: familyLabel(q.family) });
    shown.querySelector('.b').textContent = q.chosen
      ? t('mistake_chosen', { name: familyLabel(q.chosen) })
      : t('mistake_timeout');
    if (ref && ref.src !== q.image.src) {
      imgRef.src = ref.src;
      imgRef.alt = t('mistake_reference', { name: familyLabel(q.family) });
      shown.querySelector('.c').textContent = t('mistake_reference', { name: familyLabel(q.family) });
    } else {
      shown.querySelectorAll('figure')[1].remove();
      shown.style.gridTemplateColumns = '1fr';
    }
    list.appendChild(shown);
  }
}

async function copyResult() {
  const text = document.getElementById('kopiertext').textContent;
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch (e) {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('kopiertext'));
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ok = document.execCommand && document.execCommand('copy');
  }
  if (ok) {
    document.getElementById('kopiert').textContent = t('share_copied');
    sendStat('copy', { m: run.mode });
  }
}

// ---------- Verdrahtung ----------

function bind() {
  document.getElementById('wahl').addEventListener('submit', e => {
    e.preventDefault();
    const length = Number((document.querySelector('input[name=laenge]:checked') || {}).value) || DEFAULT_LENGTH;
    startRun(selectedMode(), length, document.getElementById('gefecht').checked);
  });
  document.getElementById('weiter').addEventListener('click', next);
  document.getElementById('abbrechen').addEventListener('click', () => {
    stopTimer();
    run = null;
    renderSetup();
    show('ansicht-start');
  });
  document.getElementById('melden').addEventListener('click', () => {
    if (run) openReportDialog(run.questions[run.index].image.id);
  });
  document.getElementById('kopieren').addEventListener('click', copyResult);
  document.getElementById('nochmal').addEventListener('click', () => startRun(run.mode, run.length, run.combat));
  document.getElementById('zur-wahl').addEventListener('click', () => {
    renderSetup();
    show('ansicht-start');
  });

  const dlg = document.getElementById('dlg-reset');
  document.getElementById('zuruecksetzen').addEventListener('click', () => dlg.showModal());
  document.getElementById('reset-nein').addEventListener('click', () => dlg.close());
  document.getElementById('reset-ja').addEventListener('click', () => {
    try { localStorage.removeItem(PROGRESS_KEY); } catch (e) { /* nichts zu löschen */ }
    dlg.close();
    renderProgress();
  });

  document.addEventListener('keydown', e => {
    if (document.getElementById('ansicht-quiz').hidden || document.querySelector('dialog[open]')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (!run.answered && ['1', '2', '3'].includes(e.key)) {
      e.preventDefault();
      answer(Number(e.key) - 1);
    } else if (run.answered && e.key === 'Enter') {
      e.preventDefault();
      next();
    }
  });

  document.addEventListener('langchange', () => {
    if (!data) return;
    if (!document.getElementById('ansicht-start').hidden) renderSetup();
    if (!document.getElementById('ansicht-ergebnis').hidden && run && run.result) renderResult();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  bind();
  try {
    data = await loadData();
  } catch (e) {
    document.getElementById('ansicht-start').hidden = true;
    document.getElementById('ladefehler').hidden = false;
    return;
  }
  renderSetup();
});
