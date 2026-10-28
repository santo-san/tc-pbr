// ELIPS Order Monitoring mock-up UI. Business rules live in workflow.js.
const W = window.Workflow, { ORDER, CYCLE } = W;

// ---------- Helpers ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = rng(20261027);
const pick = arr => arr[Math.floor(rand() * arr.length)];
const pad = (n, l = 2) => String(n).padStart(l, '0');
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const hash = str => [...str].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261);
const fmtDate = d => d.split('-').reverse().join('/');
const fmtDT = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtTS = d => `${W.ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const addMin = (d, m) => new Date(d.getTime() + m * 60000);
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- Master data ----------
const SUPPLIERS = [
  ['PT. Pusaka Bahari Mandiri', 'PBM'], ['PT. Puninar Jaya', 'PNJ'], ['PT. Serasi Logistics', 'SRL'],
  ['PT. Toyofuji Logistics', 'TFL'], ['PT. Samudera Lintas', 'SML'],
];
const SUP_BY_CODE = Object.fromEntries(SUPPLIERS.map(([n, c]) => [c, n]));
const FIRST = ['ASEP', 'BUDI', 'HENDRA', 'EKO', 'JOKO', 'RUDI', 'AGUS', 'BAMBANG', 'DONI', 'FAJAR', 'GILANG', 'IWAN', 'KURNIA', 'LUKMAN', 'MAMAN'];
const LAST = ['SUKIRNO', 'SANTOSO', 'WIJAYA', 'PRASETYO', 'SUSILO', 'HARTONO', 'SETIAWAN', 'IRAWAN', 'SAPUTRA', 'NUGROHO'];
const TRUCKS_PER_SUPPLIER = 5;
const MASTER = { trucks: [], drivers: [] };
SUPPLIERS.forEach(([sup, code], si) => {
  for (let k = 0; k < TRUCKS_PER_SUPPLIER; k++) {
    const plate = si === 0 && k === 0 ? 'B9504UIZ' : `B${1000 + Math.floor(rand() * 9000)}${pick(['UIZ', 'TXA', 'KLM', 'UJP'])}`;
    const n = si * TRUCKS_PER_SUPPLIER + k;
    MASTER.trucks.push({ plate, supplier: sup, licenseDate: `2027-${pad(1 + n % 12)}-15` });
    MASTER.drivers.push({ userId: `DRV-${code}-${pad(k + 1)}`, name: n === 0 ? 'ASEP SUKIRNO' : `${FIRST[n % FIRST.length]} ${LAST[(n * 7) % LAST.length]}`, supplier: sup, truck: plate, active: true });
  }
});
// Edge cases for demonstrating validation
MASTER.trucks.push({ plate: 'B9299UIZ', supplier: SUPPLIERS[0][0], licenseDate: '2026-09-30' });
MASTER.drivers.push({ userId: 'DRV-PBM-09', name: 'DEDI KURNIAWAN', supplier: SUPPLIERS[0][0], truck: 'B9299UIZ', active: true });
MASTER.drivers.push({ userId: 'DRV-PBM-10', name: 'SLAMET RIYADI', supplier: SUPPLIERS[0][0], truck: '', active: false });

const FROM = ['Depo Cakung Marunda', 'Depo Tanjung Priok', 'Depo Sunter 2', 'Depo Karawang'];
const TO = ['(Empty) CY TMMIN Sunter 1', '(Empty) CY TMMIN Karawang', 'TMMIN Sunter 2 Plant', 'TMMIN Karawang 3 Plant'];
const PREFIX = ['SELU', 'TGCU', 'TCNU', 'MSKU', 'CAIU'];
const DATES = ['2026-10-25', '2026-10-26', '2026-10-27'];

const DATA = [];
const CTX = { orders: DATA, master: MASTER };
const IP = { role: 'IP_ADMIN', name: 'Admin IELP' };
const SYS = { role: 'SYSTEM', name: 'Batch SA/PAS' };
const lpActor = sup => ({ role: 'SUPPLIER', lpAdmin: true, supplier: sup, name: `LP Admin ${SUPPLIERS.find(s => s[0] === sup)[1]}` });
const driverActor = d => ({ role: 'DRIVER', userId: d.userId, name: d.name, supplier: d.supplier, truck: d.truck });

function genContainer(r = rand) {
  const c10 = PREFIX[Math.floor(r() * PREFIX.length)] + pad(Math.floor(r() * 1e6), 6);
  return c10 + W.containerCheckDigit(c10);
}
function genOrderNo(date) {
  const [y, m, d] = date.split('-');
  let no;
  do no = `${y.slice(2)}${m}${d}C2000002${pad(Math.floor(Math.random() * 10000), 4)}`; while (DATA.some(o => o.orderNo === no));
  return no;
}

const truckLoad = plate => DATA.filter(o => o.truck === plate && [ORDER.REL, ORDER.START].includes(o.status)).length;

// Seed orders by running the real workflow, so every record follows the rules
function seed(spec) {
  const [y, m, d] = spec.date.split('-').map(Number);
  let t = new Date(y, m - 1, d - 1, 14, Math.floor(rand() * 60));
  let res;
  do res = W.createDTP({ ...spec, renban: spec.renban || String(70000 + Math.floor(rand() * 999)) }, IP, CTX, t, spec.orderNo);
  while (!res.ok && res.errors.renban && !spec.renban);
  if (!res.ok) return;
  const o = res.order; DATA.push(o);
  const step = (key, actor, payload = {}, min = 10) => { t = addMin(t, min); return W.perform(o, key, payload, actor, t, CTX).ok; };
  const target = W.ORDER_SEQ.indexOf(spec.target);
  if (target < 1) return;

  const trucks = MASTER.trucks.filter(x => x.supplier === o.supplier && (spec.truck ? x.plate === spec.truck : x.plate !== DEMO_TRUCK));
  const truckOk = spec.lp
    ? step('lpRelease', lpActor(o.supplier), { reason: 'Order release manual oleh LP Admin', driver: MASTER.drivers.find(x => x.truck === trucks[0].plate).userId }, 120)
    : trucks.sort((a, b) => truckLoad(a.plate) - truckLoad(b.plate)).some(x => step('assignTruck', IP, { truck: x.plate }, 120));
  if (!truckOk || target < 2) return;

  const drv = MASTER.drivers.find(x => x.truck === o.truck);
  const actor = spec.lp ? lpActor(o.supplier) : driverActor(drv);
  t = spec.startAt || new Date(y, m - 1, d, Math.floor(rand() * 6), Math.floor(rand() * 60));
  if (!spec.lp && !step('startOrder', actor, {}, 0)) return;
  const reason = spec.lp ? { reason: 'Driver app bermasalah, input manual oleh LP Admin' } : {};
  const n = spec.cycles;
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    if (i > 0 && !spec.lp && !step('nextCycle', actor, {}, 5 + Math.floor(rand() * 15))) return;
    if (last && target === 2 && spec.stage === 'start') return;
    if (!step('pickup', actor, { ...reason, container: spec.containers?.[i] || genContainer() }, spec.lp && i === 0 ? 0 : 5 + Math.floor(rand() * 20))) return;
    if (last && target === 2 && spec.stage === 'pick') return;
    if (!step('finishCycle', actor, reason, 20 + Math.floor(rand() * 60))) return;
  }
  if (target < 3 || !step('finishOrder', actor, reason, 5)) return;
  if (target < 4 || !step('processSA', SYS, {}, 60 + Math.floor(rand() * 120))) return;
  if (target < 5) return;
  step('processPAS', SYS, { poNo: '45' + pad(Math.floor(rand() * 1e8), 8) }, 180);
}

// Order shown on the reference screen, plus one released order for the demo driver (DRV-PBM-01)
const DEMO_TRUCK = 'B9504UIZ';
seed({
  orderNo: '261026C20000020425', date: '2026-10-27', type: 'DTP2', supplier: SUPPLIERS[0][0], from: 'Depo Cakung Marunda',
  to: '(Empty) CY TMMIN Sunter 1', renban: '70332', shift: 'NIGHT', planned: 2, target: ORDER.FIN, cycles: 2,
  truck: DEMO_TRUCK, startAt: new Date(2026, 9, 27, 0, 25), containers: ['SELU4384522', 'TGCU5529491'],
});
seed({
  orderNo: '261027C20000020431', date: '2026-10-27', type: 'DTP2', supplier: SUPPLIERS[0][0], from: 'Depo Cakung Marunda',
  to: '(Empty) CY TMMIN Karawang', renban: '70333', shift: 'DAY', planned: 2, target: ORDER.REL, truck: DEMO_TRUCK,
});
const TARGETS = [[ORDER.PLAN, .1], [ORDER.REL, .12], [ORDER.START, .3], [ORDER.FIN, .25], [ORDER.SA, .13], [ORDER.PO, .1]];
const SPECS = [];
for (let i = 0; i < 75; i++) {
  const date = i < 30 ? DATES[2] : pick(DATES);
  let r = rand(), target = TARGETS.find(([, p]) => (r -= p) < 0)?.[0] || ORDER.PO;
  const planned = 1 + Math.floor(rand() * 5);
  const cycles = target === ORDER.START ? 1 + Math.floor(rand() * planned) : planned;
  SPECS.push({
    orderNo: genOrderNo(date), date, type: 'DTP' + (1 + Math.floor(rand() * 4)), supplier: pick(SUPPLIERS)[0],
    from: pick(FROM), to: pick(TO), shift: rand() < 0.5 ? 'DAY' : 'NIGHT', fa: rand() < 0.2 ? 'Y' : '',
    planned, target, cycles, stage: pick(['start', 'pick', 'fin']), lp: rand() < 0.1,
  });
}
// Finished orders first, so trucks left active by in-progress orders don't block later ones
SPECS.sort((a, b) => W.ORDER_SEQ.indexOf(b.target) - W.ORDER_SEQ.indexOf(a.target)).forEach(seed);

// ---------- State ----------
const state = { dtp: '', search: '', dateFrom: '2026-10-27', dateTo: '', from: '', to: '', sortKey: 'orderNo', sortDir: 1, page: 1, size: 10, hidden: new Set(), actor: IP };
state.search = $('search').value;

// ---------- Badges & cells ----------
const ORDER_CLS = { [ORDER.PLAN]: 'wait', [ORDER.REL]: 'rel', [ORDER.START]: 'prog', [ORDER.FIN]: '', [ORDER.SA]: 'sa', [ORDER.PO]: 'po' };
const CYCLE_CLS = { [CYCLE.DTP]: 'wait', [CYCLE.START]: 'rel', [CYCLE.PICK]: 'prog', [CYCLE.FIN]: '' };
const orderBadge = s => `<span class="badge ${ORDER_CLS[s]}">${s}</span>`;
const cycleBadge = s => `<span class="badge ${CYCLE_CLS[s]}">${s}</span>`;
const X_ICON = '<span class="x"><svg viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6"/></svg></span>';

function cycleCell(o, i) {
  const c = o.cycles[i];
  if (!c) return X_ICON;
  const t = c.finishAt || c.pickupAt || c.startAt;
  return `${t ? fmtTS(t) + '<br>' : ''}${cycleBadge(c.status)}${c.container ? '<br>' + c.container : ''}`;
}
function statusCell(o) {
  let sub = '';
  if (o.status === ORDER.SA) sub = `SA: ${fmtTS(o.saAt)}`;
  if (o.status === ORDER.PO) sub = `PO ${o.poNo} · ${fmtTS(o.poAt)}`;
  return orderBadge(o.status) + (sub ? `<span class="sub-info">${sub}</span>` : '');
}

// ---------- Filtering / sorting ----------
function filtered() {
  const q = state.search.trim().toLowerCase();
  const rows = DATA.filter(o =>
    W.canView(state.actor, o) &&
    (!state.dtp || o.type === state.dtp) &&
    (!state.dateFrom || o.date >= state.dateFrom) &&
    (!state.dateTo || o.date <= state.dateTo) &&
    (!state.from || o.from === state.from) &&
    (!state.to || o.to === state.to) &&
    (!q || [o.orderNo, o.supplier, o.truck, o.driver, o.from, o.to, o.renban, o.shift, o.type, fmtDate(o.date), o.status, o.poNo,
      ...o.cycles.flatMap(c => [c.container, c.status])].join(' ').toLowerCase().includes(q))
  );
  const k = state.sortKey;
  const val = o => k === 'status' ? W.ORDER_SEQ.indexOf(o.status) : o[k];
  rows.sort((a, b) => val(a) < val(b) ? -state.sortDir : val(a) > val(b) ? state.sortDir : 0);
  return rows;
}
const visibleTotal = () => DATA.filter(o => W.canView(state.actor, o)).length;

// ---------- Render ----------
function render() {
  const rows = filtered();
  const pages = Math.max(1, Math.ceil(rows.length / state.size));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.size;
  const view = rows.slice(start, start + state.size);

  $('tbody').innerHTML = view.length ? view.map(o => `
    <tr>
      <td data-col="action"><button class="act" data-order="${o.orderNo}" title="Lihat detail">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>
      </button></td>
      <td data-col="date">${fmtDate(o.date)}</td>
      <td data-col="orderNo">${o.orderNo}</td>
      <td data-col="type">${o.type}</td>
      <td data-col="trucking" class="left">${o.supplier}</td>
      <td data-col="plate">${o.truck || '-'}</td>
      <td data-col="from" class="left">${o.from}</td>
      <td data-col="to" class="left">${o.to}</td>
      <td data-col="renban">${o.renban}</td>
      <td data-col="shift">${o.shift}</td>
      <td data-col="fa">${o.fa}</td>
      ${[0, 1, 2, 3, 4].map(i => `<td data-col="c${i + 1}">${cycleCell(o, i)}</td>`).join('')}
      <td data-col="status">${statusCell(o)}</td>
    </tr>`).join('')
    : '<tr><td colspan="17" class="empty">Tidak ada data yang cocok</td></tr>';

  const total = visibleTotal();
  $('info').textContent = rows.length
    ? `Showing ${start + 1} to ${start + view.length} of ${rows.length} records` + (rows.length !== total ? ` (filtered from ${total} total entries)` : '')
    : `Showing 0 to 0 of 0 records (filtered from ${total} total entries)`;

  let html = `<button data-p="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= pages; p++) {
    if (pages > 7 && p > 2 && p < pages - 1 && Math.abs(p - state.page) > 1) {
      if (!html.endsWith('…</span>')) html += '<span>…</span>';
      continue;
    }
    html += `<button data-p="${p}" class="${p === state.page ? 'cur' : ''}">${p}</button>`;
  }
  html += `<button data-p="${state.page + 1}" ${state.page === pages ? 'disabled' : ''}>›</button>`;
  $('pager').innerHTML = html;

  document.querySelectorAll('th.sortable').forEach(th => {
    th.querySelector('.arrow')?.remove();
    if (th.dataset.sort === state.sortKey && th.dataset.col !== 'action') {
      th.insertAdjacentHTML('beforeend', `<span class="arrow">${state.sortDir === 1 ? '▲' : '▼'}</span>`);
    }
  });
  $('btnCreateDTP').style.display = state.actor.role === 'IP_ADMIN' ? '' : 'none';
  applyColumns();
}
function applyColumns() {
  document.querySelectorAll('[data-col]').forEach(el => el.classList.toggle('hidden-col', state.hidden.has(el.dataset.col)));
}

// ---------- Init controls ----------
FROM.forEach(v => $('fromLoc').add(new Option(v, v)));
TO.forEach(v => $('toLoc').add(new Option(v, v)));

const COLS = [['date', 'Date'], ['orderNo', 'No. Order'], ['type', 'Type'], ['trucking', 'Trucking Comp.'], ['plate', 'License Plate'], ['from', 'DTP Loc. From'], ['to', 'DTP Loc. To'], ['renban', 'Renban'], ['shift', 'Shift'], ['fa', 'FA'], ['c1', 'Cycle 1'], ['c2', 'Cycle 2'], ['c3', 'Cycle 3'], ['c4', 'Cycle 4'], ['c5', 'Cycle 5'], ['status', 'Order Status']];
$('kolomMenu').innerHTML = COLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" checked> ${l}</label>`).join('');
$('kolomMenu').addEventListener('change', e => {
  const k = e.target.dataset.k;
  e.target.checked ? state.hidden.delete(k) : state.hidden.add(k);
  applyColumns();
});

function fmtSync(d) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `Last Sync at : ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
$('lastSync').textContent = fmtSync(new Date(2026, 9, 27, 13, 16, 32));

$('tabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('active', x === b));
  state.dtp = b.dataset.dtp; state.page = 1; render();
});
$('search').addEventListener('input', e => { state.search = e.target.value; state.page = 1; render(); });

$('btnFind').addEventListener('click', () => {
  const df = $('dateFrom').value, dt = $('dateTo').value;
  if (df && dt && df > dt) { toast('Date From tidak boleh lebih besar dari Date To'); return; }
  Object.assign(state, { dateFrom: df, dateTo: dt, from: $('fromLoc').value, to: $('toLoc').value, page: 1 });
  render();
  toast(`Ditemukan ${filtered().length} order`);
});
function clearFilters() {
  ['dateFrom', 'dateTo', 'fromLoc', 'toLoc', 'search'].forEach(id => $(id).value = '');
  Object.assign(state, { dateFrom: '', dateTo: '', from: '', to: '', search: '', page: 1 });
}
$('btnClear').addEventListener('click', () => { clearFilters(); render(); toast('Filter dibersihkan'); });

$('btnRefresh').addEventListener('click', () => {
  const b = $('btnRefresh'); b.classList.add('spin'); b.disabled = true;
  setTimeout(() => {
    b.classList.remove('spin'); b.disabled = false;
    $('lastSync').textContent = fmtSync(new Date());
    render();
    toast('Data berhasil di-refresh');
  }, 700);
});

document.querySelectorAll('.dd > button').forEach(btn => btn.addEventListener('click', e => {
  e.stopPropagation();
  const dd = btn.parentElement;
  document.querySelectorAll('.dd').forEach(x => x !== dd && x.classList.remove('open'));
  dd.classList.toggle('open');
}));
document.querySelectorAll('.dd-menu').forEach(m => m.addEventListener('click', e => e.stopPropagation()));
document.addEventListener('click', () => document.querySelectorAll('.dd').forEach(x => x.classList.remove('open')));

document.querySelectorAll('[data-export]').forEach(b => b.addEventListener('click', () => {
  $('ddExport').classList.remove('open');
  if (b.dataset.export === 'print') { window.print(); return; }
  const rows = filtered();
  const head = ['Date', 'No. Order', 'Type', 'Trucking Comp.', 'License Plate', 'Driver', 'DTP Loc. From', 'DTP Loc. To', 'Renban', 'Shift', 'FA',
    'Cycle 1', 'Cycle 2', 'Cycle 3', 'Cycle 4', 'Cycle 5', 'Order Status', 'SA Approved At', 'PO Number'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [head.map(q).join(',')].concat(rows.map(o => [
    fmtDate(o.date), o.orderNo, o.type, o.supplier, o.truck, o.driver, o.from, o.to, o.renban, o.shift, o.fa,
    ...[0, 1, 2, 3, 4].map(i => o.cycles[i] ? `${o.cycles[i].status} ${o.cycles[i].container}`.trim() : '-'),
    o.status, o.saAt ? fmtTS(o.saAt) : '', o.poNo,
  ].map(q).join(',')));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `order-monitoring-${W.ymd(new Date())}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  toast(`${rows.length} baris diexport`);
}));

document.querySelectorAll('th.sortable').forEach(th => th.addEventListener('click', () => {
  const k = th.dataset.sort;
  state.sortDir = state.sortKey === k ? -state.sortDir : 1;
  state.sortKey = k; render();
}));
$('pager').addEventListener('click', e => {
  const b = e.target.closest('button[data-p]'); if (!b || b.disabled) return;
  state.page = +b.dataset.p; render();
});
$('pageSize').addEventListener('change', e => { state.size = +e.target.value; state.page = 1; render(); });

// ---------- Order detail ----------
function cycleDetail(o, i) {
  const c = o.cycles[i], r = rng(hash(o.orderNo + i));
  return {
    driver: o.driver || '-', from: c.from, to: c.to, container: c.container || '-',
    cycleNo: `${o.orderNo.slice(0, 8)}PBM${pad(100 + Math.floor(r() * 900), 3)}`,
    acts: [
      ['Start Cycle', c.startAt, '#22c55e', 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0'],
      ['Pick Up', c.pickupAt, '#eab308', 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0'],
      ['Finish Cycle', c.finishAt, '#3b8ef3', 'M12 21s-6-5.6-6-10a6 6 0 0 1 12 0c0 4.4-6 10-6 10zM12 11m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0'],
    ],
  };
}
const IC = {
  police: '<svg viewBox="0 0 24 24" stroke="#b45309"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M9 6V4h6v2"/><circle cx="12" cy="13" r="2.5"/></svg>',
  person: '<svg viewBox="0 0 24 24" stroke="#9aa3b2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  personRed: '<svg viewBox="0 0 24 24" stroke="#dc6b6b"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  rocket: '<svg viewBox="0 0 24 24" stroke="#6b7280"><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 15l-3-3 3-5c3-4 8-5 12-4 1 4 0 9-4 12l-5 3z"/><circle cx="15" cy="9" r="1.5"/></svg>',
};
const field = (icon, label, value) => `<div class="field"><div class="ic">${icon}</div><div><small>${label}</small><b>${esc(value)}</b></div></div>`;

let current = null;
function openDetail(no) {
  current = DATA.find(o => o.orderNo === no);
  const o = current, actor = state.actor;
  if (!W.canView(actor, o)) { toast('Anda tidak memiliki akses ke order ini'); return; }
  const actions = W.available(o, actor, CTX);
  const summary = [['No. Order', o.orderNo], ['Date / Shift', `${fmtDate(o.date)} · ${o.shift}`], ['Trucking Company', o.supplier], ['Type / Renban', `${o.type} · ${o.renban}`],
    ['License Plate', o.truck || '-'], ['Driver', o.driver || '-'], ['Planned / Aktual Cycle', `${o.planned} / ${o.cycles.filter(c => c.startAt).length}`],
    ['Order Status', orderBadge(o.status)], ['Cycle Status', cycleBadge(W.current(o).status)],
    ['SA Approved', o.saAt ? fmtTS(o.saAt) : '-'], ['PO Number', o.poNo ? `${o.poNo} (${fmtTS(o.poAt)})` : '-']];
  const readOnly = actor.role === 'SUPPLIER' && !actor.lpAdmin;
  const actionBar = `<div class="od-actions"><span class="lbl">Aksi ${W.roleLabel(actor)}:</span>${actions.length
    ? actions.map(k => `<button class="btn-sm-blue" data-action="${k}">${W.ACTIONS[k].label}</button>`).join('')
    : `<span class="none">${readOnly ? 'Akses hanya lihat (bukan LP Admin).' : 'Tidak ada aksi yang tersedia untuk role Anda pada status ini.'}</span>`}</div>`;

  const cycles = o.cycles.map((c, i) => {
    const d = cycleDetail(o, i);
    return `<div class="cyc" data-cycle="${i}">
      <button class="cyc-h" data-toggle><span>CYCLE ${i + 1} &nbsp;${cycleBadge(c.status)}</span><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></button>
      <div class="cyc-b">
        <div>
          <div class="fields">
            ${field(IC.police, 'Police No', o.truck || '-')}
            ${field(IC.person, 'Driver', d.driver)}
            ${field(IC.rocket, 'Trucking Company', o.supplier)}
          </div>
          <div class="route"><span>${esc(d.from)}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="#3b8ef3" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M13 8l4 4-4 4"/></svg>
            <span>${esc(d.to)}</span></div>
          <div class="fields">
            ${field(IC.person, 'Container No', d.container)}
            ${field(IC.personRed, 'Order No', d.cycleNo)}
          </div>
        </div>
        <div>
          <p class="sec-title">Activity List</p>
          <div class="acts">${d.acts.map(([label, t, color, path]) => `
            <div class="act-i ${t ? '' : 'pending'}">
              <svg viewBox="0 0 24 24" stroke="${color}"><circle cx="12" cy="12" r="9"/><path d="${path}"/></svg>
              <small>${label}</small><b>${t ? fmtDT(t) : 'Belum dilakukan'}</b><span>-</span>
            </div>`).join('')}</div>
        </div>
        <div>
          <p class="sec-title">Files</p>
          <table class="files">
            <tr><th>Action</th><th>File Type</th></tr>
            <tr><td><button class="btn-view" data-view="sj" ${c.pickupAt ? '' : 'disabled'}>View</button></td><td>Foto Surat Jalan</td></tr>
            <tr><td><button class="btn-view" data-view="finish" ${c.finishAt ? '' : 'disabled'}>View</button></td><td>Finish Cycle Foto</td></tr>
          </table>
          <div class="file-btns">
            <button class="btn-sm-blue" data-sj ${c.startAt ? '' : 'disabled'}><svg viewBox="0 0 24 24"><path d="M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/></svg>Surat Jalan ELIPS</button>
            <button class="btn-sm-blue" data-pdf ${c.startAt ? '' : 'disabled'}><svg viewBox="0 0 24 24"><path d="M6 2h12v5H6zM4 8h16a2 2 0 0 1 2 2v7h-4v5H6v-5H2v-7a2 2 0 0 1 2-2zm4 9v3h8v-3z"/></svg>PDF</button>
          </div>
        </div>
      </div></div>`;
  }).join('');

  const hist = `<div class="hist"><p class="sec-title">Riwayat Status</p><div class="table-wrap"><table>
    <tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Dari</th><th>Ke</th><th>Reason / Catatan</th></tr>
    ${o.history.slice().reverse().map(h => `<tr class="${h.action.includes('GAGAL') ? 'fail' : ''}">
      <td style="white-space:nowrap">${fmtTS(h.at)}</td><td>${esc(h.actor)}<span class="sub-info">${h.role}</span></td><td>${esc(h.action)}</td>
      <td>${esc(h.from)}</td><td>${esc(h.to)}</td><td>${esc([h.reason, h.note].filter(Boolean).join(' · ') || '-')}</td></tr>`).join('')}
  </table></div></div>`;

  $('mTitle').textContent = 'Order Detail';
  $('mBody').innerHTML = `<div class="od-sum">${summary.map(([k, v]) => `<div><small>${k}</small><b>${k.includes('Status') ? v : esc(v)}</b></div>`).join('')}</div>
    ${actionBar}${cycles}${hist}`;
  $('overlay').classList.add('show');
}

// ---------- Forms (action, driver login, create DTP) ----------
let onPreviewClose = null;
function showPreview(title, body, foot = '', onClose = null) {
  $('pvTitle').textContent = title; $('pvBody').innerHTML = body; $('pvFoot').innerHTML = foot;
  onPreviewClose = onClose;
  $('preview').classList.add('show');
}
function closePreview() {
  $('preview').classList.remove('show');
  const cb = onPreviewClose; onPreviewClose = null; cb?.();
}
function formRow(f, value = '') {
  const req = f.required ? ' <span class="req">*</span>' : '';
  let input;
  if (f.type === 'textarea') input = `<textarea name="${f.name}" placeholder="Minimal ${W.REASON_MIN} karakter">${esc(value)}</textarea>`;
  else if (f.type === 'checkbox') return `<div class="form-row" data-f="${f.name}"><label class="form-check"><input type="checkbox" name="${f.name}"> ${f.label}</label></div>`;
  else if (f.type === 'select') input = `<select name="${f.name}"><option value="">- Pilih -</option>${f.options.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  else input = `<input type="${f.type === 'date' || f.type === 'number' ? f.type : 'text'}" name="${f.name}" value="${esc(value)}" ${f.type === 'number' ? 'min="1" max="5"' : ''}>`;
  return `<div class="form-row" data-f="${f.name}"><label>${f.label}${req}</label>${input}${f.hint ? `<div class="hint">${f.hint}</div>` : ''}</div>`;
}
function readForm(box) {
  const p = {};
  box.querySelectorAll('[name]').forEach(el => p[el.name] = el.type === 'checkbox' ? el.checked : el.value);
  return p;
}
function showErrors(box, errors) {
  box.querySelectorAll('.form-row').forEach(r => { r.classList.remove('err'); r.querySelector('.msg')?.remove(); });
  box.querySelector('.form-alert, .form-ok')?.remove();
  Object.entries(errors).forEach(([k, msg]) => {
    const row = box.querySelector(`[data-f="${k}"]`);
    if (row) { row.classList.add('err'); row.insertAdjacentHTML('beforeend', `<div class="msg">${esc(msg)}</div>`); }
    else box.insertAdjacentHTML('afterbegin', `<div class="form-alert">${esc(msg)}</div>`);
  });
}

function openAction(key) {
  const a = W.ACTIONS[key], o = current, actor = state.actor;
  const fields = a.fields(actor).map(f => {
    if (f.type === 'truck') return { ...f, type: 'select', options: MASTER.trucks.filter(t => t.supplier === o.supplier).map(t => {
      const busy = DATA.find(x => x !== o && x.truck === t.plate && [ORDER.REL, ORDER.START].includes(x.status));
      return [t.plate, `${t.plate} (lisensi s/d ${t.licenseDate})${busy ? ` - aktif di ${busy.orderNo}` : ''}`];
    }) };
    if (f.type === 'driver') return { ...f, type: 'select', options: MASTER.drivers.filter(d => d.supplier === o.supplier).map(d => [d.userId, `${d.name} - ${d.userId}${d.active ? '' : ' (tidak aktif)'}`]) };
    if (f.name === 'container') return { ...f, hint: 'Format ISO 6346, contoh: SELU4384522. Check digit divalidasi sistem.' };
    return f;
  });
  const defaults = { poNo: '45' + pad(Math.floor(Math.random() * 1e8), 8) };
  const c = W.current(o);
  const intro = `<p style="margin:0 0 12px;font-size:11px">Order <b>${o.orderNo}</b> · Cycle ${o.cycles.length}<br>
    Status saat ini: ${orderBadge(o.status)} ${cycleBadge(c.status)}</p>`;
  showPreview(a.label, `<form id="actForm" onsubmit="return false">${intro}${fields.map(f => formRow(f, defaults[f.name])).join('') || '<p style="font-size:11px">Lanjutkan aksi ini?</p>'}</form>`,
    `<button class="btn-outline" id="actCancel">Batal</button><button class="btn-sm-blue" style="height:30px" id="actSubmit">Submit</button>`);
  $('actCancel').onclick = closePreview;
  $('actSubmit').onclick = () => {
    const box = $('actForm'), res = W.perform(o, key, readForm(box), actor, new Date(), CTX);
    if (!res.ok) { showErrors(box, res.errors); openDetail(o.orderNo); render(); return; }
    closePreview(); openDetail(o.orderNo); render();
    toast(`${a.label} berhasil · ${o.status} / ${W.current(o).status}`);
  };
}

const ROLE_SEL = $('roleSel');
let roleValue = ROLE_SEL.value;
function setActor(actor, value) {
  state.actor = actor; roleValue = value; ROLE_SEL.value = value;
  $('userName').textContent = actor.name;
  $('userRole').textContent = W.roleLabel(actor) + (actor.supplier ? ` · ${actor.supplier}` : '') + (actor.truck ? ` · ${actor.truck}` : '');
  $('userAvatar').textContent = actor.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  $('overlay').classList.remove('show');
  state.page = 1; render();
}
function openLogin() {
  const demo = MASTER.drivers.map(d => {
    const t = MASTER.trucks.find(x => x.plate === d.truck);
    return `<tr data-fill="${d.userId}|${d.truck}|${t?.licenseDate || ''}"><td>${d.userId}</td><td>${d.name}</td><td>${d.truck || '-'}</td><td>${t?.licenseDate || '-'}</td><td>${!d.active ? 'Tidak aktif' : t && t.licenseDate < W.ymd(new Date()) ? 'Lisensi habis' : 'OK'}</td></tr>`;
  }).join('');
  showPreview('Login Driver', `<form id="loginForm" onsubmit="return false">
      <div class="form-grid">
        ${formRow({ name: 'userId', label: 'User ID', required: true })}
        ${formRow({ name: 'truck', label: 'No. Truck', required: true })}
      </div>
      ${formRow({ name: 'licenseDate', label: 'Tanggal Lisensi Truck', type: 'date', required: true, hint: 'Harus sama dengan tanggal lisensi truck di master data dan belum lewat.' })}
    </form>
    <details><summary style="font-size:10.5px;cursor:pointer">Akun demo (klik baris untuk mengisi)</summary>
      <table class="demo"><tr><th>User ID</th><th>Nama</th><th>Truck</th><th>Tgl Lisensi</th><th>Ket.</th></tr>${demo}</table></details>`,
  `<button class="btn-outline" id="loginCancel">Batal</button><button class="btn-sm-blue" style="height:30px" id="loginSubmit">Login</button>`,
  () => { if (state.actor.role !== 'DRIVER') ROLE_SEL.value = roleValue; });
  $('pvBody').querySelectorAll('[data-fill]').forEach(tr => tr.onclick = () => {
    const [u, t, d] = tr.dataset.fill.split('|');
    Object.entries({ userId: u, truck: t, licenseDate: d }).forEach(([k, v]) => $('loginForm').querySelector(`[name=${k}]`).value = v);
  });
  $('loginCancel').onclick = closePreview;
  $('loginSubmit').onclick = () => {
    const res = W.login(MASTER, readForm($('loginForm')), W.ymd(new Date()));
    if (!res.ok) return showErrors($('loginForm'), res.errors);
    setActor(res.actor, 'driver'); closePreview();
    clearFilters(); render();
    toast(`Login berhasil: ${res.actor.name} (${res.actor.truck})`);
  };
}
ROLE_SEL.addEventListener('change', () => {
  const v = ROLE_SEL.value;
  if (v === 'ip') return setActor(IP, v);
  if (v === 'driver') return openLogin();
  const [, code, mode] = v.split(':'), sup = SUP_BY_CODE[code];
  setActor({ role: 'SUPPLIER', lpAdmin: mode === 'lp', supplier: sup, name: mode === 'lp' ? `LP Admin ${code}` : `Viewer ${code}` }, v);
  toast(`Hanya menampilkan data ${sup}`);
});

function openCreateDTP() {
  const opt = arr => arr.map(v => [v, v]);
  const F = [
    { name: 'date', label: 'Date', type: 'date', required: true }, { name: 'type', label: 'Type', type: 'select', options: opt(['DTP1', 'DTP2', 'DTP3', 'DTP4']), required: true },
    { name: 'supplier', label: 'Trucking Comp.', type: 'select', options: opt(SUPPLIERS.map(s => s[0])), required: true }, { name: 'shift', label: 'Shift', type: 'select', options: opt(['DAY', 'NIGHT']), required: true },
    { name: 'from', label: 'DTP Loc. From', type: 'select', options: opt(FROM), required: true }, { name: 'to', label: 'DTP Loc. To', type: 'select', options: opt(TO), required: true },
    { name: 'renban', label: 'Renban', required: true, hint: '5 digit angka, unik per supplier + tanggal + shift' }, { name: 'planned', label: 'Planned Cycle', type: 'number', required: true },
  ];
  const def = { date: W.ymd(new Date()), planned: '1' };
  showPreview('Create DTP', `<form id="dtpForm" onsubmit="return false"><div class="form-grid">${F.map(f => formRow(f, def[f.name])).join('')}</div>
      ${formRow({ name: 'fa', label: 'FA', type: 'checkbox' })}</form>`,
  `<button class="btn-outline" id="dtpCheck">Check</button><button class="btn-sm-blue" style="height:30px" id="dtpSubmit">Submit</button>`);
  const payload = () => { const p = readForm($('dtpForm')); p.fa = p.fa ? 'Y' : ''; return p; };
  $('dtpCheck').onclick = () => {
    const errors = W.checkDTP(payload(), state.actor, CTX, new Date());
    showErrors($('dtpForm'), errors);
    if (!Object.keys(errors).length) $('dtpForm').insertAdjacentHTML('afterbegin', '<div class="form-ok">Data valid, siap di-submit.</div>');
  };
  $('dtpSubmit').onclick = () => {
    const p = payload();
    const res = W.createDTP(p, state.actor, CTX, new Date(), p.date ? genOrderNo(p.date) : '');
    if (!res.ok) return showErrors($('dtpForm'), res.errors);
    DATA.unshift(res.order); closePreview();
    clearFilters(); state.search = res.order.orderNo; $('search').value = state.search; render();
    toast(`DTP ${res.order.orderNo} dibuat · ${ORDER.PLAN} / ${CYCLE.DTP}`);
  };
}
$('btnCreateDTP').addEventListener('click', openCreateDTP);

// ---------- Files & surat jalan ----------
function photo(title, d, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380"><rect width="600" height="380" fill="${color}"/>
    <rect x="150" y="60" width="300" height="230" rx="8" fill="#fff" opacity=".92"/>
    <text x="300" y="110" font-family="Arial" font-size="20" font-weight="bold" text-anchor="middle" fill="#0b2b5c">${title}</text>
    <text x="300" y="150" font-family="Arial" font-size="14" text-anchor="middle" fill="#333">${d.cycleNo}</text>
    <text x="300" y="180" font-family="Arial" font-size="14" text-anchor="middle" fill="#333">Container ${d.container}</text>
    <text x="300" y="210" font-family="Arial" font-size="14" text-anchor="middle" fill="#333">${current.truck} · ${d.driver}</text>
    <text x="300" y="260" font-family="Arial" font-size="12" text-anchor="middle" fill="#888">(foto contoh / mock-up)</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
function suratJalan(o, i, d) {
  return `<div class="sj">
    <h4>SURAT JALAN</h4><div class="no">No. ${d.cycleNo} · ELIPS</div>
    <table>
      <tr><td>Tanggal</td><td>: ${fmtDate(o.date)}</td></tr>
      <tr><td>No. Order</td><td>: ${o.orderNo} (Cycle ${i + 1})</td></tr>
      <tr><td>Trucking Company</td><td>: ${o.supplier}</td></tr>
      <tr><td>Police No / Driver</td><td>: ${o.truck} / ${esc(d.driver)}</td></tr>
      <tr><td>Container No</td><td>: ${d.container}</td></tr>
      <tr><td>Dari</td><td>: ${d.from}</td></tr>
      <tr><td>Tujuan</td><td>: ${d.to}</td></tr>
      ${d.acts.map(([l, t]) => `<tr><td>${l}</td><td>: ${t ? fmtDT(t) : '-'}</td></tr>`).join('')}
    </table>
    <div class="sign"><div></div><div></div><div></div></div>
    <div class="sign" style="margin-top:0"><small>Driver</small><small>Security</small><small>Penerima</small></div>
  </div>`;
}
function printSuratJalan(o, i, d) {
  const sheet = [...document.styleSheets].find(s => { try { return s.cssRules && !s.href; } catch { return false; } });
  const css = [...sheet.cssRules].filter(r => r.selectorText?.startsWith('.sj')).map(r => r.cssText).join('\n');
  const w = window.open('', '_blank');
  if (!w) { toast('Pop-up diblokir browser, izinkan pop-up untuk export PDF'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Surat Jalan ${d.cycleNo}</title>
    <style>body{font-family:Inter,Arial,sans-serif;padding:30px;color:#1f2937}table{border-collapse:collapse}${css}</style></head>
    <body>${suratJalan(o, i, d)}<script>onload=()=>{print()}<\/script></body></html>`);
  w.document.close();
}

$('mBody').addEventListener('click', e => {
  const t = e.target.closest('[data-toggle]');
  if (t) { t.parentElement.classList.toggle('closed'); return; }
  const act = e.target.closest('[data-action]');
  if (act) { openAction(act.dataset.action); return; }
  const box = e.target.closest('[data-cycle]'); if (!box) return;
  const i = +box.dataset.cycle, d = cycleDetail(current, i);
  const v = e.target.closest('[data-view]');
  if (v && !v.disabled) {
    const isSj = v.dataset.view === 'sj';
    const title = isSj ? 'Foto Surat Jalan' : 'Finish Cycle Foto';
    const src = photo(title, d, isSj ? '#7a8ba8' : '#5fa77f');
    showPreview(`${title} - Cycle ${i + 1}`, `<img alt="${title}" src="${src}">`,
      `<a class="btn-sm-blue" style="text-decoration:none" download="${title.replace(/ /g, '_')}_${d.cycleNo}.svg" href="${src}">Download</a>`);
  }
  const sj = e.target.closest('[data-sj]');
  if (sj && !sj.disabled) {
    showPreview(`Surat Jalan ELIPS - Cycle ${i + 1}`, suratJalan(current, i, d), `<button class="btn-sm-blue" id="pvPrint">PDF</button>`);
    $('pvPrint').onclick = () => printSuratJalan(current, i, d);
  }
  const pdf = e.target.closest('[data-pdf]');
  if (pdf && !pdf.disabled) printSuratJalan(current, i, d);
});

const closeDetail = () => $('overlay').classList.remove('show');
$('tbody').addEventListener('click', e => { const b = e.target.closest('.act'); if (b) openDetail(b.dataset.order); });
$('mClose').addEventListener('click', closeDetail);
$('pvClose').addEventListener('click', closePreview);
$('overlay').addEventListener('click', e => { if (e.target === $('overlay')) closeDetail(); });
$('preview').addEventListener('click', e => { if (e.target === $('preview')) closePreview(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  $('preview').classList.contains('show') ? closePreview() : closeDetail();
});

// ---------- Sidebar & top buttons ----------
$('dailyToggle').addEventListener('click', e => { e.preventDefault(); $('dailySub').classList.toggle('collapsed'); });
document.querySelectorAll('[data-page]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault(); toast(`Halaman "${a.dataset.page}" belum tersedia di mock-up ini`);
}));
document.querySelector('.sub a.active').addEventListener('click', e => e.preventDefault());
$('btnDriverApp').addEventListener('click', () => toast('Download Driver App (mock-up)'));
$('btnLanding').addEventListener('click', () => toast('Menuju Landing Page (mock-up)'));

render();
