// ELIPS Master Priority mock-up UI, following the existing Master Priority screen.
// Shares helpers from master.js, LOCATIONS (location.js), MILEAGES and combo() (mileage.js); rules live in master-priority.js.
const MQ = window.MasterPriority;
const fmtPri = d => d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '-';
const routeMileage = (f, t) => MILEAGES.find(m => m.from === f && m.to === t && m.status === MM.STATUS.ACTIVE)?.mileage ?? '-';

// ---------- Seed data (rows as on the reference screen) ----------
const PRIORITIES = [];
const priSeedAt = new Date(2026, 4, 26, 9, 15);
[['DPCMR', 'CYKRW'], ['PRTGP', 'WHCKR'], ['PRTGP', 'CYKRW'], ['DPCMR', 'EKRWP'], ['CYKRW', 'EKRWP'], ['DPCMR', 'CYSTR'],
 ['PRTGP', 'CYSTR'], ['CYSTR', 'PRTGP'], ['CYSTR', 'CYEDN'], ['CYEDN', 'PRTGP'], ['CYEJM', 'PRTGP']]
  .forEach(([from, to], i) => PRIORITIES.push({ from, to, priority: i + 1, createdBy: 'admin', createdAt: priSeedAt, updatedBy: 'admin', updatedAt: priSeedAt, version: 1 }));

// ---------- Form ----------
const qFrom = combo($('qFrom'), { options: activeLocs, placeholder: 'Select From' });
const qTo = combo($('qTo'), { options: activeLocs, placeholder: 'Select To' });
let qEditing = null, qSaving = false, qFlash = null;
function qErrors(errors) {
  document.querySelectorAll('#qForm .f').forEach(f => { f.classList.remove('err'); f.querySelector('.msg')?.remove(); });
  $('qAlert').innerHTML = errors._ ? `<div class="form-alert-m">${esc(errors._)}</div>` : '';
  Object.entries(errors).forEach(([k, msg]) => {
    const f = document.querySelector(`#qForm [data-f="${k}"]`);
    if (f) { f.classList.add('err'); f.insertAdjacentHTML('beforeend', `<div class="msg">${esc(msg)}</div>`); }
  });
}
function qSetForm(rec) {
  qEditing = rec ? { rec, version: rec.version } : null;
  qFrom.set(rec?.from); qTo.set(rec?.to);
  $('qPriority').value = rec ? rec.priority : '';
  $('qSaveLbl').textContent = 'Save';
  qErrors({}); qRender();
}
function qBusy(b) {
  qSaving = b;
  $('qSave').disabled = b; $('qCancel').disabled = b; $('qSave').classList.toggle('btn-busy', b);
  $('qSaveLbl').textContent = b ? 'Saving...' : 'Save';
}
$('qCancel').addEventListener('click', () => { qSetForm(null); toast('Form dikosongkan'); });
$('qSave').addEventListener('click', () => {
  if (qSaving) return;   // prevent double submission
  const form = { from: qFrom.value, to: qTo.value, priority: $('qPriority').value };
  qBusy(true);
  setTimeout(() => {
    const now = new Date();
    const res = qEditing ? MQ.update(form, PRIORITIES, LOCATIONS, MILEAGES, qEditing.rec, qEditing.version, USER, now)
      : MQ.add(form, PRIORITIES, LOCATIONS, MILEAGES, USER, now);
    qBusy(false);
    if (!res.ok) { qErrors(res.errors); toast(Object.values(res.errors)[0]); return; }
    qFlash = res.record; qGoTo(res.record); qSetForm(null); toast(res.message);
  }, 400);
});

// ---------- List ----------
// [key, label, shown by default]
const QCOLS = [['from', 'From', 1], ['fromDesc', 'From Description', 1], ['to', 'To', 1], ['toDesc', 'To Description', 1], ['trip', 'Trip', 1],
  ['mileage', 'Mileage', 1], ['priority', 'Priority', 1], ['createdAt', 'Created DT', 1], ['createdBy', 'Created By', 1], ['updatedAt', 'Changed DT', 1], ['updatedBy', 'Changed By', 1]];
const qState = { q: '', page: 1, size: 20, hidden: new Set() };
$('qViewMenu').innerHTML = QCOLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" checked> ${l}</label>`).join('');
$('qViewMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? qState.hidden.delete(k) : qState.hidden.add(k); qRender(); });

const qVal = (r, k) => k === 'fromDesc' ? locName(r.from) : k === 'toDesc' ? locName(r.to) : k === 'trip' ? MQ.trip(r)
  : k === 'mileage' ? routeMileage(r.from, r.to) : r[k] instanceof Date ? fmtPri(r[k]) : r[k];
function qFiltered() {
  const q = qState.q.trim().toLowerCase();
  return MQ.sorted(PRIORITIES).filter(r => !q || QCOLS.some(([k]) => String(qVal(r, k)).toLowerCase().includes(q)));
}
function qGoTo(rec) { const i = qFiltered().indexOf(rec); if (i >= 0) qState.page = Math.floor(i / qState.size) + 1; }
function qRender() {
  const rows = qFiltered(), pages = Math.max(1, Math.ceil(rows.length / qState.size));
  qState.page = Math.min(qState.page, pages);
  const start = (qState.page - 1) * qState.size, view = rows.slice(start, start + qState.size);
  const cols = QCOLS.filter(([k]) => !qState.hidden.has(k)), n = PRIORITIES.length;
  $('qThead').innerHTML = `<tr><th>Action</th>${cols.map(([k, l]) => `<th class="${k === 'priority' ? 'pcol' : ''}">${l}</th>`).join('')}</tr>`;
  $('qTbody').innerHTML = view.length ? view.map(r => {
    const i = PRIORITIES.indexOf(r);
    const act = `<div class="pact"><button data-up="${i}" title="Naikkan prioritas" ${r.priority === 1 ? 'disabled' : ''}>&uarr;</button>`
      + `<button data-down="${i}" title="Turunkan prioritas" ${r.priority === n ? 'disabled' : ''}>&darr;</button>`
      + `<button data-edit="${i}" title="Edit">&#9998;</button><button class="del" data-del="${i}" title="Delete">&#128465;</button></div>`;
    return `<tr class="${qEditing?.rec === r ? 'editing' : ''} ${qFlash === r ? 'flash' : ''}"><td>${act}</td>${cols.map(([k]) =>
      `<td class="${k === 'priority' ? 'pcol' : k.endsWith('Desc') ? 'desc' : ''}">${esc(qVal(r, k))}</td>`).join('')}</tr>`;
  }).join('') : `<tr><td colspan="${cols.length + 1}" class="empty">${PRIORITIES.length ? 'No priority data found for the selected criteria.' : 'No priority data found.'}</td></tr>`;
  qFlash = null;
  $('qInfo').textContent = rows.length ? `Menampilkan ${start + 1} - ${start + view.length} dari ${rows.length} data` : 'Menampilkan 0 data';
  let html = `<button data-p="${qState.page - 1}" ${qState.page === 1 ? 'disabled' : ''} aria-label="Previous page">&lsaquo;</button>`;
  for (let p = 1; p <= pages; p++) html += `<button data-p="${p}" class="${p === qState.page ? 'cur' : ''}">${p}</button>`;
  $('qPager').innerHTML = html + `<button data-p="${qState.page + 1}" ${qState.page === pages ? 'disabled' : ''} aria-label="Next page">&rsaquo;</button>`;
}
$('qQuick').addEventListener('input', e => { qState.q = e.target.value; qState.page = 1; qRender(); });
$('qPager').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { qState.page = +b.dataset.p; qRender(); } });

// ---------- Row actions: Up / Down / Edit / Delete ----------
$('qTbody').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const rec = PRIORITIES[+(b.dataset.up ?? b.dataset.down ?? b.dataset.edit ?? b.dataset.del)];
  if (b.dataset.up || b.dataset.down) {
    if (qEditing) qSetForm(null);   // the loaded version would be outdated
    const res = MQ.move(PRIORITIES, rec, b.dataset.up ? 'up' : 'down', USER, new Date());
    if (res.ok) { qFlash = rec; qGoTo(rec); qRender(); toast(res.message); }
    return;
  }
  if (b.dataset.edit) { qSetForm(rec); $('qPriority').focus(); toast(`Edit ${rec.from} -> ${rec.to}: ubah From / To / Priority lalu Save, atau Cancel`); return; }
  showPreview('Delete Priority', `<p style="font-size:11px;margin:0">Hapus route <b>${esc(rec.from)} -> ${esc(rec.to)}</b> (${esc(MQ.trip(rec))}) dengan priority <b>${rec.priority}</b>?<br>
      Priority route di bawahnya akan naik satu nomor.</p>`,
    `<button class="btn-outline" id="qDelCancel">Batal</button><button style="height:30px;background:#f43f5e;color:#fff;border:0;border-radius:5px;padding:0 14px;font-weight:600" id="qDelOk">Delete</button>`);
  $('qDelCancel').onclick = closePreview;
  $('qDelOk').onclick = () => {
    const res = MQ.remove(PRIORITIES, rec);
    closePreview(); if (qEditing?.rec === rec) qSetForm(null);
    qRender(); toast(res.ok ? res.message : res.errors._);
  };
});

// ---------- Export XLS ----------
$('qExport').addEventListener('click', () => {
  const rows = qFiltered(), cols = QCOLS.filter(([k]) => !qState.hidden.has(k));
  const x = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const num = k => k === 'priority' || k === 'mileage';
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#DFE4EC" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Master Priority"><Table>
<Row>${cols.map(([, l]) => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(l)}</Data></Cell>`).join('')}</Row>
${rows.map(r => `<Row>${cols.map(([k]) => num(k) && typeof qVal(r, k) === 'number'
    ? `<Cell><Data ss:Type="Number">${qVal(r, k)}</Data></Cell>` : `<Cell><Data ss:Type="String">${x(qVal(r, k))}</Data></Cell>`).join('')}</Row>`).join('\n')}
</Table></Worksheet></Workbook>`;
  const a = document.createElement('a'), d = new Date();
  a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
  a.download = `Master_Priority_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.xls`;
  a.click(); URL.revokeObjectURL(a.href);
  toast(`${rows.length} baris diexport`);
});

document.addEventListener('masterview', e => { if (e.detail === 'priority') qRender(); });
qSetForm(null);
