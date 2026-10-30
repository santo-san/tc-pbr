// ELIPS Master Priority: priority order of routes (From -> To), the reference for Trucking Payment by Resource.
// Priority 1 is the highest; numbers are always 1..n without gaps. Pure logic so it can be tested with Node.
(function (root) {
  const MSG = {
    fromReq: 'From is required.',
    toReq: 'To is required.',
    same: 'From and To cannot be the same.',
    locInactive: code => `Location ${code} is not an active location in Master Location.`,
    noMileage: (f, t) => `Route ${f} -> ${t} is not registered in Master Mileage. Please register the mileage first.`,
    dup: (f, t) => `Route ${f} -> ${t} already has a priority. Please edit the existing record.`,
    range: max => `Priority must be a whole number between 1 and ${max}.`,
    conc: 'Error in Update because of concurrency check.',
    created: (f, t, p) => `Route ${f} -> ${t} has been added with priority ${p}.`,
    updated: (f, t, p) => `Route ${f} -> ${t} has been updated with priority ${p}.`,
    deleted: (f, t) => `Route ${f} -> ${t} has been deleted. Priorities have been renumbered.`,
    moved: (f, t, p) => `Route ${f} -> ${t} moved to priority ${p}.`,
  };

  const trip = r => `${r.from}${r.to}`;
  const sorted = list => [...list].sort((a, b) => a.priority - b.priority);
  const renumber = list => sorted(list).forEach((r, i) => { r.priority = i + 1; });

  // Validation shared by Add and Edit. `self` is the record being edited (excluded from the duplicate check).
  function validate(form, list, locations, mileages, self) {
    const e = {};
    const from = (form.from || '').trim(), to = (form.to || '').trim(), p = String(form.priority ?? '').trim();
    if (!from) e.from = MSG.fromReq;
    if (!to) e.to = MSG.toReq;
    if (from && to && from === to) e.to = MSG.same;
    const active = c => locations.some(l => l.code === c && l.status === 'ACTIVE');
    if (from && !e.from && !active(from)) e.from = MSG.locInactive(from);
    if (to && !e.to && !active(to)) e.to = MSG.locInactive(to);
    if (!e.from && !e.to) {
      if (list.some(r => r !== self && r.from === from && r.to === to)) e._ = MSG.dup(from, to);
      else if (!mileages.some(m => m.from === from && m.to === to && m.status === 'Active')) e._ = MSG.noMileage(from, to);
    }
    const max = self ? list.length : list.length + 1;
    if (p && !(/^\d+$/.test(p) && +p >= 1 && +p <= max)) e.priority = MSG.range(max);
    return e;
  }

  // Put `rec` at position p (1-based) and renumber the rest
  function place(list, rec, p) {
    const others = sorted(list.filter(r => r !== rec));
    others.splice(p - 1, 0, rec);
    others.forEach((r, i) => { r.priority = i + 1; });
  }

  // Add: blank priority = last; otherwise insert and shift the routes at and below that priority down by one
  function add(form, list, locations, mileages, user, now) {
    const errors = validate(form, list, locations, mileages, null);
    if (Object.keys(errors).length) return { ok: false, errors };
    const p = String(form.priority ?? '').trim() ? +form.priority : list.length + 1;
    const rec = { from: form.from.trim(), to: form.to.trim(), priority: 0, createdBy: user, createdAt: now, updatedBy: user, updatedAt: now, version: 1 };
    list.push(rec); place(list, rec, p);
    return { ok: true, record: rec, message: MSG.created(rec.from, rec.to, p) };
  }

  // Edit: route and / or priority; blank priority keeps the current one
  function update(form, list, locations, mileages, rec, version, user, now) {
    if (rec.version !== version || !list.includes(rec)) return { ok: false, errors: { _: MSG.conc } };
    const errors = validate(form, list, locations, mileages, rec);
    if (Object.keys(errors).length) return { ok: false, errors };
    const p = String(form.priority ?? '').trim() ? +form.priority : rec.priority;
    Object.assign(rec, { from: form.from.trim(), to: form.to.trim(), updatedBy: user, updatedAt: now, version: rec.version + 1 });
    place(list, rec, p);
    return { ok: true, record: rec, message: MSG.updated(rec.from, rec.to, p) };
  }

  // Up / Down: swap with the neighbour; only the two swapped records get new audit data
  function move(list, rec, dir, user, now) {
    const s = sorted(list), i = s.indexOf(rec), j = i + (dir === 'up' ? -1 : 1);
    if (i < 0 || j < 0 || j >= s.length) return { ok: false };
    const other = s[j];
    [rec.priority, other.priority] = [other.priority, rec.priority];
    [rec, other].forEach(r => Object.assign(r, { updatedBy: user, updatedAt: now, version: r.version + 1 }));
    return { ok: true, message: MSG.moved(rec.from, rec.to, rec.priority) };
  }

  // Delete: remove and close the gap
  function remove(list, rec) {
    const i = list.indexOf(rec);
    if (i < 0) return { ok: false, errors: { _: MSG.conc } };
    list.splice(i, 1); renumber(list);
    return { ok: true, message: MSG.deleted(rec.from, rec.to) };
  }

  // Trucking Payment by Resource: order candidate routes by priority (routes without priority last)
  function rank(list, from, to) { return list.find(r => r.from === from && r.to === to)?.priority ?? null; }
  function byPriority(list, routes) {
    const p = r => rank(list, r.from, r.to) ?? Infinity;
    return [...routes].sort((a, b) => p(a) - p(b));
  }

  const api = { MSG, trip, sorted, renumber, validate, add, update, move, remove, rank, byPriority };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MasterPriority = api;
})(this);
