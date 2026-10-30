// ELIPS Master Route Percentage: routes built from Master Location stops, their distance and the percentage
// that decides which routes (and how much) go into PR creation. Pure logic so it can be tested with Node.
(function (root) {
  const STATUS = { ACTIVE: 'Active', INACTIVE: 'Inactive' };
  const MAX_STOPS = 10, MAX_TOTAL = 100;
  const MSG = {
    locInactive: c => `Location ${c} is not an active location in Master Location.`,
    sameAsLast: c => `Location ${c} is already the last stop of the route.`,
    maxStops: `A route can have at most ${MAX_STOPS} locations.`,
    minStops: 'Route must have at least 2 locations (start and end).',
    adjacent: c => `Location ${c} cannot follow itself. Please change the order.`,
    pctReq: 'Percentage is required.',
    pctRange: 'Percentage must be a number greater than 0 and at most 100, with max 2 decimals.',
    total: (t) => `Total percentage of active routes would be ${t}%. The maximum is ${MAX_TOTAL}%.`,
    dup: c => `Route ${c} already exists. Please edit the existing route.`,
    conc: 'Error in Update because of concurrency check.',
    created: c => `Route ${c} has been successfully created.`,
    updated: c => `Route ${c} has been successfully updated.`,
    deactivated: c => `Route ${c} has been deactivated and is no longer used in PR creation.`,
  };

  const round2 = n => Math.round(n * 100) / 100;
  const code = stops => stops.join('_');
  const describe = (stops, locations) => stops.map(c => locations.find(l => l.code === c)?.name ?? c).join(' - ');

  // Distance of each leg: Master Mileage (Active) when registered, otherwise the straight-line distance
  // between the Master Location coordinates (estimate). distanceMeters is MasterLocation.distanceMeters.
  function distance(stops, locations, mileages, distanceMeters) {
    const legs = [];
    for (let i = 1; i < stops.length; i++) {
      const from = stops[i - 1], to = stops[i];
      const m = mileages.find(x => x.from === from && x.to === to && x.status === 'Active');
      if (m) { legs.push({ from, to, km: +m.mileage, source: 'Master Mileage' }); continue; }
      const a = locations.find(l => l.code === from), b = locations.find(l => l.code === to);
      const km = a && b ? round2(distanceMeters(a.lat, a.lng, b.lat, b.lng) / 1000) : 0;
      legs.push({ from, to, km, source: 'Estimate' });
    }
    return { km: round2(legs.reduce((s, l) => s + l.km, 0)), legs, estimated: legs.some(l => l.source === 'Estimate') };
  }

  // ---------- Stops in the Route Entry ----------
  function addStop(stops, c, locations) {
    if (!locations.some(l => l.code === c && l.status === 'ACTIVE')) return { ok: false, error: MSG.locInactive(c) };
    if (stops[stops.length - 1] === c) return { ok: false, error: MSG.sameAsLast(c) };
    if (stops.length >= MAX_STOPS) return { ok: false, error: MSG.maxStops };
    stops.push(c); return { ok: true };
  }
  function moveStop(stops, i, dir) {
    const j = i + (dir === 'up' ? -1 : 1);
    if (j < 0 || j >= stops.length) return false;
    [stops[i], stops[j]] = [stops[j], stops[i]]; return true;
  }
  const label = (i, n) => i === 0 ? 'START' : i === n - 1 ? 'END' : 'VIA';

  // ---------- Percentage ----------
  const totalActive = (routes, except) => round2(routes.filter(r => r !== except && r.status === STATUS.ACTIVE).reduce((s, r) => s + r.percentage, 0));
  function checkPct(value, routes, self) {
    const v = String(value ?? '').trim().replace(',', '.');
    if (!v) return { error: MSG.pctReq };
    if (!/^\d+(\.\d{1,2})?$/.test(v) || +v <= 0 || +v > MAX_TOTAL) return { error: MSG.pctRange };
    const t = round2(totalActive(routes, self) + +v);
    if (t > MAX_TOTAL) return { error: MSG.total(t) };
    return { value: +v };
  }

  function validate(form, routes, locations, self) {
    const e = {}, stops = form.stops || [];
    if (stops.length < 2) e.stops = MSG.minStops;
    else {
      const bad = stops.find(c => !locations.some(l => l.code === c && l.status === 'ACTIVE'));
      const adj = stops.find((c, i) => i && stops[i - 1] === c);
      if (bad) e.stops = MSG.locInactive(bad);
      else if (adj) e.stops = MSG.adjacent(adj);
      else if (routes.some(r => r !== self && r.status === STATUS.ACTIVE && r.code === code(stops))) e.stops = MSG.dup(code(stops));
    }
    const p = checkPct(form.percentage, routes, self);
    if (p.error) e.percentage = p.error;
    return e;
  }

  function save(form, routes, locations, mileages, distanceMeters, editing, user, now) {
    if (editing && (!routes.includes(editing.route) || editing.route.version !== editing.version || editing.route.status !== STATUS.ACTIVE)) return { ok: false, errors: { _: MSG.conc } };
    const self = editing?.route || null;
    const errors = validate(form, routes, locations, self);
    if (Object.keys(errors).length) return { ok: false, errors };
    const stops = [...form.stops], d = distance(stops, locations, mileages, distanceMeters);
    const data = { stops, code: code(stops), description: describe(stops, locations), distance: d.km, estimated: d.estimated, percentage: checkPct(form.percentage, routes, self).value };
    if (self) {
      Object.assign(self, data, { changedBy: user, changedAt: now, version: self.version + 1 });
      return { ok: true, route: self, message: MSG.updated(self.code) };
    }
    const route = { ...data, status: STATUS.ACTIVE, createdBy: user, createdAt: now, changedBy: user, changedAt: now, version: 1 };
    routes.push(route);
    return { ok: true, route, message: MSG.created(route.code) };
  }

  // Inline change of the percentage in the list
  function setPercentage(routes, route, value, user, now) {
    const p = checkPct(value, routes, route);
    if (p.error) return { ok: false, error: p.error };
    Object.assign(route, { percentage: p.value, changedBy: user, changedAt: now, version: route.version + 1 });
    return { ok: true, message: MSG.updated(route.code) };
  }
  function deactivate(routes, route, user, now) {
    if (!routes.includes(route) || route.status !== STATUS.ACTIVE) return { ok: false, error: MSG.conc };
    Object.assign(route, { status: STATUS.INACTIVE, changedBy: user, changedAt: now, version: route.version + 1 });
    return { ok: true, message: MSG.deactivated(route.code) };
  }

  // PR creation: split a quantity over the active routes by percentage (largest remainder, ties by higher percentage then code)
  function split(routes, qty) {
    const rs = routes.filter(r => r.status === STATUS.ACTIVE && r.percentage > 0);
    const sum = rs.reduce((s, r) => s + r.percentage, 0);
    if (!sum || qty <= 0) return {};
    const parts = rs.map(r => { const x = qty * r.percentage / sum; return { r, q: Math.floor(x), rest: x - Math.floor(x) }; });
    let left = qty - parts.reduce((s, p) => s + p.q, 0);
    [...parts].sort((a, b) => b.rest - a.rest || b.r.percentage - a.r.percentage || a.r.code.localeCompare(b.r.code))
      .forEach(p => { if (left > 0) { p.q++; left--; } });
    return Object.fromEntries(parts.filter(p => p.q > 0).map(p => [p.r.code, p.q]));
  }

  const api = { STATUS, MAX_STOPS, MAX_TOTAL, MSG, code, describe, distance, addStop, moveStop, label, totalActive, checkPct, validate, save, setPercentage, deactivate, split };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MasterRoutePercentage = api;
})(this);
