// ELIPS Master Mileage mock-up UI (shares helpers from master.js and LOCATIONS from location.js).
// Rules live in master-mileage.js.
const MM = window.MasterMileage;
const LATENCY = 400;   // simulated server round trip for loading / saving indicators
const idr = n => `IDR ${Number(n).toLocaleString('en-US')}`;
const km = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: MM.MAX_DECIMALS });
const locName = code => LOCATIONS.find(l => l.code === code)?.name || '(not in Master Location)';
const locOption = l => ({ value: l.code, label: `${l.code} - ${l.name}`, inactive: l.status !== 'ACTIVE' });
const fmtTS = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

// ---------- Seed data ----------
const MILEAGES = [];
const milSeedAt = new Date(2026, 7, 22, 15, 0);
[
  ['SNT', 'KRW', 65], ['SNT', 'CKR', 42], ['CKR', 'KRW', 28], ['KRW', 'SNT', 68],
  ['RD3', 'S1', 16], ['D1', 'S1', 8], ['RA1', 'S1', 11], ['X10E', 'S1', 59], ['K2E', 'S1', 64],
  ['RA1', 'K3E', 72], ['K3E', 'RA1', 74], ['D4', 'X11E', 31], ['A2', 'K3E', 98],
  ['X6', 'RA1', 80, 'Inactive'], ['D9', 'RA1', 12, 'Inactive'],
].forEach(([from, to, mileage, status = 'Active']) => MILEAGES.push({
  from, to, mileage, status, createdBy: 'ielp1', createdAt: milSeedAt, updatedBy: 'ielp1', updatedAt: milSeedAt, version: 1,
}));

// ---------- Searchable dropdown (code or name) ----------
function combo(el, { options, allLabel = '', placeholder = 'Search location code / name', onChange = () => {} }) {
  el.innerHTML = `<input type="text" placeholder="${placeholder}" aria-autocomplete="list"><div class="combo-list" role="listbox"></div>`;
  const input = el.querySelector('input'), list = el.querySelector('.combo-list');
  let value = '', hl = -1, shown = [];
  const all = () => (allLabel ? [{ value: '', label: allLabel }] : []).concat(options());
  const labelOf = v => all().find(o => o.value === v)?.label ?? '';
  function draw(q = '') {
    const t = q.trim().toLowerCase();
    shown = all().filter(o => !t || o.label.toLowerCase().includes(t));
    hl = Math.min(hl, shown.length - 1);
    list.innerHTML = shown.length ? shown.map((o, i) => `<div data-i="${i}" class="${o.value === value ? 'sel' : ''} ${i === hl ? 'hl' : ''}">${esc(o.label)}${o.inactive ? ' <small>(Inactive)</small>' : ''}</div>`).join('')
      : '<div class="none">No location found</div>';
  }
  const isOpen = () => el.classList.contains('open');
  function open() { if (input.disabled) return; hl = -1; draw(); el.classList.add('open'); }
  function close() { if (isOpen()) { el.classList.remove('open'); input.value = labelOf(value); } }
  function pick(o) { value = o.value; el.classList.remove('open'); input.value = o.label; onChange(value); }
  input.addEventListener('focus', () => { input.select(); open(); });
  input.addEventListener('click', () => { if (!isOpen()) open(); });
  input.addEventListener('input', () => { hl = 0; draw(input.value); el.classList.add('open'); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Tab') return close();
    if (!isOpen()) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hl = Math.max(0, Math.min(shown.length - 1, hl + (e.key === 'ArrowDown' ? 1 : -1))); draw(input.value); }
    if (e.key === 'Enter' && shown[hl]) { e.preventDefault(); pick(shown[hl]); }
    if (e.key === 'Escape') close();
  });
  list.addEventListener('mousedown', e => { const d = e.target.closest('[data-i]'); if (d) { e.preventDefault(); pick(shown[+d.dataset.i]); } });
  // Close (and restore the selected label) when clicking anywhere outside this dropdown
  document.addEventListener('mousedown', e => { if (!el.contains(e.target)) close(); });
  const api = {
    get value() { return value; },
    set(v, label) { value = v || ''; input.value = label ?? labelOf(value); },
    disable(b) { input.disabled = b; },
  };
  api.set('');
  return api;
}
const allLocs = () => LOCATIONS.slice().sort((a, b) => a.code < b.code ? -1 : 1).map(locOption);
const activeLocs = () => allLocs().filter(o => !o.inactive);

// ---------- Filters + quick search ----------
const fFrom = combo($('fFrom'), { options: allLocs, allLabel: 'All' });
const fTo = combo($('fTo'), { options: allLocs, allLabel: 'All' });
const mState = { f: { from: '', to: '', status: '' }, q: '', sortKey: 'from', sortDir: 1, page: 1, size: 10,
  hidden: new Set(['createdBy']) };

function withLoading(fn) {
  $('mTableBox').classList.add('loading'); $('mSearch').disabled = true;
  setTimeout(() => { $('mTableBox').classList.remove('loading'); $('mSearch').disabled = false; fn(); }, LATENCY);
}
$('mSearch').addEventListener('click', () => {
  mState.f = { from: fFrom.value, to: fTo.value, status: $('fMStatus').value }; mState.page = 1;
  withLoading(mRender);
});
function resetFilter() {
  fFrom.set(''); fTo.set(''); $('fMStatus').value = ''; $('mQuick').value = '';
  mState.f = { from: '', to: '', status: '' }; mState.q = ''; mState.page = 1;
  withLoading(mRender);
}
$('mReset').addEventListener('click', resetFilter);
$('mQuick').addEventListener('input', e => { mState.q = e.target.value; mState.page = 1; mRender(); });

// ---------- Table ----------
// [key, label, sortable, toggleable in Table View]
const MCOLS = [['no', 'No.'], ['from', 'From Code', 1, 1], ['fromName', 'From', 0, 1], ['to', 'To Code', 1, 1], ['toName', 'To', 0, 1],
  ['mileage', 'Mileage (Km)', 1, 1], ['status', 'Status', 1, 1], ['createdAt', 'Created Date', 1, 1], ['createdBy', 'Created By', 0, 1],
  ['updatedAt', 'Change Date', 1, 1], ['updatedBy', 'Updated By', 0, 1], ['action', 'Action']];
$('mViewMenu').innerHTML = MCOLS.filter(c => c[3]).map(([k, l]) => `<label><input type="checkbox" data-k="${k}" ${mState.hidden.has(k) ? '' : 'checked'}> ${l}</label>`).join('');
$('mViewMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? mState.hidden.delete(k) : mState.hidden.add(k); mRender(); });

const mVal = (m, k) => k === 'fromName' ? locName(m.from) : k === 'toName' ? locName(m.to) : m[k] instanceof Date ? fmtTS(m[k]) : m[k];
function mFiltered() {
  const f = mState.f, q = mState.q.trim().toLowerCase();
  const rows = MILEAGES.filter(m => (!f.from || m.from === f.from) && (!f.to || m.to === f.to) && (!f.status || m.status === f.status) &&
    (!q || ['from', 'fromName', 'to', 'toName', 'mileage', 'status'].some(k => String(mVal(m, k)).toLowerCase().includes(q))));
  const k = mState.sortKey, val = m => m[k] instanceof Date ? m[k].getTime() : m[k];
  return rows.sort((a, b) => val(a) < val(b) ? -mState.sortDir : val(a) > val(b) ? mState.sortDir : 0);
}
function mRender() {
  const rows = mFiltered(), pages = Math.max(1, Math.ceil(rows.length / mState.size));
  mState.page = Math.min(mState.page, pages);
  const start = (mState.page - 1) * mState.size, view = rows.slice(start, start + mState.size);
  const cols = MCOLS.filter(([k]) => !mState.hidden.has(k));
  $('mTotal').textContent = `Total: ${rows.length} record${rows.length === 1 ? '' : 's'}`;
  $('mThead').innerHTML = `<tr>${cols.map(([k, l, s]) => `<th${s ? ` class="sortable" data-sort="${k}"` : ''}>${l}${mState.sortKey === k ? `<span class="arrow">${mState.sortDir === 1 ? '▲' : '▼'}</span>` : ''}</th>`).join('')}</tr>`;
  $('mTbody').innerHTML = view.map((m, i) => {
    const idx = MILEAGES.indexOf(m), active = m.status === MM.STATUS.ACTIVE;
    const cell = k => k === 'no' ? start + i + 1
      : k === 'mileage' ? km(m.mileage)
      : k === 'status' ? `<span class="badge-st ${m.status}">${m.status}</span>`
      : k === 'action' ? `<button class="btn-sm edit" data-medit="${idx}">&#9998; Edit</button>${active
          ? `<button class="btn-sm deact" data-mstatus="${idx}" data-to="Inactive">Deactivate</button>`
          : `<button class="btn-sm act" data-mstatus="${idx}" data-to="Active">Activate</button>`}`
      : esc(mVal(m, k));
    const cls = k => k === 'fromName' || k === 'toName' ? 'l' : k === 'mileage' ? 'r' : '';
    return `<tr class="${mEditing?.rec === m ? 'editing' : ''}">${cols.map(([k]) => `<td class="${cls(k)}" style="${k === 'action' || k.endsWith('At') ? 'white-space:nowrap' : ''}">${cell(k)}</td>`).join('')}</tr>`;
  }).join('');
  // Empty states: no data at all vs no result for the criteria
  const none = !rows.length;
  ['mTableBox', 'mFoot', 'mPager'].forEach(id => { $(id).style.display = none ? 'none' : ''; });
  $('mEmpty').style.display = none ? '' : 'none';
  $('mEmpty').innerHTML = !MILEAGES.length ? 'No mileage data found.<br><button class="btn-blue" data-empty="add">+ Add Mileage</button>'
    : 'No mileage data found for the selected criteria.<br><button class="btn-cancel" data-empty="reset" style="display:inline-flex">Reset Filter</button>';
  $('mInfo').textContent = rows.length ? `Showing ${start + 1} to ${start + view.length} of ${rows.length} records` : '';
  let html = `<button data-p="${mState.page - 1}" ${mState.page === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= pages; p++) html += `<button data-p="${p}" class="${p === mState.page ? 'cur' : ''}">${p}</button>`;
  $('mPager').innerHTML = html + `<button data-p="${mState.page + 1}" ${mState.page === pages ? 'disabled' : ''}>›</button>`;
}
$('mThead').addEventListener('click', e => {
  const th = e.target.closest('th[data-sort]'); if (!th) return;
  mState.sortDir = mState.sortKey === th.dataset.sort ? -mState.sortDir : 1; mState.sortKey = th.dataset.sort; mRender();
});
$('mPager').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { mState.page = +b.dataset.p; mRender(); } });
$('mPageSize').addEventListener('change', e => { mState.size = +e.target.value; mState.page = 1; mRender(); });
$('mEmpty').addEventListener('click', e => {
  const b = e.target.closest('[data-empty]'); if (!b) return;
  b.dataset.empty === 'add' ? startAdd() : resetFilter();
});

// ---------- Form (Add / Edit) ----------
const mfFrom = combo($('mfFrom'), { options: activeLocs, placeholder: 'Select From Location' });
const mfTo = combo($('mfTo'), { options: activeLocs, placeholder: 'Select To Location' });
let mEditing = null, saving = false;
$('mfStatus').addEventListener('change', () => { $('mfStatusLbl').textContent = $('mfStatus').checked ? 'Active' : 'Inactive'; });

function mfErrors(errors) {
  document.querySelectorAll('#mForm .f').forEach(f => { f.classList.remove('err'); f.querySelector('.msg')?.remove(); });
  $('mfAlert').innerHTML = errors._ ? `<div class="form-alert-m">${esc(errors._)}</div>` : '';
  Object.entries(errors).forEach(([k, msg]) => {
    const f = document.querySelector(`#mForm [data-f="${k}"]`);
    if (f) { f.classList.add('err'); f.insertAdjacentHTML('beforeend', `<div class="msg">${esc(msg)}</div>`); }
  });
}
function setForm(rec) {
  mEditing = rec ? { rec, version: rec.version } : null;
  // Edit keeps the route; From / To are read only (they may already be inactive in Master Location)
  mfFrom.set(rec?.from, rec ? `${rec.from} - ${locName(rec.from)}` : undefined);
  mfTo.set(rec?.to, rec ? `${rec.to} - ${locName(rec.to)}` : undefined);
  mfFrom.disable(!!rec); mfTo.disable(!!rec);
  $('mfMileage').value = rec ? rec.mileage : '';
  $('mfStatus').checked = rec ? rec.status === MM.STATUS.ACTIVE : true;
  $('mfStatusLbl').textContent = $('mfStatus').checked ? 'Active' : 'Inactive';
  $('mfMode').innerHTML = rec ? `Mode: <b>Edit Mileage</b> ${rec.from} &rarr; ${rec.to} (From / To tidak bisa diubah)` : 'Mode: <b>Add Mileage</b>';
  mfErrors({}); setSaving(false); mRender();
}
function startAdd() { setForm(null); window.scrollTo({ top: 0, behavior: 'smooth' }); $('mfFrom').querySelector('input').focus(); }
function setSaving(b) {
  saving = b;
  $('mfSave').disabled = b; $('mfCancel').disabled = b;
  $('mfSave').classList.toggle('btn-busy', b);
  $('mfSaveLbl').textContent = b ? 'Saving...' : 'Save';
}
$('mAdd').addEventListener('click', startAdd);
$('mfCancel').addEventListener('click', () => { setForm(null); toast('Form dikosongkan'); });
$('mfSave').addEventListener('click', () => {
  if (saving) return;   // prevent double submission
  const form = { from: mfFrom.value, to: mfTo.value, mileage: $('mfMileage').value, status: $('mfStatus').checked ? 'Active' : 'Inactive' };
  setSaving(true);
  setTimeout(() => {
    const now = new Date();
    const res = mEditing ? MM.update(form, MILEAGES, LOCATIONS, mEditing.rec, mEditing.version, USER, now) : MM.add(form, MILEAGES, LOCATIONS, USER, now);
    setSaving(false);
    if (!res.ok) { mfErrors(res.errors); toast(Object.values(res.errors)[0]); return; }
    setForm(null); toast(res.message);
  }, LATENCY);
});

// ---------- Edit / Activate / Deactivate ----------
$('mTbody').addEventListener('click', e => {
  const ed = e.target.closest('[data-medit]');
  if (ed) { setForm(MILEAGES[+ed.dataset.medit]); window.scrollTo({ top: 0, behavior: 'smooth' }); $('mfMileage').focus(); return; }
  const st = e.target.closest('[data-mstatus]'); if (!st) return;
  const rec = MILEAGES[+st.dataset.mstatus], to = st.dataset.to;
  const apply = () => {
    const res = MM.setStatus(rec, to, LOCATIONS, USER, new Date());
    closePreview();
    if (res.ok && mEditing?.rec === rec) setForm(null); else mRender();
    toast(res.ok ? res.message : res.error);
  };
  if (to === MM.STATUS.ACTIVE) return apply();
  showPreview('Deactivate Mileage', `<p style="font-size:11px;margin:0">${MM.MSG.confirmDeactivate}<br><br>
      <b>${rec.from} - ${esc(locName(rec.from))} &rarr; ${rec.to} - ${esc(locName(rec.to))}</b> (${km(rec.mileage)} KM)<br>
      Inactive mileage stays available for history / audit but is not used for new TC-PBR calculations.</p>`,
    `<button class="btn-outline" id="mdCancel">Cancel</button><button style="height:30px;background:#f43f5e;color:#fff;border:0;border-radius:5px;padding:0 14px;font-weight:600" id="mdOk">Yes, Deactivate</button>`);
  $('mdCancel').onclick = closePreview;
  $('mdOk').onclick = apply;
});

// ---------- Export .xls ----------
$('mExport').addEventListener('click', () => {
  const rows = mFiltered(), cols = MCOLS.filter(([k]) => !mState.hidden.has(k) && k !== 'action');
  const x = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#DFE4EC" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Route Mileage"><Table>
<Row>${cols.map(([, l]) => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(l)}</Data></Cell>`).join('')}</Row>
${rows.map((m, i) => `<Row>${cols.map(([k]) => k === 'no' || k === 'mileage'
    ? `<Cell><Data ss:Type="Number">${k === 'no' ? i + 1 : m.mileage}</Data></Cell>`
    : `<Cell><Data ss:Type="String">${x(mVal(m, k))}</Data></Cell>`).join('')}</Row>`).join('\n')}
</Table></Worksheet></Workbook>`;
  const a = document.createElement('a'), d = new Date();
  a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
  a.download = `Master_Mileage_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.xls`;
  a.click(); URL.revokeObjectURL(a.href);
  toast(`${rows.length} baris diexport`);
});

// ---------- Variable cost simulation (TC-PBR usage) ----------
const sFrom = combo($('sFrom'), { options: allLocs, placeholder: 'Select Location From' });
const sTo = combo($('sTo'), { options: allLocs, placeholder: 'Select Location To' });
sFrom.set('SNT'); sTo.set('KRW');
$('sCalc').addEventListener('click', () => {
  if (!sFrom.value || !sTo.value) { $('sRes').innerHTML = '<div class="sim-res bad">Select Delivery From and Delivery To.</div>'; return; }
  const r = MM.variableCost(MILEAGES, sFrom.value, sTo.value, $('sPrice').value);
  $('sRes').innerHTML = r.ok
    ? `<div class="sim-res ok">Mileage ${sFrom.value} &rarr; ${sTo.value} = <b>${km(r.mileage)} KM</b><br>Variable Cost = ${km(r.mileage)} &times; ${idr(r.pricePerKm)} = <b>${idr(r.cost)}</b></div>`
    : `<div class="sim-res bad">&#9888; ${esc(r.error)} Variable cost is not calculated until valid active mileage data is available.</div>`;
});

document.addEventListener('masterview', e => { if (e.detail === 'mileage') withLoading(mRender); });
setForm(null);
