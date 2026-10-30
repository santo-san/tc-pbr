// ELIPS Master KPI: performance value per trucking company and the Order Sharing used for
// daily order assignment (VPLD planner) and the daily QTY of PR creation. Pure logic so it can be tested with Node.
(function (root) {
  const PAYMENT_BY_RESOURCE = 'By Resources';
  const UOM = 'Truck';
  const MAX_ITEM = 999, MAX_SCORE = 1000, MAX_SHARING = 99, MAX_NAME = 15;
  // Grade from Score (thresholds TBD; the reference only shows GOLD for scores 766 - 892)
  const GRADES = [{ min: 750, grade: 'GOLD' }, { min: 600, grade: 'SILVER' }, { min: 0, grade: 'BRONZE' }];
  const PALETTE = ['#2563eb', '#16a34a', '#6d28d9', '#0891b2', '#ea7a0c', '#3b6fe0', '#ef4444', '#06b6d4', '#db2777', '#65a30d', '#7c3aed', '#0d9488'];

  const MSG = {
    nameReq: 'KPI name is required.',
    nameLen: `KPI name must be at most ${MAX_NAME} characters.`,
    nameDup: n => `KPI ${n} already exists.`,
    itemAdded: n => `KPI ${n} has been added. Please fill in the value for each trucking company.`,
    itemDeleted: n => `KPI ${n} has been deleted. Total has been recalculated.`,
    partnerReq: 'Trucking Company is required.',
    partnerInvalid: c => `Trucking Company ${c} is not active in Master Trucking Company.`,
    partnerDup: c => `Trucking Company ${c} is already registered in Master KPI.`,
    partnerAdded: c => `Trucking Company ${c} has been added. Please fill in the KPI values and Order Sharing.`,
    value: (label, max) => `${label} must be a whole number between 0 and ${max}.`,
    conc: 'Error in Update because of concurrency check.',
    updated: c => `KPI data for ${c} has been successfully updated.`,
    deleted: c => `Trucking Company ${c} has been deleted from Master KPI.`,
  };

  const isWhole = (v, max) => /^\d+$/.test(String(v ?? '').trim()) && +v <= max;
  const grade = score => GRADES.find(g => +score >= g.min).grade;
  const total = (row, items) => items.reduce((s, it) => s + (+row.values[it.key] || 0), 0);
  const totalByResource = rows => rows.filter(r => r.paymentType === PAYMENT_BY_RESOURCE).reduce((s, r) => s + (+r.orderSharing || 0), 0);

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
  function addCompany(rows, items, vendors, code, user, now) {
    if (!code) return { ok: false, error: MSG.partnerReq };
    if (!vendors.some(v => v.code === code && !v.deleted)) return { ok: false, error: MSG.partnerInvalid(code) };
    if (rows.some(r => r.partner === code)) return { ok: false, error: MSG.partnerDup(code) };
    const row = { partner: code, paymentType: PAYMENT_BY_RESOURCE, score: 0, values: Object.fromEntries(items.map(it => [it.key, 0])),
      orderSharing: 0, uom: UOM, createdBy: user, createdAt: now, changedBy: user, changedAt: now, version: 1 };
    rows.push(row);
    return { ok: true, row, message: MSG.partnerAdded(code) };
  }

  // Grid edit of one row: Score, each KPI value and Order Sharing are whole numbers
  function validateRow(form, items) {
    const e = {};
    if (!isWhole(form.score, MAX_SCORE)) e.score = MSG.value('Score', MAX_SCORE);
    items.forEach(it => { if (!isWhole(form.values?.[it.key], MAX_ITEM)) e[it.key] = MSG.value(it.label, MAX_ITEM); });
    if (!isWhole(form.orderSharing, MAX_SHARING)) e.orderSharing = MSG.value('Order Sharing', MAX_SHARING);
    return e;
  }
  function updateRow(rows, items, row, version, form, user, now) {
    if (!rows.includes(row) || row.version !== version) return { ok: false, errors: { _: MSG.conc } };
    const errors = validateRow(form, items);
    if (Object.keys(errors).length) return { ok: false, errors };
    Object.assign(row, { score: +form.score, orderSharing: +form.orderSharing, changedBy: user, changedAt: now, version: row.version + 1 });
    items.forEach(it => { row.values[it.key] = +form.values[it.key]; });
    return { ok: true, message: MSG.updated(row.partner) };
  }
  function removeCompany(rows, row) {
    const i = rows.indexOf(row);
    if (i < 0) return { ok: false, error: MSG.conc };
    rows.splice(i, 1);
    return { ok: true, message: MSG.deleted(row.partner) };
  }

  // ---------- Use by other functions ----------
  // PR creation: daily QTY of a trucking company = its Order Sharing
  const dailyQty = (rows, partner) => rows.find(r => r.partner === partner)?.orderSharing ?? 0;
  // Daily order assignment: split n orders by Order Sharing (largest remainder, ties by higher Total then code)
  function allocate(rows, items, n) {
    const rs = rows.filter(r => r.paymentType === PAYMENT_BY_RESOURCE && r.orderSharing > 0);
    const sum = rs.reduce((s, r) => s + r.orderSharing, 0);
    if (!sum || n <= 0) return {};
    const parts = rs.map(r => { const exact = n * r.orderSharing / sum; return { r, qty: Math.floor(exact), rest: exact - Math.floor(exact) }; });
    let left = n - parts.reduce((s, p) => s + p.qty, 0);
    [...parts].sort((a, b) => b.rest - a.rest || total(b.r, items) - total(a.r, items) || a.r.partner.localeCompare(b.r.partner))
      .forEach(p => { if (left > 0) { p.qty++; left--; } });
    return Object.fromEntries(parts.map(p => [p.r.partner, p.qty]));
  }

  const api = { PAYMENT_BY_RESOURCE, UOM, MAX_ITEM, MAX_SCORE, MAX_SHARING, MAX_NAME, GRADES, PALETTE, MSG,
    grade, total, totalByResource, addItem, removeItem, addCompany, validateRow, updateRow, removeCompany, dailyQty, allocate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MasterKpi = api;
})(this);
