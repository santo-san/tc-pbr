// ELIPS Master KPI: performance value per trucking company and the Order Sharing used for
// daily order assignment (VPLD planner) and the daily QTY of PR creation. Pure logic so it can be tested with Node.
(function (root) {
  const PAYMENT_BY_RESOURCE = 'By Resources', PAYMENT_BY_TRIP = 'By Trip';
  const PAYMENT_TYPES = [PAYMENT_BY_RESOURCE, PAYMENT_BY_TRIP];
  const UOM = 'Truck';
  // Both payment types: Order Sharing % (0.00-100.00) and Daily Trip. By Resources: Daily Trip is typed (trucks per day, 0-99), the %
  // does not drive the quantity yet. By Trip: Daily Trip is calculated from the trips per day and the Order Sharing % (KP-15).
  const MAX_ITEM = 999, MAX_SCORE = 1000, MAX_SHARING = 99, MAX_SHARING_PCT = 100, MAX_NAME = 15, MAX_TRIPS = 999;
  // KP-16: trips per day shared over the By Trip companies (reference: 20, like Total By Resource; source / maintenance TBD)
  const DAILY_TRIPS = 20;
  // Grade from Score (thresholds TBD). Reference: 667 GOLD and 665 SILVER (By Trip table), so GOLD starts at 666 (assumption, KP-06).
  const GRADES = [{ min: 666, grade: 'GOLD' }, { min: 600, grade: 'SILVER' }, { min: 0, grade: 'BRONZE' }];
  const PALETTE = ['#2563eb', '#16a34a', '#6d28d9', '#0891b2', '#ea7a0c', '#3b6fe0', '#ef4444', '#06b6d4', '#db2777', '#65a30d', '#7c3aed', '#0d9488'];

  // Seed rows of the mock-up (single source for Master KPI screen and DTP Creation monitoring), as on the reference screens.
  // KPI values in the order Safety, Comm., Flexi., Legal, KPI, TPS, Tax, QCC. PNJ / SRL / TFL By Resources are the
  // trucking companies of Daily / DTP Creation (not on the reference). SGL By Trip: SILVER, no Order Sharing (not eligible).
  const R = PAYMENT_BY_RESOURCE, T = PAYMENT_BY_TRIP;
  const V = { AGR: [60, 40, 40, 30, 275, 157, 40, 37], DNX: [77, 35, 40, 40, 275, 207, 40, 41], GIB: [92, 45, 45, 50, 280, 210, 40, 46], JMP: [82, 40, 40, 45, 250, 220, 50, 43],
    PBM: [75, 40, 40, 40, 270, 173, 50, 36], IBT: [67, 40, 40, 45, 280, 208, 40, 35], MJR: [68, 40, 40, 50, 260, 198, 40, 50], PLI: [77, 40, 40, 45, 285, 165, 40, 43],
    PNJ: [77, 35, 35, 45, 255, 198, 40, 44], PS: [59, 40, 40, 40, 255, 153, 40, 40], VMB: [70, 45, 45, 45, 290, 205, 50, 44], SGL: [78, 45, 45, 45, 170, 200, 50, 32],
    SRL: [45, 45, 45, 45, 170, 200, 50, 50], TFL: [45, 45, 45, 45, 170, 200, 50, 50] };
  const SEED = [
    [R, 'AGR', 766, 3], [R, 'DNX', 855, 4], [R, 'GIB', 892, 5], [R, 'JMP', 837, 4], [R, 'PBM', 774, 4], [R, 'PNJ', 801, 3], [R, 'SRL', 760, 3], [R, 'TFL', 742, 2],
    [T, 'AGR', 679, 4.25], [T, 'DNX', 755, 10.09], [T, 'GIB', 808, 14.16], [T, 'IBT', 755, 10.09], [T, 'JMP', 770, 11.24], [T, 'MJR', 746, 9.40],
    [T, 'PLI', 735, 8.55], [T, 'PNJ', 729, 8.09], [T, 'PBM', 724, 7.71], [T, 'PS', 667, 3.34], [T, 'VMB', 794, 13.08], [T, 'SGL', 665, 0],
  ].map(([paymentType, partner, score, x]) => ({ paymentType, partner, score, values: V[partner],
    // By Resources seed: Daily Trip as the reference, Order Sharing % = Daily Trip / Total Daily Trip (informational)
    ...(paymentType === R ? { dailyTrip: x, orderSharing: 0 } : { orderSharing: x }) }));
  { const tot = SEED.filter(s => s.paymentType === R).reduce((s, r) => s + r.dailyTrip, 0);
    SEED.filter(s => s.paymentType === R).forEach(s => { s.orderSharing = Math.round(s.dailyTrip / tot * 10000) / 100; }); }
  // Company names of the reference (mock-up only; the real system takes them from Master Trucking Company)
  const NAMES = { AGR: 'PT. Agung Raya', DNX: 'PT. Dunia Express Transindo', GIB: 'PT. Galuh Inti Bahari', JMP: 'PT. Jakarta Maju Pusaka', PBM: 'PT. Pusaka Bahari Mandiri',
    IBT: 'PT. Iron Bird Transport', MJR: 'PT. Mentari Jaya Raya', PLI: 'PT. Pancaran Logistik Indonesia', PNJ: 'PT. Puninar Jaya', PS: 'PT. Putra Soputan',
    VMB: 'PT. Vifiera Minova Bersaudara', SGL: 'PT. Sumisho Global Logistics Indonesia', SRL: 'PT. Serasi Logistics', TFL: 'PT. Toyofuji Logistics' };
  // Applicable Master KPI row of a trucking company (and payment type) for a date. Master KPI has no validity period (one current row per
  // company and payment type, KP-01), so the date is not used yet; with an effective period: date >= effective from and <= effective to (TBD).
  const applicable = (rows, code, date, type) => rows.find(r => r.partner === code && (!type || r.paymentType === type) && (!r.effFrom || r.effFrom <= date) && (!r.effTo || date <= r.effTo)) || null;

  const MSG = {
    nameReq: 'KPI name is required.',
    nameLen: `KPI name must be at most ${MAX_NAME} characters.`,
    nameDup: n => `KPI ${n} already exists.`,
    itemAdded: n => `KPI ${n} has been added. Please fill in the value for each trucking company.`,
    itemDeleted: n => `KPI ${n} has been deleted. Total has been recalculated.`,
    partnerReq: 'Trucking Company is required.',
    partnerInvalid: c => `Trucking Company ${c} is not active in Master Trucking Company.`,
    partnerDup: (c, t) => `Trucking Company ${c} is already registered in Master KPI as ${t}.`,
    typeReq: 'Payment Type is required (By Resources / By Trip).',
    pct: `Order Sharing % must be a percentage between 0 and ${MAX_SHARING_PCT} with at most 2 decimals.`,
    pctSum: s => `Total By Trip is ${s.toFixed(2)}%; it must be 100.00%.`,
    trips: `Trips per day (By Trip) must be a whole number between 0 and ${MAX_TRIPS}.`,
    partnerAdded: c => `Trucking Company ${c} has been added. Please fill in the KPI values and Order Sharing.`,
    value: (label, max) => `${label} must be a whole number between 0 and ${max}.`,
    conc: 'Error in Update because of concurrency check.',
    updated: c => `KPI data for ${c} has been successfully updated.`,
    deleted: c => `Trucking Company ${c} has been deleted from Master KPI.`,
  };

  const isWhole = (v, max) => /^\d+$/.test(String(v ?? '').trim()) && +v <= max;
  const grade = score => GRADES.find(g => +score >= g.min).grade;
  const total = (row, items) => items.reduce((s, it) => s + (+row.values[it.key] || 0), 0);
  // Total Daily Trip of By Resources (the typed quantities, KP-07)
  const totalByResource = rows => rows.filter(r => r.paymentType === PAYMENT_BY_RESOURCE).reduce((s, r) => s + (+r.dailyTrip || 0), 0);
  // Total Order Sharing % of one payment type
  const totalPct = (rows, type) => Math.round(rows.filter(r => r.paymentType === type).reduce((s, r) => s + (+r.orderSharing || 0), 0) * 100) / 100;
  // KP-14: sum of the By Trip percentages (must be 100.00 when any By Trip row has a share)
  const totalByTrip = rows => totalPct(rows, PAYMENT_BY_TRIP);
  const isPct = v => /^\d{1,3}(\.\d{1,2})?$/.test(String(v ?? '').trim()) && +v <= MAX_SHARING_PCT;
  const fmtShare = r => `${(+r.orderSharing || 0).toFixed(2)}%`;
  // Daily Trip of a row: typed for By Resources; for By Trip the part of the trips per day (alloc = allocateTrip result)
  const dailyTripOf = (r, alloc) => r.paymentType === PAYMENT_BY_TRIP ? (alloc?.[r.partner] ?? 0) : (+r.dailyTrip || 0);

  // ---------- KPI items (columns) ----------
  function addItem(items, rows, name) {
    const label = String(name ?? '').trim();
    if (!label) return { ok: false, error: MSG.nameReq };
    if (label.length > MAX_NAME) return { ok: false, error: MSG.nameLen };
    if (items.some(it => it.label.toLowerCase() === label.toLowerCase())) return { ok: false, error: MSG.nameDup(label) };
    let key = label.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'KPI';
    while (items.some(it => it.key === key)) key += '_';
    const item = { key, label, color: PALETTE[items.length % PALETTE.length] };
    items.push(item);
    rows.forEach(r => { r.values[key] = 0; });   // new KPI starts at 0 for every company
    return { ok: true, item, message: MSG.itemAdded(label) };
  }
  function removeItem(items, rows, key) {
    const i = items.findIndex(it => it.key === key);
    if (i < 0) return { ok: false, error: MSG.conc };
    const [item] = items.splice(i, 1);
    rows.forEach(r => { delete r.values[key]; });
    return { ok: true, message: MSG.itemDeleted(item.label) };
  }

  // ---------- Trucking companies (rows) ----------
  // KP-01: one row per trucking company AND payment type (a company can be By Resources and By Trip)
  function addCompany(rows, items, vendors, code, user, now, paymentType = PAYMENT_BY_RESOURCE) {
    if (!PAYMENT_TYPES.includes(paymentType)) return { ok: false, error: MSG.typeReq };
    if (!code) return { ok: false, error: MSG.partnerReq };
    if (!vendors.some(v => v.code === code && !v.deleted)) return { ok: false, error: MSG.partnerInvalid(code) };
    if (rows.some(r => r.partner === code && r.paymentType === paymentType)) return { ok: false, error: MSG.partnerDup(code, paymentType) };
    const row = { partner: code, paymentType, score: 0, values: Object.fromEntries(items.map(it => [it.key, 0])),
      orderSharing: 0, ...(paymentType === PAYMENT_BY_RESOURCE ? { dailyTrip: 0 } : {}), uom: UOM, createdBy: user, createdAt: now, changedBy: user, changedAt: now, version: 1 };
    rows.push(row);
    return { ok: true, row, message: MSG.partnerAdded(code) };
  }

  // Grid edit of one row: Score and each KPI value are whole numbers; Order Sharing = whole trucks (By Resources) or % (By Trip)
  function validateRow(form, items, paymentType = PAYMENT_BY_RESOURCE) {
    const e = {};
    if (!isWhole(form.score, MAX_SCORE)) e.score = MSG.value('Score', MAX_SCORE);
    items.forEach(it => { if (!isWhole(form.values?.[it.key], MAX_ITEM)) e[it.key] = MSG.value(it.label, MAX_ITEM); });
    if (!isPct(form.orderSharing)) e.orderSharing = MSG.pct;
    if (paymentType === PAYMENT_BY_RESOURCE && !isWhole(form.dailyTrip, MAX_SHARING)) e.dailyTrip = MSG.value('Daily Trip', MAX_SHARING);
    return e;
  }
  function updateRow(rows, items, row, version, form, user, now) {
    if (!rows.includes(row) || row.version !== version) return { ok: false, errors: { _: MSG.conc } };
    const errors = validateRow(form, items, row.paymentType);
    if (Object.keys(errors).length) return { ok: false, errors };
    Object.assign(row, { score: +form.score, orderSharing: +form.orderSharing, changedBy: user, changedAt: now, version: row.version + 1 });
    if (row.paymentType === PAYMENT_BY_RESOURCE) row.dailyTrip = +form.dailyTrip;
    items.forEach(it => { row.values[it.key] = +form.values[it.key]; });
    return { ok: true, message: MSG.updated(`${row.partner} (${row.paymentType})`) };
  }
  function removeCompany(rows, row) {
    const i = rows.indexOf(row);
    if (i < 0) return { ok: false, error: MSG.conc };
    rows.splice(i, 1);
    return { ok: true, message: MSG.deleted(`${row.partner} (${row.paymentType})`) };
  }

  // ---------- Use by other functions ----------
  // PR creation: daily QTY of a trucking company = its By Resources Order Sharing
  const dailyQty = (rows, partner) => rows.find(r => r.partner === partner && r.paymentType === PAYMENT_BY_RESOURCE)?.dailyTrip ?? 0;
  // KP-15: daily trip limit per By Trip company from the trips per day (reference: 20 trips over 11 companies -> 2 each, AGR / PS 1).
  // Every eligible company (share > 0) gets 1 trip first; the rest is split by Order Sharing % with the largest remainder
  // (ties: higher %, then code). Fewer trips than companies: 1 trip each to the highest shares.
  function allocateTrip(rows, n) {
    const rs = rows.filter(r => r.paymentType === PAYMENT_BY_TRIP && +r.orderSharing > 0)
      .sort((a, b) => b.orderSharing - a.orderSharing || a.partner.localeCompare(b.partner));
    const out = Object.fromEntries(rs.map(r => [r.partner, 0]));
    n = Math.max(0, Math.floor(+n || 0));
    if (!rs.length || !n) return out;
    if (n <= rs.length) { rs.slice(0, n).forEach(r => { out[r.partner] = 1; }); return out; }
    const rest = n - rs.length, sum = rs.reduce((s, r) => s + +r.orderSharing, 0);
    const parts = rs.map(r => { const exact = rest * r.orderSharing / sum; return { r, qty: 1 + Math.floor(exact), rem: exact - Math.floor(exact) }; });
    let left = n - parts.reduce((s, p) => s + p.qty, 0);
    [...parts].sort((a, b) => b.rem - a.rem || b.r.orderSharing - a.r.orderSharing || a.r.partner.localeCompare(b.r.partner)).forEach(p => { if (left > 0) { p.qty++; left--; } });
    parts.forEach(p => { out[p.r.partner] = p.qty; });
    return out;
  }
  const validTrips = v => isWhole(v, MAX_TRIPS);
  // Daily order assignment: split n orders by Order Sharing (largest remainder, ties by higher Total then code)
  function allocate(rows, items, n) {
    const rs = rows.filter(r => r.paymentType === PAYMENT_BY_RESOURCE && r.dailyTrip > 0);
    const sum = rs.reduce((s, r) => s + r.dailyTrip, 0);
    if (!sum || n <= 0) return {};
    const parts = rs.map(r => { const exact = n * r.dailyTrip / sum; return { r, qty: Math.floor(exact), rest: exact - Math.floor(exact) }; });
    let left = n - parts.reduce((s, p) => s + p.qty, 0);
    [...parts].sort((a, b) => b.rest - a.rest || total(b.r, items) - total(a.r, items) || a.r.partner.localeCompare(b.r.partner))
      .forEach(p => { if (left > 0) { p.qty++; left--; } });
    return Object.fromEntries(parts.map(p => [p.r.partner, p.qty]));
  }

  const api = { SEED, NAMES, applicable, PAYMENT_BY_RESOURCE, PAYMENT_BY_TRIP, PAYMENT_TYPES, UOM, DAILY_TRIPS, MAX_TRIPS, MAX_ITEM, MAX_SCORE, MAX_SHARING, MAX_SHARING_PCT, MAX_NAME, GRADES, PALETTE, MSG,
    grade, total, totalByResource, totalByTrip, totalPct, fmtShare, dailyTripOf, addItem, removeItem, addCompany, validateRow, updateRow, removeCompany, dailyQty, allocate, allocateTrip, validTrips };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MasterKpi = api;
})(this);
