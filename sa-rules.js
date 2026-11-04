// ELIPS TC-PBR Service Acceptance (SA) Approval rules. Pure logic (no DOM), used by sa.js and tests/sa-approval.test.js.
// Delivery -> Route -> Total KM -> Applicable PO -> PO Rate -> Delivery Cost -> VPLD approval -> SA Number.
// Rule IDs (SA-xx) match docs/sa-approval-spec.md.
(function (root) {
  const ERR = {
    NOT_ELIGIBLE: 'Not Eligible', ALREADY_SA: 'Already SA Approved', LP_CODE_MISSING: 'Trucking Company Code Not Found',
    ROUTE_NOT_FOUND: 'Route Not Found', KM_NOT_FOUND: 'Total KM Not Found', KM_INVALID: 'Invalid Total KM',
    PO_NOT_FOUND: 'PO Not Found', MULTI_PO: 'Multiple PO Found', PO_NOT_ACTIVE: 'PO Not Active',
    RATE_NOT_FOUND: 'Rate Not Found', RATE_INVALID: 'Invalid Rate', COST_FAILED: 'Cost Calculation Failed',
    COST_CHANGED: 'Cost Changed', NOT_FOUND: 'Delivery Not Found',
  };
  const PO_ACTIVE = ['Approved', 'Auto Approved'];
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const yymmdd = d => `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const e = (code, msg) => ({ code, label: ERR[code], msg });

  // SA-01 eligibility: finished by LP (Daily status Finish Daily Order) and no SA Number yet
  const eligible = (o, finStatus) => o.status === finStatus && !o.saNo;

  // SA-04 route of the delivery = location codes of the finished cycles (Cycle n: From -> To)
  function route(o, ctx) {
    const errors = [], legs = [];
    const cyc = o.cycles.filter(c => c.finishAt);
    if (!cyc.length) errors.push(e('ROUTE_NOT_FOUND', 'No finished cycle'));
    cyc.forEach((c, i) => {
      const from = ctx.locCode(c.from), to = ctx.locCode(c.to);
      if (!from) errors.push(e('ROUTE_NOT_FOUND', `Location "${c.from}" (cycle ${i + 1}) has no code in Master Location`));
      if (!to) errors.push(e('ROUTE_NOT_FOUND', `Location "${c.to}" (cycle ${i + 1}) has no code in Master Location`));
      legs.push({ cycle: i + 1, from, to, fromName: c.from, toName: c.to, container: c.container || '' });
    });
    const code = legs.length && legs.every(l => l.from && l.to) ? legs[0].from + legs.map(l => l.to).join('') : '';
    return { legs, code, errors };
  }

  // SA-05 Total KM = sum of Master Mileage of every leg (directional From -> To, status Active)
  function totalKm(legs, ctx) {
    const errors = [];
    let total = 0;
    legs.forEach(l => {
      if (!l.from || !l.to) return;
      const m = ctx.mileage(l.from, l.to);
      if (!m || m.status !== 'ACTIVE' || m.km == null) { errors.push(e('KM_NOT_FOUND', `Mileage ${l.from} -> ${l.to} not found / not active in Master Mileage`)); l.km = null; return; }
      if (!(m.km > 0)) errors.push(e('KM_INVALID', `Mileage ${l.from} -> ${l.to} is ${m.km} km (must be > 0)`));
      l.km = m.km; total += m.km;
    });
    if (!errors.length && legs.length && legs.every(l => l.from && l.to) && !(total > 0)) errors.push(e('KM_INVALID', `Total KM ${total} must be > 0`));
    const complete = legs.length && legs.every(l => l.from && l.to);
    return { total: errors.length || !complete ? null : Math.round(total * 100) / 100, errors };
  }

  // SA-06 PO mapping: TC-PBR PO of the trucking company whose validity period covers the delivery date
  function mapPO(lpCode, date, pos) {
    const cover = pos.filter(p => p.lpCode === lpCode && p.type === 'TC-PBR' && p.validFrom <= date && date <= p.validTo);
    if (!cover.length) return { po: null, errors: [e('PO_NOT_FOUND', `No TC-PBR PO for ${lpCode} valid on ${date}`)] };
    const active = cover.filter(p => PO_ACTIVE.includes(p.status));
    if (!active.length) return { po: null, errors: [e('PO_NOT_ACTIVE', `PO ${cover.map(p => `${p.poNo} (${p.status})`).join(', ')} is not approved`)] };
    if (active.length > 1) return { po: null, errors: [e('MULTI_PO', `More than one active PO: ${active.map(p => p.poNo).join(', ')}`)] };
    const po = active[0], errors = [];
    if (po.ratePerKm == null) errors.push(e('RATE_NOT_FOUND', `PO ${po.poNo} has no rate per KM`));
    else if (!(po.ratePerKm > 0)) errors.push(e('RATE_INVALID', `PO ${po.poNo} rate ${po.ratePerKm} must be > 0`));
    return { po, errors };
  }

  // SA-07 cost = Total KM x PO rate per KM, rounded to whole currency unit (rounding rule TBD)
  function calculate(o, ctx) {
    const errors = [];
    if (o.saNo) errors.push(e('ALREADY_SA', `Already approved in ${o.saNo}`));
    else if (!eligible(o, ctx.finStatus)) errors.push(e('NOT_ELIGIBLE', `Status ${o.status}`));
    const lpCode = ctx.lpCode(o);
    if (!lpCode) errors.push(e('LP_CODE_MISSING', `No code for ${o.supplier}`));
    const r = route(o, ctx); errors.push(...r.errors);
    const k = totalKm(r.legs, ctx); errors.push(...k.errors);
    const m = lpCode ? mapPO(lpCode, o.date, ctx.pos) : { po: null, errors: [] }; errors.push(...m.errors);
    const po = m.po;
    let cost = null;
    if (k.total != null && po && po.ratePerKm > 0) {
      cost = Math.round(k.total * po.ratePerKm);
      if (!Number.isFinite(cost) || cost <= 0) { errors.push(e('COST_FAILED', `Cost ${cost}`)); cost = null; }
    }
    return {
      orderNo: o.orderNo, date: o.date, lpCode, lpName: o.supplier, route: r.code, legs: r.legs, totalKm: k.total,
      poNo: po?.poNo || '', poFrom: po?.validFrom || '', poTo: po?.validTo || '', poStatus: po?.status || '',
      rate: po?.ratePerKm ?? null, currency: po?.currency || '', cost,
      formula: cost != null ? `${k.total} km x ${po.ratePerKm} ${po.currency}/km = ${cost}` : '',
      errors, valid: !errors.length,
    };
  }

  // SA-10 SA Number ILS/TR/{LP code}/{YYMMDD}{4-digit sequence}. Scope of the sequence is configurable (TBD):
  // 'LP_DATE' = per trucking company per date (default, proposed), 'DATE' = global per date.
  function saNumber(lpCode, at, n) { return `ILS/TR/${lpCode}/${yymmdd(at)}${pad(n, 4)}`; }
  const seqKey = (scope, lpCode, at) => scope === 'DATE' ? yymmdd(at) : `${lpCode}|${yymmdd(at)}`;

  // ---------- Approval (SA-08 .. SA-14) ----------
  // req: { requestId, orderNos[], expected: { orderNo: cost } }; ctx: { orders, ...calc ctx, sas[], seq{}, requests{},
  //   scope, canApprove(actor), commitOrder(o, saNo, at, actor), fail: '' | 'header' | 'detail' | 'daily' }
  function approve(req, actor, at, ctx) {
    if (!ctx.canApprove(actor)) return { ok: false, status: 403, message: 'Only VPLD users may approve Service Acceptance' };
    if (req.requestId && ctx.requests[req.requestId]) return Object.assign({}, ctx.requests[req.requestId], { replay: true });
    const ids = [...new Set(req.orderNos || [])];
    if (!ids.length) return { ok: false, status: 400, message: 'No delivery selected' };
    const failed = [], calcs = [];
    ids.forEach(id => {
      const o = ctx.orders.find(x => x.orderNo === id);
      if (!o) { failed.push({ orderNo: id, errors: [e('NOT_FOUND', id)] }); return; }
      const c = calculate(o, ctx);
      const exp = req.expected?.[id];
      if (c.valid && exp != null && exp !== c.cost) c.errors.push(e('COST_CHANGED', `Cost on screen ${exp}, recalculated ${c.cost}. Refresh and check again`));
      if (c.errors.length) failed.push({ orderNo: id, errors: c.errors }); else calcs.push({ o, c });
    });
    // SA-12 all-or-nothing: one invalid delivery rejects the whole request (nothing saved)
    if (failed.length) return { ok: false, status: 422, message: `${failed.length} of ${ids.length} delivery(ies) failed revalidation. Nothing was approved.`, failed };
    // One SA per trucking company + PO in this request
    const groups = {};
    calcs.forEach(x => { const k = `${x.c.lpCode}|${x.c.poNo}`; (groups[k] = groups[k] || []).push(x); });
    const seq = Object.assign({}, ctx.seq), headers = [];
    try {
      Object.values(groups).forEach(g => {
        const c0 = g[0].c, key = seqKey(ctx.scope, c0.lpCode, at), n = (seq[key] || 0) + 1;
        if (n > 9999) throw new Error(`SA sequence for ${key} exceeds 9999`);
        seq[key] = n;
        const saNo = saNumber(c0.lpCode, at, n);
        if (ctx.sas.some(s => s.saNo === saNo)) throw new Error(`SA Number ${saNo} already exists`);
        headers.push({
          saNo, lpCode: c0.lpCode, lpName: c0.lpName, poNo: c0.poNo, poFrom: c0.poFrom, poTo: c0.poTo, currency: c0.currency,
          deliveries: g.length, totalKm: Math.round(g.reduce((s, x) => s + x.c.totalKm, 0) * 100) / 100, totalCost: g.reduce((s, x) => s + x.c.cost, 0),
          status: 'SA Approved', approvedBy: actor.name, approvedRole: actor.role, approvedAt: at, createdAt: at, requestId: req.requestId || '',
          details: g.map(x => ({ ...x.c, calcAt: at })),
          audit: [{ at, by: actor.name, action: 'SA Approved', note: `${g.length} delivery(ies), request ${req.requestId || '-'}` }],
        });
      });
      if (ctx.fail === 'header') throw new Error('SA header insert failed (simulated)');
      if (ctx.fail === 'detail') throw new Error('SA detail insert failed (simulated)');
      if (ctx.fail === 'daily') throw new Error('Daily Monitoring update failed (simulated)');
    } catch (err) {
      return { ok: false, status: 500, message: `${err.message}. Transaction rolled back, nothing was approved.` };
    }
    // commit (one transaction in the backend)
    headers.forEach(h => { ctx.sas.push(h); h.details.forEach(d => ctx.commitOrder(ctx.orders.find(o => o.orderNo === d.orderNo), h.saNo, at, actor)); });
    Object.assign(ctx.seq, seq);
    const res = { ok: true, status: 200, message: `${headers.length} SA generated for ${calcs.length} delivery(ies)`, sas: headers.map(h => ({ saNo: h.saNo, lpCode: h.lpCode, poNo: h.poNo, deliveries: h.deliveries, totalCost: h.totalCost, currency: h.currency })) };
    if (req.requestId) ctx.requests[req.requestId] = res;
    return res;
  }

  const api = { ERR, PO_ACTIVE, ymd, yymmdd, eligible, route, totalKm, mapPO, calculate, saNumber, seqKey, approve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SA = api;
})(typeof window !== 'undefined' ? window : this);
