// ELIPS TC-PBR Service Acceptance: SA Approval (VPLD) and SA Monitoring. Rules in sa-rules.js (window.SA).
// Uses the Daily Monitoring data (DATA, W, state ...) of app.js. Spec: docs/uiss/05_SA_Approval/sa-approval-spec.md.
(function () {
  const STORE = 'elips-sa-v1';
  const money = n => n == null ? '-' : Number(n).toLocaleString('en-US');
  const kmFmt = n => n == null ? '-' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const lpCodeOf = name => (SUPPLIERS.find(s => s[0] === name) || [])[1] || '';
  const monthStart = ym => `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`;
  const monthEnd = ym => { const d = new Date(+ym.slice(0, 4), +ym.slice(4, 6), 0); return SA.ymd(d); };
  const isVPLD = () => state.actor.role === 'PLANNER';
  const canSeeApproval = () => ['PLANNER', 'IELP_ADMIN'].includes(state.actor.role);

  // ---------- Reference data (mock mirror of Master Location / Master Mileage / PO Inquiry) ----------
  // Daily Monitoring location name -> Master Location code (a name without code gives Route Not Found).
  const LOC_CODE = {
    'Depo Cakung Marunda': 'D3', 'Depo Tanjung Priok': 'PRTGP', 'Depo Sunter 2': 'D1', 'Depo Sunter': 'D1', 'Depo Cikarang': 'D2', 'Depo Karawang': 'KRW',
    '(Empty) CY TMMIN Sunter 1': 'S1', 'CY TMMIN Sunter (EMPTY)': 'S1', '(Empty) CY TMMIN Karawang': 'CYKRW', 'CY TMMIN Karawang (EMPTY)': 'CYKRW',
    'TMMIN Sunter 2 Plant': 'SNT', 'TMMIN Karawang 3 Plant': 'K3E', 'Port Area Priok': 'A1', 'Warehouse Cikarang': 'X10E',
  };
  // Master Mileage legs (directional). K3E -> PRTGP is missing on purpose (Total KM Not Found example).
  const MILEAGE = {};
  [['D3', 'S1', 15], ['D3', 'CYKRW', 57], ['D3', 'SNT', 17], ['D3', 'K3E', 62], ['PRTGP', 'S1', 11], ['PRTGP', 'CYKRW', 67], ['PRTGP', 'SNT', 12], ['PRTGP', 'K3E', 70],
   ['D1', 'S1', 3], ['D1', 'CYKRW', 64], ['D1', 'SNT', 4], ['D1', 'K3E', 68], ['D2', 'S1', 42], ['D2', 'CYKRW', 28], ['A1', 'S1', 11], ['A1', 'CYKRW', 66], ['A1', 'X10E', 58], ['D3', 'X10E', 40], ['KRW', 'S1', 68], ['KRW', 'CYKRW', 12], ['KRW', 'SNT', 65], ['KRW', 'K3E', 15]]
    .forEach(([f, t, km]) => {
      MILEAGE[`${f}>${t}`] = { km, status: 'ACTIVE' };
      if (!(f === 'PRTGP' && t === 'K3E')) MILEAGE[`${t}>${f}`] = { km, status: 'ACTIVE' };
    });
  // TC-PBR POs (route-based PR -> PO, rate = Mileage Cost IDR/Km from E-Catalogue at PR time)
  const POS = [];
  const RATE = { PBM: 2650, PNJ: 2900, SRL: 2700, TFL: 2750, SML: 2700 }; // SRL November: no rate (Rate Not Found example)
  ['202610', '202611'].forEach(ym => SUPPLIERS.forEach(([, code], k) => {
    const oct = ym === '202610';
    POS.push({ poNo: `${ym}PC${code}${String(1301 + k).padStart(5, '0')}`, type: 'TC-PBR', lpCode: code, ym, validFrom: monthStart(ym), validTo: monthEnd(ym),
      status: oct && code === 'SML' ? 'Pending' : 'Approved', ratePerKm: !oct && code === 'SRL' ? null : RATE[code], currency: 'IDR' });
    // TFL October: an additional PO sequence also covering the month (Multiple PO Found example)
    if (oct && code === 'TFL') POS.push({ poNo: `${ym}PC${code}01399`, type: 'TC-PBR', lpCode: code, ym, validFrom: monthStart(ym), validTo: monthEnd(ym), status: 'Auto Approved', ratePerKm: 2800, currency: 'IDR' });
  }));

  // Monthly truck POs (PR Creation type Fixed Cost -> PR approval -> PO; mirror of PO Inquiry, mock). Released = Approved / Auto Approved.
  // November: SRL Pending and TFL Rejected (not released, not listed), SML without monthly cost (Monthly Cost Not Found example).
  const MONTHLY_POS = [];
  const FIX = { PBM: 28000000, PNJ: 29500000, SRL: 28300000, TFL: 27900000, SML: 28100000 };
  ['202610', '202611'].forEach(ym => SUPPLIERS.forEach(([name, code]) => {
    const oct = ym === '202610', prNo = `${code}${ym.slice(2, 4)}${ym.slice(4, 6)}01`;
    const status = oct ? (code === 'PNJ' ? 'Auto Approved' : 'Approved') : ({ SRL: 'Pending', TFL: 'Rejected', PNJ: 'Auto Approved' })[code] || 'Approved';
    MONTHLY_POS.push({ poNo: `PO${prNo}`, prNo, type: 'FIX', lpCode: code, lpName: name, ym, status, amount: !oct && code === 'SML' ? null : FIX[code], currency: 'IDR',
      releasedAt: new Date(+ym.slice(0, 4), +ym.slice(4, 6) - 2, 28, 10, 0), saNo: '' });
  }));

  // ---------- SA store ----------
  const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } })();
  const SAS = [], SEQ = {}, REQUESTS = {};
  const persist = () => { try { localStorage.setItem(STORE, JSON.stringify({ sas: SAS.filter(s => !s.legacy), seq: SEQ, requests: REQUESTS })); } catch (e) { /* storage not available */ } };
  const ctx = (extra = {}) => Object.assign({
    orders: DATA, finStatus: W.ORDER.FIN, lpCode: o => lpCodeOf(o.supplier), locCode: n => LOC_CODE[n] || '', mileage: (f, t) => MILEAGE[`${f}>${t}`] || null,
    pos: POS, monthlyPos: MONTHLY_POS, sas: SAS, seq: SEQ, requests: REQUESTS, scope: 'LP_DATE', canApprove: a => a.role === 'PLANNER',
    commitMonthly: (po, saNo, at) => { po.saNo = saNo; po.saAt = at; },
    commitOrder: (o, saNo, at, actor) => { const r = W.perform(o, 'saApprove', { saNo }, actor, at, CTX); if (!r.ok) throw new Error(Object.values(r.errors).join(', ')); },
  }, extra);
  const revive = s => Object.assign(s, { approvedAt: new Date(s.approvedAt), createdAt: new Date(s.createdAt), audit: s.audit.map(a => ({ ...a, at: new Date(a.at) })) });

  // Legacy SA of the seed data (status SA set by the former Batch SA/PAS): give them an SA Number and a snapshot
  (() => {
    const legacy = DATA.filter(o => o.saAt && !o.saNo).sort((a, b) => a.saAt - b.saAt), groups = {};
    legacy.forEach(o => { const k = `${lpCodeOf(o.supplier)}|${SA.yymmdd(o.saAt)}`; (groups[k] = groups[k] || []).push(o); });
    Object.values(groups).forEach(g => {
      const lp = lpCodeOf(g[0].supplier), at = g[0].saAt, key = SA.seqKey('LP_DATE', lp, at), n = (SEQ[key] || 0) + 1; SEQ[key] = n;
      const saNo = SA.saNumber(lp, at, n), c = ctx();
      const dk = `DET|${SA.yymmdd(at).slice(0, 4)}`;
      const details = g.map(o => { const d = SA.calculate(o, c); d.errors = d.errors.filter(x => x.code !== 'NOT_ELIGIBLE'); SEQ[dk] = (SEQ[dk] || 0) + 1; return { ...d, kind: 'DELIVERY', detNo: SA.detNumber(at, SEQ[dk]), calcAt: at }; });
      g.forEach(o => { o.saNo = saNo; });
      SAS.push({ saNo, type: 'DELIVERY', lpCode: lp, lpName: g[0].supplier, poNo: details.find(d => d.poNo)?.poNo || '-', poFrom: details[0].poFrom, poTo: details[0].poTo, currency: 'IDR',
        deliveries: g.length, totalKm: details.every(d => d.totalKm != null) ? details.reduce((s, d) => s + d.totalKm, 0) : null,
        totalCost: details.every(d => d.cost != null) ? details.reduce((s, d) => s + d.cost, 0) : null,
        status: g.some(o => o.status === W.ORDER.PO) ? 'SA Approved with PO Number' : 'SA Approved', approvedBy: 'Batch SA/PAS', approvedRole: 'SYSTEM', approvedAt: at, createdAt: at,
        legacy: true, details, pas: SAPAS.init(), pasLog: [], audit: [{ at, by: 'Batch SA/PAS', action: 'SA_APPROVED', note: 'legacy, before TC-PBR SA Approval' }] });
    });
  })();
  // Approvals made in this browser (mock persistence): re-apply them to the regenerated Daily data
  if (saved) {
    Object.assign(SEQ, saved.seq); Object.assign(REQUESTS, saved.requests);
    saved.sas.forEach(s => {
      revive(s); SAS.push(s);
      if (s.type === 'MONTHLY') { const po = MONTHLY_POS.find(p => p.poNo === s.poNo); if (po) Object.assign(po, { saNo: s.saNo, saAt: s.approvedAt }); return; }
      s.details.forEach(d => { const o = DATA.find(x => x.orderNo === d.orderNo); if (o && !o.saNo && o.status === W.ORDER.FIN) W.perform(o, 'saApprove', { saNo: s.saNo }, { role: 'PLANNER', name: s.approvedBy }, s.approvedAt, CTX); });
    });
  }

  // ---------- SA Approval ----------
  const today = SA.ymd(new Date());
  const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1, 1); return SA.ymd(d); })();
  const sa = { from: lastMonth, to: today, q: '', tab: 'regular', sel: new Set(), page: 1, size: 10, sim: '', hidden: new Set(['service']), calc: {}, mcalc: {} };
  const COLS = [['valid', 'Validation'], ['dtp', 'DTP Type'], ['orderNo', 'Order Number'], ['date', 'Order Date'], ['lp', 'Truck Company'], ['po', 'PO Number'], ['poValid', 'PO Validity'],
    ['ctr', 'CTR Size'], ['km', 'Total KM'], ['rate', 'Rate / KM'], ['cost', 'Price'], ['cur', 'Currency'], ['route', 'Order Route'], ['service', 'Service (cycle)'], ['cycles', 'Cycle 1 - 5']];
  function rows() {
    const q = sa.q.trim().toLowerCase(), c = ctx();
    sa.calc = {};
    return DATA.filter(o => SA.eligible(o, W.ORDER.FIN) && (!sa.from || o.date >= sa.from) && (!sa.to || o.date <= sa.to))
      .map(o => { const r = SA.calculate(o, c); sa.calc[o.orderNo] = r; return { o, r }; })
      .filter(({ o, r }) => !q || [o.orderNo, o.type, o.supplier, r.lpCode, r.poNo, r.route, ...o.cycles.map(x => x.container)].join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.o.date < b.o.date ? -1 : a.o.date > b.o.date ? 1 : a.o.orderNo < b.o.orderNo ? -1 : 1);
  }
  const hid = k => sa.hidden.has(k) ? ' style="display:none"' : '';
  // Monthly tab: released monthly POs without SA whose month overlaps Order From - To
  function monthlyRows() {
    const q = sa.q.trim().toLowerCase();
    sa.mcalc = {};
    return MONTHLY_POS.filter(po => SA.monthlyEligible(po)).map(po => { const r = SA.calculateMonthly(po); sa.mcalc[po.poNo] = r; return r; })
      .filter(r => (!sa.to || r.poFrom <= sa.to) && (!sa.from || r.poTo >= sa.from))
      .filter(r => !q || [r.poNo, r.prNo, r.lpCode, r.lpName, r.period].join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.ym < b.ym ? -1 : a.ym > b.ym ? 1 : a.lpCode < b.lpCode ? -1 : 1);
  }
  function monthlyTable(list, view, vp) {
    return `<div class="table-wrap"><table class="sa-tbl"><thead><tr><th></th><th>Actions</th><th>Validation</th><th>PO Number</th><th>PR Number</th><th>Production Month</th><th>Truck Company</th>
        <th>Cost Component</th><th>PO Status</th><th>PO Released</th><th>Service Period</th><th>Price</th><th>Currency</th></tr></thead>
      <tbody>${view.map(r => `<tr class="${r.valid ? '' : 'sa-bad'}">
        <td><input type="checkbox" data-sasel="${r.poNo}" ${vp && r.valid ? '' : 'disabled'} ${sa.sel.has(r.poNo) ? 'checked' : ''} aria-label="Select ${r.poNo}"></td>
        <td><button class="act" data-samon="${r.poNo}" title="Monthly cost detail">&#9776;</button></td>
        <td>${r.valid ? '<span class="st av">Ready</span>' : r.errors.map(x => `<span class="st fl" title="${esc(x.msg)}">${x.label}</span>`).join(' ')}</td>
        <td>${r.poNo}</td><td>${r.prNo}</td><td>${r.period}</td><td class="left">${r.lpCode} - ${esc(r.lpName)}</td><td>Monthly Cost (Fixed)</td><td>${r.poStatus}</td>
        <td>${r.releasedAt ? fmtDT(r.releasedAt) : '-'}</td><td>${r.poFrom} - ${r.poTo}</td><td class="num sa-price">${money(r.cost)}</td><td>${r.currency}</td></tr>`).join('') || '<tr><td colspan="13" class="empty">No Data Found</td></tr>'}</tbody></table></div>`;
  }
  const monthlyDetail = r => `<div class="ta-info"><div><b>PO Number</b>${r.poNo}</div><div><b>PR Number</b>${r.prNo}</div><div><b>Production Month</b>${r.period}</div><div><b>Trucking Company</b>${r.lpCode} - ${esc(r.lpName)}</div>
      <div><b>Cost Component</b>Monthly Cost (Fixed) - rental of truck + driver for one month</div><div><b>PO Status</b>${r.poStatus}</div><div><b>PO Released</b>${r.releasedAt ? fmtDT(r.releasedAt) : '-'}</div><div><b>Service Period</b>${r.poFrom} - ${r.poTo}</div>
      <div><b>Monthly Cost</b>${money(r.cost)} ${r.currency}</div></div>
    <h4 class="sa-h4">Validation</h4>${r.errors.length ? `<ul class="sa-err">${r.errors.map(x => `<li><b>${x.label}</b> - ${esc(x.msg)}</li>`).join('')}</ul>` : '<p class="q-note"><span class="st av">Ready</span> All checks passed.</p>'}`;
  function cycleCells(o, r) {
    return [0, 1, 2, 3, 4].map(i => {
      const l = r.legs[i], svc = `<td${hid('service')}>-</td>`;
      if (!l) return `${svc}<td>-</td>`;
      return `${svc}<td class="sa-cyc">${l.from || '?'}-${l.to || '?'}${l.container ? ` <small>[${l.container}]</small>` : ''}</td>`;
    }).join('');
  }
  function render() {
    const root = $('saRoot'); if (!root || $('pgSA').style.display === 'none') return;
    if (!canSeeApproval()) { root.innerHTML = `<section class="cal-card"><p class="q-note">SA Approval is only available for VPLD (approve) and IELP Admin (view). Login: ${esc(W.roleLabel(state.actor))}.</p></section>`; return; }
    const mon = sa.tab === 'monthly';
    const all = sa.tab === 'regular' ? rows() : mon ? monthlyRows().map(r => ({ o: { orderNo: r.poNo }, r })) : [];
    const pages = Math.max(1, Math.ceil(all.length / sa.size)); sa.page = Math.min(sa.page, pages);
    const view = all.slice((sa.page - 1) * sa.size, sa.page * sa.size);
    const valid = all.filter(x => x.r.valid);
    [...sa.sel].forEach(id => { if (!valid.some(x => x.o.orderNo === id)) sa.sel.delete(id); });
    const vp = isVPLD();
    root.innerHTML = `<section class="cal-card">
      <div class="sa-filter">
        <div><label for="saFrom">Order From</label><input type="date" id="saFrom" value="${sa.from}"></div>
        <div><label for="saTo">Order To</label><input type="date" id="saTo" value="${sa.to}"></div>
        <button class="btn-dark" id="saSearch">&#128269; Search</button><button class="btn-light" id="saClear">&#8635; Clear</button>
      </div>
      <div class="sa-tabs"><button data-satab="regular" class="${sa.tab === 'regular' ? 'on' : ''}">Regular Trip</button><button data-satab="inter" class="${sa.tab === 'inter' ? 'on' : ''}">Inter Plant Trip</button><button data-satab="monthly" class="${mon ? 'on' : ''}">Monthly Truck (Fixed Cost)</button></div>
      <div class="sa-card">
        <div class="sa-card-h">&#9745; ${mon ? 'Monthly Cost List' : 'Order List'} <span class="q-note">${vp ? (mon ? 'VPLD: monthly truck cost of released PO; select and Approve (one SA per PO).' : 'VPLD: select valid deliveries and Approve.') : `<span class="ro-chip">${esc(W.roleLabel(state.actor))}: view only. Approve is for VPLD.</span>`}</span></div>
        <div class="sa-bar">
          <label class="selall"><input type="checkbox" id="saAll" ${vp && valid.length ? '' : 'disabled'} ${valid.length && valid.every(x => sa.sel.has(x.o.orderNo)) ? 'checked' : ''}><span><b>Select All</b><small>${sa.sel.size} Item selected</small></span></label>
          <button class="btn-dark" id="saApprove" ${vp && sa.sel.size ? '' : 'disabled'}>&#128190; Approve</button>
          ${vp ? `<select id="saSim" title="Demo"><option value="">Demo: normal</option><option value="other" ${sa.sim === 'other' ? 'selected' : ''}>Demo: other user approves 1st selected first</option>
            <option value="rate" ${sa.sim === 'rate' ? 'selected' : ''}>Demo: PO rate changes after display</option><option value="header" ${sa.sim === 'header' ? 'selected' : ''}>Demo: SA header insert fails</option>
            <option value="detail" ${sa.sim === 'detail' ? 'selected' : ''}>Demo: SA detail insert fails</option><option value="daily" ${sa.sim === 'daily' ? 'selected' : ''}>Demo: Daily Monitoring update fails</option></select>` : ''}
          <span class="spacer"></span>
          <span class="q-note">${valid.length} ready · ${all.length - valid.length} with issue</span>
          <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="text" id="saQ" placeholder="Search" value="${esc(sa.q)}"></div>
          ${mon ? '' : `<div class="dd" id="saKolomDd"><button class="btn-blue" id="saKolom">Kolom &#9662;</button><div class="dd-menu">${COLS.map(([k, l]) => `<label><input type="checkbox" data-sacol="${k}" ${sa.hidden.has(k) ? '' : 'checked'}> ${l}</label>`).join('')}</div></div>`}
        </div>
        ${sa.tab === 'inter' ? '<p class="q-note sa-empty">Inter Plant Trip: selection rule not defined yet (TBD, see open questions).</p>' : ''}
        ${mon ? monthlyTable(all.map(x => x.r), view.map(x => x.r), vp) : `<div class="table-wrap"><table class="sa-tbl"><thead>
          <tr><th rowspan="2"></th><th rowspan="2">Actions</th>${COLS.slice(0, 13).map(([k, l]) => `<th rowspan="2"${hid(k)}>${l}</th>`).join('')}
            ${[1, 2, 3, 4, 5].map(n => `<th colspan="${sa.hidden.has('service') ? 1 : 2}"${hid('cycles')}>Cycle ${n}</th>`).join('')}</tr>
          <tr>${[1, 2, 3, 4, 5].map(() => `<th${hid('service')}${sa.hidden.has('cycles') ? ' style="display:none"' : ''}>Service</th><th${hid('cycles')}>Order Cycle</th>`).join('')}</tr></thead>
          <tbody>${view.map(({ o, r }) => `<tr class="${r.valid ? '' : 'sa-bad'}">
            <td><input type="checkbox" data-sasel="${o.orderNo}" ${vp && r.valid ? '' : 'disabled'} ${sa.sel.has(o.orderNo) ? 'checked' : ''} aria-label="Select ${o.orderNo}"></td>
            <td><div class="ta-act"><button class="act" data-sadet="${o.orderNo}" title="Calculation detail">&#9776;</button><button class="act" data-saod="${o.orderNo}" title="Order Detail (Daily Monitoring)">&#128196;</button></div></td>
            <td${hid('valid')}>${r.valid ? '<span class="st av">Ready</span>' : r.errors.map(x => `<span class="st fl" title="${esc(x.msg)}">${x.label}</span>`).join(' ')}</td>
            <td${hid('dtp')}>${o.type.replace('DTP', 'DTP-')}</td><td${hid('orderNo')}>${o.orderNo}</td><td${hid('date')}>${o.date}</td>
            <td class="left"${hid('lp')}>${r.lpCode || '?'} - ${esc(o.supplier)}</td><td${hid('po')}>${r.poNo || '-'}</td>
            <td${hid('poValid')}>${r.poFrom ? `${r.poFrom} - ${r.poTo}` : '-'}</td><td${hid('ctr')}>${o.dtp?.ctrSize || '-'}</td>
            <td class="num"${hid('km')}>${kmFmt(r.totalKm)}</td><td class="num"${hid('rate')}>${money(r.rate)}</td>
            <td class="num sa-price"${hid('cost')}>${money(r.cost)}</td><td${hid('cur')}>${r.currency || '-'}</td>
            <td class="sa-route"${hid('route')}>${r.route || '-'}</td>${sa.hidden.has('cycles') ? '' : cycleCells(o, r)}</tr>`).join('') || `<tr><td colspan="30" class="empty">No Data Found</td></tr>`}</tbody></table></div>`}
        <div class="dn-pager"><span class="q-note">Showing ${all.length ? (sa.page - 1) * sa.size + 1 : 0} to ${(sa.page - 1) * sa.size + view.length} of ${all.length} records</span><span class="spacer"></span>
          <select id="saSize">${[10, 25, 50].map(n => `<option ${n === sa.size ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <button class="btn-light" data-sapg="-1" ${sa.page === 1 ? 'disabled' : ''}>&lsaquo; Prev</button><span class="q-note">Page ${sa.page} / ${pages}</span><button class="btn-light" data-sapg="1" ${sa.page === pages ? 'disabled' : ''}>Next &rsaquo;</button></div>
      </div></section>`;
  }

  function detailHtml(d, o) {
    return `<div class="ta-info">
        <div><b>Order Number</b>${d.orderNo}</div><div><b>Order Date</b>${d.date}</div><div><b>Trucking Company</b>${d.lpCode || '?'} - ${esc(d.lpName)}</div><div><b>License Plate / Driver</b>${o ? `${o.truck || '-'} / ${esc(o.driver || '-')}` : '-'}</div></div>
      <h4 class="sa-h4">Route &amp; Total KM</h4>
      <table class="sa-mini"><tr><th>Cycle</th><th>From</th><th>To</th><th>Container</th><th>KM (Master Mileage)</th></tr>
        ${d.legs.map(l => `<tr><td>${l.cycle}</td><td>${l.from || '?'} - ${esc(l.fromName)}</td><td>${l.to || '?'} - ${esc(l.toName)}</td><td>${l.container || '-'}</td><td class="num">${kmFmt(l.km)}</td></tr>`).join('')}
        <tr><td colspan="4"><b>Order Route ${d.route || '-'} · Total KM</b></td><td class="num"><b>${kmFmt(d.totalKm)}</b></td></tr></table>
      <h4 class="sa-h4">PO &amp; Cost</h4>
      <div class="ta-info"><div><b>PO Number</b>${d.poNo || '-'}</div><div><b>PO Validity</b>${d.poFrom ? `${d.poFrom} - ${d.poTo}` : '-'}</div><div><b>PO Status</b>${d.poStatus || '-'}</div>
        <div><b>Rate / KM</b>${money(d.rate)} ${d.currency}</div><div style="grid-column:span 2"><b>Calculation</b>${d.formula || '-'}</div><div><b>Delivery Cost</b>${money(d.cost)} ${d.currency}</div></div>
      <h4 class="sa-h4">Validation</h4>
      ${d.errors.length ? `<ul class="sa-err">${d.errors.map(x => `<li><b>${x.label}</b> - ${esc(x.msg)}</li>`).join('')}</ul>` : '<p class="q-note"><span class="st av">Ready</span> All checks passed.</p>'}`;
  }

  function confirmMonthly() {
    const ids = [...sa.sel], c = sa.mcalc, requestId = `SA-REQ-M-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    showPreview('Approve Service Acceptance - Monthly Truck', `<p>Approve the monthly truck cost of <b>${ids.length}</b> PO(s)? One SA Number is generated per PO. An approved monthly PO cannot be approved again.</p>
      <table class="sa-mini"><tr><th>Trucking Company</th><th>PO Number</th><th>Production Month</th><th>Monthly Cost</th></tr>
      ${ids.map(id => c[id]).map(r => `<tr><td>${r.lpCode} - ${esc(r.lpName)}</td><td>${r.poNo}</td><td>${r.period}</td><td class="num">${money(r.cost)} ${r.currency}</td></tr>`).join('')}</table>`,
      '<button class="btn-light" id="saCancel">Cancel</button><button class="btn-dark" id="saConfirm">Confirm Approve</button>');
    $('saCancel').onclick = closePreview;
    $('saConfirm').onclick = () => {
      $('saConfirm').disabled = true;
      const expected = Object.fromEntries(ids.map(id => [id, c[id].cost]));
      if (sa.sim === 'other') SA.approveMonthly({ requestId: `OTHER-${Date.now()}`, poNos: [ids[0]] }, { role: 'PLANNER', name: 'planner2 (other VPLD)' }, new Date(), ctx());
      let back = null;
      if (sa.sim === 'rate') { const po = MONTHLY_POS.find(p => p.poNo === ids[0]); back = [po, po.amount]; po.amount += 500000; }
      const res = SA.approveMonthly({ requestId, poNos: ids, expected }, state.actor, new Date(), ctx({ fail: ['header', 'detail', 'daily'].includes(sa.sim) ? sa.sim : '' }));
      if (back) back[0].amount = back[1];
      sa.sim = ''; persist(); result(res);
    };
  }
  function result(res) {
    if (res.ok) {
      sa.sel.clear();
      showPreview('SA Approved', `<p>${esc(res.message)}.</p><table class="sa-mini"><tr><th>SA Number</th><th>Trucking</th><th>PO Number</th><th>Deliveries</th><th>Total Cost</th></tr>
        ${res.sas.map(s => `<tr><td><b>${s.saNo}</b></td><td>${s.lpCode}</td><td>${s.poNo}</td><td class="num">${s.deliveries || '-'}</td><td class="num">${money(s.totalCost)} ${s.currency}</td></tr>`).join('')}</table>`,
        '<a class="btn-sm-blue" style="text-decoration:none" href="#sa-monitoring" id="saGoMon">Open SA Monitoring</a>');
      window.samChanged?.();
      $('saGoMon').onclick = closePreview;
      render(); window.render?.();
    } else {
      showPreview(`Approval failed (HTTP ${res.status})`, `<div class="dn-err"><b>${esc(res.message)}</b>${res.failed ? `<ul>${res.failed.map(f => `<li>${f.orderNo}: ${f.errors.map(x => `<b>${x.label}</b> ${esc(x.msg)}`).join('; ')}</li>`).join('')}</ul>` : ''}</div>`, '');
      render();
    }
  }
  function confirmApprove() {
    if (sa.tab === 'monthly') { confirmMonthly(); return; }
    const ids = [...sa.sel], c = sa.calc, groups = {};
    ids.forEach(id => { const r = c[id]; const k = `${r.lpCode}|${r.poNo}`; (groups[k] = groups[k] || { lp: r.lpCode, name: r.lpName, po: r.poNo, n: 0, km: 0, cost: 0, cur: r.currency }); const g = groups[k]; g.n++; g.km += r.totalKm; g.cost += r.cost; });
    const requestId = `SA-REQ-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    showPreview('Approve Service Acceptance', `<p>Approve <b>${ids.length}</b> delivery(ies)? One SA Number is generated per trucking company and PO. Approved deliveries cannot be approved again.</p>
      <table class="sa-mini"><tr><th>Trucking Company</th><th>PO Number</th><th>Deliveries</th><th>Total KM</th><th>Total Cost</th></tr>
      ${Object.values(groups).map(g => `<tr><td>${g.lp} - ${esc(g.name)}</td><td>${g.po}</td><td class="num">${g.n}</td><td class="num">${kmFmt(g.km)}</td><td class="num">${money(g.cost)} ${g.cur}</td></tr>`).join('')}</table>`,
      '<button class="btn-light" id="saCancel">Cancel</button><button class="btn-dark" id="saConfirm">Confirm Approve</button>');
    $('saCancel').onclick = closePreview;
    $('saConfirm').onclick = () => {
      $('saConfirm').disabled = true;
      const expected = Object.fromEntries(ids.map(id => [id, c[id].cost]));
      // demo simulations
      if (sa.sim === 'other') SA.approve({ requestId: `OTHER-${Date.now()}`, orderNos: [ids[0]] }, { role: 'PLANNER', name: 'planner2 (other VPLD)' }, new Date(), ctx());
      let rateBack = null;
      if (sa.sim === 'rate') { const po = POS.find(p => p.poNo === c[ids[0]].poNo); rateBack = [po, po.ratePerKm]; po.ratePerKm += 100; }
      const res = SA.approve({ requestId, orderNos: ids, expected }, state.actor, new Date(), ctx({ fail: ['header', 'detail', 'daily'].includes(sa.sim) ? sa.sim : '' }));
      if (rateBack) rateBack[0].ratePerKm = rateBack[1];
      sa.sim = '';
      persist(); result(res);
    };
  }

  // ---------- Events ----------
  $('saToggle').addEventListener('click', e => { e.preventDefault(); $('saSub').classList.toggle('collapsed'); });
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('#pgSA')) {
      if (t.id === 'saSearch') { sa.from = $('saFrom').value; sa.to = $('saTo').value; sa.page = 1; render(); }
      if (t.id === 'saClear') { Object.assign(sa, { from: lastMonth, to: today, q: '', page: 1 }); sa.sel.clear(); render(); }
      const tab = t.closest('[data-satab]'); if (tab) { if (sa.tab !== tab.dataset.satab) sa.sel.clear(); sa.tab = tab.dataset.satab; sa.page = 1; render(); }
      const md = t.closest('[data-samon]'); if (md) { const r = sa.mcalc[md.dataset.samon]; showPreview(`Monthly cost detail - ${r.poNo}`, monthlyDetail(r), ''); $('preview').querySelector('.pv').classList.add('dn-pv'); }
      const pg = t.closest('[data-sapg]'); if (pg && !pg.disabled) { sa.page += +pg.dataset.sapg; render(); }
      const det = t.closest('[data-sadet]'); if (det) { const o = DATA.find(x => x.orderNo === det.dataset.sadet); showPreview(`Calculation detail - ${o.orderNo}`, detailHtml(sa.calc[o.orderNo] || SA.calculate(o, ctx()), o), ''); $('preview').querySelector('.pv').classList.add('dn-pv'); }
      const od = t.closest('[data-saod]'); if (od) openDetail(od.dataset.saod);
      if (t.id === 'saApprove' && !t.disabled) confirmApprove();
      if (t.id === 'saKolom') { e.stopPropagation(); $('saKolomDd').classList.toggle('open'); }
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.sasel) { t.checked ? sa.sel.add(t.dataset.sasel) : sa.sel.delete(t.dataset.sasel); render(); }
    if (t.id === 'saAll') { const src = sa.tab === 'monthly' ? Object.values(sa.mcalc).filter(r => r.valid).map(r => r.poNo) : Object.values(sa.calc).filter(r => r.valid).map(r => r.orderNo); src.forEach(id => t.checked ? sa.sel.add(id) : sa.sel.delete(id)); render(); }
    if (t.id === 'saSim') sa.sim = t.value;
    if (t.id === 'saSize') { sa.size = +t.value; sa.page = 1; render(); }
    if (t.dataset.sacol) { t.checked ? sa.hidden.delete(t.dataset.sacol) : sa.hidden.add(t.dataset.sacol); render(); $('saKolomDd').classList.add('open'); }
  });
  document.addEventListener('input', e => {
    const keep = id => { const pos = e.target.selectionStart; return () => { $(id).focus(); $(id).setSelectionRange(pos, pos); }; };
    if (e.target.id === 'saQ') { sa.q = e.target.value; sa.page = 1; const k = keep('saQ'); render(); k(); }
  });
  document.addEventListener('actorchange', () => { sa.sel.clear(); render(); });

  window.saRender = render;
  window.SA_DATA = { POS, MONTHLY_POS, MILEAGE, LOC_CODE, SAS, SEQ, persist };
  render(); // route() of dtp.js ran before this file was loaded
})();
