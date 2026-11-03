// ELIPS Delivery Note (Surat Jalan) rules: mandatory-data check, PDF data model,
// simulated Base64 API and PAS GR attachment (idempotent). Pure logic, no DOM:
// used by delivery-note.js in the browser and by tests/delivery-note.test.js in Node.
// Values not defined by the requirement (endpoint, auth, file name, SLA, size limit,
// PAS contract) are mock values and are marked "TBD" in docs/delivery-note-spec.md.
(function (root) {
  const ENDPOINT = 'GET /api/delivery-note/{deliveryId}'; // TBD: real endpoint not defined
  const ID_RE = /^\d{6}C\d{11}$/; // format of No. Order in ELIPS (e.g. 261026C20000020425)
  const blank = v => !String(v ?? '').trim() || v === '-';
  const pad = n => String(n).padStart(2, '0');
  const dt = d => d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '-';
  const dmy = s => String(s).split('-').reverse().join('/');

  // Cycles printed on the Delivery Note: only cycles that have started
  // (same rule as the existing per-cycle Surat Jalan button).
  const startedCycles = o => o.cycles.map((c, i) => ({ c, i })).filter(x => x.c.startAt);

  // DN-R01 mandatory data. Returns the list of missing field labels (empty = complete).
  function missing(o) {
    if (!o) return ['Delivery'];
    const m = [];
    if (blank(o.date)) m.push('Tanggal');
    if (blank(o.orderNo)) m.push('No. Order');
    if (blank(o.supplier)) m.push('Trucking Company');
    if (blank(o.truck)) m.push('Police No');
    if (blank(o.driver)) m.push('Driver');
    if (!startedCycles(o).length) m.push('Cycle (minimal 1 cycle sudah Start)');
    return m;
  }

  // DN-R02 data model of the PDF, built from the latest order data on every call.
  // sjNo(o, i) gives the Surat Jalan number of cycle i (from the existing Surat Jalan).
  function model(o, sjNo, only) {
    const cyc = startedCycles(o).filter(x => only == null || x.i === only);
    return {
      deliveryId: o.orderNo,
      title: 'SURAT JALAN / DELIVERY NOTE',
      header: [
        ['Tanggal', dmy(o.date)],
        ['No. Order', o.orderNo + (only != null ? ` (Cycle ${only + 1})` : '')],
        ['Trucking Company', o.supplier],
        ['Police No / Driver', `${o.truck} / ${o.driver}`],
      ],
      columns: ['Cycle', 'No. Surat Jalan', 'Container No', 'Dari', 'Tujuan', 'Start Cycle', 'Pick Up', 'Finish Cycle'],
      rows: cyc.map(({ c, i }) => [String(i + 1), sjNo(o, i), c.container || '-', c.from, c.to, dt(c.startAt), dt(c.pickupAt), dt(c.finishAt)]),
      sign: ['Driver', 'Security', 'Penerima'],
    };
  }

  // TBD: file name convention not defined. Mock: DN_<No. Order>[_C<n>].pdf
  const fileName = (o, only) => `DN_${o.orderNo}${only != null ? `_C${only + 1}` : ''}.pdf`;

  // ---------- Base64 helpers ----------
  const b64decode = s => typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
  const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
  function checkPdfBase64(b64) {
    if (typeof b64 !== 'string' || !b64 || b64.length % 4 || !B64_RE.test(b64)) return 'INVALID_BASE64';
    let bin;
    try { bin = b64decode(b64); } catch (e) { return 'INVALID_BASE64'; }
    if (!bin.startsWith('%PDF-')) return 'CORRUPTED_PDF';
    if (!/%%EOF\s*$/.test(bin)) return 'CORRUPTED_PDF';
    return null;
  }
  const decodedSize = b64 => Math.floor(b64.length * 3 / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
  // FNV-1a 32-bit checksum, used to compare View vs Download and to make PAS attach idempotent
  function checksum(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }

  // ---------- Simulated API ----------
  // req: { deliveryId, token, actor, simulate }  simulate: '' | 'genfail' | 'corrupt' | 'timeout' | 'unavailable'
  // ctx: { orders, canView(actor, o), sjNo(o, i), generate(model) -> base64, now() }
  const err = (status, code, message, extra) => ({ status, body: Object.assign({ status, error: code, message }, extra || {}) });
  function api(req, ctx) {
    if (req.simulate === 'unavailable') return err(503, 'SERVICE_UNAVAILABLE', 'Delivery Note service sedang tidak tersedia');
    if (!req.token) return err(401, 'UNAUTHORIZED', 'Token otentikasi tidak ada / tidak valid');
    const id = String(req.deliveryId ?? '').trim();
    if (!id) return err(400, 'MISSING_PARAMETER', 'Parameter deliveryId wajib diisi');
    if (!ID_RE.test(id)) return err(400, 'INVALID_PARAMETER', 'Format deliveryId tidak valid');
    const o = ctx.orders.find(x => x.orderNo === id);
    if (!o) return err(404, 'NOT_FOUND', `Delivery ${id} tidak ditemukan`);
    if (!ctx.canView(req.actor, o)) return err(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke delivery ini');
    const miss = missing(o);
    if (miss.length) return err(422, 'INCOMPLETE_DATA', 'Data mandatory Delivery Note belum lengkap', { missingFields: miss });
    if (req.simulate === 'timeout') return err(504, 'TIMEOUT', 'Generate PDF melebihi batas waktu (SLA TBD)');
    let b64;
    try {
      if (req.simulate === 'genfail') throw new Error('PDF engine error');
      b64 = ctx.generate(model(o, ctx.sjNo));
      if (req.simulate === 'corrupt') b64 = b64.slice(0, -12) + 'AAAAAAAAAAAA';
    } catch (e) {
      return err(500, 'GENERATION_FAILED', 'Gagal generate PDF Delivery Note');
    }
    const bad = checkPdfBase64(b64);
    if (bad) return err(500, bad, 'Output PDF tidak valid, tidak dikirim ke client');
    return {
      status: 200,
      body: {
        status: 200, deliveryId: id, fileName: fileName(o), contentType: 'application/pdf',
        size: decodedSize(b64), checksum: checksum(b64), generatedAt: ctx.now().toISOString(), base64: b64,
      },
    };
  }

  // ---------- In-flight guard (repeated click / simultaneous request) ----------
  function createGuard() {
    const busy = new Set();
    return {
      begin: id => busy.has(id) ? false : (busy.add(id), true),
      end: id => { busy.delete(id); },
      busy: id => busy.has(id),
    };
  }

  // ---------- Simulated PAS GR attachment ----------
  // store: { [deliveryId]: { deliveryId, fileName, checksum, size, attempts, revisions, status, at, log: [] } }
  // Idempotency key = deliveryId: one GR attachment per delivery. A retry with the same
  // content does not add a new file; changed content replaces the file (revision + 1).
  function attachPAS(store, apiRes, opts) {
    opts = opts || {};
    if (!apiRes || apiRes.status !== 200) return { ok: false, code: 'NO_PDF', message: 'PDF Delivery Note tidak tersedia, attachment dibatalkan' };
    const b = apiRes.body, bad = checkPdfBase64(b.base64);
    if (bad) return { ok: false, code: bad, message: 'File PDF tidak valid, tidak dikirim ke PAS' };
    const prev = store[b.deliveryId];
    const rec = prev || { deliveryId: b.deliveryId, fileName: b.fileName, checksum: null, size: 0, attempts: 0, revisions: 0, status: 'Not Attached', at: null, log: [] };
    rec.attempts++;
    if (opts.fail) {
      rec.status = rec.checksum ? rec.status : 'Failed';
      rec.log.push({ at: opts.at, result: 'FAILED', note: opts.fail });
      store[b.deliveryId] = rec;
      return { ok: false, code: 'PAS_FAILED', message: `PAS GR gagal menerima attachment (${opts.fail}), bisa di-retry`, rec };
    }
    if (rec.checksum === b.checksum) {
      rec.log.push({ at: opts.at, result: 'NO_CHANGE', note: 'Attachment sama sudah ada (idempotent)' });
      return { ok: true, code: 'ALREADY_ATTACHED', message: 'Attachment sudah ada di GR, tidak diduplikasi', rec };
    }
    const replaced = !!rec.checksum;
    Object.assign(rec, { fileName: b.fileName, checksum: b.checksum, size: b.size, status: 'Attached', at: opts.at });
    rec.revisions++;
    rec.log.push({ at: opts.at, result: replaced ? 'REPLACED' : 'ATTACHED', note: `${b.fileName} · ${b.checksum}` });
    store[b.deliveryId] = rec;
    return { ok: true, code: replaced ? 'REPLACED' : 'ATTACHED', message: replaced ? 'Attachment GR diganti dengan versi terbaru' : 'Delivery Note ter-attach ke GR', rec };
  }

  const api_ = { ENDPOINT, ID_RE, missing, model, fileName, startedCycles, checkPdfBase64, decodedSize, checksum, api, createGuard, attachPAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api_;
  else root.DN = api_;
})(typeof window !== 'undefined' ? window : this);
