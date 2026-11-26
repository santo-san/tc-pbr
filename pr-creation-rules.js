// ELIPS PR Creation: route-based PR for LP operations, submitted as one approval bundle per operational month.
// Reuses the existing rules: approval levels from monthly-workflow.js, eCatalogue price lookup (master-price.js priceForPR),
// active routes / percentage / distance of Master Route Percentage, Order Sharing from Master KPI as daily QTY.
// Revision 26-Nov-26 (user review): no PR Creation Type / Logistics Partner on screen, buttons Create PR (calculate) and
// Submit PR (to approval), bundle approval (all trucking companies together, one PR Sequence), new cost formulas.
// Pure logic (no DOM) so it can be tested with Node.
(function (root) {
  const TYPE = { FIX: 'FIX', ROUTE: 'ROUTE' };   // FIX kept only to display PRs created before the revision
  const TYPE_LABEL = { FIX: 'Monthly PR - Fixed Cost', ROUTE: 'Route-Based PR for LP Operations' };
  const routeComponent = code => `ROUTE:${code}`;

  const MSG = {
    monthReq: 'Operational Month is required.',
    noAuth: 'You are not authorized to create PR. PR Creation is available to VPLD Staff and VPLD Section Head.',
    paramMissing: 'System Master parameter "Allow PR creation in current operational month" is not configured. Please contact the system administrator.',
    currentNotAllowed: ym => `PR for the current operational month (${ym}) cannot be created: not allowed by System Master. PR is created in Month N-1 for Month N.`,
    past: ym => `Operational Month ${ym} has already passed. PR cannot be created.`,
    tooFar: (ym, next) => `PR for Operational Month ${ym} cannot be created yet. PR is created in Month N-1: the next operational month is ${next}.`,
    noCalendar: ym => `TMMIN Calendar (working days) for ${ym} is not available. Please maintain the TMMIN Calendar first.`,
    noRoutes: 'No active Route Percentage data. Please maintain Master Route Percentage first.',
    noSharing: p => `No Order Sharing for ${p} in Master KPI (By Resources). Route-based PR cannot be calculated.`,
    noOrders: p => `No orders are planned for ${p} in this month (Order Sharing = 0).`,
    dupRoutes: (p, prNos) => `All planned routes of ${p} for this operational month are already included in PR ${prNos}.`,
    badAmount: p => `Calculated PR amount for ${p} is not valid (must be greater than 0). Please check the price and planning data.`,
    abnormal: n => `Submit PR is not possible: ${n} trucking company(ies) have an abnormality (see Status). Please correct the data first.`,
    nothing: 'There is no trucking company with new routes to submit for this operational month.',
    seqTaken: (ym, seq) => `PR Sequence ${seq} for ${ym} already exists. Please click Create PR again.`,
    submitted: (ym, seq, n, nos) => `PR bundle ${ym} sequence ${seq} submitted: ${n} PR (${nos}).`,
  };

  // ---------- Month helpers (YYYY-MM) ----------
  const ymOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  function ymAdd(ym, n) {
    const [y, m] = ym.split('-').map(Number), d = new Date(y, m - 1 + n, 1);
    return ymOf(d);
  }
  const period = ym => ym.replace('-', '');   // eCatalogue period YYYYMM
  const round2 = v => Math.round(v * 100) / 100;

  // ---------- Header validation, authorization and creation period ----------
  // PC-01: Operational Month is the only parameter
  function validateHeader({ ym }) { return ym ? {} : { ym: MSG.monthReq }; }
  // PC-02: roles allowed to create PR come from the authorization configuration (System Master)
  const canCreate = (actor, creators) => creators.some(c => c.role === actor.role && (!c.level || c.level === actor.level) && (!c.division || c.division === actor.division));

  // PC-03: PR is created in Month N-1 for Month N. Month N itself depends on the System Master parameter (read in the
  // background, not shown on the screen; no default is assumed).
  function periodCheck(ym, today, allowCurrent) {
    const cur = ymOf(today), next = ymAdd(cur, 1);
    if (ym === next) return { ok: true, rule: 'N-1' };
    if (ym === cur) {
      if (allowCurrent !== true && allowCurrent !== false) return { ok: false, error: MSG.paramMissing };
      return allowCurrent ? { ok: true, rule: 'N' } : { ok: false, error: MSG.currentNotAllowed(ym) };
    }
    return { ok: false, error: ym < cur ? MSG.past(ym) : MSG.tooFar(ym, next) };
  }

  // ---------- Sequence and cost components ----------
  // Rejected / Returned PRs go back to PR Creation, so their components may be created again
  const counts = (pr, prStatus) => !['Rejected', 'Returned'].includes(prStatus(pr));
  const prsOf = (prs, partner, ym) => prs.filter(p => p.supplierCode === partner && p.ym === ym);
  // PC-07: one PR Sequence per operational month for the whole bundle (all statuses, numbers are never reused)
  const nextSequence = (prs, ym) => prs.filter(p => p.ym === ym).reduce((m, p) => Math.max(m, p.rev), 0) + 1;
  const bundleId = (ym, seq) => `${ym}#${seq}`;
  function usedComponents(prs, partner, ym, prStatus) {
    const used = new Map();   // component -> PR number
    prsOf(prs, partner, ym).filter(p => counts(p, prStatus)).forEach(p => (p.components || []).forEach(c => used.set(c, p.prNo)));
    return used;
  }
  // The first PR of the partner and month; PRs of later sequences refer to it
  const initialPr = (prs, partner, ym) => prsOf(prs, partner, ym).sort((a, b) => a.rev - b.rev)[0] || null;

  // ---------- Calculation (one List Summary row per trucking company) ----------
  // Detail per active route of Master Route Percentage:
  //   Number of Orders (per day) = Order Sharing (daily QTY) x Route % / total active Route %
  //   Planned Cost              = Distance (Km) x Mileage Cost (IDR/Km)
  //   Total Cost                = Planned Cost x Number of Orders   (TBD, OP-4)
  // Delivery Cost (IDR/Day) = sum of Total Cost; Monthly Delivery Cost = Delivery Cost x Working Days
  function routeLines({ dailyOrders, routes, priceKm }) {
    const totalPct = routes.reduce((s, r) => s + r.percentage, 0);
    return routes.map(r => {
      const orders = totalPct ? round2(dailyOrders * r.percentage / totalPct) : 0, planned = r.distance * priceKm;
      return { code: r.code, description: r.description, percentage: r.percentage, distance: r.distance, orders, priceKm, planned, cost: Math.round(planned * orders) };
    });
  }
  function calculate(partner, ym, src) {
    const per = period(ym), row = { partner, ym, errors: {} };
    row.workingDays = src.workingDays(ym);
    const fix = src.price(partner, 'FIX', per), km = src.price(partner, 'KM', per);
    row.fixed = fix.ok ? fix.price : null; row.fixedNote = fix.ok ? '' : fix.error;   // information only (OP-6)
    row.mileage = km.ok ? km.price : null;
    if (!km.ok) row.errors.km = km.error;
    row.dailyOrders = src.orderSharing(partner);
    const routes = src.routes();
    if (row.workingDays == null) row.errors.calendar = MSG.noCalendar(ym);
    if (!routes.length) row.errors.routes = MSG.noRoutes;
    if (row.dailyOrders == null) row.errors.sharing = MSG.noSharing(partner);
    else if (!(row.dailyOrders > 0)) row.errors.orders = MSG.noOrders(partner);
    if (routes.length && row.dailyOrders > 0 && km.ok) {
      row.lines = routeLines({ dailyOrders: row.dailyOrders, routes, priceKm: km.price });
      row.perDay = row.lines.reduce((s, l) => s + l.cost, 0);
    } else Object.assign(row, { lines: [], perDay: null });
    row.monthlyTotal = row.perDay != null && row.workingDays != null ? row.perDay * row.workingDays : null;
    if (row.monthlyTotal != null && !(row.monthlyTotal > 0)) row.errors.amount = MSG.badAmount(partner);
    return row;
  }
  // Abnormality of the row (Status column; OP-2): the first data error, or null
  const ABNORMAL = ['calendar', 'routes', 'sharing', 'orders', 'km', 'amount'];
  const abnormality = row => ABNORMAL.map(k => row.errors[k]).find(Boolean) || null;

  // ---------- Bundle ----------
  // What the trucking company contributes to the bundle: new routes (not yet in an active PR of the month), amount
  function prepare(row, prs, prStatus, seq) {
    const p = row.partner, base = { seq, parent: initialPr(prs, p, row.ym)?.prNo || null };
    const ab = abnormality(row);
    if (ab) return { ...base, ok: false, abnormal: true, error: ab };
    const used = usedComponents(prs, p, row.ym, prStatus);
    const planned = row.lines.filter(l => l.orders > 0), fresh = planned.filter(l => !used.has(routeComponent(l.code)));
    if (!fresh.length) return { ...base, ok: false, included: true, error: MSG.dupRoutes(p, [...new Set(planned.map(l => used.get(routeComponent(l.code))))].join(', ')) };
    const perDay = fresh.reduce((s, l) => s + l.cost, 0), amount = perDay * row.workingDays;
    if (!(amount > 0)) return { ...base, ok: false, abnormal: true, error: MSG.badAmount(p) };
    return { ...base, ok: true, components: fresh.map(l => routeComponent(l.code)), lines: fresh, perDay, amount,
      qty: Math.round(fresh.reduce((s, l) => s + l.orders, 0) * row.workingDays), skipped: planned.length - fresh.length };
  }
  // PC-07 / PC-12: the whole operational month in one bundle; Submit only when no trucking company is abnormal
  function planBundle(rows, prs, prStatus) {
    const ym = rows[0]?.ym, seq = ym ? nextSequence(prs, ym) : 1;
    const items = rows.map(row => ({ row, prep: prepare(row, prs, prStatus, seq) }));
    const abnormal = items.filter(i => i.prep.abnormal), members = items.filter(i => i.prep.ok);
    const error = abnormal.length ? MSG.abnormal(abnormal.length) : !members.length ? MSG.nothing : null;
    return { ym, seq, items, abnormal, members, total: members.reduce((s, i) => s + i.prep.amount, 0), canSubmit: !error, error };
  }

  // ---------- Approval ----------
  // Levels come from the workflow configuration. Levels up to the creator's own level are skipped
  // (e.g. a PR submitted by the Section Head starts at the next level).
  function initialApproval(actor, wf, at) {
    const a = wf.newApproval(), i = actor.level ? wf.LEVELS.indexOf(actor.level) : -1;
    const skipped = i >= 0 ? wf.LEVELS.slice(0, i + 1) : [];
    skipped.forEach(l => Object.assign(a[l], { status: wf.AP.SKIP, at }));
    return { approval: a, skipped };
  }

  // Builds the PR record of one trucking company in the existing PR structure (prNo, ym, rev = PR sequence, prodMonth, approval, history)
  function buildPR({ prep, row, actor, at, prNo, supplierName, shareTotal, wf, bundle, bundleSize }) {
    const [y, m] = row.ym.split('-');
    const { approval, skipped } = initialApproval(actor, wf, at);
    const pr = {
      prNo, ym: row.ym, rev: prep.seq, prodMonth: `${m}/${y}-${prep.seq}`, supplierCode: row.partner, supplierName,
      type: TYPE.ROUTE, components: prep.components, parentPrNo: prep.parent && prep.parent !== prNo ? prep.parent : null, bundle, bundleSize,
      percentage: shareTotal && row.dailyOrders ? Math.round(row.dailyOrders / shareTotal * 1000) / 10 : 0,
      routes: prep.lines, qty: prep.qty, perDay: prep.perDay, price: prep.amount, workingDays: row.workingDays, dailyOrders: row.dailyOrders,
      fixedCost: row.fixed, mileageRate: row.mileage, nextProcess: 'Daily order assignment, then SA',
      prDate: at, createdBy: actor.userId, approval, history: [],
    };
    const note = [skipped.length ? `${skipped.join(', ')} Skip: PR submitted by ${actor.level}` : '', `Bundle ${row.ym} sequence ${prep.seq} (${bundleSize} PR)`].filter(Boolean).join(' · ');
    pr.history.push({ at, user: actor.userId, role: wf.roleLabel(actor), action: 'Submit PR', from: '-', to: wf.prStatus(pr), reason: '', note });
    return pr;
  }

  // Submit PR: recalculates the bundle right before saving (PC-11) and creates all PRs or none (PC-12)
  function submitBundle(rows, ctx) {
    const plan = planBundle(rows, ctx.prs, ctx.wf.prStatus);
    if (!plan.canSubmit) return { ok: false, error: plan.error, plan };
    if (ctx.expectedSeq != null && plan.seq !== ctx.expectedSeq) return { ok: false, error: MSG.seqTaken(plan.ym, ctx.expectedSeq), plan };
    const bundle = bundleId(plan.ym, plan.seq);
    const done = plan.members.map(i => buildPR({ prep: i.prep, row: i.row, actor: ctx.actor, at: ctx.at, prNo: ctx.prNo(i.row.partner, i.row.ym), supplierName: ctx.name(i.row.partner),
      shareTotal: ctx.shareTotal, wf: ctx.wf, bundle, bundleSize: plan.members.length }));
    ctx.prs.push(...done);
    return { ok: true, done, bundle, seq: plan.seq, total: plan.total, message: MSG.submitted(plan.ym, plan.seq, done.length, done.map(p => p.prNo).join(', ')) };
  }

  const api = { TYPE, TYPE_LABEL, MSG, routeComponent, ymOf, ymAdd, period, validateHeader, canCreate, periodCheck, nextSequence, bundleId,
    usedComponents, initialPr, routeLines, calculate, abnormality, prepare, planBundle, initialApproval, buildPR, submitBundle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PrCreation = api;
})(this);
