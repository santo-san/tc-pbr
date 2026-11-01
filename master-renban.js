// ELIPS Master Renban: renban code per plant + destination, with its source. Pure logic so it can be tested with Node.
(function (root) {
  // Options seen on the existing screen (the real lists come from their masters, TBD)
  const PLANTS = [{ code: 'KRW 3', name: 'KARAWANG PLANT' }, { code: 'STR 2', name: 'SUNTER 2 PLANT' }];
  const SOURCES = ['DPM', 'KUO', 'TDB', 'TMP', 'TMT', 'TMV', 'UMW'];
  const MAX = { dest: 10, renban: 3 };
  const MSG = {
    req: f => `${f} is required.`,
    plant: 'Plant is not registered.',
    source: 'Source is not registered.',
    format: (f, n) => `${f} must be letters / numbers only, max ${n} characters.`,
    dup: (p, d, r) => `Renban Code ${r} for Plant ${p} and Dest ${d} already exists.`,
    conc: 'Error in Update because of concurrency check.',
    created: 'Renban data has been successfully created.',
    updated: 'Renban data has been successfully updated.',
    deleted: (p, d, r) => `Renban ${p} / ${d} / ${r} has been deleted.`,
  };

  const clean = v => String(v ?? '').trim().toUpperCase();
  const plantLabel = code => { const p = PLANTS.find(x => x.code === code); return p ? `${p.code} - ${p.name}` : code; };

  // Unique key: Plant + Dest + Renban Code
  function validate(form, list, self) {
    const e = {}, f = { plant: clean(form.plant), dest: clean(form.dest), renban: clean(form.renban), source: clean(form.source) };
    if (!f.plant) e.plant = MSG.req('Plant');
    else if (!PLANTS.some(p => p.code === f.plant)) e.plant = MSG.plant;
    if (!f.dest) e.dest = MSG.req('Dest');
    else if (!new RegExp(`^[A-Z0-9]{1,${MAX.dest}}$`).test(f.dest)) e.dest = MSG.format('Dest', MAX.dest);
    if (!f.renban) e.renban = MSG.req('Renban Code');
    else if (!new RegExp(`^[A-Z0-9]{1,${MAX.renban}}$`).test(f.renban)) e.renban = MSG.format('Renban Code', MAX.renban);
    if (!f.source) e.source = MSG.req('Source');
    else if (!SOURCES.includes(f.source)) e.source = MSG.source;
    if (!e.plant && !e.dest && !e.renban && list.some(r => r !== self && r.plant === f.plant && r.dest === f.dest && r.renban === f.renban))
      e._ = MSG.dup(f.plant, f.dest, f.renban);
    return { errors: e, data: f };
  }

  function add(form, list, user, now) {
    const { errors, data } = validate(form, list, null);
    if (Object.keys(errors).length) return { ok: false, errors };
    const rec = { ...data, createdBy: user, createdAt: now, changedBy: user, changedAt: now, version: 1 };
    list.push(rec);
    return { ok: true, record: rec, message: MSG.created };
  }
  function update(form, list, rec, version, user, now) {
    if (!list.includes(rec) || rec.version !== version) return { ok: false, errors: { _: MSG.conc } };
    const { errors, data } = validate(form, list, rec);
    if (Object.keys(errors).length) return { ok: false, errors };
    Object.assign(rec, data, { changedBy: user, changedAt: now, version: rec.version + 1 });
    return { ok: true, record: rec, message: MSG.updated };
  }
  function remove(list, rec) {
    const i = list.indexOf(rec);
    if (i < 0) return { ok: false, error: MSG.conc };
    list.splice(i, 1);
    return { ok: true, message: MSG.deleted(rec.plant, rec.dest, rec.renban) };
  }

  const api = { PLANTS, SOURCES, MAX, MSG, plantLabel, validate, add, update, remove };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MasterRenban = api;
})(this);
