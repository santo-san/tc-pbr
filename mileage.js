// ELIPS Route Mileage (Master Mileage) mock-up UI, following the existing Route Mileage screen.
// Shares helpers from master.js and LOCATIONS from location.js; rules live in master-mileage.js.
const MM = window.MasterMileage;
const LATENCY = 400;   // simulated server round trip for the saving indicator
const km = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: MM.MAX_DECIMALS });
const locName = code => LOCATIONS.find(l => l.code === code)?.name || '(not in Master Location)';
const fmtTS = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

// ---------- Seed data (first rows as on the reference screen) ----------
const MILEAGES = [];
const milSeedAt = new Date(2026, 7, 22, 15, 0);
[
  ['DPCMR', 'CYSTR', 16], ['DPSTR', 'CYSTR', 8], ['PRTGP', 'CYSTR', 11], ['WHCKR', 'CYSTR', 59], ['KRWP1', 'CYSTR', 64],
  ['SNT', 'KRW', 65], ['SNT', 'CKR', 42], ['CKR', 'KRW', 28], ['KRW', 'SNT', 68],
].forEach(([from, to, mileage]) => MILEAGES.push({
  from, to, mileage, status: MM.STATUS.ACTIVE, createdBy: 'ielp1', createdAt: milSeedAt, updatedBy: 'ielp1', updatedAt: milSeedAt, version: 1,
}));

// ---------- Location dropdown (searchable by code or name) ----------
function combo(el, { options, placeholder }) {
  el.innerHTML = `<input type="text" placeholder="${placeholder}" aria-autocomplete="list"><div class="combo-list" role="listbox"></div>`;
  const input = el.querySelector('input'), list = el.querySelector('.combo-list');
  let value = '', hl = -1, shown = [];
  const labelOf = v => options().find(o => o.value === v)?.label ?? '';
  function draw(q = '') {
    const t = q.trim().toLowerCase();
    shown = options().filter(o => !t || o.label.toLowerCase().includes(t));
    hl = Math.min(hl, shown.length - 1);
    list.innerHTML = shown.length ? shown.map((o, i) => `<div data-i="${i}" class="${o.value === value ? 'sel' : ''} ${i === hl ? 'hl' : ''}">${esc(o.label)}</div>`).join('')
      : '<div class="none">No location found</div>';
  }
  const isOpen = () => el.classList.contains('open');
  function open() { if (input.disabled) return; hl = -1; draw(); el.classList.add('open'); }
  function close() { if (isOpen()) { el.classList.remove('open'); input.value = labelOf(value); } }
  function pick(o) { value = o.value; el.classList.remove('open'); input.value = o.label; }
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
  document.addEventListener('mousedown', e => { if (!el.contains(e.target)) close(); });
  return {
    get value() { return value; },
    set(v, label) { value = v || ''; input.value = label ?? labelOf(value); },
    disable(b) { input.disabled = b; },
  };
}
// Only ACTIVE Master Location records can be selected
const activeLocs = () => LOCATIONS.filter(l => l.status === 'ACTIVE').sort((a, b) => a.code < b.code ? -1 : 1)
  .map(l => ({ value: l.code, label: `${l.code} - ${l.name}` }));
const mfFrom = combo($('mfFrom'), { options: activeLocs, placeholder: 'Select From Location' });
const mfTo = combo($('mfTo'), { options: activeLocs, placeholder: 'Select To Location' });

// ---------- Route Mileage List ----------
// [key, label, shown by default]
const MCOLS = [['from', 'From Code', 1], ['fromName', 'From', 1], ['to', 'To Code', 1], ['toName', 'To', 1], ['mileage', 'Mileage (Km)', 1],
  ['createdAt', 'Created Date', 1], ['updatedAt', 'Change Date', 1], ['createdBy', 'Created By', 0], ['updatedBy', 'Changed By', 0]];
const mState = { q: '', page: 1, size: 10, hidden: new Set(MCOLS.filter(c => !c[2]).map(c => c[0])) };
$('mViewMenu').innerHTML = MCOLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" ${mState.hidden.has(k) ? '' : 'checked'}> ${l}</label>`).join('');
$('mViewMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? mState.hidden.delete(k) : mState.hidden.add(k); mRender(); });

const mVal = (m, k) => k === 'fromName' ? locName(m.from) : k === 'toName' ? locName(m.to) : k === 'mileage' ? km(m.mileage) : m[k] instanceof Date ? fmtTS(m[k]) : m[k];
function mFiltered() {
  const q = mState.q.trim().toLowerCase();
  return MILEAGES.filter(m => m.status === MM.STATUS.ACTIVE && (!q || MCOLS.some(([k]) => String(mVal(m, k)).toLowerCase().includes(q))));
}
function mRender() {
  const rows = mFiltered(), pages = Math.max(1, Math.ceil(rows.length / mState.size));
  mState.page = Math.min(mState.page, pages);
  const start = (mState.page - 1) * mState.size, view = rows.slice(start, start + mState.size);
  const cols = MCOLS.filter(([k]) => !mState.hidden.has(k));
  $('mThead').innerHTML = `<tr>${cols.map(([, l]) => `<th>${l}</th>`).join('')}</tr>`;
  $('mTbody').innerHTML = view.length
    ? view.map(m => `<tr data-row="${MILEAGES.indexOf(m)}" class="${mEditing?.rec === m ? 'editing' : ''}" title="Klik untuk edit">${cols.map(([k]) => `<td>${esc(mVal(m, k))}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${cols.length}" class="empty" style="text-align:center">${MILEAGES.length ? 'No mileage data found for the selected criteria.' : 'No mileage data found.'}</td></tr>`;
  $('mInfo').textContent = rows.length ? `Showing ${start + 1} to ${start + view.length} of ${rows.length} records` : '';
  let html = `<button data-p="${mState.page - 1}" ${mState.page === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= pages; p++) html += `<button data-p="${p}" class="${p === mState.page ? 'cur' : ''}">${p}</button>`;
  $('mPager').innerHTML = html + `<button data-p="${mState.page + 1}" ${mState.page === pages ? 'disabled' : ''}>›</button>`;
}
$('mQuick').addEventListener('input', e => { mState.q = e.target.value; mState.page = 1; mRender(); });
$('mPager').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { mState.page = +b.dataset.p; mRender(); } });
$('mPageSize').addEventListener('change', e => { mState.size = +e.target.value; mState.page = 1; mRender(); });

// ---------- Form: Save adds a route; clicking a row loads it for edit ----------
let mEditing = null, saving = false;
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
  // Edit keeps the route; From / To are read only and only Mileage changes
  mfFrom.set(rec?.from, rec ? `${rec.from} - ${locName(rec.from)}` : undefined);
  mfTo.set(rec?.to, rec ? `${rec.to} - ${locName(rec.to)}` : undefined);
  mfFrom.disable(!!rec); mfTo.disable(!!rec);
  $('mfMileage').value = rec ? rec.mileage : '';
  mfErrors({}); setSaving(false); mRender();
}
function setSaving(b) {
  saving = b;
  $('mfSave').disabled = b; $('mfCancel').disabled = b;
  $('mfSave').classList.toggle('btn-busy', b);
  $('mfSaveLbl').textContent = b ? 'Saving...' : 'Save';
}
$('mfCancel').addEventListener('click', () => { setForm(null); toast('Form dikosongkan'); });
$('mfSave').addEventListener('click', () => {
  if (saving) return;   // prevent double submission
  const form = { from: mfFrom.value, to: mfTo.value, mileage: $('mfMileage').value, status: MM.STATUS.ACTIVE };
  setSaving(true);
  setTimeout(() => {
    const now = new Date();
    const res = mEditing ? MM.update(form, MILEAGES, LOCATIONS, mEditing.rec, mEditing.version, USER, now) : MM.add(form, MILEAGES, LOCATIONS, USER, now);
    setSaving(false);
    if (!res.ok) { mfErrors(res.errors); toast(Object.values(res.errors)[0]); return; }
    setForm(null); toast(res.message);
  }, LATENCY);
});
$('mTbody').addEventListener('click', e => {
  const tr = e.target.closest('tr[data-row]'); if (!tr) return;
  const rec = MILEAGES[+tr.dataset.row];
  setForm(rec); $('mfMileage').focus();
  toast(`Edit ${rec.from} → ${rec.to}: ubah Mileage lalu Save, atau Cancel`);
});

// ---------- Export .xls ----------
$('mExport').addEventListener('click', () => {
  const rows = mFiltered(), cols = MCOLS.filter(([k]) => !mState.hidden.has(k));
  const x = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#DFE4EC" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Route Mileage"><Table>
<Row>${cols.map(([, l]) => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(l)}</Data></Cell>`).join('')}</Row>
${rows.map(m => `<Row>${cols.map(([k]) => k === 'mileage'
    ? `<Cell><Data ss:Type="Number">${m.mileage}</Data></Cell>`
    : `<Cell><Data ss:Type="String">${x(mVal(m, k))}</Data></Cell>`).join('')}</Row>`).join('\n')}
</Table></Worksheet></Workbook>`;
  const a = document.createElement('a'), d = new Date();
  a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
  a.download = `Route_Mileage_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.xls`;
  a.click(); URL.revokeObjectURL(a.href);
  toast(`${rows.length} baris diexport`);
});

setForm(null);
