// ELIPS Master Mileage: distance between two Master Location records, used for the TC-PBR variable cost.
// Pure logic (no DOM) so it can be used by master.html and tested with Node.
(function (root) {
  const STATUS = { ACTIVE: 'Active', INACTIVE: 'Inactive' };
  const MSG = {
    fromRequired: 'Location From is required.',
    toRequired: 'Location To is required.',
    mileageRequired: 'Mileage is required.',
    sameLocation: 'Location From and Location To cannot be the same.',
    mileageInvalid: 'Mileage must be greater than 0 KM.',
    duplicate: 'Mileage between the selected locations already exists. Please edit the existing mileage record.',
    created: 'Mileage data has been successfully created.',
    updated: 'Mileage data has been successfully updated.',
    deactivated: 'Mileage data has been successfully deactivated.',
    activated: 'Mileage data has been successfully activated.',
    confirmDeactivate: 'Are you sure you want to deactivate this mileage data?',
    notAvailable: 'Mileage data is not available for the selected route.',
  };
  const MAX_DECIMALS = 2;

  const clean = v => String(v ?? '').trim();
  const isActiveLoc = l => l && l.status === 'ACTIVE';
  const findLoc = (locations, code) => locations.find(l => l.code === code);
  // Route is directional: the unique key is Location From + Location To
  const key = (from, to) => `${from}>${to}`;

  function parseMileage(v) {
    const s = clean(v).replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 10 ** MAX_DECIMALS) / 10 ** MAX_DECIMALS : NaN;
  }

  // mode 'add' | 'edit'. In edit mode the route (From / To) is kept and only Mileage and Status change.
  function validate(form, list, locations, mode, current) {
    const e = {};
    const from = mode === 'edit' ? current.from : clean(form.from);
    const to = mode === 'edit' ? current.to : clean(form.to);
    const rawMileage = clean(form.mileage);
    const status = clean(form.status) || STATUS.ACTIVE;

    // Step 1: mandatory fields
    if (!from) e.from = MSG.fromRequired;
    if (!to) e.to = MSG.toRequired;
    if (!rawMileage) e.mileage = MSG.mileageRequired;
    // Locations must come from Master Location; only ACTIVE ones can be used for a new record
    if (mode === 'add') {
      if (from && !isActiveLoc(findLoc(locations, from))) e.from = `Location ${from} is not an active location in Master Location.`;
      if (to && !isActiveLoc(findLoc(locations, to))) e.to = `Location ${to} is not an active location in Master Location.`;
    }
    // Step 2: From != To
    if (!e.from && !e.to && from === to) e.to = MSG.sameLocation;
    // Step 3: Mileage > 0 (decimals up to 2 digits)
    const mileage = parseMileage(rawMileage);
    if (!e.mileage && !(mileage > 0)) e.mileage = MSG.mileageInvalid;
    if (![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) e.status = 'Status must be Active or Inactive.';
    // Activating requires both locations to be active in Master Location
    if (!e.status && status === STATUS.ACTIVE && from && to && !e.from && !e.to) {
      const bad = [from, to].filter(c => !isActiveLoc(findLoc(locations, c)));
      if (bad.length) e.status = `Cannot set Active: location ${bad.join(', ')} is inactive in Master Location.`;
    }
    // Step 4: duplicate route (Active or Inactive)
    if (!Object.keys(e).length && list.some(m => m !== current && key(m.from, m.to) === key(from, to))) e._ = MSG.duplicate;
    return { ok: !Object.keys(e).length, errors: e, data: { from, to, mileage, status } };
  }

  function add(form, list, locations, user, at) {
    const r = validate(form, list, locations, 'add');
    if (!r.ok) return r;
    const rec = { ...r.data, createdBy: user, createdAt: at, updatedBy: user, updatedAt: at, version: 1 };
    list.push(rec);
    return { ok: true, record: rec, message: MSG.created };
  }
  function update(form, list, locations, current, version, user, at) {
    if (!current) return { ok: false, errors: { _: 'Data not found.' } };
    if (current.version !== version) return { ok: false, errors: { _: 'Data has been changed by another user. Please close and edit again.' } };
    const r = validate(form, list, locations, 'edit', current);
    if (!r.ok) return r;
    // Created By / Created Date are never overwritten
    Object.assign(current, { mileage: r.data.mileage, status: r.data.status, updatedBy: user, updatedAt: at, version: current.version + 1 });
    return { ok: true, record: current, message: MSG.updated };
  }
  function setStatus(rec, status, locations, user, at) {
    if (!rec) return { ok: false, error: 'Data not found.' };
    if (rec.status === status) return { ok: false, error: `Mileage data is already ${status}.` };
    if (status === STATUS.ACTIVE) {
      const bad = [rec.from, rec.to].filter(c => !isActiveLoc(findLoc(locations, c)));
      if (bad.length) return { ok: false, error: `Cannot activate: location ${bad.join(', ')} is inactive in Master Location.` };
    }
    Object.assign(rec, { status, updatedBy: user, updatedAt: at, version: rec.version + 1 });
    return { ok: true, message: status === STATUS.ACTIVE ? MSG.activated : MSG.deactivated };
  }

  // ---------- TC-PBR usage ----------
  // Only Active records are used; a missing route is flagged, never treated as 0 KM
  function lookup(list, from, to) {
    const rec = list.find(m => m.from === from && m.to === to && m.status === STATUS.ACTIVE);
    return rec ? { ok: true, mileage: rec.mileage, record: rec } : { ok: false, error: MSG.notAvailable };
  }
  function variableCost(list, from, to, pricePerKm) {
    const m = lookup(list, from, to);
    if (!m.ok) return m;
    const price = Number(pricePerKm);
    if (!(price > 0)) return { ok: false, error: 'Price per KM must be greater than 0.' };
    return { ok: true, mileage: m.mileage, pricePerKm: price, cost: Math.round(m.mileage * price) };
  }

  // ---------- Excel upload (MM-20 .. MM-29) ----------
  // Template: one sheet, header row FROM CODE | TO CODE | MILEAGE (KM); other columns are ignored.
  const UPLOAD = { HEADERS: ['FROM CODE', 'TO CODE', 'MILEAGE (KM)'], MAX_ROWS: 1000 };
  const ACTION = { NEW: 'New', UPDATE: 'Update', SAME: 'No change', ERROR: 'Error' };
  const UMSG = {
    fileType: 'File format is not valid. Please upload the Excel template (.xlsx / .xls).',
    header: miss => `Template is not valid: column ${miss.join(', ')} not found. Please use the Download Template file.`,
    empty: 'The file has no mileage data.',
    tooMany: n => `The file has ${n} rows; maximum ${UPLOAD.MAX_ROWS} rows per upload.`,
    rowErrors: n => `${n} row(s) have errors. Nothing was saved; correct the file and upload again.`,
    nothing: 'All routes in the file already have the same mileage. Nothing to save.',
    dupFile: r => `Route is repeated in the file (row ${r}).`,
    inactive: (f, t) => `Route ${f} → ${t} exists but is Inactive; activate it on the screen first.`,
    saved: (n, u) => `Upload completed: ${n} route(s) created, ${u} route(s) updated.`,
  };
  const normHead = h => String(h ?? '').toUpperCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  // rows = array of arrays (sheet_to_json header:1). Header row = first row that contains FROM CODE.
  function readSheet(rows) {
    const hi = (rows || []).findIndex(r => (r || []).some(c => normHead(c) === 'FROM CODE'));
    if (hi < 0) return { ok: false, error: UMSG.header(UPLOAD.HEADERS) };
    const head = rows[hi].map(normHead), idx = UPLOAD.HEADERS.map(h => head.indexOf(h));
    const miss = UPLOAD.HEADERS.filter((h, i) => idx[i] < 0);
    if (miss.length) return { ok: false, error: UMSG.header(miss) };
    const data = [];
    rows.slice(hi + 1).forEach((r, i) => {
      const v = idx.map(j => clean((r || [])[j]));
      if (v.some(Boolean)) data.push({ row: hi + i + 2, from: v[0].toUpperCase(), to: v[1].toUpperCase(), mileage: v[2] });
    });
    if (!data.length) return { ok: false, error: UMSG.empty };
    if (data.length > UPLOAD.MAX_ROWS) return { ok: false, error: UMSG.tooMany(data.length) };
    return { ok: true, data };
  }
  // Validates every row against Master Location and the existing routes; nothing is saved here (preview).
  function checkUpload(data, list, locations) {
    const seen = new Map();
    const rows = data.map(d => {
      const errors = [], cols = [], err = (col, msg) => { errors.push(msg); cols.push(col); };
      const [CF, CT, CM] = UPLOAD.HEADERS;
      if (!d.from) err(CF, MSG.fromRequired);
      else if (!isActiveLoc(findLoc(locations, d.from))) err(CF, `Location ${d.from} is not an active location in Master Location.`);
      if (!d.to) err(CT, MSG.toRequired);
      else if (!isActiveLoc(findLoc(locations, d.to))) err(CT, `Location ${d.to} is not an active location in Master Location.`);
      if (d.from && d.to && d.from === d.to) err(CT, MSG.sameLocation);
      const value = parseMileage(d.mileage);
      if (!d.mileage) err(CM, MSG.mileageRequired); else if (!(value > 0)) err(CM, MSG.mileageInvalid);
      const k = key(d.from, d.to);
      if (d.from && d.to && seen.has(k)) err('ROUTE', UMSG.dupFile(seen.get(k))); else if (d.from && d.to) seen.set(k, d.row);
      const ex = list.find(m => key(m.from, m.to) === k);
      if (!errors.length && ex && ex.status !== STATUS.ACTIVE) err('ROUTE', UMSG.inactive(d.from, d.to));
      const action = errors.length ? ACTION.ERROR : !ex ? ACTION.NEW : ex.mileage === value ? ACTION.SAME : ACTION.UPDATE;
      return { ...d, value: errors.length ? null : value, old: ex ? ex.mileage : null, action, errors, cols, existing: ex || null };
    });
    const counts = Object.fromEntries(Object.values(ACTION).map(a => [a, rows.filter(r => r.action === a).length]));
    const error = counts[ACTION.ERROR] ? UMSG.rowErrors(counts[ACTION.ERROR]) : !counts[ACTION.NEW] && !counts[ACTION.UPDATE] ? UMSG.nothing : null;
    const rowErrors = rows.flatMap(r => r.errors.map((message, i) => ({ row: r.row, column: r.cols[i], message })));
    return { ok: !error, error, rows, counts, rowErrors };
  }
  // All-or-nothing: saves only when no row has an error (MM-25); insert New, update Update, skip No change
  function applyUpload(check, list, user, at) {
    if (!check.ok) return { ok: false, error: check.error || UMSG.rowErrors(check.counts?.[ACTION.ERROR] || 0) };
    let n = 0, u = 0;
    check.rows.forEach(r => {
      if (r.action === ACTION.NEW) { list.push({ from: r.from, to: r.to, mileage: r.value, status: STATUS.ACTIVE, createdBy: user, createdAt: at, updatedBy: user, updatedAt: at, version: 1 }); n++; }
      if (r.action === ACTION.UPDATE) { Object.assign(r.existing, { mileage: r.value, updatedBy: user, updatedAt: at, version: r.existing.version + 1 }); u++; }
    });
    return { ok: true, created: n, updated: u, message: UMSG.saved(n, u) };
  }

  const api = { STATUS, MSG, MAX_DECIMALS, parseMileage, validate, add, update, setStatus, lookup, variableCost, UPLOAD, ACTION, UMSG, readSheet, checkUpload, applyUpload };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MasterMileage = api;
})(this);
