// ELIPS Planning Truck Assignment (Daily > Planning Truck Assignment): the LP Admin accepts / rejects the orders sent by the
// VPLD Planner (DTP Creation) and assigns or changes the truck. Rules live in workflow.js (lpAccept, lpReject, lpAssign, lpChangeTruck).
const LS = W.LP_STATUS, AS = W.ASSIGN_STATUS;
const DTP_NAMES = { DTP1: 'Import', DTP2: 'Fulfilment Vanning', DTP3: 'Free from/to', DTP4: 'Service Periode', Universal: 'Import/Export' };
const typeLabel = t => `(${t === 'Universal' ? 'Universal' : t.replace('DTP', 'DTP ')}) ${DTP_NAMES[t] || ''}`;
const LS_CLS = { [LS.WAIT]: 'qu', [LS.ACC]: 'rd', [LS.REJ]: 'fl' };
const AS_CLS = { [AS.NONE]: 'sb', [AS.WAIT]: 'qu', [AS.DONE]: 'av' };
const isLpAdmin = () => state.actor.role === 'SUPPLIER' && state.actor.lpAdmin;
const visible = () => DATA.filter(o => W.canView(state.actor, o));
const truckOf = plate => MASTER.trucks.find(t => t.plate === plate);
const fmtD = d => d.split('-').reverse().join('/');
const routeOf = o => ({ from: o.dtp?.fromCd ? `${o.dtp.fromCd} - ${o.from}` : o.from, to: o.dtp?.toCd ? `${o.dtp.toCd} - ${o.to}` : o.to });

// ---------- Sample orders sent by the VPLD Planner (DTP Creation) for the LP Admin demo ----------
(() => {
  const t = W.ymd(new Date()), t1 = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return W.ymd(d); })();
  const planner = { role: 'PLANNER', name: 'Planner VPLD' }, at = new Date(Date.now() - 3 * 3600000);
  const r = rng(hash('TA' + t)), pick = a => a[Math.floor(r() * a.length)];
  const mk = (sup, date, shift) => {
    const c10 = pick(['TCNU', 'MSKU', 'ONEU']) + String(Math.floor(r() * 1e6)).padStart(6, '0');
    const [fromCd, from] = pick([['A1', 'Port Area Priok'], ['D3', 'Depo Cakung Marunda']]), [toCd, to] = pick([['K1E', '(Empty) CY TMMIN Karawang'], ['S1E', '(Empty) CY TMMIN Sunter 1'], ['X10E', 'Warehouse Cikarang']]);
    const o = W.newOrder({ date, type: 'Universal', supplier: SUPPLIERS.find(s => s[1] === sup)[0], from, to, renban: `C${1300 + Math.floor(r() * 90)}`, shift, planned: 1 },
      planner, at, genOrderNo(date), 'DTP Creation (Universal DTP)', 'Processed from the DTP queue');
    o.dtp = { io: pick(['IMPORT', 'EXPORT']), agent: pick(['ONE', 'SITC', 'CMA']), vessel: pick(['NAGOYA TOWER', 'SITC SHIDAO', 'SITC NANSHA']), bookNo: pick(['', `ONEYBUEG${Math.floor(r() * 1e8)}`]),
      ctrSize: pick(['40', '40', '20']), truckType: 'TRAILER', container: c10 + W.containerCheckDigit(c10), fromCd, toCd, dest: pick(['STM', 'LCB', 'MNL']) };
    DATA.push(o); return o;
  };
  const act = (o, key, p = {}) => W.perform(o, key, p, { role: 'SUPPLIER', lpAdmin: true, supplier: o.supplier, name: `LP Admin ${SUPPLIERS.find(s => s[0] === o.supplier)[1]}` }, at, CTX);
  const freeTruck = o => MASTER.trucks.find(x => W.truckState(x, o, CTX).ok)?.plate;
  // PBM: waiting, accepted, assigned, rejected; SRL: waiting and assigned
  const p = [mk('PBM', t, 'DAY'), mk('PBM', t, 'DAY'), mk('PBM', t, 'DAY'), mk('PBM', t, 'NIGHT'), mk('PBM', t, 'DAY'), mk('PBM', t1, 'DAY'), mk('PBM', t1, 'NIGHT')];
  act(p[2], 'lpAccept'); [p[3], p[4]].forEach(o => { act(o, 'lpAccept'); act(o, 'lpAssign', { truck: freeTruck(o) }); });
  act(p[5], 'lpReject', { reason: 'Truck tidak tersedia untuk tanggal ini' });
  const s = [mk('SRL', t, 'DAY'), mk('SRL', t, 'DAY'), mk('SRL', t1, 'NIGHT')];
  act(s[1], 'lpAccept'); act(s[1], 'lpAssign', { truck: freeTruck(s[1]) });
})();

// ---------- Screen state ----------
const ta = { view: 'calendar', calView: 'month', cursor: W.ymd(new Date()), q: '', dFrom: '', dTo: '', fLp: '', fAs: '', fPlate: '', sort: 'date', dir: -1, page: 1, size: 10, refreshedAt: new Date() };
function taRender() {
  const lp = isLpAdmin(), sup = state.actor.supplier;
  $('taRoot').innerHTML = `<section class="cal-card">
    <div class="ta-top">
      <div class="seg" id="taTabs"><button data-tab="calendar" class="${ta.view === 'calendar' ? 'on' : ''}">Calendar</button><button data-tab="list" class="${ta.view === 'list' ? 'on' : ''}">Order List</button></div>
      <span class="q-note">${lp ? `LP Admin <b>${esc(sup)}</b>: orders of your trucking company only` : `<span class="ro-chip">${esc(W.roleLabel(state.actor))}: view only. Accept / Reject / Assign / Change Truck are for the LP Admin of the trucking company.</span>`}</span>
      <span class="spacer"></span>
      <span class="q-note">Last refresh ${fmtDT(ta.refreshedAt)}</span>
      <button class="btn-green" id="taRefresh" style="height:30px">&#8635; Refresh</button>
    </div>
    <div id="taBody"></div></section>`;
  $('taTabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { ta.view = b.dataset.tab; taRender(); } };
  $('taRefresh').onclick = () => { ta.refreshedAt = new Date(); taRender(); toast('Data refreshed'); };
  ta.view === 'calendar' ? renderTaCalendar() : renderTaList();
}
window.taRender = taRender;

// ---------- Calendar (as the reference screen) ----------
const TA_CLS = { wait: 'w', done: 'a', fin: 'f', rej: 'r' };
function taEntry(orders) {
  const live = orders.filter(o => !o.lpRejected), done = [ORDER.FIN, ORDER.SA, ORDER.PO];
  if (!live.length) return 'rej';
  if (live.every(o => done.includes(o.status))) return 'fin';
  if (live.every(o => o.truck)) return 'done';
  return 'wait';
}
function taEntries(date) {
  const by = {};
  visible().filter(o => o.date === date).forEach(o => { (by[o.type] = by[o.type] || []).push(o); });
  return Object.entries(by).sort().map(([type, orders]) => ({ type, orders, st: taEntry(orders) }));
}
function taDay(date, inMonth, limit) {
  const ents = taEntries(date), shown = limit ? ents.slice(0, limit) : ents;
  const cls = ['cal-day', 'on', inMonth ? '' : 'other', date === W.ymd(new Date()) ? 'today' : ''].join(' ');
  return `<div class="${cls}" data-tday="${date}"><div class="num">${date === W.ymd(new Date()) ? `<b>${+date.slice(8)}</b>` : +date.slice(8)}</div>
    ${shown.map(e => `<button class="ev ${TA_CLS[e.st]}" data-tev="${date}|${e.type}" title="${e.orders.length} order(s)">${esc(typeLabel(e.type))} [ ${e.orders.length} ]</button>`).join('')}
    ${limit && ents.length > limit ? `<button class="ev-more" data-tmore="${date}">+${ents.length - limit} more</button>` : ''}</div>`;
}
function renderTaCalendar() {
  const [y, m] = ta.cursor.split('-').map(Number), DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const add = (s, n) => { const [a, b, c] = s.split('-').map(Number); return W.ymd(new Date(a, b - 1, c + n)); };
  let title, body;
  if (ta.calView === 'month') {
    const first = new Date(y, m - 1, 1), start = add(W.ymd(first), -first.getDay()), weeks = Math.ceil((first.getDay() + new Date(y, m, 0).getDate()) / 7);
    title = `${MONTHS[m - 1]} ${y}`;
    body = `<div class="cal-grid">${DOWS.map(d => `<div class="dow">${d}</div>`).join('')}${Array.from({ length: weeks * 7 }, (_, i) => { const d = add(start, i); return taDay(d, +d.slice(5, 7) === m, 6); }).join('')}</div>`;
  } else if (ta.calView === 'week') {
    const start = add(ta.cursor, -new Date(y, m - 1, +ta.cursor.slice(8)).getDay());
    title = `${fmtD(start)} - ${fmtD(add(start, 6))}`;
    body = `<div class="cal-grid cal-week">${DOWS.map((d, i) => `<div class="dow">${d} ${+add(start, i).slice(8)}</div>`).join('')}${Array.from({ length: 7 }, (_, i) => taDay(add(start, i), true, 0)).join('')}</div>`;
  } else {
    title = fmtD(ta.cursor);
    const ents = taEntries(ta.cursor);
    body = `<div class="cal-dayview">${ents.length ? ents.map(e => `<button class="ev ${TA_CLS[e.st]}" style="max-width:420px" data-tev="${ta.cursor}|${e.type}">${esc(typeLabel(e.type))} [ ${e.orders.length} ]</button>`).join('') : '<p class="q-note">No order on this date.</p>'}</div>`;
  }
  $('taBody').innerHTML = `<div class="cal-bar"><div class="cal-nav"><button data-tnav="-1" aria-label="Previous">&lsaquo;</button><button data-tnav="1" aria-label="Next">&rsaquo;</button><button data-tnav="0">Today</button></div>
      <div class="cal-title">${title}</div><div class="cal-views">${['month', 'week', 'day'].map(v => `<button data-tview="${v}" class="${ta.calView === v ? 'on' : ''}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div>
    ${body}
    <div class="cal-legend"><span><i style="background:#3d8bfd"></i>Waiting Assignment</span><span><i style="background:#4cc98a"></i>Order Already Assign</span><span><i style="background:#0b1a3a"></i>Complete Order</span><span><i style="background:#f43f6e"></i>Rejected</span></div>`;
  $('taBody').onclick = e => {
    const nav = e.target.closest('[data-tnav]');
    if (nav) { const k = +nav.dataset.tnav; ta.cursor = !k ? W.ymd(new Date()) : ta.calView === 'month' ? W.ymd(new Date(y, m - 1 + k, 1)) : add(ta.cursor, k * (ta.calView === 'week' ? 7 : 1)); return renderTaCalendar(); }
    const v = e.target.closest('[data-tview]'); if (v) { ta.calView = v.dataset.tview; return renderTaCalendar(); }
    const more = e.target.closest('[data-tmore]'); if (more) { ta.calView = 'day'; ta.cursor = more.dataset.tmore; return renderTaCalendar(); }
    const ev = e.target.closest('[data-tev]'); if (ev) { const [d, t] = ev.dataset.tev.split('|'); openBatch(d, t); }
  };
}

// ---------- Assignment order list (modal of the reference screen) ----------
const bm = { date: '', type: '', sel: new Set(), q: '' };
function ensureModal() {
  if ($('taModal')) return;
  document.body.insertAdjacentHTML('beforeend', `<div class="overlay ta-ov" id="taModal"><div class="modal ta-m" role="dialog" aria-modal="true" aria-labelledby="taMTitle">
    <div class="modal-h"><h3 id="taMTitle"></h3><button id="taMClose" aria-label="Tutup">&times;</button></div><div id="taMBody" class="ta-mb"></div><div id="taMFoot" class="ta-mf"></div></div></div>`);
  $('taMClose').onclick = closeBatch;
  $('taModal').addEventListener('click', e => { if (e.target === $('taModal')) closeBatch(); });
}
const closeBatch = () => { $('taModal')?.classList.remove('show'); if ($('pgAssign').style.display !== 'none') taRender(); };
function openBatch(date, type) {
  ensureModal(); Object.assign(bm, { date, type, sel: new Set(), q: '' });
  $('taMTitle').textContent = `Assignment order list ${type === 'Universal' ? 'Universal DTP' : type.replace('DTP', 'DTP ')} On Period : ${fmtD(date)}`;
  renderBatch(); $('taModal').classList.add('show');
}
function renderBatch() {
  const lp = isLpAdmin(), q = bm.q.trim().toLowerCase();
  const rows = visible().filter(o => o.date === bm.date && o.type === bm.type && (!q || [o.orderNo, o.truck, o.from, o.to, o.dtp?.vessel, o.dtp?.bookNo, W.lpStatus(o)].join(' ').toLowerCase().includes(q)));
  const trucks = lp ? MASTER.trucks.filter(t => t.supplier === state.actor.supplier) : [];
  const sel = rows.filter(o => bm.sel.has(o.orderNo));
  $('taMBody').innerHTML = `<div class="ta-truck"><label>Truck <span class="req">*</span></label><select id="bmTruck" ${lp ? '' : 'disabled'}><option value="">Select an option</option>
      ${trucks.map(t => `<option value="${t.plate}">${t.plate} · ${t.type || '-'} · ${t.status === 'Maintenance' ? 'Maintenance' : t.licenseDate < bm.date ? 'License expired' : 'Active'}${MASTER.drivers.find(d => d.truck === t.plate && d.active) ? ` · ${MASTER.drivers.find(d => d.truck === t.plate && d.active).name}` : ''}</option>`).join('')}</select>
      <span class="q-note">Used by Assign and Change Truck for the selected orders</span></div>
    <div class="grid-bar"><label class="selall"><input type="checkbox" id="bmAll" ${lp && rows.length ? '' : 'disabled'} ${rows.length && rows.every(o => bm.sel.has(o.orderNo)) ? 'checked' : ''}><span><b>Select All</b><small>${sel.length} Selected</small></span></label>
      <span class="spacer"></span><div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="text" id="bmQ" placeholder="Search" value="${esc(bm.q)}" style="width:160px"></div></div>
    <div class="table-wrap"><table id="bmTable"><thead><tr><th>Options</th><th>Assign To</th><th>Order Status</th><th>Assignment</th><th>Order No</th><th>From</th><th>To</th><th>Agent</th><th>Vessel</th><th>Ctr Book No</th><th>Ctr Size</th><th>Seal No</th><th></th></tr></thead>
    <tbody>${rows.map(o => { const r = routeOf(o); return `<tr class="${o.truck ? 'asg' : o.lpRejected ? 'rej' : ''}"><td><input type="checkbox" data-bm="${o.orderNo}" ${lp ? '' : 'disabled'} ${bm.sel.has(o.orderNo) ? 'checked' : ''} aria-label="Select ${o.orderNo}"></td>
      <td><b>${o.truck || '-'}</b>${o.driver ? `<small class="sub">${esc(o.driver)}</small>` : ''}</td><td><span class="st ${LS_CLS[W.lpStatus(o)]}">${W.lpStatus(o)}</span></td><td><span class="st ${AS_CLS[W.assignStatus(o)]}">${W.assignStatus(o)}</span></td>
      <td>${o.orderNo}</td><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td>${esc(o.dtp?.agent || '-')}</td><td>${esc(o.dtp?.vessel || '-')}</td><td>${esc(o.dtp?.bookNo || '-')}</td><td>${esc(o.dtp?.ctrSize || '-')}</td><td>-</td>
      <td><button class="link" data-bmd="${o.orderNo}">Detail</button></td></tr>`; }).join('') || '<tr><td colspan="13" class="empty">No Data Found</td></tr>'}</tbody></table></div>
    <p class="q-note" style="margin-top:6px">Showing ${rows.length ? 1 : 0} to ${rows.length} of ${rows.length} records</p>`;
  $('taMFoot').innerHTML = lp ? `<button class="btn-sm-blue" data-bact="lpAccept">&#10003; Accept</button><button class="btn-submit" data-bact="lpAssign">&#128190; Assign</button>
      <button class="btn-del" data-bact="lpChangeTruck">&#128666; Change Truck</button><span class="spacer"></span><button class="btn-submit" data-bact="lpReject">&#128465; Reject</button>`
    : '<span class="q-note">View only</span>';
  $('bmQ').oninput = e => { bm.q = e.target.value; renderBatch(); $('bmQ').focus(); $('bmQ').setSelectionRange(bm.q.length, bm.q.length); };
  $('bmAll').onchange = e => { rows.forEach(o => e.target.checked ? bm.sel.add(o.orderNo) : bm.sel.delete(o.orderNo)); renderBatch(); };
  $('taMBody').querySelector('tbody').onchange = e => { const c = e.target.closest('[data-bm]'); if (c) { c.checked ? bm.sel.add(c.dataset.bm) : bm.sel.delete(c.dataset.bm); renderBatch(); } };
  $('taMBody').querySelector('tbody').onclick = e => { const d = e.target.closest('[data-bmd]'); if (d) openDetailTa(d.dataset.bmd); };
  $('taMFoot').onclick = e => {
    const b = e.target.closest('[data-bact]'); if (!b) return;
    const list = rows.filter(o => bm.sel.has(o.orderNo));
    if (!list.length) return toast('Select at least one order');
    const truck = $('bmTruck').value;
    if (['lpAssign', 'lpChangeTruck'].includes(b.dataset.bact) && !truck) return toast('Truck is required');
    if (b.dataset.bact === 'lpAssign' && list.length > 1) return toast('Assign links one truck to one order: select one order at a time');
    batchAction(b.dataset.bact, list, truck);
  };
}
// Accept / Reject / Assign / Change Truck for the selected orders (each order checked by the workflow)
function batchAction(key, list, truck) {
  const label = W.ACTIONS[key].label;
  const run = (payload) => {
    const at = new Date(), ok = [], fail = [];
    list.forEach(o => { const res = W.perform(o, key, payload, state.actor, at, CTX); res.ok ? ok.push(o) : fail.push(`${o.orderNo}: ${Object.values(res.errors).join(', ')}`); });
    closePreview(); bm.sel.clear(); renderBatch(); render();
    if (fail.length) { showPreview(`${label} - result`, `<p style="font-size:11px">${ok.length} order(s) done.</p><div class="form-alert">${fail.map(esc).join('<br>')}</div>`, '<button class="btn-outline" id="brOk">Close</button>'); $('brOk').onclick = closePreview; }
    else toast(`${label}: ${ok.length} order(s)${truck && ok.length ? ` · visible in the Driver app for ${ok[0].truck}` : ''}`);
  };
  if (key === 'lpReject') return rejectDialog(list, run);
  const text = key === 'lpAccept' ? `Accept ${list.length} order(s)? They can then be assigned to a truck.`
    : key === 'lpAssign' ? `Assign truck <b>${truck}</b> to order ${list[0].orderNo}? The order will appear in the Driver app of ${truck}.`
    : `Change the truck of ${list.length} order(s) to <b>${truck}</b>? The order is removed from the driver of the current truck and moves to ${truck}.`;
  confirmDialog(label, text, key === 'lpChangeTruck', () => run({ truck }));
}
function confirmDialog(title, text, danger, onYes, extra = '') {
  showPreview(title, `<p style="font-size:11.5px;margin:0">${text}</p>${extra}`, `<button class="btn-outline" id="cdNo">Cancel</button><button class="${danger ? 'btn-del' : 'btn-submit'}" style="height:30px" id="cdYes">Confirm</button>`);
  $('cdNo').onclick = closePreview; $('cdYes').onclick = onYes;
}
function rejectDialog(list, run) {
  showPreview('Reject Order', `<p style="font-size:11px;margin:0 0 8px">Reject ${list.length} order(s): ${list.map(o => o.orderNo).join(', ')}. Rejected orders go back to the VPLD Planner and cannot be assigned to a truck.</p>
    <form id="rjForm" onsubmit="return false"><div class="form-row" data-f="reason"><label>Reject Reason <span class="req">*</span></label><textarea name="reason" placeholder="Minimal ${W.REASON_MIN} karakter"></textarea></div></form>`,
    '<button class="btn-outline" id="rjNo">Cancel</button><button class="btn-del" id="rjYes">Reject</button>');
  $('rjNo').onclick = closePreview;
  $('rjYes').onclick = () => {
    const reason = $('rjForm').querySelector('[name=reason]').value;
    if (String(reason).trim().length < W.REASON_MIN) return showErrors($('rjForm'), { reason: String(reason).trim() ? `Reason minimal ${W.REASON_MIN} karakter` : 'Reject Reason wajib diisi' });
    run({ reason });
  };
}

// ---------- Order List ----------
const TCOLS = [['orderNo', 'DTP / Order Number'], ['date', 'Delivery Date'], ['supplier', 'Trucking Company'], ['from', 'Origin'], ['to', 'Destination'], ['truckType', 'Truck Type'],
  ['truck', 'Assigned License Plate'], ['driver', 'Driver'], ['lp', 'Order Status'], ['as', 'Assignment Status']];
const tval = (o, k) => k === 'lp' ? W.lpStatus(o) : k === 'as' ? W.assignStatus(o) : k === 'truckType' ? (o.dtp?.truckType || '-') : k === 'from' ? routeOf(o).from : k === 'to' ? routeOf(o).to : o[k] || '';
function taRows() {
  const q = ta.q.trim().toLowerCase(), p = ta.fPlate.trim().toUpperCase().replace(/\s/g, '');
  const rows = visible().filter(o => (!q || o.orderNo.toLowerCase().includes(q) || String(o.dtp?.recId ?? '').includes(q)) && (!ta.dFrom || o.date >= ta.dFrom) && (!ta.dTo || o.date <= ta.dTo)
    && (!ta.fLp || W.lpStatus(o) === ta.fLp) && (!ta.fAs || W.assignStatus(o) === ta.fAs) && (!p || (o.truck || '').includes(p)));
  return rows.sort((a, b) => { const x = tval(a, ta.sort), y = tval(b, ta.sort); return x < y ? -ta.dir : x > y ? ta.dir : a.orderNo < b.orderNo ? -1 : 1; });
}
function renderTaList() {
  const lp = isLpAdmin(), rows = taRows(), pages = Math.max(1, Math.ceil(rows.length / ta.size));
  ta.page = Math.min(ta.page, pages);
  const start = (ta.page - 1) * ta.size, view = rows.slice(start, start + ta.size);
  const actions = o => {
    const can = k => lp && !W.blockReason(o, k, state.actor, CTX);
    return `<div class="ta-act">${can('lpAccept') ? `<button class="mini ok" data-ta="lpAccept" data-o="${o.orderNo}">Accept</button>` : ''}${can('lpReject') ? `<button class="mini bad" data-ta="lpReject" data-o="${o.orderNo}">Reject</button>` : ''}
      ${can('lpAssign') ? `<button class="mini pri" data-ta="lpAssign" data-o="${o.orderNo}">Assign Truck</button>` : ''}${can('lpChangeTruck') ? `<button class="mini warn" data-ta="lpChangeTruck" data-o="${o.orderNo}">Change Truck</button>` : ''}
      <button class="mini" data-ta="detail" data-o="${o.orderNo}">View Detail</button></div>`;
  };
  $('taBody').innerHTML = `<div class="ta-filters">
      <div><label>Search Order / DTP</label><input id="tfQ" value="${esc(ta.q)}" placeholder="Order / DTP number"></div>
      <div><label>Delivery Date From</label><input type="date" id="tfFrom" value="${ta.dFrom}"></div><div><label>Delivery Date To</label><input type="date" id="tfTo" value="${ta.dTo}"></div>
      <div><label>Order Status</label><select id="tfLp"><option value="">All</option>${Object.values(LS).map(s => `<option ${ta.fLp === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div><label>Assignment Status</label><select id="tfAs"><option value="">All</option>${[AS.WAIT, AS.DONE, AS.NONE].map(s => `<option value="${s}" ${ta.fAs === s ? 'selected' : ''}>${s === AS.NONE ? 'Not applicable (-)' : s}</option>`).join('')}</select></div>
      <div><label>License Plate</label><input id="tfPlate" value="${esc(ta.fPlate)}" placeholder="e.g. B9504UIZ"></div>
      <div class="fb"><button class="btn-clear" id="tfClear" style="height:30px">Clear</button></div></div>
    <div class="table-wrap"><table id="taTable"><thead><tr>${TCOLS.map(([k, l]) => `<th data-tsort="${k}">${l}${ta.sort === k ? ` <span class="arrow">${ta.dir === 1 ? '▲' : '▼'}</span>` : ''}</th>`).join('')}<th>Action</th></tr></thead>
    <tbody>${view.map(o => `<tr class="${o.lpRejected ? 'rej' : o.truck ? 'asg' : ''}">${TCOLS.map(([k]) => k === 'lp' ? `<td><span class="st ${LS_CLS[W.lpStatus(o)]}">${W.lpStatus(o)}</span></td>`
        : k === 'as' ? `<td><span class="st ${AS_CLS[W.assignStatus(o)]}">${W.assignStatus(o)}</span></td>` : k === 'date' ? `<td>${fmtD(o.date)}</td>` : `<td>${esc(tval(o, k) || '-')}</td>`).join('')}<td>${actions(o)}</td></tr>`).join('')
      || `<tr><td colspan="${TCOLS.length + 1}" class="empty">No order found${visible().length ? ' for the selected criteria' : ''}.</td></tr>`}</tbody></table></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span class="q-note">${rows.length ? `Showing ${start + 1} to ${start + view.length} of ${rows.length} records` : 'Showing 0 records'}</span>
      <span class="page-size">Show <select id="tfSize">${[10, 25, 50].map(n => `<option ${ta.size === n ? 'selected' : ''}>${n}</option>`).join('')}</select> rows</span></div>
    <div class="pager" id="taPager">${pagerFor(ta.page, pages)}</div>`;
  const bind = (id, k, ev = 'change') => { $(id).addEventListener(ev, e => { ta[k] = e.target.value; ta.page = 1; renderTaList(); if (ev === 'input') { $(id).focus(); $(id).setSelectionRange(ta[k].length, ta[k].length); } }); };
  bind('tfQ', 'q', 'input'); bind('tfFrom', 'dFrom'); bind('tfTo', 'dTo'); bind('tfLp', 'fLp'); bind('tfAs', 'fAs'); bind('tfPlate', 'fPlate', 'input');
  $('tfSize').onchange = e => { ta.size = +e.target.value; ta.page = 1; renderTaList(); };
  $('tfClear').onclick = () => { Object.assign(ta, { q: '', dFrom: '', dTo: '', fLp: '', fAs: '', fPlate: '', page: 1 }); renderTaList(); };
  $('taPager').onclick = e => { const b = e.target.closest('button[data-p]'); if (b && !b.disabled) { ta.page = +b.dataset.p; renderTaList(); } };
  $('taTable').querySelector('thead').onclick = e => { const th = e.target.closest('[data-tsort]'); if (!th) return; ta.dir = ta.sort === th.dataset.tsort ? -ta.dir : 1; ta.sort = th.dataset.tsort; renderTaList(); };
  $('taTable').querySelector('tbody').onclick = e => {
    const b = e.target.closest('[data-ta]'); if (!b) return;
    const o = DATA.find(x => x.orderNo === b.dataset.o), k = b.dataset.ta;
    if (k === 'detail') return openDetailTa(o.orderNo);
    if (k === 'lpAssign' || k === 'lpChangeTruck') return truckPicker(o, k);
    batchAction(k, [o]);
  };
}

// Truck picker: trucks of the LP with type, status for this order and driver
function truckPicker(o, key) {
  let q = '', chosen = '';
  const draw = () => {
    const list = MASTER.trucks.filter(t => t.supplier === o.supplier && t.plate !== o.truck && (!q || t.plate.includes(q.toUpperCase().replace(/\s/g, ''))));
    $('tpList').innerHTML = list.map(t => {
      const st = W.truckState(t, o, CTX), d = MASTER.drivers.find(x => x.truck === t.plate && x.active);
      return `<tr class="${st.ok ? '' : 'nosel'}"><td><input type="radio" name="tp" value="${t.plate}" ${st.ok ? '' : 'disabled'} ${chosen === t.plate ? 'checked' : ''} aria-label="${t.plate}"></td><td><b>${t.plate}</b></td><td>${t.type || '-'}</td>
        <td><span class="st ${st.ok ? 'av' : 'fl'}" title="${esc(st.reason)}">${st.label}</span>${st.ok ? '' : `<small class="sub">${esc(st.reason)}</small>`}</td><td>${d ? esc(d.name) : '<span class="q-note">No driver</span>'}</td></tr>`;
    }).join('') || '<tr><td colspan="5" class="empty">No truck found</td></tr>';
  };
  const change = key === 'lpChangeTruck';
  showPreview(`${change ? 'Change Truck' : 'Assign Truck'} - ${o.orderNo}`, `<p class="q-note" style="margin:0 0 8px">${fmtD(o.date)} · ${o.shift} · ${esc(routeOf(o).from)} → ${esc(routeOf(o).to)} · Truck type ${esc(o.dtp?.truckType || '-')}</p>
    ${change ? `<div class="cur-truck">Current truck: <b>${o.truck}</b>${o.driver ? ` · Driver ${esc(o.driver)}` : ''}</div>` : ''}
    <div class="search" style="margin-bottom:8px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="text" id="tpQ" placeholder="Search License Plate" style="width:220px"></div>
    <div class="err-scroll"><table class="err-table"><thead><tr><th></th><th>License Plate</th><th>Truck Type</th><th>Truck Status</th><th>Driver</th></tr></thead><tbody id="tpList"></tbody></table></div>
    ${change ? '<form id="tpForm" onsubmit="return false" style="margin-top:10px"><div class="form-row" data-f="reason"><label>Reason (optional)</label><textarea name="reason" placeholder="e.g. truck breakdown"></textarea></div></form>' : ''}
    <div id="tpErr"></div>`,
    `<button class="btn-outline" id="tpNo">Cancel</button><button class="btn-submit" style="height:30px" id="tpYes" disabled>${change ? 'Change Truck' : 'Assign Truck'}</button>`);
  $('pvBody').closest('.pv').style.width = '760px';
  draw();
  $('tpQ').oninput = e => { q = e.target.value; draw(); };
  $('tpList').onchange = e => { chosen = e.target.value; $('tpYes').disabled = !chosen; };
  const reset = () => { $('pvBody').closest('.pv').style.width = ''; };
  $('tpNo').onclick = () => { closePreview(); reset(); };
  $('tpYes').onclick = () => {
    const reason = change ? $('tpForm').querySelector('[name=reason]').value : '';
    const go = () => {
      const res = W.perform(o, key, { truck: chosen, reason }, state.actor, new Date(), CTX);
      if (!res.ok) { toast(Object.values(res.errors)[0]); return; }
      closePreview(); reset(); render(); renderTaList();
      toast(change ? `Truck changed to ${o.truck}: the order moved to that driver's app` : `Truck ${o.truck} assigned: the order is now in the Driver app of ${o.truck}`);
    };
    if (!change) return go();
    reset(); confirmDialog('Confirm Change Truck', `Change the truck of order <b>${o.orderNo}</b> from <b>${o.truck}</b> to <b>${chosen}</b>? The order disappears from the driver of ${o.truck} and appears for ${chosen}.`, true, go);
  };
}

// Detail with audit trail and a shortcut to the Driver app view
function openDetailTa(no) {
  const o = DATA.find(x => x.orderNo === no), r = routeOf(o), d = MASTER.drivers.find(x => x.truck === o.truck && x.active);
  const h = o.history.slice().reverse();
  showPreview(`Order ${o.orderNo}`, `<div class="ta-info">${[['Delivery Date', fmtD(o.date)], ['Trucking Company', o.supplier], ['Origin', r.from], ['Destination', r.to], ['Shift', o.shift], ['Truck Type', o.dtp?.truckType || '-'],
      ['Order Status', W.lpStatus(o)], ['Assignment Status', W.assignStatus(o)], ['License Plate', o.truck || '-'], ['Driver', o.driver || '-'], ['Daily Status', `${o.status} / ${W.current(o).status}`],
      ['Reject Reason', o.lpRejected?.reason || '-']].map(([k, v]) => `<div><b>${k}</b>${esc(v)}</div>`).join('')}</div>
    <p style="font-weight:600;font-size:11px;margin:12px 0 6px">Audit Trail</p>
    <div class="err-scroll"><table class="err-table"><tr><th>Date Time</th><th>Action</th><th>Order Status</th><th>License Plate</th><th>Reason / Note</th><th>Updated By</th></tr>
      ${h.map(x => `<tr><td style="white-space:nowrap">${fmtDT(x.at)}</td><td>${esc(x.action)}</td><td>${esc(x.lpFrom && x.lpFrom !== x.lpTo ? `${x.lpFrom} → ${x.lpTo}` : x.lpTo || '-')}<small class="sub">${esc(x.from)} → ${esc(x.to)}</small></td>
        <td>${esc(x.plateFrom !== x.plateTo ? `${x.plateFrom || '-'} → ${x.plateTo || '-'}` : x.plateTo || '-')}</td><td>${esc([x.reason, x.note].filter(Boolean).join(' · ') || '-')}</td><td>${esc(x.actor)}<small class="sub">${esc(x.role)}</small></td></tr>`).join('')}</table></div>`,
    `${d && o.truck ? `<button class="btn-outline" id="dvDriver">Open Driver app view (${o.truck})</button>` : ''}<button class="btn-sm-blue" style="height:30px" id="dvClose">Close</button>`);
  $('pvBody').closest('.pv').style.width = '860px';
  $('dvClose').onclick = () => { closePreview(); $('pvBody').closest('.pv').style.width = ''; };
  if ($('dvDriver')) $('dvDriver').onclick = () => {
    closePreview(); $('pvBody').closest('.pv').style.width = ''; $('taModal')?.classList.remove('show');
    setActor(driverActor(d), 'driver'); state.search = ''; $('search').value = ''; state.dateFrom = ''; $('dateFrom').value = ''; location.hash = '#monitoring';
    toast(`Logged in as driver ${d.name} (${o.truck}): only orders of this truck are shown`);
  };
}

if (location.hash.startsWith('#truck-assignment')) taRender();
