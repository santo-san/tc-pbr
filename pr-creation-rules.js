// ELIPS PR Creation: Monthly PR (Fixed Cost) and Route-Based PR for LP operations.
// Reuses the existing rules: approval levels from monthly-workflow.js, eCatalogue price lookup (master-price.js priceForPR),
// route split by percentage (master-route-percentage.js split), Order Sharing from Master KPI as daily QTY.
// Pure logic (no DOM) so it can be tested with Node.
(function (root) {
  const TYPE = { FIX: 'FIX', ROUTE: 'ROUTE' };
  const TYPE_LABEL = { FIX: 'Monthly PR - Fixed Cost', ROUTE: 'Route-Based PR for LP Operations' };
  const FIX_COMPONENT = 'FIX';
  const routeComponent = code => `ROUTE:${code}`;

  const MSG = {
    typeReq: 'PR Creation Type is required.',
    monthReq: 'Operational Month is required.',
    partnerReq: 'Logistics Partner is required.',
    noAuth: 'You are not authorized to create PR. PR Creation is available to VPLD Staff and VPLD Section Head.',
    paramMissing: 'System Master parameter "Allow PR creation in current operational month" is not configured. Please contact the system administrator.',
    currentNotAllowed: ym => `PR for the current operational month (${ym}) cannot be created: not allowed by System Master. PR is created in Month N-1 for Month N.`,
    past: ym => `Operational Month ${ym} has already passed. PR cannot be created.`,
    tooFar: (ym, next) => `PR for Operational Month ${ym} cannot be created yet. PR is created in Month N-1: the next operational month is ${next}.`,
    noCalendar: ym => `TMMIN Calendar (working days) for ${ym} is not available. Please maintain the TMMIN Calendar first.`,
    noRoutes: 'No active Route Percentage data. Please maintain Master Route Percentage first.',
    noSharing: p => `No Order Sharing for ${p} in Master KPI (By Resources). Route-based PR cannot be calculated.`,
    noOrders: p => `No orders are planned for ${p} in this month (Order Sharing x Working Days = 0).`,
    dupFix: (p, prNo) => `Monthly Cost of ${p} for this operational month is already included in PR ${prNo}. It cannot be duplicated.`,
    dupRoutes: (p, prNos) => `All planned routes of ${p} for this operational month are already included in PR ${prNos}. No new route to create an additional PR sequence.`,
    badAmount: p => `Calculated PR amount for ${p} is not valid (must be greater than 0). Please check the price and planning data.`,
    seqTaken: (p, seq) => `PR Sequence ${seq} for ${p} already exists. Please reload the screen.`,
    created: (n, nos) => `${n} PR created: ${nos}.`,
  };

  // ---------- Month helpers (YYYY-MM) ----------
  const ymOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  function ymAdd(ym, n) {
    const [y, m] = ym.split('-').map(Number), d = new Date(y, m - 1 + n, 1);
    return ymOf(d);
  }
  const period = ym => ym.replace('-', '');   // eCatalogue period YYYYMM

  // ---------- Header validation, authorization and creation period ----------
  function validateHeader({ type, ym, partner }) {
    const e = {};
    if (!TYPE[type]) e.type = MSG.typeReq;
    if (!ym) e.ym = MSG.monthReq;
    if (!partner) e.partner = MSG.partnerReq;
    return e;
  }
  // Roles allowed to create PR come from the authorization configuration (System Master)
  const canCreate = (actor, creators) => creators.some(c => c.role === actor.role && (!c.level || c.level === actor.level) && (!c.division || c.division === actor.division));

  // PR is created in Month N-1 for Month N. Month N itself depends on the System Master parameter (no default is assumed).
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
  const nextSequence = (prs, partner, ym) => prsOf(prs, partner, ym).reduce((m, p) => Math.max(m, p.rev), 0) + 1;
  function usedComponents(prs, partner, ym, prStatus) {
    const used = new Map();   // component -> PR number
    prsOf(prs, partner, ym).filter(p => counts(p, prStatus)).forEach(p => (p.components || []).forEach(c => used.set(c, p.prNo)));
    return used;
  }
  // The first PR (sequence 1) of the partner and month; additional sequences refer to it
  const initialPr = (prs, partner, ym) => prsOf(prs, partner, ym).sort((a, b) => a.rev - b.rev)[0] || null;

  // ---------- Calculation ----------
  // Route plan: monthly orders = Order Sharing (daily QTY) x working days, split over the active routes by Route Percentage;
  // planned cost of a route = orders x route distance (KM) x Price per KM (eCatalogue).
  function routePlan({ dailyOrders, workingDays, routes, priceKm, split }) {
    const monthlyOrders = dailyOrders * workingDays;
    const alloc = split(routes, monthlyOrders);
    const lines = routes.map(r => {
      const orders = alloc[r.code] || 0;
      return { code: r.code, description: r.description, percentage: r.percentage, distance: r.distance, orders, priceKm,
        cost: Math.round(orders * r.distance * priceKm) };
    });
    const variable = lines.reduce((s, l) => s + l.cost, 0);
    return { monthlyOrders, lines, variable, perDay: workingDays ? Math.round(variable / workingDays) : 0 };
  }

  // One summary row per Logistics Partner (same figures as the List Summary screen)
  function calculate(partner, ym, src) {
    const per = period(ym), row = { partner, ym, errors: {} };
    row.workingDays = src.workingDays(ym);
    const fix = src.price(partner, 'FIX', per), km = src.price(partner, 'KM', per);
    row.fixed = fix.ok ? fix.price : null; row.mileage = km.ok ? km.price : null;
    if (!fix.ok) row.errors.fix = fix.error;
    if (!km.ok) row.errors.km = km.error;
    row.dailyOrders = src.orderSharing(partner);
    const routes = src.routes();
    if (row.workingDays == null) row.errors.calendar = MSG.noCalendar(ym);
    if (!routes.length) row.errors.routes = MSG.noRoutes;
    if (row.dailyOrders == null) row.errors.sharing = MSG.noSharing(partner);
    if (row.workingDays != null && routes.length && row.dailyOrders != null && km.ok) {
      Object.assign(row, routePlan({ dailyOrders: row.dailyOrders, workingDays: row.workingDays, routes, priceKm: km.price, split: src.split }));
    } else Object.assign(row, { monthlyOrders: null, lines: [], variable: null, perDay: null });
    // Monthly Delivery Cost = Fixed Cost + Delivery Cost per day x Working Days (planned variable cost of the month)
    row.monthlyTotal = row.fixed != null && row.variable != null ? row.fixed + row.variable : null;
    return row;
  }

  // What the selected PR type would create for this partner: sequence, components, lines and amount, or the blocking error
  function prepare(type, row, prs, prStatus) {
    const p = row.partner, used = usedComponents(prs, p, row.ym, prStatus), seq = nextSequence(prs, p, row.ym);
    const base = { type, seq, parent: initialPr(prs, p, row.ym)?.prNo || null };
    if (type === TYPE.FIX) {
      if (row.errors.fix) return { ...base, ok: false, error: row.errors.fix };
      if (used.has(FIX_COMPONENT)) return { ...base, ok: false, error: MSG.dupFix(p, used.get(FIX_COMPONENT)) };
      if (!(row.fixed > 0)) return { ...base, ok: false, error: MSG.badAmount(p) };
      return { ...base, ok: true, components: [FIX_COMPONENT], lines: [], amount: row.fixed, qty: 0 };
    }
    const first = ['calendar', 'routes', 'sharing', 'km'].map(k => row.errors[k]).find(Boolean);
    if (first) return { ...base, ok: false, error: first };
    if (!row.monthlyOrders) return { ...base, ok: false, error: MSG.noOrders(p) };
    const planned = row.lines.filter(l => l.orders > 0);
    const fresh = planned.filter(l => !used.has(routeComponent(l.code)));
    if (!fresh.length) return { ...base, ok: false, error: MSG.dupRoutes(p, [...new Set(planned.map(l => used.get(routeComponent(l.code))))].join(', ')) };
    const amount = fresh.reduce((s, l) => s + l.cost, 0);
    if (!(amount > 0)) return { ...base, ok: false, error: MSG.badAmount(p) };
    return { ...base, ok: true, components: fresh.map(l => routeComponent(l.code)), lines: fresh, amount, qty: fresh.reduce((s, l) => s + l.orders, 0),
      skipped: planned.length - fresh.length };
  }

  // ---------- Approval ----------
  // Levels come from the workflow configuration. Levels up to the creator's own level are skipped
  // (e.g. a PR created by the Section Head starts at the next level).
  function initialApproval(actor, wf, at) {
    const a = wf.newApproval(), i = actor.level ? wf.LEVELS.indexOf(actor.level) : -1;
    const skipped = i >= 0 ? wf.LEVELS.slice(0, i + 1) : [];
    skipped.forEach(l => Object.assign(a[l], { status: wf.AP.SKIP, at }));
    return { approval: a, skipped };
  }

  // Builds the PR record in the existing PR structure (prNo, ym, rev = PR sequence, prodMonth, approval, history)
  function buildPR({ prep, row, actor, at, prNo, supplierName, shareTotal, wf, mileage }) {
    const [y, m] = row.ym.split('-');
    const { approval, skipped } = initialApproval(actor, wf, at);
    const pr = {
      prNo, ym: row.ym, rev: prep.seq, prodMonth: `${m}/${y}-${prep.seq}`, supplierCode: row.partner, supplierName,
      type: prep.type, components: prep.components, parentPrNo: prep.seq > 1 ? prep.parent : null,
      percentage: shareTotal && row.dailyOrders ? Math.round(row.dailyOrders / shareTotal * 1000) / 10 : 0,
      routes: prep.lines, qty: prep.qty, price: prep.amount, workingDays: row.workingDays, dailyOrders: row.dailyOrders,
      fixedCost: prep.type === TYPE.FIX ? row.fixed : null, mileageRate: mileage ?? row.mileage,
      nextProcess: prep.type === TYPE.FIX ? 'SA (Service Acceptance) directly after PO' : 'Daily order assignment, then SA',
      prDate: at, createdBy: actor.userId, approval, history: [],
    };
    const note = [skipped.length ? `${skipped.join(', ')} Skip: PR created by ${actor.level}` : '',
      prep.seq > 1 ? `Additional sequence ${prep.seq} of ${prep.parent}` : 'Initial PR'].filter(Boolean).join(' · ');
    pr.history.push({ at, user: actor.userId, role: wf.roleLabel(actor), action: `PR Creation (${TYPE_LABEL[prep.type]})`, from: '-', to: wf.prStatus(pr), reason: '', note });
    return pr;
  }

  // Creates the PRs for the prepared rows; re-checks sequence and components right before saving
  function createPRs(items, ctx) {
    const done = [], fails = [];
    for (const it of items) {
      const prep = prepare(it.type, it.row, ctx.prs, ctx.wf.prStatus);
      if (!prep.ok) { fails.push({ partner: it.row.partner, error: prep.error }); continue; }
      if (prsOf(ctx.prs, it.row.partner, it.row.ym).some(p => p.rev === prep.seq)) { fails.push({ partner: it.row.partner, error: MSG.seqTaken(it.row.partner, prep.seq) }); continue; }
      const pr = buildPR({ prep, row: it.row, actor: ctx.actor, at: ctx.at, prNo: ctx.prNo(it.row.partner, it.row.ym), supplierName: ctx.name(it.row.partner), shareTotal: ctx.shareTotal, wf: ctx.wf });
      ctx.prs.push(pr); done.push(pr);
    }
    return { done, fails };
  }

  const api = { TYPE, TYPE_LABEL, FIX_COMPONENT, MSG, routeComponent, ymOf, ymAdd, period, validateHeader, canCreate, periodCheck,
    nextSequence, usedComponents, initialPr, routePlan, calculate, prepare, initialApproval, buildPR, createPRs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PrCreation = api;
})(this);
