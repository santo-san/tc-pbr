// ELIPS TC-PBR DTP Creation mock-up UI (Daily > Planning Order): calendar, Universal DTP, upload / manual / IPMS interface,
// selectable grid, submission and processing queue. Uses app.js (DATA, state, helpers) and the rules in dtp-rules.js.
const D = window.DtpRules, S = D.STATUS;

// ---------- System Master, data mapping, sources ----------
const DTP_CFG = { backdateDays: 3, advanceDays: 14 };   // System Master: DTP date range
const LOC_FROM = { D1: 'Depo Sunter', D2: 'Depo Cikarang', D3: 'Depo Cakung Marunda' };
const LOC_TO = { K1E: 'CY TMMIN Karawang (EMPTY)', S1E: 'CY TMMIN Sunter (EMPTY)' };
const DCTX = { lps: SUPPLIERS.map(s => s[1]), from: Object.keys(LOC_FROM), to: Object.keys(LOC_TO), containerError: W.containerError };
const NAMES = { lp: c => SUP_BY_CODE[c] || window.MasterKpi?.NAMES?.[c] || c, from: c => LOC_FROM[c] || c, to: c => LOC_TO[c] || c };
// Master KPI rows (single mock source MasterKpi.SEED, as on the Master KPI screen); Order Sharing = daily limit per trucking company
const MK = window.MasterKpi;
const KPI_ROWS = MK.SEED.map(({ partner, paymentType, score, orderSharing, dailyTrip }) => ({ partner, paymentType, score, orderSharing, ...(dailyTrip != null ? { dailyTrip } : {}), uom: MK.UOM }));
// Payment Type per DTP (KM-13..KM-15): types of a company from Master KPI, grid cell, change (row or selected records)
const payTypes = (lp, date) => lp ? D.payTypesFor(lp, date, KPI_ROWS, MK.applicable) : [];
const SRC_CLS = { [D.SOURCE.IPMS]: 'IPMS', [D.SOURCE.EXCEL]: 'EXCEL', [D.SOURCE.MANUAL]: 'MANUAL' };
const ST_CLS = { [S.AVAILABLE]: 'av', [S.ERROR]: 'er', [S.READY]: 'rd', [S.SUBMITTED]: 'sb', [S.QUEUED]: 'qu', [S.PROCESSING]: 'pr', [S.PROCESSED]: 'ok', [S.FAILED]: 'fl' };
const CAL_CLS = { [D.CAL.WAIT]: 'w', [D.CAL.ASSIGNED]: 'a', [D.CAL.REJECTED]: 'r', [D.CAL.FINISH]: 'f' };
const todayStr = () => W.ymd(new Date());
const isPlanner = () => D.canCreate(state.actor);
const demo = { ipmsError: false, submitError: false, swError: false, swRace: false, mtError: false, mtRace: false };

// ---------- Records (persisted in this browser so a refresh cannot submit the same records again) ----------
const STORE = 'tcpbr.dtp.v1';
let RECS = [], recSeq = 1, PULLED = {};   // PULLED: IPMS records received per date
function persist() {
  try { localStorage.setItem(STORE, JSON.stringify({ RECS, recSeq, PULLED })); } catch (e) { /* storage not available */ }
}
function restore() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!s) return false;
    ({ RECS, recSeq, PULLED } = s);
    RECS.forEach(r => { if (r.source === 'BEST Interface') r.source = D.SOURCE.IPMS; });
    RECS.forEach(r => { if (!r.payType && !D.LOCKED.includes(r.status) && r.status !== S.FAILED) r.payType = D.suggestPayType(r.lp, r.date, RECS, KPI_ROWS, MK.applicable, r); });   // stored before Payment Type existed   // records stored before the source was renamed to IPMS
    RECS.forEach(r => { r.history.forEach(h => { h.at = new Date(h.at); }); if (r.submittedAt) r.submittedAt = new Date(r.submittedAt); });
    // processed records: their Daily orders are part of the order data again
    RECS.filter(r => r.status === S.PROCESSED && r.orderNo && !DATA.some(o => o.orderNo === r.orderNo)).forEach(r => DATA.push(orderOf(r, new Date(r.history.at(-1).at))));
    return true;
  } catch (e) { return false; }
}

// ---------- IPMS interface (simulated: a fixed pool of records per planning date) ----------
function ipmsPool(date) {
  const r = rng(hash('IPMS' + date)), pick = a => a[Math.floor(r() * a.length)], n = 10;
  return Array.from({ length: n }, (_, i) => {
    const io = i % 3 === 2 ? 'IMPORT' : 'EXPORT';
    const c10 = pick(['TCNU', 'MSKU', 'CMAU', 'ONEU']) + String(Math.floor(r() * 1e6)).padStart(6, '0');
    return {
      io, exporter: io === 'EXPORT' ? 'TMMIN' : pick(['TOYOTA TSUSHO', 'DENSO', 'AISIN']), importerCd: io === 'EXPORT' ? pick(['TMTAU', 'TMVVN', 'TKMIN', 'TMPPH']) : 'TMMINID',
      roundUse: r() < 0.3 ? 'Y' : 'N', lp: i === 1 ? '' : pick(DCTX.lps), renban: `C${1200 + Math.floor(r() * 90)}`, from: pick(DCTX.from), to: pick(DCTX.to),
      dest: pick(['STM', 'LCB', 'SGN', 'MNL', 'SYD']), etd: D.addDays(date, 1 + i % 3), ctrSize: pick(['20', '40', '40 HC']), agent: pick(['CMA', 'MSK', 'ONE', 'EVG']),
      bookNo: String(8990267818822000 + Math.floor(r() * 9999)), vessel: pick(['CMA CGM TAGE', 'MAERSK SELETAR', 'ONE HARMONY', 'EVER LOVELY']), truckType: 'TRAILER',
      container: c10 + W.containerCheckDigit(c10), description: '', shift: pick(['DAY', 'NIGHT']), dg: r() < 0.15 ? 'DG' : '', arrDate: date, arrTime: pick(['06:00', '08:00', '13:00', '20:00']),
      failOnce: i === 5,   // the queue fails this one once (retryable)
    };
  });
}
// Receives the next records of the pool: 7 at the first call, the rest at the next call
function pullIpms(date) {
  const pool = ipmsPool(date), from = PULLED[date] || 0, to = from ? pool.length : 7;
  const got = pool.slice(from, to);
  PULLED[date] = to;
  got.forEach(raw => addRecord(raw, date, D.SOURCE.IPMS));
  return got.length;
}
function addRecord(raw, date, source) {
  const r = D.makeRecord(raw, { id: recSeq++, date, source, grid: RECS, ctx: DCTX });
  r.failOnce = !!raw.failOnce;
  // KM-14: Payment Type chosen by the planner (manual entry) or the default (By Resources while a slot is free, then By Trip)
  r.payType = raw.payType && payTypes(r.lp, date).includes(raw.payType) ? raw.payType : D.suggestPayType(r.lp, date, RECS, KPI_ROWS, MK.applicable);
  r.history.push({ at: new Date(), status: r.status, note: `Received from ${source}` });
  RECS.push(r); return r;
}

// ---------- Queue (background service in the real system) ----------
const orderOf = (r, at) => {
  const o = W.newOrder(D.orderPayload(r, NAMES), { role: 'PLANNER', name: r.submittedBy || 'Planner VPLD' }, at, r.orderNo, 'DTP Creation (Universal DTP)',
    `${r.io} · ${r.source} · Container ${r.container || '-'}`);
  o.dtp = { recId: r.id, io: r.io, exporter: r.exporter, importerCd: r.importerCd, container: r.container, dest: r.dest, vessel: r.vessel,
    agent: r.agent, bookNo: r.bookNo, ctrSize: r.ctrSize, truckType: r.truckType, fromCd: r.from, toCd: r.to, payType: r.payType || '' };
  return o;
};
const QUEUE = []; let qBusy = false;
function enqueue(recs) { recs.forEach(r => QUEUE.push(r.id)); runQueue(); }
function runQueue() {
  if (qBusy || !QUEUE.length) return;
  qBusy = true;
  const id = QUEUE.shift(), r = RECS.find(x => x.id === id);
  const next = () => { qBusy = false; persist(); refreshAll(); runQueue(); };
  if (!r) return next();
  // DTP Switching may roll the record back while it waits: stop when it is no longer submitted (backend: status check in the same transaction)
  const gone = () => ![S.SUBMITTED, S.QUEUED, S.PROCESSING].includes(r.status);
  setTimeout(() => {
    if (gone()) return next();
    if (r.status !== S.PROCESSING) { D.step(r, S.QUEUED, new Date(), 'In processing queue'); refreshAll(); }
    setTimeout(() => {
      if (gone()) return next();
      D.step(r, S.PROCESSING, new Date(), 'Picked up by the queue service'); refreshAll();
      setTimeout(() => {
        r.attempts++;
        if (r.failOnce && r.attempts === 1) {
          r.failReason = 'LP Admin service timeout (retryable). Click Retry to send it again.';
          D.step(r, S.FAILED, new Date(), r.failReason);
        } else {
          r.orderNo = genOrderNo(r.date); r.failReason = '';
          D.step(r, S.PROCESSED, new Date(), `Daily order ${r.orderNo} created for LP Admin`);
          DATA.push(orderOf(r, new Date()));
        }
        next();
      }, 700);
    }, 400);
  }, 300);
}
// Records left in the queue when the page was closed continue
function resumeQueue() { enqueue(RECS.filter(r => [S.SUBMITTED, S.QUEUED, S.PROCESSING].includes(r.status))); }

// ---------- Initial data ----------
if (!restore()) {
  const t = todayStr();
  pullIpms(t); pullIpms(D.addDays(t, 1));
  // three of today's records were submitted earlier and are processed; one of their orders already has a truck
  RECS.filter(r => r.date === t && r.status === S.AVAILABLE).slice(0, 3).forEach((r, i) => {
    const at = new Date(Date.now() - (60 - i) * 60000);
    D.submit([r], { at, actor: { role: 'PLANNER', name: 'Planner VPLD' }, date: t, today: t, cfg: DTP_CFG });
    D.step(r, S.QUEUED, at); D.step(r, S.PROCESSING, at);
    r.orderNo = genOrderNo(t); r.attempts = 1; D.step(r, S.PROCESSED, at, `Daily order ${r.orderNo} created for LP Admin`);
    const o = orderOf(r, at); DATA.push(o);
    // the LP Admin already accepted the first one and assigned a truck (Planning Truck Assignment)
    if (i === 0) {
      const lp = { role: 'SUPPLIER', lpAdmin: true, supplier: o.supplier, name: `LP Admin ${r.lp}` };
      W.perform(o, 'lpAccept', {}, lp, at, CTX);
      const tr = MASTER.trucks.find(x => W.truckState(x, o, CTX).ok);
      if (tr) W.perform(o, 'lpAssign', { truck: tr.plate }, lp, at, CTX);
    }
  });
  persist();
} else resumeQueue();

// ---------- Routing (Daily sub menu) ----------
const VIEWS = { monitoring: 'pgMonitoring', 'planning-order': 'pgPlanning', 'truck-assignment': 'pgAssign', 'sa-approval': 'pgSA', 'sa-monitoring': 'pgSAM' };
function route() {
  const [v0, date, mDate, mType] = location.hash.slice(1).split('/');
  const v = VIEWS[v0] ? v0 : 'monitoring';
  Object.entries(VIEWS).forEach(([k, id]) => { $(id).style.display = k === v ? '' : 'none'; });
  document.querySelectorAll('#dailySub a, #saSub a').forEach(a => a.classList.toggle('active', a.dataset.view === v));
  document.title = `ELIPS - ${{ monitoring: 'Daily Monitoring', 'planning-order': 'Planning Order', 'truck-assignment': 'Planning Truck Assignment', 'sa-approval': 'SA Approval', 'sa-monitoring': 'SA Monitoring' }[v]}`;
  if (v === 'monitoring') render();
  if (v === 'truck-assignment') window.taRender?.();
  if (v === 'sa-approval') window.saRender?.();
  if (v === 'sa-monitoring') window.samRender?.();
  if (v !== 'planning-order') return;
  if (date === 'maint' && /^\d{4}-\d{2}-\d{2}$/.test(mDate || '') && mType) openMaint(mDate, decodeURIComponent(mType));
  else if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) openCreate(date); else showCalendar();
}
window.addEventListener('hashchange', route);
document.addEventListener('actorchange', () => { if (/^#(planning-order|truck-assignment|sa-approval|sa-monitoring)/.test(location.hash)) route(); });
function refreshAll() {
  if ($('dtpCreate').style.display !== 'none' && dc.date) renderGrid();
  if ($('dtpCal').style.display !== 'none') { if ($('mtBody')) renderMaint(); else renderCalendar(); }
}

// ---------- Calendar ----------
const cal = { view: 'month', cursor: todayStr(), selected: null };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function showCalendar() { $('dtpCreate').style.display = 'none'; $('dtpCal').style.display = ''; renderCalendar(); }
function entriesOf(date) {
  const by = {};
  DATA.filter(o => o.date === date).forEach(o => { (by[o.type] = by[o.type] || []).push(o); });
  return Object.entries(by).sort().map(([type, orders]) => ({ type, orders, status: D.calStatus(orders, W), label: D.calLabel(type, date, orders, W) }));
}
function dayCell(date, inMonth, limit) {
  const err = D.dateCheck(date, todayStr(), DTP_CFG), ents = entriesOf(date);
  const open = RECS.filter(r => r.date === date && [S.AVAILABLE, S.READY, S.ERROR, S.FAILED].includes(r.status)).length;
  const inq = RECS.filter(r => r.date === date && [S.SUBMITTED, S.QUEUED, S.PROCESSING].includes(r.status)).length;
  const cls = ['cal-day', inMonth ? '' : 'other', err ? 'off' : 'on', date === todayStr() ? 'today' : '', date === cal.selected ? 'sel' : ''].join(' ');
  const shown = limit ? ents.slice(0, limit) : ents;
  return `<div class="${cls}" data-date="${date}" title="${err ? esc(err) : 'Click to create DTP'}">
    ${err ? '' : '<span class="add">+ DTP</span>'}<div class="num">${date === todayStr() ? `<b>${+date.slice(8)}</b>` : +date.slice(8)}</div>
    ${open || inq ? `<span class="drafts">${open ? `${open} open` : ''}${open && inq ? ' · ' : ''}${inq ? `${inq} in queue` : ''}</span>` : ''}
    ${shown.map(e => `<button class="ev ${CAL_CLS[e.status]}" data-ev="${date}|${e.type}" title="${esc(e.status)} - open the DTP list (maintenance)">${esc(e.label)}</button>`).join('')}
    ${limit && ents.length > limit ? `<button class="ev-more" data-more="${date}">+${ents.length - limit} more</button>` : ''}</div>`;
}
function renderCalendar() {
  const range = D.dateRange(todayStr(), DTP_CFG);
  const [y, m] = cal.cursor.split('-').map(Number);
  let title, body;
  if (cal.view === 'month') {
    title = `${MONTH[m - 1]} ${y}`;
    const first = new Date(y, m - 1, 1), start = D.addDays(W.ymd(first), -first.getDay());
    const weeks = Math.ceil((first.getDay() + new Date(y, m, 0).getDate()) / 7);
    body = `<div class="cal-grid">${DOW.map(d => `<div class="dow">${d}</div>`).join('')}${Array.from({ length: weeks * 7 }, (_, i) => { const d = D.addDays(start, i); return dayCell(d, +d.slice(5, 7) === m, 6); }).join('')}</div>`;
  } else if (cal.view === 'week') {
    const d0 = new Date(y, m - 1, +cal.cursor.slice(8)), start = D.addDays(cal.cursor, -d0.getDay());
    title = `${D.fmtLong(start)} - ${D.fmtLong(D.addDays(start, 6))}`;
    body = `<div class="cal-grid cal-week">${DOW.map((d, i) => `<div class="dow">${d} ${+D.addDays(start, i).slice(8)}</div>`).join('')}${Array.from({ length: 7 }, (_, i) => dayCell(D.addDays(start, i), true, 0)).join('')}</div>`;
  } else {
    const d = cal.cursor, err = D.dateCheck(d, todayStr(), DTP_CFG), ents = entriesOf(d), recs = RECS.filter(r => r.date === d);
    title = `${DOW[new Date(y, m - 1, +d.slice(8)).getDay()]}, ${D.fmtLong(d)}`;
    const cnt = st => recs.filter(r => st.includes(r.status)).length;
    body = `<div class="cal-dayview"><h4>Daily orders</h4>${ents.length ? ents.map(e => `<button class="ev ${CAL_CLS[e.status]}" style="max-width:420px" data-ev="${d}|${e.type}">${esc(e.label)} · ${e.status}</button>`).join('') : '<p class="q-note">No daily order on this date.</p>'}
      <h4 style="margin-top:14px">DTP records</h4><p class="q-note">Open: ${cnt([S.AVAILABLE, S.READY])} · Validation Error: ${cnt([S.ERROR])} · In queue: ${cnt([S.SUBMITTED, S.QUEUED, S.PROCESSING])} · Processed: ${cnt([S.PROCESSED])} · Failed: ${cnt([S.FAILED])}</p>
      ${err ? `<div class="view-only">${esc(err)}</div>` : `<button class="btn-next" data-pick="${d}" style="margin-top:6px">Create DTP for ${D.fmtLong(d)} &rarr;</button>`}</div>`;
  }
  $('dtpCal').innerHTML = `<section class="cal-card">
    <div class="cal-bar"><div class="cal-nav"><button data-nav="-1" aria-label="Previous">&lsaquo;</button><button data-nav="1" aria-label="Next">&rsaquo;</button><button data-nav="0">Today</button></div>
      <div class="cal-title">${title}</div>
      <div class="cal-views">${['month', 'week', 'day'].map(v => `<button data-view="${v}" class="${cal.view === v ? 'on' : ''}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div>
    <div class="cal-info">${range ? `<span class="chip">System Master: backdate ${DTP_CFG.backdateDays} day(s), advance ${DTP_CFG.advanceDays} day(s) → selectable ${D.fmtLong(range.min)} to ${D.fmtLong(range.max)}</span>` : `<span class="chip bad">${esc(D.MSG.noConfig)}</span>`}
      ${isPlanner() ? '' : `<span class="chip bad">${esc(W.roleLabel(state.actor))}: view only. ${esc(D.MSG.noAuth)}</span>`}</div>
    ${body}
    <div class="cal-legend"><span><i style="background:#3d8bfd"></i>Waiting Assignment</span><span><i style="background:#4cc98a"></i>Assigned to Truck</span><span><i style="background:#f43f6e"></i>Rejected by LP</span><span><i style="background:#0b1a3a"></i>Order Finish</span>
      <span class="sep"></span><span><i style="background:#fff;border:1px solid #d5d9e0"></i>Selectable</span><span><i style="background:repeating-linear-gradient(-45deg,#fafbfc,#fafbfc 3px,#e5e8ee 3px,#e5e8ee 6px);border:1px solid #d5d9e0"></i>Disabled</span>
      <span><i style="background:#2f80ed"></i>Today</span><span><i style="border:2px solid #0b2b5c"></i>Selected</span></div>
  </section>`;
}
$('dtpCal').addEventListener('click', e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    const k = +nav.dataset.nav, [y, m, d] = cal.cursor.split('-').map(Number);
    cal.cursor = !k ? todayStr() : cal.view === 'month' ? W.ymd(new Date(y, m - 1 + k, 1)) : D.addDays(cal.cursor, k * (cal.view === 'week' ? 7 : 1));
    return renderCalendar();
  }
  const v = e.target.closest('[data-view]'); if (v) { cal.view = v.dataset.view; return renderCalendar(); }
  const more = e.target.closest('[data-more]'); if (more) { cal.view = 'day'; cal.cursor = more.dataset.more; return renderCalendar(); }
  const ev = e.target.closest('[data-ev]'); if (ev) { const [d, type] = ev.dataset.ev.split('|'); location.hash = `#planning-order/maint/${d}/${encodeURIComponent(type)}`; return; }
  const pk = e.target.closest('[data-pick]'); if (pk) return pickDtp(pk.dataset.pick);
  const day = e.target.closest('[data-date]'); if (!day) return;
  const err = D.dateCheck(day.dataset.date, todayStr(), DTP_CFG);
  if (err) { toast(err); return; }
  cal.selected = day.dataset.date; renderCalendar(); pickDtp(day.dataset.date);
});
// Calendar entry: show the orders of that date and DTP type in Daily Monitoring
function openMonitoring(date, type) {
  Object.assign(state, { dateFrom: date, dateTo: date, dtp: ['DTP1', 'DTP2', 'DTP3', 'DTP4'].includes(type) ? type : '', search: '', page: 1, from: '', to: '' });
  $('dateFrom').value = date; $('dateTo').value = date; $('search').value = ''; $('fromLoc').value = ''; $('toLoc').value = '';
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.dtp === state.dtp));
  location.hash = '#monitoring'; toast(`Daily orders ${D.fmtLong(date)} · ${type}`);
}

// ---------- DTP Maintenance (calendar entry > "DTP n List"): edit / cancel DTP while the driver has not started ----------
const SUP_CODE = Object.fromEntries(SUPPLIERS.map(([n, c]) => [n, c]));
const revMap = m => n => Object.keys(m).find(k => m[k] === n) || n || '';
const MNAMES = { ...NAMES, lpCode: n => SUP_CODE[n] || n || '', fromCode: revMap(LOC_FROM), toCode: revMap(LOC_TO) };
const MCOLS = [['roundUse', 'Round Use', 'sel', 70], ['lp', 'Truck Company', 'sel', 190], ['payType', 'Payment Type', 'sel', 120], ['renban', 'Renban', 'txt', 64], ['from', 'From', 'sel', 150], ['to', 'To', 'sel', 160],
  ['dest', 'Destination', 'txt', 64], ['etd', 'ETD', 'date', 118], ['ctrSize', 'Ctr Size', 'sel', 62], ['agent', 'Agent', 'txt', 78], ['bookNo', 'Ctr Book No', 'txt', 92],
  ['container', 'Container No', 'ro', 96], ['ctrType', 'Ctr Type', 'sel', 62], ['dg', 'Ctr DG ?', 'sel', 62], ['vessel', 'Vessel', 'txt', 92], ['truckType', 'Truck Type', 'sel', 84],
  ['description', 'Description', 'txt', 92], ['serviceType', 'Service Type', 'sel', 170], ['shift', 'Shift', 'sel', 110], ['arrDate', 'Arr. Date', 'date', 118],
  ['arrTime', 'Arr. Time', 'time', 84], ['orderNo', 'Order No', 'info', 130], ['drv', 'Driver Status', 'info', 150]];
const MOPTS = {
  roundUse: () => [['Y', 'Yes'], ['N', 'No']], lp: () => lpOpts(), from: () => fromOpts(), to: () => toOpts(), ctrSize: () => ['20', '40', '45'], ctrType: () => D.CTR_TYPES,
  dg: () => [['N', 'No'], ['Y', 'Yes']], payType: () => Object.values(D.PAY), truckType: () => [...new Set(MASTER.trucks.map(t => t.type))].sort(), serviceType: () => Object.values(D.SERVICE_TYPES), shift: () => D.OPTIONS.shift,
};
const mt = { date: null, type: null, q: '', page: 1, size: 10, hidden: new Set(), edits: {}, cancels: new Set(), errors: {}, sel: new Set() };
const mtTypeLabel = t => t === 'Universal' ? 'Universal DTP' : String(t).replace(/^DTP(\d)$/, 'DTP $1');
const mtOrders = () => DATA.filter(o => o.date === mt.date && o.type === mt.type);
const mtRec = o => o.dtp ? RECS.find(r => r.orderNo === o.orderNo) || null : null;
const mtBase = o => D.maintValues(o, mtRec(o), MNAMES);
const mtVals = o => mt.edits[o.orderNo] || mtBase(o);
const mtChanged = o => { const e = mt.edits[o.orderNo]; if (!e) return []; const b = mtBase(o); return Object.keys(e).filter(k => String(e[k] ?? '') !== String(b[k] ?? '')); };
const mtLock = o => !isPlanner() ? D.MSG.noAuth : D.maintCheck(o, W)?.msg || '';
const mtPending = () => mt.cancels.size + mtOrders().filter(o => !mt.cancels.has(o.orderNo) && mtChanged(o).length).length;

function openMaint(date, type) {
  if (mt.date !== date || mt.type !== type) Object.assign(mt, { date, type, q: '', page: 1, edits: {}, cancels: new Set(), errors: {}, sel: new Set() });
  $('dtpCreate').style.display = 'none'; $('dtpCal').style.display = '';
  const lbl = mtTypeLabel(type), ro = !isPlanner();
  $('dtpCal').innerHTML = `<section class="cal-card mt-card">
    <div class="mt-head"><span>&#128197; Daily Plan Date : <b>${D.fmtDmy(date)}</b></span><span class="spacer"></span>
      <button class="link" id="mtMon" title="Show these orders in Daily Monitoring">Open in Daily Monitoring</button>
      <div class="dd demo-dd" id="mtDemo"><button class="btn-light" style="height:26px">Demo &#9662;</button><div class="dd-menu">
        <label><input type="checkbox" data-mdemo="mtError" ${demo.mtError ? 'checked' : ''}> Simulate save failure (DB)</label>
        <label><input type="checkbox" data-mdemo="mtRace" ${demo.mtRace ? 'checked' : ''}> Driver starts during save confirmation</label>
        <button data-mdemo-start>Driver starts the first assigned order</button></div></div>
      <span class="mt-title">&#9656; ${esc(lbl)} - Maintenance</span></div>
    ${ro ? `<div class="view-only ro-strong"><b>&#128274; ${esc(D.MSG.noAuth)}</b> The list is read only. <button class="btn-sm-blue" id="mtAsPlanner">Login sebagai Planner VPLD</button></div>` : ''}
    <div class="mt-bar"><h3>${esc(lbl)} List</h3>
      <button class="btn-del" id="mtDelSel" disabled title="Mark the selected DTP for deletion (confirmed with Save)">&#10005; Delete Selected</button>
      <button class="btn-outline mt-rest" id="mtRestSel" disabled title="Remove the deletion mark of the selected DTP">&#8634; Restore Selected</button>
      <span class="q-note" id="mtSelCnt"></span><span class="spacer"></span>
      <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="text" id="mtSearch" placeholder="Search [ Input 3 characters ]" style="width:190px" value="${esc(mt.q)}"></div>
      <div class="dd" id="mtCol"><button class="btn-blue"><svg width="15" height="13" viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="1" width="22" height="18" rx="2"/><path d="M5 6h14M5 10h14M5 14h14"/></svg>Kolom <span style="font-size:8px">▼</span></button>
        <div class="dd-menu dd-right">${MCOLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" ${mt.hidden.has(k) ? '' : 'checked'}> ${l}</label>`).join('')}</div></div></div>
    <div class="table-wrap mt-wrap"><table class="mt-table"><thead id="mtHead"></thead><tbody id="mtBody"></tbody></table></div>
    <div class="mt-foot1"><span id="mtInfo" class="q-note"></span><div class="pager" id="mtPager"></div></div>
    <div class="dc-foot"><button class="btn-outline" id="mtBack">&larr; Back</button><span class="spacer"></span><span class="cnt" id="mtCnt"></span>
      <button class="btn-outline" id="mtCancel" ${ro ? 'disabled' : ''}>&#8634; Cancel</button><button class="btn-submit mt-save" id="mtSave" ${ro ? 'disabled' : ''}>&#128190; Save</button></div>
  </section>`;
  bindMaint(); renderMaint();
}
function mtCell(o, k, kind, v, lock, cancelled) {
  const val = v[k] ?? '', err = mt.errors[o.orderNo]?.[k], chg = mtChanged(o).includes(k), dis = lock || cancelled ? 'disabled' : '';
  const cls = `${chg ? 'chg' : ''} ${err ? 'bad' : ''}`, tip = err ? `title="${esc(err)}"` : '';
  if (kind === 'info') return k === 'orderNo' ? `<span class="mono">${esc(o.orderNo)}</span>` : `<span class="drv ${D.driverStarted(o, W) ? 'on' : ''}">${esc(D.driverStarted(o, W) ? `Started (${o.status})` : `Not Started (${o.status}${o.truck ? ` · ${o.truck}` : ''})`)}</span>`;
  if (kind === 'ro') return `<input class="mt-in" value="${esc(val)}" placeholder="ENTER VALUE" disabled title="Entered by the driver at Pick Up">`;
  if (kind === 'sel') {
    let opts = MOPTS[k]().map(x => Array.isArray(x) ? x : [x, x]);
    if (val && !opts.some(([c]) => c === val)) opts = [[val, val], ...opts];
    return `<select class="mt-in ${cls}" data-f="${k}" ${dis} ${tip}>${val ? '' : `<option value="">Select an option</option>`}${opts.map(([c, l]) => `<option value="${esc(c)}" ${c === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  }
  const type = kind === 'date' ? 'date' : 'text', ph = kind === 'time' ? 'HH:MM' : '';
  return `<input class="mt-in ${cls}" data-f="${k}" type="${type}" value="${esc(val)}" placeholder="${ph}" ${dis} ${tip}>`;
}
function renderMaint() {
  const cols = MCOLS.filter(([k]) => !mt.hidden.has(k)), q = mt.q.trim().toLowerCase();
  let rows = mtOrders();
  if (q.length >= 3) rows = rows.filter(o => [o.orderNo, ...Object.values(mtVals(o)), o.supplier, o.from, o.to].join(' ').toLowerCase().includes(q));
  const pages = Math.max(1, Math.ceil(rows.length / mt.size)); mt.page = Math.min(mt.page, pages);
  const start = (mt.page - 1) * mt.size, view = rows.slice(start, start + mt.size);
  const selectable = rows.filter(o => !mtLock(o)), allOn = selectable.length > 0 && selectable.every(o => mt.sel.has(o.orderNo));
  $('mtHead').innerHTML = `<tr><th style="min-width:96px"><label class="mt-all" title="Select all DTP that can still be deleted (all pages of the current search)"><input type="checkbox" id="mtAll" ${allOn ? 'checked' : ''} ${selectable.length ? '' : 'disabled'}> Options</label></th>${cols.map(([, l, , w]) => `<th style="min-width:${w}px">${l}</th>`).join('')}</tr>`;
  $('mtBody').innerHTML = view.map(o => {
    const v = mtVals(o), lock = mtLock(o), cx = mt.cancels.has(o.orderNo);
    const chk = `<input type="checkbox" class="mt-chk" data-sel="${o.orderNo}" ${mt.sel.has(o.orderNo) ? 'checked' : ''} ${lock ? `disabled title="${esc(lock)}"` : ''}>`;
    return `<tr data-o="${o.orderNo}" class="${cx ? 'mt-cx' : ''} ${lock ? 'mt-lock' : ''} ${mt.errors[o.orderNo] ? 'mt-err' : ''} ${mt.sel.has(o.orderNo) ? 'mt-sel' : ''}"><td class="mt-opt">${chk}${cx ? '<span class="mt-tag" title="Marked for deletion; select the row and click Restore Selected to undo">Delete</span>' : ''}</td>${cols.map(([k, , kind]) => `<td>${mtCell(o, k, kind, v, lock, cx)}</td>`).join('')}</tr>`;
  }).join('') || `<tr><td colspan="${cols.length + 1}" class="q-note" style="padding:14px;text-align:center">${q.length >= 3 ? 'No matching DTP.' : 'No DTP on this date and type.'}</td></tr>`;
  $('mtInfo').textContent = `Showing ${rows.length ? start + 1 : 0} to ${start + view.length} of ${rows.length} records`;
  $('mtPager').innerHTML = pagerFor(mt.page, pages);
  [...mt.sel].forEach(k => { const o = DATA.find(x => x.orderNo === k); if (!o || mtLock(o) || o.date !== mt.date || o.type !== mt.type) mt.sel.delete(k); });   // started / gone rows leave the selection
  const ns = mt.sel.size, nMark = [...mt.sel].filter(k => !mt.cancels.has(k)).length, nRest = ns - nMark;
  $('mtDelSel').disabled = !nMark; $('mtDelSel').innerHTML = `&#10005; Delete Selected${nMark ? ` (${nMark})` : ''}`;
  $('mtRestSel').disabled = !nRest; $('mtRestSel').innerHTML = `&#8634; Restore Selected${nRest ? ` (${nRest})` : ''}`;
  $('mtSelCnt').textContent = ns ? `${ns} selected` : '';
  const p = mtPending();
  $('mtCnt').textContent = p ? `${mt.cancels.size} to cancel · ${p - mt.cancels.size} changed` : '';
}
function bindMaint() {
  const card = $('dtpCal').querySelector('.mt-card');
  card.querySelectorAll('.dd > button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const dd = b.parentElement; document.querySelectorAll('.dd').forEach(x => x !== dd && x.classList.remove('open')); dd.classList.toggle('open'); }));
  card.querySelectorAll('.dd-menu').forEach(m => m.addEventListener('click', e => e.stopPropagation()));
  $('mtCol').querySelector('.dd-menu').addEventListener('change', e => { const k = e.target.dataset.k; if (k) { e.target.checked ? mt.hidden.delete(k) : mt.hidden.add(k); renderMaint(); } });
  $('mtDemo').addEventListener('change', e => { const k = e.target.dataset.mdemo; if (k) { demo[k] = e.target.checked; toast(`Demo: ${k === 'mtError' ? 'save failure' : 'driver starts during confirmation'} ${e.target.checked ? 'ON' : 'OFF'}`); } });
  $('mtDemo').querySelector('[data-mdemo-start]').onclick = () => { $('mtDemo').classList.remove('open'); const o = mtOrders().find(x => x.truck && !D.driverStarted(x, W)); toast(o ? driverStart(o) : 'No assigned order waiting for the driver in this list'); renderMaint(); };
  $('mtSearch').addEventListener('input', e => { mt.q = e.target.value; mt.page = 1; renderMaint(); });
  $('mtPager').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b && !b.disabled) { mt.page = +b.dataset.p; renderMaint(); } });
  const onEdit = e => {
    const f = e.target.dataset.f, tr = e.target.closest('[data-o]'); if (!f || !tr) return;
    const o = DATA.find(x => x.orderNo === tr.dataset.o); if (!o) return;
    let val = e.target.value; if (['renban', 'dest', 'bookNo'].includes(f)) val = val.toUpperCase();
    mt.edits[o.orderNo] = { ...mtVals(o), [f]: val };
    if (mt.errors[o.orderNo]) delete mt.errors[o.orderNo][f];
    e.target.classList.toggle('chg', mtChanged(o).includes(f)); e.target.classList.remove('bad'); e.target.removeAttribute('title');
    if (e.type === 'change') renderMaint();
  };
  $('mtBody').addEventListener('input', onEdit); $('mtBody').addEventListener('change', onEdit);
  $('mtBody').addEventListener('change', e => { const c = e.target.closest('[data-sel]'); if (c) { c.checked ? mt.sel.add(c.dataset.sel) : mt.sel.delete(c.dataset.sel); renderMaint(); } });
  $('mtHead').addEventListener('change', e => {
    if (e.target.id !== 'mtAll') return;
    const q = mt.q.trim().toLowerCase(), rows = mtOrders().filter(o => q.length < 3 || [o.orderNo, ...Object.values(mtVals(o)), o.supplier, o.from, o.to].join(' ').toLowerCase().includes(q));
    rows.filter(o => !mtLock(o)).forEach(o => e.target.checked ? mt.sel.add(o.orderNo) : mt.sel.delete(o.orderNo)); renderMaint();
  });
  $('mtDelSel').onclick = () => {
    const ks = [...mt.sel].filter(k => !mt.cancels.has(k)); ks.forEach(k => mt.cancels.add(k)); mt.sel.clear(); renderMaint();
    toast(`${ks.length} DTP marked for deletion. Click Save to confirm.`);
  };
  $('mtRestSel').onclick = () => { const ks = [...mt.sel].filter(k => mt.cancels.has(k)); ks.forEach(k => mt.cancels.delete(k)); mt.sel.clear(); renderMaint(); toast(`${ks.length} DTP restored.`); };
  $('mtCancel').onclick = () => { if (!mtPending()) { toast('No pending change.'); return; } Object.assign(mt, { edits: {}, cancels: new Set(), errors: {}, sel: new Set() }); renderMaint(); toast('Changes discarded.'); };
  $('mtBack').onclick = () => mtLeave(() => { location.hash = '#planning-order'; });
  $('mtMon').onclick = () => mtLeave(() => openMonitoring(mt.date, mt.type));
  $('mtSave').onclick = confirmMaint;
  if ($('mtAsPlanner')) $('mtAsPlanner').onclick = () => { $('roleSel').value = 'planner'; $('roleSel').dispatchEvent(new Event('change')); };
}
function mtLeave(go) {
  if (!mtPending()) { Object.assign(mt, { date: null, type: null }); go(); return; }
  showPreview('Discard changes?', `<div class="form-alert" style="background:#fff7e6;border-color:#fcd9a3;color:#92400e">There are ${mtPending()} unsaved change(s) in the ${esc(mtTypeLabel(mt.type))} list. Leave without saving?</div>`,
    '<button class="btn-outline" id="mlStay">Stay</button><button class="btn-dark" id="mlGo">Discard and leave</button>');
  $('mlStay').onclick = closePreview;
  $('mlGo').onclick = () => { closePreview(); Object.assign(mt, { date: null, type: null, edits: {}, cancels: new Set(), errors: {} }); go(); };
}
function confirmMaint() {
  const orders = mtOrders();
  const rows = orders.filter(o => mt.cancels.has(o.orderNo)).map(o => ({ key: o.orderNo, o, r: mtRec(o), cancel: true }))
    .concat(orders.filter(o => !mt.cancels.has(o.orderNo) && mtChanged(o).length).map(o => ({ key: o.orderNo, o, r: mtRec(o), values: mt.edits[o.orderNo] })));
  if (!rows.length) { toast(D.MT_MSG.nothing); return; }
  const lbl = k => MCOLS.find(c => c[0] === k)?.[1] || k;
  const line = x => {
    const o = x.o, ch = x.cancel ? [] : mtChanged(o), lpMove = !x.cancel && ch.includes('lp') && o.truck;
    return `<tr><td>${o.orderNo}</td><td>${esc(o.supplier)}</td><td>${esc(o.from)} &rarr; ${esc(o.to)}</td><td>${o.status}${o.truck ? ` · ${o.truck}` : ''}</td>
      <td>${x.cancel ? '<b style="color:#c62828">Cancel DTP</b> (Daily order cancelled' + (o.truck ? ', truck released' : '') + ')' : `Update: ${ch.map(lbl).join(', ')}${lpMove ? ' <b style="color:#b45309">(truck released, LP must accept again)</b>' : ''}`}</td></tr>`;
  };
  showPreview(`Confirm ${mtTypeLabel(mt.type)} Maintenance`, `<p style="margin:0 0 8px">Save the following change(s) for ${D.fmtLong(mt.date)}? The driver status is checked again before saving.</p>
    <div class="err-scroll"><table class="err-table"><tr><th>Order No</th><th>Truck Company</th><th>From &rarr; To</th><th>Status</th><th>Change</th></tr>${rows.map(line).join('')}</table></div>
    <div class="form-alert" style="background:#fff7e6;border-color:#fcd9a3;color:#92400e;margin-top:10px">Cancelled DTP are removed for the LP Admin, Truck Assignment and the driver; history is kept. Started orders cannot be changed.</div>`,
    '<button class="btn-outline" id="mcNo">Back</button><button class="btn-dark" id="mcYes">Save</button>');
  $('mcNo').onclick = closePreview;
  $('mcYes').onclick = () => {
    $('mcYes').disabled = true;
    if (demo.mtRace) { const o = rows.map(x => x.o).find(x => x.truck && !D.driverStarted(x, W)); if (o) driverStart(o); }
    const res = D.maintSave(rows, { at: new Date(), actor: state.actor, W, vctx: DCTX, names: MNAMES, fail: demo.mtError, payTypes: lp => payTypes(lp, mt.date),
      removeOrder: o => { const i = DATA.indexOf(o); if (i >= 0) DATA.splice(i, 1); },
      removeRecord: r => { const i = RECS.indexOf(r); if (i >= 0) RECS.splice(i, 1); } });
    closePreview();
    if (res.ok) {
      Object.assign(mt, { edits: {}, cancels: new Set(), errors: {}, sel: new Set() });
      persist(); window.render?.(); renderMaint(); toast(res.message); return;
    }
    if (res.errors) { mt.errors = res.errors; renderMaint(); }
    if (res.failed) renderMaint();
    showPreview(res.status === 500 ? 'Save failed' : 'Save not possible', `<div class="form-alert">${esc(res.error)}</div>
      ${res.failed ? `<div class="err-scroll"><table class="err-table"><tr><th>Order No</th><th>Reason</th></tr>${res.failed.map(f => `<tr><td>${f.key}</td><td>${esc(f.msg)}</td></tr>`).join('')}</table></div>` : ''}
      ${res.errors ? `<div class="err-scroll"><table class="err-table"><tr><th>Order No</th><th>Field</th><th>Message</th></tr>${Object.entries(res.errors).flatMap(([k, e]) => Object.entries(e).map(([f, m]) => `<tr><td>${k}</td><td>${lbl(f)}</td><td>${esc(m)}</td></tr>`)).join('')}</table></div>` : ''}`,
      '<button class="btn-outline" id="mfOk">Close</button>');
    $('mfOk').onclick = closePreview;
  };
}

// Universal DTP selection modal
function pickDtp(date) {
  showPreview(`Planning order form #${D.fmtDmy(date)}`, `<div class="dtp-pick">
      <h4>Choose Transaction Type <span class="req">*</span></h4>
      <div class="dtp-banner"><div>Please select the Universal DTP<small>TC-PBR uses one DTP model for Import and Export</small></div>
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#9cc0ff" stroke-width="1.4"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 12h10M13 8l4 4-4 4"/></svg></div>
      <div class="dtp-cards"><button class="dtp-card" id="dtpCard" type="button"><svg viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>
        <div><b>${D.MODEL.label}</b><span>(${D.MODEL.desc})</span></div></button></div></div>`,
    `<button class="btn-next" id="dtpNext" disabled>Next <span style="font-size:14px">&rarr;</span></button>`);
  $('pvBody').closest('.pv').style.width = '760px';
  $('dtpCard').onclick = () => { $('dtpCard').classList.add('on'); $('dtpNext').disabled = false; };
  $('dtpNext').onclick = () => { closePreview(); $('pvBody').closest('.pv').style.width = ''; location.hash = `#planning-order/${date}`; };
}

// ---------- DTP Creation ----------
const DCOLS = [['io', 'Import/Export', 1], ['exporter', 'Exporter', 1], ['importerCd', 'Importer CD', 1], ['container', 'Container No.', 1], ['renban', 'Renban', 1],
  ['etd', 'ETD Based', 1], ['vessel', 'Vessel Name', 1], ['source', 'Data Source', 1], ['status', 'Status', 1], ['lp', 'LP', 1], ['payType', 'Payment Type', 1], ['orderNo', 'Order No', 1], ['drv', 'Driver Status', 1],
  ['from', 'From Location', 0], ['to', 'To Location', 0], ['dest', 'Destination', 0], ['roundUse', 'Round Use', 0], ['ctrSize', 'Container Size', 0], ['agent', 'Shipping Agent', 0],
  ['bookNo', 'Ctr Booking No', 0], ['truckType', 'Truck Type', 0], ['shift', 'Shift', 0], ['dg', 'Ctr DG Flag', 0], ['arrDate', 'Arrival Date', 0], ['arrTime', 'Arrival Time', 0], ['description', 'Description', 0]];
const dc = { date: null, io: 'EXPORT', q: '', fStatus: '', fSource: '', fIo: '', sort: 'id', dir: 1, page: 1, size: 25, hidden: new Set(DCOLS.filter(c => !c[2]).map(c => c[0])), flash: new Set(), sw: new Set() };
const orderFor = r => r.orderNo ? DATA.find(o => o.orderNo === r.orderNo) : null;
const kpiMon = (date = dc.date) => D.kpiMonitor({ date, records: RECS, lps: DCTX.lps, kpiRows: KPI_ROWS, applicable: MK.applicable, byResource: MK.PAYMENT_BY_RESOURCE, byTrip: MK.PAYMENT_BY_TRIP, dailyTrips: MK.DAILY_TRIPS, tripLimits: MK.allocateTrip, rejected: r => !!orderFor(r)?.lpRejected });
function payCell(r, ro) {
  const types = payTypes(r.lp, r.date), cls = r.payType === D.PAY.TRIP ? 'trip' : r.payType === D.PAY.RES ? 'res' : 'none';
  const editable = !ro && !D.LOCKED.includes(r.status) && r.status !== S.FAILED && types.length;
  if (!editable) return r.payType ? `<span class="pt ${cls}">${esc(r.payType)}</span>` : (types.length ? '<span class="pt none">-</span>' : '<span class="q-note" title="No Master KPI for this trucking company">-</span>');
  const opts = [...new Set([...types, ...(r.payType ? [r.payType] : [])])];
  return `<select class="pt-sel ${cls}" data-pay="${r.id}" title="Payment Type: ${types.join(' / ')}">${r.payType ? '' : '<option value="">- Select -</option>'}${opts.map(v => `<option ${v === r.payType ? 'selected' : ''} ${types.includes(v) ? '' : 'disabled'}>${v}</option>`).join('')}</select>`;
}
function applyPayType(list, value) {
  const res = D.setPayType(list, value, { date: dc.date, kpiRows: KPI_ROWS, applicable: MK.applicable, at: new Date(), actor: state.actor });
  if (!res.ok) { toast(res.error); renderGrid(); return; }
  persist(); list.forEach(r => dc.flash.add(r.id)); renderGrid(); toast(`${res.count} record(s): Payment Type ${value}`);
}
const swCheck = r => D.switchCheck(r, DATA, W);
const drvStatus = r => { const o = r.status === S.PROCESSED ? orderFor(r) : null; return !o ? '-' : D.driverStarted(o, W) ? `Started (${o.status})` : `Not Started (${o.status})`; };

function openCreate(date) {
  const err = D.dateCheck(date, todayStr(), DTP_CFG);
  dc.date = date; cal.selected = date; cal.cursor = date;
  $('dtpCal').style.display = 'none'; $('dtpCreate').style.display = '';
  const ro = !isPlanner() || !!err;
  const roTag = ro ? ` <span class="ro-tag">${err ? 'date outside the DTP range' : 'VPLD Planner only'}</span>` : '';
  $('dtpCreate').innerHTML = `<section class="dc-card" style="position:relative">
    <div class="busy-mask" id="dcBusy"><span class="spin"></span><span id="dcBusyText"></span></div>
    <div class="dc-head">
      <span>&#128197; <span class="k">Daily Plan Date :</span> <b>${D.fmtDmy(date)}</b></span>
      <span><span class="k">DTP Model :</span> <b>${D.MODEL.label}</b></span>
      <span><span class="k">Operation Type :</span> <span class="seg" id="dcIo">${D.IO.map(v => `<button data-io="${v}" class="${dc.io === v ? 'on' : ''}" ${ro ? 'disabled' : ''}>${v[0] + v.slice(1).toLowerCase()}</button>`).join('')}</span></span>
      <span><span class="k">Planner :</span> <b>${esc(state.actor.name)}</b> <span class="k">(${esc(W.roleLabel(state.actor))})</span></span>
      <span class="spacer"></span>
      <div class="dd demo-dd" id="ddDemo"><button class="btn-light" style="height:28px">Demo &#9662;</button><div class="dd-menu">
        <label><input type="checkbox" data-demo="ipmsError" ${demo.ipmsError ? 'checked' : ''}> Simulate IPMS interface error</label>
        <label><input type="checkbox" data-demo="submitError" ${demo.submitError ? 'checked' : ''}> Simulate submission failure</label>
        <label><input type="checkbox" data-demo="swError" ${demo.swError ? 'checked' : ''}> Simulate DTP Switching failure (DB)</label>
        <label><input type="checkbox" data-demo="swRace" ${demo.swRace ? 'checked' : ''}> Driver starts during DTP Switching confirmation</label>
        <button data-demo-start>Driver starts the first assigned order</button>
        <button data-demo-reset>Reset DTP demo data</button></div></div>
    </div>
    ${ro ? `<div class="view-only ro-strong"><b>&#128274; ${esc(err || D.MSG.noAuth)}</b> Upload Excel, Manual Entry and Interface Data (IPMS) are locked; the data is shown read only.
      ${err ? '' : '<button class="btn-sm-blue" id="dcAsPlanner">Login sebagai Planner VPLD</button>'}</div>` : ''}
    <details class="acc ${ro ? 'acc-ro' : ''}" ${ro ? '' : 'open'}><summary>&#128196; Upload Excel${roTag}</summary><div class="body">
      <div style="font-weight:600;margin-bottom:6px">Filename</div>
      <div class="up-row"><input type="text" id="dcFileName" readonly placeholder="No file chosen"><button class="btn-dark" id="dcChoose">Choose File</button>
        <input type="file" id="dcFile" accept=".xlsx,.xls" hidden></div>
      <div style="margin-top:8px">*) <button class="link" id="dcTemplate">Download Template</button> <span class="q-note">· Operation Type of uploaded rows = ${'<b id="dcIoNote">' + dc.io + '</b>'} (header)</span></div></div></details>
    <details class="acc ${ro ? 'acc-ro' : ''}"><summary>&#128421; Manual Entry${roTag}</summary><div class="body"><form id="dcManual" onsubmit="return false">${manualForm({ io: dc.io, roundUse: 'N', truckType: 'TRAILER', arrDate: date })}</form>
      <div style="display:flex;gap:8px"><button class="btn-sm-blue" id="dcAdd">+ Add to Grid</button><button class="btn-outline" id="dcClearForm" style="height:27px">Clear</button></div></div></details>
    <details class="acc ${ro ? 'acc-ro' : ''}"><summary>&#128260; Interface Data (IPMS)${roTag}</summary><div class="body">
      <span id="dcIpmsInfo"></span> <button class="btn-sm-blue" id="dcIpms" style="margin-left:8px">Load / Refresh from IPMS</button></div></details>
    <details class="kpi-mon" id="dcKpiBox" ${dc.kpiOpen === false ? '' : 'open'}><summary>&#128202; DTP Creation vs Master KPI <span class="q-note" id="dcKpiSum"></span></summary><div id="dcKpi"></div></details>
    <div class="grid-bar">
      <label class="selall"><input type="checkbox" id="dcAll" ${ro ? 'disabled' : ''}><span><b>Select All</b><small id="dcSelCount">0 Selected</small></span></label>
      <button class="btn-del" id="dcDelete" ${ro ? 'disabled' : ''}>&#10005; Delete</button>
      <div class="dd" id="ddPay"><button class="btn-pay" id="dcPayBtn" ${ro ? 'disabled' : ''} title="Set the Payment Type of the selected records">&#9881; Payment Type <span style="font-size:8px">▼</span></button>
        <div class="dd-menu">${Object.values(D.PAY).map(v => `<button data-setpay="${v}">Set ${v}</button>`).join('')}</div></div>
      <button class="btn-switch" id="dcSwitch" disabled title="Rollback submitted DTP while the driver has not started">&#8644; DTP Switching</button>
      <span class="spacer"></span>
      <select id="dcFStatus" aria-label="Status filter"><option value="">All Status</option>${Object.values(S).map(s => `<option>${s}</option>`).join('')}</select>
      <select id="dcFSource" aria-label="Source filter"><option value="">All Sources</option>${Object.values(D.SOURCE).map(s => `<option>${s}</option>`).join('')}</select>
      <select id="dcFIo" aria-label="Import Export filter"><option value="">Import / Export</option>${D.IO.map(s => `<option>${s}</option>`).join('')}</select>
      <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="text" id="dcSearch" placeholder="Search" style="width:150px"></div>
      <div class="dd" id="ddDcCol"><button class="btn-blue"><svg width="15" height="13" viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="1" width="22" height="18" rx="2"/><path d="M5 6h14M5 10h14M5 14h14"/></svg>Kolom <span style="font-size:8px">▼</span></button>
        <div class="dd-menu" id="dcColMenu">${DCOLS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}" ${dc.hidden.has(k) ? '' : 'checked'}> ${l}</label>`).join('')}</div></div>
    </div>
    <div class="table-wrap"><table id="dtpTable"><thead id="dcHead"></thead><tbody id="dcBody"></tbody></table></div>
    <div class="table-foot" style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span id="dcInfo" class="q-note"></span>
      <span class="page-size">Show <select id="dcSize"><option>25</option><option>50</option><option>100</option></select> rows</span></div>
    <div class="pager" id="dcPager"></div>
    <div class="dc-foot"><button class="btn-outline" id="dcBack">&larr; Back</button><span class="spacer"></span>
      <span class="cnt" id="dcCnt"></span><button class="btn-outline" id="dcUnselect" ${ro ? 'disabled' : ''}>Cancel</button>
      <button class="btn-submit" id="dcSubmit" disabled>&#10003; Submit DTP</button></div>
  </section>`;
  $('dcSize').value = dc.size; $('dcFStatus').value = dc.fStatus; $('dcFSource').value = dc.fSource; $('dcFIo').value = dc.fIo; $('dcSearch').value = dc.q;
  bindCreate(ro); renderGrid();
}

// Manual entry / edit form
const lpOpts = () => DCTX.lps.map(c => [c, `${c} - ${NAMES.lp(c)}`]);
const fromOpts = () => Object.entries(LOC_FROM).map(([c, n]) => [c, `${c} - ${n}`]);
const toOpts = () => Object.entries(LOC_TO).map(([c, n]) => [c, `${c} - ${n}`]);
const FORM = [['io', 'Import/Export', 'select', true, () => D.IO.map(v => [v, v])], ['exporter', 'Exporter', 'text'], ['importerCd', 'Importer CD', 'text'],
  ['roundUse', 'Round Use', 'select', true, () => [['N', 'N'], ['Y', 'Y']]], ['lp', 'LP', 'select', true, lpOpts], ['payType', 'Payment Type', 'select', false, () => Object.values(D.PAY).map(v => [v, v])], ['renban', 'Renban', 'text', true],
  ['from', 'From Location', 'select', true, fromOpts], ['to', 'To Location', 'select', true, toOpts], ['dest', 'Destination', 'text', true],
  ['etd', 'ETD', 'date', true], ['ctrSize', 'Container Size', 'select', true, () => D.OPTIONS.ctrSize.map(v => [v, v])], ['agent', 'Shipping Agent', 'text'],
  ['bookNo', 'Ctr Booking No', 'text'], ['vessel', 'Vessel Name', 'text'], ['truckType', 'Truck Type', 'text', true], ['container', 'Container No', 'text'],
  ['shift', 'Shift', 'select', false, () => D.OPTIONS.shift.map(v => [v, v])], ['dg', 'Ctr DG Flag', 'select', false, () => [['DG', 'DG']]],
  ['arrDate', 'Arrival Date', 'date'], ['arrTime', 'Arrival Time', 'time'], ['description', 'Description', 'text']];
function manualForm(v = {}) {
  return `<div class="me-grid">${FORM.map(([k, l, t, req, opts]) => {
    const val = v[k] ?? '';
    const input = t === 'select' ? `<select name="${k}"><option value="">- Select -</option>${opts().map(([o, ol]) => `<option value="${esc(o)}" ${o === val ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select>`
      : `<input type="${t}" name="${k}" value="${esc(val)}" ${t === 'text' ? 'autocomplete="off"' : ''}>`;
    return `<div class="form-row" data-f="${k}"><label>${l}${req ? ' <span class="req">*</span>' : ''}</label>${input}</div>`;
  }).join('')}</div>`;
}

function busy(on, text) { $('dcBusy').classList.toggle('show', on); $('dcBusyText').textContent = text || ''; }
function bindCreate(ro) {
  $('dcBack').onclick = () => { location.hash = '#planning-order'; };
  document.querySelectorAll('#dtpCreate .dd > button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const dd = b.parentElement; document.querySelectorAll('.dd').forEach(x => x !== dd && x.classList.remove('open')); dd.classList.toggle('open'); }));
  document.querySelectorAll('#dtpCreate .dd-menu').forEach(m => m.addEventListener('click', e => e.stopPropagation()));
  $('ddDemo').addEventListener('change', e => { const k = e.target.dataset.demo; if (k) { demo[k] = e.target.checked; toast(`Demo: ${{ ipmsError: 'IPMS interface error', submitError: 'submission failure', swError: 'DTP Switching failure', swRace: 'driver starts during confirmation' }[k]} ${e.target.checked ? 'ON' : 'OFF'}`); } });
  $('ddDemo').querySelector('[data-demo-start]').onclick = () => { const r = dateRecs().find(x => x.status === S.PROCESSED && orderFor(x)?.truck && !D.driverStarted(orderFor(x), W)); toast(r ? driverStart(orderFor(r)) : 'No assigned order waiting for the driver on this date'); renderGrid(); };
  $('ddDemo').querySelector('[data-demo-reset]').onclick = () => { try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ } location.reload(); };
  $('dcColMenu').addEventListener('change', e => { const k = e.target.dataset.k; e.target.checked ? dc.hidden.delete(k) : dc.hidden.add(k); renderGrid(); });
  $('dcSearch').oninput = e => { dc.q = e.target.value; dc.page = 1; renderGrid(); };
  ['dcFStatus', 'dcFSource', 'dcFIo'].forEach(id => { $(id).onchange = e => { dc[{ dcFStatus: 'fStatus', dcFSource: 'fSource', dcFIo: 'fIo' }[id]] = e.target.value; dc.page = 1; renderGrid(); }; });
  $('dcSize').onchange = e => { dc.size = +e.target.value; dc.page = 1; renderGrid(); };
  $('dcPager').onclick = e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { dc.page = +b.dataset.p; renderGrid(); } };
  $('dcHead').onclick = e => { const th = e.target.closest('th[data-sort]'); if (!th) return; dc.dir = dc.sort === th.dataset.sort ? -dc.dir : 1; dc.sort = th.dataset.sort; renderGrid(); };
  $('dcBody').onclick = rowAction; $('dcBody').onchange = e => {
    const c = e.target.closest('[data-sel]'); if (c) toggleSel([RECS.find(r => r.id === +c.dataset.sel)], c.checked);
    const w = e.target.closest('[data-sw]'); if (w) { w.checked ? dc.sw.add(+w.dataset.sw) : dc.sw.delete(+w.dataset.sw); renderGrid(); }
  };
  $('dcSwitch').onclick = () => confirmSwitch(dateRecs().filter(r => dc.sw.has(r.id)));
  $('dcAll').onchange = e => toggleSel(gridRows().filter(D.selectable), e.target.checked);
  $('dcUnselect').onclick = () => { toggleSel(dateRecs().filter(r => r.status === S.READY), false); toast('Selection cleared'); };
  $('dcSubmit').onclick = confirmSubmit;
  if ($('dcAsPlanner')) $('dcAsPlanner').onclick = () => { $('roleSel').value = 'planner'; $('roleSel').dispatchEvent(new Event('change')); };
  $('dcKpiBox').addEventListener('toggle', e => { dc.kpiOpen = e.target.open; });
  if (ro) return;
  $('dcIo').onclick = e => { const b = e.target.closest('[data-io]'); if (!b) return; dc.io = b.dataset.io; $('dcIo').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('dcIoNote').textContent = dc.io; $('dcManual').querySelector('[name=io]').value = dc.io; };
  $('dcChoose').onclick = () => $('dcFile').click();
  $('dcFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) uploadFile(f); };
  $('dcTemplate').onclick = downloadTemplate;
  $('dcAdd').onclick = addManual;
  $('dcClearForm').onclick = () => { $('dcManual').innerHTML = manualForm({ io: dc.io, roundUse: 'N', truckType: 'TRAILER', arrDate: dc.date }); };
  $('dcIpms').onclick = loadIpms;
  $('dcDelete').onclick = deleteSelected;
  $('ddPay').querySelector('.dd-menu').addEventListener('click', e => { const b = e.target.closest('[data-setpay]'); if (!b) return; $('ddPay').classList.remove('open');
    const list = dateRecs().filter(r => r.status === S.READY); if (!list.length) { toast('Select records first'); return; }
    applyPayType(list, b.dataset.setpay); });
  $('dcBody').addEventListener('change', e => { const s = e.target.closest('[data-pay]'); if (!s) return; const r = RECS.find(x => x.id === +s.dataset.pay); if (r) applyPayType([r], s.value); });
}

const dateRecs = () => RECS.filter(r => r.date === dc.date);
function gridRows() {
  const q = dc.q.trim().toLowerCase();
  const rows = dateRecs().filter(r => (!dc.fStatus || r.status === dc.fStatus) && (!dc.fSource || r.source === dc.fSource) && (!dc.fIo || r.io === dc.fIo)
    && (!q || DCOLS.some(([k]) => String(r[k] ?? '').toLowerCase().includes(q))));
  const k = dc.sort;
  return rows.sort((a, b) => (a[k] ?? '') < (b[k] ?? '') ? -dc.dir : (a[k] ?? '') > (b[k] ?? '') ? dc.dir : 0);
}
const errText = r => Object.values(r.errors || {}).join('\n');
function renderGrid() {
  if (!$('dcBody')) return;
  const rows = gridRows(), pages = Math.max(1, Math.ceil(rows.length / dc.size));
  dc.page = Math.min(dc.page, pages);
  const start = (dc.page - 1) * dc.size, view = rows.slice(start, start + dc.size), cols = DCOLS.filter(([k]) => !dc.hidden.has(k));
  const ro = !isPlanner() || !!D.dateCheck(dc.date, todayStr(), DTP_CFG);
  $('dcHead').innerHTML = `<tr><th style="width:26px"></th><th>Options</th>${cols.map(([k, l]) => `<th data-sort="${k}">${l}${dc.sort === k ? ` <span class="arrow">${dc.dir === 1 ? '▲' : '▼'}</span>` : ''}</th>`).join('')}</tr>`;
  $('dcBody').innerHTML = view.length ? view.map(r => {
    const sel = D.selectable(r) && !ro, locked = D.LOCKED.includes(r.status);
    const cell = k => k === 'status' ? `<span class="st ${ST_CLS[r.status]}" title="${esc(r.status === S.ERROR ? errText(r) : r.status === S.FAILED ? r.failReason : r.history.at(-1)?.note || '')}">${r.status}</span>`
      : k === 'source' ? `<span class="src ${SRC_CLS[r.source]}">${r.source}</span>`
      : k === 'orderNo' ? (r.orderNo ? `<a class="doc-link" href="#" data-order="${r.orderNo}">${r.orderNo}</a>` : '-')
      : k === 'drv' ? (r.status === S.PROCESSED ? `<span class="drv ${/^Started/.test(drvStatus(r)) ? 'on' : ''}">${drvStatus(r)}</span>` : '-')
      : k === 'payType' ? payCell(r, ro)
      : k === 'etd' || k === 'arrDate' ? (r[k] ? D.fmtDmy(r[k]) : '-') : esc(r[k] || '-');
    const swE = swCheck(r), canSw = !ro && !swE, swTip = swE ? (swE.code === 'NOT_SUBMITTED' ? '' : swE.msg) : 'Select for DTP Switching (rollback)';
    return `<tr class="${r.status === S.ERROR ? 'err' : r.status === S.READY ? 'ready' : sel ? '' : 'nosel'} ${dc.flash.has(r.id) ? 'flash' : ''}">
      <td>${D.SWITCHABLE.includes(r.status) || r.status === S.PROCESSING
        ? `<input type="checkbox" class="sw-chk" data-sw="${r.id}" ${canSw ? '' : 'disabled'} ${dc.sw.has(r.id) ? 'checked' : ''} aria-label="Select record ${r.id} for DTP Switching" title="${esc(swTip)}">`
        : `<input type="checkbox" data-sel="${r.id}" ${sel ? '' : 'disabled'} ${r.status === S.READY ? 'checked' : ''} aria-label="Select record ${r.id}" title="${sel ? '' : r.status === S.ERROR ? 'Fix the validation error first' : ''}">`}</td>
      <td><div class="opt"><button data-edit="${r.id}" title="Edit" ${ro || locked ? 'disabled' : ''}>&#9998;</button><button class="del" data-del="${r.id}" title="Delete" ${ro || locked || r.source === D.SOURCE.IPMS ? 'disabled' : ''}>&#128465;</button>
        <button data-retry="${r.id}" title="Retry" ${!ro && D.canRetry(r) ? '' : 'disabled'}>&#8635;</button><button data-hist="${r.id}" title="History">&#9432;</button>
        <button class="swb" data-switch="${r.id}" title="${canSw ? 'DTP Switching (rollback)' : esc(swE?.code === 'NOT_SUBMITTED' ? 'DTP Switching: only for submitted DTP' : swE?.msg || '')}" ${canSw ? '' : 'disabled'}>&#8644;</button></div></td>
      ${cols.map(([k]) => `<td>${cell(k)}</td>`).join('')}</tr>`;
  }).join('') : `<tr><td colspan="${cols.length + 2}" class="empty">No data available in table</td></tr>`;
  dc.flash.clear();
  [...dc.sw].forEach(id => { const x = RECS.find(r => r.id === id); if (!x || ro || swCheck(x)) dc.sw.delete(id); });
  $('dcSwitch').disabled = ro || !dc.sw.size;
  $('dcSwitch').innerHTML = `&#8644; DTP Switching${dc.sw.size ? ` (${dc.sw.size})` : ''}`;
  const all = dateRecs(), ready = all.filter(r => r.status === S.READY), elig = rows.filter(D.selectable);
  $('dcInfo').textContent = rows.length ? `Showing ${start + 1} to ${start + view.length} of ${rows.length} records` + (rows.length !== all.length ? ` (filtered from ${all.length})` : '') : 'Showing no records';
  $('dcSelCount').textContent = `${ready.length} Selected`;
  $('dcAll').checked = !!elig.length && elig.every(r => r.status === S.READY); $('dcAll').disabled = ro || !elig.length;
  $('dcCnt').innerHTML = `<b>${ready.length}</b> record(s) selected · ${all.filter(r => r.status === S.ERROR).length} validation error · ${all.filter(r => [S.SUBMITTED, S.QUEUED, S.PROCESSING].includes(r.status)).length} in queue · ${all.filter(r => r.status === S.PROCESSED).length} processed${dc.sw.size ? ` · <b>${dc.sw.size}</b> selected for DTP Switching` : ''}`;
  $('dcSubmit').disabled = ro || !ready.length;
  $('dcSubmit').innerHTML = `&#10003; Submit DTP${ready.length ? ` (${ready.length})` : ''}`;
  $('dcDelete').disabled = ro || !ready.some(r => r.source !== D.SOURCE.IPMS);
  $('dcPayBtn').disabled = ro || !ready.length; $('dcPayBtn').innerHTML = `&#9881; Payment Type${ready.length ? ` (${ready.length})` : ''} <span style="font-size:8px">▼</span>`;
  $('dcPager').innerHTML = pagerFor(dc.page, pages);
  renderKpi();
  const ipmsN = all.filter(r => r.source === D.SOURCE.IPMS).length;
  if ($('dcIpmsInfo')) $('dcIpmsInfo').innerHTML = `Records received from IPMS for ${D.fmtDmy(dc.date)}: <b>${ipmsN}</b>${PULLED[dc.date] ? '' : ' (not loaded yet)'}`;
}
// DTP Creation vs Master KPI (KM-01 .. KM-08): recalculated from the DTP records on every grid change
function renderKpi() {
  if (!$('dcKpi')) return;
  const m = kpiMon(), t = m.trip, name = c => `${c} - ${NAMES.lp(c)}`;
  const badge = r => r.kpi === 'NONE' ? '<span class="st sb">No Master KPI</span>' : r.kpi === 'NOT_BY_RESOURCE' ? `<span class="st sb">Not By Resources</span>`
    : r.kpi === 'BY_TRIP' ? '<span class="st rd">By Trip only</span>'
    : r.over ? `<span class="st fl">Over Allocation +${r.over}</span>` : r.level === 'full' ? `<span class="st fl">Full</span>${r.trip ? ' <span class="st rd" title="Further trips go by trip">→ By Trip</span>' : ''}` : r.level === 'warn' ? '<span class="st qu">Near Limit</span>' : '<span class="st av">Available</span>';
  const bar = r => r.kpi !== 'OK' ? '-' : `<div class="kbar ${r.level}"><i style="width:${Math.min(100, r.usage ?? 100)}%"></i></div><b>${r.usage == null ? '-' : r.usage + '%'}</b>`;
  const resRows = m.rows.filter(r => r.kpi !== 'BY_TRIP');
  const tBadge = r => r.over ? `<span class="st fl">Over Limit +${r.over}</span>` : r.level === 'full' ? '<span class="st fl">Full</span>' : r.level === 'warn' ? '<span class="st qu">Near Limit</span>' : '<span class="st av">Available</span>';
  const tBar = r => `<div class="kbar ${r.level}"><i style="width:${Math.min(100, r.usage ?? 100)}%"></i></div><b>${r.usage == null ? '-' : r.usage + '%'}</b>`;
  const tripTbl = !t.rows.length ? '' : `<h5 class="kpi-sub">By Trip <small>trips per day <b>${t.dailyTrips}</b> shared by Order Sharing % (1 trip per company first, the rest by %) · counts the DTP with Payment Type By Trip chosen by the planner</small></h5>
    ${t.sumOk ? '' : `<div class="kpi-warn">${esc(MK.MSG.pctSum(t.sumPct))} Check Master KPI.</div>`}
    <table class="kpi-tbl kpi-trip"><tr><th>Trucking Company</th><th>Order Sharing<small>%</small></th><th>Daily Trip<small>limit per day</small></th><th>Trips by trip<small>today</small></th><th class="rem">Remaining Trip</th><th>Usage</th><th>Status</th><th>Selected<small>not submitted</small></th><th>After Submit</th></tr>
    ${t.rows.map(r => `<tr class="lv-${r.level}"><td class="left">${esc(name(r.lp))}</td><td>${r.pct.toFixed(2)}%</td><td>${r.limit}</td><td>${r.trips}</td>
      <td class="rem"><b>${r.remaining}</b>${r.over ? `<small class="over">over ${r.over}</small>` : ''}</td><td class="u">${tBar(r)}</td><td>${tBadge(r)}</td><td>${r.selected || '-'}</td>
      <td>${r.selected ? `${r.after} / ${r.limit}${r.afterOver ? ` <small class="over">exceeds by ${r.afterOver}</small>` : ''}` : '-'}</td></tr>`).join('')}
    <tr class="tot"><td class="left">Total By Trip</td><td>${t.sumPct.toFixed(2)}%</td><td>${t.limit}</td><td>${t.trips}</td><td class="rem"><b>${t.remaining}</b></td><td></td><td>${t.over ? `<span class="st fl">Over +${t.over}</span>` : ''}</td><td>${t.after - t.trips || '-'}</td><td></td></tr></table>`;
  $('dcKpi').innerHTML = `<h5 class="kpi-sub">By Resources <small>DTP with Payment Type By Resources · Daily Trip typed in Master KPI (Order Sharing % is information only)</small></h5>
    <table class="kpi-tbl"><tr><th>Trucking Company</th><th>Order Sharing<small>%</small></th><th>Daily Trip<small>limit per day</small></th><th>Assigned DTP<small>by resource</small></th><th class="rem">Remaining Slot</th><th>Usage</th><th>Status</th><th>Selected<small>not submitted</small></th><th>After Submit</th><th>Rejected by LP<small>not counted</small></th></tr>
    ${resRows.map(r => `<tr class="lv-${r.level}"><td class="left">${esc(name(r.lp))}${r.tripAssigned ? `<small>total ${r.total} = ${r.assigned} by resource + ${r.tripAssigned} by trip</small>` : ''}</td><td>${r.pct != null ? r.pct.toFixed(2) + '%' : '-'}</td><td>${r.limit ?? '-'}</td><td>${r.assigned}</td>
      <td class="rem"><b>${r.kpi === 'OK' ? r.remaining : '-'}</b>${r.over ? `<small class="over">over ${r.over}</small>` : ''}</td><td class="u">${bar(r)}</td><td>${badge(r)}</td>
      <td>${r.selected || '-'}</td><td>${r.selected ? `${r.after}${r.kpi === 'OK' ? ` / ${r.limit}` : ''}${r.afterOver ? ` <small class="over">exceeds by ${r.afterOver}</small>` : ''}${r.tripAfter > r.tripAssigned ? ` <small>+${r.tripAfter - r.tripAssigned} by trip</small>` : ''}` : '-'}</td><td>${r.rejected || '-'}</td></tr>`).join('')}
    <tr class="tot"><td class="left">Total By Resources${m.total.noKpiAssigned ? `<small>+ ${m.total.noKpiAssigned} assigned without Master KPI</small>` : ''}</td><td>${MK.totalPct(KPI_ROWS, MK.PAYMENT_BY_RESOURCE).toFixed(2)}%</td><td>${m.total.limit}</td><td>${m.total.assigned}</td><td class="rem"><b>${m.total.remaining}</b></td><td></td><td>${m.total.over ? `<span class="st fl">Over +${m.total.over}</span>` : ''}</td><td>${m.total.selected || '-'}</td><td></td><td></td></tr></table>
    ${tripTbl}
    <p class="q-note kpi-note">Date ${D.fmtDmy(dc.date)} · Assigned = DTP records submitted to the trucking company (Submitted, Queued, Processing, Processed, Failed; rolled back and LP-rejected records do not count) · By Resources: Daily Trip typed, Remaining = Daily Trip - Assigned, yellow from ${D.KPI_WARN}% usage · By Trip: Daily Trip = trips per day shared by Order Sharing %, Remaining = Daily Trip - Trips by trip · Not blocking (no limit rule in DTP Creation).</p>`;
  const full = m.rows.filter(r => r.kpi === 'OK' && r.level === 'full').length, none = m.rows.filter(r => (r.kpi === 'NONE' || r.kpi === 'NOT_BY_RESOURCE') && r.assigned + r.selected + r.open > 0).length;
  $('dcKpiSum').textContent = `· ${D.fmtDmy(dc.date)} · remaining ${m.total.remaining} of ${m.total.limit}${full ? ` · ${full} full` : ''}${m.total.over ? ` · over allocation ${m.total.over}` : ''}${t.rows.length ? ` · by trip ${t.trips} of ${t.limit}` : ''}${none ? ` · ${none} without Master KPI` : ''}`;
}
function pagerFor(page, pages) {
  let h = `<button data-p="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= pages; p++) h += `<button data-p="${p}" class="${p === page ? 'cur' : ''}">${p}</button>`;
  return h + `<button data-p="${page + 1}" ${page === pages ? 'disabled' : ''}>›</button>`;
}
function toggleSel(list, on) {
  list.filter(Boolean).forEach(r => { if (D.selectable(r)) r.status = on ? S.READY : S.AVAILABLE; });
  persist(); renderGrid();
}

// Row options
function rowAction(e) {
  const o = e.target.closest('[data-order]');
  if (o) { e.preventDefault(); return openDetail(o.dataset.order); }
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const r = RECS.find(x => x.id === +(b.dataset.edit ?? b.dataset.del ?? b.dataset.retry ?? b.dataset.hist ?? b.dataset.switch));
  if (b.dataset.switch) return confirmSwitch([r]);
  if (b.dataset.hist) showPreview(`Record ${r.id} · ${r.container || r.bookNo || r.renban}`, `<div class="err-scroll"><table class="err-table"><tr><th>Time</th><th>Status</th><th>Note</th></tr>
    ${r.history.slice().reverse().map(h => `<tr><td style="white-space:nowrap">${fmtDT(new Date(h.at))}</td><td>${h.status}</td><td>${esc(h.note)}</td></tr>`).join('')}</table></div>
    ${Object.keys(r.errors || {}).length ? `<p class="q-note" style="color:#b91c1c;margin-top:10px">${esc(errText(r)).replace(/\n/g, '<br>')}</p>` : ''}`, '<button class="btn-outline" id="hClose">Close</button>');
  if (b.dataset.hist) { $('hClose').onclick = closePreview; return; }
  if (b.dataset.retry) { D.step(r, S.QUEUED, new Date(), 'Retry by planner'); persist(); enqueue([r]); renderGrid(); return toast(`Record ${r.id} sent to the processing queue again`); }
  if (b.dataset.del) {
    showPreview('Delete record', `<p style="font-size:11px;margin:0">Delete record <b>${esc(r.container || r.bookNo || r.renban)}</b> (${r.source}) from the grid?</p>`,
      '<button class="btn-outline" id="dNo">Batal</button><button class="btn-del" id="dYes">Delete</button>');
    $('dNo').onclick = closePreview;
    $('dYes').onclick = () => { RECS.splice(RECS.indexOf(r), 1); persist(); closePreview(); renderGrid(); toast('Record deleted'); };
    return;
  }
  // Edit (also used to correct records with Validation Error)
  showPreview(`Edit record ${r.id} · ${r.source}`, `<form id="edForm" onsubmit="return false">${manualForm(r)}</form>
    ${Object.keys(r.errors || {}).length ? `<div class="form-alert">${esc(errText(r)).replace(/\n/g, '<br>')}</div>` : ''}`,
    '<button class="btn-outline" id="edNo">Batal</button><button class="btn-sm-blue" style="height:30px" id="edYes">Save</button>');
  $('pvBody').closest('.pv').style.width = '980px';
  $('edNo').onclick = () => { closePreview(); $('pvBody').closest('.pv').style.width = ''; };
  $('edYes').onclick = () => {
    const form = readForm($('edForm')), types = payTypes(form.lp, r.date);
    if (form.payType && types.length && !types.includes(form.payType)) return showErrors($('edForm'), { payType: `${form.lp} has no ${form.payType} in Master KPI (${types.join(' / ')})` });
    const res = D.revalidate(r, form, RECS, DCTX);
    if (!res.ok) return showErrors($('edForm'), res.errors || { _: res.error });
    r.payType = form.payType && types.includes(form.payType) ? form.payType : types.includes(r.payType) ? r.payType : D.suggestPayType(r.lp, r.date, RECS, KPI_ROWS, MK.applicable, r);
    r.history.push({ at: new Date(), status: r.status, note: `Edited by ${state.actor.name}` });
    persist(); closePreview(); $('pvBody').closest('.pv').style.width = ''; dc.flash.add(r.id); renderGrid(); toast('Record validated and saved');
  };
}

// Manual entry: same validations as upload / interface; only valid records are added
function addManual() {
  const box = $('dcManual'), raw = readForm(box), v = D.validate(raw, DCTX), dup = D.duplicates([v.record], dateRecs().concat(RECS.filter(r => r.date !== dc.date)))[0];
  const types = payTypes(raw.lp, dc.date);
  const errors = { ...v.errors, ...(dup ? { _: dup } : {}), ...(raw.payType && raw.lp && types.length && !types.includes(raw.payType) ? { payType: `${raw.lp} has no ${raw.payType} in Master KPI (${types.join(' / ')})` } : {}) };
  showErrors(box, errors);
  if (Object.keys(errors).length) { toast(Object.values(errors)[0]); return; }
  const r = addRecord(raw, dc.date, D.SOURCE.MANUAL); dc.flash.add(r.id);
  persist(); renderGrid(); toast(`Manual record added (${r.status})`);
  $('dcManual').innerHTML = manualForm({ io: dc.io, roundUse: 'N', truckType: 'TRAILER', arrDate: dc.date });
}

// IPMS interface
function loadIpms() {
  busy(true, 'Receiving data from IPMS interface...');
  setTimeout(() => {
    busy(false);
    if (demo.ipmsError) { showPreview('Interface error', `<div class="form-alert">IPMS interface is not responding (simulated). No record was received. Please try again later.</div>`, '<button class="btn-outline" id="bClose">Close</button>'); $('bClose').onclick = closePreview; return; }
    const n = pullIpms(dc.date); persist(); renderGrid();
    toast(n ? `${n} record(s) received from IPMS` : 'No new data from IPMS');
  }, 900);
}

// Excel upload: validated before anything is added
function uploadFile(f) {
  $('dcFileName').value = f.name;
  if (!/\.(xlsx|xls)$/i.test(f.name)) { toast(D.MSG.fileType); return showUploadError({ error: D.MSG.fileType, rowErrors: [] }, f.name); }
  busy(true, 'Validating Excel file...');
  const reader = new FileReader();
  reader.onload = () => {
    let res;
    try {
      const wb = XLSX.read(new Uint8Array(reader.result), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames.find(n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1 }).some(r => r.some(c => /ROUNDUSE/i.test(String(c))))) || wb.SheetNames[0]];
      res = D.upload(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }), { io: dc.io, grid: RECS, ctx: DCTX });
    } catch (e) { res = { ok: false, error: D.MSG.fileType, rowErrors: [] }; }
    setTimeout(() => {
      busy(false);
      if (!res.ok) { toast(res.error); return showUploadError(res, f.name); }
      res.records.forEach(raw => dc.flash.add(addRecord(raw, dc.date, D.SOURCE.EXCEL).id));
      persist(); renderGrid(); toast(`${res.message} (${f.name})`);
    }, 500);
  };
  reader.readAsArrayBuffer(f);
}
function showUploadError(res, name) {
  showPreview('Upload validation failed', `<div class="form-alert">${esc(res.error)}</div><p class="q-note" style="margin:0 0 6px">File: ${esc(name)}</p>
    ${res.rowErrors?.length ? `<div class="err-scroll"><table class="err-table"><tr><th>Row</th><th>Column</th><th>Error</th></tr>${res.rowErrors.map(e => `<tr><td>${e.row}</td><td>${esc(e.column)}</td><td>${esc(e.message)}</td></tr>`).join('')}</table></div>` : ''}`,
    `${res.rowErrors?.length ? '<button class="btn-outline" id="ueCsv">Download error list</button>' : ''}<button class="btn-sm-blue" style="height:30px" id="ueOk">Close and correct the file</button>`);
  $('ueOk').onclick = closePreview;
  if ($('ueCsv')) $('ueCsv').onclick = () => {
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [['Row', 'Column', 'Error'], ...res.rowErrors.map(e => [e.row, e.column, e.message])].map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }));
    a.download = `${name.replace(/\.\w+$/, '')}_errors.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
}
function downloadTemplate() {
  const head = ['No', 'ROUNDUSE *', 'LP*', 'RENBAN*', 'FROM LOCATION*', 'TO LOCATION *', 'DESTINATION *', 'ETD *', 'CONTAINER SIZE *', 'SHIPPING AGENT', 'CTR BOOKING NO',
    'VESSEL NAME', 'TRUCK TYPE *', 'CONTAINER NO', 'DESCRIPTION', 'SHIFT ', 'CTR DG FLAG', 'ARRIVAL DATE', 'ARRIVAL TIME'];
  const ex = (n, size, book, dg) => [n, 'N', DCTX.lps[1], 'C1244', 'D1', 'K1E', 'STM', D.addDays(dc.date, 1), size, 'CMA', book, 'CMA', 'TRAILER', '', '', 'DAY', dg, dc.date, '08:00'];
  const ws = XLSX.utils.aoa_to_sheet([[null, null, ' PT. TOYOTA  MOTOR  MANUFACTURING  INDONESIA'], [null, null, 'LOGISTIC PLANNING DIVISION'], [null, null, 'EXTERNAL LOGISTIC OPERATION'],
    [null, null, 'LOGISTIC & CY MANAGEMENT'], [null, null, 'DAILY TRUCKING PLAN - UNIVERSAL DTP'], [], head, ex(1, '40 HC', '89902678188223993', 'DG'), ex(2, '40', '89902678188223991', '')]);
  ws['!cols'] = head.map(() => ({ wch: 16 }));
  const map = XLSX.utils.aoa_to_sheet([[], ['LOGISTIC PARTNER', null, null, 'FROM LOCATION'], [], ['LOGISTIC PARTNER (LP)', 'LP CODE', null, 'LOCATION NAME (LOC)', 'LOC CODE'],
    ...Array.from({ length: Math.max(DCTX.lps.length, 3) }, (_, i) => [DCTX.lps[i] ? NAMES.lp(DCTX.lps[i]) : null, DCTX.lps[i] || null, null, Object.values(LOC_FROM)[i] || null, Object.keys(LOC_FROM)[i] || null]),
    [], [null, null, null, 'TO LOCATION'], [null, null, null, 'LOCATION NAME (LOC)', 'LOC CODE'], ...Object.entries(LOC_TO).map(([c, n]) => [null, null, null, n, c])]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Format DTP'); XLSX.utils.book_append_sheet(wb, map, 'DATA MAPPING');
  XLSX.writeFile(wb, 'Format_DTP_Universal.xlsx');
  toast('Format_DTP_Universal.xlsx downloaded');
}

function deleteSelected() {
  const list = dateRecs().filter(r => r.status === S.READY && r.source !== D.SOURCE.IPMS);
  if (!list.length) { toast('Select Excel / Manual records to delete (IPMS records cannot be deleted)'); return; }
  showPreview('Delete records', `<p style="font-size:11px;margin:0">Delete ${list.length} selected record(s) from the grid? IPMS interface records are kept.</p>`,
    '<button class="btn-outline" id="dNo">Batal</button><button class="btn-del" id="dYes">Delete</button>');
  $('dNo').onclick = closePreview;
  $('dYes').onclick = () => { list.forEach(r => RECS.splice(RECS.indexOf(r), 1)); persist(); closePreview(); renderGrid(); toast(`${list.length} record(s) deleted`); };
}

// Submission: confirmation, then the records leave the selectable set and go to the queue
function confirmSubmit() {
  const list = dateRecs().filter(r => r.status === S.READY);
  if (!list.length) { toast(D.MSG.noSelect); return; }
  const issues = D.payIssues(list, dc.date, KPI_ROWS, MK.applicable);
  if (issues.length) {
    showPreview('Payment Type required', `<div class="form-alert">Select a valid Payment Type (By Resources / By Trip) for ${issues.length} record(s) before submitting.</div>
      <div class="err-scroll"><table class="err-table"><tr><th>Record</th><th>Reason</th></tr>${issues.map(i => `<tr><td>${i.id}</td><td>${esc(i.msg)}</td></tr>`).join('')}</table></div>`, '<button class="btn-outline" id="piOk">Close</button>');
    $('piOk').onclick = closePreview; return;
  }
  const byRes = list.filter(r => r.payType === D.PAY.RES).length, byTrip = list.filter(r => r.payType === D.PAY.TRIP).length;
  showPreview('Submit DTP', `<p style="font-size:12px;margin:0 0 10px"><b>${esc(D.MSG.confirm(list.length, D.fmtLong(dc.date)).split('?')[0])}?</b></p>
    <p class="q-note" style="margin:0 0 8px">Planning date: <b>${D.fmtLong(dc.date)}</b> · DTP Model: ${D.MODEL.label} · Deliveries: <b>${list.length}</b>
      (Import ${list.filter(r => r.io === 'IMPORT').length}, Export ${list.filter(r => r.io === 'EXPORT').length}) · Payment Type: By Resources <b>${byRes}</b>, By Trip <b>${byTrip}</b>${list.length - byRes - byTrip ? `, none ${list.length - byRes - byTrip}` : ''}</p>
    <div class="form-alert" style="background:#fff7e6;border-color:#fcd9a3;color:#92400e">Submitted records cannot be submitted again.</div>
    ${(() => { const ex = kpiMon().rows.filter(r => r.selected && (r.afterOver || r.kpi !== 'OK')); return ex.length ? `<div class="form-alert">Master KPI check (not blocking): ${ex.map(r => r.kpi !== 'OK' ? `${esc(r.lp)} has no Master KPI Order Sharing` : `${esc(r.lp)} ${r.after} / ${r.limit} exceeds by ${r.afterOver}`).join(' · ')}</div>` : ''; })()}`,
    '<button class="btn-outline" id="sNo">Cancel</button><button class="btn-submit" id="sYes">Confirm Submit</button>');
  $('sNo').onclick = closePreview;
  $('sYes').onclick = () => {
    $('sYes').disabled = true; closePreview(); busy(true, `Submitting ${list.length} record(s)...`);
    setTimeout(() => {
      busy(false);
      if (demo.submitError) {
        showPreview('Submission failed', '<div class="form-alert">Submission failed: the server did not respond (simulated). No record was submitted; they stay selected so you can submit again.</div>', '<button class="btn-outline" id="sfOk">Close</button>');
        $('sfOk').onclick = closePreview; return;
      }
      const res = D.submit(list, { at: new Date(), actor: state.actor, date: dc.date, today: todayStr(), cfg: DTP_CFG });
      if (!res.ok) { toast(res.error); renderGrid(); return; }
      persist(); renderGrid(); toast(res.message); enqueue(list);
    }, 700);
  };
}

route();

// ---------- DTP Switching: rollback of submitted DTP while the driver has not started (docs/uiss/02_Planning_Order_DTP/dtp-switching-spec.md) ----------
function driverStart(o) {
  const d = MASTER.drivers.find(x => x.truck === o.truck && x.active);
  if (!d) return `No active driver registered on truck ${o.truck}`;
  // Demo of the Driver APK event "Jalankan" (Start Order); another active order of the truck in the seed data is ignored here
  const at = new Date(), res = W.perform(o, 'startOrder', {}, driverActor(d), at, CTX);
  if (!res.ok) {
    W.ACTIONS.startOrder.apply(o, {}, driverActor(d), at);
    o.history.push({ at, actor: d.name, role: 'Driver', action: 'Start Order', from: 'Order Release / DTP Creation Release', to: 'Start Daily Order / Start Cycle', reason: '', note: 'Demo: driver started (Driver APK)', plateFrom: o.truck, plateTo: o.truck, lpFrom: '', lpTo: '' });
  }
  return `Driver ${d.name} started order ${o.orderNo}`;
}
function confirmSwitch(list) {
  if (!list.length) { toast(D.MSG.swNoSelect); return; }
  // 1-2. latest status and driver status are checked before the confirmation
  const bad = list.map(r => ({ r, e: swCheck(r) })).filter(x => x.e);
  if (bad.length) { swResult({ ok: false, status: 409, error: D.MSG.swFailed(bad.length), failed: bad.map(({ r, e }) => ({ id: r.id, key: r.container || r.bookNo || `Record ${r.id}`, status: r.status, code: e.code, msg: e.msg })) }); renderGrid(); return; }
  const row = r => { const o = orderFor(r); return `<tr><td>${r.id}</td><td>${esc(r.container || r.bookNo || r.renban)}</td><td>${r.lp}</td><td>${r.status}</td><td>${r.orderNo || '-'}</td>
    <td>${o ? `${o.status}${o.truck ? ` · ${o.truck}` : ''}` : '-'}</td><td>${r.status === S.PROCESSED ? 'Daily order cancelled' : 'Removed from queue'}</td></tr>`; };
  showPreview('Confirm DTP Switching', `<p style="font-size:12px;margin:0 0 10px"><b>${esc(D.MSG.swConfirm)}</b></p>
    <div class="err-scroll"><table class="err-table"><tr><th>Record</th><th>Container / Booking</th><th>LP</th><th>DTP Status</th><th>Order No</th><th>Order / Truck</th><th>Rollback effect</th></tr>${list.map(row).join('')}</table></div>
    <div class="form-alert" style="background:#fff7e6;border-color:#fcd9a3;color:#92400e;margin-top:10px">After rollback the record is <b>Available</b> again (edit and submit through the normal DTP Creation flow). Processed records: the Daily order is cancelled for the LP Admin and the truck / driver assignment is released. History is kept.</div>`,
    '<button class="btn-outline" id="swNo">Cancel</button><button class="btn-del" id="swYes">Confirm Rollback</button>');
  $('pvBody').closest('.pv').style.width = '860px';
  $('swNo').onclick = () => { closePreview(); $('pvBody').closest('.pv').style.width = ''; };
  $('swYes').onclick = () => {
    $('swYes').disabled = true; closePreview(); $('pvBody').closest('.pv').style.width = ''; busy(true, `Rolling back ${list.length} DTP record(s)...`);
    setTimeout(() => {
      busy(false);
      if (demo.swRace) { const r = list.find(x => x.status === S.PROCESSED && orderFor(x)?.truck); if (r) driverStart(orderFor(r)); }
      // 3-6. backend re-check and rollback (one transaction): queue entry / Daily order removed, record back to Available
      const res = D.switchBack(list, { at: new Date(), actor: state.actor, orders: DATA, W, grid: RECS, vctx: DCTX, fail: demo.swError,
        dequeue: id => { const i = QUEUE.indexOf(id); if (i >= 0) QUEUE.splice(i, 1); },
        removeOrder: o => { DATA.splice(DATA.indexOf(o), 1); } });
      if (res.ok) { dc.sw.clear(); list.forEach(r => dc.flash.add(r.id)); persist(); refreshAll(); window.render?.(); }
      swResult(res); renderGrid();
    }, 600);
  };
}
function swResult(res) {
  if (res.ok) { toast(`${res.message} (${res.count} record(s))`); return; }
  showPreview(res.status === 500 ? 'DTP Switching failed' : 'DTP Switching not possible', `<div class="form-alert">${esc(res.error)}</div>
    ${res.failed ? `<div class="err-scroll"><table class="err-table"><tr><th>Record</th><th>Container / Booking</th><th>Status</th><th>Reason</th></tr>${res.failed.map(f => `<tr><td>${f.id}</td><td>${esc(f.key)}</td><td>${f.status}</td><td>${esc(f.msg)}</td></tr>`).join('')}</table></div>` : ''}`,
    '<button class="btn-outline" id="swOk">Close</button>');
  $('swOk').onclick = closePreview;
}
