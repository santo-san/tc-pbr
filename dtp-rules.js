// ELIPS TC-PBR DTP Creation (Daily Trucking Plan) with one Universal DTP model for Import and Export.
// Records come from Excel upload, manual entry or the BEST interface; the planner submits them, a queue processes them
// and each processed record becomes a Daily order (Planning Order / DTP Creation Release) for the LP Admin.
// Pure logic (no DOM) so it can be tested with Node.
(function (root) {
  const MODEL = { code: 'UNIVERSAL', label: 'Universal DTP', desc: 'Import / Export' };
  const IO = ['IMPORT', 'EXPORT'];
  const SOURCE = { BEST: 'BEST Interface', EXCEL: 'Excel Upload', MANUAL: 'Manual Entry' };
  const STATUS = {
    AVAILABLE: 'Available', ERROR: 'Validation Error', READY: 'Ready to Submit', SUBMITTED: 'Submitted',
    QUEUED: 'Queued', PROCESSING: 'Processing', PROCESSED: 'Processed', FAILED: 'Failed',
  };
  const SELECTABLE = [STATUS.AVAILABLE, STATUS.READY];
  const LOCKED = [STATUS.SUBMITTED, STATUS.QUEUED, STATUS.PROCESSING, STATUS.PROCESSED];
  // Calendar entry colours (orders of a date, see batchStatus)
  const CAL = { WAIT: 'Waiting Assignment', ASSIGNED: 'Assigned to Truck', REJECTED: 'Rejected by LP', FINISH: 'Order Finish' };

  // Columns of the standard Excel template (format DTP), in template order. * = mandatory in the template.
  const COLUMNS = [
    ['roundUse', 'ROUNDUSE', true], ['lp', 'LP', true], ['renban', 'RENBAN', true], ['from', 'FROM LOCATION', true],
    ['to', 'TO LOCATION', true], ['dest', 'DESTINATION', true], ['etd', 'ETD', true], ['ctrSize', 'CONTAINER SIZE', true],
    ['agent', 'SHIPPING AGENT', false], ['bookNo', 'CTR BOOKING NO', false], ['vessel', 'VESSEL NAME', false],
    ['truckType', 'TRUCK TYPE', true], ['container', 'CONTAINER NO', false], ['description', 'DESCRIPTION', false],
    ['shift', 'SHIFT', false], ['dg', 'CTR DG FLAG', false], ['arrDate', 'ARRIVAL DATE', false], ['arrTime', 'ARRIVAL TIME', false],
  ].map(([key, label, required]) => ({ key, label, required }));
  // Fields that are not in the template: operation type (screen header or interface), exporter and importer (interface)
  const EXTRA = [{ key: 'io', label: 'IMPORT/EXPORT', required: true }, { key: 'exporter', label: 'EXPORTER', required: false }, { key: 'importerCd', label: 'IMPORTER CD', required: false }];
  const OPTIONS = { roundUse: ['Y', 'N'], ctrSize: ['20', '40', '40 HC', '45'], shift: ['DAY', 'NIGHT'], dg: ['DG'], io: IO };
  const label = k => [...COLUMNS, ...EXTRA].find(c => c.key === k).label;

  const MSG = {
    noAuth: 'Only the VPLD Planner can create DTP.',
    noConfig: 'System Master DTP date range (backdate / advance days) is not configured. Please contact the system administrator.',
    backdate: (d, n) => `Planning date ${d} is before the allowed backdate range (${n} day(s) before today).`,
    advance: (d, n) => `Planning date ${d} is after the allowed advance range (${n} day(s) after today).`,
    modelReq: 'Please select the Universal DTP.',
    req: l => `${l} is required.`,
    option: (l, v, opts) => `${l} "${v}" is not valid (${opts.join(' / ')}).`,
    code: (l, v) => `${l} "${v}" is not registered in the data mapping.`,
    same: 'TO LOCATION cannot be the same as FROM LOCATION.',
    format: l => `${l} must be letters / numbers only (max 20).`,
    date: l => `${l} is not a valid date.`,
    time: l => `${l} is not a valid time (HH:MM).`,
    dupFile: (k, n) => `Duplicate ${k} in row ${n} of the same file.`,
    dupGrid: (k, s) => `${k} already exists in the grid (status ${s}).`,
    submitted: (k, s) => `${k} has already been submitted (status ${s}). It cannot be submitted again.`,
    fileType: 'Invalid file. Please upload the Excel template (.xlsx / .xls).',
    header: miss => `Invalid Excel format: column(s) ${miss} not found. Please use the Download Template format.`,
    empty: 'The Excel file has no data rows.',
    uploadErr: n => `${n} row(s) failed validation. No record was added. Please correct the file and upload again.`,
    uploaded: n => `${n} record(s) uploaded and validated.`,
    noSelect: 'Select at least one eligible record.',
    notEligible: n => `${n} selected record(s) are no longer eligible (already submitted or invalid).`,
    confirm: (n, d) => `Submit ${n} delivery record(s) as DTP for ${d}? Submitted records cannot be submitted again.`,
    submittedOk: n => `${n} record(s) submitted and sent to the processing queue.`,
    // DTP Switching (rollback of a submitted DTP)
    swNotSubmitted: 'DTP has not been submitted. There is nothing to roll back.',
    swDriverStarted: 'DTP cannot be rolled back because the driver has already started the process.',
    swNotEligible: 'DTP is no longer eligible for rollback. Please refresh the data and try again.',
    swNoSelect: 'Select at least one submitted DTP record that the driver has not started.',
    swFailed: n => `${n} selected record(s) cannot be rolled back. Nothing was rolled back.`,
    swError: 'DTP rollback failed. No data was changed. Please try again.',
    swOk: 'DTP rollback completed successfully.',
    swConfirm: 'Are you sure you want to rollback this DTP submission? The DTP will become available for correction and resubmission.',
  };

  // ---------- Dates ----------
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return ymd(new Date(y, m - 1, d + n)); };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtLong = s => { const [y, m, d] = s.split('-'); return `${d}-${MON[+m - 1]}-${y}`; };   // 10-Nov-2026
  const fmtDmy = s => s ? s.split('-').reverse().join('/') : '';
  // System Master: how many days back / ahead the planner may create DTP
  function dateRange(today, cfg) {
    if (!cfg || !Number.isInteger(cfg.backdateDays) || !Number.isInteger(cfg.advanceDays)) return null;
    return { min: addDays(today, -cfg.backdateDays), max: addDays(today, cfg.advanceDays) };
  }
  function dateCheck(date, today, cfg) {
    const r = dateRange(today, cfg);
    if (!r) return MSG.noConfig;
    if (date < r.min) return MSG.backdate(fmtLong(date), cfg.backdateDays);
    if (date > r.max) return MSG.advance(fmtLong(date), cfg.advanceDays);
    return null;
  }
  const canCreate = actor => actor.role === 'PLANNER';

  // ---------- Values ----------
  // Excel cells may be Date objects, numbers or text
  function cellText(v) {
    if (v == null) return '';
    if (v instanceof Date) return ymd(v);
    return String(v).trim();
  }
  // Excel serial number (1900 date system) -> date / time parts
  const fromSerial = n => { const d = new Date(Math.round((n - 25569) * 86400000)); return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) }; };
  function normDate(v) {
    if (typeof v === 'number') return fromSerial(v).date;
    const s = cellText(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);   // dd/mm/yyyy
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s;
  }
  function normTime(v) {
    if (typeof v === 'number') return fromSerial(v % 1).time;
    if (v instanceof Date) return `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`;
    const s = cellText(v), m = s.match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : s;
  }
  function normalize(raw) {
    const r = {};
    [...COLUMNS, ...EXTRA].forEach(c => { r[c.key] = cellText(raw[c.key]); });
    ['roundUse', 'lp', 'renban', 'from', 'to', 'dest', 'ctrSize', 'agent', 'bookNo', 'vessel', 'truckType', 'shift', 'dg', 'io', 'exporter', 'importerCd']
      .forEach(k => { r[k] = r[k].toUpperCase(); });
    r.container = r.container.toUpperCase().replace(/[\s-]/g, '');
    r.etd = normDate(raw.etd); r.arrDate = normDate(raw.arrDate); r.arrTime = normTime(raw.arrTime);
    return r;
  }

  // ctx: { lps: [codes], from: [codes], to: [codes], containerError(no) }
  function validate(raw, ctx) {
    const r = normalize(raw), e = {};
    [...COLUMNS, ...EXTRA].forEach(c => { if (c.required && !r[c.key]) e[c.key] = MSG.req(c.label); });
    Object.entries(OPTIONS).forEach(([k, opts]) => { if (r[k] && !opts.includes(r[k])) e[k] = MSG.option(label(k), r[k], opts); });
    if (r.lp && !ctx.lps.includes(r.lp)) e.lp = MSG.code('LP', r.lp);
    if (r.from && !ctx.from.includes(r.from)) e.from = MSG.code('FROM LOCATION', r.from);
    if (r.to && !ctx.to.includes(r.to)) e.to = MSG.code('TO LOCATION', r.to);
    if (!e.from && !e.to && r.from && r.from === r.to) e.to = MSG.same;
    ['renban', 'dest', 'bookNo', 'importerCd'].forEach(k => { if (r[k] && !/^[A-Z0-9]{1,20}$/.test(r[k])) e[k] = MSG.format(label(k)); });
    ['etd', 'arrDate'].forEach(k => { if (r[k] && !/^\d{4}-\d{2}-\d{2}$/.test(r[k])) e[k] = MSG.date(label(k)); });
    if (r.arrTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.arrTime)) e.arrTime = MSG.time(label('arrTime'));
    if (r.container) { const ce = ctx.containerError(r.container); if (ce) e.container = ce; }
    return { record: r, errors: e };
  }

  // Duplicate key: Container No, otherwise Ctr Booking No (TBD: other keys for records without both)
  const dupKey = r => r.container ? `Container ${r.container}` : r.bookNo ? `Booking ${r.bookNo}` : null;
  // Check new records against each other and against the records already in the grid / submitted
  function duplicates(news, existing) {
    const out = {}, seen = new Map();
    news.forEach((r, i) => {
      const k = dupKey(r); if (!k) return;
      if (seen.has(k)) { out[i] = MSG.dupFile(k, seen.get(k)); return; }
      seen.set(k, r.row ?? i + 1);
      const ex = existing.find(x => x !== r && x.status !== STATUS.FAILED && dupKey(x) === k);
      if (ex) out[i] = LOCKED.includes(ex.status) ? MSG.submitted(k, ex.status) : MSG.dupGrid(k, ex.status);
    });
    return out;
  }

  // ---------- Excel ----------
  const normHead = h => String(h ?? '').toUpperCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  // rows = array of arrays (sheet_to_json header:1). The header row is the first row that contains ROUNDUSE.
  function readSheet(rows) {
    const hi = rows.findIndex(r => (r || []).some(c => normHead(c) === 'ROUNDUSE'));
    if (hi < 0) return { error: MSG.header('ROUNDUSE') };
    const head = rows[hi].map(normHead);
    const idx = Object.fromEntries([...COLUMNS, ...EXTRA].map(c => [c.key, head.indexOf(c.label)]));
    const miss = COLUMNS.filter(c => idx[c.key] < 0).map(c => c.label);
    if (miss.length) return { error: MSG.header(miss.join(', ')) };
    const data = [];
    rows.slice(hi + 1).forEach((r, i) => {
      const rec = Object.fromEntries([...COLUMNS, ...EXTRA].map(c => [c.key, idx[c.key] >= 0 ? (r || [])[idx[c.key]] : '']));
      if (COLUMNS.some(c => cellText(rec[c.key]))) data.push({ ...rec, row: hi + i + 2 });   // Excel row number
    });
    if (!data.length) return { error: MSG.empty };
    return { records: data };
  }
  // Upload: all rows must be valid, otherwise nothing is added and every error is reported per row
  function upload(rows, { io, grid, ctx }) {
    const sheet = readSheet(rows);
    if (sheet.error) return { ok: false, error: sheet.error };
    const checked = sheet.records.map(raw => { const v = validate({ ...raw, io: raw.io || io }, ctx); v.record.row = raw.row; return v; });
    const dup = duplicates(checked.map(c => c.record), grid);
    const rowErrors = [];
    checked.forEach((c, i) => {
      Object.entries(c.errors).forEach(([k, m]) => rowErrors.push({ row: c.record.row, column: label(k), message: m }));
      if (dup[i]) rowErrors.push({ row: c.record.row, column: dupKey(c.record).split(' ')[0].toUpperCase(), message: dup[i] });
    });
    if (rowErrors.length) return { ok: false, error: MSG.uploadErr(new Set(rowErrors.map(e => e.row)).size), rowErrors };
    return { ok: true, records: checked.map(c => c.record), message: MSG.uploaded(checked.length) };
  }

  // ---------- Records in the grid ----------
  // A record from any source; invalid interface records stay in the grid with Validation Error (never dropped)
  function makeRecord(raw, { id, date, source, grid, ctx }) {
    const { record, errors } = validate(raw, ctx);
    const dup = duplicates([record], grid)[0];
    if (dup) errors._ = dup;
    return { ...record, id, date, source, status: Object.keys(errors).length ? STATUS.ERROR : STATUS.AVAILABLE, errors, orderNo: '', attempts: 0, failReason: '', history: [] };
  }
  // Edit (manual correction) re-validates the record
  function revalidate(rec, changes, grid, ctx) {
    if (LOCKED.includes(rec.status)) return { ok: false, error: MSG.submitted(dupKey(rec) || 'Record', rec.status) };
    const { record, errors } = validate({ ...rec, ...changes }, ctx);
    const dup = duplicates([record], grid.filter(x => x !== rec))[0];
    if (dup) errors._ = dup;
    if (Object.keys(errors).length) return { ok: false, errors };
    Object.assign(rec, record, { status: STATUS.AVAILABLE, errors: {} });
    return { ok: true };
  }
  const selectable = r => SELECTABLE.includes(r.status);

  // ---------- DTP Switching (rollback of a submitted DTP while the driver has not started) - SW-01 .. SW-09 ----------
  // Submitted states that can be rolled back. Processing is excluded: the queue service is creating the Daily order right now.
  const SWITCHABLE = [STATUS.SUBMITTED, STATUS.QUEUED, STATUS.PROCESSED, STATUS.FAILED];
  // Driver started = Daily order is beyond Planning Order / Order Release, or any cycle has a Start Cycle time
  const driverStarted = (o, W) => !!o && (o.cycles.some(c => c.startAt) || ![W.ORDER.PLAN, W.ORDER.REL].includes(o.status));
  function switchCheck(r, orders, W) {
    if (r.status === STATUS.PROCESSING) return { code: 'NOT_ELIGIBLE', msg: MSG.swNotEligible };
    if (!SWITCHABLE.includes(r.status)) return { code: 'NOT_SUBMITTED', msg: MSG.swNotSubmitted };
    if (r.status === STATUS.PROCESSED) {
      const o = orders.find(x => x.orderNo === r.orderNo);
      if (!o) return { code: 'NOT_ELIGIBLE', msg: MSG.swNotEligible };
      if (driverStarted(o, W)) return { code: 'DRIVER_STARTED', msg: MSG.swDriverStarted };
    }
    return null;
  }
  const canSwitch = (r, orders, W) => !switchCheck(r, orders, W);

  // ---------- DTP Creation vs Master KPI monitoring (per date and trucking company) - KM-01 .. KM-08 ----------
  // Master KPI Order Sharing = daily order share (daily QTY) of the trucking company; 1 DTP record = 1 Daily order,
  // so Assigned = number of DTP records of the date and LP that consume the allocation (same unit).
  // Consuming: submitted to the trucking company and not rolled back (Submitted, Queued, Processing, Processed, Failed);
  // a processed order rejected by the LP Admin does not consume (returned to the planner). Rule TBD (OQ).
  const CONSUMING = [STATUS.SUBMITTED, STATUS.QUEUED, STATUS.PROCESSING, STATUS.PROCESSED, STATUS.FAILED];
  const KPI_WARN = 80;   // usage % from which the indicator is yellow (TBD)
  const consumes = (r, rejected) => CONSUMING.includes(r.status) && !rejected(r);
  function kpiMonitor({ date, records, lps, kpiRows, applicable, byResource, rejected = () => false }) {
    const recs = records.filter(r => r.date === date);
    const codes = [...new Set([...lps, ...recs.map(r => r.lp).filter(Boolean)])];
    const rows = codes.map(lp => {
      const mine = recs.filter(r => r.lp === lp);
      const assigned = mine.filter(r => consumes(r, rejected)).length;
      const rejectedN = mine.filter(r => r.status === STATUS.PROCESSED && rejected(r)).length;
      const selected = mine.filter(r => r.status === STATUS.READY).length;
      const k = applicable(kpiRows, lp, date);
      const base = { lp, assigned, rejected: rejectedN, selected, open: mine.filter(r => r.status === STATUS.AVAILABLE || r.status === STATUS.ERROR).length };
      if (!k) return { ...base, kpi: 'NONE', limit: null, remaining: null, over: 0, usage: null, level: 'none', after: assigned + selected, afterOver: 0 };
      if (k.paymentType !== byResource) return { ...base, kpi: 'NOT_BY_RESOURCE', paymentType: k.paymentType, limit: null, remaining: null, over: 0, usage: null, level: 'none', after: assigned + selected, afterOver: 0 };
      const limit = +k.orderSharing || 0, after = assigned + selected;
      const usage = limit > 0 ? Math.round(assigned / limit * 100) : (assigned > 0 ? null : 0);
      const level = assigned >= limit ? 'full' : usage >= KPI_WARN ? 'warn' : 'ok';
      return { ...base, kpi: 'OK', limit, remaining: Math.max(0, limit - assigned), over: Math.max(0, assigned - limit), usage, level, after, afterOver: Math.max(0, after - limit) };
    });
    const withKpi = rows.filter(r => r.kpi === 'OK');
    const total = { limit: withKpi.reduce((t, r) => t + r.limit, 0), assigned: withKpi.reduce((t, r) => t + r.assigned, 0), noKpiAssigned: rows.filter(r => r.kpi !== 'OK').reduce((t, r) => t + r.assigned, 0), remaining: withKpi.reduce((t, r) => t + r.remaining, 0),
      over: rows.reduce((t, r) => t + r.over, 0), selected: rows.reduce((t, r) => t + r.selected, 0) };
    return { rows, total };
  }
  // All-or-nothing, like Submit: every selected record is checked again immediately before the rollback (backend check);
  // one non-eligible record rejects the whole request. ctx: { at, actor, orders, W, grid, vctx, dequeue(id), removeOrder(o), fail }
  function switchBack(records, ctx) {
    const { at, actor, orders, W } = ctx;
    if (!canCreate(actor)) return { ok: false, status: 403, error: MSG.noAuth };
    if (!records.length) return { ok: false, status: 400, error: MSG.swNoSelect };
    const failed = records.map(r => ({ r, e: switchCheck(r, orders, W) })).filter(x => x.e)
      .map(({ r, e }) => ({ id: r.id, key: dupKey(r) || `Record ${r.id}`, status: r.status, code: e.code, msg: e.msg }));
    if (failed.length) return { ok: false, status: 409, error: MSG.swFailed(failed.length), failed };
    const plan = records.map(r => ({ r, prev: r.status, o: r.status === STATUS.PROCESSED ? orders.find(x => x.orderNo === r.orderNo) : null }));
    if (ctx.fail) return { ok: false, status: 500, error: MSG.swError };   // DB error before commit: nothing applied (rollback)
    plan.forEach(({ r, prev, o }) => {
      if (prev !== STATUS.PROCESSED) ctx.dequeue(r.id);
      const snap = o ? { orderNo: o.orderNo, orderStatus: o.status, cycle: o.cycles[0]?.status || '', truck: o.truck || '', driver: o.driver || '',
        lpStatus: o.lpRejected ? 'Rejected' : o.lpAccepted ? 'Accepted' : 'Waiting', history: o.history.map(h => ({ ...h })) } : null;
      if (o) ctx.removeOrder(o);
      (r.switchLog = r.switchLog || []).push({ at, by: actor.name, from: prev, order: snap });
      Object.assign(r, { status: STATUS.AVAILABLE, orderNo: '', submittedAt: null, submittedBy: '', attempts: 0, failReason: '', failOnce: false });
      const v = revalidate(r, {}, ctx.grid, ctx.vctx);
      if (!v.ok) Object.assign(r, { status: STATUS.ERROR, errors: v.errors || { _: v.error } });
      r.history.push({ at, status: r.status, note: `DTP Switching by ${actor.name}: rollback from ${prev}` + (snap ? `; Daily order ${snap.orderNo} (${snap.orderStatus}, LP ${snap.lpStatus}${snap.truck ? `, truck ${snap.truck}` : ''}) cancelled` : '') });
    });
    return { ok: true, status: 200, message: MSG.swOk, count: records.length };
  }

  // Submit: only eligible records; they leave the selectable set at once (no double submission)
  function submit(records, { at, actor, date, today, cfg }) {
    if (!canCreate(actor)) return { ok: false, error: MSG.noAuth };
    const dc = dateCheck(date, today, cfg);
    if (dc) return { ok: false, error: dc };
    if (!records.length) return { ok: false, error: MSG.noSelect };
    const bad = records.filter(r => !selectable(r) || Object.keys(r.errors || {}).length);
    if (bad.length) return { ok: false, error: MSG.notEligible(bad.length) };
    records.forEach(r => {
      Object.assign(r, { status: STATUS.SUBMITTED, submittedAt: at, submittedBy: actor.name });
      r.history.push({ at, status: STATUS.SUBMITTED, note: `Submitted by ${actor.name}` });
    });
    return { ok: true, message: MSG.submittedOk(records.length) };
  }
  // Queue steps (the background service in the mock-up runs them with a delay)
  function step(rec, to, at, note) { rec.status = to; rec.history.push({ at, status: to, note: note || '' }); }
  // Failed records can be sent to the queue again
  const canRetry = r => r.status === STATUS.FAILED;

  // Daily order created for a processed record (shown to the LP Admin)
  function orderPayload(r, names) {
    return { date: r.date, type: 'Universal', supplier: names.lp(r.lp), from: names.from(r.from), to: names.to(r.to), renban: r.renban,
      shift: r.shift || '-', planned: r.roundUse === 'Y' ? 2 : 1 };
  }

  // ---------- DTP Maintenance (calendar entry > DTP n List): edit / cancel a DTP while the driver has not started - MT-01 .. MT-08 ----------
  const SERVICE_TYPES = { EXPORT: 'CONTAINER FOR EXPORT', IMPORT: 'CONTAINER FOR IMPORT' };
  const CTR_TYPES = ['GP', 'HC'];
  const MT_MSG = {
    driverStarted: 'DTP cannot be cancelled or changed because the driver has already started the process.',
    notFound: 'Daily order is no longer available. Please refresh the data and try again.',
    nothing: 'There is no change to save.',
    invalid: n => `${n} DTP row(s) have invalid data. Please correct the highlighted fields.`,
    blocked: n => `${n} DTP row(s) can no longer be changed (driver started / order missing). Nothing was saved.`,
    ok: (c, e) => `${c} DTP cancelled, ${e} DTP updated.`,
    dbError: 'Save failed. No data was changed. Please try again.',
  };
  // Row values of the maintenance grid from the DTP record (Universal DTP) or, for orders without a record, from the order
  function maintValues(o, r, names) {
    if (r) {
      const hc = /\bHC$/.test(r.ctrSize || '');
      return { roundUse: r.roundUse || 'N', lp: r.lp, renban: r.renban, from: r.from, to: r.to, dest: r.dest || '', etd: r.etd || '', ctrSize: (r.ctrSize || '').replace(/\s*HC$/, ''),
        ctrType: r.ctrSize ? (hc ? 'HC' : 'GP') : '', agent: r.agent || '', bookNo: r.bookNo || '', container: o?.cycles?.find(c => c.container)?.container || r.container || '',
        dg: r.dg === 'DG' ? 'Y' : 'N', vessel: r.vessel || '', truckType: r.truckType || '', description: r.description || '',
        serviceType: SERVICE_TYPES[r.io] || '', shift: r.shift || '', arrDate: r.arrDate || '', arrTime: r.arrTime || '' };
    }
    const m = o.maint || {};
    return { roundUse: o.planned > 1 ? 'Y' : 'N', lp: names.lpCode(o.supplier), renban: o.renban || '', from: names.fromCode(o.from), to: names.toCode(o.to),
      dest: m.dest || '', etd: m.etd || '', ctrSize: m.ctrSize || '', ctrType: m.ctrType || '', agent: m.agent || '', bookNo: m.bookNo || '',
      container: o.cycles.find(c => c.container)?.container || '', dg: m.dg || 'N', vessel: m.vessel || '', truckType: m.truckType || '', description: m.description || '',
      serviceType: m.serviceType || '', shift: o.shift && o.shift !== '-' ? o.shift : '', arrDate: m.arrDate || '', arrTime: m.arrTime || '' };
  }
  // Grid values -> DTP record fields (container is entered by the driver at Pick Up, not here)
  const maintToRecord = v => ({ roundUse: v.roundUse, lp: v.lp, renban: v.renban, from: v.from, to: v.to, dest: v.dest, etd: v.etd,
    ctrSize: v.ctrType === 'HC' ? `${v.ctrSize} HC` : v.ctrSize, agent: v.agent, bookNo: v.bookNo, dg: v.dg === 'Y' ? 'DG' : '', vessel: v.vessel,
    truckType: v.truckType, description: v.description, io: Object.keys(SERVICE_TYPES).find(k => SERVICE_TYPES[k] === v.serviceType) || '', shift: v.shift,
    arrDate: v.arrDate, arrTime: v.arrTime });
  // MT-01: edit / cancel only while the driver has not started (same rule as DTP Switching)
  const maintCheck = (o, W) => !o ? { code: 'NOT_FOUND', msg: MT_MSG.notFound } : driverStarted(o, W) ? { code: 'DRIVER_STARTED', msg: MT_MSG.driverStarted } : null;
  // MT-03: validation of an edited row. With a DTP record: the DTP Creation rules; without: the order fields only.
  function maintValidate(v, r, ctx) {
    if (r) {
      const { errors } = validate({ ...r, ...maintToRecord(v), container: r.container }, ctx);
      const e = {};
      Object.entries(errors).forEach(([k, m]) => { e[k === 'io' ? 'serviceType' : k === 'ctrSize' && v.ctrType === 'HC' ? 'ctrType' : k] = m; });
      return e;
    }
    const e = {};
    if (!ctx.lps.includes(v.lp)) e.lp = v.lp ? MSG.code('LP', v.lp) : MSG.req('LP');
    if (!v.renban) e.renban = MSG.req('RENBAN'); else if (!/^[A-Z0-9]{1,20}$/.test(v.renban)) e.renban = MSG.format('RENBAN');
    if (!v.from) e.from = MSG.req('FROM LOCATION');
    if (!v.to) e.to = MSG.req('TO LOCATION'); else if (v.from && v.from === v.to) e.to = MSG.same;
    if (v.shift && !OPTIONS.shift.includes(v.shift)) e.shift = MSG.option('SHIFT', v.shift, OPTIONS.shift);
    ['etd', 'arrDate'].forEach(k => { if (v[k] && !/^\d{4}-\d{2}-\d{2}$/.test(v[k])) e[k] = MSG.date(k === 'etd' ? 'ETD' : 'ARRIVAL DATE'); });
    if (v.arrTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.arrTime)) e.arrTime = MSG.time('ARRIVAL TIME');
    return e;
  }
  // MT-04 .. MT-07: save all pending cancellations and edits in one transaction (all-or-nothing, as Submit DT-15)
  // rows: [{ key, o, r, cancel, values }]; ctx: { at, actor, W, vctx, names, removeOrder, removeRecord, fail }
  function maintSave(rows, ctx) {
    const { at, actor, W } = ctx;
    if (!canCreate(actor)) return { ok: false, status: 403, error: MSG.noAuth };
    if (!rows.length) return { ok: false, status: 400, error: MT_MSG.nothing };
    const blocked = rows.map(x => ({ key: x.key, e: maintCheck(x.o, W) })).filter(x => x.e);   // re-check: the driver may have started meanwhile
    if (blocked.length) return { ok: false, status: 409, error: MT_MSG.blocked(blocked.length), failed: blocked.map(x => ({ key: x.key, code: x.e.code, msg: x.e.msg })) };
    const errors = {};
    rows.filter(x => !x.cancel).forEach(x => { const e = maintValidate(x.values, x.r, ctx.vctx); if (Object.keys(e).length) errors[x.key] = e; });
    if (Object.keys(errors).length) return { ok: false, status: 422, error: MT_MSG.invalid(Object.keys(errors).length), errors };
    if (ctx.fail) return { ok: false, status: 500, error: MT_MSG.dbError };   // DB error before commit: nothing applied
    let cancelled = 0, updated = 0;
    rows.forEach(({ o, r, cancel, values }) => {
      const truck = o.truck, status0 = o.status, lpStatus = o.lpRejected ? 'Rejected' : o.lpAccepted ? 'Accepted' : 'Waiting';
      if (cancel) {
        ctx.removeOrder(o);
        if (r) {
          r.history.push({ at, status: r.status, note: `DTP Maintenance by ${actor.name}: DTP cancelled; Daily order ${o.orderNo} (${o.status}, LP ${lpStatus}${truck ? `, truck ${truck}` : ''}) cancelled` });
          ctx.removeRecord(r);
        }
        cancelled++; return;
      }
      const before = maintValues(o, r, ctx.names), changed = Object.keys(values).filter(k => k !== 'container' && String(values[k] ?? '') !== String(before[k] ?? ''));
      if (!changed.length) return;
      const lpChanged = values.lp !== before.lp;
      if (r) {
        const { record } = validate({ ...r, ...maintToRecord(values), container: r.container }, ctx.vctx);
        Object.assign(r, record);
        r.history.push({ at, status: r.status, note: `DTP Maintenance by ${actor.name}: ${changed.join(', ')} changed` });
        Object.assign(o, orderPayload(r, ctx.names), { orderNo: o.orderNo, type: o.type });
        Object.assign(o.dtp || (o.dtp = {}), { io: r.io, container: r.container, dest: r.dest, vessel: r.vessel, agent: r.agent, bookNo: r.bookNo, ctrSize: r.ctrSize, truckType: r.truckType, fromCd: r.from, toCd: r.to });
      } else {
        Object.assign(o, { supplier: ctx.names.lp(values.lp), renban: values.renban, from: ctx.names.from(values.from), to: ctx.names.to(values.to), shift: values.shift || '-', planned: values.roundUse === 'Y' ? 2 : 1 });
        o.maint = Object.fromEntries(['dest', 'etd', 'ctrSize', 'ctrType', 'agent', 'bookNo', 'dg', 'vessel', 'truckType', 'description', 'serviceType', 'arrDate', 'arrTime'].map(k => [k, values[k]]));
      }
      o.cycles.forEach(c => { if (!c.startAt) { c.from = o.from; c.to = o.to; } });
      // MT-06: another trucking company -> the old LP decision and truck assignment no longer apply
      if (lpChanged) { Object.assign(o, { truck: '', driver: '', lpAccepted: false, lpRejected: false, status: W.ORDER.PLAN }); }
      const note = `${changed.join(', ')} changed${lpChanged && truck ? `; truck ${truck} released (trucking company changed)` : ''}`;
      if (W.log) W.log(o, at, actor, 'DTP Maintenance', { order: status0, cycle: o.cycles[0]?.status, truck }, { order: o.status, cycle: o.cycles[0]?.status, truck: o.truck }, '', note);
      else o.history.push({ at, actor: actor.name, action: 'DTP Maintenance', note });
      updated++;
    });
    return { ok: true, status: 200, message: MT_MSG.ok(cancelled, updated), cancelled, updated };
  }

  // ---------- Calendar entry per date + DTP type ----------
  const isAssigned = (o, W) => !!o.truck || o.status !== W.ORDER.PLAN;
  function calStatus(orders, W) {
    const done = [W.ORDER.FIN, W.ORDER.SA, W.ORDER.PO];
    if (orders.length && orders.every(o => done.includes(o.status))) return CAL.FINISH;
    if (orders.some(o => o.lpRejected && o.status === W.ORDER.PLAN)) return CAL.REJECTED;
    if (orders.length && orders.every(o => isAssigned(o, W))) return CAL.ASSIGNED;
    return CAL.WAIT;
  }
  function calLabel(type, date, orders, W) {
    const t = type === 'Universal' ? 'U' : String(type).replace('DTP', '');
    return `DTP - ${t} ( ${fmtDmy(date)} ) [ ${orders.filter(o => isAssigned(o, W)).length} / ${orders.length} ]`;
  }

  const api = { CONSUMING, KPI_WARN, kpiMonitor, SWITCHABLE, driverStarted, switchCheck, canSwitch, switchBack, MODEL, IO, SOURCE, STATUS, SELECTABLE, LOCKED, CAL, COLUMNS, EXTRA, OPTIONS, MSG, label, ymd, addDays, fmtLong, fmtDmy,
    dateRange, dateCheck, canCreate, normalize, validate, dupKey, duplicates, readSheet, upload, makeRecord, revalidate, selectable,
    submit, step, canRetry, orderPayload, calStatus, calLabel, SERVICE_TYPES, CTR_TYPES, MT_MSG, maintValues, maintToRecord, maintCheck, maintValidate, maintSave };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DtpRules = api;
})(this);
