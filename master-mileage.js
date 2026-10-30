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

  const api = { STATUS, MSG, MAX_DECIMALS, parseMileage, validate, add, update, setStatus, lookup, variableCost };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MasterMileage = api;
})(this);
