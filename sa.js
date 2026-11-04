// ELIPS TC-PBR Service Acceptance: SA Approval (VPLD) and SA Monitoring. Rules in sa-rules.js (window.SA).
// Uses the Daily Monitoring data (DATA, W, state ...) of app.js. Spec: docs/sa-approval-spec.md.
(function () {
  const STORE = 'elips-sa-v1';
  const money = n => n == null ? '-' : Number(n).toLocaleString('en-US');
  const kmFmt = n => n == null ? '-' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const lpCodeOf = name => (SUPPLIERS.find(s => s[0] === name) || [])[1] || '';
  const monthStart = ym => `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`;
  const monthEnd = ym => { const d = new Date(+ym.slice(0, 4), +ym.slice(4, 6), 0); return SA.ymd(d); };
  const isVPLD = () => state.actor.role === 'PLANNER';
  const canSeeApproval = () => ['PLANNER', 'IP_ADMIN'].includes(state.actor.role);

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

  // ---------- SA store ----------
  const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } })();
  const SAS = [], SEQ = {}, REQUESTS = {};
  const persist = () => { try { localStorage.setItem(STORE, JSON.stringify({ sas: SAS.filter(s => !s.legacy), seq: SEQ, requests: REQUESTS })); } catch (e) { /* storage not available */ } };
  const ctx = (extra = {}) => Object.assign({
    orders: DATA, finStatus: W.ORDER.FIN, lpCode: o => lpCodeOf(o.supplier), locCode: n => LOC_CODE[n] || '', mileage: (f, t) => MILEAGE[`${f}>${t}`] || null,
    pos: POS, sas: SAS, seq: SEQ, requests: REQUESTS, scope: 'LP_DATE', canApprove: a => a.role === 'PLANNER',
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
      const details = g.map(o => { const d = SA.calculate(o, c); d.errors = d.errors.filter(x => x.code !== 'NOT_ELIGIBLE'); return { ...d, calcAt: at }; });
      g.forEach(o => { o.saNo = saNo; });
      SAS.push({ saNo, lpCode: lp, lpName: g[0].supplier, poNo: details.find(d => d.poNo)?.poNo || '-', poFrom: details[0].poFrom, poTo: details[0].poTo, currency: 'IDR',
        deliveries: g.length, totalKm: details.every(d => d.totalKm != null) ? details.reduce((s, d) => s + d.totalKm, 0) : null,
        totalCost: details.every(d => d.cost != null) ? details.reduce((s, d) => s + d.cost, 0) : null,
        status: g.some(o => o.status === W.ORDER.PO) ? 'SA Approved with PO Number' : 'SA Approved', approvedBy: 'Batch SA/PAS', approvedRole: 'SYSTEM', approvedAt: at, createdAt: at,
        legacy: true, details, audit: [{ at, by: 'Batch SA/PAS', action: 'SA Approved (legacy, before TC-PBR SA Approval)', note: '' }] });
    });
  })();
  // Approvals made in this browser (mock persistence): re-apply them to the regenerated Daily data
  if (saved) {
    Object.assign(SEQ, saved.seq); Object.assign(REQUESTS, saved.requests);
    saved.sas.forEach(s => {
      revive(s); SAS.push(s);
      s.details.forEach(d => { const o = DATA.find(x => x.orderNo === d.orderNo); if (o && !o.saNo && o.status === W.ORDER.FIN) W.perform(o, 'saApprove', { saNo: s.saNo }, { role: 'PLANNER', name: s.approvedBy }, s.approvedAt, CTX); });
    });
  }

  // ---------- SA Approval ----------
  const today = SA.ymd(new Date());
  const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1, 1); return SA.ymd(d); })();
  const sa = { from: lastMonth, to: today, q: '', tab: 'regular', sel: new Set(), page: 1, size: 10, sim: '', hidden: new Set(['service']), calc: {} };
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
  function cycleCells(o, r) {
    return [0, 1, 2, 3, 4].map(i => {
      const l = r.legs[i], svc = `<td${hid('service')}>-</td>`;
      if (!l) return `${svc}<td>-</td>`;
      return `${svc}<td class="sa-cyc">${l.from || '?'}-${l.to || '?'}${l.container ? ` <small>[${l.container}]</small>` : ''}</td>`;
    }).join('');
  }
  function render() {
    const root = $('saRoot'); if (!root || $('pgSA').style.display === 'none') return;
    if (!canSeeApproval()) { root.innerHTML = `<section class="cal-card"><p class="q-note">SA Approval is only available for VPLD (approve) and IP Admin (view). Login: ${esc(W.roleLabel(state.actor))}.</p></section>`; return; }
    const all = sa.tab === 'regular' ? rows() : [];
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
      <div class="sa-tabs"><button data-satab="regular" class="${sa.tab === 'regular' ? 'on' : ''}">Regular Trip</button><button data-satab="inter" class="${sa.tab === 'inter' ? 'on' : ''}">Inter Plant Trip</button></div>
      <div class="sa-card">
        <div class="sa-card-h">&#9745; Order List <span class="q-note">${vp ? 'VPLD: select valid deliveries and Approve.' : `<span class="ro-chip">${esc(W.roleLabel(state.actor))}: view only. Approve is for VPLD.</span>`}</span></div>
        <div class="sa-bar">
          <label class="selall"><input type="checkbox" id="saAll" ${vp && valid.length ? '' : 'disabled'} ${valid.length && valid.every(x => sa.sel.has(x.o.orderNo)) ? 'checked' : ''}><span><b>Select All</b><small>${sa.sel.size} Item selected</small></span></label>
          <button class="btn-dark" id="saApprove" ${vp && sa.sel.size ? '' : 'disabled'}>&#128190; Approve</button>
          ${vp ? `<select id="saSim" title="Demo"><option value="">Demo: normal</option><option value="other" ${sa.sim === 'other' ? 'selected' : ''}>Demo: other user approves 1st selected first</option>
            <option value="rate" ${sa.sim === 'rate' ? 'selected' : ''}>Demo: PO rate changes after display</option><option value="header" ${sa.sim === 'header' ? 'selected' : ''}>Demo: SA header insert fails</option>
            <option value="detail" ${sa.sim === 'detail' ? 'selected' : ''}>Demo: SA detail insert fails</option><option value="daily" ${sa.sim === 'daily' ? 'selected' : ''}>Demo: Daily Monitoring update fails</option></select>` : ''}
          <span class="spacer"></span>
          <span class="q-note">${valid.length} ready · ${all.length - valid.length} with issue</span>
          <div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="text" id="saQ" placeholder="Search" value="${esc(sa.q)}"></div>
          <div class="dd" id="saKolomDd"><button class="btn-blue" id="saKolom">Kolom &#9662;</button><div class="dd-menu">${COLS.map(([k, l]) => `<label><input type="checkbox" data-sacol="${k}" ${sa.hidden.has(k) ? '' : 'checked'}> ${l}</label>`).join('')}</div></div>
        </div>
        ${sa.tab === 'inter' ? '<p class="q-note sa-empty">Inter Plant Trip: selection rule not defined yet (TBD, see open questions).</p>' : ''}
        <div class="table-wrap"><table class="sa-tbl"><thead>
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
            <td class="sa-route"${hid('route')}>${r.route || '-'}</td>${sa.hidden.has('cycles') ? '' : cycleCells(o, r)}</tr>`).join('') || `<tr><td colspan="30" class="empty">No Data Found</td></tr>`}</tbody></table></div>
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

  function confirmApprove() {
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
      persist();
      if (res.ok) {
        sa.sel.clear();
        showPreview('SA Approved', `<p>${esc(res.message)}.</p><table class="sa-mini"><tr><th>SA Number</th><th>Trucking</th><th>PO Number</th><th>Deliveries</th><th>Total Cost</th></tr>
          ${res.sas.map(s => `<tr><td><b>${s.saNo}</b></td><td>${s.lpCode}</td><td>${s.poNo}</td><td class="num">${s.deliveries}</td><td class="num">${money(s.totalCost)} ${s.currency}</td></tr>`).join('')}</table>`,
          '<a class="btn-sm-blue" style="text-decoration:none" href="#sa-monitoring" id="saGoMon">Open SA Monitoring</a>');
        $('saGoMon').onclick = closePreview;
        render(); window.render?.();
      } else {
        showPreview(`Approval failed (HTTP ${res.status})`, `<div class="dn-err"><b>${esc(res.message)}</b>${res.failed ? `<ul>${res.failed.map(f => `<li>${f.orderNo}: ${f.errors.map(x => `<b>${x.label}</b> ${esc(x.msg)}`).join('; ')}</li>`).join('')}</ul>` : ''}</div>`, '');
        render();
      }
    };
  }

  // ---------- SA Monitoring ----------
  const sm = { from: lastMonth, to: today, lp: '', q: '', page: 1 };
  const samVisible = s => state.actor.role === 'SUPPLIER' ? s.lpCode === lpCodeOf(state.actor.supplier) : ['PLANNER', 'IP_ADMIN'].includes(state.actor.role);
  function samRender() {
    const root = $('samRoot'); if (!root || $('pgSAM').style.display === 'none') return;
    if (state.actor.role === 'DRIVER') { root.innerHTML = '<section class="cal-card"><p class="q-note">SA Monitoring is not available for Driver.</p></section>'; return; }
    const q = sm.q.trim().toLowerCase();
    const list = SAS.filter(samVisible).filter(s => { const d = SA.ymd(s.approvedAt); return (!sm.from || d >= sm.from) && (!sm.to || d <= sm.to) && (!sm.lp || s.lpCode === sm.lp)
      && (!q || [s.saNo, s.lpCode, s.lpName, s.poNo, s.approvedBy, ...s.details.map(x => x.orderNo)].join(' ').toLowerCase().includes(q)); })
      .sort((a, b) => b.approvedAt - a.approvedAt);
    const pages = Math.max(1, Math.ceil(list.length / 10)); sm.page = Math.min(sm.page, pages);
    root.innerHTML = `<section class="cal-card">
      <div class="sa-filter">
        <div><label for="smFrom">Approval Date From</label><input type="date" id="smFrom" value="${sm.from}"></div>
        <div><label for="smTo">Approval Date To</label><input type="date" id="smTo" value="${sm.to}"></div>
        <div><label for="smLp">Trucking Company</label><select id="smLp"><option value="">All</option>${SUPPLIERS.map(([n, c]) => `<option value="${c}" ${sm.lp === c ? 'selected' : ''}>${c} - ${n}</option>`).join('')}</select></div>
        <button class="btn-dark" id="smSearch">&#128269; Search</button><button class="btn-light" id="smClear">&#8635; Clear</button>
        <span class="spacer"></span><div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="text" id="smQ" placeholder="Search SA / PO / Order" value="${esc(sm.q)}"></div>
      </div>
      <div class="table-wrap"><table class="sa-tbl"><thead><tr><th>SA Number</th><th>Approval Date</th><th>Approved By</th><th>Trucking Code</th><th>Trucking Company</th><th>Deliveries</th><th>PO Number</th><th>PO Validity</th><th>Total KM</th><th>Total Cost</th><th>Currency</th><th>SA Status</th></tr></thead>
      <tbody>${list.slice((sm.page - 1) * 10, sm.page * 10).map(s => `<tr><td><button class="link" data-samdet="${s.saNo}">${s.saNo}</button>${s.legacy ? ' <small class="q-note">legacy</small>' : ''}</td>
        <td>${fmtDT(s.approvedAt)}</td><td>${esc(s.approvedBy)}</td><td>${s.lpCode}</td><td class="left">${esc(s.lpName)}</td><td class="num">${s.deliveries}</td><td>${s.poNo}</td>
        <td>${s.poFrom ? `${s.poFrom} - ${s.poTo}` : '-'}</td><td class="num">${kmFmt(s.totalKm)}</td><td class="num sa-price">${money(s.totalCost)}</td><td>${s.currency}</td><td><span class="st av">${s.status}</span></td></tr>`).join('') || '<tr><td colspan="12" class="empty">No Data Found</td></tr>'}</tbody></table></div>
      <div class="dn-pager"><span class="q-note">${list.length} SA</span><span class="spacer"></span><button class="btn-light" data-smpg="-1" ${sm.page === 1 ? 'disabled' : ''}>&lsaquo; Prev</button><span class="q-note">Page ${sm.page} / ${pages}</span><button class="btn-light" data-smpg="1" ${sm.page === pages ? 'disabled' : ''}>Next &rsaquo;</button></div>
    </section>`;
  }
  function samDetail(saNo) {
    const s = SAS.find(x => x.saNo === saNo);
    showPreview(`SA ${s.saNo}`, `<div class="ta-info"><div><b>Trucking Company</b>${s.lpCode} - ${esc(s.lpName)}</div><div><b>PO Number</b>${s.poNo}</div><div><b>PO Validity</b>${s.poFrom ? `${s.poFrom} - ${s.poTo}` : '-'}</div><div><b>SA Status</b>${s.status}</div>
        <div><b>Approved By</b>${esc(s.approvedBy)}</div><div><b>Approval Date</b>${fmtDT(s.approvedAt)}</div><div><b>Total KM</b>${kmFmt(s.totalKm)}</div><div><b>Total Cost</b>${money(s.totalCost)} ${s.currency}</div></div>
      <h4 class="sa-h4">Deliveries (calculation snapshot at approval)</h4>
      <table class="sa-mini"><tr><th>Order Number</th><th>Order Date</th><th>Route</th><th>Total KM</th><th>Rate / KM</th><th>Cost</th></tr>
        ${s.details.map(d => `<tr><td>${d.orderNo}</td><td>${d.date}</td><td>${d.route || '-'}</td><td class="num">${kmFmt(d.totalKm)}</td><td class="num">${money(d.rate)}</td><td class="num">${money(d.cost)}</td></tr>`).join('')}</table>
      <h4 class="sa-h4">Audit</h4><table class="sa-mini"><tr><th>Date-time</th><th>By</th><th>Action</th><th>Note</th></tr>${s.audit.map(a => `<tr><td>${fmtDT(a.at)}</td><td>${esc(a.by)}</td><td>${esc(a.action)}</td><td>${esc(a.note)}</td></tr>`).join('')}</table>`, '');
    $('preview').querySelector('.pv').classList.add('dn-pv');
  }

  // ---------- Events ----------
  $('saToggle').addEventListener('click', e => { e.preventDefault(); $('saSub').classList.toggle('collapsed'); });
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('#pgSA')) {
      if (t.id === 'saSearch') { sa.from = $('saFrom').value; sa.to = $('saTo').value; sa.page = 1; render(); }
      if (t.id === 'saClear') { Object.assign(sa, { from: lastMonth, to: today, q: '', page: 1 }); sa.sel.clear(); render(); }
      const tab = t.closest('[data-satab]'); if (tab) { sa.tab = tab.dataset.satab; sa.page = 1; render(); }
      const pg = t.closest('[data-sapg]'); if (pg && !pg.disabled) { sa.page += +pg.dataset.sapg; render(); }
      const det = t.closest('[data-sadet]'); if (det) { const o = DATA.find(x => x.orderNo === det.dataset.sadet); showPreview(`Calculation detail - ${o.orderNo}`, detailHtml(sa.calc[o.orderNo] || SA.calculate(o, ctx()), o), ''); $('preview').querySelector('.pv').classList.add('dn-pv'); }
      const od = t.closest('[data-saod]'); if (od) openDetail(od.dataset.saod);
      if (t.id === 'saApprove' && !t.disabled) confirmApprove();
      if (t.id === 'saKolom') { e.stopPropagation(); $('saKolomDd').classList.toggle('open'); }
    }
    if (t.closest('#pgSAM')) {
      if (t.id === 'smSearch') { sm.from = $('smFrom').value; sm.to = $('smTo').value; sm.lp = $('smLp').value; sm.page = 1; samRender(); }
      if (t.id === 'smClear') { Object.assign(sm, { from: lastMonth, to: today, lp: '', q: '', page: 1 }); samRender(); }
      const pg = t.closest('[data-smpg]'); if (pg && !pg.disabled) { sm.page += +pg.dataset.smpg; samRender(); }
      const d = t.closest('[data-samdet]'); if (d) samDetail(d.dataset.samdet);
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.sasel) { t.checked ? sa.sel.add(t.dataset.sasel) : sa.sel.delete(t.dataset.sasel); render(); }
    if (t.id === 'saAll') { Object.values(sa.calc).filter(r => r.valid).forEach(r => t.checked ? sa.sel.add(r.orderNo) : sa.sel.delete(r.orderNo)); render(); }
    if (t.id === 'saSim') sa.sim = t.value;
    if (t.id === 'saSize') { sa.size = +t.value; sa.page = 1; render(); }
    if (t.dataset.sacol) { t.checked ? sa.hidden.delete(t.dataset.sacol) : sa.hidden.add(t.dataset.sacol); render(); $('saKolomDd').classList.add('open'); }
  });
  document.addEventListener('input', e => {
    const keep = id => { const pos = e.target.selectionStart; return () => { $(id).focus(); $(id).setSelectionRange(pos, pos); }; };
    if (e.target.id === 'saQ') { sa.q = e.target.value; sa.page = 1; const k = keep('saQ'); render(); k(); }
    if (e.target.id === 'smQ') { sm.q = e.target.value; sm.page = 1; const k = keep('smQ'); samRender(); k(); }
  });
  document.addEventListener('actorchange', () => { sa.sel.clear(); render(); samRender(); });

  window.saRender = render;
  window.samRender = samRender;
  window.SA_DATA = { POS, MILEAGE, LOC_CODE, SAS };
  render(); samRender(); // route() of dtp.js ran before this file was loaded
})();
