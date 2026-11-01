// ELIPS Master Renban mock-up UI, following the existing Master Renban screen.
// Shares helpers from master.js; rules live in master-renban.js.
const RB = window.MasterRenban;
const fmtRb = d => d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : '-';

// ---------- Seed data (as on the reference screen) ----------
const RENBANS = [];
const rbSeedAt = new Date(2026, 4, 21, 9, 15, 0);
[['KRW 3', '721C', 'X', 'KUO'], ['KRW 3', '303D', 'O', 'TDB'], ['KRW 3', '303E', 'M', 'TDB'], ['KRW 3', '811C', '2', 'TMP'], ['KRW 3', '722C', 'N', 'TMT'], ['KRW 3', '715B', 'C', 'TMV'],
 ['STR 2', '303D', 'B', 'TDB'], ['STR 2', '715B', 'A', 'TMV'], ['STR 2', '715B', 'J', 'TMV'], ['STR 2', '715B', 'R', 'TMV'], ['STR 2', '715B', 'V', 'TMV'], ['STR 2', '721B', 'Q', 'KUO'],
 ['STR 2', '722C', 'D', 'TMT'], ['STR 2', '722C', 'T', 'TMT'], ['STR 2', '812B', '9', 'UMW'], ['STR 2', '812D', 'T', 'DPM'], ['STR 2', '812K', '7', 'UMW'], ['STR 2', '812K', 'M', 'UMW']]
  .forEach(([plant, dest, renban, source]) => RENBANS.push({ plant, dest, renban, source, createdBy: 'SYSTEM', createdAt: rbSeedAt, changedBy: 'SYSTEM', changedAt: rbSeedAt, version: 1 }));

// ---------- Input Renban ----------
$('bPlant').innerHTML = '<option value="">Select plant</option>' + RB.PLANTS.map(p => `<option value="${p.code}">${p.code} - ${p.name}</option>`).join('');
$('bSource').innerHTML = '<option value="">Select source</option>' + RB.SOURCES.map(s => `<option>${s}</option>`).join('');
let bEditing = null, bSaving = false, bFlash = null;
function bErrors(errors) {
  document.querySelectorAll('#bForm .f').forEach(f => { f.classList.remove('err'); f.querySelector('.msg')?.remove(); });
  $('bAlert').innerHTML = errors._ ? `<div class="form-alert-m">${esc(errors._)}</div>` : '';
  Object.entries(errors).forEach(([k, msg]) => {
    const f = document.querySelector(`#bForm [data-f="${k}"]`);
    if (f) { f.classList.add('err'); f.insertAdjacentHTML('beforeend', `<div class="msg">${esc(msg)}</div>`); }
  });
}
function bSetForm(rec) {
  bEditing = rec ? { rec, version: rec.version } : null;
  $('bPlant').value = rec?.plant ?? ''; $('bDest').value = rec?.dest ?? ''; $('bRenban').value = rec?.renban ?? ''; $('bSource').value = rec?.source ?? '';
  $('bTitle').textContent = rec ? `Edit Renban - ${rec.plant} / ${rec.dest} / ${rec.renban}` : 'Input Renban';
  bErrors({}); bRender();
}
function bBusy(b) { bSaving = b; $('bSave').disabled = b; $('bCancel').disabled = b; $('bSave').classList.toggle('btn-busy', b); $('bSaveLbl').textContent = b ? 'Saving...' : 'Save'; }
$('bCancel').addEventListener('click', () => { bSetForm(null); toast('Form dikosongkan'); });
$('bSave').addEventListener('click', () => {
  if (bSaving) return;   // prevent double submission
  const form = { plant: $('bPlant').value, dest: $('bDest').value, renban: $('bRenban').value, source: $('bSource').value };
  bBusy(true);
  setTimeout(() => {
    const now = new Date();
    const res = bEditing ? RB.update(form, RENBANS, bEditing.rec, bEditing.version, USER, now) : RB.add(form, RENBANS, USER, now);
    bBusy(false);
    if (!res.ok) { bErrors(res.errors); toast(Object.values(res.errors)[0]); return; }
    bFlash = res.record; bGoTo(res.record); bSetForm(null); toast(res.message);
  }, 400);
});
['bDest', 'bRenban'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') $('bSave').click(); }));

// ---------- Master Renban List ----------
// [key, label]
const BCOLS = [['plant', 'Plant (Code - Description)'], ['dest', 'Dest'], ['renban', 'Renban Code'], ['source', 'Source'],
  ['createdBy', 'Created By'], ['createdAt', 'Created Dt'], ['changedAt', 'Changed Dt'], ['changedBy', 'Changed By']];
const bState = { q: '', page: 1, size: 25, hidden: new Set() };
$('bViewMenu').innerHTML = BCOLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" checked> ${l}</label>`).join('');
$('bViewMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? bState.hidden.delete(k) : bState.hidden.add(k); bRender(); });
const bVal = (r, k) => k === 'plant' ? RB.plantLabel(r.plant) : r[k] instanceof Date ? fmtRb(r[k]) : r[k];
function bFiltered() {
  const q = bState.q.trim().toLowerCase();
  return RENBANS.filter(r => !q || BCOLS.some(([k]) => String(bVal(r, k)).toLowerCase().includes(q)));
}
function bGoTo(rec) { const i = bFiltered().indexOf(rec); if (i >= 0) bState.page = Math.floor(i / bState.size) + 1; }
function bRender() {
  const rows = bFiltered(), pages = Math.max(1, Math.ceil(rows.length / bState.size));
  bState.page = Math.min(bState.page, pages);
  const start = (bState.page - 1) * bState.size, view = rows.slice(start, start + bState.size);
  const cols = BCOLS.filter(([k]) => !bState.hidden.has(k));
  $('bThead').innerHTML = `<tr><th>Action</th>${cols.map(([, l]) => `<th>${l}</th>`).join('')}</tr>`;
  $('bTbody').innerHTML = view.length ? view.map(r => {
    const i = RENBANS.indexOf(r);
    return `<tr class="${bEditing?.rec === r ? 'editing' : ''} ${bFlash === r ? 'flash' : ''}"><td><div class="pact"><button data-edit="${i}" title="Edit">&#9998;</button><button class="del" data-del="${i}" title="Delete">&#128465;</button></div></td>
      ${cols.map(([k]) => `<td>${esc(bVal(r, k))}</td>`).join('')}</tr>`;
  }).join('') : `<tr><td colspan="${cols.length + 1}" class="empty" style="text-align:center">${RENBANS.length ? 'No renban data found for the selected criteria.' : 'No renban data found.'}</td></tr>`;
  bFlash = null;
  $('bInfo').innerHTML = `Showing <b>${rows.length ? start + 1 : 0}</b> to <b>${start + view.length}</b> of <b>${rows.length}</b> entries`;
  const from = Math.max(1, Math.min(bState.page - 2, pages - 4)), to = Math.min(pages, from + 4);
  let html = '';
  for (let p = from; p <= to; p++) html += `<button data-p="${p}" class="${p === bState.page ? 'cur' : ''}">${p}</button>`;
  $('bPages').innerHTML = html;
  const box = $('bPagerBox');
  box.querySelector('[data-pg=first]').disabled = box.querySelector('[data-pg=prev]').disabled = bState.page === 1;
  box.querySelector('[data-pg=next]').disabled = box.querySelector('[data-pg=last]').disabled = bState.page === pages;
  bState.pages = pages;
}
$('bQuick').addEventListener('input', e => { bState.q = e.target.value; bState.page = 1; bRender(); });
$('bPagerBox').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const pg = b.dataset.pg;
  bState.page = pg === 'first' ? 1 : pg === 'prev' ? bState.page - 1 : pg === 'next' ? bState.page + 1 : pg === 'last' ? bState.pages : +b.dataset.p;
  bRender();
});
$('bSize').addEventListener('change', e => { bState.size = +e.target.value; bState.page = 1; bRender(); });

// ---------- Row actions: Edit / Delete ----------
$('bTbody').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const rec = RENBANS[+(b.dataset.edit ?? b.dataset.del)];
  if (b.dataset.edit) { bSetForm(rec); $('bDest').focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); toast(`Edit ${rec.plant} / ${rec.dest} / ${rec.renban}: ubah data lalu Save, atau Cancel`); return; }
  showPreview('Delete Renban', `<p style="font-size:11px;margin:0">Hapus renban <b>${esc(RB.plantLabel(rec.plant))} / ${esc(rec.dest)} / ${esc(rec.renban)}</b> (Source ${esc(rec.source)})?</p>`,
    `<button class="btn-outline" id="bDelCancel">Batal</button><button style="height:30px;background:#f43f5e;color:#fff;border:0;border-radius:5px;padding:0 14px;font-weight:600" id="bDelOk">Delete</button>`);
  $('bDelCancel').onclick = closePreview;
  $('bDelOk').onclick = () => {
    const res = RB.remove(RENBANS, rec); closePreview();
    if (bEditing?.rec === rec) bSetForm(null);
    bRender(); toast(res.ok ? res.message : res.error);
  };
});

// ---------- Export .xls ----------
$('bExport').addEventListener('click', () => {
  const rows = bFiltered(), cols = BCOLS.filter(([k]) => !bState.hidden.has(k));
  const x = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#DFE4EC" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Master Renban"><Table>
<Row>${cols.map(([, l]) => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(l)}</Data></Cell>`).join('')}</Row>
${rows.map(r => `<Row>${cols.map(([k]) => `<Cell><Data ss:Type="String">${x(bVal(r, k))}</Data></Cell>`).join('')}</Row>`).join('\n')}
</Table></Worksheet></Workbook>`;
  const a = document.createElement('a'), d = new Date();
  a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
  a.download = `Master_Renban_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.xls`;
  a.click(); URL.revokeObjectURL(a.href);
  toast(`${rows.length} baris diexport`);
});

document.addEventListener('masterview', e => { if (e.detail === 'renban') bRender(); });
bSetForm(null);
