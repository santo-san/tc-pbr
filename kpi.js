// ELIPS Master KPI mock-up UI, following the existing Master KPI screen.
// Shares helpers from master.js (VENDORS, showPreview), combo() from mileage.js; rules live in master-kpi.js.
const MK = window.MasterKpi;
const fmtKpi = d => d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : '-';
const vendorLabel = code => { const v = VENDORS.find(x => x.code === code && !x.deleted) || VENDORS.find(x => x.code === code); return v ? `${code} - ${v.name}` : code; };

// ---------- Seed data (as on the reference screen) ----------
const KPI_ITEMS = [];
[['SAFETY', 'Safety'], ['COMM', 'Comm.'], ['FLEXI', 'Flexi.'], ['LEGAL', 'Legal'], ['KPI', 'KPI'], ['TPS', 'TPS'], ['TAX', 'Tax'], ['QCC', 'QCC']]
  .forEach(([key, label], i) => KPI_ITEMS.push({ key, label, color: MK.PALETTE[i] }));
const KPI_SEED = { SAFETY: 45, COMM: 45, FLEXI: 45, LEGAL: 45, KPI: 170, TPS: 200, TAX: 50, QCC: 50 };
const KPIS = [];
const kpiSeedAt = new Date(2026, 4, 21, 9, 15, 0);
MK.SEED.forEach(({ partner, paymentType, score, orderSharing, values }) => KPIS.push({
  partner, paymentType, score, values: Object.fromEntries(KPI_ITEMS.map((it, i) => [it.key, values?.[i] ?? KPI_SEED[it.key]])), orderSharing, uom: MK.UOM,
  createdBy: 'SYSTEM', createdAt: kpiSeedAt, changedBy: 'SYSTEM', changedAt: kpiSeedAt, version: 1,
}));

// ---------- Toolbar: new KPI item, new trucking company ----------
const kAlert = msg => { $('kAlert').innerHTML = msg ? `<div class="form-alert-m">${esc(msg)}</div>` : ''; };
const freePartners = () => VENDORS.filter(v => !v.deleted && !KPIS.some(r => r.partner === v.code && r.paymentType === $('kType').value))
  .sort((a, b) => a.code < b.code ? -1 : 1).map(v => ({ value: v.code, label: `${v.code} - ${v.name}` }));
const kPartner = combo($('kPartner'), { options: freePartners, placeholder: 'Select Trucking Company', empty: 'No trucking company found' });
let kEdit = null, kFlash = null;   // kEdit = { row, version } while a row is edited in the grid

function busyEditing() {
  if (!kEdit) return false;
  toast(`Simpan (✓) atau batalkan (✕) perubahan ${kEdit.row.partner} dulu`); return true;
}
$('kAddKpi').addEventListener('click', () => {
  if (busyEditing()) return;
  const res = MK.addItem(KPI_ITEMS, KPIS, $('kNewKpi').value);
  if (!res.ok) { kAlert(res.error); toast(res.error); $('kNewKpi').focus(); return; }
  kAlert(''); $('kNewKpi').value = '';
  kState.hidden.delete(res.item.key); kBuildViewMenu(); kRender(); toast(res.message);
});
$('kNewKpi').addEventListener('keydown', e => { if (e.key === 'Enter') $('kAddKpi').click(); });
$('kAddPartner').addEventListener('click', () => {
  if (busyEditing()) return;
  const res = MK.addCompany(KPIS, KPI_ITEMS, VENDORS, kPartner.value, USER, new Date(), $('kType').value);
  if (!res.ok) { kAlert(res.error); toast(res.error); return; }
  kAlert(''); kPartner.set('');
  kState.q = ''; $('kQuick').value = ''; if (kState.pt && kState.pt !== res.row.paymentType) { kState.pt = ''; kTabs(); }
  kStartEdit(res.row, 'score'); toast(res.message);
});

// ---------- Grid ----------
// Fixed columns around the KPI items: [key, label]
const K_BEFORE = [['paymentType', 'Payment Type'], ['no', 'No'], ['partner', 'Trucking Company'], ['score', 'Score'], ['grade', 'Grade']];
const K_AFTER = [['total', 'Total'], ['orderSharing', 'Order Sharing'], ['uom', 'UoM'], ['createdAt', 'Created Dt'], ['createdBy', 'Created By'], ['changedAt', 'Changed Dt'], ['changedBy', 'Changed By']];
const kState = { q: '', page: 1, size: 10, hidden: new Set(), pt: '' };   // pt = Payment Type tab ('' = All)
// Rows sorted By Resources first, then By Trip (as the two tables of the reference); No = position within the payment type
const kSorted = () => MK.PAYMENT_TYPES.flatMap(t => KPIS.filter(r => r.paymentType === t));
const kNo = r => KPIS.filter(x => x.paymentType === r.paymentType).indexOf(r) + 1;
function kTabs() { document.querySelectorAll('#kTabs button').forEach(b => b.classList.toggle('on', b.dataset.pt === kState.pt)); }
$('kTabs').addEventListener('click', e => { const b = e.target.closest('[data-pt]'); if (!b || busyEditing()) return; kState.pt = b.dataset.pt; kState.page = 1; kTabs(); kRender(); });
$('kType').addEventListener('change', () => kPartner.set(''));
const kCols = () => [...K_BEFORE, ...KPI_ITEMS.map(it => [it.key, it.label, it]), ...K_AFTER].filter(([k]) => !kState.hidden.has(k));
function kBuildViewMenu() {
  $('kViewMenu').innerHTML = [...K_BEFORE, ...KPI_ITEMS.map(it => [it.key, it.label]), ...K_AFTER]
    .map(([k, l]) => `<label><input type="checkbox" data-k="${k}" ${kState.hidden.has(k) ? '' : 'checked'}> ${esc(l)}</label>`).join('');
}
$('kViewMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? kState.hidden.delete(k) : kState.hidden.add(k); kRender(); });

const kVal = (r, k) => k === 'partner' ? vendorLabel(r.partner) : k === 'no' ? kNo(r) : k === 'orderSharing' ? MK.fmtShare(r) : k === 'grade' ? MK.grade(r.score) : k === 'total' ? MK.total(r, KPI_ITEMS)
  : r.values[k] !== undefined && KPI_ITEMS.some(it => it.key === k) ? r.values[k] : r[k] instanceof Date ? fmtKpi(r[k]) : r[k];
const EDITABLE = k => k === 'score' || k === 'orderSharing' || KPI_ITEMS.some(it => it.key === k);
function kFiltered() {
  const q = kState.q.trim().toLowerCase();
  return kSorted().filter(r => (!kState.pt || r.paymentType === kState.pt) && (!q || kCols().some(([k]) => String(kVal(r, k)).toLowerCase().includes(q))));
}
function kRender() {
  const rows = kFiltered(), pages = Math.max(1, Math.ceil(rows.length / kState.size));
  kState.page = Math.min(kState.page, pages);
  const start = (kState.page - 1) * kState.size, view = rows.slice(start, start + kState.size), cols = kCols();
  $('kThead').innerHTML = `<tr><th>Action</th>${cols.map(([k, l, it]) => it
    ? `<th class="item" style="background:${it.color}">${esc(l)}<button class="kdel" data-delitem="${k}" title="Hapus KPI ${esc(l)}">&times;</button></th>`
    : `<th class="${k === 'total' ? 'tot' : k === 'orderSharing' ? 'osh' : ''}">${l}</th>`).join('')}</tr>`;
  $('kTbody').innerHTML = view.length ? view.map(r => {
    const i = KPIS.indexOf(r), ed = kEdit?.row === r;
    const act = ed ? `<div class="kact"><button class="ok" data-save="${i}" title="Save">&#10003;</button><button class="del" data-cancel="${i}" title="Cancel">&#10005;</button></div>`
      : `<div class="kact"><button data-edit="${i}" title="Edit">&#9998;</button><button class="del" data-del="${i}" title="Delete">&#128465;</button></div>`;
    const trip = r.paymentType === MK.PAYMENT_BY_TRIP, inelig = trip && !(+r.orderSharing > 0) && !ed;
    const grp = !kState.pt && view[view.indexOf(r) - 1]?.paymentType !== r.paymentType
      ? `<tr class="grp"><td colspan="${cols.length + 1}">${esc(r.paymentType)} · Order Sharing ${trip ? '= % of the trips by trip (total must be 100%)' : '= trucks per day (daily limit)'}</td></tr>` : '';
    return `${grp}<tr data-row="${i}" class="${ed ? 'editing' : ''} ${kFlash === r ? 'flash' : ''} ${inelig ? 'inelig' : ''}" ${inelig ? 'title="Not eligible: no By Trip Order Sharing"' : ''}><td>${act}</td>${cols.map(([k]) => {
      const cls = [k === 'partner' ? 'left' : '', k === 'paymentType' ? (trip ? 'pt-trip' : 'pt-res') : '', k === 'total' ? 'tot' : '', k === 'orderSharing' ? 'osh' : '', EDITABLE(k) ? 'ed' : '', k.endsWith('At') ? 'dt' : ''].join(' ');
      const v = ed && k === 'orderSharing' ? r.orderSharing : kVal(r, k);
      const body = ed && EDITABLE(k) ? `<input inputmode="${k === 'orderSharing' && trip ? 'decimal' : 'numeric'}" data-k="${k}" value="${esc(v)}" ${k === 'orderSharing' && trip ? 'placeholder="0.00" title="% of the trips by trip, max 2 decimals"' : ''}>`
        : k === 'grade' ? `<span class="grade ${v}">${v}</span>` : esc(v);
      return `<td class="${cls}" data-k="${k}">${body}</td>`;
    }).join('')}</tr>`;
  }).join('') : `<tr><td colspan="${cols.length + 1}" class="empty">${KPIS.length ? 'No KPI data found for the selected criteria.' : 'No KPI data found.'}</td></tr>`;
  kFlash = null;
  $('kInfo').textContent = rows.length ? `Menampilkan ${start + 1} - ${start + view.length} dari ${rows.length} data` : 'Menampilkan 0 data';
  $('kTbr').textContent = MK.totalByResource(KPIS);
  const tbt = MK.totalByTrip(KPIS), hasTrip = KPIS.some(r => r.paymentType === MK.PAYMENT_BY_TRIP);
  $('kTbt').innerHTML = `${tbt.toFixed(2)}%${hasTrip && tbt !== 100 ? '<small>must be 100%</small>' : ''}`;
  $('kTbtBox').classList.toggle('bad', hasTrip && tbt !== 100);
  kRenderAlloc(); $('kTbtBox').title = hasTrip && tbt !== 100 ? MK.MSG.pctSum(tbt) : 'Sum of the By Trip Order Sharing';
  let html = `<button data-p="${kState.page - 1}" ${kState.page === 1 ? 'disabled' : ''} aria-label="Previous page">&lsaquo;</button>`;
  for (let p = 1; p <= pages; p++) html += `<button data-p="${p}" class="${p === kState.page ? 'cur' : ''}">${p}</button>`;
  $('kPager').innerHTML = html + `<button data-p="${kState.page + 1}" ${kState.page === pages ? 'disabled' : ''} aria-label="Next page">&rsaquo;</button>`;
}
// ---------- By Trip daily trip allocation (KP-15 / KP-16): trips per day shared by Order Sharing % ----------
let TRIPS_PER_DAY = MK.DAILY_TRIPS;
function kRenderAlloc() {
  const rows = KPIS.filter(r => r.paymentType === MK.PAYMENT_BY_TRIP && +r.orderSharing > 0).sort((a, b) => b.orderSharing - a.orderSharing || a.partner.localeCompare(b.partner));
  $('kAllocBox').style.display = kState.pt === MK.PAYMENT_BY_RESOURCE ? 'none' : '';
  const a = MK.allocateTrip(KPIS, TRIPS_PER_DAY);
  $('kAllocNote').textContent = rows.length ? `${rows.length} eligible companies · 1 trip each first, the rest by Order Sharing %` : 'No By Trip company with Order Sharing';
  $('kAlloc').innerHTML = `<tr><th>No</th><th>Trucking Company</th><th>Order Sharing</th><th>Trip / day</th></tr>${rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${esc(vendorLabel(r.partner))}</td><td class="p">${MK.fmtShare(r)}</td><td class="n">${a[r.partner]}</td></tr>`).join('')}
    <tr class="tot"><td></td><td class="l">Total</td><td>${MK.totalByTrip(KPIS).toFixed(2)}%</td><td>${Object.values(a).reduce((s, n) => s + n, 0)}</td></tr>`;
}
$('kTrips').addEventListener('input', e => {
  const ok = MK.validTrips(e.target.value); e.target.classList.toggle('err', !ok); e.target.title = ok ? '' : MK.MSG.trips;
  if (ok) { TRIPS_PER_DAY = +e.target.value; kRenderAlloc(); }
});
$('kQuick').addEventListener('input', e => { kState.q = e.target.value; kState.page = 1; kRender(); });
$('kPager').addEventListener('click', e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { kState.page = +b.dataset.p; kRender(); } });

// ---------- Grid edit (pencil, or click a number cell) ----------
function kStartEdit(row, focusKey) {
  kEdit = { row, version: row.version };
  const i = kFiltered().indexOf(row); if (i >= 0) kState.page = Math.floor(i / kState.size) + 1;
  kRender();
  const inp = document.querySelector(`#kTbody tr.editing input[data-k="${focusKey}"]`) || document.querySelector('#kTbody tr.editing input');
  inp?.focus(); inp?.select();
}
function kForm() {
  const get = k => document.querySelector(`#kTbody tr.editing input[data-k="${k}"]`)?.value ?? '';
  return { score: get('score'), orderSharing: get('orderSharing'), values: Object.fromEntries(KPI_ITEMS.map(it => [it.key, get(it.key)])) };
}
function kSave() {
  const row = kEdit.row, form = kForm();
  // Hidden columns keep their current value
  if (kState.hidden.has('score')) form.score = String(row.score);
  if (kState.hidden.has('orderSharing')) form.orderSharing = String(row.orderSharing);
  KPI_ITEMS.forEach(it => { if (kState.hidden.has(it.key)) form.values[it.key] = String(row.values[it.key]); });
  const res = MK.updateRow(KPIS, KPI_ITEMS, row, kEdit.version, form, USER, new Date());
  if (res.ok && row.paymentType === MK.PAYMENT_BY_TRIP && MK.totalByTrip(KPIS) !== 100) res.message += ` Note: ${MK.MSG.pctSum(MK.totalByTrip(KPIS))}`;
  document.querySelectorAll('#kTbody td.err').forEach(td => td.classList.remove('err'));
  if (!res.ok) {
    Object.keys(res.errors).forEach(k => document.querySelector(`#kTbody tr.editing td[data-k="${k}"]`)?.classList.add('err'));
    const first = Object.values(res.errors)[0]; kAlert(first); toast(first); return;
  }
  kAlert(''); kEdit = null; kFlash = row; kRender(); toast(res.message);
}
function kCancel() { kEdit = null; kAlert(''); kRender(); }
// Live Total / Grade while typing
$('kTbody').addEventListener('input', e => {
  if (!e.target.matches('input[data-k]') || !kEdit) return;
  const f = kForm(), tr = e.target.closest('tr');
  const tot = KPI_ITEMS.reduce((s, it) => s + (+(kState.hidden.has(it.key) ? kEdit.row.values[it.key] : f.values[it.key]) || 0), 0);
  const tTd = tr.querySelector('td[data-k="total"]'); if (tTd) tTd.textContent = tot;
  const gTd = tr.querySelector('td[data-k="grade"]');
  if (gTd && e.target.dataset.k === 'score' && /^\d+$/.test(f.score)) { const g = MK.grade(Math.min(+f.score, MK.MAX_SCORE)); gTd.innerHTML = `<span class="grade ${g}">${g}</span>`; }
});
$('kTbody').addEventListener('keydown', e => {
  if (!e.target.matches('input[data-k]')) return;
  if (e.key === 'Enter') { e.preventDefault(); kSave(); }
  if (e.key === 'Escape') kCancel();
});
$('kTbody').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) {
    if (b.dataset.save) return kSave();
    if (b.dataset.cancel) return kCancel();
    const row = KPIS[+(b.dataset.edit ?? b.dataset.del)];
    if (busyEditing()) return;
    if (b.dataset.edit) return kStartEdit(row, 'score');
    showPreview('Delete Trucking Company', `<p style="font-size:11px;margin:0">Hapus <b>${esc(vendorLabel(row.partner))}</b> (${esc(row.paymentType)}) dari Master KPI?<br>
        ${row.paymentType === MK.PAYMENT_BY_TRIP ? `Order Sharing ${MK.fmtShare(row)} tidak lagi dihitung di Total By Trip dan pembagian trip by trip di Planning Order.`
        : `Order Sharing ${row.orderSharing} tidak lagi dihitung di Total By Resource, daily order assignment dan daily QTY PR creation.`}</p>`,
      `<button class="btn-outline" id="kDelCancel">Batal</button><button style="height:30px;background:#f43f5e;color:#fff;border:0;border-radius:5px;padding:0 14px;font-weight:600" id="kDelOk">Delete</button>`);
    $('kDelCancel').onclick = closePreview;
    $('kDelOk').onclick = () => { const res = MK.removeCompany(KPIS, row); closePreview(); kRender(); toast(res.ok ? res.message : res.error); };
    return;
  }
  // Click on a number cell edits the row directly in the grid
  const td = e.target.closest('td.ed'); if (!td || e.target.matches('input')) return;
  const row = KPIS[+td.parentElement.dataset.row];
  if (kEdit?.row === row) return;
  if (busyEditing()) return;
  kStartEdit(row, td.dataset.k);
});
// Delete a KPI item (column)
$('kThead').addEventListener('click', e => {
  const b = e.target.closest('[data-delitem]'); if (!b) return;
  if (busyEditing()) return;
  const it = KPI_ITEMS.find(x => x.key === b.dataset.delitem);
  showPreview('Delete KPI', `<p style="font-size:11px;margin:0">Hapus KPI <b>${esc(it.label)}</b>?<br>
      Nilai ${esc(it.label)} semua trucking company dihapus dan Total dihitung ulang.</p>`,
    `<button class="btn-outline" id="kDelCancel">Batal</button><button style="height:30px;background:#f43f5e;color:#fff;border:0;border-radius:5px;padding:0 14px;font-weight:600" id="kDelOk">Delete</button>`);
  $('kDelCancel').onclick = closePreview;
  $('kDelOk').onclick = () => { const res = MK.removeItem(KPI_ITEMS, KPIS, it.key); closePreview(); kState.hidden.delete(it.key); kBuildViewMenu(); kRender(); toast(res.ok ? res.message : res.error); };
});

// ---------- Export XLS ----------
$('kExport').addEventListener('click', () => {
  const rows = kFiltered(), cols = kCols();
  const x = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#DFE4EC" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Master KPI"><Table>
<Row>${cols.map(([, l]) => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(l)}</Data></Cell>`).join('')}</Row>
${rows.map(r => `<Row>${cols.map(([k]) => { const v = k === 'orderSharing' ? r.orderSharing : kVal(r, k); return typeof v === 'number'
    ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>` : `<Cell><Data ss:Type="String">${x(v)}</Data></Cell>`; }).join('')}</Row>`).join('\n')}
<Row><Cell ss:StyleID="h"><Data ss:Type="String">Total By Resource</Data></Cell><Cell><Data ss:Type="Number">${MK.totalByResource(KPIS)}</Data></Cell></Row>
<Row><Cell ss:StyleID="h"><Data ss:Type="String">Total By Trip (%)</Data></Cell><Cell><Data ss:Type="Number">${MK.totalByTrip(KPIS)}</Data></Cell></Row>
</Table></Worksheet></Workbook>`;
  const a = document.createElement('a'), d = new Date();
  a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
  a.download = `Master_KPI_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.xls`;
  a.click(); URL.revokeObjectURL(a.href);
  toast(`${rows.length} baris diexport`);
});

document.addEventListener('masterview', e => { if (e.detail === 'kpi') kRender(); });
kBuildViewMenu(); kRender();
