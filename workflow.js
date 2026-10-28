// ELIPS Daily Order workflow: statuses, roles, transitions and validation rules.
// Pure logic (no DOM) so it can be used by index.html and tested with Node.
(function (root) {
  const ORDER = {
    PLAN: 'Planning Order',
    REL: 'Order Release',
    START: 'Start Daily Order',
    FIN: 'Finish Daily Order',
    SA: 'SA Approved',
    PO: 'SA Approved with PO Number',
  };
  const ORDER_SEQ = [ORDER.PLAN, ORDER.REL, ORDER.START, ORDER.FIN, ORDER.SA, ORDER.PO];
  const CYCLE = {
    DTP: 'DTP Creation Release',
    START: 'Start Cycle',
    PICK: 'Pickup Container',
    FIN: 'Finish Cycle',
  };
  const MAX_CYCLES = 5;
  const REASON_MIN = 10;

  // ---------- Helpers ----------
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const blank = v => !String(v ?? '').trim();
  const cur = o => o.cycles[o.cycles.length - 1];
  const roleLabel = a => a.role === 'IP_ADMIN' ? 'IP Admin'
    : a.role === 'DRIVER' ? 'Driver'
    : a.role === 'SYSTEM' ? 'System'
    : a.lpAdmin ? 'Supplier (LP Admin)' : 'Supplier';
  const isLp = a => a.role === 'SUPPLIER' && a.lpAdmin;

  // ISO 6346 container number: 3-letter owner code + category (U/J/Z) + 6-digit serial + check digit
  const LETTER = {};
  (() => { let v = 10; for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { if (v % 11 === 0) v++; LETTER[ch] = v++; } })();
  function containerCheckDigit(code10) {
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += (/\d/.test(code10[i]) ? +code10[i] : LETTER[code10[i]]) * 2 ** i;
    return sum % 11 % 10;
  }
  const normContainer = v => String(v ?? '').toUpperCase().replace(/[\s-]/g, '');
  function containerError(raw) {
    const no = normContainer(raw);
    if (!/^[A-Z]{3}[UJZ]\d{7}$/.test(no)) return 'Format Container Number harus 4 huruf + 7 angka (contoh: SELU4384522)';
    if (containerCheckDigit(no) !== +no[10]) return `Check digit Container Number tidak valid (seharusnya ${no.slice(0, 10)}${containerCheckDigit(no)})`;
    return null;
  }

  // ---------- Visibility ----------
  function canView(actor, o) {
    if (actor.role === 'IP_ADMIN' || actor.role === 'SYSTEM') return true;
    if (actor.role === 'SUPPLIER') return o.supplier === actor.supplier;
    if (actor.role === 'DRIVER') return o.supplier === actor.supplier && !!o.truck && o.truck === actor.truck;
    return false;
  }

  // ---------- Driver login ----------
  function login(master, { userId, truck, licenseDate }, today) {
    const errors = {};
    if (blank(userId)) errors.userId = 'User ID wajib diisi';
    if (blank(truck)) errors.truck = 'No. Truck wajib diisi';
    if (blank(licenseDate)) errors.licenseDate = 'Tanggal Lisensi Truck wajib diisi';
    if (Object.keys(errors).length) return { ok: false, errors };
    const d = master.drivers.find(x => x.userId.toUpperCase() === userId.trim().toUpperCase());
    if (!d) return { ok: false, errors: { userId: 'User ID tidak terdaftar' } };
    if (!d.active) return { ok: false, errors: { userId: 'User ID tidak aktif' } };
    const t = master.trucks.find(x => x.plate === truck.trim().toUpperCase().replace(/\s/g, ''));
    if (!t) return { ok: false, errors: { truck: 'No. Truck tidak terdaftar' } };
    if (t.supplier !== d.supplier) return { ok: false, errors: { truck: 'Truck bukan milik supplier driver ini' } };
    if (t.licenseDate !== licenseDate) return { ok: false, errors: { licenseDate: 'Tanggal Lisensi Truck tidak sesuai dengan data master' } };
    if (t.licenseDate < today) return { ok: false, errors: { licenseDate: `Lisensi truck sudah habis sejak ${t.licenseDate}` } };
    return { ok: true, actor: { role: 'DRIVER', userId: d.userId, name: d.name, supplier: d.supplier, truck: t.plate } };
  }

  // ---------- DTP creation (Check & Submit) ----------
  const DTP_FIELDS = ['date', 'type', 'supplier', 'from', 'to', 'renban', 'shift', 'planned'];
  function checkDTP(p, actor, ctx, at) {
    const errors = {};
    if (actor.role !== 'IP_ADMIN') return { _: 'Hanya IP Admin yang dapat membuat DTP' };
    const labels = { date: 'Date', type: 'Type', supplier: 'Trucking Comp.', from: 'DTP Loc. From', to: 'DTP Loc. To', renban: 'Renban', shift: 'Shift', planned: 'Planned Cycle' };
    DTP_FIELDS.forEach(f => { if (blank(p[f])) errors[f] = `${labels[f]} wajib diisi`; });
    if (!errors.date && p.date < ymd(at)) errors.date = 'Tanggal DTP tidak boleh di masa lalu';
    if (!errors.to && p.from === p.to) errors.to = 'DTP Loc. To tidak boleh sama dengan DTP Loc. From';
    if (!errors.renban && !/^\d{5}$/.test(p.renban)) errors.renban = 'Renban harus 5 digit angka';
    if (!errors.planned && !(+p.planned >= 1 && +p.planned <= MAX_CYCLES)) errors.planned = `Planned Cycle harus 1 - ${MAX_CYCLES}`;
    if (!Object.keys(errors).length && ctx.orders.some(o => o.supplier === p.supplier && o.date === p.date && o.shift === p.shift && o.renban === p.renban))
      errors.renban = 'Renban sudah dipakai untuk supplier, tanggal dan shift yang sama';
    return errors;
  }
  function createDTP(p, actor, ctx, at, orderNo) {
    const errors = checkDTP(p, actor, ctx, at);
    if (Object.keys(errors).length) return { ok: false, errors };
    const o = {
      orderNo, date: p.date, type: p.type, supplier: p.supplier, from: p.from, to: p.to, renban: p.renban, shift: p.shift,
      fa: p.fa || '', planned: +p.planned, truck: '', driver: '', status: ORDER.PLAN,
      cycles: [{ status: CYCLE.DTP, from: p.from, to: p.to, container: '', startAt: null, pickupAt: null, finishAt: null }],
      saAt: null, poNo: '', poAt: null, history: [],
    };
    log(o, at, actor, 'DTP Check & Submit', null, { order: o.status, cycle: CYCLE.DTP }, '', `Planned ${o.planned} cycle`);
    return { ok: true, order: o };
  }

  // ---------- Transitions ----------
  function newCycle(o, at) {
    const prev = cur(o), even = o.cycles.length % 2 === 1;
    o.cycles.push({ status: CYCLE.START, from: even ? o.to : o.from, to: even ? o.from : o.to, container: '', startAt: at, pickupAt: null, finishAt: null });
    return prev;
  }
  const reasonField = { name: 'reason', label: 'Reason', type: 'textarea', required: true };
  const containerField = { name: 'container', label: 'Container Number', type: 'text', required: true };
  const reasonError = p => String(p.reason ?? '').trim().length < REASON_MIN ? { reason: `Reason minimal ${REASON_MIN} karakter` } : {};

  function containerUseError(o, no, ctx) {
    const n = normContainer(no);
    if (o.cycles.some(c => c.container === n)) return 'Container Number sudah dipakai di cycle lain pada order ini';
    const other = ctx.orders.find(x => x !== o && x.cycles.some(c => c.status === CYCLE.PICK && c.container === n));
    if (other) return `Container Number sedang aktif di order ${other.orderNo}`;
    return null;
  }

  const ACTIONS = {
    assignTruck: {
      label: 'Assign Truck', allow: a => a.role === 'IP_ADMIN',
      fields: () => [{ name: 'truck', label: 'Truck Number', type: 'truck', required: true }],
      guard: o => o.status !== ORDER.PLAN && `Assign Truck hanya bisa saat status ${ORDER.PLAN}`,
      validate(o, p, a, ctx) {
        const t = ctx.master.trucks.find(x => x.plate === p.truck);
        if (!t) return { truck: 'Truck tidak terdaftar' };
        if (t.supplier !== o.supplier) return { truck: 'Truck bukan milik trucking company order ini' };
        if (t.licenseDate < o.date) return { truck: `Lisensi truck habis (${t.licenseDate}) sebelum tanggal order` };
        const busy = ctx.orders.find(x => x !== o && x.truck === t.plate && x.date === o.date && x.shift === o.shift && [ORDER.REL, ORDER.START].includes(x.status));
        if (busy) return { truck: `Truck sudah di-assign ke order ${busy.orderNo} (${o.shift} ${o.date})` };
      },
      apply(o, p) { o.truck = p.truck; o.status = ORDER.REL; },
    },
    lpRelease: {
      label: 'Order Release', allow: isLp,
      fields: () => [reasonField, { name: 'driver', label: 'Driver', type: 'driver', required: true }],
      guard: o => ![ORDER.PLAN, ORDER.REL].includes(o.status) && `Order Release hanya bisa saat status ${ORDER.PLAN} / ${ORDER.REL}`,
      validate(o, p, a, ctx) {
        const e = reasonError(p);
        const d = ctx.master.drivers.find(x => x.userId === p.driver);
        if (!d) e.driver = 'Driver tidak terdaftar';
        else if (d.supplier !== o.supplier) e.driver = 'Driver bukan milik supplier order ini';
        else if (!d.active) e.driver = 'Driver tidak aktif';
        else if (!o.truck && !d.truck) e.driver = 'Driver belum punya truck terdaftar, minta IP Admin melakukan Assign Truck';
        return e;
      },
      apply(o, p, a, at, ctx) {
        const d = ctx.master.drivers.find(x => x.userId === p.driver);
        o.driver = d.name; o.truck = o.truck || d.truck; o.status = ORDER.REL;
      },
    },
    startOrder: {
      label: 'Start Order', allow: a => a.role === 'DRIVER',
      fields: () => [],
      guard: (o, a, ctx) => {
        if (o.status !== ORDER.REL) return `Start Order hanya bisa saat status ${ORDER.REL}`;
        const active = ctx.orders.find(x => x !== o && x.truck === o.truck && x.status === ORDER.START);
        if (active) return `Truck masih punya order aktif ${active.orderNo}, selesaikan dulu`;
      },
      apply(o, p, a, at) { o.status = ORDER.START; o.driver = a.name; Object.assign(o.cycles[0], { status: CYCLE.START, startAt: at }); },
    },
    pickup: {
      label: 'Pickup Container', allow: a => a.role === 'DRIVER' || isLp(a),
      fields: a => isLp(a) ? [reasonField, containerField] : [containerField],
      guard(o, a) {
        const c = cur(o);
        if (o.status === ORDER.START && c.status === CYCLE.START) return;
        if (isLp(a) && o.status === ORDER.REL) return o.driver ? undefined : 'Lakukan Order Release dengan Driver terlebih dahulu';
        if (isLp(a) && o.status === ORDER.START && c.status === CYCLE.FIN)
          return o.cycles.length >= MAX_CYCLES ? `Maksimal ${MAX_CYCLES} cycle per order` : undefined;
        return `Pickup Container hanya bisa saat Cycle Status ${CYCLE.START}`;
      },
      validate(o, p, a, ctx) {
        const e = isLp(a) ? reasonError(p) : {};
        const err = containerError(p.container) || containerUseError(o, p.container, ctx);
        if (err) e.container = err;
        return e;
      },
      apply(o, p, a, at) {
        let note = '';
        if (o.status === ORDER.REL) { o.status = ORDER.START; Object.assign(o.cycles[0], { status: CYCLE.START, startAt: at }); note = 'Start Cycle otomatis oleh LP Admin'; }
        else if (cur(o).status === CYCLE.FIN) { newCycle(o, at); note = `Cycle ${o.cycles.length} dimulai otomatis oleh LP Admin`; }
        Object.assign(cur(o), { status: CYCLE.PICK, container: normContainer(p.container), pickupAt: at });
        return note;
      },
    },
    finishCycle: {
      label: 'Finish Cycle', allow: a => a.role === 'DRIVER' || isLp(a),
      fields: a => isLp(a) ? [reasonField] : [],
      guard: o => (o.status !== ORDER.START || cur(o).status !== CYCLE.PICK) && `Finish Cycle hanya bisa saat Cycle Status ${CYCLE.PICK}`,
      validate: (o, p, a) => {
        const e = isLp(a) ? reasonError(p) : {};
        if (!cur(o).container) e._ = 'Container Number cycle ini belum tercatat';
        return e;
      },
      apply(o, p, a, at) { Object.assign(cur(o), { status: CYCLE.FIN, finishAt: at }); },
    },
    nextCycle: {
      label: 'Start Next Cycle', allow: a => a.role === 'DRIVER',
      fields: () => [],
      guard: o => {
        if (o.status !== ORDER.START || cur(o).status !== CYCLE.FIN) return `Cycle berikutnya hanya bisa dimulai setelah ${CYCLE.FIN}`;
        if (o.cycles.length >= MAX_CYCLES) return `Maksimal ${MAX_CYCLES} cycle per order`;
      },
      apply(o, p, a, at) { newCycle(o, at); return `Cycle ${o.cycles.length}`; },
    },
    finishOrder: {
      label: 'Finish Order', allow: a => a.role === 'DRIVER' || isLp(a),
      fields: a => isLp(a) ? [reasonField] : [],
      guard: o => (o.status !== ORDER.START || cur(o).status !== CYCLE.FIN) && `Finish Order hanya bisa saat status ${ORDER.START} dan cycle terakhir ${CYCLE.FIN}`,
      validate: (o, p, a) => {
        const e = isLp(a) ? reasonError(p) : {};
        const miss = o.cycles.findIndex(c => !c.container);
        if (miss >= 0) e._ = `Container Number Cycle ${miss + 1} belum tercatat`;
        return e;
      },
      apply(o) {
        o.status = ORDER.FIN;
        return o.cycles.length < o.planned ? `Aktual ${o.cycles.length} dari rencana ${o.planned} cycle` : '';
      },
    },
    processSA: {
      label: 'Proses ke SA', allow: a => a.role === 'IP_ADMIN' || a.role === 'SYSTEM',
      fields: () => [{ name: 'simulateFail', label: 'Simulasikan SA gagal', type: 'checkbox' }],
      guard: o => o.status !== ORDER.FIN && `Proses ke SA hanya bisa saat status ${ORDER.FIN}`,
      validate: (o, p) => {
        if (o.cycles.some(c => c.status !== CYCLE.FIN || !c.container)) return { _: 'Semua cycle harus Finish Cycle dan punya Container Number' };
        if (p.simulateFail) return { _: 'SA menolak data (simulasi). Status tidak berubah, silakan proses ulang.', failed: true };
      },
      apply(o, p, a, at) { o.status = ORDER.SA; o.saAt = at; },
    },
    processPAS: {
      label: 'Proses ke PAS', allow: a => a.role === 'IP_ADMIN' || a.role === 'SYSTEM',
      fields: () => [
        { name: 'poNo', label: 'PO Number (dari PAS)', type: 'text', required: true },
        { name: 'simulateFail', label: 'Simulasikan PAS gagal', type: 'checkbox' },
      ],
      guard: o => o.status !== ORDER.SA && `Proses ke PAS hanya bisa saat status ${ORDER.SA}`,
      validate: (o, p) => {
        if (p.simulateFail) return { _: 'PAS tidak mengembalikan PO Number (simulasi). Status tetap SA Approved.', failed: true };
        if (!/^45\d{8}$/.test(String(p.poNo).trim())) return { poNo: 'PO Number harus 10 digit diawali 45' };
      },
      apply(o, p, a, at) { o.status = ORDER.PO; o.poNo = String(p.poNo).trim(); o.poAt = at; },
    },
  };

  function log(o, at, actor, action, before, after, reason, note) {
    o.history.push({
      at, actor: actor.name, role: roleLabel(actor), action,
      from: before ? `${before.order}${before.cycle ? ' / ' + before.cycle : ''}` : '-',
      to: `${after.order}${after.cycle ? ' / ' + after.cycle : ''}`,
      reason: reason || '', note: note || '',
    });
  }

  function blockReason(o, key, actor, ctx) {
    const a = ACTIONS[key];
    if (!canView(actor, o)) return 'Anda tidak memiliki akses ke order ini';
    if (!a.allow(actor)) return `${roleLabel(actor)} tidak boleh melakukan ${a.label}`;
    return a.guard(o, actor, ctx) || null;
  }
  const available = (o, actor, ctx) => Object.keys(ACTIONS).filter(k => !blockReason(o, k, actor, ctx));

  function perform(o, key, payload, actor, at, ctx) {
    const a = ACTIONS[key];
    if (!a) return { ok: false, errors: { _: 'Aksi tidak dikenal' } };
    const block = blockReason(o, key, actor, ctx);
    if (block) return { ok: false, errors: { _: block } };
    const errors = {};
    a.fields(actor).forEach(f => { if (f.required && !payload.simulateFail && blank(payload[f.name])) errors[f.name] = `${f.label} wajib diisi`; });
    if (!Object.keys(errors).length && a.validate) Object.assign(errors, a.validate(o, payload, actor, ctx, at) || {});
    if (Object.keys(errors).length) {
      if (errors.failed) {
        delete errors.failed;
        const st = { order: o.status, cycle: cur(o).status };
        log(o, at, actor, `${a.label} (GAGAL)`, st, st, '', errors._);
      }
      return { ok: false, errors };
    }
    const before = { order: o.status, cycle: cur(o).status };
    const note = a.apply(o, payload, actor, at, ctx);
    log(o, at, actor, a.label, before, { order: o.status, cycle: cur(o).status }, payload.reason, note);
    return { ok: true };
  }

  const api = {
    ORDER, ORDER_SEQ, CYCLE, MAX_CYCLES, REASON_MIN, ACTIONS,
    canView, login, checkDTP, createDTP, perform, available, blockReason, roleLabel,
    containerCheckDigit, containerError, normContainer, current: cur, ymd,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Workflow = api;
})(this);
