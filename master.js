// ELIPS Master mock-up UI. Trucking Company rules live in master-trucking.js.
const T = window.MasterTrucking;

const pad = (n, l = 2) => String(n).padStart(l, '0');
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmtDT = d => d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 3000);
}
const USER = 'ielp1';

// ---------- Seed data (first rows as on the reference screen) ----------
const VENDORS = [];
const seedAt = new Date(2026, 0, 15, 9, 0);
[
  ['ARMAS LOGISTIC SERVICE', 'ALS', '4000006571', '243.254.236.5-436.341'],
  ['PNJ', 'PNJ', 'PNJ', '436.436.546.4-364.374', { deleted: true }],
  ['PT TOYOTA TSUSHO NUSA TRANSPORT', 'TTN', '4000007868', '325.532.414.1-242.519'],
  ['PT YUSEN LOGISTICS INTERLINK', 'PYL', '4000007525', '111.111.111.1-111.112'],
  ['PT. NISSHO SOLUTION INDONESIA', 'NSI', '4000008030', '354.754.643.5-241.239'],
  ['PT. SUMISHO GLOBAL LOGISTICS INDONE', 'SGL', '4000007740', '222.222.222.2-222.221'],
  ['PT.AGUNG JASA LOGISTIK', 'AJL', '4000006515', '214.151.351.3-521.513'],
  ['PT.DUNIA EXPRESS TRANSINDO', 'DNX', '4000006763', '214.231.532.5-235.356'],
  ['PT. EMKL JAKARTA MAJU PUSAKA', 'JMP', '4000006802', '216.402.118.3-411.208', { contact: 'Hendra Saputra', email: 'hendra@jmp.co.id', phone: '021-4401234', mobile: '081234567801', address: 'Jl. Yos Sudarso No. 12, Tanjung Priok, Jakarta Utara' }],
  ['PT. PUSAKA BAHARI MANDIRI', 'PBM', '4000006815', '216.552.903.1-042.117', { contact: 'Asep Sukirno', email: 'ops@pusakabahari.co.id', phone: '021-4350011', mobile: '081298765432', address: 'Jl. Cakung Cilincing Raya No. 8, Jakarta Utara' }],
  ['PT. PUNINAR JAYA', 'PNJ', '4000006890', '217.118.405.2-046.331', { contact: 'Rudi Hartono', email: 'rudi.h@puninar.co.id', phone: '021-4600900', mobile: '081311223344', address: 'Jl. Raya Cakung Cilincing Km. 1,5, Jakarta Timur' }],
  ['PT. VIFIERA MINOVA BERSAUDARA', 'VMB', '4000006911', '218.330.517.6-415.902'],
  ['PT. AGUNG RAYA', 'AGR', '4000006925', '218.774.120.4-431.009'],
  ['PT. GALUH INTI BAHARI', 'GIB', '4000006938', '219.001.654.8-046.512'],
  ['PT. IRON BIRD TRANSPORT', 'IBT', '4000006942', '219.226.390.7-073.118'],
  ['PT. MENTARI JAYA RAYA', 'MJR', '4000006957', '219.447.812.5-431.640'],
  ['PT. PANCARAN LOGISTIK INDONESIA', 'PLI', '4000006963', '219.668.073.2-046.725'],
  ['PT. SERASI LOGISTICS', 'SRL', '4000006978', '219.889.245.9-073.304'],
  ['PT. TOYOFUJI LOGISTICS', 'TFL', '4000006984', '220.110.536.1-431.887'],
].forEach(([name, code, sapCode, npwp, x = {}]) => VENDORS.push({
  name, code, sapCode, serviceType: 'MRO', npwp, contact: '', email: '', phone: '', mobile: '', address: '', deleted: false,
  createdBy: 'ielp1', createdAt: seedAt, updatedBy: 'ielp1', updatedAt: seedAt, version: 1, ...x,
}));
// Trucking companies still used by open transactions cannot be deleted (TBD which transactions count)
const USAGE = { DNX: 'PO Monthly berstatus Pending (PODNX26111254)', PBM: 'Daily Order aktif dan PR Monthly yang belum selesai' };

// ---------- Views ----------
const VIEWS = {
  'trucking-company': 'Trucking Company', mileage: 'Mileage', price: 'Price', 'location-code': 'Location Code',
  priority: 'Priority', renban: 'Renban', kpi: 'KPI', 'route-percentage': 'Route Percentage',
};
// Built pages per submenu; the others show a placeholder
const PAGES = { 'trucking-company': 'content', 'location-code': 'locContent', mileage: 'milContent', price: 'prcContent' };
const TITLES = { 'location-code': 'Location', mileage: 'Route Mileage', price: 'Pricing Data' };
// Pages whose heading does not start with "Master" (as on the existing screen)
const HEADINGS = { mileage: 'Route Mileage', price: 'Pricing Data' };
function go(view) {
  if (!VIEWS[view]) view = 'trucking-company';
  document.querySelectorAll('#masterSub a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  $('pageTitle').textContent = HEADINGS[view] || `Master ${TITLES[view] || VIEWS[view]}`;
  $('crumb').innerHTML = `Master &nbsp;-&nbsp; ${TITLES[view] || VIEWS[view]}`;
  Object.entries(PAGES).forEach(([v, id]) => { $(id).style.display = v === view ? '' : 'none'; });
  $('emptyPage').style.display = PAGES[view] ? 'none' : '';
  $('emptyTitle').textContent = `Master ${VIEWS[view]}`;
  document.dispatchEvent(new CustomEvent('masterview', { detail: view }));
}
window.addEventListener('hashchange', () => go(location.hash.slice(1)));
$('masterToggle').addEventListener('click', e => { e.preventDefault(); $('masterSub').classList.toggle('collapsed'); });
document.querySelectorAll('[data-page]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); toast(`Halaman "${a.dataset.page}" belum tersedia di mock-up ini`); }));
$('btnDriverApp').addEventListener('click', () => toast('Download Driver App (mock-up)'));
$('btnLanding').addEventListener('click', () => toast('Menuju Landing Page (mock-up)'));

// ---------- Form (Add / Update) ----------
$('fService').innerHTML = T.SERVICE_TYPES.map(s => `<option>${s}</option>`).join('');
let editing = null;   // { vendor, version } while in Update mode

function showErrors(errors) {
  document.querySelectorAll('#vForm .f').forEach(f => { f.classList.remove('err'); f.querySelector('.msg')?.remove(); });
  Object.entries(errors).forEach(([k, m]) => {
    const f = document.querySelector(`#vForm [data-f="${k}"]`);
    if (f) { f.classList.add('err'); f.insertAdjacentHTML('beforeend', `<div class="msg">${esc(m)}</div>`); }
  });
  if (errors._) toast(errors._);
  const first = document.querySelector('#vForm .err input, #vForm .err select, #vForm .err textarea');
  first?.focus();
}
function readForm() { return Object.fromEntries([...new FormData($('vForm'))]); }
function resetForm() {
  $('vForm').reset(); $('fService').value = T.SERVICE_TYPES[0];
  $('fCode').readOnly = false; editing = null; showErrors({});
  $('saveLabel').textContent = 'Save';
  $('modeInfo').innerHTML = 'Mode: <b>Add</b> trucking company baru';
  render();
}
function startUpdate(v) {
  editing = { vendor: v, version: v.version };
  T.FIELDS.forEach(([k]) => { $('vForm').elements[k].value = v[k] ?? ''; });
  $('fCode').readOnly = true; showErrors({});
  $('saveLabel').textContent = 'Save';
  $('modeInfo').innerHTML = `Mode: <b>Update</b> ${esc(v.code)} - ${esc(v.name)} (Vendor Code tidak bisa diubah)`;
  render();
  $('fName').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$('fNpwp').addEventListener('blur', e => { e.target.value = T.formatNPWP(e.target.value); });
$('fCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });

$('btnSave').addEventListener('click', () => {
  const now = new Date();
  const res = editing ? T.update(readForm(), VENDORS, editing.vendor, editing.version, USER, now) : T.add(readForm(), VENDORS, USER, now);
  if (!res.ok) { showErrors(res.errors); return; }
  const v = res.vendor, wasEdit = !!editing;
  resetForm();
  state.search = ''; $('search').value = '';
  render();
  toast(`${v.code} - ${v.name} berhasil ${wasEdit ? 'di-update' : 'ditambahkan'}`);
});
$('btnCancel').addEventListener('click', () => { resetForm(); toast('Form dikosongkan'); });

// ---------- List ----------
const COLS = [
  ['name', 'Vendor Name'], ['code', 'Vendor Code'], ['sapCode', 'SAP Vendor Code'], ['serviceType', 'Service Type'], ['npwp', 'NPWP'],
  ['contact', 'Contact Name'], ['email', 'E-Mail'], ['phone', 'Phone'], ['mobile', 'Mobile Phone'], ['address', 'Address'],
  ['deleted', 'Deletion'], ['createdBy', 'Created By'], ['createdAt', 'Created Date'], ['updatedBy', 'Updated By'], ['updatedAt', 'Updated Date'],
];
const NOWRAP = new Set(['code', 'sapCode', 'serviceType', 'npwp', 'phone', 'mobile', 'deleted', 'createdAt', 'updatedAt']);
const state = { search: '', sortKey: 'name', sortDir: 1, page: 1, size: 10, hidden: new Set(['createdBy', 'createdAt', 'updatedBy', 'updatedAt']) };
$('viewMenu').innerHTML = COLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" ${state.hidden.has(k) ? '' : 'checked'}> ${l}</label>`).join('');
$('viewMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? state.hidden.delete(k) : state.hidden.add(k); render(); });

const cell = (v, k) => k === 'deleted' ? `<span class="yn ${v.deleted ? 'yes' : 'no'}">${v.deleted ? 'Yes' : 'No'}</span>`
  : v[k] instanceof Date ? fmtDT(v[k]) : esc(v[k]);
function filtered() {
  const q = state.search.trim().toLowerCase();
  const rows = VENDORS.filter(v => !q || COLS.some(([k]) => String(k === 'deleted' ? (v.deleted ? 'yes' : 'no') : v[k] instanceof Date ? fmtDT(v[k]) : v[k] ?? '').toLowerCase().includes(q)));
  const k = state.sortKey, val = v => v[k] instanceof Date ? v[k].getTime() : String(v[k]);
  return rows.sort((a, b) => val(a) < val(b) ? -state.sortDir : val(a) > val(b) ? state.sortDir : 0);
}
function render() {
  const cols = COLS.filter(([k]) => !state.hidden.has(k));
  $('thead').innerHTML = `<tr>${cols.map(([k, l]) => `<th class="sortable" data-sort="${k}">${l}${state.sortKey === k ? `<span class="arrow">${state.sortDir === 1 ? '▲' : '▼'}</span>` : ''}</th>`).join('')}<th>Action</th></tr>`;
  const rows = filtered(), pages = Math.max(1, Math.ceil(rows.length / state.size));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.size, view = rows.slice(start, start + state.size);
  $('tbody').innerHTML = view.length ? view.map(v => {
    const i = VENDORS.indexOf(v), dis = v.deleted ? 'disabled title="Sudah dihapus"' : '';
    return `<tr class="${editing?.vendor === v ? 'editing' : ''}">${cols.map(([k]) => `<td class="${NOWRAP.has(k) ? 'nw' : k === 'address' ? 'addr' : ''}">${cell(v, k)}</td>`).join('')}
      <td class="act-cell"><button class="btn-del" data-del="${i}" ${dis}>&#128465; Delete</button><button class="btn-upd" data-upd="${i}" ${dis}>&#9998; Update</button></td></tr>`;
  }).join('') : `<tr><td colspan="${cols.length + 1}" class="empty" style="text-align:center">No Data Found</td></tr>`;
  $('info').textContent = rows.length ? `Showing ${start + 1} to ${start + view.length} of ${rows.length} records` + (rows.length !== VENDORS.length ? ` (filtered from ${VENDORS.length} total entries)` : '') : 'Showing 0 to 0 of 0 records';
  let html = `<button data-p="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= pages; p++) html += `<button data-p="${p}" class="${p === state.page ? 'cur' : ''}">${p}</button>`;
  $('pager').innerHTML = html + `<button data-p="${state.page + 1}" ${state.page === pages ? 'disabled' : ''}>›</button>`;
}
$('thead').addEventListener('click', e => {
  const th = e.target.closest('th[data-sort]'); if (!th) return;
  state.sortDir = state.sortKey === th.dataset.sort ? -state.sortDir : 1; state.sortKey = th.dataset.sort; render();
});
$('search').addEventListener('input', e => { state.search = e.target.value; state.page = 1; render(); });
$('pager').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { state.page = +b.dataset.p; render(); } });
$('pageSize').addEventListener('change', e => { state.size = +e.target.value; state.page = 1; render(); });
document.querySelectorAll('.dd > button').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); btn.parentElement.classList.toggle('open'); }));
document.querySelectorAll('.dd-menu').forEach(m => m.addEventListener('click', e => e.stopPropagation()));
document.addEventListener('click', () => document.querySelectorAll('.dd').forEach(x => x.classList.remove('open')));

// ---------- Update / Delete ----------
function showPreview(title, body, foot) { $('pvTitle').textContent = title; $('pvBody').innerHTML = body; $('pvFoot').innerHTML = foot; $('preview').classList.add('show'); }
const closePreview = () => $('preview').classList.remove('show');
$('pvClose').addEventListener('click', closePreview);
$('preview').addEventListener('click', e => { if (e.target === $('preview')) closePreview(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePreview(); });

$('tbody').addEventListener('click', e => {
  const u = e.target.closest('[data-upd]');
  if (u && !u.disabled) return startUpdate(VENDORS[+u.dataset.upd]);
  const d = e.target.closest('[data-del]');
  if (!d || d.disabled) return;
  const v = VENDORS[+d.dataset.del];
  showPreview('Delete Trucking Company', `<p style="font-size:11px;margin:0">Hapus <b>${esc(v.code)} - ${esc(v.name)}</b>?<br>
      Data tidak dihapus permanen: Deletion menjadi <b>Yes</b> dan trucking company ini tidak bisa dipilih lagi di transaksi baru.</p>`,
    `<button class="btn-outline" id="delCancel">Batal</button><button class="btn-red2" style="height:30px;background:#f43f5e;color:#fff;border:0;border-radius:5px;padding:0 14px;font-weight:600" id="delOk">Delete</button>`);
  $('delCancel').onclick = closePreview;
  $('delOk').onclick = () => {
    const res = T.remove(v, USAGE, USER, new Date());
    closePreview();
    if (!res.ok) { toast(res.error); return; }
    if (editing?.vendor === v) resetForm();
    render(); toast(`${v.code} - ${v.name} dihapus (Deletion = Yes)`);
  };
});

// ---------- Export .xls (SpreadsheetML, opens in Excel) ----------
$('btnExport').addEventListener('click', () => {
  const rows = filtered(), cols = COLS.filter(([k]) => !state.hidden.has(k));
  const x = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const val = (v, k) => k === 'deleted' ? (v.deleted ? 'Yes' : 'No') : v[k] instanceof Date ? fmtDT(v[k]) : v[k];
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#DFE4EC" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Trucking Company"><Table>
<Row>${cols.map(([, l]) => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(l)}</Data></Cell>`).join('')}</Row>
${rows.map(v => `<Row>${cols.map(([k]) => `<Cell><Data ss:Type="String">${x(val(v, k))}</Data></Cell>`).join('')}</Row>`).join('\n')}
</Table></Worksheet></Workbook>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
  const d = new Date();
  a.download = `Master_Trucking_Company_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.xls`;
  a.click(); URL.revokeObjectURL(a.href);
  toast(`${rows.length} baris diexport`);
});

go(location.hash.slice(1) || 'trucking-company');
render();
