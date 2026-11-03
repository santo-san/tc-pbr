// ELIPS Delivery Note (Surat Jalan) rules: mandatory-data check, PDF data model,
// simulated Base64 API and PAS GR attachment (idempotent). Pure logic, no DOM:
// used by delivery-note.js in the browser and by tests/delivery-note.test.js in Node.
// One Delivery = one cycle of a Daily Order (Order Detail > Cycle n > Surat Jalan ELIPS / PDF).
// Delivery ID = the cycle Order No (No Cycle Order, e.g. 261026C2PBM311).
// Layout follows the TMMIN "SURAT JALAN" reference. Values not defined by the requirement
// (endpoint, auth, file name, SLA, size limit, PAS contract, Keterangan source) are mock
// values marked "TBD" in docs/delivery-note-spec.md.
(function (root) {
  const ENDPOINT = 'GET /api/delivery-note/{deliveryId}'; // TBD: real endpoint not defined
  const ID_RE = /^\d{6}C\d[A-Z]{2,5}\d{3}$/; // No Cycle Order: <YYMMDD>C<n><supplier code><NNN>
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const blank = v => !String(v ?? '').trim() || v === '-';
  const pad = n => String(n).padStart(2, '0');
  const longDate = d => `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const stamp = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const orDash = v => blank(v) ? '-' : String(v);

  // DN-R01 mandatory data of cycle i. Returns the missing field labels (empty = complete).
  function missing(o, i) {
    const c = o && o.cycles[i];
    if (!c) return ['Delivery'];
    const m = [];
    if (blank(o.orderNo)) m.push('No Order');
    if (blank(o.driver)) m.push('Nama (Driver)');
    if (blank(o.truck)) m.push('No Polisi');
    if (!c.startAt) m.push('Tanggal (Start Cycle)');
    if (blank(c.from)) m.push('Lokasi Asal');
    if (blank(c.to)) m.push('Lokasi Tujuan');
    return m;
  }

  // DN-R02 data model of cycle i, built from the latest delivery data on every call.
  // look: { sjNo(o,i), phone(o), saNo(o), loc(o,name), keterangan(o,c) } supplied by the app.
  function model(o, i, look) {
    const c = o.cycles[i], id = look.sjNo(o, i);
    return {
      deliveryId: id,
      company: 'PT. TOYOTA MOTOR MANUFACTURING INDONESIA',
      title: 'SURAT JALAN',
      printedBy: 'System',
      officer: 'Petugas,',
      division: 'TMMIN LOGISTIC PLANNING DIVISION',
      watermark: 'COPY',
      pages: [{
        left: [['Nama', orDash(o.driver)], ['No. Telp', orDash(look.phone(o))], ['No Polisi', orDash(o.truck)], ['Tanggal', c.startAt ? longDate(c.startAt) : '-']],
        right: [['SA Number', orDash(look.saNo(o))], ['No Order', o.orderNo], ['No Cycle Order', id], ['Cycle', String(i + 1)]],
        columns: ['NO', 'LOKASI ASAL', 'LOKASI TUJUAN', 'CTR NO', 'KETERANGAN'],
        rows: [['1', look.loc(o, c.from), look.loc(o, c.to), orDash(c.container), orDash(look.keterangan(o, c))]],
      }],
    };
  }

  // TBD: file name convention not defined. Mock: SJ_<No Cycle Order>.pdf
  const fileName = id => `SJ_${id}.pdf`;

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
  // FNV-1a 32-bit checksum
  function checksum(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  // Hash of the document data (without printed date): equal for View, Download and API on the same data
  const dataHash = m => checksum(JSON.stringify(m));

  // ---------- Simulated API ----------
  // req: { deliveryId, token, actor, simulate }  simulate: '' | 'genfail' | 'corrupt' | 'timeout' | 'unavailable'
  // ctx: { resolve(id) -> [{o, i}], canView(actor, o), look, generate(model, printedAt) -> base64, now() }
  const err = (status, code, message, extra) => ({ status, body: Object.assign({ status, error: code, message }, extra || {}) });
  function api(req, ctx) {
    if (req.simulate === 'unavailable') return err(503, 'SERVICE_UNAVAILABLE', 'Delivery Note service sedang tidak tersedia');
    if (!req.token) return err(401, 'UNAUTHORIZED', 'Token otentikasi tidak ada / tidak valid');
    const id = String(req.deliveryId ?? '').trim();
    if (!id) return err(400, 'MISSING_PARAMETER', 'Parameter deliveryId wajib diisi');
    if (!ID_RE.test(id)) return err(400, 'INVALID_PARAMETER', 'Format deliveryId tidak valid');
    const hits = ctx.resolve(id);
    if (!hits.length) return err(404, 'NOT_FOUND', `Delivery ${id} tidak ditemukan`);
    if (hits.length > 1) return err(409, 'AMBIGUOUS_DELIVERY', `Delivery ID ${id} tidak unik, dokumen tidak dikirim`);
    const { o, i } = hits[0];
    if (!ctx.canView(req.actor, o)) return err(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke delivery ini');
    const miss = missing(o, i);
    if (miss.length) return err(422, 'INCOMPLETE_DATA', 'Data mandatory Delivery Note belum lengkap', { missingFields: miss });
    if (req.simulate === 'timeout') return err(504, 'TIMEOUT', 'Generate PDF melebihi batas waktu (SLA TBD)');
    const m = model(o, i, ctx.look), now = ctx.now();
    let b64;
    try {
      if (req.simulate === 'genfail') throw new Error('PDF engine error');
      b64 = ctx.generate(m, stamp(now));
      if (req.simulate === 'corrupt') b64 = b64.slice(0, -12) + 'AAAAAAAAAAAA';
    } catch (e) {
      return err(500, 'GENERATION_FAILED', 'Gagal generate PDF Delivery Note');
    }
    const bad = checkPdfBase64(b64);
    if (bad) return err(500, bad, 'Output PDF tidak valid, tidak dikirim ke client');
    return {
      status: 200,
      body: {
        status: 200, deliveryId: id, orderNo: o.orderNo, cycle: i + 1, fileName: fileName(id), contentType: 'application/pdf',
        size: decodedSize(b64), dataHash: dataHash(m), generatedAt: now.toISOString(), base64: b64,
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
  // store: { [deliveryId]: { deliveryId, orderNo, cycle, fileName, dataHash, size, attempts, revisions, status, at, log: [] } }
  // Idempotency key = deliveryId: one GR attachment per delivery. A retry with the same document
  // data does not add a new file; changed data replaces the file (revision + 1).
  function attachPAS(store, apiRes, opts) {
    opts = opts || {};
    if (!apiRes || apiRes.status !== 200) return { ok: false, code: 'NO_PDF', message: 'PDF Delivery Note tidak tersedia, attachment dibatalkan' };
    const b = apiRes.body, bad = checkPdfBase64(b.base64);
    if (bad) return { ok: false, code: bad, message: 'File PDF tidak valid, tidak dikirim ke PAS' };
    const prev = store[b.deliveryId];
    const rec = prev || { deliveryId: b.deliveryId, orderNo: b.orderNo, cycle: b.cycle, fileName: b.fileName, dataHash: null, size: 0, attempts: 0, revisions: 0, status: 'Not Attached', at: null, log: [] };
    rec.attempts++;
    if (opts.fail) {
      rec.status = rec.dataHash ? rec.status : 'Failed';
      rec.log.push({ at: opts.at, result: 'FAILED', note: opts.fail });
      store[b.deliveryId] = rec;
      return { ok: false, code: 'PAS_FAILED', message: `PAS GR gagal menerima attachment (${opts.fail}), bisa di-retry`, rec };
    }
    if (rec.dataHash === b.dataHash) {
      rec.log.push({ at: opts.at, result: 'NO_CHANGE', note: 'Attachment dengan data sama sudah ada (idempotent)' });
      return { ok: true, code: 'ALREADY_ATTACHED', message: 'Attachment sudah ada di GR, tidak diduplikasi', rec };
    }
    const replaced = !!rec.dataHash;
    Object.assign(rec, { fileName: b.fileName, dataHash: b.dataHash, size: b.size, status: 'Attached', at: opts.at });
    rec.revisions++;
    rec.log.push({ at: opts.at, result: replaced ? 'REPLACED' : 'ATTACHED', note: `${b.fileName} · ${b.dataHash}` });
    store[b.deliveryId] = rec;
    return { ok: true, code: replaced ? 'REPLACED' : 'ATTACHED', message: replaced ? 'Attachment GR diganti dengan versi terbaru' : 'Delivery Note ter-attach ke GR', rec };
  }

  const api_ = { ENDPOINT, ID_RE, missing, model, fileName, longDate, stamp, checkPdfBase64, decodedSize, checksum, dataHash, api, createGuard, attachPAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api_;
  else root.DN = api_;
})(typeof window !== 'undefined' ? window : this);
