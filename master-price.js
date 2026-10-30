// ELIPS Master Price (Pricing Data): price status and price lookup for PR Monthly.
// Prices come from eCatalogue (read only on the screen). Pure logic so it can be tested with Node.
(function (root) {
  const COMPONENT = {
    FIX: { code: 'FIX', label: 'Fix Cost', meaning: 'Monthly Price', unit: 'month', basis: 'SPK GAD: vehicle + driver rental for one month' },
    KM: { code: 'KM', label: 'Mileage', meaning: 'Price per KM', unit: 'KM', basis: 'Vehicle maintenance cost x actual KM traveled' },
  };
  const STATUS = { ACTIVE: 'Active', EXPIRED: 'Expired', FUTURE: 'Future' };

  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const periodStart = p => `${p.slice(0, 4)}-${p.slice(4, 6)}-01`;
  function periodEnd(p) {
    const d = new Date(+p.slice(0, 4), +p.slice(4, 6), 0);
    return ymd(d);
  }

  // Status of a price on a given date (YYYY-MM-DD): Future / Active / Expired by its effective period
  function status(rec, today) {
    if (rec.effStart > today) return STATUS.FUTURE;
    if (rec.effEnd < today) return STATUS.EXPIRED;
    return STATUS.ACTIVE;
  }

  // Price used when creating a PR Monthly for production period YYYYMM:
  // the record of the partner / component (and vehicle type) whose effective period covers the whole month;
  // an expired price is never used for a new PR Monthly.
  function priceForPR(list, { partner, component, period, vehicleType }, today) {
    const from = periodStart(period), to = periodEnd(period);
    const cands = list.filter(r => r.partner === partner && r.component === component && (!vehicleType || r.vehicleType === vehicleType)
      && r.effStart <= from && r.effEnd >= to);
    const usable = cands.filter(r => status(r, today) !== STATUS.EXPIRED);
    if (!cands.length) return { ok: false, error: `No ${COMPONENT[component].meaning} found in Master Price for ${partner} period ${period}.` };
    if (!usable.length) return { ok: false, error: `${COMPONENT[component].meaning} for ${partner} period ${period} is expired and cannot be used for a new PR Monthly.` };
    if (usable.length > 1) return { ok: false, error: `More than one valid ${COMPONENT[component].meaning} for ${partner} period ${period}. Please check eCatalogue data.` };
    return { ok: true, record: usable[0], price: usable[0].price };
  }

  // Data checks shown in the summary: overlapping effective periods for the same partner / component / vehicle type
  function overlaps(list) {
    const out = [];
    list.forEach((a, i) => list.slice(i + 1).forEach(b => {
      if (a.partner === b.partner && a.component === b.component && a.vehicleType === b.vehicleType && a.effStart <= b.effEnd && b.effStart <= a.effEnd) out.push([a, b]);
    }));
    return out;
  }

  // Summary of active data: counts per status and partners without an active price per component
  function summary(list, partners, today) {
    const s = { [STATUS.ACTIVE]: 0, [STATUS.EXPIRED]: 0, [STATUS.FUTURE]: 0, activeFix: 0, activeKm: 0, missing: { FIX: [], KM: [] } };
    list.forEach(r => {
      const st = status(r, today); s[st]++;
      if (st === STATUS.ACTIVE) s[r.component === 'FIX' ? 'activeFix' : 'activeKm']++;
    });
    partners.forEach(p => ['FIX', 'KM'].forEach(c => {
      if (!list.some(r => r.partner === p && r.component === c && status(r, today) === STATUS.ACTIVE)) s.missing[c].push(p);
    }));
    s.overlaps = overlaps(list).length;
    return s;
  }

  const api = { COMPONENT, STATUS, ymd, periodStart, periodEnd, status, priceForPR, overlaps, summary };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MasterPrice = api;
})(this);
