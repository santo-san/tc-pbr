// ELIPS Pricing Data (Master Price) mock-up UI: monitoring of eCatalogue prices per Logistic Partner (read only).
// Shares helpers from master.js / mileage.js (combo) and VENDORS (Master Trucking Company); rules live in master-price.js.
const MP = window.MasterPrice;
const TODAY = MP.ymd(new Date());
const money = n => Number(n).toLocaleString('en-US');
const partnerName = code => VENDORS.find(v => v.code === code && !v.deleted)?.name || code;
const fmtDTs = d => d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '-';

// ---------- Seed data (eCatalogue interface, first rows as on the reference screen) ----------
const PRICES = [];
(() => {
  const partners = { DNX: [28000000, 2600], PNJ: [29000000, 2800], PBM: [27500000, 2550], JMP: [28250000, 2650], SRL: [27800000, 2700] };
  const periods = ['202607', '202608', '202609', '202610', '202611', '202612'];
  let spk = 41;
  Object.entries(partners).forEach(([partner, [fix, km]]) => periods.forEach(period => {
    const raise = period >= '202610' ? 1 : 0;   // new SPK GAD / eCatalogue price from October 2026
    const y = +period.slice(0, 4), m = +period.slice(4, 6);
    // Synced from eCatalogue on the 24th of the period; prices for future periods were published at the last sync (24 Oct 2026)
    const created = new Date(Math.min(new Date(y, m - 1, 24, 15, 0), new Date(2026, 9, 24, 15, 0)));
    const base = { partner, period, vehicleType: 'TRAILER 40FT', effStart: MP.periodStart(period), effEnd: MP.periodEnd(period),
      createdBy: 'SYSTEM', createdAt: created, changedBy: '', changedAt: null };
    PRICES.push({ ...base, component: 'FIX', price: fix + raise * 500000, source: `eCatalogue · SPK GAD ${String(spk++).padStart(3, '0')}/GAD/${y}` });
    // SRL has no Price per KM published for Oct - Dec 2026 yet
    if (!(partner === 'SRL' && raise)) PRICES.push({ ...base, component: 'KM', price: km + raise * 100, source: `eCatalogue · EC-KM-${period}-${partner}` });
  }));
  // A re-synchronised record (price corrected in eCatalogue)
  const r = PRICES.find(p => p.partner === 'DNX' && p.period === '202610' && p.component === 'KM');
  Object.assign(r, { price: 2750, changedBy: 'SYSTEM', changedAt: new Date(2026, 9, 3, 9, 30) });
})();
const priceStatus = r => MP.status(r, TODAY);

// ---------- Filters ----------
const activePartners = () => VENDORS.filter(v => !v.deleted).sort((a, b) => a.code < b.code ? -1 : 1).map(v => ({ value: v.code, label: `${v.code} - ${v.name}` }));
const pPartner = combo($('pPartner'), { options: activePartners, placeholder: 'Select Trucking Company' });
const pState = { f: { period: '', partner: '', comp: '', status: '' }, q: '', page: 1, size: 10, hidden: new Set(['vehicleType', 'source']) };
function pLoad(fn) {
  $('pTableBox').classList.add('loading'); $('pSearch').disabled = true;
  setTimeout(() => { $('pTableBox').classList.remove('loading'); $('pSearch').disabled = false; fn(); }, 300);
}
$('pSearch').addEventListener('click', () => {
  pState.f = { period: $('pPeriod').value.replace('-', ''), partner: pPartner.value, comp: $('pComp').value, status: $('pStatus').value };
  pState.page = 1; pLoad(pRender);
});
$('pCancel').addEventListener('click', () => {
  $('pPeriod').value = ''; pPartner.set(''); $('pComp').value = ''; $('pStatus').value = ''; $('pQuick').value = '';
  pState.f = { period: '', partner: '', comp: '', status: '' }; pState.q = ''; pState.page = 1; pLoad(pRender);
});
$('pQuick').addEventListener('input', e => { pState.q = e.target.value; pState.page = 1; pRender(); });

// ---------- Table ----------
// [key, label, shown by default]
const PCOLS = [['period', 'Periode', 1], ['partner', 'Trucking Company', 1], ['vehicleType', 'Vehicle Type', 0], ['component', 'Component', 1], ['price', 'Price', 1],
  ['effStart', 'Effective Start', 1], ['effEnd', 'Effective End', 1], ['source', 'Source', 0], ['status', 'Status', 1],
  ['createdBy', 'Created By', 1], ['createdAt', 'Created Dt', 1], ['changedBy', 'Changed By', 1], ['changedAt', 'Changed Dt', 1]];
$('pViewMenu').innerHTML = PCOLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" ${pState.hidden.has(k) ? '' : 'checked'}> ${l}</label>`).join('');
$('pViewMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? pState.hidden.delete(k) : pState.hidden.add(k); pRender(); });

const pText = (r, k) => k === 'component' ? `${MP.COMPONENT[r.component].label} (${MP.COMPONENT[r.component].meaning})`
  : k === 'price' ? money(r.price)
  : k === 'status' ? priceStatus(r) : k === 'createdAt' || k === 'changedAt' ? fmtDTs(r[k]) : k === 'changedBy' ? r.changedBy || '-' : r[k];
function pFiltered() {
  const f = pState.f, q = pState.q.trim().toLowerCase();
  const rows = PRICES.filter(r => (!f.period || (r.effStart <= MP.periodEnd(f.period) && r.effEnd >= MP.periodStart(f.period)))
    && (!f.partner || r.partner === f.partner) && (!f.comp || r.component === f.comp) && (!f.status || priceStatus(r) === f.status)
    && (!q || PCOLS.some(([k]) => String(pText(r, k)).toLowerCase().includes(q)) || partnerName(r.partner).toLowerCase().includes(q)));
  // Latest period first, Mileage before Fix Cost, then partner (as on the reference screen)
  return rows.sort((a, b) => b.period.localeCompare(a.period) || (a.component === 'KM' ? -1 : 1) - (b.component === 'KM' ? -1 : 1) || a.partner.localeCompare(b.partner));
}
function pRender() {
  const rows = pFiltered(), pages = Math.max(1, Math.ceil(rows.length / pState.size));
  pState.page = Math.min(pState.page, pages);
  const start = (pState.page - 1) * pState.size, view = rows.slice(start, start + pState.size);
  const cols = PCOLS.filter(([k]) => !pState.hidden.has(k));
  $('pThead').innerHTML = `<tr>${cols.map(([, l]) => `<th>${l}</th>`).join('')}</tr>`;
  const cell = (r, k) => k === 'component' ? `<span class="cmp ${r.component}">${MP.COMPONENT[r.component].label}</span><span class="cmp-sub">${MP.COMPONENT[r.component].meaning}</span>`
    : k === 'price' ? money(r.price)
    : k === 'status' ? `<span class="pst ${priceStatus(r)}">${priceStatus(r) === 'Future' ? 'Future / Not Yet Active' : priceStatus(r)}</span>`
    : k === 'partner' ? `<span title="${esc(partnerName(r.partner))}">${r.partner}</span>` : esc(pText(r, k));
  $('pTbody').innerHTML = view.length ? view.map(r => `<tr>${cols.map(([k]) => `<td class="${k === 'price' ? 'num' : k.startsWith('eff') || k.endsWith('At') ? 'nw' : ''}">${cell(r, k)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${cols.length}" class="empty" style="text-align:center">${PRICES.length ? 'No price data found for the selected criteria.' : 'No price data found.'}</td></tr>`;
  $('pInfo').textContent = `Showing ${rows.length ? start + 1 : 0} to ${start + view.length} of ${rows.length} entries`;
  const from = Math.max(1, Math.min(pState.page - 2, pages - 4)), to = Math.min(pages, from + 4);
  let html = '';
  for (let p = from; p <= to; p++) html += `<button data-p="${p}" class="${p === pState.page ? 'cur' : ''}">${p}</button>`;
  $('pPages').innerHTML = html;
  document.querySelector('.prc-pager [data-pg=first]').disabled = document.querySelector('.prc-pager [data-pg=prev]').disabled = pState.page === 1;
  document.querySelector('.prc-pager [data-pg=next]').disabled = document.querySelector('.prc-pager [data-pg=last]').disabled = pState.page === pages;
  pState.pages = pages;
}
document.querySelector('.prc-pager').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const pg = b.dataset.pg;
  pState.page = pg === 'first' ? 1 : pg === 'prev' ? pState.page - 1 : pg === 'next' ? pState.page + 1 : pg === 'last' ? pState.pages : +b.dataset.p;
  pRender();
});
$('pSize').addEventListener('change', e => { pState.size = +e.target.value; pState.page = 1; pRender(); });

// ---------- Export .xls ----------
$('pExport').addEventListener('click', () => {
  const rows = pFiltered(), cols = PCOLS.filter(([k]) => !pState.hidden.has(k));
  const x = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#DFE4EC" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Pricing Data"><Table>
<Row>${cols.map(([, l]) => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(l)}</Data></Cell>`).join('')}</Row>
${rows.map(r => `<Row>${cols.map(([k]) => k === 'price' ? `<Cell><Data ss:Type="Number">${r.price}</Data></Cell>` : `<Cell><Data ss:Type="String">${x(pText(r, k))}</Data></Cell>`).join('')}</Row>`).join('\n')}
</Table></Worksheet></Workbook>`;
  const a = document.createElement('a'), d = new Date();
  a.href = URL.createObjectURL(new Blob([xml], { type: 'application/vnd.ms-excel' }));
  a.download = `Pricing_Data_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.xls`;
  a.click(); URL.revokeObjectURL(a.href);
  toast(`${rows.length} baris diexport`);
});

document.addEventListener('masterview', e => { if (e.detail === 'price') pLoad(pRender); });
pRender();
