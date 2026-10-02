// SPDX-License-Identifier: GPL-3.0-only
// „Bild melden": Grund wählen, anonym zählen, optional Einzelheiten auf GitHub.

const REPORT_REASONS = ['wrong_ship', 'name_visible', 'bad_quality', 'other'];
const ISSUE_URL = 'https://github.com/Xharig/VerseSpotter/issues/new';

function openReportDialog(imageId) {
  const dlg = document.getElementById('dlg-melden');
  if (!dlg) return;
  const box = document.getElementById('gruende');
  const thanks = document.getElementById('melden-danke');
  box.hidden = false;
  thanks.hidden = true;
  box.innerHTML = '';
  for (const reason of REPORT_REASONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t('report_' + reason);
    b.addEventListener('click', () => {
      sendStat('report', { b: imageId, g: reason });
      const title = encodeURIComponent('Bild melden / Report image: ' + imageId);
      const body = encodeURIComponent('Bild / Image: ' + imageId + '\nGrund / Reason: ' + reason + '\n\n');
      document.getElementById('melden-github').href = `${ISSUE_URL}?title=${title}&body=${body}`;
      box.hidden = true;
      thanks.hidden = false;
    });
    box.appendChild(b);
  }
  if (!dlg.dataset.bound) {
    document.getElementById('melden-zu').addEventListener('click', () => dlg.close());
    dlg.dataset.bound = '1';
  }
  dlg.showModal();
  box.querySelector('button').focus();
}
